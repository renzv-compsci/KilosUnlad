const Joi = require('joi');
const Beneficiary = require('../models/Beneficiary');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const VerificationTask = require('../models/VerificationTask');
const R = require('../constants/roles');
const { PROGRAM_STATUSES: S } = require('../constants/statuses');
const { allowRoles, requireJurisdiction } = require('../middleware/rbac.middleware');
const { calculateAppealDeadline } = require('./appealLifecycle.service');
const { WorkflowError, runGuard, assertAuditReady, appendAuditEntry,
  isSequenceContention } = require('./workflowPersistence.service');
const { computeEntryHash } = require('../utils/cryptoHelper');

const ROLES = [R.SUPER_ADMIN, R.REGIONAL_DIRECTOR];
const DOCKET_STATUS = 'UNDER_APPEAL_HEARING';
const manilaDate = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit'
});

// Calendar date only (the appeal dialog's <input type="date">). Reject impossible
// dates such as 2026-02-30 instead of letting Date roll them into March.
const calendarDate = (value, helpers) => {
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
    ? value : helpers.error('any.invalid');
};

// Exactly the fields the frontend appeal dialog collects. Status, notice and
// deadline values are never accepted from the client; they come from storage.
const docketSchema = Joi.object({
  household_id: Joi.string().trim().min(1).max(128).required(),
  appeal_docket_id: Joi.string().pattern(/^[A-Za-z0-9][A-Za-z0-9-]{2,63}$/).required(),
  hearing_date: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).custom(calendarDate).required(),
  appeal_grounds: Joi.string().trim().min(10).max(2000).required()
}).required();

// INT-03. The frozen Beneficiary enum has no appeal status and no deadline field,
// so the docket entry is an APPEAL_FILED block in the sealed audit ledger and the
// household stays NOTICE_OF_INELIGIBILITY. The notice instant is the stored
// APPROVED_GRADUATION resolution, never a request value.
function createAppealDocket({ beneficiaries = Beneficiary, users = User, audits = AuditLog,
  tasks = VerificationTask, now = () => new Date() } = {}) {
  if (beneficiaries.db !== users.db || beneficiaries.db !== audits.db || beneficiaries.db !== tasks.db) {
    throw new TypeError('Appeal docket models must use the same database connection.');
  }
  const authorize = allowRoles(...ROLES);

  async function file(input, actorId) {
    const { value, error } = docketSchema.validate(input, { convert: false, allowUnknown: false });
    if (error) throw new WorkflowError(400, 'INVALID_REQUEST', 'Request fields are missing or invalid.');
    if (typeof actorId !== 'string' || !/^[a-f0-9]{24}$/i.test(actorId)) {
      throw new WorkflowError(400, 'INVALID_WORKFLOW_INPUT', 'A valid authenticated actor is required.');
    }
    await assertAuditReady(audits);
    const session = await beneficiaries.db.startSession();
    try {
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          return await session.withTransaction(() => fileWithin(session, value, actorId),
            { readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' }, readPreference: 'primary' });
        } catch (err) {
          if (isSequenceContention(err) && attempt < 2) continue;
          throw err;
        }
      }
    } finally {
      await session.endSession();
    }
  }

  async function fileWithin(session, value, actorId) {
    // Re-read the actor so role, deactivation and jurisdiction are current.
    const actor = await users.findById(actorId)
      .select('_id username role jurisdiction is_active').session(session).lean();
    if (!actor || actor.is_active !== true) throw new WorkflowError(403, 'FORBIDDEN', 'Access is not permitted.');
    const req = { method: 'POST', query: {}, user: { ...actor, userId: String(actor._id) } };
    runGuard(authorize, req);
    const householdId = value.household_id;
    const record = await beneficiaries.findOne({ household_id: householdId }).session(session).lean();
    if (!record) throw new WorkflowError(404, 'HOUSEHOLD_NOT_FOUND', 'Specified household ID does not exist.');
    runGuard(requireJurisdiction(() => record.address), req);
    if (record.program_status !== S.NOTICE_OF_INELIGIBILITY) {
      throw new WorkflowError(409, 'NOTICE_REQUIRED', 'Only households under a Notice of Ineligibility can appeal.');
    }

    const current = now();
    const approval = await tasks.findOne({ household_id: householdId, task_status: 'VERIFIED_GRADUATE',
      'admin_resolution.decision': 'APPROVED_GRADUATION' })
      .sort({ 'admin_resolution.finalized_at': -1 }).session(session).lean();
    const noticeAt = approval?.admin_resolution?.finalized_at;
    // Fail closed: without a trusted, past notice instant there is no countdown.
    if (!(noticeAt instanceof Date) || !Number.isFinite(noticeAt.getTime()) || noticeAt > current) {
      throw new WorkflowError(409, 'NOTICE_RECORD_MISSING', 'No approved notice record exists for this household.');
    }
    const deadline = calculateAppealDeadline(noticeAt);
    if (current >= deadline) {
      throw new WorkflowError(409, 'APPEAL_WINDOW_CLOSED', 'The 15-day appeal window has elapsed.');
    }
    if (await audits.exists({ action: 'APPEAL_FILED', 'target_entity.entity_id': householdId,
      timestamp: { $gte: noticeAt } }).session(session)) {
      throw new WorkflowError(409, 'APPEAL_ALREADY_FILED', 'An appeal is already docketed for this notice.');
    }
    if (await audits.exists({ action: 'APPEAL_FILED',
      'state_delta.after.appeal_docket_id': value.appeal_docket_id }).session(session)) {
      throw new WorkflowError(409, 'DOCKET_ID_CONFLICT', 'The appeal docket reference is already in use.');
    }
    if (value.hearing_date < manilaDate.format(current)) {
      throw new WorkflowError(400, 'INVALID_HEARING_DATE', 'The hearing date cannot precede the filing date.');
    }

    const filedAt = new Date();
    const countdown = { household_id: householdId, program_status: record.program_status,
      notice_at: noticeAt.toISOString(), appeal_deadline: deadline.toISOString() };
    const stateDelta = {
      before: { ...countdown, countdown_active: true, appeal_docket_id: null },
      after: { ...countdown, countdown_active: false, countdown_paused: true, docket_status: DOCKET_STATUS,
        appeal_docket_id: value.appeal_docket_id, hearing_date: value.hearing_date,
        appeal_grounds: value.appeal_grounds.trim(), filed_at: filedAt.toISOString() }
    };
    const audit_receipt = await appendAuditEntry({ audits, session, actorId, actor, action: 'APPEAL_FILED',
      target: { collection_name: 'beneficiaries', entity_id: householdId }, stateDelta, timestamp: filedAt });
    return { appeal_docket_id: value.appeal_docket_id, household_id: householdId,
      docket_status: DOCKET_STATUS, program_status: record.program_status,
      notice_date: countdown.notice_at, notice_expiry_date: countdown.appeal_deadline,
      countdown_paused: true, hearing_date: value.hearing_date, filed_at: stateDelta.after.filed_at,
      audit_receipt };
  }

  // INT-08: read model for the Due Process screen (admin-due-process-docket.json).
  // Deadlines use the same stored notice instant as file(); appeal details come
  // only from APPEAL_FILED blocks whose entry hash recomputes.
  async function list(query = {}, jurisdictionFilter) {
    const keys = Object.keys(query || {});
    const parse = value => typeof value === 'string' && /^[1-9]\d*$/.test(value) ? Number(value) : NaN;
    const page = query.page === undefined ? 1 : parse(query.page);
    const limit = query.limit === undefined ? 50 : parse(query.limit);
    if (keys.some(k => !['page', 'limit'].includes(k)) || !Number.isSafeInteger(page) ||
        !Number.isSafeInteger(limit) || limit > 100 || !jurisdictionFilter) {
      throw new WorkflowError(400, 'INVALID_QUERY', 'Supply page >= 1 and limit between 1 and 100.');
    }
    const match = { $and: [jurisdictionFilter, { program_status: S.NOTICE_OF_INELIGIBILITY }] };
    const [total, households] = await Promise.all([
      beneficiaries.countDocuments(match),
      beneficiaries.find(match).select('household_id head_of_household address risk_assessment')
        .sort({ household_id: 1 }).skip((page - 1) * limit).limit(limit).lean()
    ]);
    const items = [];
    for (const h of households) {
      const approval = await tasks.findOne({ household_id: h.household_id, task_status: 'VERIFIED_GRADUATE',
        'admin_resolution.decision': 'APPROVED_GRADUATION' }).sort({ 'admin_resolution.finalized_at': -1 }).lean();
      const noticeAt = approval?.admin_resolution?.finalized_at;
      const valid = noticeAt instanceof Date && Number.isFinite(noticeAt.getTime());
      const appeal = valid ? await audits.findOne({ action: 'APPEAL_FILED', 'target_entity.entity_id': h.household_id,
        timestamp: { $gte: noticeAt } }).sort({ sequence_index: -1 }).lean() : null;
      if (appeal && computeEntryHash({ sequenceIndex: appeal.sequence_index, previousEntryHash: appeal.previous_entry_hash,
        timestamp: appeal.timestamp, actorId: appeal.actor.user_id, action: appeal.action,
        stateDelta: appeal.state_delta }) !== appeal.entry_hash) {
        throw new WorkflowError(409, 'AUDIT_ENTRY_INVALID', 'An audit entry cannot be verified.');
      }
      const filed = appeal?.state_delta?.after || {};
      const head = h.head_of_household || {};
      items.push({ household_id: h.household_id,
        head_of_household: { full_name: `${head.first_name || ''} ${head.last_name || ''}`.trim(), national_id: head.national_id },
        address: { barangay: h.address?.barangay, municipality: h.address?.municipality },
        notice_date: valid ? noticeAt.toISOString() : null,
        notice_expiry_date: valid ? calculateAppealDeadline(noticeAt).toISOString() : null,
        status: appeal ? DOCKET_STATUS : S.NOTICE_OF_INELIGIBILITY,
        // RA 11310 Sec. 12: grants continue while due process is pending.
        grant_continuation_active: true,
        appeal_docket_id: appeal ? filed.appeal_docket_id : null,
        hearing_date: appeal ? filed.hearing_date : null,
        appeal_grounds: appeal ? filed.appeal_grounds : null,
        initial_ineligibility_cause: approval?.admin_resolution?.admin_notes ||
          (h.risk_assessment?.flag_reasons || []).join('; ') });
    }
    return { items, pagination: { total_records: total, current_page: page,
      total_pages: Math.ceil(total / limit), limit } };
  }

  return { file, list };
}

module.exports = { createAppealDocket, docketSchema };

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

  return { file };
}

module.exports = { createAppealDocket, docketSchema };

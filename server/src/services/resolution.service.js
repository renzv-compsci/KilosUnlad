const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');
const Joi = require('joi');
const Beneficiary = require('../models/Beneficiary');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const VerificationTask = require('../models/VerificationTask');
const SystemConfig = require('../models/SystemConfig');
const environment = require('../config/environment');
const R = require('../constants/roles');
const { sameConnection } = require('../utils/sameConnection');
const { assertNoCalamityHold } = require('./calamityToggle.service');
const { calculateAppealDeadline, assertAppealWindowElapsed, AppealLifecycleError } = require('./appealLifecycle.service');
const { createWorkflowPersistence, WorkflowError } = require('./workflowPersistence.service');
const { computeEntryHash } = require('../utils/cryptoHelper');

// DECISION-011: the director's review of a submitted field report, the stored evidence
// photos, notice issuance (UNDER_INVESTIGATION -> NOTICE_OF_INELIGIBILITY) and final
// graduation (NOTICE_OF_INELIGIBILITY -> GRADUATED). Both transitions are sealed as
// BENEFICIARY_GRADUATED (frozen audit enum); the state delta says which step it was.
const resolveSchema = Joi.object({
  decision: Joi.string().valid('APPROVED_GRADUATION').required(),
  admin_notes: Joi.string().trim().min(10).max(1000).required()
}).required();
const graduateSchema = Joi.object({}).required();
// DECISION-012: retention and appeal outcomes. BENEFICIARY_RETAINED is the one approved
// addition to the frozen audit action list.
const retainSchema = Joi.object({ admin_notes: Joi.string().trim().min(10).max(1000).required() }).required();
const appealDecisionSchema = Joi.object({
  outcome: Joi.string().valid('GRANTED', 'DENIED').required(),
  decision_notes: Joi.string().trim().min(10).max(1000).required()
}).required();
const docketIdPattern = /^[A-Za-z0-9][A-Za-z0-9-]{2,63}$/;
const RETENTION_COOLDOWN_DAYS = 180;
const DAY_MS = 24 * 60 * 60 * 1000;
const cooldownEnd = from => new Date(from.getTime() + RETENTION_COOLDOWN_DAYS * DAY_MS);
const manilaDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit' });
const hashPattern = /^[a-f0-9]{64}$/;
const iso = value => value ? new Date(value).toISOString() : null;
const invalid = message => new WorkflowError(400, 'INVALID_REQUEST', message);
const supportsGraduation = findings => findings?.worker_recommendation === 'RECOMMEND_GRADUATION' ||
  findings?.verified_swdi_level === 3;
const supportsRetention = findings => findings?.worker_recommendation === 'RETAIN' ||
  [1, 2].includes(findings?.verified_swdi_level);

// A retained household (or one whose appeal was granted) may not be re-flagged by the
// model for RETENTION_COOLDOWN_DAYS after its latest BENEFICIARY_RETAINED block.
async function assertNoRetentionCooldown({ audits = AuditLog, householdId, session = null, now = new Date() }) {
  const last = await audits.findOne({ action: 'BENEFICIARY_RETAINED', 'target_entity.entity_id': householdId })
    .sort({ sequence_index: -1 }).select('timestamp').session(session).lean();
  if (last && cooldownEnd(last.timestamp) > now) {
    throw new WorkflowError(409, 'RETENTION_COOLDOWN',
      `This household was kept on the program; it can be reassessed from ${cooldownEnd(last.timestamp).toISOString()}.`);
  }
}

function createResolution({ beneficiaries = Beneficiary, users = User, audits = AuditLog, tasks = VerificationTask,
  configs = sameConnection(beneficiaries, SystemConfig), uploadDir = environment.UPLOAD_DIR, now = () => new Date() } = {}) {
  const evidenceDir = path.join(uploadDir, 'evidence');
  function ready() {
    if ([beneficiaries, tasks, users, audits].some(m => m.db.readyState !== 1)) {
      throw new WorkflowError(503, 'SERVICE_UNAVAILABLE', 'Service temporarily unavailable.');
    }
  }
  const taskId = id => {
    if (typeof id !== 'string' || !id.trim() || id.length > 128) throw new WorkflowError(404, 'TASK_NOT_FOUND', 'Task not found.');
    return id;
  };
  // Read routes: the task's household must be inside the caller's jurisdiction filter.
  async function assertInScope(householdId, scope) {
    if (!await beneficiaries.exists({ $and: [scope, { household_id: householdId }] })) {
      throw new WorkflowError(403, 'OUT_OF_JURISDICTION', 'User is not authorized to view records outside their assigned region.');
    }
  }
  const lifecycle = error => error instanceof AppealLifecycleError ? new WorkflowError(409, error.code, error.message) : error;

  return {
    async report(id, query, scope) {
      if (Object.keys(query || {}).length) throw new WorkflowError(400, 'INVALID_QUERY', 'No query parameters are supported.');
      ready();
      const task = await tasks.findOne({ task_id: taskId(id) }).lean();
      if (!task) throw new WorkflowError(404, 'TASK_NOT_FOUND', 'Task not found.');
      await assertInScope(task.household_id, scope);
      const [household, worker] = await Promise.all([
        beneficiaries.findOne({ household_id: task.household_id }).select('head_of_household address program_status').lean(),
        task.assigned_worker_id ? users.findById(task.assigned_worker_id).select('full_name').lean() : null]);
      const f = task.field_findings || {};
      const r = task.admin_resolution;
      return {
        task_id: task.task_id, household_id: task.household_id,
        head_of_household: { full_name: `${household.head_of_household.first_name} ${household.head_of_household.last_name}` },
        address: { barangay: household.address.barangay, municipality: household.address.municipality },
        task_status: task.task_status, household_status: household.program_status,
        assigned_worker: worker ? { user_id: String(worker._id), full_name: worker.full_name } : null,
        submitted_at: ['SUBMITTED', 'VERIFIED_GRADUATE', 'VERIFIED_RETAIN'].includes(task.task_status) ? iso(task.updatedAt) : null,
        findings: {
          verified_swdi_level: f.verified_swdi_level ?? null, worker_recommendation: f.worker_recommendation ?? null,
          narrative_report: f.narrative_report ?? '',
          livelihood_asset_verification: f.livelihood_asset_verification ?? null,
          landbank_card_inspection: f.landbank_card_inspection ?? null,
          client_geolocation: f.client_geolocation ? { latitude: f.client_geolocation.latitude, longitude: f.client_geolocation.longitude,
            accuracy_meters: f.client_geolocation.accuracy_meters ?? null, captured_at: iso(f.client_geolocation.captured_at) } : null
        },
        evidence: (f.evidence_attachments || []).map(e => ({ sha256_hash: e.sha256_hash, media_type: e.media_type,
          captured_at: iso(e.exif_metadata?.timestamp), url: `/api/v1/evidence/${e.sha256_hash}` })),
        graduation_supported: supportsGraduation(f),
        retention_supported: supportsRetention(f),
        admin_resolution: r ? { decision: r.decision, admin_notes: r.admin_notes, finalized_at: iso(r.finalized_at) } : null
      };
    },

    // Content-addressed photo, re-hashed on every read: altered bytes are never served.
    async evidence(hash, query, scope) {
      if (Object.keys(query || {}).length) throw new WorkflowError(400, 'INVALID_QUERY', 'No query parameters are supported.');
      if (typeof hash !== 'string' || !hashPattern.test(hash)) {
        throw new WorkflowError(400, 'INVALID_EVIDENCE_HASH', 'Evidence is addressed by a 64-character SHA-256 hash.');
      }
      ready();
      const task = await tasks.findOne({ 'field_findings.evidence_attachments.sha256_hash': hash })
        .select('household_id field_findings.evidence_attachments').lean();
      if (!task) throw new WorkflowError(404, 'EVIDENCE_NOT_FOUND', 'No evidence with this hash is on record.');
      await assertInScope(task.household_id, scope);
      let bytes;
      try { bytes = await fs.readFile(path.join(evidenceDir, hash)); }
      catch (error) {
        if (error.code === 'ENOENT') throw new WorkflowError(404, 'EVIDENCE_NOT_FOUND', 'The evidence file is not in storage.');
        throw error;
      }
      if (crypto.createHash('sha256').update(bytes).digest('hex') !== hash) {
        throw new WorkflowError(409, 'EVIDENCE_INTEGRITY_FAILED', 'Stored evidence no longer matches its recorded hash.');
      }
      const attachment = task.field_findings.evidence_attachments.find(e => e.sha256_hash === hash);
      return { bytes, mediaType: attachment?.media_type || 'application/octet-stream', hash };
    },

    async resolve(id, body, actorId) {
      const { value, error } = resolveSchema.validate(body, { convert: false, allowUnknown: false });
      if (error) throw invalid('Decision must be APPROVED_GRADUATION with 10 to 1000 characters of grounds.');
      ready();
      const found = await tasks.findOne({ task_id: taskId(id) }).select('household_id').lean();
      if (!found) throw new WorkflowError(404, 'TASK_NOT_FOUND', 'Task not found.');
      const noticeAt = now();
      const deadline = calculateAppealDeadline(noticeAt);
      const transition = createWorkflowPersistence({ beneficiaries, users, audits, policy: {
        from: 'UNDER_INVESTIGATION', to: 'NOTICE_OF_INELIGIBILITY', action: 'BENEFICIARY_GRADUATED',
        roles: [R.SUPER_ADMIN, R.REGIONAL_DIRECTOR],
        precheck: async ({ record, session }) => {
          const task = await tasks.findOne({ task_id: id }).session(session).lean();
          if (!task || task.household_id !== record.household_id) throw new WorkflowError(404, 'TASK_NOT_FOUND', 'Task not found.');
          if (task.task_status !== 'SUBMITTED') {
            throw new WorkflowError(409, 'TASK_NOT_SUBMITTED', 'Only a submitted field report can be decided.');
          }
          if (!supportsGraduation(task.field_findings)) {
            throw new WorkflowError(409, 'FIELD_REPORT_DOES_NOT_SUPPORT_GRADUATION',
              'The field report neither recommends graduation nor verifies SWDI Level 3.');
          }
          await assertNoCalamityHold({ configs, address: record.address, session, now: noticeAt });
        },
        perform: async ({ actor, session }) => {
          const update = await tasks.updateOne({ task_id: id, task_status: 'SUBMITTED' }, { $set: {
            task_status: 'VERIFIED_GRADUATE',
            admin_resolution: { reviewed_by: actor._id, decision: value.decision, admin_notes: value.admin_notes, finalized_at: noticeAt }
          } }, { session, runValidators: true });
          return update.modifiedCount === 1;
        },
        auditDelta: () => ({
          before: { task_id: id, task_status: 'SUBMITTED' },
          after: { task_id: id, task_status: 'VERIFIED_GRADUATE', decision: value.decision, admin_notes: value.admin_notes,
            notice_date: noticeAt.toISOString(), appeal_deadline: deadline.toISOString() }
        })
      } });
      const result = await transition({ householdId: found.household_id, actorId });
      return { task_id: id, household_id: found.household_id, task_status: 'VERIFIED_GRADUATE',
        household_status: result.program_status, notice_date: noticeAt.toISOString(),
        appeal_deadline: deadline.toISOString(), audit_receipt: result.audit_receipt };
    },

    async retain(id, body, actorId) {
      const { value, error } = retainSchema.validate(body, { convert: false, allowUnknown: false });
      if (error) throw invalid('Retention needs 10 to 1000 characters of grounds and no other field.');
      ready();
      const found = await tasks.findOne({ task_id: taskId(id) }).select('household_id').lean();
      if (!found) throw new WorkflowError(404, 'TASK_NOT_FOUND', 'Task not found.');
      const retainedAt = now();
      const until = cooldownEnd(retainedAt);
      const transition = createWorkflowPersistence({ beneficiaries, users, audits, policy: {
        from: 'UNDER_INVESTIGATION', to: 'ACTIVE_COMPLIANT', action: 'BENEFICIARY_RETAINED',
        roles: [R.SUPER_ADMIN, R.REGIONAL_DIRECTOR],
        // No calamity check: keeping a family on the program is the protective direction.
        precheck: async ({ record, session }) => {
          const task = await tasks.findOne({ task_id: id }).session(session).lean();
          if (!task || task.household_id !== record.household_id) throw new WorkflowError(404, 'TASK_NOT_FOUND', 'Task not found.');
          if (task.task_status !== 'SUBMITTED') {
            throw new WorkflowError(409, 'TASK_NOT_SUBMITTED', 'Only a submitted field report can be decided.');
          }
          if (!supportsRetention(task.field_findings)) {
            throw new WorkflowError(409, 'FIELD_REPORT_DOES_NOT_SUPPORT_RETENTION',
              'The field report neither recommends retention nor verifies SWDI Level 1 or 2.');
          }
        },
        perform: async ({ actor, session }) => {
          const update = await tasks.updateOne({ task_id: id, task_status: 'SUBMITTED' }, { $set: {
            task_status: 'VERIFIED_RETAIN',
            admin_resolution: { reviewed_by: actor._id, decision: 'RETAINED_ON_ROSTER', admin_notes: value.admin_notes,
              finalized_at: retainedAt }
          } }, { session, runValidators: true });
          return update.modifiedCount === 1;
        },
        auditDelta: () => ({
          before: { task_id: id, task_status: 'SUBMITTED' },
          after: { task_id: id, task_status: 'VERIFIED_RETAIN', decision: 'RETAINED_ON_ROSTER', admin_notes: value.admin_notes,
            retained_at: retainedAt.toISOString(), reassessment_allowed_from: until.toISOString() }
        })
      } });
      const result = await transition({ householdId: found.household_id, actorId });
      return { task_id: id, household_id: found.household_id, task_status: 'VERIFIED_RETAIN',
        household_status: result.program_status, retained_at: retainedAt.toISOString(),
        reassessment_allowed_from: until.toISOString(), audit_receipt: result.audit_receipt };
    },

    // The hearing outcome for the APPEAL_FILED block of the household's current notice.
    async decideAppeal(docketId, body, actorId) {
      const { value, error } = appealDecisionSchema.validate(body, { convert: false, allowUnknown: false });
      if (error) throw invalid('Outcome must be GRANTED or DENIED with 10 to 1000 characters of grounds.');
      if (typeof docketId !== 'string' || !docketIdPattern.test(docketId)) {
        throw new WorkflowError(404, 'APPEAL_NOT_FOUND', 'No appeal with this docket reference is on record.');
      }
      ready();
      const appeal = await audits.findOne({ action: 'APPEAL_FILED', 'state_delta.after.appeal_docket_id': docketId })
        .sort({ sequence_index: -1 }).lean();
      if (!appeal) throw new WorkflowError(404, 'APPEAL_NOT_FOUND', 'No appeal with this docket reference is on record.');
      const householdId = appeal.target_entity?.entity_id;
      const decidedAt = now();
      const granted = value.outcome === 'GRANTED';
      const transition = createWorkflowPersistence({ beneficiaries, users, audits, policy: {
        from: 'NOTICE_OF_INELIGIBILITY', to: granted ? 'ACTIVE_COMPLIANT' : 'GRADUATED',
        action: granted ? 'BENEFICIARY_RETAINED' : 'BENEFICIARY_GRADUATED',
        roles: [R.SUPER_ADMIN, R.REGIONAL_DIRECTOR],
        precheck: async ({ record, session }) => {
          if (record.program_status !== 'NOTICE_OF_INELIGIBILITY') {
            throw new WorkflowError(409, 'WORKFLOW_CONFLICT', 'Household is not under a Notice of Ineligibility.');
          }
          // Only a block whose hash recomputes is trusted as the appeal record.
          if (computeEntryHash({ sequenceIndex: appeal.sequence_index, previousEntryHash: appeal.previous_entry_hash,
            timestamp: appeal.timestamp, actorId: appeal.actor.user_id, action: appeal.action,
            stateDelta: appeal.state_delta }) !== appeal.entry_hash) {
            throw new WorkflowError(409, 'AUDIT_ENTRY_INVALID', 'An audit entry cannot be verified.');
          }
          const approval = await tasks.findOne({ household_id: record.household_id, task_status: 'VERIFIED_GRADUATE',
            'admin_resolution.decision': 'APPROVED_GRADUATION' }).sort({ 'admin_resolution.finalized_at': -1 }).session(session).lean();
          const noticeAt = approval?.admin_resolution?.finalized_at;
          if (!(noticeAt instanceof Date) || appeal.timestamp < noticeAt) {
            throw new WorkflowError(409, 'APPEAL_NOT_CURRENT', 'This appeal was not filed against the current notice.');
          }
          if (manilaDate.format(decidedAt) < appeal.state_delta.after.hearing_date) {
            throw new WorkflowError(409, 'HEARING_NOT_YET_HELD', 'The outcome can be recorded on or after the hearing date.');
          }
          if (!granted) await assertNoCalamityHold({ configs, address: record.address, session, now: decidedAt });
        },
        perform: async () => true,
        auditDelta: () => ({
          before: { appeal_docket_id: docketId, hearing_date: appeal.state_delta.after.hearing_date },
          after: granted
            ? { decision: 'APPEAL_GRANTED', appeal_docket_id: docketId, decision_notes: value.decision_notes,
              decided_at: decidedAt.toISOString(), reassessment_allowed_from: cooldownEnd(decidedAt).toISOString() }
            : { decision: 'GRADUATION_COMPLETED', appeal_filed: true, appeal_outcome: 'DENIED', appeal_docket_id: docketId,
              decision_notes: value.decision_notes, graduated_at: decidedAt.toISOString() }
        })
      } });
      const result = await transition({ householdId, actorId });
      return { appeal_docket_id: docketId, household_id: householdId, outcome: value.outcome,
        household_status: result.program_status, decided_at: decidedAt.toISOString(),
        reassessment_allowed_from: granted ? cooldownEnd(decidedAt).toISOString() : null,
        audit_receipt: result.audit_receipt };
    },

    async graduate(householdId, body, actorId) {
      if (graduateSchema.validate(body ?? {}, { allowUnknown: false }).error) throw invalid('No request fields are accepted.');
      ready();
      const current = now();
      let noticeAt, deadline;
      const transition = createWorkflowPersistence({ beneficiaries, users, audits, policy: {
        from: 'NOTICE_OF_INELIGIBILITY', to: 'GRADUATED', action: 'BENEFICIARY_GRADUATED',
        roles: [R.SUPER_ADMIN, R.REGIONAL_DIRECTOR],
        precheck: async ({ record, session }) => {
          if (record.program_status !== 'NOTICE_OF_INELIGIBILITY') {
            throw new WorkflowError(409, 'WORKFLOW_CONFLICT', 'Household is not under a Notice of Ineligibility.');
          }
          const approval = await tasks.findOne({ household_id: record.household_id, task_status: 'VERIFIED_GRADUATE',
            'admin_resolution.decision': 'APPROVED_GRADUATION' }).sort({ 'admin_resolution.finalized_at': -1 }).session(session).lean();
          noticeAt = approval?.admin_resolution?.finalized_at;
          if (!(noticeAt instanceof Date) || !Number.isFinite(noticeAt.getTime()) || noticeAt > current) {
            throw new WorkflowError(409, 'NOTICE_RECORD_MISSING', 'No approved notice record exists for this household.');
          }
          deadline = calculateAppealDeadline(noticeAt);
          // Fail closed: any appeal recorded after the notice holds the household.
          const hasAppeal = Boolean(await audits.exists({ action: 'APPEAL_FILED', 'target_entity.entity_id': record.household_id,
            timestamp: { $gte: noticeAt } }).session(session));
          try {
            assertAppealWindowElapsed({ programStatus: record.program_status, noticeAt, appealDeadline: deadline,
              hasAppeal, isPaused: hasAppeal, now: current });
          } catch (error) { throw lifecycle(error); }
          await assertNoCalamityHold({ configs, address: record.address, session, now: current });
        },
        perform: async () => true,
        auditDelta: () => ({
          before: { notice_date: noticeAt.toISOString(), appeal_deadline: deadline.toISOString() },
          after: { decision: 'GRADUATION_COMPLETED', appeal_filed: false, graduated_at: current.toISOString() }
        })
      } });
      const result = await transition({ householdId, actorId });
      return { household_id: householdId, household_status: result.program_status,
        notice_date: noticeAt.toISOString(), appeal_deadline: deadline.toISOString(), audit_receipt: result.audit_receipt };
    }
  };
}

module.exports = { createResolution, resolveSchema, assertNoRetentionCooldown, RETENTION_COOLDOWN_DAYS };

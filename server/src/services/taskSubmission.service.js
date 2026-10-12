const Beneficiary = require('../models/Beneficiary');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const VerificationTask = require('../models/VerificationTask');
const { verifyGeofence } = require('../utils/geoFence');
const { prepareSubmission, createSubmissionAuthorizer, verifyEvidenceHash } = require('./sync.service');
const { WorkflowError, assertAuditReady, appendAuditEntry, isSequenceContention } = require('./workflowPersistence.service');

const OPEN = ['PENDING_DISPATCH', 'CACHED_OFFLINE'];

// INT-02 + INT-06. Re-runs the read-only authorizer inside the transaction, then
// verifies evidence and geofence, conditionally writes the task and seals
// REPORT_SUBMITTED. Household status is unchanged: a field report is not an
// administrative decision. Response matches field-task-submission.json.
function createTaskSubmission({ beneficiaries = Beneficiary, users = User, audits = AuditLog,
  tasks = VerificationTask } = {}) {
  if (tasks.db !== users.db || tasks.db !== audits.db || tasks.db !== beneficiaries.db) {
    throw new TypeError('Submission models must use the same database connection.');
  }
  const authorize = createSubmissionAuthorizer({ users, tasks, beneficiaries });

  async function submit({ input, routeTaskId, actorId, files = [] } = {}) {
    prepareSubmission(input, routeTaskId); // Reject malformed input before any database work.
    await assertAuditReady(audits);
    const session = await tasks.db.startSession();
    try {
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          return await session.withTransaction(() => submitWithin(session, { input, routeTaskId, actorId, files }),
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

  async function submitWithin(session, { input, routeTaskId, actorId, files }) {
    const prepared = await authorize({ input, routeTaskId, actorId, session });
    const { field_findings: findings } = prepared;

    // Uploaded bytes must cover every declared attachment, in order. A JSON
    // submission carries no bytes; its fingerprints are sealed as declared.
    const attachments = findings.evidence_attachments;
    if (files.length && files.length !== attachments.length) {
      throw new WorkflowError(400, 'INVALID_EVIDENCE_INPUT', 'Evidence bytes and a valid SHA-256 fingerprint are required.');
    }
    files.forEach((bytes, i) => verifyEvidenceHash(bytes, attachments[i].sha256_hash));

    const household = await beneficiaries.findOne({ household_id: prepared.household_id }).session(session).lean();
    const geofence = verifyGeofence(findings.client_geolocation, household?.address?.coordinates?.coordinates);
    if (!geofence.isMatched) {
      throw new WorkflowError(422, 'GEOFENCE_VIOLATION',
        'Captured location is outside the 250 m verification radius of the household.');
    }

    const actor = await users.findById(actorId).select('_id username role').session(session).lean();
    const task = await tasks.findOne({ task_id: prepared.task_id }).session(session).lean();
    const update = await tasks.updateOne(
      { _id: task._id, assigned_worker_id: actor._id, task_status: { $in: OPEN } },
      { $set: { task_status: 'SUBMITTED', field_findings: findings } }, { session, runValidators: true });
    if (update.modifiedCount !== 1) {
      throw new WorkflowError(409, 'TASK_NOT_SUBMITTABLE', 'Task is no longer open for submission.');
    }

    const submittedAt = new Date();
    const geofence_verification = { is_matched: true, distance_variance_meters: geofence.distanceMeters };
    const identity = { task_id: prepared.task_id, household_id: prepared.household_id };
    const stateDelta = {
      before: { ...identity, task_status: task.task_status },
      after: { ...identity, task_status: 'SUBMITTED', worker_recommendation: findings.worker_recommendation,
        verified_swdi_level: findings.verified_swdi_level, geofence_verification,
        evidence_sha256: attachments.map(a => a.sha256_hash.toLowerCase()),
        evidence_bytes_verified: files.length > 0, submitted_at: submittedAt.toISOString() }
    };
    const audit_receipt = await appendAuditEntry({ audits, session, actorId, actor, action: 'REPORT_SUBMITTED',
      target: { collection_name: 'verification_tasks', entity_id: prepared.task_id }, stateDelta, timestamp: submittedAt });
    return { task_id: prepared.task_id, task_status: 'SUBMITTED', geofence_verification, audit_receipt,
      submitted_at: stateDelta.after.submitted_at };
  }

  return { submit };
}

module.exports = { createTaskSubmission };

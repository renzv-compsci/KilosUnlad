const Beneficiary = require('../models/Beneficiary');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const R = require('../constants/roles');
const { assertTransition } = require('./workflow.service');
const { allowRoles, requireJurisdiction } = require('../middleware/rbac.middleware');
const { computeEntryHash } = require('../utils/cryptoHelper');

class WorkflowError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function runGuard(guard, req) {
  let status;
  guard(req, {
    status(value) { status = value; return this; },
    json({ error }) { throw new WorkflowError(status, error.code, error.message); }
  }, error => { if (error) throw error; });
}

// Configure ONLY from trusted workflow code, never request bodies. No default
// policy is supplied: dispatch, due process, and automated flagging own their
// prerequisites. They must use this same session for all associated writes.
function createWorkflowPersistence({ policy, beneficiaries = Beneficiary, users = User,
  audits = AuditLog } = {}) {
  if (!policy || typeof policy.perform !== 'function' || !Array.isArray(policy.roles) ||
      !policy.roles.length || policy.roles.includes(R.COA_AUDITOR)) {
    throw new TypeError('A workflow policy with explicit writable roles and prerequisites is required.');
  }
  const authorize = allowRoles(...policy.roles);
  assertTransition(policy.from, policy.to);
  const { from, to, action, perform } = policy;
  if (!audits.schema.path('action').enumValues.includes(action)) {
    throw new TypeError('An approved audit action is required.');
  }
  if (beneficiaries.db !== users.db || beneficiaries.db !== audits.db) {
    throw new TypeError('Workflow models must use the same database connection.');
  }

  return async function transition({ householdId, actorId } = {}) {
    if (typeof householdId !== 'string' || !householdId.trim() || householdId.length > 128 ||
        typeof actorId !== 'string' || !/^[a-f0-9]{24}$/i.test(actorId)) {
      throw new WorkflowError(400, 'INVALID_WORKFLOW_INPUT', 'A valid household and authenticated actor are required.');
    }
    // Sequence uniqueness is the cross-process serialization guard. Do not run
    // without the existing model's unique index (autoIndex can be disabled).
    const indexes = await audits.collection.indexes();
    if (!indexes.some(i => i.unique && Object.keys(i.key).length === 1 && i.key.sequence_index === 1)) {
      throw new WorkflowError(503, 'WORKFLOW_UNAVAILABLE', 'Workflow storage is not ready.');
    }
    const session = await beneficiaries.db.startSession();
    try {
      // Independent households can contend for the same audit sequence. Retry
      // that duplicate-key failure in a fresh transaction, never without audit.
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          return await session.withTransaction(async () => {
            const actor = await users.findById(actorId)
              .select('_id username role jurisdiction is_active').session(session).lean();
            if (!actor || !actor.is_active) {
              throw new WorkflowError(403, 'FORBIDDEN', 'Access is not permitted.');
            }
            const req = { method: 'POST', query: {}, user: { ...actor, userId: String(actor._id) } };
            runGuard(authorize, req);
            const record = await beneficiaries.findOne({ household_id: householdId }).session(session).lean();
            if (!record) throw new WorkflowError(404, 'HOUSEHOLD_NOT_FOUND', 'Specified household ID does not exist.');
            runGuard(requireJurisdiction(() => record.address), req);
            if (record.program_status !== from) {
              throw new WorkflowError(409, 'WORKFLOW_CONFLICT', 'Household status changed; reload before retrying.');
            }
            assertTransition(record.program_status, to);
            // Returning true explicitly confirms all prerequisites and associated
            // writes. Undefined/false fails closed and rolls those writes back.
            if (await perform({ record, actor, session }) !== true) {
              throw new WorkflowError(409, 'WORKFLOW_PREREQUISITE_FAILED', 'Workflow prerequisites are not satisfied.');
            }
            const update = await beneficiaries.updateOne(
              { _id: record._id, program_status: from },
              { $set: { program_status: to } }, { session, runValidators: true });
            if (update.modifiedCount !== 1) {
              throw new WorkflowError(409, 'WORKFLOW_CONFLICT', 'Household status changed; reload before retrying.');
            }
            const head = await audits.findOne().sort({ sequence_index: -1 }).session(session).lean();
            const sequenceIndex = head ? head.sequence_index + 1 : 1;
            const previousEntryHash = head ? head.entry_hash : '0'.repeat(64);
            const timestamp = new Date();
            // Include household identity inside the hashed delta as well as the
            // target field. Preserve the accepted hash input format unchanged.
            const stateDelta = {
              before: { household_id: householdId, program_status: from },
              after: { household_id: householdId, program_status: to }
            };
            const entryHash = computeEntryHash({ sequenceIndex, previousEntryHash,
              timestamp, actorId, action, stateDelta });
            await audits.create([{
              sequence_index: sequenceIndex, previous_entry_hash: previousEntryHash, timestamp,
              actor: { user_id: actorId, username: actor.username, role: actor.role }, action,
              target_entity: { collection_name: 'beneficiaries', entity_id: householdId },
              state_delta: stateDelta, entry_hash: entryHash
            }], { session });
            return { household_id: householdId, program_status: to,
              audit_receipt: { sequence_index: sequenceIndex, entry_hash: entryHash } };
          }, { readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' }, readPreference: 'primary' });
        } catch (error) {
          if (error.code === 11000 && error.keyPattern?.sequence_index && attempt < 2) continue;
          throw error;
        }
      }
    } finally {
      await session.endSession();
    }
  };
}

module.exports = { createWorkflowPersistence, WorkflowError };

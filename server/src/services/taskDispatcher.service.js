const crypto = require('node:crypto');
const Joi = require('joi');
const Beneficiary = require('../models/Beneficiary');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const VerificationTask = require('../models/VerificationTask');
const SystemConfig = require('../models/SystemConfig');
const { sameConnection } = require('../utils/sameConnection');
const { assertNoCalamityHold } = require('./calamityToggle.service');
const R = require('../constants/roles');
const { requireJurisdiction } = require('../middleware/rbac.middleware');
const { createWorkflowPersistence, WorkflowError, runGuard } = require('./workflowPersistence.service');

const schema = Joi.object({
  household_id: Joi.string().trim().max(128).required(),
  assigned_worker_id: Joi.string().pattern(/^[a-f0-9]{24}$/i).required(),
  assignment_notes: Joi.string().allow('').optional(),
  priority: Joi.string().valid('LOW', 'MEDIUM', 'HIGH', 'CRITICAL').default('HIGH'),
  due_date: Joi.string().isoDate().pattern(/(?:Z|[+-]\d{2}:\d{2})$/).required()
}).required();
const activeStatuses = ['PENDING_DISPATCH', 'CACHED_OFFLINE', 'SUBMITTED'];

function createTaskDispatcher({ beneficiaries = Beneficiary, users = User,
  audits = AuditLog, tasks = VerificationTask, configs = sameConnection(beneficiaries, SystemConfig) } = {}) {
  if (tasks.db !== beneficiaries.db || configs.db !== beneficiaries.db) throw new TypeError('Task and workflow models must use the same connection.');
  return { async dispatch(input, actorId) {
    const { value, error } = schema.validate(input, { convert: false, allowUnknown: false });
    if (error) throw new WorkflowError(400, 'INVALID_DISPATCH_REQUEST', 'Task dispatch fields are missing or invalid.');
    // Per-call state survives retry but is never shared between HTTP requests.
    const taskId = `TSK-${new Date().getUTCFullYear()}-${crypto.randomUUID()}`;
    let task;
    const transition = createWorkflowPersistence({ beneficiaries, users, audits, policy: {
      from: 'FLAGGED_FOR_REVIEW', to: 'UNDER_INVESTIGATION', action: 'TASK_DISPATCHED',
      roles: [R.SUPER_ADMIN, R.REGIONAL_DIRECTOR],
      precheck: async ({ record, session }) => {
        await assertNoCalamityHold({ configs, address: record.address, session });
        if (await tasks.findOne({ household_id: record.household_id,
          task_status: { $in: activeStatuses } }).session(session).lean()) {
          throw new WorkflowError(409, 'ACTIVE_TASK_EXISTS', 'Household already has an open investigation task in progress.');
        }
      },
      perform: async ({ record, session }) => {
        const worker = await users.findById(value.assigned_worker_id)
          .select('_id role jurisdiction is_active').session(session).lean();
        if (!worker || worker.role !== R.CASE_WORKER || worker.is_active !== true) {
          throw new WorkflowError(400, 'INVALID_ASSIGNED_WORKER', 'Assigned worker must be an active case worker.');
        }
        runGuard(requireJurisdiction(() => record.address), {
          method: 'POST', query: {}, user: { ...worker, userId: String(worker._id) }
        });
        [task] = await tasks.create([{
          task_id: taskId, household_id: record.household_id,
          assigned_worker_id: worker._id, task_status: 'PENDING_DISPATCH',
          assignment_notes: (value.assignment_notes || '').trim(), priority: value.priority,
          due_date: new Date(value.due_date)
        }], { session });
        return true;
      },
      auditDelta: () => ({ before: { verification_task: null }, after: {
        verification_task: { task_id: task.task_id, household_id: task.household_id,
          assigned_worker_id: String(task.assigned_worker_id), task_status: task.task_status,
          assignment_notes: task.assignment_notes, priority: task.priority,
          due_date: task.due_date.toISOString(), dispatched_at: task.createdAt.toISOString() }
      } })
    } });
    const result = await transition({ householdId: value.household_id, actorId });
    return { task_id: task.task_id, household_id: task.household_id,
      assigned_worker_id: String(task.assigned_worker_id), task_status: task.task_status,
      household_status: result.program_status, dispatched_at: task.createdAt.toISOString(),
      audit_receipt: result.audit_receipt };
  } };
}
module.exports = { createTaskDispatcher };

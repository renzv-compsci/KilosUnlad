const test = require('node:test');
const assert = require('node:assert/strict');
const { createSubmissionAuthorizer, prepareSubmission } = require('../src/services/sync.service');
const contract = require('../../docs/contracts/field-tablet/field-task-submission.json');
const actorId = '0123456789abcdef01234567';

function setup() {
  const state = {
    actor: { _id: actorId, is_active: true, role: 'CASE_WORKER', jurisdiction: {
      region: 'Region IV-A', province: 'Laguna', municipality: 'Calamba', assigned_barangays: ['Palingon']
    } },
    task: { task_id: contract.request.task_id, household_id: contract.request.household_id,
      assigned_worker_id: actorId, task_status: 'PENDING_DISPATCH' },
    household: { household_id: contract.request.household_id,
      address: { province: 'Laguna', municipality: 'Calamba', barangay: 'Palingon' } },
    reads: [], sessions: []
  };
  const query = value => ({ select() { return this; },
    session(s) { state.sessions.push(s); return this; }, async lean() { return structuredClone(value); } });
  const authorize = createSubmissionAuthorizer({
    users: { findById(id) { state.reads.push('actor'); assert.equal(id, actorId); return query(state.actor); } },
    tasks: { findOne(filter) {
      state.reads.push('task');
      assert.deepEqual(filter, { task_id: contract.request.task_id, assigned_worker_id: actorId });
      return query(state.task && state.task.assigned_worker_id === filter.assigned_worker_id ? state.task : null);
    } },
    beneficiaries: { findOne(filter) {
      state.reads.push('household'); assert.deepEqual(filter, { household_id: contract.request.household_id });
      return query(state.household);
    } }
  });
  return { state, run: (extra = {}) => authorize({ input: structuredClone(contract.request),
    routeTaskId: contract.request.task_id, actorId, ...extra }) };
}

test('active assigned worker may prepare either open status; supplied session reaches all reads', async () => {
  const { state, run } = setup();
  const session = {};
  for (const status of ['PENDING_DISPATCH', 'CACHED_OFFLINE']) {
    state.task.task_status = status;
    assert.deepEqual(await run({ session }), prepareSubmission(contract.request, contract.request.task_id));
  }
  assert.equal(state.sessions.length, 6);
  assert.ok(state.sessions.every(s => s === session));
});

test('missing authentication and malformed submissions stop before reads', async () => {
  const { state, run } = setup();
  await assert.rejects(run({ actorId: undefined }), { status: 401, code: 'UNAUTHORIZED' });
  await assert.rejects(run({ input: {} }), { status: 400, code: 'INVALID_SUBMISSION_REQUEST' });
  assert.deepEqual(state.reads, []);
});

test('current stored role and activation control access on every call', async () => {
  const { state, run } = setup();
  await run();
  for (const role of ['SUPER_ADMIN', 'REGIONAL_DIRECTOR', 'COA_AUDITOR', 'UNKNOWN']) {
    state.actor.role = role;
    await assert.rejects(run(), { status: 403, code: 'FORBIDDEN' });
  }
  state.actor.role = 'CASE_WORKER'; state.actor.is_active = false;
  await assert.rejects(run(), { status: 403, code: 'FORBIDDEN' });
  state.actor = null;
  await assert.rejects(run(), { status: 403, code: 'FORBIDDEN' });
});

test('another worker task and missing task both return not found without household reads', async () => {
  const { state, run } = setup();
  state.task.assigned_worker_id = 'abcdef0123456789abcdef01';
  await assert.rejects(run(), { status: 404, code: 'TASK_NOT_FOUND' });
  state.task = null;
  await assert.rejects(run(), { status: 404, code: 'TASK_NOT_FOUND' });
  assert.ok(!state.reads.includes('household'));
});

test('household mismatch and missing stored household are rejected', async () => {
  const { state, run } = setup();
  await assert.rejects(run({ input: { ...contract.request, household_id: 'other' } }),
    { status: 400, code: 'SUBMISSION_IDENTITY_MISMATCH' });
  state.household = null;
  await assert.rejects(run(), { status: 404, code: 'HOUSEHOLD_NOT_FOUND' });
});

test('stored household scope and current worker jurisdiction are enforced', async () => {
  for (const key of ['province', 'municipality', 'barangay']) {
    const { state, run } = setup(); state.household.address[key] = 'Outside';
    await assert.rejects(run(), { status: 403, code: 'OUT_OF_JURISDICTION' });
  }
  for (const jurisdiction of [null, {}, { region: 'Region IV-A', province: 'Laguna',
    municipality: 'Calamba', assigned_barangays: [] }]) {
    const { state, run } = setup(); state.actor.jurisdiction = jurisdiction;
    await assert.rejects(run(), { status: 403, code: 'OUT_OF_JURISDICTION' });
  }
});

test('submitted, resolved and unknown task statuses fail closed', async () => {
  const { state, run } = setup();
  for (const status of ['SUBMITTED', 'VERIFIED_GRADUATE', 'VERIFIED_RETAIN', 'UNKNOWN', undefined]) {
    state.task.task_status = status;
    await assert.rejects(run(), { status: 409, code: 'TASK_NOT_SUBMITTABLE' });
  }
});

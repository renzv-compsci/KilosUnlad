const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createWorkflowPersistence } = require('../src/services/workflowPersistence.service');

test('workflow persistence requires an explicit policy and approved transition/action', () => {
  const policy = { from: 'FLAGGED_FOR_REVIEW', to: 'UNDER_INVESTIGATION',
    action: 'TASK_DISPATCHED', roles: ['REGIONAL_DIRECTOR'], perform: async () => true };
  for (const candidate of [undefined, { ...policy, perform: undefined },
    { ...policy, roles: [] }, { ...policy, roles: ['COA_AUDITOR'] },
    { ...policy, roles: ['UNKNOWN'] }, { ...policy, to: 'GRADUATED' },
    { ...policy, action: 'INVENTED_ACTION' }]) {
    assert.throws(() => createWorkflowPersistence({ policy: candidate }));
  }
});

test('transactional workflow against a disposable MongoDB replica set', {
  skip: process.env.RUN_WORKFLOW_MONGO_TESTS !== '1', timeout: 120000
}, async t => {
  const mongoose = require('mongoose');
  const { spawn } = require('node:child_process');
  const fs = require('node:fs/promises');
  const os = require('node:os');
  const path = require('node:path');
  const net = require('node:net');
  const { once } = require('node:events');
  const { computeEntryHash } = require('../src/utils/cryptoHelper');
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'kilosunlad-workflow-test-'));
  const portServer = net.createServer();
  await new Promise(resolve => portServer.listen(0, '127.0.0.1', resolve));
  const port = portServer.address().port;
  await new Promise(resolve => portServer.close(resolve));
  const child = spawn(process.env.MONGOD_PATH || 'mongod', [
    '--dbpath', directory, '--port', String(port), '--bind_ip', '127.0.0.1',
    '--replSet', 'workflowTest', '--logpath', path.join(directory, 'mongo.log')
  ], { windowsHide: true, stdio: 'ignore' });
  let spawnError;
  child.on('error', error => { spawnError = error; });
  let connection, client;
  t.after(async () => {
    if (connection) await connection.close();
    if (client) await client.close();
    if (child.pid && child.exitCode === null && child.signalCode === null) {
      const exited = once(child, 'exit'); child.kill(); await exited;
    }
    // Only this test's generated directory; never an existing MongoDB data path.
    assert.equal(path.dirname(directory), path.resolve(os.tmpdir()));
    assert.ok(path.basename(directory).startsWith('kilosunlad-workflow-test-'));
    await fs.rm(directory, { recursive: true, force: true });
  });
  const uri = `mongodb://127.0.0.1:${port}/?directConnection=true`;
  const deadline = Date.now() + 30000;
  while (true) {
    if (spawnError) throw spawnError;
    try {
      client = new mongoose.mongo.MongoClient(uri, { serverSelectionTimeoutMS: 500 });
      await client.connect(); break;
    } catch (error) {
      await client?.close();
      if (Date.now() > deadline) throw error;
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }
  await client.db('admin').command({ replSetInitiate: {
    _id: 'workflowTest', members: [{ _id: 0, host: `127.0.0.1:${port}` }]
  } });
  while (!(await client.db('admin').command({ hello: 1 })).isWritablePrimary) {
    if (Date.now() > deadline) throw Error('Temporary replica set did not become primary.');
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  connection = await mongoose.createConnection(uri, { dbName: 'workflow_test' }).asPromise();
  const users = connection.model('User', require('../src/models/User').schema);
  const beneficiaries = connection.model('Beneficiary', require('../src/models/Beneficiary').schema);
  const audits = connection.model('AuditLog', require('../src/models/AuditLog').schema);
  await Promise.all([users.init(), beneficiaries.init(), audits.init()]);
  const jurisdiction = { region: 'IV-A', province: 'Laguna', municipality: 'Calamba', assigned_barangays: ['Palingon'] };
  const actor = await users.create({ username: 'workflow-test', full_name: 'Test User',
    email: 'workflow@example.test', password_hash: 'test-only-unused', is_active: true,
    role: 'REGIONAL_DIRECTOR', jurisdiction });
  const actorId = String(actor._id);
  const models = { users, beneficiaries, audits };
  // Test policy only: production dispatch requires task creation and its approved
  // metadata design. No production endpoint uses this stand-in prerequisite.
  const policy = { from: 'FLAGGED_FOR_REVIEW', to: 'UNDER_INVESTIGATION',
    action: 'TASK_DISPATCHED', roles: ['REGIONAL_DIRECTOR'], perform: async () => true };
  const transition = createWorkflowPersistence({ ...models, policy });
  async function seed(id) {
    await beneficiaries.create({ household_id: id,
      head_of_household: { first_name: 'Test', last_name: 'Household', national_id: id },
      address: { province: 'Laguna', municipality: 'Calamba', barangay: 'Palingon',
        coordinates: { type: 'Point', coordinates: [121.1, 14.2] } },
      demographics: { household_size: 3 }, enrolled_swdi_level: 1, program_status: policy.from });
  }
  async function unchanged(id, operation, code) {
    const before = await audits.countDocuments();
    await assert.rejects(operation, error => error.code === code);
    assert.equal((await beneficiaries.findOne({ household_id: id })).program_status, policy.from);
    assert.equal(await audits.countDocuments(), before);
  }
  await t.test('successful update and audit use the accepted hash format', async () => {
    await seed('success');
    const result = await transition({ householdId: 'success', actorId });
    assert.equal(result.program_status, 'UNDER_INVESTIGATION');
    const log = await audits.findOne({ sequence_index: 1 }).lean();
    assert.equal(log.previous_entry_hash, '0'.repeat(64));
    assert.equal(log.actor.username, actor.username);
    assert.equal(log.entry_hash, computeEntryHash({ sequenceIndex: 1, previousEntryHash: log.previous_entry_hash,
      timestamp: log.timestamp, actorId, action: log.action, stateDelta: log.state_delta }));
  });
  await t.test('current role, deactivation and jurisdiction are read from MongoDB', async () => {
    await seed('denied');
    for (const update of [{ role: 'COA_AUDITOR' }, { role: 'CASE_WORKER' }, { is_active: false },
      { jurisdiction: { ...jurisdiction, assigned_barangays: ['Other'] } },
      { jurisdiction: { ...jurisdiction, assigned_barangays: [] } }]) {
      await users.updateOne({ _id: actorId }, { $set: update });
      await unchanged('denied', () => transition({ householdId: 'denied', actorId }),
        update.jurisdiction ? 'OUT_OF_JURISDICTION' : 'FORBIDDEN');
      await users.updateOne({ _id: actorId }, { $set: { role: 'REGIONAL_DIRECTOR', is_active: true, jurisdiction } });
    }
  });
  await t.test('failed prerequisites roll back associated writes', async () => {
    await seed('prerequisite');
    const failing = createWorkflowPersistence({ ...models, policy: { ...policy,
      perform: async ({ session, record }) => {
        await beneficiaries.updateOne({ _id: record._id }, { $set: { enrolled_swdi_level: 2 } }, { session });
        return false;
      } } });
    await unchanged('prerequisite', () => failing({ householdId: 'prerequisite', actorId }), 'WORKFLOW_PREREQUISITE_FAILED');
    assert.equal((await beneficiaries.findOne({ household_id: 'prerequisite' })).enrolled_swdi_level, 1);
  });
  await t.test('audit failure rolls back the status update', async () => {
    await seed('audit-failure');
    const original = audits.create;
    audits.create = async () => { const error = Error('injected audit failure'); error.code = 'TEST_AUDIT_FAILURE'; throw error; };
    try {
      await unchanged('audit-failure', () => transition({ householdId: 'audit-failure', actorId }), 'TEST_AUDIT_FAILURE');
    } finally { audits.create = original; }
  });
  await t.test('simultaneous changes to one household yield one winner and one audit', async () => {
    await seed('race');
    const results = await Promise.allSettled([transition({ householdId: 'race', actorId }), transition({ householdId: 'race', actorId })]);
    assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
    assert.equal(results.find(r => r.status === 'rejected').reason.code, 'WORKFLOW_CONFLICT');
    assert.equal(await audits.countDocuments({ 'target_entity.entity_id': 'race' }), 1);
  });
  await t.test('independent concurrent changes form one contiguous audit chain', async () => {
    await Promise.all(['parallel-a', 'parallel-b'].map(seed));
    await Promise.all(['parallel-a', 'parallel-b'].map(householdId => transition({ householdId, actorId })));
    const logs = await audits.find().sort({ sequence_index: 1 }).lean();
    let previous = '0'.repeat(64);
    for (let index = 0; index < logs.length; index++) {
      const log = logs[index];
      assert.equal(log.sequence_index, index + 1);
      assert.equal(log.previous_entry_hash, previous);
      assert.equal(log.entry_hash, computeEntryHash({ sequenceIndex: log.sequence_index,
        previousEntryHash: previous, timestamp: log.timestamp, actorId: log.actor.user_id,
        action: log.action, stateDelta: log.state_delta }));
      previous = log.entry_hash;
    }
  });
  await t.test('invalid input, unknown actor and missing household fail closed', async () => {
    await assert.rejects(() => transition({ householdId: { $ne: null }, actorId }), { code: 'INVALID_WORKFLOW_INPUT' });
    await assert.rejects(() => transition({ householdId: 'denied', actorId: '0'.repeat(24) }), { code: 'FORBIDDEN' });
    await assert.rejects(() => transition({ householdId: 'missing', actorId }), { code: 'HOUSEHOLD_NOT_FOUND' });
  });
  await t.test('unexpected database status cannot be skipped or overwritten', async () => {
    await seed('wrong-status');
    await beneficiaries.updateOne({ household_id: 'wrong-status' }, { $set: { program_status: 'ACTIVE_COMPLIANT' } });
    const count = await audits.countDocuments();
    await assert.rejects(() => transition({ householdId: 'wrong-status', actorId }), { code: 'WORKFLOW_CONFLICT' });
    assert.equal((await beneficiaries.findOne({ household_id: 'wrong-status' })).program_status, 'ACTIVE_COMPLIANT');
    assert.equal(await audits.countDocuments(), count);
  });
  await t.test('missing unique audit sequence index prevents all writes', async () => {
    await seed('missing-index');
    await audits.collection.dropIndex('sequence_index_1');
    await unchanged('missing-index', () => transition({ householdId: 'missing-index', actorId }), 'WORKFLOW_UNAVAILABLE');
  });
});

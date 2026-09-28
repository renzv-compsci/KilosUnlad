const test = require('node:test');
const assert = require('node:assert/strict');

test('audit role requires listIndexes independently of createIndex and blocks mutation', {
  skip: process.env.RUN_AUDIT_ROLE_TESTS !== '1', timeout: 90000
}, async t => {
  const { promisify } = require('node:util');
  const { execFile } = require('node:child_process');
  const { MongoClient } = require('mongoose').mongo;
  const crypto = require('node:crypto');
  const docker = process.env.DOCKER_PATH || 'docker';
  const name = 'mae-audit-role-test-' + crypto.randomBytes(6).toString('hex');
  const password = crypto.randomBytes(24).toString('hex');
  const run = args => promisify(execFile)(docker, args, { windowsHide: true, timeout: 30000 });
  let root, app, created = false;
  t.after(async () => {
    await app?.close(); await root?.close();
    if (created) await run(['rm', '-f', '-v', name]);
  });
  await run(['run', '-d', '--name', name, '-p', '127.0.0.1::27017',
    '-e', 'MONGO_INITDB_ROOT_USERNAME=test_root', '-e', `MONGO_INITDB_ROOT_PASSWORD=${password}`, 'mongo:6.0']);
  created = true;
  const { stdout } = await run(['port', name, '27017/tcp']);
  const address = stdout.trim();
  assert.match(address, /^127\.0\.0\.1:\d+$/);
  const deadline = Date.now() + 40000;
  while (true) {
    root = new MongoClient(`mongodb://test_root:${password}@${address}/admin`, { serverSelectionTimeoutMS: 1000 });
    try { await root.connect(); break; }
    catch (error) {
      await root.close();
      if (Date.now() > deadline) throw Error('Isolated audit-role database did not start.');
      await new Promise(resolve => setTimeout(resolve, 250));
    }
  }
  const db = root.db('kilosunlad');
  await db.createCollection('audit_logs');
  await db.collection('audit_logs').createIndex({ sequence_index: 1 }, { unique: true });
  // Exact audit privilege subset in Dustin's proposed role; no production role is changed.
  await root.db('admin').command({ createRole: 'auditTestRole', privileges: [
    { resource: { db: 'kilosunlad', collection: 'audit_logs' }, actions: ['find', 'insert'] }
  ], roles: [] });
  await db.command({ createUser: 'test_app', pwd: password, roles: [{ role: 'auditTestRole', db: 'admin' }] });
  app = new MongoClient(`mongodb://test_app:${password}@${address}/kilosunlad?authSource=kilosunlad`);
  await app.connect();
  const logs = app.db('kilosunlad').collection('audit_logs');
  await logs.insertOne({ sequence_index: 1, test: true });
  assert.equal((await logs.findOne({ sequence_index: 1 })).test, true);
  await assert.rejects(() => logs.indexes(), error => error.code === 13);
  await assert.rejects(() => logs.updateOne({ sequence_index: 1 }, { $set: { test: false } }), error => error.code === 13);
  await assert.rejects(() => logs.deleteOne({ sequence_index: 1 }), error => error.code === 13);
  // Decision 005 proposes createIndex. Verify its actual effect separately;
  // all grants here affect only this disposable test database.
  await root.db('admin').command({ grantPrivilegesToRole: 'auditTestRole', privileges: [
    { resource: { db: 'kilosunlad', collection: 'audit_logs' }, actions: ['createIndex'] }
  ] });
  await app.close();
  app = new MongoClient(`mongodb://test_app:${password}@${address}/kilosunlad?authSource=kilosunlad`);
  await app.connect();
  const withCreate = app.db('kilosunlad').collection('audit_logs');
  await withCreate.createIndex({ test: 1 });
  await assert.rejects(() => withCreate.indexes(), error => error.code === 13);
  await root.db('admin').command({ grantPrivilegesToRole: 'auditTestRole', privileges: [
    { resource: { db: 'kilosunlad', collection: 'audit_logs' }, actions: ['listIndexes'] }
  ] });
  await app.close();
  app = new MongoClient(`mongodb://test_app:${password}@${address}/kilosunlad?authSource=kilosunlad`);
  await app.connect();
  const withMetadata = app.db('kilosunlad').collection('audit_logs');
  assert.ok((await withMetadata.indexes()).some(i => i.unique && i.key.sequence_index === 1));
  await assert.rejects(() => withMetadata.updateOne({ sequence_index: 1 }, { $set: { test: false } }), error => error.code === 13);
  await assert.rejects(() => withMetadata.deleteOne({ sequence_index: 1 }), error => error.code === 13);
});

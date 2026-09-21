const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../src/models/User');
const { createApp } = require('../src/app');
const { createAuthService } = require('../src/services/auth.service');
const contract = require('../../docs/contracts/auth/auth-session.json');
const secret = crypto.randomBytes(32).toString('hex');
const password = 'Test-only-password!';
const id = '60c72b2f9b1e8a001c8a1099';
const j = contract.response.data.user.jurisdiction;
let users, connection, listener, base, session, record, repositoryDown = false;
const dbName = 'kilosunlad_auth_test_' + crypto.randomUUID().replaceAll('-', '');

before(async () => {
  record = { _id: id, username: 'mreyes_dir', full_name: 'Manuel Reyes', email: 'test@example.test',
    password_hash: await bcrypt.hash(password, 12), role: 'REGIONAL_DIRECTOR', jurisdiction: j, is_active: true };
  if (process.env.TEST_MONGO_URI) {
    connection = await mongoose.createConnection(process.env.TEST_MONGO_URI, { dbName, serverSelectionTimeoutMS: 5000 }).asPromise();
    users = connection.model('User', User.schema);
    await users.create(record);
  } else {
    users = {
      findOne: async ({ username }) => {
        if (repositoryDown) throw new Error('private database connection details');
        return record && record.username === username ? new User(record) : null;
      },
      findById: key => ({ select: () => ({ lean: async () => {
        if (repositoryDown) throw new Error('private database connection details');
        return record && String(record._id) === key ? record : null;
      } }) })
    };
  }
  const app = createApp({ mockMode: false, production: false, authService: createAuthService({ users, secret }) });
  listener = await new Promise(resolve => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); });
  base = `http://127.0.0.1:${listener.address().port}`;
});
after(async () => {
  if (listener) await new Promise(resolve => listener.close(resolve));
  if (connection) {
    // Only remove the uniquely named database created by this test, never the app DB.
    assert.equal(connection.name, dbName);
    assert.match(dbName, /^kilosunlad_auth_test_[a-f0-9]{32}$/);
    await connection.dropDatabase(); await connection.close();
  }
});
async function change(update) {
  if (connection) await users.updateOne({ _id: id }, { $set: update });
  else Object.assign(record, update);
}
const login = (body = { username: 'MREYES_DIR ', password }) => fetch(base + '/api/v1/auth/login', {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
});
const get = (path, token = session.access_token) => fetch(base + path, { headers: { Authorization: 'Bearer ' + token } });

test('real bcrypt login follows contract shape, issues a 900s JWT, and exposes no password hash', async () => {
  const r = await login(); assert.equal(r.status, 200); session = await r.json();
  assert.deepEqual(Object.keys(session).sort(), Object.keys(contract.response.data).sort());
  assert.deepEqual(Object.keys(session.user).sort(), Object.keys(contract.response.data.user).sort());
  assert.deepEqual(session.user.jurisdiction, j);
  assert.equal(session.token_type, 'Bearer'); assert.equal(session.expires_in_seconds, 900);
  assert.ok(Number.isFinite(Date.parse(session.user.last_login_at)));
  assert.equal(JSON.stringify(session).includes('password_hash'), false);
  const claims = jwt.verify(session.access_token, secret, { algorithms: ['HS256'] });
  assert.equal(claims.userId, id); assert.equal(claims.exp - claims.iat, 900);
  assert.equal(r.headers.get('cache-control'), 'no-store');
  assert.equal(r.headers.get('x-kilosunlad-mock'), null);
});

test('incorrect, unknown, invalid and injection-shaped credentials share contract error', async () => {
  for (const body of [{ username: 'missing', password }, { username: 'mreyes_dir', password: 'wrong' },
    { username: { $ne: null }, password }, {}, { username: 'mreyes_dir', password: 'x'.repeat(73) }]) {
    const r = await login(body); assert.equal(r.status, 401);
    assert.deepEqual(await r.json(), { error: contract.error_responses[0].error });
  }
});

test('deactivation blocks login and an already-issued token', async () => {
  await change({ is_active: false });
  try {
    for (const r of [await login(), await get('/api/v1/beneficiaries/triage-queue')]) {
      assert.equal(r.status, 403); assert.deepEqual(await r.json(), { error: contract.error_responses[1].error });
    }
  } finally { await change({ is_active: true }); }
});

test('triage applies current jurisdiction and never exposes global fixture totals', async () => {
  let r = await get('/api/v1/beneficiaries/triage-queue?municipality=Calamba');
  assert.equal(r.status, 200); let body = await r.json();
  assert.equal(body.items.length, 1); assert.equal(body.pagination.total_records, 1);
  assert.equal(body.summary_metrics.high_risk_count, 1);
  await change({ jurisdiction: { ...j, assigned_barangays: ['Other'] } });
  try {
    r = await get('/api/v1/beneficiaries/triage-queue'); body = await r.json();
    assert.equal(r.status, 200); assert.equal(body.items.length, 0); assert.equal(body.summary_metrics.high_risk_count, 0);
  } finally { await change({ jurisdiction: j }); }
});

test('outside-jurisdiction response matches the triage contract', async () => {
  const r = await get('/api/v1/beneficiaries/triage-queue?municipality=Other');
  assert.equal(r.status, 403);
  assert.deepEqual(await r.json(), { error: require('../../docs/contracts/admin-web/admin-triage-feed.json').error_responses[0].error });
});

test('expired token matches assigned-task contract error', async () => {
  const expired = jwt.sign({ userId: id, role: 'CASE_WORKER' }, secret, { expiresIn: -1 });
  const r = await get('/api/v1/tasks/assigned', expired); assert.equal(r.status, 401);
  assert.deepEqual(await r.json(), { error: require('../../docs/contracts/field-tablet/field-task-download.json').error_responses[0].error });
});

test('current role changes take effect immediately and users cannot obtain another worker fixtures', async () => {
  await change({ role: 'CASE_WORKER' });
  try {
    assert.equal((await get('/api/v1/beneficiaries/triage-queue')).status, 403);
    const r = await get('/api/v1/tasks/assigned?worker_id=60c72b2f9b1e8a001c8a1101');
    assert.equal(r.status, 200); const body = await r.json();
    assert.equal(body.worker_id, id); assert.deepEqual(body.tasks, []);
  } finally { await change({ role: 'REGIONAL_DIRECTOR' }); }
});

test('missing, forged and placeholder tokens cannot access mounted handlers', async () => {
  assert.equal((await fetch(base + '/api/v1/beneficiaries/triage-queue')).status, 401);
  for (const t of [contract.response.data.access_token, jwt.sign({ userId: id, role: 'SUPER_ADMIN' }, 'wrong', { expiresIn: 900 })]) {
    assert.equal((await get('/api/v1/beneficiaries/triage-queue', t)).status, 401);
  }
});

test('production has real login but never serves protected fixture data', async () => {
  const app = createApp({ mockMode: false, production: true, authService: createAuthService({ users, secret }) });
  const s = await new Promise(resolve => { const x = app.listen(0, '127.0.0.1', () => resolve(x)); });
  try {
    const r = await fetch(`http://127.0.0.1:${s.address().port}/api/v1/beneficiaries/triage-queue`, { headers: { Authorization: 'Bearer ' + session.access_token } });
    assert.equal(r.status, 503); assert.equal(r.headers.get('x-kilosunlad-mock'), null);
  } finally { await new Promise(resolve => s.close(resolve)); }
});

test('repository errors fail closed without exposing database details', async () => {
  const broken = createAuthService({ secret, users: { findOne: async () => { throw Error('private database details'); } } });
  const app = createApp({ mockMode: false, production: false, authService: broken });
  const s = await new Promise(resolve => { const x = app.listen(0, '127.0.0.1', () => resolve(x)); });
  try {
    const r = await fetch(`http://127.0.0.1:${s.address().port}/api/v1/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: 'test', password }) });
    assert.equal(r.status, 503); assert.equal((await r.text()).includes('private'), false);
  } finally { await new Promise(resolve => s.close(resolve)); }
});

test('deleted user tokens are rejected', async () => {
  if (connection) await users.deleteOne({ _id: id }); else record = null;
  assert.equal((await get('/api/v1/beneficiaries/triage-queue')).status, 401);
});

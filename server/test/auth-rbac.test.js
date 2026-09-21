const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const jwt = require('jsonwebtoken');
const { createAuthenticate } = require('../src/middleware/auth.middleware');
const { allowRoles, scopeJurisdiction, requireJurisdiction } = require('../src/middleware/rbac.middleware');
const R = require('../src/constants/roles');
const secret = 'isolated-test-secret-not-for-deployment';
const jurisdiction = { region: 'Region IV-A', province: 'Laguna', municipality: 'Calamba', assigned_barangays: ['Palingon'] };
const claims = { userId: 'test-user', role: R.CASE_WORKER, jurisdiction };
const token = (payload = claims, options = {}) => jwt.sign(payload, secret, { expiresIn: '15m', ...options });
let listener, base;

before(async () => {
  const app = express();
  app.use(express.json());
  app.get('/unconfigured', createAuthenticate({ secret: '' }), (req, res) => res.sendStatus(200));
  app.use(createAuthenticate({ secret }));
  app.get('/identity', (req, res) => res.json(req.user));
  app.get('/admin', allowRoles(R.SUPER_ADMIN), (req, res) => res.sendStatus(200));
  app.all('/audit', allowRoles(R.COA_AUDITOR), (req, res) => res.sendStatus(200));
  app.get('/list', allowRoles(...Object.values(R)), scopeJurisdiction, (req, res) => res.json(req.jurisdictionFilter));
  app.post('/record/:place', allowRoles(...Object.values(R)), (req, res, next) => {
    req.record = { address: { province: 'Laguna', municipality: 'Calamba', barangay: req.params.place } };
    next();
  }, requireJurisdiction(req => req.record.address), (req, res) => res.sendStatus(200));
  listener = await new Promise(resolve => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); });
  base = `http://127.0.0.1:${listener.address().port}`;
});
after(() => new Promise(resolve => listener.close(resolve)));
function request(path, bearer = token(), options = {}) {
  return fetch(base + path, { ...options, headers: {
    ...(bearer === null ? {} : { Authorization: `Bearer ${bearer}` }), ...options.headers
  } });
}

test('verified contract-style claims become req.user without extra token claims', async () => {
  const r = await request('/identity', token({ ...claims, password_hash: 'must-not-be-copied' }));
  assert.equal(r.status, 200); assert.deepEqual(await r.json(), claims);
});

test('missing, malformed, expired, future, forged, unsigned and wrong-algorithm tokens return 401', async () => {
  const bad = [null, 'not-a-jwt', token(claims, { expiresIn: -1 }), token(claims, { notBefore: '1h' }),
    jwt.sign(claims, 'wrong-secret', { expiresIn: '15m' }), token(claims, { algorithm: 'HS384' }),
    jwt.sign(claims, '', { algorithm: 'none', expiresIn: '15m' }), jwt.sign(claims, secret),
    token({ ...claims, role: 'UNKNOWN' }), token({ ...claims, userId: '' })];
  for (const value of bad) {
    const r = await request('/identity', value); assert.equal(r.status, 401);
    assert.ok(['UNAUTHORIZED', 'TOKEN_EXPIRED'].includes((await r.json()).error.code));
  }
  assert.equal((await request('/identity', token(), { headers: { Authorization: 'Basic abc' } })).status, 401);
});

test('unconfigured authentication fails closed', async () => {
  assert.equal((await request('/unconfigured')).status, 503);
});

test('explicit role permissions and auditor read-only access are enforced', async () => {
  for (const role of Object.values(R)) {
    assert.equal((await request('/admin', token({ ...claims, role }))).status, role === R.SUPER_ADMIN ? 200 : 403);
  }
  const auditor = token({ ...claims, role: R.COA_AUDITOR });
  assert.equal((await request('/audit', auditor)).status, 200);
  assert.equal((await request('/audit', auditor, { method: 'POST' })).status, 403);
});

test('both scoped roles receive enforced filters when callers omit jurisdiction', async () => {
  for (const role of [R.REGIONAL_DIRECTOR, R.CASE_WORKER]) {
    const r = await request('/list', token({ ...claims, role }));
    assert.equal(r.status, 200);
    assert.deepEqual(await r.json(), { 'address.province': 'Laguna', 'address.municipality': 'Calamba', 'address.barangay': { $in: ['Palingon'] } });
  }
});

test('out-of-scope or operator-shaped query filters cannot bypass jurisdiction', async () => {
  for (const query of ['municipality=Other', 'province=Other', 'barangay=Other', 'municipality[$ne]=x', 'municipality=Calamba&municipality=Other']) {
    assert.equal((await request('/list?' + query)).status, 403);
  }
  assert.equal((await request('/list?municipality=Calamba&barangay=Palingon')).status, 200);
});

test('missing or invalid jurisdiction fails closed for scoped users', async () => {
  for (const j of [undefined, {}, { ...jurisdiction, assigned_barangays: [] }, { ...jurisdiction, assigned_barangays: 'Palingon' }, { ...jurisdiction, province: '' }]) {
    assert.equal((await request('/list', token({ ...claims, jurisdiction: j }))).status, 403);
  }
});

test('record checks use trusted address, not spoofed body jurisdiction', async () => {
  for (const role of [R.REGIONAL_DIRECTOR, R.CASE_WORKER]) {
    const t = token({ ...claims, role });
    assert.equal((await request('/record/Palingon', t, { method: 'POST' })).status, 200);
    assert.equal((await request('/record/Other', t, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ role: R.SUPER_ADMIN, address: { province: 'Laguna', municipality: 'Calamba', barangay: 'Palingon' } }) })).status, 403);
  }
});

test('national roles have no geographic filter but still require explicit route permission', async () => {
  for (const role of [R.SUPER_ADMIN, R.COA_AUDITOR]) {
    const r = await request('/list', token({ userId: 'national-user', role }));
    assert.equal(r.status, 200); assert.deepEqual(await r.json(), {});
  }
});

test('invalid middleware configuration is rejected', () => {
  assert.throws(() => allowRoles(), TypeError);
  assert.throws(() => allowRoles('UNKNOWN'), TypeError);
  assert.throws(() => requireJurisdiction(), TypeError);
});

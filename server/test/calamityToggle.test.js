const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { createApp } = require('../src/app');
const { createAuthService } = require('../src/services/auth.service');
const { createCalamityToggle } = require('../src/services/calamityToggle.service');
const { computeEntryHash } = require('../src/utils/cryptoHelper');
const { startReplicaSet } = require('./support/replicaSet');

const DAY = 24 * 60 * 60 * 1000;

test('INT-04 POST /api/v1/calamity/toggle against a disposable MongoDB replica set', {
  skip: process.env.RUN_WORKFLOW_MONGO_TESTS !== '1', timeout: 120000
}, async t => {
  const { models } = await startReplicaSet(t, 'calamity_toggle_test');
  const { users, beneficiaries, audits, configs } = models;
  const jurisdiction = { region: 'Region IV-A', province: 'Laguna', municipality: 'Calamba',
    assigned_barangays: ['Palingon'] };
  const password = 'Calamity-test-password-2026!';
  const password_hash = await bcrypt.hash(password, 4);
  const makeUser = (username, role, j = jurisdiction) => users.create({ username, role, password_hash,
    full_name: username, email: `${username}@example.test`, is_active: true, jurisdiction: j });
  const admin = await makeUser('admin', 'SUPER_ADMIN', {});
  await makeUser('director', 'REGIONAL_DIRECTOR');
  await makeUser('auditor', 'COA_AUDITOR', {});
  await makeUser('worker', 'CASE_WORKER');
  for (const [id, municipality] of [['H1', 'Calamba'], ['H2', 'Calamba'], ['H3', 'Santa Rosa']]) {
    await beneficiaries.create({ household_id: id,
      head_of_household: { first_name: 'Test', last_name: 'Household', national_id: `NID-${id}` },
      address: { province: 'Laguna', municipality, barangay: 'Palingon',
        coordinates: { type: 'Point', coordinates: [121.16, 14.21] } },
      demographics: { household_size: 4 }, enrolled_swdi_level: 1, program_status: 'ACTIVE_COMPLIANT' });
  }

  const secret = crypto.randomBytes(32).toString('hex');
  const app = createApp({ mockMode: false, production: true, authService: createAuthService({ users, secret }),
    calamityToggle: createCalamityToggle(models) });
  const server = await new Promise(resolve => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); });
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}/api/v1`;
  const tokens = {};
  const expiredToken = user => jwt.sign({ userId: String(user._id), role: user.role,
    exp: Math.floor(Date.now() / 1000) - 60 }, secret, { algorithm: 'HS256' });
  for (const username of ['admin', 'director', 'auditor', 'worker']) {
    const r = await fetch(`${base}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }) });
    assert.equal(r.status, 200, `login ${username}`);
    tokens[username] = (await r.json()).access_token;
  }
  const post = (as, body, raw) => fetch(`${base}/calamity/toggle`, { method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(as ? { Authorization: `Bearer ${tokens[as]}` } : {}) },
    body: raw ?? JSON.stringify(body) });
  const iso = offset => new Date(Date.now() + offset).toISOString();
  const declare = (extra = {}) => ({ province: 'Laguna', municipality: 'Calamba', is_active: true,
    ndrrmc_reference: 'NDRRMC-2026-TY-KRISTINE', expires_at: iso(7 * DAY), ...extra });
  const lift = (extra = {}) => ({ province: 'Laguna', municipality: 'Calamba', is_active: false, ...extra });
  async function rejected(response, status, code) {
    assert.equal(response.status, status);
    assert.equal((await response.json()).error.code, code);
  }
  async function noWrites(operation) {
    const before = [await audits.countDocuments(), JSON.stringify(await configs.find().lean())];
    await operation();
    assert.deepEqual([await audits.countDocuments(), JSON.stringify(await configs.find().lean())], before,
      'rejection paths must not write configuration or audit blocks');
  }
  const sealed = log => computeEntryHash({ sequenceIndex: log.sequence_index,
    previousEntryHash: log.previous_entry_hash, timestamp: log.timestamp, actorId: log.actor.user_id,
    action: log.action, stateDelta: log.state_delta });

  await t.test('security guards: 401, director 403, worker 403, auditor 403', async () => {
    await noWrites(async () => {
      await rejected(await post(null, declare()), 401, 'UNAUTHORIZED');
      tokens.expired = expiredToken(admin);
      await rejected(await post('expired', declare()), 401, 'TOKEN_EXPIRED');
      await rejected(await post('director', declare()), 403, 'FORBIDDEN');
      await rejected(await post('worker', declare()), 403, 'FORBIDDEN');
      await rejected(await post('auditor', declare()), 403, 'FORBIDDEN');
    });
  });

  await t.test('boundary validation: 400 with no writes', async () => {
    await noWrites(async () => {
      for (const body of [
        declare({ is_active: 'true' }), declare({ extra: 1 }), declare({ province: '' }),
        declare({ municipality: { $ne: null } }), declare({ ndrrmc_reference: undefined }),
        declare({ expires_at: '2026-12-01T00:00:00' }), declare({ expires_at: 'tomorrow' }),
        lift({ ndrrmc_reference: 'NDRRMC-X' }), lift({ expires_at: iso(DAY) }),
        { province: 'Laguna', municipality: 'Calamba' }
      ]) await rejected(await post('admin', body), 400, 'INVALID_REQUEST');
      await rejected(await post('admin', null, '{'), 400, 'INVALID_JSON');
      await rejected(await post('admin', declare({ expires_at: iso(-DAY) })), 400, 'INVALID_EXPIRY');
    });
  });

  await t.test('lifting with no declared zone is a 409 and creates nothing', async () => {
    await noWrites(async () => {
      await rejected(await post('admin', lift()), 409, 'CALAMITY_NOT_ACTIVE');
    });
  });

  await t.test('declaration returns the hold for the matching zone and seals CALAMITY_DECLARED', async () => {
    const body = declare();
    const r = await post('admin', body);
    assert.equal(r.status, 201);
    assert.equal(r.headers.get('cache-control'), 'no-store');
    const data = await r.json();
    assert.equal(data.province, 'Laguna'); assert.equal(data.municipality, 'Calamba');
    assert.equal(data.is_active, true); assert.equal(data.hold_active, true);
    assert.equal(data.affected_households, 2);
    assert.equal(data.zone.ndrrmc_reference, body.ndrrmc_reference);
    assert.equal(data.zone.expires_at, body.expires_at);
    const config = await configs.findOne({ config_key: 'CALAMITY_ZONES' }).lean();
    assert.equal(config.calamity_moratorium_zones.length, 1);
    assert.equal(config.calamity_moratorium_zones[0].is_active, true);
    assert.equal(config.updated_by, String(admin._id));
    const log = await audits.findOne({ sequence_index: data.audit_receipt.sequence_index }).lean();
    assert.equal(log.action, 'CALAMITY_DECLARED');
    assert.deepEqual(log.target_entity, { collection_name: 'system_configs', entity_id: 'CALAMITY_ZONES' });
    assert.equal(log.state_delta.before.hold_active, false);
    assert.equal(log.state_delta.after.hold_active, true);
    assert.equal(log.entry_hash, sealed(log));
    assert.equal(log.entry_hash, data.audit_receipt.entry_hash);
  });

  await t.test('a second declaration for an active zone is a 409 with no writes', async () => {
    await noWrites(async () => {
      await rejected(await post('admin', declare({ ndrrmc_reference: 'NDRRMC-OTHER' })), 409, 'CALAMITY_ALREADY_ACTIVE');
    });
  });

  await t.test('lifting releases the hold, keeps history and seals SYSTEM_CONFIG_UPDATED', async () => {
    const r = await post('admin', lift());
    assert.equal(r.status, 200);
    const data = await r.json();
    assert.equal(data.is_active, false); assert.equal(data.hold_active, false);
    const config = await configs.findOne({ config_key: 'CALAMITY_ZONES' }).lean();
    assert.equal(config.calamity_moratorium_zones.length, 1);
    assert.equal(config.calamity_moratorium_zones[0].is_active, false);
    const log = await audits.findOne({ sequence_index: data.audit_receipt.sequence_index }).lean();
    assert.equal(log.action, 'SYSTEM_CONFIG_UPDATED');
    assert.equal(log.state_delta.before.hold_active, true);
    assert.equal(log.state_delta.after.hold_active, false);
    assert.equal(log.entry_hash, sealed(log));
    await noWrites(async () => { await rejected(await post('admin', lift()), 409, 'CALAMITY_NOT_ACTIVE'); });
  });

  await t.test('open-ended re-declaration appends a new zone; expired zones do not block', async () => {
    let r = await post('admin', declare({ expires_at: undefined }));
    assert.equal(r.status, 201);
    assert.equal((await r.json()).zone.expires_at, null);
    await configs.updateOne({ config_key: 'CALAMITY_ZONES' }, { $push: { calamity_moratorium_zones: {
      province: 'Laguna', municipality: 'Santa Rosa', is_active: true,
      declared_at: new Date(Date.now() - 10 * DAY), expires_at: new Date(Date.now() - DAY) } } });
    r = await post('admin', declare({ municipality: 'Santa Rosa' }));
    assert.equal(r.status, 201);
    const data = await r.json();
    assert.equal(data.hold_active, true); assert.equal(data.affected_households, 1);
    const zones = (await configs.findOne({ config_key: 'CALAMITY_ZONES' }).lean()).calamity_moratorium_zones;
    assert.equal(zones.length, 4);
  });

  await t.test('audit chain stays contiguous across toggles', async () => {
    const logs = await audits.find().sort({ sequence_index: 1 }).lean();
    assert.deepEqual(logs.map(l => l.sequence_index), [1, 2, 3, 4]);
    logs.forEach((log, i) => {
      assert.equal(log.previous_entry_hash, i ? logs[i - 1].entry_hash : '0'.repeat(64));
      assert.equal(log.entry_hash, sealed(log));
    });
  });

  await t.test('simultaneous first declarations create one config and one active zone', async () => {
    await configs.deleteMany({});
    const results = await Promise.all([post('admin', declare({ municipality: 'Biñan' })),
      post('admin', declare({ municipality: 'Biñan', ndrrmc_reference: 'NDRRMC-RACE' }))]);
    assert.deepEqual(results.map(r => r.status).sort(), [201, 409]);
    const all = await configs.find().lean();
    assert.equal(all.length, 1);
    assert.equal(all[0].calamity_moratorium_zones.filter(z => z.is_active).length, 1);
  });
});

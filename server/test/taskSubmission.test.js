const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { createApp } = require('../src/app');
const { createAuthService } = require('../src/services/auth.service');
const { createTaskSubmission } = require('../src/services/taskSubmission.service');
const { computeEntryHash } = require('../src/utils/cryptoHelper');
const { startReplicaSet } = require('./support/replicaSet');

// 1x1 PNG, matching the INT-02 integration script.
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const HOME = [121.1578, 14.2110]; // [lon, lat]

test('INT-02/INT-06 POST /api/v1/tasks/:id/submit persists findings and seals REPORT_SUBMITTED', {
  skip: process.env.RUN_WORKFLOW_MONGO_TESTS !== '1', timeout: 120000
}, async t => {
  const { models } = await startReplicaSet(t, 'task_submission_test');
  const { users, beneficiaries, audits, tasks } = models;
  const jurisdiction = { region: 'Region IV-A', province: 'Laguna', municipality: 'Calamba',
    assigned_barangays: ['Palingon'] };
  const password = 'Submit-test-password-2026!';
  const password_hash = await bcrypt.hash(password, 4);
  const makeUser = (username, role, j = jurisdiction) => users.create({ username, role, password_hash,
    full_name: username, email: `${username}@example.test`, is_active: true, jurisdiction: j });
  const worker = await makeUser('worker', 'CASE_WORKER');
  const other = await makeUser('other', 'CASE_WORKER');
  await makeUser('director', 'REGIONAL_DIRECTOR');
  await makeUser('auditor', 'COA_AUDITOR', {});

  const secret = crypto.randomBytes(32).toString('hex');
  const app = createApp({ mockMode: false, production: true, authService: createAuthService({ users, secret }),
    taskSubmission: createTaskSubmission(models) });
  const server = await new Promise(resolve => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); });
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}/api/v1`;
  const tokens = {};
  const expiredToken = user => jwt.sign({ userId: String(user._id), role: user.role,
    exp: Math.floor(Date.now() / 1000) - 60 }, secret, { algorithm: 'HS256' });
  for (const username of ['worker', 'other', 'director', 'auditor']) {
    const r = await fetch(`${base}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }) });
    assert.equal(r.status, 200, `login ${username}`);
    tokens[username] = (await r.json()).access_token;
  }

  async function seed(id) {
    await beneficiaries.create({ household_id: `HH-${id}`,
      head_of_household: { first_name: 'Test', last_name: 'Household', national_id: `NID-${id}` },
      address: { province: 'Laguna', municipality: 'Calamba', barangay: 'Palingon',
        coordinates: { type: 'Point', coordinates: HOME } },
      demographics: { household_size: 4 }, enrolled_swdi_level: 1, program_status: 'UNDER_INVESTIGATION' });
    await tasks.create({ task_id: `TSK-${id}`, household_id: `HH-${id}`, assigned_worker_id: worker._id,
      task_status: 'PENDING_DISPATCH', due_date: new Date(Date.now() + 86400000) });
  }
  const findings = (id, { attachments = [], lat = HOME[1], lon = HOME[0] } = {}) => ({
    task_id: `TSK-${id}`, household_id: `HH-${id}`, verified_swdi_level: 3,
    worker_recommendation: 'RECOMMEND_GRADUATION', narrative_report: 'Motorcycle used for MoveIt delivery.',
    livelihood_asset_verification: { is_motorcycle_present: true, is_productive_asset: true,
      proof_type: 'MOVEIT', franchise_number: '' },
    landbank_card_inspection: { physical_card_presented: true, card_matches_beneficiary: true, pawning_suspected: false },
    client_geolocation: { latitude: lat, longitude: lon, accuracy_meters: 12, captured_at: new Date().toISOString() },
    evidence_attachments: attachments.map(hash => ({ media_type: 'image/png',
      storage_url: 'https://evidence.example.test/photo.png', sha256_hash: hash }))
  });
  const asJson = (as, id, body) => fetch(`${base}/tasks/${id}/submit`, { method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(as ? { Authorization: `Bearer ${tokens[as]}` } : {}) },
    body: JSON.stringify(body) });
  const asMultipart = (as, id, body, files) => {
    const form = new FormData();
    for (const [key, value] of Object.entries(body)) {
      form.append(key, typeof value === 'object' ? JSON.stringify(value) : String(value));
    }
    for (const bytes of files) form.append('evidence_files', new Blob([bytes], { type: 'image/png' }), 'evidence.png');
    return fetch(`${base}/tasks/${id}/submit`, { method: 'POST', headers: { Authorization: `Bearer ${tokens[as]}` }, body: form });
  };
  async function rejected(response, status, code) {
    assert.equal(response.status, status);
    assert.equal((await response.json()).error.code, code);
  }
  async function noWrites(id, operation) {
    const before = [await audits.countDocuments(), (await tasks.findOne({ task_id: `TSK-${id}` }).lean())];
    await operation();
    const after = [await audits.countDocuments(), (await tasks.findOne({ task_id: `TSK-${id}` }).lean())];
    assert.deepEqual(after, before, 'rejection paths must not write task state or audit blocks');
  }

  await t.test('JSON contract submission: 200 frozen response, findings persisted, audit sealed', async () => {
    await seed('JSON');
    const body = findings('JSON', { attachments: [sha(PNG)] });
    const r = await asJson('worker', 'TSK-JSON', body);
    assert.equal(r.status, 200);
    const data = await r.json();
    assert.deepEqual(Object.keys(data).sort(),
      ['audit_receipt', 'geofence_verification', 'submitted_at', 'task_id', 'task_status']);
    assert.equal(data.task_id, 'TSK-JSON'); assert.equal(data.task_status, 'SUBMITTED');
    assert.deepEqual(data.geofence_verification, { is_matched: true, distance_variance_meters: 0 });
    const task = await tasks.findOne({ task_id: 'TSK-JSON' }).lean();
    assert.equal(task.task_status, 'SUBMITTED');
    assert.equal(task.field_findings.worker_recommendation, 'RECOMMEND_GRADUATION');
    assert.equal(task.field_findings.evidence_attachments[0].sha256_hash, sha(PNG));
    assert.equal((await beneficiaries.findOne({ household_id: 'HH-JSON' })).program_status, 'UNDER_INVESTIGATION');
    const log = await audits.findOne({ sequence_index: data.audit_receipt.sequence_index }).lean();
    assert.equal(log.action, 'REPORT_SUBMITTED');
    assert.deepEqual(log.target_entity, { collection_name: 'verification_tasks', entity_id: 'TSK-JSON' });
    assert.equal(log.actor.user_id, String(worker._id));
    assert.equal(log.state_delta.before.task_status, 'PENDING_DISPATCH');
    assert.equal(log.state_delta.after.task_status, 'SUBMITTED');
    assert.deepEqual(log.state_delta.after.evidence_sha256, [sha(PNG)]);
    assert.equal(log.state_delta.after.evidence_bytes_verified, false);
    assert.equal(log.entry_hash, data.audit_receipt.entry_hash);
    assert.equal(log.entry_hash, computeEntryHash({ sequenceIndex: log.sequence_index,
      previousEntryHash: log.previous_entry_hash, timestamp: log.timestamp, actorId: log.actor.user_id,
      action: log.action, stateDelta: log.state_delta }));
  });

  await t.test('multipart with matching bytes verifies evidence', async () => {
    await seed('MP');
    const r = await asMultipart('worker', 'TSK-MP', findings('MP', { attachments: [sha(PNG)] }), [PNG]);
    assert.equal(r.status, 200);
    const log = await audits.findOne({ 'target_entity.entity_id': 'TSK-MP' }).lean();
    assert.equal(log.state_delta.after.evidence_bytes_verified, true);
  });

  await t.test('evidence integrity: altered bytes 422, missing files 400, no writes', async () => {
    await seed('EVID');
    const altered = Buffer.concat([PNG, Buffer.from([0])]);
    await noWrites('EVID', async () => {
      await rejected(await asMultipart('worker', 'TSK-EVID', findings('EVID', { attachments: [sha(PNG)] }), [altered]),
        422, 'EVIDENCE_HASH_MISMATCH');
      await rejected(await asMultipart('worker', 'TSK-EVID', findings('EVID', { attachments: [sha(PNG), sha(altered)] }), [PNG]),
        400, 'INVALID_EVIDENCE_INPUT');
      await rejected(await asMultipart('worker', 'TSK-EVID', findings('EVID'), [PNG]), 400, 'INVALID_EVIDENCE_INPUT');
      const wrongField = new FormData();
      wrongField.append('photo', new Blob([PNG], { type: 'image/png' }), 'evidence.png');
      await rejected(await fetch(`${base}/tasks/TSK-EVID/submit`, { method: 'POST',
        headers: { Authorization: `Bearer ${tokens.worker}` }, body: wrongField }), 400, 'INVALID_EVIDENCE_INPUT');
      const oversized = new FormData();
      oversized.append('evidence_files', new Blob([Buffer.alloc(10 * 1024 * 1024 + 1)]), 'big.png');
      await rejected(await fetch(`${base}/tasks/TSK-EVID/submit`, { method: 'POST',
        headers: { Authorization: `Bearer ${tokens.worker}` }, body: oversized }), 413, 'PAYLOAD_TOO_LARGE');
    });
  });

  await t.test('geofence breach beyond 250 m is rejected with GEOFENCE_VIOLATION and no writes', async () => {
    await seed('GEO');
    await noWrites('GEO', async () => {
      // ~0.003 deg latitude is ~333 m.
      await rejected(await asJson('worker', 'TSK-GEO', findings('GEO', { lat: HOME[1] + 0.003 })), 422, 'GEOFENCE_VIOLATION');
    });
    assert.equal((await asJson('worker', 'TSK-GEO', findings('GEO', { lat: HOME[1] + 0.002 }))).status, 200);
  });

  await t.test('security and identity guards: 401, 403 roles, 404 other worker, 400 mismatch', async () => {
    await seed('SEC');
    await noWrites('SEC', async () => {
      await rejected(await asJson(null, 'TSK-SEC', findings('SEC')), 401, 'UNAUTHORIZED');
      tokens.expired = expiredToken(worker);
      await rejected(await asJson('expired', 'TSK-SEC', findings('SEC')), 401, 'TOKEN_EXPIRED');
      await rejected(await asJson('director', 'TSK-SEC', findings('SEC')), 403, 'FORBIDDEN');
      await rejected(await asJson('auditor', 'TSK-SEC', findings('SEC')), 403, 'FORBIDDEN');
      await rejected(await asJson('other', 'TSK-SEC', findings('SEC')), 404, 'TASK_NOT_FOUND');
      await rejected(await asJson('worker', 'TSK-OTHER', findings('SEC')), 400, 'INVALID_SUBMISSION_REQUEST');
      await rejected(await asJson('worker', 'TSK-SEC', { ...findings('SEC'), extra: true }), 400, 'INVALID_SUBMISSION_REQUEST');
      await rejected(await asJson('worker', 'TSK-SEC', { ...findings('SEC'), household_id: 'HH-JSON' }), 400, 'SUBMISSION_IDENTITY_MISMATCH');
    });
  });

  await t.test('duplicate and simultaneous submissions commit exactly once', async () => {
    await noWrites('JSON', async () => {
      await rejected(await asJson('worker', 'TSK-JSON', findings('JSON')), 409, 'TASK_NOT_SUBMITTABLE');
    });
    await seed('RACE');
    const results = await Promise.all([asJson('worker', 'TSK-RACE', findings('RACE')),
      asJson('worker', 'TSK-RACE', findings('RACE'))]);
    assert.deepEqual(results.map(r => r.status).sort(), [200, 409]);
    assert.equal(await audits.countDocuments({ 'target_entity.entity_id': 'TSK-RACE' }), 1);
  });
});

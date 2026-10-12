const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const bcrypt = require('bcryptjs');
const { createApp } = require('../src/app');
const { createAuthService } = require('../src/services/auth.service');
const { createAppealDocket } = require('../src/services/appealDocket.service');
const { computeEntryHash } = require('../src/utils/cryptoHelper');
const { startReplicaSet } = require('./support/replicaSet');

const DAY = 24 * 60 * 60 * 1000;

test('INT-03 POST /api/v1/appeals/docket against a disposable MongoDB replica set', {
  skip: process.env.RUN_WORKFLOW_MONGO_TESTS !== '1', timeout: 120000
}, async t => {
  const { models } = await startReplicaSet(t, 'appeal_docket_test');
  const { users, beneficiaries, audits, tasks } = models;
  const jurisdiction = { region: 'Region IV-A', province: 'Laguna', municipality: 'Calamba',
    assigned_barangays: ['Palingon'] };
  const password = 'Docket-test-password-2026!';
  const password_hash = await bcrypt.hash(password, 4);
  const makeUser = (username, role, j = jurisdiction) => users.create({ username, role, password_hash,
    full_name: username, email: `${username}@example.test`, is_active: true, jurisdiction: j });
  const director = await makeUser('director', 'REGIONAL_DIRECTOR');
  await makeUser('admin', 'SUPER_ADMIN', {});
  await makeUser('auditor', 'COA_AUDITOR', {});
  await makeUser('worker', 'CASE_WORKER');
  await makeUser('outsider', 'REGIONAL_DIRECTOR', { ...jurisdiction, assigned_barangays: ['Real'] });

  const secret = crypto.randomBytes(32).toString('hex');
  const authService = createAuthService({ users, secret });
  const app = createApp({ mockMode: false, production: true, authService,
    appealDocket: createAppealDocket(models) });
  const server = await new Promise(resolve => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); });
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}/api/v1`;
  const tokens = {};
  for (const username of ['director', 'admin', 'auditor', 'worker', 'outsider']) {
    const r = await fetch(`${base}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }) });
    assert.equal(r.status, 200, `login ${username}`);
    tokens[username] = (await r.json()).access_token;
  }
  const post = (as, body, raw) => fetch(`${base}/appeals/docket`, { method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(as ? { Authorization: `Bearer ${tokens[as]}` } : {}) },
    body: raw ?? JSON.stringify(body) });

  const manilaDate = offset => new Date(Date.now() + 8 * 60 * 60 * 1000 + offset).toISOString().slice(0, 10);
  async function seed(id, { status = 'NOTICE_OF_INELIGIBILITY', barangay = 'Palingon', noticeAgo = 2 * DAY,
    approved = true } = {}) {
    await beneficiaries.create({ household_id: id,
      head_of_household: { first_name: 'Test', last_name: 'Household', national_id: `NID-${id}` },
      address: { province: 'Laguna', municipality: 'Calamba', barangay,
        coordinates: { type: 'Point', coordinates: [121.16, 14.21] } },
      demographics: { household_size: 4 }, enrolled_swdi_level: 1, program_status: status });
    if (noticeAgo !== null) {
      await tasks.create({ task_id: `TSK-${id}`, household_id: id, assigned_worker_id: director._id,
        task_status: approved ? 'VERIFIED_GRADUATE' : 'SUBMITTED', due_date: new Date(),
        admin_resolution: approved ? { reviewed_by: director._id, decision: 'APPROVED_GRADUATION',
          finalized_at: new Date(Date.now() - noticeAgo) } : undefined });
    }
  }
  const payload = (household_id, extra = {}) => ({ household_id, appeal_docket_id: `APP-${household_id}`,
    hearing_date: manilaDate(5 * DAY), appeal_grounds: 'Motorcycle is registered to a sibling living separately.',
    ...extra });
  async function rejected(response, status, code) {
    assert.equal(response.status, status);
    assert.equal((await response.json()).error.code, code);
  }
  async function noWrites(operation) {
    const before = await audits.countDocuments();
    await operation();
    assert.equal(await audits.countDocuments(), before, 'rejection paths must not append audit blocks');
  }

  await t.test('the frontend appeal dialog payload is accepted: 201, countdown paused, audit sealed', async () => {
    await seed('HH-OK');
    const r = await post('director', payload('HH-OK'));
    assert.equal(r.status, 201);
    assert.equal(r.headers.get('cache-control'), 'no-store');
    const body = await r.json();
    const notice = (await tasks.findOne({ task_id: 'TSK-HH-OK' }).lean()).admin_resolution.finalized_at;
    assert.equal(body.household_id, 'HH-OK');
    assert.equal(body.appeal_docket_id, 'APP-HH-OK');
    assert.equal(body.docket_status, 'UNDER_APPEAL_HEARING');
    assert.equal(body.program_status, 'NOTICE_OF_INELIGIBILITY');
    assert.equal(body.countdown_paused, true);
    assert.equal(body.notice_date, notice.toISOString());
    assert.equal(Date.parse(body.notice_expiry_date) - Date.parse(body.notice_date), 15 * DAY);
    assert.equal(body.hearing_date, payload('HH-OK').hearing_date);
    assert.ok(Number.isFinite(Date.parse(body.filed_at)));
    // Frozen schema: program_status is untouched; the appeal lives in the sealed ledger.
    assert.equal((await beneficiaries.findOne({ household_id: 'HH-OK' })).program_status, 'NOTICE_OF_INELIGIBILITY');
    const log = await audits.findOne({ sequence_index: body.audit_receipt.sequence_index }).lean();
    assert.equal(log.action, 'APPEAL_FILED');
    assert.deepEqual(log.target_entity, { collection_name: 'beneficiaries', entity_id: 'HH-OK' });
    assert.equal(log.actor.user_id, String(director._id));
    assert.equal(log.state_delta.after.appeal_docket_id, 'APP-HH-OK');
    assert.equal(log.state_delta.after.countdown_paused, true);
    assert.equal(log.state_delta.before.appeal_deadline, body.notice_expiry_date);
    assert.equal(log.entry_hash, body.audit_receipt.entry_hash);
    assert.equal(log.entry_hash, computeEntryHash({ sequenceIndex: log.sequence_index,
      previousEntryHash: log.previous_entry_hash, timestamp: log.timestamp, actorId: log.actor.user_id,
      action: log.action, stateDelta: log.state_delta }));
  });

  await t.test('SUPER_ADMIN may docket; chain stays contiguous and verifiable', async () => {
    await seed('HH-ADMIN', { barangay: 'Real' });
    const r = await post('admin', payload('HH-ADMIN'));
    assert.equal(r.status, 201);
    const logs = await audits.find().sort({ sequence_index: 1 }).lean();
    assert.deepEqual(logs.map(l => l.sequence_index), [1, 2]);
    assert.equal(logs[1].previous_entry_hash, logs[0].entry_hash);
  });

  await t.test('400 root causes are rejected at the boundary with no writes', async () => {
    await seed('HH-400');
    await noWrites(async () => {
      // Extra fields the dialog does not send (and the frozen enum cannot store).
      await rejected(await post('director', payload('HH-400', { status: 'UNDER_APPEAL_HEARING' })), 400, 'INVALID_REQUEST');
      await rejected(await post('director', payload('HH-400', { notice_date: '2026-10-01' })), 400, 'INVALID_REQUEST');
      // Non-calendar or impossible hearing dates; numbers are never coerced.
      for (const hearing_date of ['2026-02-30', '20261020', '2026-10-20T00:00:00Z', 20261020, null]) {
        await rejected(await post('director', payload('HH-400', { hearing_date })), 400, 'INVALID_REQUEST');
      }
      for (const field of ['household_id', 'appeal_docket_id', 'hearing_date', 'appeal_grounds']) {
        const body = payload('HH-400'); delete body[field];
        await rejected(await post('director', body), 400, 'INVALID_REQUEST');
      }
      await rejected(await post('director', payload('HH-400', { household_id: { $ne: null } })), 400, 'INVALID_REQUEST');
      await rejected(await post('director', payload('HH-400', { appeal_docket_id: 'bad id with spaces' })), 400, 'INVALID_REQUEST');
      await rejected(await post('director', payload('HH-400', { appeal_grounds: 'short' })), 400, 'INVALID_REQUEST');
      await rejected(await post('director', null, '{'), 400, 'INVALID_JSON');
      await rejected(await post('director', payload('HH-400', { hearing_date: manilaDate(-DAY) })), 400, 'INVALID_HEARING_DATE');
    });
  });

  await t.test('security guards: 401, role 403, auditor 403, jurisdiction 403', async () => {
    await seed('HH-SEC');
    await noWrites(async () => {
      await rejected(await post(null, payload('HH-SEC')), 401, 'UNAUTHORIZED');
      await rejected(await post('worker', payload('HH-SEC')), 403, 'FORBIDDEN');
      await rejected(await post('auditor', payload('HH-SEC')), 403, 'FORBIDDEN');
      await rejected(await post('outsider', payload('HH-SEC')), 403, 'OUT_OF_JURISDICTION');
    });
  });

  await t.test('due-process prerequisites: 404, 409 status/notice/window/duplicate', async () => {
    await seed('HH-INV', { status: 'UNDER_INVESTIGATION' });
    await seed('HH-NO-NOTICE', { noticeAgo: null });
    await seed('HH-UNAPPROVED', { approved: false });
    await seed('HH-LATE', { noticeAgo: 15 * DAY });
    await seed('HH-FUTURE', { noticeAgo: -DAY });
    await noWrites(async () => {
      await rejected(await post('director', payload('HH-MISSING')), 404, 'HOUSEHOLD_NOT_FOUND');
      await rejected(await post('director', payload('HH-INV')), 409, 'NOTICE_REQUIRED');
      await rejected(await post('director', payload('HH-NO-NOTICE')), 409, 'NOTICE_RECORD_MISSING');
      await rejected(await post('director', payload('HH-UNAPPROVED')), 409, 'NOTICE_RECORD_MISSING');
      await rejected(await post('director', payload('HH-FUTURE')), 409, 'NOTICE_RECORD_MISSING');
      await rejected(await post('director', payload('HH-LATE')), 409, 'APPEAL_WINDOW_CLOSED');
      await rejected(await post('director', payload('HH-OK', { appeal_docket_id: 'APP-OTHER' })), 409, 'APPEAL_ALREADY_FILED');
    });
    await seed('HH-DUP-ID');
    await noWrites(async () => {
      await rejected(await post('director', payload('HH-DUP-ID', { appeal_docket_id: 'APP-HH-OK' })), 409, 'DOCKET_ID_CONFLICT');
    });
  });

  await t.test('simultaneous filings for one household yield exactly one appeal', async () => {
    await seed('HH-RACE');
    const results = await Promise.all([post('director', payload('HH-RACE')),
      post('admin', payload('HH-RACE', { appeal_docket_id: 'APP-HH-RACE-2' }))]);
    assert.deepEqual(results.map(r => r.status).sort(), [201, 409]);
    assert.equal(await audits.countDocuments({ action: 'APPEAL_FILED', 'target_entity.entity_id': 'HH-RACE' }), 1);
  });
});

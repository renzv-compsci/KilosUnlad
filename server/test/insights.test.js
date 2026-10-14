const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { createApp } = require('../src/app');
const { createInsights } = require('../src/services/insights.service');
const { WEIGHTS } = require('../src/services/discrepancy.service');
const { startReplicaSet } = require('./support/replicaSet');

const contract = name => require(`../../docs/contracts/admin-web/${name}.json`).response.data;
const keys = value => Object.keys(value).sort();

// UI live data (DECISION-010): read-only aggregates and lists for the screens that
// used sample data. Every route is scoped exactly like the triage feed.
test('UI live-data read routes: scope, roles, validation and contract shapes', {
  skip: process.env.RUN_WORKFLOW_MONGO_TESTS !== '1', timeout: 120000
}, async t => {
  const { models } = await startReplicaSet(t, 'insights_test');
  const { users, beneficiaries, tasks, audits, configs } = models;
  const id = () => new mongoose.Types.ObjectId();
  const people = { director: id(), coa: id(), admin: id(), worker: id(), otherWorker: id(), inactiveWorker: id() };
  const jur = (municipality, barangays) => ({ region: 'IV-A', province: 'Laguna', municipality, assigned_barangays: barangays });
  await users.create([
    ['director', 'REGIONAL_DIRECTOR', jur('Calamba', ['Palingon', 'Real'])],
    ['coa', 'COA_AUDITOR', {}], ['admin', 'SUPER_ADMIN', {}],
    ['worker', 'CASE_WORKER', jur('Calamba', ['Palingon'])],
    ['otherWorker', 'CASE_WORKER', jur('Santa Rosa', ['Balibago'])],
    ['inactiveWorker', 'CASE_WORKER', jur('Calamba', ['Real']), false]
  ].map(([key, role, jurisdiction, active = true]) => ({ _id: people[key], full_name: `Test ${key}`, username: key,
    email: `${key}@test.local`, password_hash: 'x', role, jurisdiction, is_active: active })));

  const household = (hid, barangay, status, score, municipality = 'Calamba', badges = []) => ({ household_id: hid,
    head_of_household: { first_name: 'Ana', last_name: hid, national_id: `NID-${hid}` },
    address: { barangay, municipality, province: 'Laguna', coordinates: { type: 'Point', coordinates: [121.16, 14.21] } },
    demographics: {}, enrolled_swdi_level: 1, program_status: status,
    risk_assessment: { composite_risk_score: score, is_flagged: score >= 70, predicted_swdi_level: 3,
      trigger_badges: badges.map(code => ({ code, label: code, severity: 'HIGH' })), evaluated_at: new Date() } });
  await beneficiaries.create([
    household('H-FLAG', 'Palingon', 'FLAGGED_FOR_REVIEW', 75, 'Calamba', ['POWER_LIFELINE_BREACH']),
    household('H-INV', 'Real', 'UNDER_INVESTIGATION', 92, 'Calamba', ['POWER_LIFELINE_BREACH', 'LTO_VEHICLE_MATCH']),
    household('H-OK', 'Palingon', 'ACTIVE_COMPLIANT', 0),
    household('H-NOTICE', 'Palingon', 'NOTICE_OF_INELIGIBILITY', 80),
    household('H-OUT-BRGY', 'Lecheria', 'FLAGGED_FOR_REVIEW', 99),
    household('H-OUT-MUNI', 'Balibago', 'FLAGGED_FOR_REVIEW', 99, 'Santa Rosa')
  ]);
  const day = 24 * 3600 * 1000;
  await tasks.create([
    ['T-INV', 'H-INV', people.worker, 'PENDING_DISPATCH'],
    ['T-DONE', 'H-NOTICE', people.worker, 'VERIFIED_GRADUATE'],
    ['T-OUT', 'H-OUT-MUNI', people.otherWorker, 'PENDING_DISPATCH']
  ].map(([task_id, household_id, assigned_worker_id, task_status]) => ({ task_id, household_id, assigned_worker_id,
    task_status, priority: 'HIGH', due_date: new Date(Date.now() + 7 * day) })));
  await configs.create({ config_key: 'CALAMITY_ZONES', calamity_moratorium_zones: [
    { province: 'Laguna', municipality: 'Calamba', declared_at: new Date(Date.now() - day), is_active: true, ndrrmc_reference: 'NDRRMC-T-1' },
    { province: 'Laguna', municipality: 'Santa Rosa', declared_at: new Date(Date.now() - day), is_active: true, ndrrmc_reference: 'NDRRMC-T-2' }] });
  const block = (seq, action, entity) => ({ sequence_index: seq, previous_entry_hash: String(seq - 1).padStart(64, '0'),
    timestamp: new Date(Date.now() - (10 - seq) * 1000), actor: { user_id: String(people.admin), username: 'admin', role: 'SUPER_ADMIN' },
    action, target_entity: { collection_name: 'beneficiaries', entity_id: entity }, state_delta: { before: {}, after: {} },
    entry_hash: String(seq).padStart(64, 'a') });
  await audits.create([block(1, 'MODEL_FLAG_RAISED', 'H-INV'), block(2, 'TASK_DISPATCHED', 'H-INV'),
    block(3, 'APPEAL_FILED', 'H-NOTICE'), block(4, 'APPEAL_FILED', 'H-OUT-MUNI')]);

  const secret = crypto.randomBytes(32).toString('hex');
  const roleOf = { director: 'REGIONAL_DIRECTOR', coa: 'COA_AUDITOR', admin: 'SUPER_ADMIN', worker: 'CASE_WORKER' };
  const authService = { secret, findCurrentUser: async userId => {
    const u = await users.findById(userId).lean();
    return u && { userId: String(u._id), role: u.role, is_active: u.is_active, jurisdiction: u.jurisdiction };
  } };
  const app = createApp({ mockMode: false, production: true, authService, insights: createInsights(models) });
  const server = await new Promise(resolve => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); });
  t.after(() => new Promise(resolve => server.close(resolve)));
  const get = (who, path) => fetch(`http://127.0.0.1:${server.address().port}/api/v1/${path}`, { headers: who ? {
    Authorization: 'Bearer ' + jwt.sign({ userId: String(people[who]), role: roleOf[who] }, secret, { expiresIn: 900 }) } : {} })
    .then(async r => ({ status: r.status, data: await r.json().catch(() => null), cache: r.headers.get('cache-control') }));

  await t.test('GET /insights/overview is scoped and role-shaped', async () => {
    const d = await get('director', 'insights/overview');
    assert.equal(d.status, 200); assert.equal(d.cache, 'no-store');
    assert.deepEqual(keys(d.data), keys(contract('admin-insights-overview')));
    assert.equal(d.data.households.total, 4, 'Lecheria and Santa Rosa are outside the director scope');
    assert.deepEqual(d.data.households.by_status, { ACTIVE_COMPLIANT: 1, FLAGGED_FOR_REVIEW: 1, UNDER_INVESTIGATION: 1,
      NOTICE_OF_INELIGIBILITY: 1, GRADUATED: 0, CALAMITY_SUSPENDED: 0 });
    assert.deepEqual([d.data.risk.high_risk, d.data.risk.critical, d.data.risk.high, d.data.risk.below_threshold], [3, 2, 1, 1]);
    assert.deepEqual(d.data.risk.triggers.map(x => [x.code, x.count]), [['POWER_LIFELINE_BREACH', 2], ['LTO_VEHICLE_MATCH', 1]]);
    assert.deepEqual(d.data.municipalities.map(m => m.municipality), ['Calamba']);
    assert.equal(d.data.municipalities[0].calamity_active, true);
    assert.deepEqual(d.data.tasks.by_status, { PENDING_DISPATCH: 1, CACHED_OFFLINE: 0, SUBMITTED: 0, VERIFIED_GRADUATE: 1, VERIFIED_RETAIN: 0 });
    assert.deepEqual(d.data.tasks.workers.map(w => [w.full_name, w.open, w.verified]), [['Test worker', 1, 1]]);
    assert.deepEqual(d.data.due_process, { notices: 1, appeals_filed: 1 });
    assert.deepEqual(d.data.calamity.active_zones.map(z => z.municipality), ['Calamba']);
    assert.equal(d.data.audit, null, 'directors get no ledger statistics');
    const c = await get('coa', 'insights/overview');
    assert.equal(c.data.households.total, 6, 'COA scope is national');
    assert.equal(c.data.audit.total_blocks, 4); assert.equal(c.data.audit.last_sequence_index, 4);
    assert.deepEqual(c.data.audit.by_action, { MODEL_FLAG_RAISED: 1, TASK_DISPATCHED: 1, APPEAL_FILED: 2 });
    assert.equal((await get('worker', 'insights/overview')).status, 403);
    assert.equal((await get(null, 'insights/overview')).status, 401);
    assert.equal((await get('director', 'insights/overview?municipality=Calamba')).status, 400);
  });

  await t.test('GET /tasks lists scoped tasks with worker names', async () => {
    const d = await get('director', 'tasks?limit=10');
    assert.equal(d.status, 200);
    assert.deepEqual(keys(d.data), keys(contract('admin-task-list')));
    assert.deepEqual(keys(d.data.items[0]), keys(contract('admin-task-list').items[0]));
    assert.deepEqual(d.data.items.map(i => i.task_id).sort(), ['T-DONE', 'T-INV']);
    assert.equal(d.data.items.find(i => i.task_id === 'T-INV').assigned_worker.full_name, 'Test worker');
    assert.equal(d.data.pagination.total_records, 2);
    const f = await get('director', 'tasks?status=PENDING_DISPATCH');
    assert.deepEqual(f.data.items.map(i => i.task_id), ['T-INV']);
    assert.equal((await get('admin', 'tasks')).data.pagination.total_records, 3);
    for (const q of ['status=NOPE', 'limit=101', 'page=0', 'x=1']) assert.equal((await get('director', 'tasks?' + q)).status, 400, q);
    assert.equal((await get('coa', 'tasks')).status, 403);
    assert.equal((await get('worker', 'tasks')).status, 403);
  });

  await t.test('GET /users/caseworkers returns assignable workers only', async () => {
    const d = await get('director', 'users/caseworkers');
    assert.equal(d.status, 200);
    assert.deepEqual(keys(d.data.items[0]), keys(contract('admin-caseworker-directory').items[0]));
    assert.deepEqual(d.data.items.map(i => [i.username, i.open_tasks]), [['worker', 1]]);
    assert.equal(JSON.stringify(d.data).includes('password'), false);
    assert.deepEqual((await get('admin', 'users/caseworkers')).data.items.map(i => i.username).sort(), ['otherworker', 'worker'], 'usernames are stored lowercase');
    assert.equal((await get('coa', 'users/caseworkers')).status, 403);
    assert.equal((await get('director', 'users/caseworkers?x=1')).status, 400);
  });

  await t.test('GET /audit/blocks pages newest first for auditors', async () => {
    const d = await get('coa', 'audit/blocks?limit=2');
    assert.equal(d.status, 200);
    assert.deepEqual(keys(d.data), keys(contract('audit-block-list')));
    assert.deepEqual(keys(d.data.items[0]), keys(contract('audit-block-list').items[0]));
    assert.deepEqual(d.data.items.map(b => b.sequence_index), [4, 3]);
    assert.equal(d.data.next_before, 3); assert.equal(d.data.total_blocks, 4);
    const next = await get('coa', 'audit/blocks?limit=2&before=3');
    assert.deepEqual(next.data.items.map(b => b.sequence_index), [2, 1]); assert.equal(next.data.next_before, null);
    assert.equal(JSON.stringify(d.data).includes('state_delta'), false);
    assert.equal((await get('director', 'audit/blocks')).status, 403);
    for (const q of ['limit=101', 'before=0', 'before=x']) assert.equal((await get('coa', 'audit/blocks?' + q)).status, 400, q);
  });

  await t.test('GET /insights/map returns scoped household counts per cell, no identities', async () => {
    const d = await get('director', 'insights/map');
    assert.equal(d.status, 200); assert.equal(d.cache, 'no-store');
    assert.deepEqual(keys(d.data), keys(contract('admin-map-density')));
    assert.deepEqual(keys(d.data.cells[0]), keys(contract('admin-map-density').cells[0]));
    assert.equal(d.data.total_households, 4, 'same scope as the overview');
    assert.equal(d.data.cells.reduce((sum, c) => sum + c.households, 0), 4);
    assert.equal(d.data.cells.reduce((sum, c) => sum + c.active_compliant, 0), 1);
    assert.equal(d.data.cells.reduce((sum, c) => sum + c.under_review, 0), 3, 'flagged + investigation + notice');
    assert.ok(d.data.cells.every(c => Math.abs(c.center[0] - 121.161) < 0.002 && Math.abs(c.center[1] - 14.211) < 0.002), 'cell centre near the points');
    assert.equal(/H-[A-Z]|NID-|Ana/.test(JSON.stringify(d.data)), false, 'no household identities');
    assert.equal((await get('coa', 'insights/map')).data.total_households, 6);
    assert.equal((await get('worker', 'insights/map')).status, 403);
    assert.equal((await get(null, 'insights/map')).status, 401);
    assert.equal((await get('director', 'insights/map?precision=5')).status, 400);
  });

  await t.test('GET /system/policy reports the enforced values', async () => {
    const d = await get('director', 'system/policy');
    assert.equal(d.status, 200);
    assert.deepEqual(keys(d.data), keys(contract('admin-policy')));
    assert.deepEqual(d.data.risk_score.weights, { ...WEIGHTS });
    assert.equal(d.data.risk_score.flag_threshold, 70);
    assert.equal(d.data.field_verification.geofence_radius_m, 250);
    assert.equal(d.data.due_process.appeal_window_days, 15);
    assert.deepEqual(d.data.calamity_zones.map(z => z.municipality), ['Calamba'], 'directors see their own zone');
    assert.equal((await get('coa', 'system/policy')).data.calamity_zones.length, 2);
    assert.equal((await get('worker', 'system/policy')).status, 403);
  });
});

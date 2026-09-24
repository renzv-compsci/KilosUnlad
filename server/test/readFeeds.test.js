const { test } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const crypto = require('node:crypto');
const jwt = require('jsonwebtoken');
const { createApp } = require('../src/app');
const { createReadFeeds } = require('../src/services/readFeeds.service');

test('live feeds enforce contracts, pagination and data isolation in production', {
  skip: !process.env.TEST_MONGO_URI
}, async t => {
  const dbName = 'mae_feeds_test_' + crypto.randomBytes(12).toString('hex');
  const db = await mongoose.createConnection(process.env.TEST_MONGO_URI, { dbName, serverSelectionTimeoutMS: 3000 }).asPromise();
  let server;
  t.after(async () => {
    if (server) await new Promise(resolve => server.close(resolve));
    assert.match(db.name, /^mae_feeds_test_[a-f0-9]{24}$/);
    await db.dropDatabase(); await db.close();
  });
  const beneficiaries = db.model('Beneficiary', require('../src/models/Beneficiary').schema);
  const tasks = db.model('VerificationTask', require('../src/models/VerificationTask').schema);
  const workerId = new mongoose.Types.ObjectId();
  const otherId = new mongoose.Types.ObjectId();
  const template = require('../../docs/contracts/admin-web/admin-triage-feed.json').response.data.items[0];
  const make = (id, barangay, status) => ({ household_id: id,
    head_of_household: { first_name: 'Rodrigo', last_name: 'Mendoza', national_id: id, contact_phone: '+639181234567' },
    address: { street: 'Purok 3', province: 'Laguna', municipality: 'Calamba', barangay,
      coordinates: { type: 'Point', coordinates: [121.1652, 14.2144] } },
    demographics: {}, enrolled_swdi_level: 1, program_status: status,
    risk_assessment: { predicted_swdi_level: 3, composite_risk_score: 84,
      trigger_badges: template.trigger_badges, flag_reasons: ['Test reason'], evaluated_at: new Date('2026-09-10T06:00:00Z') } });
  await beneficiaries.create([make('A', 'Palingon', 'FLAGGED_FOR_REVIEW'), make('B', 'Palingon', 'UNDER_INVESTIGATION'),
    make('C', 'Other', 'NOTICE_OF_INELIGIBILITY')]);
  await tasks.create([
    ['T1', 'A', workerId, 'PENDING_DISPATCH'], ['T2', 'B', otherId, 'PENDING_DISPATCH'],
    ['T3', 'C', workerId, 'PENDING_DISPATCH'], ['T4', 'B', workerId, 'SUBMITTED'],
    ['T5', 'missing', workerId, 'PENDING_DISPATCH'], ['T6', 'B', workerId, 'CACHED_OFFLINE']
  ].map(([task_id, household_id, assigned_worker_id, task_status]) => ({ task_id, household_id,
    assigned_worker_id, task_status, assignment_notes: 'Verify household', due_date: new Date('2026-09-24T23:59:59Z') })));
  const secret = crypto.randomBytes(32).toString('hex');
  let role = 'REGIONAL_DIRECTOR';
  const authService = { secret, findCurrentUser: async () => ({ userId: String(workerId), role, is_active: true,
    jurisdiction: { region: 'IV-A', province: 'Laguna', municipality: 'Calamba', assigned_barangays: ['Palingon'] } }) };
  const app = createApp({ mockMode: false, production: true, authService, readFeeds: createReadFeeds({ beneficiaries, tasks }) });
  server = await new Promise(resolve => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); });
  const token = jwt.sign({ userId: String(workerId), role }, secret, { expiresIn: 900 });
  const get = path => fetch(`http://127.0.0.1:${server.address().port}/api/v1/${path}`, { headers: { Authorization: 'Bearer ' + token } });
  let r = await get('beneficiaries/triage-queue?status=FLAGGED_FOR_REVIEW&limit=1');
  assert.equal(r.status, 200);
  assert.equal(r.headers.get('x-kilosunlad-mock'), null); assert.equal(r.headers.get('cache-control'), 'no-store');
  let data = await r.json();
  assert.deepEqual(data.pagination, { total_records: 1, current_page: 1, total_pages: 1, limit: 1 });
  assert.deepEqual(data.summary_metrics, { high_risk_count: 2, under_investigation_count: 1, notice_of_ineligibility_count: 0 });
  assert.deepEqual(data.items[0], { ...template, household_id: 'A',
    head_of_household: { full_name: 'Rodrigo Mendoza', national_id: 'A' }, flagged_at: '2026-09-10T06:00:00.000Z' });
  data = await (await get('beneficiaries/triage-queue?page=2&limit=1')).json();
  assert.equal(data.items[0].household_id, 'B'); assert.equal(data.pagination.total_records, 2);
  assert.equal((await get('beneficiaries/triage-queue?municipality=Other')).status, 403);
  for (const query of ['page=0', 'limit=101', 'status=NOPE', 'status[$ne]=x', 'page=1&page=2']) {
    assert.equal((await get('beneficiaries/triage-queue?' + query)).status, 400);
  }
  role = 'COA_AUDITOR';
  data = await (await get('beneficiaries/triage-queue')).json(); assert.equal(data.pagination.total_records, 3);
  assert.equal((await get('tasks/assigned')).status, 403);
  role = 'CASE_WORKER';
  assert.equal((await get('beneficiaries/triage-queue')).status, 403);
  r = await get('tasks/assigned'); assert.equal(r.status, 200); data = await r.json();
  assert.equal(data.worker_id, String(workerId)); assert.equal(data.assigned_tasks_count, 2);
  assert.deepEqual(data.tasks.map(x => x.task_id), ['T1', 'T6']);
  const expected = require('../../docs/contracts/field-tablet/field-task-download.json').response.data.tasks[0];
  assert.deepEqual(data.tasks[0], { ...expected, task_id: 'T1', household_id: 'A',
    head_of_household: { ...expected.head_of_household, national_id: 'A' },
    risk_assessment: { composite_risk_score: 84, flag_reasons: ['Test reason'] },
    dispatch_instructions: 'Verify household', due_date: '2026-09-24T23:59:59.000Z' });
  assert.equal((await get('tasks/assigned?worker_id=' + otherId)).status, 400);
  await tasks.deleteMany({ assigned_worker_id: workerId });
  data = await (await get('tasks/assigned')).json(); assert.deepEqual(data.tasks, []);
  await beneficiaries.deleteMany({});
  role = 'REGIONAL_DIRECTOR';
  data = await (await get('beneficiaries/triage-queue')).json(); assert.equal(data.pagination.total_pages, 0);
});

const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const bcrypt = require('bcryptjs');
const { createApp } = require('../src/app');
const { createAuthService } = require('../src/services/auth.service');
const { createResolution } = require('../src/services/resolution.service');
const { createAppealDocket } = require('../src/services/appealDocket.service');
const { createRiskAssessment } = require('../src/services/riskAssessment.service');
const { createChainVerifier } = require('../src/services/hashChain.service');
const { startReplicaSet } = require('./support/replicaSet');

const DAY = 24 * 60 * 60 * 1000;
const contract = name => require(`../../docs/contracts/admin-web/${name}.json`);
const keys = value => Object.keys(value).sort();
const manilaToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila',
  year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());

// DECISION-012: retention after a field visit, appeal outcomes, and the 180-day re-flag cooldown.
test('DECISION-012 retention, appeal outcome and re-flag cooldown on a disposable replica set', {
  skip: process.env.RUN_WORKFLOW_MONGO_TESTS !== '1', timeout: 180000
}, async t => {
  const { models } = await startReplicaSet(t, 'retention_test');
  const { users, beneficiaries, audits, tasks, configs } = models;
  const uploadDir = await fs.mkdtemp(path.join(os.tmpdir(), 'kilosunlad-retention-'));
  t.after(() => fs.rm(uploadDir, { recursive: true, force: true }));

  const jurisdiction = { region: 'Region IV-A', province: 'Laguna', municipality: 'Calamba', assigned_barangays: ['Palingon'] };
  const password = 'Retention-test-password-2026!';
  const password_hash = await bcrypt.hash(password, 4);
  const makeUser = (username, role, j = jurisdiction) => users.create({ username, role, password_hash,
    full_name: `Test ${username}`, email: `${username}@example.test`, is_active: true, jurisdiction: j });
  const director = await makeUser('director', 'REGIONAL_DIRECTOR');
  await makeUser('auditor', 'COA_AUDITOR', {});
  const worker = await makeUser('worker', 'CASE_WORKER');
  await makeUser('outsider', 'REGIONAL_DIRECTOR', { ...jurisdiction, assigned_barangays: ['Real'] });

  const secret = crypto.randomBytes(32).toString('hex');
  const authService = createAuthService({ users, secret });
  const app = createApp({ mockMode: false, production: true, authService,
    resolution: createResolution({ ...models, uploadDir }), appealDocket: createAppealDocket(models) });
  const server = await new Promise(resolve => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); });
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}/api/v1`;
  const tokens = {};
  for (const username of ['director', 'auditor', 'worker', 'outsider']) {
    const r = await fetch(`${base}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }) });
    tokens[username] = (await r.json()).access_token;
  }
  const call = (as, method, p, body) => fetch(`${base}${p}`, { method, headers: {
    'Content-Type': 'application/json', ...(as ? { Authorization: `Bearer ${tokens[as]}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body) });
  const json = async r => ({ status: r.status, data: await r.json().catch(() => null) });
  async function rejected(promise, status, code) {
    const r = await json(await promise);
    assert.equal(r.status, status, JSON.stringify(r.data));
    assert.equal(r.data.error.code, code);
  }
  async function noWrites(operation) {
    const snapshot = async () => [await audits.countDocuments(),
      JSON.stringify(await beneficiaries.find().sort({ household_id: 1 }).lean()),
      JSON.stringify(await tasks.find().sort({ task_id: 1 }).lean())];
    const before = await snapshot();
    await operation();
    assert.deepEqual(await snapshot(), before, 'rejections must not write');
  }
  const chainValid = async () => {
    const head = await audits.findOne().sort({ sequence_index: -1 }).lean();
    return (await createChainVerifier({ audits }).verifyChain({ start_sequence: '1',
      end_sequence: String(head.sequence_index) })).is_chain_valid;
  };
  const calamity = () => configs.create({ config_key: 'CALAMITY_ZONES', calamity_moratorium_zones: [{ province: 'Laguna',
    municipality: 'Calamba', declared_at: new Date(Date.now() - DAY), is_active: true, ndrrmc_reference: 'NDRRMC-T' }] });

  async function seed(id, { barangay = 'Palingon', status = 'UNDER_INVESTIGATION', taskStatus = 'SUBMITTED',
    level = 2, recommendation = 'RETAIN', noticeAgo } = {}) {
    await beneficiaries.create({ household_id: id,
      head_of_household: { first_name: 'Lito', last_name: id, national_id: `NID-${id}` },
      address: { province: 'Laguna', municipality: 'Calamba', barangay, coordinates: { type: 'Point', coordinates: [121.16, 14.21] } },
      demographics: { household_size: 5 }, enrolled_swdi_level: 1, program_status: status });
    await tasks.create({ task_id: `TSK-${id}`, household_id: id, assigned_worker_id: worker._id, task_status: taskStatus,
      due_date: new Date(Date.now() + 7 * DAY), field_findings: { verified_swdi_level: level, worker_recommendation: recommendation,
        narrative_report: 'No vehicle found; irregular income from seasonal farm work.',
        client_geolocation: { latitude: 14.21, longitude: 121.16, accuracy_meters: 8, captured_at: new Date() } },
      ...(noticeAgo === undefined ? {} : { admin_resolution: { reviewed_by: director._id, decision: 'APPROVED_GRADUATION',
        admin_notes: 'Field visit confirmed Level 3 assets.', finalized_at: new Date(Date.now() - noticeAgo) } }) });
  }
  const notes = 'Field visit confirmed Level 2: no vehicle, irregular income; household stays eligible.';
  const hearing = 'Hearing found the sedan belongs to a relative abroad; income remains below threshold.';
  async function appealed(id, docket, hearingDate = manilaToday()) {
    await seed(id, { status: 'NOTICE_OF_INELIGIBILITY', taskStatus: 'VERIFIED_GRADUATE', level: 3,
      recommendation: 'RECOMMEND_GRADUATION', noticeAgo: 2 * DAY });
    const r = await json(await call('director', 'POST', '/appeals/docket', { household_id: id, appeal_docket_id: docket,
      hearing_date: hearingDate, appeal_grounds: 'The family disputes the ownership of the vehicle.' }));
    assert.equal(r.status, 201, JSON.stringify(r.data));
  }

  await t.test('POST /tasks/:id/retain returns the household to ACTIVE_COMPLIANT and seals BENEFICIARY_RETAINED', async () => {
    await seed('HH-KEEP');
    const report = await json(await call('director', 'GET', '/tasks/TSK-HH-KEEP/report'));
    assert.equal(report.status, 200);
    assert.deepEqual(keys(report.data), keys(contract('admin-task-report').response.data));
    assert.equal(report.data.retention_supported, true);
    assert.equal(report.data.graduation_supported, false);

    const r = await json(await call('director', 'POST', '/tasks/TSK-HH-KEEP/retain', { admin_notes: notes }));
    assert.equal(r.status, 200, JSON.stringify(r.data));
    assert.deepEqual(keys(r.data), keys(contract('admin-retention').response.data));
    assert.equal(r.data.household_status, 'ACTIVE_COMPLIANT');
    assert.equal(r.data.task_status, 'VERIFIED_RETAIN');
    assert.equal(Date.parse(r.data.reassessment_allowed_from) - Date.parse(r.data.retained_at), 180 * DAY);
    assert.equal((await beneficiaries.findOne({ household_id: 'HH-KEEP' }).lean()).program_status, 'ACTIVE_COMPLIANT');
    const task = await tasks.findOne({ task_id: 'TSK-HH-KEEP' }).lean();
    assert.equal(task.task_status, 'VERIFIED_RETAIN');
    assert.equal(task.admin_resolution.decision, 'RETAINED_ON_ROSTER');
    assert.equal(task.admin_resolution.admin_notes, notes);
    assert.equal(String(task.admin_resolution.reviewed_by), String(director._id));
    const block = await audits.findOne({ sequence_index: r.data.audit_receipt.sequence_index }).lean();
    assert.equal(block.action, 'BENEFICIARY_RETAINED');
    assert.equal(block.state_delta.before.program_status, 'UNDER_INVESTIGATION');
    assert.equal(block.state_delta.after.program_status, 'ACTIVE_COMPLIANT');
    assert.equal(block.state_delta.after.related.decision, 'RETAINED_ON_ROSTER');
    assert.equal(block.state_delta.after.related.reassessment_allowed_from, r.data.reassessment_allowed_from);
    assert.equal(await chainValid(), true);
    const after = await json(await call('director', 'GET', '/tasks/TSK-HH-KEEP/report'));
    assert.equal(after.data.admin_resolution.decision, 'RETAINED_ON_ROSTER');
    await rejected(call('director', 'POST', '/tasks/TSK-HH-KEEP/retain', { admin_notes: notes }), 409, 'TASK_NOT_SUBMITTED');
  });

  await t.test('the model cannot re-flag a retained household for 180 days', async () => {
    const reached = new Error('ML reached');
    const assessment = createRiskAssessment({ ...models, mlClient: { predict: async () => { throw reached; } } });
    await assert.rejects(assessment.assess('HH-KEEP', String(director._id)),
      e => e.status === 409 && e.code === 'RETENTION_COOLDOWN');
    // Once the cooldown has passed, assessment proceeds to the model again.
    const filter = { action: 'BENEFICIARY_RETAINED', 'target_entity.entity_id': 'HH-KEEP' };
    const { timestamp } = await audits.findOne(filter).lean();
    await audits.collection.updateOne(filter, { $set: { timestamp: new Date(Date.now() - 181 * DAY) } });
    await assert.rejects(assessment.assess('HH-KEEP', String(director._id)), e => e === reached);
    await audits.collection.updateOne(filter, { $set: { timestamp } }); // keep the chain valid for later subtests
  });

  await t.test('retain refuses graduation reports, bad input, wrong roles and other jurisdictions; calamity does not block it', async () => {
    await seed('HH-RICH', { level: 3, recommendation: 'RECOMMEND_GRADUATION' });
    await seed('HH-FAR', { barangay: 'Real' });
    await seed('HH-PENDING', { taskStatus: 'PENDING_DISPATCH' });
    await seed('HH-HOLD');
    const body = { admin_notes: notes };
    await noWrites(async () => {
      await rejected(call('director', 'POST', '/tasks/TSK-HH-RICH/retain', body), 409, 'FIELD_REPORT_DOES_NOT_SUPPORT_RETENTION');
      await rejected(call('director', 'POST', '/tasks/TSK-HH-PENDING/retain', body), 409, 'TASK_NOT_SUBMITTED');
      await rejected(call('director', 'POST', '/tasks/TSK-HH-HOLD/retain', { admin_notes: 'short' }), 400, 'INVALID_REQUEST');
      await rejected(call('director', 'POST', '/tasks/TSK-HH-HOLD/retain', { ...body, decision: 'APPROVED_GRADUATION' }), 400, 'INVALID_REQUEST');
      await rejected(call('auditor', 'POST', '/tasks/TSK-HH-HOLD/retain', body), 403, 'FORBIDDEN');
      await rejected(call('worker', 'POST', '/tasks/TSK-HH-HOLD/retain', body), 403, 'FORBIDDEN');
      await rejected(call(null, 'POST', '/tasks/TSK-HH-HOLD/retain', body), 401, 'UNAUTHORIZED');
      await rejected(call('director', 'POST', '/tasks/TSK-HH-FAR/retain', body), 403, 'OUT_OF_JURISDICTION');
      await rejected(call('director', 'POST', '/tasks/TSK-NOPE/retain', body), 404, 'TASK_NOT_FOUND');
    });
    await calamity();
    const r = await json(await call('director', 'POST', '/tasks/TSK-HH-HOLD/retain', body));
    assert.equal(r.status, 200, 'keeping a family on the program is allowed during a moratorium');
    await configs.deleteMany({});
  });

  await t.test('POST /appeals/:docket/decide GRANTED returns the household to ACTIVE_COMPLIANT', async () => {
    await appealed('HH-WIN', 'APP-T-0001');
    const r = await json(await call('director', 'POST', '/appeals/APP-T-0001/decide', { outcome: 'GRANTED', decision_notes: hearing }));
    assert.equal(r.status, 200, JSON.stringify(r.data));
    assert.deepEqual(keys(r.data), keys(contract('admin-appeal-decision').response.data));
    assert.equal(r.data.household_status, 'ACTIVE_COMPLIANT');
    assert.equal(r.data.outcome, 'GRANTED');
    assert.equal(Date.parse(r.data.reassessment_allowed_from) - Date.parse(r.data.decided_at), 180 * DAY);
    const block = await audits.findOne({ sequence_index: r.data.audit_receipt.sequence_index }).lean();
    assert.equal(block.action, 'BENEFICIARY_RETAINED');
    assert.equal(block.state_delta.before.program_status, 'NOTICE_OF_INELIGIBILITY');
    assert.equal(block.state_delta.after.related.decision, 'APPEAL_GRANTED');
    assert.equal(block.state_delta.after.related.appeal_docket_id, 'APP-T-0001');
    assert.equal(await chainValid(), true);
    const docket = await json(await call('director', 'GET', '/appeals/docket'));
    assert.equal(docket.data.items.some(i => i.household_id === 'HH-WIN'), false, 'a decided appeal leaves the docket');
    await rejected(call('director', 'POST', '/appeals/APP-T-0001/decide', { outcome: 'GRANTED', decision_notes: hearing }), 409, 'WORKFLOW_CONFLICT');
  });

  await t.test('DENIED completes the graduation, sealed as BENEFICIARY_GRADUATED', async () => {
    await appealed('HH-LOSE', 'APP-T-0002');
    const r = await json(await call('director', 'POST', '/appeals/APP-T-0002/decide', { outcome: 'DENIED', decision_notes: hearing }));
    assert.equal(r.status, 200, JSON.stringify(r.data));
    assert.equal(r.data.household_status, 'GRADUATED');
    assert.equal(r.data.reassessment_allowed_from, null);
    const block = await audits.findOne({ sequence_index: r.data.audit_receipt.sequence_index }).lean();
    assert.equal(block.action, 'BENEFICIARY_GRADUATED');
    assert.equal(block.state_delta.after.program_status, 'GRADUATED');
    assert.equal(block.state_delta.after.related.decision, 'GRADUATION_COMPLETED');
    assert.equal(block.state_delta.after.related.appeal_outcome, 'DENIED');
    assert.equal(await chainValid(), true);
  });

  await t.test('decide refuses early hearings, stale or forged appeals, bad input, wrong roles and calamity holds', async () => {
    const tomorrow = new Date(Date.now() + 2 * DAY).toISOString().slice(0, 10);
    await appealed('HH-LATER', 'APP-T-0003', tomorrow);
    await appealed('HH-STALE', 'APP-T-0004');
    // A newer notice replaces the one the appeal was filed against.
    await tasks.updateOne({ task_id: 'TSK-HH-STALE' }, { $set: { 'admin_resolution.finalized_at': new Date() } });
    await appealed('HH-HELD', 'APP-T-0005');
    await seed('HH-FORGED', { status: 'NOTICE_OF_INELIGIBILITY', taskStatus: 'VERIFIED_GRADUATE', level: 3,
      recommendation: 'RECOMMEND_GRADUATION', noticeAgo: 2 * DAY });
    await audits.create({ sequence_index: 999, previous_entry_hash: '0'.repeat(64), timestamp: new Date(),
      actor: { user_id: String(director._id), username: 'director', role: 'REGIONAL_DIRECTOR' }, action: 'APPEAL_FILED',
      target_entity: { collection_name: 'beneficiaries', entity_id: 'HH-FORGED' },
      state_delta: { before: {}, after: { appeal_docket_id: 'APP-T-FORGED', hearing_date: manilaToday() } }, entry_hash: 'f'.repeat(64) });
    const outsiderHousehold = 'HH-FAR-NOTICE';
    await seed(outsiderHousehold, { barangay: 'Real', status: 'NOTICE_OF_INELIGIBILITY', taskStatus: 'VERIFIED_GRADUATE',
      level: 3, recommendation: 'RECOMMEND_GRADUATION', noticeAgo: 2 * DAY });
    const body = { outcome: 'DENIED', decision_notes: hearing };
    await noWrites(async () => {
      await rejected(call('director', 'POST', '/appeals/APP-T-0003/decide', body), 409, 'HEARING_NOT_YET_HELD');
      await rejected(call('director', 'POST', '/appeals/APP-T-0004/decide', body), 409, 'APPEAL_NOT_CURRENT');
      await rejected(call('director', 'POST', '/appeals/APP-T-FORGED/decide', body), 409, 'AUDIT_ENTRY_INVALID');
      await rejected(call('director', 'POST', '/appeals/APP-T-NOPE/decide', body), 404, 'APPEAL_NOT_FOUND');
      await rejected(call('director', 'POST', '/appeals/bad%20id/decide', body), 404, 'APPEAL_NOT_FOUND');
      await rejected(call('director', 'POST', '/appeals/APP-T-0005/decide', { outcome: 'MAYBE', decision_notes: hearing }), 400, 'INVALID_REQUEST');
      await rejected(call('director', 'POST', '/appeals/APP-T-0005/decide', { outcome: 'DENIED', decision_notes: 'short' }), 400, 'INVALID_REQUEST');
      await rejected(call('director', 'POST', '/appeals/APP-T-0005/decide', { ...body, extra: 1 }), 400, 'INVALID_REQUEST');
      await rejected(call('auditor', 'POST', '/appeals/APP-T-0005/decide', body), 403, 'FORBIDDEN');
      await rejected(call('worker', 'POST', '/appeals/APP-T-0005/decide', body), 403, 'FORBIDDEN');
      await rejected(call('outsider', 'POST', '/appeals/APP-T-0005/decide', body), 403, 'OUT_OF_JURISDICTION');
      await calamity();
      await rejected(call('director', 'POST', '/appeals/APP-T-0005/decide', body), 409, 'CALAMITY_MORATORIUM_ACTIVE');
      await configs.deleteMany({});
    });
    await audits.deleteOne({ sequence_index: 999 });
  });
});

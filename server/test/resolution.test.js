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
const { createChainVerifier } = require('../src/services/hashChain.service');
const { startReplicaSet } = require('./support/replicaSet');

const DAY = 24 * 60 * 60 * 1000;
const contract = name => require(`../../docs/contracts/admin-web/${name}.json`);
const keys = value => Object.keys(value).sort();

// DECISION-011: report review, evidence retrieval, notice issuance and final graduation.
test('DECISION-011 review, evidence, notice issuance and graduation on a disposable replica set', {
  skip: process.env.RUN_WORKFLOW_MONGO_TESTS !== '1', timeout: 180000
}, async t => {
  const { models } = await startReplicaSet(t, 'resolution_test');
  const { users, beneficiaries, audits, tasks, configs } = models;
  const uploadDir = await fs.mkdtemp(path.join(os.tmpdir(), 'kilosunlad-evidence-'));
  t.after(() => fs.rm(uploadDir, { recursive: true, force: true }));
  await fs.mkdir(path.join(uploadDir, 'evidence'));

  const jurisdiction = { region: 'Region IV-A', province: 'Laguna', municipality: 'Calamba', assigned_barangays: ['Palingon'] };
  const password = 'Resolution-test-password-2026!';
  const password_hash = await bcrypt.hash(password, 4);
  const makeUser = (username, role, j = jurisdiction) => users.create({ username, role, password_hash,
    full_name: `Test ${username}`, email: `${username}@example.test`, is_active: true, jurisdiction: j });
  const director = await makeUser('director', 'REGIONAL_DIRECTOR');
  await makeUser('admin', 'SUPER_ADMIN', {});
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
  for (const username of ['director', 'admin', 'auditor', 'worker', 'outsider']) {
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
    const before = [await audits.countDocuments(), JSON.stringify(await beneficiaries.find().sort({ household_id: 1 }).lean()),
      JSON.stringify(await tasks.find().sort({ task_id: 1 }).lean())];
    await operation();
    assert.deepEqual([await audits.countDocuments(), JSON.stringify(await beneficiaries.find().sort({ household_id: 1 }).lean()),
      JSON.stringify(await tasks.find().sort({ task_id: 1 }).lean())], before, 'rejections must not write');
  }

  const photo = Buffer.from(`jpeg-bytes-${crypto.randomUUID()}`);
  const hash = crypto.createHash('sha256').update(photo).digest('hex');
  await fs.writeFile(path.join(uploadDir, 'evidence', hash), photo);
  async function seed(id, { barangay = 'Palingon', status = 'UNDER_INVESTIGATION', taskStatus = 'SUBMITTED',
    level = 3, recommendation = 'RECOMMEND_GRADUATION', evidence = [] } = {}) {
    await beneficiaries.create({ household_id: id,
      head_of_household: { first_name: 'Ana', last_name: id, national_id: `NID-${id}` },
      address: { province: 'Laguna', municipality: 'Calamba', barangay, coordinates: { type: 'Point', coordinates: [121.16, 14.21] } },
      demographics: { household_size: 4 }, enrolled_swdi_level: 1, program_status: status });
    await tasks.create({ task_id: `TSK-${id}`, household_id: id, assigned_worker_id: worker._id, task_status: taskStatus,
      due_date: new Date(Date.now() + 7 * DAY), field_findings: { verified_swdi_level: level, worker_recommendation: recommendation,
        narrative_report: 'Owns a private sedan; household business observed.',
        client_geolocation: { latitude: 14.21, longitude: 121.16, accuracy_meters: 8, captured_at: new Date() },
        evidence_attachments: evidence.map(h => ({ media_type: 'image/jpeg', storage_url: `x/evidence/${h}`, sha256_hash: h,
          exif_metadata: { timestamp: new Date(), latitude: 14.21, longitude: 121.16 } })) } });
  }
  const notes = 'Field visit confirmed Level 3: private sedan and a household business.';

  await t.test('GET /tasks/:id/report returns the field report in the contract shape, scoped', async () => {
    await seed('HH-REPORT', { evidence: [hash] });
    const r = await json(await call('director', 'GET', '/tasks/TSK-HH-REPORT/report'));
    assert.equal(r.status, 200);
    assert.deepEqual(keys(r.data), keys(contract('admin-task-report').response.data));
    assert.deepEqual(keys(r.data.findings), keys(contract('admin-task-report').response.data.findings));
    assert.equal(r.data.graduation_supported, true);
    assert.equal(r.data.assigned_worker.full_name, 'Test worker');
    assert.deepEqual(r.data.evidence.map(e => [e.sha256_hash, e.url]), [[hash, `/api/v1/evidence/${hash}`]]);
    assert.equal((await call('auditor', 'GET', '/tasks/TSK-HH-REPORT/report')).status, 200, 'COA may read');
    await rejected(call('outsider', 'GET', '/tasks/TSK-HH-REPORT/report'), 403, 'OUT_OF_JURISDICTION');
    await rejected(call('worker', 'GET', '/tasks/TSK-HH-REPORT/report'), 403, 'FORBIDDEN');
    await rejected(call('director', 'GET', '/tasks/TSK-NOPE/report'), 404, 'TASK_NOT_FOUND');
    await rejected(call('director', 'GET', '/tasks/TSK-HH-REPORT/report?x=1'), 400, 'INVALID_QUERY');
  });

  await t.test('GET /evidence/:sha256 serves verified bytes and refuses a tampered file', async () => {
    const r = await call('director', 'GET', `/evidence/${hash}`);
    assert.equal(r.status, 200);
    assert.equal(r.headers.get('content-type'), 'image/jpeg');
    assert.equal(r.headers.get('x-content-sha256'), hash);
    assert.match(r.headers.get('cache-control'), /no-store/);
    assert.deepEqual(Buffer.from(await r.arrayBuffer()), photo);
    assert.equal((await call('auditor', 'GET', `/evidence/${hash}`)).status, 200);
    await rejected(call('outsider', 'GET', `/evidence/${hash}`), 403, 'OUT_OF_JURISDICTION');
    await rejected(call('worker', 'GET', `/evidence/${hash}`), 403, 'FORBIDDEN');
    await rejected(call(null, 'GET', `/evidence/${hash}`), 401, 'UNAUTHORIZED');
    await rejected(call('director', 'GET', '/evidence/not-a-hash'), 400, 'INVALID_EVIDENCE_HASH');
    await rejected(call('director', 'GET', `/evidence/${'a'.repeat(64)}`), 404, 'EVIDENCE_NOT_FOUND');
    // An insider swaps the stored bytes: the server must refuse to serve them.
    const tampered = Buffer.from('tampered');
    const tamperedHash = crypto.createHash('sha256').update(Buffer.from('original')).digest('hex');
    await fs.writeFile(path.join(uploadDir, 'evidence', tamperedHash), tampered);
    await seed('HH-TAMPER', { evidence: [tamperedHash] });
    await rejected(call('director', 'GET', `/evidence/${tamperedHash}`), 409, 'EVIDENCE_INTEGRITY_FAILED');
  });

  await t.test('POST /tasks/:id/resolve issues the notice, seals it and opens the docket', async () => {
    await seed('HH-GRAD');
    const r = await json(await call('director', 'POST', '/tasks/TSK-HH-GRAD/resolve', { decision: 'APPROVED_GRADUATION', admin_notes: notes }));
    assert.equal(r.status, 200, JSON.stringify(r.data));
    assert.deepEqual(keys(r.data), keys(contract('admin-notice-issuance').response.data));
    assert.equal(r.data.household_status, 'NOTICE_OF_INELIGIBILITY');
    assert.equal(r.data.task_status, 'VERIFIED_GRADUATE');
    assert.equal(Date.parse(r.data.appeal_deadline) - Date.parse(r.data.notice_date), 15 * DAY);
    const task = await tasks.findOne({ task_id: 'TSK-HH-GRAD' }).lean();
    assert.equal(task.admin_resolution.decision, 'APPROVED_GRADUATION');
    assert.equal(String(task.admin_resolution.reviewed_by), String(director._id));
    assert.equal(task.admin_resolution.admin_notes, notes);
    const block = await audits.findOne({ sequence_index: r.data.audit_receipt.sequence_index }).lean();
    assert.equal(block.action, 'BENEFICIARY_GRADUATED');
    assert.equal(block.state_delta.after.program_status, 'NOTICE_OF_INELIGIBILITY');
    assert.equal(block.state_delta.after.related.decision, 'APPROVED_GRADUATION');
    assert.equal(block.state_delta.after.related.appeal_deadline, r.data.appeal_deadline);
    const head = r.data.audit_receipt.sequence_index;
    assert.equal((await createChainVerifier({ audits }).verifyChain({ start_sequence: '1', end_sequence: String(head) })).is_chain_valid, true);
    const docket = await json(await call('director', 'GET', '/appeals/docket'));
    const item = docket.data.items.find(i => i.household_id === 'HH-GRAD');
    assert.equal(item?.status, 'NOTICE_OF_INELIGIBILITY', 'the new notice appears on the due-process docket');
    assert.equal(item.notice_expiry_date, r.data.appeal_deadline);
    await rejected(call('director', 'POST', '/tasks/TSK-HH-GRAD/resolve', { decision: 'APPROVED_GRADUATION', admin_notes: notes }), 409, 'TASK_NOT_SUBMITTED');
  });

  await t.test('resolve refuses unsupported reports, bad input, wrong roles, other jurisdictions and calamity holds', async () => {
    await seed('HH-RETAIN', { level: 2, recommendation: 'RETAIN' });
    await seed('HH-REAL', { barangay: 'Real' });
    await seed('HH-HOLD');
    const body = { decision: 'APPROVED_GRADUATION', admin_notes: notes };
    await noWrites(async () => {
      await rejected(call('director', 'POST', '/tasks/TSK-HH-RETAIN/resolve', body), 409, 'FIELD_REPORT_DOES_NOT_SUPPORT_GRADUATION');
      await rejected(call('director', 'POST', '/tasks/TSK-HH-HOLD/resolve', { decision: 'RETAINED_ON_ROSTER', admin_notes: notes }), 400, 'INVALID_REQUEST');
      await rejected(call('director', 'POST', '/tasks/TSK-HH-HOLD/resolve', { decision: 'APPROVED_GRADUATION', admin_notes: 'short' }), 400, 'INVALID_REQUEST');
      await rejected(call('director', 'POST', '/tasks/TSK-HH-HOLD/resolve', { ...body, extra: 1 }), 400, 'INVALID_REQUEST');
      await rejected(call('auditor', 'POST', '/tasks/TSK-HH-HOLD/resolve', body), 403, 'FORBIDDEN');
      await rejected(call('worker', 'POST', '/tasks/TSK-HH-HOLD/resolve', body), 403, 'FORBIDDEN');
      await rejected(call('director', 'POST', '/tasks/TSK-HH-REAL/resolve', body), 403, 'OUT_OF_JURISDICTION');
      await rejected(call('director', 'POST', '/tasks/TSK-NOPE/resolve', body), 404, 'TASK_NOT_FOUND');
      await configs.create({ config_key: 'CALAMITY_ZONES', calamity_moratorium_zones: [{ province: 'Laguna', municipality: 'Calamba',
        declared_at: new Date(Date.now() - DAY), is_active: true, ndrrmc_reference: 'NDRRMC-T' }] });
      await rejected(call('director', 'POST', '/tasks/TSK-HH-HOLD/resolve', body), 409, 'CALAMITY_MORATORIUM_ACTIVE');
      await configs.deleteMany({});
    });
  });

  await t.test('POST /beneficiaries/:id/graduate only after the 15-day window with no appeal', async () => {
    const issue = async (id, ago) => {
      await seed(id, { status: 'NOTICE_OF_INELIGIBILITY', taskStatus: 'VERIFIED_GRADUATE' });
      await tasks.updateOne({ task_id: `TSK-${id}` }, { $set: { admin_resolution: { reviewed_by: director._id,
        decision: 'APPROVED_GRADUATION', admin_notes: notes, finalized_at: new Date(Date.now() - ago) } } });
    };
    await issue('HH-DONE', 16 * DAY);
    const r = await json(await call('director', 'POST', '/beneficiaries/HH-DONE/graduate', {}));
    assert.equal(r.status, 200, JSON.stringify(r.data));
    assert.deepEqual(keys(r.data), keys(contract('admin-graduation').response.data));
    assert.equal(r.data.household_status, 'GRADUATED');
    assert.equal((await beneficiaries.findOne({ household_id: 'HH-DONE' }).lean()).program_status, 'GRADUATED');
    const block = await audits.findOne({ sequence_index: r.data.audit_receipt.sequence_index }).lean();
    assert.equal(block.action, 'BENEFICIARY_GRADUATED');
    assert.equal(block.state_delta.after.program_status, 'GRADUATED');

    await issue('HH-OPEN', 2 * DAY);
    await issue('HH-APPEALED', 16 * DAY);
    await audits.create({ sequence_index: 999, previous_entry_hash: '0'.repeat(64), timestamp: new Date(Date.now() - 10 * DAY),
      actor: { user_id: String(director._id), username: 'director', role: 'REGIONAL_DIRECTOR' }, action: 'APPEAL_FILED',
      target_entity: { collection_name: 'beneficiaries', entity_id: 'HH-APPEALED' }, state_delta: { before: {}, after: {} }, entry_hash: 'f'.repeat(64) });
    await noWrites(async () => {
      await rejected(call('director', 'POST', '/beneficiaries/HH-OPEN/graduate', {}), 409, 'APPEAL_WINDOW_OPEN');
      await rejected(call('director', 'POST', '/beneficiaries/HH-APPEALED/graduate', {}), 409, 'APPEAL_HOLD');
      await rejected(call('director', 'POST', '/beneficiaries/HH-DONE/graduate', {}), 409, 'WORKFLOW_CONFLICT');
      await rejected(call('director', 'POST', '/beneficiaries/HH-OPEN/graduate', { force: true }), 400, 'INVALID_REQUEST');
      await rejected(call('auditor', 'POST', '/beneficiaries/HH-OPEN/graduate', {}), 403, 'FORBIDDEN');
      await rejected(call('outsider', 'POST', '/beneficiaries/HH-OPEN/graduate', {}), 403, 'OUT_OF_JURISDICTION');
    });
    await audits.deleteOne({ sequence_index: 999 });
  });
});

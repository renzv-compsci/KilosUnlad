/**
 * test_str01_tamper_detection.js
 * Sprint 5 STR-01: tamper with audit block 3 directly in MongoDB (as an insider
 * with mongosh would) and prove verify-chain reports INVALID_HASH_AT_SEQUENCE_3,
 * that untampered ranges still verify, and that the triage drawer refuses to
 * serve a tampered explanation. The original block is restored at the end.
 *
 * Prerequisites:
 * 1. Stack running (server, ml-service, db); reset_demo.sh, then
 *    add_int02_case_a_fixture.js. Empty audit ledger (fresh reset).
 * 2. ADMIN_MONGO_URI with write access to audit_logs (the tamper itself);
 *    server/node_modules installed.
 *
 * Usage: node data-pipeline/scripts/test_str01_tamper_detection.js
 */
const path = require('path');
const { MongoClient } = require(path.resolve(__dirname, '../../server/node_modules/mongodb'));

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000/api/v1';
const ADMIN_MONGO_URI = process.env.ADMIN_MONGO_URI ||
  'mongodb://admin_user:RootAdminSecret2026!@localhost:27017/kilosunlad?authSource=admin&directConnection=true';
const CASE_A = 'DEMO-4PS-GRAD-0001';
const CREDS = {
  admin: { username: 'super_admin_test', password: 'SuperAdminTest2026!' },
  director: { username: 'director_test', password: 'DirectorTest2026!' },
  worker: { username: 'case_worker_test', password: 'CaseWorkerTest2026!' },
  auditor: { username: 'auditor_test', password: 'AuditorTest2026!' }
};

let failures = 0;
function check(label, condition, detail) {
  if (condition) console.log(`   [OK]   ${label}`);
  else { failures++; console.error(`   [FAIL] ${label}`, detail === undefined ? '' : JSON.stringify(detail)); }
}
async function call(method, p, { token, body } = {}) {
  const res = await fetch(`${BASE_URL}${p}`, { method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body) });
  return { status: res.status, data: await res.json().catch(() => null) };
}
function must(label, r, status) {
  if (r.status !== status) throw new Error(`${label}: expected ${status}, got ${r.status} ${JSON.stringify(r.data)}`);
  return r.data;
}

async function run() {
  console.log('[START] STR-01 Tamper Detection Test\n');
  const t = {}, ids = {};
  for (const [role, creds] of Object.entries(CREDS)) {
    const d = must(`login ${role}`, await call('POST', '/auth/login', { body: creds }), 200);
    t[role] = d.access_token; ids[role] = d.user.user_id;
  }
  const verify = (start, end) => call('GET', `/audit/verify-chain?start_sequence=${start}&end_sequence=${end}`, { token: t.auditor });

  console.log('[1] Building a real 5-block chain through the API...');
  must('assess', await call('POST', `/beneficiaries/${CASE_A}/assess`, { token: t.director, body: {} }), 200);
  const task = must('dispatch', await call('POST', '/tasks/dispatch', { token: t.director, body: { household_id: CASE_A,
    assigned_worker_id: ids.worker, priority: 'HIGH', due_date: new Date(Date.now() + 7 * 86400000).toISOString() } }), 201);
  must('submit', await call('POST', `/tasks/${task.task_id}/submit`, { token: t.worker, body: {
    task_id: task.task_id, household_id: CASE_A, verified_swdi_level: 3, worker_recommendation: 'RECOMMEND_GRADUATION',
    narrative_report: 'STR-01 chain block 3.', evidence_attachments: [],
    livelihood_asset_verification: { is_motorcycle_present: false, is_productive_asset: false, proof_type: 'NONE', franchise_number: '' },
    landbank_card_inspection: { physical_card_presented: true, card_matches_beneficiary: true, pawning_suspected: false },
    client_geolocation: { latitude: 14.2215, longitude: 121.1875, accuracy_meters: 5, captured_at: new Date().toISOString() } } }), 200);
  const zone = { province: 'Laguna', municipality: 'Calamba' };
  must('declare', await call('POST', '/calamity/toggle', { token: t.admin, body: { ...zone, is_active: true, ndrrmc_reference: 'NDRRMC-STR01' } }), 201);
  must('lift', await call('POST', '/calamity/toggle', { token: t.admin, body: { ...zone, is_active: false } }), 200);
  const baseline = must('verify 1..5', await verify(1, 5), 200);
  check('baseline chain 1..5 valid', baseline.is_chain_valid === true && baseline.total_blocks_verified === 5, baseline);
  console.log('');

  const client = await MongoClient.connect(ADMIN_MONGO_URI);
  const audits = client.db('kilosunlad').collection('audit_logs');
  const original = await audits.findOne({ sequence_index: 3 });
  try {
    console.log(`[2] Tampering with block 3 (${original.action}) directly in MongoDB...`);
    await audits.updateOne({ sequence_index: 3 }, { $set: { 'state_delta.after.worker_recommendation': 'RETAIN' } });
    const tampered = must('verify 1..5', await verify(1, 5), 200);
    check('is_chain_valid false', tampered.is_chain_valid === false, tampered);
    check('head_hash = INVALID_HASH_AT_SEQUENCE_3', tampered.head_hash === 'INVALID_HASH_AT_SEQUENCE_3', tampered.head_hash);
    check('exactly block 3 reported', JSON.stringify(tampered.broken_blocks.map(b => b.sequence_index)) === '[3]', tampered.broken_blocks);
    check('report names the tampered entity', tampered.broken_blocks[0]?.entity_id === task.task_id, tampered.broken_blocks[0]);
    const before = must('verify 1..2', await verify(1, 2), 200);
    const after = must('verify 4..5', await verify(4, 5), 200);
    check('untampered range 1..2 still verifies', before.is_chain_valid === true, before);
    check('untampered range 4..5 still verifies (anchored on block 3 recorded hash)', after.is_chain_valid === true, after);
    console.log('');

    console.log('[3] Tampering with the sealed SHAP in block 1...');
    const block1 = await audits.findOne({ sequence_index: 1 });
    await audits.updateOne({ sequence_index: 1 }, { $set: { 'state_delta.after.related.contributions.swdi': 0 } });
    const drawer = await call('GET', `/beneficiaries/${CASE_A}/assessment`, { token: t.director });
    check('drawer refuses tampered explanation (409 AUDIT_ENTRY_INVALID)', drawer.status === 409 &&
      drawer.data?.error?.code === 'AUDIT_ENTRY_INVALID', drawer);
    await audits.replaceOne({ sequence_index: 1 }, block1);
  } finally {
    await audits.replaceOne({ sequence_index: 3 }, original);
    await client.close();
  }
  const restored = must('verify 1..5', await verify(1, 5), 200);
  check('restored chain verifies again', restored.is_chain_valid === true, restored);
  console.log('');

  if (failures) { console.error(`[FAIL] STR-01 TEST FAILED (${failures} check(s))`); process.exit(1); }
  console.log('[SUCCESS] STR-01 TEST PASSED!');
}

run().catch(error => { console.error('\n[FAIL] STR-01 TEST FAILED!\nError:', error.message); process.exit(1); });

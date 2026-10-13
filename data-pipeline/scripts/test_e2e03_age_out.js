/**
 * test_e2e03_age_out.js
 * Sprint 4 E2E-03/E2E-03a: RA 11310 Sec. 6 age-out. A child is eligible until
 * the 19th birthday (Asia/Manila calendar). The live assessment reports
 * children_eligibility; when a household is flagged, the audited transaction
 * corrects children_registry[].is_eligible and seals it.
 *
 * Prerequisites:
 * 1. Stack running (server, ml-service, db). reset_demo.sh, then
 *    add_e2e03_age_out_fixture.js.
 * 2. MONGO_URI reachable from the host (read-only check of the stored flags);
 *    server/node_modules installed.
 *
 * Usage: node data-pipeline/scripts/test_e2e03_age_out.js
 */
const path = require('path');
const { MongoClient } = require(path.resolve(__dirname, '../../server/node_modules/mongodb'));

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000/api/v1';
const MONGO_URI = process.env.MONGO_URI ||
  'mongodb://app_user:AppUserPassword2026!@localhost:27017/kilosunlad?authSource=kilosunlad&directConnection=true';
const DIRECTOR = { username: 'director_test', password: 'DirectorTest2026!' };
const AUDITOR = { username: 'auditor_test', password: 'AuditorTest2026!' };

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

async function run() {
  console.log('[START] E2E-03 Age-Out (RA 11310) Test\n');
  const token = (await call('POST', '/auth/login', { body: DIRECTOR })).data.access_token;
  const auditor = (await call('POST', '/auth/login', { body: AUDITOR })).data.access_token;

  console.log('[1] Mixed household: 21 y, 19 today, 19 tomorrow...');
  const a = await call('POST', '/beneficiaries/TEST-4PS-AGEOUT-0001/assess', { token, body: {} });
  check('200 OK', a.status === 200, a);
  check('children_eligibility {total 3, eligible 1, aged_out 2}', JSON.stringify(a.data?.children_eligibility) ===
    JSON.stringify({ total: 3, eligible: 1, aged_out: 2, unknown: 0 }), a.data?.children_eligibility);
  check('CHILD_AGE_OUT badge', a.data?.trigger_badges?.some(b => b.code === 'CHILD_AGE_OUT'), a.data?.trigger_badges);
  // The SWDI term depends on the deployed model's prediction (v1 and v2 differ), so
  // derive it from the response; the published indicator weights must not move.
  const gap = Math.max(0, (a.data?.predicted_swdi_level ?? 0) - 1); // fixture is enrolled Level 1
  const expected = { swdi: 40 * gap, power: 20, water: 0, telecom: 25, vehicle: 30 };
  check('age-out does not change the published risk weights',
    JSON.stringify(a.data?.contributions) === JSON.stringify(expected) &&
    a.data?.composite_risk_score === Math.min(100, Object.values(expected).reduce((x, y) => x + y, 0)),
    { contributions: a.data?.contributions, score: a.data?.composite_risk_score, predicted: a.data?.predicted_swdi_level });
  check('flagged -> FLAGGED_FOR_REVIEW', a.data?.program_status === 'FLAGGED_FOR_REVIEW', a.data);

  const client = await MongoClient.connect(MONGO_URI);
  try {
    const stored = await client.db().collection('beneficiaries').findOne({ household_id: 'TEST-4PS-AGEOUT-0001' });
    check('stored is_eligible corrected to [false, false, true]', JSON.stringify(stored.children_registry.map(c => c.is_eligible)) ===
      JSON.stringify([false, false, true]), stored.children_registry);
    check('stored birthdates are Dates', stored.children_registry.every(c => c.birthdate instanceof Date), stored.children_registry);
    const block = await client.db().collection('audit_logs').findOne({ sequence_index: a.data.audit_receipt.sequence_index });
    check('correction sealed in MODEL_FLAG_RAISED delta', block?.action === 'MODEL_FLAG_RAISED' &&
      JSON.stringify(block.state_delta.after.related.children_eligibility) === JSON.stringify(a.data.children_eligibility), block?.state_delta);
  } finally { await client.close(); }
  const chain = await call('GET', `/audit/verify-chain?start_sequence=1&end_sequence=${a.data.audit_receipt.sequence_index}`,
    { token: auditor });
  check('verify-chain valid', chain.status === 200 && chain.data.is_chain_valid === true, chain.data);
  console.log('');

  console.log('[2] Every child aged out, not flagged (result only, no write)...');
  const b = await call('POST', '/beneficiaries/TEST-4PS-AGEOUT-0002/assess', { token, body: {} });
  check('200 with eligible 0 of 2', b.status === 200 && b.data.children_eligibility.eligible === 0 &&
    b.data.children_eligibility.aged_out === 2, b.data);
  check('reason: no eligible children (RA 11310 Sec. 6)',
    b.data.flag_reasons.includes('No eligible children (RA 11310 Sec. 6)'), b.data.flag_reasons);
  check('not persisted (no receipt, still ACTIVE_COMPLIANT)', b.data.audit_receipt === null &&
    b.data.program_status === 'ACTIVE_COMPLIANT', b.data);
  console.log('');

  console.log('[3] Demo Case A (children 16 and 12) unaffected...');
  const c = await call('POST', '/beneficiaries/DEMO-4PS-GRAD-0001/assess', { token, body: {} });
  check('Case A: 2 eligible, no CHILD_AGE_OUT', c.status === 200 && c.data.children_eligibility.eligible === 2 &&
    !c.data.trigger_badges.some(x => x.code === 'CHILD_AGE_OUT'), c.data);
  console.log('');

  if (failures) { console.error(`[FAIL] E2E-03 TEST FAILED (${failures} check(s))`); process.exit(1); }
  console.log('[SUCCESS] E2E-03 TEST PASSED!');
}

run().catch(error => { console.error('\n[FAIL] E2E-03 TEST FAILED!\nError:', error.message); process.exit(1); });

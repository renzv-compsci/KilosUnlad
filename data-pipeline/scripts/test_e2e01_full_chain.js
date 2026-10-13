/**
 * test_e2e01_full_chain.js
 * Sprint 4 E2E-01: client -> gateway -> backend -> ML + DB. One assessment of
 * Demo Case A yields prediction, risk score, flag, dispatch, field report and a
 * contiguous, verifiable audit chain, in order.
 *
 * Prerequisites:
 * 1. Full stack running (gateway, server, ml-service, db). Default BASE_URL goes
 *    through the Nginx gateway on :80.
 * 2. reset_demo.sh run, then add_int02_case_a_fixture.js.
 * 3. Node 18+. Not re-runnable without a reset.
 *
 * Usage: node data-pipeline/scripts/test_e2e01_full_chain.js
 */
const BASE_URL = process.env.BASE_URL || 'http://localhost/api/v1';
const CASE_A = 'DEMO-4PS-GRAD-0001';
const CASE_A_COORDS = { latitude: 14.2215, longitude: 121.1875 };
const CREDS = {
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
  let data = null;
  try { data = await res.json(); } catch { /* empty */ }
  return { status: res.status, data };
}
function must(label, response, status) {
  check(`${label} (${status})`, response.status === status, response);
  if (response.status !== status) throw new Error(`${label} failed; chain cannot continue`);
  return response.data;
}

async function run() {
  console.log(`[START] E2E-01 Full Chain via ${BASE_URL}\n`);
  const tokens = {}, ids = {};
  for (const [role, creds] of Object.entries(CREDS)) {
    const data = must(`login ${creds.username}`, await call('POST', '/auth/login', { body: creds }), 200);
    tokens[role] = data.access_token; ids[role] = data.user.user_id;
  }
  console.log('');

  console.log('[1] Assessment: ML prediction -> risk score -> flag');
  const a = must('POST /beneficiaries/:id/assess', await call('POST', `/beneficiaries/${CASE_A}/assess`,
    { token: tokens.director, body: {} }), 200);
  check('model prediction (not fallback)', a.evaluation_mode === 'ML_MODEL' && a.predicted_swdi_level === 3, a);
  check('SHAP explanation returned', a.shap_explainability.length === 3, a.shap_explainability);
  check('risk score >= 70 and flagged', a.composite_risk_score >= 70 && a.is_flagged === true, a);
  check('status FLAGGED_FOR_REVIEW', a.program_status === 'FLAGGED_FOR_REVIEW', a);
  console.log('');

  console.log('[2] Triage queue shows the flag');
  const q = must('GET /beneficiaries/triage-queue', await call('GET',
    '/beneficiaries/triage-queue?status=FLAGGED_FOR_REVIEW&limit=100', { token: tokens.director }), 200);
  const item = q.items.find(i => i.household_id === CASE_A);
  check('Case A listed with persisted score, level and badges', item && item.composite_risk_score === a.composite_risk_score &&
    item.predicted_swdi_level === 3 && item.trigger_badges.some(b => b.code === 'TIER_INVERSION'), item);
  console.log('');

  console.log('[3] Dispatch');
  const d = must('POST /tasks/dispatch', await call('POST', '/tasks/dispatch', { token: tokens.director, body: {
    household_id: CASE_A, assigned_worker_id: ids.worker, priority: 'HIGH',
    assignment_notes: 'E2E-01: verify 4-wheel vehicle use and LandBank card custody.',
    due_date: new Date(Date.now() + 7 * 86400000).toISOString() } }), 201);
  check('household UNDER_INVESTIGATION', d.household_status === 'UNDER_INVESTIGATION', d);
  const feed = must('GET /tasks/assigned (worker)', await call('GET', '/tasks/assigned', { token: tokens.worker }), 200);
  check('task visible to the assigned worker', feed.tasks.some(t => t.task_id === d.task_id), feed.tasks.map(t => t.task_id));
  console.log('');

  console.log('[4] Field report (contract JSON submission)');
  const s = must('POST /tasks/:id/submit', await call('POST', `/tasks/${d.task_id}/submit`, { token: tokens.worker, body: {
    task_id: d.task_id, household_id: CASE_A, verified_swdi_level: 3, worker_recommendation: 'RECOMMEND_GRADUATION',
    narrative_report: 'E2E-01: Vios is privately used; head formally employed.',
    livelihood_asset_verification: { is_motorcycle_present: false, is_productive_asset: false, proof_type: 'NONE', franchise_number: '' },
    landbank_card_inspection: { physical_card_presented: true, card_matches_beneficiary: true, pawning_suspected: false },
    client_geolocation: { ...CASE_A_COORDS, accuracy_meters: 8, captured_at: new Date().toISOString() },
    evidence_attachments: [] } }), 200);
  check('SUBMITTED within geofence', s.task_status === 'SUBMITTED' && s.geofence_verification.is_matched === true, s);
  console.log('');

  console.log('[5] Audit chain: blocks in order and verifiable');
  const seq = [a.audit_receipt.sequence_index, d.audit_receipt.sequence_index, s.audit_receipt.sequence_index];
  check(`MODEL_FLAG_RAISED < TASK_DISPATCHED < REPORT_SUBMITTED (${seq.join(' < ')})`, seq[0] < seq[1] && seq[1] < seq[2], seq);
  const v = must('GET /audit/verify-chain (auditor)', await call('GET',
    `/audit/verify-chain?start_sequence=1&end_sequence=${seq[2]}`, { token: tokens.auditor }), 200);
  check('chain valid; head = REPORT_SUBMITTED block', v.is_chain_valid === true && v.head_hash === s.audit_receipt.entry_hash, v);
  console.log('');

  if (failures) { console.error(`[FAIL] E2E-01 TEST FAILED (${failures} check(s))`); process.exit(1); }
  console.log('[SUCCESS] E2E-01 TEST PASSED!');
}

run().catch(error => { console.error('\n[FAIL] E2E-01 TEST FAILED!\nError:', error.message); process.exit(1); });

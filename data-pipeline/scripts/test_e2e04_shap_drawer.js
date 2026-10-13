/**
 * test_e2e04_shap_drawer.js
 * Sprint 4 E2E-04: the triage drawer's SHAP explanation equals the ML response
 * payload. The drawer reads GET /api/v1/beneficiaries/:household_id/assessment
 * (contract docs/contracts/admin-web/admin-assessment-explanation.json), which
 * serves the sealed MODEL_FLAG_RAISED block after re-verifying its hash.
 *
 * Prerequisites:
 * 1. Stack running (server, ml-service, db); reset_demo.sh run.
 * 2. ML_URL reachable from the host for the direct ML comparison.
 *
 * Usage: node data-pipeline/scripts/test_e2e04_shap_drawer.js
 */
const path = require('path');
const contract = require(path.resolve(__dirname, '../../docs/contracts/admin-web/admin-assessment-explanation.json'));
const caseAPayload = require(path.resolve(__dirname, '../seeds/demo/graduation_swdi_payload.json'));

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000/api/v1';
const ML_URL = process.env.ML_URL || 'http://localhost:8000';
const CASE_A = 'DEMO-4PS-GRAD-0001';
const CREDS = {
  director: { username: 'director_test', password: 'DirectorTest2026!' },
  auditor: { username: 'auditor_test', password: 'AuditorTest2026!' },
  worker: { username: 'case_worker_test', password: 'CaseWorkerTest2026!' }
};

let failures = 0;
function check(label, condition, detail) {
  if (condition) console.log(`   [OK]   ${label}`);
  else { failures++; console.error(`   [FAIL] ${label}`, detail === undefined ? '' : JSON.stringify(detail)); }
}
async function call(method, url, { token, body } = {}) {
  const res = await fetch(url, { method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body) });
  return { status: res.status, data: await res.json().catch(() => null) };
}
const expectError = (label, r, status, code) => check(`${label} -> ${status} ${code}`,
  r.status === status && r.data?.error?.code === code, { status: r.status, body: r.data });

async function run() {
  console.log('[START] E2E-04 SHAP Drawer Test\n');
  const tokens = {};
  for (const [role, creds] of Object.entries(CREDS)) tokens[role] = (await call('POST', `${BASE_URL}/auth/login`, { body: creds })).data.access_token;
  const explain = (as, id = CASE_A, query = '') => call('GET', `${BASE_URL}/beneficiaries/${id}/assessment${query}`, { token: tokens[as] });

  console.log('[1] Before any assessment...');
  expectError('No sealed assessment yet', await explain('director'), 404, 'ASSESSMENT_NOT_FOUND');
  console.log('');

  console.log('[2] Assess Case A, then read the drawer source...');
  const assessed = await call('POST', `${BASE_URL}/beneficiaries/${CASE_A}/assess`, { token: tokens.director, body: {} });
  check('assessment 200 (ML_MODEL)', assessed.status === 200 && assessed.data.evaluation_mode === 'ML_MODEL', assessed);
  const drawer = await explain('director');
  check('200 OK', drawer.status === 200, drawer);
  check('response keys match contract', JSON.stringify(Object.keys(drawer.data || {}).sort()) ===
    JSON.stringify(Object.keys(contract.response.data).sort()), Object.keys(drawer.data || {}));
  check('drawer SHAP === assessment SHAP', JSON.stringify(drawer.data?.shap_explainability) ===
    JSON.stringify(assessed.data.shap_explainability), drawer.data?.shap_explainability);
  check('drawer probabilities === assessment probabilities', JSON.stringify(drawer.data?.class_probabilities) ===
    JSON.stringify(assessed.data.class_probabilities));
  check('receipt is the MODEL_FLAG_RAISED block', JSON.stringify(drawer.data?.audit_receipt) ===
    JSON.stringify(assessed.data.audit_receipt), drawer.data?.audit_receipt);
  const auditorView = await explain('auditor');
  check('COA auditor can read the explanation (read-only role)', auditorView.status === 200);
  console.log('');

  console.log('[3] Same features straight to the ML service...');
  const ml = await call('POST', `${ML_URL}/api/v1/predict-swdi`, { body: caseAPayload });
  check('ML 200', ml.status === 200, ml);
  const strip = list => (list || []).map(({ indicator, contribution_weight }) => [indicator, Number(contribution_weight.toFixed(10))]);
  check('drawer SHAP matches the ML response payload (indicator, weight)', JSON.stringify(strip(drawer.data?.shap_explainability)) ===
    JSON.stringify(strip(ml.data?.ml_evaluation?.shap_explainability)), { drawer: strip(drawer.data?.shap_explainability),
    ml: strip(ml.data?.ml_evaluation?.shap_explainability) });
  check('predicted level matches', drawer.data?.predicted_swdi_level === ml.data?.ml_evaluation?.predicted_swdi_level);
  console.log('');

  console.log('[4] Guards...');
  expectError('CASE_WORKER', await explain('worker'), 403, 'FORBIDDEN');
  expectError('Unknown household', await explain('director', 'TEST-4PS-DOES-NOT-EXIST'), 404, 'HOUSEHOLD_NOT_FOUND');
  expectError('Query parameters rejected', await explain('director', CASE_A, '?sequence_index=1'), 400, 'INVALID_QUERY');
  console.log('');

  if (failures) { console.error(`[FAIL] E2E-04 TEST FAILED (${failures} check(s))`); process.exit(1); }
  console.log('[SUCCESS] E2E-04 TEST PASSED!');
}

run().catch(error => { console.error('\n[FAIL] E2E-04 TEST FAILED!\nError:', error.message); process.exit(1); });

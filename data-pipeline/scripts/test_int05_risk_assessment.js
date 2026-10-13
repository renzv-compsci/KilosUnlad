/**
 * test_int05_risk_assessment.js
 * Integration test for INT-05: POST /api/v1/beneficiaries/:household_id/assess
 * (contract docs/contracts/admin-web/admin-risk-assessment.json).
 *
 * Prerequisites:
 * 1. Docker containers running (db, server, ml-service).
 * 2. reset_demo.sh run (Demo Case A ACTIVE_COMPLIANT with 6 PMT features; test accounts).
 * 3. Node 18+.
 *
 * Modes:
 *   default            ML service up: Case A scored by the model and flagged.
 *   EXPECT_ML_DOWN=1   Stop kilosunlad-ml first: Case A must be EVALUATED_VIA_FALLBACK, no crash.
 *
 * Usage: node data-pipeline/scripts/test_int05_risk_assessment.js
 */
const path = require('path');

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000/api/v1';
const ML_DOWN = process.env.EXPECT_ML_DOWN === '1';
const contract = require(path.resolve(__dirname, '../../docs/contracts/admin-web/admin-risk-assessment.json'));
const CREDS = {
  director: { username: 'director_test', password: 'DirectorTest2026!' },
  worker: { username: 'case_worker_test', password: 'CaseWorkerTest2026!' },
  auditor: { username: 'auditor_test', password: 'AuditorTest2026!' }
};
const CASE_A = 'DEMO-4PS-GRAD-0001';
const ALREADY_FLAGGED = 'TEST-4PS-0002';

let failures = 0;
function check(label, condition, detail) {
  if (condition) console.log(`   [OK]   ${label}`);
  else { failures++; console.error(`   [FAIL] ${label}`, detail === undefined ? '' : JSON.stringify(detail)); }
}
async function call(method, p, { token, body, raw } = {}) {
  const res = await fetch(`${BASE_URL}${p}`, { method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: raw ?? (body === undefined ? undefined : JSON.stringify(body)) });
  let data = null;
  try { data = await res.json(); } catch { /* empty */ }
  return { status: res.status, data };
}
const expectError = (label, r, status, code) => check(`${label} -> ${status} ${code}`,
  r.status === status && r.data?.error?.code === code, { status: r.status, body: r.data });

async function run() {
  console.log(`[START] INT-05 Risk Assessment Integration Test (${ML_DOWN ? 'ML DOWN' : 'ML UP'})\n`);
  const tokens = {};
  for (const [role, creds] of Object.entries(CREDS)) {
    const r = await call('POST', '/auth/login', { body: creds });
    if (r.status !== 200) throw new Error(`Login failed for ${creds.username}: ${r.status}`);
    tokens[role] = r.data.access_token;
  }
  const assess = (as, id, body = {}) => call('POST', `/beneficiaries/${encodeURIComponent(id)}/assess`,
    { token: as && tokens[as], body });

  console.log('[1] Negative cases (expect zero writes)...');
  expectError('No token', await assess(null, CASE_A), 401, 'UNAUTHORIZED');
  expectError('CASE_WORKER', await assess('worker', CASE_A), 403, 'FORBIDDEN');
  expectError('COA_AUDITOR mutation', await assess('auditor', CASE_A), 403, 'FORBIDDEN');
  expectError('Client-supplied score', await assess('director', CASE_A, { composite_risk_score: 0 }), 400, 'INVALID_REQUEST');
  expectError('Unknown household', await assess('director', 'TEST-4PS-DOES-NOT-EXIST'), 404, 'HOUSEHOLD_NOT_FOUND');
  expectError('Already flagged household', await assess('director', ALREADY_FLAGGED), 409, 'HOUSEHOLD_NOT_ASSESSABLE');
  console.log('');

  console.log(`[2] Assessing ${CASE_A}...`);
  const r = await assess('director', CASE_A);
  const d = r.data || {};
  check('200 OK', r.status === 200, r);
  check('response keys match contract',
    JSON.stringify(Object.keys(d).sort()) === JSON.stringify(Object.keys(contract.response.data).sort()), Object.keys(d));
  if (ML_DOWN) {
    check('EVALUATED_VIA_FALLBACK with reason', d.evaluation_mode === 'EVALUATED_VIA_FALLBACK' &&
      typeof d.fallback_reason === 'string', d);
    check('no fabricated prediction', d.predicted_swdi_level === null && d.class_probabilities === null &&
      Array.isArray(d.shap_explainability) && d.shap_explainability.length === 0, d);
    check('fallback tag recorded', d.flag_reasons?.includes('EVALUATED_VIA_FALLBACK'), d.flag_reasons);
    check('SWDI term is 0 in fallback', d.contributions?.swdi === 0, d.contributions);
  } else {
    check('ML_MODEL mode', d.evaluation_mode === 'ML_MODEL' && d.fallback_reason === null, d);
    check('predicted Level 3 vs enrolled Level 1', d.predicted_swdi_level === 3 && d.enrolled_swdi_level === 1, d);
    check('SHAP top-3 present', Array.isArray(d.shap_explainability) && d.shap_explainability.length === 3, d.shap_explainability);
    check('contributions match contract example', JSON.stringify(d.contributions) ===
      JSON.stringify(contract.response.data.contributions), d.contributions);
    check('score 100, flagged, FLAGGED_FOR_REVIEW', d.composite_risk_score === 100 && d.is_flagged === true &&
      d.program_status === 'FLAGGED_FOR_REVIEW', d);
    check('MODEL_FLAG_RAISED receipt', /^[a-f0-9]{64}$/.test(d.audit_receipt?.entry_hash || ''), d.audit_receipt);
    console.log('');

    console.log('[3] Triage queue reflects the persisted flag...');
    const q = await call('GET', '/beneficiaries/triage-queue?status=FLAGGED_FOR_REVIEW&limit=100', { token: tokens.director });
    const item = q.data?.items?.find(i => i.household_id === CASE_A);
    check('Case A listed with persisted score and predicted level', item && item.composite_risk_score === 100 &&
      item.predicted_swdi_level === 3, item);
    expectError('Re-assessing a flagged household', await assess('director', CASE_A), 409, 'HOUSEHOLD_NOT_ASSESSABLE');
    console.log('');

    const end = d.audit_receipt?.sequence_index;
    if (end) {
      console.log(`[4] COA verify-chain over 1..${end}...`);
      const chain = await call('GET', `/audit/verify-chain?start_sequence=1&end_sequence=${end}`, { token: tokens.auditor });
      check('chain valid, head = MODEL_FLAG_RAISED block', chain.status === 200 && chain.data.is_chain_valid === true &&
        chain.data.head_hash === d.audit_receipt.entry_hash, chain.data);
    }
  }
  console.log('');
  if (failures) { console.error(`[FAIL] INT-05 TEST FAILED (${failures} check(s))`); process.exit(1); }
  console.log('[SUCCESS] INT-05 TEST PASSED!');
  console.log('Response Data:', JSON.stringify(d, null, 2));
}

run().catch(error => { console.error('\n[FAIL] INT-05 TEST FAILED!\nError:', error.message); process.exit(1); });

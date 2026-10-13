/**
 * test_int01_ml_contract.js
 * Integration test for INT-01: backend ML client <-> ML service, against the
 * frozen contract docs/contracts/ml/ml-swdi-inference.json (v1.1, 6-feature PMT vector).
 *
 * Prerequisites:
 * 1. ML service running (docker: kilosunlad-ml on :8000).
 * 2. server/node_modules installed (the script loads the real backend mlClient).
 * 3. Node 18+.
 *
 * Usage: ML_URL=http://localhost:8000 node data-pipeline/scripts/test_int01_ml_contract.js
 */
const path = require('path');

const ML_URL = process.env.ML_URL || 'http://localhost:8000';
const ROOT = path.resolve(__dirname, '../..');
const contract = require(path.join(ROOT, 'docs/contracts/ml/ml-swdi-inference.json'));
const { createMlClient } = require(path.join(ROOT, 'server/src/services/mlClient.service'));

let failures = 0;
function check(label, condition, detail) {
  if (condition) console.log(`   [OK]   ${label}`);
  else { failures++; console.error(`   [FAIL] ${label}`, detail === undefined ? '' : JSON.stringify(detail)); }
}
async function predict(body) {
  const res = await fetch(`${ML_URL}${contract.endpoint}`, { method: contract.method,
    headers: contract.headers, body: JSON.stringify(body) });
  let data = null;
  try { data = await res.json(); } catch { /* empty */ }
  return { status: res.status, data };
}
const isoWithZone = value => typeof value === 'string' && Number.isFinite(Date.parse(value)) &&
  /(?:Z|[+-]\d{2}:\d{2})$/.test(value);

async function run() {
  console.log(`[START] INT-01 ML contract test (contract v${contract.version})\n`);

  console.log('[1] Contract request accepted by the ML service...');
  const ok = await predict(contract.request);
  const e = ok.data?.ml_evaluation;
  check('200 OK', ok.status === contract.response.status, ok);
  check('household_id echoed', ok.data?.household_id === contract.request.household_id, ok.data);
  check('predicted_swdi_level in {1,2,3}', [1, 2, 3].includes(e?.predicted_swdi_level), e);
  const probs = e?.class_probabilities || {};
  check('class_probabilities keys match contract',
    JSON.stringify(Object.keys(probs).sort()) ===
    JSON.stringify(Object.keys(contract.response.data.ml_evaluation.class_probabilities).sort()), probs);
  check('probabilities sum to 1 (+/-0.01)', Math.abs(Object.values(probs).reduce((a, b) => a + b, 0) - 1) <= 0.01, probs);
  check('SHAP top-3 attributions with indicator/weight/description', Array.isArray(e?.shap_explainability) &&
    e.shap_explainability.length === 3 && e.shap_explainability.every(s => typeof s.indicator === 'string' &&
    Number.isFinite(s.contribution_weight) && typeof s.description === 'string'), e?.shap_explainability);
  check('evaluated_at is ISO-8601 with zone', isoWithZone(ok.data?.evaluated_at), ok.data?.evaluated_at);
  console.log('');

  console.log('[2] Contract error responses (422 INVALID_FEATURE_VECTOR)...');
  const expected = contract.error_responses.find(r => r.status === 422);
  const legacy = { household_id: 'LEGACY', demographics: { household_size: 6, dependents_ratio: 2.0,
    head_education_level: 1, wall_score: 1, roof_score: 2, water_access_level: 1 } };
  for (const [label, body] of [
    ['v1.0 legacy vector', legacy],
    ['head_education_level out of bounds (4)', { ...contract.request,
      demographics: { ...contract.request.demographics, head_education_level: 4 } }],
    ['missing household_size', { household_id: 'X', demographics: contract.request.demographics }]
  ]) {
    const r = await predict(body);
    check(`${label} -> 422 ${expected.error.code}`, r.status === 422 &&
      JSON.stringify(r.data) === JSON.stringify({ error: expected.error }), r);
  }
  console.log('');

  console.log('[3] Backend mlClient against the live ML service...');
  const client = createMlClient({ baseURL: ML_URL });
  try {
    const result = await client.predict(contract.request);
    check('mlClient validates the live response', result.household_id === contract.request.household_id, result);
  } catch (error) {
    check('mlClient validates the live response', false, { code: error.code, message: error.message });
  }
  try {
    await client.predict(legacy);
    check('mlClient rejects legacy vector before network', false);
  } catch (error) {
    check('mlClient rejects legacy vector before network', error.code === 'INVALID_FEATURE_VECTOR', error.code);
  }
  const down = createMlClient({ baseURL: 'http://127.0.0.1:9' });
  try {
    await down.predict(contract.request);
    check('ML down -> ML_UNAVAILABLE', false);
  } catch (error) {
    check('ML down -> ML_UNAVAILABLE (fallback trigger, no crash)', error.code === 'ML_UNAVAILABLE', error.code);
  }
  console.log('');

  console.log('[4] Latency (ML-05: sub-50 ms p95 over 50 sequential calls)...');
  const times = [];
  for (let i = 0; i < 50; i++) {
    const t0 = process.hrtime.bigint();
    await predict(contract.request);
    times.push(Number(process.hrtime.bigint() - t0) / 1e6);
  }
  times.sort((a, b) => a - b);
  const p95 = times[Math.ceil(0.95 * times.length) - 1];
  check(`p95 ${p95.toFixed(1)} ms < 50 ms`, p95 < 50, times.slice(-5));
  console.log('');

  if (failures) { console.error(`[FAIL] INT-01 TEST FAILED (${failures} check(s))`); process.exit(1); }
  console.log('[SUCCESS] INT-01 TEST PASSED!');
}

run().catch(error => { console.error('\n[FAIL] INT-01 TEST FAILED!\nError:', error.message); process.exit(1); });

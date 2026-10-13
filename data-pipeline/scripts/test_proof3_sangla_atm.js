/**
 * test_proof3_sangla_atm.js
 * Capstone Proof 3 (Sangla-ATM syndicate): posting the demo ATM telemetry
 * window to the ML service yields the frozen ml-atm-telemetry.json result,
 * an anomalous batch scored 85.0/100, and a short window returns the
 * contract's 400 INSUFFICIENT_TRANSACTION_SAMPLE.
 *
 * Prerequisites: ML service running (kilosunlad-ml on :8000). Node 18+.
 * Usage: ML_URL=http://localhost:8000 node data-pipeline/scripts/test_proof3_sangla_atm.js
 */
const path = require('path');
const contract = require(path.resolve(__dirname, '../../docs/contracts/ml/ml-atm-telemetry.json'));
const payload = require(path.resolve(__dirname, '../seeds/demo/sangla_atm_payload.json'));

const ML_URL = process.env.ML_URL || 'http://localhost:8000';
let failures = 0;
function check(label, condition, detail) {
  if (condition) console.log(`   [OK]   ${label}`);
  else { failures++; console.error(`   [FAIL] ${label}`, detail === undefined ? '' : JSON.stringify(detail)); }
}
const post = body => fetch(`${ML_URL}${contract.endpoint}`, { method: contract.method,
  headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  .then(async r => ({ status: r.status, data: await r.json().catch(() => null) }));

async function run() {
  console.log('[START] Proof 3: Sangla-ATM Syndicate\n');
  const r = await post(payload);
  const w = r.data?.window_evaluation;
  const expected = contract.response.data.window_evaluation;
  check('200 OK', r.status === contract.response.status, r);
  check('anomalous batch scored 85.0/100', w?.is_anomalous_batch === true && w?.sangla_atm_risk_score === 85.0, w);
  check('window_evaluation keys match contract', JSON.stringify(Object.keys(w || {}).sort()) === JSON.stringify(Object.keys(expected).sort()), w && Object.keys(w));
  check('cluster metrics keys match contract', JSON.stringify(Object.keys(w?.cluster_metrics || {}).sort()) ===
    JSON.stringify(Object.keys(expected.cluster_metrics).sort()));
  check(`all ${payload.transactions.length} households in the cluster flagged`, w?.flagged_household_ids?.length === payload.transactions.length &&
    payload.transactions.every(t => w.flagged_household_ids.includes(t.household_id)), w?.flagged_household_ids);
  check('nocturnal window detected', w?.cluster_metrics?.nocturnal_window_flag === true);
  check('evaluated_at is ISO-8601 with zone', /(?:Z|[+-]\d{2}:\d{2})$/.test(r.data?.evaluated_at || ''), r.data?.evaluated_at);

  const err = contract.error_responses[0];
  const short = await post({ ...payload, transactions: payload.transactions.slice(0, 2) });
  check(`2 transactions -> ${err.status} ${err.error.code}`, short.status === err.status &&
    JSON.stringify(short.data) === JSON.stringify({ error: err.error }), short);
  console.log('');
  if (failures) { console.error(`[FAIL] PROOF 3 FAILED (${failures} check(s))`); process.exit(1); }
  console.log('[SUCCESS] PROOF 3 PASSED!');
}
run().catch(error => { console.error('\n[FAIL] PROOF 3 FAILED!\nError:', error.message); process.exit(1); });

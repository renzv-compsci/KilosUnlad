/**
 * test_deployment_dataset.js
 * Verifies the deployment dataset built by load_deployment_data.sh, through the API only:
 *   - 20,000 generated households (+ Case A), no hand-made TEST-4PS-* households left;
 *   - 25-40 households flagged, and every flag was raised by the model (one MODEL_FLAG_RAISED
 *     ledger block per high-risk household, ML_MODEL evaluation);
 *   - every barangay that has households has an active caseworker, and every dispatched task
 *     went to a caseworker who covers that household's barangay;
 *   - each lifecycle stage exists (flagged, dispatched, report submitted, notice, retained);
 *   - the whole audit ledger verifies.
 * Usage: node data-pipeline/scripts/test_deployment_dataset.js   Env: BASE_URL
 */
const BASE_URL = process.env.BASE_URL || 'http://localhost:5000/api/v1';
let failures = 0;
const check = (label, ok, detail) => { if (ok) console.log(`   [OK]   ${label}`); else { failures++; console.error(`   [FAIL] ${label}`, detail === undefined ? '' : JSON.stringify(detail).slice(0, 400)); } };
const call = async (p, token, opts = {}) => { const r = await fetch(`${BASE_URL}${p}`, { ...opts, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
  return { status: r.status, data: await r.json().catch(() => null) }; };
const login = async (u, p) => (await call('/auth/login', null, { method: 'POST', body: JSON.stringify({ username: u, password: p }) })).data?.access_token;

(async () => {
  console.log('[START] Deployment dataset verification\n');
  const director = await login('director_test', 'DirectorTest2026!');
  const coa = await login('auditor_test', 'AuditorTest2026!');
  const o = (await call('/insights/overview', director)).data;
  const oc = (await call('/insights/overview', coa)).data;   // the ledger summary is shown to COA, not to directors

  console.log('[1] Households');
  check('20,001 households in scope (20,000 generated + Case A)', o.households.total === 20001, o.households.total);
  const test = await call('/beneficiaries/triage-queue?limit=100', director);
  const tests = (await Promise.all(['ACTIVE_COMPLIANT', 'FLAGGED_FOR_REVIEW', 'UNDER_INVESTIGATION', 'NOTICE_OF_INELIGIBILITY']
    .map(s => call(`/beneficiaries/triage-queue?status=${s}&limit=100`, director)))).flatMap(r => r.data.items).filter(h => h.household_id.startsWith('TEST-'));
  check('no hand-made TEST-4PS households remain (first pages of every status)', tests.length === 0 && test.status === 200, tests.map(h => h.household_id));

  console.log('\n[2] Flags come from the model');
  check('25-40 households flagged (score >= 70)', o.risk.high_risk >= 25 && o.risk.high_risk <= 40, o.risk.high_risk);
  check('one MODEL_FLAG_RAISED ledger block per flagged household', oc.audit.by_action.MODEL_FLAG_RAISED === o.risk.high_risk, oc.audit.by_action);
  const flagged = (await call('/beneficiaries/triage-queue?status=FLAGGED_FOR_REVIEW&limit=100', director)).data.items;
  const sample = flagged.slice(0, 5);
  const explained = await Promise.all(sample.map(h => call(`/beneficiaries/${h.household_id}/assessment`, director)));
  check('flagged households carry the sealed model explanation (SHAP, ML_MODEL)', explained.every(r => r.status === 200 &&
    r.data.evaluation_mode === 'ML_MODEL' && r.data.shap_explainability?.length === 3), explained.map(r => [r.status, r.data?.evaluation_mode]));

  console.log('\n[3] Caseworkers cover every barangay');
  const workers = (await call('/users/caseworkers', director)).data.items;
  const covered = [...new Set(workers.flatMap(w => w.jurisdiction.assigned_barangays))];
  const counts = await Promise.all(covered.map(b => call(`/beneficiaries/triage-queue?barangay=${encodeURIComponent(b)}&limit=1`, director)));
  const inCovered = counts.reduce((n, r) => n + r.data.pagination.total_records, 0);
  check(`every household is in a barangay with a caseworker (${covered.join(', ')})`, inCovered === o.households.total, { inCovered, total: o.households.total });
  check('at least one caseworker per barangay', covered.every(b => workers.some(w => w.jurisdiction.assigned_barangays.includes(b))));
  const tasks = (await call('/tasks?limit=100', director)).data.items;
  const byId = Object.fromEntries(workers.map(w => [w.user_id, w]));
  check('every task went to a caseworker who covers its barangay', tasks.length > 0 && tasks.every(t =>
    byId[t.assigned_worker?.user_id]?.jurisdiction.assigned_barangays.includes(t.address?.barangay ?? t.household?.address?.barangay)),
    tasks.slice(0, 3));

  console.log('\n[4] Every lifecycle stage exists');
  const s = o.households.by_status, ts = o.tasks.by_status;
  check('flagged, under investigation and under notice households exist', s.FLAGGED_FOR_REVIEW > 0 && s.UNDER_INVESTIGATION > 0 && s.NOTICE_OF_INELIGIBILITY > 0, s);
  check('tasks awaiting a visit, reports submitted, a notice and a retention exist',
    ts.PENDING_DISPATCH > 0 && ts.SUBMITTED > 0 && ts.VERIFIED_GRADUATE > 0 && ts.VERIFIED_RETAIN > 0, ts);

  console.log('\n[5] Ledger');
  const head = oc.audit.last_sequence_index;
  const chain = (await call(`/audit/verify-chain?start_sequence=1&end_sequence=${head}`, coa)).data;
  check(`whole ledger verifies (1-${head})`, chain?.is_chain_valid === true, chain);

  if (failures) { console.error(`\n[FAILED] ${failures} check(s) failed.`); process.exit(1); }
  console.log('\n[SUCCESS] Deployment dataset verified.');
})().catch(e => { console.error('[ERROR]', e); process.exit(1); });

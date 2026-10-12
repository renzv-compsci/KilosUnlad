/**
 * test_str03_concurrency.js
 * Sprint 5 STR-03: concurrency and duplicate regression at production volume.
 * - Fan-out: CONCURRENCY simultaneous assessments of distinct SYN households.
 * - Contested household: simultaneous dispatches and submissions commit once.
 * - Audit-sequence contention: WRITERS simultaneous declarations, then lifts,
 *   each appending a block (every request competes for the next sequence).
 * - Zero unhandled 5xx; audit blocks == successful mutations; chain verifies.
 *
 * Prerequisites:
 * 1. Stack running; reset_demo.sh, seed-ingest (80k), add_int02_case_a_fixture.js
 *    (case_worker_test covers Palingon and Real). Fresh audit ledger.
 * 2. Node 18+.
 *
 * Usage: CONCURRENCY=60 node data-pipeline/scripts/test_str03_concurrency.js
 */
const BASE_URL = process.env.BASE_URL || 'http://localhost:5000/api/v1';
const CONCURRENCY = Number(process.env.CONCURRENCY || 60);
const CONTENDERS = Number(process.env.CONTENDERS || 20);
const WRITERS = Number(process.env.WRITERS || 30);
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
const tally = results => results.reduce((acc, r) => ({ ...acc, [r.status]: (acc[r.status] || 0) + 1 }), {});

async function run() {
  console.log(`[START] STR-03 Concurrency Test (fan-out ${CONCURRENCY}, contenders ${CONTENDERS})\n`);
  const t = {}, ids = {};
  for (const [role, creds] of Object.entries(CREDS)) {
    const r = await call('POST', '/auth/login', { body: creds });
    t[role] = r.data.access_token; ids[role] = r.data.user.user_id;
  }

  const roster = await call('GET', `/beneficiaries/triage-queue?status=ACTIVE_COMPLIANT&limit=100`, { token: t.director });
  check('production volume present (>= 80,000 ACTIVE_COMPLIANT)', roster.data?.pagination?.total_records >= 80000, roster.data?.pagination);
  const households = roster.data.items.filter(i => i.household_id.startsWith('SYN-4PS-')).slice(0, CONCURRENCY);
  console.log('');

  console.log(`[1] ${households.length} simultaneous assessments of distinct households...`);
  let started = Date.now();
  const fan = await Promise.all(households.map(h => call('POST', `/beneficiaries/${h.household_id}/assess`, { token: t.director, body: {} })));
  const fanMs = Date.now() - started;
  const counts = tally(fan);
  check(`all 200, zero 5xx (${JSON.stringify(counts)}, ${fanMs} ms)`, counts[200] === households.length, fan.filter(r => r.status !== 200).slice(0, 3));
  const flagged = fan.filter(r => r.status === 200 && r.data.is_flagged);
  check(`flagged results carry receipts (${flagged.length} flagged)`, flagged.every(r => r.data.audit_receipt), flagged.length);
  console.log('');

  const target = flagged.map(r => households.find(h => h.household_id === r.data.household_id))
    .find(h => ['Palingon', 'Real'].includes(h.address.barangay));
  if (!target) throw new Error('No flagged household inside case_worker_test jurisdiction; raise CONCURRENCY');
  console.log(`[2] ${CONTENDERS} simultaneous dispatches of ${target.household_id}...`);
  const body = { household_id: target.household_id, assigned_worker_id: ids.worker, priority: 'HIGH',
    due_date: new Date(Date.now() + 7 * 86400000).toISOString() };
  const dispatches = await Promise.all(Array.from({ length: CONTENDERS }, () => call('POST', '/tasks/dispatch', { token: t.director, body })));
  const dCounts = tally(dispatches);
  check(`exactly one 201, the rest 409, zero 5xx (${JSON.stringify(dCounts)})`, dCounts[201] === 1 && dCounts[409] === CONTENDERS - 1, dCounts);
  const task = dispatches.find(r => r.status === 201).data;
  const feed = await call('GET', '/tasks/assigned', { token: t.worker });
  check('exactly one task for the household in the worker feed',
    feed.data.tasks.filter(x => x.household_id === target.household_id).length === 1);
  console.log('');

  console.log(`[3] ${CONTENDERS} simultaneous submissions of ${task.task_id}...`);
  const [lng, lat] = target.address.coordinates;
  const report = { task_id: task.task_id, household_id: target.household_id, verified_swdi_level: 2,
    worker_recommendation: 'RETAIN', narrative_report: 'STR-03 contested submission.', evidence_attachments: [],
    livelihood_asset_verification: { is_motorcycle_present: false, is_productive_asset: false, proof_type: 'NONE', franchise_number: '' },
    landbank_card_inspection: { physical_card_presented: true, card_matches_beneficiary: true, pawning_suspected: false },
    client_geolocation: { latitude: lat, longitude: lng, accuracy_meters: 5, captured_at: new Date().toISOString() } };
  const submits = await Promise.all(Array.from({ length: CONTENDERS }, () =>
    call('POST', `/tasks/${task.task_id}/submit`, { token: t.worker, body: report })));
  const sCounts = tally(submits);
  check(`exactly one 200, the rest 409, zero 5xx (${JSON.stringify(sCounts)})`, sCounts[200] === 1 && sCounts[409] === CONTENDERS - 1, sCounts);
  console.log('');

  console.log(`[4] Audit-sequence contention: ${WRITERS} simultaneous declarations, then ${WRITERS} lifts...`);
  const zones = Array.from({ length: WRITERS }, (_, i) => ({ province: 'Laguna', municipality: `STR03-Zone-${i + 1}` }));
  started = Date.now();
  const declared = await Promise.all(zones.map(z => call('POST', '/calamity/toggle', { token: t.admin,
    body: { ...z, is_active: true, ndrrmc_reference: 'NDRRMC-STR03' } })));
  const declaredMs = Date.now() - started;
  check(`declarations all 201, zero 5xx (${JSON.stringify(tally(declared))}, ${declaredMs} ms)`,
    tally(declared)[201] === WRITERS, declared.filter(r => r.status !== 201).slice(0, 3));
  const lifted = await Promise.all(zones.map(z => call('POST', '/calamity/toggle', { token: t.admin, body: { ...z, is_active: false } })));
  check(`lifts all 200, zero 5xx (${JSON.stringify(tally(lifted))})`, tally(lifted)[200] === WRITERS,
    lifted.filter(r => r.status !== 200).slice(0, 3));
  console.log('');

  console.log('[5] Ledger accounting...');
  const expectedBlocks = flagged.length + 2 + 2 * WRITERS;
  const chain = await call('GET', `/audit/verify-chain?start_sequence=1&end_sequence=${expectedBlocks}`, { token: t.auditor });
  check(`chain 1..${expectedBlocks} valid and contiguous`, chain.status === 200 && chain.data.is_chain_valid === true &&
    chain.data.total_blocks_verified === expectedBlocks, chain.data);
  const beyond = await call('GET', `/audit/verify-chain?start_sequence=${expectedBlocks + 1}&end_sequence=${expectedBlocks + 1}`, { token: t.auditor });
  check('no extra block beyond successful mutations', beyond.status === 409 && beyond.data?.error?.code === 'AUDIT_RANGE_INCOMPLETE', beyond);
  console.log('');

  if (failures) { console.error(`[FAIL] STR-03 TEST FAILED (${failures} check(s))`); process.exit(1); }
  console.log('[SUCCESS] STR-03 TEST PASSED!');
}

run().catch(error => { console.error('\n[FAIL] STR-03 TEST FAILED!\nError:', error.message); process.exit(1); });

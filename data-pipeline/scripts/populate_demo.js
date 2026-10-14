/**
 * populate_demo.js
 * Makes the 80,000-household baseline look like a working system for a demo,
 * using only the public API (every guard applies, nothing is written directly):
 *   1. Collects an evenly spread sample of ACTIVE_COMPLIANT households
 *      (GET /beneficiaries/triage-queue, SAMPLE_PAGES pages of 100).
 *   2. Assesses each one (POST /beneficiaries/:id/assess, ML model v2). The model
 *      and the published rules decide who is flagged; each flag is sealed in the
 *      audit ledger (MODEL_FLAG_RAISED).
 *   3. Dispatches the DISPATCH highest-scoring flagged households that the test
 *      caseworker covers (POST /tasks/dispatch), with spread deadlines.
 *   4. Checks the dashboard overview reflects the result.
 *
 * Prerequisites: stack running; 80k baseline loaded; the three fixtures
 * (add_int02_case_a_fixture, add_int03_notice_fixture, add_dispatch_test).
 * Usage: node data-pipeline/scripts/populate_demo.js
 * Env: BASE_URL (default http://localhost:5000/api/v1), SAMPLE_PAGES (15), DISPATCH (30)
 */
const BASE_URL = process.env.BASE_URL || 'http://localhost:5000/api/v1';
const SAMPLE_PAGES = Number(process.env.SAMPLE_PAGES || 15);
const DISPATCH = Number(process.env.DISPATCH || 30);
const DAY = 86400000;

async function call(method, p, { token, body } = {}) {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(`${BASE_URL}${p}`, { method,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body) });
    const data = await res.json().catch(() => null);
    // Retry only transient conflicts (ledger sequence contention) and service hiccups.
    if ((res.status === 503 || data?.error?.code === 'WORKFLOW_CONFLICT') && attempt < 3) {
      await new Promise(r => setTimeout(r, 200 * (attempt + 1))); continue;
    }
    return { status: res.status, data };
  }
}
const login = async (username, password) => (await call('POST', '/auth/login', { body: { username, password } })).data?.access_token;

(async () => {
  console.log('[START] Populate demo data through the API\n');
  let admin = await login('super_admin_test', 'SuperAdminTest2026!');
  let director = await login('director_test', 'DirectorTest2026!');
  if (!admin || !director) throw new Error('Login failed: run reset_demo.sh (test accounts) first.');
  const refresh = async () => {   // access tokens last 15 minutes
    admin = await login('super_admin_test', 'SuperAdminTest2026!');
    director = await login('director_test', 'DirectorTest2026!');
  };

  console.log('[1] Sampling households...');
  const first = await call('GET', '/beneficiaries/triage-queue?status=ACTIVE_COMPLIANT&limit=100', { token: admin });
  const totalPages = first.data?.pagination?.total_pages;
  if (!totalPages) throw new Error(`Cannot read the household list: ${JSON.stringify(first)}`);
  const pages = [...new Set(Array.from({ length: SAMPLE_PAGES }, (_, i) => 1 + Math.floor((i * totalPages) / SAMPLE_PAGES)))];
  const ids = [];
  for (const page of pages) {
    const r = await call('GET', `/beneficiaries/triage-queue?status=ACTIVE_COMPLIANT&limit=100&page=${page}`, { token: admin });
    ids.push(...(r.data?.items || []).map(i => i.household_id));
  }
  console.log(`    ${ids.length} households from ${pages.length} of ${totalPages} pages\n`);

  console.log('[2] Assessing (model v2 + published rules)...');
  const started = Date.now();
  const tally = { flagged: 0, notFlagged: 0, failed: 0, fallback: 0 };
  for (const [n, id] of ids.entries()) {
    if (n && n % 400 === 0) await refresh();
    const r = await call('POST', `/beneficiaries/${encodeURIComponent(id)}/assess`, { token: admin, body: {} });
    if (r.status !== 200) { tally.failed++; if (tally.failed <= 3) console.log(`    ${id}: ${r.status} ${r.data?.error?.code}`); continue; }
    if (r.data.evaluation_mode !== 'ML_MODEL') tally.fallback++;
    r.data.risk_assessment?.is_flagged || r.data.is_flagged ? tally.flagged++ : tally.notFlagged++;
    if ((n + 1) % 250 === 0) process.stdout.write(`    ${n + 1}/${ids.length}\n`);
  }
  console.log(`    done in ${((Date.now() - started) / 1000).toFixed(0)} s:`, JSON.stringify(tally), '\n');

  console.log('[3] Dispatching flagged households to the test caseworker...');
  await refresh();
  const workers = (await call('GET', '/users/caseworkers', { token: director })).data?.items || [];
  const worker = workers.find(w => w.username === 'case_worker_test');
  if (!worker) throw new Error('case_worker_test is not an assignable caseworker for director_test.');
  const flagged = [];
  for (let page = 1; flagged.length < 2000; page++) {
    const r = await call('GET', `/beneficiaries/triage-queue?status=FLAGGED_FOR_REVIEW&limit=100&page=${page}`, { token: director });
    flagged.push(...(r.data?.items || []));
    if (page >= (r.data?.pagination?.total_pages || 0)) break;
  }
  const eligible = flagged.filter(h => worker.jurisdiction.assigned_barangays.includes(h.address.barangay) && h.household_id.startsWith('SYN-'))
    .sort((a, b) => b.composite_risk_score - a.composite_risk_score).slice(0, DISPATCH);
  let dispatched = 0;
  for (const [i, h] of eligible.entries()) {
    const score = h.composite_risk_score;
    const r = await call('POST', '/tasks/dispatch', { token: director, body: { household_id: h.household_id,
      assigned_worker_id: worker.user_id, priority: score >= 90 ? 'CRITICAL' : score >= 80 ? 'HIGH' : 'MEDIUM',
      assignment_notes: `Verify the flagged indicators (score ${score}): utility meters, vehicles and living conditions.`,
      due_date: new Date(Date.now() + (3 + (i % 12)) * DAY).toISOString() } });
    r.status === 201 ? dispatched++ : console.log(`    ${h.household_id}: ${r.status} ${r.data?.error?.code}`);
  }
  console.log(`    ${dispatched}/${eligible.length} dispatched\n`);

  console.log('[4] Dashboard check...');
  const o = (await call('GET', '/insights/overview', { token: director })).data;
  console.log(`    households ${o.households.total}, flagged (>=70) ${o.risk.high_risk}, under investigation ${o.households.by_status.UNDER_INVESTIGATION},`,
    `tasks ${o.tasks.total}, triggers ${o.risk.triggers.map(t => `${t.label} ${t.count}`).join(', ')}`);
  const ok = tally.failed === 0 && dispatched === eligible.length && o.households.total >= 80000 && o.risk.high_risk > 0;
  console.log(ok ? '\n[SUCCESS] Demo data populated.' : '\n[FAILED] See the messages above.');
  process.exit(ok ? 0 : 1);
})().catch(error => { console.error('[ERROR]', error.message); process.exit(1); });

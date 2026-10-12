/**
 * test_e2e02_calamity_freeze.js
 * Sprint 4 E2E-02: a declared calamity moratorium (RA 10121) freezes dispatch
 * and compliance flagging for households in the zone; expiry or lift resumes.
 *
 * Prerequisites:
 * 1. Docker containers running (db, server, ml-service).
 * 2. reset_demo.sh run, then add_dispatch_test.js (TEST-4PS-DISPATCH-0001:
 *    FLAGGED_FOR_REVIEW in Palingon, no open task).
 * 3. Node 18+. Not re-runnable without a reset (the final dispatch succeeds).
 *
 * Usage: node data-pipeline/scripts/test_e2e02_calamity_freeze.js
 */
const BASE_URL = process.env.BASE_URL || 'http://localhost:5000/api/v1';
const CREDS = {
  admin: { username: 'super_admin_test', password: 'SuperAdminTest2026!' },
  director: { username: 'director_test', password: 'DirectorTest2026!' },
  worker: { username: 'case_worker_test', password: 'CaseWorkerTest2026!' }
};
const ZONE = { province: 'Laguna', municipality: 'Calamba' };
const DISPATCH_HOUSEHOLD = 'TEST-4PS-DISPATCH-0001';
const ASSESS_HOUSEHOLD = 'TEST-4PS-0001';
const EXPIRY_SECONDS = 8;

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
const expectError = (label, r, status, code) => check(`${label} -> ${status} ${code}`,
  r.status === status && r.data?.error?.code === code, { status: r.status, body: r.data });

async function run() {
  console.log('[START] E2E-02 Calamity Moratorium Freeze Test\n');
  const tokens = {};
  let workerId;
  for (const [role, creds] of Object.entries(CREDS)) {
    const r = await call('POST', '/auth/login', { body: creds });
    if (r.status !== 200) throw new Error(`Login failed for ${creds.username}: ${r.status}`);
    tokens[role] = r.data.access_token;
    if (role === 'worker') workerId = r.data.user.user_id;
  }
  const dispatchBody = { household_id: DISPATCH_HOUSEHOLD, assigned_worker_id: workerId,
    assignment_notes: 'E2E-02 moratorium test', priority: 'HIGH',
    due_date: new Date(Date.now() + 7 * 86400000).toISOString() };
  const dispatch = () => call('POST', '/tasks/dispatch', { token: tokens.director, body: dispatchBody });
  const assess = () => call('POST', `/beneficiaries/${ASSESS_HOUSEHOLD}/assess`, { token: tokens.director, body: {} });
  const assignedCount = async () => (await call('GET', '/tasks/assigned', { token: tokens.worker })).data?.assigned_tasks_count;

  console.log(`[1] Declaring a ${EXPIRY_SECONDS}s moratorium for Calamba...`);
  const declared = await call('POST', '/calamity/toggle', { token: tokens.admin, body: { ...ZONE, is_active: true,
    ndrrmc_reference: `NDRRMC-E2E02-${Date.now()}`, expires_at: new Date(Date.now() + EXPIRY_SECONDS * 1000).toISOString() } });
  check('201 hold_active', declared.status === 201 && declared.data.hold_active === true, declared);
  console.log('');

  console.log('[2] While active: dispatch and flagging are frozen (no writes)...');
  const before = await assignedCount();
  expectError('Dispatch in zone', await dispatch(), 409, 'CALAMITY_MORATORIUM_ACTIVE');
  check('no task created', (await assignedCount()) === before, { before });
  expectError('Assessment in zone', await assess(), 409, 'CALAMITY_MORATORIUM_ACTIVE');
  console.log('');

  console.log(`[3] Waiting for expiry (${EXPIRY_SECONDS}s)...`);
  await new Promise(resolve => setTimeout(resolve, (EXPIRY_SECONDS + 1) * 1000));
  const resumed = await dispatch();
  check('dispatch resumes after expiry (201)', resumed.status === 201 && resumed.data.household_status === 'UNDER_INVESTIGATION', resumed);
  check('task visible to the worker', (await assignedCount()) === before + 1);
  console.log('');

  console.log('[4] Open-ended declaration, then lift...');
  const open = await call('POST', '/calamity/toggle', { token: tokens.admin, body: { ...ZONE, is_active: true,
    ndrrmc_reference: `NDRRMC-E2E02-OPEN-${Date.now()}` } });
  check('201 open-ended hold', open.status === 201 && open.data.hold_active === true && open.data.zone.expires_at === null, open);
  expectError('Assessment frozen', await assess(), 409, 'CALAMITY_MORATORIUM_ACTIVE');
  const lifted = await call('POST', '/calamity/toggle', { token: tokens.admin, body: { ...ZONE, is_active: false } });
  check('lift 200', lifted.status === 200 && lifted.data.hold_active === false, lifted);
  const after = await assess();
  check('assessment resumes after lift (200)', after.status === 200, after);
  console.log('');

  if (failures) { console.error(`[FAIL] E2E-02 TEST FAILED (${failures} check(s))`); process.exit(1); }
  console.log('[SUCCESS] E2E-02 TEST PASSED!');
}

run().catch(error => { console.error('\n[FAIL] E2E-02 TEST FAILED!\nError:', error.message); process.exit(1); });

/**
 * test_int04_calamity_toggle.js
 * Real-data integration test for INT-04: POST /api/v1/calamity/toggle.
 *
 * Prerequisites:
 * 1. Docker containers are running (db, server, ml-service).
 * 2. reset_demo.sh has been run (test accounts + Calamba sample households).
 * 3. Node 18+ (uses built-in fetch; no npm install needed).
 *
 * Re-runnable: the script ends with the Calamba moratorium lifted, and lifts
 * any moratorium left active by an interrupted earlier run before starting.
 *
 * Usage: node data-pipeline/scripts/test_int04_calamity_toggle.js
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000/api/v1';
const CREDS = {
  admin: { username: 'super_admin_test', password: 'SuperAdminTest2026!' },
  director: { username: 'director_test', password: 'DirectorTest2026!' },
  worker: { username: 'case_worker_test', password: 'CaseWorkerTest2026!' },
  auditor: { username: 'auditor_test', password: 'AuditorTest2026!' }
};
const ZONE = { province: 'Laguna', municipality: 'Calamba' };
const DAY = 24 * 60 * 60 * 1000;

let failures = 0;
function check(label, condition, detail) {
  if (condition) console.log(`   [OK]   ${label}`);
  else { failures++; console.error(`   [FAIL] ${label}`, detail === undefined ? '' : JSON.stringify(detail)); }
}

async function call(method, path, { token, body, raw } = {}) {
  const res = await fetch(`${BASE_URL}${path}`, { method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: raw ?? (body === undefined ? undefined : JSON.stringify(body)) });
  let data = null;
  try { data = await res.json(); } catch { /* empty body */ }
  return { status: res.status, data };
}

function expectError(label, response, status, code) {
  check(`${label} -> ${status} ${code}`, response.status === status && response.data?.error?.code === code,
    { status: response.status, body: response.data });
}

async function runTest() {
  console.log('[START] INT-04 Calamity Toggle Integration Test\n');
  const tokens = {};
  for (const [role, creds] of Object.entries(CREDS)) {
    const r = await call('POST', '/auth/login', { body: creds });
    if (r.status !== 200) throw new Error(`Login failed for ${creds.username}: ${r.status} ${JSON.stringify(r.data)}`);
    tokens[role] = r.data.access_token;
  }
  console.log('[1] Logged in as SUPER_ADMIN, REGIONAL_DIRECTOR, CASE_WORKER, COA_AUDITOR\n');
  const toggle = (as, body) => call('POST', '/calamity/toggle', { token: tokens[as], body });

  const pre = await toggle('admin', { ...ZONE, is_active: false });
  if (pre.status === 200) console.log('    (lifted a moratorium left active by an earlier run)\n');

  const declaration = { ...ZONE, is_active: true, ndrrmc_reference: `NDRRMC-INT04-${Date.now()}`,
    expires_at: new Date(Date.now() + 7 * DAY).toISOString() };

  console.log('[2] Negative cases (security guards and boundary validation, expect zero writes)...');
  expectError('No token', await call('POST', '/calamity/toggle', { body: declaration }), 401, 'UNAUTHORIZED');
  expectError('REGIONAL_DIRECTOR (municipality-wide scope)', await toggle('director', declaration), 403, 'FORBIDDEN');
  expectError('CASE_WORKER role', await toggle('worker', declaration), 403, 'FORBIDDEN');
  expectError('COA_AUDITOR mutation', await toggle('auditor', declaration), 403, 'FORBIDDEN');
  expectError('String boolean', await toggle('admin', { ...declaration, is_active: 'true' }), 400, 'INVALID_REQUEST');
  expectError('Missing NDRRMC reference', await toggle('admin', { ...ZONE, is_active: true }), 400, 'INVALID_REQUEST');
  expectError('Expiry in the past', await toggle('admin',
    { ...declaration, expires_at: new Date(Date.now() - DAY).toISOString() }), 400, 'INVALID_EXPIRY');
  expectError('Lift with nothing active', await toggle('admin', { ...ZONE, is_active: false }), 409, 'CALAMITY_NOT_ACTIVE');
  console.log('');

  console.log(`[3] Declaring moratorium for ${ZONE.municipality}, ${ZONE.province}...`);
  const declared = await toggle('admin', declaration);
  check('201 Created', declared.status === 201, declared);
  check('hold_active true for matching zone', declared.data?.hold_active === true, declared.data);
  check('affected households counted', Number.isInteger(declared.data?.affected_households) &&
    declared.data.affected_households > 0, declared.data);
  check('zone echoes NDRRMC reference and expiry', declared.data?.zone?.ndrrmc_reference === declaration.ndrrmc_reference &&
    declared.data?.zone?.expires_at === declaration.expires_at, declared.data?.zone);
  expectError('Duplicate declaration', await toggle('admin', declaration), 409, 'CALAMITY_ALREADY_ACTIVE');
  console.log('');

  console.log('[4] Lifting moratorium...');
  const lifted = await toggle('admin', { ...ZONE, is_active: false });
  check('200 OK', lifted.status === 200, lifted);
  check('hold_active false', lifted.data?.hold_active === false, lifted.data);
  console.log('');

  if (lifted.status === 200) {
    const end = lifted.data.audit_receipt.sequence_index;
    console.log(`[5] COA verify-chain over 1..${end}...`);
    const chain = await call('GET', `/audit/verify-chain?start_sequence=1&end_sequence=${end}`, { token: tokens.auditor });
    check('chain valid through declaration and lift', chain.status === 200 && chain.data.is_chain_valid === true &&
      chain.data.head_hash === lifted.data.audit_receipt.entry_hash, chain.data);
    console.log('');
  }

  if (failures) {
    console.error(`[FAIL] INT-04 TEST FAILED (${failures} check(s))`);
    process.exit(1);
  }
  console.log('[SUCCESS] INT-04 TEST PASSED!');
  console.log('Declaration Response:', JSON.stringify(declared.data, null, 2));
}

runTest().catch(error => {
  console.error('\n[FAIL] INT-04 TEST FAILED!');
  console.error('Error:', error.message);
  process.exit(1);
});

/**
 * test_int03_appeals_docket.js
 * Real-data integration test for INT-03: POST /api/v1/appeals/docket.
 *
 * Prerequisites:
 * 1. Docker containers are running (db, server, ml-service).
 * 2. reset_demo.sh has been run (test accounts + TEST-4PS-0003 UNDER_INVESTIGATION).
 * 3. add_int03_notice_fixture.js has been run (TEST-4PS-NOTICE-0001 under notice).
 * 4. Node 18+ (uses built-in fetch; no npm install needed).
 *
 * Usage: node data-pipeline/scripts/test_int03_appeals_docket.js
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000/api/v1';
const CREDS = {
  director: { username: 'director_test', password: 'DirectorTest2026!' },
  worker: { username: 'case_worker_test', password: 'CaseWorkerTest2026!' },
  auditor: { username: 'auditor_test', password: 'AuditorTest2026!' }
};
const TARGET_HOUSEHOLD = 'TEST-4PS-NOTICE-0001';
const NOT_UNDER_NOTICE = 'TEST-4PS-0003';
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

async function expectError(label, response, status, code) {
  check(`${label} -> ${status} ${code}`, response.status === status && response.data?.error?.code === code,
    { status: response.status, body: response.data });
}

// Manila calendar date, matching the appeal dialog's <input type="date">.
const manilaDate = offset => new Date(Date.now() + 8 * 60 * 60 * 1000 + offset).toISOString().slice(0, 10);

async function runTest() {
  console.log('[START] INT-03 Appeals Docket Integration Test\n');
  const tokens = {};
  for (const [role, creds] of Object.entries(CREDS)) {
    const r = await call('POST', '/auth/login', { body: creds });
    if (r.status !== 200) throw new Error(`Login failed for ${creds.username}: ${r.status} ${JSON.stringify(r.data)}`);
    tokens[role] = r.data.access_token;
  }
  console.log('[1] Logged in as REGIONAL_DIRECTOR, CASE_WORKER, COA_AUDITOR\n');

  const docketId = `APP-INT03-${Date.now()}`;
  const payload = { household_id: TARGET_HOUSEHOLD, appeal_docket_id: docketId,
    hearing_date: manilaDate(7 * DAY),
    appeal_grounds: 'Motorcycle is registered to a sibling living separately; Meralco report disputes usage.' };

  console.log('[2] Negative cases (security guards and boundary validation, expect zero writes)...');
  await expectError('No token', await call('POST', '/appeals/docket', { body: payload }), 401, 'UNAUTHORIZED');
  await expectError('CASE_WORKER role', await call('POST', '/appeals/docket', { token: tokens.worker, body: payload }), 403, 'FORBIDDEN');
  await expectError('COA_AUDITOR mutation', await call('POST', '/appeals/docket', { token: tokens.auditor, body: payload }), 403, 'FORBIDDEN');
  await expectError('Client-supplied status (frozen enum)', await call('POST', '/appeals/docket',
    { token: tokens.director, body: { ...payload, status: 'UNDER_APPEAL_HEARING' } }), 400, 'INVALID_REQUEST');
  await expectError('Impossible hearing date', await call('POST', '/appeals/docket',
    { token: tokens.director, body: { ...payload, hearing_date: '2026-02-30' } }), 400, 'INVALID_REQUEST');
  await expectError('Malformed JSON', await call('POST', '/appeals/docket', { token: tokens.director, raw: '{' }), 400, 'INVALID_JSON');
  await expectError('Unknown household', await call('POST', '/appeals/docket',
    { token: tokens.director, body: { ...payload, household_id: 'TEST-4PS-DOES-NOT-EXIST' } }), 404, 'HOUSEHOLD_NOT_FOUND');
  await expectError('Household not under notice', await call('POST', '/appeals/docket',
    { token: tokens.director, body: { ...payload, household_id: NOT_UNDER_NOTICE } }), 409, 'NOTICE_REQUIRED');
  console.log('');

  console.log(`[3] Filing appeal ${docketId} for ${TARGET_HOUSEHOLD}...`);
  const filed = await call('POST', '/appeals/docket', { token: tokens.director, body: payload });
  check('201 Created', filed.status === 201, filed);
  if (filed.status === 201) {
    const d = filed.data;
    check('docket_status UNDER_APPEAL_HEARING', d.docket_status === 'UNDER_APPEAL_HEARING', d);
    check('program_status unchanged (NOTICE_OF_INELIGIBILITY)', d.program_status === 'NOTICE_OF_INELIGIBILITY', d);
    check('countdown paused', d.countdown_paused === true, d);
    check('15-day statutory window from stored notice',
      Date.parse(d.notice_expiry_date) - Date.parse(d.notice_date) === 15 * DAY, d);
    check('audit receipt returned', Number.isInteger(d.audit_receipt?.sequence_index) &&
      /^[a-f0-9]{64}$/.test(d.audit_receipt?.entry_hash || ''), d.audit_receipt);
  }
  console.log('');

  console.log('[4] Duplicate filing for the same notice...');
  await expectError('Second appeal', await call('POST', '/appeals/docket',
    { token: tokens.director, body: { ...payload, appeal_docket_id: `${docketId}-B` } }), 409, 'APPEAL_ALREADY_FILED');
  console.log('');

  if (filed.status === 201) {
    const end = filed.data.audit_receipt.sequence_index;
    console.log(`[5] COA verify-chain over 1..${end}...`);
    const chain = await call('GET', `/audit/verify-chain?start_sequence=1&end_sequence=${end}`, { token: tokens.auditor });
    check('chain valid and includes APPEAL_FILED block', chain.status === 200 && chain.data.is_chain_valid === true &&
      chain.data.head_hash === filed.data.audit_receipt.entry_hash, chain.data);
    console.log('');
  }

  if (failures) {
    console.error(`[FAIL] INT-03 TEST FAILED (${failures} check(s))`);
    process.exit(1);
  }
  console.log('[SUCCESS] INT-03 TEST PASSED!');
  console.log('Response Data:', JSON.stringify(filed.data, null, 2));
}

runTest().catch(error => {
  console.error('\n[FAIL] INT-03 TEST FAILED!');
  console.error('Error:', error.message);
  process.exit(1);
});

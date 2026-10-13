/**
 * test_int08_appeals_ui.js
 * INT-08 (appeals): the Due Process screen lists real households under notice
 * from GET /api/v1/appeals/docket (contract admin-due-process-docket.json) and
 * the appeal dialog files through POST /api/v1/appeals/docket
 * (admin-appeal-filing.json). API checks plus a real-browser flow.
 *
 * Prerequisites:
 * 1. Stack running; reset_demo.sh, then add_int03_notice_fixture.js.
 * 2. Client at CLIENT_URL; `npm install playwright-core` on NODE_PATH; Chromium binary.
 *
 * Usage: CLIENT_URL=http://localhost:3000 node data-pipeline/scripts/test_int08_appeals_ui.js
 */
const path = require('path');
const { chromium } = require('playwright-core');
const contract = require(path.resolve(__dirname, '../../docs/contracts/admin-web/admin-due-process-docket.json'));

const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';
const BASE_URL = process.env.BASE_URL || 'http://localhost:5000/api/v1';
const CHROMIUM_PATH = process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium';
const HOUSEHOLD = 'TEST-4PS-NOTICE-0001';
const DAY = 24 * 60 * 60 * 1000;

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
const login = async (username, password) => (await call('POST', '/auth/login', { body: { username, password } })).data.access_token;

async function run() {
  console.log('[START] INT-08 Due Process Docket (API + browser)\n');
  const director = await login('director_test', 'DirectorTest2026!');
  const auditor = await login('auditor_test', 'AuditorTest2026!');
  const worker = await login('case_worker_test', 'CaseWorkerTest2026!');

  console.log('[1] GET /appeals/docket...');
  const list = await call('GET', '/appeals/docket', { token: director });
  check('200 OK', list.status === 200, list);
  const item = list.data?.items?.find(i => i.household_id === HOUSEHOLD);
  check('item keys match contract', item && JSON.stringify(Object.keys(item).sort()) ===
    JSON.stringify(Object.keys(contract.response.data.items[0]).sort()), item && Object.keys(item));
  check('fixture household under notice with a 15-day window', item?.status === 'NOTICE_OF_INELIGIBILITY' &&
    Date.parse(item.notice_expiry_date) - Date.parse(item.notice_date) === 15 * DAY, item);
  check('grants continue during the window (grant_continuation_active)', item?.grant_continuation_active === true, item);
  check('only NOTICE households listed', list.data.items.every(i => ['NOTICE_OF_INELIGIBILITY', 'UNDER_APPEAL_HEARING'].includes(i.status)));
  check('pagination present', list.data.pagination?.current_page === 1, list.data.pagination);
  check('COA auditor can read', (await call('GET', '/appeals/docket', { token: auditor })).status === 200);
  const w = await call('GET', '/appeals/docket', { token: worker });
  check('CASE_WORKER -> 403', w.status === 403, w);
  const q = await call('GET', '/appeals/docket?limit=500', { token: director });
  check('limit 500 -> 400 INVALID_QUERY', q.status === 400 && q.data?.error?.code === 'INVALID_QUERY', q);
  console.log('');

  console.log('[2] Browser: Due Process screen files a real appeal...');
  const docketId = `APP-UI-${Date.now()}`;
  const hearing = new Date(Date.now() + 8 * 3600 * 1000 + 6 * DAY).toISOString().slice(0, 10);
  const browser = await chromium.launch({ executablePath: CHROMIUM_PATH });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    await page.goto(CLIENT_URL);
    await page.fill('#login-username-input', 'director_test');
    await page.fill('#login-password-input', 'DirectorTest2026!');
    await page.click('#login-submit-btn');
    await page.getByRole('button', { name: /15-Day Due Process/ }).first().click();
    const card = page.locator(`#due-process-card-${HOUSEHOLD}`);
    await card.waitFor({ timeout: 10000 });
    check('live household card shown', await card.isVisible());
    check('no sample households on the live screen', (await page.locator('[id^="due-process-card-"]').count()) === list.data.items.length);
    check('countdown shows days remaining', /day/.test(await card.innerText()), await card.innerText());
    await page.click(`#file-appeal-btn-${HOUSEHOLD}`);
    await page.fill('#appeal-reference', docketId);
    await page.fill('#appeal-hearing', hearing);
    await page.fill('#appeal-grounds', 'Vehicle is registered to a sibling living separately; Meralco reading disputed.');
    await page.click('#confirm-appeal-docket-btn');
    await page.getByText('Appeal filed').first().waitFor({ timeout: 10000 });
    await card.locator('summary').click(); // appeal details live in the collapsed section
    const after = await card.innerText();
    check('card now shows the appeal hearing and docket', /Under appeal hearing/i.test(after) && after.includes(docketId), after);
    check('file-appeal button removed', (await page.locator(`#file-appeal-btn-${HOUSEHOLD}`).count()) === 0);
  } finally { await browser.close(); }
  console.log('');

  console.log('[3] Server state...');
  const again = await call('GET', '/appeals/docket', { token: director });
  const filed = again.data.items.find(i => i.household_id === HOUSEHOLD);
  check('GET reflects UNDER_APPEAL_HEARING with the same docket', filed?.status === 'UNDER_APPEAL_HEARING' &&
    filed.appeal_docket_id === docketId && filed.hearing_date === hearing, filed);
  console.log('');

  if (failures) { console.error(`[FAIL] INT-08 TEST FAILED (${failures} check(s))`); process.exit(1); }
  console.log('[SUCCESS] INT-08 TEST PASSED!');
}
run().catch(error => { console.error('\n[FAIL] INT-08 TEST FAILED!\nError:', error.message); process.exit(1); });

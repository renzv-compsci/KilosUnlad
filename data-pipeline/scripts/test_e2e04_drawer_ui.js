/**
 * test_e2e04_drawer_ui.js
 * Sprint 4 E2E-04 (browser): the SHAP values rendered in the triage drawer equal
 * the ML response payload for Demo Case A.
 *
 * Prerequisites:
 * 1. Stack running; reset_demo.sh run. Client reachable at CLIENT_URL.
 * 2. `npm install playwright-core` (any directory on NODE_PATH) and a Chromium
 *    binary (CHROMIUM_PATH, default /opt/pw-browsers/chromium).
 *
 * Usage: CLIENT_URL=http://localhost:3000 node data-pipeline/scripts/test_e2e04_drawer_ui.js
 */
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright-core');

const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';
const BASE_URL = process.env.BASE_URL || 'http://localhost:5000/api/v1';
const ML_URL = process.env.ML_URL || 'http://localhost:8000';
const CHROMIUM_PATH = process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium';
const SCREENSHOT = process.env.SCREENSHOT || '';
const CASE_A = 'DEMO-4PS-GRAD-0001';
const DIRECTOR = { username: 'director_test', password: 'DirectorTest2026!' };
const payload = require(path.resolve(__dirname, '../seeds/demo/graduation_swdi_payload.json'));

let failures = 0;
function check(label, condition, detail) {
  if (condition) console.log(`   [OK]   ${label}`);
  else { failures++; console.error(`   [FAIL] ${label}`, detail === undefined ? '' : JSON.stringify(detail)); }
}
const post = (url, body, token) => fetch(url, { method: 'POST', body: JSON.stringify(body),
  headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) } })
  .then(async r => ({ status: r.status, data: await r.json().catch(() => null) }));

async function run() {
  console.log('[START] E2E-04 Triage Drawer UI Test\n');
  const token = (await post(`${BASE_URL}/auth/login`, DIRECTOR)).data.access_token;
  const assessed = await post(`${BASE_URL}/beneficiaries/${CASE_A}/assess`, {}, token);
  check('Case A assessed or already flagged', assessed.status === 200 ||
    assessed.data?.error?.code === 'HOUSEHOLD_NOT_ASSESSABLE', assessed);
  const ml = await post(`${ML_URL}/api/v1/predict-swdi`, payload);
  const expected = ml.data.ml_evaluation.shap_explainability.map(s => s.contribution_weight);

  const browser = await chromium.launch({ executablePath: CHROMIUM_PATH });
  try {
    const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
    await page.goto(CLIENT_URL);
    await page.fill('#login-username-input', DIRECTOR.username);
    await page.fill('#login-password-input', DIRECTOR.password);
    await page.click('#login-submit-btn');
    await page.getByRole('button', { name: /Triage Queue/ }).first().click();
    const row = page.locator('tr.triage-record', { hasText: CASE_A });
    await row.locator('button.triage-details-toggle').click();
    const weights = page.locator(`#triage-details-${CASE_A} [data-shap-weight]`);
    await weights.first().waitFor({ timeout: 10000 });
    const rendered = (await weights.evaluateAll(nodes => nodes.map(n => Number(n.getAttribute('data-shap-weight')))));
    const text = await page.locator(`#triage-details-${CASE_A} .triage-explanation`).innerText();
    check('drawer renders 3 SHAP attributions', rendered.length === 3, rendered);
    check('rendered SHAP weights === ML response payload', JSON.stringify(rendered) === JSON.stringify(expected),
      { rendered, expected });
    check('drawer cites the sealed audit block', /Sealed in audit block #\d+/.test(text), text);
    if (SCREENSHOT) {
      fs.mkdirSync(path.dirname(SCREENSHOT), { recursive: true });
      await page.locator(`#triage-details-${CASE_A}`).screenshot({ path: SCREENSHOT });
      console.log(`   [INFO] screenshot: ${SCREENSHOT}`);
    }
  } finally { await browser.close(); }

  console.log('');
  if (failures) { console.error(`[FAIL] E2E-04 UI TEST FAILED (${failures} check(s))`); process.exit(1); }
  console.log('[SUCCESS] E2E-04 UI TEST PASSED!');
}

run().catch(error => { console.error('\n[FAIL] E2E-04 UI TEST FAILED!\nError:', error.message); process.exit(1); });

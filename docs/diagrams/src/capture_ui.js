/**
 * Section 9 / Section 11 screenshots from the running stack (real API data, no samples).
 * Prerequisites: reset_demo.sh, add_int02_case_a_fixture.js, add_dispatch_test.js; client at CLIENT_URL.
 * Usage: NODE_PATH=<playwright-core> BASE_URL=... CLIENT_URL=... node capture_ui.js <out dir> <photo.jpg>
 */
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright-core');
const [OUT, PHOTO] = process.argv.slice(2);
const BASE_URL = process.env.BASE_URL || 'http://localhost:5000/api/v1';
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';
const CASE_A = 'DEMO-4PS-GRAD-0001';
const HOME = { latitude: 14.22151, longitude: 121.18752 };
const shot = (page, name, target) => (target || page).screenshot({ path: path.join(OUT, name), type: 'jpeg', quality: 90 });
const api = async (method, p, token, body) => (await fetch(`${BASE_URL}${p}`, { method,
  headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  body: body && JSON.stringify(body) })).json();

async function login(page, username, password) {
  await page.goto(CLIENT_URL);
  await page.fill('#login-username-input', username);
  await page.fill('#login-password-input', password);
  await page.click('#login-submit-btn');
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const director = await api('POST', '/auth/login', null, { username: 'director_test', password: 'DirectorTest2026!' });
  const worker = await api('POST', '/auth/login', null, { username: 'case_worker_test', password: 'CaseWorkerTest2026!' });
  await api('POST', `/beneficiaries/${CASE_A}/assess`, director.access_token, {});
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  try {
    // 9.1 Login, 9.2 Dashboard, 9.4.1 Triage, 9.3 Dispatch modal, Section 11 confirmation
    const desk = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1.25 });
    const page = await desk.newPage();
    await page.goto(CLIENT_URL);
    await page.locator('#login-username-input').waitFor();
    await shot(page, 'ui_9_1_login.jpg');
    await login(page, 'director_test', 'DirectorTest2026!');
    await page.getByRole('button', { name: /Executive Overview/ }).first().waitFor();
    await page.waitForTimeout(1500);
    await shot(page, 'ui_9_2_dashboard.jpg');
    await page.getByRole('button', { name: /Triage Queue/ }).first().click();
    const row = page.locator('tr.triage-record', { hasText: CASE_A });
    await row.waitFor({ timeout: 10000 });
    await shot(page, 'ui_9_4a_triage_queue.jpg');
    await row.locator('button.triage-details-toggle').click();
    await page.locator(`#triage-details-${CASE_A} [data-shap-weight]`).first().waitFor({ timeout: 10000 });
    await page.locator(`#triage-details-${CASE_A}`).scrollIntoViewIfNeeded();
    await shot(page, 'ui_9_4b_triage_shap_drawer.jpg');
    await page.click(`#dispatch-task-btn-${CASE_A}`);
    await page.selectOption('#dispatch-worker-id', worker.user.user_id);
    await page.fill('#dispatch-instructions', 'Verify MoveIt delivery asset and LandBank cash card.');
    await page.fill('#dispatch-deadline', new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10));
    await page.selectOption('#dispatch-priority', 'HIGH');
    await shot(page, 'ui_9_3_dispatch_modal.jpg');
    await page.click('#confirm-dispatch-submit-btn');
    await page.getByRole('heading', { name: 'Task dispatched' }).waitFor({ timeout: 10000 });
    await shot(page, 'ui_11_dispatch_confirmation.jpg');
    await desk.close();

    // 9.4.2 Tablet field checklist (portrait tablet, live GPS + photo hash)
    const tab = await browser.newContext({ viewport: { width: 834, height: 1194 }, deviceScaleFactor: 1.25,
      permissions: ['geolocation'], geolocation: { ...HOME, accuracy: 6 }, hasTouch: true });
    const t = await tab.newPage();
    await login(t, 'case_worker_test', 'CaseWorkerTest2026!');
    await t.getByRole('button', { name: /Assigned Tasks/ }).first().click();
    const assigned = await api('GET', '/tasks/assigned', worker.access_token);
    const caseTask = (assigned.tasks || []).find(x => x.household_id === CASE_A);
    if (!caseTask) throw new Error('Case A task not in the worker feed');
    const start = t.locator(`#start-verification-btn-${caseTask.task_id}`);
    await start.waitFor({ timeout: 10000 });
    await shot(t, 'ui_9_4c_tablet_assigned_tasks.jpg');
    await start.click();
    const group = label => t.locator('div.space-y-2', { hasText: label }).first();
    await group('Wall Construction').getByRole('button').nth(2).click();
    await group('Roof').getByRole('button').nth(2).click();
    await group('Water').getByRole('button').nth(1).click();
    await t.getByRole('button', { name: /^Step 2:/ }).click();
    await t.getByRole('button', { name: /^Yes/ }).first().click();
    await t.getByRole('button', { name: /^Step 3:/ }).click();
    for (const [name, answer] of [['card-presented', 'Yes'], ['card-match', 'Yes'], ['pawning', 'No']]) {
      await t.locator(`input[name="${name}"]`).nth(answer === 'Yes' ? 0 : 1).check();
    }
    await t.getByRole('button', { name: /^Step 4:/ }).click();
    await t.locator('input[type="file"]').setInputFiles(PHOTO);
    await t.getByText(/Photo fingerprint/).first().waitFor({ timeout: 10000 });
    await t.getByText(/Within \d+ m/).first().waitFor({ timeout: 10000 });
    await t.waitForTimeout(500);
    await shot(t, 'ui_9_4d_tablet_field_checklist.jpg');
    await tab.close();

    // 9.4.3 COA chain inspector
    const coa = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1.25 });
    const c = await coa.newPage();
    await login(c, 'auditor_test', 'AuditorTest2026!');
    await c.getByRole('button', { name: /Audit Verification/ }).first().click();
    await c.fill('#audit-start', '1');
    await c.fill('#audit-end', '2');
    await c.getByRole('button', { name: /Verify range/ }).click();
    await c.locator('#audit-result-title').waitFor({ timeout: 10000 });
    await shot(c, 'ui_9_4e_coa_chain_inspector.jpg');
    await coa.close();
  } finally { await browser.close(); }
  console.log('captured', fs.readdirSync(OUT).join(', '));
})().catch(e => { console.error(e); process.exit(1); });

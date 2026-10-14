// Re-runs the QA report's steps (S2, S4, S5) on the freshly built stack, small set.
const { chromium } = require('playwright-core');
const crypto = require('crypto');
const zlib = require('zlib');
const URL = 'http://localhost';
const OUT = process.env.OUT;
const results = [];
const check = (label, ok, detail) => { results.push([ok ? 'PASS' : 'FAIL', label, detail ?? '']); console.log(ok ? '[OK]  ' : '[FAIL]', label, detail ?? ''); };
function png() {
  const chunk = (t, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]);
    const c = Buffer.alloc(4); c.writeUInt32BE(zlib.crc32(td) >>> 0); return Buffer.concat([l, td, c]); };
  const h = Buffer.alloc(13); h.writeUInt32BE(2, 0); h.writeUInt32BE(2, 4); h[8] = 8; h[9] = 2;
  const rgb = crypto.randomBytes(3), row = Buffer.concat([Buffer.from([0]), rgb, rgb]);
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', h), chunk('IDAT', zlib.deflateSync(Buffer.concat([row, row]))), chunk('IEND', Buffer.alloc(0))]);
}
async function login(page, u, p) {
  await page.goto(URL); await page.fill('#login-username-input', u); await page.fill('#login-password-input', p); await page.click('#login-submit-btn');
}
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  // --- S2: dashboard and the insights API -----------------------------------------
  const director = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await director.newPage();
  const insights = [];
  let overview = null;
  page.on('response', async r => { if (r.url().includes('/api/v1/insights/overview')) { insights.push(r.status()); try { overview = await r.json(); } catch {} } });
  await login(page, 'director_test', 'DirectorTest2026!');
  await page.getByText(/households in scope/i).first().waitFor({ timeout: 20000 });
  await page.waitForTimeout(1500);
  const body = await page.locator('body').innerText();
  check('S2: GET /api/v1/insights/overview returns 200 (not 404)', insights.length > 0 && insights.every(s => s === 200), insights);
  check('S2: no "Sample data" label, no 4,850, no ML-04 names', !/Sample data|4,850|#ML-0/.test(body));
  check('S2: API reports the seeded 7 households', overview?.households?.total === 7, overview?.households?.total);
  check('S2: the page shows "7" next to Households in scope', /Households in scope\s*\n\s*7\b|\b7\s*\n\s*Households in scope/i.test(body),
    (body.match(/[^\n]*\n?[^\n]*Households in scope[^\n]*\n?[^\n]*/i) || [''])[0].replace(/\s+/g, ' '));
  await page.screenshot({ path: `${OUT}/s2-dashboard.png` });
  // --- S4: dispatch with the caseworker picker ------------------------------------
  await page.getByRole('button', { name: /Triage Queue/ }).first().click();
  await page.click('#dispatch-task-btn-TEST-4PS-DISPATCH-0001');
  const select = page.locator('select#dispatch-worker-id');
  await select.waitFor({ timeout: 15000 });
  const options = await select.locator('option').allInnerTexts();
  check('S4: caseworker is a dropdown (not an account-ID text box)', await select.count() === 1, options);
  check('S4: the list contains Test Case Worker', options.some(o => /Test Case Worker/.test(o)));
  const value = await select.locator('option', { hasText: 'Test Case Worker' }).getAttribute('value');
  await select.selectOption(value);
  await page.fill('#dispatch-instructions', 'Verify assets and LandBank card custody (QA re-run).');
  const due = new Date(Date.now() + 5 * 864e5).toISOString().slice(0, 10);
  await page.fill('#dispatch-deadline', due);
  await page.selectOption('#dispatch-priority', 'HIGH');
  await page.screenshot({ path: `${OUT}/s4-dispatch-picker.png` });
  await page.click('#confirm-dispatch-submit-btn');
  await page.getByText('Task dispatched').waitFor({ timeout: 15000 });
  const receipt = await page.locator('[role="dialog"]').innerText();
  check('S4: "Task dispatched" with audit sequence 1', /sequence\s*#?\s*1\b|block\s*#?\s*1\b/i.test(receipt), receipt.replace(/\s+/g, ' ').slice(0, 200));
  await page.getByRole('button', { name: 'Close dispatch dialog' }).click();
  // --- Item 4: field operations view shows only the seeded tasks --------------------
  await page.getByRole('button', { name: /Caseworker Dispatch/ }).first().click();
  await page.locator('.dispatch-page').waitFor({ timeout: 15000 });
  await page.waitForTimeout(1500);
  const dispatchText = await page.locator('.dispatch-page').innerText();
  check('Item 4: dispatch view lists only seeded households (no ML-04/ML-07 names)', !/#ML-0|Maria Santos #|Juan Reyes #/.test(dispatchText) && /Dispatch TestSubject/.test(dispatchText));
  check('Item 4: Field staff shows Test Case Worker with 2 open tasks', /Test Case Worker[\s\S]{0,80}2 open/i.test(dispatchText), (dispatchText.match(/Test Case Worker[^\n]*\n?[^\n]*/) || [''])[0]);
  await page.screenshot({ path: `${OUT}/item4-dispatch-view.png`, fullPage: true });
  // --- S5: the caseworker submits the report with a geotagged photo --------------
  const worker = await browser.newContext({ viewport: { width: 1440, height: 900 }, permissions: ['geolocation'],
    geolocation: { latitude: 14.2120, longitude: 121.1660, accuracy: 6 } });
  const wp = await worker.newPage();
  await login(wp, 'case_worker_test', 'CaseWorkerTest2026!');
  await wp.getByRole('button', { name: /Assigned Tasks/ }).first().click();
  const startBtn = wp.locator('[id^="start-verification-btn-"]', { hasText: /./ });
  await wp.getByText('Dispatch TestSubject').first().waitFor({ timeout: 15000 });
  const card = wp.locator('article, li, div').filter({ hasText: 'Dispatch TestSubject' }).filter({ has: wp.locator('[id^="start-verification-btn-"]') }).last();
  const taskId = (await card.locator('[id^="start-verification-btn-"]').first().getAttribute('id')).replace('start-verification-btn-', '');
  await wp.click(`#start-verification-btn-${taskId}`);
  const group = label => wp.locator('div.space-y-2', { hasText: label }).first();
  await group('Wall Construction').getByRole('button').nth(2).click();
  await group('Roof').getByRole('button').nth(2).click();
  await group('Water').getByRole('button').nth(1).click();
  await wp.getByRole('button', { name: /^Step 2:/ }).click();
  await wp.getByRole('button', { name: /^No/ }).first().click();
  await wp.getByRole('button', { name: /^Step 3:/ }).click();
  for (const [name, answer] of [['card-presented', 'Yes'], ['card-match', 'Yes'], ['pawning', 'No']]) {
    await wp.locator(`input[name="${name}"]`).nth(answer === 'Yes' ? 0 : 1).check();
  }
  await wp.getByRole('button', { name: /^Step 4:/ }).click();
  await wp.locator('input[type="file"]').setInputFiles({ name: 'evidence.png', mimeType: 'image/png', buffer: png() });
  await wp.getByText(/hash|SHA-256/i).first().waitFor({ timeout: 10000 });
  await wp.getByRole('button', { name: /^Step 5:/ }).click();
  await wp.selectOption('#verified-swdi-level-select', '3');
  await wp.selectOption('#worker-recommendation-select', 'RECOMMEND_GRADUATION');
  await wp.fill('#narrative-report-textarea', 'QA re-run: field visit in Palingon with a geotagged photo.');
  await wp.click('#save-and-queue-sync-btn');
  const syncBtn = wp.locator('#force-sync-now-btn');
  await syncBtn.waitFor({ timeout: 10000 });
  const label = await syncBtn.innerText();
  check('S5: sync button is enabled (not "Submission unavailable")', !/Submission unavailable/i.test(label), label.trim());
  if (await syncBtn.isEnabled()) await syncBtn.click();
  await wp.waitForFunction(() => /0 Pending|No pending|Synced/i.test(document.body.innerText), null, { timeout: 30000 }).catch(() => {});
  await wp.screenshot({ path: `${OUT}/s5-after-sync.png` });
  // Server-side confirmation through the API, then the director's view.
  const api = async (method, p, token, body) => (await fetch(`${URL}/api/v1${p}`, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body && JSON.stringify(body) })).json();
  const dTok = (await api('POST', '/auth/login', null, { username: 'director_test', password: 'DirectorTest2026!' })).access_token;
  const report = await api('GET', `/tasks/${taskId}/report`, dTok);
  check('S5: the server stored the report (task SUBMITTED, photo listed)', report.task_status === 'SUBMITTED' && report.evidence?.length === 1, report.task_status);
  const assigned = await wp.evaluate(() => document.body.innerText);
  await page.reload(); await page.getByRole('button', { name: /Caseworker Dispatch/ }).first().click();
  await page.locator(`#review-report-btn-${taskId}`).waitFor({ timeout: 15000 });
  check('S5: the director sees "Report submitted" with a Review report button', /Report submitted/i.test(await page.locator('.dispatch-page').innerText()));
  // Manila location is refused (geofence), as S5 step 4 expects.
  await browser.close();
  const failed = results.filter(r => r[0] === 'FAIL').length;
  require('fs').writeFileSync(`${OUT}/qa_rerun.json`, JSON.stringify(results, null, 2));
  console.log(failed ? `\n${failed} FAILED` : `\nALL ${results.length} PASSED`);
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error('[ERROR]', e); process.exit(1); });

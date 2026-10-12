/**
 * test_str02_airplane_sync.js
 * Sprint 5 STR-02 (browser): two field reports completed in airplane mode are
 * kept on the device, an edited draft replaces (not duplicates) its earlier
 * save, and on reconnect the PWA syncs both to POST /api/v1/tasks/:id/submit
 * with zero loss: one sealed REPORT_SUBMITTED block per task, the edited
 * content on the server, and the original photo bytes verified.
 *
 * Prerequisites:
 * 1. Stack running; reset_demo.sh, add_int02_case_a_fixture.js, add_dispatch_test.js.
 * 2. Client at CLIENT_URL; MONGO_URI readable from the host; server/node_modules
 *    installed; `npm install playwright-core` on NODE_PATH; Chromium binary.
 *
 * Usage: CLIENT_URL=http://localhost:3000 node data-pipeline/scripts/test_str02_airplane_sync.js
 */
const path = require('path');
const crypto = require('crypto');
const { chromium } = require('playwright-core');
const { MongoClient } = require(path.resolve(__dirname, '../../server/node_modules/mongodb'));

const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';
const BASE_URL = process.env.BASE_URL || 'http://localhost:5000/api/v1';
const MONGO_URI = process.env.MONGO_URI ||
  'mongodb://app_user:AppUserPassword2026!@localhost:27017/kilosunlad?authSource=kilosunlad&directConnection=true';
const CHROMIUM_PATH = process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium';
const HOUSEHOLDS = [
  { id: 'DEMO-4PS-GRAD-0001', latitude: 14.2215, longitude: 121.1875 },
  { id: 'TEST-4PS-DISPATCH-0001', latitude: 14.2120, longitude: 121.1660 }
];
const PNG_1PX = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

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
// A distinct, valid PNG per report (a tEXt chunk changes the bytes, so the hash).
function uniquePng(label) {
  const base = Buffer.from(PNG_1PX, 'base64');
  const data = Buffer.from(`Comment\0${label}`);
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const type = Buffer.from('tEXt');
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([type, data])));
  return Buffer.concat([base.subarray(0, 33), len, type, data, crc, base.subarray(33)]);
}
function crc32(buf) {
  let c, crc = 0xFFFFFFFF;
  for (const byte of buf) { c = (crc ^ byte) & 0xFF; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; crc = (crc >>> 8) ^ c; }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

async function fillReport(page, context, task, household, narrative, photo) {
  await page.getByRole('button', { name: /Assigned Tasks/ }).first().click();
  await page.click(`#start-verification-btn-${task}`);
  const group = label => page.locator('div.space-y-2', { hasText: label }).first();
  await group('Wall Construction').getByRole('button').nth(2).click();
  await group('Roof').getByRole('button').nth(2).click();
  await group('Water').getByRole('button').nth(1).click();
  await page.getByRole('button', { name: /^Step 2:/ }).click();
  await page.getByRole('button', { name: /^No/ }).first().click(); // no motorcycle
  await page.getByRole('button', { name: /^Step 3:/ }).click();
  for (const [name, answer] of [['card-presented', 'Yes'], ['card-match', 'Yes'], ['pawning', 'No']]) {
    await page.locator(`input[name="${name}"]`).nth(answer === 'Yes' ? 0 : 1).check();
  }
  await page.getByRole('button', { name: /^Step 4:/ }).click();
  await context.setGeolocation({ latitude: household.latitude, longitude: household.longitude, accuracy: 6 });
  await page.locator('input[type="file"]').setInputFiles({ name: 'evidence.png', mimeType: 'image/png', buffer: photo });
  await page.getByText(/hash|SHA-256/i).first().waitFor({ timeout: 10000 });
  await page.getByRole('button', { name: /^Step 5:/ }).click();
  await page.selectOption('#verified-swdi-level-select', '3');
  await page.selectOption('#worker-recommendation-select', 'RECOMMEND_GRADUATION');
  await page.fill('#narrative-report-textarea', narrative);
  await page.click('#save-and-queue-sync-btn');
  // Saving opens the Saved Drafts dialog; close it before the next report.
  await page.getByRole('button', { name: 'Close saved drafts' }).click();
}

async function run() {
  console.log('[START] STR-02 Airplane-Mode Sync Test\n');
  const login = async c => (await call('POST', '/auth/login', { body: c })).data;
  const director = await login({ username: 'director_test', password: 'DirectorTest2026!' });
  const worker = await login({ username: 'case_worker_test', password: 'CaseWorkerTest2026!' });
  await call('POST', `/beneficiaries/${HOUSEHOLDS[0].id}/assess`, { token: director.access_token, body: {} });
  const tasks = [];
  for (const h of HOUSEHOLDS) {
    const d = await call('POST', '/tasks/dispatch', { token: director.access_token, body: { household_id: h.id,
      assigned_worker_id: worker.user.user_id, priority: 'HIGH', due_date: new Date(Date.now() + 7 * 86400000).toISOString() } });
    if (d.status !== 201) throw new Error(`dispatch ${h.id}: ${d.status} ${JSON.stringify(d.data)}`);
    tasks.push(d.data.task_id);
  }
  console.log(`[1] Dispatched ${tasks.join(', ')}\n`);

  const photos = [uniquePng('report-1'), uniquePng('report-2'), uniquePng('report-1-edited')];
  const browser = await chromium.launch({ executablePath: CHROMIUM_PATH });
  const client = await MongoClient.connect(MONGO_URI);
  const db = client.db();
  try {
    const context = await browser.newContext({ permissions: ['geolocation'], viewport: { width: 1280, height: 900 } });
    const page = await context.newPage();
    await page.goto(CLIENT_URL);
    await page.fill('#login-username-input', 'case_worker_test');
    await page.fill('#login-password-input', 'CaseWorkerTest2026!');
    await page.click('#login-submit-btn');
    await page.getByRole('button', { name: /Assigned Tasks/ }).first().click();
    await page.locator(`#start-verification-btn-${tasks[1]}`).waitFor();

    console.log('[2] Airplane mode: completing both reports offline...');
    await context.setOffline(true);
    check('browser reports offline', await page.evaluate(() => navigator.onLine === false));
    await fillReport(page, context, tasks[0], HOUSEHOLDS[0], 'STR-02 first draft (to be replaced).', photos[0]);
    await fillReport(page, context, tasks[1], HOUSEHOLDS[1], 'STR-02 second report.', photos[1]);
    console.log('    Editing report 1 before reconnecting...');
    await fillReport(page, context, tasks[0], HOUSEHOLDS[0], 'STR-02 first report, edited offline.', photos[2]);
    const queued = await page.evaluate(() => new Promise(resolve => {
      const open = indexedDB.open('kilosunlad_field');
      open.onsuccess = () => {
        const tx = open.result.transaction('ownedSubmissions', 'readonly').objectStore('ownedSubmissions').getAll();
        tx.onsuccess = () => resolve(tx.result.map(r => ({ task_id: r.task_id, status: r.sync_status, narrative: r.narrative_report })));
      };
    }));
    check('exactly 2 queued drafts on the device (edit replaced, not duplicated)', queued.length === 2, queued);
    check('queued draft holds the edited narrative', queued.find(q => q.task_id === tasks[0])?.narrative === 'STR-02 first report, edited offline.', queued);
    const serverBefore = await db.collection('verification_tasks').find({ task_id: { $in: tasks } }).toArray();
    check('nothing reached the server while offline', serverBefore.every(t => t.task_status === 'PENDING_DISPATCH'),
      serverBefore.map(t => t.task_status));
    console.log('');

    console.log('[3] Reconnecting...');
    await context.setOffline(false);
    const deadline = Date.now() + 20000;
    let submitted = [];
    while (Date.now() < deadline) {
      submitted = await db.collection('verification_tasks').find({ task_id: { $in: tasks }, task_status: 'SUBMITTED' }).toArray();
      if (submitted.length === 2) break;
      await new Promise(r => setTimeout(r, 500));
    }
    check('both reports synced automatically (zero loss)', submitted.length === 2, submitted.map(t => t.task_id));
    const first = submitted.find(t => t.task_id === tasks[0]);
    check('server holds the edited report 1', first?.field_findings?.narrative_report === 'STR-02 first report, edited offline.', first?.field_findings?.narrative_report);
    check('server holds the edited photo hash', first?.field_findings?.evidence_attachments?.[0]?.sha256_hash ===
      crypto.createHash('sha256').update(photos[2]).digest('hex'));
    const blocks = await db.collection('audit_logs').find({ action: 'REPORT_SUBMITTED', 'target_entity.entity_id': { $in: tasks } }).toArray();
    check('exactly one REPORT_SUBMITTED block per task', blocks.length === 2, blocks.map(b => b.target_entity.entity_id));
    check('original photo bytes verified server-side', blocks.every(b => b.state_delta.after.evidence_bytes_verified === true));
    const status = await page.evaluate(() => new Promise(resolve => {
      const open = indexedDB.open('kilosunlad_field');
      open.onsuccess = () => {
        const tx = open.result.transaction('ownedSubmissions', 'readonly').objectStore('ownedSubmissions').getAll();
        tx.onsuccess = () => resolve(tx.result.map(r => r.sync_status));
      };
    }));
    check('device marks both drafts SYNCED', status.length === 2 && status.every(s => s === 'SYNCED'), status);
  } catch (error) {
    if (process.env.FAIL_SCREENSHOT) {
      const open = browser.contexts().flatMap(c => c.pages());
      if (open[0]) await open[0].screenshot({ path: process.env.FAIL_SCREENSHOT, fullPage: true });
    }
    throw error;
  } finally {
    await client.close();
    await browser.close();
  }
  console.log('');
  if (failures) { console.error(`[FAIL] STR-02 TEST FAILED (${failures} check(s))`); process.exit(1); }
  console.log('[SUCCESS] STR-02 TEST PASSED!');
}

run().catch(error => { console.error('\n[FAIL] STR-02 TEST FAILED!\nError:', error.message); process.exit(1); });

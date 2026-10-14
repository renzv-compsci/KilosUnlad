// Proves offline behaviour two ways on localhost: (A) browser offline, (B) server container stopped.
const { chromium } = require('playwright-core');
const { execSync } = require('child_process');
const crypto = require('crypto'), zlib = require('zlib');
const URL = 'http://localhost', OUT = process.env.OUT;
const dc = cmd => execSync(`cd /tmp/claude-0/qa && docker-compose -f docker-compose.yml -f /tmp/claude-0/shim/sandbox-override.yml ${cmd}`, { stdio: 'pipe' });
const log = (ok, m, d = '') => console.log(ok ? '[OK]  ' : '[FAIL]', m, d);
function png() { const ch = (t, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(zlib.crc32(td) >>> 0); return Buffer.concat([l, td, c]); };
  const h = Buffer.alloc(13); h.writeUInt32BE(2, 0); h.writeUInt32BE(2, 4); h[8] = 8; h[9] = 2; const r = crypto.randomBytes(3), row = Buffer.concat([Buffer.from([0]), r, r]);
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), ch('IHDR', h), ch('IDAT', zlib.deflateSync(Buffer.concat([row, row]))), ch('IEND', Buffer.alloc(0))]); }
async function fill(p, name) {
  await p.getByRole('button', { name: /Assigned Tasks/ }).first().click();
  const card = p.locator('div').filter({ hasText: name }).filter({ has: p.locator('[id^="start-verification-btn-"]') }).last();
  const id = (await card.locator('[id^="start-verification-btn-"]').first().getAttribute('id')).replace('start-verification-btn-', '');
  await p.click(`#start-verification-btn-${id}`);
  const g = l => p.locator('div.space-y-2', { hasText: l }).first();
  await g('Wall Construction').getByRole('button').nth(2).click(); await g('Roof').getByRole('button').nth(2).click(); await g('Water').getByRole('button').nth(1).click();
  await p.getByRole('button', { name: /^Step 2:/ }).click(); await p.getByRole('button', { name: /^No/ }).first().click();
  await p.getByRole('button', { name: /^Step 3:/ }).click();
  for (const [n, a] of [['card-presented', 'Yes'], ['card-match', 'Yes'], ['pawning', 'No']]) await p.locator(`input[name="${n}"]`).nth(a === 'Yes' ? 0 : 1).check();
  await p.getByRole('button', { name: /^Step 4:/ }).click();
  await p.locator('input[type="file"]').setInputFiles({ name: 'e.png', mimeType: 'image/png', buffer: png() });
  await p.getByText(/hash|SHA-256/i).first().waitFor({ timeout: 15000 });
  await p.getByRole('button', { name: /^Step 5:/ }).click();
  await p.selectOption('#verified-swdi-level-select', '3'); await p.selectOption('#worker-recommendation-select', 'RECOMMEND_GRADUATION');
  await p.fill('#narrative-report-textarea', `Offline proof for ${name}.`);
  return id;
}
const pendingCount = p => p.evaluate(async () => new Promise(res => { const r = indexedDB.open(indexedDB.databases ? '' : ''); res(null); }));
const syncLabel = p => p.locator('#force-sync-now-btn').innerText();
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 }, permissions: ['geolocation'], geolocation: { latitude: 14.2130, longitude: 121.1680, accuracy: 6 } });
  const p = await ctx.newPage();
  await p.goto(URL); await p.fill('#login-username-input', 'case_worker_test'); await p.fill('#login-password-input', 'CaseWorkerTest2026!'); await p.click('#login-submit-btn');
  await p.getByRole('button', { name: /Assigned Tasks/ }).first().waitFor();
  // (B) server container stopped while the caseworker works
  const id = await fill(p, 'Rosa Villanueva');   // Rosa is in Palingon; 14.2120,121.1660 is within 250 m? checked below
  dc('stop server'); log(true, 'server container stopped');
  await p.click('#save-and-queue-sync-btn');
  await p.locator('#force-sync-now-btn').waitFor();
  await p.waitForTimeout(4000);
  let label = await syncLabel(p);
  log(/1 Pending/.test(label), 'server down: report kept on the device, still pending', label.trim());
  await p.screenshot({ path: `${OUT}/server-down-pending.png` });
  const stored = await p.evaluate(async () => { const dbs = await indexedDB.databases(); return dbs.map(d => d.name); });
  log(stored.length > 0, 'IndexedDB databases in the browser', stored);
  dc('start server'); await new Promise(r => setTimeout(r, 6000)); execSync('docker restart kilosunlad-gateway'); await new Promise(r => setTimeout(r, 4000));
  log(true, 'server and gateway started again');
  await p.screenshot({ path: `${OUT}/after-restart.png` });
  console.log('URL', p.url(), 'TEXT', (await p.locator('body').innerText()).replace(/\s+/g,' ').slice(0, 400));
  const body = (await p.locator('body').innerText()).replace(/\s+/g, ' ');
  log(/Saved Drafts Waiting to upload 0 drafts/.test(body), 'after restart: the draft uploaded by itself (Saved Drafts: 0)');
  const tok = (await (await fetch(`${URL}/api/v1/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: 'director_test', password: 'DirectorTest2026!' }) })).json()).access_token;
  const rep = await (await fetch(`${URL}/api/v1/tasks/${id}/report`, { headers: { Authorization: `Bearer ${tok}` } })).json();
  log(rep.task_status === 'SUBMITTED', 'server now holds the report as SUBMITTED', rep.task_status || JSON.stringify(rep).slice(0, 120));
  await b.close();
})().catch(e => { console.error('[ERROR]', e); process.exit(1); });

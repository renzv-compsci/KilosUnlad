/**
 * test_decision011_notice_flow.js
 * DECISION-011 end to end on the Docker stack: flag -> dispatch -> field report with a
 * real photo -> director reviews the report and its hash-verified photo in the browser
 * -> issues the Notice of Ineligibility -> graduation refused while the 15-day window is
 * open -> (window moved back in the test data) -> graduation completed in the browser.
 * Also proves that a photo altered on disk is refused, and that the ledger verifies.
 *
 * Routes: GET /tasks/:id/report, GET /evidence/:sha256, POST /tasks/:id/resolve,
 *         POST /beneficiaries/:id/graduate (docs/contracts/admin-web/admin-*.json)
 *
 * Prerequisites: stack running; reset_demo.sh then add_int02_case_a_fixture.js
 * (Case A in Real, worker covers Real). Node 22+ (fetch, FormData, zlib.crc32),
 * playwright-core on NODE_PATH, Chromium.
 * Usage: CLIENT_URL=http://localhost node data-pipeline/scripts/test_decision011_notice_flow.js
 */
const { execFileSync } = require('child_process');
const crypto = require('crypto');
const zlib = require('zlib');
const { chromium } = require('playwright-core');

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000/api/v1';
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';
const CHROMIUM_PATH = process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium';
const SERVER_CONTAINER = process.env.SERVER_CONTAINER || 'kilosunlad-server';
const DB_CONTAINER = process.env.DB_CONTAINER || 'kilosunlad-db';
const ADMIN_URI = 'mongodb://admin_user:RootAdminSecret2026!@localhost:27017/kilosunlad?authSource=admin';
const HOUSEHOLD = 'DEMO-4PS-GRAD-0001';
const DAY = 86400000;

let failures = 0;
function check(label, condition, detail) {
  if (condition) console.log(`   [OK]   ${label}`);
  else { failures++; console.error(`   [FAIL] ${label}`, detail === undefined ? '' : JSON.stringify(detail).slice(0, 500)); }
}
async function call(method, p, { token, body, form } = {}) {
  const res = await fetch(`${BASE_URL}${p}`, { method, headers: { ...(form ? {} : { 'Content-Type': 'application/json' }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: form ?? (body === undefined ? undefined : JSON.stringify(body)) });
  const raw = Buffer.from(await res.arrayBuffer());
  let data = null; try { data = JSON.parse(raw.toString()); } catch { /* binary */ }
  return { status: res.status, data, raw, headers: res.headers };
}
const login = async (u, p) => (await call('POST', '/auth/login', { body: { username: u, password: p } })).data;

// A real, unique 2x2 PNG so each run stores a new content-addressed photo.
function pngPhoto() {
  const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type), data]); const crc = Buffer.alloc(4); crc.writeUInt32BE(zlib.crc32(td) >>> 0);
    return Buffer.concat([len, td, crc]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(2, 0); ihdr.writeUInt32BE(2, 4); ihdr[8] = 8; ihdr[9] = 2;
  const rgb = crypto.randomBytes(3);
  const row = Buffer.concat([Buffer.from([0]), rgb, rgb]);
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(Buffer.concat([row, row]))), chunk('IEND', Buffer.alloc(0))]);
}
const sh = (container, cmd) => execFileSync('docker', ['exec', container, 'sh', '-c', cmd], { encoding: 'utf8' });

(async () => {
  console.log('[START] DECISION-011 notice issuance and graduation (API + browser)\n');
  const director = await login('director_test', 'DirectorTest2026!');
  const worker = await login('case_worker_test', 'CaseWorkerTest2026!');
  const auditor = await login('auditor_test', 'AuditorTest2026!');
  const t = { director: director.access_token, worker: worker.access_token, auditor: auditor.access_token };

  console.log('[1] Flag, dispatch, field report with a real photo...');
  const assessed = await call('POST', `/beneficiaries/${HOUSEHOLD}/assess`, { token: t.director, body: {} });
  check('Case A flagged by the model', assessed.status === 200 && assessed.data.program_status === 'FLAGGED_FOR_REVIEW', assessed.data);
  const dispatched = await call('POST', '/tasks/dispatch', { token: t.director, body: { household_id: HOUSEHOLD,
    assigned_worker_id: worker.user.user_id, assignment_notes: 'DECISION-011 flow', priority: 'HIGH',
    due_date: new Date(Date.now() + 7 * DAY).toISOString() } });
  check('dispatched', dispatched.status === 201, dispatched.data);
  const taskId = dispatched.data.task_id;
  const photo = pngPhoto();
  const hash = crypto.createHash('sha256').update(photo).digest('hex');
  const now = new Date().toISOString();
  const form = new FormData();
  for (const [k, v] of Object.entries({ task_id: taskId, household_id: HOUSEHOLD, verified_swdi_level: '3',
    worker_recommendation: 'RECOMMEND_GRADUATION', narrative_report: 'Private sedan and a household business; utility use above lifeline.',
    livelihood_asset_verification: JSON.stringify({ is_motorcycle_present: false, is_productive_asset: false, proof_type: 'NONE', franchise_number: '' }),
    landbank_card_inspection: JSON.stringify({ physical_card_presented: true, card_matches_beneficiary: true, pawning_suspected: false }),
    client_geolocation: JSON.stringify({ latitude: 14.2215, longitude: 121.1875, accuracy_meters: 9, captured_at: now }),
    evidence_attachments: JSON.stringify([{ media_type: 'image/png', storage_url: `${BASE_URL}/evidence/${hash}`, sha256_hash: hash,
      exif_metadata: { timestamp: now, latitude: 14.2215, longitude: 121.1875 } }]) })) form.append(k, v);
  form.append('evidence_files', new Blob([photo], { type: 'image/png' }), 'evidence.png');
  const submitted = await call('POST', `/tasks/${taskId}/submit`, { token: t.worker, form });
  check('field report accepted (SUBMITTED)', submitted.status === 200 || submitted.status === 201, submitted.data);
  console.log('');

  console.log('[2] Review report and evidence (API)...');
  const report = await call('GET', `/tasks/${taskId}/report`, { token: t.director });
  check('report: submitted, supports graduation, lists the photo', report.status === 200 && report.data.task_status === 'SUBMITTED' &&
    report.data.graduation_supported === true && report.data.evidence[0]?.sha256_hash === hash, report.data);
  const file = await call('GET', `/evidence/${hash}`, { token: t.director });
  check('evidence: original bytes with verified hash header', file.status === 200 && file.raw.equals(photo) &&
    file.headers.get('x-content-sha256') === hash && file.headers.get('content-type') === 'image/png', file.status);
  check('COA can view the photo; caseworker cannot', (await call('GET', `/evidence/${hash}`, { token: t.auditor })).status === 200 &&
    (await call('GET', `/evidence/${hash}`, { token: t.worker })).status === 403);
  const stored = `/app/uploads/evidence/${hash}`;
  sh(SERVER_CONTAINER, `cp ${stored} ${stored}.bak && printf X >> ${stored}`);
  const tampered = await call('GET', `/evidence/${hash}`, { token: t.director });
  check('a photo altered on disk is refused (409 EVIDENCE_INTEGRITY_FAILED)', tampered.status === 409 &&
    tampered.data?.error?.code === 'EVIDENCE_INTEGRITY_FAILED', tampered.data);
  sh(SERVER_CONTAINER, `mv ${stored}.bak ${stored}`);
  check('restored photo is served again', (await call('GET', `/evidence/${hash}`, { token: t.director })).status === 200);
  console.log('');

  console.log('[3] Browser: review the report, see the photo, issue the notice...');
  const browser = await chromium.launch({ executablePath: CHROMIUM_PATH });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto(CLIENT_URL);
    await page.fill('#login-username-input', 'director_test');
    await page.fill('#login-password-input', 'DirectorTest2026!');
    await page.click('#login-submit-btn');
    await page.getByRole('button', { name: /Caseworker Dispatch/ }).first().click();
    await page.locator(`#review-report-btn-${taskId}`).click();
    const img = page.locator('.evidence-photo img').first();
    await img.waitFor({ timeout: 15000 });
    check('photo shown in the report (hash verified)', await img.evaluate(el => el.complete && el.naturalWidth > 0) &&
      (await page.locator('.evidence-photo figcaption').first().innerText()).includes('Hash verified'));
    await page.fill('#notice-grounds', 'Field visit confirmed Level 3: private sedan and a household business.');
    await page.click('#issue-notice-btn');
    await page.getByText('Notice of Ineligibility issued').waitFor({ timeout: 15000 });
    check('notice issued from the UI with a ledger receipt', /Ledger block #\d+/.test(await page.locator('.report-dialog').innerText()));
    await page.screenshot({ path: process.env.SCREENSHOT || '/tmp/decision011-review.png' });

    const after = await call('GET', `/tasks/${taskId}/report`, { token: t.director });
    check('task VERIFIED_GRADUATE, household under notice', after.data.task_status === 'VERIFIED_GRADUATE' &&
      after.data.household_status === 'NOTICE_OF_INELIGIBILITY' && after.data.admin_resolution?.decision === 'APPROVED_GRADUATION', after.data);
    const docket = await call('GET', '/appeals/docket', { token: t.director });
    const item = docket.data.items.find(i => i.household_id === HOUSEHOLD);
    check('household appears on the due-process docket with a 15-day window', item &&
      Date.parse(item.notice_expiry_date) - Date.parse(item.notice_date) === 15 * DAY, item);
    const early = await call('POST', `/beneficiaries/${HOUSEHOLD}/graduate`, { token: t.director, body: {} });
    check('graduation refused while the window is open (409 APPEAL_WINDOW_OPEN)', early.status === 409 &&
      early.data?.error?.code === 'APPEAL_WINDOW_OPEN', early.data);
    console.log('');

    console.log('[4] Window elapsed (test data moved back 16 days), graduation in the browser...');
    sh(DB_CONTAINER, `mongosh "${ADMIN_URI}" --quiet --eval 'db.verification_tasks.updateOne({task_id:"${taskId}"},` +
      `{$set:{"admin_resolution.finalized_at":new Date(Date.now()-16*864e5)}})'`);
    await page.getByRole('button', { name: 'Close report' }).click();
    await page.getByRole('button', { name: /15-Day Due Process/ }).first().click();
    const button = page.locator(`#graduate-btn-${HOUSEHOLD}`);
    await button.waitFor({ timeout: 15000 });
    await button.click();
    await page.getByText(/graduated: the appeal window ended with no appeal/).waitFor({ timeout: 15000 });
    check('graduation completed from the UI', true);
    const triage = await call('GET', `/beneficiaries/triage-queue?status=GRADUATED&limit=10`, { token: t.director });
    check('household is GRADUATED', triage.data.items.some(i => i.household_id === HOUSEHOLD), triage.data.items?.map(i => i.household_id));
  } finally { await browser.close(); }

  const blocks = await call('GET', '/audit/blocks?limit=3', { token: t.auditor });
  const head = blocks.data.items[0].sequence_index;
  check('last two ledger blocks are BENEFICIARY_GRADUATED (notice, then graduation)',
    blocks.data.items.slice(0, 2).every(b => b.action === 'BENEFICIARY_GRADUATED'), blocks.data.items.map(b => b.action));
  const chain = await call('GET', `/audit/verify-chain?start_sequence=1&end_sequence=${head}`, { token: t.auditor });
  check(`whole ledger verifies (1-${head})`, chain.data?.is_chain_valid === true, chain.data);

  if (failures) { console.error(`\n[FAILED] ${failures} check(s) failed.`); process.exit(1); }
  console.log('\n[SUCCESS] Notice issuance, evidence integrity and graduation verified.');
})().catch(error => { console.error('[ERROR]', error); process.exit(1); });

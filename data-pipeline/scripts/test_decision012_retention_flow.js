/**
 * test_decision012_retention_flow.js
 * DECISION-012 end to end on the Docker stack:
 *  A. Retention: flag Case A -> dispatch -> field report recommending RETAIN (Level 2)
 *     -> director keeps the household in the browser -> ACTIVE_COMPLIANT, task
 *     VERIFIED_RETAIN, sealed BENEFICIARY_RETAINED -> the model refuses to re-flag it
 *     (409 RETENTION_COOLDOWN).
 *  B. Appeal granted in the browser: TEST-4PS-NOTICE-0001 files an appeal (hearing today)
 *     -> director records "Granted" on the Due Process screen -> ACTIVE_COMPLIANT.
 *  C. Appeal denied (API): TEST-4PS-0003's report -> notice -> appeal -> "Denied"
 *     -> GRADUATED, sealed BENEFICIARY_GRADUATED; refusals for the wrong role, an unknown
 *     docket and a second decision. Then a whole-ledger verification.
 *
 * Routes: POST /tasks/:task_id/retain, POST /appeals/:appeal_docket_id/decide
 *         (docs/contracts/admin-web/admin-retention.json, admin-appeal-decision.json)
 *
 * Prerequisites: stack running; reset_demo.sh then add_int02_case_a_fixture.js and
 * add_int03_notice_fixture.js. Node 22+, playwright-core on NODE_PATH, Chromium.
 * Usage: CLIENT_URL=http://localhost node data-pipeline/scripts/test_decision012_retention_flow.js
 */
const crypto = require('crypto');
const zlib = require('zlib');
const { chromium } = require('playwright-core');

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000/api/v1';
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';
const CHROMIUM_PATH = process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium';
const CASE_A = 'DEMO-4PS-GRAD-0001';
const NOTICE_HH = 'TEST-4PS-NOTICE-0001';
const DENY_HH = 'TEST-4PS-0003';
const DENY_TASK = 'TEST-TSK-0002';
const DAY = 86400000;
const manilaToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila',
  year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());

let failures = 0;
function check(label, condition, detail) {
  if (condition) console.log(`   [OK]   ${label}`);
  else { failures++; console.error(`   [FAIL] ${label}`, detail === undefined ? '' : JSON.stringify(detail).slice(0, 500)); }
}
async function call(method, p, { token, body, form } = {}) {
  const res = await fetch(`${BASE_URL}${p}`, { method, headers: { ...(form ? {} : { 'Content-Type': 'application/json' }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: form ?? (body === undefined ? undefined : JSON.stringify(body)) });
  let data = null; try { data = await res.json(); } catch { /* empty */ }
  return { status: res.status, data };
}
const login = async (u, p) => (await call('POST', '/auth/login', { body: { username: u, password: p } })).data;
const code = r => r.data?.error?.code;

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
const fileAppeal = (token, householdId, docket, hearingDate = manilaToday()) => call('POST', '/appeals/docket', { token, body: {
  household_id: householdId, appeal_docket_id: docket, hearing_date: hearingDate,
  appeal_grounds: 'The family disputes the findings and asks for a hearing.' } });

(async () => {
  console.log('[START] DECISION-012 retention and appeal outcomes (API + browser)\n');
  const director = await login('director_test', 'DirectorTest2026!');
  const worker = await login('case_worker_test', 'CaseWorkerTest2026!');
  const auditor = await login('auditor_test', 'AuditorTest2026!');
  const t = { director: director.access_token, worker: worker.access_token, auditor: auditor.access_token };
  const suffix = Date.now().toString(36).toUpperCase();

  console.log('[A1] Flag, dispatch, field report recommending retention...');
  const assessed = await call('POST', `/beneficiaries/${CASE_A}/assess`, { token: t.director, body: {} });
  check('Case A flagged by the model', assessed.status === 200 && assessed.data.program_status === 'FLAGGED_FOR_REVIEW', assessed.data);
  const dispatched = await call('POST', '/tasks/dispatch', { token: t.director, body: { household_id: CASE_A,
    assigned_worker_id: worker.user.user_id, assignment_notes: 'DECISION-012 flow', priority: 'HIGH',
    due_date: new Date(Date.now() + 7 * DAY).toISOString() } });
  check('dispatched', dispatched.status === 201, dispatched.data);
  const taskId = dispatched.data.task_id;
  const photo = pngPhoto();
  const hash = crypto.createHash('sha256').update(photo).digest('hex');
  const now = new Date().toISOString();
  const form = new FormData();
  for (const [k, v] of Object.entries({ task_id: taskId, household_id: CASE_A, verified_swdi_level: '2',
    worker_recommendation: 'RETAIN', narrative_report: 'The sedan belongs to a relative abroad; income is irregular and below threshold.',
    livelihood_asset_verification: JSON.stringify({ is_motorcycle_present: false, is_productive_asset: false, proof_type: 'NONE', franchise_number: '' }),
    landbank_card_inspection: JSON.stringify({ physical_card_presented: true, card_matches_beneficiary: true, pawning_suspected: false }),
    client_geolocation: JSON.stringify({ latitude: 14.2215, longitude: 121.1875, accuracy_meters: 9, captured_at: now }),
    evidence_attachments: JSON.stringify([{ media_type: 'image/png', storage_url: `${BASE_URL}/evidence/${hash}`, sha256_hash: hash,
      exif_metadata: { timestamp: now, latitude: 14.2215, longitude: 121.1875 } }]) })) form.append(k, v);
  form.append('evidence_files', new Blob([photo], { type: 'image/png' }), 'evidence.png');
  const submitted = await call('POST', `/tasks/${taskId}/submit`, { token: t.worker, form });
  check('field report accepted (SUBMITTED)', submitted.status === 200 || submitted.status === 201, submitted.data);
  const report = await call('GET', `/tasks/${taskId}/report`, { token: t.director });
  check('report supports retention, not graduation', report.data?.retention_supported === true &&
    report.data?.graduation_supported === false, report.data);
  const notAllowed = await call('POST', `/tasks/${taskId}/retain`, { token: t.auditor, body: { admin_notes: 'COA cannot decide this.' } });
  check('COA auditor cannot retain (403)', notAllowed.status === 403, notAllowed.data);
  console.log('');

  const browser = await chromium.launch({ executablePath: CHROMIUM_PATH });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto(CLIENT_URL);
    await page.fill('#login-username-input', 'director_test');
    await page.fill('#login-password-input', 'DirectorTest2026!');
    await page.click('#login-submit-btn');

    console.log('[A2] Browser: review the report and keep the household on the program...');
    await page.getByRole('button', { name: /Caseworker Dispatch/ }).first().click();
    await page.locator(`#review-report-btn-${taskId}`).click();
    await page.locator('#retain-household-btn').waitFor({ timeout: 15000 });
    check('only "Keep on the program" is offered for this report', await page.locator('#issue-notice-btn').count() === 0);
    await page.fill('#notice-grounds', 'Field visit confirmed Level 2: the sedan belongs to a relative abroad; income below threshold.');
    await page.click('#retain-household-btn');
    await page.getByText('Household kept on the program').waitFor({ timeout: 15000 });
    check('retention recorded from the UI with a ledger receipt', /Ledger block #\d+/.test(await page.locator('.report-dialog').innerText()));
    await page.screenshot({ path: process.env.SCREENSHOT || '/tmp/decision012-retain.png' });
    await page.getByRole('button', { name: 'Close report' }).click();

    const after = await call('GET', `/tasks/${taskId}/report`, { token: t.director });
    check('task VERIFIED_RETAIN, household ACTIVE_COMPLIANT, decision RETAINED_ON_ROSTER', after.data.task_status === 'VERIFIED_RETAIN' &&
      after.data.household_status === 'ACTIVE_COMPLIANT' && after.data.admin_resolution?.decision === 'RETAINED_ON_ROSTER', after.data);
    const reflag = await call('POST', `/beneficiaries/${CASE_A}/assess`, { token: t.director, body: {} });
    check('the model cannot re-flag it during the cooldown (409 RETENTION_COOLDOWN)', reflag.status === 409 &&
      code(reflag) === 'RETENTION_COOLDOWN', reflag.data);
    console.log('');

    console.log('[B] Browser: record a granted appeal on the Due Process screen...');
    const grantDocket = `APP-D12-G-${suffix}`;
    const filed = await fileAppeal(t.director, NOTICE_HH, grantDocket);
    check('appeal filed with today as the hearing date', filed.status === 201, filed.data);
    await page.getByRole('button', { name: /15-Day Due Process/ }).first().click();
    const outcomeBtn = page.locator(`#hearing-outcome-btn-${NOTICE_HH}`);
    await outcomeBtn.waitFor({ timeout: 15000 });
    await outcomeBtn.click();
    await page.check('#outcome-granted');
    await page.fill('#hearing-notes', 'Hearing found the notice grounds unproven; the household stays eligible.');
    await page.click('#record-outcome-btn');
    await page.getByText(new RegExp(`Appeal ${grantDocket} granted`)).waitFor({ timeout: 15000 });
    check('granted outcome recorded from the UI', true);
    const docket = await call('GET', '/appeals/docket', { token: t.director });
    check('the household left the due-process docket', !docket.data.items.some(i => i.household_id === NOTICE_HH), docket.data.items?.map(i => i.household_id));
    const active = await call('GET', `/beneficiaries/triage-queue?status=ACTIVE_COMPLIANT&barangay=Palingon&limit=100`, { token: t.director });
    check('household is ACTIVE_COMPLIANT again', active.status === 200 && active.data.items.some(i => i.household_id === NOTICE_HH),
      active.status === 200 ? active.data.items.map(i => i.household_id) : active.data);
    await page.screenshot({ path: (process.env.SCREENSHOT || '/tmp/decision012-retain.png').replace(/\.png$/, '-appeal.png') });
  } finally { await browser.close(); }
  console.log('');

  console.log('[C] API: a denied appeal completes the graduation...');
  const notice = await call('POST', `/tasks/${DENY_TASK}/resolve`, { token: t.director, body: { decision: 'APPROVED_GRADUATION',
    admin_notes: 'Field visit confirmed Level 3: owned vehicle and steady remittances.' } });
  check('notice issued for TEST-4PS-0003', notice.status === 200 && notice.data.household_status === 'NOTICE_OF_INELIGIBILITY', notice.data);
  const denyDocket = `APP-D12-D-${suffix}`;
  const filedDeny = await fileAppeal(t.director, DENY_HH, denyDocket);
  check('appeal filed with today as the hearing date', filedDeny.status === 201, filedDeny.data);
  const body = { outcome: 'DENIED', decision_notes: 'Hearing upheld the notice grounds: vehicle and remittances confirmed.' };
  const coa = await call('POST', `/appeals/${denyDocket}/decide`, { token: t.auditor, body });
  check('COA auditor cannot record an outcome (403)', coa.status === 403, coa.data);
  const missing = await call('POST', `/appeals/APP-D12-NOPE-${suffix}/decide`, { token: t.director, body });
  check('unknown docket reference (404 APPEAL_NOT_FOUND)', missing.status === 404 && code(missing) === 'APPEAL_NOT_FOUND', missing.data);
  const denied = await call('POST', `/appeals/${denyDocket}/decide`, { token: t.director, body });
  check('denied: household GRADUATED, no cooldown', denied.status === 200 && denied.data.household_status === 'GRADUATED' &&
    denied.data.reassessment_allowed_from === null, denied.data);
  const twice = await call('POST', `/appeals/${denyDocket}/decide`, { token: t.director, body });
  check('the same appeal cannot be decided twice (409 WORKFLOW_CONFLICT)', twice.status === 409 && code(twice) === 'WORKFLOW_CONFLICT', twice.data);
  console.log('');

  const blocks = await call('GET', '/audit/blocks?limit=8', { token: t.auditor });
  const actions = blocks.data.items.map(b => b.action);
  check('ledger: retention and granted appeal sealed as BENEFICIARY_RETAINED, denial as BENEFICIARY_GRADUATED',
    actions.filter(a => a === 'BENEFICIARY_RETAINED').length >= 2 && actions[0] === 'BENEFICIARY_GRADUATED', actions);
  const head = blocks.data.items[0].sequence_index;
  const chain = await call('GET', `/audit/verify-chain?start_sequence=1&end_sequence=${head}`, { token: t.auditor });
  check(`whole ledger verifies (1-${head})`, chain.data?.is_chain_valid === true, chain.data);

  if (failures) { console.error(`\n[FAILED] ${failures} check(s) failed.`); process.exit(1); }
  console.log('\n[SUCCESS] Retention, granted appeal and denied appeal verified.');
})().catch(error => { console.error('[ERROR]', error); process.exit(1); });

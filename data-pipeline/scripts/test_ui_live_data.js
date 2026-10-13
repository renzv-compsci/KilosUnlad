/**
 * test_ui_live_data.js
 * UI live data (DECISION-010): the screens that used sample data now read the
 * read-only routes below. API checks against the frozen contracts, then a real
 * browser walk through every persona at phone, tablet and desktop widths.
 *
 *   GET /api/v1/insights/overview   (admin-insights-overview.json)
 *   GET /api/v1/tasks               (admin-task-list.json)
 *   GET /api/v1/users/caseworkers   (admin-caseworker-directory.json)
 *   GET /api/v1/audit/blocks        (audit-block-list.json)
 *   GET /api/v1/system/policy       (admin-policy.json)
 *
 * Prerequisites:
 * 1. Stack running; reset_demo.sh, then add_dispatch_test.js (one flagged
 *    Palingon household with no task). The script dispatches it itself.
 * 2. Client at CLIENT_URL; `npm install playwright-core` on NODE_PATH; Chromium.
 *
 * Usage: CLIENT_URL=http://localhost node data-pipeline/scripts/test_ui_live_data.js
 * Optional: SCREENSHOT_DIR=<folder> saves one PNG per persona and width.
 */
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright-core');

const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';
const BASE_URL = process.env.BASE_URL || 'http://localhost:5000/api/v1';
const CHROMIUM_PATH = process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium';
const SCREENSHOT_DIR = process.env.SCREENSHOT_DIR;
const HOUSEHOLD = 'TEST-4PS-DISPATCH-0001';
const ACCOUNTS = {
  admin: ['super_admin_test', 'SuperAdminTest2026!'], director: ['director_test', 'DirectorTest2026!'],
  worker: ['case_worker_test', 'CaseWorkerTest2026!'], auditor: ['auditor_test', 'AuditorTest2026!'],
};
const contract = name => require(path.resolve(__dirname, `../../docs/contracts/admin-web/${name}.json`)).response.data;
const keys = value => JSON.stringify(Object.keys(value || {}).sort());

let failures = 0;
function check(label, condition, detail) {
  if (condition) console.log(`   [OK]   ${label}`);
  else { failures++; console.error(`   [FAIL] ${label}`, detail === undefined ? '' : JSON.stringify(detail).slice(0, 600)); }
}
async function call(method, p, { token, body } = {}) {
  const res = await fetch(`${BASE_URL}${p}`, { method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body) });
  return { status: res.status, data: await res.json().catch(() => null), cache: res.headers.get('cache-control') };
}
const login = async ([username, password]) => {
  const r = await call('POST', '/auth/login', { body: { username, password } });
  return { token: r.data?.access_token, user: r.data?.user };
};
const code = r => r.data?.error?.code;

async function api(t) {
  console.log('[1] GET /insights/overview...');
  const d = await call('GET', '/insights/overview', { token: t.director.token });
  check('director 200 with no-store', d.status === 200 && d.cache === 'no-store', d);
  check('keys match admin-insights-overview.json', keys(d.data) === keys(contract('admin-insights-overview')), Object.keys(d.data || {}));
  const triage = await call('GET', '/beneficiaries/triage-queue?limit=1', { token: t.director.token });
  const s = triage.data?.summary_metrics;
  check('flagged count equals the triage feed (same scope)', d.data?.risk?.high_risk === s?.high_risk_count, [d.data?.risk?.high_risk, s]);
  check('investigation and notice counts equal the triage feed',
    d.data?.households?.by_status?.UNDER_INVESTIGATION === s?.under_investigation_count &&
    d.data?.due_process?.notices === s?.notice_of_ineligibility_count, [d.data?.households?.by_status, s]);
  check('critical + high = flagged; flagged + below = total', d.data.risk.critical + d.data.risk.high === d.data.risk.high_risk &&
    d.data.risk.high_risk + d.data.risk.below_threshold === d.data.households.total, d.data.risk);
  const j = t.director.user?.jurisdiction;
  check('director sees only their municipality', d.data.municipalities.every(m => m.municipality === j?.municipality && m.province === j?.province),
    d.data.municipalities.map(m => m.municipality));
  check('director gets no ledger statistics', d.data.audit === null);
  const c = await call('GET', '/insights/overview', { token: t.auditor.token });
  check('COA sees national scope (>= director total) with ledger statistics',
    c.status === 200 && c.data.households.total >= d.data.households.total && Number.isSafeInteger(c.data.audit?.total_blocks), c.data?.audit);
  check('worker 403', (await call('GET', '/insights/overview', { token: t.worker.token })).status === 403);
  check('no token 401', (await call('GET', '/insights/overview')).status === 401);
  const q = await call('GET', '/insights/overview?municipality=Calamba', { token: t.director.token });
  check('any query parameter -> 400 INVALID_QUERY', q.status === 400 && code(q) === 'INVALID_QUERY', q);
  console.log('');

  console.log('[2] GET /users/caseworkers + a real dispatch, then GET /tasks...');
  const cw = await call('GET', '/users/caseworkers', { token: t.director.token });
  check('director 200; item keys match contract', cw.status === 200 && keys(cw.data.items[0]) === keys(contract('admin-caseworker-directory').items[0]), cw.data);
  const worker = cw.data.items.find(i => i.username === 'case_worker_test');
  check('case_worker_test listed with the director\'s barangays', worker && worker.jurisdiction.municipality === j?.municipality, cw.data.items);
  check('no credentials in the directory', !JSON.stringify(cw.data).includes('password'));
  check('COA 403', (await call('GET', '/users/caseworkers', { token: t.auditor.token })).status === 403);
  const dispatched = await call('POST', '/tasks/dispatch', { token: t.director.token, body: { household_id: HOUSEHOLD,
    assigned_worker_id: worker?.user_id, assignment_notes: 'UI live-data check', priority: 'HIGH',
    due_date: new Date(Date.now() + 7 * 86400000).toISOString() } });
  check('dispatch to the picked caseworker -> 201', dispatched.status === 201, dispatched);
  const list = await call('GET', '/tasks?limit=100', { token: t.director.token });
  check('GET /tasks 200; keys match admin-task-list.json', list.status === 200 && keys(list.data) === keys(contract('admin-task-list')) &&
    keys(list.data.items[0]) === keys(contract('admin-task-list').items[0]), list.data);
  const task = list.data.items.find(i => i.task_id === dispatched.data?.task_id);
  check('new task listed with the worker name and PENDING_DISPATCH', task?.assigned_worker?.user_id === worker?.user_id &&
    task?.task_status === 'PENDING_DISPATCH', task);
  check('newest dispatch first', list.data.items[0]?.task_id === dispatched.data?.task_id, list.data.items.map(i => i.task_id));
  check('every task is inside the director scope', list.data.items.every(i => i.address.municipality === j?.municipality &&
    j.assigned_barangays.includes(i.address.barangay)));
  const f = await call('GET', '/tasks?status=VERIFIED_RETAIN', { token: t.director.token });
  check('status filter applies', f.status === 200 && f.data.items.every(i => i.task_status === 'VERIFIED_RETAIN'));
  for (const bad of ['status=NOPE', 'limit=101', 'page=0', 'household_id=x']) {
    const r = await call('GET', `/tasks?${bad}`, { token: t.director.token });
    check(`/tasks?${bad} -> 400`, r.status === 400 && code(r) === 'INVALID_QUERY', r);
  }
  check('COA and worker 403 on /tasks', (await call('GET', '/tasks', { token: t.auditor.token })).status === 403 &&
    (await call('GET', '/tasks', { token: t.worker.token })).status === 403);
  const after = await call('GET', '/insights/overview', { token: t.director.token });
  check('overview task total includes the new dispatch', after.data.tasks.total === list.data.pagination.total_records &&
    after.data.tasks.workers.some(w => w.user_id === worker?.user_id && w.open >= 1), after.data.tasks);
  console.log('');

  console.log('[3] GET /audit/blocks...');
  const b = await call('GET', '/audit/blocks?limit=5', { token: t.auditor.token });
  check('COA 200; keys match audit-block-list.json', b.status === 200 && keys(b.data) === keys(contract('audit-block-list')) &&
    keys(b.data.items[0]) === keys(contract('audit-block-list').items[0]), b.data);
  check('newest first and the dispatch block is on top', b.data.items[0]?.action === 'TASK_DISPATCHED' &&
    b.data.items.every((x, i, a) => i === 0 || a[i - 1].sequence_index > x.sequence_index), b.data.items.map(x => [x.sequence_index, x.action]));
  check('no state deltas exposed', !JSON.stringify(b.data).includes('state_delta'));
  if (b.data.next_before) {
    const next = await call('GET', `/audit/blocks?limit=5&before=${b.data.next_before}`, { token: t.auditor.token });
    check('next page continues below next_before', next.data.items.every(x => x.sequence_index < b.data.next_before));
  }
  check('director 403', (await call('GET', '/audit/blocks', { token: t.director.token })).status === 403);
  check('before=0 -> 400', (await call('GET', '/audit/blocks?before=0', { token: t.auditor.token })).status === 400);
  console.log('');

  console.log('[4] GET /system/policy...');
  const p = await call('GET', '/system/policy', { token: t.director.token });
  check('200; keys match admin-policy.json', p.status === 200 && keys(p.data) === keys(contract('admin-policy')), p.data);
  check('enforced values: threshold 70, geofence 250 m, 15-day appeal window', p.data.risk_score.flag_threshold === 70 &&
    p.data.field_verification.geofence_radius_m === 250 && p.data.due_process.appeal_window_days === 15, p.data);
  check('worker 403', (await call('GET', '/system/policy', { token: t.worker.token })).status === 403);
  console.log('');
  return { overview: after.data, coa: c.data, tasks: list.data, blocks: b.data, policy: p.data };
}

async function browserChecks(t, facts) {
  console.log('[5] Browser: every persona at phone, tablet and desktop width...');
  const browser = await chromium.launch({ executablePath: CHROMIUM_PATH });
  if (SCREENSHOT_DIR) fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  const widths = [['phone', 390, 844], ['tablet', 834, 1112], ['desktop', 1440, 900]];
  const nav = async (page, name) => {
    await page.waitForTimeout(400); // let a closing sidebar finish its 320 ms slide on phones
    const link = page.getByRole('button', { name }).first();
    const open = page.getByRole('button', { name: 'Open navigation' });
    // The app shell is loaded (session() waits for it); on narrow screens the sidebar starts closed.
    if (!(await link.isVisible().catch(() => false)) && await open.isVisible().catch(() => false)) await open.click();
    await link.click();
  };
  const noOverflow = async (page, label) => {
    const o = await page.evaluate(() => ({ doc: document.documentElement.scrollWidth, view: window.innerWidth }));
    check(`${label}: no horizontal page scroll`, o.doc <= o.view + 1, o);
  };
  const shot = async (page, name) => { if (SCREENSHOT_DIR) await page.screenshot({ path: path.join(SCREENSHOT_DIR, `${name}.png`), fullPage: true }); };
  try {
    for (const [size, width, height] of widths) {
      const session = async ([username, password]) => {
        const context = await browser.newContext({ viewport: { width, height } });
        const page = await context.newPage();
        await page.goto(CLIENT_URL);
        await page.fill('#login-username-input', username);
        await page.fill('#login-password-input', password);
        await page.click('#login-submit-btn');
        await page.locator('.app-sidebar').waitFor({ state: 'attached', timeout: 15000 });
        return { context, page };
      };
      // Login page itself.
      { const c = await browser.newContext({ viewport: { width, height } }); const lp = await c.newPage();
        await lp.goto(CLIENT_URL); await lp.locator('#login-username-input').waitFor();
        await noOverflow(lp, `${size} login`); await c.close(); }
      // Director: dashboard, dispatch, policy.
      let { context, page } = await session(ACCOUNTS.director);
      await page.locator('#metric-flagged-review .metric-value').waitFor({ timeout: 15000 });
      const flagged = (await page.locator('#metric-flagged-review .metric-value').innerText()).replace(/,/g, '');
      check(`${size} director dashboard: flagged card = API (${facts.overview.risk.high_risk})`, Number(flagged) === facts.overview.risk.high_risk, flagged);
      const body = await page.locator('main, body').first().innerText();
      check(`${size} director dashboard: no sample labels or invented figures`, !/Sample data|Sample advisory|4,850|Municipal Link #ML-/.test(body));
      check(`${size} director dashboard: map/matrix lists the scoped municipality`, (await page.locator('.geography-section').count()) === 1 &&
        (await page.locator('.geography-section').innerText()).includes(facts.overview.municipalities[0]?.municipality ?? '?'));
      await noOverflow(page, `${size} director dashboard`); await shot(page, `${size}-director-dashboard`);
      await nav(page, /Caseworker Dispatch/);
      await page.getByText('UI live-data check').first().waitFor({ state: 'attached', timeout: 10000 }).catch(() => {});
      const dispatchText = await page.locator('.dispatch-page').innerText();
      check(`${size} dispatch screen: lists the new task's household and worker`, dispatchText.includes(facts.tasks.items[0].head_of_household.full_name) &&
        dispatchText.includes(facts.tasks.items[0].assigned_worker.full_name), dispatchText.slice(0, 300));
      await noOverflow(page, `${size} dispatch`); await shot(page, `${size}-director-dispatch`);
      await nav(page, /Policy Settings/);
      await page.getByText('Flag threshold').first().waitFor({ timeout: 10000 });
      check(`${size} policy screen: shows the enforced threshold, read-only`, (await page.locator('.settings-page').innerText()).includes('≥ 70') &&
        (await page.locator('.settings-page input').count()) === 0);
      await noOverflow(page, `${size} policy`); await shot(page, `${size}-director-policy`);
      for (const [name, label] of [[/Triage Queue/, 'triage'], [/15-Day Due Process/, 'due process']]) {
        await nav(page, name); await page.waitForTimeout(1500); await noOverflow(page, `${size} ${label}`);
      }
      await context.close();

      // COA: overview with ledger blocks, sampling.
      ({ context, page } = await session(ACCOUNTS.auditor));
      await page.getByText('Latest ledger blocks').waitFor({ timeout: 15000 });
      const coaText = await page.locator('.audit-page').innerText();
      check(`${size} COA overview: shows the block count and the dispatch block`, coaText.includes(String(facts.blocks.total_blocks)) &&
        /TASK DISPATCHED/.test(coaText), coaText.slice(0, 300));
      check(`${size} COA overview: no invented peso or percentage figures`, !/₱482,000|94\.2%|68\.4%/.test(coaText));
      await noOverflow(page, `${size} COA overview`); await shot(page, `${size}-coa-overview`);
      await nav(page, /Sampling/);
      await page.locator('.sampling-page [role="button"]').first().waitFor({ timeout: 15000 });
      check(`${size} COA sampling: lists real flagged households`, (await page.locator('.sampling-page [role="button"]').count()) > 0 &&
        !(await page.locator('.sampling-page').innerText()).includes('Yamaha NMAX'));
      await noOverflow(page, `${size} COA sampling`); await shot(page, `${size}-coa-sampling`);
      await nav(page, /Audit Verification|Hash Chain|Ledger/); await page.waitForTimeout(1000);
      await noOverflow(page, `${size} audit verification`);
      await context.close();

      // Case worker: field overview KPIs.
      ({ context, page } = await session(ACCOUNTS.worker));
      await nav(page, /Field Overview/);
      await page.getByText('Active Assigned Caseload').waitFor({ timeout: 15000 });
      const assigned = (await call('GET', '/tasks/assigned', { token: t.worker.token })).data.assigned_tasks_count;
      const fieldText = await page.locator('.field-dashboard').innerText();
      check(`${size} field overview: caseload KPI = assigned tasks (${assigned})`,
        new RegExp(`Active Assigned Caseload\\s*${assigned}\\b`, "i").test(fieldText), fieldText.slice(0, 200));
      check(`${size} field overview: no sample barangays`, !/Makiling|Canlubang|Bucal|6\.4 km/.test(fieldText));
      await noOverflow(page, `${size} field overview`); await shot(page, `${size}-worker-overview`);
      await nav(page, /Assigned Tasks/); await page.waitForTimeout(1000); await noOverflow(page, `${size} assigned tasks`);
      await page.getByRole('button', { name: /Start In-Person Verification/ }).first().click();
      await page.waitForTimeout(1000); await noOverflow(page, `${size} 5-step field form`); await shot(page, `${size}-worker-form`);
      await context.close();
    }
  } finally {
    await browser.close();
  }
  console.log('');
}

(async () => {
  console.log('[START] UI live data (DECISION-010): API + browser\n');
  const t = {};
  for (const [role, account] of Object.entries(ACCOUNTS)) t[role] = await login(account);
  const facts = await api(t);
  await browserChecks(t, facts);
  if (failures) { console.error(`[FAILED] ${failures} check(s) failed.`); process.exit(1); }
  console.log('[SUCCESS] UI live-data routes and screens verified.');
})().catch(error => { console.error('[ERROR]', error); process.exit(1); });

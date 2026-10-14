import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { build } from 'esbuild';
import 'fake-indexeddb/auto';

// The transport and JWTs below are synthetic: these tests do not prove backend authentication.
const bundled = await build({
  stdin: { contents: `
    export * from './src/services/authSession';
    export * from './src/services/api';
    export * from './src/services/auditVerification';
    export * from './src/services/taskDispatch';
    export { Screen4TaskDispatchModal } from './src/components/screens/Screen4TaskDispatchModal';
    export { AuditChainVerification } from './src/components/screens/AuditChainVerification';
    export * from './src/types/permissions';
    export * from './src/services/indexedDB';
    export * from './src/services/workerAssignments';
    export * from './src/utils/deviceLocation';
    export * from './src/utils/photoHasher';
    export { Screen3TriageQueue } from './src/components/screens/Screen3TriageQueue';
    export { Screen7FieldTasksList } from './src/components/screens/Screen7FieldTasksList';
    export { Screen8FieldAssessmentForm } from './src/components/screens/Screen8FieldAssessmentForm';
    export { AdminDispatchManager } from './src/components/persona/AdminDispatchManager';
    export { Screen5DueProcessManager } from './src/components/screens/Screen5DueProcessManager';
    export { displayDate, displayDateTime } from './src/utils/displayDate';
    export * from './src/utils/dueProcessPresentation';
    export { MOCK_TRIAGE_ITEMS, MOCK_DUE_PROCESS_NOTICES } from './src/data/mockContracts';
    export { assessmentProgress } from './src/utils/assessmentProgress';
    export { Screen2Dashboard } from './src/components/screens/Screen2Dashboard';
    export { AdminSettingsView } from './src/components/persona/AdminSettingsView';
    export { Sidebar } from './src/components/common/Sidebar';
    export { CoaAuditDashboard } from './src/components/persona/CoaAuditDashboard';
    export { DataSourceNotice } from './src/components/common/DataSourceNotice';
    export { createElement } from 'react';
    export { renderToStaticMarkup } from 'react-dom/server.browser';
  `, resolveDir: process.cwd(), loader: 'ts' },
  bundle: true, write: false, format: 'esm', platform: 'browser',
  define: { 'import.meta.env.VITE_API_URL': '"http://localhost:5000/api/v1"', 'process.env.NODE_ENV': '"test"' },
});
const app = await import(`data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].text).toString('base64')}`);
const values = new Map();

test('dates preserve calendar dates, use Philippine time, and retain missing/invalid values', () => {
  assert.match(app.displayDate('2026-10-09'), /Oct.*9.*2026/);
  assert.match(app.displayDate('2026-10-09T17:23:32.346Z'), /Oct.*10.*2026/);
  assert.equal(app.displayDate(null), 'Not provided');
  assert.equal(app.displayDate('unknown'), 'unknown');
});

test('dispatch puts assignments before collapsed staff details and loads server records only', () => {
  const html = app.renderToStaticMarkup(app.createElement(app.AdminDispatchManager, { onSelectHousehold: () => {} }));
  assert.doesNotMatch(html, /Sample data|Marvin Bautista|Elena Rosales/);
  assert.ok(html.indexOf('dispatch-list-heading') < html.indexOf('staff-disclosure'));
  assert.match(html, /<details class="staff-disclosure">/);
  assert.match(html, /Loading assignments/);
  assert.doesNotMatch(html, /Manage \/ Reassign/);
  assert.match(html, /Select Household/);
  assert.match(html, /Review report/);
  assert.doesNotMatch(html, /Not connected/);
});

test('due process preserves notices, protected grants and appeal actions while collapsing details', () => {
  const html = app.renderToStaticMarkup(app.createElement(app.Screen5DueProcessManager));
  assert.match(html, /Sample data/);
  assert.equal((html.match(/id="due-process-card-/g) ?? []).length, 3);
  assert.equal((html.match(/id="file-appeal-btn-/g) ?? []).length, 2);
  assert.equal((html.match(/Grants protected/g) ?? []).length, 3);
  assert.match(html, /Countdown paused/);
  assert.match(html, /<details class="record-details">/);
  assert.match(html, /Grounds for notice:/);
});

test('assessment step navigation retains accessible names and current-step context', () => {
  const html = app.renderToStaticMarkup(app.createElement(app.Screen8FieldAssessmentForm, {
    task: { task_id: 'TASK-UI', household_id: 'HOUSEHOLD-UI', head_of_household: { first_name: 'Test', last_name: 'Person' } },
    onBackToTasks: () => {}, onSubmitVerification: () => {},
  }));
  assert.equal((html.match(/aria-label="Step [1-5]:/g) ?? []).length, 5);
  assert.equal((html.match(/aria-current="step"/g) ?? []).length, 1);
  assert.match(html, /aria-live="polite">1\. Living Conditions/);
  assert.match(html, /Back to Field Tasks/);
  assert.doesNotMatch(html, /data-complete="true"|aria-pressed="true"/);
});

test('assessment completion requires recorded answers rather than visited steps', () => {
  const blank = { wall: null, roof: null, water: null, motorcycle: null, productive: null, proof: '', cardPresented: null, cardMatches: null, pawning: null, evidenceReady: false, recommendation: '', narrative: '' };
  assert.deepEqual(app.assessmentProgress(blank), [false, false, false, false, false]);
  assert.deepEqual(app.assessmentProgress({ ...blank, wall: 1, roof: 2, water: 3 }), [true, false, false, false, false]);
  assert.equal(app.assessmentProgress({ ...blank, motorcycle: false })[1], true);
  assert.equal(app.assessmentProgress({ ...blank, motorcycle: true, productive: true })[1], false);
  assert.equal(app.assessmentProgress({ ...blank, motorcycle: true, productive: false, proof: 'PERSONAL_ONLY' })[1], true);
  assert.equal(app.assessmentProgress({ ...blank, cardPresented: false, cardMatches: false, pawning: false })[2], true);
  assert.equal(app.assessmentProgress({ ...blank, recommendation: 'RETAIN', narrative: '   ' })[4], false);
  const complete = { wall: 1, roof: 2, water: 3, motorcycle: false, productive: null, proof: '', cardPresented: true, cardMatches: true, pawning: false, evidenceReady: true, recommendation: 'RETAIN', narrative: 'Observed findings.' };
  assert.deepEqual(app.assessmentProgress(complete), [true, true, true, true, true]);
  assert.equal(app.assessmentProgress({ ...complete, evidenceReady: false }).every(Boolean), false);
});

test('dashboard shows the live workload first and loads the regional snapshot from the server', () => {
  const render = (triageCount) => app.renderToStaticMarkup(app.createElement(app.Screen2Dashboard, { onNavigateToScreen() {}, triageCount }));
  const html = render(2);
  assert.match(html, /<strong>2<\/strong><span>cases awaiting review/);
  assert.match(html, /Regional snapshot/);
  assert.doesNotMatch(html, /Sample data|4,850|Sample advisory/);
  assert.match(html, /Loading…/, 'snapshot waits for GET /insights/overview');
  assert.doesNotMatch(html, /Filter Triage Queue for/);
  assert.match(render(0), /<strong>0<\/strong><span>cases awaiting review/);
  assert.match(render(undefined), /Live queue count unavailable/);
  assert.match(html, /<section class="sample-analytics-section"/);
  assert.doesNotMatch(html, /sample-analytics-disclosure/);
  assert.ok(html.indexOf('live-workload-title') < html.indexOf('sample-analytics-section'));
  assert.ok(html.indexOf('live-list-title') < html.indexOf('sample-analytics-section'));
});

test('audit navigation does not claim verification or present sample percentages as live', () => {
  const html = app.renderToStaticMarkup(app.createElement(app.Sidebar, { collapsed: false, onToggleCollapse() {}, userRole: 'COA_AUDITOR', jurisdiction: 'National', currentScreen: 'audit_ledger', onSelectScreen() {} }));
  assert.match(html, /Audit Verification/);
  assert.doesNotMatch(html, /100% Valid|94\.2%|68\.4%/);
});

test('audit overview identifies the authenticated reviewer and keeps AOM explicitly preview-only', () => {
  const html = app.renderToStaticMarkup(app.createElement(app.CoaAuditDashboard, { auditorName: 'Authenticated Auditor', onNavigateToLedger() {}, onNavigateToSampling() {} }));
  assert.match(html, /Authenticated Auditor/);
  assert.match(html, /Preview Audit Observation/);
  assert.doesNotMatch(html, /Engr\. Roberto|Tamper-Proof|Continuous Hash Lineage Verified/);
});

test('data notices are compact disclosures and never imply successful verification', () => {
  const render = screen => app.renderToStaticMarkup(app.createElement(app.DataSourceNotice, {screen}));
  assert.match(render('audit_ledger'), /Read-only verification/);
  assert.doesNotMatch(render('audit_ledger'), /Verified|100%/);
  assert.match(render('dashboard'), /Server records/);
  assert.doesNotMatch(render('dashboard'), /sample/i);
  assert.match(render('field_verify'), /Saved on device until synced/);
  assert.match(render('due_process'), /APPEAL_FILED/);
  assert.match(render('coa_dashboard'), /not saved or sent/);
  assert.doesNotMatch(render('dashboard'), /<details[^>]*open/);
});

test('field tasks use plain-language titles and distinguish local copies from submissions', () => {
  const user = fixture('CASE_WORKER').user;
  const html = app.renderToStaticMarkup(app.createElement(app.Screen7FieldTasksList, { user, isOffline: false, onToggleOffline() {}, onStartVerification() {}, onOpenSyncDrawer() {}, tasks: [] }));
  assert.match(html, /<h2>Assigned Tasks<\/h2>/);
  assert.match(html, /Saved Drafts/);
  assert.doesNotMatch(html, /Field Dockets|Offline Assignment|Sync Drawer/);
});

test('notice deadlines are concise, timezone-aware, and never imply an eligibility decision', () => {
  assert.deepEqual(app.noticeCountdown('2026-09-22', false), { text: 'Due tomorrow', urgent: true });
  assert.equal(app.noticeCountdown('2026-09-21', false).text, 'Due today');
  assert.equal(app.noticeCountdown('2026-09-25', false).text, '4 days remaining');
  assert.equal(app.noticeCountdown('2026-09-20', false).text, 'Deadline passed');
  assert.equal(app.noticeCountdown('2026-09-22T08:00:00+08:00', false).text, '22 hours remaining');
  assert.equal(app.noticeCountdown('2026-09-21T10:30:00+08:00', false).text, 'Less than 1 hour remaining');
  assert.equal(app.noticeCountdown('2026-09-21T11:00:00+08:00', false).text, '1 hour remaining');
  assert.equal(app.noticeCountdown('invalid', false).urgent, false);
  assert.equal(app.noticeCountdown('2026-09-20', true).text, 'Countdown paused');
  assert.equal(app.noticeCountdown('2026-09-22', false, '2026-09-21T18:00:00Z').text, 'Due today');
  assert.doesNotMatch(app.displayDateTime('2026-09-22'), /PHT|AM|PM/);
  assert.match(app.displayDateTime('2026-09-21T17:30:00Z'), /Sep.*22.*2026.*1:30.*AM.*PHT/);
});

test('due process sorts active deadlines before paused cases without changing source data', () => {
  const original = app.MOCK_DUE_PROCESS_NOTICES.map((item) => item.household_id);
  const sorted = app.sortDueProcessNotices(app.MOCK_DUE_PROCESS_NOTICES);
  assert.equal(sorted[0].head_of_household.full_name, 'Crisanto Flores');
  assert.equal(sorted.at(-1).status, 'UNDER_APPEAL_HEARING');
  assert.deepEqual(app.MOCK_DUE_PROCESS_NOTICES.map((item) => item.household_id), original);
  const invalid = { ...sorted[0], notice_expiry_date: 'unknown' };
  assert.equal(app.sortDueProcessNotices([invalid, sorted[0]])[0], sorted[0]);
  const html = app.renderToStaticMarkup(app.createElement(app.Screen5DueProcessManager));
  assert.ok(html.indexOf('Crisanto Flores') < html.indexOf('Danilo Ramos'));
  assert.ok(html.indexOf('Danilo Ramos') < html.indexOf('Luzviminda Ocampo'));
  assert.match(html, /Due tomorrow/);
  assert.doesNotMatch(html, /De-listing Finalized/);
});

test('dashboard renders API households only when counts are available and excludes stale loading data', () => {
  const render = (props) => app.renderToStaticMarkup(app.createElement(app.Screen2Dashboard, {
    onNavigateToScreen() {}, triageItems: app.MOCK_TRIAGE_ITEMS, ...props,
  }));
  assert.match(render({ triageCount: 5 }), /3 shown from the current page/);
  const html = render({ triageCount: 5 });
  assert.ok(html.indexOf('live-queue-preview') < html.indexOf('sample-analytics-section'));
  assert.doesNotMatch(html, /geography-section/, 'the map renders only after the overview loads');
  assert.doesNotMatch(render({ triageCount: undefined }), /class="live-households"/);
  assert.doesNotMatch(render({ triageCount: 0 }), /class="live-households"/);
  assert.match(render({ triageLoading: true }), /Loading queue/);
  assert.doesNotMatch(render({ triageLoading: true, triageCount: 5 }), /class="live-households"/);
});

test('triage keeps four primary columns with complete, collapsed evidence and backend severity labels', () => {
  const item = app.MOCK_TRIAGE_ITEMS[0];
  const render = (readOnly) => app.renderToStaticMarkup(app.createElement(app.Screen3TriageQueue, { items: [item], onDispatchTask() {}, readOnly }));
  const html = render(false);
  assert.equal((html.match(/role="columnheader"/g) ?? []).length, 4);
  assert.match(html, /aria-expanded="false"/);
  assert.match(html, /hidden="" class="triage-detail-row"/);
  assert.ok(html.includes(item.head_of_household.national_id));
  assert.match(html, /Enrolled SWDI/);
  assert.match(html, /Predicted SWDI/);
  assert.doesNotMatch(html, /min-w-\[1100px\]|Calamity Freeze|Critical \(Score/);
  assert.match(render(true), /Read-only/);
  assert.doesNotMatch(render(true), /class="triage-dispatch"/);
});

test('policy settings is read-only and waits for the server policy', () => {
  const html = app.renderToStaticMarkup(app.createElement(app.AdminSettingsView));
  assert.match(html, /cannot be edited here/);
  assert.match(html, /Loading policy/);
  assert.doesNotMatch(html, /<input|Save Administrative Parameters|Preview Parameters/);
});

test('sidebar toggles only from non-navigation clicks in either width state', () => {
  for (const collapsed of [false, true]) {
    let toggles = 0;
    const panel = app.Sidebar({ collapsed, onToggleCollapse: () => toggles++,
      userRole: 'REGIONAL_DIRECTOR', jurisdiction: 'Calamba', currentScreen: 'dashboard',
      onSelectScreen: () => {} });
    for (const target of ['button', 'label inside button', 'SVG inside button', 'link']) {
      panel.props.onClick({ target: { closest: (selector) => {
        assert.equal(selector, 'button, a');
        return { target };
      } } });
    }
    assert.equal(toggles, 0, 'Navigation must not resize the panel');
    panel.props.onClick({ target: { closest: () => null } });
    assert.equal(toggles, 1, 'Panel background still toggles');
  }
});
globalThis.sessionStorage = {
  getItem: (key) => values.get(key) ?? null,
  setItem: (key, value) => values.set(key, String(value)),
  removeItem: (key) => values.delete(key),
};
globalThis.window = new EventTarget();
let unauthorized = 0;
window.addEventListener('kilosunlad:unauthorized', () => unauthorized++);
const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
function fixture(role = 'REGIONAL_DIRECTOR', overrides = {}) {
  const user = {
    user_id: '60c72b2f9b1e8a001c8a1101', username: 'synthetic.test', full_name: 'Synthetic Test User', role,
    jurisdiction: { region: 'Region IV-A', province: 'Laguna', municipality: 'Calamba', assigned_barangays: ['Palingon'] },
  };
  const claims = { userId: user.user_id, role, exp: Math.floor(Date.now() / 1000) + 900, ...overrides };
  return { user, access_token: `${encode({ alg: 'HS256' })}.${encode(claims)}.syntheticSignature` };
}
function respond(data, headers = {}) {
  app.api.defaults.adapter = async (config) => ({ config, data, headers, status: 200, statusText: 'OK' });
}
function triageResponse(items = [], page = 1, total = items.length) {
  return { items, pagination: { current_page: page, total_records: total, total_pages: Math.ceil(total / 10), limit: 10 } };
}

test('workload summary preserves zeros and rejects missing, partial or invalid counts', async () => {
  const summary = { high_risk_count: 0, under_investigation_count: 2, notice_of_ineligibility_count: 1 };
  assert.deepEqual(app.parseTriageSummary(summary), summary);
  for (const invalid of [null, {}, { ...summary, high_risk_count: -1 }, { ...summary, high_risk_count: '2' }]) assert.equal(app.parseTriageSummary(invalid), null);
  app.saveSession(app.parseSession(fixture()));
  respond({ ...triageResponse(), summary_metrics: summary });
  assert.deepEqual((await app.fetchTriagePage()).summary, summary);
  respond(triageResponse());
  assert.equal((await app.fetchTriagePage()).summary, null);
});

test('dashboard separates API workload semantics from sample chart metrics', () => {
  const render = props => app.renderToStaticMarkup(app.createElement(app.Screen2Dashboard, { onNavigateToScreen() {}, ...props }));
  const html = render({ triageSummary: { high_risk_count: 0, under_investigation_count: 12, notice_of_ineligibility_count: 3 } });
  assert.match(html, /High-risk beneficiaries<\/dt><dd>0/);
  assert.match(html, /Notices of ineligibility<\/dt><dd>3/);
  assert.match(html, /Categories may overlap/);
  assert.doesNotMatch(html, /Sample data/);
  assert.match(render({}), /High-risk beneficiaries<\/dt><dd>Unavailable/);
});

function verifiedFixture() {
  return { is_chain_valid: true, total_blocks_verified: 2, verification_timestamp: '2026-10-08T00:00:00Z', genesis_hash: '0'.repeat(64), head_hash: 'a'.repeat(64), broken_blocks: [] };
}

test('audit ranges enforce inclusive 1000-block limit and positive safe integers', () => {
  assert.deepEqual(app.parseAuditRange('1', '1000'), { start: 1, end: 1000 });
  assert.deepEqual(app.parseAuditRange('10', '10'), { start: 10, end: 10 });
  for (const [start, end] of [['', '2'], ['0', '2'], ['2', '1'], ['1', '1001'], ['1.5', '2'], ['1e2', '200'], [' 1', '2'], ['1', '9007199254740992']]) assert.throws(() => app.parseAuditRange(start, end));
});

test('audit transport sends authenticated read-only range and handles broken HTTP 200', async () => {
  const session = app.parseSession(fixture('COA_AUDITOR')); app.saveSession(session);
  const broken = { ...verifiedFixture(), is_chain_valid: false, head_hash: 'INVALID_HASH_AT_SEQUENCE_2', broken_blocks: [{ sequence_index: 2, recorded_hash: '', calculated_hash: 'b'.repeat(64), target_entity: 'beneficiaries', entity_id: 'TEST', tamper_detected_at: '2026-10-08T00:00:00Z' }] };
  app.api.defaults.adapter = async config => {
    assert.equal(config.method, 'get');
    assert.equal(config.url, '/audit/verify-chain');
    assert.equal(config.headers.Authorization, `Bearer ${session.access_token}`);
    assert.deepEqual(config.params, { start_sequence: 1, end_sequence: 2 });
    return { config, data: broken, headers: {}, status: 200 };
  };
  assert.equal((await app.verifyAuditChain({ start: 1, end: 2 })).is_chain_valid, false);
  respond(verifiedFixture());
  assert.equal((await app.verifyAuditChain({ start: 1, end: 2 })).is_chain_valid, true);
  respond(verifiedFixture(), { 'x-kilosunlad-mock': 'true' });
  await assert.rejects(app.verifyAuditChain({ start: 1, end: 2 }), /mock mode/);
});

test('audit malformed results cannot report verified and unavailable responses stay errors', async () => {
  for (const value of [null, {}, { ...verifiedFixture(), total_blocks_verified: 0 }, { ...verifiedFixture(), is_chain_valid: false }, { ...verifiedFixture(), head_hash: 'invalid' }]) assert.throws(() => app.parseAuditVerification(value, { start: 1, end: 2 }));
  app.saveSession(app.parseSession(fixture('COA_AUDITOR')));
  for (const [status, code, message] of [[409, 'AUDIT_RANGE_INCOMPLETE', /missing/], [409, 'AUDIT_ENTRY_INVALID', /could not be verified/], [403, 'FORBIDDEN', /Access denied/], [503, 'UNAVAILABLE', /unavailable/], [404, '', /backend version/]]) {
    reject(status, code);
    await assert.rejects(app.verifyAuditChain({ start: 1, end: 2 }), error => { assert.match(app.apiErrorMessage(error), message); return true; });
  }
});

test('audit starts unverified with no simulated blocks and role access matches contract', () => {
  const html = app.renderToStaticMarkup(app.createElement(app.AuditChainVerification));
  assert.match(html, /No verification has been run/);
  assert.doesNotMatch(html, /Tamper-Proof|Simulate|Requested range verified/);
  for (const role of ['SUPER_ADMIN', 'COA_AUDITOR']) assert.ok(app.ROLE_CONFIG[role].allowedScreens.includes('audit_ledger'));
  for (const role of ['REGIONAL_DIRECTOR', 'CASE_WORKER']) assert.ok(!app.ROLE_CONFIG[role].allowedScreens.includes('audit_ledger'));
});
function reject(status, code) {
  app.api.defaults.adapter = async (config) => {
    throw { isAxiosError: true, config, response: { status, data: { error: { code } } } };
  };
}

const dispatchInput = () => ({ household_id: 'TEST-DISPATCH', assigned_worker_id: 'a'.repeat(24), assignment_notes: 'Synthetic inspection', priority: 'HIGH', due_date: '2099-10-12T23:59:59+08:00' });
const dispatchReceipt = () => ({ task_id: 'TSK-TEST', household_id: 'TEST-DISPATCH', assigned_worker_id: 'a'.repeat(24), task_status: 'PENDING_DISPATCH', household_status: 'UNDER_INVESTIGATION', dispatched_at: '2026-10-11T08:00:00Z', audit_receipt: { sequence_index: 1, entry_hash: 'b'.repeat(64) } });
test('dispatch dates use Philippine end-of-day and reject invalid fields', () => {
  assert.equal(app.dispatchDeadline('2099-10-12'), '2099-10-12T23:59:59+08:00');
  for (const day of ['2026-02-30', '', '12/10/2026']) assert.throws(() => app.dispatchDeadline(day));
  for (const invalid of [{ assigned_worker_id: 'sample-worker' }, { priority: 'URGENT' }, { assignment_notes: ' ' }, { due_date: '2020-01-01T00:00:00Z' }, { household_id: '' }]) assert.throws(() => app.validateDispatch({ ...dispatchInput(), ...invalid }));
});
test('dispatch posts exact authenticated contract and requires a matching 201 receipt', async () => {
  const session = app.parseSession(fixture('REGIONAL_DIRECTOR')); app.saveSession(session);
  app.api.defaults.adapter = async config => {
    assert.equal(config.method, 'post'); assert.equal(config.url, '/tasks/dispatch');
    assert.equal(config.headers.Authorization, `Bearer ${session.access_token}`);
    assert.deepEqual(JSON.parse(config.data), dispatchInput());
    return { config, status: 201, headers: {}, data: dispatchReceipt() };
  };
  assert.equal((await app.dispatchTask(dispatchInput())).task_id, 'TSK-TEST');
  for (const [status, data, headers] of [[200, dispatchReceipt(), {}], [201, { ...dispatchReceipt(), household_id: 'other' }, {}], [201, { ...dispatchReceipt(), audit_receipt: null }, {}], [201, dispatchReceipt(), { 'x-kilosunlad-mock': 'true' }]]) {
    app.api.defaults.adapter = async config => ({ config, status, data, headers });
    await assert.rejects(app.dispatchTask(dispatchInput()), /valid dispatch receipt/);
  }
});
test('dispatch rejects forbidden roles before transport and explains backend conflicts', async () => {
  for (const role of ['CASE_WORKER', 'COA_AUDITOR']) {
    app.saveSession(app.parseSession(fixture(role)));
    await assert.rejects(app.dispatchTask(dispatchInput()), /Only administrators/);
  }
  app.saveSession(app.parseSession(fixture('SUPER_ADMIN')));
  for (const [code, message] of [['ACTIVE_TASK_EXISTS', /active task/], ['INVALID_ASSIGNED_WORKER', /active caseworker/], ['OUT_OF_JURISDICTION', /jurisdiction/]]) {
    reject(409, code);
    await assert.rejects(app.dispatchTask(dispatchInput()), error => { assert.match(app.dispatchErrorMessage(error), message); return true; });
  }
});
test('dispatch source keeps QA writes disabled and does not import fabricated staff', () => {
  // Dialog portals require a browser; verify the static safety guards here, UI separately.
  const source = readFileSync('src/components/screens/Screen4TaskDispatchModal.tsx', 'utf8');
  assert.match(source, /inFlight.current \|\| receipt \|\| !live/);
  assert.match(source, /disabled=\{pending \|\| !live\}/);
  assert.doesNotMatch(source, /MOCK_MUNICIPAL_LINKS/);
});
beforeEach(() => {
  values.clear(); unauthorized = 0;
  app.api.defaults.adapter = async () => { throw new Error('Unexpected request'); };
});

for (const role of app.USER_ROLES) {
  test(`accepts backend-shaped session and restores ${role}`, () => {
    const session = app.parseSession(fixture(role));
    app.saveSession(session);
    assert.deepEqual(app.readStoredSession(), session);
    assert.equal(session.user.role, role);
    assert.ok(app.ROLE_CONFIG[role].allowedScreens.includes(app.ROLE_CONFIG[role].defaultScreen));
  });
}
test('rejects unknown and legacy roles instead of assigning admin', () => {
  for (const role of ['ADMIN', 'DSWD_DIRECTOR', 'MUNICIPAL_LINK', 'GRIEVANCE_OFFICER', '', null]) {
    assert.equal(app.isUserRole(role), false);
    assert.throws(() => app.parseSession(fixture(role)));
    assert.equal(app.canDispatch(role), false);
  }
});
test('rejects placeholder tokens, mismatched claims, expiry and future activation', () => {
  assert.throws(() => app.parseSession({ ...fixture(), access_token: 'mock-token' }));
  for (const claims of [{ exp: 1 }, { exp: '9999999999' }, { userId: 'other' }, { role: 'CASE_WORKER' }, { nbf: 9999999999 }]) {
    assert.throws(() => app.parseSession(fixture('REGIONAL_DIRECTOR', claims)));
  }
  const payload = fixture();
  delete payload.user.user_id;
  assert.throws(() => app.parseSession(payload));
});
test('clears malformed, expired and mismatched stored sessions', () => {
  for (const value of ['{broken', JSON.stringify(fixture('CASE_WORKER', { exp: 1 })), JSON.stringify(fixture())]) {
    sessionStorage.setItem(app.SESSION_KEY, value);
    sessionStorage.setItem(app.TOKEN_KEY, 'wrong-token');
    assert.equal(app.readStoredSession(), null);
    assert.equal(values.size, 0);
  }
});
test('login sends credentials without bearer and stores only accepted response', async () => {
  const payload = fixture();
  app.api.defaults.adapter = async (config) => {
    assert.equal(config.url, '/auth/login');
    assert.equal(config.headers.Authorization, undefined);
    assert.deepEqual(JSON.parse(config.data), { username: 'synthetic.test', password: 'synthetic-only' });
    return { config, data: payload, headers: {}, status: 200 };
  };
  assert.equal((await app.login('synthetic.test', 'synthetic-only')).access_token, payload.access_token);
  assert.ok(app.readStoredSession());
});
test('invalid login never falls back or stores a session', async () => {
  reject(401, 'INVALID_CREDENTIALS');
  await assert.rejects(app.login('synthetic.test', 'wrong'), (error) => {
    assert.equal(app.apiErrorMessage(error), 'Incorrect username or password.'); return true;
  });
  assert.equal(app.readStoredSession(), null);
});
test('network failure never creates a session', async () => {
  app.api.defaults.adapter = async (config) => { throw { isAxiosError: true, config }; };
  await assert.rejects(app.login('synthetic.test', 'wrong'), (error) => {
    assert.match(app.apiErrorMessage(error), /Cannot reach the API/); return true;
  });
  assert.equal(app.readStoredSession(), null);
});
test('rejects mock mode and malformed successful login responses', async () => {
  for (const [payload, headers] of [[fixture(), { 'x-kilosunlad-mock': 'true' }], [{ ...fixture(), access_token: 'mock-token' }, {}], [{}, {}]]) {
    respond(payload, headers);
    await assert.rejects(app.login('synthetic.test', 'synthetic-only'));
    assert.equal(app.readStoredSession(), null);
  }
});
test('protected request requires a session before contacting backend', async () => {
  await assert.rejects(app.fetchTriageQueue(), /Please sign in/);
  assert.equal(unauthorized, 1);
});
test('bearer attached to requests; valid empty fixture responses stay empty', async () => {
  const session = app.parseSession(fixture()); app.saveSession(session);
  app.api.defaults.adapter = async (config) => {
    assert.equal(config.headers.Authorization, `Bearer ${session.access_token}`);
    return { config, status: 200, headers: {}, data: triageResponse() };
  };
  assert.deepEqual(await app.fetchTriageQueue(), []);
  respond({ tasks: [] });
  assert.deepEqual(await app.fetchAssignedTasks(), []);
});
test('UI live-data reads call the DECISION-010 routes with the bearer and reject malformed bodies', async () => {
  const session = app.parseSession(fixture()); app.saveSession(session);
  const seen = [];
  const bodies = {
    '/insights/overview': { households: { total: 0, by_status: {}, by_enrolled_level: {} }, risk: { triggers: [] }, municipalities: [] },
    '/tasks': { items: [], pagination: { total_records: 0, current_page: 1, total_pages: 0, limit: 20 } },
    '/users/caseworkers': { items: [] },
    '/audit/blocks': { items: [], total_blocks: 0, next_before: null },
    '/system/policy': { risk_score: { flag_threshold: 70, weights: {}, cap: 100 } },
    '/insights/map': { cell_size_deg: 0.002, total_households: 0, cells: [] },
  };
  app.api.defaults.adapter = async (config) => {
    assert.equal(config.headers.Authorization, `Bearer ${session.access_token}`);
    assert.equal(config.method, 'get');
    seen.push([config.url, config.params ?? {}]);
    return { config, status: 200, headers: {}, data: bodies[config.url] };
  };
  await app.fetchInsightsOverview();
  await app.fetchAdminTasks({ status: 'SUBMITTED', page: 2, limit: 20 });
  await app.fetchCaseworkers();
  await app.fetchAuditBlocks({ limit: 8 });
  await app.fetchPolicy();
  await app.fetchMapDensity();
  assert.deepEqual(seen, [['/insights/overview', {}], ['/tasks', { status: 'SUBMITTED', page: 2, limit: 20 }],
    ['/users/caseworkers', {}], ['/audit/blocks', { limit: 8 }], ['/system/policy', {}], ['/insights/map', {}]]);
  app.api.defaults.adapter = async (config) => ({ config, status: 200, headers: {}, data: {} });
  for (const call of [app.fetchInsightsOverview, app.fetchAdminTasks, app.fetchCaseworkers, app.fetchAuditBlocks, app.fetchPolicy, app.fetchMapDensity]) {
    await assert.rejects(call(), /did not match the contract/);
  }
});
test('DECISION-011 calls: report, evidence, notice and graduation use the routes and verify receipts', async () => {
  const session = app.parseSession(fixture()); app.saveSession(session);
  const seen = [];
  const photoBytes = new TextEncoder().encode('photo-bytes');
  const hash = await app.calculateSha256(new Blob([photoBytes]));
  app.api.defaults.adapter = async (config) => {
    assert.equal(config.headers.Authorization, `Bearer ${session.access_token}`);
    seen.push([config.method, config.url, config.data ? JSON.parse(config.data) : undefined]);
    if (config.url === '/tasks/TSK-1/report') return { config, status: 200, headers: {}, data: { task_id: 'TSK-1', evidence: [] } };
    if (config.url === `/evidence/${hash}`) return { config, status: 200, headers: { 'x-content-sha256': hash }, data: new Blob([photoBytes]) };
    if (config.url === '/tasks/TSK-1/resolve') return { config, status: 200, headers: {}, data: { household_status: 'NOTICE_OF_INELIGIBILITY', audit_receipt: { sequence_index: 7 } } };
    return { config, status: 200, headers: {}, data: { household_status: 'GRADUATED', audit_receipt: { sequence_index: 8 } } };
  };
  globalThis.URL.createObjectURL ??= () => 'blob:test';
  await app.fetchTaskReport('TSK-1');
  assert.match(await app.fetchEvidenceUrl(hash), /^blob:/);
  await app.issueNotice('TSK-1', 'Grounds of at least ten characters');
  await app.completeGraduation('HH-1');
  assert.deepEqual(seen, [['get', '/tasks/TSK-1/report', undefined], ['get', `/evidence/${hash}`, undefined],
    ['post', '/tasks/TSK-1/resolve', { decision: 'APPROVED_GRADUATION', admin_notes: 'Grounds of at least ten characters' }],
    ['post', '/beneficiaries/HH-1/graduate', {}]]);
  // A photo whose hash the server does not confirm, or a receipt without a sealed block, is rejected.
  app.api.defaults.adapter = async (config) => ({ config, status: 200, headers: { 'x-content-sha256': hash }, data: new Blob(['altered']) });
  await assert.rejects(app.fetchEvidenceUrl(hash), /does not match its recorded hash/, 'the browser re-hashes the bytes itself');
  app.api.defaults.adapter = async (config) => ({ config, status: 200, headers: {}, data: {} });
  await assert.rejects(app.issueNotice('TSK-1', 'Grounds of at least ten characters'), /valid notice receipt/);
  await assert.rejects(app.completeGraduation('HH-1'), /valid graduation receipt/);
});
test('protected 401 or deactivated account clears session', async () => {
  for (const [status, code] of [[401, 'TOKEN_EXPIRED'], [403, 'ACCOUNT_DEACTIVATED']]) {
    app.saveSession(app.parseSession(fixture())); reject(status, code);
    await assert.rejects(app.fetchTriageQueue());
    assert.equal(app.readStoredSession(), null);
  }
  assert.equal(unauthorized, 2);
});
test('role/jurisdiction 403 retains identity and reports access denial', async () => {
  app.saveSession(app.parseSession(fixture())); reject(403, 'FORBIDDEN');
  await assert.rejects(app.fetchTriageQueue(), (error) => { assert.match(app.apiErrorMessage(error), /Access denied/); return true; });
  assert.ok(app.readStoredSession()); assert.equal(unauthorized, 0);
});
test('late 401 from old identity does not clear newer login', async () => {
  app.saveSession(app.parseSession(fixture()));
  app.api.defaults.adapter = async (config) => {
    app.saveSession(app.parseSession(fixture('CASE_WORKER')));
    throw { config, response: { status: 401 } };
  };
  await assert.rejects(app.fetchTriageQueue());
  assert.equal(app.readStoredSession().user.role, 'CASE_WORKER'); assert.equal(unauthorized, 0);
});
test('role navigation follows endpoint RBAC; COA cannot dispatch', () => {
  assert.equal(app.canReadTriage('CASE_WORKER'), false);
  assert.equal(app.canReadTriage('COA_AUDITOR'), true);
  assert.equal(app.canDispatch('COA_AUDITOR'), false);
  assert.equal(app.ROLE_CONFIG.CASE_WORKER.allowedScreens.includes('dashboard'), false);
  assert.equal(app.ROLE_CONFIG.COA_AUDITOR.allowedScreens.includes('dispatch_manager'), false);
});
test('COA triage renders without dispatch controls', async () => {
  app.saveSession(app.parseSession(fixture('COA_AUDITOR')));
  respond(triageResponse([{ household_id: 'synthetic-household', composite_risk_score: 75 }]));
  const items = await app.fetchTriageQueue();
  const render = (readOnly) => app.renderToStaticMarkup(app.createElement(app.Screen3TriageQueue, { items, readOnly, onDispatchTask() {} }));
  assert.doesNotMatch(render(true), /class="triage-dispatch"/);
  assert.match(render(true), /Read-only/);
  assert.match(render(false), /class="triage-dispatch"/);
});
test('empty assigned tasks renders empty state and authenticated worker identity', () => {
  const html = app.renderToStaticMarkup(app.createElement(app.Screen7FieldTasksList, {
    user: fixture('CASE_WORKER').user, tasks: [], isOffline: false,
    onToggleOffline() {}, onStartVerification() {}, onOpenSyncDrawer() {},
  }));
  assert.match(html, /No tasks are assigned to this account/);
  assert.match(html, /Synthetic Test User/);
  assert.doesNotMatch(html, /Marvin Bautista|Start In-Person Verification/);
});
test('cached assignments are isolated per owner and empty results clear only that owner', async () => {
  await app.cacheAssignedTasks('worker-a', [{ task_id: 'shared-task', household_id: 'house-a' }]);
  await app.cacheAssignedTasks('worker-b', [{ task_id: 'shared-task', household_id: 'house-b' }]);
  assert.equal((await app.getCachedAssignedTasks('worker-a'))[0].household_id, 'house-a');
  assert.equal((await app.getCachedAssignedTasks('worker-b'))[0].household_id, 'house-b');
  await app.cacheAssignedTasks('worker-a', []);
  assert.deepEqual(await app.getCachedAssignedTasks('worker-a'), []);
  assert.equal((await app.getCachedAssignedTasks('worker-b')).length, 1);
});
test('drafts and sync statuses never cross worker boundaries or load legacy unowned drafts', async () => {
  const draft = { task_id: 'same-task', timestamp: new Date().toISOString(), sync_status: 'PENDING_SYNC' };
  await app.fieldDatabase.table('pendingSubmissions').put({ ...draft, task_id: 'legacy-draft' });
  await app.queueSubmission('worker-a', { ...draft, household_id: 'house-a' });
  await app.queueSubmission('worker-b', { ...draft, household_id: 'house-b' });
  await app.updateSubmissionStatus('worker-a', 'same-task', 'SYNCED');
  const a = await app.getQueuedSubmissions('worker-a');
  const b = await app.getQueuedSubmissions('worker-b');
  assert.equal(a.length, 1); assert.equal(a[0].sync_status, 'SYNCED');
  assert.equal(b.length, 1); assert.equal(b[0].sync_status, 'PENDING_SYNC');
  assert.equal(b[0].household_id, 'house-b');
  assert.deepEqual(await app.getQueuedSubmissions('worker-c'), []);
});
test('triage requests explicit pages of flagged records without truncating total count', async () => {
  app.saveSession(app.parseSession(fixture()));
  app.api.defaults.adapter = async (config) => {
    assert.deepEqual(config.params, { page: 2, limit: 10, status: 'FLAGGED_FOR_REVIEW' });
    return { config, status: 200, headers: {}, data: triageResponse([{ household_id: 'second-page' }], 2, 11) };
  };
  const result = await app.fetchTriagePage(2);
  assert.equal(result.items[0].household_id, 'second-page');
  assert.equal(result.pagination.total_records, 11);
  assert.equal(result.pagination.current_page, 2);
});
test('missing or mismatched pagination is reported instead of hiding additional rows', async () => {
  app.saveSession(app.parseSession(fixture()));
  for (const response of [{ items: [] }, triageResponse([], 2, 12), { ...triageResponse(), pagination: { ...triageResponse().pagination, total_records: -1 } }]) {
    respond(response);
    await assert.rejects(app.fetchTriagePage(), /valid pagination/);
  }
});
test('null SWDI prediction and evaluation time do not invent a level or timestamp', async () => {
  app.saveSession(app.parseSession(fixture()));
  respond(triageResponse([{ household_id: 'no-prediction', enrolled_swdi_level: 2, predicted_swdi_level: null, flagged_at: null }]));
  const [item] = await app.fetchTriageQueue();
  assert.equal(item.predicted_swdi_level, 'Not available');
  assert.equal(item.enrolled_swdi_level, 'Level 2: Subsistence');
  assert.equal(item.last_evaluated, null);
});
test('live assigned API gets no worker override and preserves missing optional data', async () => {
  app.saveSession(app.parseSession(fixture('CASE_WORKER')));
  app.api.defaults.adapter = async (config) => {
    assert.equal(config.url, '/tasks/assigned'); assert.equal(config.params, undefined);
    return { config, status: 200, headers: {}, data: { tasks: [{ task_id: 'live-shape', dispatch_instructions: '', risk_assessment: { composite_risk_score: 0 } }] } };
  };
  const [task] = await app.fetchAssignedTasks();
  assert.equal(task.dispatched_at, null);
  assert.equal(task.due_date, '');
  assert.equal(task.dispatch_instructions, '');
  assert.equal(task.priority, 'LOW');
  assert.equal(task.cached_offline, false);
});
test('triage pagination shows total, page count, and disabled boundary controls', () => {
  const render = (page, total) => app.renderToStaticMarkup(app.createElement(app.Screen3TriageQueue, {
    items: [], pagination: triageResponse([], page, total).pagination, onDispatchTask() {}, onPageChange() {},
  }));
  const first = render(1, 11), last = render(2, 11), empty = render(1, 0);
  assert.match(first, /Page 1 of 2/); assert.match(first, /11<\/strong> total records/);
  assert.match(first, /aria-label="Previous page"[^>]*disabled/);
  assert.doesNotMatch(first, /aria-label="Next page"[^>]*disabled/);
  assert.match(last, /aria-label="Next page"[^>]*disabled/);
  assert.match(empty, /Page 1 of 1/);
});

test('an API-returned Palingon task renders its actual fields and verification action', async () => {
  app.saveSession(app.parseSession(fixture('CASE_WORKER')));
  respond({
    worker_id: fixture('CASE_WORKER').user.user_id,
    assigned_tasks_count: 1,
    tasks: [{
      task_id: 'synthetic-palingon-pending', household_id: 'synthetic-palingon-household',
      head_of_household: { first_name: 'Test', last_name: 'Household', national_id: 'SYNTHETIC-ID', contact_phone: '' },
      address: { street: '', barangay: 'Palingon', municipality: 'Calamba', province: 'Laguna', target_coordinates: [121.16, 14.21] },
      risk_assessment: { composite_risk_score: 75 },
      dispatch_instructions: 'Synthetic visit instructions', due_date: '2026-10-05T08:00:00.000Z',
    }],
  });
  const tasks = await app.fetchAssignedTasks();
  assert.equal(tasks.length, 1);
  assert.deepEqual(tasks[0].address.coordinates, [121.16, 14.21]);
  assert.equal(tasks[0].priority, 'HIGH');
  const html = app.renderToStaticMarkup(app.createElement(app.Screen7FieldTasksList, {
    user: fixture('CASE_WORKER').user, tasks, isOffline: false,
    onToggleOffline() {}, onStartVerification() {}, onOpenSyncDrawer() {},
  }));
  for (const content of ['synthetic-palingon-pending', 'Test Household', 'Palingon', 'Synthetic visit instructions', '2026-10-05T08:00:00.000Z', 'Start In-Person Verification']) {
    assert.ok(html.includes(content), `Missing expected task content: ${content}`);
  }
  assert.doesNotMatch(html, /Lecheria|No tasks are assigned to this account/);
});

test('assigned-task API failures reject instead of manufacturing a successful empty or sample feed', async () => {
  app.saveSession(app.parseSession(fixture('CASE_WORKER')));
  for (const [status, code] of [[403, 'FORBIDDEN'], [503, 'SERVICE_UNAVAILABLE']]) {
    reject(status, code);
    await assert.rejects(app.fetchAssignedTasks(), (error) => error.response.status === status);
  }
});

test('saved drafts and exact evidence survive database reopen; resave replaces only the same owner/task', async () => {
  const bytes = 'device-only-photo';
  const draft = { task_id: 'persist-task', household_id: 'persist-household', timestamp: '2026-10-09T00:00:00Z', sync_status: 'PENDING_SYNC', narrative_report: 'Original', evidence_attachments: [{ photo_url: bytes, client_side_hash: 'a'.repeat(64), gps_readout: { latitude: 14.2, longitude: 121.1, accuracy_m: 8 } }] };
  await app.queueSubmission('persistence-owner', draft);
  await app.queueSubmission('persistence-other', { ...draft, narrative_report: 'Other account' });
  app.fieldDatabase.close();
  await app.fieldDatabase.open();
  assert.deepEqual(await app.getQueuedSubmissions('persistence-owner'), [draft]);
  await app.queueSubmission('persistence-owner', { ...draft, narrative_report: 'Updated' });
  const saved = await app.getQueuedSubmissions('persistence-owner');
  assert.equal(saved.length, 1);
  assert.equal(saved[0].narrative_report, 'Updated');
  assert.equal((await app.getQueuedSubmissions('persistence-other'))[0].narrative_report, 'Other account');
});

test('offline assignments restore only an authenticated worker cache without a network request', async () => {
  const session = app.parseSession(fixture('CASE_WORKER')); app.saveSession(session);
  await app.cacheAssignedTasks(session.user.user_id, [{ task_id: 'offline-task', household_id: 'offline-household' }]);
  const result = await app.loadWorkerAssignments(session.user.user_id, false, new AbortController().signal);
  assert.equal(result.source, 'device');
  assert.equal(result.tasks[0].task_id, 'offline-task');
  assert.equal(result.tasks[0].cached_offline, true);
  await assert.rejects(app.loadWorkerAssignments('another-worker', false, new AbortController().signal), /sign in/);
  app.clearStoredSession();
  await assert.rejects(app.loadWorkerAssignments(session.user.user_id, false, new AbortController().signal), /sign in/);
});

test('network-only failure can restore cache; 401/403/503 and cancellation never do', async () => {
  const session = app.parseSession(fixture('CASE_WORKER')); app.saveSession(session);
  await app.cacheAssignedTasks(session.user.user_id, [{ task_id: 'network-cache' }]);
  app.api.defaults.adapter = async config => { throw { isAxiosError: true, config, code: 'ERR_NETWORK' }; };
  assert.equal((await app.loadWorkerAssignments(session.user.user_id, true, new AbortController().signal)).source, 'device');
  for (const status of [403, 503, 401]) {
    app.saveSession(session); reject(status, 'REJECTED');
    await assert.rejects(app.loadWorkerAssignments(session.user.user_id, true, new AbortController().signal), error => error.response.status === status);
  }
  app.saveSession(session);
  const controller = new AbortController(); controller.abort();
  await assert.rejects(app.loadWorkerAssignments(session.user.user_id, true, controller.signal));
});

test('a successful empty assignment response clears stale tasks without deleting saved drafts', async () => {
  const session = app.parseSession(fixture('CASE_WORKER')); app.saveSession(session);
  await app.cacheAssignedTasks(session.user.user_id, [{ task_id: 'stale-assignment' }]);
  const draft = { task_id: 'unsubmitted', timestamp: '2026-10-09T00:00:00Z', sync_status: 'PENDING_SYNC' };
  await app.queueSubmission(session.user.user_id, draft);
  respond({ tasks: [] });
  const result = await app.loadWorkerAssignments(session.user.user_id, true, new AbortController().signal);
  assert.equal(result.source, 'server'); assert.deepEqual(result.tasks, []);
  assert.deepEqual(await app.getCachedAssignedTasks(session.user.user_id), []);
  assert.ok((await app.getQueuedSubmissions(session.user.user_id)).some(item => item.task_id === draft.task_id));
});

test('SHA-256 matches a known vector and fingerprints original bytes', async () => {
  assert.equal(await app.calculateSha256(new Blob(['abc'])), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  assert.notEqual(await app.calculateSha256(new Blob(['abc'])), await app.calculateSha256(new Blob(['abcd'])));
});

test('evidence photo validation rejects empty, oversized, unsupported and disguised files', async () => {
  for (const file of [new Blob([], { type: 'image/png' }), new Blob([new Uint8Array(10 * 1024 * 1024 + 1)], { type: 'image/png' }), new Blob(['<svg/>'], { type: 'image/svg+xml' }), new Blob(['not an image'], { type: 'image/jpeg' })]) {
    await assert.rejects(app.validateEvidencePhoto(file));
  }
  await app.validateEvidencePhoto(new Blob([Uint8Array.from([137,80,78,71,13,10,26,10])], { type: 'image/png' }));
  await app.validateEvidencePhoto(new Blob([Uint8Array.from([255,216,255,224])], { type: 'image/jpeg' }));
  await app.validateEvidencePhoto(new Blob(['RIFF0000WEBP'], { type: 'image/webp' }));
});

test('location preserves device accuracy and requests a fresh high-accuracy reading', async () => {
  const result = await app.readDeviceLocation({ getCurrentPosition(success, failure, options) {
    assert.deepEqual(options, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
    success({ coords: { latitude: 14.2, longitude: 121.1, accuracy: 17.5 } });
  } });
  assert.deepEqual(result, { latitude: 14.2, longitude: 121.1, accuracy_m: 17.5 });
});

test('location denial, timeout, unavailable hardware and invalid coordinates have actionable errors', async () => {
  await assert.rejects(app.readDeviceLocation(undefined), /not supported/);
  for (const [code, message] of [[1, /permission was denied/], [2, /unavailable/], [3, /timed out/]]) {
    await assert.rejects(app.readDeviceLocation({ getCurrentPosition(success, failure) { failure({ code }); } }), message);
  }
  await assert.rejects(app.readDeviceLocation({ getCurrentPosition(success) { success({ coords: { latitude: 91, longitude: 121, accuracy: 1 } }); } }), /invalid coordinates/);
});

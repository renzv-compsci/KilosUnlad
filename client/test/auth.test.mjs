import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import 'fake-indexeddb/auto';

// The transport and JWTs below are synthetic: these tests do not prove backend authentication.
const bundled = await build({
  stdin: { contents: `
    export * from './src/services/authSession';
    export * from './src/services/api';
    export * from './src/types/permissions';
    export * from './src/services/indexedDB';
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

test('dispatch puts assignments before collapsed staff details and identifies sample data', () => {
  const html = app.renderToStaticMarkup(app.createElement(app.AdminDispatchManager, { onSelectHousehold: () => {} }));
  assert.match(html, /Sample data/);
  assert.ok(html.indexOf('dispatch-list-heading') < html.indexOf('staff-disclosure'));
  assert.match(html, /<details class="staff-disclosure">/);
  assert.match(html, /<summary>Assignment details<\/summary>/);
  assert.doesNotMatch(html, /Manage \/ Reassign/);
  assert.match(html, /Select Household/);
  assert.equal((html.match(/disabled="" aria-describedby="reassign-status-/g) ?? []).length, 3);
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

test('dashboard separates live workload from samples and has one analytics selector', () => {
  const render = (triageCount) => app.renderToStaticMarkup(app.createElement(app.Screen2Dashboard, { onNavigateToScreen() {}, triageCount }));
  const html = render(2);
  assert.match(html, /<strong>2<\/strong><span>cases awaiting review/);
  assert.match(html, /Regional snapshot/);
  assert.match(html, /Sample data/);
  assert.match(html, /<article id="metric-active-beneficiaries"/);
  assert.doesNotMatch(html, /Filter Triage Queue for/);
  assert.match(render(0), /<strong>0<\/strong><span>cases awaiting review/);
  assert.match(render(undefined), /Live queue count unavailable/);
  assert.match(html, /<section class="sample-analytics-section"/);
  assert.doesNotMatch(html, /sample-analytics-disclosure/);
  assert.ok(html.indexOf('live-workload-title') < html.indexOf('sample-analytics-section'));
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
  assert.ok(html.indexOf('metric-visual-deck') < html.indexOf('live-queue-preview'));
  assert.ok(html.indexOf('live-queue-preview') < html.indexOf('geography-section'));
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
  assert.doesNotMatch(render(true), /Preview Dispatch/);
});

test('policy settings clearly identifies non-persistent previews', () => {
  const html = app.renderToStaticMarkup(app.createElement(app.AdminSettingsView));
  assert.match(html, /Changes are not applied to the system/);
  assert.match(html, /Preview Parameters/);
  assert.doesNotMatch(html, /Save Administrative Parameters/);
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
function reject(status, code) {
  app.api.defaults.adapter = async (config) => {
    throw { isAxiosError: true, config, response: { status, data: { error: { code } } } };
  };
}
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
  assert.doesNotMatch(render(true), /Preview Dispatch/);
  assert.match(render(true), /Read-only/);
  assert.match(render(false), /Preview Dispatch/);
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

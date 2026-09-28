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
    export { createElement } from 'react';
    export { renderToStaticMarkup } from 'react-dom/server.browser';
  `, resolveDir: process.cwd(), loader: 'ts' },
  bundle: true, write: false, format: 'esm', platform: 'browser',
  define: { 'import.meta.env.VITE_API_URL': '"http://localhost:5000/api/v1"', 'process.env.NODE_ENV': '"test"' },
});
const app = await import(`data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].text).toString('base64')}`);
const values = new Map();
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
  assert.doesNotMatch(render(true), /Dispatch Task/);
  assert.match(render(true), /Read-only/);
  assert.match(render(false), /Dispatch Task/);
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
  assert.match(first, /Page 1 of 2/); assert.match(first, /11<\/span> total records/);
  assert.match(first, /aria-label="Previous page"[^>]*disabled/);
  assert.doesNotMatch(first, /aria-label="Next page"[^>]*disabled/);
  assert.match(last, /aria-label="Next page"[^>]*disabled/);
  assert.match(empty, /Page 1 of 1/);
});

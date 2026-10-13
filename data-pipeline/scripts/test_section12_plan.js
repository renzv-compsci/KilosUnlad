/**
 * test_section12_plan.js
 * Section 12.2 test plan (Software Testing): executes the API-level test cases
 * TC-01..TC-06, TC-08..TC-10, TC-13 and TC-15 against the running stack, as
 * written in the plan, and records what the system actually returned.
 * TC-07, TC-11, TC-12, TC-14, TC-16 and TC-17 reuse the existing sprint scripts
 * (see run_section12_plan.sh).
 *
 * Prerequisites:
 * 1. Stack running; reset_demo.sh, then add_int02_case_a_fixture.js
 *    (DEMO-4PS-GRAD-0001 ACTIVE_COMPLIANT, empty audit ledger).
 * 2. JWT_SECRET equal to the server's (only used to mint an already-expired
 *    token for TC-02); MONGO_URI readable from the host; server/node_modules.
 * 3. Client at CLIENT_URL; `npm install playwright-core` on NODE_PATH; Chromium.
 *
 * Usage: JWT_SECRET=... node data-pipeline/scripts/test_section12_plan.js
 *   EVIDENCE_JSON=<file> also writes every observed value as JSON.
 * Not re-runnable without a reset (TC-05 dispatches Case A).
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const ROOT = path.resolve(__dirname, '../..');
const { MongoClient } = require(path.join(ROOT, 'server/node_modules/mongodb'));
const jwt = require(path.join(ROOT, 'server/node_modules/jsonwebtoken'));

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000/api/v1';
const ML_URL = process.env.ML_URL || 'http://localhost:8000';
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';
const CHROMIUM_PATH = process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium';
const MONGO_URI = process.env.MONGO_URI ||
  'mongodb://app_user:AppUserPassword2026!@localhost:27017/kilosunlad?authSource=kilosunlad&directConnection=true';
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(ROOT, 'server/uploads');
const CASE_A = 'DEMO-4PS-GRAD-0001';
const HOME = { lat: 14.2215, lon: 121.1875 }; // Case A stored coordinates
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');

const results = [];
let current;
function tc(id, title) { current = { id, title, checks: [], observed: {} }; results.push(current); console.log(`\n[${id}] ${title}`); }
function check(label, condition, detail) {
  current.checks.push({ label, pass: !!condition });
  if (condition) console.log(`   [OK]   ${label}`);
  else console.error(`   [FAIL] ${label}`, detail === undefined ? '' : JSON.stringify(detail));
}
const observe = (key, value) => { current.observed[key] = value; };

async function call(method, url, { token, body, form } = {}) {
  const started = performance.now();
  const res = await fetch(url, { method,
    headers: { ...(form ? {} : { 'Content-Type': 'application/json' }), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: form || (body === undefined ? undefined : JSON.stringify(body)) });
  return { status: res.status, ms: +(performance.now() - started).toFixed(1), data: await res.json().catch(() => null) };
}
const api = (method, p, opts) => call(method, `${BASE_URL}${p}`, opts);
const login = (username, password) => api('POST', '/auth/login', { body: { username, password } });
const claimsOf = token => JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString());
function metres(lat1, lon1, lat2, lon2) {
  const r = d => d * Math.PI / 180;
  const a = Math.sin(r(lat2 - lat1) / 2) ** 2 + Math.cos(r(lat1)) * Math.cos(r(lat2)) * Math.sin(r(lon2 - lon1) / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function submission(taskId, { lat = HOME.lat, bytes = PNG } = {}) {
  const hash = crypto.createHash('sha256').update(PNG).digest('hex'); // declared fingerprint of the original photo
  const form = new FormData();
  const fields = {
    task_id: taskId, household_id: CASE_A, verified_swdi_level: '3', worker_recommendation: 'RECOMMEND_GRADUATION',
    narrative_report: 'TC plan: MoveIt motorcycle verified; LandBank card in the mother\'s custody.',
    livelihood_asset_verification: JSON.stringify({ is_motorcycle_present: true, is_productive_asset: true, proof_type: 'MOVEIT', franchise_number: '' }),
    landbank_card_inspection: JSON.stringify({ physical_card_presented: true, card_matches_beneficiary: true, pawning_suspected: false }),
    client_geolocation: JSON.stringify({ latitude: lat, longitude: HOME.lon, accuracy_meters: 8, captured_at: new Date().toISOString() }),
    evidence_attachments: JSON.stringify([{ media_type: 'image/png', storage_url: `${BASE_URL}/evidence/${hash}`, sha256_hash: hash,
      exif_metadata: { timestamp: new Date().toISOString(), latitude: lat, longitude: HOME.lon } }])
  };
  for (const [k, v] of Object.entries(fields)) form.append(k, v);
  form.append('evidence_files', new Blob([bytes], { type: 'image/png' }), 'evidence.png');
  return { form, hash };
}

async function run() {
  console.log('[START] Section 12.2 test plan (API cases)');
  if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET (the server\'s) is required to mint the TC-02 expired token.');
  const mongo = await MongoClient.connect(MONGO_URI);
  const db = mongo.db('kilosunlad');
  const counts = async () => ({ tasks: await db.collection('verification_tasks').countDocuments(),
    audits: await db.collection('audit_logs').countDocuments() });

  try {
    tc('TC-01', 'User Authentication & Role Scoping');
    const dir = await login('director_test', 'DirectorTest2026!');
    const director = dir.data?.access_token;
    const header = director && JSON.parse(Buffer.from(director.split('.')[0], 'base64url').toString());
    const claims = director && claimsOf(director);
    observe('login', { status: dir.status, token_type: dir.data?.token_type, expires_in_seconds: dir.data?.expires_in_seconds,
      alg: header?.alg, lifetime_s: claims && claims.exp - claims.iat, role: claims?.role, jurisdiction: claims?.jurisdiction });
    check('valid credentials -> 200 with Bearer token', dir.status === 200 && dir.data.token_type === 'Bearer', dir);
    check('token is HS256 with a 900 s lifetime', header?.alg === 'HS256' && claims.exp - claims.iat === 900, { header, claims });
    check('token carries role and jurisdiction', claims?.role === 'REGIONAL_DIRECTOR' && claims?.jurisdiction?.municipality === 'Calamba', claims);
    const out = await api('GET', '/beneficiaries/triage-queue?municipality=Santa%20Rosa', { token: director });
    observe('out_of_scope_query', { request: 'GET /beneficiaries/triage-queue?municipality=Santa Rosa (Calamba director)', status: out.status, code: out.data?.error?.code });
    check('out-of-scope municipal query -> 403 OUT_OF_JURISDICTION', out.status === 403 && out.data?.error?.code === 'OUT_OF_JURISDICTION', out);

    tc('TC-02', 'Invalid Credentials & Token Expiry');
    const bad = await login('director_test', 'WrongPassword!');
    observe('bad_password', { status: bad.status, code: bad.data?.error?.code });
    check('incorrect password -> 401 INVALID_CREDENTIALS', bad.status === 401 && bad.data?.error?.code === 'INVALID_CREDENTIALS', bad);
    const now = Math.floor(Date.now() / 1000);
    const expired = jwt.sign({ ...claims, iat: now - 1000, exp: now - 100 }, process.env.JWT_SECRET, { algorithm: 'HS256' });
    const exp = await api('GET', '/beneficiaries/triage-queue', { token: expired });
    observe('expired_token', { token_age_s: 1000, status: exp.status, code: exp.data?.error?.code, message: exp.data?.error?.message });
    check('token past its 900 s window -> 401 TOKEN_EXPIRED', exp.status === 401 && exp.data?.error?.code === 'TOKEN_EXPIRED', exp);
    let chromium;
    try { ({ chromium } = require('playwright-core')); } catch { chromium = null; }
    check('playwright-core available for the client-session check', !!chromium);
    if (chromium) {
      const browser = await chromium.launch({ executablePath: CHROMIUM_PATH });
      try {
        const page = await browser.newPage();
        await page.goto(CLIENT_URL);
        await page.fill('#login-username-input', 'director_test');
        await page.fill('#login-password-input', 'DirectorTest2026!');
        await page.click('#login-submit-btn');
        await page.getByRole('button', { name: /15-Day Due Process/ }).first().waitFor({ timeout: 10000 });
        // Replace the stored token with the expired one (same claims, exp in the past).
        await page.evaluate(token => {
          const s = JSON.parse(sessionStorage.getItem('kilosunlad_session'));
          s.access_token = token;
          sessionStorage.setItem('kilosunlad_session', JSON.stringify(s));
          sessionStorage.setItem('kilosunlad_access_token', token);
        }, expired);
        await page.getByRole('button', { name: /15-Day Due Process/ }).first().click();
        await page.locator('#login-username-input').waitFor({ timeout: 10000 });
        const left = await page.evaluate(() => [sessionStorage.getItem('kilosunlad_session'), sessionStorage.getItem('kilosunlad_access_token')]);
        observe('client_after_expiry', { login_screen_shown: true, stored_session: left });
        check('client cleared the session and returned to the login screen', left.every(v => v === null), left);
      } finally { await browser.close(); }
    }

    tc('TC-03', 'Proxy-Means SWDI Classification');
    const features = { head_education_level: 3, head_formal_employment: 1, remittance_income_flag: 0,
      housing_material_score: 3, appliance_density_index: 2.0, dependency_ratio: 2.0 }; // Demo Case A
    const p = await call('POST', `${ML_URL}/api/v1/predict-swdi`, { body: { household_id: CASE_A, household_size: 6, demographics: features } });
    const ev = p.data?.ml_evaluation;
    observe('request_features', features);
    observe('response', { status: p.status, latency_ms: p.ms, predicted_swdi_level: ev?.predicted_swdi_level,
      class_probabilities: ev?.class_probabilities, shap_explainability: ev?.shap_explainability });
    check('200 with SWDI tier 1, 2 or 3', p.status === 200 && [1, 2, 3].includes(ev?.predicted_swdi_level), p);
    const probs = Object.values(ev?.class_probabilities || {});
    check('three class probabilities summing to 1', probs.length === 3 && Math.abs(probs.reduce((a, b) => a + b, 0) - 1) < 1e-6, ev?.class_probabilities);
    const shap = ev?.shap_explainability || [];
    check('signed SHAP attributions returned, ranked by |weight|', shap.length >= 2 &&
      shap.every((s, i) => i === 0 || Math.abs(shap[i - 1].contribution_weight) >= Math.abs(s.contribution_weight)), shap);
    check('response within 2500 ms', p.ms < 2500, p.ms);

    tc('TC-15', 'Sangla-ATM Telemetry Anomaly Detection');
    const base = Date.parse('2026-09-05T02:10:00Z');
    const txns = Array.from({ length: 12 }, (_, i) => ({ transaction_id: `TXN-TC15-${i + 1}`,
      card_masked_pan: `5044-xxxx-xxxx-${String(1000 + i)}`, household_id: `4PS-04A-2026-${String(100 + i).padStart(5, '0')}`,
      timestamp: new Date(base + i * 38000).toISOString().replace('.000', ''), amount_php: 4000.0 })); // 12 swipes in 418 s
    const atm = await call('POST', `${ML_URL}/api/v1/score-atm-stream`, { body: { terminal_id: 'ATM-LBP-CAL-03',
      terminal_metadata: { bank_network: 'LANDBANK', location_name: 'LBP Calamba Branch - Outside Lobby', municipality: 'Calamba',
        province: 'Laguna', coordinates: [121.1578, 14.211] },
      window_start_time: '2026-09-05T02:00:00Z', window_end_time: '2026-09-05T02:30:00Z', transactions: txns } });
    const w = atm.data?.window_evaluation;
    observe('batch', { transactions: 12, first: txns[0].timestamp, last: txns[11].timestamp, span_seconds: 11 * 38 });
    observe('response', { status: atm.status, is_anomalous_batch: w?.is_anomalous_batch, sangla_atm_risk_score: w?.sangla_atm_risk_score,
      avg_interval_seconds: w?.cluster_metrics?.avg_interval_seconds, nocturnal_window_flag: w?.cluster_metrics?.nocturnal_window_flag,
      flagged_households: w?.flagged_household_ids?.length });
    check('is_anomalous_batch true', atm.status === 200 && w?.is_anomalous_batch === true, atm);
    check('risk score 85.0 / 100', w?.sangla_atm_risk_score === 85.0, w);

    tc('TC-04', 'Multi-Factor Discrepancy Flagging');
    const before = await db.collection('beneficiaries').findOne({ household_id: CASE_A }, { projection: { program_status: 1, enrolled_swdi_level: 1 } });
    const a = await api('POST', `/beneficiaries/${CASE_A}/assess`, { token: director, body: {} });
    observe('household', { household_id: CASE_A, enrolled_swdi_level: before?.enrolled_swdi_level, status_before: before?.program_status,
      power_kwh: 285, vehicle: 'PASSENGER_4W, owned', water_cu_m: 32, telecom: 'POSTPAID' });
    observe('response', { status: a.status, predicted_swdi_level: a.data?.predicted_swdi_level, composite_risk_score: a.data?.composite_risk_score,
      score_breakdown: a.data?.score_breakdown, is_flagged: a.data?.is_flagged, program_status: a.data?.program_status,
      trigger_badges: a.data?.trigger_badges?.map(b => b.code), evaluation_mode: a.data?.evaluation_mode });
    check('enrolled Level 1, predicted Level 3', before?.enrolled_swdi_level === 1 && a.data?.predicted_swdi_level === 3, a.data);
    check('composite risk score S_i >= 70', a.status === 200 && a.data.composite_risk_score >= 70, a.data);
    check('status FLAGGED_FOR_REVIEW', a.data?.program_status === 'FLAGGED_FOR_REVIEW', a.data);
    const queue = await api('GET', '/beneficiaries/triage-queue', { token: director });
    const inQueue = (queue.data?.items || queue.data?.data || []).find?.(i => i.household_id === CASE_A);
    observe('triage_queue', { status: queue.status, listed: !!inQueue, score: inQueue?.composite_risk_score });
    check('household appears in the triage queue with the same score', inQueue && inQueue.composite_risk_score === a.data.composite_risk_score, queue.data);

    tc('TC-05', 'Atomic Task Dispatch Transaction');
    const wk = await login('case_worker_test', 'CaseWorkerTest2026!');
    const auditorLogin = await login('auditor_test', 'AuditorTest2026!');
    const dispatchBody = worker => ({ household_id: CASE_A, assigned_worker_id: worker, priority: 'HIGH',
      assignment_notes: 'Verify MoveIt delivery asset and LandBank cash card.', due_date: '2026-10-24T23:59:59.000Z' });
    const c0 = await counts();
    const invalid = await api('POST', '/tasks/dispatch', { token: director, body: dispatchBody(auditorLogin.data.user.user_id) });
    const c1 = await counts();
    observe('rollback_probe', { request: 'dispatch to a non-CASE_WORKER user', status: invalid.status, code: invalid.data?.error?.code, writes: { before: c0, after: c1 } });
    check('failing dispatch writes nothing (transaction rolled back)', invalid.status === 400 && JSON.stringify(c0) === JSON.stringify(c1), { invalid, c0, c1 });
    const d = await api('POST', '/tasks/dispatch', { token: director, body: dispatchBody(wk.data.user.user_id) });
    const task = await db.collection('verification_tasks').findOne({ task_id: d.data?.task_id });
    const hh = await db.collection('beneficiaries').findOne({ household_id: CASE_A });
    const block = await db.collection('audit_logs').findOne({ action: 'TASK_DISPATCHED', sequence_index: d.data?.audit_receipt?.sequence_index,
      'target_entity.entity_id': CASE_A });
    observe('response', { status: d.status, task_id: d.data?.task_id, household_status: d.data?.household_status, audit_receipt: d.data?.audit_receipt });
    observe('database', { task_status: task?.task_status, priority: task?.priority, beneficiary_status: hh?.program_status,
      audit_sequence: block?.sequence_index, audit_hash: block?.entry_hash, writes_after: await counts() });
    check('201 Created', d.status === 201, d);
    check('VerificationTask created PENDING_DISPATCH', task?.task_status === 'PENDING_DISPATCH', task);
    check('Beneficiary UNDER_INVESTIGATION', hh?.program_status === 'UNDER_INVESTIGATION', hh?.program_status);
    check('TASK_DISPATCHED block hash equals the receipt', block && block.entry_hash === d.data.audit_receipt?.entry_hash, { block, receipt: d.data?.audit_receipt });

    tc('TC-06', 'Duplicate Task Dispatch Prevention');
    const c2 = await counts();
    const dup = await api('POST', '/tasks/dispatch', { token: director, body: dispatchBody(wk.data.user.user_id) });
    const c3 = await counts();
    observe('response', { status: dup.status, code: dup.data?.error?.code, writes: { before: c2, after: c3 } });
    check('409 ACTIVE_TASK_EXISTS', dup.status === 409 && dup.data?.error?.code === 'ACTIVE_TASK_EXISTS', dup);
    check('no duplicate task and no second audit entry', JSON.stringify(c2) === JSON.stringify(c3), { c2, c3 });

    const worker = wk.data.access_token;
    const taskId = d.data.task_id;
    tc('TC-09', 'In-Browser Photo Hashing & File Integrity');
    const { hash } = submission(taskId);
    observe('declared_sha256', hash);
    const altered = Buffer.from(PNG); altered[altered.length - 5] ^= 0xff;
    const c4 = await counts();
    const mism = await api('POST', `/tasks/${taskId}/submit`, { token: worker, form: submission(taskId, { bytes: altered }).form });
    observe('altered_bytes', { status: mism.status, code: mism.data?.error?.code, writes_unchanged: JSON.stringify(c4) === JSON.stringify(await counts()) });
    check('64-character SHA-256 fingerprint', /^[a-f0-9]{64}$/.test(hash));
    check('modified bytes -> 422 EVIDENCE_HASH_MISMATCH', mism.status === 422 && mism.data?.error?.code === 'EVIDENCE_HASH_MISMATCH', mism);
    const hasher = fs.readFileSync(path.join(ROOT, 'client/src/utils/photoHasher.ts'), 'utf8');
    check('client hashes photos with the Web Crypto API (crypto.subtle.digest SHA-256)', /crypto\.subtle\.digest\('SHA-256'/.test(hasher));

    tc('TC-08', 'Hardware Geolocation Boundary Check');
    const far = HOME.lat + 0.0036;
    const farM = metres(HOME.lat, HOME.lon, far, HOME.lon);
    const c5 = await counts();
    const g = await api('POST', `/tasks/${taskId}/submit`, { token: worker, form: submission(taskId, { lat: far }).form });
    observe('outside', { distance_m: +farM.toFixed(1), status: g.status, code: g.data?.error?.code,
      writes_unchanged: JSON.stringify(c5) === JSON.stringify(await counts()) });
    check(`submission ${farM.toFixed(0)} m away is not accepted as matched (422 GEOFENCE_VIOLATION)`, g.status === 422 && g.data?.error?.code === 'GEOFENCE_VIOLATION', g);
    const near = HOME.lat + 0.0001124;
    const ok = await api('POST', `/tasks/${taskId}/submit`, { token: worker, form: submission(taskId, { lat: near }).form });
    observe('inside', { distance_m: +metres(HOME.lat, HOME.lon, near, HOME.lon).toFixed(1), status: ok.status,
      geofence_verification: ok.data?.geofence_verification });
    check('submission ~12.5 m away -> 200, is_matched true', ok.status === 200 && ok.data?.geofence_verification?.is_matched === true, ok);

    tc('TC-10', 'Offline Batch Sync Reconnection (server side)');
    const t2 = await db.collection('verification_tasks').findOne({ task_id: taskId });
    const stored = path.join(UPLOAD_DIR, 'evidence', hash);
    const storedHash = fs.existsSync(stored) && crypto.createHash('sha256').update(fs.readFileSync(stored)).digest('hex');
    observe('database', { task_status: t2?.task_status, evidence_path: path.relative(ROOT, stored), stored_bytes_sha256: storedHash,
      audit_receipt: ok.data?.audit_receipt });
    check('task status SUBMITTED', t2?.task_status === 'SUBMITTED', t2?.task_status);
    check('photo binary saved to persistent storage and still matches its hash', storedHash === hash, { stored, storedHash });

    tc('TC-13', 'Cryptographic Chain Verification');
    const auditor = auditorLogin.data.access_token;
    const n = await db.collection('audit_logs').countDocuments();
    const v = await api('GET', `/audit/verify-chain?start_sequence=1&end_sequence=${n}`, { token: auditor });
    const blocks = await db.collection('audit_logs').find({}, { projection: { _id: 0, sequence_index: 1, action: 1, 'target_entity.entity_id': 1 } })
      .sort({ sequence_index: 1 }).toArray();
    observe('ledger', blocks.map(b => `${b.sequence_index} ${b.action} ${b.target_entity.entity_id}`));
    observe('response', { range: `1..${n}`, status: v.status, is_chain_valid: v.data?.is_chain_valid,
      total_blocks_verified: v.data?.total_blocks_verified, head_hash: v.data?.head_hash });
    check(`range 1..${n} -> 200 is_chain_valid true`, v.status === 200 && v.data?.is_chain_valid === true && v.data?.total_blocks_verified === n, v);
    const w2 = await api('GET', `/audit/verify-chain?start_sequence=1&end_sequence=${n}`, { token: worker });
    check('field worker cannot run the verifier (403)', w2.status === 403, w2);
  } finally { await mongo.close(); }

  if (process.env.EVIDENCE_JSON) fs.writeFileSync(process.env.EVIDENCE_JSON, JSON.stringify(results, null, 2));
  const failed = results.filter(r => r.checks.some(c => !c.pass));
  console.log(`\n${results.length - failed.length}/${results.length} test cases passed every check.`);
  if (failed.length) { console.error(`[FAIL] SECTION 12 PLAN: ${failed.map(f => f.id).join(', ')}`); process.exit(1); }
  console.log('[SUCCESS] SECTION 12 PLAN (API cases) PASSED!');
}
run().catch(error => {
  if (process.env.EVIDENCE_JSON) fs.writeFileSync(process.env.EVIDENCE_JSON, JSON.stringify(results, null, 2));
  console.error('\n[FAIL] SECTION 12 PLAN FAILED!\nError:', error.message); process.exit(1);
});

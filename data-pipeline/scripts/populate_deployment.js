/**
 * populate_deployment.js
 * Builds the activity of the deployment dataset through the public API only (every guard
 * applies; nothing is written to the database directly):
 *   1. Assesses SYN- households barangay by barangay (round robin) with the ML model until
 *      FLAG_TARGET households are flagged (the model and the published rules decide; each flag
 *      is sealed as MODEL_FLAG_RAISED). Stops at FLAG_TARGET, never above FLAG_MAX.
 *   2. Dispatches up to DISPATCH flagged households, each to an active caseworker who covers its
 *      barangay (GET /users/caseworkers), spread across caseworkers.
 *   3. The assigned caseworkers submit SUBMIT field reports with a geotagged photo taken at the
 *      household's registered coordinates (half recommend graduation, half retention).
 *   4. The director decides two of them: one notice of ineligibility (DECISION-011) and one
 *      retention (DECISION-012). The rest stay "report submitted" for live review.
 *   5. Prints the dashboard totals and verifies the whole ledger.
 *
 * Prerequisites: stack running; load_deployment_data.sh steps 1-3 done (20k households,
 * test accounts, field staff). Usage: node data-pipeline/scripts/populate_deployment.js
 * Env: BASE_URL (default http://localhost:5000/api/v1), FLAG_TARGET (32), FLAG_MIN (25),
 *      FLAG_MAX (40), DISPATCH (12), SUBMIT (4), STAFF_PASSWORD (FieldStaff2026!)
 */
const crypto = require('crypto');
const zlib = require('zlib');

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000/api/v1';
const FLAG_TARGET = Number(process.env.FLAG_TARGET || 32);
const FLAG_MIN = Number(process.env.FLAG_MIN || 25);
const FLAG_MAX = Number(process.env.FLAG_MAX || 40);
const DISPATCH = Number(process.env.DISPATCH || 12);
const SUBMIT = Number(process.env.SUBMIT || 4);
const STAFF_PASSWORD = process.env.STAFF_PASSWORD || 'FieldStaff2026!';
const PASSWORDS = { case_worker_test: 'CaseWorkerTest2026!' };
const DAY = 86400000;

async function call(method, p, { token, body, form } = {}) {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(`${BASE_URL}${p}`, { method,
      headers: { ...(form ? {} : { 'Content-Type': 'application/json' }), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: form ?? (body === undefined ? undefined : JSON.stringify(body)) });
    const data = await res.json().catch(() => null);
    if ((res.status === 503 || res.status === 502 || data?.error?.code === 'WORKFLOW_CONFLICT') && attempt < 4) {
      await new Promise(r => setTimeout(r, 300 * (attempt + 1))); continue;
    }
    return { status: res.status, data };
  }
}
const login = async (username, password) => (await call('POST', '/auth/login', { body: { username, password } })).data?.access_token;

// A small, unique, valid PNG so every report stores its own content-addressed photo.
function photo() {
  const chunk = (t, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]);
    const c = Buffer.alloc(4); c.writeUInt32BE(zlib.crc32(td) >>> 0); return Buffer.concat([l, td, c]); };
  const h = Buffer.alloc(13); h.writeUInt32BE(2, 0); h.writeUInt32BE(2, 4); h[8] = 8; h[9] = 2;
  const rgb = crypto.randomBytes(3), row = Buffer.concat([Buffer.from([0]), rgb, rgb]);
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', h),
    chunk('IDAT', zlib.deflateSync(Buffer.concat([row, row]))), chunk('IEND', Buffer.alloc(0))]);
}

async function listAll(token, query, max = 5000) {
  const items = [];
  for (let page = 1; items.length < max; page++) {
    const r = await call('GET', `/beneficiaries/triage-queue?${query}&limit=100&page=${page}`, { token });
    if (r.status !== 200) throw new Error(`triage-queue ${query}: ${r.status} ${r.data?.error?.code}`);
    items.push(...r.data.items);
    if (page >= (r.data.pagination?.total_pages || 0)) break;
  }
  return items;
}

(async () => {
  console.log('[START] Deployment dataset activity through the API\n');
  let admin = await login('super_admin_test', 'SuperAdminTest2026!');
  let director = await login('director_test', 'DirectorTest2026!');
  if (!admin || !director) throw new Error('Login failed: run load_deployment_data.sh (accounts) first.');
  const refresh = async () => { admin = await login('super_admin_test', 'SuperAdminTest2026!'); director = await login('director_test', 'DirectorTest2026!'); };

  // ---- 1. Assess until the model has flagged FLAG_TARGET households ---------------------
  console.log(`[1] Assessing households until ${FLAG_TARGET} are flagged by the model...`);
  const already = (await listAll(director, 'status=FLAGGED_FOR_REVIEW')).length;
  const caseworkers = (await call('GET', '/users/caseworkers', { token: director })).data?.items || [];
  const barangays = [...new Set(caseworkers.flatMap(w => w.jurisdiction.assigned_barangays))].sort();
  // A spread sample per barangay: every k-th household of the ACTIVE_COMPLIANT list, SYN- only.
  const queues = {};
  for (const b of barangays) {
    const all = (await listAll(admin, `status=ACTIVE_COMPLIANT&barangay=${encodeURIComponent(b)}`, 20000))
      .filter(h => h.household_id.startsWith('SYN-'));
    const step = Math.max(1, Math.floor(all.length / 400));
    queues[b] = all.filter((_, i) => i % step === 0);
  }
  let flagged = already, assessed = 0, fallback = 0;
  const tally = Object.fromEntries(barangays.map(b => [b, 0]));
  while (flagged < FLAG_TARGET && barangays.some(b => queues[b].length)) {
    for (const b of barangays) {
      if (flagged >= FLAG_TARGET || !queues[b].length) continue;
      const h = queues[b].shift();
      const r = await call('POST', `/beneficiaries/${encodeURIComponent(h.household_id)}/assess`, { token: admin, body: {} });
      if (r.status !== 200) throw new Error(`assess ${h.household_id}: ${r.status} ${r.data?.error?.code}`);
      assessed++;
      if (r.data.evaluation_mode !== 'ML_MODEL') fallback++;
      if (r.data.is_flagged) { flagged++; tally[b]++; }
      if (assessed % 200 === 0) await refresh();
    }
  }
  console.log(`    assessed ${assessed}, flagged ${flagged - already} (by barangay ${JSON.stringify(tally)}), rule fallback ${fallback}\n`);

  // ---- 2. Dispatch to caseworkers who cover each barangay --------------------------------
  console.log('[2] Dispatching flagged households to caseworkers in their barangay...');
  await refresh();
  const flaggedList = (await listAll(director, 'status=FLAGGED_FOR_REVIEW')).filter(h => h.household_id.startsWith('SYN-'))
    .sort((a, b) => b.composite_risk_score - a.composite_risk_score);
  const perBarangay = Object.fromEntries(barangays.map(b => [b, flaggedList.filter(h => h.address.barangay === b)]));
  const picks = [];
  while (picks.length < DISPATCH && barangays.some(b => perBarangay[b].length)) {
    for (const b of barangays) if (picks.length < DISPATCH && perBarangay[b].length) picks.push(perBarangay[b].shift());
  }
  const load = Object.fromEntries(caseworkers.map(w => [w.user_id, 0]));
  const tasks = [];
  for (const [i, h] of picks.entries()) {
    const eligible = caseworkers.filter(w => w.jurisdiction.assigned_barangays.includes(h.address.barangay))
      .sort((a, b) => load[a.user_id] - load[b.user_id]);
    if (!eligible.length) throw new Error(`No caseworker covers ${h.address.barangay}`);
    const w = eligible[0];
    const score = h.composite_risk_score;
    const r = await call('POST', '/tasks/dispatch', { token: director, body: { household_id: h.household_id,
      assigned_worker_id: w.user_id, priority: score >= 90 ? 'CRITICAL' : score >= 80 ? 'HIGH' : 'MEDIUM',
      assignment_notes: `Verify the flagged indicators (score ${score}): utility meters, vehicles and living conditions.`,
      due_date: new Date(Date.now() + (4 + (i % 10)) * DAY).toISOString() } });
    if (r.status !== 201) throw new Error(`dispatch ${h.household_id}: ${r.status} ${r.data?.error?.code}`);
    load[w.user_id]++;
    tasks.push({ task_id: r.data.task_id, household: h, worker: w });
  }
  console.log(`    ${tasks.length} dispatched: ${caseworkers.filter(w => load[w.user_id]).map(w => `${w.full_name} ${load[w.user_id]}`).join(', ')}\n`);

  // ---- 3. Caseworkers submit geotagged reports -------------------------------------------
  console.log(`[3] Caseworkers submit ${SUBMIT} field reports with a geotagged photo...`);
  const submitted = [];
  for (const [i, t] of tasks.slice(0, SUBMIT).entries()) {
    const token = await login(t.worker.username, PASSWORDS[t.worker.username] || STAFF_PASSWORD);
    if (!token) throw new Error(`Cannot sign in as ${t.worker.username}`);
    const [lng, lat] = t.household.address.coordinates;
    const graduate = i % 2 === 0;
    const bytes = photo();
    const hash = crypto.createHash('sha256').update(bytes).digest('hex');
    const at = new Date().toISOString();
    const form = new FormData();
    for (const [k, v] of Object.entries({ task_id: t.task_id, household_id: t.household.household_id,
      verified_swdi_level: graduate ? '3' : '2', worker_recommendation: graduate ? 'RECOMMEND_GRADUATION' : 'RETAIN',
      narrative_report: graduate ? 'Concrete house, owned vehicle and steady remittances observed; utility use above lifeline.'
        : 'No vehicle found; irregular seasonal income; utility use explained by a shared household meter.',
      livelihood_asset_verification: JSON.stringify({ is_motorcycle_present: false, is_productive_asset: false, proof_type: 'NONE', franchise_number: '' }),
      landbank_card_inspection: JSON.stringify({ physical_card_presented: true, card_matches_beneficiary: true, pawning_suspected: false }),
      client_geolocation: JSON.stringify({ latitude: lat, longitude: lng, accuracy_meters: 8, captured_at: at }),
      evidence_attachments: JSON.stringify([{ media_type: 'image/png', storage_url: `${BASE_URL}/evidence/${hash}`, sha256_hash: hash,
        exif_metadata: { timestamp: at, latitude: lat, longitude: lng } }]) })) form.append(k, v);
    form.append('evidence_files', new Blob([bytes], { type: 'image/png' }), 'evidence.png');
    const r = await call('POST', `/tasks/${t.task_id}/submit`, { token, form });
    if (r.status !== 200 && r.status !== 201) throw new Error(`submit ${t.task_id}: ${r.status} ${r.data?.error?.code}`);
    submitted.push({ ...t, graduate });
  }
  console.log(`    ${submitted.length} submitted (${submitted.filter(s => s.graduate).length} recommend graduation, ${submitted.filter(s => !s.graduate).length} retention)\n`);

  // ---- 4. Director decides two reports ----------------------------------------------------
  console.log('[4] Director decisions (one notice, one retention)...');
  await refresh();
  const toNotice = submitted.find(s => s.graduate);
  const toRetain = submitted.find(s => !s.graduate);
  if (toNotice) {
    const r = await call('POST', `/tasks/${toNotice.task_id}/resolve`, { token: director, body: { decision: 'APPROVED_GRADUATION',
      admin_notes: 'Field report and photo confirm Level 3: owned vehicle and steady remittances.' } });
    if (r.status !== 200) throw new Error(`resolve: ${r.status} ${r.data?.error?.code}`);
    console.log(`    notice issued: ${toNotice.household.head_of_household.full_name} (${toNotice.household.address.barangay})`);
  }
  if (toRetain) {
    const r = await call('POST', `/tasks/${toRetain.task_id}/retain`, { token: director, body: {
      admin_notes: 'Field report confirms Level 2: no vehicle, irregular income; household stays on the program.' } });
    if (r.status !== 200) throw new Error(`retain: ${r.status} ${r.data?.error?.code}`);
    console.log(`    kept on the program: ${toRetain.household.head_of_household.full_name} (${toRetain.household.address.barangay})`);
  }

  // ---- 5. Totals and ledger ------------------------------------------------------------------
  console.log('\n[5] Dashboard and ledger check...');
  const o = (await call('GET', '/insights/overview', { token: director })).data;
  const coa = await login('auditor_test', 'AuditorTest2026!');
  const head = (await call('GET', '/audit/blocks?limit=1', { token: coa })).data.items[0].sequence_index;
  const chain = (await call('GET', `/audit/verify-chain?start_sequence=1&end_sequence=${head}`, { token: coa })).data;
  const flaggedNow = o.risk.high_risk;
  console.log(`    households ${o.households.total}; flagged by the model (score >= 70) ${flaggedNow};`,
    `status ${JSON.stringify(o.households.by_status)}; tasks ${o.tasks.total}; ledger 1-${head} valid: ${chain.is_chain_valid}`);
  const ok = flaggedNow >= FLAG_MIN && flaggedNow <= FLAG_MAX && chain.is_chain_valid === true && fallback === 0;
  console.log(ok ? '\n[SUCCESS] Deployment dataset populated.' : `\n[FAILED] flagged ${flaggedNow} (want ${FLAG_MIN}-${FLAG_MAX}), chain ${chain.is_chain_valid}, fallback ${fallback}`);
  process.exit(ok ? 0 : 1);
})().catch(error => { console.error('[ERROR]', error.message); process.exit(1); });

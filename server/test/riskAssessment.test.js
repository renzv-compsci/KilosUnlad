const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const http = require('node:http');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { createApp } = require('../src/app');
const { createAuthService } = require('../src/services/auth.service');
const { createMlClient } = require('../src/services/mlClient.service');
const { createRiskAssessment } = require('../src/services/riskAssessment.service');
const { computeEntryHash } = require('../src/utils/cryptoHelper');
const { startReplicaSet } = require('./support/replicaSet');
const contract = require('../../docs/contracts/admin-web/admin-risk-assessment.json');

const PMT = { head_education_level: 3, head_formal_employment: 1, remittance_income_flag: 0,
  housing_material_score: 3, appliance_density_index: 2.0, dependency_ratio: 2.0 };

test('INT-05 POST /api/v1/beneficiaries/:household_id/assess against a disposable replica set', {
  skip: process.env.RUN_WORKFLOW_MONGO_TESTS !== '1', timeout: 120000
}, async t => {
  const { models } = await startReplicaSet(t, 'risk_assessment_test');
  const { users, beneficiaries, audits, externals } = models;

  // Stub ML service: level per household id; 'mode' switches to failure behaviours.
  let mode = 'ok';
  const levels = {};
  const ml = http.createServer(async (req, res) => {
    let body = ''; for await (const chunk of req) body += chunk;
    const { household_id } = JSON.parse(body);
    if (mode === 'error') { res.statusCode = 500; return res.end('{}'); }
    if (mode === 'garbage') { res.setHeader('Content-Type', 'application/json'); return res.end('{"nope":1}'); }
    const level = levels[household_id] || 1;
    const probabilities = { level_1_survival: level === 1 ? 0.9 : 0.05, level_2_subsistence: level === 2 ? 0.9 : 0.05,
      level_3_self_sufficiency: level === 3 ? 0.9 : 0.05 };
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ household_id, ml_evaluation: { predicted_swdi_level: level, class_probabilities: probabilities,
      shap_explainability: [
        { indicator: 'demographics.head_formal_employment', contribution_weight: 1.2, description: 'Formal employment.' },
        { indicator: 'demographics.housing_material_score', contribution_weight: 0.7, description: 'Housing.' },
        { indicator: 'demographics.dependency_ratio', contribution_weight: -0.2, description: 'Dependency.' }] },
      evaluated_at: new Date().toISOString() }));
  });
  await new Promise(resolve => ml.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => { ml.close(resolve); ml.closeAllConnections(); }));
  const liveMl = createMlClient({ baseURL: `http://127.0.0.1:${ml.address().port}` });
  const deadMl = createMlClient({ baseURL: 'http://127.0.0.1:9' });
  let mlClient = liveMl;
  const proxyMl = { predict: payload => mlClient.predict(payload) };

  const jurisdiction = { region: 'Region IV-A', province: 'Laguna', municipality: 'Calamba', assigned_barangays: ['Palingon'] };
  const password = 'Assess-test-password-2026!';
  const password_hash = await bcrypt.hash(password, 4);
  const makeUser = (username, role, j = jurisdiction) => users.create({ username, role, password_hash,
    full_name: username, email: `${username}@example.test`, is_active: true, jurisdiction: j });
  const director = await makeUser('director', 'REGIONAL_DIRECTOR');
  await makeUser('admin', 'SUPER_ADMIN', {});
  await makeUser('auditor', 'COA_AUDITOR', {});
  await makeUser('worker', 'CASE_WORKER');
  await makeUser('outsider', 'REGIONAL_DIRECTOR', { ...jurisdiction, assigned_barangays: ['Real'] });

  const secret = crypto.randomBytes(32).toString('hex');
  const app = createApp({ mockMode: false, production: true, authService: createAuthService({ users, secret }),
    riskAssessment: createRiskAssessment({ ...models, mlClient: proxyMl }) });
  const server = await new Promise(resolve => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); });
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}/api/v1`;
  const tokens = {};
  for (const username of ['director', 'admin', 'auditor', 'worker', 'outsider']) {
    const r = await fetch(`${base}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }) });
    tokens[username] = (await r.json()).access_token;
  }
  tokens.expired = jwt.sign({ userId: String(director._id), role: director.role,
    exp: Math.floor(Date.now() / 1000) - 60 }, secret, { algorithm: 'HS256' });
  const assess = (as, id, body = {}, raw) => fetch(`${base}/beneficiaries/${encodeURIComponent(id)}/assess`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', ...(as ? { Authorization: `Bearer ${tokens[as]}` } : {}) },
    body: raw ?? JSON.stringify(body) });

  // Raw inserts mirror ingestion: the 6 PMT features sit beside the declared demographics.
  async function seed(id, { status = 'ACTIVE_COMPLIANT', enrolled = 1, pmt = PMT, external, barangay = 'Palingon' } = {}) {
    await beneficiaries.collection.insertOne({ household_id: id,
      head_of_household: { first_name: 'Test', last_name: 'Household', national_id: `NID-${id}` },
      address: { province: 'Laguna', municipality: 'Calamba', barangay,
        coordinates: { type: 'Point', coordinates: [121.16, 14.21] } },
      demographics: { household_size: 6, dependents_ratio: 2.0, ...(pmt || {}) }, children_registry: [],
      enrolled_swdi_level: enrolled, program_status: status,
      risk_assessment: { composite_risk_score: 0, is_flagged: false, flag_reasons: [], trigger_badges: [] } });
    if (external !== null) {
      await externals.collection.insertOne({ matched_household_id: id, national_id: `NID-${id}`,
        power_utility: { avg_monthly_kwh: 120 }, water_utility: { avg_monthly_cu_m: 10 },
        telecom_registry: { contract_type: 'PREPAID_MOBILE' }, transport_registry: { vehicles: [] }, ...(external || {}) });
    }
  }
  const richExternal = { power_utility: { avg_monthly_kwh: 285 }, water_utility: { avg_monthly_cu_m: 32 },
    telecom_registry: { contract_type: 'POSTPAID' },
    transport_registry: { vehicles: [{ plate_number: 'ABC 123', vehicle_category: 'PASSENGER_4W', is_commercial_franchise: false }] } };
  async function rejected(response, status, code) {
    assert.equal(response.status, status);
    assert.equal((await response.json()).error.code, code);
  }
  async function noWrites(id, operation) {
    const before = [await audits.countDocuments(), await beneficiaries.findOne({ household_id: id }).lean()];
    await operation();
    assert.deepEqual([await audits.countDocuments(), await beneficiaries.findOne({ household_id: id }).lean()], before);
  }
  const sealed = log => computeEntryHash({ sequenceIndex: log.sequence_index, previousEntryHash: log.previous_entry_hash,
    timestamp: log.timestamp, actorId: log.actor.user_id, action: log.action, stateDelta: log.state_delta });

  await t.test('graduation drift: ML Level 3 vs enrolled 1 flags and seals MODEL_FLAG_RAISED', async () => {
    await seed('HH-A', { external: richExternal });
    levels['HH-A'] = 3;
    const r = await assess('director', 'HH-A');
    assert.equal(r.status, 200);
    assert.equal(r.headers.get('cache-control'), 'no-store');
    const d = await r.json();
    assert.deepEqual(Object.keys(d).sort(), Object.keys(contract.response.data).sort());
    assert.equal(d.evaluation_mode, 'ML_MODEL'); assert.equal(d.fallback_reason, null);
    assert.equal(d.predicted_swdi_level, 3); assert.equal(d.enrolled_swdi_level, 1);
    assert.deepEqual(d.contributions, contract.response.data.contributions);
    assert.equal(d.composite_risk_score, 100); assert.equal(d.is_flagged, true);
    assert.equal(d.program_status, 'FLAGGED_FOR_REVIEW');
    assert.deepEqual(d.trigger_badges.map(b => b.code), contract.response.data.trigger_badges.map(b => b.code));
    const stored = await beneficiaries.findOne({ household_id: 'HH-A' }).lean();
    assert.equal(stored.program_status, 'FLAGGED_FOR_REVIEW');
    assert.equal(stored.risk_assessment.composite_risk_score, 100);
    assert.equal(stored.risk_assessment.is_flagged, true);
    assert.equal(stored.risk_assessment.predicted_swdi_level, 3);
    assert.equal(stored.demographics.head_formal_employment, 1, 'PMT features must survive the risk_assessment write');
    const log = await audits.findOne({ sequence_index: d.audit_receipt.sequence_index }).lean();
    assert.equal(log.action, 'MODEL_FLAG_RAISED');
    assert.equal(log.state_delta.after.program_status, 'FLAGGED_FOR_REVIEW');
    assert.deepEqual(log.state_delta.after.related.contributions, d.contributions);
    assert.equal(log.state_delta.after.related.shap_explainability.length, 3);
    assert.equal(log.entry_hash, sealed(log));
    await noWrites('HH-A', async () => rejected(await assess('director', 'HH-A'), 409, 'HOUSEHOLD_NOT_ASSESSABLE'));
  });

  await t.test('below threshold: 200 result, nothing persisted, no audit block', async () => {
    await seed('HH-LOW');
    await noWrites('HH-LOW', async () => {
      const r = await assess('director', 'HH-LOW');
      assert.equal(r.status, 200);
      const d = await r.json();
      assert.equal(d.composite_risk_score, 0); assert.equal(d.is_flagged, false);
      assert.equal(d.program_status, 'ACTIVE_COMPLIANT'); assert.equal(d.audit_receipt, null);
    });
  });

  await t.test('ML down, error or malformed: EVALUATED_VIA_FALLBACK, utilities still score, no crash', async () => {
    await seed('HH-DOWN', { external: richExternal });
    mlClient = deadMl;
    try {
      const d = await (await assess('admin', 'HH-DOWN')).json();
      assert.equal(d.evaluation_mode, 'EVALUATED_VIA_FALLBACK'); assert.equal(d.fallback_reason, 'ML_UNAVAILABLE');
      assert.equal(d.predicted_swdi_level, null); assert.equal(d.class_probabilities, null);
      assert.deepEqual(d.shap_explainability, []);
      assert.equal(d.contributions.swdi, 0); assert.equal(d.composite_risk_score, 90);
      assert.equal(d.is_flagged, true); assert.ok(d.flag_reasons.includes('EVALUATED_VIA_FALLBACK'));
      const stored = await beneficiaries.findOne({ household_id: 'HH-DOWN' }).lean();
      assert.ok(stored.risk_assessment.flag_reasons.includes('EVALUATED_VIA_FALLBACK'));
      assert.equal(stored.risk_assessment.predicted_swdi_level, undefined);
    } finally { mlClient = liveMl; }
    for (const [m, reason] of [['error', 'ML_UNAVAILABLE'], ['garbage', 'INVALID_ML_RESPONSE']]) {
      await seed(`HH-${m}`);
      mode = m;
      try {
        const d = await (await assess('director', `HH-${m}`)).json();
        assert.equal(d.evaluation_mode, 'EVALUATED_VIA_FALLBACK'); assert.equal(d.fallback_reason, reason);
      } finally { mode = 'ok'; }
    }
    await seed('HH-LEGACY', { pmt: null });
    const d = await (await assess('director', 'HH-LEGACY')).json();
    assert.equal(d.fallback_reason, 'INVALID_FEATURE_VECTOR');
  });

  await t.test('indicator rules: vehicle ownership, franchise, missing external record', async () => {
    const vehicle = v => ({ transport_registry: { vehicles: [{ plate_number: 'XYZ 1', vehicle_category: 'PASSENGER_4W', ...v }] } });
    for (const [id, external, expected] of [
      ['HH-V-OWNED', vehicle({ ownership_status: 'OWNED_OUTRIGHT', registered_owner_relationship: 'SPOUSE' }), 30],
      ['HH-V-OTHER', vehicle({ ownership_status: 'REGISTERED_UNDER_OTHER', registered_owner_relationship: 'HOUSEHOLD_HEAD' }), 0],
      ['HH-V-EXT', vehicle({ ownership_status: 'OWNED_OUTRIGHT', registered_owner_relationship: 'NON_HOUSEHOLD' }), 0],
      ['HH-V-FRAN', vehicle({ is_commercial_franchise: true }), 0],
      ['HH-V-MOTO', { transport_registry: { vehicles: [{ plate_number: 'M 1', vehicle_category: 'MOTORCYCLE' }] } }, 0],
      ['HH-NO-EXT', null, 0]
    ]) {
      await seed(id, { external });
      const d = await (await assess('director', id)).json();
      assert.equal(d.contributions.vehicle, expected, id);
    }
  });

  await t.test('security guards and boundary validation with no writes', async () => {
    await seed('HH-SEC');
    await seed('HH-FLAGGED', { status: 'FLAGGED_FOR_REVIEW' });
    await seed('HH-REAL', { barangay: 'Real' });
    await noWrites('HH-SEC', async () => {
      await rejected(await assess(null, 'HH-SEC'), 401, 'UNAUTHORIZED');
      await rejected(await assess('expired', 'HH-SEC'), 401, 'TOKEN_EXPIRED');
      await rejected(await assess('worker', 'HH-SEC'), 403, 'FORBIDDEN');
      await rejected(await assess('auditor', 'HH-SEC'), 403, 'FORBIDDEN');
      await rejected(await assess('outsider', 'HH-SEC'), 403, 'OUT_OF_JURISDICTION');
      await rejected(await assess('director', 'HH-SEC', { composite_risk_score: 0 }), 400, 'INVALID_REQUEST');
      await rejected(await assess('director', 'HH-SEC', null, '{'), 400, 'INVALID_JSON');
      await rejected(await assess('director', 'x'.repeat(129)), 400, 'INVALID_REQUEST');
      await rejected(await assess('director', 'HH-MISSING'), 404, 'HOUSEHOLD_NOT_FOUND');
      await rejected(await assess('director', 'HH-FLAGGED'), 409, 'HOUSEHOLD_NOT_ASSESSABLE');
    });
    assert.equal((await assess('director', 'HH-REAL')).status, 403);
  });

  await t.test('E2E-03a age-out: reported, not scored; corrected and sealed only when flagged', async () => {
    const today = new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 10).split('-').map(Number);
    const born = years => new Date(Date.UTC(today[0] - years, today[1] - 1, today[2]));
    await seed('HH-AGE', { external: richExternal });
    await beneficiaries.collection.updateOne({ household_id: 'HH-AGE' }, { $set: { children_registry: [
      { birthdate: born(19), is_eligible: true }, { birthdate: born(10), is_eligible: true }] } });
    const d = await (await assess('director', 'HH-AGE')).json();
    assert.deepEqual(d.children_eligibility, { total: 2, eligible: 1, aged_out: 1, unknown: 0 });
    assert.ok(d.trigger_badges.some(b => b.code === 'CHILD_AGE_OUT' && b.severity === 'LOW'));
    assert.equal(d.composite_risk_score, 90);
    const stored = await beneficiaries.findOne({ household_id: 'HH-AGE' }).lean();
    assert.deepEqual(stored.children_registry.map(c => c.is_eligible), [false, true]);
    const log = await audits.findOne({ sequence_index: d.audit_receipt.sequence_index }).lean();
    assert.deepEqual(log.state_delta.before.related.children_is_eligible, [true, true]);
    assert.deepEqual(log.state_delta.after.related.children_is_eligible, [false, true]);
    assert.equal(log.entry_hash, sealed(log));

    await seed('HH-AGE-ALL');
    await beneficiaries.collection.updateOne({ household_id: 'HH-AGE-ALL' }, { $set: { children_registry: [
      { birthdate: born(20), is_eligible: true }] } });
    await noWrites('HH-AGE-ALL', async () => {
      const e = await (await assess('director', 'HH-AGE-ALL')).json();
      assert.ok(e.flag_reasons.includes('No eligible children (RA 11310 Sec. 6)'));
      assert.equal(e.audit_receipt, null);
    });

    await seed('HH-AGE-BAD', { external: richExternal });
    await beneficiaries.collection.updateOne({ household_id: 'HH-AGE-BAD' }, { $set: { children_registry: [
      { birthdate: born(20), is_eligible: true }, { birthdate: 'garbage', is_eligible: true }] } });
    const f = await (await assess('director', 'HH-AGE-BAD')).json();
    assert.equal(f.children_eligibility.unknown, 1); assert.equal(f.is_flagged, true);
    assert.deepEqual((await beneficiaries.findOne({ household_id: 'HH-AGE-BAD' }).lean()).children_registry
      .map(c => c.is_eligible), [true, true], 'unevaluable registry is left untouched');
  });

  await t.test('simultaneous assessments of one household flag it exactly once', async () => {
    await seed('HH-RACE', { external: richExternal });
    levels['HH-RACE'] = 3;
    const results = await Promise.all([assess('director', 'HH-RACE'), assess('admin', 'HH-RACE')]);
    assert.deepEqual(results.map(r => r.status).sort(), [200, 409]);
    assert.equal(await audits.countDocuments({ action: 'MODEL_FLAG_RAISED', 'target_entity.entity_id': 'HH-RACE' }), 1);
  });
});

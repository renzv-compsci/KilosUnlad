const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createTaskDispatcher } = require('../src/services/taskDispatcher.service');
const { createRiskAssessment } = require('../src/services/riskAssessment.service');
const { MlClientError } = require('../src/services/mlClient.service');
const { startReplicaSet } = require('./support/replicaSet');

test('E2E-02 calamity moratorium freezes dispatch and flagging, releases on expiry/lift', {
  skip: process.env.RUN_WORKFLOW_MONGO_TESTS !== '1', timeout: 120000
}, async t => {
  const { models } = await startReplicaSet(t, 'calamity_hold_test');
  const { users, beneficiaries, audits, tasks, configs } = models;
  const jurisdiction = { region: 'Region IV-A', province: 'Laguna', municipality: 'Calamba', assigned_barangays: ['Palingon'] };
  const mk = (username, role) => users.create({ username, role, password_hash: 'x', full_name: username,
    email: `${username}@example.test`, is_active: true, jurisdiction });
  const director = String((await mk('director', 'REGIONAL_DIRECTOR'))._id);
  const worker = String((await mk('worker', 'CASE_WORKER'))._id);
  const seed = (id, status) => beneficiaries.collection.insertOne({ household_id: id,
    head_of_household: { first_name: 'T', last_name: 'H', national_id: `NID-${id}` },
    address: { province: 'Laguna', municipality: 'Calamba', barangay: 'Palingon', coordinates: { type: 'Point', coordinates: [121.16, 14.21] } },
    demographics: { household_size: 4 }, enrolled_swdi_level: 1, program_status: status,
    risk_assessment: { composite_risk_score: 0, is_flagged: false, flag_reasons: [], trigger_badges: [] } });
  const zone = (extra = {}) => ({ province: 'Laguna', municipality: 'Calamba', is_active: true,
    declared_at: new Date(Date.now() - 1000), ...extra });
  const setZones = zones => configs.updateOne({ config_key: 'CALAMITY_ZONES' },
    { $set: { calamity_moratorium_zones: zones } }, { upsert: true });

  const dispatcher = createTaskDispatcher(models);
  const dispatch = id => dispatcher.dispatch({ household_id: id, assigned_worker_id: worker, priority: 'HIGH',
    due_date: new Date(Date.now() + 86400000).toISOString() }, director);
  const assessor = createRiskAssessment({ ...models,
    mlClient: { predict: async () => { throw new MlClientError('ML_UNAVAILABLE', 'down'); } } });
  async function frozen(operation) {
    const before = [await audits.countDocuments(), await tasks.countDocuments()];
    await assert.rejects(operation, e => e.status === 409 && e.code === 'CALAMITY_MORATORIUM_ACTIVE');
    assert.deepEqual([await audits.countDocuments(), await tasks.countDocuments()], before);
  }

  await t.test('no configuration document: no hold', async () => {
    await seed('NOCFG', 'FLAGGED_FOR_REVIEW');
    assert.equal((await dispatch('NOCFG')).household_status, 'UNDER_INVESTIGATION');
  });

  await t.test('active zone freezes dispatch and assessment with zero writes', async () => {
    await seed('D1', 'FLAGGED_FOR_REVIEW'); await seed('A1', 'ACTIVE_COMPLIANT');
    await setZones([zone({ expires_at: new Date(Date.now() + 1500) })]);
    await frozen(() => dispatch('D1'));
    await frozen(() => assessor.assess('A1', director));
    assert.equal((await beneficiaries.findOne({ household_id: 'D1' })).program_status, 'FLAGGED_FOR_REVIEW');
  });

  await t.test('other municipality and inactive zones are not held', async () => {
    await seed('OTHER', 'FLAGGED_FOR_REVIEW');
    await setZones([zone({ municipality: 'Santa Rosa' })]);
    assert.equal((await dispatch('OTHER')).household_status, 'UNDER_INVESTIGATION');
    await seed('D2', 'FLAGGED_FOR_REVIEW');
    await setZones([zone({ is_active: false })]);
    assert.equal((await dispatch('D2')).household_status, 'UNDER_INVESTIGATION');
  });

  await t.test('expiry releases the hold', async () => {
    await setZones([zone({ expires_at: new Date(Date.now() + 800) })]);
    await frozen(() => dispatch('D1'));
    await new Promise(resolve => setTimeout(resolve, 1000));
    assert.equal((await dispatch('D1')).household_status, 'UNDER_INVESTIGATION');
    assert.equal((await assessor.assess('A1', director)).program_status, 'ACTIVE_COMPLIANT');
  });

  await t.test('malformed stored configuration fails closed (503), never silently clears', async () => {
    await seed('D3', 'FLAGGED_FOR_REVIEW');
    await configs.collection.updateOne({ config_key: 'CALAMITY_ZONES' },
      { $set: { calamity_moratorium_zones: [{ province: 'Laguna', municipality: 'Calamba', is_active: 'yes', declared_at: new Date() }] } });
    await assert.rejects(() => dispatch('D3'), e => e.status === 503 && e.code === 'CALAMITY_CONFIG_INVALID');
    assert.equal(await tasks.countDocuments({ household_id: 'D3' }), 0);
  });

});

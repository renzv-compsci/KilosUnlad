/**
 * test_section12_defects.js
 * Section 12.3 (Defects and Corrective Actions): re-verifies that each
 * corrective action for DEF-01..DEF-07 is present in the code and holds live.
 *
 * Prerequisites:
 * 1. MONGO_URI: the replica-set database (DEF-01).
 * 2. APP_MONGO_URI: the same database as `app_user` (kilosUnladAppRole), for
 *    DEF-02. The probes are non-destructive (update/delete filters match nothing).
 * 3. server/node_modules installed.
 *
 * Usage: node data-pipeline/scripts/test_section12_defects.js
 *   EVIDENCE_JSON=<file> also writes the observations.
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '../..');
const { MongoClient } = require(path.join(ROOT, 'server/node_modules/mongodb'));
const mongoose = require(path.join(ROOT, 'server/node_modules/mongoose'));

const MONGO_URI = process.env.MONGO_URI ||
  'mongodb://admin_user:RootAdminSecret2026!@localhost:27017/kilosunlad?authSource=admin&directConnection=true';
const APP_MONGO_URI = process.env.APP_MONGO_URI ||
  'mongodb://app_user:AppUserPassword2026!@localhost:27017/kilosunlad?authSource=kilosunlad&directConnection=true';

const results = [];
let current;
function def(id, title) { current = { id, title, checks: [], observed: {} }; results.push(current); console.log(`\n[${id}] ${title}`); }
function check(label, condition, detail) {
  current.checks.push({ label, pass: !!condition });
  if (condition) console.log(`   [OK]   ${label}`);
  else console.error(`   [FAIL] ${label}`, detail === undefined ? '' : JSON.stringify(detail));
}
const observe = (key, value) => { current.observed[key] = value; };
const read = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const denied = async promise => promise.then(() => 'ALLOWED', e => (e.codeName || e.code || e.message));

async function run() {
  console.log('[START] Section 12.3 defect re-verification');
  const compose = read('docker-compose.yml');

  def('DEF-01', 'Multi-document transactions need a replica set');
  check('db service starts mongod with --replSet rs0 --bind_ip_all', /mongod --replSet rs0 .*--bind_ip_all/.test(compose));
  check('compose runs rs.initiate on first boot', /rs\.initiate\(\{ _id: \\"rs0\\"/.test(compose));
  const client = await MongoClient.connect(MONGO_URI);
  try {
    const hello = await client.db('admin').command({ hello: 1 });
    observe('hello', { setName: hello.setName, isWritablePrimary: hello.isWritablePrimary });
    check('live server is primary of replica set rs0', hello.setName === 'rs0' && hello.isWritablePrimary === true, hello);
    const session = client.startSession();
    let committed = false;
    try {
      await session.withTransaction(async () => {
        await client.db('kilosunlad').collection('system_configs').findOne({}, { session });
      });
      committed = true;
    } finally { await session.endSession(); }
    check('session.withTransaction() commits', committed);
  } finally { await client.close(); }

  def('DEF-02', 'app_user may inspect audit indexes but never update or delete');
  const init = read('docker/mongo/init-mongo.js');
  const auditGrant = /collection: 'audit_logs' \},\s*actions: \[([^\]]*)\]/.exec(init)?.[1] || '';
  observe('audit_logs_actions', auditGrant.replace(/'/g, '').split(',').map(s => s.trim()));
  check('role grants createIndex and listIndexes on audit_logs', /'createIndex'/.test(auditGrant) && /'listIndexes'/.test(auditGrant), auditGrant);
  check('role grants no update or remove on audit_logs', !/'update'|'remove'/.test(auditGrant), auditGrant);
  const app = await MongoClient.connect(APP_MONGO_URI);
  try {
    const audits = app.db('kilosunlad').collection('audit_logs');
    const probes = {
      find: await denied(audits.findOne({})),
      listIndexes: await denied(audits.indexes()),
      update: await denied(audits.updateOne({ _id: 'no-such-block' }, { $set: { action: 'X' } })),
      delete: await denied(audits.deleteOne({ _id: 'no-such-block' }))
    };
    observe('app_user_probes', probes);
    check('app_user can find and list audit indexes', probes.find === 'ALLOWED' && probes.listIndexes === 'ALLOWED', probes);
    check('app_user update and delete on audit_logs -> Unauthorized', probes.update === 'Unauthorized' && probes.delete === 'Unauthorized', probes);
  } finally { await app.close(); }

  def('DEF-03', 'No _id auto-injected into nested sub-documents');
  const models = ['User', 'Beneficiary', 'ExternalRecord', 'VerificationTask', 'AuditLog', 'SystemConfig']
    .map(name => require(path.join(ROOT, `server/src/models/${name}`)));
  const nested = [];
  for (const model of models) {
    model.schema.eachPath((p, type) => {
      if (type.schema) nested.push({ model: model.modelName, path: p, _id: type.schema.options._id, strict: type.schema.options.strict });
    });
  }
  observe('sub_schemas', nested.length);
  const bad = nested.filter(n => n._id !== false || n.strict !== true);
  check(`all ${nested.length} nested sub-schemas declare { _id: false, strict: true }`, nested.length > 0 && bad.length === 0, bad);
  const doc = new (models[1])({ household_id: 'X', head_of_household: { first_name: 'A', last_name: 'B', national_id: 'N' },
    address: { barangay: 'Real', municipality: 'Calamba', province: 'Laguna', coordinates: { type: 'Point', coordinates: [121, 14] } },
    demographics: { household_size: 4 }, enrolled_swdi_level: 1, program_status: 'ACTIVE_COMPLIANT' }).toObject();
  check('a built Beneficiary has no _id in address, demographics or head_of_household',
    ['address', 'demographics', 'head_of_household'].every(k => doc[k] && !('_id' in doc[k])), doc);

  def('DEF-04', 'Host port collision on 27017');
  check('compose maps ${MONGO_EXTERNAL_PORT:-27017}:27017', compose.includes('"${MONGO_EXTERNAL_PORT:-27017}:27017"'));

  def('DEF-05', 'ML feature contract mismatch');
  const { requestSchema } = require(path.join(ROOT, 'server/src/services/mlClient.service'));
  const described = requestSchema.describe();
  const clientKeys = Object.keys(described.keys.demographics.keys).sort();
  const contractKeys = Object.keys(require(path.join(ROOT, 'docs/contracts/ml/ml-swdi-inference.json')).request.demographics).sort();
  const classifier = read('ml-service/app/services/classifier.py');
  observe('server_joi_features', clientKeys);
  check('server Joi schema lists exactly the contract\'s 6 features', JSON.stringify(clientKeys) === JSON.stringify(contractKeys), { clientKeys, contractKeys });
  check('ML service maps the same 6 features', contractKeys.every(k => classifier.includes(`'demographics.${k}'`)));
  check('wall_score / roof_score are not part of the vector', !clientKeys.some(k => /wall_score|roof_score/.test(k)));

  def('DEF-06', 'Dispatch metadata persisted on VerificationTask');
  const Task = models[3];
  observe('priority_enum', Task.schema.path('priority').enumValues);
  check('priority enum LOW/MEDIUM/HIGH/CRITICAL', JSON.stringify(Task.schema.path('priority').enumValues) === '["LOW","MEDIUM","HIGH","CRITICAL"]');
  check('due_date is a required Date', Task.schema.path('due_date').instance === 'Date' && Task.schema.path('due_date').isRequired);
  check('assignment_notes aliased as dispatch_instructions', Task.schema.aliases.dispatch_instructions === 'assignment_notes');
  const t = new Task({ task_id: 'T', household_id: 'H', priority: 'CRITICAL', due_date: new Date(), dispatch_instructions: 'note' });
  check('strict mode keeps the three fields on save', t.priority === 'CRITICAL' && t.assignment_notes === 'note' && t.due_date instanceof Date);

  def('DEF-07', 'General configuration audit action');
  const actions = models[4].schema.path('action').enumValues;
  observe('audit_actions', actions);
  check('AUDIT_ACTIONS includes SYSTEM_CONFIG_UPDATED', actions.includes('SYSTEM_CONFIG_UPDATED'));
  check('CALAMITY_DECLARED remains a separate action', actions.includes('CALAMITY_DECLARED'));

  if (process.env.EVIDENCE_JSON) fs.writeFileSync(process.env.EVIDENCE_JSON, JSON.stringify(results, null, 2));
  const failed = results.filter(r => r.checks.some(c => !c.pass));
  console.log(`\n${results.length - failed.length}/${results.length} defects verified resolved.`);
  if (failed.length) { console.error(`[FAIL] DEFECTS: ${failed.map(f => f.id).join(', ')}`); process.exit(1); }
  console.log('[SUCCESS] SECTION 12.3 DEFECTS VERIFIED!');
}
run().then(() => mongoose.disconnect()).catch(error => {
  if (process.env.EVIDENCE_JSON) fs.writeFileSync(process.env.EVIDENCE_JSON, JSON.stringify(results, null, 2));
  console.error('\n[FAIL] DEFECT VERIFICATION FAILED!\nError:', error.message); process.exit(1);
});

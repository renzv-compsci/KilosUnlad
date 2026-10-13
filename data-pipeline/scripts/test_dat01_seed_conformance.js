/**
 * test_dat01_seed_conformance.js
 * Sprint 3 DAT-01/DAT-04 integration test: after `seed-ingest`, every ingested
 * household and external record must validate against the frozen Mongoose
 * models, be visible to jurisdiction-scoped queries, carry a valid
 * ml-swdi-inference v1.1 feature vector, and contain no training labels or
 * unmasked card numbers. Checks the 1:1 beneficiary-to-external invariant.
 *
 * Prerequisites:
 * 1. Database running and `docker-compose run --rm seed-ingest` completed.
 * 2. server/node_modules installed (the script loads the real models).
 *
 * Usage: MONGO_URI=... node data-pipeline/scripts/test_dat01_seed_conformance.js
 */
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const mongoose = require(path.join(ROOT, 'server/node_modules/mongoose'));
// Observe the database as the reset left it: loading models must not build indexes.
mongoose.set('autoIndex', false);
const Beneficiary = require(path.join(ROOT, 'server/src/models/Beneficiary'));
const ExternalRecord = require(path.join(ROOT, 'server/src/models/ExternalRecord'));
const { requestSchema } = require(path.join(ROOT, 'server/src/services/mlClient.service'));
const { PMT_FEATURES } = require(path.join(ROOT, 'server/src/services/riskAssessment.service'));

const MONGO_URI = process.env.MONGO_URI ||
  'mongodb://app_user:AppUserPassword2026!@localhost:27017/kilosunlad?authSource=kilosunlad&directConnection=true';
const EXPECTED = Number(process.env.EXPECTED_SYN_COUNT || 80000);
const SYN = { $regex: '^SYN-4PS-' };
const DIRECTOR_SCOPE = { 'address.province': 'Laguna', 'address.municipality': 'Calamba',
  'address.barangay': { $in: ['Palingon', 'Lecheria', 'Real'] } };

let failures = 0;
function check(label, condition, detail) {
  if (condition) console.log(`   [OK]   ${label}`);
  else { failures++; console.error(`   [FAIL] ${label}`, detail === undefined ? '' : JSON.stringify(detail).slice(0, 400)); }
}

async function validateAll(collection, Model, filter) {
  let invalid = 0, first = null, seen = 0;
  for await (const doc of collection.find(filter)) {
    seen++;
    const error = new Model(doc).validateSync();
    if (error) { invalid++; if (!first) first = { id: doc.household_id || doc.matched_household_id, error: error.message }; }
  }
  return { seen, invalid, first };
}

async function run() {
  console.log('[START] DAT-01 Seed Conformance Test\n');
  await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 5000 });
  const db = mongoose.connection.db;
  const ben = db.collection('beneficiaries');
  const ext = db.collection('external_records');

  console.log('[1] Counts and 1:1 invariant...');
  const benCount = await ben.countDocuments({ household_id: SYN });
  const extCount = await ext.countDocuments({ matched_household_id: SYN });
  check(`${EXPECTED.toLocaleString()} SYN beneficiaries`, benCount === EXPECTED, benCount);
  check(`${EXPECTED.toLocaleString()} SYN external records`, extCount === EXPECTED, extCount);
  const orphans = await ext.aggregate([{ $match: { matched_household_id: SYN } },
    { $lookup: { from: 'beneficiaries', localField: 'matched_household_id', foreignField: 'household_id', as: 'b' } },
    { $match: { b: { $size: 0 } } }, { $count: 'n' }]).toArray();
  check('zero orphan external records', (orphans[0]?.n || 0) === 0, orphans);
  console.log('');

  console.log('[2] Every document validates against the frozen Mongoose models...');
  const b = await validateAll(ben, Beneficiary, { household_id: SYN });
  check(`beneficiaries valid (${b.seen.toLocaleString()} checked)`, b.seen === EXPECTED && b.invalid === 0, b);
  const e = await validateAll(ext, ExternalRecord, { matched_household_id: SYN });
  check(`external records valid (${e.seen.toLocaleString()} checked)`, e.seen === EXPECTED && e.invalid === 0, e);
  console.log('');

  console.log('[3] Visibility, ML readiness, and excluded fields...');
  check('all SYN households inside director_test jurisdiction scope',
    (await ben.countDocuments({ household_id: SYN, ...DIRECTOR_SCOPE })) === EXPECTED);
  let badVector = 0, firstBad = null;
  for await (const doc of ben.find({ household_id: SYN }, { projection: { household_id: 1, demographics: 1 } })) {
    const d = doc.demographics || {};
    const payload = { household_id: doc.household_id, household_size: d.household_size,
      demographics: Object.fromEntries(PMT_FEATURES.map(k => [k, d[k]])) };
    const { error } = requestSchema.validate(payload, { convert: false, allowUnknown: false });
    if (error) { badVector++; firstBad = firstBad || { id: doc.household_id, error: error.message }; }
  }
  check('every household has a valid ml-swdi-inference v1.1 vector', badVector === 0, { badVector, firstBad });
  for (const field of ['true_swdi_level', 'names', 'landbank_card_pan', 'gps_coordinates', 'school_attendance']) {
    check(`no beneficiary stores ${field}`, (await ben.countDocuments({ household_id: SYN, [field]: { $exists: true } })) === 0);
  }
  for (const field of ['power', 'water', 'telecom', 'vehicle', 'household_id']) {
    check(`no external record stores raw ${field}`, (await ext.countDocuments({ matched_household_id: SYN, [field]: { $exists: true } })) === 0);
  }
  check('all LandBank PANs masked', (await ext.countDocuments({ matched_household_id: SYN,
    'landbank_telemetry.card_masked_pan': { $not: /^\d{4}-xxxx-xxxx-\d{4}$/ } })) === 0);
  console.log('');

  console.log('[4] Every index declared by the frozen models exists (reset must not drop any)...');
  for (const name of ['User', 'Beneficiary', 'ExternalRecord', 'VerificationTask', 'AuditLog', 'SystemConfig']) {
    const Model = require(path.join(ROOT, `server/src/models/${name}`));
    const existing = (await db.collection(Model.collection.collectionName).indexes().catch(() => []))
      .map(i => JSON.stringify(i.key));
    const missing = Model.schema.indexes().map(([key]) => JSON.stringify(key)).filter(k => !existing.includes(k));
    check(`${Model.collection.collectionName}: declared indexes present`, missing.length === 0, { missing });
  }
  console.log('');

  await mongoose.disconnect();
  if (failures) { console.error(`[FAIL] DAT-01 TEST FAILED (${failures} check(s))`); process.exit(1); }
  console.log('[SUCCESS] DAT-01 TEST PASSED!');
}

run().catch(async error => { console.error('\n[FAIL] DAT-01 TEST FAILED!\nError:', error.message); await mongoose.disconnect(); process.exit(1); });

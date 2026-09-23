// Task 2.2 — Verify 2dsphere spatial index on beneficiaries.address.coordinates
// Per DECISION-004: $geoWithin + $centerSphere, 5km around Calamba City Hall.
// Inserts temp docs, runs query + explain, asserts index hit, cleans up.

const DB_NAME = 'kilosunlad';
const COLLECTION = 'beneficiaries';
const CALAMBA_CITY_HALL = [121.1653, 14.2117]; // [longitude, latitude]
const RADIUS_KM = 5;

const db = db.getSiblingDB(DB_NAME);
const coll = db.getCollection(COLLECTION);

print('=== Task 2.2: 2dsphere Index Verification ===\n');

print('[1] Inserting 4 temp beneficiaries (3 inside 5km, 1 outside)...');

const tempDocs = [
  // ~1.5 km from City Hall
  {
    household_id: '__TEMP_VERIFY_01__',
    head_of_household: {
      first_name: 'Test',
      last_name: 'Near1',
      national_id: '__TEMP_NID_01__',
    },
    address: {
      barangay: 'Palingon',
      municipality: 'Calamba',
      province: 'Laguna',
      coordinates: { type: 'Point', coordinates: [121.1750, 14.2150] },
    },
    demographics: { household_size: 4 },
    enrolled_swdi_level: 1,
    program_status: 'ACTIVE_COMPLIANT',
  },
  // ~2.5 km from City Hall
  {
    household_id: '__TEMP_VERIFY_02__',
    head_of_household: {
      first_name: 'Test',
      last_name: 'Near2',
      national_id: '__TEMP_NID_02__',
    },
    address: {
      barangay: 'Lecheria',
      municipality: 'Calamba',
      province: 'Laguna',
      coordinates: { type: 'Point', coordinates: [121.1850, 14.2200] },
    },
    demographics: { household_size: 5 },
    enrolled_swdi_level: 2,
    program_status: 'ACTIVE_COMPLIANT',
  },
  // ~4 km from City Hall (still inside)
  {
    household_id: '__TEMP_VERIFY_03__',
    head_of_household: {
      first_name: 'Test',
      last_name: 'Near3',
      national_id: '__TEMP_NID_03__',
    },
    address: {
      barangay: 'Real',
      municipality: 'Calamba',
      province: 'Laguna',
      coordinates: { type: 'Point', coordinates: [121.1950, 14.2250] },
    },
    demographics: { household_size: 3 },
    enrolled_swdi_level: 1,
    program_status: 'ACTIVE_COMPLIANT',
  },
  // ~20 km away (outside radius)
  {
    household_id: '__TEMP_VERIFY_04__',
    head_of_household: {
      first_name: 'Test',
      last_name: 'Far1',
      national_id: '__TEMP_NID_04__',
    },
    address: {
      barangay: 'Outside',
      municipality: 'LosBanos',
      province: 'Laguna',
      coordinates: { type: 'Point', coordinates: [121.3000, 14.1000] },
    },
    demographics: { household_size: 6 },
    enrolled_swdi_level: 3,
    program_status: 'ACTIVE_COMPLIANT',
  },
];

const insertResult = coll.insertMany(tempDocs);
print('    Inserted: ' + insertResult.insertedCount + ' documents\n');

// --- 2. Run $geoWithin query ---
print('[2] Running $geoWithin query (5km radius)...');

const query = {
  'address.coordinates': {
    $geoWithin: {
      $centerSphere: [CALAMBA_CITY_HALL, RADIUS_KM / 6378.1],
    },
  },
};

const matched = coll.find(query).toArray();
print('    Matched: ' + matched.length + ' documents (expected 3)\n');

// --- 3. Run explain ---
print('[3] Running explain("executionStats")...');

const explainOutput = coll.find(query).explain('executionStats');
const stats = explainOutput.executionStats;
const winningPlan = explainOutput.queryPlanner.winningPlan;

// Find the index stage (IXSCAN) anywhere in the plan tree
function findStage(plan, stageName) {
  if (!plan) return null;
  if (plan.stage === stageName) return plan;
  if (plan.inputStage) {
    const found = findStage(plan.inputStage, stageName);
    if (found) return found;
  }
  if (plan.inputStages) {
    for (const s of plan.inputStages) {
      const found = findStage(s, stageName);
      if (found) return found;
    }
  }
  return null;
}

const ixScan = findStage(winningPlan, 'IXSCAN');
const collScan = findStage(winningPlan, 'COLLSCAN');

print('    totalKeysExamined: ' + stats.totalKeysExamined);
print('    totalDocsExamined: ' + stats.totalDocsExamined);
print('    nReturned:         ' + stats.nReturned);
print('    IXSCAN present:    ' + (ixScan ? 'YES' : 'NO'));
print('    COLLSCAN present:  ' + (collScan ? 'YES' : 'NO'));
if (ixScan) {
  print('    Index used:        ' + ixScan.indexName);
}
print('');

print('[4] Assertions:');

const assertions = [];

// 4a. Query returned exactly 3 (the ones inside 5km)
assertions.push({
  name: 'Query returned 3 docs (inside radius)',
  pass: matched.length === 3,
});

// 4b. Winning plan uses IXSCAN
assertions.push({
  name: 'Winning plan uses IXSCAN (not COLLSCAN)',
  pass: ixScan !== null && collScan === null,
});

// 4c. Index name is the 2dsphere one
assertions.push({
  name: 'Index name is address.coordinates_2dsphere',
  pass: ixScan !== null && ixScan.indexName === 'address.coordinates_2dsphere',
});

// 4d. No over-scan (totalDocsExamined === nReturned)
assertions.push({
  name: 'No over-scan (totalDocsExamined === nReturned)',
  pass: stats.totalDocsExamined === stats.nReturned,
});

let allPassed = true;
assertions.forEach((a) => {
  print('    [' + (a.pass ? 'PASS' : 'FAIL') + '] ' + a.name);
  if (!a.pass) allPassed = false;
});
print('');

// --- 5. Cleanup ---
print('[5] Cleaning up temp documents...');
const deleteResult = coll.deleteMany({
  household_id: { $regex: '^__TEMP_VERIFY_' },
});
print('    Deleted: ' + deleteResult.deletedCount + ' documents\n');

// --- 6. Final result ---
print('=== RESULT: ' + (allPassed ? 'ALL PASS ✅' : 'SOME FAILED ❌') + ' ===');
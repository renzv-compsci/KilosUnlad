// ============================================================
// KilosUnlad — Dispatch Test Fixture
// ============================================================
// Adds ONE new FLAGGED_FOR_REVIEW household in Palingon with no
// active task, so Markie can test the successful dispatch flow
// end-to-end (dispatch → 201 → task appears in worker feed).
//
// Non-destructive:
//   - Does NOT drop or reset any collections.
//   - Does NOT modify existing samples.
//   - Idempotent — safe to re-run; skips if the household exists.
//
// Prints the case_worker_test _id for use in the dispatch request.
//
// Run inside kilosunlad-db as admin_user:
//   docker cp data-pipeline/scripts/add_dispatch_test.js \
//     kilosunlad-db:/tmp/add_dispatch_test.js
//   docker exec -it kilosunlad-db mongosh \
//     "mongodb://admin_user:RootAdminSecret2026!@localhost:27017/kilosunlad?authSource=admin" \
//     /tmp/add_dispatch_test.js
// ============================================================

const DB_NAME = 'kilosunlad';
const appDb = db.getSiblingDB(DB_NAME);

const TEST_HOUSEHOLD_ID = 'TEST-4PS-DISPATCH-0001';
const TEST_NATIONAL_ID = 'TEST-NID-DISPATCH-0001';
const WORKER_USERNAME = 'case_worker_test';

print('=== KilosUnlad Dispatch Test Fixture ===\n');

// ------------------------------------------------------------
// 1. Look up the case worker (must exist)
// ------------------------------------------------------------
print('[1] Looking up worker account...');
const worker = appDb.users.findOne({ username: WORKER_USERNAME });

if (!worker) {
  print('    [FAIL] Worker ' + WORKER_USERNAME + ' not found.');
  print('    Run seed_test_data.js first to create test accounts.');
  quit(1);
}

print('    Worker found:');
print('      username:  ' + worker.username);
print('    ' + '  _id:       ' + worker._id.toString());
print('      role:      ' + worker.role);
print('      barangay:  ' + JSON.stringify(worker.jurisdiction.assigned_barangays));
print('');

// ------------------------------------------------------------
// 2. Confirm the household doesn't already exist
// ------------------------------------------------------------
print('[2] Checking if test household already exists...');
const existing = appDb.beneficiaries.findOne({ household_id: TEST_HOUSEHOLD_ID });

if (existing) {
  print('    [SKIP] ' + TEST_HOUSEHOLD_ID + ' already exists.');
  print('    Household _id: ' + existing._id.toString());
  print('');
  print('    Dispatch test is ready to use. No changes made.');
  quit(0);
}

print('    Not found. Will insert.');
print('');

// ------------------------------------------------------------
// 3. Check for any active task on this household
// ------------------------------------------------------------
print('[3] Confirming no active task exists for this household...');
const activeTask = appDb.verification_tasks.findOne({
  household_id: TEST_HOUSEHOLD_ID,
  task_status: { $in: ['PENDING_DISPATCH', 'CACHED_OFFLINE', 'SUBMITTED'] },
});

if (activeTask) {
  print('    [FAIL] Active task already exists: ' + activeTask.task_id);
  print('    Cannot proceed — dispatch would be rejected.');
  quit(1);
}

print('    No active task. Safe to dispatch.');
print('');

// ------------------------------------------------------------
// 4. Insert the new household
// ------------------------------------------------------------
print('[4] Inserting test household...');

const now = new Date();
const testHousehold = {
  household_id: TEST_HOUSEHOLD_ID,
  head_of_household: {
    first_name: 'Dispatch',
    last_name: 'TestSubject',
    national_id: TEST_NATIONAL_ID,
    contact_phone: '+639170088001',
  },
  address: {
    street: 'Purok 1',
    barangay: 'Palingon',
    municipality: 'Calamba',
    province: 'Laguna',
    coordinates: {
      type: 'Point',
      coordinates: [121.1660, 14.2120],
    },
  },
  demographics: {
    household_size: 4,
    dependents_ratio: 0.5,
    head_education_level: 1,
    wall_score: 2,
    roof_score: 2,
    water_access_level: 2,
  },
  children_registry: [
    { birthdate: new Date('2015-06-15T00:00:00.000Z'), is_eligible: true },
  ],
  enrolled_swdi_level: 1,
  program_status: 'FLAGGED_FOR_REVIEW',
  risk_assessment: {
    composite_risk_score: 72,
    is_flagged: true,
    predicted_swdi_level: 3,
    flag_reasons: ['Dispatch test fixture — synthetic'],
    trigger_badges: [
      { code: 'TIER_INVERSION', label: 'AI Predicted Level 3', severity: 'CRITICAL' },
    ],
    evaluated_at: now,
  },
};

appDb.beneficiaries.insertOne(testHousehold);
print('    [OK] Inserted ' + TEST_HOUSEHOLD_ID);
print('');

// ------------------------------------------------------------
// 5. Summary + dispatch info
// ------------------------------------------------------------
print('=== Setup Complete ===\n');
print('Household ready for dispatch:');
print('  household_id:      ' + TEST_HOUSEHOLD_ID);
print('  barangay:          Palingon');
print('  municipality:      Calamba');
print('  province:          Laguna');
print('  program_status:    FLAGGED_FOR_REVIEW');
print('  active task:       none');
print('');
print('Worker _id for dispatch request:');
print('  ' + worker._id.toString());
print('');
print('Send dispatch request with:');
print('  household_id:       ' + TEST_HOUSEHOLD_ID);
print('  assigned_worker_id: ' + worker._id.toString());
print('');
print('Expected: HTTP 201 Created, task appears in worker assigned feed.');
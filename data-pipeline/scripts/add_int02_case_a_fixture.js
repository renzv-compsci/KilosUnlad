// ============================================================
// KilosUnlad — INT-02 Demo Case A Fixture
// ============================================================
// Test-account fixture for Case A scenarios (INT-02, E2E-01):
//   case_worker_test also covers barangay 'Real', where Case A lives.
//   Case A is flagged through the audited INT-05 assessment, not here.
//      Without this, dispatch correctly returns 403 OUT_OF_JURISDICTION for
//      the assigned worker. The jurisdiction guard itself is not changed.
// Existing fields only; idempotent. Run after reset_demo.sh:
//   docker cp data-pipeline/scripts/add_int02_case_a_fixture.js \
//     kilosunlad-db:/tmp/add_int02_case_a_fixture.js
//   docker exec -it kilosunlad-db mongosh \
//     "mongodb://admin_user:RootAdminSecret2026!@localhost:27017/kilosunlad?authSource=admin" \
//     /tmp/add_int02_case_a_fixture.js
// ============================================================

const appDb = db.getSiblingDB('kilosunlad');
print('=== KilosUnlad INT-02 Case A Fixture ===\n');

const current = appDb.beneficiaries.findOne({ household_id: 'DEMO-4PS-GRAD-0001' }, { program_status: 1 });
if (!current) { print('[FAIL] DEMO-4PS-GRAD-0001 missing. Run reset_demo.sh first.'); quit(1); }
print('[INFO] DEMO-4PS-GRAD-0001 status: ' + current.program_status +
  ' (flagging is done by POST /beneficiaries/:id/assess, never by a patch)');

const worker = appDb.users.updateOne({ username: 'case_worker_test' },
  { $addToSet: { 'jurisdiction.assigned_barangays': 'Real' } });
if (!worker.matchedCount) { print('[FAIL] case_worker_test missing. Run seed_test_data.js first.'); quit(1); }
print((worker.modifiedCount ? '[OK]   ' : '[SKIP] ') + 'case_worker_test covers barangay Real');

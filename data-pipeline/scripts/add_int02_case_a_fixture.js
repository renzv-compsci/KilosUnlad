// ============================================================
// KilosUnlad — INT-02 Demo Case A Fixture
// ============================================================
// Replaces the manual patch test_int02_submission.js used to require:
//   1. DEMO-4PS-GRAD-0001 -> FLAGGED_FOR_REVIEW (dispatchable).
//   2. case_worker_test also covers barangay 'Real', where Case A lives.
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

const flagged = appDb.beneficiaries.updateOne(
  { household_id: 'DEMO-4PS-GRAD-0001', program_status: 'ACTIVE_COMPLIANT' },
  { $set: { program_status: 'FLAGGED_FOR_REVIEW', updatedAt: new Date() } });
const current = appDb.beneficiaries.findOne({ household_id: 'DEMO-4PS-GRAD-0001' }, { program_status: 1 });
if (!current) { print('[FAIL] DEMO-4PS-GRAD-0001 missing. Run reset_demo.sh first.'); quit(1); }
print((flagged.modifiedCount ? '[OK]   ' : '[SKIP] ') + 'DEMO-4PS-GRAD-0001 status: ' + current.program_status);

const worker = appDb.users.updateOne({ username: 'case_worker_test' },
  { $addToSet: { 'jurisdiction.assigned_barangays': 'Real' } });
if (!worker.matchedCount) { print('[FAIL] case_worker_test missing. Run seed_test_data.js first.'); quit(1); }
print((worker.modifiedCount ? '[OK]   ' : '[SKIP] ') + 'case_worker_test covers barangay Real');

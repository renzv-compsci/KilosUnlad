// ============================================================
// KilosUnlad — INT-03 Appeals Docket Test Fixture
// ============================================================
// Adds ONE household under NOTICE_OF_INELIGIBILITY in Palingon, plus the
// VERIFIED_GRADUATE task whose admin_resolution (APPROVED_GRADUATION,
// finalized_at) is the stored notice instant the docket reads. Uses only
// existing collections and fields — no schema changes.
//
// Idempotent: re-running re-issues the notice (finalized_at = now - 2 days),
// which opens a fresh 15-day window so test_int03_appeals_docket.js can be
// re-run. Earlier APPEAL_FILED blocks stay in the ledger untouched.
//
// Run inside kilosunlad-db as admin_user (after reset_demo.sh):
//   docker cp data-pipeline/scripts/add_int03_notice_fixture.js \
//     kilosunlad-db:/tmp/add_int03_notice_fixture.js
//   docker exec -it kilosunlad-db mongosh \
//     "mongodb://admin_user:RootAdminSecret2026!@localhost:27017/kilosunlad?authSource=admin" \
//     /tmp/add_int03_notice_fixture.js
// ============================================================

const appDb = db.getSiblingDB('kilosunlad');
const HOUSEHOLD_ID = 'TEST-4PS-NOTICE-0001';
const TASK_ID = 'TEST-TSK-NOTICE-0001';
const DAY = 24 * 60 * 60 * 1000;

print('=== KilosUnlad INT-03 Notice Fixture ===\n');

const director = appDb.users.findOne({ username: 'director_test' });
const worker = appDb.users.findOne({ username: 'case_worker_test' });
if (!director || !worker) {
  print('[FAIL] director_test / case_worker_test missing. Run seed_test_data.js first.');
  quit(1);
}

if (!appDb.beneficiaries.findOne({ household_id: HOUSEHOLD_ID })) {
  appDb.beneficiaries.insertOne({
    household_id: HOUSEHOLD_ID,
    head_of_household: { first_name: 'Lorna', last_name: 'Bautista',
      national_id: 'TEST-NID-NOTICE-0001', contact_phone: '+639170000099' },
    address: { street: 'Purok 4', barangay: 'Palingon', municipality: 'Calamba', province: 'Laguna',
      coordinates: { type: 'Point', coordinates: [121.1660, 14.2120] } },
    demographics: { household_size: 4, dependents_ratio: 0.5, head_education_level: 3,
      wall_score: 3, roof_score: 3, water_access_level: 3 },
    children_registry: [{ birthdate: new Date('2014-03-11'), is_eligible: true }],
    enrolled_swdi_level: 1,
    program_status: 'NOTICE_OF_INELIGIBILITY',
    risk_assessment: { composite_risk_score: 81, is_flagged: true, predicted_swdi_level: 3,
      flag_reasons: ['Field verification recommended graduation'], trigger_badges: [],
      evaluated_at: new Date(Date.now() - 10 * DAY) },
    createdAt: new Date(), updatedAt: new Date()
  });
  print('[OK]   ' + HOUSEHOLD_ID + ' inserted (NOTICE_OF_INELIGIBILITY)');
} else {
  print('[SKIP] ' + HOUSEHOLD_ID + ' exists');
}

const noticeAt = new Date(Date.now() - 2 * DAY);
appDb.verification_tasks.updateOne({ task_id: TASK_ID }, {
  $set: {
    household_id: HOUSEHOLD_ID, assigned_worker_id: worker._id, task_status: 'VERIFIED_GRADUATE',
    assignment_notes: 'INT-03 fixture: approved graduation, notice served.', priority: 'HIGH',
    due_date: new Date(Date.now() - 5 * DAY),
    admin_resolution: { reviewed_by: director._id, decision: 'APPROVED_GRADUATION',
      admin_notes: 'INT-03 fixture approval.', finalized_at: noticeAt },
    updatedAt: new Date()
  },
  $setOnInsert: { createdAt: new Date() }
}, { upsert: true });
print('[OK]   ' + TASK_ID + ' notice instant = ' + noticeAt.toISOString());
print('       appeal deadline     = ' + new Date(noticeAt.getTime() + 15 * DAY).toISOString());

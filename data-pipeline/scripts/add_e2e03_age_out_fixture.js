// ============================================================
// KilosUnlad — E2E-03 Age-Out (RA 11310 Sec. 6) Test Fixture
// ============================================================
// Two ACTIVE_COMPLIANT households in Palingon whose children straddle the
// 19th-birthday boundary, with birthdates computed from today's date in
// Asia/Manila so the fixture stays correct whenever it runs. Existing
// collections and fields only; birthdates are stored as BSON Dates.
//   TEST-4PS-AGEOUT-0001: 21 y, 19 today (aged out), 19 tomorrow (still 18);
//     utilities + 4-wheel vehicle so the assessment flags and persists.
//   TEST-4PS-AGEOUT-0002: every child aged out; no external record (not flagged).
// Idempotent (replaces both households). Run after reset_demo.sh:
//   docker cp data-pipeline/scripts/add_e2e03_age_out_fixture.js kilosunlad-db:/tmp/
//   docker exec -it kilosunlad-db mongosh \
//     "mongodb://admin_user:RootAdminSecret2026!@localhost:27017/kilosunlad?authSource=admin" \
//     /tmp/add_e2e03_age_out_fixture.js
// ============================================================

const appDb = db.getSiblingDB('kilosunlad');
print('=== KilosUnlad E2E-03 Age-Out Fixture ===\n');

const today = new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 10); // Manila calendar date
const [y, m, d] = today.split('-').map(Number);
const birth = (years, dayOffset) => new Date(Date.UTC(y - years, m - 1, d + dayOffset));

const household = (id, nid, children) => ({
  household_id: id,
  head_of_household: { first_name: 'Ana', last_name: 'Ramos', national_id: nid },
  address: { street: 'Purok 7', barangay: 'Palingon', municipality: 'Calamba', province: 'Laguna',
    coordinates: { type: 'Point', coordinates: [121.1655, 14.2119] } },
  // Level 1 PMT profile (live v1 model: Level 1, p = 0.99) so only utilities score.
  demographics: { household_size: 5, dependents_ratio: 1.5, head_education_level: 0, wall_score: 1, roof_score: 1,
    head_formal_employment: 0, remittance_income_flag: 0, housing_material_score: 1,
    appliance_density_index: 0.2, dependency_ratio: 1.5 },
  children_registry: children.map(birthdate => ({ birthdate, is_eligible: true })),
  enrolled_swdi_level: 1,
  program_status: 'ACTIVE_COMPLIANT',
  risk_assessment: { composite_risk_score: 0, is_flagged: false, flag_reasons: [], trigger_badges: [] },
  createdAt: new Date(), updatedAt: new Date()
});

const fixtures = [
  household('TEST-4PS-AGEOUT-0001', 'TEST-NID-AGEOUT-0001', [birth(21, 0), birth(19, 0), birth(19, 1)]),
  household('TEST-4PS-AGEOUT-0002', 'TEST-NID-AGEOUT-0002', [birth(20, 0), birth(22, 0)])
];
for (const doc of fixtures) {
  appDb.beneficiaries.deleteOne({ household_id: doc.household_id });
  appDb.beneficiaries.insertOne(doc);
  print('[OK]   ' + doc.household_id + ' children born ' +
    doc.children_registry.map(c => c.birthdate.toISOString().slice(0, 10)).join(', '));
}
appDb.external_records.deleteOne({ matched_household_id: 'TEST-4PS-AGEOUT-0001' });
appDb.external_records.insertOne({
  matched_household_id: 'TEST-4PS-AGEOUT-0001', national_id: 'TEST-NID-AGEOUT-0001',
  power_utility: { avg_monthly_kwh: 250, is_lifeline: false },
  water_utility: { avg_monthly_cu_m: 12, is_lifeline: true },
  telecom_registry: { contract_type: 'POSTPAID' },
  transport_registry: { vehicles: [{ plate_number: 'AGE 0001', vehicle_category: 'PASSENGER_4W',
    year_model: 2021, is_commercial_franchise: false }] },
  landbank_telemetry: { card_masked_pan: '5044-xxxx-xxxx-0001' },
  createdAt: new Date(), updatedAt: new Date()
});
print('[OK]   external record for TEST-4PS-AGEOUT-0001 (power, postpaid, 4-wheel)');

// data-pipeline/scripts/seed_test_data.js
// Seeds 4 test accounts + minimal sample records for Mae/Markie live testing.
// Integration support — not a Phase 3 deliverable (see DECISION-007).
// Run inside the kilosunlad-db container as admin_user.

const DB = 'kilosunlad';
const appDb = db.getSiblingDB(DB);

print('=== KilosUnlad Test Data Seeding ===\n');

// ============================================================
// 1. USER ACCOUNTS — one per role
// ============================================================
print('[1] Seeding test users...');

const testUsers = [
  {
    full_name: 'Test Super Admin',
    username: 'super_admin_test',
    email: 'super_admin_test@kilosunlad.local',
    password_hash: '$2a$10$81EijELN9rPMX1OCBaSDrewRoq2umKRVSNsLNcVIX2qb6MZY/qzmm',
    role: 'SUPER_ADMIN',
    jurisdiction: {},
    is_active: true,
  },
  {
    full_name: 'Test Regional Director',
    username: 'director_test',
    email: 'director_test@kilosunlad.local',
    password_hash: '$2a$10$u9haH99w9YuCPJjaAtC4QOV/M9w7EMY7NLiJZBOoBiUKr8vDMRVHK',
    role: 'REGIONAL_DIRECTOR',
    jurisdiction: {
      region: 'Region IV-A',
      province: 'Laguna',
      municipality: 'Calamba',
      assigned_barangays: ['Palingon', 'Lecheria', 'Real'],
    },
    is_active: true,
  },
  {
    full_name: 'Test Case Worker',
    username: 'case_worker_test',
    email: 'case_worker_test@kilosunlad.local',
    password_hash: '$2a$10$mBjQ.Yc9sC19vswfGlpvYuaPJQw9qkPOAMmHJmXFl6i0mB9azWCWO',
    role: 'CASE_WORKER',
    jurisdiction: {
      region: 'Region IV-A',
      province: 'Laguna',
      municipality: 'Calamba',
      assigned_barangays: ['Palingon'],
    },
    is_active: true,
  },
  {
    full_name: 'Test COA Auditor',
    username: 'auditor_test',
    email: 'auditor_test@kilosunlad.local',
    password_hash: '$2a$10$AZX5WNVH4h0TmjWnkYI.gO5HtBejSZzFP7bpWNvaWTfwHLvjkXz7W',
    role: 'COA_AUDITOR',
    jurisdiction: {},
    is_active: true,
  },
];

testUsers.forEach((u) => {
  const exists = appDb.users.findOne({ username: u.username });
  if (exists) {
    print('    [SKIP] ' + u.username + ' already exists');
  } else {
    appDb.users.insertOne(u);
    print('    [OK]   ' + u.username + ' (' + u.role + ')');
  }
});

// ============================================================
// 2. SAMPLE BENEFICIARIES (3)
// ============================================================
print('\n[2] Seeding sample beneficiaries...');

const sampleBeneficiaries = [
  {
    household_id: 'TEST-4PS-0001',
    head_of_household: {
      first_name: 'Juan',
      last_name: 'Dela Cruz',
      national_id: 'TEST-NID-0001',
      contact_phone: '+639170000001',
    },
    address: {
      street: 'Purok 1',
      barangay: 'Palingon',
      municipality: 'Calamba',
      province: 'Laguna',
      coordinates: { type: 'Point', coordinates: [121.1653, 14.2117] },
    },
    demographics: {
      household_size: 5,
      dependents_ratio: 0.6,
      head_education_level: 1,
      wall_score: 2,
      roof_score: 2,
      water_access_level: 2,
    },
    children_registry: [
      { birthdate: new Date('2015-06-15'), is_eligible: true },
      { birthdate: new Date('2018-02-10'), is_eligible: true },
    ],
    enrolled_swdi_level: 1,
    program_status: 'ACTIVE_COMPLIANT',
    risk_assessment: {
      composite_risk_score: 25,
      is_flagged: false,
      predicted_swdi_level: 1,
      flag_reasons: [],
      trigger_badges: [],
      evaluated_at: new Date(),
    },
  },
  {
    household_id: 'TEST-4PS-0002',
    head_of_household: {
      first_name: 'Maria',
      last_name: 'Santos',
      national_id: 'TEST-NID-0002',
      contact_phone: '+639170000002',
    },
    address: {
      street: 'Purok 2',
      barangay: 'Lecheria',
      municipality: 'Calamba',
      province: 'Laguna',
      coordinates: { type: 'Point', coordinates: [121.1750, 14.2150] },
    },
    demographics: {
      household_size: 6,
      dependents_ratio: 0.5,
      head_education_level: 2,
      wall_score: 3,
      roof_score: 3,
      water_access_level: 3,
    },
    children_registry: [{ birthdate: new Date('2012-08-20'), is_eligible: true }],
    enrolled_swdi_level: 1,
    program_status: 'FLAGGED_FOR_REVIEW',
    risk_assessment: {
      composite_risk_score: 82,
      is_flagged: true,
      predicted_swdi_level: 3,
      flag_reasons: [
        'Power consumption exceeds Lifeline limit',
        'LTO vehicle match detected',
      ],
      trigger_badges: [
        { code: 'POWER_LIFELINE_BREACH', label: 'Meralco > 200 kWh', severity: 'HIGH' },
        { code: 'LTO_VEHICLE_MATCH', label: 'Registered Motorcycle', severity: 'MEDIUM' },
      ],
      evaluated_at: new Date(),
    },
  },
  {
    household_id: 'TEST-4PS-0003',
    head_of_household: {
      first_name: 'Pedro',
      last_name: 'Reyes',
      national_id: 'TEST-NID-0003',
      contact_phone: '+639170000003',
    },
    address: {
      street: 'Purok 3',
      barangay: 'Real',
      municipality: 'Calamba',
      province: 'Laguna',
      coordinates: { type: 'Point', coordinates: [121.1850, 14.2200] },
    },
    demographics: {
      household_size: 4,
      dependents_ratio: 0.5,
      head_education_level: 2,
      wall_score: 2,
      roof_score: 2,
      water_access_level: 2,
    },
    children_registry: [{ birthdate: new Date('2016-11-05'), is_eligible: true }],
    enrolled_swdi_level: 2,
    program_status: 'UNDER_INVESTIGATION',
    risk_assessment: {
      composite_risk_score: 75,
      is_flagged: true,
      predicted_swdi_level: 3,
      flag_reasons: ['LandBank ATM withdrawal pattern flagged'],
      trigger_badges: [
        { code: 'TIER_INVERSION', label: 'AI Predicted Level 3', severity: 'CRITICAL' },
      ],
      evaluated_at: new Date(),
    },
  },
];

sampleBeneficiaries.forEach((b) => {
  const exists = appDb.beneficiaries.findOne({ household_id: b.household_id });
  if (exists) {
    print('    [SKIP] ' + b.household_id + ' already exists');
  } else {
    appDb.beneficiaries.insertOne(b);
    print('    [OK]   ' + b.household_id + ' (' + b.program_status + ')');
  }
});

// ============================================================
// 3. SAMPLE VERIFICATION TASKS (2)
// ============================================================
print('\n[3] Seeding sample verification tasks...');

const caseWorker = appDb.users.findOne({ username: 'case_worker_test' });

const sampleTasks = [
  {
    task_id: 'TEST-TSK-0001',
    household_id: 'TEST-4PS-0002',
    assigned_worker_id: caseWorker ? caseWorker._id : null,
    task_status: 'PENDING_DISPATCH',
    assignment_notes: 'Verify if motorcycle is used for delivery livelihood or personal luxury.',
    priority: 'HIGH',
    due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  },
  {
    task_id: 'TEST-TSK-0002',
    household_id: 'TEST-4PS-0003',
    assigned_worker_id: caseWorker ? caseWorker._id : null,
    task_status: 'SUBMITTED',
    assignment_notes: 'Verify physical custody of LandBank cash card.',
    priority: 'MEDIUM',
    due_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    field_findings: {
      verified_swdi_level: 3,
      worker_recommendation: 'RECOMMEND_GRADUATION',
      narrative_report: 'Field assessment confirmed active delivery business.',
      livelihood_asset_verification: {
        is_motorcycle_present: true,
        is_productive_asset: true,
        proof_type: 'MOVEIT',
        franchise_number: 'MV-2026-TEST-001',
      },
      landbank_card_inspection: {
        physical_card_presented: true,
        card_matches_beneficiary: true,
        pawning_suspected: false,
      },
      client_geolocation: {
        latitude: 14.2145,
        longitude: 121.1651,
        accuracy_meters: 4.2,
        captured_at: new Date(),
      },
      evidence_attachments: [],
    },
  },
];

sampleTasks.forEach((t) => {
  const exists = appDb.verification_tasks.findOne({ task_id: t.task_id });
  if (exists) {
    print('    [SKIP] ' + t.task_id + ' already exists');
  } else {
    appDb.verification_tasks.insertOne(t);
    print('    [OK]   ' + t.task_id + ' (' + t.task_status + ')');
  }
});

// ============================================================
// 4. SUMMARY
// ============================================================
print('\n=== Seeding complete ===\n');
print('Test credentials (bcrypt cost 10):');
print('  super_admin_test  / SuperAdminTest2026!');
print('  director_test     / DirectorTest2026!');
print('  case_worker_test  / CaseWorkerTest2026!');
print('  auditor_test      / AuditorTest2026!');
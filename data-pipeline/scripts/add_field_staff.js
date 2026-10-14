// ============================================================
// KilosUnlad — field staff fixture (deployment dataset)
// ============================================================
// Adds active caseworker (Municipal Link) accounts so that every barangay in the
// seeded municipality has at least one caseworker who can be dispatched there.
// Coverage is computed from the beneficiaries actually in the database, so the
// fixture fails loudly if a barangay is left without a caseworker.
// Uses only the existing `users` collection and fields — no schema change.
//
// Password for every account below: FieldStaff2026!  (bcrypt cost 10)
// Change it before any real use.
//
// Run inside kilosunlad-db as admin_user (load_deployment_data.sh does this):
//   docker exec kilosunlad-db mongosh "<admin uri>/kilosunlad?authSource=admin" --quiet /tmp/add_field_staff.js
// ============================================================
const appDb = db.getSiblingDB('kilosunlad');
const HASH = '$2a$10$/N.WmkyXAbOILu2eaWliaeXslW.qKu8qopa7zO2X3KMW4rEzJGxm6';
const AREA = { region: 'Region IV-A', province: 'Laguna', municipality: 'Calamba' };
const STAFF = [
  { username: 'cw_palingon_1', full_name: 'Andrea Lim', barangays: ['Palingon'] },
  { username: 'cw_palingon_2', full_name: 'Rafael Mendoza', barangays: ['Palingon'] },
  { username: 'cw_lecheria', full_name: 'Benjo Ramos', barangays: ['Lecheria'] },
  { username: 'cw_real', full_name: 'Carmela Dizon', barangays: ['Real'] },
];

print('=== KilosUnlad field staff fixture ===');
const now = new Date();
for (const s of STAFF) {
  appDb.users.updateOne({ username: s.username }, {
    $set: { full_name: s.full_name, email: `${s.username}@kilosunlad.local`, password_hash: HASH, role: 'CASE_WORKER',
      jurisdiction: { ...AREA, assigned_barangays: s.barangays }, is_active: true, updatedAt: now },
    $setOnInsert: { createdAt: now },
  }, { upsert: true });
  print(`[OK]   ${s.username} (${s.full_name}) covers ${s.barangays.join(', ')}`);
}

// Every barangay that has households must have an active caseworker.
const barangays = appDb.beneficiaries.distinct('address.barangay', { 'address.municipality': AREA.municipality });
let missing = 0;
for (const b of barangays) {
  const n = appDb.users.countDocuments({ role: 'CASE_WORKER', is_active: true,
    'jurisdiction.municipality': AREA.municipality, 'jurisdiction.assigned_barangays': b });
  const households = appDb.beneficiaries.countDocuments({ 'address.municipality': AREA.municipality, 'address.barangay': b });
  print(`       ${b}: ${households} households, ${n} caseworker(s)`);
  if (n === 0) missing++;
}
if (missing) { print(`[FAIL] ${missing} barangay(s) have no caseworker`); quit(1); }
print('[OK]   every barangay with households has at least one active caseworker');

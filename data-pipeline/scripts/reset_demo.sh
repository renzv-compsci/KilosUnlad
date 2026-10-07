#!/usr/bin/env sh
# ============================================================
# KilosUnlad — Phase 5 Task 5.1: Demo Reset Script
# ============================================================
# Wipes the kilosunlad database, recreates collections + indexes,
# re-seeds test accounts, and loads Phase 5 demo Case A.
#
# Usage:
#   docker-compose run --rm reset-demo
#
# Target: complete in under 10 seconds (Task 5.1 DoD).
#
# Performance note:
#   Each `docker exec mongosh` costs ~1-1.5s in process spawn overhead.
#   This script batches related operations into single mongosh calls
#   to minimize spawns without reducing functionality.
# ============================================================

set -eu

# ------------------------------------------------------------
# Configuration
# ------------------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

DB_CONTAINER="kilosunlad-db"
DB_NAME="kilosunlad"

ADMIN_USER="admin_user"
ADMIN_PASS="RootAdminSecret2026!"
ADMIN_AUTH_DB="admin"

APP_USER="app_user"
APP_PASS="AppUserPassword2026!"
APP_AUTH_DB="kilosunlad"

REPLICA_SET_URI="mongodb://${APP_USER}:${APP_PASS}@db:27017/${DB_NAME}?replicaSet=rs0&authSource=${APP_AUTH_DB}"
ADMIN_URI="mongodb://${ADMIN_USER}:${ADMIN_PASS}@db:27017/${DB_NAME}?authSource=${ADMIN_AUTH_DB}"

# ------------------------------------------------------------
# Helpers
# ------------------------------------------------------------
log() { echo "[reset_demo] $*"; }
fail() { echo "[reset_demo] FAIL: $*" >&2; exit 1; }

# ------------------------------------------------------------
# Banner
# ------------------------------------------------------------
START_TS=$(date +%s)

log "==============================================="
log "KilosUnlad — Demo Reset"
log "==============================================="

# ------------------------------------------------------------
# 1. Verify container is running
# ------------------------------------------------------------
log "[1/5] Checking database container..."
if ! docker ps --format '{{.Names}}' | grep -q "^${DB_CONTAINER}$"; then
  fail "Container ${DB_CONTAINER} is not running. Start the stack first."
fi
log "      Container ${DB_CONTAINER} is running."

# ------------------------------------------------------------
# 2. Wipe + recreate + indexes + PRIMARY check
#    Single mongosh call to minimize process spawns.
# ------------------------------------------------------------
log "[2/5] Wiping, recreating collections, and rebuilding indexes..."

docker exec -i "${DB_CONTAINER}" mongosh "${ADMIN_URI}" --quiet --eval "
  const db = db.getSiblingDB('${DB_NAME}');

  // Verify replica set state (fail fast if not PRIMARY)
  const state = rs.status().members[0].stateStr;
  if (state !== 'PRIMARY') {
    throw new Error('Replica set is ' + state + ', expected PRIMARY.');
  }
  print('      Replica set PRIMARY confirmed.');

  // Drop existing collections
  ['users','beneficiaries','external_records','verification_tasks','audit_logs','system_configs'].forEach(c => {
    try { db[c].drop(); } catch (e) {}
  });
  print('      Dropped 6 collections.');

  // Recreate collections
  db.createCollection('users');
  db.createCollection('beneficiaries');
  db.createCollection('external_records');
  db.createCollection('verification_tasks');
  db.createCollection('audit_logs');
  db.createCollection('system_configs');

  // Rebuild indexes
  db.users.createIndex({ email: 1 }, { unique: true });
  db.users.createIndex({ username: 1 }, { unique: true });
  db.users.createIndex({ role: 1, 'jurisdiction.municipality': 1 });

  db.beneficiaries.createIndex({ household_id: 1 }, { unique: true });
  db.beneficiaries.createIndex({ 'head_of_household.national_id': 1 }, { unique: true });
  db.beneficiaries.createIndex({ 'address.coordinates': '2dsphere' });
  db.beneficiaries.createIndex({ 'risk_assessment.is_flagged': 1, 'address.municipality': 1 });

  db.external_records.createIndex({ matched_household_id: 1 }, { unique: true });
  db.external_records.createIndex({ national_id: 1 });

  db.verification_tasks.createIndex({ task_id: 1 }, { unique: true });
  db.verification_tasks.createIndex({ assigned_worker_id: 1, task_status: 1 });

  db.audit_logs.createIndex({ sequence_index: 1 }, { unique: true });
  db.audit_logs.createIndex({ entry_hash: 1 }, { unique: true });

  print('      Collections + indexes rebuilt.');
"

# ------------------------------------------------------------
# 3. Seed test accounts + Phase 3 data
# ------------------------------------------------------------
log "[3/5] Seeding test accounts..."

SEED_TEST_DATA_SRC="${PROJECT_ROOT}/data-pipeline/scripts/seed_test_data.js"

if [ ! -f "${SEED_TEST_DATA_SRC}" ]; then
  log "      WARN: seed_test_data.js not found. Skipping."
else
  docker cp "${SEED_TEST_DATA_SRC}" "${DB_CONTAINER}:/tmp/seed_test_data.js" >/dev/null
  docker exec -i "${DB_CONTAINER}" mongosh "${ADMIN_URI}" /tmp/seed_test_data.js >/dev/null
  log "      Test accounts + sample records seeded."
fi

# ------------------------------------------------------------
# 4. Load demo Case A + verify counts
#    Single mongosh call for insert + counts.
# ------------------------------------------------------------
log "[4/5] Loading demo Case A and verifying..."

# Copy demo files
for f in graduation_beneficiary graduation_external; do
  DEMO_SRC="${PROJECT_ROOT}/data-pipeline/seeds/demo/${f}.json"
  if [ ! -f "${DEMO_SRC}" ]; then
    fail "Demo file missing: ${DEMO_SRC}"
  fi
  docker cp "${DEMO_SRC}" "${DB_CONTAINER}:/tmp/${f}.json" >/dev/null
done

docker exec -i "${DB_CONTAINER}" mongosh "${ADMIN_URI}" --quiet --eval "
  const fs = require('fs');
  const db = db.getSiblingDB('${DB_NAME}');

  // Insert demo Case A
  const ben = JSON.parse(fs.readFileSync('/tmp/graduation_beneficiary.json', 'utf8'));
  const ext = JSON.parse(fs.readFileSync('/tmp/graduation_external.json', 'utf8'));
  db.beneficiaries.insertOne(ben);
  db.external_records.insertOne(ext);
  print('      Demo Case A loaded.');

  // Verify counts
  print('      users:              ' + db.users.countDocuments({}));
  print('      beneficiaries:      ' + db.beneficiaries.countDocuments({}));
  print('      external_records:   ' + db.external_records.countDocuments({}));
  print('      verification_tasks: ' + db.verification_tasks.countDocuments({}));
  print('      audit_logs:         ' + db.audit_logs.countDocuments({}));
  print('      system_configs:     ' + db.system_configs.countDocuments({}));
"

# ------------------------------------------------------------
# Done
# ------------------------------------------------------------
END_TS=$(date +%s)
ELAPSED=$((END_TS - START_TS))

log "==============================================="
log "[5/5] Demo reset complete in ${ELAPSED}s"
if [ "${ELAPSED}" -lt 10 ]; then
  log "Within 10-second DoD."
else
  log "NOTE: ${ELAPSED}s — over 10-second DoD. See performance note in script header."
fi
log "==============================================="
#!/usr/bin/env bash
# ============================================================
# KilosUnlad — load the deployment dataset (20,000 households)
# ============================================================
# Everything the screens show is computed from the database; nothing is preset:
#   1. reset-demo: empty collections with their indexes, the four role accounts.
#   2. seed-ingest: the 20,000 generated households and their external records
#      (data-pipeline/seeds/*_test_20k.json, mapped onto the frozen models).
#   3. The hand-made test households (TEST-4PS-*) and their tasks are removed, so every
#      risk score, flag, task and ledger block below is produced by the system itself.
#      Case A (DEMO-4PS-GRAD-0001) stays unassessed for the live demo.
#   4. add_field_staff.js: caseworkers so that every barangay has one (checked).
#   5. populate_deployment.js, through the API only: the ML model assesses households until
#      25-40 are flagged, flagged households are dispatched to caseworkers in their barangay,
#      caseworkers submit geotagged reports, the director issues one notice and keeps one
#      household on the program. Every step is sealed in the audit ledger.
#
# Usage (repo root, stack running):  bash data-pipeline/scripts/load_deployment_data.sh
# Env: COMPOSE (default "docker compose"), BASE_URL, FLAG_TARGET (32), DISPATCH (12), SUBMIT (4),
#      POPULATE=0 stops after step 4 (used by deploy/atlas_seed.sh ACTIVITY=hosted, which runs
#      step 5 against the hosted API so the evidence photos are stored there).
# WARNING: replaces everything in the local kilosunlad database.
# ============================================================
export MSYS_NO_PATHCONV=1 MSYS2_ARG_CONV_EXCL="*"   # Windows Git Bash: keep container paths as written
set -euo pipefail
COMPOSE="${COMPOSE:-docker compose}"
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"
ADMIN='mongodb://admin_user:RootAdminSecret2026!@localhost:27017/kilosunlad?authSource=admin'
mongo() { docker exec kilosunlad-db mongosh "$ADMIN" --quiet "$@"; }
fixture() { docker cp "data-pipeline/scripts/$1.js" "kilosunlad-db:/tmp/$1.js" >/dev/null && mongo "/tmp/$1.js"; }

echo "[1/5] Reset (collections, indexes, role accounts)..."
$COMPOSE run --rm reset-demo >/dev/null
echo "[2/5] Ingest 20,000 households..."
$COMPOSE run --rm -e SEED_BENEFICIARIES=seed_beneficiaries_test_20k.json \
  -e SEED_EXTERNAL_RECORDS=seed_external_records_test_20k.json seed-ingest | grep -E "Inserted|inserted|complete|Done" || true
echo "[3/5] Remove the hand-made test households; keep Case A for the live demo..."
fixture add_int02_case_a_fixture >/dev/null
mongo --eval '
  const b = db.beneficiaries.deleteMany({ household_id: /^TEST-4PS-/ }).deletedCount;
  const e = db.external_records.deleteMany({ matched_household_id: /^TEST-4PS-/ }).deletedCount;
  const t = db.verification_tasks.deleteMany({}).deletedCount;
  print("      removed " + b + " test households, " + e + " external records, " + t + " preset tasks; ledger blocks: " + db.audit_logs.countDocuments());'
echo "[4/5] Field staff (a caseworker for every barangay)..."
fixture add_field_staff
if [ "${POPULATE:-1}" = "0" ]; then
  echo "[5/5] Skipped (POPULATE=0): run populate_deployment.js against the API that should hold the activity."
  exit 0
fi
echo "[5/5] Activity through the API (assess, dispatch, reports, decisions)..."
node data-pipeline/scripts/populate_deployment.js

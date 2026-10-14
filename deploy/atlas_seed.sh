#!/usr/bin/env bash
# ============================================================
# KilosUnlad — copy the locally seeded database to MongoDB Atlas
# ============================================================
# Seeds the local Docker stack with the project's own tools (same data,
# indexes and fixtures as every test run), then copies the `kilosunlad`
# database to Atlas with mongodump/mongorestore. No schema is created or
# changed: the dump carries the existing collections and indexes.
#
# Usage (from the repo root, local stack running):
#   ATLAS_ADMIN_URI='mongodb+srv://kilosunlad_admin:<pw>@<cluster-host>/?retryWrites=true&w=majority' \
#     bash deploy/atlas_seed.sh
#
# DATASET (default: deployment)
#   deployment  20,000 households + Case A, a caseworker for every barangay, and activity made
#               through the API: 25-40 model flags, dispatches, reports, one notice, one retention
#               (data-pipeline/scripts/load_deployment_data.sh).
#   demo        80k baseline, fixtures, ~1,500 assessed, 30 dispatched (load_demo_data.sh).
#   small       the 7 test households of MANUAL_TEST_SCENARIOS.md (SEED_80K=0 also selects this).
# ACTIVITY (deployment only; default: local)
#   local       the activity is created on the local stack and copied with the data.
#   hosted      only households and accounts are copied; then run populate_deployment.js against
#               the hosted API (printed at the end), so the report photos are stored on the host.
#
# ATLAS_ADMIN_URI must belong to an Atlas user that can write the
# `kilosunlad` database (e.g. built-in role readWriteAnyDatabase). The API
# itself connects with the separate app user (see HOSTING_GUIDE.md §1).
# WARNING: --drop replaces the `kilosunlad` database on Atlas.
# ============================================================
export MSYS_NO_PATHCONV=1 MSYS2_ARG_CONV_EXCL="*"   # Windows Git Bash: keep container paths as written
set -euo pipefail
: "${ATLAS_ADMIN_URI:?Set ATLAS_ADMIN_URI to the Atlas admin connection string}"
COMPOSE="${COMPOSE:-docker compose}"  # override, e.g. COMPOSE=docker-compose
DATASET="${DATASET:-deployment}"
[ "${SEED_80K:-}" = "0" ] && DATASET=small
[ "${SEED_80K:-}" = "1" ] && DATASET=demo
ACTIVITY="${ACTIVITY:-local}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ADMIN_LOCAL="mongodb://admin_user:RootAdminSecret2026!@localhost:27017/?authSource=admin"
OUT="$ROOT/deploy/kilosunlad.archive.gz"
cd "$ROOT"

case "$DATASET" in
  deployment)
    if [ "$ACTIVITY" = "hosted" ]; then
      echo "[1-2/4] Load the deployment dataset without activity (ACTIVITY=hosted)..."
      COMPOSE="$COMPOSE" POPULATE=0 bash data-pipeline/scripts/load_deployment_data.sh
    else
      echo "[1-2/4] Load the deployment dataset (20k households, caseworkers, activity through the local API)..."
      COMPOSE="$COMPOSE" bash data-pipeline/scripts/load_deployment_data.sh
    fi ;;
  demo)
    echo "[1-2/4] Load the populated demo dataset (80k baseline, fixtures, assessed sample, dispatches)..."
    COMPOSE="$COMPOSE" bash data-pipeline/scripts/load_demo_data.sh ;;
  small)
    echo "[1-2/4] Reset to the small test set..."
    COMPOSE="$COMPOSE" bash data-pipeline/scripts/reset_test_data.sh ;;
  *) echo "Unknown DATASET=$DATASET (deployment, demo or small)"; exit 1 ;;
esac

echo "[3/4] Dump the local kilosunlad database..."
docker exec kilosunlad-db mongodump --uri "$ADMIN_LOCAL" --db kilosunlad --archive --gzip > "$OUT"
ls -lh "$OUT"

echo "[4/4] Restore into Atlas (replaces the kilosunlad database there)..."
docker run --rm -i ${RESTORE_DOCKER_ARGS:-} mongo:6.0 mongorestore --uri "$ATLAS_ADMIN_URI" --archive --gzip --drop \
  --nsInclude 'kilosunlad.*' < "$OUT"
echo "[OK] Atlas now holds the seeded kilosunlad database ($DATASET). Test logins: see deploy/HOSTING_GUIDE.md §7."
if [ "$DATASET" = "deployment" ] && [ "$ACTIVITY" = "hosted" ]; then
  echo "Next, once the hosted API and ML service answer /health (HOSTING_GUIDE.md §6):"
  echo "  BASE_URL=https://<your-api>.onrender.com/api/v1 node data-pipeline/scripts/populate_deployment.js"
fi

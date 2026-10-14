#!/usr/bin/env bash
# ============================================================
# KilosUnlad — load the populated demo dataset (local Docker stack)
# ============================================================
# 1. Reset to the 80,000-household baseline (snapshot restore when
#    snapshot_baseline.sh has been run, otherwise reset + seed-ingest).
# 2. Add the three test fixtures (Case A, a household under notice,
#    a flagged household ready to dispatch).
# 3. populate_demo.js: assess ~1,500 households through the API and
#    dispatch 30 flagged ones, so dashboards, map and ledger have data.
#
# Usage (repo root, stack running):  bash data-pipeline/scripts/load_demo_data.sh
# Env: COMPOSE (default "docker compose"), BASE_URL, SAMPLE_PAGES, DISPATCH
# WARNING: replaces everything in the local kilosunlad database.
# ============================================================
export MSYS_NO_PATHCONV=1 MSYS2_ARG_CONV_EXCL="*"   # Windows Git Bash: keep container paths as written
set -euo pipefail
COMPOSE="${COMPOSE:-docker compose}"
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"
ADMIN="mongodb://admin_user:RootAdminSecret2026!@localhost:27017/kilosunlad?authSource=admin"

echo "[1/3] Reset to the 80,000-household baseline..."
if [ -s data-pipeline/snapshots/baseline_80k_beneficiaries.archive.gz ] && [ -s data-pipeline/snapshots/baseline_80k_external_records.archive.gz ]; then
  $COMPOSE run --rm -e RESET_BASELINE=1 reset-demo
else
  $COMPOSE run --rm reset-demo
  $COMPOSE run --rm seed-ingest
fi

echo "[2/3] Test fixtures..."
for fixture in add_int02_case_a_fixture add_int03_notice_fixture add_dispatch_test; do
  docker cp "data-pipeline/scripts/$fixture.js" "kilosunlad-db:/tmp/$fixture.js" >/dev/null
  docker exec kilosunlad-db mongosh "$ADMIN" --quiet "/tmp/$fixture.js" >/dev/null
done

echo "[3/3] Assess a sample and dispatch flagged households (through the API)..."
node data-pipeline/scripts/populate_demo.js

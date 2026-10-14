#!/usr/bin/env bash
# ============================================================
# KilosUnlad — one-command reset for the manual test scenarios
# ============================================================
# Usage (from the repository root, Linux, macOS or Windows Git Bash):
#   bash data-pipeline/scripts/reset_test_data.sh          # small set: 7 test households
#   bash data-pipeline/scripts/reset_test_data.sh demo     # 80k demo dataset (load_demo_data.sh)
# Env: COMPOSE (default "docker compose"; use "docker-compose" for Compose v1).
#
# Small set = reset-demo (users, indexes, 5 test households, empty ledger) plus the three
# fixtures: Case A (DEMO-4PS-GRAD-0001), Lorna Bautista under notice, Dispatch TestSubject.
# Container paths are protected from Git Bash path conversion (MSYS_NO_PATHCONV).
# ============================================================
set -euo pipefail
export MSYS_NO_PATHCONV=1 MSYS2_ARG_CONV_EXCL='*'   # Git Bash: never rewrite /tmp or /app paths
cd "$(dirname "$0")/../.."
COMPOSE="${COMPOSE:-docker compose}"
ADMIN='mongodb://admin_user:RootAdminSecret2026!@localhost:27017/kilosunlad?authSource=admin'

if [ "${1:-small}" = "demo" ]; then
  exec bash data-pipeline/scripts/load_demo_data.sh
fi

echo "[1/2] reset-demo (users, indexes, 5 test households, empty ledger)..."
$COMPOSE run --rm reset-demo >/dev/null
echo "[2/2] fixtures..."
for f in add_int02_case_a_fixture add_int03_notice_fixture add_dispatch_test; do
  docker cp "data-pipeline/scripts/$f.js" "kilosunlad-db:/tmp/$f.js" >/dev/null
  docker exec kilosunlad-db mongosh "$ADMIN" --quiet "/tmp/$f.js" >/dev/null
  echo "      $f loaded"
done
docker exec kilosunlad-db mongosh "$ADMIN" --quiet --eval \
  'print("households: " + db.beneficiaries.countDocuments() + ", tasks: " + db.verification_tasks.countDocuments() + ", ledger blocks: " + db.audit_logs.countDocuments())'
echo "Ready. Open http://localhost and sign in (MANUAL_TEST_SCENARIOS.md §0)."

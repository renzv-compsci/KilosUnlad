#!/usr/bin/env bash
# ============================================================
# KilosUnlad — Sprint 6 DEF-01/DEF-02: Capstone Proof Rehearsal
# ============================================================
# Runs the four capstone proofs (MASTER_TURNOVER Domain 6 Step 4), each from a
# clean reset, times each scenario, and writes logs + a summary into an
# evidence folder. `--full` also runs every Sprint 1-5 integration script
# (STR-04 evidence capture), including the 80k concurrency test.
#
# Usage (Docker stack):  bash data-pipeline/scripts/run_capstone_proofs.sh [--full]
# Overrides (env): RESET_CMD, RESET_BASELINE_CMD, FIXTURE_CMD (receives a fixture name), SEED_CMD,
#   BASE_URL, GATEWAY_URL, ML_URL, CLIENT_URL, MONGO_URI, ADMIN_MONGO_URI, EVIDENCE_DIR.
# Proof 2 and the drawer UI test need `npm install playwright-core` on NODE_PATH.
# ============================================================
set -u

SCRIPTS="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$SCRIPTS/../.." && pwd)"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
FULL=0; [ "${1:-}" = "--full" ] && FULL=1

ADMIN_IN_CONTAINER="mongodb://admin_user:RootAdminSecret2026!@localhost:27017/kilosunlad?authSource=admin"
RESET_CMD="${RESET_CMD:-docker-compose run --rm reset-demo}"
SEED_CMD="${SEED_CMD:-docker-compose run --rm seed-ingest}"
default_fixture() {
  docker cp "$SCRIPTS/$1.js" "kilosunlad-db:/tmp/$1.js" >/dev/null &&
    docker exec kilosunlad-db mongosh "$ADMIN_IN_CONTAINER" --quiet "/tmp/$1.js"
}
fixture() { if [ -n "${FIXTURE_CMD:-}" ]; then $FIXTURE_CMD "$1"; else default_fixture "$1"; fi; }
WITH_SEED=0
# DAT-05: with a baseline snapshot (snapshot_baseline.sh), the 80k steps restore it
# in one fast reset instead of reset + seed-ingest.
RESET_BASELINE_CMD="${RESET_BASELINE_CMD:-docker-compose run --rm -e RESET_BASELINE=1 reset-demo}"
has_snapshot() { [ -s "$ROOT/data-pipeline/snapshots/baseline_80k_beneficiaries.archive.gz" ] &&
  [ -s "$ROOT/data-pipeline/snapshots/baseline_80k_external_records.archive.gz" ]; }
do_reset() {
  if [ $WITH_SEED -eq 1 ] && has_snapshot; then $RESET_BASELINE_CMD
  else $RESET_CMD && if [ $WITH_SEED -eq 1 ]; then $SEED_CMD; fi; fi
}

export BASE_URL="${BASE_URL:-http://localhost:5000/api/v1}"
GATEWAY_URL="${GATEWAY_URL:-http://localhost/api/v1}"
export ML_URL="${ML_URL:-http://localhost:8000}"
export CLIENT_URL="${CLIENT_URL:-http://localhost:3000}"
EVIDENCE_DIR="${EVIDENCE_DIR:-$ROOT/docs/integration/evidence/sprint-6/rehearsal-$STAMP}"
mkdir -p "$EVIDENCE_DIR"
SUMMARY="$EVIDENCE_DIR/SUMMARY.md"
printf '# Capstone rehearsal %s\n\n| # | Scenario | Script | Result | Seconds |\n| --- | --- | --- | --- | --- |\n' "$STAMP" > "$SUMMARY"
FAILED=0; N=0

# run <label> <fixtures (space-separated, may be empty)> <script> [extra env assignments...]
run() {
  local label="$1" fixtures="$2" script="$3"; shift 3
  N=$((N + 1))
  local log="$EVIDENCE_DIR/$(printf '%02d' "$N")-$script.log"
  echo "== [$N] $label ($script)"
  local start end result
  start=$(date +%s.%N)
  {
    echo "# $label — $(date -u +%FT%TZ)"
    do_reset
    for f in $fixtures; do fixture "$f"; done
    env "$@" node "$SCRIPTS/$script.js"
  } > "$log" 2>&1
  result=$?
  end=$(date +%s.%N)
  local secs; secs=$(awk "BEGIN { printf \"%.1f\", $end - $start }")
  if [ $result -eq 0 ]; then echo "   PASS (${secs}s)"; else echo "   FAIL (${secs}s) -> $log"; FAILED=$((FAILED + 1)); fi
  printf '| %s | %s | `%s` | %s | %s |\n' "$N" "$label" "$script.js" "$([ $result -eq 0 ] && echo PASS || echo FAIL)" "$secs" >> "$SUMMARY"
}

echo "Evidence: $EVIDENCE_DIR"
run "Proof 1: Graduation Drift (assess -> triage -> dispatch -> report -> audit, via gateway)" \
  "add_int02_case_a_fixture" test_e2e01_full_chain BASE_URL="$GATEWAY_URL"
run "Proof 2: Offline Field Visit (airplane mode, zero-loss sync)" \
  "add_int02_case_a_fixture add_dispatch_test" test_str02_airplane_sync
run "Proof 3: Sangla-ATM Syndicate (85/100)" "" test_proof3_sangla_atm
run "Proof 4: Audit Proof (tamper block 3 detected)" "add_int02_case_a_fixture" test_str01_tamper_detection

if [ $FULL -eq 1 ]; then
  run "INT-01 ML contract v1.1" "" test_int01_ml_contract
  run "INT-05 risk assessment" "" test_int05_risk_assessment
  run "INT-02 field submission" "add_int02_case_a_fixture" test_int02_submission
  run "INT-03 appeals docket" "add_int03_notice_fixture" test_int03_appeals_docket
  run "INT-04 calamity toggle" "" test_int04_calamity_toggle
  run "INT-08 due process docket (API + browser)" "add_int03_notice_fixture" test_int08_appeals_ui
  run "E2E-02 calamity freeze" "add_dispatch_test" test_e2e02_calamity_freeze
  run "E2E-03 age-out (RA 11310)" "add_e2e03_age_out_fixture" test_e2e03_age_out
  run "E2E-04 SHAP drawer (API)" "" test_e2e04_shap_drawer
  run "E2E-04 SHAP drawer (browser)" "" test_e2e04_drawer_ui SCREENSHOT="$EVIDENCE_DIR/e2e04-drawer.png"
  run "UI live data, phone/tablet/desktop (DECISION-010)" "add_dispatch_test" test_ui_live_data SCREENSHOT_DIR="$EVIDENCE_DIR/ui-live-data"
  run "Notice issuance, evidence integrity, graduation (DECISION-011)" "add_int02_case_a_fixture" test_decision011_notice_flow SCREENSHOT="$EVIDENCE_DIR/decision011-review.png"
  # DAT-01 and STR-03 need the 80k baseline: reset + seed-ingest inside one step.
  WITH_SEED=1
  run "DAT-01 seed conformance (80k)" "" test_dat01_seed_conformance
  run "STR-03 concurrency at volume" "add_int02_case_a_fixture" test_str03_concurrency
  WITH_SEED=0
fi

printf '\n%s of %s scenarios passed.\n' "$((N - FAILED))" "$N" >> "$SUMMARY"
echo "$((N - FAILED))/$N passed. Summary: $SUMMARY"
[ $FAILED -eq 0 ]

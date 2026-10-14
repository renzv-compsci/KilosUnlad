#!/usr/bin/env bash
# ============================================================
# KilosUnlad — Section 12 (Software Testing) test-plan runner
# ============================================================
# Executes every case in the Section 12 test plan from a clean reset and writes
# one log per step plus SUMMARY.md into an evidence folder:
#   12.1.2 unit tier   server node --test, client node --test, ML pytest
#   12.2   TC-01..TC-17 test_section12_plan.js + the sprint scripts that
#                       already cover a case (offline sync, appeals, tamper,
#                       calamity, compound index)
#          TC-18..TC-24 extended cases (live UI, report review and evidence,
#                       graduation, retention, hearing outcome, cooldown)
#   12.3   DEF-01..07   test_section12_defects.js
#   12.4   UAT A..D     scripted walkthroughs (E2E-01, E2E-04 drawer UI, STR-02,
#                       INT-08, STR-01). Participant ratings are not automated.
#
# Usage (Docker stack):  bash data-pipeline/scripts/run_section12_plan.sh
# Overrides (env): RESET_CMD, RESET_BASELINE_CMD, FIXTURE_CMD (receives a fixture name), SEED_CMD,
#   BASE_URL, ML_URL, CLIENT_URL, MONGO_URI, ADMIN_MONGO_URI, APP_MONGO_URI,
#   JWT_SECRET, PYTHON, SERVER_TEST_ENV, EVIDENCE_DIR.
# Browser steps need `npm install playwright-core` on NODE_PATH.
# ============================================================
export MSYS_NO_PATHCONV=1 MSYS2_ARG_CONV_EXCL="*"   # Windows Git Bash: keep container paths as written
set -u

SCRIPTS="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$SCRIPTS/../.." && pwd)"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"

ADMIN_IN_CONTAINER="mongodb://admin_user:RootAdminSecret2026!@localhost:27017/kilosunlad?authSource=admin"
RESET_CMD="${RESET_CMD:-docker-compose run --rm reset-demo}"
SEED_CMD="${SEED_CMD:-docker-compose run --rm seed-ingest}"
RESET_BASELINE_CMD="${RESET_BASELINE_CMD:-docker-compose run --rm -e RESET_BASELINE=1 reset-demo}"
default_fixture() {
  docker cp "$SCRIPTS/$1.js" "kilosunlad-db:/tmp/$1.js" >/dev/null &&
    docker exec kilosunlad-db mongosh "$ADMIN_IN_CONTAINER" --quiet "/tmp/$1.js"
}
fixture() { if [ -n "${FIXTURE_CMD:-}" ]; then $FIXTURE_CMD "$1"; else default_fixture "$1"; fi; }

export BASE_URL="${BASE_URL:-http://localhost:5000/api/v1}"
export ML_URL="${ML_URL:-http://localhost:8000}"
export CLIENT_URL="${CLIENT_URL:-http://localhost:3000}"
export JWT_SECRET="${JWT_SECRET:-super_secret_kilosunlad_jwt_key_2026_dswd_audit}"
PYTHON="${PYTHON:-python3}"
EVIDENCE_DIR="${EVIDENCE_DIR:-$ROOT/docs/testing/evidence/run-$STAMP}"
mkdir -p "$EVIDENCE_DIR"
SUMMARY="$EVIDENCE_DIR/SUMMARY.md"
printf '# Section 12 test-plan run %s\n\n| # | Plan item | Step | Result | Seconds |\n| --- | --- | --- | --- | --- |\n' "$STAMP" > "$SUMMARY"
FAILED=0; N=0

# step <plan items> <label> <reset: none|reset|seed> <fixtures> -- <command...>
step() {
  local items="$1" label="$2" mode="$3" fixtures="$4"; shift 5
  N=$((N + 1))
  local log; log="$EVIDENCE_DIR/$(printf '%02d' "$N")-$(echo "$label" | tr ' /' '__' | tr -cd 'A-Za-z0-9_.-').log"
  echo "== [$N] $items: $label"
  local start end result
  start=$(date +%s.%N)
  {
    echo "# $items — $label — $(date -u +%FT%TZ)"
    case "$mode" in
      reset) $RESET_CMD ;;
      seed) if [ -s "$ROOT/data-pipeline/snapshots/baseline_80k_beneficiaries.archive.gz" ] &&
               [ -s "$ROOT/data-pipeline/snapshots/baseline_80k_external_records.archive.gz" ]; then
              $RESET_BASELINE_CMD   # DAT-05 snapshot restore
            else $RESET_CMD && $SEED_CMD; fi ;;
    esac
    for f in $fixtures; do fixture "$f"; done
    "$@"
  } > "$log" 2>&1
  result=$?
  end=$(date +%s.%N)
  local secs; secs=$(awk "BEGIN { printf \"%.1f\", $end - $start }")
  if [ $result -eq 0 ]; then echo "   PASS (${secs}s)"; else echo "   FAIL (${secs}s) -> $log"; FAILED=$((FAILED + 1)); fi
  printf '| %s | %s | %s | %s | %s |\n' "$N" "$items" "$label" "$([ $result -eq 0 ] && echo PASS || echo FAIL)" "$secs" >> "$SUMMARY"
}
node_script() { node "$SCRIPTS/$1.js"; }

echo "Evidence: $EVIDENCE_DIR"
# 12.1.2 Unit tier
step "Unit" "server node --test" none "" -- bash -c "cd '$ROOT/server' && env ${SERVER_TEST_ENV:-} npm test"
step "Unit" "client node --test" none "" -- bash -c "cd '$ROOT/client' && npm test && npm run build && npm run test:pwa"
step "Unit" "ML and UAT-scorer pytest" none "" -- "$PYTHON" -m pytest -q "$SCRIPTS/test_section12_ml_unit.py" "$SCRIPTS/test_score_uat.py"

# 12.2 Test cases
step "TC-01..06, 08, 09, 10, 13, 15" "test_section12_plan" reset "add_int02_case_a_fixture" -- \
  env EVIDENCE_JSON="$EVIDENCE_DIR/tc_api_cases.json" node "$SCRIPTS/test_section12_plan.js"
step "TC-07, TC-10" "test_str02_airplane_sync (browser offline)" reset "add_int02_case_a_fixture add_dispatch_test" -- node_script test_str02_airplane_sync
step "TC-11, TC-12" "test_int03_appeals_docket" reset "add_int03_notice_fixture" -- node_script test_int03_appeals_docket
step "TC-11, TC-12" "test_int08_appeals_ui (browser)" reset "add_int03_notice_fixture" -- node_script test_int08_appeals_ui
step "TC-14" "test_str01_tamper_detection" reset "add_int02_case_a_fixture" -- node_script test_str01_tamper_detection
step "TC-16" "test_int04_calamity_toggle" reset "" -- node_script test_int04_calamity_toggle
step "TC-16" "test_e2e02_calamity_freeze" reset "add_dispatch_test" -- node_script test_e2e02_calamity_freeze
step "TC-17" "verify_compound_index (80k)" seed "" -- "$PYTHON" "$SCRIPTS/verify_compound_index.py"

# 12.2 extended cases TC-18..TC-24 (post-plan scope: DECISION-010, -011, -012)
step "TC-18, TC-19" "test_ui_live_data (browser, 390/834/1440 px)" reset "add_dispatch_test" -- \
  env SCREENSHOT_DIR="$EVIDENCE_DIR/ui-live-data" node "$SCRIPTS/test_ui_live_data.js"
step "TC-11, TC-20, TC-21" "test_decision011_notice_flow (browser)" reset "add_int02_case_a_fixture" -- \
  env SCREENSHOT="$EVIDENCE_DIR/tc20-report-review.png" node "$SCRIPTS/test_decision011_notice_flow.js"
step "TC-22, TC-23, TC-24" "test_decision012_retention_flow (browser)" reset "add_int02_case_a_fixture add_int03_notice_fixture" -- \
  env SCREENSHOT="$EVIDENCE_DIR/tc22-retain.png" node "$SCRIPTS/test_decision012_retention_flow.js"

# 12.3 Defects
step "DEF-01..07" "test_section12_defects" none "" -- \
  env EVIDENCE_JSON="$EVIDENCE_DIR/defects.json" node "$SCRIPTS/test_section12_defects.js"

# 12.4 UAT scripted walkthroughs (B, C and D are also covered by the TC-07/10, TC-11/12 and TC-14 steps)
step "UAT-A" "test_e2e01_full_chain" reset "add_int02_case_a_fixture" -- node_script test_e2e01_full_chain
step "UAT-A" "test_e2e04_drawer_ui (browser)" reset "" -- env SCREENSHOT="$EVIDENCE_DIR/uat-a-drawer.png" node "$SCRIPTS/test_e2e04_drawer_ui.js"

printf '\n%s of %s steps passed.\n' "$((N - FAILED))" "$N" >> "$SUMMARY"
echo "$((N - FAILED))/$N passed. Summary: $SUMMARY"
[ $FAILED -eq 0 ]

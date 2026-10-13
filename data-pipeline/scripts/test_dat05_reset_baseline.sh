#!/usr/bin/env bash
# ============================================================
# KilosUnlad — Sprint 3 DAT-05: reset-demo at the 80k baseline within 10 s
# ============================================================
# Times `reset-demo` in baseline mode (RESET_BASELINE=1: wipe, restore the
# 80k snapshot, re-seed test accounts and Demo Case A), then checks:
#   1. wall-clock time (including `docker-compose run` start-up) < 10 s;
#   2. exactly 80,000 SYN-4PS beneficiaries and 80,000 matching external records;
#   3. test accounts and Demo Case A present, audit ledger empty;
#   4. the baseline is model-conformant and every declared index exists
#      (test_dat01_seed_conformance.js).
#
# Prerequisites: stack running; baseline snapshot created once with
#   bash data-pipeline/scripts/snapshot_baseline.sh
# server/node_modules installed (for step 4).
#
# Usage: bash data-pipeline/scripts/test_dat05_reset_baseline.sh
# Overrides: RESET_BASELINE_CMD, MONGO_URI, ADMIN_IN_CONTAINER.
# ============================================================
set -u
SCRIPTS="$(cd "$(dirname "$0")" && pwd)"
SNAP_DIR="$SCRIPTS/../snapshots"
RESET_BASELINE_CMD="${RESET_BASELINE_CMD:-docker-compose run --rm -e RESET_BASELINE=1 reset-demo}"
ADMIN_IN_CONTAINER="${ADMIN_IN_CONTAINER:-mongodb://admin_user:RootAdminSecret2026!@localhost:27017/kilosunlad?authSource=admin}"
LIMIT_MS=10000
FAIL=0
ok() { echo "   [OK]   $1"; }
bad() { echo "   [FAIL] $1"; FAIL=$((FAIL + 1)); }

echo "[START] DAT-05 reset-demo at the 80k baseline"
for f in baseline_80k_beneficiaries.archive.gz baseline_80k_external_records.archive.gz; do
  [ -s "$SNAP_DIR/$f" ] || { echo "[FAIL] Missing $SNAP_DIR/$f. Run snapshot_baseline.sh once first."; exit 1; }
done

echo "[1] Timing reset-demo in baseline mode..."
start=$(date +%s%N)
$RESET_BASELINE_CMD > /tmp/dat05_reset.log 2>&1
rc=$?
end=$(date +%s%N)
ms=$(( (end - start) / 1000000 ))
sed 's/^/      /' /tmp/dat05_reset.log | grep -E "\[reset_demo\]" | tail -12
[ $rc -eq 0 ] && ok "reset-demo exited 0" || bad "reset-demo exited $rc"
[ $ms -lt $LIMIT_MS ] && ok "wall-clock ${ms} ms < ${LIMIT_MS} ms (DAT-05 DoD)" || bad "wall-clock ${ms} ms >= ${LIMIT_MS} ms"
echo ""

echo "[2] Counts after reset..."
counts=$(docker exec kilosunlad-db mongosh "$ADMIN_IN_CONTAINER" --quiet --eval '
  const d = db.getSiblingDB("kilosunlad");
  print(JSON.stringify({
    syn_ben: d.beneficiaries.countDocuments({ household_id: /^SYN-4PS-/ }),
    syn_ext: d.external_records.countDocuments({ matched_household_id: /^SYN-4PS-/ }),
    users: d.users.countDocuments({}),
    case_a: d.beneficiaries.countDocuments({ household_id: "DEMO-4PS-GRAD-0001" }),
    audit: d.audit_logs.countDocuments({}) }));')
echo "      $counts"
echo "$counts" | grep -q '"syn_ben":80000' && ok "80,000 baseline beneficiaries" || bad "baseline beneficiaries != 80,000"
echo "$counts" | grep -q '"syn_ext":80000' && ok "80,000 matching external records" || bad "baseline external records != 80,000"
echo "$counts" | grep -q '"case_a":1' && ok "Demo Case A loaded" || bad "Demo Case A missing"
echo "$counts" | grep -qE '"users":[1-9]' && ok "test accounts seeded" || bad "no test accounts"
echo "$counts" | grep -q '"audit":0' && ok "audit ledger empty" || bad "audit ledger not empty"
echo ""

echo "[3] Conformance and declared indexes (DAT-01 script)..."
if node "$SCRIPTS/test_dat01_seed_conformance.js" > /tmp/dat05_dat01.log 2>&1; then ok "DAT-01 conformance passes"; else bad "DAT-01 conformance failed (see /tmp/dat05_dat01.log)"; tail -5 /tmp/dat05_dat01.log; fi
echo ""

if [ $FAIL -gt 0 ]; then echo "[FAIL] DAT-05 TEST FAILED ($FAIL check(s))"; exit 1; fi
echo "[SUCCESS] DAT-05 TEST PASSED! (${ms} ms)"

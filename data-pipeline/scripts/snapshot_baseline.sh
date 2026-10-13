#!/usr/bin/env bash
# ============================================================
# KilosUnlad — Sprint 3 DAT-05: snapshot the ingested 80k baseline
# ============================================================
# Run ONCE after a reset + seed-ingest. Dumps only the ADR-001 baseline
# documents (SYN-4PS-*) of beneficiaries and external_records, with their
# index definitions, into gzip archives that `reset-demo` restores when
# RESET_BASELINE=1. Nothing in the database is changed.
#
#   docker-compose run --rm reset-demo
#   docker-compose run --rm seed-ingest
#   bash data-pipeline/scripts/snapshot_baseline.sh
#
# Output: data-pipeline/snapshots/baseline_80k_{beneficiaries,external_records}.archive.gz
# (gitignored; regenerate whenever the seed files change).
# ============================================================
set -euo pipefail
SCRIPTS="$(cd "$(dirname "$0")" && pwd)"
OUT="$SCRIPTS/../snapshots"
URI="mongodb://admin_user:RootAdminSecret2026!@localhost:27017/?authSource=admin"
mkdir -p "$OUT"

dump() { # collection, key field
  docker exec kilosunlad-db mongodump --uri "$URI" --db kilosunlad --collection "$1" \
    --query "{\"$2\": {\"\$regex\": \"^SYN-4PS-\"}}" --archive --gzip --quiet > "$OUT/baseline_80k_$1.archive.gz.tmp"
  mv "$OUT/baseline_80k_$1.archive.gz.tmp" "$OUT/baseline_80k_$1.archive.gz"
}
count=$(docker exec kilosunlad-db mongosh "$URI" --quiet --eval \
  'db.getSiblingDB("kilosunlad").beneficiaries.countDocuments({household_id: /^SYN-4PS-/})')
[ "$count" = "80000" ] || { echo "[FAIL] Expected 80,000 baseline beneficiaries, found $count. Run reset-demo + seed-ingest first."; exit 1; }
dump beneficiaries household_id
dump external_records matched_household_id
ls -la "$OUT"/baseline_80k_*.archive.gz
echo "[OK] Baseline snapshot written to $OUT"

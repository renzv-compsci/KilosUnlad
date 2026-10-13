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
#     bash deploy/atlas_seed.sh            # 80,000-household baseline + test fixtures
#   SEED_80K=0 bash deploy/atlas_seed.sh   # test households only (smaller, faster)
#
# ATLAS_ADMIN_URI must belong to an Atlas user that can write the
# `kilosunlad` database (e.g. built-in role readWriteAnyDatabase). The API
# itself connects with the separate app user (see HOSTING_GUIDE.md §2).
# WARNING: --drop replaces the `kilosunlad` database on Atlas.
# ============================================================
set -euo pipefail
: "${ATLAS_ADMIN_URI:?Set ATLAS_ADMIN_URI to the Atlas admin connection string}"
COMPOSE="${COMPOSE:-docker compose}"  # override, e.g. COMPOSE=docker-compose
SEED_80K="${SEED_80K:-1}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ADMIN_LOCAL="mongodb://admin_user:RootAdminSecret2026!@localhost:27017/?authSource=admin"
OUT="$ROOT/deploy/kilosunlad.archive.gz"
cd "$ROOT"

echo "[1/4] Reset the local database (users, indexes, test households)..."
$COMPOSE run --rm reset-demo
if [ "$SEED_80K" = "1" ]; then
  echo "[2/4] Ingest the 80,000-household baseline..."
  $COMPOSE run --rm seed-ingest
else
  echo "[2/4] Skipping the 80k baseline (SEED_80K=0)."
fi
for fixture in add_int02_case_a_fixture add_int03_notice_fixture add_dispatch_test; do
  docker cp "data-pipeline/scripts/$fixture.js" "kilosunlad-db:/tmp/$fixture.js" >/dev/null
  docker exec kilosunlad-db mongosh "mongodb://admin_user:RootAdminSecret2026!@localhost:27017/kilosunlad?authSource=admin" \
    --quiet "/tmp/$fixture.js" >/dev/null
done

echo "[3/4] Dump the local kilosunlad database..."
docker exec kilosunlad-db mongodump --uri "$ADMIN_LOCAL" --db kilosunlad --archive --gzip > "$OUT"
ls -lh "$OUT"

echo "[4/4] Restore into Atlas (replaces the kilosunlad database there)..."
docker run --rm -i ${RESTORE_DOCKER_ARGS:-} mongo:6.0 mongorestore --uri "$ATLAS_ADMIN_URI" --archive --gzip --drop \
  --nsInclude 'kilosunlad.*' < "$OUT"
echo "[OK] Atlas now holds the seeded kilosunlad database. Test logins: see deploy/HOSTING_GUIDE.md."

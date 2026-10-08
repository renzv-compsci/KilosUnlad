#!/usr/bin/env python3
"""
KilosUnlad — Phase 3 Task 3.1: Automated Seed Ingestion Tool

Reads seed_beneficiaries.json and seed_external_records.json from
/data-pipeline/seeds/ and bulk-inserts them into MongoDB.

Task requirements:
  - Path: /data-pipeline/scripts/seed_db.py
  - Ingest seed_beneficiaries.json and seed_external_records.json into MongoDB
    using PyMongo bulk writes
  - Handle duplicate key errors gracefully during bulk inserts
  - DoD: Ingests 5,000 household profiles and matched external utility records
    in under 15 seconds

Path resolution:
  JSON files live in /data-pipeline/seeds/ (per DECISION-008 and
  docs/PROJECT_STRUCTURE.md). Script resolves ../seeds/ relative to itself,
  with fallback to ./ for flexibility.

Connection:
  Runs inside the seed-ingest Docker service and connects to db:27017 over
  the kilosunlad-network with ?replicaSet=rs0 (per DECISION-006).
"""

import json
import sys
import time
from pathlib import Path

from pymongo import MongoClient
from pymongo.errors import BulkWriteError, ConnectionFailure

# ---------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------

MONGO_URI = (
    "mongodb://app_user:AppUserPassword2026!@db:27017/"
    "kilosunlad?replicaSet=rs0&authSource=kilosunlad"
)

DB_NAME = "kilosunlad"

BENEFICIARIES_FILE = "seed_beneficiaries.json"
EXTERNAL_RECORDS_FILE = "seed_external_records.json"

# Resolve seeds directory: ../seeds/ relative to this script, fallback to ./
SCRIPT_DIR = Path(__file__).resolve().parent
SEEDS_DIR = SCRIPT_DIR.parent / "seeds"

if not SEEDS_DIR.exists():
    SEEDS_DIR = SCRIPT_DIR


# ---------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------

def log(msg: str) -> None:
    print(msg, flush=True)


def load_json(path: Path):
    """Load a JSON array from disk. Returns [] on missing/empty/non-array."""
    if not path.exists():
        log(f"    [WARN] File not found: {path}")
        return []

    with path.open("r", encoding="utf-8") as f:
        content = f.read().strip()

    if not content:
        log(f"    [WARN] File is empty: {path}")
        return []

    data = json.loads(content)

    if not isinstance(data, list):
        log(f"    [WARN] Expected a JSON array in {path}, got {type(data).__name__}")
        return []

    return data


def bulk_insert(collection, docs, label: str) -> dict:
    """
    Bulk insert with ordered=False. Duplicate keys and validation errors are
    skipped without aborting the batch.

    Returns: { inserted, skipped, total }
    """
    result = {"inserted": 0, "skipped": 0, "total": len(docs)}

    if not docs:
        log(f"    {label}: no documents to insert")
        return result

    try:
        insert_result = collection.insert_many(docs, ordered=False)
        result["inserted"] = len(insert_result.inserted_ids)
        log(f"    {label}: {result['inserted']} inserted")

    except BulkWriteError as e:
        result["inserted"] = e.details.get("nInserted", 0)
        result["skipped"] = len(e.details.get("writeErrors", []))
        log(
            f"    {label}: {result['inserted']} inserted, "
            f"{result['skipped']} skipped (duplicate or validation error)"
        )

    return result


# ---------------------------------------------------------------
# Main
# ---------------------------------------------------------------

def main() -> int:
    log("=== KilosUnlad Seed Ingestion (Phase 3 Task 3.1) ===\n")

    start = time.time()

    # --- 1. Connect ---
    log("[1] Connecting to MongoDB...")
    try:
        client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=10000)
        client.admin.command("ping")
        log("    Connected.\n")
    except ConnectionFailure as e:
        log(f"    [FAIL] Could not connect: {e}")
        return 1

    db = client[DB_NAME]

    # --- 2. Load JSON files ---
    log("[2] Loading seed files...")
    beneficiaries_path = SEEDS_DIR / BENEFICIARIES_FILE
    external_path = SEEDS_DIR / EXTERNAL_RECORDS_FILE

    log(f"    Beneficiaries: {beneficiaries_path}")
    log(f"    External records: {external_path}")

    beneficiaries = load_json(beneficiaries_path)
    external_records = load_json(external_path)

    log(f"    Loaded {len(beneficiaries)} beneficiaries")
    log(f"    Loaded {len(external_records)} external records\n")

    if not beneficiaries and not external_records:
        log("[WARN] No data to ingest. Exiting.")
        return 0

    # --- 3. Ingest ---
    log("[3] Ingesting...")
    ben_result = bulk_insert(db.beneficiaries, beneficiaries, "beneficiaries")
    ext_result = bulk_insert(db.external_records, external_records, "external_records")

    # --- 4. Summary ---
    elapsed = time.time() - start

    log("\n=== Summary ===")
    log(
        f"Beneficiaries:    {ben_result['inserted']} inserted, "
        f"{ben_result['skipped']} skipped, {ben_result['total']} total"
    )
    log(
        f"External records: {ext_result['inserted']} inserted, "
        f"{ext_result['skipped']} skipped, {ext_result['total']} total"
    )
    log(f"Elapsed:          {elapsed:.2f}s")

    if elapsed > 15:
        log(
            "\n[NOTE] Exceeded 15-second DoD. Expected for placeholder data; "
            "rerun after Renz delivers the real dataset."
        )
    else:
        log("\n[OK] Within 15-second DoD.")

    client.close()
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception as e:
        print(f"\n[FATAL] {e}", file=sys.stderr)
        sys.exit(1)
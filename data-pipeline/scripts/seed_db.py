"""
seed_db.py
Bulk ingestion script for KilosUnlad seed data.

Reads JSON seed files and inserts them into MongoDB in chunks to avoid
the strict 16MB BSON message size limit enforced by the MongoDB wire protocol.

Usage (from data-pipeline):
    docker-compose run --rm seed-ingest
"""

import json
import os
import sys
import time
from pathlib import Path
from pymongo import MongoClient, errors

# MongoDB connection string (matches docker-compose.yml environment)
MONGO_URI = os.getenv("MONGO_URI", "mongodb://admin_user:RootAdminSecret2026!@db:27017/kilosunlad?authSource=admin")
SEEDS_DIR = Path("/app/seeds")

# Chunk size to stay well under the 16MB BSON limit.
# At ~1KB per record, 2,000 records = ~2MB per batch.
CHUNK_SIZE = 2000

def load_json(path: Path) -> list:
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)

def main():
    print("=" * 65)
    print("KilosUnlad Seed Ingestion (Phase 3 Task 3.1)")
    print("=" * 65)
    
    print("\n[1] Connecting to MongoDB...")
    try:
        client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
        client.admin.command('ping')
        print("    Connected successfully.\n")
    except Exception as e:
        print(f"    [FATAL] Failed to connect to MongoDB: {e}")
        sys.exit(1)

    db = client.kilosunlad
    ben_collection = db.beneficiaries
    ext_collection = db.external_records

    print("[2] Loading seed files...")
    ben_path = SEEDS_DIR / "seed_beneficiaries.json"
    ext_path = SEEDS_DIR / "seed_external_records.json"
    
    if not ben_path.exists() or not ext_path.exists():
        print(f"    [FATAL] Seed files not found in {SEEDS_DIR}")
        sys.exit(1)

    beneficiaries = load_json(ben_path)
    external_records = load_json(ext_path)
    
    print(f"    Beneficiaries: {len(beneficiaries):,} records")
    print(f"    External records: {len(external_records):,} records\n")

    print("[3] Ingesting in chunks (to avoid 16MB BSON limit)...")
    start_time = time.time()
    
    try:
        # Clear existing synthetic seed data to ensure a clean state
        print("    Clearing existing synthetic seed data (SYN-4PS-*)...")
        ben_collection.delete_many({"household_id": {"$regex": "^SYN-4PS-"}})
        ext_collection.delete_many({"household_id": {"$regex": "^SYN-4PS-"}})

        # Insert beneficiaries in chunks
        print(f"\n    Inserting beneficiaries (chunk size: {CHUNK_SIZE})...")
        for i in range(0, len(beneficiaries), CHUNK_SIZE):
            chunk = beneficiaries[i:i + CHUNK_SIZE]
            ben_collection.insert_many(chunk, ordered=False)
            print(f"      Progress: {min(i + CHUNK_SIZE, len(beneficiaries)):,} / {len(beneficiaries):,}")

        # Insert external records in chunks
        print(f"\n    Inserting external records (chunk size: {CHUNK_SIZE})...")
        for i in range(0, len(external_records), CHUNK_SIZE):
            chunk = external_records[i:i + CHUNK_SIZE]
            ext_collection.insert_many(chunk, ordered=False)
            print(f"      Progress: {min(i + CHUNK_SIZE, len(external_records)):,} / {len(external_records):,}")

        elapsed_time = time.time() - start_time
        print("\n" + "=" * 65)
        print("[SUCCESS] Ingestion complete.")
        print(f"    Wall-clock time: {elapsed_time:.2f} seconds")
        print(f"    Total Beneficiaries in DB: {ben_collection.count_documents({}):,}")
        print(f"    Total External Records in DB: {ext_collection.count_documents({}):,}")
        print("=" * 65)

    except errors.BulkWriteError as bwe:
        print(f"\n[FATAL] Bulk write error during ingestion: {bwe.details}")
        sys.exit(1)
    except Exception as e:
        print(f"\n[FATAL] Unexpected error during ingestion: {e}")
        sys.exit(1)
    finally:
        client.close()

if __name__ == "__main__":
    main()
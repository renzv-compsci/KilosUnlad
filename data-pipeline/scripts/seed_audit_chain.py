#!/usr/bin/env python3
"""
KilosUnlad — Phase 4 Task 4.1 Support

Seeds a valid audit chain into the audit_logs collection so the tamper test
can be performed. The chain is built using the same hash formula as Mae's
backend:

    SHA-256( sequenceIndex + ":" + previousEntryHash + ":" +
             new Date(timestamp).toISOString() + ":" +
             actorId + ":" + action + ":" +
             canonicalStringify(stateDelta) )

This script is integration support — it seeds dev/test data only.
It is NOT a Phase 3 deliverable and does NOT modify any schema or contract.

Validation:
  After running, call Mae's endpoint:
    GET /api/v1/audit/verify-chain?start_sequence=1&end_sequence=N
  If it returns is_chain_valid: true, the seed is accepted. Otherwise the
  hash formula mismatch must be corrected before the tamper test proceeds.
"""

import hashlib
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

from pymongo import MongoClient
from pymongo.errors import ConnectionFailure

# ---------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------

MONGO_URI = (
    "mongodb://app_user:AppUserPassword2026!@db:27017/"
    "kilosunlad?replicaSet=rs0&authSource=kilosunlad"
)

DB_NAME = "kilosunlad"
COLLECTION = "audit_logs"

GENESIS_HASH = "0" * 64

# Who we attribute the entries to (must be a real user_id from the seeded accounts)
# Use the seeded test super admin so the actor.user_id can be non-empty
SEED_ACTOR_USERNAME = "super_admin_test"


# ---------------------------------------------------------------
# Canonical JSON — matches JS fast-json-stable-stringify output
# ---------------------------------------------------------------

def canonical_stringify(value) -> str:
    """
    Produce a JSON string matching fast-json-stable-stringify:
      - keys recursively sorted
      - no whitespace
      - booleans as true/false
      - null as null
    """
    def convert(v):
        if isinstance(v, dict):
            return {k: convert(v[k]) for k in sorted(v.keys())}
        if isinstance(v, list):
            return [convert(item) for item in v]
        if isinstance(v, bool):
            # Python bool is subclass of int — check first
            return "true" if v else "false"  # temp, will be replaced below
        return v

    # Simpler: build a canonical string manually to guarantee JS-compatible output
    def encode(v):
        if v is None:
            return "null"
        if v is True:
            return "true"
        if v is False:
            return "false"
        if isinstance(v, (int, float)):
            return json.dumps(v)
        if isinstance(v, str):
            return json.dumps(v, ensure_ascii=False)
        if isinstance(v, list):
            return "[" + ",".join(encode(item) for item in v) + "]"
        if isinstance(v, dict):
            items = sorted(v.items(), key=lambda kv: kv[0])
            return "{" + ",".join(
                json.dumps(k, ensure_ascii=False) + ":" + encode(val)
                for k, val in items
            ) + "}"
        raise TypeError(f"Unsupported type: {type(v)}")

    return encode(value)


# ---------------------------------------------------------------
# Hash computation — mirrors computeEntryHash from cryptoHelper.js
# ---------------------------------------------------------------

def compute_entry_hash(
    sequence_index: int,
    previous_entry_hash: str,
    timestamp: datetime,
    actor_id: str,
    action: str,
    state_delta,
) -> str:
    """
    Reproduce Mae's computeEntryHash exactly.
    """
    normalized_delta = canonical_stringify(state_delta if state_delta is not None else {})

    # Normalize timestamp to ISO string with milliseconds, UTC, Z suffix
    ts = timestamp
    if ts.tzinfo is None:
        ts = ts.replace(tzinfo=timezone.utc)
    else:
        ts = ts.astimezone(timezone.utc)
    # JS .toISOString() always outputs milliseconds + Z
    normalized_timestamp = ts.strftime("%Y-%m-%dT%H:%M:%S.") + f"{ts.microsecond // 1000:03d}Z"

    payload = ":".join([
        str(sequence_index),
        previous_entry_hash,
        normalized_timestamp,
        actor_id,
        action,
        normalized_delta,
    ])

    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


# ---------------------------------------------------------------
# Chain builder
# ---------------------------------------------------------------

def build_chain(actor_id: str, entity_ids: list):
    """
    Build a valid audit chain of N entries.

    Each entry:
      - sequence_index: 1..N
      - previous_entry_hash: GENESIS for #1, prior entry_hash after
      - timestamp: monotonically increasing
      - actor: { user_id, username, role }
      - action: from a small rotating set
      - target_entity: { collection_name, entity_id }
      - state_delta: { before, after } objects
      - entry_hash: computed
    """
    actions = [
        "BENEFICIARY_GRADUATED",
        "TASK_DISPATCHED",
        "REPORT_SUBMITTED",
        "SYSTEM_CONFIG_UPDATED",
        "MODEL_FLAG_RAISED",
    ]

    entries = []
    previous_hash = GENESIS_HASH
    base_time = datetime.now(timezone.utc)

    for i, entity_id in enumerate(entity_ids):
        seq = i + 1
        ts = base_time.replace(microsecond=0) if i == 0 else base_time.replace(microsecond=0)
        # Advance timestamp by one second per entry for monotonic ordering
        from datetime import timedelta
        ts = ts + timedelta(seconds=i)

        action = actions[i % len(actions)]
        state_delta = {
            "before": {"status": "FLAGGED_FOR_REVIEW"},
            "after": {"status": "UNDER_INVESTIGATION"},
        }

        entry_hash = compute_entry_hash(
            sequence_index=seq,
            previous_entry_hash=previous_hash,
            timestamp=ts,
            actor_id=actor_id,
            action=action,
            state_delta=state_delta,
        )

        entries.append({
            "sequence_index": seq,
            "previous_entry_hash": previous_hash,
            "timestamp": ts,
            "actor": {
                "user_id": actor_id,
                "username": "super_admin_test",
                "role": "SUPER_ADMIN",
                "ip_address": "127.0.0.1",
            },
            "action": action,
            "target_entity": {
                "collection_name": "beneficiaries",
                "entity_id": entity_id,
            },
            "state_delta": state_delta,
            "entry_hash": entry_hash,
        })

        previous_hash = entry_hash

    return entries


# ---------------------------------------------------------------
# Main
# ---------------------------------------------------------------

def main() -> int:
    print("=== KilosUnlad Audit Chain Seed (Task 4.1 support) ===\n")

    # --- Connect ---
    print("[1] Connecting to MongoDB...")
    try:
        client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=10000)
        client.admin.command("ping")
        print("    Connected.\n")
    except ConnectionFailure as e:
        print(f"    [FAIL] Could not connect: {e}")
        return 1

    db = client[DB_NAME]
    audits = db[COLLECTION]
    users = db["users"]

    # --- Check existing state ---
    existing = audits.count_documents({})
    if existing > 0:
        print(f"    [WARN] audit_logs already contains {existing} entries.")
        print("    This script expects an empty collection.")
        print("    Delete existing entries first if you want to re-seed.")
        client.close()
        return 1

    # --- Find actor ---
    print("[2] Looking up seed actor...")
    actor = users.find_one({"username": SEED_ACTOR_USERNAME})
    if not actor:
        print(f"    [FAIL] User '{SEED_ACTOR_USERNAME}' not found.")
        print("    Run seed_test_data.js first to create test accounts.")
        client.close()
        return 1

    actor_id = str(actor["_id"])
    print(f"    Actor: {SEED_ACTOR_USERNAME} (_id={actor_id})\n")

    # --- Get entity IDs to reference ---
    print("[3] Loading entity IDs to reference...")
    beneficiaries = list(db["beneficiaries"].find({}, {"household_id": 1}).limit(5))
    if not beneficiaries:
        print("    [FAIL] No beneficiaries found. Run seed first.")
        client.close()
        return 1

    entity_ids = [b["household_id"] for b in beneficiaries]
    print(f"    Using entity IDs: {entity_ids}\n")

    # --- Build chain ---
    print("[4] Building chain...")
    entries = build_chain(actor_id, entity_ids)
    print(f"    Built {len(entries)} entries.\n")

    # --- Insert ---
    print("[5] Inserting...")
    audits.insert_many(entries)
    print(f"    Inserted {len(entries)} entries.\n")

    # --- Summary ---
    print("=== Seed complete ===")
    print(f"Sequence range: 1..{len(entries)}")
    print(f"Head hash:      {entries[-1]['entry_hash']}")
    print("")
    print("Next step:")
    print(f"  Call GET /api/v1/audit/verify-chain?start_sequence=1&end_sequence={len(entries)}")
    print("  Expected: is_chain_valid = true")

    client.close()
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception as e:
        print(f"\n[FATAL] {e}", file=sys.stderr)
        sys.exit(1)
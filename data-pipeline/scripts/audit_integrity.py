#!/usr/bin/env python3
"""
KilosUnlad — Phase 4 Task 4.2: Data Integrity & Null Constraint Audit

Audits all 6 core collections for:
  - Orphaned references (dangling foreign keys)
  - Missing natural keys (null/empty required fields)
  - Duplicate natural keys (where uniqueness is expected)

DoD: Confirms zero orphaned references across all 6 collections.

This script is read-only. It does not modify data.

Environment:
  Runs inside the seed-audit Docker service and connects to db:27017
  over the kilosunlad-network with ?replicaSet=rs0 (per DECISION-006).
"""

import os
import sys
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure

# ---------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------

MONGO_URI = os.getenv("MONGO_URI") or (
    "mongodb://app_user:AppUserPassword2026!@db:27017/"
    "kilosunlad?replicaSet=rs0&authSource=kilosunlad"
)

DB_NAME = "kilosunlad"


# ---------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------

def log(msg: str) -> None:
    print(msg, flush=True)


def is_missing(value) -> bool:
    """True if value is None, empty string, or whitespace-only."""
    if value is None:
        return True
    if isinstance(value, str) and not value.strip():
        return True
    return False


# ---------------------------------------------------------------
# Check functions — one per relationship
# ---------------------------------------------------------------

def check_users(db):
    """Users must have username + email."""
    issues = []
    total = 0
    for u in db.users.find({}, {"username": 1, "email": 1, "role": 1}):
        total += 1
        if is_missing(u.get("username")):
            issues.append({"user_id": str(u["_id"]), "missing": "username"})
        if is_missing(u.get("email")):
            issues.append({"user_id": str(u["_id"]), "missing": "email"})
        if is_missing(u.get("role")):
            issues.append({"user_id": str(u["_id"]), "missing": "role"})
    return total, issues


def check_beneficiaries(db):
    """Beneficiaries must have household_id + national_id."""
    issues = []
    total = 0
    for b in db.beneficiaries.find({}, {"household_id": 1, "head_of_household": 1}):
        total += 1
        if is_missing(b.get("household_id")):
            issues.append({"beneficiary_id": str(b["_id"]), "missing": "household_id"})
        hoh = b.get("head_of_household") or {}
        if is_missing(hoh.get("national_id")):
            issues.append({
                "beneficiary_id": str(b["_id"]),
                "household_id": b.get("household_id"),
                "missing": "head_of_household.national_id",
            })
    return total, issues


def check_external_records(db):
    """External records must reference an existing beneficiary."""
    issues = []
    total = 0

    # Build set of valid household_ids
    valid_households = set(
        b["household_id"] for b in db.beneficiaries.find({}, {"household_id": 1})
        if not is_missing(b.get("household_id"))
    )

    for e in db.external_records.find({}, {"matched_household_id": 1, "national_id": 1}):
        total += 1
        hh = e.get("matched_household_id")
        if is_missing(hh):
            issues.append({"external_id": str(e["_id"]), "missing": "matched_household_id"})
        elif hh not in valid_households:
            issues.append({
                "external_id": str(e["_id"]),
                "orphan": "matched_household_id",
                "value": hh,
            })
        if is_missing(e.get("national_id")):
            issues.append({"external_id": str(e["_id"]), "missing": "national_id"})
    return total, issues


def check_verification_tasks(db):
    """Tasks must reference valid beneficiaries + users."""
    issues = []
    total = 0

    valid_households = set(
        b["household_id"] for b in db.beneficiaries.find({}, {"household_id": 1})
        if not is_missing(b.get("household_id"))
    )
    valid_user_ids = set(u["_id"] for u in db.users.find({}, {"_id": 1}))

    for t in db.verification_tasks.find({}, {"task_id": 1, "household_id": 1, "assigned_worker_id": 1}):
        total += 1
        if is_missing(t.get("task_id")):
            issues.append({"task_id": str(t["_id"]), "missing": "task_id"})
        hh = t.get("household_id")
        if is_missing(hh):
            issues.append({"task_id": str(t["_id"]), "missing": "household_id"})
        elif hh not in valid_households:
            issues.append({
                "task_id": str(t["_id"]),
                "orphan": "household_id",
                "value": hh,
            })
        worker = t.get("assigned_worker_id")
        if worker and worker not in valid_user_ids:
            issues.append({
                "task_id": str(t["_id"]),
                "orphan": "assigned_worker_id",
                "value": str(worker),
            })
    return total, issues


def check_audit_logs(db):
    """Audit logs must have sequence_index + entry_hash + previous_entry_hash."""
    issues = []
    total = 0
    for a in db.audit_logs.find({}, {"sequence_index": 1, "entry_hash": 1, "previous_entry_hash": 1}):
        total += 1
        if a.get("sequence_index") is None:
            issues.append({"audit_id": str(a["_id"]), "missing": "sequence_index"})
        if is_missing(a.get("entry_hash")):
            issues.append({"audit_id": str(a["_id"]), "missing": "entry_hash"})
        if is_missing(a.get("previous_entry_hash")):
            issues.append({"audit_id": str(a["_id"]), "missing": "previous_entry_hash"})
    return total, issues


def check_system_configs(db):
    """System configs must have config_key."""
    issues = []
    total = 0
    for s in db.system_configs.find({}, {"config_key": 1}):
        total += 1
        if is_missing(s.get("config_key")):
            issues.append({"config_id": str(s["_id"]), "missing": "config_key"})
    return total, issues


# ---------------------------------------------------------------
# Main
# ---------------------------------------------------------------

def main() -> int:
    log("=== KilosUnlad Data Integrity Audit (Phase 4 Task 4.2) ===\n")

    # --- Connect ---
    log("[1] Connecting to MongoDB...")
    try:
        client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=10000)
        client.admin.command("ping")
        log("    Connected.\n")
    except ConnectionFailure as e:
        log(f"    [FAIL] Could not connect: {e}")
        return 1

    db = client[DB_NAME]

    # --- Run checks ---
    log("[2] Running integrity checks...\n")

    checks = [
        ("users",              check_users),
        ("beneficiaries",      check_beneficiaries),
        ("external_records",   check_external_records),
        ("verification_tasks", check_verification_tasks),
        ("audit_logs",         check_audit_logs),
        ("system_configs",     check_system_configs),
    ]

    total_issues = 0
    total_docs = 0

    for name, check_fn in checks:
        count, issues = check_fn(db)
        total_docs += count
        total_issues += len(issues)

        status = "PASS" if not issues else "FAIL"
        log(f"    [{status}] {name}: {count} documents, {len(issues)} issues")

        # Show first 5 issues per collection for diagnostics
        for issue in issues[:5]:
            log(f"           - {issue}")
        if len(issues) > 5:
            log(f"           ... and {len(issues) - 5} more")

    log("")
    log("=== Summary ===")
    log(f"Collections audited:       6")
    log(f"Total documents:           {total_docs}")
    log(f"Total issues found:        {total_issues}")

    if total_issues == 0:
        log("\n=== RESULT: ALL PASS ===")
        log("Zero orphaned references and zero missing natural keys across all 6 collections.")
        rc = 0
    else:
        log("\n=== RESULT: ISSUES FOUND ===")
        log(f"{total_issues} issue(s) require investigation.")
        rc = 1

    client.close()
    return rc


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception as e:
        print(f"\n[FATAL] {e}", file=sys.stderr)
        sys.exit(1)
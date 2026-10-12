#!/usr/bin/env python3
"""
KilosUnlad — Phase 3 Task 3.2: Compound Query Index Verification

Verifies that the admin triage query uses the compound index:

    { "risk_assessment.is_flagged": 1, "address.municipality": 1 }

Task requirements:
  - Query: Beneficiary equivalent:
        { "risk_assessment.is_flagged": true, "address.municipality": "Calamba" }
  - DoD: Confirms totalDocsExamined equals nReturned (index hit, zero scan)

Connection:
  Runs inside the seed-verify Docker service and connects to db:27017 over
  the kilosunlad-network with ?replicaSet=rs0 (per DECISION-006).
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
COLLECTION = "beneficiaries"

QUERY = {
    "risk_assessment.is_flagged": True,
    "address.municipality": "Calamba",
}
VOLUME_QUERY = {
    "risk_assessment.is_flagged": False,
    "address.municipality": "Calamba",
}
# ADR-001 baseline; set VOLUME_MIN=0 to skip the volume floor.
VOLUME_MIN = int(os.getenv("VOLUME_MIN", "80000"))


# ---------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------

def log(msg: str) -> None:
    print(msg, flush=True)


def find_stage(plan: dict, stage_name: str):
    """Recursively search a winning plan tree for a stage by name."""
    if not plan:
        return None
    if plan.get("stage") == stage_name:
        return plan
    if "inputStage" in plan:
        found = find_stage(plan["inputStage"], stage_name)
        if found:
            return found
    for sub in plan.get("inputStages", []) or []:
        found = find_stage(sub, stage_name)
        if found:
            return found
    return None


# ---------------------------------------------------------------
# Main
# ---------------------------------------------------------------

def main() -> int:
    log("=== KilosUnlad Compound Index Verification (Phase 3 Task 3.2) ===\n")

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

    # --- 2. Run explain via raw command ---
    # Sprint 3 DAT-03: the flagged query alone can be vacuous right after
    # ingestion (0 flagged = 0 examined), so the unflagged Calamba roster is
    # also explained to prove the same plan holds at full volume.
    all_passed = True
    for label, query in (("triage (flagged)", QUERY), ("at volume (unflagged roster)", VOLUME_QUERY)):
        all_passed = explain_and_assert(db, label, query) and all_passed
    if VOLUME_MIN and db[COLLECTION].count_documents(VOLUME_QUERY) < VOLUME_MIN:
        log(f"    [FAIL] Volume query returned fewer than {VOLUME_MIN:,} documents")
        all_passed = False

    # --- 5. Result ---
    if all_passed:
        log("=== RESULT: ALL PASS ===")
    else:
        log("=== RESULT: SOME ASSERTIONS FAILED ===")

    client.close()
    return 0 if all_passed else 1


def explain_and_assert(db, label, query) -> bool:
    log(f"[2] Running explain on the {label} query...")
    log(f"    Query: {query}\n")

    explain_output = db.command({
        "explain": {
            "find": COLLECTION,
            "filter": query,
        },
        "verbosity": "executionStats",
    })

    stats = explain_output.get("executionStats", {})
    winning_plan = explain_output.get("queryPlanner", {}).get("winningPlan", {})

    total_keys_examined = stats.get("totalKeysExamined", 0)
    total_docs_examined = stats.get("totalDocsExamined", 0)
    n_returned = stats.get("nReturned", 0)

    ixscan = find_stage(winning_plan, "IXSCAN")
    collscan = find_stage(winning_plan, "COLLSCAN")

    log("[3] Execution stats:")
    log(f"    totalKeysExamined: {total_keys_examined}")
    log(f"    totalDocsExamined: {total_docs_examined}")
    log(f"    nReturned:         {n_returned}")
    log(f"    IXSCAN present:    {'YES' if ixscan else 'NO'}")
    log(f"    COLLSCAN present:  {'YES' if collscan else 'NO'}")
    if ixscan:
        log(f"    Index used:        {ixscan.get('indexName', '(unknown)')}")
    log("")

    # --- 4. Assertions ---
    log("[4] Assertions:")

    assertions = [
        {
            "name": "Query uses IXSCAN (not COLLSCAN)",
            "pass": ixscan is not None and collscan is None,
        },
        {
            "name": "Index name matches compound index",
            "pass": ixscan is not None
            and ixscan.get("indexName") == "risk_assessment.is_flagged_1_address.municipality_1",
        },
        {
            "name": "No over-scan (totalDocsExamined == nReturned)",
            "pass": total_docs_examined == n_returned,
        },
    ]

    passed = True
    for a in assertions:
        marker = "PASS" if a["pass"] else "FAIL"
        log(f"    [{marker}] {a['name']}")
        if not a["pass"]:
            passed = False
    log("")
    return passed


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception as e:
        print(f"\n[FATAL] {e}", file=sys.stderr)
        sys.exit(1)
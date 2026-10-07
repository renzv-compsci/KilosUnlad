# Phase 3 — Database Handoff

**Author:** Dustin Martinez (Database Architecture Lead)
**Date:** 2026-10-08
**Status:** COMPLETE
**Related:** DECISION-008, DECISION-006, DECISION-007

---

## 1. Purpose

This document hands off Phase 3 database deliverables to Renz and Charles.
It covers:

- What was built
- How to run the tooling
- How to swap in the real dataset
- Schema expectations
- DoD verification steps

Phase 3 consists of:

- **Task 3.1** — Automated seed ingestion tool
- **Task 3.2** — Compound query index verification

---

## 2. What Was Built

| Item | Path | Purpose |
|------|------|---------|
| Ingest script | `data-pipeline/scripts/seed_db.py` | Bulk-insert seed JSON into MongoDB |
| Placeholder generator | `data-pipeline/scripts/generate_placeholders.py` | Produces 50 placeholder records |
| Index verifier | `data-pipeline/scripts/verify_compound_index.py` | Confirms triage query uses compound index |
| Placeholder beneficiaries | `data-pipeline/seeds/seed_beneficiaries.json` | 50 records — **replace with real dataset** |
| Placeholder external records | `data-pipeline/seeds/seed_external_records.json` | 50 records — **replace with real dataset** |
| Compose services | `docker-compose.yml` — `seed-ingest`, `seed-verify` | One-shot runners |

---

## 3. How to Run

### 3.1 Prerequisites

- Docker stack is running (`docker-compose up -d`)
- Replica set is PRIMARY:
  ```
  docker exec -it kilosunlad-db mongosh -u admin_user -p RootAdminSecret2026! --authenticationDatabase admin --eval "rs.status().members[0].stateStr"
  ```
- Expect: `PRIMARY`

### 3.2 Ingest seed data

    docker-compose run --rm seed-ingest

**What it does:**
- Installs PyMongo (one-time per run)
- Runs `seed_db.py`
- Reads `seeds/seed_beneficiaries.json` and `seeds/seed_external_records.json`
- Bulk-inserts with `insert_many(ordered=False)`
- Reports inserted/skipped counts and elapsed time

**Expected output (with current placeholders):**

    === KilosUnlad Seed Ingestion (Phase 3 Task 3.1) ===
    [1] Connecting to MongoDB...
        Connected.
    [2] Loading seed files...
        Loaded 50 beneficiaries
        Loaded 50 external records
    [3] Ingesting...
        beneficiaries: 50 inserted
        external_records: 50 inserted
    === Summary ===
    Beneficiaries:    50 inserted, 0 skipped, 50 total
    External records: 50 inserted, 0 skipped, 50 total
    Elapsed:          0.16s
    [OK] Within 15-second DoD.

### 3.3 Verify compound index

    docker-compose run --rm seed-verify

**What it does:**
- Runs `verify_compound_index.py`
- Executes the triage query with `explain("executionStats")`
- Asserts index hit, no over-scan

**Expected output:**

    === KilosUnlad Compound Index Verification (Phase 3 Task 3.2) ===
    [3] Execution stats:
        totalKeysExamined: 18
        totalDocsExamined: 18
        nReturned:         18
        IXSCAN present:    YES
        COLLSCAN present:  NO
        Index used:        risk_assessment.is_flagged_1_address.municipality_1
    [4] Assertions:
        [PASS] Query uses IXSCAN (not COLLSCAN)
        [PASS] Index name matches compound index
        [PASS] No over-scan (totalDocsExamined == nReturned)
    === RESULT: ALL PASS ===

### 3.4 Regenerate placeholders (optional)

If the placeholder files need to be recreated:

    docker run --rm -v "${PWD}/data-pipeline:/app" -w /app python:3.10-slim python scripts/generate_placeholders.py

Deterministic output — same 50 records every run.

---

## 4. How to Swap in the Real Dataset

**Renz's task:**

1. Deliver `seed_beneficiaries.json` and `seed_external_records.json`
2. **Overwrite** the existing files in `data-pipeline/seeds/` — no path changes
3. Re-run: `docker-compose run --rm seed-ingest`

**No code changes required.** The script reads from fixed paths and handles any count.

---

## 5. Schema Expectations

Both JSON files must contain a top-level JSON **array** of objects. Each object's shape must match the corresponding Mongoose schema.

### 5.1 `seed_beneficiaries.json` — required fields

Per `/server/src/models/Beneficiary.js`:

- `household_id` (String, unique)
- `head_of_household.first_name`, `last_name`, `national_id`
- `address.barangay`, `municipality`, `province`
- `address.coordinates.type` = `"Point"`
- `address.coordinates.coordinates` = `[longitude, latitude]`
- `demographics.household_size`, `dependents_ratio`, `head_education_level`, `wall_score`, `roof_score`, `water_access_level`
- `enrolled_swdi_level` = 1, 2, or 3
- `program_status` = one of the 6 schema enum values

### 5.2 `seed_external_records.json` — required fields

Per `/server/src/models/ExternalRecord.js`:

- `matched_household_id` (String, unique, matches a beneficiary's `household_id`)
- `national_id` (String)
- Optional nested objects: `power_utility`, `water_utility`, `telecom_registry`, `transport_registry`, `landbank_telemetry`

**Full shape reference:** see `docs/tasks/RENZ_DATA.md` and the model files.

---

## 6. Behavioral Notes

| Behavior | Detail |
|----------|--------|
| Duplicate keys | Skipped silently via `insert_many(ordered=False)` — counted in "skipped" |
| Missing optional fields | Accepted — schema defaults apply |
| Missing required fields | Per-document rejection — rest of batch continues |
| Non-array JSON | Warned and skipped entirely |
| Empty file | Warned and skipped |
| Connection failure | Exits with code 1 |
| Elapsed > 15s | Warning printed but does not fail |

---

## 7. DoD Verification

### 7.1 Task 3.1 — 5,000 records in under 15 seconds

**Status:** ⏳ Pending Renz's real dataset

- Tooling verified against 50 placeholder records (0.16s)
- The 15-second DoD will be validated once Renz overwrites the placeholders
- Command: `docker-compose run --rm seed-ingest`

### 7.2 Task 3.2 — Compound index performance

**Status:** ✅ Verified

- `totalKeysExamined === totalDocsExamined === nReturned`
- `IXSCAN` used, no `COLLSCAN`
- Index: `risk_assessment.is_flagged_1_address.municipality_1`

---

## 8. Placeholder Records — Current State

| File | Count | Marked As |
|------|-------|-----------|
| `seed_beneficiaries.json` | 50 | Placeholder (`SEED-4PS-` prefix) |
| `seed_external_records.json` | 50 | Placeholder (`SEED-` prefix) |

**All placeholders use the `SEED-` prefix** so they can be distinguished from
any real or test data (e.g. `TEST-4PS-` from DECISION-007 integration support).

**Renz's real dataset should not use the `SEED-` prefix.**

---

## 9. Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| `ModuleNotFoundError: pymongo` | Ran overridden command without pip install | Use `docker-compose run --rm seed-ingest` (not with custom command) |
| `ServerSelectionTimeoutError` | Replica set not PRIMARY | Run the PRIMARY check in §3.1 |
| `Authentication failed` | app_user missing or wrong password | See `docs/handoffs/TEST_DATA_SEED_HANDOFF.md` §9 |
| `[WARN] File not found` | JSON files missing from `seeds/` | Run the placeholder generator or place Renz's files |
| `totalDocsExamined > nReturned` | Index not used | Check `init-mongo.js` created the compound index |

---

## 10. Files Changed in Phase 3

- New: `data-pipeline/scripts/seed_db.py`
- New: `data-pipeline/scripts/generate_placeholders.py`
- New: `data-pipeline/scripts/verify_compound_index.py`
- New: `data-pipeline/seeds/seed_beneficiaries.json` (placeholder)
- New: `data-pipeline/seeds/seed_external_records.json` (placeholder)
- Modified: `docker-compose.yml` — added `seed-ingest`, `seed-verify` services
- New: `docs/DECISION-008-Phase-3-Ingest-Tooling.md`
- New: `docs/handoffs/PHASE_3_DATABASE_HANDOFF.md` (this file)

---

## 11. References

- DECISION-008 — Phase 3 Ingest Tooling resolution
- DECISION-006 — Replica set deployment
- DECISION-007 — Test account seeding precedent
- `docs/PROJECT_STRUCTURE.md` — Master repo layout
- `docs/tasks/DUSTIN_DATABASE.md` — Original Phase 3 task spec

---

**End of Document**
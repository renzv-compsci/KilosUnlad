# Phase 3 — Database Report

**Author:** Dustin Martinez (Database Architecture Lead)
**Date:** 2026-10-08
**Status:** COMPLETE (with placeholder data)
**Related:** DECISION-008, DUSTIN_DATABASE.md Phase 3

---

## 1. Summary

Phase 3 required two tasks:

- **Task 3.1** — Automated seed ingestion tool
- **Task 3.2** — Compound query index verification

Both are complete and verified using placeholder data. Real 5,000-record
dataset from Renz's pipeline remains pending and will be validated once
delivered.

---

## 2. Context

Per DECISION-008, the plan was:

- Build the ingest tooling now
- Use ~50 placeholder records to prove it works
- Renz overwrites the placeholders with the real 5,000-record dataset later
- No script changes required when the real data arrives

This report documents what was built, what was verified, and what remains
for Renz.

---

## 3. Task 3.1 — Automated Seed Ingestion Tool

### 3.1 What Was Built

Three scripts under `data-pipeline/scripts/`:

| File | Purpose |
|------|---------|
| `seed_db.py` | Ingests JSON seed files into MongoDB |
| `generate_placeholders.py` | Deterministic generator for ~50 placeholder records |
| `verify_compound_index.py` | Task 3.2 — compound index verification |

Plus two new Docker services:

| Service | Purpose |
|---------|---------|
| `seed-ingest` | Runs `seed_db.py` |
| `seed-verify` | Runs `verify_compound_index.py` |

### 3.2 Path Alignment

Per DECISION-008 and `docs/PROJECT_STRUCTURE.md`:

- **Seed JSON files:** `data-pipeline/seeds/`
  - `seed_beneficiaries.json`
  - `seed_external_records.json`
- **Scripts:** `data-pipeline/scripts/`
  - `seed_db.py`
  - `generate_placeholders.py`
  - `verify_compound_index.py`

The ingest script resolves `../seeds/` relative to itself, with a `./`
fallback. No absolute paths hardcoded.

### 3.3 Seed Script Behavior

**Connection:**

```
mongodb://app_user:AppUserPassword2026!@db:27017/kilosunlad?replicaSet=rs0&authSource=kilosunlad
```

`?replicaSet=rs0` is required per DECISION-006.

**Insert strategy:**

- `insert_many(ordered=False)` — duplicate key errors are skipped, batch
  continues
- Reports inserted count and skipped count per collection
- Reports total elapsed time vs the 15-second DoD

**No pre-validation:** relies on MongoDB's `strict: true` schema
enforcement.

**Handles:** missing files, empty files, non-array JSON — each warns and
continues without crashing.

### 3.4 Placeholder Data

**File:** `data-pipeline/scripts/generate_placeholders.py`

Deterministic generator (seeded RNG) producing:

- 50 placeholder beneficiaries
- 50 matching external records

**Prefixing:** all placeholder records use `SEED-4PS-` / `SEED-NID-`
prefixes. This distinguishes them from `TEST-4PS-` records seeded during
DECISION-007 integration support.

**Barangays used:** Palingon, Lecheria, Real (matches test account
jurisdictions).

### 3.5 Verification

**Command:**

```powershell
docker-compose run --rm seed-ingest
```

**Output:**

```
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
```

**Verification in Mongo:**

```
Beneficiaries: 50
External records: 50
```

### 3.6 Task 3.1 DoD Status

> Ingests 5,000 household profiles and matched external utility records
> in under 15 seconds.

- 🟡 **Tooling verified** with 50 placeholders at 0.16 seconds
- ⏳ **Real DoD** pending Renz's 5,000-record dataset
- When Renz delivers: overwrite `data-pipeline/seeds/*.json`, re-run
  `docker-compose run --rm seed-ingest`, and the 15-second DoD will be
  validated

---

## 4. Task 3.2 — Compound Query Index Verification

### 4.1 What Was Built

**File:** `data-pipeline/scripts/verify_compound_index.py`

**Docker service:** `seed-verify`

The script:

- Runs the admin triage query:
  ```
  { "risk_assessment.is_flagged": true, "address.municipality": "Calamba" }
  ```
- Executes it via `db.command({"explain": {...}, "verbosity": "executionStats"})` — raw command, compatible with PyMongo 4.18
- Asserts three things:
  1. `IXSCAN` present, `COLLSCAN` absent
  2. Index name is `risk_assessment.is_flagged_1_address.municipality_1`
  3. `totalDocsExamined === nReturned` (zero over-scan)

### 4.2 Why Raw `explain` Command

PyMongo 4.18 changed `Cursor.explain()` — passing a verbosity string as a
positional argument no longer works. Using `db.command()` with the raw
`explain` command bypasses the API change and produces identical results.

### 4.3 Verification

**Command:**

```powershell
docker-compose run --rm seed-verify
```

**Output:**

```
=== KilosUnlad Compound Index Verification (Phase 3 Task 3.2) ===

[1] Connecting to MongoDB...
    Connected.

[2] Running explain on the triage query...
    Query: {'risk_assessment.is_flagged': True, 'address.municipality': 'Calamba'}

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
```

### 4.4 Task 3.2 DoD Status

> Confirms `totalDocsExamined` equals `nReturned` (Index hit, zero
> un-indexed scanning).

✅ Met. `totalDocsExamined === nReturned === 18`. Index hit confirmed.

---

## 5. Files Added or Modified

| File | Status | Purpose |
|------|--------|---------|
| `data-pipeline/scripts/seed_db.py` | New | Ingest tool |
| `data-pipeline/scripts/generate_placeholders.py` | New | Placeholder generator |
| `data-pipeline/scripts/verify_compound_index.py` | New | Index verifier |
| `data-pipeline/seeds/seed_beneficiaries.json` | New | 50 placeholders |
| `data-pipeline/seeds/seed_external_records.json` | New | 50 placeholders |
| `docker-compose.yml` | Modified | Added `seed-ingest`, `seed-verify` |

Contracts unchanged. Schemas unchanged.

---

## 6. What Remains for Renz

### 6.1 Deliver the Real Dataset

Replace:

- `data-pipeline/seeds/seed_beneficiaries.json`
- `data-pipeline/seeds/seed_external_records.json`

With the real 5,000-record outputs from the PSA FIES pipeline.

**No code changes required.** Same filenames, same directory. The script
reads them on next run.

### 6.2 Validate the 15-Second DoD

Once the real dataset is in place:

```powershell
docker-compose run --rm seed-ingest
```

The script will report elapsed time. Confirm it's under 15 seconds.

### 6.3 Re-Run Index Verification (Optional)

The compound index behavior doesn't depend on record count. It'll still
be fast. But re-running after the real dataset lands is a good sanity
check:

```powershell
docker-compose run --rm seed-verify
```

---

## 7. Known Limitations

- **Placeholder data only.** 50 records, not 5,000.
- **DoD not validated at scale.** The 15-second threshold is trivial at
  current size. Real validation pending Renz.
- **Placeholder prefixes (`SEED-`).** Real dataset should not use these.
- **Local environment only.** No shared deployment acceptance yet.

---

## 8. References

- `docs/DECISION-008-Phase-3-Ingest-Tooling.md`
- `docs/handoffs/PHASE_3_DATABASE_HANDOFF.md`
- `docs/PROJECT_STRUCTURE.md`
- `docs/tasks/DUSTIN_DATABASE.md` — Phase 3 spec
- `docs/contracts/admin-web/admin-triage-feed.json`

---

**End of Report**
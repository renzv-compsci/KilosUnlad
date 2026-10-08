# Phase 5 — Demo Data Layout Acknowledgment

**Author:** Dustin Martinez (Database Architecture Lead)
**Date:** 2026-10-08
**Status:** ACKNOWLEDGED
**Recipients:** Renz (PM), Charles (ML)

---

## 1. Purpose

This note documents a minor layout addition made during Phase 5. No
contracts, schemas, or existing paths are affected. The purpose is to
notify Renz and Charles so their tooling does not conflict.

---

## 2. What Changed

**Added:** `data-pipeline/seeds/demo/` — a new subfolder for Phase 5
live-demo seed data.

**Contents (planned):**
data-pipeline/seeds/demo/
├── graduation_beneficiary.json
├── graduation_external.json
├── graduation_swdi_payload.json
└── sangla_atm_payload.json

text

| File | Purpose |
|------|---------|
| `graduation_beneficiary.json` | MongoDB Beneficiary doc for Case A |
| `graduation_external.json` | Matching ExternalRecord doc for Case A |
| `graduation_swdi_payload.json` | POST payload for `/api/v1/predict-swdi` |
| `sangla_atm_payload.json` | POST payload for `/api/v1/score-atm-stream` |

---

## 3. Why

Phase 3 already uses `data-pipeline/seeds/` for bulk ingestion
(`seed_beneficiaries.json`, `seed_external_records.json`). Phase 5's demo
cases are a different concern: specific, curated households for the live
defense demo.

Keeping them in `seeds/demo/`:

- Separates Phase 3 bulk seeds from Phase 5 curated demo data
- Avoids filename collisions with Renz's generator output
- Makes the reset script's file reads explicit
- Keeps `seeds/` root clean for Renz's pipeline

---

## 4. Impact on Other Team Members

**Renz's `generator.py`:** writes only to `seeds/seed_beneficiaries.json`
and `seeds/seed_external_records.json`. It does not touch
`seeds/demo/`. No conflict.

**Charles's ML service:** consumes POST payloads, not files. No conflict.

**Mae's backend:** reads MongoDB, not seed files. No conflict.

**Existing scripts:** `seed_db.py` reads from `seeds/`, not
`seeds/demo/`. No conflict.

**Conclusion:** The new subfolder is additive. Nothing existing reads or
writes there.

---

## 5. Update to PROJECT_STRUCTURE.md

The repository tree in `docs/PROJECT_STRUCTURE.md` has been updated to
show the new subfolder under `data-pipeline/seeds/`.
├── seeds/ # Output Datasets & Database Seeds
│ ├── features_swdi_clean.parquet # Clean training matrix for Charles (ML)
│ ├── seed_beneficiaries.json # 5,000 synthetic household profiles
│ ├── seed_external_records.json # Mock Meralco, LTO, Maynilad data
│ └── demo/ # Phase 5 live-demo seed data
│ ├── graduation_beneficiary.json
│ ├── graduation_external.json
│ ├── graduation_swdi_payload.json
│ └── sangla_atm_payload.json

text

---

## 6. If You Regenerate seeds/

If `generator.py` is ever modified to clear the `seeds/` directory,
preserve `seeds/demo/` or re-run the Phase 5 demo seeder afterward. The
reset script will regenerate demo files if missing.

---

## 7. References

- `docs/PROJECT_STRUCTURE.md` — updated tree
- `docs/tasks/DUSTIN_DATABASE.md` — Phase 5, Tasks 5.1 and 5.2
- `docs/tasks/RENZ_DATA.md` — Phase 5, Task 5.1 (demo scripting)
- `docs/tasks/CHARLES_ML.md` — Phase 5, Task 5.2 (demo test cases)

---

**End of Acknowledgment**
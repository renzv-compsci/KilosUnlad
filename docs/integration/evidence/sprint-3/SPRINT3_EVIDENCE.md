# Sprint 3 Evidence — Production Data Baseline (DAT-01 … DAT-06)

Date: 2026-10-12 | Baseline: ADR-001 80,000-record application set
Environment: local single-node replica set (MongoDB 8.0.23, 4 vCPU, 15 GiB). The Docker
stack was not available in this session; re-run the same commands there and append the logs.

## DAT-01 — Execute ADR-001 (seed overwrite)

Finding: `seed_db.py` inserted raw generator records. Measured against the frozen models,
**100% of ingested documents failed validation**: no `address`, no `enrolled_swdi_level`,
`head_of_household.name` instead of first/last, and external records without `national_id` or
`power_utility`. The raw ingest also stored the training label `true_swdi_level` and full
LandBank PANs. Because jurisdiction filters use `address.*`, the roster was invisible to every
scoped query.

Fix (schema untouched): `seed_mapping.py` adapts records to the models at ingest. Every rule
is traced in the module docstring and covered by `test_seed_mapping.py` (9 tests):

| Model field | Source |
| --- | --- |
| `address.coordinates` | generator GPS, unchanged (used by the 250 m geofence) |
| `address.barangay` | nearest reference centroid (`generate_placeholders.py`: Palingon, Lecheria, Real) |
| `address.municipality/province` | Calamba, Laguna (generator GPS bounds) |
| `demographics.*` declared | `household_size`, `dependents_ratio` = `dependency_ratio`, `wall/roof_score` = `housing_material_score`; `water_access_level` omitted (no source) |
| `demographics.<6 PMT features>` | stored beside the declared fields (ml-swdi-inference v1.1) |
| `landbank_telemetry.card_masked_pan` | `####-xxxx-xxxx-####` |
| `transport_registry.vehicles[]` | category mapped; jeepney = `COMMERCIAL_UV` + franchise; ownership fields kept for the asset rule |
| not ingested | `true_swdi_level`, `school_attendance`, `names`, raw PAN, raw GPS object |

`test_dat01_seed_conformance.js`: 18/18 checks pass. 80,000 + 80,000 documents validated
individually with `Model.validateSync()`, zero orphans, all inside `director_test`
scope, every household carrying a valid v1.1 feature vector, no excluded fields
(`dat01-seed-conformance.log`). The same test fails 17/18 checks on the previous ingest.

## DAT-02 — Ingestion timing
Zero insert errors. Insert phase 8.13 s; end-to-end process time 12.9–14.3 s
(`ingestion-timing.log`). Under the ADR's 60 s performance-task trigger.

## DAT-03 — Index verification at volume
`verify_compound_index.py` now explains both the flagged triage query (3/3) and the full
unflagged Calamba roster (80,002/80,002). Both use IXSCAN on
`risk_assessment.is_flagged_1_address.municipality_1`, with no COLLSCAN and no over-scan
(`dat03-seed-verify.log`). Live API: triage page 1 over 80,005 households in 0.15 s;
`status=ACTIVE_COMPLIANT&limit=100` in 0.19 s.

## DAT-04 — Integrity audit
`audit_integrity.py`: 0 issues across 160,012 documents in 6 collections
(`dat04-audit-integrity.log`). The 1:1 SYN beneficiary-to-external invariant is asserted by DAT-01.

## DAT-05 — Reset rehearsal at the new baseline
| | run 1 | run 2 | run 3 |
| --- | --- | --- | --- |
| reset (wipe, indexes, accounts, Case A) | 5.02 s | 4.59 s | 4.43 s |
| + 80k baseline ingest | 14.28 s | 12.88 s | 13.90 s |
| total | 19.30 s | 17.48 s | 18.34 s |

The reset alone meets the 10 s DoD. **Reset + baseline does not meet it (17.5–19.3 s).**
Recorded as measured, per ADR-001 ("re-measured, not assumed"). A performance task
(streaming JSON load, parallel collection inserts) is optional because the result is under 60 s.

## DAT-06 — Documentation
`MASTER_TURNOVER.md` Domain 2.2 and Domain 6 Step 2 now cite the 80k baseline and the measured
values above. The 5,000-record and 15-second claims are retired.

## Observation for Sprint 2 (ML-01/ML-07)
The live v1 model, scored through the ML service on 3,000 random households from the 20k QA
partition (seed 42), gives **macro F1 0.766** (per-class 0.716 / 0.807 / 0.776). That matches
the turnover's 0.7726. About 4.7% of true Level 1 households are predicted Level 3, so some
assessed SYN households flag as tier inversions; SYN-4PS-000001 is one. This is model error
(Sprint 2 scope), not an integration defect.

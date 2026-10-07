# Phase 5 — Database Report

**Author:** Dustin Martinez (Database Architecture Lead)
**Date:** 2026-10-08
**Status:** COMPLETE (local environment)
**Related:** DUSTIN_DATABASE.md Phase 5, DECISION-008

---

## 1. Summary

Phase 5 required two tasks:

- **Task 5.1** — One-click demo reset script
- **Task 5.2** — Live demo data preparation

Both are complete. The reset script runs in **7 seconds**, within the
10-second DoD. Demo Case A is loaded by the reset. Demo Case B payload is
prepared per contract and awaits verification by Charles.

---

## 2. Task 5.1 — One-Click Demo Reset Script

### 2.1 What Was Built

**File:** `data-pipeline/scripts/reset_demo.sh`

**Docker service:** `reset-demo` in `docker-compose.yml`

**What it does:**

1. Confirms the `kilosunlad-db` container is running
2. Confirms replica set is PRIMARY
3. Drops all 6 collections
4. Recreates collections + 11 indexes
5. Re-seeds test accounts via `seed_test_data.js`
6. Loads demo Case A (Graduation beneficiary + external record)
7. Verifies collection counts

### 2.2 Performance

| Run | Time | Status |
|-----|------|--------|
| First (cold) | 13s | Over DoD |
| Warm | 12s | Over DoD |
| Optimized | **7s** | ✅ Within DoD |

**Optimization applied:** Combined 6 `docker exec mongosh` calls into 3,
eliminating redundant process spawn overhead. No functionality was
removed or degraded.

### 2.3 Task 5.1 DoD Status

> Running `./reset_demo.sh` resets the environment in under 10 seconds.

✅ **Met** — 7 seconds.

### 2.4 How to Run

```powershell
docker-compose run --rm reset-demo
```

**Prerequisite:** Docker stack running.

---

## 3. Task 5.2 — Live Demo Data Preparation

### 3.1 Demo Cases

Two demo cases are required for the live defense presentation:

**Case A — The Graduation Case:**
- Enrolled Level 1 household
- College-level education, concrete walls, GI sheet roof, metered water
- Registered 4-wheel vehicle
- High power consumption (> 200 kWh)

**Case B — The Sangla-ATM Case:**
- 12 LandBank cards
- Clustered nocturnal ATM withdrawals
- Triggers ML anomaly detector

### 3.2 What Was Built

**Location:** `data-pipeline/seeds/demo/`

Four files:

| File | Purpose | Consumer |
|------|---------|----------|
| `graduation_beneficiary.json` | MongoDB Beneficiary document | Your reset script |
| `graduation_external.json` | MongoDB ExternalRecord document | Your reset script |
| `graduation_swdi_payload.json` | POST payload for ML predict-swdi | Charles's ML endpoint |
| `sangla_atm_payload.json` | POST payload for ML score-atm-stream | Charles's ML endpoint |

### 3.3 Case A — Loaded Into MongoDB

Case A is seeded into MongoDB by the reset script:

- `DEMO-4PS-GRAD-0001` — Beneficiary document
- Linked ExternalRecord with 4-wheel vehicle + 285 kWh monthly usage

**Verified via reset output:** 5 beneficiaries, 1 external record after reset.

### 3.4 Case B — Payload for ML Service

Case B is a **POST payload**, not a MongoDB document. It matches
`ml-atm-telemetry.json` contract exactly:

- 12 transactions in ~8 minutes
- All within the nocturnal window (02:14–02:21 AM)
- Avg interval ~38 seconds
- 12 unique cards

**Expected response:** `is_anomalous_batch: true`, `sangla_atm_risk_score: 85.0`

### 3.5 Task 5.2 DoD Status

> Ensure seeded database contains the target demo households.
> Test cases query instantly during rehearsal runs.

- ✅ **Case A** seeded into MongoDB — queries instantly
- ✅ **Case B** payload prepared — matches contract
- 🟡 **Case B ML verification** — pending Charles's ML service being live (out of database scope)

---

## 4. Layout Acknowledgment

A new subfolder was added under `data-pipeline/seeds/`:

```
data-pipeline/seeds/
├── seed_beneficiaries.json
├── seed_external_records.json
└── demo/
    ├── graduation_beneficiary.json
    ├── graduation_external.json
    ├── graduation_swdi_payload.json
    └── sangla_atm_payload.json
```

**Why:** Separates Phase 3 bulk seed data from Phase 5 demo data. No
conflicts with Renz's generator output or Phase 3 scripts.

**Documented in:** `docs/reports/PHASE_5_LAYOUT_ACKNOWLEDGMENT.md`

**PROJECT_STRUCTURE.md updated** to reflect the new subfolder.

---

## 5. Files Added or Modified

| File | Status | Purpose |
|------|--------|---------|
| `data-pipeline/scripts/reset_demo.sh` | New | Demo reset script |
| `data-pipeline/seeds/demo/graduation_beneficiary.json` | New | Case A MongoDB doc |
| `data-pipeline/seeds/demo/graduation_external.json` | New | Case A MongoDB doc |
| `data-pipeline/seeds/demo/graduation_swdi_payload.json` | New | Case A ML payload |
| `data-pipeline/seeds/demo/sangla_atm_payload.json` | New | Case B ML payload |
| `docker-compose.yml` | Modified | Added `reset-demo` service |
| `docs/PROJECT_STRUCTURE.md` | Modified | Added demo subfolder |
| `docs/reports/PHASE_5_LAYOUT_ACKNOWLEDGMENT.md` | New | Layout note |
| `docs/reports/PHASE_5_DATABASE_REPORT.md` | New | This report |
| `docs/handoffs/PHASE_5_DATABASE_HANDOFF.md` | New | Handoff doc |

Contracts unchanged. Schemas unchanged.

---

## 6. Known Limitations

- **Local environment only.** No shared deployment acceptance.
- **Case B ML verification pending.** Charles's ML service not yet live.
- **Reset script assumes bash.** Runs via `docker:cli` service.
- **Single-node replica set.** Per DECISION-006.

---

## 7. References

- `docs/DECISION-008-Phase-3-Ingest-Tooling.md`
- `docs/reports/PHASE_5_LAYOUT_ACKNOWLEDGMENT.md`
- `docs/handoffs/PHASE_5_DATABASE_HANDOFF.md`
- `docs/contracts/ml/ml-swdi-inference.json`
- `docs/contracts/ml/ml-atm-telemetry.json`
- `docs/tasks/DUSTIN_DATABASE.md` — Phase 5 spec

---

**End of Report**
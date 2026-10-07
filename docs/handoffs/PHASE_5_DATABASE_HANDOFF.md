# Phase 5 — Database Handoff

**Author:** Dustin Martinez (Database Architecture Lead)
**Date:** 2026-10-08
**Status:** COMPLETE
**Recipients:** Renz (PM), Charles (ML), Mae (Backend), Markie (Frontend)
**Related:** DUSTIN_DATABASE.md Phase 5

---

## 1. Purpose

This handoff covers Phase 5 database work:

- **Task 5.1** — One-click demo reset script
- **Task 5.2** — Live demo data preparation

It documents what was built, how to run the reset, how the demo cases
are used, and known limitations.

---

## 2. Task 5.1 — Reset Script

### 2.1 What It Does

`data-pipeline/scripts/reset_demo.sh` wipes the database, recreates
indexes, re-seeds test data, and loads the demo Case A household.

**Target:** Complete in under 10 seconds.

**Achieved:** 7 seconds.

### 2.2 How to Run

From repo root:

```powershell
docker-compose run --rm reset-demo
```

**Prerequisite:** Docker stack running with `kilosunlad-db` healthy.

### 2.3 What It Does Step by Step

| Step | Action |
|------|--------|
| 1 | Verifies `kilosunlad-db` container is running |
| 2 | Verifies replica set is PRIMARY |
| 3 | Drops all 6 collections |
| 4 | Recreates collections + 11 indexes |
| 5 | Re-seeds 4 test accounts + sample records |
| 6 | Loads demo Case A (Graduation) |
| 7 | Verifies collection counts |

### 2.4 Expected Output

```
[reset_demo] ===============================================
[reset_demo] KilosUnlad — Demo Reset
[reset_demo] ===============================================
[reset_demo] [1/5] Checking database container...
[reset_demo]       Container kilosunlad-db is running.
[reset_demo] [2/5] Wiping, recreating collections, and rebuilding indexes...
      Replica set PRIMARY confirmed.
      Dropped 6 collections.
      Collections + indexes rebuilt.
[reset_demo] [3/5] Seeding test accounts...
[reset_demo]       Test accounts + sample records seeded.
[reset_demo] [4/5] Loading demo Case A and verifying...
      Demo Case A loaded.
      users:              4
      beneficiaries:      5
      external_records:   1
      verification_tasks: 2
      audit_logs:         0
      system_configs:     0
[reset_demo] ===============================================
[reset_demo] [5/5] Demo reset complete in 7s
[reset_demo] Within 10-second DoD.
[reset_demo] ===============================================
```

---

## 3. Task 5.2 — Demo Data

### 3.1 Two Demo Cases

Per the roadmaps of Dustin, Renz, and Charles, the live demo requires two
specific households.

**Case A — The Graduation Case:**

- Enrolled Level 1
- College education, concrete walls, GI sheet roof, metered water
- Registered 4-wheel vehicle
- High power usage (285 kWh/month)

**Case B — The Sangla-ATM Case:**

- 12 LandBank cards
- Clustered nocturnal withdrawals (~38s apart)
- All within 02:14–02:21 AM window

### 3.2 Where the Data Lives

```
data-pipeline/seeds/demo/
├── graduation_beneficiary.json     (Case A — MongoDB)
├── graduation_external.json        (Case A — MongoDB)
├── graduation_swdi_payload.json    (Case A — POST to ML)
└── sangla_atm_payload.json         (Case B — POST to ML)
```

**Case A** is loaded into MongoDB by the reset script.

**Case B** is a POST payload, not a MongoDB document. It's sent to
Charles's ML endpoint during the demo.

### 3.3 Case A — Loaded by Reset

The reset script inserts:

- `DEMO-4PS-GRAD-0001` into `beneficiaries`
- Matching external record with 4-wheel vehicle + 285 kWh into `external_records`

**Verification:** After reset, `beneficiaries` count is 5 (4 from test
data + 1 demo), `external_records` count is 1 (demo).

### 3.4 Case B — Payload for ML Service

The payload matches `ml-atm-telemetry.json` contract exactly.

**Expected ML response:**

```json
{
  "is_anomalous_batch": true,
  "sangla_atm_risk_score": 85.0,
  "cluster_metrics": {
    "total_transactions_in_window": 12,
    "avg_interval_seconds": 38.5,
    "nocturnal_window_flag": true,
    "historical_cluster_overlap_rate": 0.83
  }
}
```

**Why these values:**

Per Charles's algorithm (from his roadmap Task 2.5):

| Check | Threshold | Payload value | Points |
|-------|-----------|---------------|--------|
| Avg interval | `< 45 sec` | ~38 sec | +35 |
| Nocturnal | 01:00–04:30 AM | 02:14–02:21 AM | +30 |
| Card cluster overlap | `≥ 70%` | 12 unique cards | +40 |
| **Total** | | | **105 → capped at 100** |

---

## 4. Action Items for Recipients

### For Charles — Case B Verification

**Task:** Verify that `sangla_atm_payload.json` triggers your anomaly
detector correctly.

**How:**

Once your ML service is live and mounted at `/api/v1/score-atm-stream`:

```bash
curl -X POST http://localhost:8000/api/v1/score-atm-stream \
  -H "Content-Type: application/json" \
  -d @data-pipeline/seeds/demo/sangla_atm_payload.json
```

**Expected:** `is_anomalous_batch: true`, `sangla_atm_risk_score: 85.0`.

**Not verified by Dustin.** ML service verification is out of database
scope and depends on your service being live.

### For Renz — Demo Scripting

**Task:** Reference the reset script and demo data in your live demo
script.

**Suggested flow:**

1. Run `docker-compose run --rm reset-demo` (7s reset)
2. Log in as `case_worker_test` (credentials shared privately)
3. Show triage queue with Case A flagged
4. Trigger ML predict-swdi on Case A → Level 3 result
5. Trigger ML score-atm-stream on Case B payload → anomalous batch
6. Demonstrate COA audit chain verification

### For Mae — Backend Integration

No action required from Phase 5. The demo data uses existing contracts
and schemas.

### For Markie — Frontend Demo

No action required. The frontend consumes API responses from Mae's
backend. Case A appears in the triage queue after login.

---

## 5. Layout Note — `data-pipeline/seeds/demo/`

A new subfolder was added for demo data:

```
data-pipeline/seeds/demo/
```

**Why:** Separates Phase 3 bulk seed data from Phase 5 curated demo
data. No conflicts with Renz's `generator.py` output or Phase 3 scripts.

**Documented in:** `docs/reports/PHASE_5_LAYOUT_ACKNOWLEDGMENT.md`

**PROJECT_STRUCTURE.md updated** to reflect the new subfolder.

**If Renz's generator ever wipes `seeds/`:** The reset script will fail
gracefully if demo files are missing. Re-run the reset after Renz
regenerates his seeds.

---

## 6. Files Added or Modified

| File | Status |
|------|--------|
| `data-pipeline/scripts/reset_demo.sh` | New |
| `data-pipeline/seeds/demo/*` (4 files) | New |
| `docker-compose.yml` | Modified (added `reset-demo`) |
| `docs/PROJECT_STRUCTURE.md` | Modified (added `demo/` subfolder) |
| `docs/reports/PHASE_5_LAYOUT_ACKNOWLEDGMENT.md` | New |
| `docs/reports/PHASE_5_DATABASE_REPORT.md` | New |
| `docs/handoffs/PHASE_5_DATABASE_HANDOFF.md` | New (this file) |

---

## 7. Known Limitations

- **Local environment only.** No shared deployment acceptance.
- **Case B ML verification pending.** Charles's ML service not yet live.
- **Reset script requires Docker.** Runs via `docker:cli` service with
  socket mount.
- **Single-node replica set.** Per DECISION-006.

---

## 8. References

- `docs/reports/PHASE_5_DATABASE_REPORT.md` — technical report
- `docs/reports/PHASE_5_LAYOUT_ACKNOWLEDGMENT.md` — layout note
- `docs/PROJECT_STRUCTURE.md` — updated tree
- `docs/contracts/ml/ml-swdi-inference.json`
- `docs/contracts/ml/ml-atm-telemetry.json`
- `docs/tasks/DUSTIN_DATABASE.md` — Phase 5 spec
- `docs/tasks/RENZ_DATA.md` — demo scripting (Task 5.1)
- `docs/tasks/CHARLES_ML.md` — demo test cases (Task 5.2)

---

**End of Handoff**
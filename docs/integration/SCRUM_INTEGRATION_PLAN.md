# KilosUnlad Integration Program — Scrum Sprint Plan 

## Revision Change Log

* 2026-10-12: Sprint 1–6 execution on branch `claude/clever-albattani-8ikzld`. Per-item status: `backlog.md` rev 5. Changes, traceability and flags: `CHANGELOG_TRACEABILITY.md`. Contract decisions: DECISION-009.

* 2026-10-13: Docker verification and closure. Rehearsal 16/16 and clean clone on the Compose stack; DAT-05 met (snapshot restore, 5.6–7.1 s); DEF-04 deck, E2E-05 cadence log. Only ML-02/03/06 (and ML-04/05/07 v2 parts) remain, blocked on the FIES input file. Status: `backlog.md` rev 6.

* 2026-10-13 (later): Sprint 2 completed on real PSA FIES data. v2 (E1, macro F1 0.6244 on the 6,232-row empirical holdout) is the served model; leakage audit 6/6. ML-02 to ML-07 closed; the 0.85 target is not met and is disclosed.

* 2026-10-14: **Plan revision 3.** The scope grew after Sprint 6, so a **Sprint 7 (post-plan scope)** section records it with its own IDs: live-data UI (DECISION-010), lifecycle completion (DECISION-011 notice issuance and evidence viewing; DECISION-012 retention, appeal outcome, re-flag cooldown) and the UAT instrument. A **Verification Map** links every item to its test IDs. Section 12 now has TC-01 to TC-24 (TC-18 to TC-24 are the post-plan cases). One documented Iron Law 2 exception: `BENEFICIARY_RETAINED` added to the audit action list (DECISION-012). Every test in the program is listed in `docs/testing/MASTER_TEST_CATALOG.md`. Status: `backlog.md` rev 7.

## Sprint 0 — Integration Readiness Gate (1 day)

**Goal:** Close all documentation and scope flags before any build sprint starts.

| ID     | Item                                                                                     | Owner          |
| ------ | ---------------------------------------------------------------------------------------- | -------------- |
| RDY-01 | Enumerate all four functions in `integrationPlaceholders.service.js`                     | Renz           |
| RDY-02 | ADR-001: production seed baseline decision (5k contract vs 80k application set)          | Renz           |
| RDY-03 | F1 disposition memo opened; transferred to Sprint 2 as ML-01 for evidence reconciliation | Renz + Charles |
| RDY-04 | Locate or schedule the 18/19-year-old age-out rule implementation                        | Renz + Mae     |
| RDY-05 | Board, backlog file, evidence folder established                                         | Renz           |

**DoD:**

* Placeholder function list recorded verbatim.

* ADR-001 signed with one baseline and a re-benchmark plan.

* Age-out rule has a named location or a scheduled Sprint 4 item.

* Board and evidence folder exist in the repository.

**Exit gate:** Sprint 1 and Sprint 2 cannot start until RDY-01 and RDY-02 close.

---

## Sprint 1 — Backend Integration Seams (3 days)

**Goal:** Eliminate every 503 `ENDPOINT_NOT_READY` and make the ML path live through the backend.

| ID     | Item                                                                                                    | Owner  |
| ------ | ------------------------------------------------------------------------------------------------------- | ------ |
| INT-01 | Update `mlClient.service.js` to the 6-feature PMT vector                                                | Renz   |
| INT-02 | Mount `POST /api/v1/tasks/:id/submit` via `sync.service.js` + multipart adapter                         | Renz   |
| INT-03 | Mount `POST /api/v1/appeals/docket` via `appealLifecycle.service.js`                                    | Renz   |
| INT-04 | Mount `POST /api/v1/calamity/toggle` via `calamity.service.js`                                          | Renz   |
| INT-05 | Verify `discrepancy.service.js` wired into live assessment and persists flags                           | Renz   |
| INT-06 | Verify `audit.middleware.js` appends blocks on submission and status transitions                        | Renz   |
| INT-07 | Regression matrix: duplicate submission, altered bytes, geofence >250 m, unauthorized role, expired JWT | Renz   |
| INT-08 | Notify Markie; enable sync button and appeals dialog                                                    | Markie |

**DoD:**

* Zero 503 responses on previously placeholder routes.

* Backend-triggered `predict-swdi` returns level, probabilities, SHAP; ML container stopped yields `EVALUATED_VIA_FALLBACK` without crash.

* Altered photo bytes return 422 `EVIDENCE_HASH_MISMATCH`; geofence breach rejected with documented code.

* Appeals docket starts the 15-day countdown; calamity toggle returns hold for matching zone.

* `verify-chain` passes over expanded range after submission and status transition.

* INT-07 matrix passes with zero unintended writes on rejection paths.

*Note:* INT-01 is schema-stable across model versions. Sprint 2 may retrain the model without reopening this seam.

---

## Sprint 2 — ML Empirical Grounding and Metric Rigor (3 days, Charles executes, Renz reviews)

**Goal:** Re-ground the SWDI classifier in the curated empirical PSA FIES parquet, establish an honest evaluation protocol, and pursue the 0.85 Macro F1 target through legitimate levers only.

### Background evidence and problem statement

* Verified fact: the reported winner (LightGBM, Macro F1 0.7726 in turnover; 0.7781 in your latest statement) was benchmarked on the synthetic 70,000-record partition. The empirical matrix `features_swdi_clean.parquet` (41,544 real households, income-derived SWDI labels) was not used for training.

* Engineering inference: training exclusively on synthetic data is circular. The generator encodes the latent-wealth formula and tier thresholds, so a tree model can recover near-deterministic boundaries that do not transfer to real households. This inflates synthetic-test metrics and understates real-world error. Your instinct to ground training in the empirical parquet is methodologically correct and matches the Stage 1 empirical-base mandate in `RENZ_DATA_PROMPT.md`.

* Expectation setting (stated before any experiment): grounding in real data may not raise Macro F1, because empirical feature joints and income-derived labels are noisier than generator output. The defensible outcome is an honest metric on real data plus a rigorous protocol. Metric chasing on synthetic test sets is prohibited.

### Methodological guardrails (binding for all experiments)

1. The inference contract is frozen at the 6 PMT features. Training may not use any feature unavailable at inference; doing so is leakage and a contract violation.

2. All candidate configurations are evaluated on one identical held-out empirical test split (stratified, seed 42). Selection criterion is pre-registered: Macro F1 on the empirical holdout; tie-break is minimum per-class F1.

3. The empirical test split is excluded from every training blend. The synthetic 20k test partition remains backend QA data and is never used for model selection.

4. Hyperparameter search occurs on training folds only, via stratified cross-validation. No test-set peeking.

5. Every run records seed, split hashes, library versions, and row counts into `model_metadata.json`.

### Experiment matrix

| Exp | Training data                                            | Class weighting | Tuning         | Purpose                                                      |
| --- | -------------------------------------------------------- | --------------- | -------------- | ------------------------------------------------------------ |
| E1  | Empirical 41,544 (70/15/15 stratified)                   | none            | defaults       | New reference baseline                                       |
| E2  | Empirical                                                | balanced        | defaults       | Isolate imbalance effect                                     |
| E3  | Empirical                                                | balanced        | bounded search | Isolate tuning effect                                        |
| E4  | Blend: empirical + synthetic at 0.3–0.5 synthetic weight | balanced        | best of E3     | Test whether synthetic volume helps real-data generalization |
| E5  | Pretrain synthetic, fine-tune empirical                  | balanced        | best of E3     | Test transfer learning against circularity                   |

Bounded search space: `num_leaves`, `max_depth`, `learning_rate`, `min_child_samples`, `subsample`, `colsample_bytree`.

### Backlog

| ID    | Item                                                                                                                                                                                                                | Owner          |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| ML-01 | Reconcile 0.7726 vs 0.7781 into one figure with run metadata; record in `model_metadata.json` and close RDY-03                                                                                                      | Charles        |
| ML-02 | Run E1–E3; record per-class F1, Macro F1, ROC-AUC (OvR) on the empirical holdout                                                                                                                                    | Charles        |
| ML-03 | Run E4–E5; compare against best of E1–E3 on the same holdout                                                                                                                                                        | Charles        |
| ML-04 | Leakage audit: assert trained feature set equals the frozen 6-feature vector; assert empirical test rows absent from all training blends                                                                            | Charles + Renz |
| ML-05 | Contract compliance: re-verify payload schema, sub-50 ms latency, SHAP top-3 attributions, fallback path with the winning configuration                                                                             | Charles        |
| ML-06 | Artifact versioning: commit `lightgbm_swdi_v2.joblib`, updated `model_metadata.json` with data provenance (empirical rows, synthetic rows, split hashes); rebuild `kilosunlad-ml` image; re-run container benchmark | Charles        |
| ML-07 | Documentation: update turnover Domain 4 metrics, CHARLES_ML DoD disposition, and defense notes to the single reconciled figure; if 0.85 remains unmet, file the justified-threshold memo with per-class analysis    | Renz + Charles |

### Sprint 2 Definition of Done

* Empirical-only baseline (E1) trained and evaluated; metrics recorded with full provenance.

* At least three configurations compared on the identical empirical holdout under the pre-registered criterion.

* Winner selected by empirical holdout Macro F1 with per-class tie-break; selection rationale written into `model_metadata.json`.

* Macro F1 improved over the reconciled current value, or a documented analysis explains the real-data noise ceiling (no silent acceptance, no synthetic-test shopping).

* Leakage audit passes: 6 features only; empirical test rows excluded from training.

* v2 artifact loads in the container; latency, SHAP, and fallback guarantees re-verified.

* Turnover, roadmap DoD, and deck citations updated to one reconciled metric.

**Evidence artifacts:** experiment results table; `model_metadata.json` diff; latency re-benchmark log; leakage audit output.

**Schedule note:** Sprint 2 is owned by Charles and depends only on RDY-03. It may run in parallel with Sprint 1 (different owner, no shared files), which preserves the original 18-day timeline. If serialized, the program extends by 3 days.

---

## Sprint 3 — Production Data Baseline and Integrity Re-Verification (3 days)

**Goal:** Replace placeholder data with the chosen baseline and re-prove index and integrity guarantees at volume.

| ID     | Item                                                                          | Owner         |
| ------ | ----------------------------------------------------------------------------- | ------------- |
| DAT-01 | Execute ADR-001: overwrite `data-pipeline/seeds/` with chosen baseline        | Renz          |
| DAT-02 | Run `seed-ingest`; measure and record wall-clock time                         | Renz          |
| DAT-03 | Run `seed-verify`; confirm IXSCAN, no COLLSCAN, no over-scan at volume        | Renz + Dustin |
| DAT-04 | Run `audit_integrity.py`; zero orphans; 1:1 beneficiary-to-external invariant | Renz          |
| DAT-05 | Rehearse `reset-demo` at new baseline                                         | Renz          |
| DAT-06 | Update turnover and docs to measured baseline and timings                     | Renz          |

**DoD:**

* Ingestion completes with zero insert errors; measured time recorded and replaces placeholder-volume claims.

* Index verification assertions pass at production volume.

* Integrity audit reports 0 issues with matching counts.

* `reset-demo` meets the 10-second DoD at the new baseline.

* No document cites a record count the database does not hold.

---

## Sprint 4 — End-to-End Integration and Edge-Case Safeguards (3 days)

**Goal:** Prove the full container path produces a flagged, dispatched, audited assessment, and prove statutory safeguards hold.

| ID     | Item                                                                                                                                 | Owner         |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------ | ------------- |
| E2E-01 | Full network test: client → gateway → backend → ML and DB; one assessment yields prediction, risk score, flag, dispatch, audit block | Renz          |
| E2E-02 | Calamity moratorium freeze test via mounted toggle; expiry resumes processing                                                        | Renz          |
| E2E-03 | Age-out rule test per RDY-04 outcome                                                                                                 | Renz + Mae    |
| E2E-04 | Live SHAP explanations rendered in triage drawer from real ML output (v2 artifact)                                                   | Markie + Renz |
| E2E-05 | Standup cadence evidence for the sprint window                                                                                       | Renz          |

**DoD:**

* One frontend-submitted assessment produces the full chain in order, verifiable end to end.

* Calamity hold prevents dispatch while active and releases after expiry; both captured.

* Age-out behavior demonstrated, or the gap filed as a named limitation with mitigation.

* Triage drawer SHAP values match the ML response payload.

---

## Sprint 5 — Adversarial Stress and Tamper Proofing (3 days)

**Goal:** Demonstrate forensic non-repudiation and offline resilience under adversarial conditions.

| ID     | Item                                                                      | Owner         |
| ------ | ------------------------------------------------------------------------- | ------------- |
| STR-01 | Tamper block 3 via `mongosh`; confirm `INVALID_HASH_AT_SEQUENCE_3`        | Renz + Dustin |
| STR-02 | Airplane-mode test: two offline reports, reconnect, batch sync, zero loss | Renz + Markie |
| STR-03 | Concurrency and duplicate regression at production volume                 | Renz          |
| STR-04 | Capture all adversarial evidence for defense slides                       | Renz          |

**DoD:**

* Tampered chain detected at exactly block 3; untampered ranges still verify.

* Airplane-mode sync loses nothing; edited drafts replace rather than duplicate.

* Concurrency matrix commits exactly one task per contested household; no unhandled 5xx.

---

## Sprint 6 — Defense Packaging, Demo Rehearsal, and Clean Clone (3 days)

**Goal:** Convert the verified system into a rehearsed, reproducible, defensible deliverable.

| ID     | Item                                                                                | Owner        |
| ------ | ----------------------------------------------------------------------------------- | ------------ |
| DEF-01 | Script the four capstone proofs                                                     | Renz         |
| DEF-02 | Full rehearsal with `reset-demo` between runs; time each scenario                   | Renz + leads |
| DEF-03 | Clean-clone verification on fresh machine                                           | Renz         |
| DEF-04 | Slide deck including limitations slide with reconciled ML metrics and v2 provenance | Renz         |
| DEF-05 | Documentation closure: change log, traceability matrix, flag register               | Renz         |

**DoD:**

* All four proofs execute from clean reset states within the timebox; Sangla-ATM returns 85.0.

* Clean clone boots all five containers with zero manual intervention.

* Deck cites only measured evidence and the single reconciled Macro F1 figure with its empirical-holdout methodology.

* Change log lists every change from Sprints 0–6.

---

## Sprint 7 — Lifecycle Completion and Live UI (post-plan scope, added 2026-10-14)

**Goal:** Remove every dead end in the beneficiary lifecycle and make every screen show server data, without changing a guard or (beyond one approved enum value) the schema.

| ID     | Item                                                                                                              | Decision     | Owner         |
| ------ | ----------------------------------------------------------------------------------------------------------------- | ------------ | ------------- |
| UI-01  | Replace every sample panel with server data through read-only routes (overview, tasks, caseworkers, audit blocks, policy) | DECISION-010 | Renz + Markie |
| UI-02  | Phone, tablet and desktop layouts (390 / 834 / 1440 px) with no sideways scroll                                   | —            | Markie        |
| UI-03  | Final look: logo, typeface, street map with all households in scope (`GET /insights/map`), plain-language navigation | DECISION-010 addendum | Markie |
| DEMO-01 | Populated demo dataset through the API (80,007 households, 627 flagged, sealed)                                  | —            | Renz          |
| LIF-01 | Director reviews the field report and its hash-verified photos (`GET /tasks/:id/report`, `GET /evidence/:sha256`) | DECISION-011 | Renz          |
| LIF-02 | Notice issuance: UNDER_INVESTIGATION → NOTICE_OF_INELIGIBILITY (`POST /tasks/:id/resolve`)                        | DECISION-011 | Renz          |
| LIF-03 | Final graduation after 15 days with no appeal (`POST /beneficiaries/:id/graduate`)                                | DECISION-011 | Renz          |
| LIF-04 | Retention after a field visit: UNDER_INVESTIGATION → ACTIVE_COMPLIANT (`POST /tasks/:id/retain`)                  | DECISION-012 | Renz          |
| LIF-05 | Appeal hearing outcome: granted → ACTIVE_COMPLIANT, denied → GRADUATED (`POST /appeals/:docket/decide`)          | DECISION-012 | Renz          |
| LIF-06 | 180-day re-flag cooldown after retention or a granted appeal (409 `RETENTION_COOLDOWN`)                           | DECISION-012 | Renz          |
| UAT-01 | UAT instrument: session form, response CSV, SUS and completion scorer                                             | —            | Renz          |

**DoD:**

* Every new route has a frozen contract in `docs/contracts/`, a server test written first, and an integration script in `data-pipeline/scripts/` (Iron Laws 1 and 5).

* No guard removed or weakened; the only schema change is the approved `BENEFICIARY_RETAINED` audit action (Iron Laws 2 and 3).

* The UI shows only server data; every role passes the browser test at three widths.

* The full rehearsal (`run_capstone_proofs.sh --full`) and the Section 12 runner pass from clean resets, including the new steps.

* UAT ratings are collected from real participants only; the instrument never invents a score.

---

## Hardening Window (2 days, non-sprint buffer)

Defect fixes and evidence corrections only. No new scope.

---

## Updated Traceability Matrix

| Sprint | Roadmap Tasks                                    | Turnover References                | Contracts Exercised                                    |
| ------ | ------------------------------------------------ | ---------------------------------- | ------------------------------------------------------ |
| 0      | Governance                                       | Domain 1.1 note, Domain 4.1        | None                                                   |
| 1      | Integration seams                                | Steps 1 and 3; Domains 1.2, 3.5, 5 | `field-task-submission.json`, `ml-swdi-inference.json` |
| 2      | ML rigor (new; extends CHARLES_ML Tasks 2.1–2.3) | Domain 4.1, 4.2                    | `ml-swdi-inference.json`                               |
| 3      | Data baseline                                    | Step 2; Domains 2.2–2.4            | Seed schemas                                           |
| 4      | 3.1, 3.2, 3.3                                    | Step 4 prep; Domains 3.5, 5        | `admin-triage-feed.json`, `ml-swdi-inference.json`     |
| 5      | 4.1, 4.2                                         | Domain 2.3; Domain 1.3             | `audit-chain-verification.json`                        |
| 6      | 5.1, 5.2, 5.3                                    | Step 4; Domain 2.4                 | `ml-atm-telemetry.json`                                |
| 7      | Post-plan scope (DECISION-010/011/012)           | CLAUDE_TURNOVER §00, §000          | `admin-insights-overview.json`, `admin-task-list.json`, `admin-caseworker-directory.json`, `audit-block-list.json`, `admin-policy.json`, `admin-map-density.json`, `admin-task-report.json`, `admin-evidence-file.json`, `admin-notice-issuance.json`, `admin-graduation.json`, `admin-retention.json`, `admin-appeal-decision.json` |

## Verification Map (every plan item → its tests, 2026-10-14)

IDs: `UT-nnn` = unit/component case (`docs/testing/UNIT_TEST_REPORT.md`), `TC-nn` = Section 12 case (`SECTION12_TEST_RESULTS.md`), `CAP-nn` = full-rehearsal step, `S`/`D` = manual and live-demo scenarios (`MANUAL_TEST_SCENARIOS.md`). Integration scripts are in `data-pipeline/scripts/`. The full list of every check is in `docs/testing/MASTER_TEST_CATALOG.md`.

| Item | Integration script(s) | Unit / component tests | Section 12 | Rehearsal / manual | Status |
| --- | --- | --- | --- | --- | --- |
| RDY-01..05 | — (documents) | UT-084..UT-087 (placeholders) | — | — | DONE |
| INT-01 | `test_int01_ml_contract.js` | UT-054..UT-061 | TC-03 | CAP-05 | DONE |
| INT-02 | `test_int02_submission.js` | UT-011..UT-019, UT-043..UT-053, UT-103 | TC-08, TC-09, TC-10 | CAP-07; S5 | DONE |
| INT-03 | `test_int03_appeals_docket.js` | UT-029..UT-033, UT-099 | TC-11, TC-12 | CAP-08; S8 | DONE |
| INT-04 | `test_int04_calamity_toggle.js` | UT-034..UT-039, UT-100 | TC-16 | CAP-09; S9 | DONE |
| INT-05 | `test_int05_risk_assessment.js` | UT-020..UT-023, UT-102 | TC-04 | CAP-06; S7 | DONE |
| INT-06 | every script ends with `verify-chain` | UT-001..UT-010, UT-097..UT-098 | TC-13 | all CAP steps | DONE |
| INT-07 | `test_int02_submission.js`, `test_section12_plan.js` | UT-047..UT-053, UT-062..UT-082 | TC-02, TC-06, TC-08, TC-09 | S11 | DONE |
| INT-08 | `test_int08_appeals_ui.js`, `test_str02_airplane_sync.js` | UT-106..UT-167 (client) | TC-12 | CAP-10; S6, S8 | DONE |
| ML-01..07 | `test_int01_ml_contract.js` (v2 served) | UT-174..UT-189; `audit_leakage.py` 6/6 | TC-03, TC-15 | CAP-05 | DONE (0.85 not met, disclosed) |
| DAT-01..06 | `test_dat01_seed_conformance.js`, `test_dat05_reset_baseline.sh`, `verify_compound_index.py`, `audit_integrity.py` | UT-190..UT-198 | TC-17 | CAP-18 | DONE |
| E2E-01 | `test_e2e01_full_chain.js` | UT-104 | TC-04, TC-05 | CAP-01; D1–D3 | DONE |
| E2E-02 | `test_e2e02_calamity_freeze.js` | UT-101 | TC-16 | CAP-11; S9, D8 | DONE |
| E2E-03 | `test_e2e03_age_out.js` | UT-024..UT-028 | — | CAP-12 | DONE |
| E2E-04 | `test_e2e04_shap_drawer.js`, `test_e2e04_drawer_ui.js` | UT-174..UT-178 | TC-03 | CAP-13, CAP-14; S3 | DONE |
| E2E-05 | — (cadence log) | — | — | — | DONE (team notes pending) |
| STR-01 | `test_str01_tamper_detection.js` | UT-006..UT-010 | TC-14 | CAP-04; S10, D9 | DONE |
| STR-02 | `test_str02_airplane_sync.js` | UT-168..UT-173 | TC-07, TC-10 | CAP-02; S6, D5 | DONE |
| STR-03 | `test_str03_concurrency.js` | UT-098 (concurrency subtests) | TC-06 | CAP-19 | DONE |
| STR-04 | — (evidence capture) | — | — | — | DONE |
| DEF-01 | `run_capstone_proofs.sh` | — | TC-15 | CAP-01..CAP-04 | DONE |
| DEF-02 | `run_capstone_proofs.sh --full` | — | — | CAP-01..CAP-19 (19/19) | DONE |
| DEF-03 | clean clone + `docker compose up` | UT-105 (app role on a fresh container) | — | — | DONE |
| DEF-04 | — (deck) | — | — | live-demo D1–D11 | DONE |
| DEF-05 | — (change log) | — | — | — | DONE |
| UI-01, UI-03 | `test_ui_live_data.js` | UT-200, UT-203..UT-206 | TC-18 | CAP-15; S2, D1 | DONE |
| UI-02 | `test_ui_live_data.js` | — | TC-19 | CAP-15; S12 | DONE |
| DEMO-01 | `load_demo_data.sh`, `test_ui_live_data.js` (80k) | — | TC-18 | §0 demo dataset | DONE |
| LIF-01 | `test_decision011_notice_flow.js` | UT-201, UT-207 | TC-20 | CAP-16; S13, D6, D9 | DONE |
| LIF-02 | `test_decision011_notice_flow.js` | UT-201, UT-207 | TC-11 | CAP-16; S13, D6 | DONE |
| LIF-03 | `test_decision011_notice_flow.js` | UT-201, UT-207 | TC-21 | CAP-16; S13, D7 | DONE |
| LIF-04 | `test_decision012_retention_flow.js` | UT-199, UT-202, UT-208 | TC-22 | CAP-17; S14, D11 | DONE |
| LIF-05 | `test_decision012_retention_flow.js` | UT-199, UT-202, UT-208 | TC-23 | CAP-17; S15, D7 | DONE |
| LIF-06 | `test_decision012_retention_flow.js` | UT-202 | TC-24 | CAP-17; S14 | DONE |
| UAT-01 | — | UT-209..UT-212 | 12.4 | `docs/testing/uat/` | DONE (sessions pending) |

## Updated Risk and Flag Closure Register

| Flag                                                                 | Severity | Closes In                                          | Status (2026-10-14) |
| -------------------------------------------------------------------- | -------- | -------------------------------------------------- | ------------------- |
| Metric discrepancy 0.7726 (turnover) vs 0.7781 (current statement)   | MODERATE | Sprint 2, ML-01                                    | CLOSED: 0.7771 reconciled (v1); superseded by v2 |
| Synthetic-only training; empirical parquet unused (circularity risk) | MAJOR    | Sprint 2, ML-02/ML-03                              | CLOSED: v2 trained on 29,080 real households |
| Macro F1 below stated 0.85 DoD                                       | MAJOR    | Sprint 2 (improvement or justified-threshold memo) | DISCLOSED: v2 0.6244; memo `F1_DISPOSITION_MEMO.md`; limitations slide |
| Dataset scale contradiction (5k vs 80k/100k)                         | MAJOR    | Sprint 0 decision, Sprint 3 execution              | CLOSED: 80k baseline (ADR-001) |
| Age-out rule implementation unnamed                                  | MODERATE | Sprint 0 location, Sprint 4 test                   | CLOSED: E2E-03 |
| Placeholder enumeration incomplete                                   | MODERATE | Sprint 0                                           | CLOSED: RDY-01 |
| Integrity counts 54 vs 50                                            | MINOR    | Sprint 3                                           | CLOSED: DAT-04 |
| Lifecycle dead ends (no notice route; no retention; no appeal outcome) | MAJOR  | Sprint 7, LIF-01..06                               | CLOSED: DECISION-011, DECISION-012 |

## Amended Program-Level Definition of Done

**Status (2026-10-14): met**, with two items that depend on people, not code: UAT participant ratings (UAT-01) and the team's standup notes (E2E-05). The 0.85 macro F1 target is not met and is disclosed as the program DoD allows ("no document … cites a metric … unsupported by a captured artifact").

The program is complete only when every sprint DoD is checked; the SWDI classifier in production is the v2 artifact trained under the Sprint 2 protocol with empirical provenance recorded; every evidence artifact exists in `/docs/integration/evidence/`; the four proofs rehearse cleanly from reset; the clean-clone test passes on foreign hardware; and no document, slide, or contract cites a metric, count, or capability unsupported by a captured artifact.

---
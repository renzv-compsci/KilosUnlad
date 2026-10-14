# KilosUnlad — Master Test Catalog

**Final build:** `main` after PR #38 (2026-10-14). **Plan reference:** `docs/integration/SCRUM_INTEGRATION_PLAN.md` revision 3 (Sprints 0–7).
**What this is:** one place that lists every test in the project with its ID, what it checks, where it lives and its latest result. The detailed reports stay where they are; this catalog points to them.
**Generated parts:** §10 (integration checks) and §11 (unit and component cases) are filled from the raw logs by `docs/testing/tools/build_test_docs.py`. Every other table is maintained by hand from the documents named in it.

## Contents
1. [Summary](#1-summary)
2. [ID scheme](#2-id-scheme)
3. [Scrum plan items and their tests (RDY, INT, ML, DAT, E2E, STR, DEF, Sprint 7)](#3-scrum-plan-items-and-their-tests)
4. [Section 12 test cases TC-01 to TC-24](#4-section-12-test-cases-tc-01-to-tc-24)
5. [Section 12 defects (corrective-action re-checks)](#5-section-12-defects)
6. [User acceptance testing (UAT A–D)](#6-user-acceptance-testing)
7. [Full rehearsal steps CAP-01 to CAP-19](#7-full-rehearsal-steps)
8. [Section 12 runner steps R12-01 to R12-17](#8-section-12-runner-steps)
9. [Manual scenarios S1–S15 and live-demo cases D1–D11](#9-manual-scenarios-and-live-demo-cases)
10. [Integration-script checks IT-nnn](#10-integration-script-checks)
11. [Unit and component cases UT-nnn](#11-unit-and-component-cases)
12. [ML evaluation and leakage audit](#12-ml-evaluation-and-leakage-audit)
13. [Where the evidence is](#13-where-the-evidence-is)

---

## 1. Summary

| Level | IDs | Count | Passed | Result source |
| --- | --- | ---: | ---: | --- |
| Scrum plan items (Sprints 0–7) | RDY, INT, ML, DAT, E2E, STR, DEF, UI, DEMO, LIF, UAT | 51 | 51 done | `backlog.md` rev 7 |
| Section 12 test cases | TC-01 … TC-24 | 24 | 24 | `SECTION12_TEST_RESULTS.md` |
| Section 12 defects re-verified | Defect DEF-01 … DEF-07 | 7 | 7 resolved | `test_section12_defects.js` |
| UAT scenarios (scripted capability) | UAT-A … UAT-D | 4 | 4 met | participant ratings **pending** |
| Full rehearsal steps (Docker, clean reset each) | CAP-01 … CAP-19 | 19 | 19 | `run_capstone_proofs.sh --full` |
| Section 12 runner steps (Docker, clean reset each) | R12-01 … R12-17 | 17 | 17 | `run_section12_plan.sh` |
| Integration-script checks | IT-001 … | <!-- IT COUNT -->415 | all | §10 |
| Unit and component cases | UT-001 … UT-212 | <!-- UT COUNT -->208 | all | `UNIT_TEST_REPORT.md` |
| Manual scenarios (run by a person) | S1 … S15 | 15 | to be recorded | `MANUAL_TEST_SCENARIOS.md` |
| Live-demo cases (run by a person) | D1 … D11 | 11 | to be recorded | `MANUAL_TEST_SCENARIOS.md` §D |
| ML experiments and leakage audit | E1 … E5, F1–F3, P1–P3 | 11 | audit 6/6 | §12 |

**Not met, and said so everywhere:** the plan's macro F1 ≥ 0.85 target (v2 reaches 0.6244 on real data). **Waiting on people, not code:** UAT participant ratings and the manual / live-demo result rows.

## 2. ID scheme

| Prefix | Meaning | Defined in |
| --- | --- | --- |
| RDY, INT, ML, DAT, E2E, STR, DEF | Sprint 0–6 backlog items | `SCRUM_INTEGRATION_PLAN.md` |
| UI, DEMO, LIF, UAT | Sprint 7 (post-plan scope) items | `SCRUM_INTEGRATION_PLAN.md` §Sprint 7 |
| TC-nn | Section 12 test case | `UNIT_TEST_PLAN.md` (the Section 12 plan), results in `SECTION12_TEST_RESULTS.md` |
| Defect DEF-nn | Section 12.3 defect. **Not the same as** Sprint 6 item DEF-nn; this catalog always writes "Defect DEF-nn" for these | `SECTION12_TEST_RESULTS.md` §12.3 |
| UAT-A … D | Section 12.4 acceptance scenario | `SECTION12_TEST_RESULTS.md` §12.4 |
| CAP-nn | Step of the full rehearsal | `data-pipeline/scripts/run_capstone_proofs.sh` |
| R12-nn | Step of the Section 12 runner | `data-pipeline/scripts/run_section12_plan.sh` |
| IT-nnn | One check printed as `[OK]` by an integration script | `data-pipeline/scripts/test_*.js` (numbered here) |
| UT-nnn | One top-level unit or component test (↳ subtests listed under it) | `UNIT_TEST_REPORT.md`; IDs are permanent |
| S1–S15, D1–D11 | Manual scenario, live-demo case | `MANUAL_TEST_SCENARIOS.md` |

---

## 3. Scrum plan items and their tests

Status as of 2026-10-14. Columns: integration script(s) in `data-pipeline/scripts/`, unit/component IDs (§11), Section 12 cases (§4), rehearsal steps (§7) and manual scenarios (§9).

### Sprint 0 — Integration Readiness Gate
| ID | Item | Verified by | Status |
| --- | --- | --- | --- |
| RDY-01 | Enumerate the placeholder functions | `PLACEHOLDER_ENUMERATION.md`; UT-084..UT-087 | DONE |
| RDY-02 | ADR-001 production seed baseline | `ADR-001_production_seed_baseline.md`; DAT-01..06 | DONE |
| RDY-03 | F1 disposition memo | `F1_DISPOSITION_MEMO.md`; ML-01 | DONE |
| RDY-04 | Age-out rule location | `AGE_OUT_RULE_STATUS.md`; E2E-03 | DONE |
| RDY-05 | Board, backlog, evidence tree | `backlog.md`, `evidence/` | DONE |

### Sprint 1 — Backend Integration Seams
| ID | Item | Integration script | Unit / component | Section 12 | Rehearsal / manual | Status |
| --- | --- | --- | --- | --- | --- | --- |
| INT-01 | ML client 6-feature vector | `test_int01_ml_contract.js` | UT-054..UT-061 | TC-03 | CAP-05 | DONE |
| INT-02 | Mount `POST /tasks/:id/submit` | `test_int02_submission.js` | UT-011..UT-019, UT-043..UT-053, UT-103 | TC-08, TC-09, TC-10 | CAP-07; S5 | DONE |
| INT-03 | Mount `POST /appeals/docket` | `test_int03_appeals_docket.js` | UT-029..UT-033, UT-099 | TC-11, TC-12 | CAP-08; S8 | DONE |
| INT-04 | Mount `POST /calamity/toggle` | `test_int04_calamity_toggle.js` | UT-034..UT-039, UT-100 | TC-16 | CAP-09; S9 | DONE |
| INT-05 | Discrepancy scoring in live assessment | `test_int05_risk_assessment.js` | UT-020..UT-023, UT-102 | TC-04 | CAP-06; S7 | DONE |
| INT-06 | Audit blocks on submission and transitions | every script ends with `verify-chain` | UT-001..UT-010, UT-097..UT-098 | TC-13 | all CAP steps | DONE |
| INT-07 | Regression matrix (duplicate, altered bytes, geofence, role, expired JWT) | `test_int02_submission.js`, `test_section12_plan.js` | UT-047..UT-053, UT-062..UT-082 | TC-02, TC-06, TC-08, TC-09 | S11 | DONE |
| INT-08 | Sync button and appeals dialog live | `test_int08_appeals_ui.js`, `test_str02_airplane_sync.js` | UT-106..UT-167 | TC-12 | CAP-10; S6, S8 | DONE |

### Sprint 2 — ML Empirical Grounding
| ID | Item | Verified by | Status |
| --- | --- | --- | --- |
| ML-01 | Reconcile 0.7726 / 0.7781 | `evidence/sprint-2/SPRINT2_EVIDENCE.md` (0.7771) | DONE |
| ML-02 | E1–E3 on the empirical holdout | `sprint2_results.md`; UT-185..UT-189 | DONE |
| ML-03 | E4–E5 against the best of E1–E3 | `sprint2_results.md` | DONE |
| ML-04 | Leakage audit | `audit_leakage.py` 6/6 on v2 (§12) | DONE |
| ML-05 | Contract, latency, SHAP, fallback on v2 | CAP-05, CAP-06, CAP-13; UT-174..UT-178; TC-03 | DONE |
| ML-06 | v2 artifact and provenance, served | `ml-service/artifacts/v2/`; `docker-compose.yml` | DONE |
| ML-07 | Documentation and threshold disposition | memo, deck; 0.85 not met (disclosed) | DONE |

### Sprint 3 — Production Data Baseline
| ID | Item | Verified by | Status |
| --- | --- | --- | --- |
| DAT-01 | Seed overwrite to the 80k baseline | `test_dat01_seed_conformance.js` (CAP-18); UT-190..UT-198 | DONE |
| DAT-02 | Ingest with measured time | `seed-ingest` log | DONE |
| DAT-03 | Index verification at volume | `verify_compound_index.py` (R12-11); TC-17 | DONE |
| DAT-04 | Integrity audit, 1:1 invariant | `audit_integrity.py` | DONE |
| DAT-05 | Reset within 10 s at the baseline | `test_dat05_reset_baseline.sh` (5.6–7.1 s) | DONE |
| DAT-06 | Docs updated to measured values | turnover, ADR-001 | DONE |

### Sprint 4 — End-to-End and Safeguards
| ID | Item | Integration script | Unit / component | Section 12 | Rehearsal / manual | Status |
| --- | --- | --- | --- | --- | --- | --- |
| E2E-01 | Full container chain | `test_e2e01_full_chain.js` | UT-104 | TC-04, TC-05 | CAP-01; D1–D3 | DONE |
| E2E-02 | Calamity freeze and release | `test_e2e02_calamity_freeze.js` | UT-101 | TC-16 | CAP-11; S9, D8 | DONE |
| E2E-03 | Age-out rule (RA 11310) | `test_e2e03_age_out.js` | UT-024..UT-028 | — | CAP-12 | DONE |
| E2E-04 | Live SHAP in the triage drawer | `test_e2e04_shap_drawer.js`, `test_e2e04_drawer_ui.js` | UT-174..UT-178 | TC-03 | CAP-13, CAP-14; S3 | DONE |
| E2E-05 | Standup cadence evidence | `evidence/sprint-4/E2E05_CADENCE_LOG.md` | — | — | — | DONE (team notes pending) |

### Sprint 5 — Adversarial Stress
| ID | Item | Integration script | Unit / component | Section 12 | Rehearsal / manual | Status |
| --- | --- | --- | --- | --- | --- | --- |
| STR-01 | Tamper block 3 detected | `test_str01_tamper_detection.js` | UT-006..UT-010 | TC-14 | CAP-04; S10, D9 | DONE |
| STR-02 | Airplane-mode zero-loss sync | `test_str02_airplane_sync.js` | UT-168..UT-173 | TC-07, TC-10 | CAP-02; S6, D5 | DONE |
| STR-03 | Concurrency at volume | `test_str03_concurrency.js` | UT-098 (concurrency subtests) | TC-06 | CAP-19 | DONE |
| STR-04 | Evidence capture | `docs/integration/evidence/` | — | — | — | DONE |

### Sprint 6 — Defense Packaging
| ID | Item | Verified by | Status |
| --- | --- | --- | --- |
| DEF-01 | Script the four capstone proofs | CAP-01..CAP-04 (`test_proof3_sangla_atm.js` = TC-15) | DONE |
| DEF-02 | Full rehearsal with reset between runs | CAP-01..CAP-19, 19/19 | DONE |
| DEF-03 | Clean-clone verification | `docker compose up` on a fresh clone; UT-105 | DONE |
| DEF-04 | Slide deck with limitations | deck; live-demo cases D1–D11 | DONE |
| DEF-05 | Documentation closure | `CHANGELOG_TRACEABILITY.md`, this catalog | DONE |

### Sprint 7 — Lifecycle Completion and Live UI (post-plan scope)
| ID | Item | Integration script | Unit / component | Section 12 | Rehearsal / manual | Status |
| --- | --- | --- | --- | --- | --- | --- |
| UI-01 | Live-data read routes and screens (DECISION-010) | `test_ui_live_data.js` | UT-200, UT-203..UT-206 | TC-18 | CAP-15; S2, D1 | DONE |
| UI-02 | Phone, tablet, desktop layouts | `test_ui_live_data.js` | — | TC-19 | CAP-15; S12 | DONE |
| UI-03 | Final look, street map, all households in scope | `test_ui_live_data.js` | UT-200 | TC-18 | CAP-15; S2 | DONE |
| DEMO-01 | Populated demo dataset | `load_demo_data.sh` + `test_ui_live_data.js` (80k) | — | TC-18 | §0 of the manual | DONE |
| LIF-01 | Report review and hash-checked evidence (DECISION-011) | `test_decision011_notice_flow.js` | UT-201, UT-207 | TC-20 | CAP-16; S13, D6, D9 | DONE |
| LIF-02 | Notice issuance | `test_decision011_notice_flow.js` | UT-201, UT-207 | TC-11 | CAP-16; S13, D6 | DONE |
| LIF-03 | Final graduation after the window | `test_decision011_notice_flow.js` | UT-201, UT-207 | TC-21 | CAP-16; S13, D7 | DONE |
| LIF-04 | Retention after a field visit (DECISION-012) | `test_decision012_retention_flow.js` | UT-199, UT-202, UT-208 | TC-22 | CAP-17; S14, D11 | DONE |
| LIF-05 | Appeal hearing outcome | `test_decision012_retention_flow.js` | UT-199, UT-202, UT-208 | TC-23 | CAP-17; S15, D7 | DONE |
| LIF-06 | 180-day re-flag cooldown | `test_decision012_retention_flow.js` | UT-202 | TC-24 | CAP-17; S14 | DONE |
| UAT-01 | UAT instrument | — | UT-209..UT-212 | 12.4 | `docs/testing/uat/` | DONE (sessions pending) |

---

## 4. Section 12 test cases TC-01 to TC-24

Full expected / actual text: `docs/integration/UNIT_TEST_PLAN.md` §12.2 and `docs/testing/SECTION12_TEST_RESULTS.md`.

| ID | Feature | Proved by | Plan item | Result |
| --- | --- | --- | --- | :---: |
| TC-01 | User authentication and role scoping | `test_section12_plan.js`; UT-062..UT-082 | INT-07 | **PASS** |
| TC-02 | Invalid credentials and token expiry | `test_section12_plan.js`; UT-072..UT-082 | INT-07 | **PASS** |
| TC-03 | Proxy-means SWDI classification (top 3 SHAP) | `test_section12_plan.js`, `test_int01_ml_contract.js`; UT-174..UT-178 | INT-01, ML-05 | **PASS** |
| TC-04 | Multi-factor discrepancy flagging (score 100 for Case A) | `test_section12_plan.js`, `test_int05_risk_assessment.js`; UT-020..UT-023 | INT-05 | **PASS** |
| TC-05 | Atomic task dispatch transaction | `test_section12_plan.js`; UT-098 | E2E-01 | **PASS** |
| TC-06 | Duplicate dispatch prevention | `test_section12_plan.js`, `test_str03_concurrency.js` | INT-07, STR-03 | **PASS** |
| TC-07 | Offline task caching (IndexedDB) | `test_str02_airplane_sync.js` | STR-02 | **PASS** |
| TC-08 | Geofence boundary (422 beyond 250 m) | `test_section12_plan.js`; UT-016..UT-019 | INT-02 | **PASS** |
| TC-09 | In-browser photo hashing, altered bytes → 422 | `test_section12_plan.js`; UT-011..UT-015 | INT-02 | **PASS** |
| TC-10 | Offline batch sync on reconnect | `test_str02_airplane_sync.js`, `test_section12_plan.js` | STR-02 | **PASS** |
| TC-11 | Notice issuance and 15-day countdown | `test_decision011_notice_flow.js`, `test_int03_appeals_docket.js`, `test_int08_appeals_ui.js` | LIF-02, INT-03 | **PASS** |
| TC-12 | Filing an appeal docket | `test_int03_appeals_docket.js`, `test_int08_appeals_ui.js`; UT-099 | INT-03, INT-08 | **PASS** |
| TC-13 | Chain verification | `test_section12_plan.js`, `test_str01_tamper_detection.js`; UT-006..UT-010 | INT-06 | **PASS** |
| TC-14 | Database tamper detection (block 3) | `test_str01_tamper_detection.js` | STR-01 | **PASS** |
| TC-15 | Sangla-ATM detection (85.0) | `test_section12_plan.js`, `test_proof3_sangla_atm.js`; UT-179..UT-184 | DEF-01 | **PASS** |
| TC-16 | Calamity moratorium freeze | `test_int04_calamity_toggle.js`, `test_e2e02_calamity_freeze.js`; UT-100, UT-101 | INT-04, E2E-02 | **PASS** |
| TC-17 | Compound index at 80k (IXSCAN, no COLLSCAN) | `verify_compound_index.py` | DAT-03 | **PASS** |
| TC-18 | Live dashboard and map data | `test_ui_live_data.js`; UT-200 | UI-01, UI-03 | **PASS** |
| TC-19 | Responsive layout at 390 / 834 / 1440 px | `test_ui_live_data.js` | UI-02 | **PASS** |
| TC-20 | Report review and evidence integrity (409 on altered file) | `test_decision011_notice_flow.js`; UT-201 | LIF-01 | **PASS** |
| TC-21 | Final graduation only after the window | `test_decision011_notice_flow.js`; UT-201 | LIF-03 | **PASS** |
| TC-22 | Retention after a field visit | `test_decision012_retention_flow.js`; UT-202 | LIF-04 | **PASS** |
| TC-23 | Appeal hearing outcome (granted / denied) | `test_decision012_retention_flow.js`; UT-202 | LIF-05 | **PASS** |
| TC-24 | 180-day re-flag cooldown | `test_decision012_retention_flow.js`; UT-202 | LIF-06 | **PASS** |

## 5. Section 12 defects

Re-checked by `test_section12_defects.js` (20 checks) in R12-15.

| ID | Defect | Corrective action | Result |
| --- | --- | --- | :---: |
| Defect DEF-01 | Transactions failed on a standalone MongoDB | DECISION-006: replica set `rs0`, automated `rs.initiate()` | **RESOLVED** |
| Defect DEF-02 | `Unauthorized` on audit index inspection | DECISION-005/006: `createIndex`/`listIndexes` on `audit_logs`, no update/delete (UT-105 checks it on a fresh container) | **RESOLVED** |
| Defect DEF-03 | `_id` injected into sub-documents | DECISION-001: `{ _id: false, strict: true }` sub-schemas | **RESOLVED** |
| Defect DEF-04 | Host port collision on 27017 | DECISION-004: `${MONGO_EXTERNAL_PORT:-27017}` | **RESOLVED** |
| Defect DEF-05 | ML feature contract mismatch (422) | Server Joi schema aligned to the 6 features | **RESOLVED** |
| Defect DEF-06 | Dispatch metadata discarded | DECISION-002/003: `priority`, `due_date`, `assignment_notes` | **RESOLVED** |
| Defect DEF-07 | No general configuration audit action | DECISION-002/003: `SYSTEM_CONFIG_UPDATED` | **RESOLVED** |

## 6. User acceptance testing

| ID | Scenario | Scripted evidence (R12 steps) | Capability | Participant rating |
| --- | --- | --- | :---: | :---: |
| UAT-A | Administrative triage and dispatch (Regional Director) | `test_e2e01_full_chain.js`, `test_e2e04_drawer_ui.js` | **MET** | pending |
| UAT-B | Offline fieldwork and verification (Municipal Link) | `test_str02_airplane_sync.js`, `test_section12_plan.js` | **MET** | pending |
| UAT-C | Statutory due process (notice, appeal, hearing outcome, retention) | `test_int08_appeals_ui.js`, `test_decision011_notice_flow.js`, `test_decision012_retention_flow.js` | **MET** | pending |
| UAT-D | Forensic audit and ledger integrity (COA Auditor) | `test_str01_tamper_detection.js` | **MET** | pending |

Ratings come only from real sessions: `docs/testing/uat/UAT_RATING_FORM.md` → `uat_responses.csv` → `score_uat.py` (pass: mean SUS ≥ 68 and ≥ 80 % completion). The scorer's own tests are UT-209..UT-212.

## 7. Full rehearsal steps

`bash data-pipeline/scripts/run_capstone_proofs.sh --full` on the Docker stack, with a clean reset before every step. Latest run: <!-- CAP RESULT -->19/19 PASS (`docs/integration/evidence/capstone-final/SUMMARY.md`).

| ID | Scenario | Script | Plan item |
| --- | --- | --- | --- |
| CAP-01 | Proof 1: graduation drift (assess → triage → dispatch → report → audit, via gateway) | `test_e2e01_full_chain.js` | E2E-01, DEF-01 |
| CAP-02 | Proof 2: offline field visit (airplane mode, zero-loss sync) | `test_str02_airplane_sync.js` | STR-02, DEF-01 |
| CAP-03 | Proof 3: Sangla-ATM syndicate (85/100) | `test_proof3_sangla_atm.js` | DEF-01 |
| CAP-04 | Proof 4: audit proof (tamper block 3 detected) | `test_str01_tamper_detection.js` | STR-01, DEF-01 |
| CAP-05 | ML contract v1.1 | `test_int01_ml_contract.js` | INT-01, ML-05 |
| CAP-06 | Risk assessment | `test_int05_risk_assessment.js` | INT-05 |
| CAP-07 | Field submission | `test_int02_submission.js` | INT-02 |
| CAP-08 | Appeals docket | `test_int03_appeals_docket.js` | INT-03 |
| CAP-09 | Calamity toggle | `test_int04_calamity_toggle.js` | INT-04 |
| CAP-10 | Due-process docket (API + browser) | `test_int08_appeals_ui.js` | INT-08 |
| CAP-11 | Calamity freeze | `test_e2e02_calamity_freeze.js` | E2E-02 |
| CAP-12 | Age-out (RA 11310) | `test_e2e03_age_out.js` | E2E-03 |
| CAP-13 | SHAP drawer (API) | `test_e2e04_shap_drawer.js` | E2E-04 |
| CAP-14 | SHAP drawer (browser) | `test_e2e04_drawer_ui.js` | E2E-04 |
| CAP-15 | UI live data, phone / tablet / desktop | `test_ui_live_data.js` | UI-01..UI-03 |
| CAP-16 | Notice issuance, evidence integrity, graduation | `test_decision011_notice_flow.js` | LIF-01..LIF-03 |
| CAP-17 | Retention, appeal granted and denied, cooldown | `test_decision012_retention_flow.js` | LIF-04..LIF-06 |
| CAP-18 | Seed conformance (80k) | `test_dat01_seed_conformance.js` | DAT-01 |
| CAP-19 | Concurrency at volume | `test_str03_concurrency.js` | STR-03 |

## 8. Section 12 runner steps

`bash data-pipeline/scripts/run_section12_plan.sh` on the Docker stack. Latest run: <!-- R12 RESULT -->17/17 PASS (`docs/testing/evidence/section12-final/SUMMARY.md`).

| ID | Covers | Step |
| --- | --- | --- |
| R12-01 | Unit tier | server `npm test` |
| R12-02 | Unit tier | client `npm test`, build, `test:pwa` |
| R12-03 | Unit tier | ML and UAT-scorer pytest |
| R12-04 | TC-01..06, 08, 09, 10, 13, 15 | `test_section12_plan.js` |
| R12-05 | TC-07, TC-10 | `test_str02_airplane_sync.js` (browser offline) |
| R12-06 | TC-11, TC-12 | `test_int03_appeals_docket.js` |
| R12-07 | TC-11, TC-12 | `test_int08_appeals_ui.js` (browser) |
| R12-08 | TC-14 | `test_str01_tamper_detection.js` |
| R12-09 | TC-16 | `test_int04_calamity_toggle.js` |
| R12-10 | TC-16 | `test_e2e02_calamity_freeze.js` |
| R12-11 | TC-17 | `verify_compound_index.py` (80k) |
| R12-12 | TC-18, TC-19 | `test_ui_live_data.js` (browser, 3 widths) |
| R12-13 | TC-11, TC-20, TC-21 | `test_decision011_notice_flow.js` (browser) |
| R12-14 | TC-22, TC-23, TC-24 | `test_decision012_retention_flow.js` (browser) |
| R12-15 | Defect DEF-01..07 | `test_section12_defects.js` |
| R12-16 | UAT-A | `test_e2e01_full_chain.js` |
| R12-17 | UAT-A | `test_e2e04_drawer_ui.js` (browser) |

## 9. Manual scenarios and live-demo cases

Run by a person from `docs/testing/MANUAL_TEST_SCENARIOS.md`; record the result in its table. The automated equivalent is listed so a failure can be compared with a script.

| ID | Scenario | Proves | Automated equivalent |
| --- | --- | --- | --- |
| S1 | Sign-in and role routing | RBAC and safe login | TC-01, TC-02 |
| S2 | The dashboard reflects the data (Director) | dashboard computed from the database | TC-18 |
| S3 | Triage queue and model explanation | triage feed, COA read-only rule | CAP-13, CAP-14 |
| S4 | Dispatch with the caseworker picker | dispatch flow, jurisdiction guard, ledger receipt | TC-05, TC-06 |
| S5 | Field visit with geotagged evidence | geofence, SHA-256 photo check, audit trail | TC-08, TC-09 |
| S6 | Offline visit (airplane mode) | offline-first PWA | TC-07, TC-10 |
| S7 | Case A: the model catches graduation drift | ML v2, explainability, audit seal | TC-03, TC-04 |
| S8 | Due process and appeal | RA 11310 §12 due process | TC-11, TC-12 |
| S9 | Calamity moratorium (RA 10121) | freeze and release; Super Admin only | TC-16 |
| S10 | Audit chain verification and tamper detection | SHA-256 hash chain | TC-13, TC-14 |
| S11 | Security guards hold | 403 / 400 / 401 on every guard | TC-01, TC-02; UT-062..UT-082 |
| S12 | Phone, tablet and desktop | layouts without sideways scroll | TC-19 |
| S13 | Review a report, issue the notice, graduate | notice, timer, tamper-evident evidence | TC-11, TC-20, TC-21 |
| S14 | Keep a household on the program | retention, cooldown, new ledger action | TC-22, TC-24 |
| S15 | Record an appeal hearing outcome | appeal ends in a sealed decision | TC-23 |

| ID | Live-demo case | Scenarios | Pass when |
| --- | --- | --- | --- |
| D1 | Director's dashboard and map are populated | S1, S2 | 80,007 households, 627 flagged, map shading + bubbles |
| D2 | Assess Case A live; flagged with its SHAP explanation | S7 | Level 3, score ≥ 70, sealed block number |
| D3 | Dispatch Case A to Test Case Worker | S4 | task ID and ledger receipt |
| D4 | Caseworker visit at phone width, inside then outside the geofence | S5, S12 | accepted in Calamba, refused in Manila |
| D5 | Offline visit syncs on reconnect | S6 | pending 1 → 0, nothing duplicated |
| D6 | Director reviews the report and photo, issues the notice | S13 | "Hash verified", 15-day window starts |
| D7 | Early graduation refused; appeal; hearing outcome recorded | S13, S8, S15 | `APPEAL_WINDOW_OPEN`; APPEAL FILED; granted → active |
| D8 | Calamity moratorium freezes dispatch | S9 | banner, dispatch refused, director cannot declare |
| D9 | Ledger and photo tampering are caught | S10, S13 | chain broken at the edited block; photo refused |
| D10 | Guards hold | S11 | 403 / 400 / 401 as listed |
| D11 | A family that is still poor is kept on the program | S14 | "Keep on the program"; BENEFICIARY RETAINED; re-flag refused |

---

## 10. Integration-script checks

Every `[OK]` line printed by the integration scripts in the latest Docker runs (Section 12 runner and full rehearsal), numbered in script order. <!-- IT COUNT -->415 checks in total.

<!-- BEGIN INTEGRATION CHECKS -->
#### `test_dat01_seed_conformance` (24 checks, log `docs/integration/evidence/capstone-final/18-test_dat01_seed_conformance.log`)

| ID | Check | Result |
| --- | --- | :---: |
| IT-001 | 80,000 SYN beneficiaries | **PASS** |
| IT-002 | 80,000 SYN external records | **PASS** |
| IT-003 | zero orphan external records | **PASS** |
| IT-004 | beneficiaries valid (80,000 checked) | **PASS** |
| IT-005 | external records valid (80,000 checked) | **PASS** |
| IT-006 | all SYN households inside director_test jurisdiction scope | **PASS** |
| IT-007 | every household has a valid ml-swdi-inference v1.1 vector | **PASS** |
| IT-008 | no beneficiary stores true_swdi_level | **PASS** |
| IT-009 | no beneficiary stores names | **PASS** |
| IT-010 | no beneficiary stores landbank_card_pan | **PASS** |
| IT-011 | no beneficiary stores gps_coordinates | **PASS** |
| IT-012 | no beneficiary stores school_attendance | **PASS** |
| IT-013 | no external record stores raw power | **PASS** |
| IT-014 | no external record stores raw water | **PASS** |
| IT-015 | no external record stores raw telecom | **PASS** |
| IT-016 | no external record stores raw vehicle | **PASS** |
| IT-017 | no external record stores raw household_id | **PASS** |
| IT-018 | all LandBank PANs masked | **PASS** |
| IT-019 | users: declared indexes present | **PASS** |
| IT-020 | beneficiaries: declared indexes present | **PASS** |
| IT-021 | external_records: declared indexes present | **PASS** |
| IT-022 | verification_tasks: declared indexes present | **PASS** |
| IT-023 | audit_logs: declared indexes present | **PASS** |
| IT-024 | system_configs: declared indexes present | **PASS** |

#### `test_decision011_notice_flow` (17 checks, log `docs/integration/evidence/capstone-final/16-test_decision011_notice_flow.log`)

| ID | Check | Result |
| --- | --- | :---: |
| IT-025 | Case A flagged by the model | **PASS** |
| IT-026 | dispatched | **PASS** |
| IT-027 | field report accepted (SUBMITTED) | **PASS** |
| IT-028 | report: submitted, supports graduation, lists the photo | **PASS** |
| IT-029 | evidence: original bytes with verified hash header | **PASS** |
| IT-030 | COA can view the photo; caseworker cannot | **PASS** |
| IT-031 | a photo altered on disk is refused (409 EVIDENCE_INTEGRITY_FAILED) | **PASS** |
| IT-032 | restored photo is served again | **PASS** |
| IT-033 | photo shown in the report (hash verified) | **PASS** |
| IT-034 | notice issued from the UI with a ledger receipt | **PASS** |
| IT-035 | task VERIFIED_GRADUATE, household under notice | **PASS** |
| IT-036 | household appears on the due-process docket with a 15-day window | **PASS** |
| IT-037 | graduation refused while the window is open (409 APPEAL_WINDOW_OPEN) | **PASS** |
| IT-038 | graduation completed from the UI | **PASS** |
| IT-039 | household is GRADUATED | **PASS** |
| IT-040 | last two ledger blocks are BENEFICIARY_GRADUATED (notice, then graduation) | **PASS** |
| IT-041 | whole ledger verifies (1-5) | **PASS** |

#### `test_decision012_retention_flow` (21 checks, log `docs/integration/evidence/capstone-final/17-test_decision012_retention_flow.log`)

| ID | Check | Result |
| --- | --- | :---: |
| IT-042 | Case A flagged by the model | **PASS** |
| IT-043 | dispatched | **PASS** |
| IT-044 | field report accepted (SUBMITTED) | **PASS** |
| IT-045 | report supports retention, not graduation | **PASS** |
| IT-046 | COA auditor cannot retain (403) | **PASS** |
| IT-047 | only "Keep on the program" is offered for this report | **PASS** |
| IT-048 | retention recorded from the UI with a ledger receipt | **PASS** |
| IT-049 | task VERIFIED_RETAIN, household ACTIVE_COMPLIANT, decision RETAINED_ON_ROSTER | **PASS** |
| IT-050 | the model cannot re-flag it during the cooldown (409 RETENTION_COOLDOWN) | **PASS** |
| IT-051 | appeal filed with today as the hearing date | **PASS** |
| IT-052 | granted outcome recorded from the UI | **PASS** |
| IT-053 | the household left the due-process docket | **PASS** |
| IT-054 | household is ACTIVE_COMPLIANT again | **PASS** |
| IT-055 | notice issued for TEST-4PS-0003 | **PASS** |
| IT-056 | appeal filed with today as the hearing date | **PASS** |
| IT-057 | COA auditor cannot record an outcome (403) | **PASS** |
| IT-058 | unknown docket reference (404 APPEAL_NOT_FOUND) | **PASS** |
| IT-059 | denied: household GRADUATED, no cooldown | **PASS** |
| IT-060 | the same appeal cannot be decided twice (409 WORKFLOW_CONFLICT) | **PASS** |
| IT-061 | ledger: retention and granted appeal sealed as BENEFICIARY_RETAINED, denial as BENEFICIARY_GRADUATED | **PASS** |
| IT-062 | whole ledger verifies (1-9) | **PASS** |

#### `test_e2e01_full_chain` (19 checks, log `docs/integration/evidence/capstone-final/01-test_e2e01_full_chain.log`)

| ID | Check | Result |
| --- | --- | :---: |
| IT-063 | login director_test (200) | **PASS** |
| IT-064 | login case_worker_test (200) | **PASS** |
| IT-065 | login auditor_test (200) | **PASS** |
| IT-066 | POST /beneficiaries/:id/assess (200) | **PASS** |
| IT-067 | model prediction (not fallback) | **PASS** |
| IT-068 | SHAP explanation returned | **PASS** |
| IT-069 | risk score >= 70 and flagged | **PASS** |
| IT-070 | status FLAGGED_FOR_REVIEW | **PASS** |
| IT-071 | GET /beneficiaries/triage-queue (200) | **PASS** |
| IT-072 | Case A listed with persisted score, level and badges | **PASS** |
| IT-073 | POST /tasks/dispatch (201) | **PASS** |
| IT-074 | household UNDER_INVESTIGATION | **PASS** |
| IT-075 | GET /tasks/assigned (worker) (200) | **PASS** |
| IT-076 | task visible to the assigned worker | **PASS** |
| IT-077 | POST /tasks/:id/submit (200) | **PASS** |
| IT-078 | SUBMITTED within geofence | **PASS** |
| IT-079 | MODEL_FLAG_RAISED < TASK_DISPATCHED < REPORT_SUBMITTED (1 < 2 < 3) | **PASS** |
| IT-080 | GET /audit/verify-chain (auditor) (200) | **PASS** |
| IT-081 | chain valid; head = REPORT_SUBMITTED block | **PASS** |

#### `test_e2e02_calamity_freeze` (10 checks, log `docs/integration/evidence/capstone-final/11-test_e2e02_calamity_freeze.log`)

| ID | Check | Result |
| --- | --- | :---: |
| IT-082 | 201 hold_active | **PASS** |
| IT-083 | Dispatch in zone -> 409 CALAMITY_MORATORIUM_ACTIVE | **PASS** |
| IT-084 | no task created | **PASS** |
| IT-085 | Assessment in zone -> 409 CALAMITY_MORATORIUM_ACTIVE | **PASS** |
| IT-086 | dispatch resumes after expiry (201) | **PASS** |
| IT-087 | task visible to the worker | **PASS** |
| IT-088 | 201 open-ended hold | **PASS** |
| IT-089 | Assessment frozen -> 409 CALAMITY_MORATORIUM_ACTIVE | **PASS** |
| IT-090 | lift 200 | **PASS** |
| IT-091 | assessment resumes after lift (200) | **PASS** |

#### `test_e2e03_age_out` (13 checks, log `docs/integration/evidence/capstone-final/12-test_e2e03_age_out.log`)

| ID | Check | Result |
| --- | --- | :---: |
| IT-092 | 200 OK | **PASS** |
| IT-093 | children_eligibility {total 3, eligible 1, aged_out 2} | **PASS** |
| IT-094 | CHILD_AGE_OUT badge | **PASS** |
| IT-095 | age-out does not change the published risk weights | **PASS** |
| IT-096 | flagged -> FLAGGED_FOR_REVIEW | **PASS** |
| IT-097 | stored is_eligible corrected to [false, false, true] | **PASS** |
| IT-098 | stored birthdates are Dates | **PASS** |
| IT-099 | correction sealed in MODEL_FLAG_RAISED delta | **PASS** |
| IT-100 | verify-chain valid | **PASS** |
| IT-101 | 200 with eligible 0 of 2 | **PASS** |
| IT-102 | reason: no eligible children (RA 11310 Sec. 6) | **PASS** |
| IT-103 | not persisted (no receipt, still ACTIVE_COMPLIANT) | **PASS** |
| IT-104 | Case A: 2 eligible, no CHILD_AGE_OUT | **PASS** |

#### `test_e2e04_drawer_ui` (4 checks, log `docs/integration/evidence/capstone-final/14-test_e2e04_drawer_ui.log`)

| ID | Check | Result |
| --- | --- | :---: |
| IT-105 | Case A assessed or already flagged | **PASS** |
| IT-106 | drawer renders 3 SHAP attributions | **PASS** |
| IT-107 | rendered SHAP weights === ML response payload | **PASS** |
| IT-108 | drawer cites the sealed audit block | **PASS** |

#### `test_e2e04_shap_drawer` (14 checks, log `docs/integration/evidence/capstone-final/13-test_e2e04_shap_drawer.log`)

| ID | Check | Result |
| --- | --- | :---: |
| IT-109 | No sealed assessment yet -> 404 ASSESSMENT_NOT_FOUND | **PASS** |
| IT-110 | assessment 200 (ML_MODEL) | **PASS** |
| IT-111 | 200 OK | **PASS** |
| IT-112 | response keys match contract | **PASS** |
| IT-113 | drawer SHAP === assessment SHAP | **PASS** |
| IT-114 | drawer probabilities === assessment probabilities | **PASS** |
| IT-115 | receipt is the MODEL_FLAG_RAISED block | **PASS** |
| IT-116 | COA auditor can read the explanation (read-only role) | **PASS** |
| IT-117 | ML 200 | **PASS** |
| IT-118 | drawer SHAP matches the ML response payload (indicator, weight) | **PASS** |
| IT-119 | predicted level matches | **PASS** |
| IT-120 | CASE_WORKER -> 403 FORBIDDEN | **PASS** |
| IT-121 | Unknown household -> 404 HOUSEHOLD_NOT_FOUND | **PASS** |
| IT-122 | Query parameters rejected -> 400 INVALID_QUERY | **PASS** |

#### `test_int01_ml_contract` (14 checks, log `docs/integration/evidence/capstone-final/05-test_int01_ml_contract.log`)

| ID | Check | Result |
| --- | --- | :---: |
| IT-123 | 200 OK | **PASS** |
| IT-124 | household_id echoed | **PASS** |
| IT-125 | predicted_swdi_level in {1,2,3} | **PASS** |
| IT-126 | class_probabilities keys match contract | **PASS** |
| IT-127 | probabilities sum to 1 (+/-0.01) | **PASS** |
| IT-128 | SHAP top-3 attributions with indicator/weight/description | **PASS** |
| IT-129 | evaluated_at is ISO-8601 with zone | **PASS** |
| IT-130 | v1.0 legacy vector -> 422 INVALID_FEATURE_VECTOR | **PASS** |
| IT-131 | head_education_level out of bounds (4) -> 422 INVALID_FEATURE_VECTOR | **PASS** |
| IT-132 | missing household_size -> 422 INVALID_FEATURE_VECTOR | **PASS** |
| IT-133 | mlClient validates the live response | **PASS** |
| IT-134 | mlClient rejects legacy vector before network | **PASS** |
| IT-135 | ML down -> ML_UNAVAILABLE (fallback trigger, no crash) | **PASS** |
| IT-136 | p95 16.0 ms < 50 ms | **PASS** |

#### `test_int02_submission` (7 checks, log `docs/integration/evidence/capstone-final/07-test_int02_submission.log`)

| ID | Check | Result |
| --- | --- | :---: |
| IT-137 | Worker ID extracted: 6acf076b1e23c6c56e9df8a5 | **PASS** |
| IT-138 | Case A assessed: score 100, FLAGGED_FOR_REVIEW | **PASS** |
| IT-139 | Task dispatched: TSK-2026-a702f552-a1f9-4b97-acc3-2cae37b13960 | **PASS** |
| IT-140 | Altered photo bytes -> 422 EVIDENCE_HASH_MISMATCH | **PASS** |
| IT-141 | Geofence breach (~333 m) -> 422 GEOFENCE_VIOLATION | **PASS** |
| IT-142 | 200 matches field-task-submission.json | **PASS** |
| IT-143 | Duplicate submission -> 409 TASK_NOT_SUBMITTABLE | **PASS** |

#### `test_int03_appeals_docket` (16 checks, log `docs/integration/evidence/capstone-final/08-test_int03_appeals_docket.log`)

| ID | Check | Result |
| --- | --- | :---: |
| IT-144 | No token -> 401 UNAUTHORIZED | **PASS** |
| IT-145 | CASE_WORKER role -> 403 FORBIDDEN | **PASS** |
| IT-146 | COA_AUDITOR mutation -> 403 FORBIDDEN | **PASS** |
| IT-147 | Client-supplied status (frozen enum) -> 400 INVALID_REQUEST | **PASS** |
| IT-148 | Impossible hearing date -> 400 INVALID_REQUEST | **PASS** |
| IT-149 | Malformed JSON -> 400 INVALID_JSON | **PASS** |
| IT-150 | Unknown household -> 404 HOUSEHOLD_NOT_FOUND | **PASS** |
| IT-151 | Household not under notice -> 409 NOTICE_REQUIRED | **PASS** |
| IT-152 | 201 Created | **PASS** |
| IT-153 | docket_status UNDER_APPEAL_HEARING | **PASS** |
| IT-154 | program_status unchanged (NOTICE_OF_INELIGIBILITY) | **PASS** |
| IT-155 | countdown paused | **PASS** |
| IT-156 | 15-day statutory window from stored notice | **PASS** |
| IT-157 | audit receipt returned | **PASS** |
| IT-158 | Second appeal -> 409 APPEAL_ALREADY_FILED | **PASS** |
| IT-159 | chain valid and includes APPEAL_FILED block | **PASS** |

#### `test_int04_calamity_toggle` (16 checks, log `docs/integration/evidence/capstone-final/09-test_int04_calamity_toggle.log`)

| ID | Check | Result |
| --- | --- | :---: |
| IT-160 | No token -> 401 UNAUTHORIZED | **PASS** |
| IT-161 | REGIONAL_DIRECTOR (municipality-wide scope) -> 403 FORBIDDEN | **PASS** |
| IT-162 | CASE_WORKER role -> 403 FORBIDDEN | **PASS** |
| IT-163 | COA_AUDITOR mutation -> 403 FORBIDDEN | **PASS** |
| IT-164 | String boolean -> 400 INVALID_REQUEST | **PASS** |
| IT-165 | Missing NDRRMC reference -> 400 INVALID_REQUEST | **PASS** |
| IT-166 | Expiry in the past -> 400 INVALID_EXPIRY | **PASS** |
| IT-167 | Lift with nothing active -> 409 CALAMITY_NOT_ACTIVE | **PASS** |
| IT-168 | 201 Created | **PASS** |
| IT-169 | hold_active true for matching zone | **PASS** |
| IT-170 | affected households counted | **PASS** |
| IT-171 | zone echoes NDRRMC reference and expiry | **PASS** |
| IT-172 | Duplicate declaration -> 409 CALAMITY_ALREADY_ACTIVE | **PASS** |
| IT-173 | 200 OK | **PASS** |
| IT-174 | hold_active false | **PASS** |
| IT-175 | chain valid through declaration and lift | **PASS** |

#### `test_int05_risk_assessment` (17 checks, log `docs/integration/evidence/capstone-final/06-test_int05_risk_assessment.log`)

| ID | Check | Result |
| --- | --- | :---: |
| IT-176 | No token -> 401 UNAUTHORIZED | **PASS** |
| IT-177 | CASE_WORKER -> 403 FORBIDDEN | **PASS** |
| IT-178 | COA_AUDITOR mutation -> 403 FORBIDDEN | **PASS** |
| IT-179 | Client-supplied score -> 400 INVALID_REQUEST | **PASS** |
| IT-180 | Unknown household -> 404 HOUSEHOLD_NOT_FOUND | **PASS** |
| IT-181 | Already flagged household -> 409 HOUSEHOLD_NOT_ASSESSABLE | **PASS** |
| IT-182 | 200 OK | **PASS** |
| IT-183 | response keys match contract | **PASS** |
| IT-184 | ML_MODEL mode | **PASS** |
| IT-185 | predicted Level 3 vs enrolled Level 1 | **PASS** |
| IT-186 | SHAP top-3 present | **PASS** |
| IT-187 | contributions match contract example | **PASS** |
| IT-188 | score 100, flagged, FLAGGED_FOR_REVIEW | **PASS** |
| IT-189 | MODEL_FLAG_RAISED receipt | **PASS** |
| IT-190 | Case A listed with persisted score and predicted level | **PASS** |
| IT-191 | Re-assessing a flagged household -> 409 HOUSEHOLD_NOT_ASSESSABLE | **PASS** |
| IT-192 | chain valid, head = MODEL_FLAG_RAISED block | **PASS** |

#### `test_int08_appeals_ui` (15 checks, log `docs/integration/evidence/capstone-final/10-test_int08_appeals_ui.log`)

| ID | Check | Result |
| --- | --- | :---: |
| IT-193 | 200 OK | **PASS** |
| IT-194 | item keys match contract | **PASS** |
| IT-195 | fixture household under notice with a 15-day window | **PASS** |
| IT-196 | grants continue during the window (grant_continuation_active) | **PASS** |
| IT-197 | only NOTICE households listed | **PASS** |
| IT-198 | pagination present | **PASS** |
| IT-199 | COA auditor can read | **PASS** |
| IT-200 | CASE_WORKER -> 403 | **PASS** |
| IT-201 | limit 500 -> 400 INVALID_QUERY | **PASS** |
| IT-202 | live household card shown | **PASS** |
| IT-203 | no sample households on the live screen | **PASS** |
| IT-204 | countdown shows days remaining | **PASS** |
| IT-205 | card now shows the appeal hearing and docket | **PASS** |
| IT-206 | file-appeal button removed | **PASS** |
| IT-207 | GET reflects UNDER_APPEAL_HEARING with the same docket | **PASS** |

#### `test_proof3_sangla_atm` (8 checks, log `docs/integration/evidence/capstone-final/03-test_proof3_sangla_atm.log`)

| ID | Check | Result |
| --- | --- | :---: |
| IT-208 | 200 OK | **PASS** |
| IT-209 | anomalous batch scored 85.0/100 | **PASS** |
| IT-210 | window_evaluation keys match contract | **PASS** |
| IT-211 | cluster metrics keys match contract | **PASS** |
| IT-212 | all 12 households in the cluster flagged | **PASS** |
| IT-213 | nocturnal window detected | **PASS** |
| IT-214 | evaluated_at is ISO-8601 with zone | **PASS** |
| IT-215 | 2 transactions -> 400 INSUFFICIENT_TRANSACTION_SAMPLE | **PASS** |

#### `test_section12_defects` (20 checks, log `docs/testing/evidence/section12-final/15-test_section12_defects.log`)

| ID | Check | Result |
| --- | --- | :---: |
| IT-216 | db service starts mongod with --replSet rs0 --bind_ip_all | **PASS** |
| IT-217 | compose runs rs.initiate on first boot | **PASS** |
| IT-218 | live server is primary of replica set rs0 | **PASS** |
| IT-219 | session.withTransaction() commits | **PASS** |
| IT-220 | role grants createIndex and listIndexes on audit_logs | **PASS** |
| IT-221 | role grants no update or remove on audit_logs | **PASS** |
| IT-222 | app_user can find and list audit indexes | **PASS** |
| IT-223 | app_user update and delete on audit_logs -> Unauthorized | **PASS** |
| IT-224 | all 19 nested sub-schemas declare { _id: false, strict: true } | **PASS** |
| IT-225 | a built Beneficiary has no _id in address, demographics or head_of_household | **PASS** |
| IT-226 | compose maps ${MONGO_EXTERNAL_PORT:-27017}:27017 | **PASS** |
| IT-227 | server Joi schema lists exactly the contract's 6 features | **PASS** |
| IT-228 | ML service maps the same 6 features | **PASS** |
| IT-229 | wall_score / roof_score are not part of the vector | **PASS** |
| IT-230 | priority enum LOW/MEDIUM/HIGH/CRITICAL | **PASS** |
| IT-231 | due_date is a required Date | **PASS** |
| IT-232 | assignment_notes aliased as dispatch_instructions | **PASS** |
| IT-233 | strict mode keeps the three fields on save | **PASS** |
| IT-234 | AUDIT_ACTIONS includes SYSTEM_CONFIG_UPDATED | **PASS** |
| IT-235 | CALAMITY_DECLARED remains a separate action | **PASS** |

#### `test_section12_plan` (34 checks, log `docs/testing/evidence/section12-final/04-test_section12_plan.log`)

| ID | Check | Result |
| --- | --- | :---: |
| IT-236 | valid credentials -> 200 with Bearer token | **PASS** |
| IT-237 | token is HS256 with a 900 s lifetime | **PASS** |
| IT-238 | token carries role and jurisdiction | **PASS** |
| IT-239 | out-of-scope municipal query -> 403 OUT_OF_JURISDICTION | **PASS** |
| IT-240 | incorrect password -> 401 INVALID_CREDENTIALS | **PASS** |
| IT-241 | token past its 900 s window -> 401 TOKEN_EXPIRED | **PASS** |
| IT-242 | playwright-core available for the client-session check | **PASS** |
| IT-243 | client cleared the session and returned to the login screen | **PASS** |
| IT-244 | 200 with SWDI tier 1, 2 or 3 | **PASS** |
| IT-245 | three class probabilities summing to 1 | **PASS** |
| IT-246 | signed SHAP attributions returned, ranked by \|weight\| | **PASS** |
| IT-247 | response within 2500 ms | **PASS** |
| IT-248 | is_anomalous_batch true | **PASS** |
| IT-249 | risk score 85.0 / 100 | **PASS** |
| IT-250 | enrolled Level 1, predicted Level 3 | **PASS** |
| IT-251 | composite risk score S_i >= 70 | **PASS** |
| IT-252 | status FLAGGED_FOR_REVIEW | **PASS** |
| IT-253 | household appears in the triage queue with the same score | **PASS** |
| IT-254 | failing dispatch writes nothing (transaction rolled back) | **PASS** |
| IT-255 | 201 Created | **PASS** |
| IT-256 | VerificationTask created PENDING_DISPATCH | **PASS** |
| IT-257 | Beneficiary UNDER_INVESTIGATION | **PASS** |
| IT-258 | TASK_DISPATCHED block hash equals the receipt | **PASS** |
| IT-259 | 409 ACTIVE_TASK_EXISTS | **PASS** |
| IT-260 | no duplicate task and no second audit entry | **PASS** |
| IT-261 | 64-character SHA-256 fingerprint | **PASS** |
| IT-262 | modified bytes -> 422 EVIDENCE_HASH_MISMATCH | **PASS** |
| IT-263 | client hashes photos with the Web Crypto API (crypto.subtle.digest SHA-256) | **PASS** |
| IT-264 | submission 400 m away is not accepted as matched (422 GEOFENCE_VIOLATION) | **PASS** |
| IT-265 | submission ~12.5 m away -> 200, is_matched true | **PASS** |
| IT-266 | task status SUBMITTED | **PASS** |
| IT-267 | photo binary saved to persistent storage and still matches its hash | **PASS** |
| IT-268 | range 1..3 -> 200 is_chain_valid true | **PASS** |
| IT-269 | field worker cannot run the verifier (403) | **PASS** |

#### `test_str01_tamper_detection` (9 checks, log `docs/integration/evidence/capstone-final/04-test_str01_tamper_detection.log`)

| ID | Check | Result |
| --- | --- | :---: |
| IT-270 | baseline chain 1..5 valid | **PASS** |
| IT-271 | is_chain_valid false | **PASS** |
| IT-272 | head_hash = INVALID_HASH_AT_SEQUENCE_3 | **PASS** |
| IT-273 | exactly block 3 reported | **PASS** |
| IT-274 | report names the tampered entity | **PASS** |
| IT-275 | untampered range 1..2 still verifies | **PASS** |
| IT-276 | untampered range 4..5 still verifies (anchored on block 3 recorded hash) | **PASS** |
| IT-277 | drawer refuses tampered explanation (409 AUDIT_ENTRY_INVALID) | **PASS** |
| IT-278 | restored chain verifies again | **PASS** |

#### `test_str02_airplane_sync` (10 checks, log `docs/integration/evidence/capstone-final/02-test_str02_airplane_sync.log`)

| ID | Check | Result |
| --- | --- | :---: |
| IT-279 | browser reports offline | **PASS** |
| IT-280 | exactly 2 queued drafts on the device (edit replaced, not duplicated) | **PASS** |
| IT-281 | queued draft holds the edited narrative | **PASS** |
| IT-282 | nothing reached the server while offline | **PASS** |
| IT-283 | both reports synced automatically (zero loss) | **PASS** |
| IT-284 | server holds the edited report 1 | **PASS** |
| IT-285 | server holds the edited photo hash | **PASS** |
| IT-286 | exactly one REPORT_SUBMITTED block per task | **PASS** |
| IT-287 | original photo bytes verified server-side | **PASS** |
| IT-288 | device marks both drafts SYNCED | **PASS** |

#### `test_str03_concurrency` (10 checks, log `docs/integration/evidence/capstone-final/19-test_str03_concurrency.log`)

| ID | Check | Result |
| --- | --- | :---: |
| IT-289 | production volume present (>= 80,000 ACTIVE_COMPLIANT) | **PASS** |
| IT-290 | all 200, zero 5xx ({"200":60}, 2159 ms) | **PASS** |
| IT-291 | flagged results carry receipts (15 flagged) | **PASS** |
| IT-292 | exactly one 201, the rest 409, zero 5xx ({"201":1,"409":19}) | **PASS** |
| IT-293 | exactly one task for the household in the worker feed | **PASS** |
| IT-294 | exactly one 200, the rest 409, zero 5xx ({"200":1,"409":19}) | **PASS** |
| IT-295 | declarations all 201, zero 5xx ({"201":30}, 4828 ms) | **PASS** |
| IT-296 | lifts all 200, zero 5xx ({"200":30}) | **PASS** |
| IT-297 | chain 1..77 valid and contiguous | **PASS** |
| IT-298 | no extra block beyond successful mutations | **PASS** |

#### `test_ui_live_data` (117 checks, log `docs/integration/evidence/capstone-final/15-test_ui_live_data.log`)

| ID | Check | Result |
| --- | --- | :---: |
| IT-299 | director 200 with no-store | **PASS** |
| IT-300 | keys match admin-insights-overview.json | **PASS** |
| IT-301 | flagged count equals the triage feed (same scope) | **PASS** |
| IT-302 | investigation and notice counts equal the triage feed | **PASS** |
| IT-303 | critical + high = flagged; flagged + below = total | **PASS** |
| IT-304 | director sees only their municipality | **PASS** |
| IT-305 | director gets no ledger statistics | **PASS** |
| IT-306 | COA sees national scope (>= director total) with ledger statistics | **PASS** |
| IT-307 | worker 403 | **PASS** |
| IT-308 | no token 401 | **PASS** |
| IT-309 | any query parameter -> 400 INVALID_QUERY | **PASS** |
| IT-310 | director 200; item keys match contract | **PASS** |
| IT-311 | case_worker_test listed with the director's barangays | **PASS** |
| IT-312 | no credentials in the directory | **PASS** |
| IT-313 | COA 403 | **PASS** |
| IT-314 | dispatch to the picked caseworker -> 201 | **PASS** |
| IT-315 | GET /tasks 200; keys match admin-task-list.json | **PASS** |
| IT-316 | new task listed with the worker name and PENDING_DISPATCH | **PASS** |
| IT-317 | newest dispatch first | **PASS** |
| IT-318 | every task is inside the director scope | **PASS** |
| IT-319 | status filter applies | **PASS** |
| IT-320 | /tasks?status=NOPE -> 400 | **PASS** |
| IT-321 | /tasks?limit=101 -> 400 | **PASS** |
| IT-322 | /tasks?page=0 -> 400 | **PASS** |
| IT-323 | /tasks?household_id=x -> 400 | **PASS** |
| IT-324 | COA and worker 403 on /tasks | **PASS** |
| IT-325 | overview task total includes the new dispatch | **PASS** |
| IT-326 | COA 200; keys match audit-block-list.json | **PASS** |
| IT-327 | newest first and the dispatch block is on top | **PASS** |
| IT-328 | no state deltas exposed | **PASS** |
| IT-329 | director 403 | **PASS** |
| IT-330 | before=0 -> 400 | **PASS** |
| IT-331 | 200; keys match admin-map-density.json | **PASS** |
| IT-332 | cell counts add up to every household in scope | **PASS** |
| IT-333 | no household identities in the map cells | **PASS** |
| IT-334 | worker 403, query 400 | **PASS** |
| IT-335 | 200; keys match admin-policy.json | **PASS** |
| IT-336 | enforced values: threshold 70, geofence 250 m, 15-day appeal window | **PASS** |
| IT-337 | worker 403 | **PASS** |
| IT-338 | phone login: no horizontal page scroll | **PASS** |
| IT-339 | phone director dashboard: flagged card = API (3) | **PASS** |
| IT-340 | phone director dashboard: no sample labels or invented figures | **PASS** |
| IT-341 | phone director dashboard: map/matrix lists the scoped municipality | **PASS** |
| IT-342 | phone director map: 'All households in scope' layer shows 6 | **PASS** |
| IT-343 | phone director map: dots + cluster counts = households under review (4) | **PASS** |
| IT-344 | phone director map: switching map style keeps every household | **PASS** |
| IT-345 | phone director map: a household dot opens its popup | **PASS** |
| IT-346 | phone director dashboard: no horizontal page scroll | **PASS** |
| IT-347 | phone dispatch screen: lists the new task's household and worker | **PASS** |
| IT-348 | phone dispatch: no horizontal page scroll | **PASS** |
| IT-349 | phone policy screen: shows the enforced threshold, read-only | **PASS** |
| IT-350 | phone policy: no horizontal page scroll | **PASS** |
| IT-351 | phone triage: no horizontal page scroll | **PASS** |
| IT-352 | phone due process: no horizontal page scroll | **PASS** |
| IT-353 | phone COA overview: shows the block count and the dispatch block | **PASS** |
| IT-354 | phone COA overview: no invented peso or percentage figures | **PASS** |
| IT-355 | phone COA overview: no horizontal page scroll | **PASS** |
| IT-356 | phone COA sampling: lists real flagged households | **PASS** |
| IT-357 | phone COA sampling: no horizontal page scroll | **PASS** |
| IT-358 | phone audit verification: no horizontal page scroll | **PASS** |
| IT-359 | phone field overview: caseload KPI = assigned tasks (2) | **PASS** |
| IT-360 | phone field overview: no sample barangays | **PASS** |
| IT-361 | phone field overview: no horizontal page scroll | **PASS** |
| IT-362 | phone assigned tasks: no horizontal page scroll | **PASS** |
| IT-363 | phone 5-step field form: no horizontal page scroll | **PASS** |
| IT-364 | tablet login: no horizontal page scroll | **PASS** |
| IT-365 | tablet director dashboard: flagged card = API (3) | **PASS** |
| IT-366 | tablet director dashboard: no sample labels or invented figures | **PASS** |
| IT-367 | tablet director dashboard: map/matrix lists the scoped municipality | **PASS** |
| IT-368 | tablet director map: 'All households in scope' layer shows 6 | **PASS** |
| IT-369 | tablet director map: dots + cluster counts = households under review (4) | **PASS** |
| IT-370 | tablet director map: switching map style keeps every household | **PASS** |
| IT-371 | tablet director map: a household dot opens its popup | **PASS** |
| IT-372 | tablet director dashboard: no horizontal page scroll | **PASS** |
| IT-373 | tablet dispatch screen: lists the new task's household and worker | **PASS** |
| IT-374 | tablet dispatch: no horizontal page scroll | **PASS** |
| IT-375 | tablet policy screen: shows the enforced threshold, read-only | **PASS** |
| IT-376 | tablet policy: no horizontal page scroll | **PASS** |
| IT-377 | tablet triage: no horizontal page scroll | **PASS** |
| IT-378 | tablet due process: no horizontal page scroll | **PASS** |
| IT-379 | tablet COA overview: shows the block count and the dispatch block | **PASS** |
| IT-380 | tablet COA overview: no invented peso or percentage figures | **PASS** |
| IT-381 | tablet COA overview: no horizontal page scroll | **PASS** |
| IT-382 | tablet COA sampling: lists real flagged households | **PASS** |
| IT-383 | tablet COA sampling: no horizontal page scroll | **PASS** |
| IT-384 | tablet audit verification: no horizontal page scroll | **PASS** |
| IT-385 | tablet field overview: caseload KPI = assigned tasks (2) | **PASS** |
| IT-386 | tablet field overview: no sample barangays | **PASS** |
| IT-387 | tablet field overview: no horizontal page scroll | **PASS** |
| IT-388 | tablet assigned tasks: no horizontal page scroll | **PASS** |
| IT-389 | tablet 5-step field form: no horizontal page scroll | **PASS** |
| IT-390 | desktop login: no horizontal page scroll | **PASS** |
| IT-391 | desktop director dashboard: flagged card = API (3) | **PASS** |
| IT-392 | desktop director dashboard: no sample labels or invented figures | **PASS** |
| IT-393 | desktop director dashboard: map/matrix lists the scoped municipality | **PASS** |
| IT-394 | desktop director map: 'All households in scope' layer shows 6 | **PASS** |
| IT-395 | desktop director map: dots + cluster counts = households under review (4) | **PASS** |
| IT-396 | desktop director map: switching map style keeps every household | **PASS** |
| IT-397 | desktop director map: a household dot opens its popup | **PASS** |
| IT-398 | desktop director dashboard: no horizontal page scroll | **PASS** |
| IT-399 | desktop dispatch screen: lists the new task's household and worker | **PASS** |
| IT-400 | desktop dispatch: no horizontal page scroll | **PASS** |
| IT-401 | desktop policy screen: shows the enforced threshold, read-only | **PASS** |
| IT-402 | desktop policy: no horizontal page scroll | **PASS** |
| IT-403 | desktop triage: no horizontal page scroll | **PASS** |
| IT-404 | desktop due process: no horizontal page scroll | **PASS** |
| IT-405 | desktop COA overview: shows the block count and the dispatch block | **PASS** |
| IT-406 | desktop COA overview: no invented peso or percentage figures | **PASS** |
| IT-407 | desktop COA overview: no horizontal page scroll | **PASS** |
| IT-408 | desktop COA sampling: lists real flagged households | **PASS** |
| IT-409 | desktop COA sampling: no horizontal page scroll | **PASS** |
| IT-410 | desktop audit verification: no horizontal page scroll | **PASS** |
| IT-411 | desktop field overview: caseload KPI = assigned tasks (2) | **PASS** |
| IT-412 | desktop field overview: no sample barangays | **PASS** |
| IT-413 | desktop field overview: no horizontal page scroll | **PASS** |
| IT-414 | desktop assigned tasks: no horizontal page scroll | **PASS** |
| IT-415 | desktop 5-step field form: no horizontal page scroll | **PASS** |
<!-- END INTEGRATION CHECKS -->

## 11. Unit and component cases

Every top-level case from `UNIT_TEST_REPORT.md` (<!-- UT COUNT -->208 cases; ↳ = subtest inside a component test). IDs are permanent; retired IDs (UT-040, UT-107, UT-111, UT-120) and their replacements are listed in that report.

<!-- BEGIN UNIT CASES -->
| ID | File | Test case | Result |
| --- | --- | --- | :---: |
| UT-001 | `server/test/cryptoHelper.test.js` | SHA-256 matches the standard known vector | **PASS** |
| UT-002 | `server/test/cryptoHelper.test.js` | reordered keys produce identical canonical JSON and entry hashes | **PASS** |
| UT-003 | `server/test/cryptoHelper.test.js` | canonical JSON preserves falsy values and array ordering | **PASS** |
| UT-004 | `server/test/cryptoHelper.test.js` | Date objects and equivalent ISO timestamps hash identically | **PASS** |
| UT-005 | `server/test/cryptoHelper.test.js` | the seal binds every field using the existing colon-separated format | **PASS** |
| UT-006 | `server/test/hashChain.test.js` | 1000 valid blocks match the frozen response keys and partial ranges anchor to predecessor | **PASS** |
| UT-007 | `server/test/hashChain.test.js` | changed delta and recomputed broken link identify exact compromised sequence | **PASS** |
| UT-008 | `server/test/hashChain.test.js` | genesis, missing blocks, missing predecessor, malformed entry and storage failures fail safely | **PASS** |
| UT-009 | `server/test/hashChain.test.js` | ranges reject missing, repeated, unknown, unsafe, negative and oversized parameters | **PASS** |
| UT-010 | `server/test/hashChain.test.js` | live route enforces current role, authentication, query errors and sanitized storage failures | **PASS** |
| UT-011 | `server/test/evidenceHash.test.js` | matching raw image bytes return a normalized digest without mutation | **PASS** |
| UT-012 | `server/test/evidenceHash.test.js` | one-byte changes, truncation and a different valid hash produce contract mismatch | **PASS** |
| UT-013 | `server/test/evidenceHash.test.js` | invalid bytes and malformed hashes fail before digest comparison | **PASS** |
| UT-014 | `server/test/evidenceHash.test.js` | raw buffer slices are hashed as bytes without encoding or backing-buffer changes | **PASS** |
| UT-015 | `server/test/evidenceHash.test.js` | existing error middleware emits the exact frozen mismatch response | **PASS** |
| UT-016 | `server/test/geoFence.test.js` | geofence uses longitude-first GeoJSON and matches identical locations | **PASS** |
| UT-017 | `server/test/geoFence.test.js` | geofence compares unrounded distance at the inclusive 250 metre boundary | **PASS** |
| UT-018 | `server/test/geoFence.test.js` | malformed and non-finite coordinates fail closed | **PASS** |
| UT-019 | `server/test/geoFence.test.js` | distance remains finite at antipodes and crosses the date line correctly | **PASS** |
| UT-020 | `server/test/discrepancy.test.js` | zero risk and individual documented contributions | **PASS** |
| UT-021 | `server/test/discrepancy.test.js` | flagging threshold is inclusive at 70 and the score caps at 100 | **PASS** |
| UT-022 | `server/test/discrepancy.test.js` | missing, unknown or coerced inputs cannot silently become zero risk | **PASS** |
| UT-023 | `server/test/discrepancy.test.js` | calculation is deterministic and does not mutate input | **PASS** |
| UT-024 | `server/test/ageOut.test.js` | age is counted on the Asia/Manila calendar date | **PASS** |
| UT-025 | `server/test/ageOut.test.js` | RA 11310 Sec. 6: eligible until the 19th birthday | **PASS** |
| UT-026 | `server/test/ageOut.test.js` | ISO strings from legacy inserts are accepted; invalid dates keep the stored flag as unknown | **PASS** |
| UT-027 | `server/test/ageOut.test.js` | future birthdates are unknown, never eligible-by-default changes | **PASS** |
| UT-028 | `server/test/ageOut.test.js` | empty or missing registry | **PASS** |
| UT-029 | `server/test/appealLifecycle.test.js` | deadline adds 15 elapsed days across month/year/leap-day boundaries without changing input | **PASS** |
| UT-030 | `server/test/appealLifecycle.test.js` | one millisecond before expiry is blocked; exact expiry and later satisfy timing only | **PASS** |
| UT-031 | `server/test/appealLifecycle.test.js` | appeals, pauses, and unknown hold information block exit even after expiry | **PASS** |
| UT-032 | `server/test/appealLifecycle.test.js` | missing notice and shortened deadlines cannot bypass the window; longer deadlines are respected | **PASS** |
| UT-033 | `server/test/appealLifecycle.test.js` | invalid dates, implicit date coercion and overflow fail closed | **PASS** |
| UT-034 | `server/test/calamity.test.js` | moratorium matches both province and municipality | **PASS** |
| UT-035 | `server/test/calamity.test.js` | provisional interval includes declaration and excludes exact expiry | **PASS** |
| UT-036 | `server/test/calamity.test.js` | inactive declarations and open-ended declarations retain distinct behavior | **PASS** |
| UT-037 | `server/test/calamity.test.js` | overlapping valid zones preserve a hold regardless of ordering | **PASS** |
| UT-038 | `server/test/calamity.test.js` | malformed data throws instead of returning permission to continue | **PASS** |
| UT-039 | `server/test/calamity.test.js` | checking a stored zone does not mutate it | **PASS** |
| UT-199 | `server/test/workflow.test.js` | only the documented lifecycle transitions are accepted | **PASS** |
| UT-041 | `server/test/workflow.test.js` | unknown, missing, and structured status inputs cannot bypass the guard | **PASS** |
| UT-042 | `server/test/workflow.test.js` | invalid jumps return sanitized HTTP 400 through the application error handler | **PASS** |
| UT-043 | `server/test/submissionPreparation.test.js` | submission contract maps into existing field_findings without changing input | **PASS** |
| UT-044 | `server/test/submissionPreparation.test.js` | submission rejects missing fields and mismatched route identity | **PASS** |
| UT-045 | `server/test/submissionPreparation.test.js` | submission rejects coercion, malformed evidence, coordinates and privileged fields | **PASS** |
| UT-046 | `server/test/submissionPreparation.test.js` | preparation permits absent EXIF and empty evidence without claiming evidence verification | **PASS** |
| UT-047 | `server/test/submissionAuthorization.test.js` | active assigned worker may prepare either open status; supplied session reaches all reads | **PASS** |
| UT-048 | `server/test/submissionAuthorization.test.js` | missing authentication and malformed submissions stop before reads | **PASS** |
| UT-049 | `server/test/submissionAuthorization.test.js` | current stored role and activation control access on every call | **PASS** |
| UT-050 | `server/test/submissionAuthorization.test.js` | another worker task and missing task both return not found without household reads | **PASS** |
| UT-051 | `server/test/submissionAuthorization.test.js` | household mismatch and missing stored household are rejected | **PASS** |
| UT-052 | `server/test/submissionAuthorization.test.js` | stored household scope and current worker jurisdiction are enforced | **PASS** |
| UT-053 | `server/test/submissionAuthorization.test.js` | submitted, resolved and unknown task statuses fail closed | **PASS** |
| UT-054 | `server/test/mlClient.test.js` | ML request and successful response match the frozen contract | **PASS** |
| UT-055 | `server/test/mlClient.test.js` | invalid feature vectors are rejected before network access | **PASS** |
| UT-056 | `server/test/mlClient.test.js` | malformed, wrong-household and invalid prediction responses are rejected | **PASS** |
| UT-057 | `server/test/mlClient.test.js` | upstream rejection, errors and redirects are sanitized without retries | **PASS** |
| UT-058 | `server/test/mlClient.test.js` | hung ML request aborts at the 2500 ms deadline | **PASS** |
| UT-059 | `server/test/mlClient.test.js` | connection errors are sanitized and invalid service origins rejected | **PASS** |
| UT-060 | `server/test/mlClient.test.js` | streaming responses cannot extend the overall ML deadline | **PASS** |
| UT-061 | `server/test/mlClient.test.js` | oversized ML responses fail safely | **PASS** |
| UT-062 | `server/test/auth-rbac.test.js` | verified contract-style claims become req.user without extra token claims | **PASS** |
| UT-063 | `server/test/auth-rbac.test.js` | missing, malformed, expired, future, forged, unsigned and wrong-algorithm tokens return 401 | **PASS** |
| UT-064 | `server/test/auth-rbac.test.js` | unconfigured authentication fails closed | **PASS** |
| UT-065 | `server/test/auth-rbac.test.js` | explicit role permissions and auditor read-only access are enforced | **PASS** |
| UT-066 | `server/test/auth-rbac.test.js` | both scoped roles receive enforced filters when callers omit jurisdiction | **PASS** |
| UT-067 | `server/test/auth-rbac.test.js` | out-of-scope or operator-shaped query filters cannot bypass jurisdiction | **PASS** |
| UT-068 | `server/test/auth-rbac.test.js` | missing or invalid jurisdiction fails closed for scoped users | **PASS** |
| UT-069 | `server/test/auth-rbac.test.js` | record checks use trusted address, not spoofed body jurisdiction | **PASS** |
| UT-070 | `server/test/auth-rbac.test.js` | national roles have no geographic filter but still require explicit route permission | **PASS** |
| UT-071 | `server/test/auth-rbac.test.js` | invalid middleware configuration is rejected | **PASS** |
| UT-072 | `server/test/login.test.js` | real bcrypt login follows contract shape, issues a 900s JWT, and exposes no password hash | **PASS** |
| UT-073 | `server/test/login.test.js` | incorrect, unknown, invalid and injection-shaped credentials share contract error | **PASS** |
| UT-074 | `server/test/login.test.js` | deactivation blocks login and an already-issued token | **PASS** |
| UT-075 | `server/test/login.test.js` | triage handler receives current jurisdiction after authentication | **PASS** |
| UT-076 | `server/test/login.test.js` | outside-jurisdiction response matches the triage contract | **PASS** |
| UT-077 | `server/test/login.test.js` | expired token matches assigned-task contract error | **PASS** |
| UT-078 | `server/test/login.test.js` | current role changes take effect immediately and assigned handler receives authenticated identity | **PASS** |
| UT-079 | `server/test/login.test.js` | missing, forged and placeholder tokens cannot access mounted handlers | **PASS** |
| UT-080 | `server/test/login.test.js` | production has real login but never serves protected fixture data | **PASS** |
| UT-081 | `server/test/login.test.js` | repository errors fail closed without exposing database details | **PASS** |
| UT-082 | `server/test/login.test.js` | deleted user tokens are rejected | **PASS** |
| UT-083 | `server/test/errorBoundary.test.js` | HTTP error boundary sanitizes malformed requests and remains available | **PASS** |
| UT-084 | `server/test/handoffPlaceholders.test.js` | all unfinished integration boundaries reject rather than report success | **PASS** |
| UT-085 | `server/test/handoffPlaceholders.test.js` | audit controller forwards service failure and emits no valid-chain response | **PASS** |
| UT-086 | `server/test/handoffPlaceholders.test.js` | audit placeholder blocks mutations and allows reads through | **PASS** |
| UT-087 | `server/test/handoffPlaceholders.test.js` | Joi middleware retains validated body and rejects invalid input without details | **PASS** |
| UT-088 | `server/test/app.test.js` | health and API discovery respond successfully | **PASS** |
| UT-089 | `server/test/app.test.js` | POST /api/v1/auth/login matches the frozen response data | **PASS** |
| UT-090 | `server/test/app.test.js` | GET /api/v1/beneficiaries/triage-queue?municipality=Calamba&status=FLAGGED_FOR_REVIEW&page=1&limit=10 matches the frozen response data | **PASS** |
| UT-091 | `server/test/app.test.js` | GET /api/v1/tasks/assigned matches the frozen response data | **PASS** |
| UT-092 | `server/test/app.test.js` | browser login preflight allows JSON and authorization headers | **PASS** |
| UT-093 | `server/test/app.test.js` | legacy unauthenticated mock mode is rejected in production | **PASS** |
| UT-094 | `server/test/databaseLifecycle.test.js` | connection observers are installed once, survive runtime errors and sanitize logs | **PASS** |
| UT-095 | `server/test/databaseLifecycle.test.js` | startup rejection is sanitized and preserves documented pool settings | **PASS** |
| UT-096 | `server/test/databaseLifecycle.test.js` | isolated Docker MongoDB outage preserves HTTP service and recovers queries | **PASS** |
| UT-097 | `server/test/workflowPersistence.test.js` | workflow persistence requires an explicit policy and approved transition/action | **PASS** |
| UT-098 | `server/test/workflowPersistence.test.js` | transactional workflow against a disposable MongoDB replica set<br>↳ successful update and audit use the accepted hash format<br>↳ current role, deactivation and jurisdiction are read from MongoDB<br>↳ failed prerequisites roll back associated writes<br>↳ audit failure rolls back the status update<br>↳ simultaneous changes to one household yield one winner and one audit<br>↳ independent concurrent changes form one contiguous audit chain<br>↳ invalid input, unknown actor and missing household fail closed<br>↳ unexpected database status cannot be skipped or overwritten<br>↳ dispatch HTTP contract, authorization, metadata and atomic rollback<br>↳ verifier reads persisted workflow hashes and detects tampering in 1000 MongoDB blocks<br>↳ missing unique audit sequence index prevents all writes | **PASS** |
| UT-099 | `server/test/appealDocket.test.js` | INT-03 POST /api/v1/appeals/docket against a disposable MongoDB replica set<br>↳ the frontend appeal dialog payload is accepted: 201, countdown paused, audit sealed<br>↳ SUPER_ADMIN may docket; chain stays contiguous and verifiable<br>↳ 400 root causes are rejected at the boundary with no writes<br>↳ security guards: 401, role 403, auditor 403, jurisdiction 403<br>↳ due-process prerequisites: 404, 409 status/notice/window/duplicate<br>↳ INT-08 GET /appeals/docket lists notices with deadlines and verified appeals<br>↳ simultaneous filings for one household yield exactly one appeal | **PASS** |
| UT-100 | `server/test/calamityToggle.test.js` | INT-04 POST /api/v1/calamity/toggle against a disposable MongoDB replica set<br>↳ security guards: 401, director 403, worker 403, auditor 403<br>↳ boundary validation: 400 with no writes<br>↳ lifting with no declared zone is a 409 and creates nothing<br>↳ declaration returns the hold for the matching zone and seals CALAMITY_DECLARED<br>↳ a second declaration for an active zone is a 409 with no writes<br>↳ lifting releases the hold, keeps history and seals SYSTEM_CONFIG_UPDATED<br>↳ open-ended re-declaration appends a new zone; expired zones do not block<br>↳ audit chain stays contiguous across toggles<br>↳ simultaneous first declarations create one config and one active zone | **PASS** |
| UT-101 | `server/test/calamityHold.test.js` | E2E-02 calamity moratorium freezes dispatch and flagging, releases on expiry/lift<br>↳ no configuration document: no hold<br>↳ active zone freezes dispatch and assessment with zero writes<br>↳ other municipality and inactive zones are not held<br>↳ expiry releases the hold<br>↳ malformed stored configuration fails closed (503), never silently clears | **PASS** |
| UT-102 | `server/test/riskAssessment.test.js` | INT-05 POST /api/v1/beneficiaries/:household_id/assess against a disposable replica set<br>↳ graduation drift: ML Level 3 vs enrolled 1 flags and seals MODEL_FLAG_RAISED<br>↳ below threshold: 200 result, nothing persisted, no audit block<br>↳ ML down, error or malformed: EVALUATED_VIA_FALLBACK, utilities still score, no crash<br>↳ indicator rules: vehicle ownership, franchise, missing external record<br>↳ security guards and boundary validation with no writes<br>↳ E2E-03a age-out: reported, not scored; corrected and sealed only when flagged<br>↳ E2E-04 GET /assessment serves the sealed explanation and rejects tampering<br>↳ simultaneous assessments of one household flag it exactly once | **PASS** |
| UT-103 | `server/test/taskSubmission.test.js` | INT-02/INT-06 POST /api/v1/tasks/:id/submit persists findings and seals REPORT_SUBMITTED<br>↳ JSON contract submission: 200 frozen response, findings persisted, audit sealed<br>↳ multipart with matching bytes verifies evidence and stores it content-addressed<br>↳ uploaded evidence storage_url must be bound to the verified hash<br>↳ evidence integrity: altered bytes 422, missing files 400, no writes<br>↳ geofence breach beyond 250 m is rejected with GEOFENCE_VIOLATION and no writes<br>↳ security and identity guards: 401, 403 roles, 404 other worker, 400 mismatch<br>↳ duplicate and simultaneous submissions commit exactly once | **PASS** |
| UT-104 | `server/test/readFeeds.test.js` | live feeds enforce contracts, pagination and data isolation in production | **PASS** |
| UT-200 | `server/test/insights.test.js` | UI live-data read routes: scope, roles, validation and contract shapes<br>↳ GET /insights/overview is scoped and role-shaped<br>↳ GET /tasks lists scoped tasks with worker names<br>↳ GET /users/caseworkers returns assignable workers only<br>↳ GET /audit/blocks pages newest first for auditors<br>↳ GET /insights/map returns scoped household counts per cell, no identities<br>↳ GET /system/policy reports the enforced values | **PASS** |
| UT-201 | `server/test/resolution.test.js` | DECISION-011 review, evidence, notice issuance and graduation on a disposable replica set<br>↳ GET /tasks/:id/report returns the field report in the contract shape, scoped<br>↳ GET /evidence/:sha256 serves verified bytes and refuses a tampered file<br>↳ POST /tasks/:id/resolve issues the notice, seals it and opens the docket<br>↳ resolve refuses unsupported reports, bad input, wrong roles, other jurisdictions and calamity holds<br>↳ POST /beneficiaries/:id/graduate only after the 15-day window with no appeal | **PASS** |
| UT-202 | `server/test/retention.test.js` | DECISION-012 retention, appeal outcome and re-flag cooldown on a disposable replica set<br>↳ POST /tasks/:id/retain returns the household to ACTIVE_COMPLIANT and seals BENEFICIARY_RETAINED<br>↳ the model cannot re-flag a retained household for 180 days<br>↳ retain refuses graduation reports, bad input, wrong roles and other jurisdictions; calamity does not block it<br>↳ POST /appeals/:docket/decide GRANTED returns the household to ACTIVE_COMPLIANT<br>↳ DENIED completes the graduation, sealed as BENEFICIARY_GRADUATED<br>↳ decide refuses early hearings, stale or forged appeals, bad input, wrong roles and calamity holds | **PASS** |
| UT-105 | `server/test/auditRoleCompatibility.test.js` | audit role requires listIndexes independently of createIndex and blocks mutation | **PASS** |
| UT-106 | `client/test/auth.test.mjs` | dates preserve calendar dates, use Philippine time, and retain missing/invalid values | **PASS** |
| UT-203 | `client/test/auth.test.mjs` | dispatch puts assignments before collapsed staff details and loads server records only | **PASS** |
| UT-108 | `client/test/auth.test.mjs` | due process preserves notices, protected grants and appeal actions while collapsing details | **PASS** |
| UT-109 | `client/test/auth.test.mjs` | assessment step navigation retains accessible names and current-step context | **PASS** |
| UT-110 | `client/test/auth.test.mjs` | assessment completion requires recorded answers rather than visited steps | **PASS** |
| UT-204 | `client/test/auth.test.mjs` | dashboard shows the live workload first and loads the regional snapshot from the server | **PASS** |
| UT-112 | `client/test/auth.test.mjs` | audit navigation does not claim verification or present sample percentages as live | **PASS** |
| UT-113 | `client/test/auth.test.mjs` | audit overview identifies the authenticated reviewer and keeps AOM explicitly preview-only | **PASS** |
| UT-114 | `client/test/auth.test.mjs` | data notices are compact disclosures and never imply successful verification | **PASS** |
| UT-115 | `client/test/auth.test.mjs` | field tasks use plain-language titles and distinguish local copies from submissions | **PASS** |
| UT-116 | `client/test/auth.test.mjs` | notice deadlines are concise, timezone-aware, and never imply an eligibility decision | **PASS** |
| UT-117 | `client/test/auth.test.mjs` | due process sorts active deadlines before paused cases without changing source data | **PASS** |
| UT-118 | `client/test/auth.test.mjs` | dashboard renders API households only when counts are available and excludes stale loading data | **PASS** |
| UT-119 | `client/test/auth.test.mjs` | triage keeps four primary columns with complete, collapsed evidence and backend severity labels | **PASS** |
| UT-205 | `client/test/auth.test.mjs` | policy settings is read-only and waits for the server policy | **PASS** |
| UT-121 | `client/test/auth.test.mjs` | sidebar toggles only from non-navigation clicks in either width state | **PASS** |
| UT-122 | `client/test/auth.test.mjs` | workload summary preserves zeros and rejects missing, partial or invalid counts | **PASS** |
| UT-123 | `client/test/auth.test.mjs` | dashboard separates API workload semantics from sample chart metrics | **PASS** |
| UT-124 | `client/test/auth.test.mjs` | audit ranges enforce inclusive 1000-block limit and positive safe integers | **PASS** |
| UT-125 | `client/test/auth.test.mjs` | audit transport sends authenticated read-only range and handles broken HTTP 200 | **PASS** |
| UT-126 | `client/test/auth.test.mjs` | audit malformed results cannot report verified and unavailable responses stay errors | **PASS** |
| UT-127 | `client/test/auth.test.mjs` | audit starts unverified with no simulated blocks and role access matches contract | **PASS** |
| UT-128 | `client/test/auth.test.mjs` | dispatch dates use Philippine end-of-day and reject invalid fields | **PASS** |
| UT-129 | `client/test/auth.test.mjs` | dispatch posts exact authenticated contract and requires a matching 201 receipt | **PASS** |
| UT-130 | `client/test/auth.test.mjs` | dispatch rejects forbidden roles before transport and explains backend conflicts | **PASS** |
| UT-131 | `client/test/auth.test.mjs` | dispatch source keeps QA writes disabled and does not import fabricated staff | **PASS** |
| UT-132 | `client/test/auth.test.mjs` | accepts backend-shaped session and restores SUPER_ADMIN | **PASS** |
| UT-133 | `client/test/auth.test.mjs` | accepts backend-shaped session and restores REGIONAL_DIRECTOR | **PASS** |
| UT-134 | `client/test/auth.test.mjs` | accepts backend-shaped session and restores CASE_WORKER | **PASS** |
| UT-135 | `client/test/auth.test.mjs` | accepts backend-shaped session and restores COA_AUDITOR | **PASS** |
| UT-136 | `client/test/auth.test.mjs` | rejects unknown and legacy roles instead of assigning admin | **PASS** |
| UT-137 | `client/test/auth.test.mjs` | rejects placeholder tokens, mismatched claims, expiry and future activation | **PASS** |
| UT-138 | `client/test/auth.test.mjs` | clears malformed, expired and mismatched stored sessions | **PASS** |
| UT-139 | `client/test/auth.test.mjs` | login sends credentials without bearer and stores only accepted response | **PASS** |
| UT-140 | `client/test/auth.test.mjs` | invalid login never falls back or stores a session | **PASS** |
| UT-141 | `client/test/auth.test.mjs` | network failure never creates a session | **PASS** |
| UT-142 | `client/test/auth.test.mjs` | rejects mock mode and malformed successful login responses | **PASS** |
| UT-143 | `client/test/auth.test.mjs` | protected request requires a session before contacting backend | **PASS** |
| UT-144 | `client/test/auth.test.mjs` | bearer attached to requests; valid empty fixture responses stay empty | **PASS** |
| UT-206 | `client/test/auth.test.mjs` | UI live-data reads call the DECISION-010 routes with the bearer and reject malformed bodies | **PASS** |
| UT-207 | `client/test/auth.test.mjs` | DECISION-011 calls: report, evidence, notice and graduation use the routes and verify receipts | **PASS** |
| UT-208 | `client/test/auth.test.mjs` | DECISION-012 calls: retention and hearing outcome use the routes and verify receipts | **PASS** |
| UT-145 | `client/test/auth.test.mjs` | protected 401 or deactivated account clears session | **PASS** |
| UT-146 | `client/test/auth.test.mjs` | role/jurisdiction 403 retains identity and reports access denial | **PASS** |
| UT-147 | `client/test/auth.test.mjs` | late 401 from old identity does not clear newer login | **PASS** |
| UT-148 | `client/test/auth.test.mjs` | role navigation follows endpoint RBAC; COA cannot dispatch | **PASS** |
| UT-149 | `client/test/auth.test.mjs` | COA triage renders without dispatch controls | **PASS** |
| UT-150 | `client/test/auth.test.mjs` | empty assigned tasks renders empty state and authenticated worker identity | **PASS** |
| UT-151 | `client/test/auth.test.mjs` | cached assignments are isolated per owner and empty results clear only that owner | **PASS** |
| UT-152 | `client/test/auth.test.mjs` | drafts and sync statuses never cross worker boundaries or load legacy unowned drafts | **PASS** |
| UT-153 | `client/test/auth.test.mjs` | triage requests explicit pages of flagged records without truncating total count | **PASS** |
| UT-154 | `client/test/auth.test.mjs` | missing or mismatched pagination is reported instead of hiding additional rows | **PASS** |
| UT-155 | `client/test/auth.test.mjs` | null SWDI prediction and evaluation time do not invent a level or timestamp | **PASS** |
| UT-156 | `client/test/auth.test.mjs` | live assigned API gets no worker override and preserves missing optional data | **PASS** |
| UT-157 | `client/test/auth.test.mjs` | triage pagination shows total, page count, and disabled boundary controls | **PASS** |
| UT-158 | `client/test/auth.test.mjs` | an API-returned Palingon task renders its actual fields and verification action | **PASS** |
| UT-159 | `client/test/auth.test.mjs` | assigned-task API failures reject instead of manufacturing a successful empty or sample feed | **PASS** |
| UT-160 | `client/test/auth.test.mjs` | saved drafts and exact evidence survive database reopen; resave replaces only the same owner/task | **PASS** |
| UT-161 | `client/test/auth.test.mjs` | offline assignments restore only an authenticated worker cache without a network request | **PASS** |
| UT-162 | `client/test/auth.test.mjs` | network-only failure can restore cache; 401/403/503 and cancellation never do | **PASS** |
| UT-163 | `client/test/auth.test.mjs` | a successful empty assignment response clears stale tasks without deleting saved drafts | **PASS** |
| UT-164 | `client/test/auth.test.mjs` | SHA-256 matches a known vector and fingerprints original bytes | **PASS** |
| UT-165 | `client/test/auth.test.mjs` | evidence photo validation rejects empty, oversized, unsupported and disguised files | **PASS** |
| UT-166 | `client/test/auth.test.mjs` | location preserves device accuracy and requests a fresh high-accuracy reading | **PASS** |
| UT-167 | `client/test/auth.test.mjs` | location denial, timeout, unavailable hardware and invalid coordinates have actionable errors | **PASS** |
| UT-168 | `client/test/submissionContract.test.mjs` | mapped draft passes the server Joi schema and matches the contract keys | **PASS** |
| UT-169 | `client/test/submissionContract.test.mjs` | local-only fields never leave the device | **PASS** |
| UT-170 | `client/test/submissionContract.test.mjs` | legacy drafts without a verified level or evidence are rejected locally | **PASS** |
| UT-171 | `client/test/submissionContract.test.mjs` | motorcycle absent maps to proof_type NONE and empty franchise | **PASS** |
| UT-172 | `client/test/pwa.test.mjs` | production precache includes the exact built shell, scripts, styles and branding | **PASS** |
| UT-173 | `client/test/pwa.test.mjs` | API and QA navigation never receive app HTML and updates do not interrupt forms | **PASS** |
| UT-174 | `data-pipeline/scripts/test_section12_ml_unit.py` | `test_model_loaded_with_the_six_contract_features` | **PASS** |
| UT-175 | `data-pipeline/scripts/test_section12_ml_unit.py` | `test_shap_extraction_returns_top_three_signed_by_absolute_weight` | **PASS** |
| UT-176 | `data-pipeline/scripts/test_section12_ml_unit.py` | `test_extracted_weights_are_the_predicted_class_attributions` | **PASS** |
| UT-177 | `data-pipeline/scripts/test_section12_ml_unit.py` | `test_shap_attributions_are_additive_to_the_model_margin` | **PASS** |
| UT-178 | `data-pipeline/scripts/test_section12_ml_unit.py` | `test_probabilities_are_a_distribution_and_level_is_argmax` | **PASS** |
| UT-179 | `data-pipeline/scripts/test_section12_ml_unit.py` | `test_sangla_atm_heuristic[12-2-38-85.0-True]` | **PASS** |
| UT-180 | `data-pipeline/scripts/test_section12_ml_unit.py` | `test_sangla_atm_heuristic[5-2-59-85.0-True]` | **PASS** |
| UT-181 | `data-pipeline/scripts/test_section12_ml_unit.py` | `test_sangla_atm_heuristic[4-2-38-60.0-False]` | **PASS** |
| UT-182 | `data-pipeline/scripts/test_section12_ml_unit.py` | `test_sangla_atm_heuristic[12-14-38-60.0-False]` | **PASS** |
| UT-183 | `data-pipeline/scripts/test_section12_ml_unit.py` | `test_sangla_atm_heuristic[12-2-120-40.0-False]` | **PASS** |
| UT-184 | `data-pipeline/scripts/test_section12_ml_unit.py` | `test_sangla_atm_heuristic[12-14-120-0.0-False]` | **PASS** |
| UT-185 | `ml-service/scripts/test_sprint2_experiments.py` | `Sprint2Mechanics.test_all_experiments_ran_on_one_holdout` | **PASS** |
| UT-186 | `ml-service/scripts/test_sprint2_experiments.py` | `Sprint2Mechanics.test_artifact_serves_the_frozen_vector` | **PASS** |
| UT-187 | `ml-service/scripts/test_sprint2_experiments.py` | `Sprint2Mechanics.test_missing_empirical_matrix_names_the_notebooks` | **PASS** |
| UT-188 | `ml-service/scripts/test_sprint2_experiments.py` | `Sprint2Mechanics.test_no_holdout_leakage_and_audit_gate_passes` | **PASS** |
| UT-189 | `ml-service/scripts/test_sprint2_experiments.py` | `Sprint2Mechanics.test_selection_rule` | **PASS** |
| UT-190 | `data-pipeline/scripts/test_seed_mapping.py` | `BeneficiaryMapping.test_address_keeps_real_coordinates_and_assigns_reference_barangay` | **PASS** |
| UT-191 | `data-pipeline/scripts/test_seed_mapping.py` | `BeneficiaryMapping.test_demographics_declared_fields_plus_pmt_vector` | **PASS** |
| UT-192 | `data-pipeline/scripts/test_seed_mapping.py` | `BeneficiaryMapping.test_labels_and_sensitive_raw_fields_are_not_ingested` | **PASS** |
| UT-193 | `data-pipeline/scripts/test_seed_mapping.py` | `BeneficiaryMapping.test_required_model_fields` | **PASS** |
| UT-194 | `data-pipeline/scripts/test_seed_mapping.py` | `BeneficiaryMapping.test_single_token_name` | **PASS** |
| UT-195 | `data-pipeline/scripts/test_seed_mapping.py` | `ExternalMapping.test_mask_pan` | **PASS** |
| UT-196 | `data-pipeline/scripts/test_seed_mapping.py` | `ExternalMapping.test_mismatched_household_rejected` | **PASS** |
| UT-197 | `data-pipeline/scripts/test_seed_mapping.py` | `ExternalMapping.test_model_shape` | **PASS** |
| UT-198 | `data-pipeline/scripts/test_seed_mapping.py` | `ExternalMapping.test_vehicle_categories` | **PASS** |
| UT-209 | `data-pipeline/scripts/test_score_uat.py` | `test_sus_known_values` | **PASS** |
| UT-210 | `data-pipeline/scripts/test_score_uat.py` | `test_sus_rejects_bad_answers` | **PASS** |
| UT-211 | `data-pipeline/scripts/test_score_uat.py` | `test_verdict_and_completion_rates` | **PASS** |
| UT-212 | `data-pipeline/scripts/test_score_uat.py` | `test_no_responses_never_invents_a_score` | **PASS** |
<!-- END UNIT CASES -->

## 12. ML evaluation and leakage audit

Holdout: 6,232 real PSA FIES households, never trained on (`docs/integration/evidence/sprint-2/sprint2_results.md`). Selection rule fixed in advance: highest holdout macro F1, tie-break on the lowest per-class F1.

| ID | Experiment | Holdout macro F1 | Per-class F1 (L1 / L2 / L3) | ROC-AUC | Outcome |
| --- | --- | ---: | --- | ---: | --- |
| E1 | Real data, defaults | **0.6244** | 0.382 / 0.572 / 0.919 | 0.902 | **selected (v2, served)** |
| E2 | Real data, balanced | 0.6055 | 0.427 / 0.505 / 0.884 | 0.887 | — |
| E3 | Real data, balanced, tuned on training folds | 0.6123 | 0.444 / 0.508 / 0.885 | 0.894 | — |
| E4a | Real + synthetic, weight 0.3 | 0.6104 | 0.443 / 0.467 / 0.920 | 0.894 | — |
| E4b | Real + synthetic, weight 0.5 | 0.6062 | 0.441 / 0.459 / 0.919 | 0.891 | — |
| E5 | Synthetic pre-training, real fine-tuning | 0.5991 | 0.425 / 0.492 / 0.880 | 0.885 | — |

| ID | Leakage audit check (`audit_leakage.py` on v2) | Result |
| --- | --- | :---: |
| F1 | Metadata feature names equal the frozen 6-feature vector, in order | **PASS** |
| F2 | The fitted model expects exactly those 6 features | **PASS** |
| F3 | Target classes are [1, 2, 3] | **PASS** |
| P1 | Split hashes recorded for train / validation / test | **PASS** |
| P2 | Empirical test rows excluded from every training blend (0 found) | **PASS** |
| P3 | Seed, library versions and row counts recorded | **PASS** |

Output: `docs/integration/evidence/sprint-2/audit_leakage_v2.txt`. The 0.85 macro F1 target in the plan is **not met**; this is disclosed in the memo, the deck and Section 12.

## 13. Where the evidence is

| What | Path |
| --- | --- |
| Unit and component raw output (TAP, pytest) | `docs/testing/evidence/unit/` |
| Section 12 runner, latest | `docs/testing/evidence/section12-final/` |
| Full rehearsal, latest | `docs/integration/evidence/capstone-final/` |
| DECISION-011 / -012 runs and screenshots | `docs/integration/evidence/decision011/`, `decision012/` |
| Live UI runs and screenshots | `docs/integration/evidence/ui-live-data/` |
| Sprint evidence (1–6) | `docs/integration/evidence/sprint-*/` |
| ML results and audit | `docs/integration/evidence/sprint-2/` |

**Re-generate §10 and §11 after a new run:**
```bash
python3 docs/testing/tools/build_test_docs.py \
  --integration docs/testing/evidence/section12-final --integration docs/integration/evidence/capstone-final
```

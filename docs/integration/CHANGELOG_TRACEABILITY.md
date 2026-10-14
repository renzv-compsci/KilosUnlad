# DEF-05 — Change Log, Traceability Matrix and Flag Register

Branch: `claude/clever-albattani-8ikzld` (base `e5acd07`, merge of PR #28) | Date: 2026-10-12
Constraints held throughout: no Mongoose model, collection or index changed; no guard weakened;
frontend changes limited to wiring and copy; contract changes limited to DECISION-009.

## 1. Change Log (Sprints 1–6, this branch)

| Commit | Item(s) | Change |
| --- | --- | --- |
| `3de7ba7` | INT-03 | POST `/appeals/docket`. Notice instant from the stored `APPROVED_GRADUATION`; appeal sealed as `APPEAL_FILED`. Audit append extracted to a shared `appendAuditEntry`. |
| `8b5307d` | INT-04 | POST `/calamity/toggle` on `SystemConfig` `CALAMITY_ZONES`; `CALAMITY_DECLARED` / `SYSTEM_CONFIG_UPDATED`. |
| `e1fb0cc` | INT-07 | Mock router restored to fixtures only (had a broken import and an unauthenticated submit). |
| `9963fa0` | INT-02, INT-06, INT-07 | Transactional submission with geofence (`GEOFENCE_VIOLATION`) and `REPORT_SUBMITTED`; contract 200 body; multer errors map to 400/413. |
| `8695c7c` | INT-07 | Expired-JWT coverage; Sprint 1 evidence; backlog rev 4. |
| `9b57555` | INT-01 | `ml-swdi-inference` v1.1; ML 422 contract body; mlClient bounds test. |
| `b900263` | INT-05 | POST `/beneficiaries/:id/assess` (new contract); ML or fallback scoring, then `MODEL_FLAG_RAISED`. Demo Case A given its 6 PMT features. |
| `224823a` | E2E-02 | Calamity hold freezes dispatch and assessment (`CALAMITY_MORATORIUM_ACTIVE`). |
| `d07cf4d`, `69be57e` | DAT-01…06 | 80k baseline ingested in model-conformant form (`seed_mapping.py`); timings, IXSCAN, integrity evidence. |
| `9ba5d50` | E2E-01 | Full chain through the gateway; the INT-02 fixture no longer patches status. |
| `37b1423` | E2E-03/03a | RA 11310 age-out (`ageOut.service.js`); `reset_demo.sh` stores Dates. |
| `285389d` | E2E-04 | GET `/beneficiaries/:id/assessment` (hash-verified sealed SHAP); triage drawer wiring. |
| `77c4c6d` | STR-01, STR-03 | Tamper detection at block 3; concurrency regression at 80k. |
| `20085f0` | STR-02, INT-02 | Upload adapter (content-addressed evidence); client contract mapping, verified-level input, sync enabled. |
| `792eb47` | DEF-01/02, STR-04 | Capstone runner; Proof 3 script; ML 400 for short ATM window; rehearsal evidence. |
| `8e1b4c5` | ML-04, ML-07 | Leakage/provenance audit gate; independent F1 measurement. |
| `a834bed` | DEF-03, DEF-05 | Clean-clone verification (local); DECISION-009; this document; backlog and turnover closure. |
| `c811b66` | DAT-01 | `reset_demo.sh` rebuilds the two model-declared indexes it was dropping. |
| `e3ae342` | INT-08 | Due Process screen lists the live docket and files real appeals. |
| `54f6622` | ML-01, ML-02…06 prep | F1 reconciled (0.7771); Sprint 2 E1–E5 runner with provenance and leakage gate. |
| `a727f40`, `738f4e1` | Section 12, diagrams | Section 12 plan executed; DIAGRAM_INTEGRATION figures; unit test report. |
| `5f02a04` | DEF-03 | One-shot compose jobs moved to the `tools` profile: `docker compose up` no longer runs reset-demo or seed jobs. |
| `23e6a9f` | DAT-05, DAT-01 | Baseline snapshot restore (`RESET_BASELINE=1`), 5.6–7.1 s on Docker; DAT-01 index check inspects as admin and fails loudly. |
| (this commit) | DEF-02, DEF-03, DEF-04, DEF-05, E2E-05 | Docker evidence (rehearsal 16/16, clean clone, Section 12); TC-10 reads evidence from the server container; cadence log; deck; backlog rev 6; turnover validation guide. |

## 2. Traceability Matrix

| Item | Implementation | Server test | Integration script | Evidence |
| --- | --- | --- | --- | --- |
| INT-01 | `mlClient.service.js`, `ml-service/app/main.py`, contract v1.1 | `mlClient.test.js` | `test_int01_ml_contract.js` | rehearsal 05 |
| INT-02 | `taskSubmission.service.js`, `task.controller.js` | `taskSubmission.test.js` | `test_int02_submission.js` | rehearsal 07 |
| INT-03 | `appealDocket.service.js`, `appeal.controller.js` | `appealDocket.test.js` | `test_int03_appeals_docket.js` | rehearsal 08 |
| INT-04 | `calamityToggle.service.js`, `calamity.controller.js` | `calamityToggle.test.js` | `test_int04_calamity_toggle.js` | rehearsal 09 |
| INT-05 | `riskAssessment.service.js`, `beneficiary.controller.js` | `riskAssessment.test.js` | `test_int05_risk_assessment.js` (ML up and ML down) | rehearsal 06 |
| INT-06 | in-transaction `appendAuditEntry` | all of the above (hash recomputed) | every script ends with verify-chain | rehearsal logs |
| INT-07 | guards on all routes | 401/403/400/409/expired-JWT subtests | negative steps in each script | SPRINT1_EVIDENCE.md |
| E2E-01 | assess, dispatch and submit chain | — | `test_e2e01_full_chain.js` (gateway) | rehearsal 01 |
| E2E-02 | `assertNoCalamityHold` | `calamityHold.test.js` | `test_e2e02_calamity_freeze.js` | rehearsal 10 |
| E2E-03 | `ageOut.service.js` | `ageOut.test.js`, `riskAssessment.test.js` | `test_e2e03_age_out.js` | rehearsal 11 |
| E2E-04 | `explain()`, `Screen3TriageQueue.tsx` | `riskAssessment.test.js` | `test_e2e04_shap_drawer.js`, `test_e2e04_drawer_ui.js` | rehearsal 12–13, sprint-4 PNG |
| DAT-01…06 | `seed_mapping.py`, `seed_db.py`, `verify_compound_index.py`, `snapshot_baseline.sh`, `reset_demo.sh` (`RESET_BASELINE=1`) | `test_seed_mapping.py` | `test_dat01_seed_conformance.js`, `test_dat05_reset_baseline.sh` | sprint-3/, rehearsal 15 |
| STR-01 | hash chain + `explain()` hash check | — | `test_str01_tamper_detection.js` | rehearsal 04 |
| STR-02 | upload adapter, `useOfflineSync`, `toSubmissionContract` | `taskSubmission.test.js`, `submissionContract.test.mjs` | `test_str02_airplane_sync.js` | rehearsal 02 |
| STR-03 | snapshot transactions + sequence retry | concurrency subtests | `test_str03_concurrency.js` | rehearsal 15 |
| DEF-01/02 | `run_capstone_proofs.sh` | — | runs all of the above | sprint-6/rehearsal-docker/SUMMARY.md (16/16), rehearsal-local/ |
| DEF-03 | `docker-compose.yml` (`tools` profile) | — | `docker compose up -d --build` on a fresh clone | sprint-6/clean-clone-docker/ |
| DEF-04 | slide deck (14 slides) | — | — | private artifact link in turnover §6 Step 8 |
| E2E-05 | git history | — | — | sprint-4/E2E05_CADENCE_LOG.md |
| Section 12 | `test_section12_plan.js`, `test_section12_defects.js`, `test_section12_ml_unit.py` | all suites | `run_section12_plan.sh` | docs/testing/ |
| ML-04 | `ml-service/scripts/audit_leakage.py` | — | — | F1_DISPOSITION_MEMO §5 |

## 3. Flag and Risk Register (updated)

| Flag | Severity | Status | Notes |
| --- | --- | --- | --- |
| Appeals route unregistered (RDY-01a) | MODERATE | CLOSED | INT-03 mounted. |
| ML contract file vs 6-feature vector | MAJOR | CLOSED | DECISION-009, contract v1.1. |
| Seed ingest did not conform to models; label and raw PAN stored | MAJOR | CLOSED | DAT-01 mapping; conformance test 18/18. |
| Client submission payload did not match contract; sync disabled | MAJOR | CLOSED | STR-02. |
| Geofence not enforced; evidence unverified without upload | MAJOR | CLOSED | INT-02; evidence stored and verified. |
| Age-out rule absent (RDY-04) | MODERATE | CLOSED with limitation | "18 and not enrolled" not evaluable (no enrollment field). |
| Dataset scale contradiction (5k vs 80k) | MAJOR | CLOSED | ADR-001 executed; docs updated. |
| Integrity counts 54 vs 50 | MINOR | CLOSED | Superseded: 0 issues across 160,012 documents. |
| Metric discrepancy 0.7726 vs 0.7781 | MODERATE | CLOSED (ML-01, 54f6622) | 0.7726 validation, 0.7771 test-20k (reconciled), 0.7781 not reproducible. |
| Synthetic-only training / Macro F1 < 0.85 | MAJOR | CLOSED / DISCLOSED | v2 trained on real FIES data, audit 6/6; macro F1 0.6244 < 0.85, disclosed. |
| Reset + 80k baseline exceeds the 10 s DoD | MINOR | CLOSED (23e6a9f) | Snapshot restore: 5.6–7.1 s on Docker incl. start-up. |
| Audit appends serialize globally | MINOR | ACCEPTED | 100 simultaneous flags: 100/100 succeed, burst 24 s. |
| Notice issuance has no route or audit action | MODERATE | CLOSED (DECISION-011) | `POST /tasks/:id/resolve`; TC-11, TC-20, TC-21. |
| Evidence files have no authenticated read route | MINOR | CLOSED (DECISION-011) | `GET /evidence/:sha256`, re-hashed on every read; TC-20. |
| `docker compose up` started reset-demo and seed jobs | MAJOR | CLOSED (5f02a04) | Found by the Docker clean clone; jobs moved to the `tools` profile. |
| DAT-01 index check read `Unauthorized` as "missing" under auth | MINOR | CLOSED (23e6a9f) | Test fix only; app role unchanged. |
| Empirical FIES input file absent | MAJOR | CLOSED | File supplied; ML-02/03/06 done; v2 served. |
| Appeals dialog still preview-only (INT-08) | MINOR | CLOSED (e3ae342) | Screen 5 uses live GET/POST /appeals/docket; `test_int08_appeals_ui.js`. |
| Docker-stack runs of the rehearsal, clean clone and reset | — | CLOSED | Rehearsal 16/16, clean clone boots, DAT-05 on Docker; foreign-hardware run is turnover §6 Step 1. |
| DEF-04 deck | — | CLOSED | Final 19-slide deck on v2 metrics with live-demo test cases. |
| E2E-05 standup cadence evidence | — | CLOSED (repository cadence) | Cadence log from git; standup notes table for the team. |
| No retention path; appeals never decided | MAJOR | CLOSED (DECISION-012) | `POST /tasks/:id/retain`, `POST /appeals/:docket/decide`, 180-day cooldown; one approved enum value `BENEFICIARY_RETAINED`; TC-22..TC-24. |
| Test documents out of step with the plan | MINOR | CLOSED (2026-10-14) | Plan rev 3 (Sprint 7, Verification Map); unit report regenerated; TC-18..TC-24; `docs/testing/MASTER_TEST_CATALOG.md` indexes every test. |

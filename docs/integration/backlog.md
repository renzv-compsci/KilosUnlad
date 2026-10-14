# KilosUnlad Integration Backlog (Board of Record)

Owner: Renz Viloria | Revision: 7 | Date: 2026-10-14 (see CHANGELOG_TRACEABILITY.md)
Plan reference: docs/integration/SCRUM_INTEGRATION_PLAN.md (Revision 3, adds Sprint 7 and the Verification Map)
Legend: DONE | IN REVIEW | OPEN | BLOCKED

Revision 7 (2026-10-14): Sprint 2 closed on real FIES data (v2 served, leakage audit 6/6); Sprint 7 added (post-plan scope, all DONE); full rehearsal 19/19 and the Section 12 runner (TC-01 to TC-24) re-run on the final build. Every test is listed in `docs/testing/MASTER_TEST_CATALOG.md`.

Revision 6: every item verified on the Docker Compose stack (clean clone, `run_capstone_proofs.sh --full` 16/16, Section 12 plan). "DONE" = implemented, tested and evidenced on branch `claude/clever-albattani-8ikzld`; final acceptance is the review and merge of PR #29.

## Sprint 0 — Integration Readiness Gate
- [x] RDY-01 Placeholder enumeration — **DONE** — evidence: `PLACEHOLDER_ENUMERATION.md`
- [x] RDY-01a Appeals route verification — **DONE** — Route and controller files were empty (not registered); INT-03 scope expanded to register + wire.
- [x] RDY-02 ADR-001 production seed baseline — **DONE** — Approved by PM. 80k baseline selected.
- [x] RDY-03 F1 disposition memo — **DONE** — Opened; transferred to Sprint 2 as ML-01 (`F1_DISPOSITION_MEMO.md`)
- [x] RDY-04 Age-out rule status — **DONE** — Memo filed with statutory basis; E2E-03/E2E-03a pre-scheduled (`AGE_OUT_RULE_STATUS.md`)
- [x] RDY-05 Board, backlog, evidence tree — **DONE** — Folder structure and files committed to repository.

**Sprint 0 Completion Checklist:**
- [x] Placeholder function list recorded verbatim.
- [x] ADR-001 signed with one baseline (80k) and a re-benchmark plan.
- [x] F1 memo filed and transferred to ML-01.
- [x] Age-out rule named (statutory RA 11310) and scheduled as a Sprint 4 item.
- [x] Board and evidence folder committed to the repository.

---

## Sprint 1 — Backend Integration Seams
- INT-01 mlClient 6-feature payload — **DONE** — contract v1.1 (DECISION-009); test_int01_ml_contract.js; ML-down fallback proven by test_int05 EXPECT_ML_DOWN=1.
- INT-02 Mount POST /api/v1/tasks/:id/submit — **DONE** — transactional write, geofence, contract body, content-addressed evidence store.
- INT-03 Mount POST /api/v1/appeals/docket — **DONE** — 15-day window from stored approval; APPEAL_FILED sealed.
- INT-04 Mount POST /api/v1/calamity/toggle — **DONE** — hold decision via hasActiveCalamityMoratorium.
- INT-05 Wire discrepancy.service.js into live assessment — **DONE** — POST /beneficiaries/:id/assess (new contract); MODEL_FLAG_RAISED with contributions.
- INT-06 Verify audit appends on submission and status change — **DONE** — in-transaction sealing; verify-chain at every script end.
- INT-07 Regression matrix for new routes — **DONE** — duplicate, altered bytes, geofence, role, expired JWT on every new route.
- INT-08 Notify Markie; enable sync and appeals UI — **DONE** — sync proven (STR-02); Due Process screen lists the live docket (GET /appeals/docket) and files real appeals (`test_int08_appeals_ui.js`).

---

## Sprint 2 — ML Empirical Grounding (Charles executes, Renz reviews)
- ML-01 Reconcile F1 figures with run metadata — **DONE** — 0.7726 = validation score (reproduced), 0.7771 = untouched test-20k (reconciled figure), 0.7781 not reproducible (superseded). See `evidence/sprint-2/SPRINT2_EVIDENCE.md`.
- ML-02 Train and evaluate E1-E3 on empirical parquet — **DONE** — E1 macro F1 0.6244, E2 0.6055, E3 0.6123 on the 6,232-row empirical holdout (`evidence/sprint-2/sprint2_results.md`).
- ML-03 Evaluate E4-E5 blends against best of E1-E3 — **DONE** — E4a 0.6104, E4b 0.6062, E5 0.5991; E1 selected by the pre-registered rule.
- ML-04 Leakage audit (6 features only; holdout exclusion) — **DONE** — `audit_leakage.py` 6/6 on v2 (`evidence/sprint-2/audit_leakage_v2.txt`); 0 holdout rows in training.
- ML-05 Contract compliance re-verification (schema, latency, SHAP, fallback) — **DONE** — v2 served in Docker; INT-01, INT-05 and E2E-04 pass in the full rehearsal.
- ML-06 v2 artifact, metadata provenance, image rebuild, benchmark — **DONE** — `ml-service/artifacts/v2/` with provenance; `docker-compose.yml` serves v2.
- ML-07 Documentation and threshold disposition update — **DONE** — 0.85 not met and disclosed (v2 0.6244); deck ML and limitations slides.

---

## Sprint 3 — Production Data Baseline
- DAT-01 Execute ADR-001 seed overwrite — **DONE**
- DAT-02 seed-ingest with measured timing — **DONE**
- DAT-03 seed-verify index assertions at volume — **DONE**
- DAT-04 audit_integrity zero orphans, 1:1 invariant — **DONE**
- DAT-05 reset-demo re-verification at baseline — **DONE** — `RESET_BASELINE=1` restores the 80k snapshot: 7.1 / 5.6 / 5.9 s on Docker incl. container start-up (`test_dat05_reset_baseline.sh`). Meets the 10 s DoD.
- DAT-06 Turnover and documentation update to measured values — **DONE**

---

## Sprint 4 — End-to-End and Edge-Case Safeguards
- E2E-01 Full container assessment flow — **DONE**
- E2E-02 Calamity freeze and expiry release test — **DONE**
- E2E-03 Age-out rule test — **DONE** — RA 11310 Sec. 6; '18 and not enrolled' is a named limitation
- E2E-03a Conditional age-out implementation if absent — **DONE**
- E2E-04 Live SHAP in triage drawer — **DONE**
- E2E-05 Standup cadence evidence — **DONE (repository cadence)** — `evidence/sprint-4/E2E05_CADENCE_LOG.md`, derived from git history; the standup-notes table in it is for the team to fill.

---

## Sprint 5 — Adversarial Stress and Tamper Proofing
- STR-01 Tamper block 3 detection — **DONE**
- STR-02 Airplane-mode zero-loss sync — **DONE**
- STR-03 Concurrency and duplicate regression at volume — **DONE**
- STR-04 Evidence capture for defense — **DONE**

---

## Sprint 6 — Defense Packaging
- DEF-01 Script four capstone proofs — **DONE**
- DEF-02 Rehearsal with reset between runs — **DONE** — Docker stack 19/19 on the final build (`evidence/capstone-final/`); earlier 16/16 (`sprint-6/rehearsal-docker/`).
- DEF-03 Clean-clone verification — **DONE** — fresh clone, `docker compose up -d --build`: 5 services up, replset-init exit 0, no manual step (`sprint-6/clean-clone-docker/`). Fixed: one-shot jobs (incl. reset-demo) no longer start on `up`. Foreign-hardware run: you (turnover §6 Step 1).
- DEF-04 Slide deck with reconciled metrics and limitations — **DONE** — 19-slide final deck: v2 metrics, data augmentation, limitations, live-demo test cases D1–D11.
- DEF-05 Documentation closure and change log — **DONE** — change log, traceability, flag register, backlog rev 6, turnover §6 validation guide.

---

## Sprint 7 — Lifecycle Completion and Live UI (post-plan scope)
- UI-01 Live-data read routes and screens — **DONE** — DECISION-010; `insights.test.js` (UT-200); `test_ui_live_data.js`; TC-18.
- UI-02 Phone, tablet, desktop layouts — **DONE** — `test_ui_live_data.js` at 390/834/1440 px; TC-19.
- UI-03 Final look and street map with all households in scope — **DONE** — `GET /insights/map` (DECISION-010 addendum); TC-18.
- DEMO-01 Populated demo dataset — **DONE** — `load_demo_data.sh`: 80,007 households, 627 flagged, all created through the API.
- LIF-01 Report review and hash-checked evidence — **DONE** — DECISION-011; UT-201; TC-20.
- LIF-02 Notice issuance — **DONE** — DECISION-011; UT-201; TC-11.
- LIF-03 Final graduation after the window — **DONE** — DECISION-011; UT-201; TC-21.
- LIF-04 Retention after a field visit — **DONE** — DECISION-012; UT-202; TC-22.
- LIF-05 Appeal hearing outcome — **DONE** — DECISION-012; UT-202; TC-23.
- LIF-06 180-day re-flag cooldown — **DONE** — DECISION-012; UT-202; TC-24.
- UAT-01 UAT instrument — **DONE (sessions pending)** — form, CSV, `score_uat.py` (UT-209..UT-212). Ratings must come from real participants.


# KilosUnlad Integration Backlog (Board of Record)

Owner: Renz Viloria | Revision: 6 | Date: 2026-10-13 (see CHANGELOG_TRACEABILITY.md)
Plan reference: docs/integration/SCRUM_INTEGRATION_PLAN.md (Revision 2)
Legend: DONE | IN REVIEW | OPEN | BLOCKED

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
- ML-02 Train and evaluate E1-E3 on empirical parquet — **BLOCKED (input)** — runner ready; needs `data-pipeline/data/raw/fies_raw.csv` (not in repo; Kaggle unreachable from the build environment).
- ML-03 Evaluate E4-E5 blends against best of E1-E3 — **BLOCKED (input)** — same runner, same input.
- ML-04 Leakage audit (6 features only; holdout exclusion) — **PARTIAL** — audit_leakage.py: F1–F3 PASS on v1; P1–P3 gate v2 provenance.
- ML-05 Contract compliance re-verification (schema, latency, SHAP, fallback) — **READY** — re-verified on v1 in Docker (INT-01, INT-05 PASS); re-run on v2 when it exists.
- ML-06 v2 artifact, metadata provenance, image rebuild, benchmark — **READY** — `sprint2_experiments.py` exports v2 + provenance (passes audit 6/6 on fixture); waits on `data/raw/fies_raw.csv`.
- ML-07 Documentation and threshold disposition update — **PARTIAL** — memo §5–§6 added; reconciled figure 0.7771 (ML-01).

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
- DEF-02 Rehearsal with reset between runs — **DONE** — Docker stack 16/16 (`sprint-6/rehearsal-docker/`); local 15/15.
- DEF-03 Clean-clone verification — **DONE** — fresh clone, `docker compose up -d --build`: 5 services up, replset-init exit 0, no manual step (`sprint-6/clean-clone-docker/`). Fixed: one-shot jobs (incl. reset-demo) no longer start on `up`. Foreign-hardware run: you (turnover §6 Step 1).
- DEF-04 Slide deck with reconciled metrics and limitations — **DONE (v1)** — 14 slides citing only captured evidence, reconciled 0.7771, limitations slide. Update the model slide after v2.
- DEF-05 Documentation closure and change log — **DONE** — change log, traceability, flag register, backlog rev 6, turnover §6 validation guide.
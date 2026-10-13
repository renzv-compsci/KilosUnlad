# KilosUnlad Integration Backlog (Board of Record)

Owner: Renz Viloria | Revision: 5 | Date: 2026-10-12 (see CHANGELOG_TRACEABILITY.md)
Plan reference: docs/integration/SCRUM_INTEGRATION_PLAN.md (Revision 2)
Legend: DONE | IN REVIEW | OPEN | BLOCKED

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
- INT-01 mlClient 6-feature payload — **IN REVIEW** (branch claude/clever-albattani-8ikzld) — contract v1.1 (DECISION-009); test_int01_ml_contract.js; ML-down fallback proven by test_int05 EXPECT_ML_DOWN=1.
- INT-02 Mount POST /api/v1/tasks/:id/submit — **IN REVIEW** (branch claude/clever-albattani-8ikzld) — transactional write, geofence, contract body, content-addressed evidence store.
- INT-03 Mount POST /api/v1/appeals/docket — **IN REVIEW** (branch claude/clever-albattani-8ikzld) — 15-day window from stored approval; APPEAL_FILED sealed.
- INT-04 Mount POST /api/v1/calamity/toggle — **IN REVIEW** (branch claude/clever-albattani-8ikzld) — hold decision via hasActiveCalamityMoratorium.
- INT-05 Wire discrepancy.service.js into live assessment — **IN REVIEW** (branch claude/clever-albattani-8ikzld) — POST /beneficiaries/:id/assess (new contract); MODEL_FLAG_RAISED with contributions.
- INT-06 Verify audit appends on submission and status change — **IN REVIEW** (branch claude/clever-albattani-8ikzld) — in-transaction sealing; verify-chain at every script end.
- INT-07 Regression matrix for new routes — **IN REVIEW** (branch claude/clever-albattani-8ikzld) — duplicate, altered bytes, geofence, role, expired JWT on every new route.
- INT-08 Notify Markie; enable sync and appeals UI — **DONE** — sync proven (STR-02); Due Process screen lists the live docket (GET /appeals/docket) and files real appeals (`test_int08_appeals_ui.js`).

---

## Sprint 2 — ML Empirical Grounding (Charles executes, Renz reviews)
- ML-01 Reconcile F1 figures with run metadata — **DONE** — 0.7726 = validation score (reproduced), 0.7771 = untouched test-20k (reconciled figure), 0.7781 not reproducible (superseded). See `evidence/sprint-2/SPRINT2_EVIDENCE.md`.
- ML-02 Train and evaluate E1-E3 on empirical parquet — **OPEN**
- ML-03 Evaluate E4-E5 blends against best of E1-E3 — **OPEN**
- ML-04 Leakage audit (6 features only; holdout exclusion) — **PARTIAL** — audit_leakage.py: F1–F3 PASS on v1; P1–P3 gate v2 provenance.
- ML-05 Contract compliance re-verification (schema, latency, SHAP, fallback) — **OPEN**
- ML-06 v2 artifact, metadata provenance, image rebuild, benchmark — **READY** — `sprint2_experiments.py` exports v2 + provenance (passes audit 6/6 on fixture); waits on `data/raw/fies_raw.csv`.
- ML-07 Documentation and threshold disposition update — **PARTIAL** — memo §5–§6 added; reconciled figure 0.7771 (ML-01).

---

## Sprint 3 — Production Data Baseline
- DAT-01 Execute ADR-001 seed overwrite — **IN REVIEW** (branch claude/clever-albattani-8ikzld)
- DAT-02 seed-ingest with measured timing — **IN REVIEW** (branch claude/clever-albattani-8ikzld)
- DAT-03 seed-verify index assertions at volume — **IN REVIEW** (branch claude/clever-albattani-8ikzld)
- DAT-04 audit_integrity zero orphans, 1:1 invariant — **IN REVIEW** (branch claude/clever-albattani-8ikzld)
- DAT-05 reset-demo re-verification at baseline — **IN REVIEW** (branch claude/clever-albattani-8ikzld) — reset 4.4–5.0 s; reset + 80k 17.5–19.3 s (over 10 s DoD, recorded).
- DAT-06 Turnover and documentation update to measured values — **IN REVIEW** (branch claude/clever-albattani-8ikzld)

---

## Sprint 4 — End-to-End and Edge-Case Safeguards
- E2E-01 Full container assessment flow — **IN REVIEW** (branch claude/clever-albattani-8ikzld)
- E2E-02 Calamity freeze and expiry release test — **IN REVIEW** (branch claude/clever-albattani-8ikzld)
- E2E-03 Age-out rule test — **IN REVIEW** (branch claude/clever-albattani-8ikzld) — RA 11310 Sec. 6; '18 and not enrolled' is a named limitation
- E2E-03a Conditional age-out implementation if absent — **IN REVIEW** (branch claude/clever-albattani-8ikzld)
- E2E-04 Live SHAP in triage drawer — **IN REVIEW** (branch claude/clever-albattani-8ikzld)
- E2E-05 Standup cadence evidence — **OPEN** (team records; not producible by code)

---

## Sprint 5 — Adversarial Stress and Tamper Proofing
- STR-01 Tamper block 3 detection — **IN REVIEW** (branch claude/clever-albattani-8ikzld)
- STR-02 Airplane-mode zero-loss sync — **IN REVIEW** (branch claude/clever-albattani-8ikzld)
- STR-03 Concurrency and duplicate regression at volume — **IN REVIEW** (branch claude/clever-albattani-8ikzld)
- STR-04 Evidence capture for defense — **IN REVIEW** (branch claude/clever-albattani-8ikzld)

---

## Sprint 6 — Defense Packaging
- DEF-01 Script four capstone proofs — **IN REVIEW** (branch claude/clever-albattani-8ikzld)
- DEF-02 Rehearsal with reset between runs — **IN REVIEW** (branch claude/clever-albattani-8ikzld) — local rehearsal 15/15; Docker-stack run pending
- DEF-03 Clean-clone verification — **PARTIAL** — clean clone: all suites/builds pass, compose valid; Docker boot pending
- DEF-04 Slide deck with reconciled metrics and limitations — **BLOCKED** — needs ML-01 reconciled F1 and v2 provenance
- DEF-05 Documentation closure and change log — **IN REVIEW** (branch claude/clever-albattani-8ikzld)
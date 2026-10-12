# KilosUnlad Integration Backlog (Board of Record)

Owner: Renz Viloria | Revision: 3 | Date: 2026-10-12
Plan reference: docs/integration/SCRUM_INTEGRATION_PLAN.md (Revision 2)
Legend: DONE | IN REVIEW | OPEN | BLOCKED

## Sprint 0 — Integration Readiness Gate
- [x] RDY-01 Placeholder enumeration — **DONE** — evidence: `PLACEHOLDER_ENUMERATION.md`
- [ ] RDY-01a Appeals route verification — **OPEN** — Sprint 1 pre-check (awaiting PM grep output)
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
- INT-01 mlClient 6-feature payload — **OPEN** — acceptance: live prediction plus SHAP through backend; fallback tagged when ML down.
- INT-02 Mount POST /api/v1/tasks/:id/submit — **OPEN** — acceptance: multipart accepted; 422 EVIDENCE_HASH_MISMATCH on altered bytes; geofence enforced.
- INT-03 Mount POST /api/v1/appeals/docket — **OPEN** (scope pending RDY-01a) — acceptance: notice created, 15-day countdown starts.
- INT-04 Mount POST /api/v1/calamity/toggle — **OPEN** — acceptance: hold decision for matching declared zone.
- INT-05 Wire discrepancy.service.js into live assessment — **OPEN** — acceptance: score persisted with contributions.
- INT-06 Verify audit.middleware appends on submission and status change — **OPEN** — acceptance: verify-chain passes expanded range.
- INT-07 Regression matrix for new routes — **OPEN** — acceptance: all rejection paths write nothing.
- INT-08 Notify Markie; enable sync and appeals UI — **OPEN** — acceptance: client flags flipped against mounted routes.

---

## Sprint 2 — ML Empirical Grounding (Charles executes, Renz reviews)
- ML-01 Reconcile F1 figures with run metadata — **OPEN**
- ML-02 Train and evaluate E1-E3 on empirical parquet — **OPEN**
- ML-03 Evaluate E4-E5 blends against best of E1-E3 — **OPEN**
- ML-04 Leakage audit (6 features only; holdout exclusion) — **OPEN**
- ML-05 Contract compliance re-verification (schema, latency, SHAP, fallback) — **OPEN**
- ML-06 v2 artifact, metadata provenance, image rebuild, benchmark — **OPEN**
- ML-07 Documentation and threshold disposition update — **OPEN**

---

## Sprint 3 — Production Data Baseline
- DAT-01 Execute ADR-001 seed overwrite — **OPEN**
- DAT-02 seed-ingest with measured timing — **OPEN**
- DAT-03 seed-verify index assertions at volume — **OPEN**
- DAT-04 audit_integrity zero orphans, 1:1 invariant — **OPEN**
- DAT-05 reset-demo re-verification at baseline — **OPEN**
- DAT-06 Turnover and documentation update to measured values — **OPEN**

---

## Sprint 4 — End-to-End and Edge-Case Safeguards
- E2E-01 Full container assessment flow — **OPEN**
- E2E-02 Calamity freeze and expiry release test — **OPEN**
- E2E-03 Age-out rule test — **OPEN** (see AGE_OUT_RULE_STATUS.md)
- E2E-03a Conditional age-out implementation if absent — **OPEN** (fallback)
- E2E-04 Live SHAP in triage drawer — **OPEN**
- E2E-05 Standup cadence evidence — **OPEN**

---

## Sprint 5 — Adversarial Stress and Tamper Proofing
- STR-01 Tamper block 3 detection — **OPEN**
- STR-02 Airplane-mode zero-loss sync — **OPEN**
- STR-03 Concurrency and duplicate regression at volume — **OPEN**
- STR-04 Evidence capture for defense — **OPEN**

---

## Sprint 6 — Defense Packaging
- DEF-01 Script four capstone proofs — **OPEN**
- DEF-02 Rehearsal with reset between runs — **OPEN**
- DEF-03 Clean-clone verification — **OPEN**
- DEF-04 Slide deck with reconciled metrics and limitations — **OPEN**
- DEF-05 Documentation closure and change log — **OPEN**
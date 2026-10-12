# F1 Disposition Memo (RDY-03, transferred to Sprint 2 as ML-01)

Status: OPENED 2026-10-12
Owners: Renz Viloria (PM), Charles Cabatian (ML Lead)

## 1. Recorded Figures (conflict)
- MASTER_TURNOVER.md Domain 4.1: LightGBM Macro F1 = 0.7726, benchmarked on the
  70,000-record synthetic partition.
- PM statement during sprint planning (2026-10-12): Macro F1 = 0.7781.
- CHARLES_ML.md Task 2.2 DoD: Macro F1 >= 0.85.
Classification: Unverified conflict. Neither figure carries attached run metadata
(seed, split hashes, library versions). Requires verification against model_metadata.json.

## 2. Root-Cause Analysis (Engineering Inference)
The benchmark partition is synthetic. Synthetic labels derive from the generator's
latent-wealth formula and tier thresholds, so tree ensembles can recover near-deterministic
boundaries on such data. Metrics on synthetic holdouts therefore overstate generalization
to real households. The empirical matrix features_swdi_clean.parquet (41,544 PSA FIES rows
with income-derived SWDI labels) was not used for training, per Domain 4.1's own statement
that the comparison ran on the synthetic partition.

## 3. Disposition (binding protocol for Sprint 2)
1. Reconcile to a single figure with full run metadata; record it in model_metadata.json (ML-01).
2. Train baseline E1 on the empirical parquet only (stratified 70/15/15, seed 42).
3. Evaluate all candidates E1-E5 on one identical empirical holdout. Pre-registered selection
   criterion: Macro F1 on the empirical holdout; tie-break: minimum per-class F1.
4. Leakage audit: trained feature set must equal the frozen 6-feature inference vector;
   empirical test rows must be absent from every training blend (ML-04).
5. Outcome is either a v2 artifact with improved empirical metrics, or a justified-threshold
   memo with per-class analysis. Silent acceptance is prohibited.

## 4. Communication Rule
Until reconciliation completes, no slide, document, or verbal claim may cite an F1 figure
without the qualifier: "synthetic-partition benchmark, pending empirical re-evaluation (Sprint 2)".
## 5. Independent Measurement and ML-04 Gate (Renz, 2026-10-12)
Evidence class: measured, reproducible. This is not the reconciliation itself (ML-01 remains Charles's).
- **Live service measurement:** the deployed `lightgbm_swdi_v1.joblib`, called through the ML service,
  scored 3,000 households sampled from the 20k synthetic QA partition (random seed 42).
  Result: Macro F1 **0.766**; per-class F1 0.716 / 0.807 / 0.776 (Levels 1/2/3).
  This agrees with the turnover's 0.7726 within sampling variation. It is still a
  **synthetic-partition benchmark, pending empirical re-evaluation (Sprint 2)** and carries the
  same qualifier (`docs/integration/evidence/sprint-3/SPRINT3_EVIDENCE.md`).
- **ML-04 audit (`ml-service/scripts/audit_leakage.py`) on v1:** F1–F3 PASS. The fitted model and
  metadata use exactly the frozen ml-swdi-inference v1.1 vector, in order, with classes [1, 2, 3].
  P1–P3 FAIL: v1 metadata has no split hashes, no empirical-holdout exclusion assertion, and no
  seed, library versions or row counts. The script exits non-zero until ML-06 writes these fields,
  so it serves as the v2 release gate.

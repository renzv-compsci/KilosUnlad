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
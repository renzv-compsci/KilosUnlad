# DECISION-009: ML Feature Vector v1.1 and Live Assessment Contracts
**Author:** Renz Viloria (PM / Lead Integrator), drafted with the Sprint 1 integration work
**Status:** ACCEPTED
**Date Created:** 2026-10-12
**Date Resolved:** 2026-10-12

---

## 1. Context & Problem Statement
1. `docs/contracts/ml/ml-swdi-inference.json` v1.0 described the old vector (`dependents_ratio`,
   `wall_score`, `roof_score`, `water_access_level`). MASTER_TURNOVER (Critical Notice; Domain 6
   Step 1), the backend `mlClient` and the ML service all used the 6-feature PMT vector. Seven
   `mlClient` tests failed against the stale file, and no stored record could feed the model.
2. INT-05 (wire `discrepancy.service.js` into live assessment) and E2E-01 (client → gateway →
   backend → ML) need an HTTP trigger. No contract defined one.

## 2. Options Considered
* **ML vector:** (A) revise the contract to the turnover vector; (B) keep the file frozen and leave
  INT-01/INT-05 blocked; (C) derive the new features from old fields, which would invent values for
  formal employment, remittance and appliance density.
* **Trigger:** (A) a new route with a new contract file; (B) an internal batch job only, which
  cannot demonstrate E2E-01 from the client.

## 3. Developer's Recommendation
Option A in both cases. Existing contract shapes stay untouched except the ML request, whose
revision the turnover already mandates.

## 4. Official PM / Tech Lead Resolution (Filled by Renz)

* [x] Decision: ACCEPTED (both Option A)
* `ml-swdi-inference.json` → **v1.1.0**: request `{household_id, household_size, demographics{6 PMT}}`.
  Response and error shapes unchanged. The v1.0 request is rejected with 422.
* New contracts: `admin-risk-assessment.json` (POST `/beneficiaries/:household_id/assess`, v1.1.0
  adds `children_eligibility`) and `admin-assessment-explanation.json` (GET
  `/beneficiaries/:household_id/assessment`, the sealed SHAP source for the triage drawer).
* The 6 PMT features are read from stored `demographics` with `lean()`. The Beneficiary model is
  unchanged (Iron Law 2), and ingestion stores the features beside the declared fields
  (`seed_mapping.py`).
* Indicator rules for `calculateRiskScore`: power > 200 kWh; water > 25 cu.m; telecom contract
  starts with `POSTPAID`; vehicle = the generator's `asset_counting_mask`. Weights unchanged.

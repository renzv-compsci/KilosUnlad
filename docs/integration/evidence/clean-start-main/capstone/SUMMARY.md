# Capstone rehearsal 20261013T163035Z

| # | Scenario | Script | Result | Seconds |
| --- | --- | --- | --- | --- |
| 1 | Proof 1: Graduation Drift (assess -> triage -> dispatch -> report -> audit, via gateway) | `test_e2e01_full_chain.js` | PASS | 5.6 |
| 2 | Proof 2: Offline Field Visit (airplane mode, zero-loss sync) | `test_str02_airplane_sync.js` | PASS | 13.1 |
| 3 | Proof 3: Sangla-ATM Syndicate (85/100) | `test_proof3_sangla_atm.js` | PASS | 3.8 |
| 4 | Proof 4: Audit Proof (tamper block 3 detected) | `test_str01_tamper_detection.js` | PASS | 5.4 |
| 5 | INT-01 ML contract v1.1 | `test_int01_ml_contract.js` | PASS | 4.5 |
| 6 | INT-05 risk assessment | `test_int05_risk_assessment.js` | PASS | 4.0 |
| 7 | INT-02 field submission | `test_int02_submission.js` | PASS | 4.8 |
| 8 | INT-03 appeals docket | `test_int03_appeals_docket.js` | PASS | 5.0 |
| 9 | INT-04 calamity toggle | `test_int04_calamity_toggle.js` | PASS | 4.2 |
| 10 | INT-08 due process docket (API + browser) | `test_int08_appeals_ui.js` | PASS | 6.6 |
| 11 | E2E-02 calamity freeze | `test_e2e02_calamity_freeze.js` | PASS | 13.6 |
| 12 | E2E-03 age-out (RA 11310) | `test_e2e03_age_out.js` | FAIL | 5.0 |
| 13 | E2E-04 SHAP drawer (API) | `test_e2e04_shap_drawer.js` | PASS | 3.7 |
| 14 | E2E-04 SHAP drawer (browser) | `test_e2e04_drawer_ui.js` | PASS | 5.3 |
| 15 | DAT-01 seed conformance (80k) | `test_dat01_seed_conformance.js` | PASS | 54.7 |
| 16 | STR-03 concurrency at volume | `test_str03_concurrency.js` | PASS | 19.6 |

15 of 16 scenarios passed.

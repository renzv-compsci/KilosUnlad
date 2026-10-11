# ML Feature Dictionary & Schema Handoff

**Target Audience:** Charles Cabatian (ML Lead)
**Source Data:** `data-pipeline/partitions/` (Generated via `scripts/stratified_partition.py`)

## 1. Target Variable
*   **Column:** `true_swdi_level`
*   **Type:** Categorical (Ordinal)
*   **Values:** `1` (Survival), `2` (Subsistence), `3` (Self-Sufficiency)
*   **Note:** Use this as the `y` target for LightGBM classification. Do not use `enrolled_level` (which contains intentional label noise for robustness testing).

## 2. Columns to DROP (PII & Administrative)
These columns must be excluded from the feature matrix `X` to prevent data leakage and privacy violations:
*   `household_id`
*   `philsys_id`
*   `landbank_card_pan`
*   `names` (and all nested name fields)
*   `gps_coordinates` (and all nested lat/lng fields)
*   `audit_cohort` (Internal generator tag)

## 3. The 6 Core Proxy Features (PMT Inputs)
These are the exact features defined in the frozen contract `docs/contracts/ml/ml-swdi-inference.json`. Feed these into the LightGBM model:

| Column Name | Data Type | Description |
| :--- | :--- | :--- |
| `head_education_level` | Integer (0-3) | 0=None, 1=Elementary, 2=High School, 3=College+ |
| `head_formal_employment` | Binary (0/1) | 1 if engaged in regularized work |
| `remittance_income_flag` | Binary (0/1) | 1 if household receives OFW remittance |
| `housing_material_score` | Integer (1-3) | 1=Light/Salvage, 2=Mixed, 3=Strong/Concrete |
| `appliance_density_index` | Float (0.0-3.0) | `appliance_count / (household_size + 0.1)`, capped at 3.0 |
| `dependency_ratio` | Float (>0.0) | Dependents (<15, >65) / Working Age Adults |

## 4. External Registry Features (For Tier 2 Rule Engine Context)
While not strictly part of the 6-feature ML contract, these are available in the dataset for feature engineering or Tier 2 deterministic rule cross-validation:
*   `power.kwh_monthly` (Float)
*   `water.cubic_meters_monthly` (Float)
*   `telecom.plan_type` (Categorical: NONE, PREPAID_MOBILE, POSTPAID_FIBER)
*   `vehicle.category` (Categorical: NONE, MOTORCYCLE, FOUR_WHEEL_PASSENGER, PUBLIC_UTILITY_JEEPNEY)
*   `vehicle.ownership_status` (Categorical: OWNED_OUTRIGHT, OWNED_WITH_ENCUMBRANCE, OPERATOR_NOT_OWNER, REGISTERED_UNDER_OTHER)
*   `vehicle.net_monthly_transport_income` (Float: Can be negative due to loan amortization)

## 5. Baseline Empirical Data
For baseline comparison, use the real PSA FIES microdata located at:
`data-pipeline/seeds/features_swdi_clean.parquet` (41,544 rows, clean, no synthetic noise).
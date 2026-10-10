# Conceptual Data Model (CDM): FIES to Synthetic 4Ps Mapping
**Document Status:** Finalized
**Last Updated:** 2026-10-09
**Author:** Renz Viloria
**Reference:** `ml-swdi-inference.json` (ML Contract), `beneficiary.json` (DB Contract)

## 1. Overview
This document defines the mapping between the real Philippine Statistics Authority (PSA) Family Income and Expenditure Survey (FIES) 2015 microdata and the synthetic features used in the KilosUnlad Machine Learning and Rule Engine pipelines. It serves as the single source of truth for feature engineering and synthetic data generation.

## 2. ML Feature Mapping (Proxy Means Test)
The following table maps real FIES variables to the 6 standardized features required by the LightGBM model. These features are frozen by the interface contract.

| Standardized ML Feature | Source FIES Column(s) | Transformation Logic |
| :--- | :--- | :--- |
| `head_education_level` | `Household Head Highest Grade Completed` | Ordinal mapping: 0=None, 1=Elementary (1-6), 2=High School (7-12), 3=College+ (13+). |
| `head_formal_employment` | `Total Household Income from Salary/Wages` | Binary flag: 1 if income > 0, else 0. |
| `remittance_income_flag` | `Total Income from Cash/Payment from Abroad` | Binary flag: 1 if value > 0, else 0. |
| `housing_material_score` | `Type of Roof`, `Type of Walls` | Composite ordinal score (1-3): 1=Light/Salvaged, 2=Wood/Mixed, 3=Concrete/Strong. |
| `appliance_density_index` | `Number of Television`, `Number of Refrigerator/Freezer`, `Number of Washing Machine` | Normalized count: Sum of appliances / Total Family Members. Clamped [0, 3]. |
| `dependency_ratio` | `Total Number of Family members`, `Members with age less than 5 year old`, `Members with age 5 - 17 years old` | Formula: (Members <18 + Members >60) / Working Adults (18-60). |

## 3. SWDI Tier Ground Truth Logic
The ground truth labels (`swdi_level_true`) are derived from Per Capita Monthly Income mapped against the official PSA poverty thresholds for Region IV-A (Laguna).

1. **Calculate Per Capita Monthly Income:** 
   `Total Household Income / (Total Number of Family members * 12)`
2. **Apply Thresholds (2015 Laguna Baseline):**
   * **Level 1 (Survival):** Per Capita Income < Food Poverty Threshold (approx. ₱1,100/month).
   * **Level 2 (Subsistence):** Food Threshold <= Per Capita Income < Overall Poverty Threshold (approx. ₱1,600/month).
   * **Level 3 (Self-Sufficiency):** Per Capita Income >= Overall Poverty Threshold AND `housing_material_score` >= 2.

## 4. External Record & Vehicle Layer Modeling
These variables are modeled as external registry records (Utility, LTO, Telecom) and are NOT sent to the ML model. They are evaluated by the Deterministic Rule Engine (`discrepancy.service.js`) to detect factual discrepancies.

| External Registry | Synthetic Generation Logic | Rule Engine Trigger |
| :--- | :--- | :--- |
| **Electricity (Meralco)** | LogNormal distribution based on Wealth Score. | `> 200 kWh` triggers Lifeline Breach (RA 11552). |
| **Water (Maynilad/Manila Water)** | Normal distribution based on Household Size and Wealth Score. | `> 25 cu.m/month` triggers Utility Inconsistency (incompatible with Level 1 Survival). |
| **LTO Vehicle Registry** | Categorical assignment based on Wealth Score. <br><br> **Generated Fields:** <br> • `plate_number` (e.g., NAB 1234) <br> • `mv_file_number` (Unique LTO ID) <br> • `or_cr_number` (Proof of Ownership) <br> • `registration_year` <br> • `vehicle_type` (Private/Commercial) | `FOUR_WHEEL_PASSENGER` triggers Asset Inconsistency. <br> `MOTORCYCLE` requires HITL field verification to check if it is a productive tool (e.g., MoveIt/MTOP). |
| **Telecom (Fiber/Postpaid)** | Binary flag based on Wealth Score. | `True` triggers Postpaid Contract flag (RA 9510), indicating creditworthiness inconsistent with Level 1. |

*Note: `NONE` means no external record is generated for that registry to prevent database bloat and maintain realistic sparsity.*

## 5. Conditional Synthetic Generation for Missing Structural Variables
The raw FIES microdata does not contain explicit columns for exact floor area (sqm) or legal tenure status (Owner vs. Renter). To prevent contaminating the empirical baseline with fake data, these variables are **not** added to the raw CSV. Instead, they are generated as **Derived Synthetic Variables** during the Task 2.3 synthetic augmentation phase.

To avoid the engineering fallacy of assuming "Concrete = Owner" (which is false in urban rental markets like Calamba), the generator uses a **Multivariate Probability Model**:
- **Inputs:** `housing_material_score`, `URBAN_RURAL` classification, and `Total Household Income`.
- **Logic:** 
  - Urban households have a higher baseline probability of renting concrete structures.
  - Rural households have a higher baseline probability of owner-occupancy.
  - Income thresholds further adjust these probabilities.
- **Outputs:** `floor_area_sqm` (Normal distribution based on wealth/size) and `tenure_status` (Categorical: Owner, Renter, Informal Settler).
- **Usage:** These variables are fed exclusively to the Deterministic Rule Engine (Tier 2) to trigger discrepancies (e.g., a Level 1 household in a >100 sqm owned home), and are **never** sent to the LightGBM ML model.

## 6. Noise Injection Architecture
To prevent ML memorization and simulate real-world registry imperfections, the following noise parameters are applied during synthetic generation:

* **Label Noise (3-5%):** Randomly flip `swdi_level_enrolled` to simulate graduation lag or data entry errors.
* **Feature Noise (8-12%):** Nullify or jitter external record values (e.g., missing electricity readings).
* **Cohort Ambiguity (5-7%):** Place households near SWDI tier boundaries (Latent Wealth Score between 30-40 or 65-75).
* **Temporal Noise (4-6%):** Age external records by 6-18 months to simulate registry sync lag.
* **Geographic Noise:** Jitter GPS coordinates by 50-200 meters to test the 250m geofence tolerance.
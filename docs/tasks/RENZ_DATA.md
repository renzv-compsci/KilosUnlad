# Engineering Task Roadmap: Project Management, Data Pipeline & Architecture
**Lead:** Renz Viloria  
**Primary Domain:** Project Management, `/data-pipeline/`, UI Wireframing, Architecture Governance  
**Core Technologies:** Python 3.10, NumPy, Pandas, Faker, Docker Compose, Git  

---

## Phase 1: Repository Setup, Governance & Data Modeling Foundation (Sprint Block 1)
*Goal: Set up the monorepo foundation, freeze contracts, supply Markie with UI wireframes, and define the conceptual data model for the 100k scale.*

- [x] **Task 1.1: Monorepo & Git Governance Setup** *(COMPLETED)*
  - Initialize the Git repository with the directory skeleton from `docs/PROJECT_STRUCTURE.md`.
  - Commit the 8 frozen data contracts into `/docs/contracts/`.
  - Configure root `.env.example`, `.gitignore`, and `docker-compose.yml`.
  - *DoD:* Team members can clone the repo and run `docker-compose up` without syntax errors.

- [x] **Task 1.2: Design UI Wireframes for Markie** *(COMPLETED)*
  - Deliver layout mockups for:
    1. Admin Triage Queue (showing Risk Score meters and trigger badges).
    2. Mobile Field Checklist (optimized for single-hand tablet use).
    3. COA Audit Chain Viewer.
  - *DoD:* Markie has clear visual designs to follow for Component Phase 1.

- [ ] **Task 1.3: Sourcing Real PSA FIES Microdata**
  - Download the official Kaggle Philippine Family Income and Expenditure Survey (41,544 rows).
  - Store raw data in `/data-pipeline/data/raw/fies_raw.csv` (git-ignored).
  - *DoD:* Dataset loaded and verified in Jupyter notebook environment.

- [ ] **Task 1.4: Conceptual Data Mapping (CDM) & Vehicle/External Record Modeling**
  - Draft the CDM document mapping real FIES variables to synthetic 4Ps administrative variables.
  - Define the LTO Vehicle Validation layer as an external record payload (not a database schema change): `NONE`, `MOTORCYCLE`, `FOUR_WHEEL_PASSENGER`, `FOUR_WHEEL_COMMERCIAL`.
  - Define the 5 noise injection points (Label, Feature, Cohort, Temporal, Geographic).
  - *DoD:* CDM document reviewed; vehicle categories and noise strategies mathematically defined without altering Dustin's finalized Mongoose schemas.

**Required Reading & Academic Grounding (Phase 1):**
- *PSA FIES 2021 Technical Documentation* (Survey methodology, sampling weights).
- *Republic Act No. 11310 (4Ps Act)* (Legal basis for 7-year cap, conditionalities).
- *Republic Act No. 4136 (Land Transportation and Traffic Code)* (Legal basis for LTO vehicle registration and categories).
- *Filmer, D. & Pritchett, L. (2001). "Estimating Wealth Effects Without Expenditure Data—Or Tears." Demography.* (Foundational Proxy Means Testing methodology).

*Standup Deliverable (Phase 1):* "Repository initialized, contracts frozen, wireframes handed to Markie, PSA raw data loaded, and 100k Conceptual Data Model finalized."

---

## Phase 2: PSA FIES Pipeline, Synthetic Augmentation & Noise Architecture (Sprint Block 2)
*Goal: Clean real PSA FIES data, perform EDA, engineer SWDI features, and generate the 100,000-record master dataset with realistic noise.*

- [ ] **Task 2.1: Data Cleaning & FIES Exploratory Data Analysis (EDA)**
  - Path: `/data-pipeline/notebooks/01_fies_cleaning_and_eda.ipynb`
  - Filter columns, impute missing values, and encode Roof and Wall materials into ordinal scores (1 to 3).
  - Plot correlation heatmaps between appliance counts and total household income.
  - *DoD:* Clean notebook exported with correlation plots saved to `/docs/architecture/eda_correlations.png`.

- [ ] **Task 2.2: SWDI Feature Engineering & Poverty Threshold Mapping**
  - Path: `/data-pipeline/notebooks/02_swdi_feature_engineering.ipynb`
  - Calculate Per Capita Monthly Income and Dependency Ratio.
  - Assign ground-truth SWDI tiers (Level 1, 2, 3) using official PSA Laguna poverty thresholds.
  - Export training matrix: `/data-pipeline/seeds/features_swdi_clean.parquet`.
  - *DoD:* File handed to Charles for LightGBM model training.

- [ ] **Task 2.3: Mathematical Formulation Engine**
  - Path: `/data-pipeline/generator/distributions.py` & `latent_wealth.py`
  - Implement vectorized NumPy formulas for Household Size (Poisson), Dependency Ratio, Electricity (LogNormal based on RA 11552), and Continuous Latent Wealth Score ($W_i$).
  - *DoD:* All formulas produce statistically valid distributions; unit tests pass for edge cases.

- [ ] **Task 2.4: Synthetic Operational Augmentation (100,000 Scale + Vehicle Layer)**
  - Path: `/data-pipeline/generator/generator.py` & `external_records.py`
  - Sample 100,000 households preserving empirical distributions.
  - Add Filipino names, Laguna GPS coordinates, PhilSys IDs, and LandBank PANs.
  - Generate LTO Vehicle external records using the defined categories (`MOTORCYCLE` with `productive_use_flag`, `FOUR_WHEEL_PASSENGER`, etc.). *Note: `NONE` means no external record is generated to prevent DB bloat.*
  - Inject the 4 operational audit cohorts (60% Compliant, 15% Graduation, 10% Asset, 15% Sinking).
  - *DoD:* 100,000 master records generated offline with correct cohort proportions and deterministic seed (42).

- [ ] **Task 2.5: Noise Injection Architecture**
  - Path: `/data-pipeline/generator/noise_engine.py`
  - Inject controlled noise to prevent ML memorization:
    1. *Label Noise (3-5%):* Simulate graduation lag/data entry errors.
    2. *Feature Noise (8-12%):* Missing/inaccurate utility readings.
    3. *Cohort Ambiguity (5-7%):* Borderline $W_i$ households.
    4. *Temporal Noise (4-6%):* Stale registry records.
    5. *Geographic Noise:* 50-200m GPS jitter for geofence testing.
  - *DoD:* Noise manifest generated; noise distribution statistically validated; no noise type exceeds its defined ceiling.

**Required Reading & Academic Grounding (Phase 2):**
- *Republic Act No. 11552 (Lifeline Rate Act)* (Electricity threshold grounding).
- *Natarajan, N., et al. (2013). "Learning with Noisy Labels." NeurIPS.* (Theoretical basis for label noise injection).
- *Shorten, C. & Khoshgoftaar, T. (2019). "A Survey on Image Data Augmentation for Deep Learning." Journal of Big Data.* (Data augmentation as regularization to prevent memorization).

*Standup Deliverable (Phase 2):* "PSA data cleaned; 100,000 synthetic seed records generated offline with realistic cohorts, LTO vehicle records, and mathematically controlled noise."

---

## Phase 3: Stratified Partitioning, ML Handoff & Offline Export (Sprint Block 3)
*Goal: Split the 100k dataset into App/Test/Validation partitions and export deliverables without altering the live database architecture.*

- [ ] **Task 3.1: Stratified Partition Engine**
  - Path: `/data-pipeline/generator/partition_engine.py`
  - Apply a stratified split across the 100,000 master records:
    - **Application Partition (80,000):** 70,000 Training Pool + 10,000 Validation Pool.
    - **Testing Partition (20,000):** Final holdout for QA and adversarial testing.
  - Stratify by Cohort, SWDI level, Geographic cluster, and `source_fies_id` (to prevent data leakage).
  - *DoD:* Partition manifest generated with exact counts; distribution equivalence validated.

- [ ] **Task 3.2: ML Feature Export for Charles**
  - Export Parquet files for the ML microservice:
    - `train_features_70k.parquet`
    - `validation_features_10k.parquet`
    - `test_features_20k.parquet`
  - *DoD:* Files handed to Charles; schema validated against the `ml-swdi-inference.json` frozen contract.

- [ ] **Task 3.3: Database-Ready Seed Export (Offline Isolation)**
  - Export JSON files compatible with Dustin's *existing* Mongoose schemas:
    - `seed_beneficiaries_app_80k.json` & `seed_external_records_app_80k.json`
    - `seed_beneficiaries_test_20k.json` & `seed_external_records_test_20k.json`
  - **CRITICAL CONSTRAINT:** Do NOT overwrite existing `seed_beneficiaries.json`. Do NOT trigger automatic ingestion. Do NOT require schema changes.
  - *DoD:* JSON files pass offline schema validation; referential integrity verified; Dustin's live DB remains untouched.

- [ ] **Task 3.4: Partition Quality & Leakage Validation Report**
  - Generate reports verifying exact counts, cohort preservation, and zero `source_fies_id` leakage across partitions.
  - *DoD:* Reports generated and reviewed in `/data-pipeline/reports/`.

**Required Reading & Academic Grounding (Phase 3):**
- *Kohavi, R. (1995). "A Study of Cross-Validation and Bootstrap for Accuracy Estimation and Model Selection." IJCAI.* (Proper methodology for train/validation/test splitting).
- *Hastie, T., et al. (2009). The Elements of Statistical Learning.* (ML evaluation methodology; bias-variance tradeoff).

*Standup Deliverable (Phase 3):* "100k dataset successfully partitioned (80k App / 20k Test); ML matrices handed to Charles; offline DB seeds exported without altering Dustin's architecture."

---

## Phase 4: Sprint Facilitation & Cross-Domain Integration (Sprint Block 4)
*Goal: Ensure services connect cleanly, resolve cross-domain blockers, and define ML acceptance criteria.*

- [ ] **Task 4.1: Facilitate Daily Stand-Up Meetings**
  - Run daily 15-minute syncs using the 3 standard questions:
    1. *What contract task did you finish yesterday?*
    2. *What contract task are you shipping today?*
    3. *Are you blocked by any contract mismatches?*

- [ ] **Task 4.2: Verify End-to-End Container Network Integration**
  - Test communication flow: Client (3000) $\to$ Gateway (80/443) $\to$ Backend (5000) $\to$ ML (8000) & Database (27017).
  - *DoD:* An assessment submitted on Markie's frontend successfully triggers Mae's backend, invokes Charles's model, writes to Dustin's database, and generates an audit log entry.

- [ ] **Task 4.3: ML Model Acceptance Gate Definition**
  - Coordinate with Charles to define strict acceptance metrics before deployment:
    - Macro F1 score, Precision/Recall per SWDI level.
    - False positive rate for compliant households.
    - Inference latency (must satisfy the 2500 ms ML client deadline).
  - *DoD:* Acceptance criteria documented in `/docs/architecture/ml_acceptance_criteria.md`.

*Standup Deliverable (Phase 4):* "End-to-end integration verified: flagged household dispatches a task, triggers appeal timer, and ML acceptance gates are defined."

---

## Phase 5: Stress Testing, Adversarial Validation & Tamper Proof (Sprint Block 5)
*Goal: Conduct adversarial testing on database tampering, offline sync, and noise robustness.*

- [ ] **Task 5.1: Adversarial Tampering Verification**
  - Coordinate with Dustin to manually alter a database record via `mongosh`.
  - Run Mae's chain verification endpoint and verify the broken block is caught.
  - *DoD:* Tamper detection successfully verified and documented for defense slides.

- [ ] **Task 5.2: Tablet Airplane Mode Stress Test**
  - Coordinate with Markie to test field report submissions in Airplane Mode.
  - *DoD:* Zero data loss; reports sync cleanly upon reconnection.

- [ ] **Task 5.3: Noise Robustness Validation**
  - Verify that Charles's ML model's performance degrades gracefully under the injected noise levels (comparing clean vs. noisy data metrics).
  - *DoD:* Noise robustness report generated; model does not catastrophically fail under realistic registry noise.

*Standup Deliverable (Phase 5):* "Stress tests complete: database tampering detected, offline sync verified, and ML model proven robust against injected data noise."

---

## Phase 6: Presentation Deck, Live Demo Script & Academic Sync (Sprint Block 6)
*Goal: Prepare presentation assets, live demo workflows, defense slide decks, and update the 100+ page academic documentation.*

- [ ] **Task 6.1: Live Defense Demo Scripting**
  - Script the 4 live demonstration scenarios:
    1. **The Graduation Catch:** An enrolled Level 1 family with high power usage and a `FOUR_WHEEL_PASSENGER` LTO record is flagged by the AI and rule engine.
    2. **The Field Investigation:** Social worker visits the home on an offline tablet, confirms the `MOTORCYCLE` is a MoveIt delivery tool (`productive_use_flag: true`), and checks the physical LandBank ATM card.
    3. **The Sangla-ATM Catch:** System detects a 2:00 AM batch-swiping cluster across 12 cards, generating a card-pawning alert.
    4. **The Forensic Shield:** Live demonstration of an admin modifying a database record and the COA audit tool immediately detecting the broken hash chain.

- [ ] **Task 6.2: Final Capstone Presentation Slide Deck**
  - Build presentation slides covering:
    - The Real-World Problem (4Ps graduation lag, slow checks, *Sangla-ATM*).
    - Philippine Legal Grounding (RA 11310, RA 11552, RA 10173, RA 4136).
    - The Empirical Pipeline (41,000 real PSA FIES $\to$ 100,000 synthetic operational records with noise injection).
    - System Architecture & Boundaries (MERN + Python FastAPI).
    - Live System Demonstration.

- [ ] **Task 6.3: Academic Documentation Sync**
  - Update the 100+ page Software Engineering document to reflect:
    - The 100k pipeline and 80/20 partition strategy.
    - The Noise Injection Architecture and ML robustness.
    - The Vehicle Validation layer and LTO external record modeling.
  - *DoD:* Documentation traceability matrix updated; no contradictions between sections.

- [ ] **Task 6.4: Production Clean-Clone Verification**
  - Run a clean clone on a fresh machine:
    ```bash
    git clone <repo-url>
    cd kilos-unlad
    docker-compose up --build
    ```
  - *DoD:* All 5 containers boot with zero manual intervention; default admin can log in immediately.

*Standup Deliverable (Phase 6):* "Presentation deck, live demo, and 100+ page academic documentation fully synced and rehearsed; system fully ready for capstone defense."
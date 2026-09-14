# Engineering Task Roadmap: Project Management, Data Pipeline & Architecture
**Lead:** Renz Viloria  
**Primary Domain:** Project Management, `/data-pipeline/`, UI Wireframing, Architecture Governance  
**Core Technologies:** Python 3.10, NumPy, Pandas, Faker, Docker Compose, Git  

---

## Phase 1: Repository Setup, Governance & Wireframes (Days 1–3)
*Goal: Set up the monorepo foundation, freeze contracts, and supply Markie with UI wireframes.*

- [ ] **Task 1.1: Monorepo & Git Governance Setup**
  - Initialize the Git repository with the directory skeleton from `docs/PROJECT_STRUCTURE.md`.
  - Commit the 8 frozen data contracts into `/docs/contracts/`.
  - Configure root `.env.example`, `.gitignore`, and `docker-compose.yml`.
  - *DoD:* Team members can clone the repo and run `docker-compose up` without syntax errors.

- [ ] **Task 1.2: Design UI Wireframes for Markie**
  - Deliver layout mockups for:
    1. Admin Triage Queue (showing Risk Score meters and trigger badges).
    2. Mobile Field Checklist (optimized for single-hand tablet use).
    3. COA Audit Chain Viewer.
  - *DoD:* Markie has clear visual designs to follow for Component Phase 1.

- [ ] **Task 1.3: Sourcing Real PSA FIES Microdata**
  - Download the official Kaggle Philippine Family Income and Expenditure Survey (41,544 rows).
  - Store raw data in `/data-pipeline/data/raw/fies_raw.csv` (git-ignored).
  - *DoD:* Dataset loaded and verified in Jupyter notebook environment.

*Standup Deliverable (Phase 1):* "Repository initialized, contracts frozen, wireframes handed to Markie, PSA raw data loaded."

---

## Phase 2: PSA FIES Data Pipeline & Synthetic Augmentation (Days 4–8)
*Goal: Clean real PSA FIES data, perform EDA, and generate 5,000 augmented seed records.*

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

- [ ] **Task 2.3: Synthetic Operational Augmentation (The 4Ps Layer)**
  - Path: `/data-pipeline/generator/generator.py`
  - Sample 5,000 households from the cleaned feature matrix.
  - Add Filipino names (`faker.Faker('fil_PH')`), Laguna GPS coordinates, and PhilSys IDs.
  - Inject the 4 operational audit cohorts (60% Compliant, 15% Graduation, 10% Asset, 15% Sinking).
  - Export `seed_beneficiaries.json` and `seed_external_records.json`.
  - *DoD:* Valid JSON seed files handed to Dustin for database ingestion.

- [ ] **Task 2.4: Floater Support for Markie (Mobile UX)**
  - Assist Markie with tablet form layouts to ensure single-hand ease of use during field interviews.

*Standup Deliverable (Phase 2):* "PSA data cleaned; 5,000 synthetic seed records generated with realistic cohorts."

---

## Phase 3: Sprint Facilitation & Integration Testing (Days 9–12)
*Goal: Ensure services connect cleanly and resolve cross-domain blockers.*

- [ ] **Task 3.1: Facilitate Daily Stand-Up Meetings**
  - Run daily 15-minute syncs using the 3 standard questions:
    1. *What contract task did you finish yesterday?*
    2. *What contract task are you shipping today?*
    3. *Are you blocked by any contract mismatches?*

- [ ] **Task 3.2: Verify End-to-End Container Network Integration**
  - Test communication flow: Client (3000) $\to$ Gateway (80/443) $\to$ Backend (5000) $\to$ ML (8000) & Database (27017).
  - *DoD:* An assessment submitted on Markie's frontend successfully triggers Mae's backend, invokes Charles's model, writes to Dustin's database, and generates an audit log entry.

- [ ] **Task 3.3: Validate Edge-Case Safeguards**
  - Test Calamity Moratorium toggle: Confirm that declared calamity zones freeze compliance flags.
  - Test 18-Year-Old Rule: Confirm that children turning 19 automatically transition to ineligible status.

*Standup Deliverable (Phase 3):* "End-to-end integration verified: flagged household dispatches a task and triggers appeal timer."

---

## Phase 4: Stress Testing & Tamper Proof (Days 13–15)
*Goal: Conduct adversarial testing on database tampering and offline sync.*

- [ ] **Task 4.1: Adversarial Tampering Verification**
  - Coordinate with Dustin to manually alter a database record via `mongosh`.
  - Run Mae's chain verification endpoint and verify the broken block is caught.
  - *DoD:* Tamper detection successfully verified and documented for defense slides.

- [ ] **Task 4.2: Tablet Airplane Mode Stress Test**
  - Coordinate with Markie to test field report submissions in Airplane Mode.
  - *DoD:* Zero data loss; reports sync cleanly upon reconnection.

*Standup Deliverable (Phase 4):* "Stress tests complete: database tampering detected and offline sync verified."

---

## Phase 5: Presentation Deck & Live Demo Script (Days 16–18)
*Goal: Prepare presentation assets, live demo workflows, and defense slide decks.*

- [ ] **Task 5.1: Live Defense Demo Scripting**
  - Script the 4 live demonstration scenarios:
    1. **The Graduation Catch:** An enrolled Level 1 family with high power usage and a registered vehicle is flagged by the AI and rule engine.
    2. **The Field Investigation:** Social worker visits the home on an offline tablet, confirms the motorcycle is a MoveIt delivery tool, and checks the physical LandBank ATM card.
    3. **The Sangla-ATM Catch:** System detects a 2:00 AM batch-swiping cluster across 12 cards, generating a card-pawning alert.
    4. **The Forensic Shield:** Live demonstration of an admin modifying a database record and the COA audit tool immediately detecting the broken hash chain.

- [ ] **Task 5.2: Final Capstone Presentation Slide Deck**
  - Build presentation slides covering:
    - The Real-World Problem (4Ps graduation lag, slow checks, *Sangla-ATM*).
    - Philippine Legal Grounding (RA 11310, RA 11552, RA 10173).
    - The Empirical Pipeline (41,000 real PSA FIES households).
    - System Architecture & Boundaries (MERN + Python FastAPI).
    - Live System Demonstration.

- [ ] **Task 5.3: Production Clean-Clone Verification**
  - Run a clean clone on a fresh machine:
    ```bash
    git clone <repo-url>
    cd kilos-unlad
    docker-compose up --build
    ```
  - *DoD:* All 5 containers boot with zero manual intervention; default admin can log in immediately.

*Standup Deliverable (Phase 5):* "Presentation deck and live demo rehearsed; system fully ready for capstone defense."
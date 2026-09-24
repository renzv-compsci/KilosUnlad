# KilosUnlad: Unified Master Task Phase Roadmap
**Classification:** Master Progress Tracker & Sprint Status Board  
**Target Repository:** `KilosUnlad`  
**Current Overall Progress:** 3 / 52 Tasks Completed  

---

## Progress Overview by Role

| Team Member | Role | Domain | Total Tasks | Completed | Status |
| :--- | :--- | :--- | :---: | :---: | :---: |
| **Dustin Martinez** | Database Architecture Lead | `/server/src/models/`, `/docker/mongo/` | 11 | 0 | In Progress |
| **Mae Santos** | Backend Engineering Lead | `/server/` (API & Core Logic) | 13 | 3 | In Progress |
| **Charles Cabatian** | ML Modeling Lead | `/ml-service/` | 10 | 0 | In Progress |
| **Markie Angelo** | Frontend Engineering Lead | `/client/` (Web & PWA) | 11 | 0 | In Progress |
| **Renz Viloria** | Project Manager & Data Lead | `/data-pipeline/`, Governance | 13 | 0 | In Progress |

---

# PHASE 1: Environment Verification, Scaffolding & Setup (Days 1–3)
**Phase Goal:** Every member has a functional local environment. All services boot via `docker-compose up`. All API endpoints respond with frozen mock contract payloads so no developer is waiting on another.

### Dustin Martinez (Database)
* **Goal:** Verify local container setup, initialize database users, and implement all 6 Mongoose models.
- [ ] **Task 1.1: Local MongoDB Container Bootstrap**
  - Path: `/docker/mongo/init-mongo.js`
  - Review and maintain initialization script that boots `kilosunlad` database.
  - Configure application user: `app_user` with password `AppUserPassword2026!` and role `readWrite`.
  - *DoD:* `docker-compose up db` runs without errors and initializes the database.
- [ ] **Task 1.2: Implement `User.js` Model**
  - Path: `/server/src/models/User.js`
  - Fields: `username` (string, unique), `email` (string, unique), `password_hash` (string), `role` (enum: `['SUPER_ADMIN', 'REGIONAL_DIRECTOR', 'CASE_WORKER', 'COA_AUDITOR']`), `jurisdiction` (object: region, province, municipality, assigned_barangays array), `is_active` (boolean).
  - Indexes: `{ email: 1 }` (unique), `{ username: 1 }` (unique), `{ role: 1, "jurisdiction.municipality": 1 }`.
  - *DoD:* Mongoose compiles schema with `{ strict: true }` and rejects undefined fields.
- [ ] **Task 1.3: Implement `Beneficiary.js` Model**
  - Path: `/server/src/models/Beneficiary.js`
  - Fields: `household_id` (string, unique natural key), `head_of_household` (first_name, last_name, national_id), `address` (street, barangay, municipality, province, coordinates as GeoJSON Point `[longitude, latitude]`), `demographics` (6 proxy-means features), `children_registry` (array of objects with `birthdate` and `is_eligible`), `current_swdi_level` (enum: `[1, 2, 3]`), `program_status` (enum: `['ACTIVE_COMPLIANT', 'FLAGGED_FOR_REVIEW', 'UNDER_INVESTIGATION', 'NOTICE_OF_INELIGIBILITY', 'GRADUATED', 'CALAMITY_SUSPENDED']`), `risk_assessment`.
  - Indexes: `{ household_id: 1 }` (unique), `{ "head_of_household.national_id": 1 }` (unique), `{ "address.coordinates": "2dsphere" }`.
  - *DoD:* Schema passes mock validation for GeoJSON coordinates and demographic scores.
- [ ] **Task 1.4: Implement `ExternalRecord.js` Model**
  - Path: `/server/src/models/ExternalRecord.js`
  - Fields: `matched_household_id` (unique), `national_id`, `power_utility` (provider, meter_no, avg_monthly_kwh, is_lifeline), `water_utility` (provider, meter_type, avg_monthly_cu_m, is_lifeline), `telecom_registry` (contract_type, monthly_plan_php), `transport_registry` (vehicles array), `landbank_telemetry` (card_masked_pan, last_withdrawal_timestamp, sangla_atm_risk_score).
  - Indexes: `{ matched_household_id: 1 }` (unique), `{ national_id: 1 }`.
  - *DoD:* Nested utility objects enforce numeric types matching contract definitions.
- [ ] **Task 1.5: Implement `VerificationTask.js` Model**
  - Path: `/server/src/models/VerificationTask.js`
  - Fields: `task_id` (unique), `household_id`, `assigned_worker_id` (ref: `User`), `task_status` (enum: `['PENDING_DISPATCH', 'CACHED_OFFLINE', 'SUBMITTED', 'VERIFIED_GRADUATE', 'VERIFIED_RETAIN']`), `field_findings` (verified_swdi_level, productive_asset_validated, physical_cash_card_inspected, evidence_photos array with sha256_hash and coordinates), `admin_resolution`.
  - Indexes: `{ task_id: 1 }` (unique), `{ assigned_worker_id: 1, task_status: 1 }`.
  - *DoD:* Successfully references `User` model using Mongoose `ObjectId`.
- [ ] **Task 1.6: Implement `AuditLog.js` & `SystemConfig.js` Models**
  - Paths: `/server/src/models/AuditLog.js`, `/server/src/models/SystemConfig.js`
  - `AuditLog`: `sequence_index` (number, unique, ordered), `previous_entry_hash` (string), `timestamp` (Date), `actor` (user_id, username, role, ip_address), `action` (enum), `target_entity` (collection, entity_id), `state_delta` (object), `entry_hash` (string, unique).
  - Indexes: `{ sequence_index: 1 }` (unique), `{ entry_hash: 1 }` (unique).
  - *DoD:* Models compile with `{ strict: true }` and timestamps enabled.

### Charles Cabatian (Machine Learning)
* **Goal:** Verify local container setup, validate Pydantic models, and ensure mock endpoints respond.
- [ ] **Task 1.1: Local Virtual Environment & Dependency Installation**
  - Path: `/ml-service/requirements.txt`
  - Create local Python 3.10 venv (`python -m venv .venv`) and install dependencies: `pip install -r requirements.txt`.
  - *DoD:* All packages (`fastapi`, `lightgbm`, `shap`, `pydantic`, `joblib`) install with zero wheel compilation errors.
- [ ] **Task 1.2: Boot Microservice & Validate Swagger Documentation**
  - Paths: `/ml-service/app/main.py`, `/ml-service/app/core/config.py`
  - Run development server locally: `uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload`.
  - Open `http://localhost:8000/docs` in browser.
  - *DoD:* Interactive Swagger UI renders `/health`, `/api/v1/predict-swdi`, and `/api/v1/score-atm-stream`.
- [ ] **Task 1.3: Contract Compliance Verification**
  - Paths: `/ml-service/app/schemas/inference.py`, `/ml-service/app/schemas/telemetry.py`
  - Execute test requests via Swagger UI or `curl` using sample payloads from `/docs/contracts/ml/`.
  - *DoD:* Endpoints respond with HTTP `200 OK` and match contract JSON structures 1:1.

### Mae Santos (Backend)
* **Goal:** Stand up Express, mount core security middleware, and serve mock responses matching contracts.
- [x] **Task 1.1: Express Server Bootstrap & Health Check**
  - Paths: `/server/server.js`, `/server/src/app.js`
  - Mount essential middleware: `cors()`, `helmet()`, `express.json({ limit: '30mb' })`, and `morgan('dev')`.
  - Connect database lifecycle via `/server/src/config/database.js`.
  - *DoD:* Server starts on Port 5000 and responds `200 OK` on `GET /health`.
- [x] **Task 1.2: Build Canonical JSON & SHA-256 Hashing Engine**
  - Paths: `/server/src/utils/canonicalJson.js`, `/server/src/utils/cryptoHelper.js`
  - Implement deterministic serialization using `fast-json-stable-stringify`.
  - Implement `computeEntryHash({ sequenceIndex, previousEntryHash, timestamp, actorId, action, stateDelta })`.
  - *DoD:* Unit test proves `{ a: 1, b: 2 }` and `{ b: 2, a: 1 }` generate identical SHA-256 hashes.
- [ ] **Task 1.3: Build Mock Route Handlers (Unblocking Markie Immediately)**
  - Paths: `/server/src/routes/v1/` (`auth.routes.js`, `beneficiary.routes.js`, `task.routes.js`, `index.js`)
  - Build mock routes returning static JSON from `/docs/contracts/`:
    - `POST /api/v1/auth/login` $\to$ returns `auth-session.json`.
    - `GET /api/v1/beneficiaries/triage-queue` $\to$ returns `admin-triage-feed.json`.
    - `GET /api/v1/tasks/assigned` $\to$ returns `field-task-download.json`.
  - *DoD:* Markie's React client connects to Port 5000 and receives valid mock responses today.

### Markie Angelo (Frontend)
* **Goal:** Verify the local Vite setup, build the responsive AppShell layout, and render UI tables using mock contract data.
- [ ] **Task 1.1: Local Environment & Dependency Verification**
  - Paths: `/client/package.json`, `/client/vite.config.js`, `/client/tailwind.config.js`
  - Install dependencies locally via `npm install` and run development server (`npm run dev`).
  - *DoD:* React boots on Port 3000 with clean Tailwind styling and zero console warnings.
- [ ] **Task 1.2: Build Core AppShell & Role-Based Navigation**
  - Path: `/client/src/components/layout/` (`AppShell.jsx`, `Sidebar.jsx`, `TopNav.jsx`)
  - Build responsive layout with collapsible sidebar, brand header, and role switcher (`SUPER_ADMIN`, `REGIONAL_DIRECTOR`, `CASE_WORKER`, `COA_AUDITOR`).
  - *DoD:* Clicking navigation links updates routes dynamically without page reloads.
- [ ] **Task 1.3: Build Atomic UI Primitives**
  - Path: `/client/src/components/common/` (`Button.jsx`, `InputField.jsx`, `StatusBadge.jsx`, `RiskMeter.jsx`, `Modal.jsx`)
  - Create reusable buttons, inputs, modal dialogs, and color-coded risk indicators.
  - *DoD:* Components export cleanly and handle disabled, loading, and active states.
- [ ] **Task 1.4: Prototype Triage Queue Table using Mock Data**
  - Path: `/client/src/features/triage/TriageQueue.jsx`
  - Import `/docs/contracts/admin-web/admin-triage-feed.json` as static mock data.
  - Render table with Household ID, Head of Household, Barangay, Risk Score, and Trigger Badges.
  - *DoD:* Table displays all 10 sample items with color-coded risk levels.

### Renz Viloria (PM / Data Lead)
* **Goal:** Initialize repository governance, freeze data contracts, deliver UI wireframes to Markie, and verify local data environment.
- [ ] **Task 1.1: Monorepo & Git Governance Setup**
  - Paths: `docker-compose.yml`, `.env.example`, `.gitignore`, `README.md`
  - Maintain clean monorepo skeleton and verify all 5 containers build cleanly.
  - *DoD:* Team members can clone repo and run `docker-compose up` without syntax errors.
- [ ] **Task 1.2: Design UI Wireframes for Markie**
  - Deliver wireframes for Admin Triage Queue, Mobile Field Checklist, and COA Audit Chain Viewer.
  - *DoD:* Markie has clear visual blueprints to build Phase 1 components.
- [ ] **Task 1.3: Sourcing Real PSA FIES Microdata**
  - Download official Kaggle Philippine Family Income and Expenditure Survey (41,544 rows).
  - Store raw data in `/data-pipeline/data/raw/fies_raw.csv` (git-ignored).
  - *DoD:* Dataset loads into Pandas DataFrame with all 60+ survey columns verified.

---

# PHASE 2: Core Domain Logic & Empirical Pipeline (Days 4–8)
**Phase Goal:** Real business logic, real models, real data pipeline, real schemas, and real UI screens built against frozen interfaces.

### Dustin Martinez (Database)
* **Goal:** Lock down audit log immutability and test spatial and compound query performance.
- [ ] **Task 2.1: Enforce Append-Only Database Permission Lock on Audit Logs**
  - Path: `/docker/mongo/init-mongo.js`
  - Restrict `app_user` permissions: Grant `find`, `insert` on `audit_logs`; Deny `update`, `remove`, `dropCollection`.
  - *DoD:* Test script attempting `AuditLog.updateOne()` in Mongoose throws a database authorization error.
- [ ] **Task 2.2: Verify Geospatial 2dsphere Queries**
  - Write standalone test query finding all households within 5km radius of Calamba City Hall using `$geoWithin` with `$centerSphere` (`[121.1653, 14.2117]`).
  - *DoD:* Query `explain("executionStats")` confirms a spatial index hit (zero collection scan).
- [ ] **Task 2.3: Verify Connection Pool Configuration**
  - Path: `/server/src/config/database.js`
  - Review connection settings with Mae: Ensure `maxPoolSize: 10`, `serverSelectionTimeoutMS: 5000`, and automatic reconnect listeners are active.
  - *DoD:* Restarting MongoDB container does not crash Node.js application process.

### Charles Cabatian (Machine Learning)
* **Goal:** Train the LightGBM classifier on real PSA FIES data, integrate SHAP, and code the ATM velocity algorithm.
- [ ] **Task 2.1: Ingest Clean Training Matrix from Renz**
  - Source: `/data-pipeline/seeds/features_swdi_clean.parquet`
  - Load feature matrix into training script (`train_pipeline.py`).
  - Verify 6 feature columns and target `swdi_level` (1, 2, 3).
  - *DoD:* 80/20 train-test split created with stratified class balance.
- [ ] **Task 2.2: Train & Serialize LightGBM Classifier**
  - Path: `/ml-service/app/services/classifier.py`
  - Train `LGBMClassifier(objective='multiclass', num_class=3, n_estimators=100, learning_rate=0.05)`.
  - Save trained model weights to `/ml-service/artifacts/lightgbm_swdi_v1.joblib`.
  - *DoD:* Model serializes cleanly and achieves $\ge 85\%$ macro F1-score on test split.
- [ ] **Task 2.3: In-Memory Lifespan Model Loader**
  - Path: `/ml-service/app/main.py`
  - In `@asynccontextmanager lifespan(app)`, load `lightgbm_swdi_v1.joblib` into `ml_models["swdi_classifier"]`.
  - *DoD:* Model loaded once on server startup; per-request inference time is under 15 milliseconds.
- [ ] **Task 2.4: Implement SHAP Explainability Engine**
  - Path: `/ml-service/app/services/explainer.py`
  - Initialize `shap.TreeExplainer(model)`; extract top 2 positive and top 2 negative contributing indicators.
  - *DoD:* `predict-swdi` endpoint returns real SHAP weights matching contract schema.
- [ ] **Task 2.5: Implement Sangla-ATM Sliding-Window Algorithm**
  - Path: `/ml-service/app/services/anomaly.py`
  - Process batches received at `/api/v1/score-atm-stream`: interval $< 45\text{s}$ (+35 pts), nocturnal 01:00–04:30 AM (+30 pts), repeat cluster overlap $\ge 70\%$ (+40 pts).
  - *DoD:* Automated unit test flags suspicious test clusters with `is_anomalous_batch: true`.

### Mae Santos (Backend)
* **Goal:** Replace mock auth with real JWTs, implement the state machine, and build task dispatching.
- [x] **Task 2.1: Implement JWT Authentication & Jurisdictional RBAC**
  - Paths: `/server/src/middleware/auth.middleware.js`, `/server/src/middleware/rbac.middleware.js`
  - Implement token verification: extract Bearer token, verify against `JWT_SECRET`, attach `req.user`.
  - Enforce role permissions (`SUPER_ADMIN`, `REGIONAL_DIRECTOR`, `CASE_WORKER`, `COA_AUDITOR`).
  - Restrict regional directors and case workers to assigned municipality/barangays.
  - *DoD:* Requests with invalid/expired tokens return `401 Unauthorized`; out-of-jurisdiction queries return `403 Forbidden`.
- [ ] **Task 2.2: Implement Beneficiary State Machine Engine**
  - Paths: `/server/src/services/workflow.service.js`, `/server/src/controllers/beneficiary.controller.js`
  - Enforce status transition constraints: `ACTIVE_COMPLIANT` $\to$ `FLAGGED_FOR_REVIEW` $\to$ `UNDER_INVESTIGATION` $\to$ `NOTICE_OF_INELIGIBILITY` $\to$ `GRADUATED`.
  - Reject invalid status jumps with `400 Bad Request`.
  - *DoD:* State machine prevents unauthorized status bypasses.
- [ ] **Task 2.3: Implement Due Process Manager (15-Day Appeal Countdown)**
  - Paths: `/server/src/services/appealLifecycle.service.js`, `/server/src/controllers/appeal.controller.js`
  - When graduation is approved, set `status: "NOTICE_OF_INELIGIBILITY"` and calculate `appeal_deadline = now + 15 days`.
  - Implement route `POST /api/v1/appeals/docket` to register formal appeals and pause timer.
  - *DoD:* Beneficiary record accurately reflects 15-day statutory countdown deadline.
- [ ] **Task 2.4: Implement Task Dispatcher Engine**
  - Paths: `/server/src/services/taskDispatcher.service.js`, `/server/src/controllers/task.controller.js`
  - Implement `POST /api/v1/tasks/dispatch` matching `admin-task-dispatch.json`.
  - Shifts household status to `UNDER_INVESTIGATION`, creates `VerificationTask` document, and commits an audit log block.
  - *DoD:* Successfully assigns task to Municipal Link and returns HTTP `201 Created`.

### Markie Angelo (Frontend)
* **Goal:** Build the mobile tablet interface that functions completely offline and captures geotagged evidence.
- [ ] **Task 2.1: Configure PWA Service Worker & Web Manifest**
  - Paths: `/client/public/manifest.json`, `/client/public/service-worker.js`
  - Configure manifest so tablet interface installs to home screen; cache core bundles for offline startup.
  - *DoD:* App opens cleanly on tablet browser with network set to "Offline".
- [ ] **Task 2.2: Implement Local IndexedDB Storage (Dexie.js)**
  - Path: `/client/src/services/indexedDB.js`
  - Initialize Dexie tables: `assigned_tasks` and `pending_submissions`.
  - Populate `assigned_tasks` with sample data from `field-task-download.json`.
  - *DoD:* Tasks can be read and written locally while in offline mode.
- [ ] **Task 2.3: Build Hardware Geolocation & Photo Hasher Hooks**
  - Paths: `/client/src/hooks/useGeolocation.js`, `/client/src/utils/photoHasher.js`
  - Use `navigator.geolocation.getCurrentPosition()` with high accuracy.
  - Implement in-browser SHA-256 calculation using Web Crypto API (`crypto.subtle.digest`).
  - *DoD:* Taking photo outputs image preview, device GPS coordinates, and valid 64-char SHA-256 hash.
- [ ] **Task 2.4: Build Mobile Field Verification Screen**
  - Path: `/client/src/features/verification/FieldTaskForm.jsx`
  - Sections: Housing Condition Scores, Productive Asset Verification (MoveIt/MTOP), Physical Cash Card Check, Geotagged Photo Attachment.
  - *DoD:* Form submission saves report to `IndexedDB` with `is_synced: false` flag.

### Renz Viloria (PM / Data Lead)
* **Goal:** Clean real PSA survey data, perform EDA, and engineer the SWDI proxy-means training matrix.
- [ ] **Task 2.1: Data Cleaning & FIES Exploratory Data Analysis (EDA)**
  - Path: `/data-pipeline/notebooks/01_fies_cleaning_and_eda.ipynb`
  - Filter columns, impute missing values, and encode Roof and Wall materials into ordinal scores (1 to 3).
  - Plot correlation heatmaps between appliance counts and total household income.
  - *DoD:* Clean notebook exported with correlation plots saved to `/docs/architecture/eda_correlations.png`.
- [ ] **Task 2.2: SWDI Feature Engineering & Poverty Threshold Mapping**
  - Path: `/data-pipeline/notebooks/02_swdi_feature_engineering.ipynb`
  - Calculate Per Capita Monthly Income and Dependency Ratio.
  - Assign ground-truth SWDI tiers (Level 1, 2, 3) using official PSA Laguna poverty thresholds.
  - Export clean training matrix: `/data-pipeline/seeds/features_swdi_clean.parquet`.
  - *DoD:* Clean Parquet file handed to Charles for LightGBM model training.
- [ ] **Task 2.3: Synthetic Operational Augmentation (The 4Ps Layer)**
  - Path: `/data-pipeline/generator/generator.py`
  - Sample 5,000 households from cleaned feature matrix; add Filipino names (Faker), Laguna GPS coordinates, and PhilSys IDs.
  - Inject 4 cohorts: 60% Compliant, 15% Graduation, 10% Asset, 15% Sinking.
  - Export: `seed_beneficiaries.json` and `seed_external_records.json`.
  - *DoD:* Valid JSON seed files matching Mongoose schemas delivered to Dustin.
- [ ] **Task 2.4: Floater Support for Markie (Mobile UX)**
  - Assist Markie with tablet form layouts to ensure single-hand ease of use during field interviews.

---

# PHASE 3: Service-to-Service Integration & Contract Binding (Days 9–12)
**Phase Goal:** Replace all mock fixtures with live inter-service communication. Node.js calls Python ML; React calls Node.js; tablets sync batch data to the server.

### Dustin Martinez (Database)
* **Goal:** Ingest Renz's 5,000 synthetic records and profile compound query execution.
- [ ] **Task 3.1: Build Automated Seed Ingestion Tool**
  - Path: `/data-pipeline/scripts/seed_db.py`
  - Ingest `seed_beneficiaries.json` and `seed_external_records.json` into MongoDB using PyMongo or Mongoose bulk writes.
  - *DoD:* Ingests 5,000 household profiles and matched external records in under 15 seconds.
- [ ] **Task 3.2: Compound Query Index Verification**
  - Test index performance of admin triage query: `Beneficiary.find({ "risk_assessment.is_flagged": true, "address.municipality": "Calamba" })`.
  - *DoD:* Confirms `totalDocsExamined` equals `nReturned` (Index hit, zero un-indexed scanning).

### Charles Cabatian (Machine Learning)
* **Goal:** Connect with Mae's backend over Docker network and benchmark inference speeds.
- [ ] **Task 3.1: Connect Route Handlers to Real Services**
  - Update `/ml-service/app/api/v1/predict.py`: Replace dummy logic with calls to `classifier.py` and `explainer.py`.
  - Update `/ml-service/app/api/v1/telemetry.py`: Replace dummy logic with calls to `anomaly.py`.
  - *DoD:* Endpoints execute real calculations and return live predictions.
- [ ] **Task 3.2: Cross-Container Network Testing with Mae**
  - Boot containers via `docker-compose up server ml-service`.
  - Mae triggers `mlClient.service.js` from Express $\to$ sends payload to `http://ml-service:8000`.
  - *DoD:* Node.js receives real ML predictions and writes risk scores to MongoDB with P95 latency $< 25\text{ms}$.
- [ ] **Task 3.3: Graceful Error Handling & Boundary Defense**
  - Verify that invalid inputs return clean `422 Unprocessable Entity` without crashing Uvicorn worker.
  - *DoD:* Zero unhandled 500 crashes during malformed payload tests.

### Mae Santos (Backend)
* **Goal:** Connect Charles's Python ML service via Axios and process batch uploads from Markie's tablet.
- [ ] **Task 3.1: Build Resilient Python ML Client**
  - Path: `/server/src/services/mlClient.service.js`
  - Use Axios to call `http://ml-service:8000/api/v1/predict-swdi` using payload from `ml-swdi-inference.json`.
  - Configure 2500ms timeout and fallback rule engine if ML container is unreachable.
  - *DoD:* If Python container stops, backend falls back gracefully and tags record `EVALUATED_VIA_FALLBACK`.
- [ ] **Task 3.2: Implement Tablet Batch Sync Consumer**
  - Paths: `/server/src/services/sync.service.js`, `/server/src/controllers/task.controller.js`
  - Implement `POST /api/v1/tasks/:id/submit` matching `field-task-submission.json`.
  - Verify photo SHA-256 hash and calculate distance variance using `/server/src/utils/geoFence.js` ($< 250\text{m}$ threshold).
  - *DoD:* Tablet upload successfully validates coordinates, commits findings, and returns audit receipt.
- [ ] **Task 3.3: Dynamic Composite Risk Calculation Service**
  - Path: `/server/src/services/discrepancy.service.js`
  - Combine live ML predictions with utility records from `ExternalRecord`:
    $$S_i = \min\left(100, \; 40 \cdot \Delta_{\text{SWDI}} + 20 \cdot I_{\text{power}} + 15 \cdot I_{\text{water}} + 25 \cdot I_{\text{telecom}} + 30 \cdot I_{\text{vehicle}}\right)$$
  - *DoD:* Seeded households with vehicle ownership or high power usage automatically receive $S_i \ge 70$.
- [ ] **Task 3.4: Implement Calamity Moratorium Controller**
  - Path: `/server/src/controllers/calamity.controller.js`
  - Create route `POST /api/v1/calamity/toggle` allowing admins to pause automated compliance flags for municipalities under State of Calamity (RA 10121).
  - *DoD:* Compliance penalties freeze for households in active calamity zones.

### Markie Angelo (Frontend)
* **Goal:** Connect React to Mae's live Express backend and build remaining admin screens.
- [ ] **Task 3.1: Connect Axios API Layer & JWT Interceptor**
  - Path: `/client/src/services/api.js`
  - Configure Axios instance with `baseURL: import.meta.env.VITE_API_URL`.
  - Attach Bearer access tokens to request headers and handle 401 token refresh redirects.
  - Replace static mock data in Triage Queue with live API calls (`GET /api/v1/beneficiaries/triage-queue`).
  - *DoD:* Dashboard renders live seeded records from Mae's database.
- [ ] **Task 3.2: Build Regional Heatmap & Dashboard Visuals**
  - Path: `/client/src/features/dashboard/` (`DashboardView.jsx`, `RegionalMap.jsx`, `MetricCards.jsx`)
  - Render summary metric cards (Active Caseload, Flagged Households, Graduated Count).
  - Plot color-coded barangay pins using GeoJSON coordinates.
  - *DoD:* Dashboard visualizes geographic distribution of flagged households across Laguna.
- [ ] **Task 3.3: Build 15-Day Appeal & Due Process Manager**
  - Path: `/client/src/features/due-process/AppealManager.jsx`
  - Display households under `NOTICE_OF_INELIGIBILITY` with visual 15-day countdown timers.
  - Build modal allowing supervisors to log formal appeals and schedule hearings.
  - *DoD:* Appeals can be submitted, visually pausing countdown clock.
- [ ] **Task 3.4: Implement Offline-to-Online Batch Synchronization**
  - Path: `/client/src/hooks/useOfflineSync.js`
  - Listen for browser `online` event; automatically query `pending_submissions` from `IndexedDB` and POST to Mae's `/api/v1/tasks/:id/submit`.
  - *DoD:* Reconnecting to Wi-Fi automatically uploads cached reports and marks them green.

### Renz Viloria (PM / Data Lead)
* **Goal:** Ensure services connect cleanly and resolve cross-domain blockers.
- [ ] **Task 3.1: Facilitate Daily Stand-Up Meetings**
  - Run daily 15-minute syncs using 3 standard questions: Yesterday, Today, Blockers.
- [ ] **Task 3.2: Verify End-to-End Container Network Integration**
  - Test communication flow: Client (3000) $\to$ Gateway (80/443) $\to$ Backend (5000) $\to$ ML (8000) & Database (27017).
  - *DoD:* Assessment submitted on Markie's frontend triggers Mae's backend, invokes Charles's model, writes to Dustin's database, and generates audit log entry.
- [ ] **Task 3.3: Validate Edge-Case Safeguards**
  - Test Calamity Moratorium toggle: Confirm declared calamity zones freeze compliance flags.
  - Test 18-Year-Old Rule: Confirm children turning 19 automatically transition to ineligible status.

---

# PHASE 4: System Hardening, Forensics & Stress Testing (Days 13–15)
**Phase Goal:** Prove that unauthorized direct database modifications break the cryptographic hash chain; test offline tablet behavior under airplane mode; generate academic defense plots.

### Dustin Martinez (Database)
* **Goal:** Prove that unauthorized direct database modifications break the cryptographic hash chain.
- [ ] **Task 4.1: Execute Adversarial Tampering Test**
  - Connect directly to MongoDB via `mongosh` using root credentials (`admin_user`).
  - Manually modify an address, income, or status field on a historical beneficiary record.
  - Trigger Mae's chain verification endpoint (`GET /api/v1/audit/verify-chain`).
  - *DoD:* System flags exact sequence number and detects broken hash chain.
- [ ] **Task 4.2: Data Integrity & Null Constraint Audit**
  - Write audit script checking database for orphaned documents (tasks referencing deleted users, missing natural keys).
  - *DoD:* Confirms zero orphaned references across all 6 collections.

### Charles Cabatian (Machine Learning)
* **Goal:** Generate academic defense plots and export evaluation metrics.
- [ ] **Task 4.1: Generate Academic Performance Visualizations**
  - Create script (`generate_metrics.py`) to output: Confusion Matrix, ROC-AUC Curves, and Global SHAP Summary Plot (Beeswarm).
  - Save figures to `/docs/architecture/evaluation_metrics.png`.
  - *DoD:* High-resolution plots ready for presentation slide deck.
- [ ] **Task 4.2: Edge-Case Adversarial Testing**
  - Test borderline cases (e.g., large family with 10 members but high education).
  - *DoD:* Model does not produce arbitrary 1.0/0.0 extreme probabilities on borderline data.

### Mae Santos (Backend)
* **Goal:** Build COA cryptographic chain verification endpoint and verify tamper detection.
- [ ] **Task 4.1: Implement Cryptographic Chain Verification Endpoint**
  - Path: `/server/src/controllers/audit.controller.js`
  - Implement `GET /api/v1/audit/verify-chain?start_sequence=1&end_sequence=1000` matching `audit-chain-verification.json`.
  - Sequentially iterate through blocks in `AuditLog`, recomputing each SHA-256 hash.
  - *DoD:* Returns `is_chain_valid: true` across 1,000 valid blocks; successfully catches manually tampered blocks.
- [ ] **Task 4.2: Audit Log Middleware Interceptor**
  - Path: `/server/src/middleware/audit.middleware.js`
  - Intercept state-mutating requests (`POST`, `PUT`, `PATCH`) to automatically record actor ID, IP address, timestamp, and state delta to `audit_logs`.
  - *DoD:* All administrative mutations leave an immutable audit block.
- [ ] **Task 4.3: Centralized Error Handler & Joi Validation**
  - Paths: `/server/src/middleware/error.middleware.js`, `/server/src/middleware/validation.middleware.js`
  - Catch unhandled rejections, Mongoose validation errors, and malformed JSON payloads.
  - *DoD:* Zero unhandled server crashes during malformed request testing.

### Markie Angelo (Frontend)
* **Goal:** Build the auditor verification screen and simulate field conditions.
- [ ] **Task 4.1: Build COA Cryptographic Chain Inspector View**
  - Path: `/client/src/features/audit-ledger/ChainInspector.jsx`
  - Display interactive list of audit blocks. Include "Verify Chain" button calling `GET /api/v1/audit/verify-chain`.
  - Display green shield if unbroken or highlight tampered blocks in red.
  - *DoD:* Renders unbroken status on valid logs and highlights tampered blocks during testing.
- [ ] **Task 4.2: Tablet Airplane Mode Stress Test**
  - Put physical tablet/browser in Airplane Mode $\to$ Complete two field reports.
  - Re-enable connection $\to$ Confirm reports sync with zero data loss.
  - *DoD:* Reports sync cleanly with valid SHA-256 fingerprints.

### Renz Viloria (PM / Data Lead)
* **Goal:** Conduct adversarial testing on database tampering and offline sync.
- [ ] **Task 4.1: Adversarial Tampering Verification**
  - Coordinate with Dustin to manually alter database record via `mongosh`.
  - Run Mae's chain verification endpoint and verify broken block is caught.
  - *DoD:* Tamper detection successfully verified and documented for defense slides.
- [ ] **Task 4.2: Tablet Airplane Mode Stress Test**
  - Coordinate with Markie to test field report submissions in Airplane Mode.
  - *DoD:* Zero data loss; reports sync cleanly upon reconnection.

---

# PHASE 5: Container Optimization, Demo Rehearsal & Defense Readiness (Days 16–18)
**Phase Goal:** Package the repository for grading, verify `docker-compose up --build` works from scratch, and rehearse the live defense demonstration.

### Dustin Martinez (Database)
* **Goal:** Provide a one-click database reset tool and rehearse live defense demonstration.
- [ ] **Task 5.1: Create One-Click Demo Reset Script**
  - Path: `/data-pipeline/scripts/reset_demo.sh`
  - Write shell script that wipes database, recreates indexes, and re-seeds clean records so live demo starts fresh.
  - *DoD:* Running `./reset_demo.sh` resets environment in under 10 seconds.
- [ ] **Task 5.2: Live Demo Data Preparation**
  - Ensure seeded database contains target demo households (Graduation Case and Sangla-ATM Case).
  - *DoD:* Test cases query instantly during rehearsal runs.

### Charles Cabatian (Machine Learning)
* **Goal:** Optimize Docker image and prepare live demonstration test cases.
- [ ] **Task 5.1: Container Build Optimization**
  - Path: `/ml-service/Dockerfile`
  - Ensure `.dockerignore` excludes unnecessary files and caches.
  - *DoD:* Final container image is under 500MB.
- [ ] **Task 5.2: Live Demo Test Case Scripting**
  - Prepare 2 test cases: Graduation Case (Level 3 prediction with positive SHAP education weight) and Loan Shark Catch (Sangla-ATM risk score $85/100$).
  - *DoD:* Both test cases execute smoothly during end-to-end rehearsal.

### Mae Santos (Backend)
* **Goal:** Optimize backend Docker build and rehearse live demonstration scenarios.
- [ ] **Task 5.1: Backend Container Optimization**
  - Path: `/server/Dockerfile`
  - Verify that `docker-compose up --build server` completes cleanly without npm warnings.
  - *DoD:* Container builds and starts cleanly in under 30 seconds.
- [ ] **Task 5.2: Live Demo Test Case Support**
  - Rehearse 4 live demo scenarios with team: Flagged household triage, Task dispatch, Tablet sync, and COA chain verification.
  - *DoD:* End-to-end demo flows execute without console errors or delays.

### Markie Angelo (Frontend)
* **Goal:** Polish animations, verify responsive tablet layouts, and rehearse demo flows.
- [ ] **Task 5.1: Responsive Audit & Accessibility Polish**
  - Verify layout renders cleanly on tablet (1024x768) and desktop (1920x1080).
  - Add loading skeletons and clean error toasts for failed network requests.
  - *DoD:* Zero UI clipping or broken scrollbars across screen sizes.
- [ ] **Task 5.2: Live Demo Rehearsal Support**
  - Rehearse 4 live demo scenarios with team.
  - *DoD:* Demo flows execute smoothly with zero console errors.

### Renz Viloria (PM / Data Lead)
* **Goal:** Rehearse live demonstration and finalize capstone presentation slide deck.
- [ ] **Task 5.1: Live Defense Demo Scripting**
  - Script 4 live demonstration scenarios: Graduation Drift Catch, Field Investigation, Sangla-ATM Catch, and Forensic Shield.
  - *DoD:* Rehearsed with team; live demo executes smoothly in under 8 minutes.
- [ ] **Task 5.2: Final Capstone Presentation Slide Deck**
  - Build presentation slides covering Problem, Legal Grounding, PSA FIES Pipeline, MERN+FastAPI Architecture, and Demo.
  - *DoD:* Presentation slide deck exported and ready for evaluation panel.
- [ ] **Task 5.3: Production Clean-Clone Verification**
  - Run clean clone on fresh machine: `git clone <repo-url>` $\to$ `cd KilosUnlad` $\to$ `docker-compose up --build`.
  - *DoD:* All 5 containers boot with zero manual intervention; default admin logs in immediately.
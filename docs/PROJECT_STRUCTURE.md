# KilosUnlad: Project Directory Skeleton & Component Guide

## Complete Monorepo Layout and File-by-File Breakdown

---

## 1. Master Repository Tree

```text
kilos-unlad/
├── .github/                            # CI/CD Workflows & PR Templates
│   └── workflows/
│       ├── lint-and-test.yml           # Automated linting & unit tests
│       └── docker-build.yml            # Container build verification
│
├── docs/                               # System Documentation & Specifications
│   ├── PROJECT_OVERVIEW.md             # Project vision, problems, and legal basis
│   ├── ARCHITECTURE.md                 # System architecture and technical breakdown
│   ├── PROJECT_STRUCTURE.md            # File-by-file directory explanation
│   └── contracts/                      # Frozen API schemas & data contracts
│       ├── backend-to-ml.json          # Express to FastAPI inference contract
│       └── field-task-submission.json  # Tablet PWA to Express submission schema
│
├── docker/                             # Infrastructure & Container Configurations
│   ├── nginx/
│   │   ├── default.conf                # Nginx proxy, SSL, and rate-limiting rules
│   │   └── Dockerfile                  # Gateway container build
│   └── mongo/
│       └── init-mongo.js               # MongoDB bootstrap script (indexes & users)
│
├── client/                             # FRONTEND: Desktop Web & Tablet PWA (Owner: Markie)
│   ├── public/
│   │   ├── favicon.ico
│   │   ├── manifest.json               # PWA configuration for tablet install
│   │   └── service-worker.js           # PWA offline asset caching script
│   ├── src/
│   │   ├── assets/                     # Logos, DSWD branding, icons
│   │   ├── components/                 # Reusable UI primitives
│   │   │   ├── common/                 # Buttons, inputs, modal dialogs, badges
│   │   │   ├── layout/                 # Sidebar, TopNav, AppShell
│   │   │   └── feedback/               # Loading spinners, error alerts
│   │   ├── features/                   # Domain-driven feature modules
│   │   │   ├── auth/                   # Login screen & session handling
│   │   │   ├── dashboard/              # Regional heatmaps & metric cards
│   │   │   ├── triage/                 # High-risk anomaly review table
│   │   │   ├── verification/           # Offline-first field checklist & photo capture
│   │   │   ├── due-process/             # 15-day appeal tracking & docket views
│   │   │   └── audit-ledger/            # COA cryptographic chain inspector
│   │   ├── hooks/                      # Custom React hooks
│   │   │   ├── useGeolocation.js       # HTML5 device coordinates extractor
│   │   │   ├── useOfflineSync.js       # Detects network status & triggers sync
│   │   │   └── useAuth.js              # Session & role validation hook
│   │   ├── services/                   # Data access layer
│   │   │   ├── api.js                  # Axios HTTP client with JWT interceptors
│   │   │   └── indexedDB.js            # Offline task storage manager (Dexie.js / idb)
│   │   ├── utils/                      # Helper utilities
│   │   │   ├── formatters.js            # Currency (PHP), dates, SWDI tier labels
│   │   │   └── photoHasher.js           # Client-side SHA-256 calculation
│   │   ├── App.jsx                     # Route definitions & protected routes
│   │   ├── main.jsx                    # React entry point
│   │   └── index.css                   # TailwindCSS directives & styles
│   ├── package.json
│   ├── vite.config.js                  # Vite configuration + PWA plugins
│   └── Dockerfile                      # Multi-stage frontend container build
│
├── server/                             # BACKEND: Core API & Workflows (Owner: Mae)
│   ├── src/
│   │   ├── config/                     # Service connections
│   │   │   ├── database.js             # Mongoose connection & error listeners
│   │   │   └── environment.js          # Validated process.env variables
│   │   ├── constants/                  # Enums & statutory constants
│   │   │   ├── roles.js                # SUPER_ADMIN, REGIONAL_DIRECTOR, etc.
│   │   │   ├── statuses.js             # State machine enum definitions
│   │   │   └── thresholds.js            # Lifeline limits (200 kWh, 25 cu.m)
│   │   ├── controllers/                # HTTP request handlers
│   │   │   ├── auth.controller.js
│   │   │   ├── beneficiary.controller.js
│   │   │   ├── task.controller.js
│   │   │   ├── appeal.controller.js
│   │   │   ├── audit.controller.js
│   │   │   └── calamity.controller.js
│   │   ├── middleware/                 # Express request interceptors
│   │   │   ├── auth.middleware.js      # JWT verification
│   │   │   ├── rbac.middleware.js      # Role & jurisdictional boundary guard
│   │   │   ├── audit.middleware.js     # Automatic hash-chain recording
│   │   │   ├── validation.middleware.js# Joi / Zod request body validation
│   │   │   └── error.middleware.js      # Centralized error handler
│   │   ├── models/                     # Mongoose Schemas (Owner: Dustin)
│   │   │   ├── User.js
│   │   │   ├── Beneficiary.js
│   │   │   ├── ExternalRecord.js
│   │   │   ├── VerificationTask.js
│   │   │   ├── AuditLog.js
│   │   │   └── SystemConfig.js
│   │   ├── routes/                     # API Route declarations
│   │   │   ├── v1/
│   │   │   │   ├── auth.routes.js
│   │   │   │   ├── beneficiary.routes.js
│   │   │   │   ├── task.routes.js
│   │   │   │   ├── appeal.routes.js
│   │   │   │   ├── audit.routes.js
│   │   │   │   └── index.js
│   │   ├── services/                   # Core business logic engines
│   │   │   ├── mlClient.service.js     # Internal HTTP client calling Python ML
│   │   │   ├── hashChain.service.js    # SHA-256 Canonical JSON chain generator
│   │   │   ├── taskDispatcher.service.js # Auto-assigns tasks to Municipal Links
│   │   │   ├── appealLifecycle.service.js # Manages the 15-day countdown clock
│   │   │   └── sync.service.js         # Processes batch uploads from field tablets
│   │   ├── utils/                      # Helper functions
│   │   │   ├── canonicalJson.js        # Deterministic key-sorting stringifier
│   │   │   ├── cryptoHelper.js         # SHA-256 hashing utilities
│   │   │   └── geoFence.js             # Haversine distance calculator (< 250m)
│   │   └── app.js                      # Express app setup & middleware mounting
│   ├── server.js                       # Server entry point (starts HTTP listener)
│   ├── package.json
│   └── Dockerfile                      # Node.js alpine container build
│
├── ml-service/                         # AI & ANALYTICS MICROSERVICE (Owner: Charles)
│   ├── app/
│   │   ├── api/                        # FastAPI route endpoints
│   │   │   ├── v1/
│   │   │   │   ├── predict.py          # POST /predict-swdi
│   │   │   │   ├── telemetry.py        # POST /score-atm-stream
│   │   │   │   └── health.py           # GET /health
│   │   │   └── router.py               # Aggregated API router
│   │   ├── core/                       # Service configuration
│   │   │   └── config.py               # Pydantic settings & environment vars
│   │   ├── schemas/                    # Pydantic Request & Response Contracts
│   │   │   ├── inference.py            # Feature vector & prediction schemas
│   │   │   └── telemetry.py            # ATM switch log batch schemas
│   │   ├── services/                   # Machine Learning logic
│   │   │   ├── classifier.py           # LightGBM model loader & inference runner
│   │   │   ├── explainer.py            # SHAP attribution weight calculator
│   │   │   └── anomaly.py              # ATM sliding-window velocity algorithm
│   │   └── main.py                     # FastAPI application entry point
│   ├── artifacts/                      # Serialized ML Models & Scalers
│   │   ├── lightgbm_swdi_v1.joblib     # Pre-trained classifier weights
│   │   ├── feature_scaler.joblib       # Fitted feature scaler
│   │   └── model_metadata.json         # Training metrics, accuracy, date
│   ├── requirements.txt                # Python dependencies (FastAPI, LightGBM)
│   └── Dockerfile                      # Python slim container build
│
├── data-pipeline/                      # DATA GENERATION & SEEDING (Owner: Renz)
│   ├── generator/                      # Econometric Synthetic Data Generator
│   │   ├── distributions.py            # PSA FIES Poisson & LogNormal formulas
│   │   ├── latent_wealth.py            # W_i mathematical formula
│   │   └── generator.py                # Main generation script producing seeds
│   ├── seeds/                          # Generated Seed Files (JSON)
│   │   ├── seed_beneficiaries.json     # 5,000 synthetic household profiles
│   │   └── seed_external_records.json  # Mock Meralco, LTO, Maynilad data
│   ├── scripts/                        # Database population scripts
│   │   └── seed_db.py                  # Ingests JSON seed files into MongoDB
│   └── requirements.txt                # Generator dependencies (Faker, NumPy)
│
├── .env.example                        # Template for environment variables
├── .gitignore                          # Git exclusion rules
├── docker-compose.yml                  # Root container orchestrator
└── README.md                           # Quickstart guide
```

---

## 2. Component Deep Dive: Roles, Folders, and Files

### PART A: Frontend (`/client`)

- **Primary Owner:** Markie Angelo (Code) & Renz Viloria (Wireframes)
- **Technology:** React (Vite), TailwindCSS, Dexie.js (IndexedDB wrapper)

#### Folders

- **`public/`:** Contains static assets served directly without build processing.
  - **`manifest.json`:** Web app manifest allowing the tablet interface to be installed on home screens like a native app.
  - **`service-worker.js`:** Intercepts network requests and caches application assets, enabling offline startup in areas with no cellular signal.

- **`src/components/`:** Reusable, domain-agnostic UI elements.
  - **`common/`:** Atomic components (buttons, input fields, badges, modals).
  - **`layout/`:** Top-level structure components (`Sidebar.jsx`, `TopNav.jsx`, `AppShell.jsx`).
  - **`feedback/`:** Alert banners, skeleton loaders, and error boundaries.

- **`src/features/`:** Modular, domain-driven views matching user workflows.
  - **`auth/`:** Login interface and session handling.
  - **`dashboard/`:** Analytics visualizer displaying regional heatmaps and case summary metrics.
  - **`triage/`:** The priority queue table where supervisors view flagged households (`S_i ≥ 70`).
  - **`verification/`:** The tablet field checklist, asset questionnaire, and camera capture screen.
  - **`due-process/`:** The 15-day appeal tracking interface and hearing docket manager.
  - **`audit-ledger/`:** The Commission on Audit (COA) interface used to verify cryptographic hash chains.

- **`src/hooks/`:** Custom React lifecycle hooks.
  - **`useGeolocation.js`:** Accesses the browser's HTML5 Geolocation API to retrieve high-accuracy GPS coordinates during field visits.
  - **`useOfflineSync.js`:** Monitors network status (online/offline) and automatically triggers batch uploads from IndexedDB when a connection is restored.
  - **`useAuth.js`:** Provides user role information and token refresh state to protected route components.

- **`src/services/`:** External interaction services.
  - **`api.js`:** Axios instance configured with base URLs, timeouts, and automatic JWT authorization header injection.
  - **`indexedDB.js`:** Local database manager handling task caching, offline checklist persistence, and synchronization queues.

- **`src/utils/`:** Pure helper functions.
  - **`formatters.js`:** Standardizes currency (PHP), timestamps, and SWDI tier badge styling.
  - **`photoHasher.js`:** Computes the SHA-256 hash of an image file on the client before upload.

---

### PART B: Backend (`/server`)

- **Primary Owner:** Mae Santos
- **Technology:** Node.js, Express.js, Mongoose, Joi/Zod

#### Folders

- **`src/config/`:** Configuration setup.
  - **`database.js`:** Manages MongoDB connection pooling, reconnection logic, and error handlers.
  - **`environment.js`:** Validates and exposes environment variables (`PORT`, `JWT_SECRET`, `ML_SERVICE_URL`).

- **`src/constants/`:** System-wide immutable enums.
  - **`roles.js`:** Defines `SUPER_ADMIN`, `REGIONAL_DIRECTOR`, `CASE_WORKER`, `COA_AUDITOR`.
  - **`statuses.js`:** Defines state machine values: `ACTIVE_COMPLIANT`, `FLAGGED_FOR_REVIEW`, `UNDER_INVESTIGATION`, `NOTICE_OF_INELIGIBILITY`, `GRADUATED`.
  - **`thresholds.js`:** Defines statutory limits (200 kWh power lifeline threshold, 25 cu.m water threshold).

- **`src/controllers/`:** Route handlers managing HTTP request-response cycles.
  - **`auth.controller.js`:** Handles login, token refresh, and logout operations.
  - **`beneficiary.controller.js`:** Manages queries and status updates for household profiles.
  - **`task.controller.js`:** Handles task creation, dispatching, and Municipal Link assignment.
  - **`appeal.controller.js`:** Manages the 15-day appeal countdown and hearing docket logging.
  - **`audit.controller.js`:** Serves cryptographic chain verification endpoints for COA auditors.
  - **`calamity.controller.js`:** Manages NDRRMC State of Calamity compliance freezes by municipality.

- **`src/middleware/`:** Express request interceptors.
  - **`auth.middleware.js`:** Validates incoming JWT access tokens.
  - **`rbac.middleware.js`:** Enforces role boundaries and geographic jurisdiction restrictions.
  - **`audit.middleware.js`:** Intercepts mutating requests (POST, PUT, PATCH) to automatically append records to the hash chain.
  - **`validation.middleware.js`:** Validates incoming request payloads against schemas.
  - **`error.middleware.js`:** Formats uncaught exceptions into clean JSON responses.

- **`src/routes/v1/`:** Express router definitions mapping paths to controllers.
  - **`auth.routes.js`:** `/api/v1/auth/*`
  - **`beneficiary.routes.js`:** `/api/v1/beneficiaries/*`
  - **`task.routes.js`:** `/api/v1/tasks/*`
  - **`appeal.routes.js`:** `/api/v1/appeals/*`
  - **`audit.routes.js`:** `/api/v1/audit/*`

- **`src/services/`:** Core business logic.
  - **`mlClient.service.js`:** Internal HTTP client that sends inference requests to the Python FastAPI microservice.
  - **`hashChain.service.js`:** Formats payloads using Canonical JSON, queries the previous log entry's hash, and calculates the new SHA-256 block.
  - **`taskDispatcher.service.js`:** Matches flagged households to Municipal Links based on barangay assignments.
  - **`appealLifecycle.service.js`:** Monitors the 15-day statutory countdown timer.
  - **`sync.service.js`:** Ingests and reconciles batch uploads from field tablets.

- **`src/utils/`:** Helper utilities.
  - **`canonicalJson.js`:** Stringifies JSON objects with deterministically sorted keys to ensure consistent hash calculations.
  - **`cryptoHelper.js`:** Wraps Node.js crypto functions for SHA-256 generation.
  - **`geoFence.js`:** Calculates the distance between field photo coordinates and registered household coordinates using the Haversine formula.

---

### PART C: Database Layer (`/server/src/models` & `/docker/mongo`)

- **Primary Owner:** Dustin Martinez
- **Technology:** MongoDB 6.0, Mongoose, 2dsphere Spatial Indexing

#### Database Models (`/server/src/models/`)

- **`User.js`:** Stores user profiles, hashed credentials (Argon2id), roles, and assigned geographic jurisdictions. Indexed by `{ email: 1 }` and `{ username: 1 }`.

- **`Beneficiary.js`:** Stores household profiles, demographics, children birthdates, current SWDI levels, risk scores, and program status. Indexed by `{ household_id: 1 }`, `{ "address.coordinates": "2dsphere" }`, and `{ "risk_assessment.is_flagged": 1 }`.

- **`ExternalRecord.js`:** Simulated registry store holding cross-matched utility accounts (Meralco kWh, Maynilad water meters), LTO vehicle registrations, and LandBank card telemetry. Indexed by `{ matched_household_id: 1 }` and `{ national_id: 1 }`.

- **`VerificationTask.js`:** Stores field investigation tickets, assigned social workers, digital assessment checklists, interview narratives, and photo metadata. Indexed by `{ task_id: 1 }` and `{ assigned_worker_id: 1, task_status: 1 }`.

- **`AuditLog.js`:** The append-only cryptographic ledger. Stores sequence numbers, previous entry hashes, timestamps, actor IDs, state deltas, and SHA-256 entry hashes. Indexed by `{ sequence_index: 1 }` and `{ entry_hash: 1 }`.

- **`SystemConfig.js`:** Stores active calamity moratorium zones and configuration toggles.

- **`init-mongo.js`:** Database bootstrap script that provisions users, sets up role permissions, and creates indexes when the container first starts.

---

### PART D: Machine Learning Microservice (`/ml-service`)

- **Primary Owner:** Charles Cabatian
- **Technology:** Python 3.10, FastAPI, LightGBM, SHAP, Pydantic, Scikit-Learn

#### Folders

- **`app/api/v1/`:** HTTP route endpoints.
  - **`predict.py`:** Exposes `POST /api/v1/predict-swdi` to compute poverty tier probabilities.
  - **`telemetry.py`:** Exposes `POST /api/v1/score-atm-stream` to run sliding-window velocity checks on LandBank ATM logs.
  - **`health.py`:** Exposes `GET /health` for container orchestration checks.

- **`app/core/`:** Application settings.
  - **`config.py`:** Pydantic settings loading model paths, thresholds, and service parameters from environment variables.

- **`app/schemas/`:** Data contracts.
  - **`inference.py`:** Pydantic models defining the 6-feature input vector and the prediction response schema.
  - **`telemetry.py`:** Pydantic models validating ATM transaction batch inputs.

- **`app/services/`:** Core analytical logic.
  - **`classifier.py`:** Loads the serialized LightGBM model (`.joblib`) into memory and executes inference.
  - **`explainer.py`:** Calculates local SHAP attribution values for top contributing features.
  - **`anomaly.py`:** Evaluates ATM transaction streams for Sangla-ATM patterns (sub-45s intervals, nocturnal timestamps, repeated card clusters).

- **`artifacts/`:** Model storage.
  - **`lightgbm_swdi_v1.joblib`:** Serialized decision tree model trained on synthetic proxy-means data.
  - **`feature_scaler.joblib`:** Standardized scaler weights applied to demographic features.
  - **`model_metadata.json`:** Records training parameters, accuracy metrics, and serialization dates.

---

### PART E: Data Generation & Seeding Pipeline (`/data-pipeline`)

- **Primary Owner:** Renz Viloria
- **Technology:** Python 3.10, NumPy, Pandas, Faker

#### Folders

- **`generator/`:** The synthetic data engine.
  - **`distributions.py`:** Implements mathematical sampling formulas (Poisson distribution for household size, Beta distribution for dependency ratios, LogNormal distribution for electricity and water usage).
  - **`latent_wealth.py`:** Implements the Latent Wealth Index formula (`W_i ∈ [0, 100]`) to establish realistic relationships between living conditions and income.
  - **`generator.py`:** Orchestrates dataset generation, outputting balanced cohorts (60% Compliant, 15% Unreported Graduation, 10% Asset Anomaly, 15% Sinking/Vulnerable).

- **`seeds/`:** Output JSON files.
  - **`seed_beneficiaries.json`:** 5,000 synthetic household profiles ready for database ingestion.
  - **`seed_external_records.json`:** Matching simulated utility, vehicle, and telecom records.

- **`scripts/`:** Ingestion tooling.
  - **`seed_db.py`:** Connects directly to MongoDB and populates collections with generated seed data.

---

### PART F: Gateway & Infrastructure (`/docker` & Root)

- **Primary Owners:** Dustin Martinez & Mae Santos
- **Technology:** Docker, Docker Compose, Nginx

#### Files

- **`docker/nginx/default.conf`:** Configures Nginx reverse-proxy routing, TLS parameters, security headers, and rate-limiting zones.

- **`docker-compose.yml`:** Multi-container orchestrator that builds and boots the 5 core services (gateway, client, server, ml-service, db) on an isolated internal bridge network.

- **`.env.example`:** Documents all required environment variables across services without exposing real credentials.
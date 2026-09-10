# KilosUnlad: Team Onboarding & Contribution Guide

**Target Audience:** Development Team (Renz, Charles, Mae, Dustin, Markie)

---

# Welcome to the KilosUnlad Engineering Team

Welcome to the team. KilosUnlad is an evidence-driven, Human-in-the-Loop (HITL) Management Information System (MIS) designed for the Department of Social Welfare and Development (DSWD). It audits and verifies the socioeconomic trajectory of beneficiaries under the Pantawid Pamilyang Pilipino Program (4Ps).

This guide is designed to get you from cloning the repository to making your first commit without guessing what to read or what to build.

---

## 1. Quickstart: Setting Up Your Local Environment

Before diving into your specific domain, ensure your local development machine has the following prerequisites installed:

- Docker & Docker Compose (Docker Desktop or Docker Engine v24+)
- Node.js (v18 LTS or v20 LTS) & npm
- Python (v3.10 or v3.11) & pip
- Git

### First-Time Boot

```bash
# 1. Clone the monorepo
git clone https://github.com/your-org/kilos-unlad.git
cd kilos-unlad

# 2. Copy the global environment variables
cp .env.example .env

# 3. Boot all 5 core containers (Gateway, Frontend, Backend, ML, MongoDB)
docker-compose up --build
````

Once booted:

* **Desktop Web Client & PWA:** `http://localhost:3000` (or `http://localhost`)
* **Express Backend API:** `http://localhost:5000/api/v1`
* **Python FastAPI ML Docs:** `http://localhost:8000/docs` (Swagger UI)
* **MongoDB Database:** `mongodb://localhost:27017/kilosunlad`

---

## 2. Universal Reading: Mandatory for All 5 Members

Before touching any code or discussing features, every team member must read these three files in `/docs`:

### 1. `/docs/PROJECT_OVERVIEW.md`

**Why:** Understand the real-world problem, the legal framework (RA 11310, RA 11552), DSWD's 3-tier well-being scale (Survival, Subsistence, Self-Sufficiency), and why our system never terminates beneficiaries automatically.

### 2. `/docs/ARCHITECTURE.md`

**Why:** Understand how your service talks to other services, what happens when network connectivity drops, and why we decoupled the Node.js application from the Python ML service.

### 3. `/docs/PROJECT_STRUCTURE.md`

**Why:** Understand the layout of the monorepo, where files live, and which directory boundaries you own.

---

## 3. Role-Based Onboarding Paths: What to Read & What to Build

Find your name below. This is your personal roadmap for Day 1 through Day 5.

---

# Dustin Martinez — Database Architecture Lead

* **Primary Domain:** `/server/src/models/` and `/docker/mongo/`
* **Your Mission:** Ensure data integrity, strict schema validation, spatial query performance, and tamper-proof database permission locks.

### 1. Your Reading List

* [ ] `/docs/ARCHITECTURE.md` → Read Layer 5 (Database Layer).
* [ ] `/docs/PROJECT_STRUCTURE.md` → Read PART C: Database Layer.
* [ ] `/docs/contracts/backend-to-ml.json` and `/docs/contracts/field-task-submission.json` → Check required field types.

### 2. Your File Ownership

* `/server/src/models/User.js`
* `/server/src/models/Beneficiary.js`
* `/server/src/models/ExternalRecord.js`
* `/server/src/models/VerificationTask.js`
* `/server/src/models/AuditLog.js`
* `/server/src/models/SystemConfig.js`
* `/docker/mongo/init-mongo.js`

### 3. Your First Deliverables (Sprint 1)

1. **Bootstrap MongoDB:** Write `/docker/mongo/init-mongo.js` to create the database users, provision initial collections, and register indexes upon container startup.
2. **Code Mongoose Schemas:** Build the 6 schema files in `/server/src/models/`. Enforce `{ strict: true }` and add the `2dsphere` spatial index on `beneficiaries.address.coordinates`.
3. **Database Security Lock:** Configure database credentials so that the backend application user has insert and find privileges only on `audit_logs` (preventing updates and deletes).

---

# Mae Santos — Backend Engineering Lead

* **Primary Domain:** `/server/`
* **Your Mission:** Build the business logic engine, API routing, JWT authentication, task dispatcher, 15-day appeal countdown, and the cryptographic hash chain.

### 1. Your Reading List

* [ ] `/docs/ARCHITECTURE.md` → Read Layer 3 (Core Application Service Layer).
* [ ] `/docs/PROJECT_STRUCTURE.md` → Read PART B: Backend (`/server`).
* [ ] `/docs/contracts/backend-to-ml.json` → Interface contract for communicating with Charles’s Python service.
* [ ] `/docs/contracts/field-task-submission.json` → Interface contract for receiving Markie’s tablet submissions.

### 2. Your File Ownership

* `/server/src/app.js` and `/server/server.js`
* `/server/src/controllers/*`
* `/server/src/middleware/*`
* `/server/src/routes/v1/*`
* `/server/src/services/*`
* `/server/src/utils/*`

### 3. Your First Deliverables (Sprint 1)

1. **Build the Forensic Hash Utility:** Implement `/server/src/utils/canonicalJson.js` (using `fast-json-stable-stringify`) and `/server/src/services/hashChain.service.js` to calculate SHA-256 blocks for the audit trail.
2. **Scaffold Express & Auth:** Set up the Express router in `/server/src/routes/v1/`, configure JWT authentication in `/server/src/middleware/auth.middleware.js`, and build role checks in `rbac.middleware.js`.
3. **Integrate Internal ML Client:** Create `/server/src/services/mlClient.service.js` using Axios to send demographic vectors to Charles’s FastAPI endpoint and handle timeouts gracefully.

---

# Charles Cabatian — Machine Learning Modeling Lead

* **Primary Domain:** `/ml-service/`
* **Your Mission:** Build the Python FastAPI service, train and serialize the LightGBM poverty classifier, integrate SHAP explainability, and implement the ATM anomaly detection algorithm.

### 1. Your Reading List

* [ ] `/docs/ARCHITECTURE.md` → Read Layer 4 (AI & Analytics Service).
* [ ] `/docs/PROJECT_STRUCTURE.md` → Read PART D: Machine Learning Microservice.
* [ ] `/docs/contracts/backend-to-ml.json` → Your contract with Mae’s backend.

### 2. Your File Ownership

* `/ml-service/app/main.py`
* `/ml-service/app/api/v1/*`
* `/ml-service/app/schemas/*`
* `/ml-service/app/services/*`
* `/ml-service/artifacts/*`
* `/ml-service/requirements.txt` and Dockerfile

### 3. Your First Deliverables (Sprint 1)

1. **Scaffold FastAPI Microservice:** Create `/ml-service/app/main.py` and set up Pydantic validation models in `/ml-service/app/schemas/inference.py` matching the frozen contract.
2. **Train & Serialize LightGBM Model:** Once Renz provides the synthetic seed dataset, train the multi-class classifier (Levels 1, 2, 3), serialize the weights to `/ml-service/artifacts/lightgbm_swdi_v1.joblib`, and build `/ml-service/app/services/classifier.py`.
3. **Build ATM Sliding-Window Scorer:** Implement the Sangla-ATM anomaly algorithm in `/ml-service/app/services/anomaly.py` to flag clusters of rapid-fire, nocturnal ATM withdrawals.

---

# Markie Angelo — Frontend Engineering Lead

* **Primary Domain:** `/client/`
* **Your Mission:** Build the desktop web portal for supervisors and auditors, and create the offline-first tablet interface for social workers in the field.

### 1. Your Reading List

* [ ] `/docs/ARCHITECTURE.md` → Read Layer 1 (Presentation Layer).
* [ ] `/docs/PROJECT_STRUCTURE.md` → Read PART A: Frontend (`/client`).
* [ ] `/docs/contracts/field-task-submission.json` → Your contract with Mae’s backend.

### 2. Your File Ownership

* `/client/public/manifest.json` and `/client/public/service-worker.js`
* `/client/src/components/*`
* `/client/src/features/*`
* `/client/src/hooks/*`
* `/client/src/services/*`
* `/client/vite.config.js` and `package.json`

### 3. Your First Deliverables (Sprint 1)

1. **Initialize Vite React & Tailwind:** Set up the frontend shell, navigation bars, and responsive layouts in `/client/src/components/layout/`.
2. **Implement Offline Storage (Dexie.js / IndexedDB):** Build `/client/src/services/indexedDB.js` to cache assigned tasks on the tablet and manage local offline form state.
3. **Build the Field Checklist View:** Build `/client/src/features/verification/` with mobile camera integration and HTML5 geolocation capture (`/client/src/hooks/useGeolocation.js`).

---

# Renz Viloria — Project Manager & Data Pipeline Lead

* **Primary Domain:** `/data-pipeline/`, UI Wireframes, and Cross-Team Integration
* **Your Mission:** Coordinate team execution, build the synthetic data generator grounded in PSA statistics, seed the database, and align UI designs with Markie.

### 1. Your Reading List

* [ ] Review all documents in `/docs/` for end-to-end consistency.
* [ ] Review `/docs/PROJECT_STRUCTURE.md` → PART E: Data Generation Pipeline.

### 2. Your File Ownership

* `/data-pipeline/generator/*`
* `/data-pipeline/seeds/*`
* `/data-pipeline/scripts/seed_db.py`
* `/docker-compose.yml`, `.env.example`, `.gitignore`, `README.md`

### 3. Your First Deliverables (Sprint 1)

1. **Build the Synthetic Generator:** Code `/data-pipeline/generator/latent_wealth.py` and `generator.py` based on PSA FIES poverty distributions to produce 5,000 realistic synthetic records.
2. **Deliver Seed Datasets:** Output `seed_beneficiaries.json` and `seed_external_records.json` so Dustin can seed MongoDB and Charles can train the ML model.
3. **Wireframe Field & Admin Views:** Deliver layout wireframes to Markie for the Triage Queue and the Mobile Field Checklist.

---

## 4. Git Workflow & Team Collaboration Rules

To keep our monorepo clean and prevent code conflicts, we follow these guidelines.

### Branch Naming Conventions

* `feat/<feature-name>`
  Example: `feat/hash-chain-service`, `feat/offline-indexeddb`

* `fix/<bug-name>`
  Example: `fix/jwt-expiration-handler`

* `docs/<doc-name>`
  Example: `docs/update-api-contracts`

### The Three Golden Rules of the Repository

#### 1. Never Break Contracts

You cannot change JSON payload structures in `/docs/contracts/` without notifying the entire team. A backend change breaks the frontend; an ML change breaks the backend.

#### 2. Keep Commits Scoped

Do not mix database schema updates with UI styling changes in the same commit. Keep pull requests focused on your specific domain.

#### 3. All PRs Must Build

Before submitting a Pull Request, run:

```bash
docker-compose up --build
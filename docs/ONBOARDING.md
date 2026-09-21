# KilosUnlad: Team Onboarding & Engineering Execution Guide
**Project Repository:** `https://github.com/renzv-compsci/KilosUnlad.git`  
**Target Audience:** Development Team (Dustin, Mae, Charles, Markie, Renz)  
**Last Updated:** Phase 1 Initialization  

---

> # ⚠️ CRITICAL NOTICE: READ THIS ONBOARDING GUIDE FIRST!
> **1. DO NOT WRITE CODE OR START WORKING UNTIL YOU READ THIS DOCUMENT.**  
> **2. STRICT RULE: DO NOT PUSH DIRECTLY TO THE `main` BRANCH!**  
>
> All developers MUST create and work inside their assigned **Role Branch** (e.g., `backend-mae`, `database-dustin`, `frontend-markie`, `ml-charles`). 
> 
> Direct pushes to `main` are strictly forbidden. You must push to your role branch, open a Pull Request (PR), and **wait for Renz (PM) to review and merge it**. Renz will notify you via GitHub comments and our team group chat once your code is merged into `main`.

---

## 1. The Gist of KilosUnlad: What We Are Building

The **Pantawid Pamilyang Pilipino Program (4Ps)** is the Philippine government's conditional cash transfer program under **Republic Act No. 11310** [1]. It provides cash grants to indigent families to keep children in school and healthy.

Families are supported for up to **7 years** while transitioning across three well-being levels:
1. **Level 1: Survival** (Extremely poor, daily subsistence needs unmet)
2. **Level 2: Subsistence** (Transitional phase, economically vulnerable)
3. **Level 3: Self-Sufficiency** (Financially stable, ready for *"Pugay-Tagumpay"* graduation)

### The Real-World Problems We Solve:
* **Graduation Lag:** Self-sufficient families remain on the cash list because DSWD relies on slow, manual paper spot-checks, depriving poorer waitlisted families of assistance.
* **Loan Sharks (*Sangla-ATM*):** Predatory lenders illegally confiscate 4Ps LandBank ATM cards from beneficiaries as loan collateral, seizing government grants on payout day.
* **Political Tampering (*Palakasan*):** Paper records can be altered to shield allies or unfairly delist qualified households.

### Our Solution:
**KilosUnlad** is an evidence-driven, Human-in-the-Loop (HITL) Decision-Support System.
1. **It cross-references public records:** Checks electricity (RA 11552 Lifeline limits) [2], water consumption, and LTO vehicle registrations.
2. **AI advises, humans decide:** A LightGBM model estimates socioeconomic well-being tiers, but **the system NEVER automatically delists anyone**. Flags only dispatch human social workers to verify living conditions in person.
3. **The Digital Seal:** Every database change is sealed into a SHA-256 cryptographic hash chain, making tampering impossible.
4. **Statutory Due Process:** Recommended graduations trigger a mandatory **15-day appeal countdown window** before benefits are modified.

---

## 2. The 5-Step Developer Onboarding Flow

To contribute effectively, follow this sequence:

```text
[ STEP 1: Read This Guide ] 
  Understand the vision, system boundaries, and setup instructions.
         │
         ▼
[ STEP 2: Read The Core Architecture Docs ]
  • /docs/PROJECT_OVERVIEW.md     ──► Deep domain, legal, and operational context.
  • /docs/ARCHITECTURE.md         ──► System boundaries (Frontend, Backend, DB, ML).
  • /docs/PROJECT_STRUCTURE.md    ──► File-by-file directory explanation.
  • /docs/CONNECTIVITY_TESTING.md ──► Service health verification procedures.
  • /docs/decisions/              ──► Official team architectural decisions & changes.
         │
         ▼
[ STEP 3: Pair The AI Prompts with Your LLM ]
  Combine the Master System Prompt with your Role-Specific Prompt in ChatGPT/Claude.
         │
         ▼
[ STEP 4: Run The Mandatory Connectivity Smoke Test ]
  Execute your assigned test in /docs/CONNECTIVITY_TESTING.md.
         │
         ▼
[ STEP 5: Create Your Role Branch & Start Phase 1 ]
  Checkout your assigned role branch, code your tasks, and open a PR.
```

---

## 3. How to Use the AI Prompts (AI-Assisted Workflow)

To ensure any code generated with an AI assistant (ChatGPT, Claude, GitHub Copilot) matches our architecture and doesn't hallucinate non-existent files or break contracts, use our **Two-Prompt System**:

### The Formula:
```text
[ SYSTEM_OVERVIEW_PROMPT.md ]  +  [ <YOUR_ROLE>_PROMPT.md ]  +  "Your Specific Question"
```

1. Open **`/docs/prompts/SYSTEM_OVERVIEW_PROMPT.md`** and copy the entire text. (This gives the AI full global context of 4Ps, laws, and MERN + FastAPI architecture).
2. Open your specific role prompt in **`/docs/prompts/`**:
   * Dustin $\to$ `DUSTIN_DATABASE.md`
   * Mae $\to$ `MAE_BACKEND_PROMPT.md`
   * Charles $\to$ `CHARLES_ML.md`
   * Markie $\to$ `MARKIE_FRONTEND_PROMPT.md`
   * Renz $\to$ `RENZ_DATA_PROMPT.md`
3. Paste **both prompts together** into your AI session.
4. Ask your AI to implement a specific task from your roadmap (e.g., *"Implement Task 1.2 from my task list using Mongoose"*). The AI will generate code that perfectly matches our file paths and data contracts!

---

## 4. Local Environment Setup & Terminal Commands

### Prerequisites to Install on Your Laptop:
* **Docker Desktop** (Make sure it is running in your system tray)
* **Node.js** (v18 LTS or v20 LTS) & **npm**
* **Python** (v3.10 or v3.11) & **pip**
* **Git**

---

### Step-by-Step Terminal Initialization:

#### 1. Clone the `KilosUnlad` Repository
```bash
git clone https://github.com/renzv-compsci/KilosUnlad.git
cd KilosUnlad
```

#### 2. Configure Your Environment Variables
Copy the master `.env.example` template into your active `.env` file:
```bash
# Windows Command Prompt:
copy .env.example .env

# Windows PowerShell or Mac/Linux Terminal:
cp .env.example .env
```
*(You do not need to edit anything inside `.env` to get started. It is pre-configured for local Docker Compose networking).*

#### 3. Package & Dependency Management
Each subsystem has its own package manifest that you must follow:
* **Client (Frontend):** Configured via `/client/package.json` (React 18, Vite, Tailwind, Dexie).
* **Server (Backend):** Configured via `/server/package.json` (Express, Mongoose, JWT, Axios, Fast-JSON-Stable-Stringify).
* **ML Microservice:** Configured via `/ml-service/requirements.txt` (FastAPI, LightGBM, SHAP, Pydantic).
* **Data Pipeline:** Configured via `/data-pipeline/requirements.txt` (NumPy, Pandas, Faker, PyArrow).

#### 4. CREATE YOUR ASSIGNED ROLE BRANCH (MANDATORY BEFORE CODING!)
**Do not code on `main`.** Open your terminal and create your designated role branch immediately:

```bash
# For Dustin (Database):
git checkout -b database-dustin

# For Mae (Backend):
git checkout -b backend-mae

# For Charles (Machine Learning):
git checkout -b ml-charles

# For Markie (Frontend):
git checkout -b frontend-markie

# For Renz (Data Pipeline / PM):
git checkout -b data-renz
```

#### 5. Boot the Full System with Docker
Run this from the root directory to build and boot all 5 services simultaneously:
```bash
docker-compose up --build
```

#### 6. Run Your Connectivity Smoke Test
Before writing any code, open **`/docs/CONNECTIVITY_TESTING.md`** and run your assigned verification test:
* **Dustin:** Execute **Test 1** (Verify MongoDB Compass connection & collections).
* **Charles:** Execute **Test 2** (Verify FastAPI Swagger docs at `localhost:8000/docs`).
* **Mae:** Execute **Test 3** (Verify Express health check & database connection log).
* **Markie:** Execute **Test 4** (Verify React UI on `localhost:3000` with zero console errors).
* **Renz:** Execute **Test 5** (Verify Gateway reverse proxy routing on `localhost:80`).

---

## 5. Universal Reading List (Mandatory for Everyone)

Before starting on your specific domain, read these foundational documents in `/docs`:

1. **`/docs/PROJECT_OVERVIEW.md`**  
   *Understand:* The 4Ps lifecycle, real-world fraud scenarios, legal references (**RA 11310, RA 11552, RA 10173**), and why our system is Human-in-the-Loop.
2. **`/docs/ARCHITECTURE.md`**  
   *Understand:* The decoupled 6-layer architecture, domain boundaries, and failure resilience strategies.
3. **`/docs/PROJECT_STRUCTURE.md`**  
   *Understand:* The complete directory tree and the purpose of every folder and file.
4. **`/docs/CONNECTIVITY_TESTING.md`**  
   *Understand:* How to test and verify health across all service boundaries.
5. **`/docs/decisions/` (Architectural Decision Records)**  
   *Understand:* Review all agreed-upon system resolutions (e.g., `001-database-schema-hardening.md`) before changing schemas or logic.
6. **`/docs/contracts/`**  
   *Understand:* The single source of truth for all API communication. Never write endpoints or fetch requests without checking your contract folder!

---

## 6. Role-Based Roadmaps: What to Read & What to Build

Find your name below. Follow this roadmap to know your files, tasks, and deliverables.

---

### Dustin Martinez — Database Architecture Lead
* **Primary Domain:** `/server/src/models/`, `/docker/mongo/`, `/data-pipeline/scripts/`
* **Your Assigned Branch:** `database-dustin`
* **Your Mission:** Enforce schema validation, configure spatial indexing, secure audit log immutability, and manage database seeding tools.

#### Your Reading & Prompt List:
* [ ] Read `/docs/ARCHITECTURE.md` $\to$ Layer 5 (Database Layer).
* [ ] Read `/docs/PROJECT_STRUCTURE.md` $\to$ PART C: Database Layer.
* [ ] Read `/docs/CONNECTIVITY_TESTING.md` $\to$ **Test 1**.
* [ ] Read `/docs/decisions/001-database-schema-hardening.md`.
* [ ] Your Master AI Prompt: `/docs/prompts/DUSTIN_DATABASE.md`.
* [ ] Your Task Roadmap: `/docs/tasks/DUSTIN_DATABASE.md`.
* [ ] Contracts to Check: `/docs/contracts/admin-web/` and `/docs/contracts/field-tablet/`.

#### Your Exact File Ownership:
* `/server/src/models/User.js`
* `/server/src/models/Beneficiary.js`
* `/server/src/models/ExternalRecord.js`
* `/server/src/models/VerificationTask.js`
* `/server/src/models/AuditLog.js`
* `/server/src/models/SystemConfig.js`
* `/docker/mongo/init-mongo.js`
* `/data-pipeline/scripts/seed_db.py` & `reset_demo.sh`

#### Your Phase 1 Goal (Days 1–3):
1. Complete **Test 1** in `/docs/CONNECTIVITY_TESTING.md` (Verify MongoDB Compass connection).
2. Implement the 6 Mongoose models in `/server/src/models/` with `{ strict: true }` and `{ "address.coordinates": "2dsphere" }`.
3. Standup Deliverable: *"MongoDB boots on Port 27017; all 6 Mongoose models compiled with strict validation and unique indexes."*

---

### Mae Santos — Backend Engineering Lead
* **Primary Domain:** `/server/` (Excluding `/server/src/models/`)
* **Your Assigned Branch:** `backend-mae`
* **Your Mission:** Build the Express REST API, JWT/RBAC middleware, workflow state machine, 15-day appeal countdown, Canonical JSON SHA-256 hash chaining, and tablet batch sync consumer.

#### Your Reading & Prompt List:
* [ ] Read `/docs/ARCHITECTURE.md` $\to$ Layer 3 (Core Application Service Layer).
* [ ] Read `/docs/PROJECT_STRUCTURE.md` $\to$ PART B: Backend (`/server`).
* [ ] Read `/docs/CONNECTIVITY_TESTING.md` $\to$ **Test 3**.
* [ ] Read `/docs/decisions/001-database-schema-hardening.md`.
* [ ] Your Master AI Prompt: `/docs/prompts/MAE_BACKEND_PROMPT.md`.
* [ ] Your Task Roadmap: `/docs/tasks/MAE_BACKEND.md`.
* [ ] Contracts to Check: **All contracts in `/docs/contracts/`**.

#### Your Exact File Ownership:
* `/server/src/controllers/*` (`appeal`, `audit`, `auth`, `beneficiary`, `calamity`, `task`)
* `/server/src/middleware/*` (`audit`, `auth`, `error`, `rbac`, `validation`)
* `/server/src/routes/v1/*` (All route declarations & `index.js`)
* `/server/src/services/*` (`appealLifecycle`, `hashChain`, `mlClient`, `sync`, `taskDispatcher`)
* `/server/src/utils/*` (`canonicalJson.js`, `cryptoHelper.js`, `geoFence.js`)
* `/server/src/app.js` and `/server/server.js`

#### Your Phase 1 Goal (Days 1–3):
1. Complete **Test 3** in `/docs/CONNECTIVITY_TESTING.md` (Verify Express `/health` and DB log).
2. Build `/server/src/utils/canonicalJson.js` (using `fast-json-stable-stringify`) and `/server/src/utils/cryptoHelper.js`.
3. Create mock route handlers returning static JSON from `/docs/contracts/` to **unblock Markie immediately**.
4. Standup Deliverable: *"Express server running on Port 5000; Canonical JSON hasher verified; mock routes unblock Markie."*

---

### Charles Cabatian — Machine Learning Modeling Lead
* **Primary Domain:** `/ml-service/`
* **Your Assigned Branch:** `ml-charles`
* **Your Mission:** Build the Python FastAPI microservice, train the LightGBM classifier on real PSA FIES data, integrate SHAP explainability, and implement the Sangla-ATM anomaly detection algorithm.

#### Your Reading & Prompt List:
* [ ] Read `/docs/ARCHITECTURE.md` $\to$ Layer 4 (AI & Analytics Service).
* [ ] Read `/docs/PROJECT_STRUCTURE.md` $\to$ PART D: Machine Learning Microservice.
* [ ] Read `/docs/CONNECTIVITY_TESTING.md` $\to$ **Test 2**.
* [ ] Your Master AI Prompt: `/docs/prompts/CHARLES_ML.md`.
* [ ] Your Task Roadmap: `/docs/tasks/CHARLES_ML.md`.
* [ ] Contracts to Check: `/docs/contracts/ml/` (`ml-swdi-inference.json`, `ml-atm-telemetry.json`).

#### Your Exact File Ownership:
* `/ml-service/app/main.py`
* `/ml-service/app/api/v1/*` (`health.py`, `predict.py`, `telemetry.py`) & `app/api/router.py`
* `/ml-service/app/core/config.py`
* `/ml-service/app/schemas/*` (`inference.py`, `telemetry.py`)
* `/ml-service/app/services/*` (`anomaly.py`, `classifier.py`, `explainer.py`)
* `/ml-service/artifacts/*` (`model_metadata.json`, `lightgbm_swdi_v1.joblib`)

#### Your Phase 1 Goal (Days 1–3):
1. Complete **Test 2** in `/docs/CONNECTIVITY_TESTING.md` (Verify FastAPI Swagger docs at `localhost:8000/docs`).
2. Ensure dummy prediction endpoints return valid JSON matching `/docs/contracts/ml/` to **unblock Mae**.
3. Standup Deliverable: *"FastAPI microservice running on Port 8000 with Swagger docs; Pydantic schemas validated against frozen contracts."*

---

### Markie Angelo — Frontend Engineering Lead
* **Primary Domain:** `/client/`
* **Your Assigned Branch:** `frontend-markie`
* **Your Mission:** Build the desktop web portal for supervisors and auditors, and build the offline-first tablet interface for social workers in the field.

#### Your Reading & Prompt List:
* [ ] Read `/docs/ARCHITECTURE.md` $\to$ Layer 1 (Presentation Layer).
* [ ] Read `/docs/PROJECT_STRUCTURE.md` $\to$ PART A: Frontend (`/client`).
* [ ] Read `/docs/CONNECTIVITY_TESTING.md` $\to$ **Test 4**.
* [ ] Your Master AI Prompt: `/docs/prompts/MARKIE_FRONTEND_PROMPT.md`.
* [ ] Your Task Roadmap: `/docs/tasks/MARKIE_FRONTEND.md`.
* [ ] Contracts to Check: `/docs/contracts/auth/`, `/docs/contracts/admin-web/`, and `/docs/contracts/field-tablet/`.

#### Your Exact File Ownership:
* `/client/public/*` (`manifest.json`, `service-worker.js`, `favicon.ico`)
* `/client/src/components/*` (`common/`, `feedback/`, `layout/`)
* `/client/src/features/*` (`audit-ledger/`, `auth/`, `dashboard/`, `due-process/`, `triage/`, `verification/`)
* `/client/src/hooks/*` (`useAuth.js`, `useGeolocation.js`, `useOfflineSync.js`)
* `/client/src/services/*` (`api.js`, `indexedDB.js`)
* `/client/src/utils/*` (`formatters.js`, `photoHasher.js`)
* `/client/src/App.jsx`, `index.css`, `main.jsx`

#### Your Phase 1 Goal (Days 1–3):
1. Complete **Test 4** in `/docs/CONNECTIVITY_TESTING.md` (Verify React UI on `localhost:3000` with zero console errors).
2. Build reusable UI buttons, inputs, and risk badges in `/client/src/components/common/`.
3. Import `/docs/contracts/admin-web/admin-triage-feed.json` as static mock data to render the Triage Queue table **without waiting for the backend**.
4. Standup Deliverable: *"React AppShell running on Port 3000 with role-based navigation; Triage Queue rendering mock contract data."*

---

### Renz Viloria — Project Manager, Data Lead & Technical Floater
* **Primary Domain:** Project Management, `/data-pipeline/`, Architecture Governance & UI Wireframing
* **Your Assigned Branch:** `data-renz`
* **Your Mission:** Clean real PSA FIES data, generate 5,000 augmented synthetic records, deliver seed files, facilitate daily standups, and assist teammates across domains.

#### Your Reading & Prompt List:
* [ ] Verify overall consistency across all documents in `/docs/`.
* [ ] Read `/docs/CONNECTIVITY_TESTING.md` $\to$ **Test 5**.
* [ ] Your Master AI Prompt: `/docs/prompts/RENZ_DATA_PROMPT.md`.
* [ ] Your Task Roadmap: `/docs/tasks/RENZ_DATA.md`.
* [ ] Contracts to Check: Ensure `/docs/contracts/` remain strictly frozen.

#### Your Exact File Ownership:
* `/data-pipeline/notebooks/*` (`01_fies_cleaning_and_eda.ipynb`, `02_swdi_feature_engineering.ipynb`)
* `/data-pipeline/generator/*` (`distributions.py`, `latent_wealth.py`, `generator.py`)
* `/data-pipeline/seeds/*` (`features_swdi_clean.parquet`, `seed_beneficiaries.json`, `seed_external_records.json`)
* `/data-pipeline/scripts/*` (`seed_db.py`, `reset_demo.sh`)
* Root project governance (`docker-compose.yml`, `.env.example`, `.gitignore`, `README.md`)

#### Your Phase 1 Goal (Days 1–3):
1. Complete **Test 5** in `/docs/CONNECTIVITY_TESTING.md` (Verify Gateway reverse-proxy on `http://localhost`).
2. Deliver UI wireframes for the Triage Queue and Mobile Field Checklist to Markie.
3. Ingest raw PSA FIES survey data (41,544 rows) and begin data cleaning in Jupyter Notebook.
4. Standup Deliverable: *"Repository infrastructure and contracts locked in; Gateway routing verified; UI wireframes delivered to Markie; raw PSA FIES dataset loaded for cleaning."*

---

## 7. Git Workflow & The Pull Request (PR) Protocol

### The Strict Role-Based Branching Rule:
You must commit and push **only to your assigned branch**:
* Dustin $\to$ `database-dustin`
* Mae $\to$ `backend-mae`
* Charles $\to$ `ml-charles`
* Markie $\to$ `frontend-markie`
* Renz $\to$ `data-renz`

---

### Step-by-Step Workflow (How to Commit & Submit Code):

#### 1. Stage and Commit Your Changes
```bash
# Check modified files in your domain
git status

# Stage your files
git add <path-to-your-folder>

# Commit with a clean message
git commit -m "feat(backend): implement jwt authentication middleware"
```

#### 2. Push to Your Assigned Role Branch
```bash
# Example for Mae pushing to her branch:
git push origin backend-mae
```

#### 3. Open a Pull Request on GitHub
* Go to `https://github.com/renzv-compsci/KilosUnlad`.
* Click **"Compare & pull request"**.
* Set **Base: `main`** $\leftarrow$ **Compare: `<your-role-branch>`**.
* Add a brief summary of what tasks you completed.

#### 4. WAIT FOR RENZ (PM) TO REVIEW & MERGE
* **Do NOT merge your own PR.**
* Renz will review your code, test the build, and merge it into `main`.
* Renz will post a confirmation comment on GitHub and notify the group chat:  
  > *"@team, Mae's backend PR has been merged into `main`. Please run `git pull origin main` to sync your local branches."*

#### 5. Sync Your Local Branch After Merge
Once Renz confirms the merge in the group chat, update your local machine:
```bash
git checkout main
git pull origin main
git checkout <your-role-branch>
git merge main
```

---

## 8. Technical Decision & Issue Protocol (No More Messenger PDFs!)

To keep our repository organized and avoid losing technical discussions in Messenger chats, **do not send PDFs or long issue descriptions in the group chat.**

Instead, use our **`/docs/decisions/`** folder:

### How to Raise a Technical Issue or Proposal:
1. Open **`/docs/decisions/TEMPLATE.md`** and copy it to a new file (e.g., `/docs/decisions/002-field-task-upload-format.md`).
2. Fill in the **Problem Statement** and your **Proposed Options**.
3. Commit and push it to your role branch.
4. **Messenger Group Chat Rule:** The group chat is strictly for quick pings! Just send a short message:  
   > *"@Renz, I added Decision 002 in `/docs/decisions/` regarding task upload formats. Kindly review and resolve!"*
5. Renz will review the issue, document the official resolution, and merge it into `main`.

---

### The 3 Golden Rules:
1. **Never Break Contracts:** You cannot change property names or structures in `/docs/contracts/` without team consensus. A backend change breaks the frontend; an ML change breaks the backend.
2. **Keep Commits Scoped:** Do not mix database schemas with UI components in the same commit. Keep PRs focused strictly on your assigned domain.
3. **All PRs Must Build:** Before submitting a Pull Request, run:
   ```bash
   docker-compose up --build
   ```
   If any container fails to build or exit cleanly, fix the error before opening your PR.
# Engineering Task Roadmap: Backend Engineering & API
**Lead:** Mae Santos  
**Primary Domain:** `/server/` (Excluding `/server/src/models/`)  
**Core Technologies:** Node.js 18/20 LTS, Express.js, JWT, Mongoose (Consumer), Axios, Crypto, Canonical JSON  
**Container:** `kilosunlad-server` (Port `5000`)  

---

## 1. Context & Architecture Summary for Mae

You are building the **Core Application Engine & Security Authority** for **KilosUnlad**, a decision-support and forensic auditing system for the DSWD 4Ps welfare program.

Your backend runs inside an isolated Node.js container on Port 5000. It acts as the central hub of the entire MERN architecture:
1. **Security & Session Authority:** Issue and verify JSON Web Tokens (JWT) and enforce strict Role-Based Access Control (RBAC) along municipal/barangay boundaries.
2. **Business Workflow Engine:** Enforce the legal beneficiary state machine, manage the 15-day statutory appeal countdown timer, and dispatch investigation tickets to field workers.
3. **Forensic Integrity (The Digital Seal):** Intercept all database mutations, format them using Canonical JSON, and append an unbroken SHA-256 cryptographic hash chain to prevent political tampering (*palakasan*).
4. **Integration Coordinator:** Connect Markie's frontend, Dustin's database models, and Charles's Python ML microservice via our frozen contracts.

**Your Boundaries:**
* **Dustin Martinez (Database Lead)** owns `/server/src/models/`. You do **not** define Mongoose schemas; you import Dustin's compiled models into your controllers (`Beneficiary.find()`, `task.save()`).
* **Charles Cabatian (ML Lead)** owns `/ml-service/`. You call Charles's service using internal HTTP via `mlClient.service.js`.
* **Markie Angelo (Frontend Lead)** calls your endpoints from React. Your API responses must match `/docs/contracts/` 1:1.

---

## Phase 1: Environment Verification & Mock API Scaffolding (Days 1–3)
*Goal: Stand up Express, mount core security middleware, and serve mock responses matching contracts to unblock Markie immediately.*

- [x] **Task 1.1: Express Server Bootstrap & Health Check**
  - Paths: `/server/server.js`, `/server/src/app.js`
  - Mount essential middleware: `cors()`, `helmet()`, `express.json({ limit: '30mb' })`, and `morgan('dev')`.
  - Connect database lifecycle via `/server/src/config/database.js`.
  - *Definition of Done (DoD):* Server starts on Port 5000 and responds `200 OK` on `GET /health`.

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

*Daily Standup Deliverable (Phase 1):*  
> "Express server running on Port 5000 with security middleware; Canonical JSON hasher verified; mock routes unblock Markie."

### Implementation status (2026-09-15)

- Existing Express bootstrap, security middleware, and database connection configuration reviewed.
- Canonical JSON and SHA-256 helpers corrected for falsy JSON values and normalized timestamps; hashing tests pass.
- All three mock routes implemented with server-local copies of contract response data. HTTP tests verify exact contract matching, CORS, and security headers. Mock routes are disabled in production.
- Verification: 11 tests passed using a temporary Node.js 20.20.0 runtime. Dependencies installed and `server/package-lock.json` generated.
- Direct Express smoke check on port 5000 returned `200 OK` from `/health` using the normal default listening address; the temporary listener was then closed. This check did not connect to MongoDB.
- At that time, Task 1.1 was pending live MongoDB verification because MongoDB and Docker were unavailable; see the verification update below.
- Task 1.3 remains unchecked until Markie's React client is verified against the running backend; backend HTTP contract tests already pass.
- Run instructions and mock behavior are documented in `server/README.md`.

### Verification update (2026-09-17)

- Backend Docker image uses Node.js 20 (verified runtime: v20.20.2), matching the documented stack. `npm ci` installs the locked dependencies without the previous engine compatibility warning; `.dockerignore` prevents local `node_modules` from overwriting container dependencies.
- All 11 backend tests passed inside the Node 20 container, including the three Phase 1 response contracts, CORS/security headers, production mock exclusion, and hashing tests. Contract files are unchanged.
- Task 1.1 verified: the normal `server.js` entrypoint authenticated to MongoDB over the Docker network (`Connected successfully: db/kilosunlad`) and listened on container port 5000. Live `/health` and `/api/v1` requests returned HTTP 200.
- Test container `kilosunlad-mae-phase1` maps host port 5001 to container port 5000; Docker MongoDB uses host port 27018 to avoid existing local services. Shared Compose port defaults were not changed.
- Task 1.3 remains unchecked: backend contract tests pass, but integration with Markie's React client is not yet verified. These checks cover the backend and database, not the full five-service stack or completion of Phase 5 container optimization.

---

## Phase 2: Security, RBAC & Core Workflow Engines (Days 4–8)
*Goal: Replace mock auth with real JWTs, implement the state machine, and build task dispatching.*

- [ ] **Task 2.1: Implement JWT Authentication & Jurisdictional RBAC**
  - Paths: `/server/src/middleware/auth.middleware.js`, `/server/src/middleware/rbac.middleware.js`
  - Implement token verification: extract Bearer token, verify against `JWT_SECRET`, attach `req.user`.
  - Enforce role permissions (`SUPER_ADMIN`, `REGIONAL_DIRECTOR`, `CASE_WORKER`, `COA_AUDITOR`).
  - Restrict regional directors and case workers to their assigned municipality/barangays.
  - *DoD:* Requests with invalid/expired tokens return `401 Unauthorized`; out-of-jurisdiction queries return `403 Forbidden`.

### Task 2.1 implementation update (2026-09-18)

- Implemented HS256 Bearer JWT verification with required identity, recognized role, and expiration claims. Invalid/expired tokens return 401; missing signing-secret configuration fails closed with 503.
- Implemented explicit route role allowlists, read-only auditor protection, jurisdiction query filters, and authorization against server-loaded record addresses. Directors and case workers are restricted to their signed province, municipality, and assigned barangays; incomplete scope or out-of-area access returns 403.
- All 21 backend tests passed under Node 20: 11 existing Phase 1 checks plus 10 middleware tests covering forged/expired tokens, role restrictions, scope bypass attempts, and request-body spoofing.
- Task remains in progress: middleware is tested on isolated HTTP routes but is not yet mounted on the Phase 1 mock endpoints. Database-backed login/token issuance, active-account checks, and actual controller/model integration remain pending. The placeholder login token is not a valid access token for the new middleware.
- Existing API contracts, mock responses, database models, frontend, and ML files are unchanged. Middleware integration guidance is in `server/README.md`.

- [ ] **Task 2.2: Implement Beneficiary State Machine Engine**
  - Paths: `/server/src/services/workflow.service.js`, `/server/src/controllers/beneficiary.controller.js`
  - Enforce legal state transitions:
    `ACTIVE_COMPLIANT` $\to$ `FLAGGED_FOR_REVIEW` $\to$ `UNDER_INVESTIGATION` $\to$ `NOTICE_OF_INELIGIBILITY` $\to$ `GRADUATED`.
  - Reject invalid status jumps (e.g., `ACTIVE` straight to `GRADUATED`) with `400 Bad Request`.
  - *DoD:* State machine prevents unauthorized status bypasses.

- [ ] **Task 2.3: Implement Due Process Manager (15-Day Appeal Countdown)**
  - Paths: `/server/src/services/appealLifecycle.service.js`, `/server/src/controllers/appeal.controller.js`
  - When graduation is approved, set `status: "NOTICE_OF_INELIGIBILITY"` and calculate `appeal_deadline = now + 15 days`.
  - Implement route `POST /api/v1/appeals/docket` to register formal appeals and pause the timer.
  - *DoD:* Beneficiary record accurately reflects the 15-day statutory countdown deadline.

- [ ] **Task 2.4: Implement Task Dispatcher Engine**
  - Paths: `/server/src/services/taskDispatcher.service.js`, `/server/src/controllers/task.controller.js`
  - Implement `POST /api/v1/tasks/dispatch` matching `admin-task-dispatch.json`.
  - Shifts household status to `UNDER_INVESTIGATION`, creates `VerificationTask` document, and commits an audit log block.
  - *DoD:* Successfully assigns a task to a Municipal Link and returns HTTP `201 Created`.

*Daily Standup Deliverable (Phase 2):*  
> "JWT authentication and RBAC active; state machine constraints enforced; 15-day appeal countdown and task dispatching operational."

---

## Phase 3: ML Integration, Due Process & Tablet Sync Engine (Days 9–12)
*Goal: Connect Charles's Python ML service via Axios and process batch uploads from Markie's tablet.*

- [ ] **Task 3.1: Build Resilient Python ML Client**
  - Path: `/server/src/services/mlClient.service.js`
  - Use `axios` to call `http://ml-service:8000/api/v1/predict-swdi` using payload from `ml-swdi-inference.json`.
  - Configure a **2500ms timeout** and a fallback heuristic rule engine if the ML container is unreachable.
  - *DoD:* If Python container is stopped, backend falls back gracefully and tags record `EVALUATED_VIA_FALLBACK`.

- [ ] **Task 3.2: Implement Tablet Batch Sync Consumer**
  - Paths: `/server/src/services/sync.service.js`, `/server/src/controllers/task.controller.js`
  - Implement `POST /api/v1/tasks/:id/submit` matching `field-task-submission.json`.
  - Verify photo SHA-256 hash and calculate distance variance using `/server/src/utils/geoFence.js` ($< 250\text{m}$ threshold).
  - Update task status to `SUBMITTED` and append an entry to `audit_logs`.
  - *DoD:* Tablet upload successfully validates coordinates, commits findings, and returns audit receipt.

- [ ] **Task 3.3: Dynamic Composite Risk Calculation Service**
  - Path: `/server/src/services/discrepancy.service.js`
  - Aggregate live ML predictions with utility records from `ExternalRecord`:
    $$S_i = \min\left(100, \; 40 \cdot \Delta_{\text{SWDI}} + 20 \cdot I_{\text{power}} + 15 \cdot I_{\text{water}} + 25 \cdot I_{\text{telecom}} + 30 \cdot I_{\text{vehicle}}\right)$$
  - Update beneficiary status to `FLAGGED_FOR_REVIEW` if $S_i \ge 70$.
  - *DoD:* Seeded households with vehicle ownership or high power usage automatically receive $S_i \ge 70$.

- [ ] **Task 3.4: Implement Calamity Moratorium Controller**
  - Path: `/server/src/controllers/calamity.controller.js`
  - Create route `POST /api/v1/calamity/toggle` allowing admins to pause automated compliance flags for a municipality under a declared State of Calamity (RA 10121).
  - *DoD:* Compliance penalties freeze for households in active calamity zones.

*Daily Standup Deliverable (Phase 3):*  
> "Node.js successfully calls Python ML in under 20ms; tablet batch sync consumer and dynamic risk engine operational."

---

## Phase 4: Forensic Audit Engine & Stress Testing (Days 13–15)
*Goal: Build the COA cryptographic chain verification endpoint and verify tamper detection.*

- [ ] **Task 4.1: Implement Cryptographic Chain Verification Endpoint**
  - Path: `/server/src/controllers/audit.controller.js`
  - Implement `GET /api/v1/audit/verify-chain?start_sequence=1&end_sequence=1000` matching `audit-chain-verification.json`.
  - Sequentially iterate through blocks in `AuditLog`, recomputing each SHA-256 hash.
  - If any entry hash does not match, return `is_chain_valid: false` with the compromised sequence index.
  - *DoD:* Returns `is_chain_valid: true` across 1,000 valid blocks; successfully catches manually tampered blocks.

- [ ] **Task 4.2: Audit Log Middleware Interceptor**
  - Path: `/server/src/middleware/audit.middleware.js`
  - Intercept state-mutating requests (`POST`, `PUT`, `PATCH`) to automatically record actor ID, IP address, timestamp, and state delta to `audit_logs`.
  - *DoD:* All administrative mutations leave an immutable audit block.

- [ ] **Task 4.3: Centralized Error Handler & Joi Validation**
  - Paths: `/server/src/middleware/error.middleware.js`, `/server/src/middleware/validation.middleware.js`
  - Catch unhandled rejections, Mongoose validation errors, and malformed JSON payloads, returning clean standardized error objects.
  - *DoD:* Zero unhandled server crashes during malformed request testing.

*Daily Standup Deliverable (Phase 4):*  
> "COA cryptographic chain verification endpoint active; audit log interceptor records all mutations."

---

## Phase 5: Container Optimization & Live Demo Rehearsal (Days 16–18)
*Goal: Optimize backend Docker build and rehearse live demonstration scenarios.*

- [ ] **Task 5.1: Backend Container Optimization**
  - Path: `/server/Dockerfile`
  - Verify that `docker-compose up --build server` completes cleanly without npm warnings.
  - Verify that file uploads persist to the `upload-data` Docker volume.
  - *DoD:* Container builds and starts cleanly in under 30 seconds.

- [ ] **Task 5.2: Live Demo Test Case Support**
  - Rehearse the 4 live demo scenarios with Renz and team:
    1. Processing an incoming flagged household.
    2. Dispatching a task to Markie's tablet.
    3. Processing tablet batch sync upon Wi-Fi restoration.
    4. Executing live chain verification for the COA auditor view.
  - *DoD:* End-to-end demo flows execute without console errors or delays.

*Daily Standup Deliverable (Phase 5):*  
> "Backend container fully optimized, resilient, and ready for capstone defense demo."

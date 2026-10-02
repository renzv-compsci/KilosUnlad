# Engineering Task Roadmap: Backend Engineering & API
**Lead:** Mae Santos  
**Primary Domain:** `/server/` (Excluding `/server/src/models/`)  
**Core Technologies:** Node.js 18/20 LTS, Express.js, JWT, Mongoose (Consumer), Axios, Crypto, Canonical JSON  
**Container:** `kilosunlad-server` (Port `5000`)  

---

## Current review (2026-10-02)

Reviewed local `backend-mae` at `19c9997` after fetching origin. Main `c030c77`
and database-phase3 `697f6bb` are already included. The publication includes this
merge and the subsequent verifier/documentation changes. Frontend remains on its
separate branch at `7cc3dd7`.

All four roles have documented local login/screen evidence. Fresh-seed assigned
task visibility passed via API, and Mae confirmed browser display on October 2.
Markie's independent acceptance remains open. Dustin's existing-data repair
procedure is now merged; shared-environment repair execution is not verified.
The seed contains 4 households/2 tasks against the approved 5/3 target.

Task 4.1 continuation: the authenticated chain endpoint now verifies up to 1000
blocks with snapshot consistency and predecessor linkage. MongoDB tests verify
persisted workflow hashes, 1000 intact blocks, and exact tampered sequence 451.
Schemas and frozen contracts are unchanged. See the
[endpoint behavior and limits](../../server/README.md#audit-chain-verification).
Phase 1/2 auth, guard, dispatch, concurrency and rollback checks pass locally;
this does not implement the missing notice or appeal workflows.

Next backend closure work: record independent frontend acceptance, verify the
agreed shared deployment and existing-data repair, and obtain the remaining
notice/graduation and appeal contracts. Phase 3/4 integrations remain placeholder
handoffs except for the now-implemented Task 4.1. See [current status](../reports/PHASE1_TO_PHASE4_STATUS.md) and
[live verification](../reports/LIVE_AUTH_FEED_VERIFICATION.md). This documentation
review's original documentation-only scope was followed by implementation and
regression testing; current results are recorded in the linked status report.

## Handoff update (2026-09-30)

Latest complete regression: **101 passed, 0 failed, 0 skipped**, with all optional
database/Docker suites enabled. Centralized error handling now sanitizes Mongoose
validation/cast errors and oversized JSON; HTTP tests verify continued availability.
See [Phase 1–4 status](../reports/PHASE1_TO_PHASE4_STATUS.md) for task-by-task
evidence and acceptance requirements. Full workflow completion and PM-authorized
placeholder handoff are tracked separately.

Under Renz's instruction to prepare placeholders through Phase 4, the
[Phase 3/4 backend handoff](../handoffs/PHASE3_PHASE4_BACKEND_HANDOFF.md) now maps
implemented helpers, named integration placeholders and continuation requirements.
Placeholder services return ENDPOINT_NOT_READY; the audit controller and mutation
guard remain unmounted. A reusable strict Joi body-validation middleware is included.
Focused placeholder/app tests: 10 passed, zero failures/skips. Tasks remain unchecked
against their original full DoD; placeholder handoff is not live workflow completion.
Main `c030c77` is merged locally at `4640351`; Decision 007 is approved and the
listIndexes/PRIMARY-wait fixes are present. The September 30
[merged deployment smoke test](../reports/PHASE2_MERGED_DEPLOYMENT_VERIFICATION.md)
passed fresh startup, restricted permissions and real dispatch-to-feed checks.
Shared deployment, migration and full Task 2.4 acceptance remain pending.

## Historical status (2026-09-25)

See [backend verification status](../reports/BACKEND_VERIFICATION_STATUS.md) for
current test evidence and skipped-suite explanations. Dated updates below are
historical snapshots; the October 2 current review above takes precedence.

- Tasks 1.1, 1.2 and 2.1 remain complete within their documented backend scope.
- Task 1.3 awaits Markie's actual frontend acceptance; backend mock tests pass.
- Live triage/assigned feeds and dispatch are implemented; backend integration
  verifies dispatch-to-feed visibility, isolation, concurrency and rollback.
- Tasks 2.2/2.3 remain incomplete: notice/graduation policies and approved appeal
  storage/contracts are outstanding. Task 2.4 awaits shared deployment acceptance.
- Login timestamp persistence is implemented. Decisions 002/003 are resolved;
  Decision 006 remains proposed for deployment/index readiness and ownership.
- All Compose images built and five services started in an isolated clean-commit
  smoke check. PR #7 is ready for review, not merged or a Phase 2 completion claim.
- Accounts, sample records and live frontend acceptance remain pending. Local
  Phase 3 ML client work is uncommitted and excluded from PR #7.

## 1. Context & Architecture Summary for Backend

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

- [x] **Task 2.1: Implement JWT Authentication & Jurisdictional RBAC**
  - Paths: `/server/src/middleware/auth.middleware.js`, `/server/src/middleware/rbac.middleware.js`
  - Implement token verification: extract Bearer token, verify against `JWT_SECRET`, attach `req.user`.
  - Enforce role permissions (`SUPER_ADMIN`, `REGIONAL_DIRECTOR`, `CASE_WORKER`, `COA_AUDITOR`).
  - Restrict regional directors and case workers to their assigned municipality/barangays.
  - *DoD:* Requests with invalid/expired tokens return `401 Unauthorized`; out-of-jurisdiction queries return `403 Forbidden`.

### Task 2.1 implementation update (2026-09-18)

- Implemented HS256 Bearer JWT verification with required identity, recognized role, and expiration claims. Invalid/expired tokens return 401; missing signing-secret configuration fails closed with 503.
- Implemented explicit route role allowlists, read-only auditor protection, jurisdiction query filters, and authorization against server-loaded record addresses. Directors and case workers are restricted to their signed province, municipality, and assigned barangays; incomplete scope or out-of-area access returns 403.
- All 21 backend tests passed under Node 20: 11 existing Phase 1 checks plus 10 middleware tests covering forged/expired tokens, role restrictions, scope bypass attempts, and request-body spoofing.
- At this stage the task was in progress with isolated middleware tests; see the integration update below. The placeholder login token is not a valid access token for the new middleware.
- Existing API contracts, mock responses, database models, frontend, and ML files are unchanged. Middleware integration guidance is in `server/README.md`.

### Task 2.1 integration verification (2026-09-21)

- Implemented login using Dustin's merged User model, bcrypt credential checks, active-account validation, safe session serialization, and real 900-second HS256 JWTs matching the auth contract fields. Requires a configured signing secret of at least 32 characters; no default/sample accounts are created.
- Mounted current-user authentication, explicit role permissions, and jurisdiction filtering on the existing triage/assigned-task endpoints. Every protected request checks MongoDB for deleted/deactivated accounts and current permissions. Expired-token and jurisdiction-denial responses match the frozen contracts.
- All 32 backend tests passed. The 11 login/integration tests also passed against real local MongoDB in a unique temporary database, removed after the test. No application database records were modified.
- Scope of completion: authentication/RBAC DoD verified. Business data on the protected development endpoints remains marked mock data; production returns `ENDPOINT_NOT_READY` after authorization until live data controllers are built. Legacy unauthenticated Phase 1 behavior now requires explicit `PHASE1_MOCK_MODE=true` and is forbidden in production.
- Session `last_login_at` is returned, not persisted; model support for login history is undecided. Refresh/logout and password-change token revocation are not implemented by this task.
- Drafted Decision 002 for dispatch metadata persistence and the missing SystemConfig audit action. Status is PROPOSED; no model or contract changes were made.

- [ ] **Task 2.2: Implement Beneficiary State Machine Engine**
  - Paths: `/server/src/services/workflow.service.js`, `/server/src/controllers/beneficiary.controller.js`
  - Enforce legal state transitions:
    `ACTIVE_COMPLIANT` $\to$ `FLAGGED_FOR_REVIEW` $\to$ `UNDER_INVESTIGATION` $\to$ `NOTICE_OF_INELIGIBILITY` $\to$ `GRADUATED`.
  - Reject invalid status jumps (e.g., `ACTIVE` straight to `GRADUATED`) with `400 Bad Request`.
  - *DoD:* State machine prevents unauthorized status bypasses.

### Task 2.2 progress (2026-09-22)

- Added `workflow.service.js`: validates the four consecutive lifecycle steps and rejects skipped, reversed, repeated, unknown, and unspecified calamity transitions.
- Added sanitized HTTP 400 handling for `INVALID_STATUS_TRANSITION`. All 35 backend tests pass under Node 20, including all 36 status pairs and a test-only HTTP endpoint.
- Task remains unchecked: no live mutation controller integration yet. The guard validates order only; callers still need current database state, RBAC, due-process checks, and atomic status/audit persistence with stale-write protection. No public generic status-update endpoint was added.
- Task 2.3 needs an approved appeal storage design and API contract: merged models have no deadline or docket storage. Pause/resume rules also need clarification. Task 2.4 retains the dispatch metadata dependency in Decision 002.

### Task 2.2 database integration progress (2026-09-22)

- Added internal `workflowPersistence.service.js`, importing existing models without changing schemas. It reloads current user/household records, reuses role and jurisdiction checks, rejects stale statuses, and commits status plus audit together in a MongoDB transaction.
- Requires an explicit trusted workflow policy and prerequisite callback; no public mutation route or production dispatch/graduation policy is installed. Existing schema actions and hash format remain unchanged.
- Disposable replica-set tests verify authorization, rollback on failed prerequisites/audit insertion, conflicting household updates, and contiguous audit chaining across concurrent households. No application database records are used.
- Verification: all 46 tests passed with the replica-set integration suite enabled, including stale-status and missing-index rejection. The temporary MongoDB process and its data directory were removed after testing.
- Deployment requires transaction-capable MongoDB and the existing unique audit sequence index. Shared infrastructure files were not changed. Task remains unchecked until workflow-specific prerequisites, complete associated audit records, and live controller integration are implemented.

- [ ] **Task 2.3: Implement Due Process Manager (15-Day Appeal Countdown)**
  - Paths: `/server/src/services/appealLifecycle.service.js`, `/server/src/controllers/appeal.controller.js`
  - When graduation is approved, set `status: "NOTICE_OF_INELIGIBILITY"` and calculate `appeal_deadline = now + 15 days`.
  - Implement route `POST /api/v1/appeals/docket` to register formal appeals and pause the timer.
  - *DoD:* Beneficiary record accurately reflects the 15-day statutory countdown deadline.

### Task 2.3 internal logic progress (2026-09-22)

- Implemented pure `calculateAppealDeadline` and `assertAppealWindowElapsed` helpers in `appealLifecycle.service.js`. The roadmap's `now + 15 days` is interpreted as 15 elapsed 24-hour days, preserving the notice instant; not business days or local midnight.
- The timing check rejects premature graduation, wrong status, shortened/missing/invalid dates, and any appeal, pause, or unknown hold state. Exact deadline equality satisfies timing only; it does not authorize graduation.
- All 51 backend tests passed with the disposable MongoDB integration suite enabled. Five new appeal tests cover date rollover, boundary milliseconds, invalid input, and hold enforcement.
- Task remains unchecked: no deadline is persisted, no docket route is mounted, and no automatic graduation occurs. Database fields, the docket contract, and resolution/pause/resume semantics still need agreement. These helpers must consume trusted stored state when live integration is implemented; models and shared contracts are unchanged.

- [ ] **Task 2.4: Implement Task Dispatcher Engine**
  - Paths: `/server/src/services/taskDispatcher.service.js`, `/server/src/controllers/task.controller.js`
  - Implement `POST /api/v1/tasks/dispatch` matching `admin-task-dispatch.json`.
  - Shifts household status to `UNDER_INVESTIGATION`, creates `VerificationTask` document, and commits an audit log block.
  - *DoD:* Successfully assigns a task to a Municipal Link and returns HTTP `201 Created`.

### Phase 2 integration update (2026-09-24)

- Login now persists approved `last_login_at` after credential validation, without advancing it for failed login attempts. The auth controller delegates the database write to the auth service.
- Implemented authenticated `POST /api/v1/tasks/dispatch` using Dustin's merged models: active worker/jurisdiction validation, open-task rejection, stored metadata, state transition, and sealed audit delta in one transaction. Contract-shaped 201 and exact 404/409 errors verified.
- Replica-set tests verify concurrent duplicate prevention and rollback of task/status on audit failure. Full run: 60 passed, one independent Docker recovery suite skipped. Existing local ML tests were included but ML code was not changed by this work.
- Separate authenticated MongoDB test confirmed a compatibility blocker: the proposed audit role's find/insert permissions deny `listIndexes`, used by the workflow guard. Coordinate metadata permissions and model initialization with Dustin; no role or schema changes were made here.
- Tasks 2.2/2.4 remain unchecked pending transaction-capable deployment and restricted-role verification. Task 2.3 still needs approved appeal storage/contracts. Triage/assigned GET routes still return fixtures, so dispatch is not full frontend end-to-end integration.

### Live read feed update (2026-09-24; subsequently pushed)

- Normal-mode triage and assigned-task GET routes now read existing MongoDB models,
  including in production. Explicit legacy mock mode is unchanged.
- Added explicit contract-field mapping, pagination, scoped summary counts and
  authenticated worker filtering. No schema, shared contract or frontend edits.
- Live MongoDB tests cover response data, invalid queries, role/jurisdiction
  isolation, another worker's tasks, closed/orphaned tasks and empty results.
- Working-tree regression run: 61 passed, 2 optional Docker suites skipped;
  includes the pre-existing local ML tests. Temporary test databases removed.
- README documents summary/filter and optional-field behavior for team review.
  This does not complete appeal/lifecycle work or frontend end-to-end acceptance.

*Daily Standup Deliverable (Phase 2):*
> "JWT authentication and RBAC active; state machine constraints enforced; 15-day appeal countdown and task dispatching operational."

---

## Phase 3: ML Integration, Due Process & Tablet Sync Engine (Days 9–12)
*Goal: Connect Charles's Python ML service via Axios and process batch uploads from Markie's tablet.*

Combined working-tree regression on 2026-09-28: **87 passed, 0 failed, 3 skipped**.
See [Phase 3 backend checkpoint](../reports/PHASE3_BACKEND_CHECKPOINT.md) for
coverage, skip reasons and integration decisions. Tasks 3.1–3.3 remain incomplete.
Docker follow-up: database lifecycle and audit-role suites passed **4 tests with
zero skips** after the engine became available. A subsequent disposable MongoDB
run passed **12 login/live-feed tests with zero skips**, covering the remaining
skipped suite. These are separate runs, not a new combined test total.

- [ ] **Task 3.1: Build Resilient Python ML Client**
  - Path: `/server/src/services/mlClient.service.js`
  - Use `axios` to call `http://ml-service:8000/api/v1/predict-swdi` using payload from `ml-swdi-inference.json`.
  - Configure a **2500ms timeout** and a fallback heuristic rule engine if the ML container is unreachable.
  - *DoD:* If Python container is stopped, backend falls back gracefully and tags record `EVALUATED_VIA_FALLBACK`.

### Task 3.1 client progress (2026-09-23)

- Implemented an internal Axios ML client matching `ml-swdi-inference.json`, with six-feature validation, household identity checks, response validation, and a fixed 2500 ms request deadline. Errors are sanitized; no retries or redirects extend the request.
- Tests use temporary localhost HTTP servers, not Charles's service. All 47 default tests passed; the opt-in MongoDB transaction suite was skipped in this run. Six new tests cover contract exchange, invalid inputs/responses, upstream failures, connection failure, and timeout.
- Task remains unchecked: the client is not mounted in a workflow, and fallback calculation, fallback-tag persistence, and live ML integration remain pending. No fabricated prediction or fallback success is returned. Teammates' files and frozen contracts are unchanged.

### Task 3.1 review and resilience verification (2026-09-28)

- Reviewed the internal client against the frozen inference contract, documented
  feature bounds, and the architecture's 2500 ms deadline.
- Added slow-stream and oversized-response tests. Focused verification:
  `node --test test/mlClient.test.js` — 8 passed, 0 failed, 0 skipped.
- Live inference remains unverified: the local ML inference schema and predict
  endpoint files are empty. Coordinate an implemented ML service for acceptance.
- Task remains unchecked. Utility-only fallback scoring, missing/stale-record
  handling, fallback-tag storage/reprocessing and transactional audit integration
  require agreement before completing the workflow. The client currently returns
  typed errors for callers to handle, not fallback success.

- [ ] **Task 3.2: Implement Tablet Batch Sync Consumer**
  - Paths: `/server/src/services/sync.service.js`, `/server/src/controllers/task.controller.js`
  - Implement `POST /api/v1/tasks/:id/submit` matching `field-task-submission.json`.
  - Verify photo SHA-256 hash and calculate distance variance using `/server/src/utils/geoFence.js` ($< 250\text{m}$ threshold).
  - Update task status to `SUBMITTED` and append an entry to `audit_logs`.
  - *DoD:* Tablet upload successfully validates coordinates, commits findings, and returns audit receipt.

### Task 3.2 submission preparation (2026-09-28)

- Added internal `prepareSubmission(input, routeTaskId)` in `sync.service.js`:
  validates the submission shape and maps flat findings into `field_findings`.
  Rejects unknown fields, type coercion, malformed coordinates/evidence metadata,
  and route/body task-ID mismatch.
- Geofence checks reject invalid coordinates and compare unrounded distance before
  formatting the result. The existing inclusive 250 m limit follows the backend
  prompt; the task bullet above uses strict `< 250 m`. This wording difference
  needs confirmation before live submission acceptance.
- Focused tests: 8 passed, 0 failed, 0 skipped across submission preparation and
  geofence suites, including the 250.01 m rounding regression.
- Added read-only submission authorization: reload active CASE_WORKER, query by
  stored assignment, verify household identity/current jurisdiction, and reject
  submitted/resolved/unknown task statuses. Authorization plus preparation tests:
  11 passed, zero skips, using model doubles. Database/HTTP acceptance is pending.
- Added `verifyEvidenceHash` for trusted raw buffers: detects altered/truncated
  evidence and emits the contract's 422 EVIDENCE_HASH_MISMATCH. Five hash tests
  plus preparation/authorization regression tests passed (16 total, zero skips).
- Task remains incomplete: transactional rechecks of assignment/jurisdiction, trusted image
  retrieval and hash-check integration, replay handling, transactional task/audit
  persistence and the public submission route are still pending. Metadata
  validation alone does not verify evidence or authorize submission.

- [ ] **Task 3.3: Dynamic Composite Risk Calculation Service**
  - Path: `/server/src/services/discrepancy.service.js`
  - Aggregate live ML predictions with utility records from `ExternalRecord`:
    $$S_i = \min\left(100, \; 40 \cdot \Delta_{\text{SWDI}} + 20 \cdot I_{\text{power}} + 15 \cdot I_{\text{water}} + 25 \cdot I_{\text{telecom}} + 30 \cdot I_{\text{vehicle}}\right)$$
  - Update beneficiary status to `FLAGGED_FOR_REVIEW` if $S_i \ge 70$.
  - *DoD:* Seeded households with vehicle ownership or high power usage automatically receive $S_i \ge 70$.

### Task 3.3 calculator groundwork (2026-09-28)

- Added pure `calculateRiskScore` in `discrepancy.service.js`, implementing the
  documented weights, 100-point cap and inclusive 70-point threshold.
- Internal inputs require an explicitly supplied integer SWDI gap from 0 to 2
  and four boolean indicators. Missing/unknown values are rejected, not defaulted
  to low risk. The calculator does not derive the gap or indicators from records.
- Focused verification: 4 tests passed, zero failures/skips, covering weights,
  threshold/cap behavior, invalid inputs and deterministic calculation.
- Task remains unchecked. The meaning/direction of the SWDI gap, telecom/vehicle
  rules and missing/stale-record policy need agreement before live mapping and
  transactional flagging. A vehicle alone gives 30 points and power alone 20;
  the DoD example's automatic 70-point expectation needs clarification.

- [ ] **Task 3.4: Implement Calamity Moratorium Controller**
  - Path: `/server/src/controllers/calamity.controller.js`
  - Create route `POST /api/v1/calamity/toggle` allowing admins to pause automated compliance flags for a municipality under a declared State of Calamity (RA 10121).
  - *DoD:* Compliance penalties freeze for households in active calamity zones.

### Task 3.4 internal check progress (2026-09-29)

- Added pure `hasActiveCalamityMoratorium` using existing zone fields, exact
  province/municipality matching, explicit activity and validated stored dates.
- Provisional rules: inclusive declaration, exclusive expiry, omitted expiry
  open-ended. Malformed configuration throws; any matching active zone holds.
  These date rules need confirmation before live workflow integration.
- Six new calamity tests plus four risk-calculator tests passed: 10 passed,
  zero failures/skips. Task remains unchecked pending toggle contract, role/date
  policy, transactional configuration/audit writes and compliance integration.

*Daily Standup Deliverable (Phase 3):*
> "Node.js successfully calls Python ML in under 20ms; tablet batch sync consumer and dynamic risk engine operational."

---

## Phase 4: Forensic Audit Engine & Stress Testing (Days 13–15)
*Goal: Build the COA cryptographic chain verification endpoint and verify tamper detection.*

- [x] **Task 4.1: Implement Cryptographic Chain Verification Endpoint**
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

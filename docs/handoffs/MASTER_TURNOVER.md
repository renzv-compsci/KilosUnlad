# KilosUnlad: Master Engineering Turnover & Integration Handoff Document

**Document Classification:** Comprehensive Engineering Turnover & Subsystem Handoff  
**Project:** KilosUnlad (Smart 4Ps Welfare Auditing and Fraud Detection System)  
**Consolidation Date:** 2026-10-08  
**Document Status:** **BACKEND & DATABASE FINALIZED; FRONTEND PROVISIONAL (PENDING FINAL TURNOVER)**  
**Turnover Authors:** Mae Santos (Backend Lead), Dustin Martinez (Database Lead)  
**Continuation Leads:** Renz Viloria (PM / Data Lead), Charles Cabatian (ML Lead)  
**Primary Integration Branch:** `backend-mae` / `main` (Merge `dc55600`)  

---

> ### ⚠️ OFFICIAL PM NOTICE: FRONTEND TURNOVER PENDING
> **The Frontend sections of this document (Domain 3 and related client action items) are currently PROVISIONAL.**
> 
> They are based on static code reviews (commit `b36361c`) and preliminary local test reports. Markie Angelo (Frontend Lead) has **not yet submitted his official final turnover document**.
> 
> **A subsequent update to this Master Turnover file will be published and committed once Markie officially submits his final frontend handoff.** Until then, all frontend integration steps are subject to final client reconciliation.

---

# TABLE OF CONTENTS
1. [EXECUTIVE INTEGRATION SUMMARY & CONTEXT](#1-executive-integration-summary--context)
2. [DOMAIN 1: BACKEND ARCHITECTURE & CONTINUATION (MAE SANTOS)](#domain-1-backend-architecture--continuation-mae-santos)
   - [1.1 Comprehensive Backend Turnover & Task Status](#11-comprehensive-backend-turnover--task-status)
   - [1.2 Internal Helper Interfaces & Integration Seams (Phase 3 & 4)](#12-internal-helper-interfaces--integration-seams-phase-3--4)
   - [1.3 Task Dispatch Acceptance Checklist & Test Matrix](#13-task-dispatch-acceptance-checklist--test-matrix)
3. [DOMAIN 2: DATABASE ARCHITECTURE, SEEDING & TESTING (DUSTIN MARTINEZ)](#domain-2-database-architecture-seeding--testing-dustin-martinez)
   - [2.1 Test Account & Sample Data Seeding](#21-test-account--sample-data-seeding)
   - [2.2 Phase 3 Ingest Tooling & Compound Index Verification](#22-phase-3-ingest-tooling--compound-index-verification)
   - [2.3 Phase 4 Adversarial Audit Chain & Integrity Testing](#23-phase-4-adversarial-audit-chain--integrity-testing)
   - [2.4 Phase 5 One-Click Demo Reset & Curated Test Cases](#24-phase-5-one-click-demo-reset--curated-test-cases)
4. [DOMAIN 3: PROVISIONAL FRONTEND COMPATIBILITY & CROSS-LAYER INTERACTION](#domain-3-provisional-frontend-compatibility--cross-layer-interaction)
   - [3.1 Authentication & Read-Feed Handoff Guide](#31-authentication--read-feed-handoff-guide)
   - [3.2 Frontend/Backend Static Compatibility Review](#32-frontendbackend-static-compatibility-review)
5. [DOMAIN 4: WEEKEND CONTINUATION DIRECTIVES FOR RENZ & CHARLES](#domain-4-weekend-continuation-directives-for-renz--charles)

---

# 1. EXECUTIVE INTEGRATION SUMMARY & CONTEXT

### Subsystem Completion Status:
* **Backend Subsystem (Mae Santos):** ✅ **100% Finalized & Handed Over.** Core architecture, auth, transactions, and audit verification complete.
* **Database Subsystem (Dustin Martinez):** ✅ **100% Finalized & Handed Over.** Models, indexes, seeding scripts, and demo tools complete.
* **Frontend Subsystem (Markie Angelo):** ⏳ **Provisional.** Awaiting final turnover submission.
* **ML & Data Subsystem (Renz & Charles):** 🚀 **Active.** Proceeding with empirical dataset generation and model deployment.

### Baseline Git Commits:
* **Backend:** Commit `9e9e3a3` merged through PR #10 into `main` at `dc55600` on October 6, 2026 at 23:36 PHT.
* **Frontend:** Branch `origin/frontend-markie` at commit `b36361c` (static review baseline; final branch update pending).
* **Database Tooling:** Completed Phase 3 (`seed_db.py`), Phase 4 (`seed_audit_chain.py`, `audit_integrity.py`), and Phase 5 (`reset_demo.sh`).

---

# DOMAIN 1: BACKEND ARCHITECTURE & CONTINUATION (MAE SANTOS)

## 1.1 Comprehensive Backend Turnover & Task Status

### Current Live API Surface (Mounted under `/api/v1`):
| Route | Method | Access / Guard | Operational Behavior |
| :--- | :---: | :--- | :--- |
| `/auth/login` | `POST` | Public | Validates active user credentials via bcrypt; returns real 900s HS256 JWT Bearer token with safe user metadata. |
| `/beneficiaries/triage-queue` | `GET` | Admin / Director / Auditor | Enforces regional/municipal jurisdiction; provides pagination (`page`, `limit`) and status filtering. |
| `/tasks/assigned` | `GET` | Case Worker Only | Returns only tasks assigned to the authenticated worker (`PENDING_DISPATCH` or `CACHED_OFFLINE`) in their jurisdiction. |
| `/tasks/dispatch` | `POST` | Admin / Director Only | Executes multi-document ACID transaction: creates `VerificationTask`, sets `Beneficiary` to `UNDER_INVESTIGATION`, and appends `AuditLog`. |
| `/audit/verify-chain` | `GET` | Admin / Auditor Only | Traverses inclusive block sequence ranges (up to 1,000 blocks), recomputing canonical SHA-256 hashes against predecessor linkages. |
| `/health` | `GET` | Public | Returns process liveness (`status: "online"`). Waits for MongoDB connection on startup. |

*Note: There are currently no mounted routes for task submission, appeal docketing, calamity toggling, public ML prediction, or worker directory discovery.*

### Transferred Task Status Matrix:
* **Task 1.1 (Express Bootstrap):** ✅ Complete (Node 20 containerized runtime verified).
* **Task 1.2 (Canonical Hashing Engine):** ✅ Complete (Deterministic stringifier and SHA-256 helpers tested).
* **Task 1.3 (Mock Route Handlers):** Reconciled with live API; Markie verified real login/read feeds locally.
* **Task 2.1 (JWT Authentication & RBAC):** ✅ Complete (Bearer tokens, role allowlists, and jurisdiction scoping verified across 32 tests).
* **Task 2.2 (Beneficiary State Machine):** Guard and transaction persistence implemented (`workflowPersistence.service.js`). Live mutation controller integration transferred to Renz/Charles.
* **Task 2.3 (15-Day Appeal Lifecycle):** Timing helpers implemented (`calculateAppealDeadline`, `assertAppealWindowElapsed`). Requires persistence and controller mounting.
* **Task 2.4 (Task Dispatcher Engine):** Implemented and locally verified via `session.withTransaction()`. Requires shared deployment and frontend UI acceptance.
* **Tasks 3.1–3.4 (ML Client, Tablet Sync, Risk Engine, Calamity):** Helpers implemented; routes currently wired to `integrationPlaceholders.service.js` returning 503. Transferred.
* **Task 4.1 (Chain Verification Endpoint):** ✅ Complete and locally verified across 1,000 blocks and tamper simulations.
* **Task 4.2 (Audit Log Middleware):** Unmounted mutation guard exists; needs transactional wiring into remaining workflows.
* **Task 4.3 (Validation & Error Handling):** Reusable Joi validation and centralized sanitized error handling complete.
* **Tasks 5.1–5.2 (Optimization & Demo Support):** Transferred for final system packaging.

---

## 1.2 Internal Helper Interfaces & Integration Seams (Phase 3 & 4)

The backend provides tested internal helper classes and functions ready to be connected to real data and routes:

### 1. `mlClient.service.js` — Internal ML Client
```javascript
const client = createMlClient();
const response = await client.predict({ household_id, demographics });
```
* **Input:** `household_id` (String), `demographics` (6 numeric proxy-means features).
* **Guarantees:** Rejects uncoerced/unknown fields, enforces a strict **2500ms total deadline**, caps response at 1 MiB, validates probability sums.
* **Errors Thrown:** `INVALID_FEATURE_VECTOR`, `ML_TIMEOUT`, `ML_UNAVAILABLE`, `INVALID_ML_RESPONSE`.
* **Continuation Need:** Connect to Charles's live FastAPI endpoint; implement fallback rule engine tagging records as `EVALUATED_VIA_FALLBACK`.

### 2. `sync.service.js` & `geoFence.js` — Tablet Submission & Verification
```javascript
// A. Prepare and validate flat contract payload into nested database shape:
const prepared = prepareSubmission(inputBody, routeTaskId);

// B. Authorize worker, task status, and jurisdiction:
const authorizer = createSubmissionAuthorizer({ input: prepared, routeTaskId, actorId, session });

// C. Verify binary image integrity:
const verifiedHash = verifyEvidenceHash(imageBuffer, expectedHexDigest);

// D. Calculate distance variance:
const { isMatched, distanceMeters } = verifyGeofence(capturedCoords, targetGeoJSONCoords);
```
* **Guarantees:** `verifyEvidenceHash` returns normalized SHA-256 on match; throws HTTP 422 `EVIDENCE_HASH_MISMATCH` on altered bytes. `verifyGeofence` uses the Haversine formula against the 250m threshold.
* **Continuation Need:** Bind multipart storage/disk uploads to `UPLOAD_DIR`, execute atomic transaction updating task to `SUBMITTED`, and append audit log entry.

### 3. `discrepancy.service.js` — Risk Scoring Engine
```javascript
const result = calculateRiskScore({ swdiDifference, power, water, telecom, vehicle });
// Returns: { score, meetsFlagThreshold, contributions }
```
* **Weights:** `swdiDifference` (40 pts), `power` (20 pts), `water` (15 pts), `telecom` (25 pts), `vehicle` (30 pts). Score capped at 100; flags at $\ge 70$.
* **Continuation Need:** Map real inputs from `ExternalRecord` and ML prediction, apply calamity moratorium holds, and update beneficiary status.

### 4. `calamity.service.js` — Calamity Moratorium Checker
```javascript
const isHeld = hasActiveCalamityMoratorium({ zones, address, now });
```
* **Behavior:** Exact province/municipality matching against stored `SystemConfig` zones. Checks `declared_at <= now < expires_at`. Returns boolean hold decision.

### 5. `integrationPlaceholders.service.js` — Current Unmounted Seams
Exposes `evaluateHousehold`, `submitTask`, `applyRiskAssessment`, and `toggleCalamity`. Currently throws:
```json
{
  "error": {
    "code": "ENDPOINT_NOT_READY",
    "message": "This workflow is not yet implemented."
  }
}
```
*Continuation Need:* Replace these placeholders with live controller logic.

---

## 1.3 Task Dispatch Acceptance Checklist & Test Matrix

Use this matrix to verify `POST /api/v1/tasks/dispatch` during integration:

### Request Structure:
```http
POST /api/v1/tasks/dispatch
Authorization: Bearer <regional_director_token>
Content-Type: application/json

{
  "household_id": "TEST-4PS-0004",
  "assigned_worker_id": "<case_worker_user_id>",
  "assignment_notes": "Synthetic dispatch acceptance test",
  "priority": "HIGH",
  "due_date": "2026-10-24T23:59:59.000Z"
}
```

### Positive Test Assertions:
1. HTTP `201 Created` returned with task ID, household status, and audit receipt.
2. `VerificationTask` document stored with `task_status: "PENDING_DISPATCH"`.
3. `Beneficiary` status transitions to `UNDER_INVESTIGATION`.
4. Exactly one `TASK_DISPATCHED` entry recorded in `audit_logs` matching the receipt hash.
5. Assigned worker can view task via `GET /api/v1/tasks/assigned`.
6. Other workers cannot see the task.

### Rejection & Concurrency Test Matrix:
| Test Scenario | Input Condition | Expected Status & Code | Database Side-Effects |
| :--- | :--- | :---: | :--- |
| **Duplicate Dispatch** | Dispatching to household with active task | `409 ACTIVE_TASK_EXISTS` | Zero writes |
| **Concurrency Conflict** | Two simultaneous requests on same household | 1 Success, 1 `409` Conflict | Exactly 1 task/audit committed |
| **Unauthorized Role** | Case Worker or Auditor calls endpoint | `403 FORBIDDEN` | Zero writes |
| **Missing/Expired Auth** | Missing or expired JWT token | `401 UNAUTHORIZED` | Zero writes |
| **Nonexistent Target** | Household ID not in database | `404 HOUSEHOLD_NOT_FOUND` | Zero writes |
| **Invalid Worker** | Worker ID is inactive or not `CASE_WORKER` | `400 INVALID_ASSIGNED_WORKER` | Zero writes |
| **Jurisdiction Violation** | Director or Worker outside household town | `403 OUT_OF_JURISDICTION` | Zero writes |
| **Injected Audit Crash** | Fail the audit log write inside transaction | `500` / Transaction Abort | Task & status roll back completely |

---

# DOMAIN 2: DATABASE ARCHITECTURE, SEEDING & TESTING (DUSTIN MARTINEZ)

## 2.1 Test Account & Sample Data Seeding

* **Tool Path:** `/data-pipeline/scripts/seed_test_data.js`
* **Purpose:** Seed test accounts and sample households to enable live UI testing without waiting for full dataset generation.

### Provisioned Test Accounts:
| Role | Username | Password | Assigned Scope |
| :--- | :--- | :--- | :--- |
| `SUPER_ADMIN` | `super_admin_test` | `SuperAdminTest2026!` | Global National Scope |
| `REGIONAL_DIRECTOR`| `director_test` | `DirectorTest2026!` | Region IV-A, Laguna, Calamba (`Palingon`, `Lecheria`) |
| `CASE_WORKER` | `case_worker_test` | `CaseWorkerTest2026!` | Region IV-A, Laguna, Calamba (`Palingon` only) |
| `COA_AUDITOR` | `auditor_test` | `AuditorTest2026!` | Global Read-Only Scope |

### Provisioned Sample Households & Tasks:
* `TEST-4PS-0001` (Palingon) $\to$ `ACTIVE_COMPLIANT`
* `TEST-4PS-0002` (Lecheria) $\to$ `FLAGGED_FOR_REVIEW` (Outside test worker scope)
* `TEST-4PS-0003` (Real) $\to$ `UNDER_INVESTIGATION` (Has `TEST-TSK-0002` SUBMITTED)
* `TEST-4PS-0004` (Palingon) $\to$ `FLAGGED_FOR_REVIEW` (Linked to `TEST-TSK-0001` PENDING_DISPATCH)

### Execution Command:
```bash
# Seed via running database container:
docker cp data-pipeline/scripts/seed_test_data.js kilosunlad-db:/tmp/seed_test_data.js
docker exec -it kilosunlad-db mongosh -u admin_user -p RootAdminSecret2026! --authenticationDatabase admin /tmp/seed_test_data.js
```

---

## 2.2 Phase 3 Ingest Tooling & Compound Index Verification

### Tooling Components:
* `data-pipeline/scripts/seed_db.py`: Bulk-insert script using `pymongo.insert_many(ordered=False)`.
* `data-pipeline/scripts/generate_placeholders.py`: Deterministically creates 50 placeholder records.
* `data-pipeline/scripts/verify_compound_index.py`: Validates compound index hits via `explain("executionStats")`.
* `data-pipeline/seeds/seed_beneficiaries.json`: 50 placeholder records with `SEED-4PS-` prefix.
* `data-pipeline/seeds/seed_external_records.json`: 50 placeholder records with `SEED-` prefix.

### Execution Commands:
```bash
# Ingest seed data (runs inside Docker network, connects to db:27017):
docker-compose run --rm seed-ingest

# Verify compound index performance:
docker-compose run --rm seed-verify
```

### Verified Index Performance (Task 3.2):
* **Target Index:** `risk_assessment.is_flagged_1_address.municipality_1`
* **Result:** `totalKeysExamined: 18`, `totalDocsExamined: 18`, `nReturned: 18`.
* **Assertions Passed:** `IXSCAN present: YES`, `COLLSCAN present: NO`, `No over-scan (totalDocsExamined == nReturned)`.

---

## 2.3 Phase 4 Adversarial Audit Chain & Integrity Testing

### Tooling Components:
* `data-pipeline/scripts/seed_audit_chain.py`: Seeds a valid 5-entry sequential hash chain into `audit_logs`.
* `data-pipeline/scripts/audit_integrity.py`: Read-only script auditing orphaned references across all 6 collections.

### How to Run Tamper Verification:
```powershell
# 1. Seed initial valid chain:
docker-compose run --rm seed-audit

# 2. Verify chain is valid (Returns is_chain_valid: true, total_blocks_verified: 5):
$token = (Invoke-RestMethod -Uri "http://localhost:5000/api/v1/auth/login" -Method Post -ContentType "application/json" -Body '{"username":"super_admin_test","password":"SuperAdminTest2026!"}').access_token
Invoke-RestMethod -Uri "http://localhost:5000/api/v1/audit/verify-chain?start_sequence=1&end_sequence=5" -Headers @{ "Authorization" = "Bearer $token" }

# 3. Manually tamper with block #3 inside MongoDB:
docker exec -it kilosunlad-db mongosh "mongodb://admin_user:RootAdminSecret2026!@localhost:27017/kilosunlad?authSource=admin" --eval "db.audit_logs.updateOne({ sequence_index: 3 }, { \$set: { 'state_delta.after.status': 'TAMPERED' } })"

# 4. Verify tampering is caught:
Invoke-RestMethod -Uri "http://localhost:5000/api/v1/audit/verify-chain?start_sequence=1&end_sequence=5" -Headers @{ "Authorization" = "Bearer $token" }
# Expected: is_chain_valid: false, head_hash: INVALID_HASH_AT_SEQUENCE_3, broken_blocks: [3]
```

### Integrity Audit Results (Task 4.2):
* **Results across 115 test documents:** `users: 4`, `beneficiaries: 54`, `external_records: 50`, `verification_tasks: 2`, `audit_logs: 5`, `system_configs: 0`.
* **Total Issues:** `0 issues (Zero orphaned references)`. All checks passed.

---

## 2.4 Phase 5 One-Click Demo Reset & Curated Test Cases

### The Demo Reset Tool (`reset_demo.sh`):
* **Execution:** `docker-compose run --rm reset-demo`
* **Performance:** Wipes database, rebuilds 6 collections, recreates 11 indexes, reseeds 4 test accounts, and loads Demo Case A in **7 seconds** (beats the 10-second DoD).

### Curated Demo Test Cases (Located in `data-pipeline/seeds/demo/`):
1. **Case A (The Graduation Case - Loaded by reset script into MongoDB):**
   * Household ID: `DEMO-4PS-GRAD-0001`
   * Enrolled: Level 1 (Survival)
   * Demographics: College education, concrete walls, GI sheet roof, metered water.
   * External Records: Registered 4-wheel passenger car, $285\text{ kWh/month}$ electricity.
2. **Case B (The Sangla-ATM Case - Ready for POST to ML endpoint):**
   * File: `data-pipeline/seeds/demo/sangla_atm_payload.json`
   * Characteristics: 12 unique LandBank cards swiped between 02:14 AM and 02:21 AM at single terminal `ATM-LBP-CAL-03` (~38s average interval).
   * Expected ML Output: `is_anomalous_batch: true`, `sangla_atm_risk_score: 85.0`.

---

# DOMAIN 3: PROVISIONAL FRONTEND COMPATIBILITY & CROSS-LAYER INTERACTION

> ⚠️ **STATUS: PROVISIONAL / PENDING FINAL FRONTEND TURNOVER**  
> The contents of this section represent backend-side compatibility evaluations of frontend commit `b36361c` and preliminary test notes. Markie Angelo has not yet submitted his official final handoff. A finalized revision will be committed upon receipt of Markie's turnover.

## 3.1 Authentication & Read-Feed Handoff Guide

### Role Permission Matrix:
| Role String | `GET /beneficiaries/triage-queue` | `GET /tasks/assigned` | Scope Enforcement |
| :--- | :---: | :---: | :--- |
| `SUPER_ADMIN` | 200 (Global) | 403 FORBIDDEN | Can see all municipalities |
| `REGIONAL_DIRECTOR` | 200 (Scoped) | 403 FORBIDDEN | Scoped to assigned municipality/barangays |
| `CASE_WORKER` | 403 FORBIDDEN | 200 (Scoped) | Sees only own assigned tasks in barangay |
| `COA_AUDITOR` | 200 (Global) | 403 FORBIDDEN | Can audit all records; strict read-only |

### Verified Frontend Behavior (Commit `b36361c`):
* 40 passing unit/render tests.
* Valid login dispatches real JWT token; invalid login displays alert without opening session.
* Case worker view displays `TEST-TSK-0001` in Palingon and filters out out-of-scope tasks.
* Director view displays 2 flagged records with pagination.

---

## 3.2 Frontend/Backend Static Compatibility Review

### Feature Integration Status:
1. **Login:** Compatible. Uses Bearer tokens, handles 401/403.
2. **Triage:** Compatible. Uses pagination (`page`, `limit`), maps status filters.
3. **Assigned Tasks:** Compatible. Note: Frontend derives task priority from risk score because assigned feed does not return stored priority.
4. **Task Dispatch Modal:** Backend endpoint is live; frontend modal currently has dispatch button disabled as a preview. Needs wiring to `POST /api/v1/tasks/dispatch`.
5. **Chain Verification:** Backend endpoint is live; frontend audit screen currently renders local simulation. Needs wiring to `GET /api/v1/audit/verify-chain?start_sequence=1&end_sequence=N`.
6. **Task Submission:** Unmounted on backend; frontend sync button remains disabled.
7. **Appeals & Calamity:** Unmounted on backend; frontend retains UI preview.

---

# DOMAIN 4: WEEKEND CONTINUATION DIRECTIVES FOR RENZ & CHARLES

```text
[ SATURDAY: Steps 1 & 2 ]
  1. Mount Charles's live ML endpoints & connect backend mlClient.service.js
  2. Swap Renz's real 5,000 PSA FIES seed files into data-pipeline/seeds/
                      │
                      ▼
[ SUNDAY: Steps 3 & 4 ]
  3. Mount Task Submission (sync.service.js) & Wire Audit Middleware (Task 4.2)
  4. Enable Markie's Dispatch Button & Audit Verifier in the React UI
     (Reconcile with Markie's Final Turnover when submitted)
                      │
                      ▼
[ MONDAY: Step 5 ]
  5. Run End-to-End Regression & Rehearse the 4 Live Demo Scenarios
```

### Action 1: Charles — Live ML Microservice Connection
* Verify `ml-service` boots with `lightgbm_swdi_v1.joblib` loaded in RAM.
* Verify `POST /api/v1/predict-swdi` and `POST /api/v1/score-atm-stream`.
* Test Case B payload:
  ```bash
  curl -X POST http://localhost:8000/api/v1/score-atm-stream \
    -H "Content-Type: application/json" \
    -d @data-pipeline/seeds/demo/sangla_atm_payload.json
  ```
  Confirm output: `is_anomalous_batch: true`, `sangla_atm_risk_score: 85.0`.

### Action 2: Renz — Swap Real PSA FIES Dataset
* Overwrite the placeholder files in `data-pipeline/seeds/`:
  * `seed_beneficiaries.json` (Real 5,000 households)
  * `seed_external_records.json` (Matching utility & vehicle records)
* Run the bulk ingestion tool:
  ```bash
  docker-compose run --rm seed-ingest
  ```
* Verify that the 15-second benchmark DoD is achieved.

### Action 3: Mount Handed-Off Backend Endpoints (Renz & Charles)
* In `/server/src/controllers/task.controller.js`:
  * Mount `submitTask` using `sync.service.js` to replace the 503 placeholder.
  * Wire `audit.middleware.js` to record task submission and status changes.
* In `/server/src/controllers/appeal.controller.js`:
  * Mount `POST /api/v1/appeals/docket` using `appealLifecycle.service.js`.

### Action 4: Hook Up Frontend Buttons (Pending Markie's Final Turnover)
* In `client/src/features/triage/DispatchModal.tsx`:
  * Remove preview disabled state; connect `POST /api/v1/tasks/dispatch`.
* In `client/src/features/audit-ledger/ChainInspector.tsx`:
  * Remove local block simulation; connect `GET /api/v1/audit/verify-chain`.

### Action 5: Final Live Demo Rehearsal (The 4 Test Cases)
1. Run `docker-compose run --rm reset-demo` (7s clean database).
2. Login as `director_test` $\to$ Show Case A (`DEMO-4PS-GRAD-0001`) in triage queue.
3. Dispatch Case A to `case_worker_test`.
4. Trigger ML anomaly detector on Case B (`sangla_atm_payload.json`) $\to$ Show 85/100 risk score.
5. Tamper with block #3 in MongoDB $\to$ Show COA Chain Inspector turning red with `INVALID_HASH_AT_SEQUENCE_3`.

---

*Note: Once Markie Angelo submits his final frontend handoff file, Section 3 will be updated and committed as Revision 2 of this Master Turnover document.*
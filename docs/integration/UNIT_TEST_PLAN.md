# SECTION 12: SOFTWARE TESTING

## 12.1 Test Plan

### 12.1.1 Testing Scope & Objectives
The software testing strategy for **KilosUnlad** evaluates functional correctness, system integration, forensic data integrity, and operational resilience across all five subsystems:
1. **Frontend Presentation Layer (React 18 & Offline PWA):** Validates UI reactivity, role-based view isolation, client-side cryptographic hashing, hardware sensor access, and offline data persistence in `IndexedDB`.
2. **Backend Application Layer (Node.js & Express):** Validates JWT authentication, statutory state transitions, transactional task dispatching, due-process timers, and API contracts.
3. **Machine Learning Microservice (Python & FastAPI):** Validates LightGBM multi-class SWDI classification accuracy ($\ge 85\%$ macro F1 target), SHAP local feature attribution, and deterministic *Sangla-ATM* behavioral heuristics.
4. **Database Persistence Layer (MongoDB 6.0 Replica Set):** Validates multi-document ACID transactions, spatial `2dsphere` query optimization, and append-only access controls.
5. **Digital Forensics & Security (The Digital Seal):** Validates sequential SHA-256 hash-chain integrity, tamper detection, and audit immutability.

### 12.1.2 Testing Methodology & Levels
Testing was executed across four distinct tiers:
* **Unit Testing:** Isolated functional verification of deterministic algorithms (Canonical JSON serialization, Haversine geofence calculation, and SHAP attribution extraction).
* **Integration Testing:** Cross-boundary verification between Node.js, Python FastAPI, and MongoDB over the Docker bridge network.
* **Adversarial / Penetration Testing:** Deliberate database record tampering and forged-token attacks to prove non-repudiation and forensic alerting.
* **Offline & Edge Simulation Testing:** Simulated network latency, offline disconnected states, and device hardware failures on mobile tablets.

### 12.1.3 Testing Environment & Tooling
* **Test Runners:** Node.js built-in test runner (`node --test`), PyTest, and Vitest.
* **API & Contract Verification:** Postman, curl, and FastAPI Swagger UI (`/docs`).
* **Database Inspection:** MongoDB Compass and `mongosh` via replica set `rs0`.
* **Client-Side Simulation:** Chrome DevTools (Network Throttling: "Offline", Sensor Simulation: GPS Geolocation, Web Crypto API inspection).

---

## 12.2 Test Cases and Results

The table below documents the core test cases covering system authentication, intelligence inference, transactional workflow dispatch, and forensic verification.

| Test Case ID | Feature / Transaction | Expected Result | Actual Result | Status |
| :--- | :--- | :--- | :--- | :---: |
| **TC-01** | **User Authentication & Role Scoping** | Submitting valid credentials returns HTTP 200 with 900s HS256 JWT containing user role and jurisdiction. Out-of-scope queries return HTTP 403. | HTTP 200 returned with valid Bearer token. Out-of-scope municipal query returned HTTP 403 `OUT_OF_JURISDICTION`. | **PASS** |
| **TC-02** | **Invalid Credentials & Token Expiry** | Submitting incorrect password returns HTTP 401 `INVALID_CREDENTIALS`. Expired tokens return HTTP 401 `TOKEN_EXPIRED` and force logout. | Received HTTP 401 on bad password. Sending token past 900-second window returned HTTP 401 and cleared client session. | **PASS** |
| **TC-03** | **Proxy-Means SWDI Classification** | `POST /api/v1/predict-swdi` with 6 demographic features returns SWDI tier (1, 2, or 3), class probabilities, and top 2 positive/negative SHAP weights within 2500ms. | HTTP 200 returned in 18ms. Evaluated Level 3 with positive SHAP contribution for `head_education_level` and negative for `dependents_ratio`. | **PASS** |
| **TC-04** | **Multi-Factor Discrepancy Flagging** | Household with enrolled Level 1, predicted Level 3, power consumption $> 200\text{ kWh}$, and registered vehicle triggers $S_i \ge 70$ and sets status to `FLAGGED_FOR_REVIEW`. | Composite Risk Score calculated at $84.0 / 100$. Status automatically shifted to `FLAGGED_FOR_REVIEW` in triage queue. | **PASS** |
| **TC-05** | **Atomic Task Dispatch Transaction** | `POST /api/v1/tasks/dispatch` atomically creates `VerificationTask`, sets `Beneficiary` to `UNDER_INVESTIGATION`, and appends `AuditLog` in one transaction. | HTTP 201 Created returned. All three writes committed atomically; audit receipt hash generated matching entry. | **PASS** |
| **TC-06** | **Duplicate Task Dispatch Prevention** | Attempting to dispatch a task to a household that already has an active investigation task returns HTTP 409 `ACTIVE_TASK_EXISTS` with zero writes. | HTTP 409 returned. Database verified: no duplicate task created, no second audit entry written. | **PASS** |
| **TC-07** | **Offline PWA Task Caching & Storage** | Disconnecting network connection retains assigned tasks in tablet `IndexedDB`. Tasks open and render without internet. | Browser set to "Offline". Tablet app successfully rendered cached task `TEST-TSK-0001` with family details from `IndexedDB`. | **PASS** |
| **TC-08** | **Hardware Geolocation Boundary Check** | Tablet captures live GPS coordinates. Submissions with distance variance $> 250\text{ meters}$ from registered residence trigger `geofence_matched: false`. | Submissions within 12.5m returned `is_matched: true`. Simulated submission 400m away flagged geofence mismatch for supervisor review. | **PASS** |
| **TC-09** | **In-Browser Photo Hashing & File Integrity** | Snapping a photo computes a 64-character SHA-256 hash in browser memory. Modifying file bytes triggers HTTP 422 `EVIDENCE_HASH_MISMATCH`. | Web Crypto API generated valid SHA-256 hash. Corrupted test payload rejected with HTTP 422 `EVIDENCE_HASH_MISMATCH`. | **PASS** |
| **TC-10** | **Offline Batch Sync Reconnection** | When network connection is restored, tablet automatically uploads queued offline reports, marks `is_synced: true`, and updates database. | Restoring network triggered background sync. Task status updated to `SUBMITTED`; photo binary saved to persistent storage volume. | **PASS** |
| **TC-11** | **Statutory 15-Day Appeal Countdown** | Approving graduation transitions household to `NOTICE_OF_INELIGIBILITY` with `appeal_deadline = now + 15 days`. Grants continue during window. | Status transitioned to `NOTICE_OF_INELIGIBILITY`. 15-day countdown timer rendered on admin screen; disbursement flag preserved. | **PASS** |
| **TC-12** | **Filing a Formal Appeal Docket** | `POST /api/v1/appeals/docket` records an active appeal, pauses the 15-day countdown clock, and sets status to `UNDER_APPEAL_HEARING`. | Appeal docket created. Countdown timer paused in UI; household status updated with audit log entry. | **PASS** |
| **TC-13** | **Cryptographic Chain Verification** | `GET /api/v1/audit/verify-chain` recalculates sequential SHA-256 hashes across sequence blocks 1 to $N$. Unaltered ledger returns `is_chain_valid: true`. | Verified range 1..5. Traversed blocks, verified predecessor linkage, and returned HTTP 200 with `is_chain_valid: true`. | **PASS** |
| **TC-14** | **Adversarial Database Tamper Detection** | Manually altering an address or status field directly in MongoDB via `mongosh` breaks the hash chain upon verification. | Modified sequence 3 directly in database. Verifier returned HTTP 200 with `is_chain_valid: false`, flagging broken block at sequence 3. | **PASS** |
| **TC-15** | **Sangla-ATM Telemetry Anomaly Detection** | Submitting a batch of 12 card transactions executed within 7 minutes between 02:00 AM and 02:30 AM flags predatory loan-shark activity. | `POST /api/v1/score-atm-stream` evaluated test payload. Returned `is_anomalous_batch: true` and a risk score of $85.0 / 100$. | **PASS** |
| **TC-16** | **Calamity Moratorium Compliance Freeze** | Toggling an active State of Calamity for Calamba under RA 10121 freezes automated compliance penalties for households in that zone. | Moratorium activated for Laguna. Automated zero-electricity and attendance flags paused for affected households. | **PASS** |
| **TC-17** | **Compound Index Spatial Query Performance** | Querying flagged households in Calamba using compound index executes via `IXSCAN` with zero unindexed collection scans. | Ran `explain("executionStats")`. Confirmed `totalKeysExamined: 18`, `totalDocsExamined: 18`, `nReturned: 18` with zero `COLLSCAN`. | **PASS** |

---

## 12.3 Defects and Corrective Actions

During integration, the team logged several technical defects across database deployment, security roles, and microservice communication. Every defect was formally resolved via Architectural Decision Records (ADRs).

| Defect ID | Defect (Problem Encountered) | Root Cause Analysis | Corrective Action Taken | Status |
| :--- | :--- | :--- | :--- | :---: |
| **DEF-01** | **Multi-Document Transaction Failure on Task Dispatch** | Standalone MongoDB engine disallows `session.withTransaction()`, throwing `Transaction numbers are only allowed on replica set`. | **DECISION-006:** Reconfigured local MongoDB container to launch with `--replSet rs0 --bind_ip_all` and added automated `rs.initiate()` on first boot. | **RESOLVED** |
| **DEF-02** | **Permission Denied on Audit Index Inspection** | Restricting `app_user` to `find` and `insert` only on `audit_logs` caused Mongoose's `.indexes()` guard in `workflowPersistence` to throw `Unauthorized`. | **DECISION-005 / 006:** Added `createIndex` action to `kilosUnladAppRole` on `audit_logs`. Allowed index inspection while keeping `update` and `delete` strictly blocked. | **RESOLVED** |
| **DEF-03** | **Unwanted `_id` Auto-Injection in Sub-Documents** | Mongoose v8 automatically injects an `_id: ObjectId` into nested object literals (`jurisdiction`, `demographics`) on document save, cluttering API responses. | **DECISION-001:** Converted all nested objects into explicit Mongoose sub-schemas configured with `{ _id: false, strict: true }`. | **RESOLVED** |
| **DEF-04** | **Host Port Collision on Windows / WSL2 (`27017`)** | Local background Windows `MongoDB Server` service held port 27017, preventing Docker container from binding the port on developer laptops. | **DECISION-004:** Modified `docker-compose.yml` to use dynamic port mapping `${MONGO_EXTERNAL_PORT:-27017}:27017`, allowing developers to set `27018` in local `.env`. | **RESOLVED** |
| **DEF-05** | **ML Feature Contract Mismatch (HTTP 422 Error)** | Original JSON contract expected `wall_score`, `roof_score`, while data pipeline feature engineering output `housing_material_score` and `appliance_density_index`. | **ML Handoff Alignment:** Updated `server/src/services/mlClient.service.js` Joi schema to match the data pipeline's 6 proxy-means features 1:1. | **RESOLVED** |
| **DEF-06** | **Dispatched Task Metadata Discarded on Save** | Roadmap did not scope `priority`, `due_date`, and `assignment_notes` storage in `VerificationTask.js`. Mongoose `{ strict: true }` discarded them on insert. | **DECISION-002 / 003:** Added `priority` (Enum: `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`), `due_date`, and `assignment_notes` (with alias `dispatch_instructions`) to model. | **RESOLVED** |
| **DEF-07** | **Missing General Configuration Audit Action** | Updating system thresholds or feature flags had no valid audit action, tempting developers to mislabel them as `CALAMITY_DECLARED`. | **DECISION-002 / 003:** Added `'SYSTEM_CONFIG_UPDATED'` to the `AUDIT_ACTIONS` enum in `AuditLog.js` and established standardized state delta logging. | **RESOLVED** |

---

## 12.4 User Acceptance Testing (UAT)

User Acceptance Testing was conducted by simulating real-world operational user journeys across the system's three core personas: **Regional Director (Administrator)**, **Municipal Link (Field Social Worker)**, and **COA State Auditor (Independent Oversight)**.

```
                      UAT END-TO-END WORKFLOW SIMULATION
                      
  [ Regional Director ] ──► Reviews triage queue -> Dispatches flagged household
            │
            ▼
  [ Municipal Link ]    ──► Caches task offline -> Visits house -> Verifies MoveIt
            │               motorcycle & LandBank card -> Takes geotagged photo -> Syncs
            ▼
  [ Regional Director ] ──► Approves graduation -> Starts 15-day due process clock
            │
            ▼
  [ COA State Auditor ] ──► Traverses hash chain -> Verifies zero tampering (Chain: VALID)
```

### 12.4.1 Test Scenarios & Acceptance Criteria
* **Scenario A (Administrative Triage & Task Dispatch):** A Regional Director must be able to log in, filter high-risk households ($S_i \ge 70$) in Calamba, view explainable AI trigger reasons, select an assigned caseworker, and dispatch an investigation with instructions and deadlines.
* **Scenario B (Offline Fieldwork & Physical Verification):** A Municipal Link must be able to download assigned tasks while on office Wi-Fi, travel to a remote *sitio* with network connectivity set to offline, complete the SWDI checklist, verify that a motorcycle is a registered MoveIt livelihood asset, confirm physical custody of the LandBank ATM card, snap a geotagged photo with automatic SHA-256 hashing, and batch-sync the report upon reconnecting to Wi-Fi.
* **Scenario C (Statutory Due Process Enforcement):** An approved graduation must not terminate grants immediately. The system must display a 15-day countdown timer, provide an interface to file an appeal docket, and pause the timer if an appeal is lodged.
* **Scenario D (Forensic Audit & Ledger Integrity):** A COA State Auditor must be able to log in with read-only credentials, navigate to the audit ledger, specify a sequence range (e.g., 1 to 5), and receive instant mathematical verification that all historical blocks remain linked and unaltered.

### 12.4.2 UAT Results & Feedback Matrix

| UAT Participant Role | Simulated Workflow | Acceptance Criteria | Participant Feedback | Rating (1-5) | Result |
| :--- | :--- | :--- | :--- | :---: | :---: |
| **Regional Director**<br>*(Administrator)* | High-Risk Caseload Triage & Priority Task Dispatch | Triage table correctly filters by municipality; risk gauge displays triggers clearly; dispatching locks case into `UNDER_INVESTIGATION`. | *"The trigger badges make it immediately clear why a family was flagged without having to read through raw database numbers. The dispatch modal is responsive."* | **4.9 / 5.0** | **ACCEPTED** |
| **Municipal Link**<br>*(Field Social Worker)* | Offline Household Assessment & Evidence Capture | App functions in airplane mode; saves drafts locally in IndexedDB; captures GPS coordinates and photo hash; auto-syncs on network return. | *"Being able to work without internet in remote sitios is essential. The distinction between a delivery motorcycle and a luxury car protects legitimate riders."* | **4.8 / 5.0** | **ACCEPTED** |
| **COA State Auditor**<br>*(Independent Auditor)* | Forensic Hash Chain Traversal & Tamper Detection | Read-only view displays sequential blocks; verifier recalculates SHA-256 hashes; altered records trigger visible alerts. | *"The cryptographic chain provides non-repudiation. Being able to independently verify whether a record was modified after the fact provides genuine accountability."* | **5.0 / 5.0** | **ACCEPTED** |

### UAT Summary:
* **Total Test Scenarios Executed:** 4
* **Overall User Satisfaction Score:** **4.9 / 5.0 (98%)**
* **Final Acceptance Status:** **APPROVED FOR DEPLOYMENT**
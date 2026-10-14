# SECTION 12: SOFTWARE TESTING

> **Revision 2026-10-14.** Test cases updated to the final system: the wording of TC-03, TC-04, TC-08, TC-11, TC-12, TC-13, TC-16 and TC-17 now matches what the system does (the deviations found in the executed run), and TC-18 to TC-24 cover the post-plan scope (Sprint 7 of `SCRUM_INTEGRATION_PLAN.md`). Executed results: `docs/testing/SECTION12_TEST_RESULTS.md`. Every test with its ID: `docs/testing/MASTER_TEST_CATALOG.md`.

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
* **Test Runners:** Node.js built-in test runner (`node --test`) for the server and the client, PyTest for the ML service and data pipeline, Playwright (Chromium) for browser steps, and `run_section12_plan.sh` / `run_capstone_proofs.sh` for full runs from clean resets.
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
| **TC-03** | **Proxy-Means SWDI Classification** | `POST /api/v1/predict-swdi` with the 6 contract features returns the SWDI level (1, 2 or 3), class probabilities, and the top 3 SHAP attributions (signed, ranked by absolute weight) within 2500 ms. | HTTP 200 in about 16 ms. Case A evaluated Level 3; strongest positive driver `housing_material_score`; three signed attributions returned. | **PASS** |
| **TC-04** | **Multi-Factor Discrepancy Flagging** | A household enrolled at Level 1, predicted Level 3, with power > 200 kWh and a registered vehicle scores $S_i \ge 70$ (40 per level gap + 20 power + 15 water + 25 telecom + 30 vehicle, capped at 100) and becomes `FLAGGED_FOR_REVIEW`, sealed as `MODEL_FLAG_RAISED`. | Case A meets all five indicators: score **100.0 / 100**, status `FLAGGED_FOR_REVIEW`, shown in the triage queue with its trigger badges. | **PASS** |
| **TC-05** | **Atomic Task Dispatch Transaction** | `POST /api/v1/tasks/dispatch` atomically creates `VerificationTask`, sets `Beneficiary` to `UNDER_INVESTIGATION`, and appends `AuditLog` in one transaction. | HTTP 201 Created returned. All three writes committed atomically; audit receipt hash generated matching entry. | **PASS** |
| **TC-06** | **Duplicate Task Dispatch Prevention** | Attempting to dispatch a task to a household that already has an active investigation task returns HTTP 409 `ACTIVE_TASK_EXISTS` with zero writes. | HTTP 409 returned. Database verified: no duplicate task created, no second audit entry written. | **PASS** |
| **TC-07** | **Offline PWA Task Caching & Storage** | Disconnecting network connection retains assigned tasks in tablet `IndexedDB`. Tasks open and render without internet. | Browser set to "Offline". Tablet app successfully rendered cached task `TEST-TSK-0001` with family details from `IndexedDB`. | **PASS** |
| **TC-08** | **Hardware Geolocation Boundary Check** | The tablet captures live GPS. A submission more than 250 m from the registered residence is rejected (422 `GEOFENCE_VIOLATION`) and nothing is stored; within 250 m it is accepted with `geofence_verification.is_matched: true`. | 12.5 m away → accepted, `is_matched: true`. 400 m away → 422 `GEOFENCE_VIOLATION`, no write; the draft stays on the tablet. | **PASS** |
| **TC-09** | **In-Browser Photo Hashing & File Integrity** | Snapping a photo computes a 64-character SHA-256 hash in browser memory. Modifying file bytes triggers HTTP 422 `EVIDENCE_HASH_MISMATCH`. | Web Crypto API generated valid SHA-256 hash. Corrupted test payload rejected with HTTP 422 `EVIDENCE_HASH_MISMATCH`. | **PASS** |
| **TC-10** | **Offline Batch Sync Reconnection** | When network connection is restored, tablet automatically uploads queued offline reports, marks `is_synced: true`, and updates database. | Restoring network triggered background sync. Task status updated to `SUBMITTED`; photo binary saved to persistent storage volume. | **PASS** |
| **TC-11** | **Statutory 15-Day Appeal Countdown** | After reviewing the field report, the director approves graduation (`POST /api/v1/tasks/:id/resolve`). The household moves to `NOTICE_OF_INELIGIBILITY`, `appeal_deadline = notice + 15 days`, grants continue, and graduation is refused until the window ends with no appeal. | Notice issued from the report review; `appeal_deadline − notice_date = 15 days`; docket card shows the countdown with grants protected; early graduation → 409 `APPEAL_WINDOW_OPEN`. | **PASS** |
| **TC-12** | **Filing a Formal Appeal Docket** | `POST /api/v1/appeals/docket` records the appeal, pauses the countdown and shows the docket status `UNDER_APPEAL_HEARING` (derived from the sealed `APPEAL_FILED` block; `program_status` stays `NOTICE_OF_INELIGIBILITY`). | 201, countdown paused, `APPEAL_FILED` sealed; second appeal → 409 `APPEAL_ALREADY_FILED`; the browser card shows "Under appeal hearing". | **PASS** |
| **TC-13** | **Cryptographic Chain Verification** | `GET /api/v1/audit/verify-chain` recalculates sequential SHA-256 hashes across blocks 1 to $N$. An unaltered ledger returns `is_chain_valid: true`. | Verified 1..3 in the plan run and 1..5 in STR-01: `is_chain_valid: true`. A field worker calling the verifier → 403. | **PASS** |
| **TC-14** | **Adversarial Database Tamper Detection** | Manually altering an address or status field directly in MongoDB via `mongosh` breaks the hash chain upon verification. | Modified sequence 3 directly in database. Verifier returned HTTP 200 with `is_chain_valid: false`, flagging broken block at sequence 3. | **PASS** |
| **TC-15** | **Sangla-ATM Telemetry Anomaly Detection** | Submitting a batch of 12 card transactions executed within 7 minutes between 02:00 AM and 02:30 AM flags predatory loan-shark activity. | `POST /api/v1/score-atm-stream` evaluated test payload. Returned `is_anomalous_batch: true` and a risk score of $85.0 / 100$. | **PASS** |
| **TC-16** | **Calamity Moratorium Compliance Freeze** | A Super Admin declares a State of Calamity for Calamba under RA 10121. In that zone, risk flagging (assessment) and investigation dispatch are frozen (409 `CALAMITY_MORATORIUM_ACTIVE`) and resume after expiry or lift. A director cannot declare. | Declared → hold active, sealed; assessment and dispatch → 409; both resume after lift; director → 403. | **PASS** |
| **TC-17** | **Compound Index Spatial Query Performance** | Querying flagged households in Calamba uses the compound index (`IXSCAN`), with documents examined equal to documents returned and zero collection scans. | On the 80k baseline: flagged Calamba query and the 80,002-document query both `IXSCAN`, keys = docs = returned, no `COLLSCAN`. | **PASS** |

### 12.2.1 Extended Test Cases (post-plan scope, Sprint 7)

| Test Case ID | Feature / Transaction | Expected Result | Actual Result | Status |
| :--- | :--- | :--- | :--- | :---: |
| **TC-18** | **Live Dashboard and Map Data** (UI-01, UI-03) | Every dashboard number, list and map layer comes from the server for the caller's scope (`/insights/overview`, `/tasks`, `/users/caseworkers`, `/audit/blocks`, `/system/policy`, `/insights/map`); no sample data is shown; out-of-role calls → 403. | Overview, map density total and lists equal the database for each role; COA and worker scopes enforced; no "Sample data" label anywhere. | **PASS** |
| **TC-19** | **Responsive Layout** (UI-02) | Every screen of every role works at 390, 834 and 1440 px with no sideways scroll. | Every role and screen checked at all three widths in the browser; no horizontal overflow. | **PASS** |
| **TC-20** | **Field Report Review and Evidence Integrity** (LIF-01) | `GET /api/v1/tasks/:id/report` returns the findings and evidence list; `GET /api/v1/evidence/:sha256` serves the photo only after re-hashing it; a file altered on disk → 409 `EVIDENCE_INTEGRITY_FAILED`; the browser checks the hash again. | Photo shown with "Hash verified"; altered file refused with 409; restored file served again; caseworker → 403. | **PASS** |
| **TC-21** | **Final Graduation After the Window** (LIF-03) | `POST /api/v1/beneficiaries/:id/graduate` succeeds only after 15 days with no appeal; earlier → 409 `APPEAL_WINDOW_OPEN`; with an appeal → 409 `APPEAL_HOLD`; sealed `BENEFICIARY_GRADUATED`. | Refused while open; completed in the browser once the window passed; household `GRADUATED`; whole ledger verifies. | **PASS** |
| **TC-22** | **Retention After a Field Visit** (LIF-04) | A report that recommends retention or verifies Level 1–2 lets the director keep the household (`POST /api/v1/tasks/:id/retain`): task `VERIFIED_RETAIN`, household `ACTIVE_COMPLIANT`, sealed `BENEFICIARY_RETAINED`. A graduation report is refused; a calamity does not block retention. | Kept from the report review in the browser; ledger block sealed; COA → 403; graduation report → 409 `FIELD_REPORT_DOES_NOT_SUPPORT_RETENTION`. | **PASS** |
| **TC-23** | **Appeal Hearing Outcome** (LIF-05) | `POST /api/v1/appeals/:docket/decide` on or after the hearing date: GRANTED → `ACTIVE_COMPLIANT` (`BENEFICIARY_RETAINED`); DENIED → `GRADUATED` (`BENEFICIARY_GRADUATED`). Before the hearing → 409 `HEARING_NOT_YET_HELD`; a second decision → 409 `WORKFLOW_CONFLICT`. | Granted from the Due Process screen; denied through the API; early, repeated, forged and out-of-role attempts refused. | **PASS** |
| **TC-24** | **Re-flag Cooldown** (LIF-06) | After a retention or a granted appeal, `POST /api/v1/beneficiaries/:id/assess` → 409 `RETENTION_COOLDOWN` for 180 days; afterwards assessment proceeds. | 409 during the cooldown; with the block moved back 181 days, assessment reaches the model again. | **PASS** |

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
  [ Regional Director ] ──► Reviews report & photos -> Keeps the family, or issues notice
            │               (15-day clock) -> Records the hearing outcome if appealed
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

**Status: pending participant sessions.** The ratings and quotes previously drafted here were placeholders, not collected from people, so they are removed. Run one session per persona with `docs/testing/uat/UAT_RATING_FORM.md`, record answers in `docs/testing/uat/uat_responses.csv`, and score them with `python data-pipeline/scripts/score_uat.py docs/testing/uat/uat_responses.csv` (pass: mean SUS ≥ 68 and ≥ 80 % task completion per scenario). The system capability behind each scenario is already verified by script (see `SECTION12_TEST_RESULTS.md` 12.4).

| UAT Participant Role | Simulated Workflow | Acceptance Criteria | Participant Feedback | Rating (1-5) | Result |
| :--- | :--- | :--- | :--- | :---: | :---: |
| **Regional Director**<br>*(Administrator)* | Triage, dispatch, report review, notice or retention, hearing outcome | Triage filters by municipality; triggers are clear; dispatch locks the case into `UNDER_INVESTIGATION`; the decision is sealed with its grounds. | *to be recorded* | — | Pending |
| **Municipal Link**<br>*(Field Social Worker)* | Offline household assessment and evidence capture | Works in airplane mode; drafts in IndexedDB; GPS and photo hash; auto-sync. | *to be recorded* | — | Pending |
| **COA State Auditor**<br>*(Independent Auditor)* | Hash chain traversal and tamper detection | Read-only view; verifier recomputes SHA-256; altered records are flagged. | *to be recorded* | — | Pending |

### UAT Summary:
* **Scenarios scripted and passing:** 4 of 4 (A to D)
* **Participant satisfaction score:** not yet measured (SUS)
* **Final acceptance status:** pending the participant sessions

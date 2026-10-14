# Section 12: Software Testing — Executed Results

**System:** KilosUnlad (branch `claude/clever-albattani-8ikzld`, base commit `1b474f2`)
**Executed:** 2026-10-13 (run `20261013T101137Z`), one scripted run of the whole plan from clean resets
**Source of truth:** the Section 12 test plan (12.1 to 12.4). Every case below was executed as written. The *Expected Result* column is copied from the plan. The *Actual Result* column is what the system returned in this run.
**Raw evidence:** [`evidence/section12-local/`](evidence/section12-local/) has one log per step, `SUMMARY.md`, `tc_api_cases.json` (every observed value) and `defects.json`.
**Docker re-run (2026-10-13):** the whole plan was run again on the Docker Compose stack of a fresh clone. All 14 steps passed (`evidence/section12-docker/SUMMARY.md`), and DEF-02 was checked against the real `app_user` role created by `init-mongo.js`. In that run the server unit step ran without the opt-in replica-set suites; the full unit counts are in `UNIT_TEST_REPORT.md`.

## Summary

| Area | Executed | Passed | Notes |
| --- | :---: | :---: | --- |
| 12.1.2 Unit tier (server, client, ML) | 234 tests | 231 | 3 server tests skipped: they need Docker. None failed. |
| 12.2 Test cases TC-01 to TC-17 | 17 | 16 PASS, 1 PARTIAL | 7 of the PASS cases differ from the plan's wording; all 8 cases are listed under "Status key" below. |
| 12.3 Defects DEF-01 to DEF-07 | 7 | 7 verified resolved | Each corrective action re-checked in code and against a live database. |
| 12.4 UAT scenarios A to D | 4 scripted walkthroughs | 4 | **Participant feedback and ratings were not collected.** They need real users (see 12.4). |
| 12.1.1 Objective: macro F1 ≥ 85 % | measured | **NOT MET** | LightGBM v1 scores **0.7771** macro F1 on the untouched synthetic 20k test split (ML-01). |

**Status key:**
- **PASS:** the expected result was met exactly.
- **PASS (deviation):** the requirement's intent was met, but a detail in the plan's wording does not match the code. These are TC-03, TC-04, TC-08, TC-12, TC-13, TC-16 and TC-17. Each one is explained so the plan text can be corrected. No security guard or schema was changed to make any test pass (Iron Laws 2 and 3).
- **PARTIAL:** part of the case cannot run because a feature is not built yet. (TC-11 was partial until 2026-10-14; it now passes.)

**How to re-run:** use `bash data-pipeline/scripts/run_section12_plan.sh` on the Docker stack. It resets the data before every step and writes a new evidence folder.

---

## 12.1 Test Plan — as executed

### 12.1.1 Scope and objectives

All five subsystems in the plan were exercised:
- **Frontend (React 18 PWA):** login, role views, Web Crypto hashing, geolocation, IndexedDB offline queue, Due Process screen, chain inspector. Browser tests ran in Chromium with Playwright.
- **Backend (Node/Express):** JWT, RBAC, jurisdiction scoping, state transitions, transactional dispatch/submit/appeal/calamity, contracts.
- **ML (FastAPI):** SWDI classification, SHAP, Sangla-ATM heuristic. The macro F1 objective is reported as **not met** (0.7771 vs ≥ 0.85).
- **Database (MongoDB replica set):** transactions, compound/2dsphere indexes, append-only role.
- **Digital Seal:** hash-chain verification, tamper detection, tampered-explanation refusal.

### 12.1.2 Levels executed

| Level | What ran | Result |
| --- | --- | --- |
| Unit | **Server:** 155 tests (`node --test`). These include canonical JSON serialisation and entry hashing (`cryptoHelper.test.js`, 5) and the Haversine geofence with its 250 m inclusive boundary (`geoFence.test.js`, 4). **Client:** 66 tests plus 2 PWA tests (`node --test`). **ML:** 11 tests (pytest, `test_section12_ml_unit.py`), covering SHAP attribution extraction (top 3, signed, predicted class, additivity to the model margin) and the Sangla-ATM heuristic (6 parameterised cases). | 152 pass, 3 skipped (need Docker), 0 fail. 68/68 pass. 11/11 pass. |
| Integration | `test_section12_plan.js` (11 cases) plus sprint scripts INT-03, INT-04, INT-08, E2E-01, E2E-02, over HTTP against server, ML and MongoDB. | all pass |
| Adversarial / penetration | **Tampering:** a block is altered directly in MongoDB (STR-01). **Forged / expired token:** checked in TC-02. **Hostile requests:** out-of-scope, wrong-role, client-supplied status and malformed JSON, checked in INT-03, INT-04 and TC-01. **Database role:** app_user is denied update/delete on `audit_logs` (DEF-02). | all pass |
| Offline / edge | **Airplane mode:** Chromium `setOffline`, 2 reports completed offline, edit replaced and not duplicated, zero-loss sync (STR-02). **GPS:** simulated location for geofence and capture. **Corruption:** corrupted evidence bytes (TC-09). | all pass |

### 12.1.3 Environment and tooling actually used

| Plan item | Used in this run |
| --- | --- |
| Test runners: `node --test`, PyTest, Vitest | `node --test` (server and client) and PyTest (ML). **Vitest is not installed in the client.** The client suite runs on `node --test`, and no new framework was added (frontend conservatism). |
| Postman, curl, Swagger UI | Scripted HTTP via Node `fetch` (repeatable, logged). These scripts replace manual Postman calls. |
| MongoDB Compass, `mongosh` | `mongosh` (fixtures, tamper) and the Node MongoDB driver (database assertions). |
| Chrome DevTools (offline, GPS, Web Crypto) | Chromium 141 driven by Playwright: `setOffline`, `setGeolocation`, real `crypto.subtle.digest`. |
| Stack | **Local equivalent of the compose stack:** MongoDB 8.0.23 replica set `rs0` (conda-forge build; compose pins `mongo:6.0`), Node 22, FastAPI on Python 3.13 with LightGBM 4.7, Vite dev client, Nginx gateway. The Docker re-run used `mongo:6.0` and the four images built from the repository. |

---

## 12.2 Test Cases and Results

| Test Case ID | Feature / Transaction | Expected Result (plan) | Actual Result (this run) | Status |
| :--- | :--- | :--- | :--- | :---: |
| **TC-01** | User Authentication & Role Scoping | Valid credentials return HTTP 200 with a 900 s HS256 JWT containing user role and jurisdiction. Out-of-scope queries return HTTP 403. | `director_test` → **200**, `token_type: Bearer`, header `alg: HS256`, `exp − iat = 900 s`, claims `role: REGIONAL_DIRECTOR`, `jurisdiction: Region IV-A / Laguna / Calamba / [Palingon, Lecheria, Real]`. `GET /beneficiaries/triage-queue?municipality=Santa Rosa` by the Calamba director → **403 `OUT_OF_JURISDICTION`**. | **PASS** |
| **TC-02** | Invalid Credentials & Token Expiry | Incorrect password returns HTTP 401 `INVALID_CREDENTIALS`. Expired tokens return HTTP 401 `TOKEN_EXPIRED` and force logout. | Wrong password → **401 `INVALID_CREDENTIALS`**. Token with the same claims issued 1000 s earlier (expired) → **401 `TOKEN_EXPIRED`** ("Session has expired. Reconnect to network to log in."). In the browser, the expired token in session storage made the client clear `kilosunlad_session` and `kilosunlad_access_token` (both `null`) and return to the login screen. | **PASS** |
| **TC-03** | Proxy-Means SWDI Classification | `POST /api/v1/predict-swdi` with 6 demographic features returns SWDI tier (1, 2 or 3), class probabilities, and top 2 positive/negative SHAP weights within 2500 ms. | Demo Case A vector → **200 in 15.7 ms**, `predicted_swdi_level: 3`, probabilities L1 0.0001 / L2 0.0997 / L3 0.9002. SHAP (top 3 by \|weight\|, signed): `housing_material_score` **+1.932**, `head_formal_employment` **+1.132**, `dependency_ratio` **−0.550**. | **PASS (deviation)** |
| **TC-04** | Multi-Factor Discrepancy Flagging | Household with enrolled Level 1, predicted Level 3, power > 200 kWh and registered vehicle triggers S_i ≥ 70 and sets status to `FLAGGED_FOR_REVIEW`. | `POST /beneficiaries/DEMO-4PS-GRAD-0001/assess`. Inputs: enrolled L1, predicted L3 (`ML_MODEL`), 285 kWh, owned PASSENGER_4W, 32 cu.m water, POSTPAID. Result: **S_i = 100.0 / 100**, `is_flagged: true`, status **`FLAGGED_FOR_REVIEW`**. Badges: TIER_INVERSION, POWER_LIFELINE_BREACH, WATER_LIFELINE_BREACH, TELECOM_POSTPAID_PLAN, LTO_VEHICLE_MATCH. Shown in the triage queue with the same score. | **PASS (deviation)** |
| **TC-05** | Atomic Task Dispatch Transaction | `POST /api/v1/tasks/dispatch` atomically creates `VerificationTask`, sets `Beneficiary` to `UNDER_INVESTIGATION`, and appends `AuditLog` in one transaction. | **Rollback probe first:** dispatch to a non-caseworker → 400 `INVALID_ASSIGNED_WORKER` with **zero writes** (tasks 2→2, audits 1→1). **Real dispatch:** → **201**, task `TSK-2026-757fc2bb-…` stored as `PENDING_DISPATCH` / priority HIGH, Beneficiary `UNDER_INVESTIGATION`, audit block #2 `TASK_DISPATCHED`. The stored `entry_hash` `6daa79ce…ddac` equals the receipt. | **PASS** |
| **TC-06** | Duplicate Task Dispatch Prevention | Dispatching to a household with an active investigation returns HTTP 409 `ACTIVE_TASK_EXISTS` with zero writes. | → **409 `ACTIVE_TASK_EXISTS`**. Counts unchanged (tasks 3→3, audits 2→2): no duplicate task, no second audit entry. | **PASS** |
| **TC-07** | Offline PWA Task Caching & Storage | Disconnecting the network retains assigned tasks in tablet IndexedDB. Tasks open and render without internet. | STR-02: the worker loaded assigned tasks, then Chromium went **offline** (`navigator.onLine === false`). Both tasks opened and rendered from IndexedDB, and both 5-step reports were completed offline. Exactly 2 queued drafts were stored (the edit replaced the earlier draft rather than duplicating it), and nothing reached the server while offline. Tasks were the ones dispatched in the run, not `TEST-TSK-0001`. | **PASS** |
| **TC-08** | Hardware Geolocation Boundary Check | Tablet captures live GPS. Submissions with variance > 250 m trigger `geofence_matched: false`. | Submission **400.3 m** away → **422 `GEOFENCE_VIOLATION`** (rejected, nothing written). Submission **12.5 m** away → 200, `geofence_verification: { is_matched: true, distance_variance_meters: 12.5 }`. | **PASS (deviation)** |
| **TC-09** | In-Browser Photo Hashing & File Integrity | Snapping a photo computes a 64-character SHA-256 hash in browser memory. Modifying file bytes triggers HTTP 422 `EVIDENCE_HASH_MISMATCH`. | The client hashes with `crypto.subtle.digest('SHA-256', …)` (`photoHasher.ts`). The browser screenshot shows the checksum next to the GPS fix (`docs/diagrams/ui/ui_9_4d_*`). Declared fingerprint `6b7fa434…bcd0` (64 hex). One altered byte → **422 `EVIDENCE_HASH_MISMATCH`**, no writes. | **PASS** |
| **TC-10** | Offline Batch Sync Reconnection | When the network is restored, the tablet uploads queued reports automatically, marks them synced, and the database updates. | STR-02: on reconnect both reports **synced automatically (zero loss)**. The server holds the edited narrative and photo hash, with exactly one `REPORT_SUBMITTED` block per task, and the original photo bytes were verified server-side. The device marks both drafts **`SYNCED`** (the field is `sync_status`; there is no `is_synced`). API side: task **`SUBMITTED`**, and the photo is stored at `uploads/evidence/6b7fa434…` with matching SHA-256. | **PASS** |
| **TC-11** | Statutory 15-Day Appeal Countdown | Approving graduation transitions the household to `NOTICE_OF_INELIGIBILITY` with `appeal_deadline = now + 15 days`. Grants continue during the window. | **Verified:** a household under `NOTICE_OF_INELIGIBILITY` is listed with `notice_expiry_date − notice_date = 15 days` (INT-08). The deadline is computed from the stored notice instant (INT-03). The browser card shows the days-remaining countdown, and the docket item asserts `grant_continuation_active: true` (grants protected). Unit tests cover `calculateAppealDeadline` and the window rules. **Now verified end to end (2026-10-14, DECISION-011):** the director reviews the submitted report with its hash-verified photo and approves graduation (`POST /tasks/:id/resolve`). The household moves to `NOTICE_OF_INELIGIBILITY` with `appeal_deadline − notice_date = 15 days`, appears on the docket, and graduation is refused (`APPEAL_WINDOW_OPEN`) until the window ends with no appeal. Evidence: `test_decision011_notice_flow.js` 17/17, `resolution.test.js`. | **PASS** |
| **TC-12** | Filing a Formal Appeal Docket | `POST /api/v1/appeals/docket` records an active appeal, pauses the 15-day countdown, and sets status to `UNDER_APPEAL_HEARING`. | → **201**, `docket_status: UNDER_APPEAL_HEARING`, **countdown paused**, audit receipt returned, chain valid with the `APPEAL_FILED` block. A second appeal → 409 `APPEAL_ALREADY_FILED`. In the browser (INT-08), the card switches to "Under appeal hearing" with the docket ID and the File Appeal button is removed. `program_status` stays `NOTICE_OF_INELIGIBILITY` in the database. | **PASS (deviation)** |
| **TC-13** | Cryptographic Chain Verification | `GET /api/v1/audit/verify-chain` recalculates SHA-256 across blocks 1..N. An unaltered ledger returns `is_chain_valid: true`. | Run ledger 1..3 (`MODEL_FLAG_RAISED`, `TASK_DISPATCHED`, `REPORT_SUBMITTED`) → **200, `is_chain_valid: true`, 3 blocks verified**, head = the REPORT_SUBMITTED hash. STR-01 baseline **1..5 → valid, 5 blocks**. A field worker calling the verifier → 403. | **PASS (deviation)** |
| **TC-14** | Adversarial Database Tamper Detection | Manually altering a field in MongoDB via `mongosh` breaks the hash chain on verification. | STR-01 altered block **3** directly in MongoDB. The verifier returned **200, `is_chain_valid: false`**, `head_hash: INVALID_HASH_AT_SEQUENCE_3`, `broken_blocks: [3]` naming the tampered task. Ranges 1..2 and 4..5 still verify, and the SHAP drawer refuses the tampered explanation (409 `AUDIT_ENTRY_INVALID`). After restoring the block, the chain verifies again. | **PASS** |
| **TC-15** | Sangla-ATM Telemetry Anomaly Detection | A batch of 12 card transactions within 7 minutes between 02:00 and 02:30 flags loan-shark activity. | 12 withdrawals, 02:10:00–02:16:58 (418 s, 38 s apart), window 02:00–02:30 → **`is_anomalous_batch: true`, score 85.0 / 100**, nocturnal flag true, 12 households flagged. Proof 3 demo window (`sangla_atm_payload.json`, 02:14:10–02:21:08) gives the same 85.0. | **PASS** |
| **TC-16** | Calamity Moratorium Compliance Freeze | Toggling a State of Calamity for Calamba under RA 10121 freezes automated compliance penalties in that zone. | INT-04: Super Admin declares a Calamba, Laguna zone with NDRRMC reference → **201 `hold_active: true`**, affected households counted, and the declaration and lift are both sealed in the chain. A director declaring → 403. E2E-02: in the zone, **assessment → 409 `CALAMITY_MORATORIUM_ACTIVE`** (no flag raised) and **dispatch → 409** (no task). Both resume after expiry or lift. | **PASS (deviation)** |
| **TC-17** | Compound Index Spatial Query Performance | Querying flagged households in Calamba via the compound index runs as `IXSCAN` with zero collection scans. | On the full 80k seed baseline, `explain("executionStats")`: **flagged Calamba query** → keys 3 / docs 3 / returned 3, IXSCAN on `risk_assessment.is_flagged_1_address.municipality_1`, **no COLLSCAN**. **At-volume query (80,002 unflagged)** → keys = docs = returned = 80,002, IXSCAN, no COLLSCAN. | **PASS (deviation)** |

### Deviations from the plan's wording (for correcting the plan text)

None of these needed a code change. The plan text should be updated to match the system:

- **TC-03:**
  - The service returns the **top 3** attributions ranked by absolute weight, signed, rather than "top 2 positive / negative".
  - The contract field is `dependency_ratio`, not `dependents_ratio`.
  - For Case A, the strongest positive driver is `housing_material_score` (not `head_education_level`).
  - Measured latency was 15.7 ms; the plan says 18 ms.
- **TC-04:** The plan's "84.0 / 100" cannot be produced by the scoring formula. The weights are 40 per SWDI level gap + 20 + 15 + 25 + 30, capped at 100, so every possible score is a multiple of 5. Case A meets all five indicators and scores **100.0**.
- **TC-08:**
  - The system is **stricter** than the plan. A submission beyond 250 m is **rejected (422 `GEOFENCE_VIOLATION`)** and nothing is stored, so no "flag for supervisor review" record is created.
  - The response field is `geofence_verification.is_matched`.
- **TC-12:** `UNDER_APPEAL_HEARING` is the **docket status**, derived from the sealed `APPEAL_FILED` block. `Beneficiary.program_status` keeps `NOTICE_OF_INELIGIBILITY`, because that status is not in the frozen schema enum (Iron Law 2; see ADR-009 and INT-03).
- **TC-13:** The plan cites range 1..5. This run's ledger had 3 blocks (1..3). STR-01 verified 1..5.
- **TC-16:** The moratorium freezes **risk flagging (assessment) and investigation dispatch** for the zone. The system has no "zero-electricity" or "attendance" penalty flags, so the plan's wording about those does not apply.
- **TC-17:** Counts depend on the data. The plan's "18" is illustrative. On the regenerated 80k baseline, 3 Calamba households are flagged. The requirement (IXSCAN, docs examined = returned, no COLLSCAN) holds both on that query and on the 80,002-document query.
- **TC-11 (resolved 2026-10-14):** notice issuance is built (DECISION-011) and proved by `test_decision011_notice_flow.js`.

---

## 12.3 Defects and Corrective Actions — re-verification

`test_section12_defects.js` re-checks every corrective action. Results: 7/7 resolved, 21/21 checks passed.

| Defect ID | Defect | Corrective action (plan) | Re-verification in this run | Status |
| :--- | :--- | :--- | :--- | :---: |
| **DEF-01** | Transaction failure on standalone MongoDB | DECISION-006: `--replSet rs0 --bind_ip_all`, automated `rs.initiate()` | `docker-compose.yml` starts `mongod --replSet rs0 … --bind_ip_all`, and `replset-init` runs `rs.initiate`. The live server reports `setName: rs0`, `isWritablePrimary: true`, and `session.withTransaction()` commits. TC-05 also proved a real rollback. | **RESOLVED** |
| **DEF-02** | `Unauthorized` on audit index inspection | DECISION-005/006: `createIndex` on `audit_logs`, update/delete blocked | `kilosUnladAppRole` grants `find, insert, createIndex, listIndexes` on `audit_logs`, with no update/remove. **Live check:** a fresh auth-enabled mongod initialised by `docker/mongo/init-mongo.js`. As `app_user`, `find` and `indexes()` are allowed, and `updateOne` and `deleteOne` are denied with **`Unauthorized`**. | **RESOLVED** |
| **DEF-03** | `_id` auto-injected into sub-documents | DECISION-001: sub-schemas `{ _id: false, strict: true }` | All **19** nested sub-schemas across the 6 models declare `_id: false, strict: true`. A built Beneficiary has no `_id` inside `address`, `demographics` or `head_of_household`. | **RESOLVED** |
| **DEF-04** | Host port collision on 27017 | DECISION-004: `${MONGO_EXTERNAL_PORT:-27017}:27017` | Mapping present in `docker-compose.yml`. | **RESOLVED** |
| **DEF-05** | ML feature contract mismatch (422) | Server Joi schema aligned to the 6 pipeline features | The server Joi `demographics` keys exactly equal `ml-swdi-inference.json` (6 features). `classifier.py` maps the same 6, and `wall_score` / `roof_score` are absent. | **RESOLVED** |
| **DEF-06** | Dispatch metadata discarded | DECISION-002/003: `priority`, `due_date`, `assignment_notes` (alias `dispatch_instructions`) | `priority` enum is LOW/MEDIUM/HIGH/CRITICAL. `due_date` is a required Date. Alias `dispatch_instructions → assignment_notes` is present, and strict mode keeps all three. TC-05 also showed priority HIGH stored. | **RESOLVED** |
| **DEF-07** | No general configuration audit action | DECISION-002/003: `SYSTEM_CONFIG_UPDATED` | `AUDIT_ACTIONS` contains `SYSTEM_CONFIG_UPDATED`, separate from `CALAMITY_DECLARED`. | **RESOLVED** |

---

## 12.4 User Acceptance Testing (UAT)

### What was executed

Each scenario's acceptance criteria were run end to end as a scripted walkthrough against the live stack. The checks were automated, so they show the system **can** do what each scenario requires. They do **not** replace sessions with the three personas.

| Scenario | Acceptance criteria (plan) | Scripted evidence | Result |
| --- | --- | --- | :---: |
| **A: Administrative Triage & Dispatch** (Regional Director) | Log in, filter high-risk households (S_i ≥ 70) in Calamba, view explainable trigger reasons, choose a caseworker, dispatch with instructions and deadline. | **E2E-01:** assess → flagged (S_i ≥ 70) → shown in triage with score, level and badges → dispatch 201 → `UNDER_INVESTIGATION` → task visible to the worker. **E2E-04 drawer UI:** the browser renders the 3 SHAP attributions identical to the ML payload and cites the sealed audit block. **Screenshots:** triage queue, SHAP drawer, dispatch modal (worker ID, instructions, deadline, priority) and the "Task dispatched" confirmation (`docs/diagrams/ui/`). | **MET** |
| **B: Offline Fieldwork & Verification** (Municipal Link) | Download tasks online, go offline, complete the SWDI checklist, verify the MoveIt asset, confirm custody of the LandBank card, take a geotagged photo with automatic SHA-256, batch-sync on reconnect. | **STR-02** (TC-07/TC-10): offline completion, IndexedDB queue, zero-loss auto-sync, server-side byte verification. **`test_section12_plan.js`** (TC-08/TC-10) submits a multipart report with `proof_type: MOVEIT`, LandBank card inspection and a photo from 12.5 m away, and it is accepted. **Tablet screenshot:** GPS fix with ±6 m accuracy and the SHA-256 checksum of the captured photo. | **MET** |
| **C: Statutory Due Process** | Approved graduation does not stop grants. A 15-day countdown is shown, an appeal can be filed, and the countdown pauses. | **INT-08 (browser) and INT-03:** live docket card with days remaining, `grant_continuation_active: true`, appeal filed from the dialog, countdown paused, card shows "Under appeal hearing". **DECISION-011:** the director approves graduation from the report review (photos verified) and the notice opens the 15-day window; graduation completes only after the window with no appeal (`test_decision011_notice_flow.js`). | **MET** |
| **D: Forensic Audit & Ledger Integrity** (COA Auditor) | Read-only login, specify a range, receive mathematical verification. | TC-13 and **STR-01:** an auditor verifies ranges, and tampering is detected at block 3. Auditor mutations → 403 (INT-03, INT-04). **Screenshot:** the COA chain inspector showing "Requested range verified" (`ui_9_4e_coa_chain_inspector.jpg`). | **MET** |

### 12.4.2 UAT Results & Feedback Matrix — needs participants

The plan's matrix includes participant quotes, ratings (4.9 / 4.8 / 5.0) and an overall 4.9 / 5.0 "APPROVED FOR DEPLOYMENT". **Those values must come from real people and were not collected in this run.** They are left blank rather than filled with invented data. Run one session per persona with the ready-made form `docs/testing/uat/UAT_RATING_FORM.md` (tasks A to D plus the 10-item System Usability Scale), enter the answers in `docs/testing/uat/uat_responses.csv`, and score them with `python data-pipeline/scripts/score_uat.py docs/testing/uat/uat_responses.csv` (pass: mean SUS ≥ 68 and ≥ 80 % completion per scenario). Record:

| UAT Participant Role | Simulated Workflow | Acceptance Criteria | Participant Feedback | Rating (1-5) | Result |
| :--- | :--- | :--- | :--- | :---: | :---: |
| **Regional Director** (Administrator) | High-Risk Caseload Triage & Priority Task Dispatch | Triage filters by municipality; risk triggers are clear; dispatch locks the case into `UNDER_INVESTIGATION`. *(system capability verified, Scenario A)* | *to be recorded in the session* | — | Pending session |
| **Municipal Link** (Field Social Worker) | Offline Household Assessment & Evidence Capture | Works in airplane mode; drafts in IndexedDB; GPS and photo hash; auto-sync. *(verified, Scenario B)* | *to be recorded in the session* | — | Pending session |
| **COA State Auditor** (Independent Auditor) | Hash Chain Traversal & Tamper Detection | Read-only view; verifier recomputes SHA-256; altered records are flagged. *(verified, Scenario D)* | *to be recorded in the session* | — | Pending session |

**UAT summary:**
- Scenarios executed (scripted): 4 of 4.
- All acceptance criteria are met by the system, including the graduation-approval step (TC-11, DECISION-011).
- Participant satisfaction score: not yet measured.
- Final acceptance: **pending the participant sessions**.

---

## Iron Law compliance in this test cycle

- **TDD:** the new cases have test scripts in `data-pipeline/scripts/`:
  - `test_section12_plan.js`
  - `test_section12_defects.js`
  - `test_section12_ml_unit.py`
  - runner: `run_section12_plan.sh`
- **Schema:** no model, collection or index was created, altered or dropped.
- **Security:** no guard was weakened. The out-of-scope 403, the expired-token 401, the geofence 422 and the hash-mismatch 422 were all asserted as correct behaviour.
- **Frontend:** no client code changed in this cycle.
- **Contracts:** responses were checked against the frozen contracts (`auth-session`, `ml-swdi-inference`, `ml-atm-telemetry`, `admin-task-dispatch`, `field-task-submission`, `admin-due-process-docket`, `audit-chain-verification`).

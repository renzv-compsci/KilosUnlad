# Engineering Task Roadmap: Database Architecture
**Lead:** Dustin Martinez  
**Primary Domain:** `/server/src/models/`, `/docker/mongo/`, `/data-pipeline/scripts/`  
**Core Technologies:** MongoDB 6.0, Mongoose ODM, GeoJSON, 2dsphere Spatial Indexing, Docker  
**Container:** `kilosunlad-db` (Port `27017`)  

---

## 1. Context & Architecture Summary for Dustin

You are building the **Database Persistence Layer & Data Integrity Foundation** for **KilosUnlad**, a decision-support system for the DSWD 4Ps program.

Your service runs inside an isolated MongoDB container. It has two architectural responsibilities:
1. **Data Modeling & Schema Validation:** Define the 6 Mongoose data models with strict typing, enums, timestamps, and geospatial coordinates to enforce data integrity.
2. **Database Security & Forensics:** Enforce database-level permission locks (append-only on `audit_logs`) and manage database seeding and reset tooling.

**Your Boundaries:**
* Mae Santos (Backend Lead) owns routes, controllers, and business logic. You do **not** write Express routes or services; you supply the compiled Mongoose models that Mae imports into her controllers to run queries.
* Your models must strictly fulfill the properties required by `/docs/contracts/` (specifically `admin-triage-feed.json`, `field-task-submission.json`, and `audit-chain-verification.json`).

---

## Phase 1: Environment Verification & Mongoose Schemas (Days 1–3)
*Goal: Verify local container setup, initialize database users, and implement all 6 Mongoose models with strict validation.*

- [ ] **Task 1.1: Local MongoDB Container Bootstrap**
  - Path: `/docker/mongo/init-mongo.js`
  - Review and maintain the initialization script that boots the `kilosunlad` database.
  - Configure the application user: `app_user` with password `AppUserPassword2026!` and role `readWrite`.
  - *Definition of Done (DoD):* `docker-compose up db` runs without errors and initializes the database.

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

*Daily Standup Deliverable (Phase 1):*  
> "MongoDB container is running on Port 27017 with app_user credentials; all 6 Mongoose models compiled with strict validation and unique indexes."

---

## Phase 2: Index Optimization & Security Hardening (Days 4–8)
*Goal: Lock down audit log immutability and test spatial and compound query performance.*

- [ ] **Task 2.1: Enforce Append-Only Database Permission Lock on Audit Logs**
  - Path: `/docker/mongo/init-mongo.js`
  - Restrict `app_user` database permissions:
    - Grant: `find`, `insert` on `kilosunlad.audit_logs`.
    - Deny: `update`, `remove`, `dropCollection` on `kilosunlad.audit_logs`.
  - *DoD:* A test script attempting `AuditLog.updateOne()` in Mongoose throws a database authorization error.

- [ ] **Task 2.2: Verify Geospatial 2dsphere Queries**
  - Write a standalone test query finding all households within a 5-kilometer radius of Calamba City Hall using `$geoWithin` or `$near`.
  - *DoD:* Query `explain("executionStats")` confirms a spatial index hit (zero collection scan).

- [ ] **Task 2.3: Verify Connection Pool Configuration**
  - Path: `/server/src/config/database.js`
  - Review connection settings with Mae: Ensure `maxPoolSize: 10`, `serverSelectionTimeoutMS: 5000`, and automatic reconnect listeners are active.
  - *DoD:* Disconnecting and reconnecting the MongoDB container does not crash the Node.js application process.

*Daily Standup Deliverable (Phase 2):*  
> "Database has append-only lock on audit logs; 2dsphere spatial index verified for proximity queries."

---

## Phase 3: Bulk Seed Ingestion & Query Profiling (Days 9–12)
*Goal: Ingest Renz's 5,000 synthetic records and profile compound query execution.*

- [ ] **Task 3.1: Build Automated Seed Ingestion Tool**
  - Path: `/data-pipeline/scripts/seed_db.py`
  - Ingest `seed_beneficiaries.json` and `seed_external_records.json` into MongoDB using PyMongo or Mongoose bulk writes.
  - Handle duplicate key errors gracefully during bulk inserts.
  - *DoD:* Ingests 5,000 household profiles and matched external utility records in under 15 seconds.

- [ ] **Task 3.2: Compound Query Index Verification**
  - Test the index performance of the admin triage query:
    `Beneficiary.find({ "risk_assessment.is_flagged": true, "address.municipality": "Calamba" })`.
  - *DoD:* Confirms `totalDocsExamined` equals `nReturned` (Index hit, zero un-indexed scanning).

*Daily Standup Deliverable (Phase 3):*  
> "5,000 seeded household records ingested into MongoDB; compound query execution stats verified."

---

## Phase 4: Adversarial Stress Testing & Tamper Verification (Days 13–15)
*Goal: Prove that unauthorized direct database modifications break the cryptographic hash chain.*

- [ ] **Task 4.1: Execute Adversarial Tampering Test**
  - Connect directly to MongoDB via `mongosh` using root credentials (`admin_user`).
  - Manually modify an address, income, or status field on a historical beneficiary record.
  - Trigger Mae's chain verification endpoint (`GET /api/v1/audit/verify-chain`).
  - *DoD:* The system flags the exact sequence number and detects the broken hash chain.

- [ ] **Task 4.2: Data Integrity & Null Constraint Audit**
  - Write an audit script that checks the database for orphaned documents (e.g., tasks referencing deleted users or records missing natural keys).
  - *DoD:* Confirms zero orphaned references across all 6 collections.

*Daily Standup Deliverable (Phase 4):*  
> "Manual database tampering test executed; cryptographic hash mismatch successfully triggered and verified."

---

## Phase 5: Container Optimization & Live Demo Rehearsal (Days 16–18)
*Goal: Provide a one-click database reset tool and rehearse the live defense demonstration.*

- [ ] **Task 5.1: Create One-Click Demo Reset Script**
  - Path: `/data-pipeline/scripts/reset_demo.sh`
  - Write a shell script that wipes the database, recreates indexes, and re-seeds clean records so the live demo starts fresh.
  - *DoD:* Running `./reset_demo.sh` resets the environment in under 10 seconds.

- [ ] **Task 5.2: Live Demo Data Preparation**
  - Ensure seeded database contains the target demo households:
    1. **The Graduation Case:** Enrolled Level 1 with 4-wheel vehicle and high power usage.
    2. **The Sangla-ATM Case:** 12 cards with clustered nocturnal withdrawal logs.
  - *DoD:* Test cases query instantly during rehearsal runs.

*Daily Standup Deliverable (Phase 5):*  
> "Database reset script ready; database layer fully signed off for capstone presentation."
```
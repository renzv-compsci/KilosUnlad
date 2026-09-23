# Phase 1 — Database Models MVP Completion

**Author:** Dustin Martinez (Database Architecture Lead)
**Date:** 2026-09-19
**Status:** COMPLETE — All 6 models implemented, verified, and PM-approved
**Reference:** DECISION-001 (Database Models Hardening, Schema Review & Alignment)
**Extended by:** DECISION-002 (Mae Santos) and DECISION-003 (Dustin Martinez) — see Section 8

---

## 1. Summary

All 6 Mongoose models in `/server/src/models/` are implemented, verified, and aligned with:

- **DECISION-001** — PM resolutions on schema hardening, naming, enums, and sub-schema shapes (highest priority)
- **Engineering Task Roadmap** (`DUSTIN_DATABASE.md`) — Phase 1 tasks 1.1–1.6
- **API Contracts** (`/docs/contracts/`) — authoritative for field names where PM and roadmap are silent

Every model compiles with `strict: true`, uses explicit sub-schemas, and passes verification via `node -e` load tests.

---

## 2. Model-by-Model Completion

### 2.1 `User.js` — Task 1.2

**Fields:**
- `full_name` — String (required, trim) — added per PM §4.1
- `username` — String (required, trim, lowercase)
- `email` — String (required, trim, lowercase)
- `password_hash` — String (required)
- `role` — String (enum, required): `SUPER_ADMIN`, `REGIONAL_DIRECTOR`, `CASE_WORKER`, `COA_AUDITOR`
- `jurisdiction` — Sub-schema with `region`, `province`, `municipality`, `assigned_barangays[]`
- `is_active` — Boolean (default: true)

**Sub-schema options:** `{ _id: false, strict: true }`

**Indexes:**
- `email` (unique)
- `username` (unique)
- `role + jurisdiction.municipality` (compound)

**Timestamps:** enabled

**Extended by DECISION-002/003:**
- `last_login_at` — Date (default: `Date.now`)

---

### 2.2 `Beneficiary.js` — Task 1.3

**Field groups:**
- `head_of_household` — `first_name`, `last_name`, `national_id`, `contact_phone` + virtual `full_name`
- `address` — `street`, `barangay`, `municipality`, `province`, GeoJSON `Point` with coordinate range validation
- `demographics` — 6 proxy-means features with `min`/`max` bounds
- `children_registry[]` — `{ birthdate, is_eligible }`
- `enrolled_swdi_level` — Number, enum `[1,2,3]`, alias `current_swdi_level`
- `program_status` — String, enum (6 values)
- `risk_assessment` — Sub-schema: `composite_risk_score`, `is_flagged`, `predicted_swdi_level`, `flag_reasons[]`, `trigger_badges[]`, `evaluated_at`

**Virtuals:**
- `full_name` (on head_of_household sub-schema)
- `flagged_at` (returns `risk_assessment.evaluated_at`)

**Indexes:**
- `household_id` (unique)
- `head_of_household.national_id` (unique)
- `address.coordinates` (2dsphere)

---

### 2.3 `ExternalRecord.js` — Task 1.4

**Sub-schemas:**
- `power_utility` — `provider`, `meter_no`, `avg_monthly_kwh`, `is_lifeline`
- `water_utility` — `provider`, `meter_type` (enum `NONE/COMMUNAL/INDIVIDUAL`), `avg_monthly_cu_m`, `is_lifeline`
- `telecom_registry` — `contract_type`, `monthly_plan_php`
- `transport_registry.vehicles[]` — `plate_number`, `vehicle_category` (enum), `make_model`, `year_model`, `is_commercial_franchise`
- `landbank_telemetry` — `card_masked_pan`, `last_withdrawal_timestamp`, `sangla_atm_risk_score` (0–100)

**Indexes:**
- `matched_household_id` (unique)
- `national_id`

---

### 2.4 `VerificationTask.js` — Task 1.5

**Top-level fields:**
- `task_id` — String (required)
- `household_id` — String (required)
- `assigned_worker_id` — ObjectId, ref `User`
- `task_status` — String, enum (5 values)
- `field_findings` — Sub-schema (see below)
- `admin_resolution` — Sub-schema: `reviewed_by`, `decision` (enum), `admin_notes`, `finalized_at`

**Inside `field_findings`:**
- `verified_swdi_level` — Number
- `worker_recommendation` — enum: `RETAIN`, `RECOMMEND_GRADUATION`, `INVESTIGATE_FRAUD`
- `narrative_report` — String
- `livelihood_asset_verification` — Sub-schema with `proof_type` enum
- `landbank_card_inspection` — Sub-schema
- `client_geolocation` — Sub-schema
- `evidence_attachments[]` — Sub-schema with `exif_metadata`

**Indexes:**
- `task_id` (unique)
- `assigned_worker_id + task_status` (compound)

**Extended by DECISION-002/003:**
- `assignment_notes` — String (trim, alias `dispatch_instructions`)
- `priority` — String, enum `['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']`, default `'HIGH'`
- `due_date` — Date (required)

---

### 2.5 `AuditLog.js` — Task 1.6a

**Fields:**
- `sequence_index` — Number (required)
- `previous_entry_hash` — String (default: 64 zeros — genesis)
- `timestamp` — Date (default: now)
- `actor` — Sub-schema: `user_id` (String), `username`, `role` (enum), `ip_address`
- `action` — String, enum (6 audit actions)
- `target_entity` — Sub-schema: `collection_name`, `entity_id`
- `state_delta` — Sub-schema: `before` (Mixed), `after` (Mixed)
- `entry_hash` — String (required)

**Indexes:**
- `sequence_index` (unique)
- `entry_hash` (unique)
- `target_entity.entity_id`

**Hash format:** SHA-256 per PM §4.5 — implemented by Mae's service layer.

**Extended by DECISION-002/003:**
- Added `SYSTEM_CONFIG_UPDATED` to the `AUDIT_ACTIONS` enum (now 7 values)

---

### 2.6 `SystemConfig.js` — Task 1.6b

**Fields:**
- `config_key` — String (required, unique)
- `calamity_moratorium_zones[]` — Sub-schema: `municipality`, `province`, `declared_at`, `expires_at`, `ndrrmc_reference`, `is_active`
- `threshold_configs` — Sub-schema with defaults: `power_lifeline_kwh: 200`, `water_lifeline_cu_m: 25`, `risk_score_flag_trigger: 70`, `appeal_window_days: 15`
- `feature_flags` — Sub-schema with defaults: `enable_sangla_detection: true`, `enable_auto_dispatch: true`, `enable_geofence_enforcement: true`
- `updated_by` — String (optional)

**Index:**
- `config_key` (unique)

**Pattern:** Typed Config Document (Pattern B)

---

## 3. Architectural Standards Applied

All 6 models follow these standards consistently:

- `strict: true` on every schema and sub-schema
- Sub-schemas use `{ _id: false, strict: true }`
- Indexes declared via `schema.index()` only (no duplicate definitions)
- Named enum constants at top of file
- `timestamps: true`
- Explicit `collection:` name

---

## 4. Verification Results

Every model verified via `node -e` load test with zero warnings:

- `User.js` — ModelName `User`, 3 indexes, 1 sub-schema — PASS
- `Beneficiary.js` — ModelName `Beneficiary`, 3 indexes, 5 sub-schemas — PASS
- `ExternalRecord.js` — ModelName `ExternalRecord`, 2 indexes, 6 sub-schemas — PASS
- `VerificationTask.js` — ModelName `VerificationTask`, 2 indexes, 6 sub-schemas — PASS
- `AuditLog.js` — ModelName `AuditLog`, 3 indexes, 3 sub-schemas — PASS
- `SystemConfig.js` — ModelName `SystemConfig`, 1 index, 3 sub-schemas — PASS

---

## 5. Source Priority Applied

When PM response, roadmap, and contracts disagreed, priority was applied in this order:

- **DECISION-001 (PM Resolutions)** — 1st priority, authoritative on everything it addresses
- **Engineering Task Roadmap** — 2nd priority, fills gaps where PM is silent
- **API Contracts** — 3rd priority, used for field names where both are silent

Zero unapproved deviations. All additions were proposed, reviewed, and approved via DECISION-001.

---

## 6. Known Follow-Ups

- `canonicalJson.js` + `cryptoHelper.js` utility files — Owner: Mae — referenced in PM §4.5 #7
- `target_entity` nested vs flat — Owner: Mae — verify against controller output
- Chain verification unit test — Owner: Mae — PM §4.5 #8
- Phase 2: Append-only lock on `audit_logs` — Owner: Dustin — Task 2.1

---

## 7. Phase 1 Status

**Tasks 1.1–1.6: COMPLETE.**

- 6/6 Mongoose models implemented
- 6/6 PM-approved via DECISION-001
- 6/6 verified via `node -e` compilation
- 0 blockers remaining

**Ready for Phase 2.**

---

## 8. Post-Phase-1 Schema Extensions (DECISION-002 & DECISION-003)

After Phase 1 completion, integration review with Mae surfaced three schema extensions. All were resolved via DECISION-002 (Mae Santos) and DECISION-003 (Dustin Martinez), both approved by Renz.

### 8.1 Summary of Extensions

- `User.js` — added `last_login_at`
- `VerificationTask.js` — added 3 dispatch fields
- `AuditLog.js` — added 1 enum value

### 8.2 `User.js` Extension

**Added field:**
- `last_login_at` — Date (default: `Date.now`)

**Source:** DECISION-002 §4.3 — login contract (`auth-session.json`) returns `last_login_at`, but User did not persist it.

**Behavior:** Mae updates this timestamp on each successful login in `auth.controller.js`. The `default: Date.now` covers document creation time until the first login overwrites it.

**Status:** Implemented and verified.

### 8.3 `VerificationTask.js` Extension

**Added fields:**
- `assignment_notes` — String (trim, alias `dispatch_instructions`)
- `priority` — String, enum `['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']`, default `'HIGH'`
- `due_date` — Date (required)

**Source:** `admin-task-dispatch.json` (dispatch contract) and `field-task-download.json` (download contract) both use these fields. Neither was in Phase 1 scope.

**Alias rationale:** The download contract returns `dispatch_instructions`, while the dispatch contract accepts `assignment_notes`. The alias makes both names work on the same underlying field.

**Status:** Implemented and verified.

### 8.4 `AuditLog.js` Extension

**Added enum value:**
- `SYSTEM_CONFIG_UPDATED`

**Source:** DECISION-001 §4.6 requires an audit entry per `SystemConfig` modification, but §4.5's frozen enum had no matching action. DECISION-003 resolved this by extending the enum.

**Options considered:**
- **Option A (accepted):** Add single enum value — preserves strict DB-level validation.
- **Option B (rejected):** Categorized free-form action codes — more flexible but rejected in favor of simplicity.

**Status:** Implemented and verified. `AUDIT_ACTIONS` now has 7 values.

### 8.5 Verification Results After Extensions

- `User.js` — `last_login_at` present in paths — PASS
- `VerificationTask.js` — `assignment_notes`, `priority`, `due_date` present; `dispatch_instructions` virtual present — PASS
- `AuditLog.js` — 7 actions in enum including `SYSTEM_CONFIG_UPDATED` — PASS

### 8.6 Contracts & Hash Chain

- **API Contracts:** 0% changes. All contracts remain frozen.
- **Hash byte sequence:** Unchanged. No historical audit entries exist, so no migration required.

### 8.7 Source Documents

- `DECISION-002: Task Dispatch Persistence and Configuration Audit Actions` — Mae Santos, APPROVED 2026-09-23
- `DECISION-003: VerificationTask Dispatch Fields & AuditLog Action Extension` — Dustin Martinez, APPROVED 2026-09-23

### 8.8 Downstream Impact

- **Mae:** Update `task.controller.js` (read/write 3 new dispatch fields) and `auth.controller.js` (update `last_login_at` on login).
- **Charles:** No action.
- **Markie:** No action — contracts unchanged.
- **Renz:** No action — all decisions recorded.

---

**End of Document**
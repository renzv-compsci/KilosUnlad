# DECISION-001: Database Models Hardening, Schema Review & Alignment Proposals
**Author:** Dustin Martinez (Database Architecture Lead)  
**Status:** ACCEPTED  
**Date Created:** 2026-09-17  
**Date Resolved:** 2026-09-19

---

## 1. Context & Problem Statement

While building the Mongoose models in `/server/src/models/` for Phase 1, Dustin performed a comprehensive audit comparing the task roadmap (`DUSTIN_DATABASE.md`) against the API contracts in `/docs/contracts/`.

He identified several architectural issues, potential Mongoose v8 quirks, and contract discrepancies across all six files:
1. **`User.js`:** Nested objects auto-inject unwanted `_id` fields in Mongoose 8; missing field-level data sanitizers.
2. **`Beneficiary.js`:** Conflicting field naming between roadmap and contracts (`full_name` vs `first_name + last_name`, `enrolled_swdi_level` vs `current_swdi_level`), undefined demographic keys, and undefined `risk_assessment` sub-schema shape.
3. **`ExternalRecord.js`:** Loose `[Mixed]` types on the vehicle array; missing bounds on physical quantities and undefined score ranges.
4. **`VerificationTask.js`:** Flat contract payload vs nested `field_findings` in the database; missing enum definitions for worker recommendations, proof types, and admin resolution.
5. **`AuditLog.js`:** Unspecified `action` enums, potential orphaned references if `actor.user_id` uses `ObjectId`, and lack of an explicit byte-sequence specification for SHA-256 hash chaining.
6. **`SystemConfig.js`:** Completely undefined purpose, missing field list, and unselected schema design pattern (Key-Value vs Typed Document).

---

## 2. Options Considered & Model-by-Model Analysis

---

### PART A: `User.js` Analysis

#### The Issue:
The roadmap specifies `jurisdiction` as an `object` with region, province, municipality, and assigned_barangays. In Mongoose 8, writing nested objects inline automatically injects an `_id` on save. To prevent this, an explicit sub-schema with `{ _id: false }` is required.

#### Proposed Additions:
| Addition | Why | Can we remove it in case? |
| :--- | :--- | :--- |
| `required: true` on `username`, `email`, `password_hash`, `role` | Prevents saving incomplete users | Yes — remove if team wants optional fields |
| `trim: true` on strings | Removes accidental whitespace | Yes — cosmetic |
| `lowercase: true` on `username`, `email` | Prevents case-duplicate accounts | Yes — but recommended |
| `default: true` on `is_active` | New users are active by default | Yes — remove if explicit setting preferred |
| `timestamps: true` | Adds `createdAt` / `updatedAt` | Yes — but useful for audit |
| `collection: 'users'` | Explicit collection name | Yes — Mongoose defaults to `users` anyway |
| `_id: false` on `jurisdiction` sub-schema | Prevents auto `_id` in nested object | Yes — but cleaner without it |
| `default: () => ({})` on `jurisdiction` | Avoids null when not provided | Yes |
| `strict: true` on sub-schema | Rejects undefined fields inside jurisdiction | Yes — matches DoD spirit |

---

### PART B: `Beneficiary.js` Analysis

#### Conflicts Between Roadmap & Contract:
| Field | Roadmap Says | Contract Says | Dustin's Recommendation |
| :--- | :--- | :--- | :--- |
| `head_of_household` | `first_name + last_name` | `full_name` (single string) | Follow contract — use `full_name` |
| `SWDI level` | `current_swdi_level` | `enrolled_swdi_level` + `predicted_swdi_level` | Follow contract — use both |
| `trigger_badges` | Not mentioned | Array of `{ code, label, severity }` | Add it — required by triage feed |
| `composite_risk_score` | Not mentioned | Number (0–100) | Add it — required by triage feed |
| `flagged_at` | Not mentioned | Date | Add it — used for sorting triage queue |
| `demographics` | "6 proxy-means features" | Not shown in triage feed | **BLOCKED:** Need exact field names from Charles/Renz |
| `risk_assessment` | Object (shape undefined) | Not shown in triage feed | **BLOCKED:** Need exact shape from Mae/Charles/Renz |

#### Proposed Additions for Cleanliness:
| Addition | Why | Benefit |
| :--- | :--- | :--- |
| Coordinate range validation (`lon: -180..180`, `lat: -90..90`) | Catches swapped lat/long bugs | Prevents broken geospatial queries |
| GeoJSON `type: 'Point'` enforcement | Schema-level guarantee | `2dsphere` index requires exactly this |
| `enum` on SWDI levels `[1, 2, 3]` | Prevents arbitrary numbers | Matches domain rules |
| `enum` on `program_status` | Prevents typos | Contract values enforced |
| `enum` on `trigger_badges.severity` | `LOW`, `MEDIUM`, `HIGH`, `CRITICAL` | Contract consistency |
| `min: 0, max: 100` on `composite_risk_score` | Bounds check | Catches ML calculation bugs |
| Sub-schema `_id: false` + `strict: true` | No unwanted IDs, no ghost fields | Cleaner documents |
| Indexes via `schema.index()` only | Avoids duplicate index warnings | Single source of truth |

#### Blockers to Resolve for `Beneficiary.js`:
* **Blocker 1:** What are the exact 6 proxy-means feature field names inside `beneficiaries.demographics`?
* **Blocker 2:** What fields go inside `risk_assessment`? (e.g., `{ is_flagged, reasons[] }`?)
* **Blocker 3:** Are we using `enrolled_swdi_level + predicted_swdi_level` and dropping `current_swdi_level`?
* **Blocker 4:** Contract shows `full_name` — final decision on `full_name` vs `first_name / last_name`?

---

### PART C: `ExternalRecord.js` Analysis

#### MVP Roadmap Requirement vs. Status:
The roadmap specifies `vehicles array` without an inner shape. Using `[Mixed]` was the MVP implementation, but leaves vehicle data unvalidated.

| Roadmap Requirement | Code | Status |
| :--- | :--- | :---: |
| `matched_household_id` | `{ type: String }` | ✅ |
| `national_id` | `{ type: String }` | ✅ |
| `power_utility.provider` | `{ type: String }` | ✅ |
| `power_utility.meter_no` | `{ type: String }` | ✅ |
| `power_utility.avg_monthly_kwh` | `{ type: Number }` | ✅ |
| `power_utility.is_lifeline` | `{ type: Boolean }` | ✅ |
| `water_utility.provider` | `{ type: String }` | ✅ |
| `water_utility.meter_type` | `{ type: String }` | ✅ |
| `water_utility.avg_monthly_cu_m` | `{ type: Number }` | ✅ |
| `water_utility.is_lifeline` | `{ type: Boolean }` | ✅ |
| `telecom_registry.contract_type` | `{ type: String }` | ✅ |
| `telecom_registry.monthly_plan_php` | `{ type: Number }` | ✅ |
| `transport_registry.vehicles` | `{ type: [Mixed] }` | ✅ (MVP) |
| `landbank_telemetry.card_masked_pan` | `{ type: String }` | ✅ |
| `landbank_telemetry.last_withdrawal_timestamp` | `{ type: Date }` | ✅ |
| `landbank_telemetry.sangla_atm_risk_score` | `{ type: Number }` | ✅ |
| Index: `matched_household_id` unique | `index({ ... }, { unique: true })` | ✅ |
| Index: `national_id` | `index({ ... })` | ✅ |
| DoD: numeric types enforced | All numeric fields typed as Number | ✅ |
| `strict: true` | Yes | ✅ |

#### Hardening Proposals for `ExternalRecord.js`:
| # | Addition | Current (MVP) | Proposed (Hardened) | Risk to Team | Blocked On | Recommendation |
| :- | :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | Sub-schemas for nested objects | Inline objects | `powerUtilitySchema`, etc. with `_id: false, strict: true` | 🟢 Low | None | Add |
| 2 | `required: true` on natural keys | None | `matched_household_id`, `national_id` | 🟡 Medium | Renz confirms seed sets them | Add |
| 3 | `trim: true` on all strings | None | All String fields | 🟢 Low | None | Add |
| 4 | `min: 0` on physical quantities | None | `avg_monthly_kwh`, `avg_monthly_cu_m`, `monthly_plan_php` | 🟢 Low | None | Add |
| 5 | `min: 0, max: 100` on `sangla_atm_risk_score` | None | Range constraint | 🟡 Medium | Charles confirms scale (0–1 vs 0–100) | Wait for answer |
| 6 | `enum` on `meter_type` | Free String | `['ANALOG', 'DIGITAL', 'SMART']` | 🟡 Medium | Charles confirms allowed values | Wait for answer |
| 7 | Strict `vehicleSchema` | `[Mixed]` | Structured sub-schema | 🔴 High | Must match Renz's seed + Charles's ML | Wait for answer |
| 8 | `default: false` on `is_lifeline` | None | `{ type: Boolean, default: false }` | 🟢 Low | None | Add |
| 9 | `default: []` on `vehicles` | None | `{ type: [vehicleSchema], default: [] }` | 🟢 Low | None | Add |
| 10| `timestamps: true` | None | Enabled | 🟢 Low | None | Add |
| 11| `collection: 'external_records'` | Auto-pluralized | Explicit | 🟢 Low | None | Add |
| 12| Named enum constants | Inline | Top-of-file constants | 🟢 Low | None | Add |

---

### PART D: `VerificationTask.js` Analysis

#### Compliance Check:
| Field | Source | In Code | Notes |
| :--- | :--- | :---: | :--- |
| `task_id` | Roadmap + Contract | ✅ | String — Unique enforced via index |
| `household_id` | Roadmap + Contract | ✅ | String |
| `assigned_worker_id` | Roadmap | ✅ | ObjectId, ref: 'User' — Satisfies DoD |
| `task_status` | Roadmap | ✅ | String + 5-value enum |
| `verified_swdi_level` | Contract | ✅ | Number — Top-level (contract shape, not nested in `field_findings`) |
| `worker_recommendation` | Contract | ✅ | String — Enum values TBD |
| `narrative_report` | Contract | ✅ | String |
| `livelihood_asset_verification` | Contract | ✅ | Inline object (4 fields) — Matches contract request |
| `landbank_card_inspection` | Contract | ✅ | Inline object (3 fields) — Matches contract request |
| `client_geolocation` | Contract | ✅ | Inline object (4 fields) — Matches contract request |
| `evidence_attachments` | Contract | ✅ | `[Mixed]` — No shape spec flagged |
| `admin_resolution` | Roadmap | ✅ | `Mixed` — No shape spec flagged |

#### Flags for Team Review on `VerificationTask.js`:
| Flag | Where It Comes From | What Dustin Did | Question for Confirmation |
| :--- | :--- | :--- | :--- |
| `field_findings` dropped | Roadmap says `field_findings` (nested); contract shows same fields at top level | Followed contract — flat top-level fields | Confirm: are these fields flat, or should they be nested under `field_findings`? |
| `productive_asset_validated` not included | Roadmap field name; contract uses `livelihood_asset_verification` | Followed contract — used `livelihood_asset_verification` | Confirm naming: `productive_asset_validated` vs `livelihood_asset_verification` |
| `physical_cash_card_inspected` not included | Roadmap field name; contract uses `landbank_card_inspection` | Followed contract — used `landbank_card_inspection` | Confirm naming: `physical_cash_card_inspected` vs `landbank_card_inspection` |
| `evidence_photos` renamed to `evidence_attachments` | Roadmap says `evidence_photos`; contract uses `evidence_attachments[]` with richer shape | Followed contract — used `evidence_attachments` as `[Mixed]` | Confirm: roadmap shape or contract shape? And what is inside each attachment? |
| `worker_recommendation` values unknown | Contract shows only `RECOMMEND_GRADUATION` | Left as free String | What are the full enum values? |
| `proof_type` values unknown | Contract shows `"MOVEIT"` | Left as free String | What are the allowed `proof_type` values? |
| `evidence_attachments[]` inner shape | Contract shows `{ media_type, storage_url, sha256_hash, exif_metadata }` | Kept as Mixed (no sub-schema) | Confirm full shape and whether `exif_metadata` is nested further |
| `admin_resolution` shape | Roadmap mentions it; contract doesn't show it | Kept as Mixed | What fields go inside `admin_resolution`? |
| `task_status` transitions | Roadmap lists 5 values | Included exactly | Confirm all 5 are correct; any missing? |

---

### PART E: `AuditLog.js` Analysis

#### Status & Flags:
| # | Flag | Source | Impact if Not Resolved |
| :- | :--- | :--- | :--- |
| 1 | `action` enum values | Roadmap says "enum" but doesn't list values | Cannot enforce allowed actions at DB level |
| 2 | `target_entity` shape (flat vs nested) | Roadmap nested; contract flat | Wrong query syntax in Mae's controller |
| 3 | `actor.user_id` type (String vs ObjectId) | Roadmap doesn't specify | Orphaned refs if users are deleted |
| 4 | `actor.role` enum | Roadmap lists no values | No validation on role values |
| 5 | `state_delta` shape | Roadmap says "object" — no structure | Cannot validate before/after states |
| 6 | Hash algorithm spec | Not stated anywhere (SHA-256 implied) | Mae/Charles might use different algorithms |
| 7 | Hash input format | Not stated (JSON stringify? sorted keys?) | Chain breaks if services disagree on format |
| 8 | Genesis hash value | Contract shows `"0000...0000"` (64 zeros) | First entry default must match exactly |

#### Dustin's Proposed Recommendations for `AuditLog.js`:
| # | Recommendation | Why It Matters | Effort |
| :- | :--- | :--- | :--- |
| 1 | Freeze the hash input format in writing | Every service writing audit entries must hash the exact same byte sequence. Document: `"SHA-256 of JSON.stringify({sequence_index, previous_entry_hash, timestamp, actor, action, target_entity, entity_id, state_delta}) with sorted keys."` | 30 min |
| 2 | Use `String` for `actor.user_id`, not `ObjectId` ref | Audit logs must be immutable and survive user deletion. Storing raw ID as string preserves the historical fact "user X did Y." | 0 min |
| 3 | Never allow updates or deletes | Enforce at the database level via custom role (Phase 2). Even Mongoose shouldn't have permission. | Phase 2 |
| 4 | Add `_id: false` to actor sub-schema | Prevents auto-injected `_id` on nested object | 1 min |
| 5 | Document hash algorithm explicitly | Add comment: `// Hash algorithm: SHA-256. Input format: see /docs/contracts/audit-chain-verification.json` | 5 min |
| 6 | Add `required: true` to hashes | Missing values break the chain | 1 min |
| 7 | Consider `schema_version` field | Allows supporting future algorithm updates | Optional |
| 8 | Write unit test for chain integrity | Insert 3 entries, tamper with entry 2, verify verification fails at sequence 2 | 1 hr |

---

### PART F: `SystemConfig.js` Analysis

#### Current Gaps:
* **Roadmap spec:** Mentioned in Task 1.6 title only — no field list provided.
* **Blocker:** Cannot write schema without requirements.

#### Questions for Clarification:
1. **Purpose Statement:** What is this collection for? Feature flags? Thresholds? ML model versions?
2. **Field List:** Completely undefined.
3. **Shape:** Key-Value Store (Pattern A) vs Typed Config Document (Pattern B)?
4. **Who reads/writes it:** Mae's backend? Charles's ML? Admin only? Auto-updated?
5. **Update semantics:** Immutable? Versioned? Latest wins?
6. **Cache strategy:** Read on every request, or cached in memory?

#### Pattern Comparisons:
* **Pattern A (Key-Value Store):** `{ key: 'swdi_threshold_high', value: 70, description: '...', updated_by: '...', updated_at: Date }`
  * *Pros:* Flexible; easy to add ad-hoc flags.
  * *Cons:* Value is `Mixed`, hard to validate.
* **Pattern B (Typed Config Document):** `{ config_key: 'system', swdi_thresholds: { ... }, ml_model_version: '...', feature_flags: { ... } }`
  * *Pros:* Strict typing; schema validation.
  * *Cons:* Requires schema migration to add new config properties.

---

## 3. Developer's Recommendations & Proposed Code

### Proposed Code 1: `User.js`
```javascript
// NOTE: `unique: true` creates a MongoDB index but does NOT validate at the application layer.
// Duplicate inserts throw E11000 — handle in controllers.
const mongoose = require('mongoose');

// --- Sub-schema: jurisdiction ---
const jurisdictionSchema = new mongoose.Schema(
  {
    region: { type: String, trim: true },
    province: { type: String, trim: true },
    municipality: { type: String, trim: true },
    assigned_barangays: {
      type: [String],
      default: [],
    },
  },
  { _id: false, strict: true }
);

// --- Main schema: User ---
const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    password_hash: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      required: true,
      enum: [
        'SUPER_ADMIN',
        'REGIONAL_DIRECTOR',
        'CASE_WORKER',
        'COA_AUDITOR',
      ],
    },
    jurisdiction: {
      type: jurisdictionSchema,
      default: () => ({}),
    },
    is_active: {
      type: Boolean,
      default: true,
    },
  },
  {
    strict: true,
    timestamps: true,
    collection: 'users',
  }
);

// --- Indexes ---
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ username: 1 }, { unique: true });
userSchema.index({ role: 1, 'jurisdiction.municipality': 1 });

// --- Export ---
module.exports = mongoose.model('User', userSchema);
```

---

### Proposed Code 2: `ExternalRecord.js`
```javascript
// /server/src/models/ExternalRecord.js
// ExternalRecord model — cross-referenced data from utilities, telecoms, transport registries, and LandBank.
const mongoose = require('mongoose');

// --- Constants ---
const METER_TYPES = ['ANALOG', 'DIGITAL', 'SMART'];

// --- Sub-schema: power_utility ---
const powerUtilitySchema = new mongoose.Schema(
  {
    provider: { type: String, trim: true },
    meter_no: { type: String, trim: true },
    avg_monthly_kwh: { type: Number, min: 0 },
    is_lifeline: { type: Boolean, default: false },
  },
  { _id: false, strict: true }
);

// --- Sub-schema: water_utility ---
const waterUtilitySchema = new mongoose.Schema(
  {
    provider: { type: String, trim: true },
    meter_type: { type: String, enum: METER_TYPES },
    avg_monthly_cu_m: { type: Number, min: 0 },
    is_lifeline: { type: Boolean, default: false },
  },
  { _id: false, strict: true }
);

// --- Sub-schema: telecom_registry ---
const telecomRegistrySchema = new mongoose.Schema(
  {
    contract_type: { type: String, trim: true },
    monthly_plan_php: { type: Number, min: 0 },
  },
  { _id: false, strict: true }
);

// --- Sub-schema: vehicle ---
const vehicleSchema = new mongoose.Schema(
  {
    plate_no: { type: String, trim: true },
    make: { type: String, trim: true },
    model: { type: String, trim: true },
    year: { type: Number, min: 1900, max: 2100 },
    vehicle_type: { type: String, trim: true },
  },
  { _id: false, strict: true }
);

// --- Sub-schema: transport_registry ---
const transportRegistrySchema = new mongoose.Schema(
  {
    vehicles: { type: [vehicleSchema], default: [] },
  },
  { _id: false, strict: true }
);

// --- Sub-schema: landbank_telemetry ---
const landbankTelemetrySchema = new mongoose.Schema(
  {
    card_masked_pan: { type: String, trim: true },
    last_withdrawal_timestamp: { type: Date },
    sangla_atm_risk_score: { type: Number, min: 0, max: 100 },
  },
  { _id: false, strict: true }
);

// --- Main schema ---
const externalRecordSchema = new mongoose.Schema(
  {
    matched_household_id: {
      type: String,
      required: true,
      trim: true,
    },
    national_id: {
      type: String,
      required: true,
      trim: true,
    },
    power_utility: { type: powerUtilitySchema, default: {} },
    water_utility: { type: waterUtilitySchema, default: {} },
    telecom_registry: { type: telecomRegistrySchema, default: {} },
    transport_registry: { type: transportRegistrySchema, default: {} },
    landbank_telemetry: { type: landbankTelemetrySchema, default: {} },
  },
  {
    strict: true,
    timestamps: true,
    collection: 'external_records',
  }
);

// --- Indexes ---
externalRecordSchema.index({ matched_household_id: 1 }, { unique: true });
externalRecordSchema.index({ national_id: 1 });

// --- Export ---
module.exports = mongoose.model('ExternalRecord', externalRecordSchema);
```

---

## 4. Official PM / Tech Lead Resolution (To be filled by Renz)

This section details the official decisions, blocker resolutions, and approved field structures for all six database models based on our technical review.

---

### 4.1 `User.js` Resolution
* **Decision:** **ACCEPT APPROACH.**
* **Guidance & Actions:** 
  * Proceed with the proposed sub-schema approach for `jurisdiction` using `{ _id: false, strict: true }`.
  * **Important Addition:** Make sure to add `full_name: { type: String, required: true, trim: true }` to the main schema so user names are saved properly and match the login session contract.
  * All other data hygiene additions (`trim`, `lowercase`, `is_active: default true`, `timestamps: true`, and schema-level indexes) are **approved**.

---

### 4.2 `Beneficiary.js` Resolution (Conflicts & Blockers Resolved)

#### A. Resolution to Document Conflicts:
1. **`head_of_household`:** Do not drop `first_name` and `last_name`. The database must store separate, clean names. To satisfy the admin triage table contract (which displays a single `full_name`), add a **Mongoose Virtual for `full_name`** with `{ toJSON: { virtuals: true } }`. This gives the frontend `full_name` automatically without storing duplicate text in MongoDB.
2. **`SWDI level` Naming:** Use **`enrolled_swdi_level`** on the root document for the official enrolled level, and store **`predicted_swdi_level`** inside `risk_assessment` for the AI output. Add `alias: 'current_swdi_level'` on `enrolled_swdi_level` so backend code can use either name without naming issues.
3. **`trigger_badges`:** Approved. Add as an array of `{ code, label, severity }` inside `risk_assessment` so the frontend can render colored UI badges on the triage table.
4. **`composite_risk_score`:** Approved. Add as a Number (`min: 0, max: 100`, default: `0`) inside `risk_assessment`.
5. **`flagged_at`:** Approved. Stored as `risk_assessment.evaluated_at` (with a virtual alias `flagged_at` for triage queue sorting).
6. **`demographics` (6 Features):** Defined below matching the ML contract.
7. **`risk_assessment` Shape:** Defined below with `{ _id: false, strict: true }`.

#### B. Resolving the 4 Blockers:
* **Blocker 1 (Exact 6 Demographic Feature Names):** Refer to `ml-swdi-inference.json`. The exact fields are:
  * `household_size` (Number: 1 to 20)
  * `dependents_ratio` (Number: $\ge 0.0$)
  * `head_education_level` (Number: 0 to 4 $\to$ None, Elem, HS, Voc, College)
  * `wall_score` (Number: 1 to 3 $\to$ Light, Mixed, Concrete)
  * `roof_score` (Number: 1 to 3 $\to$ Makeshift, Mixed, GI Sheet)
  * `water_access_level` (Number: 1 to 3 $\to$ Point Source, Communal, Metered)
* **Blocker 2 (`risk_assessment` Shape):** The sub-schema contains:
  * `composite_risk_score`: Number (`min: 0, max: 100`, default: `0`)
  * `is_flagged`: Boolean (default: `false`)
  * `predicted_swdi_level`: Number (enum: `[1, 2, 3]`)
  * `flag_reasons`: Array of Strings (plain-English audit reasons)
  * `trigger_badges`: Array of `{ code, label, severity }`
  * `evaluated_at`: Date (timestamp when AI/rules evaluated)
* **Blocker 3 (SWDI Field Naming):** Root field is `enrolled_swdi_level` (Number: 1, 2, 3) with `alias: 'current_swdi_level'`. This allows writing `beneficiary.current_swdi_level` or `beneficiary.enrolled_swdi_level` interchangeably.
* **Blocker 4 (`full_name` vs `first_name/last_name`):** Store `first_name`, `last_name`, `national_id`, and `contact_phone` in the database. The Mongoose virtual property automatically creates `full_name` for the API response.

#### C. Cleanliness Additions:
* **All Approved:** Coordinate range validation (`lon: -180..180`, `lat: -90..90`), GeoJSON `Point` enforcement, enums on SWDI levels `[1, 2, 3]`, enums on `program_status`, enums on `trigger_badges.severity` (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`), bounds check on `composite_risk_score`, and sub-schema `{ _id: false, strict: true }`.

---

### 4.3 `ExternalRecord.js` Resolution (Proposals & Blockers Resolved)

#### A. Review of the 12 Hardening Proposals:
1. **Sub-schemas for nested objects:** **ACCEPT** (`_id: false, strict: true`).
2. **`required: true` on natural keys:** **ACCEPT** (`matched_household_id` and `national_id`).
3. **`trim: true` on all strings:** **ACCEPT**.
4. **`min: 0` on physical quantities:** **ACCEPT** (reject negative numbers for kWh, cubic meters, and bills).
5. **`sangla_atm_risk_score` bounds:** **ACCEPT** (add `min: 0, max: 100` to prevent out-of-bounds bugs).
6. **`enum` on `water_utility.meter_type`:** **MODIFY.** Instead of `ANALOG, DIGITAL, SMART`, use **`['NONE', 'COMMUNAL', 'INDIVIDUAL']`** to match Philippine water utility standards and Lifeline subsidy categories.
7. **Strict `vehicleSchema`:** **ACCEPT & FREEZE** (replaces `[Mixed]`).
8. **`default: false` on `is_lifeline`:** **ACCEPT** (prevents undefined states in boolean queries).
9. **`default: []` on `vehicles`:** **ACCEPT**.
10. **`timestamps: true`:** **ACCEPT**.
11. **`collection: 'external_records'`:** **ACCEPT**.
12. **Named enum constants at top of file:** **ACCEPT** (keeps code clean and extensible).

#### B. Answers to Flagged Blockers:
1. **Seed Data Confirmation:** The data generator script (`generator.py`) always sets `matched_household_id` and `national_id` on every record. Adding `required: true` is safe.
2. **Risk Score Scale:** Confirmed as **0 to 100** (Number, `min: 0, max: 100`).
3. **Water Meter Type Enum:** Confirmed as **`['NONE', 'COMMUNAL', 'INDIVIDUAL']`**.
4. **`vehicleSchema` Structure:** Frozen as:
   * `plate_number`: String (required, uppercase, trim)
   * `vehicle_category`: String (enum: `['MOTORCYCLE', 'TRICYCLE', 'PASSENGER_4W', 'COMMERCIAL_UV', 'OTHER']`)
   * `make_model`: String (trim, e.g., "Toyota Vios 1.3 XE" or "Yamaha NMAX 155")
   * `year_model`: Number (`min: 1950, max: 2100`)
   * `is_commercial_franchise`: Boolean (default: `false`)

---

### 4.4 `VerificationTask.js` Resolution (Findings, Attachments & Enums)

1. **`field_findings` Structure:** **Keep nested under `field_findings` in the database.** This maintains the task document's 3-stage lifecycle (Task Created $\to$ Field Findings Added $\to$ Admin Resolution Signed).
2. **Asset Check Naming:** Use **`livelihood_asset_verification`** to match the contract structure in `field-task-submission.json`.
3. **Cash Card Check Naming:** Use **`landbank_card_inspection`** to match the contract structure.
4. **Photo Attachments:** Use **`evidence_attachments`** (stores `media_type`, `storage_url`, `sha256_hash`, and nested `exif_metadata`), replacing `[Mixed]`.
5. **`worker_recommendation` Values:** Freeze to 3 enums: **`['RETAIN', 'RECOMMEND_GRADUATION', 'INVESTIGATE_FRAUD']`**.
6. **`proof_type` Values:** Freeze to 6 enums: **`['NONE', 'MOVEIT', 'ANGKAS', 'TRICYCLE_MTOP', 'DELIVERY_LOGISTICS', 'OTHER']`**.
7. **`evidence_attachments[]` Sub-Schema:** Freeze structure to:
   ```javascript
   {
     media_type: { type: String, default: 'image/jpeg' },
     storage_url: { type: String, required: true, trim: true },
     sha256_hash: { type: String, required: true, trim: true },
     exif_metadata: {
       timestamp: { type: Date },
       latitude: { type: Number },
       longitude: { type: Number }
     }
   }
   ```
8. **`admin_resolution` Sub-Schema:** Freeze structure to:
   ```javascript
   {
     reviewed_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
     decision: { type: String, required: true, enum: ['APPROVED_GRADUATION', 'RETAINED_ON_ROSTER', 'REINVESTIGATION_ORDERED'] },
     admin_notes: { type: String, trim: true, default: '' },
     finalized_at: { type: Date, default: Date.now }
   }
   ```
9. **`task_status` Values:** Confirmed 5 enums: **`['PENDING_DISPATCH', 'CACHED_OFFLINE', 'SUBMITTED', 'VERIFIED_GRADUATE', 'VERIFIED_RETAIN']`**.

---

### 4.5 `AuditLog.js` Resolution (Actions, Target & Forensic Hash Sequence)

1. **`action` Enum Values:** Freeze to 6 core actions:
   **`['MODEL_FLAG_RAISED', 'TASK_DISPATCHED', 'REPORT_SUBMITTED', 'BENEFICIARY_GRADUATED', 'APPEAL_FILED', 'CALAMITY_DECLARED']`**.
2. **`target_entity` Shape:** Nested sub-schema `{ collection_name: String, entity_id: String }` with an index on `target_entity.entity_id` for fast audit timeline queries.
3. **`actor.user_id` Data Type:** **Use `String`** (instead of `ObjectId` ref). This ensures that if a user account is deleted in the future, historical audit records remain permanently intact without orphaned references.
4. **`actor.role` Enum Values:** Freeze to 5 enums: **`['SUPER_ADMIN', 'REGIONAL_DIRECTOR', 'CASE_WORKER', 'COA_AUDITOR', 'SYSTEM']`** *(includes `'SYSTEM'` for automated background AI triggers)*.
5. **`state_delta` Shape:** Structured delta `{ before: Mixed, after: Mixed }` with `{ _id: false }` to record exact data changes.
6. **Hash Algorithm:** **SHA-256**.
7. **Hash Input Format:** Uses the canonical formula implemented in `/server/src/utils/canonicalJson.js` and `/server/src/utils/cryptoHelper.js`:
   ```text
   SHA-256( sequence_index + ":" + previous_entry_hash + ":" + timestamp + ":" + actor.user_id + ":" + action + ":" + CanonicalJSON(state_delta) )
   ```
8. **Genesis Hash (Block 0):** **64 Zeros** (`"0000000000000000000000000000000000000000000000000000000000000000"`), matching `audit-chain-verification.json`.

---

### 4.6 `SystemConfig.js` Resolution (Calamity Zones & System Thresholds)

1. **Purpose Statement:** Manages **Disaster Governance (Calamity Moratoriums under RA 10121)** to temporarily freeze compliance penalties for disaster-affected areas, as well as centralized system thresholds and feature flags.
2. **Field List & Schema:** Frozen as a typed document with unique `config_key` index:
   * `config_key`: String (required, unique, e.g., `"CALAMITY_ZONES"`, `"AUDIT_THRESHOLDS"`, `"FEATURE_FLAGS"`).
   * `calamity_moratorium_zones`: Array of `{ municipality, province, declared_at, expires_at, ndrrmc_reference, is_active }`.
   * `threshold_configs`: Sub-schema `{ power_lifeline_kwh: 200, water_lifeline_cu_m: 25, risk_score_flag_trigger: 70, appeal_window_days: 15 }`.
   * `feature_flags`: Sub-schema `{ enable_sangla_detection: true, enable_auto_dispatch: true, enable_geofence_enforcement: true }`.
   * `updated_by`: String (stores user ID or username of admin who made changes).
3. **Pattern Choice:** **Pattern B (Typed Config Document)**. Key-Value with `value: Mixed` allows untyped data (e.g., a string `"70"` instead of number `70`). A typed document guarantees strict validation on dates, thresholds, and booleans.
4. **Read/Write Permissions:**
   * *Read:* Backend reads during startup and audit checks.
   * *Write:* Strictly `SUPER_ADMIN` and `REGIONAL_DIRECTOR` via admin API endpoints.
5. **Update Semantics:** Latest-wins in database, but every modification automatically generates an audit block in `AuditLog` via backend audit middleware.
6. **Index:** `{ config_key: 1 }` (Unique).
7. **Cache Strategy:** Backend loads configs into memory on boot and refreshes the cache whenever an admin updates the configuration.
8. **Disruption Check:** **0% Disruption.** Purely internal backend configuration. Does not alter any frontend or ML contracts.

---

## 5. Architectural & Team Impact Summary

* **API Contracts (`/docs/contracts/`):** **0% Change.** All 8 contracts remain 100% frozen.
* **Database Models (`/server/src/models/`):** All 6 Mongoose models have clear, strict, and validated schemas.
* **Backend Controllers (`/server/src/controllers/`):** Controllers import models directly; virtuals and aliases handle contract mapping automatically.
* **ML Microservice (`/ml-service/`):** Confirmed 6 demographic features and 0–100 score bounds.
* **Frontend PWA (`/client/`):** Mock JSON feeds remain completely unchanged.
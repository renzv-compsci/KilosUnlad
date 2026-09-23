# DECISION-002: VerificationTask Dispatch Fields & AuditLog Action Extension
**Author:** Dustin Martinez (Database Architecture Lead)
**Status:** PROPOSED
**Date Created:** 2026-09-21
**Date Resolved:** —

---

## 1. Context & Problem Statement

Two schema items surfaced during the integration review with Mae (Backend Lead) after Phase 1 and DECISION-001 were completed.

Concern A — VerificationTask missing dispatch fields.

The dispatch contract `admin-task-dispatch.json` requires three fields not stored in `VerificationTask.js`: `assignment_notes`, `priority`, and `due_date`.

Scope check — these fields are not covered in any document within my area:

- Not in my Engineering Task Roadmap Task 1.5
- Not in Mae's Engineering Task Roadmap Task 2.4 (only says "matching `admin-task-dispatch.json`" — no storage scoped)
- Not in DECISION-001 §4.4
- Not in any of the three Phase 1 contracts (`admin-triage-feed`, `field-task-submission`, `audit-chain-verification`)

They exist only in `admin-task-dispatch.json`, which was not part of Phase 1 scope. Mae surfaced them during integration.

Concern B — AuditLog missing config-update action.

DECISION-001 §4.6 requires an audit block per `SystemConfig` modification. DECISION-001 §4.5 froze the `action` enum to six values, none matching "config changed." This is an internal contradiction within DECISION-001.

---

## 2. Concern A — VerificationTask Dispatch Fields

The gap is factual. Fields exist in a contract and must be stored. Open questions are the correct data definitions.

Proposed field additions to `VerificationTask.js`:

```javascript
assignment_notes: { type: String, trim: true },
priority: {
  type: String,
  enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'],
},
due_date: { type: Date },
```

Open questions for Renz:

- Is `priority` an enum or a free-form string?
- If enum, what are the exact allowed values? The contract shows only one example (`"HIGH"`). The proposed list is inferred, not authoritative.

---

## 3. Concern B — AuditLog Action Extension

This requires a design decision because the current enum is brittle.

Option A — Add a single enum value.

Add `CONFIG_UPDATED` to the frozen enum from DECISION-001 §4.5.

- Pros: One-line edit. Resolves the immediate gap.
- Cons: Every future action type needs another enum change and deployment. This recurs.

Option B — Replace enum with categorized action codes.

Introduce two fields:

- `action_category` — String, enum: `['AUTH', 'DATA_CHANGE', 'WORKFLOW', 'CONFIG', 'SYSTEM', 'COMPLIANCE']`
- `action` — String, required, free-form (SCREAMING_SNAKE_CASE)

Add `/docs/contracts/audit-actions.md` documenting valid codes.

- Pros: New action codes need no schema change. `action_category` gives queryability without enumerating every code. Hash chain unaffected — only `action` is hashed, not category. Scales for capstone lifecycle and beyond.
- Cons: Requires naming discipline. No DB-level validation on `action` string. Mae sets one extra field per write.

Recommendation: Option B.

Reasoning: The system will grow. New action types will emerge — user creation, permission changes, appeals, imports, and others not yet anticipated. Every new action should not need a schema change and deployment. Option B keeps the model stable while remaining queryable.

If Renz rejects Option B, Option A is a valid short-term fix and I will implement it immediately.

---

## 4. Team Acknowledgment Items (No Schema Change Required)

All items below were raised by Mae during integration. None require schema changes. Documented for Renz's visibility.

- Triage mapping (nested → flat) — Mae's task
- GeoJSON coordinates mapping — Mae's task
- Task submission flattening (flat → nested) — Mae's task
- Auth error code alignment — Mae's task
- `password_hash` exclusion from responses — Mae's task
- Chain verification unit test — Mae's task
- `canonicalJson.js` / `cryptoHelper.js` — Mae's task (already done)

No action required from me.

---

## 5. Impact Assessment

- Files affected: `VerificationTask.js`, `AuditLog.js`
- Contracts affected: None
- Other models affected: None
- Phases affected: None
- Hash chain affected: No (no historical entries exist)
- Teammates affected: Mae sets new fields on write; Charles may set category if ML raises actions
- Effort: ~10 min (Concern A), ~15–30 min (Concern B depending on option)

---

## 6. References

- DECISION-001 §4.4, §4.5, §4.6
- `/docs/contracts/admin-task-dispatch.json`
- `/docs/contracts/audit-chain-verification.json`
- Mae's Integration Review (2026-09-21)

---

## 7. Official PM / Tech Lead Resolution (Filled by Renz)

* **Concern A Decision:** **ACCEPTED**
  - `priority` Type: String (Enum)
  - Allowed Values: `['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']` (Default: `'HIGH'`)
  - `assignment_notes`: String (trim: true, alias: `'dispatch_instructions'`)
  - `due_date`: Date (required)

* **Concern B Decision:** **OPTION A ACCEPTED (Option B Rejected)**
  - Action Enum Value: Add `'SYSTEM_CONFIG_UPDATED'` to `AUDIT_ACTIONS` in `AuditLog.js`.
  - Reason: Preserves strict DB-level enum validation and avoids unnecessary schema complexity for Mae.

* **Additional Alignment:**
  - Add `last_login_at: { type: Date, default: Date.now }` to `User.js`.

* **Action Items:**
  - [ ] Dustin: Update `VerificationTask.js`, `AuditLog.js`, and `User.js` on `database-dustin`.
  - [ ] Mae: Update `task.controller.js` and `auth.controller.js` on `backend-mae`.
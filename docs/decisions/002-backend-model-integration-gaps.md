# DECISION-002: Task Dispatch Persistence and Configuration Audit Actions
**Author:** Mae Santos (Backend Engineering Lead)  
**Status:** PROPOSED  
**Date Created:** 2026-09-21  
**Date Resolved:** Pending

## 1. Context & Problem Statement

Decision 001 is accepted and all six database models are merged. Backend integration
must preserve the frozen API contracts, but two storage decisions remain unresolved:

1. `admin-task-dispatch.json` accepts `assignment_notes`, `priority`, and `due_date`.
   `field-task-download.json` returns `dispatch_instructions` and `due_date`.
   `VerificationTask` currently has none of these persisted fields. With strict
   schemas, passing these properties directly to the model discards them.
2. Decision 001 requires an audit entry for every SystemConfig update. The approved
   AuditLog actions do not include a general configuration-update action.
   `CALAMITY_DECLARED` does not describe an ordinary threshold or feature-flag change.

Related authentication detail: the login contract returns `last_login_at`, but User
does not persist that field. The backend currently returns the successful session's
login timestamp; it does not claim to record login history in MongoDB.

## 2. Options Considered

- **A: Extend the existing models after approval.** Persist the task's dispatch
  metadata and add a specifically named configuration audit action. This keeps the
  API unchanged and requires coordinated model/controller tests.
- **B: Store metadata in a separate collection.** Avoids extending VerificationTask
  but adds joins, lifecycle coordination, and another model. No current roadmap
  requirement justifies that extra collection.

Do not hardcode missing task deadlines, discard submitted instructions, or relabel
ordinary configuration edits as calamity declarations merely to satisfy validation.

## 3. Developer's Recommendation

- Dustin: after Renz's approval, add persisted `assignment_notes`, `priority`, and
  `due_date` to VerificationTask. Confirm allowed priority values and required/default
  behavior; the contract example's `HIGH` alone does not specify the entire enum.
- Mae: map stored `assignment_notes` to response `dispatch_instructions`; preserve
  the flat API submission while storing verification findings under `field_findings`.
- Renz/Dustin: approve a new audit action such as `SYSTEM_CONFIG_UPDATED` and its
  target/state-delta requirements before adding it to the enum.
- Renz: clarify whether persistent successful-login history is required. Until then,
  the returned `last_login_at` represents this session's login event only.
- Keep API contract files and the accepted hash byte sequence unchanged.

## 4. Official PM / Tech Lead Resolution (Filled by Renz)

- [ ] Decision: ACCEPTED / REJECTED / MODIFIED
- [ ] Confirm task metadata fields, priority enum, and validation/defaults.
- [ ] Confirm configuration audit action and required event fields.
- [ ] Confirm successful-login timestamp persistence semantics.
- [ ] Assign model changes to Dustin and controller integration to Mae.

This document proposes decisions only; it does not authorize model or contract edits.

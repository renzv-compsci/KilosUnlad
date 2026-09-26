# DECISION-006: Transaction-Capable MongoDB Deployment for Backend Workflows
**Author:** Mae Santos — Backend Engineering Lead
**Status:** PROPOSED
**Date Created:** 2026-09-25
**Date Resolved:** Pending

---

## 1. Context & Problem Statement

Task dispatch creates a VerificationTask, changes the beneficiary status to
UNDER_INVESTIGATION, and appends an AuditLog entry. The backend uses
`session.withTransaction()` so a failure rolls back all three writes rather than
leaving a task, status or audit entry without its corresponding changes.

The local shared `docker-compose.yml` starts MongoDB 6 as a standalone instance:
there is no replica-set configuration or initialization. Standalone MongoDB does
not support these multi-document transactions. The backend's disposable
replica-set tests pass, but that does not verify the shared deployment.

This is a deployment decision for Renz, not a request to extend Dustin's schema
responsibilities. Dustin has requested a formal decision before further changes.
Mae owns transaction handling and integration verification; infrastructure
ownership and implementation must be assigned by the PM.

Login and live read feeds do not require dispatch transactions and can be tested
separately with provisioned synthetic accounts. No API contract or schema change
is proposed here.

### Separate index-permission concern

`autoIndex: false` disables Mongoose's automatic index creation. It does not
disable our explicit `audits.collection.indexes()` call in
`server/src/services/workflowPersistence.service.js`. That guard verifies the
unique sequence index used by concurrent audit writers. Current find/insert-only
audit privileges deny this inspection, independently of deployment topology.

This proposal does not grant new privileges or remove the guard. If the team
retains the current role, a separately approved provisioning/readiness check
must verify required indexes and prevent workflow writes when verification
fails. Renz must decide between that design and narrowly scoped metadata access.
Simply setting autoIndex false or removing inspection is not a complete fix.
Automatic collection initialization should also be reviewed under the restricted
account. Audit update/delete permissions must stay blocked.

---

## 2. Options Considered

* **Option A — Authenticated single-member replica set for local development/demo.**
  Supports the current transaction design with limited infrastructure overhead.
  Requires replica-set initialization, internal authentication configuration,
  readiness checks and connection configuration. Provides no redundancy or
  high availability and is not the proposed production topology.
* **Option B — Team-approved managed or multi-member replica set.**
  Supports transactions and can provide redundancy. Requires separate decisions
  on hosting, access, credentials, cost and backup operations.
* **Option C — Keep standalone MongoDB and redesign cross-document writes.**
  Would require a new consistency/recovery design, compensating operations and
  additional failure tests. Sequential writes are not equivalent to the current
  all-or-nothing behavior. Not recommended as a quick compatibility workaround.

---

## 3. Developer's Recommendation

Approve Option A for local integration/demo, with production topology deferred
to a separate infrastructure decision. Preserve authenticated database access,
existing collections/indexes, frozen response contracts and atomic audit writes.

### Proposed implementation responsibilities (subject to PM assignment)

- Renz: approve topology and assign the owner of Compose/bootstrap changes.
- Assigned infrastructure owner: configure replica-set startup and idempotent
  initialization; ensure a writable primary before backend workflows run.
  Use authentication-compatible member credentials/key material without
  committing secrets. Plan existing-volume migration and backups; do not require
  deleting the team's data volume to apply the change.
- Assigned infrastructure owner: use a replica-set name and advertised member
  address reachable from backend containers; document how host-side clients
  connect. Configure the backend URI accordingly and verify restart behavior.
- Mae: verify backend transactions, sanitized failures and recovery using the
  approved application account. Implement backend configuration changes only
  after the deployment and index-readiness approach is agreed.
- Dustin: review schema/index compatibility when requested; no automatic
  assignment of infrastructure changes or broader database privileges.

### Acceptance checks

1. Fresh setup and an existing-volume restart produce an authenticated writable
   primary without deleting data or repeatedly reinitializing the replica set.
2. The real restricted app account can execute the approved workflow, with index
   readiness resolved explicitly. Audit update/delete attempts remain denied.
3. Successful dispatch commits exactly one task, household transition and audit
   entry; injected audit failure leaves none of those partial changes.
4. Concurrent dispatch requests produce one assignment, while concurrent audit
   writers preserve sequence uniqueness and the accepted hash format.
5. Database restart preserves backend liveness, returns sanitized failures during
   the outage, and permits queries after recovery.
6. Login/read-feed integration remains functional with mock mode disabled.

Evidence: `server/test/workflowPersistence.test.js`,
`server/test/auditRoleCompatibility.test.js`, and
[database recovery review](../reports/DATABASE_RECOVERY_REVIEW.md).
These existing tests do not substitute for validation of the chosen deployment.

References:
- [MongoDB transaction deployment considerations](https://www.mongodb.com/docs/manual/core/transactions-production-consideration/)
- [Mongoose 8 schema/index configuration](https://mongoosejs.com/docs/8.x/docs/guide.html#autoIndex)
- [Phase 2 gap review](../reports/PHASE2_GAP_REVIEW.md)
- [Decision 005](005-Audit-Log-Append-Only-Role.md)

---

## 4. Official PM / Tech Lead Resolution (Filled by Renz)

* [ ] Decision: ACCEPTED / REJECTED / MODIFIED
* [ ] Local deployment option and production scope:
* [ ] Infrastructure owner and affected Compose/bootstrap files:
* [ ] Existing-volume migration, backup and rollback plan:
* [ ] Index-readiness approach and owner (separate from replica-set topology):
* [ ] Backend configuration and verification action items:
* [ ] Review/acceptance evidence:

No infrastructure, database role, schema or backend runtime changes are made by
this proposed decision. Implementation awaits the PM resolution above.

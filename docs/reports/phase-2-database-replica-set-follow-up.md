# KilosUnlad — phase-2-database-replica-set-follow-up-report

**Maintainer:** Dustin Martinez (Database Architecture Lead)
**Scope:** Database-layer implementation reports, corrective fixes, and post-verification evidence.

---

## Purpose

This folder contains technical reports for all database-layer work. Each report
documents:

- What was implemented
- Why the implementation was chosen
- What was verified
- Any corrective fixes applied after review
- Known limitations

Reports are append-only in spirit — sections are added, never overwritten.
When a corrective fix is applied, it is documented as a new section, not by
editing the original.

---

## Reports Index

| Report | Phase | Status | Last Updated |
|--------|-------|--------|--------------|
| [database-2.1-replica-set-implementation.md](./database-2.1-replica-set-implementation.md) | Phase 2 | COMPLETE | 2026-09-29 |
| [database-phase-3-nonscope.md](./database-phase-3-nonscope.md) | Pre-Phase 3 | COMPLETE | 2026-09-29 |

---

## Report 1 — `database-2.1-replica-set-implementation.md`

**Phase:** 2 (Task 2.1)
**Related Decision:** DECISION-005, DECISION-006
**Status:** COMPLETE

### What Was Done

- MongoDB now runs as a single-node replica set (`rs0`) to enable
  `session.withTransaction()` for atomic task dispatch.
- Keyfile is generated inside the container on first boot, stripped of
  trailing newlines, chowned to the MongoDB user (UID 999), and stored in
  the `mongo-keyfile-data` volume.
- A separate one-shot `replset-init` service initializes the replica set
  after `mongod` is fully ready, authenticating as `admin_user`.
- `audit_logs` remains append-only: `update` and `delete` are blocked;
  `createIndex` and `listIndexes` are granted for backend index verification.

### Justified Deviations

Two changes from DECISION-006's original text were required:

1. **`rs.initiate()` moved from `init-mongo.js` to `replset-init` service.**
   The init script runs before `mongod` accepts replica set commands.
   Calling `rs.initiate()` there fails with
   `This node was not started with replication enabled`.

2. **`--keyFile` added to the mongod command.**
   MongoDB requires a keyfile when `--replSet` and authorization are both
   enabled. Startup fails with
   `security.keyFile is required when authorization is enabled with replica sets`.

### Verified

- `rs.status().members[0].stateStr` → `PRIMARY`
- `db.audit_logs.getIndexes()` → returns all 4 indexes
- `db.audit_logs.updateOne()` → `Unauthorized`
- `replset-init` exited with code 0
- Server log: `[MongoDB] Connected successfully: db/kilosunlad`

### Post-Verification Corrections

Two corrective fixes applied after Mae's retest review:

1. **`listIndexes` added to `audit_logs` privilege.**
   Backend's index verification calls `audits.collection.indexes()`, which
   requires `listIndexes` — `createIndex` alone does not grant it.

2. **PRIMARY wait loop corrected.**
   `rs.status().myState === 1` returns `false` as a value, not a non-zero
   exit code. The loop broke immediately regardless of state. Fixed with
   `try/catch` + `process.exit(...)`.

### Files

- `docker-compose.yml`
- `docker/mongo/init-mongo.js`
- `.env.example`

### Contracts & Schemas

- Contracts: 0% change
- Schemas: 0% change

---

## Report 2 — `database-phase-3-nonscope.md`

**Phase:** Pre-Phase 3 (integration support)
**Related Decision:** DECISION-007
**Status:** COMPLETE

### What Was Done

- Seeded 4 user accounts (one per role: `SUPER_ADMIN`, `REGIONAL_DIRECTOR`,
  `CASE_WORKER`, `COA_AUDITOR`) with bcrypt-hashed passwords (cost 10).
- Seeded 3 sample beneficiaries (varied `program_status`) and
  2 sample verification tasks.
- Credentials shared privately with Mae and Markie.

### Scope Note

**This is integration support, not a Phase 3 deliverable.**

- Task 3.1 (Phase 3) covers ingestion of `seed_beneficiaries.json` and
  `seed_external_records.json` — pending Renz's delivery.
- Account seeding was formalized via DECISION-007 to keep the scope record
  clean.

### Verified

- Users: 4
- Beneficiaries: 3
- Tasks: 2

### Files

- `data-pipeline/scripts/seed_test_data.js`

### Contracts & Schemas

- Contracts: 0% change
- Schemas: 0% change

---

## How to Read These Reports

- **Sections are added**, not replaced. If a correction is applied, look for
  a later section, not an edited original.
- **Verification commands** are included so anyone can reproduce the results.
- **Deviations** from decisions are documented with reasoning — the decision's
  intent takes priority over the literal text when the text cannot be
  implemented as written.
- **Contracts and schemas** are always noted so downstream teams can confirm
  no impact.

---

## Related Documents

- `docs/DECISION-005-Audit-Log-Append-Only-Role.md`
- `docs/DECISION-006-Transaction-Capable-MongoDB-Deployment.md`
- `docs/DECISION-007-Test-Account-Seeding.md`
- `/docs/contracts/`

---

**End of README**
# Phase 2 — Security Hardening & Index Verification

**Author:** Dustin Martinez (Database Architecture Lead)
**Date:** 2026-09-24
**Status:** COMPLETE — Tasks 2.1 and 2.2 verified; Task 2.3 reviewed
**References:** DECISION-001 §4.5 #3, DECISION-004, DECISION-005

---

## 1. Summary

Phase 2 (Days 4–8) hardened the database layer with two goals: enforce append-only behavior on `audit_logs` at the MongoDB role level, and verify the 2dsphere spatial index performs as designed. A third task covered connection pool review, which is owned by Mae (Backend Lead).

All database-side work is complete and verified.

---

## 2. Task 2.1 — Append-Only Lock on `audit_logs`

**Status:** COMPLETE

**Implementation:** Custom MongoDB role `kilosUnladAppRole` in the `admin` database. `app_user` was reassigned from the built-in `readWrite` role to this custom role.

**Privilege design:**

- Non-audit collections (`users`, `beneficiaries`, `external_records`, `verification_tasks`, `system_configs`): `find`, `insert`, `update`, `remove`, `createIndex`
- `audit_logs`: `find`, `insert` only
- Excluded globally: `dropCollection`, `dropIndex`, `createCollection` (destructive or init-only)

**Source of truth:** `DECISION-001 §4.5 #3` approved DB-level enforcement. `DECISION-005` formalized the custom role design.

**File modified:** `/docker/mongo/init-mongo.js`

**Verification results:**

- `app_user` authenticated with role `kilosUnladAppRole` on `admin`
- `db.audit_logs.updateOne()` throws `Unauthorized` — append-only enforced
- `db.users.insertOne()` succeeds — non-audit collections unaffected
- Cleanup verified (deleted test document)

**Definition of Done:** Satisfied. Mongoose `AuditLog.updateOne()` would now throw a database authorization error.

---

## 3. Task 2.2 — 2dsphere Spatial Query Verification

**Status:** COMPLETE

**Implementation:** Standalone mongosh script at `/data-pipeline/scripts/verify-spatial-index.js`. Inserts temporary test documents, runs a `$geoWithin` query with `$centerSphere`, inspects the `explain("executionStats")` output, and cleans up.

**Parameters (per DECISION-004):**

- Operator: `$geoWithin` with `$centerSphere`
- Center: Calamba City Hall `[121.1653, 14.2117]`
- Radius: 5 km
- Test data: 4 temporary documents (3 inside radius, 1 outside)

**Verification results:**

- Query returned 3 documents (correctly filtered)
- `totalKeysExamined`: 4
- `totalDocsExamined`: 3
- `nReturned`: 3
- Winning plan used `IXSCAN` on `address.coordinates_2dsphere`
- No `COLLSCAN` in the plan
- No over-scan (`totalDocsExamined === nReturned`)

**Definition of Done:** Satisfied. Spatial index confirmed working with zero collection scan.

---

## 4. Task 2.3 — Connection Pool Review

**Status:** REVIEWED — pending Mae's response

**File reviewed:** `/server/src/config/database.js` (owned by Mae)

**Findings:**

- `maxPoolSize: 10` — present
- `serverSelectionTimeoutMS: 5000` — present
- `socketTimeoutMS: 45000` — present (bonus, not required)
- Reconnect event listeners — not present (roadmap references "automatic reconnect listeners are active")
- `process.exit(1)` on startup failure — confirms app exits if MongoDB is unreachable at boot

**Open questions sent to Mae:**

1. Does the DoD require explicit reconnect listeners, or is Mongoose's built-in auto-reconnect sufficient?
2. Does "does not crash on disconnect" cover startup failure, or only runtime disconnection?

**Ownership:** `database.js` is Mae's file. Database lead role is review only; Backend lead edits.

---

## 5. Verification Summary

| Task | Verification Method | Result |
|------|---------------------|--------|
| 2.1 | mongosh update test | PASS — `Unauthorized` on `audit_logs` update |
| 2.1 | mongosh insert test | PASS — insert succeeds on `users` |
| 2.2 | `explain("executionStats")` on `$geoWithin` query | PASS — `IXSCAN` on `address.coordinates_2dsphere` |
| 2.3 | Manual file review | COMPLETE — report sent to Mae |

---

## 6. Files Modified

- `/docker/mongo/init-mongo.js` — custom role `kilosUnladAppRole`, revised `app_user` creation
- `/data-pipeline/scripts/verify-spatial-index.js` — new verification script

---

## 7. Contracts, Schemas, Hash Chain

- **API Contracts:** 0% changes. All contracts remain frozen.
- **Mongoose Schemas:** No changes in Phase 2. Models from Phase 1 unchanged.
- **Hash byte sequence:** Unchanged.
- **Indexes:** No changes (all indexes were created in Phase 1).

---

## 8. Operational Notes

- The database container must be rebuilt with `docker-compose down -v` for the new role to take effect on existing volumes.
- The new role does not grant `createCollection` or `dropCollection`. All collections are pre-created in `init-mongo.js`.
- The new role does not grant `dropIndex`. Indexes are created once in `init-mongo.js` and managed manually.
- If a new collection is added in the future, `init-mongo.js` must be updated to include it in the role.

---

## 9. Phase 2 Status

Tasks 2.1 and 2.2 are complete. Task 2.3 is reviewed and awaiting Mae's confirmation on reconnect listeners and startup crash behavior.

Database-side Phase 2 work is signed off.

---

## 10. References

- Engineering Task Roadmap (Database Architecture) — Phase 2, Tasks 2.1–2.3
- DECISION-001 §4.5 #3 — Append-only lock guidance
- DECISION-004 — Spatial query parameters
- DECISION-005 — Audit log append-only permission model
- `/docs/contracts/audit-chain-verification.json`
- `/docker/mongo/init-mongo.js`
- `/data-pipeline/scripts/verify-spatial-index.js`

---

**End of Document**
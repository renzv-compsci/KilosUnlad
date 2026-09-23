## 1. Context & Problem Statement

Phase 2 Task 2.1 requires enforcing append-only behavior on the `audit_logs` collection at the database level. The task roadmap states:

> Grant: `find`, `insert` on `kilosunlad.audit_logs`.
> Deny: `update`, `remove`, `dropCollection` on `kilosunlad.audit_logs`.
> DoD: A test script attempting `AuditLog.updateOne()` in Mongoose throws a database authorization error.

MongoDB has no "deny" mechanism in its role-based access control. Roles only grant permissions. To make `audit_logs` append-only, `app_user` must not be granted update, remove, or dropCollection on that collection.

The current `init-mongo.js` assigns `app_user` the built-in `readWrite` role on `kilosunlad`. That role grants full CRUD on all collections, including `audit_logs`. This defeats the append-only requirement.

DECISION-001 §4.5 #3 already endorses the resolution in principle:

> "Never allow updates or deletes. Enforce at the database level via custom role (Phase 2). Even Mongoose shouldn't have permission."

This decision formalizes the implementation.

---

## 2. Options Considered

**Option A — Custom role with enumerated collection privileges (recommended).**

Create a custom role `kilosUnladAppRole` in the `admin` database. Grant it explicit actions per collection:

- `find`, `insert`, `update`, `remove`, `createIndex` on `users`, `beneficiaries`, `external_records`, `verification_tasks`, `system_configs`
- `find`, `insert` only on `audit_logs`

Assign this role to `app_user` in place of `readWrite`.

- **Pros:** True database-level enforcement. Tamper attempts fail at the MongoDB layer, not just at the application layer. Matches DECISION-001 §4.5 #3. Preserves all non-audit CRUD paths unchanged.
- **Cons:** Every future collection requires an update to the role. `app_user` loses `readWrite`, which may surface hidden dependencies on permissions that are no longer granted.

**Option B — Keep `readWrite`, enforce append-only at the application layer only.**

- **Pros:** No change to `app_user` role. No maintenance burden for future collections.
- **Cons:** A direct database connection (mongosh, compromised credentials) could tamper with `audit_logs` without MongoDB blocking it. This defeats the forensic integrity purpose of the hash chain. Contradicts DECISION-001 §4.5 #3.

---

## 3. Developer's Recommendation

Adopt **Option A** — custom role with enumerated collection privileges.

Rationale:

- The entire purpose of the cryptographic hash chain is to detect tampering. If tampering can succeed at the database level, the chain's guarantee is weakened. Only Option A makes tampering physically impossible for `app_user`.
- DECISION-001 §4.5 #3 already approved this approach in principle. This decision only formalizes the implementation.
- The maintenance cost is small — new collections are rare in this project.
- All non-audit collections retain their current effective permissions. No backend controller needs modification.

**Role design:**

```
Custom role name: kilosUnladAppRole
Database: admin
Privileges:
  - users:              find, insert, update, remove, createIndex
  - beneficiaries:      find, insert, update, remove, createIndex
  - external_records:   find, insert, update, remove, createIndex
  - verification_tasks: find, insert, update, remove, createIndex
  - system_configs:     find, insert, update, remove, createIndex
  - audit_logs:         find, insert
```

**Excluded actions (intentional):**

- `dropCollection` — destructive, root-only
- `dropIndex` — destructive, root-only
- `createCollection` — collections are pre-created in the init script

**Assignment:**

Replace `app_user`'s `readWrite` role with `kilosUnladAppRole`:

```javascript
db = db.getSiblingDB('kilosunlad');

db.createUser({
  user: 'app_user',
  pwd: 'AppUserPassword2026!',
  roles: [{ role: 'kilosUnladAppRole', db: 'admin' }],
});
```

**Workflow preservation:**

- No API contracts change.
- No schema changes.
- No backend controller changes required.
- All existing queries against non-audit collections continue to work identically.
- Only `audit_logs` write operations beyond `find` and `insert` are blocked.

---

## 4. Official PM / Tech Lead Resolution (Filled by Renz)

* [ ] **Decision:** [ACCEPTED / REJECTED / MODIFIED]

* [ ] **Action Items:**
  - [ ] Dustin: Update `/docker/mongo/init-mongo.js` with the custom role and revised `app_user` creation.
  - [ ] Dustin: Rebuild the database container (`docker-compose down -v` then `docker-compose up --build`).
  - [ ] Dustin: Verify append-only enforcement via test script (`updateOne` on `audit_logs` must throw `Unauthorized`).
  - [ ] Dustin: Notify Mae if any backend path unexpectedly fails due to the role change.
  - [ ] Verify no integration breaks after the role change.

---

## 5. Impact Assessment

- **Files affected:** `/docker/mongo/init-mongo.js` only
- **Contracts affected:** None
- **Other models affected:** None
- **Phases affected:** None
- **Team impact:** Mae — `app_user` loses `readWrite` and gains the custom role. All non-audit access remains identical. Only `audit_logs` loses update/remove/drop capability. No controller changes required.
- **Risk:** Low. Integration test before merging.
- **Effort:** ~20 minutes to implement and verify

---

## 6. References

- Engineering Task Roadmap (Database Architecture) — Phase 2, Task 2.1
- DECISION-001 §4.5 #3 — Append-only lock guidance
- `/docs/contracts/audit-chain-verification.json`
- MongoDB Role-Based Access Control documentation
- Current `/docker/mongo/init-mongo.js`

---

**End of Document**

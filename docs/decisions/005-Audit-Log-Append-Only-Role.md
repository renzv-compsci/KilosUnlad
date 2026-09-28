# DECISION-005: Custom Database Role for Append-Only Audit Log Enforcement
**Author:** Dustin Martinez (Database Architecture Lead)  
**Status:** ACCEPTED & RESOLVED  
**Date Created:** 2026-09-24  
**Date Resolved:** 2026-09-28  

---

## 1. Context & Problem Statement

Phase 2 Task 2.1 requires enforcing append-only behavior on the `audit_logs` collection at the database level:
> Grant: `find`, `insert` on `kilosunlad.audit_logs`.  
> Deny: `update`, `remove`, `dropCollection` on `kilosunlad.audit_logs`.  
> DoD: A test script attempting `AuditLog.updateOne()` in Mongoose throws a database authorization error.

MongoDB's Role-Based Access Control (RBAC) does not provide an explicit "deny" rule; roles only grant privileges. Currently, `init-mongo.js` assigns `app_user` the built-in `readWrite` role on `kilosunlad`. Because `readWrite` grants full CRUD across all collections, it allows updates and deletions on `audit_logs`, violating the forensic non-repudiation requirement established in DECISION-001 §4.5 #3.

---

## 2. Options Considered

### Option A — Custom Role with Enumerated Collection Privileges (Recommended)
Create a custom role `kilosUnladAppRole` in the `admin` database with explicit actions per collection:
* Full operational access (`find`, `insert`, `update`, `remove`, `createIndex`) on operational collections: `users`, `beneficiaries`, `external_records`, `verification_tasks`, `system_configs`.
* Append-only access (`find`, `insert`) on `audit_logs`.
* Exclude `dropCollection` and `dropIndex` entirely (restricted to root `admin_user`).
* Assign `kilosUnladAppRole` to `app_user` instead of `readWrite`.
* *Pros:* True database-level security. Unauthorized direct modifications via `mongosh` or compromised credentials fail at the database engine level.
* *Cons:* Requires explicit privilege enumeration; any new collection must be registered in the role.

### Option B — Keep `readWrite`, Enforce at Application Layer Only
Rely solely on Mongoose middleware to block update queries on `AuditLog`.
* *Pros:* Zero database role configuration.
* *Cons:* **REJECTED.** A direct database connection or an injection vulnerability could alter historical audit blocks without MongoDB blocking it, defeating the purpose of the cryptographic hash chain.

---

## 3. Developer's Recommendation

Adopt **Option A**. Only database-level authorization makes historical tampering physically impossible for `app_user`. The operational collections retain full functionality, while `audit_logs` is protected against modification and deletion.

---

## 4. Official PM / Tech Lead Resolution (Filled by Renz)

* **Decision:** **ACCEPTED WITH HARMONIZATION (Harmonized with DECISION-006)**

### 1. Architectural Alignment with DECISION-006:
* Mae's backend transaction engine (`server/src/services/workflowPersistence.service.js`) executes an index safety check calling `audits.collection.indexes()`.
* To allow this check to pass without granting write permissions, `createIndex` is added to `audit_logs` privileges. This allows Mongoose to inspect and assert the unique sequence index without granting `update` or `delete`.

### 2. Approved Role Specification (`kilosUnladAppRole`):
* **Database:** `admin`
* **Operational Collections (`users`, `beneficiaries`, `external_records`, `verification_tasks`, `system_configs`):**
  * Actions: `["find", "insert", "update", "remove", "createIndex"]`
* **Audit Ledger Collection (`audit_logs`):**
  * Actions: `["find", "insert", "createIndex"]`
  * Blocked: `update`, `remove`, `dropCollection` are **strictly revoked**.

### 3. Action Items:
* [x] **Dustin:** Update `/docker/mongo/init-mongo.js` to create `kilosUnladAppRole` in the `admin` database and assign it to `app_user`.
* [x] **Dustin:** Rebuild database container (`docker-compose down -v && docker-compose up --build db`).
* [x] **Dustin:** Run test script attempting `AuditLog.updateOne()` to verify `MongoServerError: not authorized` is thrown.
* [x] **Mae:** Verify that backend startup and index inspection succeed under the new role.

---

## 5. Impact Assessment

* **Files Affected:** `/docker/mongo/init-mongo.js`
* **Contracts Affected:** None (0% change).
* **Hash Formula Affected:** None (0% change).
* **Security Result:** Even if the Node.js application server is compromised, historical audit records cannot be overwritten or deleted.
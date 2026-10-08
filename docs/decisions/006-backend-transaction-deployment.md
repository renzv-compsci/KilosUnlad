# DECISION-006: Transaction-Capable MongoDB Deployment for Backend Workflows
**Author:** Mae Santos (Backend Engineering Lead)  
**Status:** ACCEPTED & RESOLVED  
**Date Created:** 2026-09-25  
**Date Resolved:** 2026-09-28  

---

## 1. Context & Problem Statement

Task dispatching executes three critical mutations simultaneously:
1. Creates a `VerificationTask` document.
2. Updates `Beneficiary` status to `UNDER_INVESTIGATION`.
3. Appends an immutable block to `AuditLog`.

To prevent partial writes (e.g., a task is dispatched, but the audit entry fails), the backend uses MongoDB ACID transactions via `session.withTransaction()`. 

However, `docker-compose.yml` runs MongoDB 6 as a **standalone instance**. The MongoDB engine strictly disallows multi-document transactions unless the database is configured as a **Replica Set** (throwing `Transaction numbers are only allowed on a replica set member or mongos`).

Additionally, the concurrency guard I implemented in `workflowPersistence.service.js` checks `audits.collection.indexes()` to verify the unique sequence index, which requires harmonization with the custom `app_user` permissions defined in DECISION-005.

---

## 2. Options Considered

### Option A — Single-Member Replica Set (`rs0`) in Docker Compose (Recommended)
Configure the local MongoDB container to run with `--replSet rs0` and execute `rs.initiate()` on startup.
* *Pros:* Fully unlocks `session.withTransaction()` for local development and demos. Requires minimal RAM (~150MB), zero extra containers, and no cloud costs.
* *Cons:* Single-node deployment; does not provide automated failover (acceptable for local development).

### Option B — Managed Cloud Cluster (MongoDB Atlas) or Multi-Member Local Cluster
Run a 3-node cluster locally or connect to a hosted cloud database.
* *Pros:* True high availability.
* *Cons:* **REJECTED.** Running 3 database containers locally consumes 1.5GB+ of student laptop RAM. A cloud database requires constant internet access, preventing offline local development.

### Option C — Redesign Writes without Transactions (Sequential Operations)
Remove `session.withTransaction()` and write documents sequentially.
* *Pros:* Works on standalone MongoDB.
* *Cons:* **REJECTED.** If the server crashes mid-operation, the database is left in a corrupted state (a task exists with no audit trail). This violates our forensic auditing mandate.

---

## 3. Developer's Recommendation

Adopt **Option A**. Run a single-node replica set (`rs0`) in Docker Compose for local development, while documenting that multi-member production clustering is deferred to future cloud deployment. Harmonize the index readiness check with DECISION-005.

---

## 4. Official PM / Tech Lead Resolution (Filled by Renz)

* **Decision:** **ACCEPTED (Option A Approved & Harmonized with DECISION-005)**

### 1. Deployment Topology & Scope:
* Local development and defense demonstrations will use an **authenticated single-member replica set (`rs0`)**.
* Multi-member clustering with automated failover across data centers is an operational concern **deferred to production cloud deployment**.

### 2. Infrastructure Execution Plan:
* **`docker-compose.yml`:** The `db` service command will launch with `mongod --replSet rs0 --bind_ip_all`.
* **`/docker/mongo/init-mongo.js`:** The script will execute `rs.initiate()` on boot before provisioning the roles from DECISION-005.
* **`.env.example`:** The connection string will specify the replica set:  
  `MONGO_URI=mongodb://app_user:AppUserPassword2026!@db:27017/kilosunlad?replicaSet=rs0&authSource=kilosunlad`

### 3. Harmonization with DECISION-005:
* Dustin has granted `createIndex` on `audit_logs` in `kilosUnladAppRole`, allowing Mae's `workflowPersistence.service.js` to inspect indexes cleanly while keeping `update` and `delete` blocked.

### 4. Action Items:
* [x] **Dustin & Renz:** Update `docker-compose.yml` with `--replSet rs0` and update `init-mongo.js` to initialize the replica set.
* [x] **Mae:** Update `MONGO_URI` connection options to include `replicaSet=rs0`.
* [x] **Mae:** Verify that `session.withTransaction()` successfully commits all three documents on task dispatch and rolls back completely if an error is injected.

---

## 5. Impact Assessment

* **Files Affected:** `docker-compose.yml`, `.env.example`, `/docker/mongo/init-mongo.js`
* **Contracts Affected:** None (0% change).
* **Schemas Affected:** None (0% change).
* **Reliability Result:** The system guarantees atomic all-or-nothing writes for task dispatching and welfare status transitions.
# Database 2.1 — Replica Set Implementation for Transaction Support

**Author:** Dustin Martinez (Database Architecture Lead)
**Date:** 2026-09-29
**Status:** COMPLETE
**Related Decisions:** DECISION-005, DECISION-006
**Scope:** Local development and defense demonstrations

---

## 1. Purpose

This report documents the implementation of DECISION-006: running MongoDB as a
single-node replica set (`rs0`) to enable `session.withTransaction()` for atomic
task dispatching in the backend.

It covers the design, the deviations from the original decision text, the
verification steps, and the reasoning behind each technical choice.

---

## 2. Requirements

From DECISION-006:

- Local development and defense demonstrations use an **authenticated single-node replica set (`rs0`)**.
- Multi-node clustering with failover is deferred to production cloud deployment.
- `docker-compose.yml` launches `mongod` with `--replSet rs0`.
- `init-mongo.js` initializes the replica set on boot.
- `.env.example` sets `MONGO_URI` with `?replicaSet=rs0`.
- DECISION-005 role harmonization: `createIndex` granted on `audit_logs` so
  index inspection succeeds while `update`/`delete` remain blocked.

---

## 3. Implementation

### 3.1 `docker-compose.yml` — `db` service

MongoDB runs with the replica set flag, keyfile, and bind-ip-all:

    entrypoint: >
      bash -c '
        if [ ! -f /keyfile/mongo-keyfile ]; then
          mkdir -p /keyfile &&
          openssl rand -base64 756 | tr -d "\n" > /keyfile/mongo-keyfile &&
          chmod 0400 /keyfile/mongo-keyfile
        fi
        chown 999:999 /keyfile/mongo-keyfile
        exec docker-entrypoint.sh mongod --replSet rs0 --keyFile /keyfile/mongo-keyfile --bind_ip_all
      '

Volumes:

- `mongo-data:/data/db` — database files
- `mongo-keyfile-data:/keyfile` — persistent keyfile storage
- `./docker/mongo/init-mongo.js:/docker-entrypoint-initdb.d/init-mongo.js:ro` — init script

### 3.2 `docker-compose.yml` — `replset-init` service

A one-shot service that runs after `db` is available. Authenticates as
`admin_user`, calls `rs.initiate()`, and waits for PRIMARY election:

    replset-init:
      image: mongo:6.0
      container_name: kilosunlad-replset-init
      depends_on:
        - db
      entrypoint: >
        bash -c '
          echo "Waiting for mongod...";
          until mongosh --host db:27017 --username admin_user --password RootAdminSecret2026! --authenticationDatabase admin --quiet --eval "db.adminCommand({ping: 1})" > /dev/null 2>&1; do
            sleep 2;
          done;
          echo "mongod is up. Initializing replica set...";
          mongosh --host db:27017 --username admin_user --password RootAdminSecret2026! --authenticationDatabase admin --quiet --eval "
            try {
              rs.status();
              print(\"Replica set already initialized.\");
            } catch (e) {
              rs.initiate({ _id: \"rs0\", members: [{ _id: 0, host: \"db:27017\" }] });
              print(\"Replica set initialized.\");
            }
          ";
          echo "Waiting for PRIMARY election...";
          until mongosh --host db:27017 --username admin_user --password RootAdminSecret2026! --authenticationDatabase admin --quiet --eval "rs.status().myState === 1" > /dev/null 2>&1; do
            sleep 2;
          done;
          echo "Replica set is PRIMARY. Done.";
        '
      networks:
        - kilosunlad-network
      restart: "no"

### 3.3 `docker-compose.yml` — `server` service

`depends_on` gates startup on the replica set being ready:

    depends_on:
      db:
        condition: service_started
      replset-init:
        condition: service_completed_successfully
      ml-service:
        condition: service_started

`MONGO_URI` includes the replica set name:

    mongodb://app_user:AppUserPassword2026!@db:27017/kilosunlad?replicaSet=rs0&authSource=kilosunlad

### 3.4 `docker/mongo/init-mongo.js`

Creates the `kilosUnladAppRole` custom role and provisions the 6 core
collections with indexes. Per DECISION-005, `audit_logs` grants:

    ['find', 'insert', 'createIndex']

Update and delete remain blocked.

---

## 4. Deviations from DECISION-006

Two deviations were required. Both are justified and do not change the
decision's intent.

### Deviation 1 — `rs.initiate()` moved out of `init-mongo.js`

DECISION-006 stated that `init-mongo.js` would call `rs.initiate()` on boot.

**Reason for change:** `init-mongo.js` runs during the entrypoint's
initialization phase, before `mongod` is ready to accept replica set commands.
Calling `rs.initiate()` there fails with:

    MongoServerError: This node was not started with replication enabled.

The replica set must be initiated after `mongod` is fully running.

**Resolution:** `rs.initiate()` now runs in the separate `replset-init` service,
which polls for `mongod` readiness, authenticates as `admin_user`, calls
`rs.initiate()`, and waits for PRIMARY. Idempotent via `try/catch` around
`rs.status()`.

**Effect:** Functionally equivalent. Replica set is initialized on boot.

### Deviation 2 — `--keyFile` added to the mongod command

DECISION-006 stated the command would be:

    mongod --replSet rs0 --bind_ip_all

**Reason for change:** With `--replSet` enabled and authorization active
(`MONGO_INITDB_ROOT_USERNAME` / `MONGO_INITDB_ROOT_PASSWORD` set), MongoDB
requires a keyfile for internal authentication. Startup fails without it:

    BadValue: security.keyFile is required when authorization is enabled with replica sets

**Resolution:** A keyfile is generated inside the container on first boot,
stripped of trailing newlines via `tr -d "\n"`, and chowned to the MongoDB
user (UID 999):

    openssl rand -base64 756 | tr -d "\n" > /keyfile/mongo-keyfile
    chmod 0400 /keyfile/mongo-keyfile
    chown 999:999 /keyfile/mongo-keyfile

The keyfile persists in a named Docker volume (`mongo-keyfile-data`).

**Effect:** MongoDB starts with both replica set and auth enabled, as intended.

---

## 5. Why These Approaches Were Chosen

### 5.1 Keyfile generated inside the container, not mounted from the host

**Why not mount a host file?**

Docker Desktop on Windows does not propagate POSIX file permissions into Linux
containers. A mounted keyfile is readable by all users, or unreadable by the
MongoDB user, depending on how the mount resolves. MongoDB rejects either state.

**Alternative considered:** Mount a pre-generated host keyfile with a wrapper
entrypoint that copies it and chmods the copy.

**Why not used:** Still requires the host file to exist and remain synced
(OneDrive introduces additional risk). Generating the keyfile inside the
container avoids the host entirely.

### 5.2 `chown 999:999` after generation

**Why needed:** Even inside the container, a keyfile created as `root` (the
default entrypoint user) is not readable by MongoDB's runtime user (`mongodb`,
UID 999). On the second boot after `docker-entrypoint.sh` restarts `mongod`,
the process runs as UID 999 and cannot read a root-owned keyfile.

**Effect:** `chown 999:999` ensures MongoDB can read the keyfile on every boot.

### 5.3 Separate `replset-init` service instead of `rs.initiate()` in init script

**Why not keep it in `init-mongo.js`?**

`init-mongo.js` runs before `mongod` is fully started. Replica set commands are
rejected. Polling is required. Polling inside an init script blocks the
entrypoint and interferes with MongoDB's two-phase startup.

**Effect:** The separate service runs cleanly after `db` is healthy.

### 5.4 Auth credentials in the `replset-init` service

**Why needed:** With authorization enabled, `replSetInitiate` requires an
authenticated user. Without credentials, the command fails with:

    MongoServerError: command replSetInitiate requires authentication

**Effect:** The service authenticates as `admin_user` before calling
`rs.initiate()`.

---

## 6. Verification

### 6.1 Replica set state

    docker exec -it kilosunlad-db mongosh -u admin_user -p RootAdminSecret2026! \
      --authenticationDatabase admin \
      --eval "rs.status().members[0].stateStr"

**Result:** `PRIMARY`

### 6.2 Server connection

Server logs:

    >> [MongoDB] Connected successfully: db/kilosunlad
    >> [KilosUnlad Server] Running in development mode on port 5000

### 6.3 Append-only enforcement on `audit_logs`

    docker exec -it kilosunlad-db mongosh \
      "mongodb://app_user:AppUserPassword2026!@localhost:27017/kilosunlad?replicaSet=rs0&authSource=kilosunlad" \
      --eval "try { db.audit_logs.updateOne({}, { \$set: { test: 1 } }); print('FAIL'); } catch (e) { print('PASS — ' + e.codeName); }"

**Result:** `PASS — Unauthorized`

### 6.4 Index creation on `audit_logs` by `app_user`

Server startup logs show index creation succeeding:

    "command":{"createIndexes":"audit_logs","v":2,"indexes":[{"background":true,"name":"target_entity.entity_id_1",...}]}

    "msg":"Index build: done building","attr":{...,"namespace":"kilosunlad.audit_logs","index":"target_entity.entity_id_1",...}

**Result:** Index created successfully. Confirms DECISION-005 harmonization.

### 6.5 `replset-init` completion

    kilosunlad-replset-init | Replica set is PRIMARY. Done.
    Container kilosunlad-replset-init Exited
    kilosunlad-replset-init exited with code 0

---

## 7. Impact

- **Contracts:** No changes.
- **Schemas:** No changes.
- **Phases:** DECISION-006 implementation complete.
- **Other services:** No changes required to `server`, `client`, `ml-service`, `gateway`.
- **Production:** Single-node replica set is for local development and defense demonstrations. Multi-node production topology is deferred per DECISION-006.

---

## 8. Files Changed

- `docker-compose.yml` — added `replset-init` service; updated `db` entrypoint with keyfile generation, `chown`, and `--keyFile`; added `mongo-keyfile-data` volume; updated `server` `depends_on`.
- `.env.example` — `MONGO_URI` includes `?replicaSet=rs0`.
- `docker/mongo/init-mongo.js` — unchanged (already grants `createIndex` on `audit_logs`).

---

## 9. Known Limitations

- Single-node replica set provides no fault tolerance. If the container stops, MongoDB is unavailable. This is acceptable for local development and demos.
- Keyfile is generated locally. For multi-node production deployments, a shared keyfile from a secret manager would be required.
- Root credentials are in `docker-compose.yml` for local development. Production deployment would use environment-specific secrets.

---

## 10. References

- DECISION-005 — Custom Database Role for Append-Only Audit Log Enforcement
- DECISION-006 — Transaction-Capable MongoDB Deployment for Backend Workflows
- `docker-compose.yml`, `.env.example`, `docker/mongo/init-mongo.js`
- MongoDB Documentation — Replica Set Keyfile Authentication
- MongoDB Documentation — Transactions Production Considerations

---

**End of Report**
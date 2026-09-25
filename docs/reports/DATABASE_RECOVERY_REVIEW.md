# Backend response to Dustin's connection-pool review

Date: 2026-09-24. Addresses Section 4 of Dustin's Phase 2 database report on
`database-phase2`. This is backend verification only, not approval of that branch.

## Interpretation and implementation

The roadmap's disconnect/reconnect DoD describes runtime loss of an established
connection. Initial startup failure remains separate: no HTTP listener starts,
and `server.js` exits with status 1 if the initial connection fails.

`src/config/database.js` preserves `maxPoolSize: 10`,
`serverSelectionTimeoutMS: 5000`, and `socketTimeoutMS: 45000`. It now registers
`disconnected`, `reconnected`, and `error` observers once per connection. The
driver performs reconnection; observers do not call `connect()` again or exit the
process. Error logs exclude raw connection errors/credentials. Startup errors are
rejected to the entry point rather than calling `process.exit()` from the module.

## Evidence

`test/databaseLifecycle.test.js` uses a disposable MongoDB 6 Docker container,
an isolated Mongoose client, and the real Express app/auth service. It stops and
restarts only that test container, on a fixed temporary localhost port.

- Before outage: a nonexistent synthetic username returns 401 after a DB query.
- During outage: the same HTTP listener stays alive; `/health` returns 200 and
  the database-dependent login returns sanitized 503 `SERVICE_UNAVAILABLE`.
- After restart: the same client reconnects and the login query returns 401 again,
  without a manual reconnect call or replacement HTTP listener.
- Disconnect/reconnect messages are observed, with no duplicate listeners.
- The test removes its container and disposable volumes on completion.

Historical 2026-09-24 working-tree run: 50 passed, 0 failed, 1 skipped. The separate optional
transaction replica-set suite was not enabled. This run includes the local ML
tests; it does not imply those changes have been committed or pushed.

Run from `server/` with Docker available:

```powershell
$env:RUN_DB_RECOVERY_TESTS = '1'
# Optional if Docker is not on PATH:
$env:DOCKER_PATH = "$env:LOCALAPPDATA/Programs/DockerDesktop/resources/bin/docker.exe"
node --test test/databaseLifecycle.test.js
Remove-Item Env:RUN_DB_RECOVERY_TESTS, Env:DOCKER_PATH -ErrorAction SilentlyContinue
```

## Limits and follow-up

`/health` remains process liveness, not database readiness. Database operations
can fail during an outage; surviving it does not mean requests keep succeeding.
The integration harness uses the actual connection helper/app within the Node test
process, not the full production entrypoint or five-service Compose deployment.

Dustin's custom append-only role was not installed in the recovery test. A separate
`auditRoleCompatibility.test.js` now verifies its audit privilege subset in a
disposable authenticated MongoDB 6 container: find/insert succeed, while index
inspection, update, and delete fail with Unauthorized (code 13). This confirms
the workflow's `audits.collection.indexes()` requires coordination on `listIndexes`
access. Mongoose initialization also needs review under the restricted role.
Do not broaden audit update/delete permissions to fix metadata access.
Transaction-capable deployment is a separate requirement. Run this check with
`RUN_AUDIT_ROLE_TESTS=1` and the same optional DOCKER_PATH, using
`node --test test/auditRoleCompatibility.test.js`.

## Current follow-up (2026-09-25)

See [backend verification status](BACKEND_VERIFICATION_STATUS.md) for the latest
all-enabled test results. Replica-set deployment and index-readiness ownership
await Renz's resolution in [Decision 006](../decisions/006-backend-transaction-deployment.md).
They are not automatically assigned to Dustin. Setting autoIndex false does not
disable the workflow's explicit collection.indexes() inspection.

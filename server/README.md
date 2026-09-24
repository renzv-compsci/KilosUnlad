# Mae's backend: authentication and Phase 1 fixtures

## Run

With Node.js 20 (matching the Docker image) and npm available, run from `server/`:

```powershell
npm ci
npm test
```

The normal entrypoint requires MongoDB before listening on port 5000. With the
repository's database container running and its default development credentials:

```powershell
$env:MONGO_URI = 'mongodb://app_user:AppUserPassword2026!@localhost:27017/kilosunlad?authSource=kilosunlad'
$env:JWT_SECRET = node -e "process.stdout.write(require('crypto').randomBytes(32).toString('hex'))"
npm start
```

Alternatively, from the repository root with Docker available:

```powershell
docker compose up -d db
docker compose build server
# Set JWT_SECRET securely in this shell first, then pass it to the container.
docker compose run --service-ports --no-deps -e JWT_SECRET server npm start
```

Verify `http://localhost:5000/health` and the successful MongoDB connection log.
`npm test` uses isolated repositories without MongoDB. To repeat the login and
authorization tests against a local MongoDB instance, from `server/` run:

```powershell
$env:TEST_MONGO_URI = 'mongodb://127.0.0.1:27017'
node --test test/login.test.js
Remove-Item Env:TEST_MONGO_URI
```

This creates a uniquely named `kilosunlad_auth_test_*` database, exercises real
Mongoose User queries and bcrypt, then deletes only that test database. Supply
credentials with permission to create/drop the test database if MongoDB requires
authentication. It never seeds or resets the application's `kilosunlad` database.

## Database disconnect/reconnect handling

The backend now observes database disconnect, reconnect, and error events once
per connection. Runtime reconnection is handled by the driver; an initial
connection failure still stops startup before the HTTP listener opens.
`/health` remains a liveness check, not database readiness. See
[database recovery review](../docs/reports/DATABASE_RECOVERY_REVIEW.md) for isolated Docker
verification, rerun instructions, and the outstanding audit-role compatibility check.

## Endpoints and modes

| Method | Path | Contract |
| --- | --- | --- |
| POST | `/api/v1/auth/login` | `auth/auth-session.json` |
| GET | `/api/v1/beneficiaries/triage-queue` | `admin-web/admin-triage-feed.json` |
| GET | `/api/v1/tasks/assigned` | `field-tablet/field-task-download.json` |

By default, login validates the existing User's bcrypt password hash and active
status, then returns the contract's field structure with a real 900-second JWT.
Username normalization matches the User schema. No sample accounts are created.
After successful credential validation, `last_login_at` is persisted using the
approved User field; failed logins do not advance it. The HTTP login controller
delegates this write to the auth service. Password hashes are never
included in session responses. The access lifetime is fixed to the contract's
900 seconds; `JWT_EXPIRES_IN` is not used by this login implementation.

The two data endpoints read MongoDB in normal mode, including production. Triage
allows SUPER_ADMIN, REGIONAL_DIRECTOR and COA_AUDITOR; records and summary counts
are jurisdiction-scoped. Assigned tasks allow CASE_WORKER and return only their
PENDING_DISPATCH/CACHED_OFFLINE tasks whose households remain in scope. Missing
households are excluded. Both responses use Cache-Control: no-store, with no
mock header or fallback. Database failures return sanitized 503 responses.

Triage accepts province, municipality, barangay, status, page and limit (default
1/10; maximum limit 100). Rows sort by evaluated_at descending then household ID.
Summary cards cover the authorized geographic filters across statuses; status
filters only the paginated table. High risk means composite score >= 70.
Assigned tasks accept no query parameters; worker identity comes from the session.
Tasks sort by due date then task ID. Optional missing phone/street/instructions
map to empty strings; absent prediction/evaluation time map to null rather than
fabricated values. These missing-value and card semantics are backend choices
where the example contracts do not specify behavior; confirm with frontend/PM.
Run live feed tests with TEST_MONGO_URI pointing to a development MongoDB: the
suite creates and removes its own uniquely named database.

For the legacy unauthenticated Phase 1 frontend demo only, explicitly set
`PHASE1_MOCK_MODE=true` before starting the server. This mode returns the original
contract fixtures, including the placeholder login token, and ignores credentials.
It is rejected at startup in production. The default is false. Never use mock mode
as evidence that real authentication or database-backed business endpoints work.
Frontend base URL: `http://localhost:5000/api/v1`. Default allowed origins are
`http://localhost:3000` and `http://localhost`; configure `CORS_ORIGIN` for others.

## Phase 2 authentication middleware

`src/middleware/auth.middleware.js` exports `authenticate` and a
`createAuthenticate({ secret, findCurrentUser })` factory. It accepts signed HS256 Bearer tokens
with `userId`, a recognized `role`, and a finite `exp`; token expiry and `nbf`
are verified. Mounted routes also reload the current user from MongoDB, rejecting
deleted/inactive accounts and using current roles/jurisdiction rather than stale
token claims. Set a random `JWT_SECRET` of at least 32 characters before using it:
missing configuration, a short secret, or the built-in development
fallback returns 503. Invalid tokens return 401 without leaking verification details.

`src/middleware/rbac.middleware.js` exports:

- `allowRoles(...roles)`: explicit per-route permission; COA auditors are read-only.
- `scopeJurisdiction`: for directors and case workers, requires authenticated region,
  province, municipality, and a nonempty `assigned_barangays` array. It rejects
  explicit out-of-area query filters with 403 and sets `req.jurisdictionFilter`.
  Combine this filter with validated business filters using `$and` in every
  collection query, count, and aggregation; never overwrite it with client input.
- `requireJurisdiction(req => req.record.address)`: checks a server-loaded
  record's province, municipality, and barangay. Never resolve its address from
  request bodies or query parameters. Load the record before this check, and do
  not return or mutate it until authorization succeeds.

Order for future protected routes: `authenticate`, `allowRoles(...)`, then
collection scoping or record loading plus `requireJurisdiction(...)`, then handler.
National roles have no geographic restriction but still need explicit route
permission. Scoped users with incomplete assignments fail closed (403).

Expired tokens return the contract's `TOKEN_EXPIRED` response; jurisdiction failures
return `OUT_OF_JURISDICTION`. Missing/forged tokens return 401 `UNAUTHORIZED`;
role denials return 403 `FORBIDDEN`. Database errors return sanitized 503 responses.
The token-only factory remains available for isolated unit tests; application
routes always provide the current-user lookup. Password-change/session-specific
revocation and refresh/logout flows are not implemented. Model schemas are unchanged.

## Phase 2 workflow guard (in progress)

`src/services/workflow.service.js` exports `assertTransition(currentStatus, requestedStatus)`.
It permits only consecutive steps in the documented lifecycle from
`ACTIVE_COMPLIANT` through `GRADUATED`. Other transitions throw a typed
`INVALID_STATUS_TRANSITION` error, serialized as HTTP 400. Run `npm test`.

The dispatch endpoint uses this guard with stored state, RBAC and jurisdiction,
and atomic status/task/audit persistence. The guard alone does not authorize
graduation. Calamity/resumption and retention rules remain undefined. Appeal
storage/contracts and dispatch deployment verification are pending; Tasks 2.2
through 2.4 remain unchecked.

### Internal database workflow service

`createWorkflowPersistence` in `src/services/workflowPersistence.service.js` adds
transactional persistence using the existing User, Beneficiary, and AuditLog models.
It reloads the actor and household, applies the existing role/jurisdiction guards,
checks the expected stored status, and saves the status and audit entry together.
Stale or concurrent changes return `WORKFLOW_CONFLICT` (409); denied operations
make no changes. Existing unique audit sequence indexes prevent parallel chain
forks. Missing indexes fail closed. Audit records use the accepted hash formula.

This internal infrastructure is now used by the dispatch service.
Construct it only in trusted backend code with an explicit policy:
`{ from, to, roles, action, perform }`. Optional `precheck` validates workflow
prerequisites before the expected-status check; `auditDelta` supplies associated
before/after changes. Never accept policy, actor identity, or an authorization decision
from a request body; use the authenticated actor ID. `perform({ record, actor,
session })` must check the workflow's prerequisites, make associated writes with
the supplied session, and return exactly `true`. It may run again on transaction
retry, so it must not send notifications or perform external side effects.
Appropriate action semantics and complete audit deltas for additional entities
remain the responsibility of each workflow. The test-only dispatch policy does
not implement task creation and must not be used as a production policy.

MongoDB transactions require a replica set or sharded cluster. The service has
no nontransactional fallback. Shared Docker/database configuration is unchanged;
deployment readiness must be coordinated with the database owner before using
live write routes. Appeal storage and other workflow-specific policy decisions remain
pending, so Task 2.2 remains in progress.

Run the integration checks on an automatically created, disposable localhost
replica set (requires an installed `mongod`; does not use the application database):

```powershell
$env:RUN_WORKFLOW_MONGO_TESTS = '1'
$env:MONGOD_PATH = 'C:/Program Files/MongoDB/Server/8.3/bin/mongod.exe'
npm test
Remove-Item Env:RUN_WORKFLOW_MONGO_TESTS, Env:MONGOD_PATH
```

The test stops its MongoDB process and removes only its generated temporary data
directory. Without the opt-in variable, the replica-set integration suite is skipped.

## Task dispatch (implemented; deployment verification pending)

`POST /api/v1/tasks/dispatch` is mounted in normal authenticated mode for
SUPER_ADMIN and REGIONAL_DIRECTOR. It is not available in legacy Phase 1 mock
mode. It consumes `admin-task-dispatch.json` fields and returns its data shape
with HTTP 201. Live GET feeds can return newly dispatched records within the
authenticated user's scope.

The service reloads the actor, household and worker inside the transaction. Both
director and assigned active CASE_WORKER must cover the household jurisdiction.
The household must be FLAGGED_FOR_REVIEW. Open tasks are PENDING_DISPATCH,
CACHED_OFFLINE, or SUBMITTED; they return the exact ACTIVE_TASK_EXISTS 409 error.
Missing households return the exact HOUSEHOLD_NOT_FOUND 404 error. Other invalid
input/worker, role/scope, or conflicting-state errors return 400/403/409.

Approved priorities are LOW, MEDIUM, HIGH, CRITICAL; omitted priority defaults to
HIGH. Notes are trimmed, omitted notes become empty, and a timezone-qualified ISO
due date is required. No additional future-date policy has been imposed. Task IDs
use `TSK-<UTC year>-<UUID>`; the frozen contract supplies a string example, not a
sequence-allocation rule. `dispatched_at` comes from the stored task's createdAt.

Task creation, household transition and TASK_DISPATCHED audit append commit or
roll back together. The sealed delta includes dispatch metadata and household
identity without altering the approved hash format. Concurrent requests for one
household produce one task. MongoDB must support transactions and have the
existing unique audit sequence index. Unsupported database setup fails closed
with a sanitized 503; there is no partial-write fallback.

Isolated replica-set tests passed for the HTTP contract, denied roles/workers,
scope checks, duplicates/concurrency, stored metadata, sealed delta, and audit
failure rollback. Real-Mongo login tests verified successful timestamp persistence
and no timestamp change on failed credentials. The full run passed 60 tests and
skipped the independent Docker recovery test. A separate authenticated MongoDB
test confirmed the proposed audit role denies index inspection: coordinate
`listIndexes` metadata access and Mongoose initialization with Dustin before
deployment approval. Do not grant audit update/delete privileges.

## Phase 2 appeal timing helpers (in progress)

`src/services/appealLifecycle.service.js` exports:

- `calculateAppealDeadline(noticeAt)`: accepts a valid `Date` and returns a new
  `Date` exactly 15 elapsed days later without changing its input.
- `assertAppealWindowElapsed({ programStatus, noticeAt, appealDeadline, hasAppeal,
  isPaused, now })`: requires notice status, a deadline at least 15 days after
  notice, explicit `false` for both hold flags, and `now >= appealDeadline`.
  `now` defaults to the server clock. All supplied times must be valid `Date`
  objects. Invalid or unknown data fails closed with an `AppealLifecycleError`.

These are internal timing prerequisites, not a public API or authorization to
graduate. Their parameter names do not define new schema fields or a new frozen
contract. Callers must eventually obtain these values from approved persistent
storage, inside the authorized transaction. They must not trust client-supplied
hold flags or timestamps. No production workflow invokes these helpers yet.

The calculation implements the roadmap's `now + 15 days` as 15 times 24 hours;
it does not apply business-day, midnight, or notice-service rules. An existing
appeal or pause always blocks this helper; resolution and timer resumption are
pending decisions. Task 2.3 remains incomplete until storage, docket API, and live
workflow integration are agreed and tested. The full opt-in test run passes 51 tests.

## Hash format

`computeEntryHash` preserves the existing colon-separated field format:

```text
SHA-256(sequenceIndex:previousEntryHash:timestamp:actorId:action:canonicalDelta)
```

Timestamps normalize to UTC ISO strings with milliseconds. Delta object keys are
sorted recursively with `fast-json-stable-stringify`; array ordering and JSON
scalar values are preserved. Missing deltas default to `{}`. All future writers
and verifiers must use this same helper and format.

## Backend reviews and handoff

- [Frontend authentication handoff](../docs/handoffs/FRONTEND_AUTH_HANDOFF.md)
- [Database recovery review](../docs/reports/DATABASE_RECOVERY_REVIEW.md)
- [Phase 2 gap review](../docs/reports/PHASE2_GAP_REVIEW.md)

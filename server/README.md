# Mae's backend: authentication, dispatch and live feeds

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

## Current verification

See [backend verification status](../docs/reports/BACKEND_VERIFICATION_STATUS.md) for current test counts, optional-suite flags, build evidence and pending acceptance.
Older dated counts below are historical, not the current suite total.

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
deployment readiness and ownership await Renz through Decision 006 before using
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

## Phase 3 ML client (in progress)

`createMlClient()` from `src/services/mlClient.service.js` exposes
`predict({ household_id, demographics })`, using the configured `ML_SERVICE_URL`
origin and `/api/v1/predict-swdi`. The request contains only the six contract
features. Values are validated without string-to-number coercion, using the
documented model bounds and integer counts/levels. Unknown properties are rejected.

The client expects the contract's response data directly, not a `{ data: ... }`
wrapper. It checks household identity, SWDI level, three probabilities in [0,1],
SHAP feature names/numeric weights/descriptions, and a timezone-qualified ISO date.
Probability totals allow a 0.01 rounding tolerance around 1; this is a local
validation choice, not a shared-contract edit. Empty explanation arrays are allowed.

The fixed 2500 ms deadline covers connection and response time, with no automatic
retries or redirects. It intentionally does not use the configurable timeout to
extend the roadmap's deadline. Responses are limited to 1 MiB. Errors expose only
`INVALID_FEATURE_VECTOR`, `ML_TIMEOUT`, `ML_UNAVAILABLE`, or `INVALID_ML_RESPONSE`
and safe messages; Axios configuration and upstream details are not propagated.

This internal service is not mounted on a public route and does not persist data.
Callers must catch its typed errors. Fallback calculation and tagging remain
pending clarification; the client does not pretend an outage is a valid prediction.
Tests use local HTTP fixtures and do not prove live ML readiness. On 2026-09-28,
`node --test test/mlClient.test.js` passed all eight tests with zero skips. This
includes a continuously streaming response that still aborts at the overall
deadline and a response exceeding the 1 MiB limit that returns a sanitized error.

Task 3.1 remains in progress. The local ML inference schema and predict endpoint
files are empty, so this checkout does not provide a live inference implementation
for acceptance testing. Fallback integration also needs an agreed utility-only
scoring policy (including missing/stale external records), the storage location
and lifecycle of `EVALUATED_VIA_FALLBACK`, and its transactional audit behavior.
The architecture requires this fallback, but the inference contract supplies
demographics rather than utility records; fallback belongs in the backend workflow
that loads those records, not in a fabricated ML response.

## Phase 3 submission preparation (in progress)

`prepareSubmission(input, routeTaskId)` from `src/services/sync.service.js`
validates the flat `field-task-submission.json` request and returns
`{ task_id, household_id, field_findings }` for the existing task model. It rejects
unknown properties, numeric/boolean strings, invalid enums, invalid coordinates,
negative GPS accuracy, timestamps without timezones, malformed SHA-256 strings,
and mismatched route/body task IDs. Errors use internal HTTP 400 code
`INVALID_SUBMISSION_REQUEST`; this is not an addition to the frozen contract.

Current preparation rules require the top-level contract fields, permit an empty
franchise number, allow JPEG/PNG/WebP metadata and HTTP(S) storage URLs, and allow
empty evidence arrays or absent EXIF. Evidence sufficiency remains a workflow
policy to agree before exposing the route. URLs are not fetched and hash strings
are not treated as proof of binary integrity.

`verifyGeofence` accepts captured latitude/longitude and stored GeoJSON
`[longitude, latitude]`. Invalid inputs return an unmatched result with null
distance. Matching uses full precision with the existing inclusive 250 m limit;
only the reported distance is rounded to one decimal. Consequently an unmatched
point just beyond the boundary may display as 250.0 m. `calculateDistanceMeters`
returns unrounded metres or null for invalid coordinates. The backend prompt's
`<= 250 m` and task list's `< 250 m` need reconciliation before live acceptance.

Verification on 2026-09-28:
`node --test test/submissionPreparation.test.js test/geoFence.test.js` —
8 passed, zero failures/skips. These are pure preparation tests.

`createSubmissionAuthorizer()` adds a read-only authorization preflight. Pass
`{ input, routeTaskId, actorId, session }`, with actorId from verified authentication.
It reloads the active worker, queries the task by worker ownership, checks the
stored household against current jurisdiction, and accepts only PENDING_DISPATCH
or CACHED_OFFLINE tasks. Missing and other-worker tasks both return TASK_NOT_FOUND;
already submitted/resolved tasks return TASK_NOT_SUBMITTABLE. These internal error
codes are not changes to the frozen public contract.

Authorization/preparation verification: 11 tests passed, zero skips, using injected
model doubles (`node --test test/submissionAuthorization.test.js test/submissionPreparation.test.js`).
Live MongoDB and HTTP acceptance remain pending. The preflight performs no writes
and cannot guarantee authorization remains valid afterward. Transactional integration
must repeat the checks and condition writes on stored ownership/status to prevent
reassignment or duplicate-submission races. Task 3.2 still needs trusted image-byte
access, hash-check integration, replay policy, atomic task/audit writes and controller integration.

`verifyEvidenceHash(bytes, expectedHash)` in `sync.service.js` now verifies a
nonempty Node Buffer against a 64-character SHA-256 hex digest. Matching input
returns the computed lowercase digest; altered bytes return the exact contract
422 `EVIDENCE_HASH_MISMATCH` message through the existing error middleware.
Invalid bytes/hash syntax return internal 400 `INVALID_EVIDENCE_INPUT`.
URLs, base64 strings and JSON Buffer objects are not treated as trusted bytes.
The caller must obtain bytes through an authorized, size-limited storage/upload
adapter and bind them to the evidence attachment. This helper proves byte integrity,
not image validity, ownership or authenticity; it performs no fetching or persistence.

Evidence hash, preparation and authorization suites: 16 passed, zero failures/skips
on 2026-09-28. Five hash tests cover matching bytes, tampering/truncation, invalid
inputs, buffer slices and the exact mismatch response. Task 3.2 remains incomplete.

## Phase 3 risk calculator (in progress)

`calculateRiskScore` from `src/services/discrepancy.service.js` accepts
`{ swdiDifference, power, water, telecom, vehicle }`. This is an internal helper,
not a public API. The supplied SWDI difference must be an integer from 0 to 2;
all indicators must be explicit booleans. This provisional nonnegative-gap
interface does not decide whether to subtract, clamp or take an absolute value
of stored/predicted SWDI levels. Live mapping requires an agreed policy.

The helper returns `{ score, meetsFlagThreshold, contributions }`. Weights are
40 per SWDI level, 20 power, 15 water, 25 telecom and 30 vehicle. Contributions
are uncapped; the total is capped at 100 and meets the flag threshold at 70.
Missing inputs are rejected rather than assumed false. Meeting the threshold
alone does not authorize a status change, dispatch or graduation.

Verification: `node --test test/discrepancy.test.js` — 4 passed, zero skips
on 2026-09-28. Task 3.3 still requires agreed record-to-indicator rules, missing/
stale-data policy, ML integration, moratorium checks and transactional audit
persistence. Vehicle or high power alone does not reach 70 with this formula;
the task's DoD example needs clarification before acceptance.

## Phase 3 calamity check (in progress)

`hasActiveCalamityMoratorium({ zones, address, now })` in `calamity.service.js`
is a pure internal check using stored SystemConfig zone fields. Inputs require
valid Date objects, explicit active flags, and province/municipality names.
Both location fields must match exactly. Invalid configuration throws rather
than silently allowing compliance processing; callers must stop on errors.

Provisional semantics pending team confirmation: declaration time is inclusive,
expiry is exclusive, and omitted expiry is open-ended until deactivated. Explicit
null expiry and nonpositive intervals are rejected. Any matching active interval
holds, including when zones overlap. These rules are not yet wired to live writes.

On 2026-09-29, calamity and risk-calculator suites passed 10 tests with zero skips
(six new calamity tests). Task 3.4 still needs an approved toggle contract, role
and lifecycle rules, configuration selection, transactional audit writes and
integration into compliance workflows. A false result is not authorization to
flag or penalize a household.

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

- [Phase 3/4 backend handoff for Renz and Charles](../docs/handoffs/PHASE3_PHASE4_BACKEND_HANDOFF.md)

- [Phase 3 backend checkpoint](../docs/reports/PHASE3_BACKEND_CHECKPOINT.md)

- [Frontend authentication handoff](../docs/handoffs/FRONTEND_AUTH_HANDOFF.md)
- [Database recovery review](../docs/reports/DATABASE_RECOVERY_REVIEW.md)
- [Phase 2 gap review](../docs/reports/PHASE2_GAP_REVIEW.md)

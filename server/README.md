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

## Endpoints and modes

| Method | Path | Contract |
| --- | --- | --- |
| POST | `/api/v1/auth/login` | `auth/auth-session.json` |
| GET | `/api/v1/beneficiaries/triage-queue` | `admin-web/admin-triage-feed.json` |
| GET | `/api/v1/tasks/assigned` | `field-tablet/field-task-download.json` |

By default, login validates the existing User's bcrypt password hash and active
status, then returns the contract's field structure with a real 900-second JWT.
Username normalization matches the User schema. No sample accounts are created.
The returned `last_login_at` is this session's login timestamp, not persisted
login history (the User schema has no such field). Password hashes are never
included in session responses. The access lifetime is fixed to the contract's
900 seconds; `JWT_EXPIRES_IN` is not used by this login implementation.

The two data endpoints require real authentication. Their data is still fixture
data, marked `X-KilosUnlad-Mock: true`, and available only outside production.
Triage allows SUPER_ADMIN, REGIONAL_DIRECTOR, and COA_AUDITOR, filters by current
jurisdiction, and recomputes visible counts. Assigned tasks allow CASE_WORKER and
return only that worker's matching fixture tasks within current jurisdiction.
These are not database-backed beneficiary/task queries. Production authenticates
and authorizes these requests, then returns 503 `ENDPOINT_NOT_READY` until live
controllers are implemented; it never substitutes mock records.

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

## Hash format

`computeEntryHash` preserves the existing colon-separated field format:

```text
SHA-256(sequenceIndex:previousEntryHash:timestamp:actorId:action:canonicalDelta)
```

Timestamps normalize to UTC ISO strings with milliseconds. Delta object keys are
sorted recursively with `fast-json-stable-stringify`; array ordering and JSON
scalar values are preserved. Missing deltas default to `{}`. All future writers
and verifiers must use this same helper and format.

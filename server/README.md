# Mae's backend: Phase 1

## Run

With Node.js 20 (matching the Docker image) and npm available, run from `server/`:

```powershell
npm install
npm test
```

The normal entrypoint requires MongoDB before listening on port 5000. With the
repository's database container running and its default development credentials:

```powershell
$env:MONGO_URI = 'mongodb://app_user:AppUserPassword2026!@localhost:27017/kilosunlad?authSource=kilosunlad'
npm start
```

Alternatively, from the repository root with Docker available:

```powershell
docker compose up -d db
docker compose up --build --no-deps server
```

Verify `http://localhost:5000/health` and the successful MongoDB connection log.
The API tests start Express on a temporary port without connecting to MongoDB.
They do not verify database connectivity.

## Mock endpoints

| Method | Path | Contract |
| --- | --- | --- |
| POST | `/api/v1/auth/login` | `auth/auth-session.json` |
| GET | `/api/v1/beneficiaries/triage-queue` | `admin-web/admin-triage-feed.json` |
| GET | `/api/v1/tasks/assigned` | `field-tablet/field-task-download.json` |

HTTP status comes from `response.status`; the JSON body is `response.data` from
each contract in `docs/contracts/`. Payload copies in `src/mocks/` keep the server
Docker image self-contained. Contract tests detect drift against the originals.

These Phase 1 endpoints return static fixtures, ignore credentials/query filters,
and do not enforce JWT or RBAC. The token is a contract placeholder. Responses
carry `X-KilosUnlad-Mock: true`; mock routes are disabled in production.
Frontend base URL: `http://localhost:5000/api/v1`. Default allowed origins are
`http://localhost:3000` and `http://localhost`; configure `CORS_ORIGIN` for others.

## Phase 2 authentication middleware (integration pending)

`src/middleware/auth.middleware.js` exports `authenticate` and a
`createAuthenticate({ secret })` factory. It accepts signed HS256 Bearer tokens
with `userId`, a recognized `role`, and a finite `exp`; token expiry and `nbf`
are verified. It sets `req.user` from verified claims only. Set a real
`JWT_SECRET` before using it: missing configuration or the built-in development
fallback returns 503. Invalid tokens return 401 without leaking verification details.

`src/middleware/rbac.middleware.js` exports:

- `allowRoles(...roles)`: explicit per-route permission; COA auditors are read-only.
- `scopeJurisdiction`: for directors and case workers, requires signed region,
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

These modules are currently exercised through isolated HTTP tests, not mounted
on the Phase 1 mock routes. The mock login still returns its placeholder token;
it cannot authenticate to protected routes. Database-backed login/token issuance,
current-account activation checks, and controller/model wiring remain pending.
The middleware trusts signed role/jurisdiction claims until token expiry; it does
not query account state or provide immediate revocation. No real user accounts
or database schemas were added.

## Hash format

`computeEntryHash` preserves the existing colon-separated field format:

```text
SHA-256(sequenceIndex:previousEntryHash:timestamp:actorId:action:canonicalDelta)
```

Timestamps normalize to UTC ISO strings with milliseconds. Delta object keys are
sorted recursively with `fast-json-stable-stringify`; array ordering and JSON
scalar values are preserved. Missing deltas default to `{}`. All future writers
and verifiers must use this same helper and format.

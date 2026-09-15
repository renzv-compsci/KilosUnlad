# Mae's backend: Phase 1

## Run

With Node.js 18/20 and npm available, run from `server/`:

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

## Hash format

`computeEntryHash` preserves the existing colon-separated field format:

```text
SHA-256(sequenceIndex:previousEntryHash:timestamp:actorId:action:canonicalDelta)
```

Timestamps normalize to UTC ISO strings with milliseconds. Delta object keys are
sorted recursively with `fast-json-stable-stringify`; array ordering and JSON
scalar values are preserved. Missing deltas default to `{}`. All future writers
and verifiers must use this same helper and format.

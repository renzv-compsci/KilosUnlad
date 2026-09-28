# Frontend Authentication Handoff

Updated: 2026-09-28. Scope: frontend implementation only; upstream main merged
without custom backend edits, database changes, or account provisioning.

## Backend Baseline

Branch synchronized with `origin/main` at `08eca5c` on Sept 28. This includes
merged PR #7, approved Decisions 005/006, and updated root `.env.example` and
Docker Compose configuration. No local credentials or database settings were changed.
The frontend live-feed compatibility work was based on `ac430bb`, including
`server/README.md`, `docs/handoffs/FRONTEND_AUTH_HANDOFF.md`, and the actual
`readFeeds.service.js` implementation. This supersedes the Sept 24 fixture-only
baseline. Merging source is not evidence of successful runtime authentication.

## Frontend Changes

- Login calls `POST /api/v1/auth/login`. No mock-user fallback or prefilled credentials.
- Only `SUPER_ADMIN`, `REGIONAL_DIRECTOR`, `CASE_WORKER`, and `COA_AUDITOR` are accepted.
- Session response requires `access_token`, `user_id`, identity, role, and jurisdiction.
- JWT shape, matching identity/role, and expiry are checked locally. This is NOT
  signature verification; backend middleware remains authoritative.
- Protected requests attach the bearer token. Expiry, protected 401, deactivation,
  and logout clear the UI session. Role/jurisdiction 403 shows denial without
  silently changing the user's role. No automatic refresh endpoint is assumed.
- Director/admin/auditor request triage; case workers request assigned tasks.
  COA triage has no dispatch action. Unknown roles never default to administrator.
- API errors, loading, and empty results are explicit. Triage/tasks never fall back
  to imported JSON. Normal-mode feeds now read MongoDB on the backend.
- Triage requests `status=FLAGGED_FOR_REVIEW`, `page`, and `limit=10`, with
  previous/next controls and the backend's total count. Existing search, municipality
  and severity filters apply to the current page, not a full-database search.
  Backend summary metrics span lifecycle statuses and are not mapped onto the
  existing sample dashboard cards, whose meanings differ.
- Missing SWDI prediction displays `Not available`; missing evaluation/dispatch
  timestamps remain null. No fabricated current timestamp or survival level.
  The cached indicator is set only after IndexedDB caching succeeds.
- Worker identity comes from login. IndexedDB drafts and task caches are scoped
  by authenticated user ID; legacy unowned drafts are preserved but not loaded.
- Dashboard totals and other unfinished workflows remain labeled sample previews.
  Backend now documents a transactional dispatch route, but the frontend dispatch
  preview is NOT connected to it. Worker selection and deployment readiness still
  need coordination. Appeals/settings are not verified live writes. Submission upload stays
  disabled until its backend contract is ready; local draft saving remains enabled.
- Cached assignments are not used to bypass failed authorization. Fresh API failure
  blocks the assigned-task screen rather than silently showing old records.

## Local Configuration

Frontend: `VITE_API_URL=http://localhost:5000/api/v1` (see `.env.example`).
Restart Vite after environment changes. Preview currently runs at
`http://127.0.0.1:3000/`.

Backend owner must use the agreed real-auth version and `server/README.md`:

- `PHASE1_MOCK_MODE=false`.
- A valid private `JWT_SECRET` of at least 32 characters, on the backend only.
- Reachable MongoDB and provisioned synthetic accounts.
- CORS permitting the exact frontend origin. `http://127.0.0.1:3000` and
  `http://localhost:3000` are different origins.

These backend settings were NOT changed in this frontend task. Port 5000 had no
listener on Sept 26. Do not put secrets, passwords, or real tokens in
frontend environment files, source, screenshots, or test reports.

## Verification Completed

- `npm test`: 26 passing frontend tests. Uses synthetic JWT-shaped values, an Axios
  test adapter, static component rendering, and fake IndexedDB. No real backend
  authentication or cryptographic verification is implied.
- Covers all four role shapes; legacy/unknown roles; malformed/expired sessions;
  invalid-login 401; unreachable API; mock-login rejection; bearer attachment;
  empty triage/tasks; protected 401; deactivation; role 403; stale-response logout
  protection; COA read-only UI; worker identity; per-user cache/draft isolation;
  explicit page requests, total/boundary controls, malformed pagination, nullable
  feed values and assigned-task requests without worker query overrides.
- `npm run typecheck`: passed.
- `npm run build`: passed; existing large-chunk warning remains (about 516 kB).
- Browser (Sept 24): API-unreachable login stays on the login screen, displays an inline
  error, and reload does not open a dashboard. Error layout checked at 390px mobile
  width with no horizontal overflow. This was a network-failure test, NOT a real
  backend invalid-credentials test.
- Dependency installation reported five audit advisories (four moderate, one high).
  No broad dependency upgrades or forced audit fixes were applied in this task.

## Required Accounts and Integration Checks

Coordinate provisioning with Dustin and API setup with Mae. Need active synthetic
accounts for each role plus an inactive account; exchange credentials privately.
For director/worker fixture visibility use the agreed jurisdiction exactly:

```json
{
  "region": "Region IV-A",
  "province": "Laguna",
  "municipality": "Calamba",
  "assigned_barangays": ["Palingon"]
}
```

Use each test worker's actual MongoDB user ID. Dustin should prepare pending/cached
tasks linked to in-scope households for that worker. The old hard-coded fixture
worker ID is no longer required. An authorized worker with no matching tasks
correctly receives HTTP 200 with an empty list.

All items below remain NOT RUN against the real backend:

| Check | Expected result |
| --- | --- |
| Correct login, each of four roles | 200 with real JWT, matching identity and role |
| Wrong password / unknown username | 401; no dashboard or stored session |
| Inactive account | 403 ACCOUNT_DEACTIVATED; no session |
| Admin/director/auditor triage | 200 with permitted seeded records and scoped counts |
| Case-worker assigned tasks | 200 with that worker's seeded tasks or valid empty list |
| Case worker requests triage | 403 |
| Admin/director/auditor requests worker tasks | 403 |
| Outside-jurisdiction request | Denied or scoped per endpoint contract |
| Assigned request with any query, including worker_id | 400 INVALID_QUERY per readFeeds.service.js |
| Triage next/previous with more than 10 flagged records | Correct server page and total, no missing page access |
| Missing/expired/tampered token | Backend 401; frontend clears rejected session |
| Reload, logout, expiry, and account switch | No cross-account records or stale session |

Record status codes and redacted response shapes, not passwords or token values.
Opening a sample dashboard is not evidence that these checks passed.

The backend handoff still contains an older row suggesting a worker_id override
is ignored. The implementation and README reject all assigned-feed query parameters;
the frontend therefore sends none. Confirm that documentation discrepancy with Mae.

## Team Update

Frontend login fallback remains disabled and roles match the backend. Compatibility
updates for the live feeds at ac430bb include triage pagination, actual backend
totals, and missing-value handling. 26 frontend tests pass. Actual login/JWT/RBAC
and live-record verification still await Mae's backend setup and Dustin's test
accounts/sample records. No backend files or shared data were changed.

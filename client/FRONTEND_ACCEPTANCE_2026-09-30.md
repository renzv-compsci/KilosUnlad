# Markie: Frontend Acceptance and Model Integration Handoff

Historical snapshot as of September 30. For the later UI handoff and review
instructions, see [Frontend review](FRONTEND_REVIEW.md). The blocked local setup
observations below must not be read as the current service status.

Date: 2026-09-30 (Asia/Manila)
Owner: Markie, frontend only. This is an actual local result record plus blocked
acceptance cases, not a claim that end-to-end integration passed.

## Versions and Decision 007

- Branch: `frontend-markie`.
- Last published frontend implementation: `7cc3dd78240ff0606ed9925554f937f6a3a69ad5`.
- Latest main incorporated: `c030c77`, via local merge
  `c6d4828bc520e8dc4be57547fba08ec23f4dbd98`.
- Working changes for this report: two additional frontend regression tests and
  frontend handoff documentation. Application behavior remains the published version.
- Backend review reference: teammate-specified `1b185d9`. Its README, frontend
  handoff and route definitions were inspected from Git, not assumed to be running.
- Compared `auth.service.js`, `readFeeds.service.js`, `auth.middleware.js` and
  `rbac.middleware.js` between `1b185d9` and current main: no differences.
  This comparison does not claim the entire backend checkouts are identical.
- Decision 007 was read. Its PM resolution accepts Option A and assigns seeding
  to Dustin. The top-level `PROPOSED` label is stale relative to that resolution.
- Approved scope: four accounts, five households, three verification tasks;
  passwords shared privately, never committed. No seed script was executed here.

Main was merged without custom backend/database edits. The backend-mae branch
was not merged into Markie's branch. No test account, scope, household, or task
was created or altered, and no existing database volume was reset.

## Actual Local Results

| Check | Actual result | Status |
| --- | --- | --- |
| Frontend at http://127.0.0.1:3000/ | HTTP 200; browser renders login | PASS |
| http://localhost:5000/health | Connection unavailable; no HTTP response | BLOCKED |
| Backend listener | No process listening on port 5000 | BLOCKED |
| Docker command | `docker` not recognized in this environment | BLOCKED for Docker setup |
| Existing MongoDB listener | 127.0.0.1:27017 is listening; database identity, authentication and provisioning not verified | OBSERVED ONLY |
| App runtime configuration | No root/server/client local env files; no MONGO_URI or JWT_SECRET process variables | BLOCKED for backend startup |
| Browser sign-in with synthetic invalid input while API is down | Inline network error; remains on login; no dashboard fallback | PASS for failure UI only |
| Frontend automated regression | 28 passed, 0 failed, 0 skipped | PASS, simulated API |
| TypeScript | `npm run typecheck` passed | PASS |
| Production build | Passed; existing 516.93 kB main-chunk warning remains | PASS with warning |

Observed inline browser message:

> Cannot reach the API. Check that the backend is running and its CORS origin matches this frontend.

There was no backend 401/403 response in that browser check. It is a network
failure check, NOT an invalid-credentials or real JWT test. Backend-only successes
on Mae's laptop do not establish availability or seeded records on Markie's laptop.
`PHASE1_MOCK_MODE=false` is the required startup setting, not a verified running
setting here because the API has not been started.

The 28 tests use synthetic session values, an Axios adapter, static React rendering
and fake IndexedDB. The two new cases prove only that an API-shaped Palingon task
renders its fields/action and that 403/503 feed errors reject instead of generating
sample results. They do not prove real task visibility or server-side isolation.

## Assigned Task Concern

**Use case:** `case_worker_test` must see and open its own pending field assignment.

**Reported current behavior:** the worker is scoped to Palingon, but the existing
pending task references a Lecheria household. The backend correctly excludes it.
This was reported by Mae; it has not been reproduced against Markie's database.

**Required sample from Dustin:** one `PENDING_DISPATCH` task assigned to the actual
MongoDB ID of `case_worker_test`, linked to an existing household whose address
matches Region IV-A / Laguna / Calamba / Palingon. Keep the existing out-of-scope
case for a negative check. Fit the adjustment within Decision 007's approved
sample budget, or get PM approval before expanding it. Do not widen worker scope
or weaken filtering merely to make the old task appear.

**Expected result:** authenticated `GET /api/v1/tasks/assigned` returns that exact
in-scope task; its household/name/instructions/due date appear on the frontend;
Start In-Person Verification opens that task's form. Lecheria/out-of-scope and
other-worker tasks remain absent. An empty list is a separate valid-empty test,
not a pass for this positive case.

**Current outcome:** BLOCKED, not failed frontend rendering. Need reachable API,
private test credentials, and independently confirmed sample task/household IDs.
Never attach passwords, tokens, signing secrets, or beneficiary details to this report.

## Live Acceptance Matrix

All entries below are currently BLOCKED/NOT RUN against a real backend here.

| Case | Expected result | Prerequisite |
| --- | --- | --- |
| Four valid logins | 200, real bearer JWT, correct account and role-specific view | Local provisioned accounts and credentials |
| Wrong password/unknown account | 401, inline failure, no mock session | Reachable real-auth API |
| Missing/tampered token | 401, no protected data | Reachable real-auth API |
| Expired signed token | 401 after genuine 900-second expiry; UI requires login | Valid login; wait for expiry without editing clock/token claims |
| Role matrix | Admin/director/auditor triage 200 and tasks 403; worker tasks 200 and triage 403 | Four roles |
| Scoped director triage | Only allowed rows and scoped counts | Confirmed in/out-of-scope sample IDs |
| Worker positive assigned feed and UI | Exact in-scope task displayed and form opens | Dustin's Palingon pending task |
| Outside-scope/other-worker exclusions | Forbidden tasks never returned or displayed | Confirmed negative samples |
| Valid empty assigned list | Empty-state text, no JSON fallback | Agreed account/sample state yielding no tasks |
| Reload/logout/account switch | Expected session behavior; no cross-account cached records | At least two authenticated role sessions |
| Real next/previous triage page | Distinct pages, accurate count | More than 10 in-scope flagged rows, requiring extra approved test-data scope |

The original approved sample budget cannot demonstrate the UI's second page at
page size 10. Keep that live case blocked instead of silently adding extra rows.
Inactive-account/second-worker tests likewise need coordination beyond the four
approved active role accounts. No mock login or role-switch bypass will be added.

## Setup to Unblock

1. Mae/Dustin confirm the database instance to use and provide the approved private
   connection settings and login credentials. A local file outside the repository
   can be used for private credentials; do not paste them into committed docs.
2. Run the agreed backend at `1b185d9` or a later confirmed version. Use a separate
   backend checkout when needed, instead of merging unreviewed backend work into
   frontend. Follow that checkout's `server/README.md`.
3. On this machine Docker is not available as a command. Either arrange that
   runtime or use the documented Node startup with an approved MongoDB URI.
   A port-27017 listener alone is not a database setup confirmation.
4. Set mock mode false, a private valid backend JWT secret, and exact CORS origin
   `http://127.0.0.1:3000` (or use localhost consistently). Confirm MongoDB connection,
   `/health` and `/api/v1` before browser login. Do not expose the secret to Vite.
5. Dustin confirms expected sample IDs/counts, including the Palingon task. Markie
   then records each actual HTTP status/error and UI result from the matrix.

## Frontend Phase and ML Collaboration

According to `docs/tasks/MARKIE_FRONTEND.md`, current focus is **Phase 3: live API
integration**, with unfinished Phase 2 offline/PWA acceptance. The earlier shorthand
"Phase 2 frontend integration" was not the roadmap's exact phase label.

| Area | Current frontend status | Remaining work/dependency |
| --- | --- | --- |
| Shell/login/role navigation | Implemented; fallback disabled | Real role/session browser acceptance |
| Live triage/tasks adapters | Implemented with pagination, empty/error states | Seeded-record visibility and scope acceptance |
| Offline drafts, photo/GPS/hash | Implemented, per-user storage | Physical-device and airplane-mode checks; cached-task offline reopening needs work |
| Dashboard metrics/map | Sample presentation, not live model metrics | Agree backend summary/geography contract and connect it |
| Dispatch | Frontend preview only; backend route exists | Agreed worker options and full live dispatch UI integration |
| Due process/appeals | Preview only | Approved storage/contracts and working backend endpoints |
| Submission upload | Deliberately disabled | Public submit/upload contract, authorized evidence storage and backend workflow |
| COA verification | Preview only | Real audit endpoint and acceptance |
| Model/SHAP/risk integration | Pending collaboration with Renz/Charles | Agreed backend-exposed contract, representative samples and acceptance states |

Markie remains on the project for model integration and demo rehearsal. Do not
mark frontend Phase 3/4 complete because backend placeholders have been handed
off. The reviewed backend router exposes login, dispatch, triage and assigned
feeds, not a public prediction/submission/appeal/audit integration surface.

For Renz/Charles: agree which persisted model fields become visible in triage,
dashboard and explanations; distinguish unavailable prediction, genuine prediction,
and backend fallback evaluation; define loading/error/empty states and metric
meanings. Do not call the internal ML service directly from the browser, invent
predictions, or replace absent values with a synthetic success. The current triage
adapter already renders a missing prediction as `Not available`.

## Short Team Update

Pulled main c030c77 and reviewed Decision 007. Frontend fallback stays disabled.
28 frontend regression tests pass, including positive task rendering with a
simulated response. Actual browser testing currently hits an unreachable API on
localhost:5000, so real login/RBAC and Palingon task visibility remain blocked.
Need the local backend/DB setup, Dustin's private credentials and an in-scope
pending task. No backend code, account scope or sample data was changed. Markie
continues Phase 3 frontend integration with Renz/Charles; this is not final acceptance.

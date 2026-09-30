# Backend authentication handoff for Markie

**Author:** Mae Santos — Backend Engineering Lead

Prepared 2026-09-24. Updated 2026-09-30. The live acceptance cases below remain
pending; the isolated frontend checks are recorded separately.
PR #7 merged at `d4edba4`. The backend review baseline is `backend-mae` at
`1934549`, which includes main `c030c77`. Record the exact frontend/backend
commits used for each live test.

## Frontend verification update — 2026-09-28

Independent verification of `frontend-markie` at `7cc3dd7` used an isolated temporary
copy: 26 tests passed with zero failures/skips; typecheck and production build
passed. The build reported a chunk above 500 kB, and dependency installation
reported five advisories (four moderate, one high). Frontend code, dependencies
and Markie's branch remained unchanged.

The reviewed login roles, triage pagination and assigned-task requests match
the backend implementation. Login fallback remains disabled. These tests use
simulated API responses and do not prove real backend JWT/RBAC or record visibility.
Actual end-to-end results remain pending. Frontend dispatch is still a preview,
and submission upload is disabled; neither is covered by this acceptance claim.

Markie's handoff mentions an older worker_id documentation discrepancy. The
matrix below already documents HTTP 400 INVALID_QUERY for that override.

## Setup and ownership

- Follow [backend README](../../server/README.md) for Node 20, `npm ci`, MongoDB connection, a random
  JWT secret of at least 32 characters, and `npm start` from `server/`.
- Use `NODE_ENV=development` and `PHASE1_MOCK_MODE=false`. Disable frontend login
  fallback and mock role switching. Failed authentication must not open a mock session.
- Set frontend `VITE_API_URL=http://localhost:5000/api/v1`. The default CORS origins
  include `http://localhost:3000` and `http://localhost`; configure `CORS_ORIGIN`
  if the frontend uses another origin. Never put `JWT_SECRET` in frontend settings.
- Verify `GET http://localhost:5000/health` and `/api/v1` return 200. The backend
  must log a successful MongoDB connection before listening.
- Coordinate test-account/database setup with Dustin. Mae owns API behavior and
  integration checks; this handoff does not authorize shared database resets or
  schema changes. Dustin coordinates account provisioning; this handoff does not
  create accounts or modify database data.

On separate laptops, localhost refers to each person's own machine. Run the
backend locally or agree a reachable backend URL and matching CORS origin.
Do not send the JWT signing secret to the frontend.

## Account details to coordinate with Dustin

Request active synthetic accounts for all four roles below, with unique usernames,
emails, and bcrypt password hashes. Agree test credentials separately; do not put
passwords, tokens, or signing secrets in committed reports/screenshots.

For director and worker accounts, use complete jurisdiction information:
`region: "Region IV-A"`, `province: "Laguna"`, `municipality: "Calamba"`, and
`assigned_barangays` containing `"Palingon"`. Missing or empty scope is denied.

Use an agreed synthetic worker with pending/cached tasks assigned to its actual
MongoDB user ID. No hard-coded fixture identity is needed. Empty lists are valid.

Provisioning confirmation is still pending. Coordinate an inactive account and
a second worker as well as the four active roles. For Markie's fixed page size
of 10, request more than 10 in-scope FLAGGED_FOR_REVIEW households to exercise
the actual next/previous controls, plus out-of-scope records and tasks belonging
to each worker. Confirm expected record IDs/counts privately before testing.

| Role | GET `/beneficiaries/triage-queue` | GET `/tasks/assigned` |
| --- | --- | --- |
| SUPER_ADMIN | 200 | 403 FORBIDDEN |
| REGIONAL_DIRECTOR | 200, scoped | 403 FORBIDDEN |
| CASE_WORKER | 403 FORBIDDEN | 200, own scoped tasks |
| COA_AUDITOR | 200 | 403 FORBIDDEN |

Use these exact role strings. Frontend aliases such as `DSWD_DIRECTOR` and
`MUNICIPAL_LINK` must not accidentally route an unknown role to an admin screen.
The server's 403 response is authoritative even if the UI hides a link.

## Requests and expected results

All paths below are relative to `http://localhost:5000/api/v1`. Replace placeholders
using agreed test credentials. Examples can be entered in Postman or inspected in
browser Network tools; they are not real credentials.

```http
POST /api/v1/auth/login
Content-Type: application/json

{"username":"<test_username>","password":"<test_password>"}
```

Successful login: 200 with `access_token`, `token_type: "Bearer"`,
`expires_in_seconds: 900`, and safe `user` data matching
`docs/contracts/auth/auth-session.json`. No `password_hash` should be returned.
Use the returned token for protected calls:

```http
GET /api/v1/beneficiaries/triage-queue?municipality=Calamba
Authorization: Bearer <access_token>
```

```http
GET /api/v1/tasks/assigned
Authorization: Bearer <case_worker_access_token>
```

| Test | Expected backend result | Frontend check |
| --- | --- | --- |
| Correct credentials, each role | 200 with real JWT and correct role | Open only the appropriate role view |
| Wrong password or unknown username | 401 INVALID_CREDENTIALS | Show failure; no mock login |
| Missing credentials | 401 INVALID_CREDENTIALS | Remain unauthenticated |
| Inactive test account (coordinate with Dustin) | 403 ACCOUNT_DEACTIVATED | Show denial |
| Protected GET without Authorization | 401 UNAUTHORIZED | Require login |
| Protected GET with a corrupted token | 401 UNAUTHORIZED | Do not display mock success |
| Protected GET with an expired valid token | 401 TOKEN_EXPIRED | Prompt login; no silent fallback |
| Cross-role access | Follow permission matrix above | Handle 403, not a success screen |
| Director triage with `?municipality=OutsideTestScope` | 403 OUT_OF_JURISDICTION | Show scope denial |
| Worker assigned GET with `?barangay=OutsideTestScope` | 403 OUT_OF_JURISDICTION | Show scope denial |
| Director triage with no geography query | 200 filtered to current stored jurisdiction | No out-of-scope records/counts |
| Assigned GET with `?worker_id=<another_id>` | 400 INVALID_QUERY; worker override is rejected | Do not infer selection from that query |

For expiry, retain a real token, wait beyond its 900-second expiry, then send it
again. Do not edit its payload: that tests a forged signature, not token expiry.
Do not change the system clock or share the signing secret to accelerate this test.
If a test account is unavailable, record the case as blocked rather than passed.

## Live feed acceptance cases

Coordinate synthetic records before this test; this document does not create or
change accounts/data. Prepare at least two visible households in the same scope,
one outside that scope, pending/cached tasks for the test worker, and a task for
a second worker. Record expected IDs privately in the test evidence.

| Test | Expected result |
| --- | --- |
| Triage `?page=1&limit=1`, then `?page=2&limit=1` | 200; correct distinct rows and consistent pagination against unchanged test data |
| Triage `?status=UNDER_INVESTIGATION` | Only matching table rows; summary cards still cover all statuses within the selected geographic scope |
| Triage `?page=0` or `?limit=101` | 400 INVALID_QUERY |
| Scoped director versus national admin/auditor | Director rows and counts exclude outside records; national roles can see authorized global scope |
| Worker assigned feed | Only this worker's PENDING_DISPATCH/CACHED_OFFLINE tasks within current jurisdiction |
| Submitted/closed task, another worker's task, or missing household | Not returned in the assigned feed |
| Empty authorized result | 200 with empty list and zero result count; no frontend mock fallback |
| Every live response | No X-KilosUnlad-Mock header; Cache-Control: no-store |

Verify mapped names, coordinates, SWDI levels, risk fields, instructions and dates
against the approved sample records. Missing predictions/evaluation times are
currently null; optional phone/street/instructions are empty strings. Record any
PM/frontend disagreement with these documented choices instead of changing the
frozen contracts silently. Avoid record mutations while checking pagination.

Decisions 005/006/007 are approved. Main c030c77 includes the deployment fixes;
the September 30 isolated fresh-start check passed PRIMARY readiness, restricted
index permissions and actual dispatch-to-feed behavior. See
[merged deployment verification](../reports/PHASE2_MERGED_DEPLOYMENT_VERIFICATION.md).
Shared deployment/migration and Markie's live acceptance remain pending.
Auth/read-feed testing can proceed on a working agreed backend with provisioned
records independently of full dispatch acceptance. Check seeded worker jurisdiction:
the merged seed's Palingon worker has a pending task in Lecheria, which is correctly
excluded by scope filtering. Coordinate an in-scope task for the positive test.

## What passing means

Login and the two GET feeds now read MongoDB in normal mode, including production.
No X-KilosUnlad-Mock header is expected. Empty authorized lists are valid. Confirm
seeded row values and scope, with frontend fallback disabled. Query worker_id
overrides are rejected. This auth/feed plan does not verify appeal submission,
refresh/logout or offline sync. A health response alone is not an auth test.
See [backend README](../../server/README.md) for pagination, summary and missing-value behavior.

## Result template

Backend commit: ___; frontend commit: ___; date: ___; test database label: ___

Frontend fallback disabled: ___; backend PHASE1_MOCK_MODE=false: ___

| Case / account role | Expected | Actual status and error code | UI behavior | PASS / FAIL / BLOCKED |
| --- | --- | --- | --- | --- |
| | | | | |

Attach redacted Network response evidence and relevant console errors. Include
failed and blocked cases; do not mark the whole integration passed from 200s alone.

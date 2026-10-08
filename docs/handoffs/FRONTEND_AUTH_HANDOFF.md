# Backend authentication handoff for Markie

**Author:** Mae Santos — Backend Engineering Lead

## Backend turnover (2026-10-07)

As requested by Renz, I'm handing over the current backend implementation and
remaining tasks to Renz and Charles. The [backend turnover](BACKEND_TURNOVER.md)
lists the implemented work and what still needs to be finished. Incomplete tasks
stay unchecked. Recipient review, shared-deployment testing and frontend
acceptance are still pending.


## Latest compatibility review (2026-10-07)

The [frontend/backend compatibility review](FRONTEND_BACKEND_COMPATIBILITY.md)
compares frontend `b36361c` with backend `9e9e3a3` (main merge `dc55600`).
Login/read-feed calls match current routes. Dispatch remains a disabled preview;
the audit screen simulates results while the real verifier is already mounted.
The review provides dispatch/audit integration details and flags task-metadata
presentation limits. It is a static review, not new live acceptance.


## Publication and next acceptance (2026-10-07)

[PR #10](https://github.com/renzv-compsci/KilosUnlad/pull/10) merged
`backend-mae` commit `9e9e3a3` into main at `dc55600` on October 6 at
23:36 Manila time. Remote history was fetched and verified on October 7.
The two commits have identical file trees. The merge publishes the backend
changes; remaining workflows and shared-deployment testing still need to be completed.

The [dispatch acceptance checklist](BACKEND_DISPATCH_ACCEPTANCE.md) covers test
fixtures, API dispatch, frontend task display, audit records and rejected requests.
It had not been executed when this section was published on October 7. The
[October 9 verification](../reports/BACKEND_COMPOSE_ACCEPTANCE_2026-10-09.md)
subsequently passed the isolated Docker API checks. Browser acceptance and
shared-deployment testing are still pending. Earlier PR-review requests below
are kept as historical notes.


## Markie-reported local acceptance (recorded 2026-10-04)

Markie reported testing frontend integration against
backend `1b185d9` with a fresh isolated database and seed from
`database-phase3` at `697f6bb`. Backend mock mode and frontend login fallback
were disabled. Reported results:

- All four roles logged in successfully; invalid login was rejected.
- API role restrictions passed.
- The actual frontend displayed `TEST-TSK-0001` linked to the Palingon household
  and excluded the out-of-scope samples.
- The director's triage displayed two flagged records.

This records Markie's independent local acceptance of login and read feeds.
I recorded Markie's results here; I did not rerun these checks during this update.
His frontend commit, execution date and raw test artifacts were not supplied.
Dispatch, submission, chain-verifier UI and other workflows were not included.
Shared deployment/migration and existing-volume repair remain unverified.
Markie's reported results cover local login and read feeds. Task 1.3 remains
unchecked because its completion criteria specify mock-client integration. Renz
needs to confirm whether the accepted real-API integration satisfies those
criteria.



Prepared 2026-09-24. Updated 2026-10-02. Completed local checks and remaining
acceptance cases are distinguished below.
October 2 update: Dustin's seed `d47af57` passed a fresh disposable-database
test: the worker API returned `TEST-TSK-0001` for Palingon household
`TEST-4PS-0004`. I subsequently confirmed positive task display manually using
the isolated frontend on port 3002 and backend on port 5002. Existing databases
retain the old task link when the seed is rerun; coordinate a targeted update
with the database owner. Dustin's [repair instructions](https://github.com/renzv-compsci/KilosUnlad/blob/database-phase3/docs/handoffs/TEST_DATA_SEED_HANDOFF.md)
are now merged locally at `19c9997`; shared-environment repair verification remains open.
Backend-only live checks on September 30 passed all four logins and the role
matrix after running Dustin's seed script locally. See
[live account verification](../reports/LIVE_AUTH_FEED_VERIFICATION.md).
The October 2 setup had manually confirmed positive task display; Markie's later
independent local login/read-feed acceptance is recorded above.
On October 1, I confirmed the manual SUPER_ADMIN and COA_AUDITOR login and
triage-display checks passed. Together with the observed director/worker checks,
basic local browser checks cover all four roles; this is not full acceptance.
An additional 11 live API checks passed for pagination, status filters, invalid
queries, worker overrides and correctly signed expired-token rejection. Browser
behavior for these cases still needs frontend acceptance.
PR #7 merged at `d4edba4`. The earlier backend review baseline was `03e9e74`.
The October 4 documentation review used `backend-mae` at `4d0f5bc`, which
includes main `c030c77` and the audit verifier. No new browser or runtime tests
were run for that documentation review. Record the exact frontend/backend
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
- Coordinate test-account/database setup with Dustin. The backend team owns API behavior and
  integration checks; this handoff does not authorize shared database resets or
  schema changes. Dustin coordinates account provisioning; this handoff does not
  create accounts or modify database data.

On separate laptops, localhost refers to each person's own machine. Run the
backend locally or agree a reachable backend URL and matching CORS origin.
Do not send the JWT signing secret to the frontend.

## Account details to coordinate with Dustin

The merged seed declares these usernames; obtain their passwords privately from
the database owner and confirm that they exist in the database being tested:

| Username | Role |
| --- | --- |
| `super_admin_test` | SUPER_ADMIN |
| `director_test` | REGIONAL_DIRECTOR |
| `case_worker_test` | CASE_WORKER |
| `auditor_test` | COA_AUDITOR |

Seed definitions alone do not confirm provisioning in an existing volume.

Request active synthetic accounts for all four roles below, with unique usernames,
emails, and bcrypt password hashes. Agree test credentials separately; do not put
passwords, tokens, or signing secrets in committed reports/screenshots.

For director and worker accounts, use complete jurisdiction information:
`region: "Region IV-A"`, `province: "Laguna"`, `municipality: "Calamba"`, and
`assigned_barangays` containing `"Palingon"`. Missing or empty scope is denied.

Use an agreed synthetic worker with pending/cached tasks assigned to its actual
MongoDB user ID. No hard-coded fixture identity is needed. Empty lists are valid.

The four accounts are now provisioned and verified on the backend developer's
local database; Markie's database must be provisioned separately. Coordinate an inactive account and
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
Shared deployment/migration remains pending. Markie's local login/read-feed
acceptance is recorded above; broader workflow acceptance remains open.
Auth/read-feed testing can proceed on a working agreed backend with provisioned
records independently of full dispatch acceptance. Fresh seed `d47af57` links
the Palingon worker's pending task to `TEST-4PS-0004` in Palingon. Existing
databases may retain the old Lecheria link; check and repair that fixture before
the positive test using Dustin's handoff.

## What passing means

Login and the two GET feeds now read MongoDB in normal mode, including production.
No X-KilosUnlad-Mock header is expected. Empty authorized lists are valid. Confirm
seeded row values and scope, with frontend fallback disabled. Query worker_id
overrides are rejected. This auth/feed plan does not verify appeal submission,
refresh/logout or offline sync. A health response alone is not an auth test.
See [backend README](../../server/README.md) for pagination, summary and missing-value behavior.

## Live-test order

1. Use the backend checkout at the baseline above or a later agreed commit.
   Record `git rev-parse HEAD` in both backend and frontend checkouts. Keep the
   frontend on Markie's agreed version; the last independently reviewed version
   is `7cc3dd7`.
2. Follow the README Docker startup sequence, including successful
   `replset-init` completion, the JWT secret and explicit mock mode disabled.
   Confirm the API is listening on port 5000 and MongoDB connected successfully.
3. Confirm credentials and expected sample records with Dustin. Verify
   `TEST-TSK-0001` points to `TEST-4PS-0004` in Palingon; reseeding alone does
   not replace an existing Lecheria link. Request the additional accounts and
   records needed for isolation and inactive-account cases listed above.
4. Start the frontend with `VITE_API_URL=http://localhost:5000/api/v1` and its
   login fallback disabled. Restart the frontend after changing its environment.
   Use a browser origin included in backend CORS settings.
5. Run valid and invalid login, inactive-account and role-restriction cases,
   then the triage and assigned-feed cases above. Confirm actual requests reach
   port 5000 and no mock response header is present.
6. Record each result below. Mark unavailable sample-data cases BLOCKED and
   include the missing prerequisite. Share redacted results before claiming
   end-to-end acceptance.

## Result record

Backend commit: ___; frontend commit: ___; date: ___; test database label: ___

Frontend fallback disabled: ___; backend PHASE1_MOCK_MODE=false: ___

| Case / account role | Expected | Actual status and error code | UI behavior | PASS / FAIL / BLOCKED |
| --- | --- | --- | --- | --- |
| | | | | |

Attach redacted Network response evidence and relevant console errors. Include
failed and blocked cases; do not mark the whole integration passed from 200s alone.

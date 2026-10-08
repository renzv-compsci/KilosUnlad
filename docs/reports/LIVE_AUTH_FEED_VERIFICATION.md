# Live authentication and feed verification

## Markie-reported local acceptance (recorded 2026-10-04)

Markie's message, relayed by Mae, reports testing frontend integration against
backend `1b185d9` with a fresh isolated database and seed from
`database-phase3` at `697f6bb`. Backend mock mode and frontend login fallback
were disabled. Reported results:

- All four roles logged in successfully; invalid login was rejected.
- API role restrictions passed.
- The actual frontend displayed `TEST-TSK-0001` linked to the Palingon household
  and excluded the out-of-scope samples.
- The director's triage displayed two flagged records.

This records Markie's independent local acceptance of login and read feeds.
It is teammate-reported evidence, not a new test run by this documentation review.
His frontend commit, execution date and raw test artifacts were not supplied.
Dispatch, submission, chain-verifier UI and other workflows were not included.
Shared deployment/migration and existing-volume repair remain unverified.
Markie's reported results cover local login and read feeds. Task 1.3 remains
unchecked because its completion criteria specify mock-client integration. Renz
needs to confirm whether the accepted real-API integration satisfies those
criteria.


**Author:** Mae Santos — Backend Engineering Lead

**Date:** 2026-09-30

**Updated:** 2026-10-02

## October 2: updated sample-task verification

Backend `bda0fe2` was tested against Dustin's seed revision `d47af57` from
`database-phase3` in a fresh disposable MongoDB 6 container. The seed was executed
unchanged; no teammate branch was merged. This read-feed check used standalone
MongoDB without authentication and is not a replica-set/deployment-permission test.

- Real `case_worker_test` login returned 200 with mock mode disabled.
- `GET /api/v1/tasks/assigned` returned 200 and exactly one task:
  `TEST-TSK-0001`, linked to `TEST-4PS-0004`, Rosa Villanueva in Palingon.
- The seed now creates 4 accounts, 4 households and 2 tasks. The approved 5
  households/3 tasks target is still not met.
- Existing-data behavior was reproduced only in the disposable database:
  resetting the task link to `TEST-4PS-0002` then rerunning the seed left that
  old link unchanged because the task was skipped. Existing installations need
  an owner-approved targeted data update; rerunning this seed is insufficient.
- Browser automation was unavailable during the API run. A subsequent manual
  browser check was confirmed by Mae, as recorded below.

The disposable container and its anonymous volumes were removed after the test.
The dated sections below preserve earlier results and their then-current gaps.

### Manual positive task-display confirmation

On October 2, a second disposable database was seeded from `d47af57`. Backend
`58eb523` ran on port 5002 with mock mode disabled; the previously reviewed
isolated frontend copy (`7cc3dd7`) ran on port 3002 against that API.
Mae confirmed the requested worker login and Assigned Field Tasks check worked,
including `TEST-TSK-0001`, Rosa Villanueva, Palingon. This is user-reported browser
evidence, not an independently automated observation; no screenshot was supplied.

Positive task display is now confirmed for this fresh local setup. Markie's
independent acceptance and existing-database repair verification remain pending.
Dustin subsequently supplied the [test-data repair procedure](https://github.com/renzv-compsci/KilosUnlad/blob/database-phase3/docs/handoffs/TEST_DATA_SEED_HANDOFF.md),
merged into `backend-mae` at `19c9997`. Its availability does not establish that
it has been executed in the shared environment.
This check does not establish full phase completion or all filtering edge cases.

## Setup

Backend implementation: `03e9e74` on `backend-mae`, with documentation updates.
Main baseline: `c030c77`. Actual Node backend ran on port 5000 with
`PHASE1_MOCK_MODE=false`, a generated JWT secret and the restricted application
database account. Local MongoDB used external port 27018 and replica set `rs0`;
the repository initializer completed its PRIMARY wait successfully.

The supplied usernames initially returned 401 because none existed in this local
database. Running Dustin's existing Decision 007 seed script provisioned four
accounts, three households and two tasks. Passwords came from the privately
supplied test-credentials document. No credentials or tokens are recorded here.

## Observed results

| Role | Login | Triage | Assigned tasks | Wrong password |
| --- | --- | --- | --- | --- |
| SUPER_ADMIN | 200 | 200; 3 rows | 403 | 401 |
| REGIONAL_DIRECTOR | 200 | 200; 3 rows | 403 | 401 |
| CASE_WORKER | 200 | 403 | 200; 0 tasks | 401 |
| COA_AUDITOR | 200 | 200; 3 rows | 403 | 401 |

Health returned 200. Missing and invalid bearer tokens returned 401 on the
assigned-task endpoint. Successful feeds returned `Cache-Control: no-store`
without an `X-KilosUnlad-Mock` header. Login returned real access tokens which
were used for the protected requests.

## Follow-up verification

### Follow-up live checks — 2026-09-30

All **11 targeted cases passed** against the same seeded MongoDB using the real
API on port 5000 with mock mode disabled. All four accounts logged in again as
setup for these checks. This is separate from the earlier 101-test regression.

| Case | Observed result |
| --- | --- |
| Pages 1 and 2 with `limit=1` | 200; distinct household IDs; consistent total of 3 |
| `FLAGGED_FOR_REVIEW` and `UNDER_INVESTIGATION` filters (2 cases) | 200; nonempty matching rows; summary metrics unchanged across status filters |
| Zero page, limit 101, invalid status, unknown parameter, repeated page (5 cases) | 400 INVALID_QUERY |
| Assigned-feed `worker_id` override and unsupported `page` (2 cases) | 400 INVALID_QUERY |
| Correctly signed token with past expiration | 401 TOKEN_EXPIRED |

The expiry case used the temporary API session's signing key and an expiration
in the past; it did not wait for a normal 15-minute session to expire or change
the machine clock. The temporary API session was stopped after verification.

### Local browser check — 2026-09-30

The existing isolated frontend copy previously reviewed at `7cc3dd7` ran at
`http://127.0.0.1:3000`, pointing to the live backend on port 5000.
Browser observations confirmed:

- When the backend was unavailable, login displayed an API connectivity error
  and did not open a fallback session.
- After backend restart, an incorrect password displayed "Incorrect username
  or password." and stayed on the login screen.
- Director login succeeded; the triage screen displayed `TEST-4PS-0002`,
  Lecheria, risk score 82, and one flagged record. Previous/next were disabled
  for the single page.
- The director's logout control returned to the login screen. This checks local
  session UI behavior, not server-side token revocation.
- Worker login succeeded and displayed "0 assigned tasks loaded" and
  "No tasks are assigned to this account." Its navigation showed field-worker
  screens rather than director administration screens.

These local browser checks cover two roles and the current sample data. They do
not replace Markie's acceptance of his own checkout, full role/browser coverage,
or positive assigned-task rendering with an in-scope sample.

### User-confirmed browser checks — 2026-10-01

Mae confirmed that the requested SUPER_ADMIN and COA_AUDITOR manual checks
worked: login, opening the triage queue and viewing `TEST-4PS-0002`, with logout
between accounts. These results are user-reported; browser automation was
unavailable for independent observation during this session. No additional
HTTP status codes or screenshots were supplied for these manual checks.

Together with the September 30 director/worker observations, basic local login
and screen checks now cover all four roles. This does not establish complete
browser authorization coverage or Markie's independent acceptance.

## Remaining acceptance (updated October 4)

- Fresh seed `d47af57` links the Palingon worker's task to `TEST-4PS-0004`;
  positive API visibility and user-confirmed browser display passed. Existing
  databases can retain the old Lecheria link. Dustin's repair instructions are
  available; shared-environment execution and verification remain outstanding.
- The current script provides 4 households and 2 tasks versus Decision 007's
  approved 5 households and 3 tasks. Record this sample-data gap separately
  from backend authentication behavior.
- Inactive-account, second-worker isolation, and token-expiry/pagination browser
  cases were not exercised in this live run.
- Markie's reported local login/read-feed acceptance is recorded above. Dispatch,
  submission and other workflows remain outside that acceptance; the whole phase
  is not complete.

The initial backend session had stopped before the follow-up. The follow-up
session also stopped after its checks; restart the backend before browser testing.
Another laptop must run its own setup or use an agreed reachable address.

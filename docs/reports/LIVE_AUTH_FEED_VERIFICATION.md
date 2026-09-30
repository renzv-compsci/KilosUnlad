# Live authentication and feed verification

**Author:** Mae Santos — Backend Engineering Lead

**Date:** 2026-09-30

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

## Remaining acceptance

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

### Outstanding cases

- The Palingon worker's pending sample task belongs to a Lecheria household.
  The empty assigned feed is correct scope filtering; positive task visibility
  still needs an agreed in-scope pending/cached task from the database owner.
- The current script provides 3 households and 2 tasks versus Decision 007's
  approved 5 households and 3 tasks. Record this sample-data gap separately
  from backend authentication behavior.
- Inactive-account, second-worker isolation, and token-expiry/pagination browser
  cases were not exercised in this live run.
- Markie's frontend end-to-end acceptance remains pending. These results are
  direct HTTP checks, not browser UI tests or completion of the whole phase.

The initial backend session had stopped before the follow-up. The follow-up
session also stopped after its checks; restart the backend before browser testing.
Another laptop must run its own setup or use an agreed reachable address.

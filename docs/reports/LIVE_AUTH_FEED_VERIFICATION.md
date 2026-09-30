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

- The Palingon worker's pending sample task belongs to a Lecheria household.
  The empty assigned feed is correct scope filtering; positive task visibility
  still needs an agreed in-scope pending/cached task from the database owner.
- The current script provides 3 households and 2 tasks versus Decision 007's
  approved 5 households and 3 tasks. Record this sample-data gap separately
  from backend authentication behavior.
- Inactive-account, second-worker isolation, token-expiry and pagination browser
  cases were not exercised in this live run.
- Markie's frontend end-to-end acceptance remains pending. These results are
  direct HTTP checks, not browser UI tests or completion of the whole phase.

The backend was left running on port 5000 for local use. Availability lasts only
while that process and Docker remain running; another laptop must run its own
setup or use an agreed reachable address.

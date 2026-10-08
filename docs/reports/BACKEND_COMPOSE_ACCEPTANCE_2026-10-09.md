# Backend acceptance against merged main — 2026-10-09

**Owner:** Mae Santos (backend verification)
**Baseline:** main `6e3c958`; backend-mae `bca7e2e` before this report.
**Result:** All executed backend checks passed. Isolated local acceptance; browser and production acceptance remain pending.

## Branch alignment

Backend-mae was one commit ahead and 13 commits behind main. The server, client
and docker trees were identical between those heads. Incoming changes include
database tooling and merge history; the behind count does not indicate newer
backend API code. No merge or change to another owner's branch was performed.

## Isolated deployment

An archive of main `6e3c958` was built and started with Docker Compose project
`mae-main-acceptance-20261009`. Gateway, client, backend, ML service, MongoDB 6.0
and the replica-set initializer started successfully. The initializer completed
before backend startup.

Only the temporary Compose copy changed: unique container names/project volumes,
loopback ports (gateway 18080, backend 5004, ML 8004, MongoDB 27023), matching
CORS/API origin and a generated test JWT secret. Real mode was enabled. Code,
database initialization and replica-set setup remained from the archive.
Backend operations used restricted app_user credentials.

The test-account seed ran only in the isolated database. Three eligible Palingon
households (MAE-COMPOSE-0001 through 0003) were copied from a synthetic fixture
with distinct household/national IDs and no open task. Shared records and Docker
database volumes were untouched. No demo-reset service was run.

## Results

| Verification | Result |
| --- | --- |
| Gateway HTTP acceptance harness | 26 checks passed |
| Full backend suite with native replica-set workflow tests enabled | 105 passed, 0 failed, 3 skipped |
| Follow-up enabling all three skipped integration checks | 5 passed, 0 failed, 0 skipped; includes two repeated unit checks |
| Persisted state/restricted-account inspection | Passed |

Across both suite runs, all 108 distinct tests executed successfully. Follow-up
enabled RUN_AUDIT_ROLE_TESTS, RUN_DB_RECOVERY_TESTS and TEST_MONGO_URI. The feed
test created and removed its own randomly named database on isolated MongoDB.

The 26 HTTP checks covered:

- All four role logins and invalid-password rejection through Nginx.
- Director triage, worker assigned feed, exact CORS origin and denied feed roles.
- Director/admin dispatch, denied worker/auditor dispatch, and rejection of an
  assigned worker outside the household's jurisdiction.
- Duplicate rejection; simultaneous duplicate requests produced exactly one
  HTTP 201 and one HTTP 409 for the same household.
- Visibility of all three new tasks in the assigned worker's API feed.
- Real dispatch-generated audit range 1..3: admin/auditor succeeded, director
  and worker received 403, unauthenticated requests received 401, missing bounds
  returned 400 and a missing entry returned 409.
- Direct backend liveness and gateway delivery of the merged client shell.

Database inspection independently confirmed one task per accepted household,
three transitions to UNDER_INVESTIGATION, three correctly linked/recomputed
SHA-256 audit entries and a unique audit sequence index. Rejected out-of-scope
dispatch left its household unchanged and created no task. The app account could
inspect audit indexes but received MongoDB code 13 for audit update/delete attempts.

Additional integration checks verified audit permissions, HTTP survival and
query recovery after an isolated database outage, plus feed contracts, pagination
and data isolation. Native workflow tests also covered transaction rollback and
persisted 1,000-block tamper detection.

## Handoff limits and ownership

No backend defect requiring a code change was found. Evidence/reporting are
Mae's contribution; remaining development remains transferred to Renz and Charles
under the [backend turnover](../handoffs/BACKEND_TURNOVER.md).

- Main's client is still a scaffold: App.jsx is empty. Serving its shell does not
  verify Markie's screens, buttons, offline behavior or browser CORS behavior.
  HTTP assertions used requests, not a browser.
- ML startup does not verify model loading or prediction accuracy.
- Submission, notice/appeal, calamity and other unmounted workflows remain
  unfinished. Passing helper tests does not complete them.
- The documented direct-ingest validation gap remains a database-owner decision.
- No cold-start timing target, load benchmark or production acceptance is claimed.
- Range 1..3 existed only in this disposable run. Discover actual sequences in
  the recipient's database before choosing a verification range.

The isolated Compose project and its volumes were removed after verification.
The existing kilosunlad-db container was retained.

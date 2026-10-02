# Backend deployment recheck — 2026-09-28

**Author:** Mae Santos — Backend Engineering Lead

October 2 reading note: the failures below describe the September 28 baseline.
Subsequent fixes and the successful September 30 isolated fresh-start/dispatch
check are recorded in [merged deployment verification](PHASE2_MERGED_DEPLOYMENT_VERIFICATION.md).
The October 2 local regression again verifies dispatch transactions and rollback
on a disposable replica set; shared-environment acceptance remains outstanding.

Review baseline: main `08eca5c`, merged locally into `backend-mae` at `886ca2a`.
Decisions 005/006 are approved. Successful dispatch against the updated shared
deployment remains unverified.

## Observed results

1. A disposable MongoDB 6 container was tested using the checked-in init script, root
   authentication environment and `mongod --replSet rs0 --bind_ip_all`, matching
   the new Compose database startup configuration. It exited with code 2:
   `BadValue: security.keyFile is required when authorization is enabled with replica sets`.
   Shared volumes and application data were not used. The test container
   and its anonymous volumes were removed after inspection.
2. Inspection of `docker/mongo/init-mongo.js` found no `rs.initiate()` and
   only `find`/`insert` privileges for audit_logs. These changes appear incomplete
   in the checked-in script despite the completed action items in the decision.
   Replica-set initialization will need an
   appropriate authenticated, idempotent startup procedure and primary readiness.
3. The extended `server/test/auditRoleCompatibility.test.js` ran on a separate
   disposable authenticated MongoDB 6 instance. It passed (1 test, 0 skips), confirming:
   - find/insert permits reads and appends; index inspection is denied (code 13).
   - Adding createIndex permits index creation but inspection remains denied.
   - Adding listIndexes permits inspection of the unique sequence index.
   - Audit update/delete remain denied after the metadata grant.

Test grants applied only to the synthetic test role. Shared roles, schemas,
Compose files, initialization scripts and approved decisions remained unchanged.

## Follow-up for Renz and assigned infrastructure/database owner

Shared deployment dispatch verification requires coordination on these items:

- Configure authentication-compatible replica-set key material and startup.
  Do not disable authentication or commit secrets to work around startup failure.
- Implement replica-set initialization/readiness and a safe existing-volume
  migration plan; do not delete application volumes as part of this verification.
- Correct the createIndex/index-inspection wording in Decisions 005/006 and
  explicitly approve listIndexes metadata access or a different readiness design.
- Reconcile checked-off deployment/backend verification items with actual evidence.
  Earlier disposable transaction tests are not acceptance of this new deployment.

Once these items are resolved, backend verification will rerun dispatch commit/rollback
and live feed checks against the approved restricted account and deployed replica set.
Database startup failure blocked dispatch testing in this run. The September 25
standalone smoke check does not verify the new September 28 replica-set setup.

Permission test rerun from server/:

```powershell
$env:RUN_AUDIT_ROLE_TESTS = '1'
$env:DOCKER_PATH = "$env:LOCALAPPDATA/Programs/DockerDesktop/resources/bin/docker.exe"
node --test test/auditRoleCompatibility.test.js
Remove-Item Env:RUN_AUDIT_ROLE_TESTS, Env:DOCKER_PATH
```

## Frontend readiness review — 2026-09-28

Independent review of Markie's `frontend-markie` commit `7cc3dd7` used an
isolated temporary copy against backend baseline `2f9b568` (including main
`08eca5c`). Frontend checks ran with Node 20:

| Check | Result |
| --- | --- |
| Frontend tests | 26 passed; zero failures or skips |
| Typecheck | Passed |
| Production build | Passed; chunk-size warning above 500 kB |
| Dependency installation | Completed; five advisories reported (four moderate, one high) |

The reviewed login roles, triage pagination and assigned-task requests match
the backend implementation. Mock login fallback remains disabled. These are
isolated frontend checks with simulated API responses, not live JWT/RBAC or
database acceptance. Frontend dispatch remains a preview and submission upload
is disabled. Markie's code and branch remained unchanged.

The [backend handoff](../handoffs/FRONTEND_AUTH_HANDOFF.md) now includes this
evidence and the approved status of Decision 006. It already
documents rejection of worker_id overrides; Markie's note about that discrepancy
is stale.

Next coordination steps remain pending, not completed:

- Renz and the assigned deployment owner: resolve the startup, initialization
  and audit metadata-permission items above, then provide the deployment commit.
- Dustin: coordinate synthetic accounts for all four roles, an inactive account,
  a second worker, and scoped sample records. More than 10 flagged households
  are needed to test Markie's actual pagination controls.
- Backend and frontend teams: once an agreed backend and records are available, record live
  valid/invalid login, role/scope denials, triage pagination, assigned-task
  isolation, and session handling with backend mock mode and frontend fallback
  disabled. Auth/read-feed checks do not require dispatch acceptance if a working
  agreed backend is available.

Coordination requests have not been sent, and accounts have not been provisioned
as part of this review. The existing
deployment blockers and Task 2.4 acceptance status are unchanged by these results.

## Task 2.4 completion checklist

The latest fetch for this review on 2026-09-28 confirmed main at `08eca5c`.
The deployment blockers above remain unresolved. Task 2.4 remains incomplete;
existing isolated test results do not establish shared deployment readiness.

After the assigned owners publish the fixes, backend verification will cover the
following using agreed synthetic records and the restricted application account:

- [ ] MongoDB starts with authentication, initializes rs0, and reports a writable
  primary. The backend connects using the replica-set URI.
- [ ] The required unique audit sequence index can be inspected by app_user;
  audit update/delete attempts are still denied.
- [ ] An authorized director/admin dispatches a FLAGGED_FOR_REVIEW household to
  an active, in-scope worker and receives the contract-shaped 201 response.
- [ ] Exactly one task is persisted, the household becomes UNDER_INVESTIGATION,
  and the audit receipt/hash agrees with the persisted entry.
- [ ] The assigned worker sees the task in the live feed; triage reflects the
  status change. Other workers and out-of-scope users do not see it.
- [ ] Duplicate dispatch returns 409; concurrent requests produce only one task.
- [ ] Invalid input, wrong roles, invalid worker and out-of-scope assignments are
  rejected without partial writes.
- [ ] Audit-failure injection rolls back task and household writes in a disposable
  deployment-equivalent test environment, never in the shared application data.
- [ ] Record the tested commit, deployment configuration, result and remaining
  limitations before updating the task checkbox.

The existing workflow integration suite covers the backend behavior on a
disposable replica set. These unchecked items concern acceptance against the
corrected deployment, not an assertion that backend dispatch code is absent.

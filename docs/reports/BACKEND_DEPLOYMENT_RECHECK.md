# Backend deployment recheck — 2026-09-28

**Author:** Mae Santos — Backend Engineering Lead

I reviewed main `08eca5c`, merged locally into `backend-mae` at `886ca2a`.
Decisions 005/006 are approved, but I have not yet verified successful dispatch
against the updated shared deployment.

## Observed results

1. I tested a disposable MongoDB 6 container using the checked-in init script, root
   authentication environment and `mongod --replSet rs0 --bind_ip_all`, matching
   the new Compose database startup configuration. It exited with code 2:
   `BadValue: security.keyFile is required when authorization is enabled with replica sets`.
   I did not use shared volumes or application data. I removed the test container
   and its anonymous volumes after inspection.
2. I checked `docker/mongo/init-mongo.js` and found no `rs.initiate()` and
   only `find`/`insert` privileges for audit_logs. These changes appear incomplete
   in the checked-in script despite the completed action items in the decision.
   Replica-set initialization will need an
   appropriate authenticated, idempotent startup procedure and primary readiness.
3. I extended and ran `server/test/auditRoleCompatibility.test.js` on a separate
   disposable authenticated MongoDB 6 instance. It passed (1 test, 0 skips), confirming:
   - find/insert permits reads and appends; index inspection is denied (code 13).
   - Adding createIndex permits index creation but inspection remains denied.
   - Adding listIndexes permits inspection of the unique sequence index.
   - Audit update/delete remain denied after the metadata grant.

I applied the test grants only to the synthetic test role. I did not edit any
shared role, schema, Compose file, initialization script or approved decision.

## Follow-up for Renz and assigned infrastructure/database owner

Before I can verify dispatch on the shared setup, I need coordination on these items:

- Configure authentication-compatible replica-set key material and startup.
  Do not disable authentication or commit secrets to work around startup failure.
- Implement replica-set initialization/readiness and a safe existing-volume
  migration plan; do not delete application volumes as part of this verification.
- Correct the createIndex/index-inspection wording in Decisions 005/006 and
  explicitly approve listIndexes metadata access or a different readiness design.
- Reconcile checked-off deployment/backend verification items with actual evidence.
  Earlier disposable transaction tests are not acceptance of this new deployment.

Once these items are resolved, I will rerun dispatch commit/rollback and live feed
checks against the approved restricted account and deployed replica set. I could
not reach dispatch in this run because database startup failed. My September 25
standalone smoke check does not verify the new September 28 replica-set setup.

Permission test rerun from server/:

```powershell
$env:RUN_AUDIT_ROLE_TESTS = '1'
$env:DOCKER_PATH = "$env:LOCALAPPDATA/Programs/DockerDesktop/resources/bin/docker.exe"
node --test test/auditRoleCompatibility.test.js
Remove-Item Env:RUN_AUDIT_ROLE_TESTS, Env:DOCKER_PATH
```

## Task 2.4 completion checklist

I fetched main again on 2026-09-28; it remains at `08eca5c`. The deployment
blockers above are still present. I have not marked Task 2.4 complete or repeated
the same isolated tests as if they established shared deployment readiness.

After the assigned owners publish the fixes, I will verify the following using
agreed synthetic records and the restricted application account:

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

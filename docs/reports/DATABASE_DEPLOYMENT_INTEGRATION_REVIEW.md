# Database deployment and integration review

**Author:** Mae Santos — Backend Engineering Lead

**Date:** 2026-09-29

**Reviewed commit:** `5d14cf1` on `origin/database-phase3`, compared with main `08eca5c`.

**Affected work:** Phase 2 deployment and Task 2.4 dispatch acceptance, plus
test-account and sample-record readiness for frontend integration.

`database-phase3` is the reviewed branch name, not the phase classification of
these findings. This report does not assess completion of Phase 3 backend tasks.

## Verification scope

Source review used Git objects. Docker was initially unavailable; the subsequent
targeted permission and command-exit checks are recorded in the Docker follow-up
below. I did not run the complete Compose setup or seeder during this review.

## Findings and requested follow-up

1. **Audit index inspection remains blocked.** `docker/mongo/init-mongo.js` grants
   find/insert/createIndex on audit_logs but omits listIndexes. The backend workflow
   checks `audits.collection.indexes()` before transactions. The existing permission
   test previously demonstrated that createIndex does not permit that operation.
   Coordinate the metadata grant or an approved alternative readiness design with
   Renz; retain the prohibition on audit update/delete.

2. **PRIMARY wait does not enforce its Boolean result.** The initializer runs
   `mongosh --eval "rs.status().myState === 1"` in a shell `until` loop. The loop
   consumes the process exit code, not the printed Boolean. Use an explicit
   nonzero exit while not writable primary, with a bounded wait and failure
   propagation. Also check initialization command failures before reporting success.
   Runtime verification of the revised branch remains pending.

3. **Seeded worker has no visible pending task.** `case_worker_test` is assigned
   only Palingon. Its pending task references TEST-4PS-0002 in Lecheria; its other
   task is SUBMITTED and references TEST-4PS-0003 in Real. Current backend scope
   and status filtering will exclude both. Provide an open task for an in-scope
   household; keep separate out-of-scope records for denial tests.

4. **Credential documentation conflicts with the script.** Decision 007 says
   credentials will not be committed, but the seeder contains printable plaintext
   test passwords alongside fixed hashes. Replace embedded passwords with private
   provisioning inputs and update the instructions. Password values are omitted
   from this report. The report also says hashing occurs at insert time, whereas
   the script inserts precomputed hashes.

5. **Existing-volume migration is not established.** The initialization script
   runs on an empty data directory. Adding role privileges there does not update
   existing users/roles automatically. Document a safe role migration and verify
   both fresh and existing-volume paths without resetting application data.

6. **Acceptance fixtures and approval remain partial.** Four active roles, three
   households and two tasks do not cover inactive accounts, a second worker or
   more than ten flagged rows for frontend pagination. Decision 007 is still
   PROPOSED despite the support report marked COMPLETE. Separate delivered script
   status from ownership approval and full integration-test coverage.

## Docker follow-up — 2026-09-29

Docker engine 29.8.0 became available. Two isolated checks completed:

- `RUN_AUDIT_ROLE_TESTS=1 node --test test/auditRoleCompatibility.test.js`:
  **1 passed, 0 failed, 0 skipped**. The disposable authenticated MongoDB test
  confirmed that find/insert/createIndex still denies index inspection. Adding
  listIndexes enables it while audit update/delete remain denied.
- `docker run --rm mongo:6.0 mongosh --nodb --quiet --eval 'false'` printed
  `false` and exited **0**. This confirms that a false Boolean expression does
  not make mongosh fail, so the initializer's shell loop cannot rely on that
  expression alone to wait for PRIMARY.

These targeted runtime checks confirm findings 1 and 2. They do not constitute
startup or migration acceptance of the complete Compose stack at `5d14cf1`.

## Remaining verification

After follow-up changes, test fresh startup, actual writable
primary readiness, restricted-user index inspection, denied audit mutations, and
seeded worker feed visibility in a disposable environment. Then run dispatch and
frontend integration against the agreed deployment and privately provisioned accounts.

# Historical backend verification status - September 25

Superseded for current status by [Phase 1-4 status](PHASE1_TO_PHASE4_STATUS.md)
and [merged deployment verification](PHASE2_MERGED_DEPLOYMENT_VERIFICATION.md).
The counts, uncommitted-work description, PR references and deployment blockers
below describe September 25 only. Decision 006 is now accepted; fresh isolated
deployment verified index permissions and dispatch on September 30. Shared
deployment acceptance remains open. This October 4 annotation ran no new tests.

**Author:** Mae Santos — Backend Engineering Lead

Reviewed 2026-09-25 on backend-mae at d8c7b9b, with the existing uncommitted
backend ML client and six ML tests retained locally. At that review date this
report superseded earlier
test-count summaries; it is now retained as historical evidence.

## Historical test evidence

| Run | Passed | Failed | Skipped | Scope |
| --- | ---: | ---: | ---: | --- |
| Tracked backend test files, all integration flags enabled | 58 | 0 | 0 | PR implementation/tests; excludes local ML test file |
| Entire working tree, all integration flags enabled | 64 | 0 | 0 | Includes six uncommitted ML tests; not the PR-only count |
| Clean committed backend Docker image, default flags | 43 | 0 | 4 | Contract documents mounted read-only; optional integrations disabled |

The earlier 61/62-pass runs skipped two Docker suites because their opt-in flags
were unset. Skipped did not mean failed. Both now ran in the all-enabled checks:

- `RUN_DB_RECOVERY_TESTS=1`: isolated Docker MongoDB outage/reconnection test.
- `RUN_AUDIT_ROLE_TESTS=1`: isolated authenticated audit-role compatibility test.
- `RUN_WORKFLOW_MONGO_TESTS=1`: disposable local replica-set transactions and
  dispatch-to-feed integration.
- `TEST_MONGO_URI`: real MongoDB auth/feed checks in unique temporary databases.

The role test passes by confirming the existing role denies index inspection
and audit updates/deletes. That is evidence of the index-readiness blocker, not
proof that dispatch works with the shared restricted account.

Reproduce from `server/` with Node 20, Docker and a local mongod available:

```powershell
$env:TEST_MONGO_URI = 'mongodb://127.0.0.1:27017'
$env:RUN_WORKFLOW_MONGO_TESTS = '1'
$env:RUN_DB_RECOVERY_TESTS = '1'
$env:RUN_AUDIT_ROLE_TESTS = '1'
$env:MONGOD_PATH = 'C:/Program Files/MongoDB/Server/8.3/bin/mongod.exe'
$env:DOCKER_PATH = "$env:LOCALAPPDATA/Programs/DockerDesktop/resources/bin/docker.exe"
$tests = git ls-files 'test/*.test.js'
node --test @tests
Remove-Item Env:TEST_MONGO_URI, Env:RUN_WORKFLOW_MONGO_TESTS, Env:RUN_DB_RECOVERY_TESTS,
  Env:RUN_AUDIT_ROLE_TESTS, Env:MONGOD_PATH, Env:DOCKER_PATH
```

Adapt executable locations to the machine. Test cleanup targets only generated
test databases, replica-set directories and Docker resources, not application data.

## Build and startup

All four Compose images built from a clean archive of d8c7b9b. All five services
started in an isolated stack using temporary ports/volumes and a generated JWT
secret with mock mode disabled. Backend and ML health, frontend root and gateway
`/api/v1/` returned 200; invalid login and missing-token assigned feed returned
401. Temporary stack/volumes and generated secret configuration were removed.
Earlier ML package download timeouts did not recur in this successful build.

This check used test configuration overrides. It does not certify an unchanged
Compose setup, shared database privileges, valid user login or complete frontend
acceptance. The backend image does not include root docs/contracts; tests that
read those files require a read-only mount at `/docs` when running in that image.

## Implementation and outstanding work

- Implemented/tested: auth/JWT/current-user RBAC, login timestamp persistence,
  live read feeds, transactional dispatch, state-order guards, pure appeal timing,
  canonical hashing and database recovery.
- Phase 2 remains partial: live notice/graduation and appeal docket persistence,
  contracts and pause/resume semantics are unfinished.
- Decision 006 is proposed. Renz must resolve transaction deployment, ownership
  and index readiness. Neither topology nor privilege changes are automatically
  assigned to Dustin. `autoIndex: false` does not disable explicit index inspection.
- Markie's live acceptance needs provisioned test accounts/sample records and
  fallback disabled. Frontend unit/build results are not backend acceptance.
- Feed optional values, summary filtering and pending/cached selection are
  documented implementation choices for PM/frontend confirmation.
- Phase 3 ML client work remains local, incomplete and excluded from PR #7.
- PR #7 is open and ready for review; nothing was merged by this audit.

## Review coverage

Reviewed backend route wiring, authentication/RBAC, feed mapping/query validation,
dispatch/persistence, associated tests, task status, README, handoff and gap/recovery
reports against the available contracts and decisions. Corrected stale document
paths/status/ownership and the handoff's worker_id query expectation (400
INVALID_QUERY). No runtime, shared model, frozen contract, frontend or infrastructure
changes were needed for this documentation refresh. This is not a claim that all
future tasks or production/security acceptance criteria are complete.

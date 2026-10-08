# Phase 3 backend checkpoint

**Author:** Mae Santos — Backend Engineering Lead

> Historical report: results and status refer to the dated baseline below.
> For current handoff and test status, use the [backend turnover](../handoffs/BACKEND_TURNOVER.md)
> and [latest verification](BACKEND_COMPOSE_ACCEPTANCE_2026-10-09.md).

**Date:** 2026-09-28

**Baseline:** Local working tree on `backend-mae`, following `1c40efb`.

## Implemented groundwork

| Task | Available backend behavior | Remaining integration |
| --- | --- | --- |
| 3.1 | Contract-shaped ML client, strict validation, 2500 ms overall deadline, sanitized errors | Live ML service, agreed fallback scoring/tagging and workflow persistence |
| 3.2 | Submission validation/mapping, read-only ownership and jurisdiction checks, geofence validation, raw-byte SHA-256 verification | Trusted image-byte retrieval, transactional rechecks/writes, replay policy and public route |
| 3.3 | Pure weighted risk calculator, 100-point cap and inclusive 70-point threshold | Record-to-indicator policy, ML integration, moratorium handling and atomic flagging/audit |

All three tasks remain incomplete. The submission authorization tests use model
doubles; a preflight result does not protect a later write against reassignment
or status changes. The eventual transaction must recheck current state and use
conditional writes. Hash verification proves byte integrity only. The risk
calculator accepts explicit inputs and does not authorize status changes.

## Combined regression verification

Node 20 run from `server/`:

```powershell
$env:RUN_WORKFLOW_MONGO_TESTS = '1'
$env:MONGOD_PATH = 'C:/Program Files/MongoDB/Server/8.3/bin/mongod.exe'
node --test
```

Result: **87 passed, 0 failed, 3 skipped** (90 tests including nested tests).
The disposable MongoDB replica-set suite passed, including dispatch/feed
visibility, authorization, concurrency and rollback checks. This run is not
acceptance of the shared deployment or the new submission route.

Skipped suites:

- Docker database recovery: Docker engine was unavailable; opt-in flag unset.
- Docker audit-role compatibility: Docker engine was unavailable; opt-in flag unset.
- Standalone live read feeds: `TEST_MONGO_URI` was not configured. Some feed
  coverage ran within the disposable workflow suite, but the dedicated suite
  was not executed in this run. Login tests used their model-double mode.

`git diff --check` passed. No Phase 3 task checkbox has been marked complete.

### Docker follow-up — 2026-09-28

After Docker became available (engine 29.8.0), the database lifecycle and audit-role
suites were rerun with `RUN_DB_RECOVERY_TESTS=1` and `RUN_AUDIT_ROLE_TESTS=1`:

```powershell
node --test test/databaseLifecycle.test.js test/auditRoleCompatibility.test.js
```

Result: **4 passed, 0 failed, 0 skipped**. Disposable authenticated MongoDB tests
confirmed that listIndexes is required independently of createIndex, while audit
updates/deletes remain denied. Recovery testing confirmed that HTTP health stays
available during database outage, database-dependent login returns sanitized 503,
and queries recover after restart.

This follow-up resolves the two Docker skips from the earlier run. The original
87/0/3 result above is retained as the historical combined run. These disposable
tests do not establish that the shared Compose deployment blockers have been fixed.

### Live-feed and database-backed login follow-up — 2026-09-28

A disposable MongoDB 6 container bound to a random localhost port supplied
`TEST_MONGO_URI` for:

```powershell
node --test test/readFeeds.test.js test/login.test.js
```

Result: **12 passed, 0 failed, 0 skipped**. Login used actual MongoDB user records
and bcrypt/JWT checks. Coverage includes invalid credentials, deactivation,
current role/jurisdiction changes, expired/forged tokens and deleted users.
The dedicated feed suite verified pagination, role/scope restrictions, worker
isolation, invalid queries and empty results with stored synthetic records.
Login-suite feed handlers are injected test doubles; actual feed-query behavior
is covered separately by `readFeeds.test.js`.

The temporary test databases, container and its anonymous volumes were removed
after testing. All three initially skipped suites have now passed in follow-up
runs. Counts are separate runs with overlapping tests, not one new combined total.
Frontend end-to-end testing, shared deployment acceptance and Phase 3 workflow
integration remain pending.

## Decisions needed before integration

- Task 3.2: define authorized storage/upload access to actual image bytes,
  attachment ownership, size limits, evidence sufficiency and replay behavior.
- Reconcile the task list's `< 250 m` with the backend prompt's `<= 250 m`.
  The helper preserves the existing inclusive limit and compares before rounding.
- Task 3.3: define SWDI-gap direction and handling, telecom/vehicle indicators,
  and missing/stale external-record rules. The calculator's provisional input
  domain is a nonnegative integer gap from 0 to 2 and four explicit booleans.
- Clarify the Task 3.3 completion example: vehicle alone contributes 30 points
  and power alone 20, so neither independently reaches the stated 70-point trigger.
- Task 3.1: agree fallback tagging/reprocessing and provide a live implemented
  ML endpoint. The local inference schema and endpoint files are empty.

These items need review with Renz and the relevant owners. Their approval is
still pending.

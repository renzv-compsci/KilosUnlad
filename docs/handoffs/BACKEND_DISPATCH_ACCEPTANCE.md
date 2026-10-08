# Backend dispatch acceptance checklist

**Owner:** Mae Santos - Backend Engineering Lead
**Prepared:** 2026-10-07
**Status:** Isolated Docker API acceptance executed on 2026-10-09; interactive frontend and shared-deployment acceptance pending.

See the [merged-stack acceptance report](../reports/BACKEND_COMPOSE_ACCEPTANCE_2026-10-09.md)
for successful director/admin dispatch, worker-feed visibility, duplicate and
concurrent rejection, persisted consistency and restricted database permissions
against main `6e3c958`. The checklist below remains a guide for recipient deployment
and browser acceptance; local API evidence does not complete those checks.

## Baseline and scope

PR #10 merged backend commit `9e9e3a3` into main at `dc55600` on October 6,
2026 at 23:36 Manila time. The two commits have identical file trees.
Markie's reported acceptance against backend `1b185d9` covers login and read
feeds only. It does not establish dispatch or submission acceptance.

This checklist verifies Task 2.4 using real authentication, a transaction-capable
database, and the restricted application account. API dispatch and subsequent
frontend task display are separate checks. If the frontend dispatch button is
still a preview, record that limitation; an API request does not prove the button
works. Submission and other workflows remain outside this checklist.

## Setup prerequisites

- [ ] Record backend commit, frontend commit, seed revision, execution date,
  API/frontend addresses, deployment owner and database topology.
- [ ] Use an agreed synthetic acceptance database. Keep mock mode and frontend
  login fallback disabled. Allow the exact frontend origin in backend CORS.
- [ ] Confirm authenticated replica-set startup and writable PRIMARY readiness.
  The app account must inspect the unique audit sequence index while remaining
  unable to update/delete audit entries.
- [ ] Obtain active director/admin and worker accounts, plus an in-scope
  `FLAGGED_FOR_REVIEW` household with no open task. The assigned worker must
  include that household's barangay in its current jurisdiction.

The current seed is insufficient for a positive dispatch to `case_worker_test`:
`TEST-4PS-0004` in Palingon already has pending `TEST-TSK-0001`, while flagged
`TEST-4PS-0002` in Lecheria is outside that worker's Palingon-only scope.
Coordinate a separate synthetic eligible household/worker pairing with the
database owner. Do not delete the existing task or alter shared records to make
the test pass. Use independent eligible fixtures for concurrency cases.

## Positive dispatch and visibility

Use `POST /api/v1/tasks/dispatch` with an authenticated director/admin token.
Replace the placeholders below with the agreed test household and actual worker
ObjectId. Supply a timezone-qualified due date appropriate to the test run.

```json
{
  "household_id": "<eligible-synthetic-household-id>",
  "assigned_worker_id": "<actual-active-worker-object-id>",
  "assignment_notes": "Synthetic dispatch acceptance test",
  "priority": "HIGH",
  "due_date": "<timezone-qualified-ISO-date>"
}
```

- [ ] Receive HTTP 201 with the frozen contract's fields. The response body is
  the dispatch data directly; record task ID and audit receipt sequence/hash.
- [ ] Confirm exactly one new task is stored as `PENDING_DISPATCH`, with the
  requested worker, notes, priority and due date.
- [ ] Confirm the household becomes `UNDER_INVESTIGATION` and exactly one
  `TASK_DISPATCHED` audit entry records the committed change.
- [ ] Confirm the receipt sequence/hash matches the stored audit entry and
  recomputation with the existing hash helper.
- [ ] Log in as the assigned worker. Verify the new task via
  `GET /api/v1/tasks/assigned`, then refresh the actual frontend and confirm its
  household, instructions and due date display correctly.
- [ ] Refresh director triage. An all-status query reflects the status change;
  a flagged-only query excludes the dispatched household.
- [ ] Confirm another worker and out-of-scope users cannot see the new task.

## Rejection, concurrency and rollback

Record before/after task, household and audit state for each case.

| Case | Expected result |
| --- | --- |
| Repeat the successful dispatch | HTTP 409 `ACTIVE_TASK_EXISTS`; no additional writes |
| Two simultaneous requests on a separate eligible household | One successful task/transition/audit; competing request rejected |
| Worker or auditor attempts dispatch | HTTP 403; no writes |
| Missing/invalid token | HTTP 401; no writes |
| Malformed body or worker ID | HTTP 400; no writes |
| Nonexistent household | HTTP 404 `HOUSEHOLD_NOT_FOUND`; no writes |
| Inactive/non-worker assignee | HTTP 400 `INVALID_ASSIGNED_WORKER`; no writes |
| Actor or worker outside household jurisdiction | HTTP 403; no writes |

- [ ] Run the rejection/concurrency cases against the agreed deployment.
- [ ] In a disposable deployment-equivalent environment only, inject an audit
  write failure and prove that task creation and household transition roll back.
  Do not inject failures into shared application data.

## Evidence and closure

Record each check as pass/fail/not run with expected/actual behavior, exact
commits and redacted errors. Exclude passwords, tokens, signing secrets and
credential-bearing connection strings. Capture frontend display evidence and
API/persistence evidence separately.

- [ ] Record my backend test results and remaining deployment limitations.
- [ ] Markie records actual frontend dispatch/task-display results and any UI
  preview limitation. This document prepares that request; it sends no message.
- [ ] The team records acceptance against the agreed environment before Task
  2.4 is marked complete. Local smoke/unit results alone do not close it.

References: [dispatch contract](../contracts/admin-web/admin-task-dispatch.json),
[current backend status](../reports/PHASE1_TO_PHASE4_STATUS.md),
[prior isolated deployment evidence](../reports/PHASE2_MERGED_DEPLOYMENT_VERIFICATION.md).

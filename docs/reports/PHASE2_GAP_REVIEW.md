# Phase 2 backend gap review

Reviewed 2026-09-24 against local main merged at cdd33f4 and backend d92a4e7.
This is an implementation review, not an approved schema or API change.

## Task 2.2: State machine

The order guard implements all four consecutive transitions. The transaction
service checks current actor permissions, jurisdiction and stored status, and
commits status and audit together. These foundations do not implement every
business prerequisite. Only dispatch has a mounted live mutation route.

| Transition | Current support | Remaining work |
| --- | --- | --- |
| ACTIVE_COMPLIANT -> FLAGGED_FOR_REVIEW | Order guard and generic transaction service | Trusted risk evaluation and associated audit policy; risk calculation belongs to Task 3.3. Do not add an arbitrary status endpoint. |
| FLAGGED_FOR_REVIEW -> UNDER_INVESTIGATION | POST /api/v1/tasks/dispatch, task creation and audit transaction | Verify against the shared transaction-capable deployment and restricted application role. |
| UNDER_INVESTIGATION -> NOTICE_OF_INELIGIBILITY | Order guard; VerificationTask has admin_resolution fields | Approved administrative review API, notice/deadline storage, approval prerequisites and notice audit-action mapping. A field recommendation alone must not finalize graduation. |
| NOTICE_OF_INELIGIBILITY -> GRADUATED | Order guard and separate elapsed-window helper | Persisted notice/appeal state, explicit trusted graduation policy, agreed trigger/authorization and atomic audit integration. |

The generic persistence service does not automatically call the appeal helper.
Any future graduation policy must enforce it using stored state inside the
transaction. No current public graduation route bypasses it because none exists.
Retention, reinvestigation and calamity/resumption transitions are not defined by
the linear guard; existing task decision enums alone do not define their rules.

## Task 2.3: Due process

Implemented: pure deadline calculation (15 elapsed 24-hour days), minimum-window
validation, and rejection of premature graduation or any appeal/pause/unknown
hold. Exact deadline equality passes timing only, not authorization.

Missing in the reviewed repository:

- Beneficiary notice instant and appeal deadline storage; the schema is strict.
- A durable appeal docket and pause/resolution state design.
- A frozen request, response and error contract for POST /api/v1/appeals/docket.
- Mounted appeal routes and controller implementation (both files are empty).
- Agreed pause/resume calculation, late/duplicate appeal handling and resolution
  permissions. Whether the clock starts at approval or notice service also needs
  explicit agreement before persistence is wired.
- An agreed audit action for entering notice. The current enum has APPEAL_FILED
  and BENEFICIARY_GRADUATED, but no explicit notice action. Do not label notice as
  completed graduation or introduce a new enum without a decision.

Decisions 002/003 approve dispatch metadata, SYSTEM_CONFIG_UPDATED and login
timestamp support. They do not resolve appeal persistence or docket contracts.
The field submission contract returns SUBMITTED; it is not an administrative
approval or appeal contract.

## Next actions and ownership

1. Mae: present the above storage, contract, audit and timing questions to Renz
   and Dustin. Keep both tasks unchecked until their full behavior is verified.
2. Renz/team: settle the due-process API and business rules, including the notice
   audit action and pause/resume semantics, through the decision process.
3. Renz: resolve deployment ownership and index readiness through Decision 006.
   Dustin reviews/implements schema changes only when agreed and assigned; no
   broader role permissions or replica-set work are automatically assigned to him.
   Audit update/delete restrictions remain intact.
4. Mae: consume those approved models/contracts, implement transactional notice,
   docket and graduation policies, then test rollback, stale writes, duplicate
   submissions, role/scope restrictions and deadline/hold boundaries.
5. Markie: verify frontend integration against the agreed live endpoints with
   fallback disabled once the backend is ready.

Live triage and assigned-task feeds are implemented and tested, including
dispatch-to-feed visibility and worker/jurisdiction isolation. This does not
complete the remaining notice/graduation and appeal workflows.

## Evidence and scope

Read: docs/tasks/MAE_BACKEND.md; core architecture/overview/structure and Mae's
prompt; decisions 001/002/003/005; available contract inventory and field
submission contract; Beneficiary, VerificationTask and AuditLog models; workflow,
workflowPersistence and appealLifecycle services; mounted v1 routes and appeal
tests. No new runtime behavior or shared schema/contract changes are made by
this review. Existing Phase 3 local edits are outside this review.

Current verification: see [backend verification status](BACKEND_VERIFICATION_STATUS.md).
The earlier 61-pass/2-skip run is historical; its Docker suites were opt-in, not
failing. Filter/mapping choices still require frontend confirmation. Appeal gaps remain.

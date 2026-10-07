# Frontend/backend compatibility review

**Author:** Mae Santos - Backend Engineering Lead
**Date:** 2026-10-07
**Backend:** `9e9e3a3` on backend-mae; merged into main at `dc55600`.
**Frontend:** `b36361c` on origin/frontend-markie.
**Scope:** Static source review. No new frontend/runtime tests or live acceptance.

The frontend includes main through `c030c77`, not the newer PR #10 merge.
Its historical acceptance report describes that older backend. Use the current
backend README and routes for integration; older claims that no audit endpoint
exists are superseded. No frontend files, contracts or database decisions were
changed for this review.

## Integration map

| Feature | Current compatibility | Remaining integration |
| --- | --- | --- |
| Login | Frontend POST `/api/v1/auth/login` accepts the direct session response, rejects mock login and uses Bearer tokens | Repeat acceptance against the selected current commits; earlier teammate report used backend `1b185d9` |
| Triage | GET `/api/v1/beneficiaries/triage-queue` uses supported page/limit/status and maps items/pagination | Frontend always requests flagged records; filtering within a page does not filter the complete database |
| Assigned tasks | GET `/api/v1/tasks/assigned` sends no worker override and maps `tasks`, instructions, coordinates and due date | Verify new dispatch visibility; distinguish UI-derived values from stored dispatch metadata |
| Dispatch | Backend POST `/api/v1/tasks/dispatch` exists; frontend modal explicitly disables dispatch and uses sample staff | Add a frontend caller and agreed real worker options; complete acceptance before enabling the action |
| Chain verification | Backend GET `/api/v1/audit/verify-chain` exists; audit screen uses sample blocks and local tamper simulation | Add authenticated range query and display actual response/error states |
| Submission | Frontend helper posts `/api/v1/tasks/:id/submit`, but backend has no mounted route; App keeps synchronization disabled | Keep upload disabled until trusted evidence and transactional submission are implemented |
| Appeals, calamity, prediction | Backend has internal helpers/placeholders, not public workflow endpoints | Approved contracts/policies and persistence required; previews are not live workflows |

## Dispatch instructions for frontend continuation

Use the authenticated shared API client for POST `/tasks/dispatch`. Only active
SUPER_ADMIN and REGIONAL_DIRECTOR accounts may dispatch, with current jurisdiction
checks. Send the frozen dispatch contract's household ID, actual worker ObjectId,
notes, priority and timezone-qualified due date. Sample staff IDs must not be sent.
There is no worker-directory route in the current backend; agree a provisioning
or approved lookup contract before building real selectable staff options.

HTTP 201 returns dispatch fields directly, including task ID, household status
and audit receipt. The API adapter currently has no dispatch function. Preserve
the receipt, refresh flagged triage and verify the new task under the assigned
worker account. Duplicate dispatch returns 409 ACTIVE_TASK_EXISTS; invalid
worker/body, role and jurisdiction errors must remain visible without showing
success. Follow [dispatch acceptance](BACKEND_DISPATCH_ACCEPTANCE.md), including
its fixture warning. The present seeded household/worker pairing cannot be used
for a successful new dispatch unchanged.

## Audit integration instructions

Use GET `/audit/verify-chain` with both `start_sequence` and `end_sequence` as
positive integers, inclusive, covering at most 1,000 existing entries. Only active
COA_AUDITOR and SUPER_ADMIN accounts may verify the global ledger. Do not use
fixed sample sequence numbers or assume an empty ledger has 1,000 blocks.
There is no audit-list or ledger-head discovery endpoint in the current router;
use an agreed known range for acceptance and coordinate a discovery contract
before automatic range selection or a live block browser.

The direct response contains `is_chain_valid`, `total_blocks_verified`,
`verification_timestamp`, `genesis_hash`, `head_hash` and `broken_blocks`.
HTTP 200 can mean tampering: inspect `is_chain_valid`, not status alone.
Handle 400 INVALID_QUERY, 409 AUDIT_RANGE_INCOMPLETE/AUDIT_ENTRY_INVALID,
401/403 and sanitized storage failures. Never turn failed requests into a
verified shield. Missing ranges do not report success.

The backend verifies a sequential SHA-256 hash chain, not a Merkle DAG, digital
signature or current household-document integrity. The sample screen's Merkle,
signature and auditor-key text does not describe the implemented backend.
Partial ranges trust the predecessor's stored hash. The verifier does not return
a complete ledger listing, so sample block details cannot be relabeled live.
See [verifier behavior and limits](../../server/README.md#audit-chain-verification).

## Presentation details to confirm

- The assigned feed does not return stored task priority, dispatch timestamp or
  task status. The frontend derives priority from household risk score, renders
  a missing dispatch date, and defaults status to PENDING_VISIT. These values
  must not be represented as stored dispatch priority/status. Agree any contract
  extension before changing the backend feed.
- The triage adapter consumes items/pagination but does not expose backend
  `summary_metrics` to callers. Dashboard analytics remain sample presentation;
  a current-page item count is not the full authorized caseload.
- The default API address is `http://localhost:5000/api/v1`; VITE_API_URL can
  override it. Backend CORS must allow the exact frontend scheme/host/port.
  Keep mock mode and login fallback disabled; never put backend secrets in Vite
  variables. An unreachable API message alone does not identify CORS as the cause.

## Evidence and next steps

Source reviewed: frontend services/api.ts, App.tsx, useOfflineSync.ts, dispatch,
field-task and audit screens; backend v1 router, readFeeds, dispatcher,
audit controller and hashChain service. Markie's notes report 40 frontend tests
and successful typecheck/build; this review did not rerun or independently
validate those results.

1. Confirm the frontend and backend commits for the next acceptance session.
2. Complete real dispatch UI/worker selection and audit range integration with
   Markie; do not change his branch as part of Mae's documentation work.
3. Execute isolated API/persistence checks and record actual frontend acceptance
   separately. Keep submission/appeal workflows pending until implemented.

These are prepared integration instructions; no message was sent to teammates,
no acceptance checkbox was closed and no deployment was changed.

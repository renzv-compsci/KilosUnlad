# Phase 3 and Phase 4 backend handoff

**Author:** Mae Santos — Backend Engineering Lead

**Date:** 2026-09-30

**Reviewed:** 2026-10-01

**Recipients:** Renz and Charles

**Status:** Placeholder handoff prepared under Renz's September 30 instruction;
full workflow acceptance remains outstanding.

## Direction and scope

Renz requested backend work through Phase 4 with placeholders for the data/ML
and remaining testing integrations, then a comprehensive Markdown handoff for
continuation by Renz and Charles. This supersedes waiting for every integration
decision before preparing a handoff. It does not make a stub a completed workflow.

Base: `backend-mae` after merge `4640351`, including main `c030c77`. This document
describes the handoff changes following that merge. Use the commit containing
this document as the handoff revision when reporting integration results.
Existing authentication, read feeds and transactional dispatch remain the live
implementation. Phase 3 helpers and Phase 4 placeholder controllers are unmounted.

Review baseline: `dcfd67f` on `backend-mae`; [PR #10](https://github.com/renzv-compsci/KilosUnlad/pull/10).
Documentation revisions after that baseline do not change the implementation.
Start with this guide, then [Phase 1–4 status](../reports/PHASE1_TO_PHASE4_STATUS.md)
and [live verification](../reports/LIVE_AUTH_FEED_VERIFICATION.md).

## Component map

Paths below are relative to `server/`.

| Task | Available implementation | Continuation boundary |
| --- | --- | --- |
| 3.1 | `src/services/mlClient.service.js`: `createMlClient().predict({ household_id, demographics })` | Supply live ML service; implement fallback using approved external-data rules, tagging and persistence |
| 3.2 | `src/services/sync.service.js`: `prepareSubmission`, `createSubmissionAuthorizer`, `verifyEvidenceHash`; `src/utils/geoFence.js` | Acquire trusted attachment bytes; atomically recheck authorization and write submission plus audit; mount controller |
| 3.3 | `src/services/discrepancy.service.js`: `calculateRiskScore` | Map real ML/ExternalRecord inputs, apply moratorium and lifecycle policies, persist with audit |
| 3.4 | `src/services/calamity.service.js`: `hasActiveCalamityMoratorium` | Approve toggle request/response and date rules; load correct SystemConfig, authorize and audit mutations |
| 4.1 | `src/controllers/audit.controller.js`: `createVerifyChain` delegates to placeholder by default | Real chain reading/verification, query limits, authenticated role restrictions and route mounting |
| 4.2 | `src/middleware/audit.middleware.js`: unmounted mutation-blocking placeholder | Integrate transactional audit recording into each mutation workflow |
| 4.3 | Strict Joi body validation; sanitized JSON, Mongoose and size errors; HTTP error-boundary tests | Supply schemas and async error forwarding for each future route; repeat acceptance as workflows are mounted |

`src/services/integrationPlaceholders.service.js` exposes async
`evaluateHousehold`, `submitTask`, `applyRiskAssessment`, `toggleCalamity` and
`verifyChain`. Each throws a sanitized WorkflowError with status 503 and code
ENDPOINT_NOT_READY. They do not implement inputs/outputs or pretend success.
These internal names are replacement seams, not new public contracts. Callers
must catch/forward failures. The existing Express error middleware handles them.

## Inputs, outputs and continuation order

These are existing internal interfaces, not approvals for new public endpoints.

| Interface | Input | Current output / failure |
| --- | --- | --- |
| `createMlClient().predict` | Household ID and six demographic features in the ML contract | Validated contract prediction body; typed INVALID_FEATURE_VECTOR, ML_TIMEOUT, ML_UNAVAILABLE or INVALID_ML_RESPONSE errors |
| `prepareSubmission` | Contract submission body and route task ID | `{ task_id, household_id, field_findings }`; validation failure stops processing |
| Authorizer returned by `createSubmissionAuthorizer` | `{ input, routeTaskId, actorId, session }` | Prepared submission after current database authorization checks; no writes |
| `verifyEvidenceHash` | Actual byte Buffer and expected SHA-256 hex string | Normalized matching hash; invalid input or mismatch fails |
| `calculateRiskScore` | Explicit level gap and four Boolean indicators | `{ score, meetsFlagThreshold, contributions }`; invalid inputs throw |
| `hasActiveCalamityMoratorium` | `{ zones, address, now }`, with Date objects | Boolean hold decision; invalid configuration throws |
| Five integration placeholders | No implemented input contract | Always reject with 503 ENDPOINT_NOT_READY; no prediction, receipt or success output |

Recommended continuation:

1. Charles supplies the ML endpoint using the frozen request/response contract;
   Renz confirms external-data mapping and fallback policy. Exercise the internal
   client against that service before persisting predictions.
2. Renz/Charles connect risk and calamity helpers to approved data and policies.
   Agree missing/stale-data behavior and record provenance before enabling writes.
3. Complete trusted evidence acquisition and transactional submission, including
   authorization rechecks and a single atomic audit entry. Mount routes only with
   approved contracts, role checks and replay/concurrency tests.
4. Implement real audit-chain verification and workflow-level audit writes.
   The generic mutation guard is a placeholder, not a working interceptor.
5. Repeat end-to-end acceptance for each connected workflow. Record the exact
   commits, data setup and remaining failures before marking its original DoD done.

## Contracts and integration responsibilities

- ML: preserve `docs/contracts/ml/ml-swdi-inference.json`. The client accepts six
  demographic features, rejects coercion/unknown fields, validates returned household
  identity and response shape, and enforces a 2500 ms total deadline. It has no retries
  or redirects. The 1 MiB response cap and probability-sum tolerance are documented
  in the backend README. Outage errors require explicit workflow fallback handling.
- Submission: preserve `docs/contracts/field-tablet/field-task-submission.json`.
  Preparation maps flat fields to existing `field_findings`; it is not persistence.
  Authorization reloads active worker, assignment, household and scope; only
  PENDING_DISPATCH/CACHED_OFFLINE are eligible. Repeat inside the eventual transaction
  and condition writes to prevent concurrent reassignment or duplicate submission.
- Evidence: `verifyEvidenceHash(Buffer, hexDigest)` returns normalized SHA-256 on
  match and the exact contract's 422 EVIDENCE_HASH_MISMATCH on altered bytes. Storage
  URLs are not downloaded by the helper. An authorized, size-limited upload/storage
  adapter must bind actual bytes to attachments. Image decoding, ownership, minimum
  evidence, replay handling and submitted_at persistence/response need completion.
- Risk: inputs are `{ swdiDifference, power, water, telecom, vehicle }`; explicit
  booleans and an integer gap 0–2 are required. Output contains score, threshold
  Boolean and uncapped contributions. Weights are 40/20/15/25/30; cap 100, flag at
  70. Real gap direction, telecom/vehicle categories and missing/stale-data behavior
  remain policy choices. Vehicle alone gives 30, power alone 20, not 70.
- Geofence: raw distance decides the inclusive 250 m boundary; display is rounded.
  The task list says `< 250 m`, while the backend prompt says `<= 250 m`; confirm.
- Calamity: exact province/municipality matching. Provisional interval is
  declared_at <= now < expires_at; omitted expiry means open-ended, null is invalid.
  Dates must be stored Date objects. Any matching active zone holds; invalid data
  throws and callers must stop processing rather than interpret failure as no hold.
- Audit verification: preserve `docs/contracts/admin-web/audit-chain-verification.json`.
  The placeholder returns no verification data. Real implementation must recompute
  with `computeEntryHash`, preserve the established colon-separated hash format,
  detect gaps/duplicates/link mismatches/tampering and define partial-range anchoring.
  Use a consistent read strategy; do not report success for missing requested blocks.
- Audit writes: reuse the atomicity pattern in `workflowPersistence.service.js`.
  Mutation and audit must share one transaction. Do not append on response finish
  or audit successful dispatch twice. Determine trusted actor/IP and before/after
  state in the workflow. Placeholder audit middleware blocks mutations if installed;
  it is intentionally not global middleware.
- Validation: `validateBody(JoiSchema)` sets `req.validatedBody` on success, rejects
  invalid input with sanitized 400 INVALID_REQUEST, and does not coerce types.
  Controller errors and async rejections must reach the central handler. Mongoose
  validation/cast failures return sanitized 400 INVALID_REQUEST; oversized JSON
  returns 413 PAYLOAD_TOO_LARGE. Unknown errors remain sanitized 503. HTTP tests
  cover malformed JSON, Joi/Mongoose errors, forwarded async failures and continued
  availability. Internal errors are not additions to frozen contracts.

## Environment and verification

Use Node 20, install dependencies from `server/package-lock.json`, and follow
`server/README.md`. Real auth requires PHASE1_MOCK_MODE=false and a private JWT
secret of at least 32 characters. Never commit test credentials or signing keys.

Run `node --test` from `server/`. Optional suites require TEST_MONGO_URI,
RUN_WORKFLOW_MONGO_TESTS/MONGOD_PATH, RUN_DB_RECOVERY_TESTS and
RUN_AUDIT_ROLE_TESTS/DOCKER_PATH. Use disposable databases for destructive cases.

Prior evidence: September 28 combined run 87 passed/3 skipped, then all skipped
suites passed separately (Docker follow-up 4, database login/feeds 12). September
29 calamity/risk tests passed 10. Counts overlap and are not additive. See
`docs/reports/PHASE3_BACKEND_CHECKPOINT.md` for limitations.

New placeholder/validation tests cover failure propagation, no false audit success,
mutation blocking and strict request validation. Final run results are recorded
below. These tests do not verify a 1,000-block chain or complete
automatic audit interception.

September 30 verification:
`node --test test/handoffPlaceholders.test.js test/app.test.js` — **10 passed,
0 failed, 0 skipped**. `git diff --check` passed.

## Acceptance and handoff checklist

September 30 follow-up: complete backend regression with all database/Docker
options enabled passed **101 tests, 0 failures, 0 skips**, including HTTP
validation/error handling. This supersedes earlier partial test-run counts for
the current working tree, not the outstanding live integration requirements.

- Renz/Charles: replace the named placeholder boundaries with approved implementations.
- Confirm pending scoring, upload, geofence and calamity decisions before mounting routes.
- Add route-level authentication/RBAC and exact contract responses; placeholders
  are currently unmounted and do not expose new endpoints.
- Run live ML, submission, risk and moratorium workflows with real test records.
- Verify 1,000 audit blocks, tampering/link/gap detection and concurrent writes.
- Verify failed mutations cannot commit without their audit entry.
- Existing HTTP error-boundary tests already pass; extend them for newly mounted routes.
- The merged fresh-start deployment and actual dispatch were verified on September
  30. Shared-environment acceptance and existing-volume migration remain separate;
  see [deployment evidence](../reports/PHASE2_MERGED_DEPLOYMENT_VERIFICATION.md).

## Latest verification and remaining dependencies

- Historical complete backend regression: **101 passed, 0 failed, 0 skipped** on
  September 30. This review changes documentation only; that count is not a new run.
- Four seeded accounts passed live login and backend role-access checks. Eleven
  additional API cases passed pagination, filters, invalid-query handling, worker
  override rejection and correctly signed expired-token rejection.
- Director/worker browser checks were independently observed on September 30.
  SUPER_ADMIN/COA_AUDITOR basic login and triage checks were user-confirmed on
  October 1. Markie's independent acceptance remains pending.
- Dustin's current pending task is in Lecheria while the worker is scoped to
  Palingon. Positive assigned-task display needs an in-scope sample. Current seed
  counts are 3 households/2 tasks versus Decision 007's approved 5/3.
- Phase 2 notice/graduation and persistent appeal contracts/policies remain open.
  They are not silently implemented by the Phase 3–4 placeholder direction.

At the `dcfd67f` review baseline, the PR diff against main `c030c77` contains
backend code/tests, backend documentation and task/status notes. Continuation
requires coordination with data/ML and database owners at the boundaries above.

Tasks 3.1–3.4 and 4.1–4.3 remain unchecked against their original full definitions
of done. Placeholder handoff readiness is a separate status under the PM instruction.

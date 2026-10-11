# Dispatch Frontend Acceptance

Owner: Markie Angelo. Tested October 12, 2026 (Asia/Manila).

## Scope and Versions

- Frontend: `frontend-markie` at `e2adcfa` (PR #18, now merged).
- Local API: `kilosunlad-markie-server:main-dc55600`, port 5000,
  `PHASE1_MOCK_MODE=false`, real JWT authentication; no login fallback.
- Latest fetched main: `fcde07a`. It was not merged or deployed locally in this
  test. This result does not certify the newly merged full backend/ML stack.
- Official fixture: Dustin's `data-pipeline/scripts/add_dispatch_test.js`,
  introduced in `4878066`, extracted unchanged from fetched main.

## Fixture Preparation

The household was absent from this isolated local DB. Ran Dustin's additive
script against that DB; no reset, volume deletion, reseed, or replacement of
existing samples was performed.

- Household: `TEST-4PS-DISPATCH-0001`, Palingon, `FLAGGED_FOR_REVIEW`, no active task.
- Dustin's supplied worker ID: `6ac6cdf857ed3046949df8a5`.
- Verified local `case_worker_test` ID: `6abfe8945cc7ce0bb89df8a5`.
- The local account was active with Palingon jurisdiction. Its local ID was used
  in the frontend dispatch form; IDs must not be assumed portable across DBs.

## Actual Results

| Check | Result |
| --- | --- |
| Director dispatch through the real frontend form | `POST /api/v1/tasks/dispatch` returned **201 Created**, confirmed in backend access logs. |
| Success receipt | Task `TSK-2026-26ee0f2d-ee7f-4121-bf6b-af2071be8949`, household `TEST-4PS-DISPATCH-0001`, audit sequence **5** displayed in the UI. |
| Flagged queue refresh | Count changed from 3 to 2; dispatched fixture disappeared, original Maria/Rosa records remained. |
| Worker login and assigned feed | The exact new task appeared in the worker UI and `GET /api/v1/tasks/assigned`, alongside original `TEST-TSK-0001`. |
| Jurisdiction filtering | Palingon assignment visible; Lecheria household absent from worker feed. |
| Stored state, read-only DB check | Household `UNDER_INVESTIGATION`; task `PENDING_DISPATCH`, assigned to the verified local worker. |
| Audit verification | COA account verified the actual existing range **1..5** successfully, including the new dispatch receipt. |

Submitted deadline: October 26, 2026 (end of day, Philippine time). Priority: HIGH.
Instructions: "Synthetic frontend dispatch acceptance for Dustin fixture. Verify
Palingon assignment and audit receipt."

DB counts before fixture preparation: 4 households, 2 tasks, 4 audit entries.
After preparation and dispatch: 5 households, 3 tasks, 5 audit entries.
Existing samples were retained. The successful POST was not repeated.

## Evidence and Retesting

Local evidence is outside Git under `../kilosunlad-isolated-test` relative to the
repository root:

- `dispatch-success-2026-10-12.png`: actual frontend receipt.
- `worker-dispatch-feed-2026-10-12.png`: worker assigned-task screen.
- `Verify-DispatchResult.cjs`: passing read-back checks for director queue, worker
  feed and audit verification. Credentials/tokens are not included in this handoff.

The fixture now has an active task. Do not reset it or repeat dispatch expecting
another 201. Coordinate a fresh eligible fixture for another positive test;
`ACTIVE_TASK_EXISTS` after this run would be consistent with the new DB state.

No product code was changed for this acceptance run. Previous unit/build/PWA
results remain historical; they were not rerun for these documentation-only edits.

This closes the positive local dispatch-to-worker-feed acceptance gap recorded
on October 11. Other phase dependencies require separate checks against the
newer runtime and handoffs; they are not declared complete by this result.

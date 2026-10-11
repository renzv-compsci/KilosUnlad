# Latest Main Compatibility Check

Checked October 12, 2026, after the successful dispatch acceptance.

## Baseline and Safety

- Fetched and merged `origin/main` at `fcde07a` into `frontend-markie` without
  conflicts, retaining the dispatch acceptance handoff.
- Rebuilt/restarted only the isolated backend as
  `kilosunlad-markie-server:main-fcde07a` on port 5000.
- Verified MongoDB URI, JWT secret, CORS and `PHASE1_MOCK_MODE=false` stayed
  unchanged. The MongoDB container ID stayed unchanged.
- No reset, reseed, fixture replacement, new dispatch or backend source edits.
- Frontend dev server remains available at `http://127.0.0.1:3000/`.

## Verification

- Real API login for all four roles, invalid login, anonymous rejection, CORS,
  read-feed permissions and jurisdiction filtering passed.
- Read-back confirmed the previously dispatched task remains in the Palingon
  worker feed alongside the original task; Lecheria remains excluded.
- Director flagged queue remains at 2 with the dispatched household absent.
- COA verification of actual audit range 1..5 remains valid.
- Frontend: 62 tests passed; TypeScript passed; production build passed;
  2 production PWA tests passed.
- Existing production JS chunk warning remains (approximately 509 kB).
- Frontend HTTP availability checked; no new browser/hardware acceptance or
  fresh successful dispatch is claimed for this runtime update. See the separate
  [dispatch acceptance](FRONTEND_DISPATCH_ACCEPTANCE_2026-10-12.md) for earlier UI evidence.

## Confirmed Integration Gaps

Inspected `server/src/app.js` and `server/src/routes/v1/index.js` on this baseline.
The real-mode router mounts login, triage, assigned tasks, dispatch and audit
verification only. Helpers and internal ML code do not establish public routes.

| Workflow | Latest-main evidence | Frontend action |
| --- | --- | --- |
| Field submission/sync | Authenticated POST to `/tasks/FRONTEND-ROUTE-PROBE-NONEXISTENT/submit` with empty payload returned 404. No submission route mounted. | Keep reports local; do not enable server sync. |
| Appeals | Authenticated POST `/appeals/docket` with empty payload returned 404; route absent from real-mode router. | Retain preview designation. |
| Evidence upload | No upload route mounted in real-mode router. | Await authorized storage/upload contract and endpoint. |
| ML/aggregates | ML artifact/service and updated internal client are present, but no public inference/aggregate route mounted in Express. | Do not connect the browser directly to the internal ML service or relabel sample charts as live. |
| Staff directory/admin task list | No corresponding routes in real-mode router. | Preserve manual verified worker ID entry and clearly labeled preview admin list. |

The route probes used no actual task ID or evidence and did not mutate records.
No ML container was started or model predictions certified in this check.

## Coordination and Remaining Frontend Work

Renz/Charles: provide the integration-ready backend version exposing authorized
submission, evidence upload and appeals, plus approved request/response and replay
rules. Provide the frontend-facing ML/aggregate contract and sample records.
The ML subsystem being implemented is distinct from frontend-facing integration.

Once available, Markie can connect and test those workflows without implementing
backend-owned routes. Physical tablet install, camera/GPS, offline draft recovery,
offline-to-online submission and full demo rehearsal remain outstanding.

Local verification scripts are outside Git in `../kilosunlad-isolated-test`:
`Verify-API.cjs`, `Verify-DispatchResult.cjs`, and
`Verify-IntegrationAvailability.cjs`. Secrets are not included in this report.

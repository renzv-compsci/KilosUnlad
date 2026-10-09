# Frontend Acceptance - October 9, 2026

Historical snapshot of the audit/UI acceptance pass. The subsequent offline follow-up
is documented in `OFFLINE_FRONTEND_HANDOFF.md` (58 frontend + 2 artifact tests).
Version/publication statements below describe this pass before its later commit.

## Versions and scope

- Frontend: `frontend-markie`, local working-tree changes based on `b36361c`.
  This report does not imply that these changes have been committed or pushed.
- Backend runtime: exact server snapshot from main
  `dc55600e2410eaa485b2219f82b47dcb57b39b27`, containing the audit verifier.
- Latest backend handoff consulted: `backend-mae` at `86f7977`.
- Frontend branch itself has not merged the newer main commits. Its existing main
  baseline is `c030c77` via `c6d4828`; the isolated runtime is a separate checkout.
- App: http://127.0.0.1:3000/; API: http://localhost:5000/api/v1.
- Real authentication, `PHASE1_MOCK_MODE=false`, no frontend login fallback.
- Only frontend implementation/docs changed in the shared repository.

## Runtime safeguards

Updated only the server in the existing `kilosunlad-markie-test` Compose project.
The server image installs its pinned dependencies with `npm ci`. Recreated the
server with `--no-deps`, explicitly avoiding the seed/init services. Existing MongoDB
URI, JWT secret, CORS configuration and mock-mode setting were preserved and compared
after restart. The database container ID stayed the same.

Read-only database checks before/after: 4 users, 4 beneficiaries, 2 verification
tasks, **0 audit logs**. No audit sequence indexes exist yet. No database reset,
volume deletion, reseed, synthetic audit insertion or deliberate corruption occurred.
Secrets and login tokens are not included in this report.

## Actual API results

All checks below used genuine test-account login against the updated local runtime,
not mocked fetch responses or a successful dashboard render alone.

| Check | Result |
| --- | --- |
| Login for SUPER_ADMIN, REGIONAL_DIRECTOR, CASE_WORKER, COA_AUDITOR | Passed, real JWT |
| Invalid login / unauthenticated request | 401 |
| CORS for the exact frontend origin | Passed |
| Triage and assigned-task role permissions | Passed |
| Worker assigned feed | TEST-TSK-0001 linked to TEST-4PS-0004 in Palingon |
| Outside-scope worker samples | Lecheria household and Real/submitted task excluded |
| Director workload summary | 2 high-risk, 1 under investigation, 0 notices |
| Audit as SUPER_ADMIN / COA_AUDITOR, missing range 1..1 | 409 AUDIT_RANGE_INCOMPLETE |
| Audit as REGIONAL_DIRECTOR / CASE_WORKER | 403 |
| Audit without authentication | 401 |
| Allowed roles: missing bound or 1..1001 (over limit) | 400 INVALID_QUERY |

The 1..1 request is a deliberate **missing-range negative test**, not an assumed
valid range. The previous audit 404 is resolved. Positive chain verification remains
untested against real records because `audit_logs` is empty. A 409 is not successful
verification. Broken-chain HTTP 200 and valid responses are covered only by synthetic
frontend tests; this does not establish live chain integrity.

## Frontend checks

- `npm test`: 50 passed, zero failures/skips.
- `npm run typecheck`: passed.
- `npm run build`: passed; existing main-bundle size warning remains (506.50 kB).
- Live dashboard inspected at desktop, 390x844 and 320x640. No horizontal page overflow.
- Live records appear before clearly labeled sample charts; source detail expands
  without changing data. Existing chart/map interactions are retained.
- Real caseworker login displays the scoped Palingon assignment. Saved Drafts shows
  local-only storage and disabled server submission; no draft was uploaded.
- Auditor identity reflects the logged-in account. Audit page starts unverified;
  an actual 409 renders the missing-range error, not a success state.
- AOM "Check Preview" explicitly reports nothing saved/sent/certified.
- Appeal dialog footer stays visible on desktop, 390px and 320px. Keyboard focus
  remains trapped; Escape closes and returns focus to its opener.
- Navigation toggling remains separate from navigation-button actions.

Browser recovery note: older in-app tabs became suspended error pages after an
interruption. A fresh tab at the same localhost loaded normally; final worker and
responsive overview checks were completed there. No security settings were changed.

## Still pending / coordination

1. Mae/Dustin: provide an existing populated audit sequence range or agree on an
   approved workflow that creates records. Then test successful verification as both
   allowed roles. Do not reset/reseed or fabricate audit history to make it pass.
2. Dispatch/reassignment writes, appeal persistence, field submission/evidence sync,
   and model-backed analytics remain disabled or explicitly labeled previews until
   their frontend contracts and test setup are confirmed. Do not count these as complete.
3. Cold-start offline/PWA behavior and production performance are not certified by
   this pass. A network-mode toggle alone is not a real offline acceptance test.
4. Commit/push this frontend working tree and share its actual resulting SHA before
   asking teammates to reproduce the same version.

## Short update for Mae

Updated my isolated backend runtime to main dc55600 with mock mode false and frontend
fallback disabled. Actual login/triage/assigned-task checks passed, including the
Palingon task and out-of-scope filtering. Audit endpoint no longer returns 404:
auditor/admin reach it and get the expected 409 for missing records, director/worker
get 403, and invalid bounds get 400. Local audit_logs is still empty, so I need an
existing valid range before confirming successful chain verification. No DB reset,
reseed or credential/config changes. Frontend changes are still local pending push.

# Frontend UI Review

Runtime follow-up: [latest-main compatibility](FRONTEND_MAIN_COMPATIBILITY_2026-10-12.md).
Main `fcde07a` is now merged and running locally; core API checks passed again.
Submission and appeals routes remain unmounted on this verified baseline.

Latest evidence: [October 12 dispatch acceptance](FRONTEND_DISPATCH_ACCEPTANCE_2026-10-12.md).
Real frontend dispatch returned 201 with Dustin's fixture; the new task appeared
in the worker feed and actual audit range 1..5 passed verification locally.
See the [October 11 phase handoff](FRONTEND_PHASE_STATUS_2026-10-11.md) for the
earlier phase snapshot and runtime limitations.
The remainder below records the earlier PR #16 handoff and its historical limits.

Branch: `frontend-markie`. This handoff contains frontend UI, accessibility,
preview-state, and regression-test changes. No custom backend or database changes
are part of the UI commit. The branch already includes main through `c030c77`
via merge `c6d4828`; newer main commits have not been merged for this UI handoff.

## Run on your laptop

Start from a clean checkout, or preserve your own changes before switching branches.

```sh
git fetch origin
git switch frontend-markie
git pull --ff-only origin frontend-markie
cd client
npm ci
npm run dev -- --host 127.0.0.1 --port 3000 --strictPort
```

Open http://127.0.0.1:3000/ for the actual application. If port 3000 is occupied,
choose another port and configure the backend's allowed origin to match it.

The actual application requires a running real-auth backend and privately supplied
test credentials. Follow `server/README.md` and
`docs/handoffs/FRONTEND_AUTH_HANDOFF.md` for the agreed backend version/setup.
Use `PHASE1_MOCK_MODE=false`. The frontend API URL defaults to
`http://localhost:5000/api/v1`; `VITE_API_URL` can override it in a private client
`.env.local`. Never place database credentials or JWT signing secrets in Vite env
variables. Allow the exact frontend origin in backend CORS configuration.

## Design-only review without a backend

With the same Vite server running, open:
http://127.0.0.1:3000/test/ux-preview.html

This is a development-only component fixture with a persistent QA banner and
screen selector. It renders sample records without API calls or authentication.
It is not a login bypass, production entry point, or proof of backend integration.
The assessment fixture deliberately simulates a local save failure for error-state
review. Do not use it for real beneficiary data or submissions.

## What changed

- Executive Overview: live workload and queued households appear before the labeled
  sample analytics; charts remain visible with separate, readable sections.
- Triage: four primary columns, expandable supporting evidence, visible actions,
  mobile list layout, current-page filters and pagination.
- Due process: active deadlines first, paused cases afterward, readable dates;
  calendar-only sample deadlines do not invent a cutoff time.
- Dispatch, appeals and policy previews clearly indicate unavailable writes.
- Workload summary reads the triage API's scoped counts, independently of sample charts.
- Audit verification uses the read-only API, with explicit sequence bounds and no
  simulated integrity result. Available to COA_AUDITOR and SUPER_ADMIN only.
- Accessible dialogs, sidebar behavior, assessment validation and save-error states.
- Compact, expandable data-source notices replace the repeated long disclaimer.
- Appeal/AOM dialog actions remain visible while the body scrolls on small screens.
- AOM is explicitly a local preview, never a simulated issuance or certification.
- Assigned Tasks and Saved Drafts use plain-language labels. Unavailable submission
  stays disabled; the interface does not imply that a network connection means sync readiness.
- Audit navigation no longer claims "100% Valid" before verification.

## Verification and limits

- 58 frontend tests and 2 production-precache artifact tests passed. See
  `OFFLINE_FRONTEND_HANDOFF.md` for the latest offline/device scope and limitations.
- TypeScript and production build passed. Existing main-bundle size warning remains.
- October 9: live overview checked at 320px, 390px and desktop widths without page
  overflow. Earlier chart-view checks remain applicable. Appeal actions, keyboard
  focus trap, Escape/focus restoration, AOM preview and Saved Drafts were exercised.
- Real director, caseworker and auditor browser sessions were checked. Separate
  API checks passed for all four roles, invalid login and jurisdiction filtering.
- No claim of full backend acceptance or completed live dispatch/appeal/model integration.
- Existing functional modules and API contracts are retained. No mock login fallback.
- Production shell reload passed with its preview server stopped. Worker cache/draft
  persistence and GPS/photo failures have focused tests; physical device capture and
  full airplane-mode submission remain pending. JWT expiry was not extended.

A Git push publishes source code only. Reviewers run their own frontend/backend;
the author's localhost is not a remotely accessible deployment.

## October 8 API integration follow-up

Historical result: the 404 below was resolved on October 9 by updating the isolated
runtime to main `dc55600`. See `FRONTEND_ACCEPTANCE_2026-10-09.md` for current results.

Read-only local checks confirmed director and auditor authentication (HTTP 200).
The director triage feed returned high_risk_count=2,
under_investigation_count=1, notice_of_ineligibility_count=0. These are API test
records, not production caseload totals. Missing/invalid summaries show Unavailable,
not sample counts or zero. Counts cover all program statuses in the caller's
geographic scope; the flagged queue total is a different measure.

The running isolated backend returned HTTP 404 (HTML) for
GET /api/v1/audit/verify-chain?start_sequence=1&end_sequence=1 for both tested roles.
No live audit integrity or audit RBAC acceptance is claimed. The frontend contract
was checked against origin/main dc55600, including hashChain.service.js. The local
runtime was not rebuilt, and no database migration/reset/seed was performed.

To complete audit acceptance, coordinate a backend runtime containing merged
4d0f5bc and an existing audit sequence range. Use mock mode disabled. Check a valid
range as COA_AUDITOR/SUPER_ADMIN, missing range (409), director/worker rejection
(403), and expired session (401). Broken-chain HTTP 200 responses are covered by
synthetic frontend tests; do not corrupt shared audit records for this test.

Frontend-only changes do not implement dispatch writes, appeals, uploads/sync,
or model endpoints while those dependencies remain unconfirmed.

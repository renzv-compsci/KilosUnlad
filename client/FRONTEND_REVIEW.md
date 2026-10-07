# Frontend UI Review

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

- Executive Overview: visible summary metrics/charts; compact API workload header;
  sample analytics remain labeled; real household preview appears below analytics.
- Triage: four primary columns, expandable supporting evidence, visible actions,
  mobile list layout, current-page filters and pagination.
- Due process: active deadlines first, paused cases afterward, readable dates;
  calendar-only sample deadlines do not invent a cutoff time.
- Dispatch, appeals, policy and audit previews clearly indicate unavailable writes.
- Accessible dialogs, sidebar behavior, assessment validation and save-error states.

## Verification and limits

- 40 frontend tests passed, using synthetic API responses and local component tests.
- TypeScript and production build passed. Existing main-bundle size warning remains.
- Overview checked at 320px, 390px and desktop widths; all four chart views exercised.
- Real local director login and API-backed triage display were observed separately.
- No claim of full backend acceptance or completed live dispatch/appeal/model integration.
- Existing functional modules and API contracts are retained. No mock login fallback.

A Git push publishes source code only. Reviewers run their own frontend/backend;
the author's localhost is not a remotely accessible deployment.

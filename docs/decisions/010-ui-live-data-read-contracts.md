# DECISION-010: Read-Only Contracts for the UI Live-Data Screens
**Author:** Drafted with the UI live-data work (post-merge clean start)
**Status:** PROPOSED (awaiting PM / Tech Lead sign-off)
**Date Created:** 2026-10-13

---

## 1. Context & Problem Statement
Several screens showed hard-coded sample figures (`Sample data` labels):
- Executive Overview: snapshot cards, charts, map pins and per-municipality tables.
- Caseworker Dispatch: assignment list and staff list (`MOCK_FIELD_TASKS`, invented names).
- Grievance dashboard: `MOCK_DUE_PROCESS_NOTICES` and a fixed hearing calendar.
- COA Audit Overview: compliance percentages and peso amounts. COA Sampling: `MOCK_TRIAGE_ITEMS` and invented registry facts.
- Policy Settings: sliders that changed nothing.
- Field Overview: fixed KPIs and sample barangays.
- Sidebar: due-process badge fixed at 3.
- Dispatch dialog: required a typed 24-character worker ID ("a staff directory is not available yet").

No existing route returned these aggregates, and the frozen contracts in `docs/contracts` define no such responses.

## 2. Options Considered
* **A.** Add five read-only GET routes with new contract files. They use the existing models only (no schema, collection or index change) and the same guards as the triage feed.
* **B.** Compute everything in the browser from the paged triage feed. This needs all 80,000 households in the client, which is not feasible, and it cannot see tasks, users or the ledger.
* **C.** Keep the samples. This was rejected by the request: the UI must reflect the data inside the system.

## 3. Recommendation: Option A
| Route | Contract | Roles | Scope |
| --- | --- | --- | --- |
| `GET /insights/overview` | `admin-insights-overview.json` | SUPER_ADMIN, REGIONAL_DIRECTOR, COA_AUDITOR | `scopeJurisdiction`; `audit` is null for directors |
| `GET /tasks` | `admin-task-list.json` | SUPER_ADMIN, REGIONAL_DIRECTOR | tasks joined to their household, then `scopeJurisdiction` |
| `GET /users/caseworkers` | `admin-caseworker-directory.json` | SUPER_ADMIN, REGIONAL_DIRECTOR | directors: same province and municipality, at least one shared barangay |
| `GET /audit/blocks` | `audit-block-list.json` | COA_AUDITOR, SUPER_ADMIN | headers only; no `state_delta` |
| `GET /insights/map` | `admin-map-density.json` | SUPER_ADMIN, REGIONAL_DIRECTOR, COA_AUDITOR | `scopeJurisdiction`; household counts per 0.002° cell, no identities (addendum 2026-10-14, for the map's "All households" layer) |
| `GET /system/policy` | `admin-policy.json` | SUPER_ADMIN, REGIONAL_DIRECTOR, COA_AUDITOR | directors see only their municipality's calamity zones |

* Unknown query parameters return 400 `INVALID_QUERY`.
* Every response is `Cache-Control: no-store`.
* No credentials or contact details are returned.
* No write route was added. Policy values stay in server constants, and `WEIGHTS` is now exported from `discrepancy.service.js` so the policy route reports the weights actually used.
* No guard was changed. RBAC, `scopeJurisdiction`, Joi, hash verification and geofencing are untouched.

## 4. Evidence
- `server/test/insights.test.js` (written before the service, replica set): scope, roles, validation, contract key shapes. 6/6 pass; full server suite 158 pass, 0 fail.
- `data-pipeline/scripts/test_ui_live_data.js` (Iron Law 1): API checks, including cross-checks against the triage feed and a real dispatch, plus a browser walk through every persona at 390, 834 and 1440 px, including a no-horizontal-scroll check. 101/101 checks pass on the Docker stack (`docs/integration/evidence/ui-live-data/`).
- Client: `npm test` 67/67, `tsc --noEmit` clean, production build succeeds.

## 5. Remaining Limits (named)
- The COA sampling decisions and the AOM draft stay on the page: no route stores them.
- Reassigning a task is not supported (no route).
- The "Field Dispatched" count per municipality uses `UNDER_INVESTIGATION` households (the status that dispatch sets).

## 6. Official PM / Tech Lead Resolution
* [ ] Decision: ACCEPTED / REJECTED
* Signed: ____________  Date: ____________

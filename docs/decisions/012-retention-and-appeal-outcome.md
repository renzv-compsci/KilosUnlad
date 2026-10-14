# DECISION-012: Retention After a Field Visit, Appeal Hearing Outcome and Re-flag Cooldown
**Author:** Drafted with the final lifecycle work
**Status:** ACCEPTED by the PM on 2026-10-14 (option C: one new audit action, appeal outcome included, 180-day cooldown); implementation verified below
**Date Created:** 2026-10-14

---

## 1. Context
After DECISION-011, the lifecycle had two dead ends:
1. **Retention.** A caseworker can report that a flagged household is still poor (`worker_recommendation: RETAIN`, Level 1 or 2). The director had no way to act on it. The household stayed `UNDER_INVESTIGATION` for good: it counted as "under review" and could never be screened again.
2. **Appeal outcome.** An appeal blocks graduation, but no route recorded the hearing result. A household that appealed stayed under notice for good, whether it won or lost.

The data model already anticipated retention (`admin_resolution.decision: RETAINED_ON_ROSTER`, task status `VERIFIED_RETAIN`). Two things were missing: the status transitions, and an audit action. None of the seven frozen actions means "kept on the program". Reusing `BENEFICIARY_GRADUATED` would make the COA ledger say the opposite of what happened.

## 2. Decision
* **Iron Law 2 exception (the only one):** the audit action list in `server/src/models/AuditLog.js` gains `BENEFICIARY_RETAINED`. Nothing else in the schema changes: no collection, field or index. Existing ledger blocks are untouched, and the hash chain verifies across old and new blocks. MongoDB has no database-side validator for this field, and the app's append-only database role is unchanged.
* **Transitions** (`workflow.service.js`): `UNDER_INVESTIGATION → ACTIVE_COMPLIANT` (retention) and `NOTICE_OF_INELIGIBILITY → ACTIVE_COMPLIANT` (granted appeal). `GRADUATED` stays final. `FLAGGED_FOR_REVIEW` cannot skip the field visit.
* **Routes** (contracts in `docs/contracts/admin-web/`), through the same workflow transaction (`createWorkflowPersistence`: roles, jurisdiction, conditional writes, sealed block, contention retry):

| Route | Contract | Roles | Rules |
| --- | --- | --- | --- |
| `POST /tasks/:task_id/retain` | `admin-retention.json` | SUPER_ADMIN, REGIONAL_DIRECTOR | report must be SUBMITTED and recommend `RETAIN` or verify Level 1 or 2; grounds 10–1000 characters; task → `VERIFIED_RETAIN`, `admin_resolution.decision: RETAINED_ON_ROSTER`; sealed `BENEFICIARY_RETAINED`. **Not** blocked by a calamity moratorium (keeping a family on the program is the protective direction). |
| `POST /appeals/:appeal_docket_id/decide` | `admin-appeal-decision.json` | SUPER_ADMIN, REGIONAL_DIRECTOR | the appeal is the hash-verified `APPEAL_FILED` block for the household's current notice; recorded on or after the hearing date (Asia/Manila); grounds 10–1000 characters. **GRANTED** → `ACTIVE_COMPLIANT`, sealed `BENEFICIARY_RETAINED` (`decision: APPEAL_GRANTED`). **DENIED** → `GRADUATED`, sealed `BENEFICIARY_GRADUATED` (`decision: GRADUATION_COMPLETED`, `appeal_outcome: DENIED`); a denial is blocked by a calamity moratorium, a grant is not. |

* **Re-flag cooldown:** `POST /beneficiaries/:id/assess` returns 409 `RETENTION_COOLDOWN` for 180 days after the household's latest `BENEFICIARY_RETAINED` block. The length is a constant (`RETENTION_COOLDOWN_DAYS` in `resolution.service.js`), not a setting: `system_configs` only accepts the fields it already has, so a setting would need a second schema change. The start date comes from the ledger, so no new field is needed.
* **Report:** `GET /tasks/:id/report` adds `retention_supported` (contract 1.1.0).
* **UI:**
  * The report review dialog offers **Keep on the program** when the report supports retention, beside or instead of the notice button.
  * The Due Process screen offers **Record hearing outcome** (Granted / Denied) for an appeal whose hearing date has come.
  * `client/src/types/contracts.ts` now lists the real audit actions. It previously named two that never existed.
* **Not built:** `REINVESTIGATION_ORDERED` (order a second visit). The API still rejects it.

## 3. Evidence
- `server/test/workflow.test.js` (transition table) and `server/test/retention.test.js`, both written before the code. Retention covers the contract shape, the task and household writes, the sealed block and the chain. It also covers the cooldown, including that assessment proceeds once the cooldown has passed. Refusals: a graduation report, bad input, wrong roles, no token, other jurisdiction, an unsubmitted task, and no writes on any refusal. Calamity does not block retention. Appeal: granted, denied, a second decision, an early hearing, a stale appeal (filed before the current notice), a forged block, unknown docket, bad input, wrong roles, other jurisdiction and a calamity hold. 7/7 subtests; server suite 172 pass, 0 fail, 3 skipped.
- `data-pipeline/scripts/test_decision012_retention_flow.js` (Iron Law 1, Docker stack), 23/23:
  - flag, dispatch, and a report recommending retention;
  - in the browser: keep the household on the program; the model then refuses to re-flag it;
  - in the browser: record a granted appeal; the household leaves the docket and is active again;
  - through the API: a denied appeal graduates the household;
  - the ledger shows the new action, and the whole chain verifies.
- Client tests 69/69 (new test for both API calls and their receipt checks).

## 4. Official PM / Tech Lead Resolution
* [x] Option C: add `BENEFICIARY_RETAINED` as the single documented exception to the frozen audit action list (chosen 2026-10-14)
* [x] Include the appeal outcome; 180-day re-flag cooldown fixed in code
* [ ] `REINVESTIGATION_ORDERED`: not built; decide if needed
* Signed: ____________  Date: ____________

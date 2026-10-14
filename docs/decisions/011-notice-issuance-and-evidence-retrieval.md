# DECISION-011: Notice Issuance, Final Graduation and Evidence Retrieval
**Author:** Drafted with the final limitations work
**Status:** ACCEPTED by the PM on 2026-10-14 (audit action choice); implementation verified below
**Date Created:** 2026-10-14

---

## 1. Context
The defense deck listed three things the system could not claim:
1. **Notice issuance.** No route approved graduation. The appeals docket worked only from a fixture's stored approval (TC-11 PARTIAL). The roadmap's lifecycle (`workflow.service.js`) already allows `UNDER_INVESTIGATION → NOTICE_OF_INELIGIBILITY → GRADUATED`, and `assertAppealWindowElapsed` already existed, but nothing called them.
2. **Evidence storage.** Photos were stored by content hash (local Docker volume `upload-data`), but nothing could retrieve them: a director had no way to see the photos before deciding.
3. **User acceptance.** No instrument existed to collect and score real participants' ratings.

The frozen audit enum has no "notice issued" action. `PHASE2_GAP_REVIEW.md` required a decision before labelling the notice.

## 2. Decision
* **Audit action (PM's choice):** both the notice and the final graduation are sealed as `BENEFICIARY_GRADUATED`. No schema change (Iron Law 2). The state delta records which step it was:
  * notice: `related.decision: APPROVED_GRADUATION`, `notice_date`, `appeal_deadline`, `UNDER_INVESTIGATION → NOTICE_OF_INELIGIBILITY`;
  * graduation: `related.decision: GRADUATION_COMPLETED`, `NOTICE_OF_INELIGIBILITY → GRADUATED`.
* **Routes** (contracts in `docs/contracts/admin-web/`), all through the existing workflow transaction (`createWorkflowPersistence`: roles, jurisdiction, conditional writes, sealed block, sequence-contention retry):

| Route | Contract | Roles | Rules |
| --- | --- | --- | --- |
| `GET /tasks/:id/report` | `admin-task-report.json` | SUPER_ADMIN, REGIONAL_DIRECTOR, COA_AUDITOR | jurisdiction-scoped, read-only |
| `GET /evidence/:sha256` | `admin-evidence-file.json` | SUPER_ADMIN, REGIONAL_DIRECTOR, COA_AUDITOR | re-hashes the stored bytes on every read; altered file → 409 `EVIDENCE_INTEGRITY_FAILED`; the browser re-hashes again before showing |
| `POST /tasks/:id/resolve` | `admin-notice-issuance.json` | SUPER_ADMIN, REGIONAL_DIRECTOR | only `APPROVED_GRADUATION`; report must be SUBMITTED and recommend graduation or verify Level 3; blocked by a calamity moratorium; grounds 10–1000 characters |
| `POST /beneficiaries/:id/graduate` | `admin-graduation.json` | SUPER_ADMIN, REGIONAL_DIRECTOR | only after the 15-day window from the stored notice, with no appeal recorded (fail closed); blocked by a calamity moratorium |

* **Retention is not built.** `RETAINED_ON_ROSTER` and `REINVESTIGATION_ORDERED` are rejected (400): `workflow.service.js` states that retention transitions need their own agreed rules.
* **Server change outside the new service:** CORS now exposes `X-Content-SHA256` so the client can read the server's hash confirmation.
* **UI:**
  * Caseworker Dispatch gains **Review report** (findings, photos marked "Hash verified", and the notice form).
  * Due Process gains **Complete graduation**, shown only when the window has passed.
* **UAT instrument:** `docs/testing/uat/` (session form, CSV template), `score_uat.py` (SUS and completion, pass rule SUS ≥ 68 and ≥ 80 % completion) with unit tests. Ratings must come from real participants.

## 3. Evidence
- `server/test/resolution.test.js`, written before the service: report, evidence, tamper refusal, notice, docket, graduation timing and appeal hold, roles, jurisdiction, calamity hold, and no writes on every refusal. 5/5 scenarios; server suite 165 pass, 0 fail.
- `data-pipeline/scripts/test_decision011_notice_flow.js` (Iron Law 1, Docker stack), 17/17:
  - flag, dispatch, and a real photo upload;
  - the photo altered on disk is refused, then served again once restored;
  - in the browser: review report, photo shown, notice issued;
  - graduation refused while the window is open;
  - graduation completed in the browser after the test data moves the notice back 16 days;
  - the whole ledger verifies.
- Client tests 68/68; `test_score_uat.py` 4/4.

## 4. Official PM / Tech Lead Resolution
* [x] Audit action: reuse `BENEFICIARY_GRADUATED` (chosen 2026-10-14)
* [ ] Retention rules (`RETAINED_ON_ROSTER`, `REINVESTIGATION_ORDERED`): to be agreed
* Signed: ____________  Date: ____________

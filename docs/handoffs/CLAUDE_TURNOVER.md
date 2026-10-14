# CLAUDE_TURNOVER — KilosUnlad Integration Program (Sprints 1–6)

**Prepared for:** Renz Viloria (PM / Lead Integrator)
**Date:** 2026-10-12, updated 2026-10-13 (groups B and C; scrum-plan closure with Docker verification)
**Branch:** `claude/clever-albattani-8ikzld` (base `e5acd07` = merge of PR #28). Open as
[PR #29](https://github.com/renzv-compsci/KilosUnlad/pull/29); every push to the branch updates it.
**Companion documents:** `docs/integration/CHANGELOG_TRACEABILITY.md` (per-commit change log, traceability matrix,
flag register), `docs/decisions/009-ml-vector-and-assessment-contracts.md`, evidence under
`docs/integration/evidence/`.

---

## 00. Update after the main merge (2026-10-13, clean start + live UI + hosting)

| Item | Result | Where |
| --- | --- | --- |
| Clean-start check of `main` (model v2) on Docker | Capstone 16/16, Section 12 14/14. E2E-03 weight check fixed for v2 (test, not system) | `docs/integration/evidence/clean-start-main/` |
| UI shows the data inside the system | Every sample panel replaced by server data. Five new read-only routes and contracts. No schema change, no guard changed | `docs/decisions/010-ui-live-data-read-contracts.md` (**PROPOSED: needs your sign-off**) |
| Tests | Server 158 pass / 0 fail (replica set); `insights.test.js` 6/6 written first. Client 67/67, typecheck clean, build OK. `test_ui_live_data.js` **101/101** (API + browser at 390/834/1440 px, no sideways scroll). Capstone `--full` re-run **16/16** on the rebuilt stack | `docs/integration/evidence/ui-live-data/` |
| Manual test scenarios | 12 scenarios (S1–S12) with exact expected numbers; the API steps were executed as written | `docs/testing/MANUAL_TEST_SCENARIOS.md` |
| Final UI | Logo, Plus Jakarta Sans, street map with household clusters, plain-language navigation; login without seals. Frontend only | `client/`; browser test 114/114 on the demo data |
| Demo dataset | `load_demo_data.sh`: 80k baseline + fixtures + about 1,500 assessed through the API (627 flagged, sealed) + 30 dispatched. Case A left unassessed for the live demo | `docs/testing/MANUAL_TEST_SCENARIOS.md` §0 |
| Defense deck | Updated to the final state: v2 model (real data), finished-system slide, hosting slide, current test results | private link in §6 Step 8 |
| Free hosting | Vercel (client) + Render free (API, ML) + Atlas M0. Blueprint, Vercel config, seeding script; production start and Atlas-style restore rehearsed locally | `deploy/HOSTING_GUIDE.md`, `render.yaml`, `client/vercel.json`, `deploy/atlas_seed.sh` |

**Decisions still yours (new):**
1. Sign DECISION-010.
2. Whether Atlas M0 lets you create the append-only custom role. If it does not, do **not** fall back to `readWrite` silently (`HOSTING_GUIDE.md` §1.3).

**Flags from the main merge (not changed by me):**
- `server/src/controllers/appeals.controller.js` is not mounted and contains debug logs.
- `stratified_partition.py` now targets `swdi_level` on the empirical parquet, while `sprint2_experiments` uses `swdi_level_true`. Check that the two agree before the next ML run.
- After rebuilding the client or server container, restart `gateway`: nginx keeps the old container address and returns 502 until restarted.

---

## 0. Where the Scrum plan stands (2026-10-13)

**Short answer: every Scrum item except Sprint 2's empirical ML run is done, verified on the Docker Compose stack, and has evidence. The ML run is blocked on one input file that is not in the repository. Section 6 is the step-by-step guide for validating everything yourself.**

| Sprint | Items | Status |
| --- | --- | --- |
| 0 Readiness | RDY-01…05 | **Done** (unchanged from rev 5) |
| 1 Seams | INT-01…08 | **Done.** On Docker: INT-01/02/03/04/05/08 all PASS in the rehearsal |
| 2 ML | ML-01 | **Done.** Reconciled figure 0.7771 |
| 2 ML | ML-02, ML-03, ML-06; v2 parts of ML-04/05/07 | **Blocked (input):** `data-pipeline/data/raw/fies_raw.csv`. The runner, leakage gate and promotion path are ready (§7.1) |
| 3 Data | DAT-01…06 | **Done.** **DAT-05 now meets the 10 s DoD**: 5.6–7.1 s for reset + 80k on Docker, via a snapshot restore |
| 4 E2E | E2E-01…04 | **Done** (Docker PASS) |
| 4 E2E | E2E-05 | **Done as repository cadence evidence** (`sprint-4/E2E05_CADENCE_LOG.md`). Add your real standup notes to its table |
| 5 Stress | STR-01…04 | **Done** (Docker PASS; STR-03 at 80k) |
| 6 Defense | DEF-01, DEF-02 | **Done.** Docker rehearsal **16/16** from clean resets |
| 6 Defense | DEF-03 | **Done.** A fresh clone boots all five services with `docker compose up` and no manual step. The clean clone also exposed a real defect, now fixed: `up` used to start `reset-demo`. Re-run on your own hardware as Step 1 of §6 |
| 6 Defense | DEF-04 | **Done (v1).** 14-slide deck, private link in §6 Step 8. Update the model slide after v2 |
| 6 Defense | DEF-05 | **Done.** Change log, traceability, flag register, backlog rev 6, this guide |

**Still yours:**
1. Place the FIES CSV and run §7.1 (Sprint 2 v2).
2. Decide on notice issuance (§7.3); TC-11 stays PARTIAL until then.
3. Collect real UAT participant ratings.
4. Validate with §6, then review and merge PR #29.

**The program DoD** (`SCRUM_INTEGRATION_PLAN.md`) is met, except for the clause "the SWDI classifier in production is the v2 artifact". That clause needs item 1.

**For a complete beneficiary lifecycle in production**, two transitions still have no route:
- `UNDER_INVESTIGATION → NOTICE_OF_INELIGIBILITY`: no route and no audit action.
- `NOTICE_OF_INELIGIBILITY → GRADUATED`: the timing helper exists, but there is no route.

Both need your decision (§7.3).

---

## 1. At a glance

| Area | Before (main @ `e5acd07`) | After (this branch) |
| --- | --- | --- |
| Live mutation routes | dispatch, submit (no write) | dispatch, submit (transactional), **appeals docket**, **calamity toggle**, **risk assessment** |
| New read routes | — | **sealed assessment explanation** (triage drawer SHAP), **due-process docket** (notices + deadlines) |
| Server tests | 78 pass / 8 fail | **152 pass / 0 fail** (155 total; 3 skipped: 2 Docker-only, 1 needs `TEST_MONGO_URI`) |
| Client tests | 62 | **66 pass / 0 fail**, typecheck + build + PWA pass |
| Integration scripts (`data-pipeline/scripts/test_*`) | 1 (INT-02) | **18**, plus a one-command rehearsal runner |
| Due Process screen | mock notices, preview-only dialog | **live notices, real appeal filing** |
| ML F1 figures | 0.7726 vs 0.7781 (unreconciled) | **reconciled: v1 = 0.7771** on the untouched 20k test (0.7726 is its validation score) |
| Sprint 2 empirical training | not started | **runner + mechanics tests ready**; waiting on the FIES CSV |
| 80k baseline in DB | raw, 100% invalid vs models | **80,000 + 80,000 model-valid** documents |
| Offline sync | disabled; payload mismatched contract | **enabled; proven in a real browser with zero loss** |
| Capstone proofs | not scripted | **4/4 PASS from clean reset**, timed; **Docker rehearsal 16/16** |
| Reset with the 80k baseline | not measured | **5.6–7.1 s on Docker** (DAT-05 DoD met; was 17.5–19.3 s) |
| Clean clone on Docker | not verified | **boots with `docker compose up`, no manual step** |
| Section 12 test plan | — | **executed; 14/14 steps on local and on Docker** (TC-11 partial) |
| Diagrams, deck | — | **6 diagrams + 13 figures/screenshots; 14-slide defense deck** |

---

## 2. How the 5 Iron Laws were kept

1. **TDD.** Every item got a script in `data-pipeline/scripts/` (and server tests) that I watched fail first,
   then pass. Key guards were also mutation-tested: removing a guard turned its test red.
2. **Immutable schema.** No Mongoose model, collection or index was added, changed or removed.
   * The 6 ML features are read from stored `demographics` with `lean()`.
   * Appeals live in the sealed audit ledger, because the frozen status enum has no appeal state.
   * `reset_demo.sh` now **rebuilds two indexes the frozen models already declare**, which it was dropping
     (`AuditLog {target_entity.entity_id}`, `SystemConfig {config_key}` unique). They are restored, not new.
3. **Zero security compromise.** No guard was removed or loosened. Every 403 or 400 I hit was fixed in the test
   payload or fixture: the INT-02 coordinates, the worker's barangay, and a Santa Rosa test case. New routes
   carry `authenticate`, `allowRoles`, `scopeJurisdiction`, Joi and in-transaction re-checks. New guards were
   added: geofence, evidence-hash binding, calamity hold, and hash-verified explanations.
4. **Frontend conservatism.** Wiring and copy only. I added an API mapping, one select input, an
   explanation section inside the existing triage details row, enabled the existing sync gate, and fixed
   stale labels. No component was redesigned.
5. **Contract adherence.** Existing contract shapes are untouched, except `ml-swdi-inference` → **v1.1**, which
   you approved (DECISION-009). Two **new** contracts were added for the new routes. Three places that
   violated existing contracts were fixed to comply:
   * The submit response body.
   * The ML 422 error body.
   * The ATM 400 for short windows.

---

## 3. What changed — by area

### 3.1 Backend routes (`server/src/routes/v1/index.js`)
| Route | Item | Guards | Behaviour |
| --- | --- | --- | --- |
| `POST /tasks/:id/submit` | INT-02/06 | Case Worker | Re-authorizes in the transaction. Verifies photo SHA-256 (422 `EVIDENCE_HASH_MISMATCH`) and the 250 m geofence (422 `GEOFENCE_VIOLATION`). Saves findings and seals `REPORT_SUBMITTED`. Stores photo bytes at `UPLOAD_DIR/evidence/<sha256>`. Returns the frozen contract body. |
| `POST /appeals/docket` | INT-03 | Admin / Director + jurisdiction | Starts from the stored `APPROVED_GRADUATION` instant. Enforces the 15-day window. Seals `APPEAL_FILED`. Rejects with 409 for no notice, closed window, duplicate appeal, or reused docket ID. |
| `POST /calamity/toggle` | INT-04 | **Super Admin only** | Declares or lifts a zone in `SystemConfig CALAMITY_ZONES` and returns `hold_active`. Seals `CALAMITY_DECLARED` / `SYSTEM_CONFIG_UPDATED`. |
| `POST /beneficiaries/:id/assess` | INT-05 | Admin / Director + jurisdiction | ML v1.1 or `EVALUATED_VIA_FALLBACK`, then risk score. At ≥ 70, moves the household to `FLAGGED_FOR_REVIEW` and seals `MODEL_FLAG_RAISED`. Reports RA 11310 child eligibility. Returns 409 under a calamity hold. |
| `GET /beneficiaries/:id/assessment` | E2E-04 | Admin / Director / Auditor + jurisdiction | Latest sealed assessment (SHAP, probabilities), served only if its hash recomputes. Otherwise 409 `AUDIT_ENTRY_INVALID`. |
| `POST /tasks/dispatch` | E2E-02 | unchanged | Now refuses during a calamity hold (409 `CALAMITY_MORATORIUM_ACTIVE`). |
| `GET /appeals/docket` | INT-08 | Admin / Director / Auditor + jurisdiction | Households under notice, with `notice_date`/`notice_expiry_date` from the same stored approval the POST uses. Appeal details come only from hash-verified `APPEAL_FILED` blocks; a tampered block returns 409 `AUDIT_ENTRY_INVALID`. Accepts only `page`/`limit`. |

### 3.2 Backend services (new or changed)
* **New:**
  * `appealDocket.service.js`, `calamityToggle.service.js` (with `assertNoCalamityHold`), `riskAssessment.service.js`
    (`assess`, `explain`), `taskSubmission.service.js` (transaction + upload adapter), `ageOut.service.js`.
  * `utils/sameConnection.js`.
* **Changed:**
  * `workflowPersistence.service.js`: the audit append is extracted so every route uses one hash path; the
    receipt shape is unchanged.
  * `taskDispatcher.service.js`: calamity hold.
  * `mlClient.service.js`: exports its request schema.
  * `error.middleware.js`: upload errors return 400/413 instead of 503.
  * `routes/v1/task.routes.js`: mock mode serves fixtures only. It used to expose an unauthenticated submit
    route with a broken import.

### 3.3 Contracts (`docs/contracts/`)
* `ml/ml-swdi-inference.json` → **v1.1.0** (6-feature PMT request; revision note inside).
* **New:** `admin-web/admin-risk-assessment.json` (v1.1.0) and `admin-web/admin-assessment-explanation.json` (v1.0.0).
* **New (INT-08):** `admin-web/admin-due-process-docket.json` (the GET), and `admin-web/admin-appeal-filing.json`, which
  documents the INT-03 POST (that route shipped without a contract file).

### 3.4 ML service (`ml-service/`)
* `app/main.py`:
  * `predict-swdi` validation errors return the contract's 422 `INVALID_FEATURE_VECTOR` body, without
    echoing the input.
  * An ATM window with fewer than 3 transactions returns the contract's 400 `INSUFFICIENT_TRANSACTION_SAMPLE`.
* **New:** `scripts/audit_leakage.py` (ML-04 release gate).
* **New (Sprint 2):**
  * `scripts/sprint2_experiments.py`: the E1–E5 protocol runner (§7.1). It exports to `artifacts/v2/` and never touches v1.
  * `scripts/test_sprint2_experiments.py`: mechanics tests that run on a schema fixture.
* `app/main.py`: startup and `/health` load the configured `SWDI_MODEL_PATH`, so promoting v2 via environment variables
  is reflected in health checks.

### 3.5 Frontend (`client/src/`) — minor wiring only
* `services/api.ts`:
  * `toSubmissionContract` maps saved drafts to the frozen submission contract.
  * `submitFieldTask` sends multipart with the original photo bytes.
  * `fetchAssessmentExplanation` reads the sealed explanation for the drawer.
* `Screen8FieldAssessmentForm.tsx`: adds the required **Verified SWDI level** select. The contract required this
  field, but the form never collected it.
* `hooks/useOfflineSync.ts` + `App.tsx`:
  * Sync is enabled.
  * Client errors the server will repeat (4xx) are marked `ERROR` instead of retrying forever.
* `Screen9OfflineSyncDrawer.tsx`:
  * Shows "Rejected by server" for rejected reports instead of "Synced".
  * The stale `/sync/batch` label is corrected.
* `Screen3TriageQueue.tsx`: shows the sealed SHAP explanation in the details row.
* `Screen5DueProcessManager.tsx` (INT-08): live mode when App passes `loadDocket` and `submitAppeal`.
  * Shows real notices, with the countdown measured from the real clock.
  * **File Appeal** posts to the docket and reloads the list.
  * Server error codes are shown in the dialog, and the hearing date cannot be in the past.
  * Without those props it keeps its sample/preview mode.
* Sidebar: the Due Process badge changes from "Preview" to "Live".
* Copy: "not submitted" notices now say reports are "submitted when online". `taskDispatch.ts` adds a calamity
  message.

### 3.6 Data pipeline (`data-pipeline/`)
* **New** `scripts/seed_mapping.py`: adapts generator records to the frozen models. The mapping:
  * Adds an `address` and assigns the nearest reference barangay.
  * Derives the declared demographics where a source field exists.
  * Stores the 6 PMT features alongside them.
  * Masks the PAN.
  * Does **not** ingest `true_swdi_level` or raw card numbers.
* `scripts/seed_db.py` ingests the **ADR-001 80k** set through the mapping. Paths are env-overridable.
* `scripts/verify_compound_index.py` also checks at full volume. `MONGO_URI` is overridable there and in
  `audit_integrity.py`.
* `scripts/reset_demo.sh`:
  * Demo dates are stored as real Dates.
  * The two model-declared indexes are rebuilt.
* Demo Case A (`seeds/demo/graduation_beneficiary.json`, `graduation_swdi_payload.json`):
  * Adds its 6 PMT features; the model predicts Level 3 at p = 0.90.
  * Clears the pre-seeded flag, which contradicted its `ACTIVE_COMPLIANT` status.
* **Fixtures:**
  * `add_int02_case_a_fixture.js`: the worker also covers barangay Real. It no longer patches any status.
  * `add_int03_notice_fixture.js`
  * `add_e2e03_age_out_fixture.js`
* **Test scripts:** see §5.2. **Runner:** `run_capstone_proofs.sh`.
* **DAT-05 (2026-10-13):**
  * `snapshot_baseline.sh` dumps the 80k SYN documents once.
  * `reset_demo.sh` with `RESET_BASELINE=1` restores them in parallel with the account seeding.
  * Both runners use the snapshot restore for their 80k steps when one exists.
* `docker-compose.yml`: the five one-shot jobs are in the `tools` profile (DEF-03).

### 3.7 Documentation (2026-10-13 additions)
* `docs/testing/`: the Section 12 results (local and Docker), the unit test report and the raw evidence.
* `docs/diagrams/`: all DIAGRAM_INTEGRATION figures as JPG, the UI screenshots and the Appendix D plots, with sources.
* `docs/integration/evidence/`:
  * `sprint-6/rehearsal-docker/` and `sprint-6/clean-clone-docker/`;
  * `sprint-3/dat05-baseline-reset-docker.log`;
  * `sprint-4/E2E05_CADENCE_LOG.md`.
* `backlog.md` revision 6; the scrum plan change log; this turnover.

### 3.7a Documentation (earlier)
* `MASTER_TURNOVER.md`: API surface, the 80k baseline, and measured timings.
* `backlog.md` revision 5.
* The scrum plan change log.
* `F1_DISPOSITION_MEMO.md` §5.
* `DECISION-009`, `CHANGELOG_TRACEABILITY.md`.
* `.gitignore`: `server/uploads/`, so beneficiary photos can never be committed.

---

## 4. Bugs found and fixed (not in the original task list)

1. **The 80k ingest was unusable.**
   * All documents failed the models, and the whole roster was invisible to jurisdiction-scoped queries.
   * The training label and full LandBank PANs were stored in the database.
2. **Offline sync could never have worked.** Saved drafts didn't match the contract, the verified level was
   never collected, and there was no evidence storage.
3. **Submission was incomplete.**
   * Nothing was saved.
   * The geofence was never checked.
   * With no files uploaded, hash verification was skipped entirely.
   * The response didn't match the contract.
4. **Dispatch went through during a declared calamity.**
5. **The mock-mode router crashed on start-up**, and it exposed an unauthenticated submit route.
6. **The ML contract file was stale.** Seven tests failed on `main`.
7. **Demo data was wrong.**
   * The INT-02 test used coordinates about 3.4 km from Case A, with a worker outside Case A's barangay.
   * Case A was seeded as flagged while `ACTIVE_COMPLIANT`.
   * Birthdates were stored as strings.
8. **`reset_demo.sh` dropped two model-declared indexes**, including the one that keeps calamity configuration
   unique.
9. **`docker compose up` ran every one-shot job, including `reset-demo`.**
   * Against a running database, every `up` would have wiped it.
   * Found by the Docker clean clone; fixed with the `tools` profile.
10. **DAT-01's index check gave a false failure under authentication.**
    * It listed indexes as `app_user`, whose role allows that only on `audit_logs`, and swallowed the error.
    * The check now inspects as the admin account. The role is unchanged.

---

## 5. Outputs (all reproducible)

### 5.1 Rehearsal — Docker `sprint-6/rehearsal-docker/SUMMARY.md` (16/16 PASS); local `rehearsal-local/` (15/15)
| Scenario | Result | Seconds (incl. reset) |
| --- | --- | --- |
| **Proof 1** Graduation Drift (assess → triage → dispatch → report → audit, via the nginx gateway) | PASS | 6.4 |
| **Proof 2** Offline Field Visit (airplane mode, real Chromium, zero-loss sync) | PASS | 12.6 |
| **Proof 3** Sangla-ATM (85.0/100, 12 households flagged) | PASS | 4.2 |
| **Proof 4** Audit Proof (tamper block 3 → `INVALID_HASH_AT_SEQUENCE_3`; untampered ranges still valid) | PASS | 5.5 |
| INT-01, INT-05, INT-02, INT-03, INT-04, E2E-02, E2E-03, E2E-04 (API + browser), DAT-01 (80k), STR-03 (80k) | 11/11 PASS | 3.9–59.7 |

### 5.2 Test scripts (`data-pipeline/scripts/`)
| Script | Proves |
| --- | --- |
| `test_int01_ml_contract.js` | ML v1.1 contract; mlClient against the live model; ML down → `ML_UNAVAILABLE`; p95 16–17 ms |
| `test_int02_submission.js` | Altered bytes 422; geofence 422; contract 200; duplicate 409 |
| `test_int03_appeals_docket.js` | Docket 201; security and boundary rejections; duplicate 409; chain valid |
| `test_int04_calamity_toggle.js` | Declare/lift; `hold_active`; role guards; chain valid |
| `test_int05_risk_assessment.js` | ML mode (score 100, flagged) and `EXPECT_ML_DOWN=1` fallback mode |
| `test_e2e01_full_chain.js` | Full chain through the gateway, blocks in order |
| `test_e2e02_calamity_freeze.js` | Hold freezes dispatch and assessment; expiry and lift resume |
| `test_e2e03_age_out.js` | 19th-birthday boundary; flags corrected and sealed |
| `test_e2e04_shap_drawer.js`, `test_e2e04_drawer_ui.js` | Drawer SHAP equals the ML payload (API and real browser) |
| `test_dat01_seed_conformance.js` | 80k model-valid; 1:1; ML-ready; no excluded fields; **all declared indexes present** |
| `test_seed_mapping.py` | Mapping unit tests (9) |
| `test_str01_tamper_detection.js` | Tamper detection and restore |
| `test_str02_airplane_sync.js` | Offline reports, edit replaces, reconnect syncs both, bytes verified |
| `test_str03_concurrency.js` | 60 parallel assessments; contested dispatch and submit commit once; 30+30 calamity writes; zero 5xx |
| `test_proof3_sangla_atm.js` | ATM contract, 85.0, short window 400 |
| `test_int08_appeals_ui.js` | Docket GET (contract keys, 15-day window, roles, query rejection); Chromium: live card, countdown, File Appeal, server shows `UNDER_APPEAL_HEARING` |
| `ml-service/scripts/test_sprint2_experiments.py` | E1–E5 runner mechanics: selection rule, no holdout leakage, output passes the ML-04 gate 6/6, artifact serves the frozen vector |
| `run_capstone_proofs.sh [--full]` | Runs all of the above from clean resets and writes the evidence folder |
| `test_dat05_reset_baseline.sh` | DAT-05: reset + 80k under 10 s, counts, Case A, empty ledger, DAT-01 conformance |
| `snapshot_baseline.sh` | Writes the 80k baseline snapshot used by `RESET_BASELINE=1` (one time) |
| `test_section12_plan.js` | Section 12.2 TC-01..06, 08, 09, 10, 13, 15 as worded in the test plan (11 cases, every observed value to JSON) |
| `test_section12_defects.js` | Section 12.3 DEF-01..07 corrective actions re-checked in code and live (incl. app_user denied update/delete on audit_logs) |
| `test_section12_ml_unit.py` | ML unit tier: SHAP top-3 extraction, predicted-class attribution, additivity to the margin; Sangla-ATM heuristic (pytest, 11) |
| `run_section12_plan.sh` | The whole Section 12 plan (unit, TC-01..17, DEF-01..07, UAT walkthroughs) from clean resets into `docs/testing/evidence/` |

### 5.3 Key measurements
* **Ingest (80k + 80k):** insert phase 8.13 s; end-to-end 12.9–14.3 s; zero errors.
* **Index use:** IXSCAN on the triage compound index, both flagged (3/3) and at volume (80,002/80,002); no over-scan.
* **Integrity audit:** 0 issues across 160,012 documents.
* **API latency at 80k:** triage page in 0.15–0.19 s; one assessment with the real model in about 0.1 s.
* **Reset time:** reset alone 2–5 s. **Reset + 80k baseline (snapshot restore) on Docker: 7.13 / 5.61 / 5.95 / 5.77 s,
  which meets the 10 s DoD.** A full re-ingest of the 80k set takes about 8 s of inserts and about 20 s end to end (DAT-02).
* **Live model:** macro F1 **0.766** on 3,000 QA-partition households, consistent with the reported 0.7726. This is still
  a synthetic benchmark.
* **Write contention:** 100 simultaneous flagging writes all succeed with zero 5xx (the burst takes 24 s, because all
  audit writes go through one sequence).

### 5.4 Evidence folders
* `docs/integration/evidence/sprint-2/SPRINT2_EVIDENCE.md`: ML-01 reconciliation, partition hashes, empirical run steps.
* `docs/integration/evidence/SPRINT1_EVIDENCE.md`: the INT-03 400 root cause and Sprint 1 decisions.
* `docs/integration/evidence/sprint-3/`: ingest, index, integrity and reset logs.
* `docs/integration/evidence/sprint-4/`: triage drawer screenshot.
* `docs/integration/evidence/sprint-6/`:
  * `rehearsal-docker/` (16 logs + SUMMARY);
  * `clean-clone-docker/` (compose up log, ps, sandbox build note);
  * `rehearsal-local/`.
* `docs/integration/evidence/sprint-4/E2E05_CADENCE_LOG.md`: daily cadence from git history.
* `docs/testing/evidence/section12-docker/`: the Section 12 plan on Docker (14/14).
* `docs/testing/SECTION12_TEST_RESULTS.md` + `docs/testing/evidence/section12-local/`: Section 12 executed (14/14 steps;
  TC 16 PASS + TC-11 PARTIAL; DEF 7/7; UAT A–D scripted, participant ratings still to be collected; F1 objective ≥ 0.85 not met).
* `docs/diagrams/`: every DIAGRAM_INTEGRATION.md figure as JPG (use case, activity, class, sequence, architecture, ERD),
  Section 9 UI screenshots, Section 11 walkthrough, Appendix D ML plots; sources and `src/build_all.sh` to rebuild.

---

## 6. Validation guide — how to check everything yourself

Every claim in this turnover has a command below that reproduces it. Run the steps in order on your machine.
- **Steps 1–3:** set up the stack (about 15 minutes the first time).
- **Steps 4–9:** each step validates one area. Every step lists what to expect and where the evidence I recorded is, so you can compare.
- On Windows, use Git Bash or WSL for the `bash` commands.
- With Docker Compose v2 only (no `docker-compose` binary), either create an alias, or prefix the runners with
  `RESET_CMD="docker compose run --rm reset-demo" RESET_BASELINE_CMD="docker compose run --rm -e RESET_BASELINE=1 reset-demo" SEED_CMD="docker compose run --rm seed-ingest"`.

### Step 1 — Fresh clone and boot (validates DEF-03)
```bash
git clone https://github.com/renzv-compsci/KilosUnlad.git && cd KilosUnlad
git checkout claude/clever-albattani-8ikzld
docker compose down -v            # only if an old stack exists: fresh volumes re-run init-mongo.js
docker compose up -d --build
docker compose ps -a
curl http://localhost:5000/health          # server online
curl http://localhost:8000/health          # {"status":"online","model_loaded":true}
curl -I http://localhost/                  # gateway serves the client (200)
```
**Expect:**
- `client`, `db`, `gateway`, `ml-service` and `server` show *Up*; `replset-init` shows *Exited (0)*.
- **No** `seed-*`, `audit-integrity` or `reset-demo` container starts. They are in the `tools` profile and run only when you call them.

**My evidence:** `docs/integration/evidence/sprint-6/clean-clone-docker/`. I ran this in a sandbox that blocks the Debian mirrors, so I needed a build override kept outside the repo (`sandbox-override.yml.txt`). Your machine should need nothing.

### Step 2 — Host-side test tools (one time)
```bash
cd server && npm ci && cd ..               # the scripts load the real Mongoose models
cd client && npm ci && cd ..               # client unit tests
npm install --prefix /tmp/kt playwright-core   # any folder; then point NODE_PATH at it:
export NODE_PATH=/tmp/kt/node_modules
export CHROMIUM_PATH="<path to chrome or chromium>"   # e.g. C:/Program Files/Google/Chrome/Application/chrome.exe
python -m venv .venv && . .venv/bin/activate && pip install -r ml-service/requirements.txt pymongo pytest
```

### Step 3 — Baseline snapshot for the fast reset (one time; validates the DAT-05 setup)
```bash
docker-compose run --rm reset-demo
time docker-compose run --rm seed-ingest   # DAT-02: about 8 s of inserts, about 20 s end to end
bash data-pipeline/scripts/snapshot_baseline.sh
```
**Expect:** `[OK] Baseline snapshot written`, with two archives in `data-pipeline/snapshots/` (about 8.7 MB, gitignored).

### Step 4 — DAT-05: reset with 80k in under 10 s
```bash
bash data-pipeline/scripts/test_dat05_reset_baseline.sh
```
**Expect:**
- `wall-clock … ms < 10000 ms`;
- 80,000 + 80,000 records, Case A present, ledger empty;
- DAT-01 passes;
- the run ends with `[SUCCESS] DAT-05 TEST PASSED!`.

**Mine:** 7.13 / 5.61 / 5.95 s (`sprint-3/SPRINT3_EVIDENCE.md`).

### Step 5 — Capstone rehearsal on Docker (validates DEF-01, DEF-02, Sprints 1, 3, 4, 5)
```bash
CLIENT_URL=http://localhost EVIDENCE_DIR=docs/integration/evidence/sprint-6/rehearsal-mine \
  bash data-pipeline/scripts/run_capstone_proofs.sh --full
```
**Expect:** `16/16 passed`. That covers the four proofs, INT-01/02/03/04/05/08, E2E-02/03/04 (API and browser), DAT-01 and STR-03.
`CLIENT_URL=http://localhost` is needed because the client is only exposed through the gateway.

**Mine:** `sprint-6/rehearsal-docker/SUMMARY.md` (16/16, Docker stack).

### Step 6 — Section 12 test plan on Docker (validates TC-01…TC-17, DEF-01…07, UAT walkthroughs)
```bash
PYTHON=python \
MONGO_URI="mongodb://admin_user:RootAdminSecret2026!@localhost:27017/kilosunlad?authSource=admin&directConnection=true" \
CLIENT_URL=http://localhost EVIDENCE_DIR=docs/testing/evidence/section12-mine \
  bash data-pipeline/scripts/run_section12_plan.sh
```
**Expect:** `14/14 passed` (`MONGO_URI` is needed because the index check otherwise targets the in-container host `db`). Compare `tc_api_cases.json` with the "Actual Result" column of `docs/testing/SECTION12_TEST_RESULTS.md`.

**Mine:** `docs/testing/evidence/section12-docker/` (Docker) and `section12-local/` (local stack).

### Step 7 — Unit tests (validates `docs/testing/UNIT_TEST_REPORT.md`)
```bash
cd server && npm test && cd ..             # expect 0 fail (Docker-only and replica-set suites skip unless enabled)
cd client && npm test && npm run test:pwa && cd ..
python -m pytest -q data-pipeline/scripts/test_section12_ml_unit.py ml-service/scripts/test_sprint2_experiments.py data-pipeline/scripts/test_seed_mapping.py
```
**For the full server count** (replica-set suites included, 153 pass, 2 skip): install a `mongod` binary, then run the command below. `TEST_MONGO_URI` is safe to point at your stack: the feeds test creates its own randomly named database and drops it afterwards.
```bash
RUN_WORKFLOW_MONGO_TESTS=1 MONGOD_PATH=<mongod> TEST_MONGO_URI="mongodb://admin_user:RootAdminSecret2026!@localhost:27017/?authSource=admin&directConnection=true" npm test
```

### Step 8 — Look at the deliverables
- **Diagrams:** `docs/diagrams/` (6 diagrams, 9 UI screenshots, 4 ML plots), plus `README.md` for the figure index and the corrections to the spec.
- **Reports:** `docs/testing/SECTION12_TEST_RESULTS.md` and `docs/testing/UNIT_TEST_REPORT.md`.
- **Deck (DEF-04):** "KilosUnlad Capstone Defense", 14 slides, private link https://claude.ai/artifact/HEjeDd7oWkjWhuCVLM3uwQ.
  - Check that every number on it matches an evidence file named in its speaker notes.
  - It is private: share it from the page's Share menu before others open it.
- **Standup cadence (E2E-05):** `docs/integration/evidence/sprint-4/E2E05_CADENCE_LOG.md`. Fill in the standup table at its end with the team's real notes.

### Step 9 — Sprint 2 empirical ML (the one thing still blocked)
- Place `data-pipeline/data/raw/fies_raw.csv`, then follow §7.1.
- After v2 is promoted, re-run Steps 5 and 6, and update the deck's model and limitations slides.

### If a step fails
- The per-step log in the evidence folder names the HTTP status and error code.
- Under the Iron Laws, a 400 or 403 means you fix the payload or the fixture, never the guard.
- A `MODULE_NOT_FOUND` means Step 2 was skipped.

---

## 7. Blockers that need someone else or a decision

### 7.1 Sprint 2 ML (group B) — what is done and what is left
Data was produced only by running the existing pipeline. Nothing was added to fetch data.

| Item | Status |
| --- | --- |
| Partitions | `python data-pipeline/scripts/stratified_partition.py` was run: 69,999 / 10,000 / 20,001, identical stratification. Output is in `data-pipeline/partitions/` (gitignored; hashes in the Sprint 2 evidence). |
| **ML-01** | **Done.** The repo's `train_and_export.py` on these partitions reproduces deployed v1 exactly. 0.7726 = validation (selection) score; **0.7771 = untouched 20k test, the single reconciled v1 figure**; 0.7781 cannot be reproduced and is superseded (F1_DISPOSITION_MEMO §6). |
| ML-02 / ML-03 | **Ready, not run.** `ml-service/scripts/sprint2_experiments.py` implements E1, E2, E3 (CV tuning on training folds only), E4 at 0.3 and 0.5 synthetic weight, and E5 (pretrain, then fine-tune). All are scored on one stratified empirical holdout, with selection pre-registered. |
| ML-04 | **Gate ready.** Runner output passes `audit_leakage.py` **6/6** in the mechanics test; v1 passes 3/6 by design. |
| ML-05 | **Mechanics proven.** A v2 artifact loaded via env passes `test_int01_ml_contract.js` (p95 24.4 ms). Re-run it on the real v2. |
| ML-06 | **Ready.** The runner writes `artifacts/v2/` with full provenance; v1 stays deployed until you promote. |
| ML-07 | Memo §6 records the reconciliation. Update turnover Domain 4 with the v2 figures after the run. |

**Missing input:** `data-pipeline/data/raw/fies_raw.csv` (2015 FIES; Kaggle
`grosvenpaul/family-income-and-expenditure`, per `docs/data_provenence.md`). No pipeline script downloads it: notebook 01
expects it to be placed by hand, and it is gitignored. This environment's network policy blocks Kaggle.
With the file in place, run:
```bash
cd data-pipeline/notebooks
jupyter nbconvert --to notebook --execute 01_files_cleaning_and_eda.ipynb --output 01_executed.ipynb
jupyter nbconvert --to notebook --execute 02_swdi_feature_engineering.ipynb --output 02_executed.ipynb
cd ../.. && python data-pipeline/scripts/stratified_partition.py
python ml-service/scripts/sprint2_experiments.py --evidence docs/integration/evidence/sprint-2
python ml-service/scripts/audit_leakage.py --artifact ml-service/artifacts/v2/lightgbm_swdi_v2.joblib \
  --metadata ml-service/artifacts/v2/model_metadata.json          # must print 6/6
```
**Promote after review:** set `SWDI_MODEL_PATH=/app/artifacts/v2/lightgbm_swdi_v2.joblib` and
`MODEL_METADATA_PATH=/app/artifacts/v2/model_metadata.json` on `ml-service` in docker-compose. Then re-run
`test_int01_ml_contract.js` and `run_capstone_proofs.sh --full`.
Note: Case A's demo outcome (Level 3) was checked against v1. Re-check it with v2, because Proof 1 depends on it.

### 7.2 Appeals dialog (group C, INT-08) — done
* The Due Process screen now reads `GET /api/v1/appeals/docket` and files through `POST /api/v1/appeals/docket`.
* Proven by `appealDocket.test.js` (GET subtest) and `test_int08_appeals_ui.js` in a real browser; it is included in the `--full` runner.
* `GrievanceAppealsDashboard` (the separate grievance persona overview) still shows sample notices. Wiring it to the
  same loader is optional.
* Optional: a calamity toggle UI for Super Admin.

### 7.3 Your decisions
* **Notice issuance.** Choose an audit action and route for `UNDER_INVESTIGATION → NOTICE_OF_INELIGIBILITY`
  (for example, director approval writing `admin_resolution` + `NOTICE`). The current audit enum has no notice
  action, so this needs a decision under Iron Law 2. After that, graduation (`NOTICE → GRADUATED`) can use the
  existing `assertAppealWindowElapsed`. Until then, the appeals docket works from the stored approval
  (`add_int03_notice_fixture.js`).
* **Calamity toggle roles.** It is Super Admin only. Widen it if directors should declare calamities.
* **v2 promotion** (after the §7.1 run): accept or reject the winning experiment; ML-02 does not guarantee an improvement.
* **DEF-04 deck:** review it, share it from its Share menu, and update the model and limitations slides after v2.
* **E2E-05:** add the team's real standup notes to the table in `E2E05_CADENCE_LOG.md`.
* **UAT:** run one session per persona and fill the 12.4.2 matrix in `SECTION12_TEST_RESULTS.md`.

### 7.4 Known limitations (documented, not defects)
* The age-out rule cannot apply "18 and no longer enrolled", because there is no enrollment field.
* Assessments that score below 70 are returned but not saved, because every save requires an audit entry.
* Stored evidence photos have no authenticated viewing route yet.
* Audit writes are serialized system-wide: correct under load, but bursts queue.

---

## 8. Commit list (this branch, oldest first)
`3de7ba7` INT-03 · `8b5307d` INT-04 · `e1fb0cc` mock router · `9963fa0` INT-02/06/07 · `8695c7c` INT-07 + docs ·
`9b57555` INT-01 · `b900263` INT-05 · `224823a` E2E-02 · `d07cf4d` + `69be57e` Sprint 3 · `9ba5d50` E2E-01 ·
`37b1423` E2E-03 · `285389d` E2E-04 · `77c4c6d` STR-01/03 · `20085f0` STR-02 + upload adapter ·
`792eb47` DEF-01/02 · `8e1b4c5` ML-04/07 · `a834bed` DEF-03/05 · `c811b66` reset index fix · `3c99e07` turnover ·
`e3ae342` INT-08 · `54f6622` Sprint 2 (ML-01, runner) · `1b474f2` turnover B/C · `a727f40` Section 12 + diagrams ·
`738f4e1` unit test report · `5f02a04` DEF-03 compose profiles · `23e6a9f` DAT-05 + DAT-01 check · this update
(Docker evidence, E2E-05, DEF-04/05, validation guide).

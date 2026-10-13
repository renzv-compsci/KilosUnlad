# CLAUDE_TURNOVER — KilosUnlad Integration Program (Sprints 1–6)

**Prepared for:** Renz Viloria (PM / Lead Integrator)
**Date:** 2026-10-12, updated 2026-10-13 (groups B and C)
**Branch:** `claude/clever-albattani-8ikzld` (base `e5acd07` = merge of PR #28). Open as
[PR #29](https://github.com/renzv-compsci/KilosUnlad/pull/29); every push to the branch updates it.
**Companion documents:** `docs/integration/CHANGELOG_TRACEABILITY.md` (per-commit change log, traceability matrix,
flag register), `docs/decisions/009-ml-vector-and-assessment-contracts.md`, evidence under
`docs/integration/evidence/`.

---

## 0. Is the system done once the blockers are finished?

**Short answer: all code work is done. What remains is one data file, runs on your machine, and your
decisions. None of it needs new code from anyone.**

| Group | What | Status (2026-10-13) |
| --- | --- | --- |
| A. Verification on Docker | Run the stack, the reset and the rehearsal on your machine; record the logs (§6) | **You.** About 30–60 min. |
| B. Sprint 2 ML (ML-01…ML-07) | Reconcile F1; retrain on empirical data; ship v2 with provenance | **Mostly done** (§7.1). ML-01 reconciled, partitions built, E1–E5 runner ready and tested. The empirical run needs `fies_raw.csv` placed in `data-pipeline/data/raw/`, then 5 commands. |
| C. Appeals dialog (INT-08) | Wire the appeals dialog to the live docket | **Done** (§7.2): real notices, real filing, browser-tested. |
| D. Your decisions and deliverables | Notice-issuance route (§7.3); slide deck DEF-04 (needs B's v2 result); standup evidence E2E-05 | **You.** |

What "done" means here:

* **For the four capstone proofs (the defense demo):** done once A passes on Docker. All four already pass
  end-to-end from a clean reset (§5).
* **For the program DoD in `SCRUM_INTEGRATION_PLAN.md`:** also needs the v2 model (B: place the FIES CSV, run the
  commands in §7.1, review, promote), D's deck, and a clean-clone run on foreign hardware.
* **For a complete beneficiary lifecycle in production:** two transitions are not implemented by anyone yet.
  * `UNDER_INVESTIGATION → NOTICE_OF_INELIGIBILITY`: there is no route and no audit action for it.
  * `NOTICE_OF_INELIGIBILITY → GRADUATED`: the timing helper exists, but there is no route.

  Today a household can be flagged, dispatched, reported on, appealed and frozen by a calamity, but it
  cannot be moved to notice or graduated through the API. This was already a known gap in
  `PHASE2_GAP_REVIEW.md`, and it needs your decision (§7.3).

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
| Capstone proofs | not scripted | **4/4 PASS from clean reset**, timed |

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

### 3.7 Documentation
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

---

## 5. Outputs (all reproducible)

### 5.1 Rehearsal — `docs/integration/evidence/sprint-6/rehearsal-local/SUMMARY.md` (15/15 PASS)
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

### 5.3 Key measurements
* **Ingest (80k + 80k):** insert phase 8.13 s; end-to-end 12.9–14.3 s; zero errors.
* **Index use:** IXSCAN on the triage compound index, both flagged (3/3) and at volume (80,002/80,002); no over-scan.
* **Integrity audit:** 0 issues across 160,012 documents.
* **API latency at 80k:** triage page in 0.15–0.19 s; one assessment with the real model in about 0.1 s.
* **Reset time:** reset alone 4.4–5.0 s (meets the 10 s DoD). **Reset + 80k ingest: 17.5–19.3 s (misses it).**
* **Live model:** macro F1 **0.766** on 3,000 QA-partition households, consistent with the reported 0.7726. This is still
  a synthetic benchmark.
* **Write contention:** 100 simultaneous flagging writes all succeed with zero 5xx (the burst takes 24 s, because all
  audit writes go through one sequence).

### 5.4 Evidence folders
* `docs/integration/evidence/sprint-2/SPRINT2_EVIDENCE.md`: ML-01 reconciliation, partition hashes, empirical run steps.
* `docs/integration/evidence/SPRINT1_EVIDENCE.md`: the INT-03 400 root cause and Sprint 1 decisions.
* `docs/integration/evidence/sprint-3/`: ingest, index, integrity and reset logs.
* `docs/integration/evidence/sprint-4/`: triage drawer screenshot.
* `docs/integration/evidence/sprint-6/`: the rehearsal (15 logs + SUMMARY) and clean-clone results.

---

## 6. Blockers you can run yourself (Group A) — step by step

These steps prove on your Docker stack what I proved locally. I could not run Docker in my environment.
Use Git Bash or WSL on Windows for the `bash` steps.

**Step 1 — Get the branch and build the stack**
```bash
git fetch origin claude/clever-albattani-8ikzld
git checkout claude/clever-albattani-8ikzld
docker compose down -v          # fresh volumes: re-runs init-mongo.js; deletes local DB + uploads
docker compose up -d --build    # gateway, client, server, ml-service, db, replset-init
curl http://localhost:5000/health      # server online
curl http://localhost:8000/health      # {"status":"online","model_loaded":true}
```

**Step 2 — Host-side test dependencies (one time)**
```bash
cd server && npm ci && cd ..                                         # scripts load the real models
cd data-pipeline/scripts && npm install axios form-data playwright-core && cd ../..
```
The browser tests need a Chromium or Chrome executable. Either set
`CHROMIUM_PATH` (Windows example: `C:/Program Files/Google/Chrome/Application/chrome.exe`) or run
`npx playwright install chromium` and point `CHROMIUM_PATH` at it.

**Step 3 — Full rehearsal (all four proofs + every integration test, each from a clean reset)**
```bash
CLIENT_URL=http://localhost \
CHROMIUM_PATH="<path to chrome>" \
EVIDENCE_DIR=docs/integration/evidence/sprint-6/rehearsal-docker \
bash data-pipeline/scripts/run_capstone_proofs.sh --full
```
* `CLIENT_URL=http://localhost` is required because Docker exposes the client only through the gateway on port 80.
* With Docker Compose v2 only (no `docker-compose` binary), also set:
  `RESET_CMD="docker compose run --rm reset-demo" SEED_CMD="docker compose run --rm seed-ingest"`.
* Expected: `15/15 passed`. Commit the `rehearsal-docker/` folder (use `git add -f` for the `.log` files, which are gitignored).

**Step 4 — Sprint 3 checks on Docker (after a reset + ingest)**
```bash
docker compose run --rm reset-demo
time docker compose run --rm seed-ingest     # record the wall-clock time (ADR-001)
docker compose run --rm seed-verify          # expect ALL PASS (flagged + 80k volume)
docker compose run --rm audit-integrity      # expect 0 issues
```

**Step 5 — Clean clone on another machine (DEF-03)**
```bash
git clone <repo> && cd KilosUnlad && git checkout claude/clever-albattani-8ikzld
docker compose up -d --build                 # all containers must start with no manual steps
```
Then repeat Steps 2–3 on that machine.

**Step 6 — Merge.** Open a PR from `claude/clever-albattani-8ikzld` into `main` once Steps 1–5 pass.

**If a step fails:** the per-scenario log in the evidence folder shows the exact HTTP status and error code.
Under the Iron Laws, a 400 or 403 means you fix the payload or fixture, never the guard.

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
* **Reset target.** Reset + 80k (17.5–19.3 s) misses the 10 s DoD. Accept it, or open a performance task.
* **v2 promotion** (after the §7.1 run): accept or reject the winning experiment; ML-02 does not guarantee an improvement.
* **DEF-04 deck** (after v2) and **E2E-05** standup evidence (team records).

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
`e3ae342` INT-08 · `54f6622` Sprint 2 (ML-01, runner) · this update.

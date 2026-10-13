# Sprint 1 Evidence — INT-02, INT-03, INT-04, INT-06, INT-07

Date: 2026-10-12 | Branch: `claude/clever-albattani-8ikzld`
Scope: backend integration seams. No model, collection, index or contract file was changed.

## 1. INT-03 root cause (400 `INVALID_REQUEST`)

On `main`, `routes/v1/appeal.routes.js` and `controllers/appeal.controller.js` were empty, so
`POST /appeals/docket` was not registered at all. Only two places in the server emit
400 `INVALID_REQUEST`:

| Source | Trigger with the appeal dialog payload |
| --- | --- |
| `validation.middleware.js` (Joi, `convert: false`, `allowUnknown: false`) | `hearing_date: "2026-10-20"` validated as `Joi.date()` is a string, not a Date, so it fails; any extra field (`status`, `notice_date`) fails |
| `error.middleware.js` (Mongoose `ValidationError` / `CastError`) | Writing `program_status: 'UNDER_APPEAL_HEARING'` (not in the frozen enum) or `Beneficiary.findById(household_id)` (string is not an ObjectId) |

`scopeJurisdiction` returns only 401 or 403 and cannot produce a 400.

Fix (no guard weakened, no schema change): the request schema accepts exactly the four dialog
fields and treats `hearing_date` as a validated calendar string. Households are looked up by
`household_id`. The notice instant comes from the stored `VerificationTask.admin_resolution`
(`APPROVED_GRADUATION`, `finalized_at`). The appeal is persisted as an `APPEAL_FILED` audit
block, because the frozen Beneficiary enum has no appeal status.

## 2. Test results

Server suite (`RUN_WORKFLOW_MONGO_TESTS=1`, disposable MongoDB 8.0 replica set):
133 tests, **123 pass, 7 fail, 3 skipped**. The 7 failures are `test/mlClient.test.js` only
(see §4.1); they fail identically on `main`. `test/app.test.js`, which failed on `main`, now passes.

Stack-level scripts against a real server after a fresh reset (local replica set):

```
test_int02_submission.js      [SUCCESS]  422 EVIDENCE_HASH_MISMATCH, 422 GEOFENCE_VIOLATION, 200 contract body, 409 duplicate
test_int03_appeals_docket.js  [SUCCESS]  401/403/403/400/400/400/404/409, 201, 409 duplicate, verify-chain valid
test_int04_calamity_toggle.js [SUCCESS]  401/403/403/403/400/400/400/409, 201 hold_active, 409, 200 lifted, verify-chain valid
verify-chain 1..5             is_chain_valid: true, total_blocks_verified: 5
  1 TASK_DISPATCHED   2 REPORT_SUBMITTED   3 APPEAL_FILED   4 CALAMITY_DECLARED   5 SYSTEM_CONFIG_UPDATED
```

Each script makes several rejected requests, yet the ledger holds exactly one block per accepted
mutation (INT-07: zero unintended writes).

INT-07 matrix coverage (server tests): duplicate submission, altered bytes, geofence >250 m,
unauthorized role, and expired JWT (`TOKEN_EXPIRED`) on all three new routes, plus concurrency
(one winner) for submission, docket and first calamity declaration.

## 3. Execution steps (Docker stack)

```bash
docker compose up -d --build server            # rebuild backend with the new routes
docker compose run --rm reset-demo             # or: sh data-pipeline/scripts/reset_demo.sh
for f in add_int02_case_a_fixture add_int03_notice_fixture; do
  docker cp data-pipeline/scripts/$f.js kilosunlad-db:/tmp/$f.js
  docker exec kilosunlad-db mongosh \
    "mongodb://admin_user:RootAdminSecret2026!@localhost:27017/kilosunlad?authSource=admin" /tmp/$f.js
done
(cd data-pipeline/scripts && npm install axios form-data)   # INT-02 script only
node data-pipeline/scripts/test_int02_submission.js
node data-pipeline/scripts/test_int03_appeals_docket.js
node data-pipeline/scripts/test_int04_calamity_toggle.js
# Server unit/integration suite (needs a local mongod binary):
cd server && RUN_WORKFLOW_MONGO_TESTS=1 MONGOD_PATH=$(which mongod) npm test
```

## 4. Decisions needed (blocking)

### 4.1 INT-01 / INT-05 — ML feature vector vs frozen artifacts
`mlClient.service.js` and the ML service both use the turnover's 6-feature PMT vector
(`head_formal_employment`, `remittance_income_flag`, `housing_material_score`,
`appliance_density_index`, `dependency_ratio`, `head_education_level` 0–3). Three frozen
artifacts still describe the old vector (`dependents_ratio`, `wall_score`, `roof_score`,
`water_access_level`, `head_education_level` 0–4):

- `docs/contracts/ml/ml-swdi-inference.json`, which is why 7 `mlClient` tests fail;
- the Beneficiary `demographics` sub-schema (bulk seeds store the new fields, but they are
  undeclared in the strict model);
- demo Case A (`graduation_beneficiary.json`) stores only the old fields.

INT-05 (live assessment) cannot build an ML request from stored records until one of these is
chosen: (a) update the contract file and the Beneficiary model to the 6-feature vector
(Renz + Dustin + Charles), or (b) agree on a derivation mapping from the old fields. INT-05 also
needs a trigger route and an indicator-mapping policy for `calculateRiskScore`, and neither is
defined in any contract.

### 4.2 Notice issuance (`UNDER_INVESTIGATION → NOTICE_OF_INELIGIBILITY`)
No route issues the notice, and the AuditLog enum has no notice action (PHASE2_GAP_REVIEW).
INT-03 therefore reads the notice instant from the stored `APPROVED_GRADUATION` resolution;
`add_int03_notice_fixture.js` seeds one for testing.

### 4.3 Recorded design choices (reversible)
- Calamity toggle is SUPER_ADMIN only: a declaration is municipality-wide, and a director's
  scope is a set of barangays.
- JSON submissions carry no image bytes. Their declared SHA-256 values are sealed with
  `evidence_bytes_verified: false`. Multipart uploads must cover every declared attachment.
- `422 GEOFENCE_VIOLATION` is the documented geofence breach code (Sprint 1 DoD).
- Calamity holds are not yet applied to dispatch or flagging (Sprint 4, E2E-02).

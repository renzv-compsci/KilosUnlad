# RDY-01 Placeholder Enumeration — integrationPlaceholders.service.js

Status: Verified against source provided by PM on 2026-10-12.
Evidence class: Source code (developer-provided), per evidence hierarchy level 3.

## 1. Verbatim Module Contents

const { WorkflowError } = require('./workflowPersistence.service');

// PM-authorized handoff boundaries. These perform no writes and never return
// simulated predictions, audit receipts or verification success.
function notReady(component) {
  throw new WorkflowError(503, 'ENDPOINT_NOT_READY', `${component} integration is pending.`);
}
module.exports = {
  evaluateHousehold: async () => notReady('ML/fallback evaluation'),
  submitTask: async () => notReady('Transactional field submission'),
  applyRiskAssessment: async () => notReady('Persisted risk assessment'),
  toggleCalamity: async () => notReady('Calamity toggle')
};

## 2. Exported Function Inventory

| # | Exported name | notReady label | Throws | HTTP semantics |
|---|---|---|---|---|
| 1 | evaluateHousehold | ML/fallback evaluation | WorkflowError(503, ENDPOINT_NOT_READY) | 503, no writes, no simulated prediction |
| 2 | submitTask | Transactional field submission | WorkflowError(503, ENDPOINT_NOT_READY) | 503, no writes, no simulated receipt |
| 3 | applyRiskAssessment | Persisted risk assessment | WorkflowError(503, ENDPOINT_NOT_READY) | 503, no writes, no simulated flag |
| 4 | toggleCalamity | Calamity toggle | WorkflowError(503, ENDPOINT_NOT_READY) | 503, no writes, no simulated hold |

Internal helper (not exported): notReady(component).
Count check: 4 exported async functions. This matches the turnover statement
"Four integration helper modules are currently mapped to integrationPlaceholders.service.js"
(Verified Fact, MASTER_TURNOVER.md Domain 1.1).

## 3. Replacement Mapping (Sprint 1)

| Placeholder | Replacing service(s) | Sprint 1 ID | Contract / reference |
|---|---|---|---|
| evaluateHousehold | mlClient.service.js (predict, 2500 ms deadline, 1 MiB cap, EVALUATED_VIA_FALLBACK tagging) | INT-01 | ml-swdi-inference.json; Turnover Domain 1.2(1), Domain 6 Step 1 |
| submitTask | sync.service.js (prepareSubmission, createSubmissionAuthorizer, verifyEvidenceHash) + geoFence.js (verifyGeofence, 250 m Haversine) | INT-02 | field-task-submission.json; Turnover Domain 1.2(2) |
| applyRiskAssessment | discrepancy.service.js (calculateRiskScore) + Beneficiary status persistence + audit.middleware.js chain append | INT-05, INT-06 | Turnover Domain 1.2(3) |
| toggleCalamity | calamity.service.js (hasActiveCalamityMoratorium) + SystemConfig moratorium write | INT-04 | Turnover Domain 1.2(4); RA 10121 |

## 4. Findings and Open Verification Items

RDY-01a (Requires Verification): The Appeals Docket seam (INT-03, appealLifecycle.service.js)
is NOT among the four exported placeholders, yet Turnover Domain 5 lists it as "Seam Ready".
Therefore POST /api/v1/appeals/docket is either (a) not registered at all (currently 404),
or (b) wired to a stub outside this module. Action before Sprint 1 planning closes:
inspect route registration (server/src/routes/* or the Express app entry) and record
the result here. If absent, INT-03 scope expands from "replace placeholder" to
"register route and wire appealLifecycle.service.js".

RDY-01b (Verified): By source comment, the module performs no writes and never returns
simulated predictions, receipts, or verification success. Deletion criterion for Sprint 1:
the file may be deleted only after all four call sites are rewired and no references remain.
Deletion check: grep -rn "integrationPlaceholders" server/src
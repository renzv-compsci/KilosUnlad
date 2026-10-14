const Joi = require('joi');
const Beneficiary = require('../models/Beneficiary');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const ExternalRecord = require('../models/ExternalRecord');
const SystemConfig = require('../models/SystemConfig');
const { sameConnection } = require('../utils/sameConnection');
const { assertNoRetentionCooldown } = require('./resolution.service');
const { assertNoCalamityHold } = require('./calamityToggle.service');
const R = require('../constants/roles');
const T = require('../constants/thresholds');
const { PROGRAM_STATUSES: S } = require('../constants/statuses');
const { allowRoles, requireJurisdiction } = require('../middleware/rbac.middleware');
const { createMlClient, MlClientError } = require('./mlClient.service');
const { calculateRiskScore } = require('./discrepancy.service');
const { evaluateAgeOut } = require('./ageOut.service');
const { createWorkflowPersistence, WorkflowError, runGuard } = require('./workflowPersistence.service');
const { computeEntryHash } = require('../utils/cryptoHelper');

const ROLES = [R.SUPER_ADMIN, R.REGIONAL_DIRECTOR];
const READ_ROLES = [R.SUPER_ADMIN, R.REGIONAL_DIRECTOR, R.COA_AUDITOR];
// ml-swdi-inference v1.1 feature vector, stored beside the declared demographics.
const PMT_FEATURES = ['head_education_level', 'head_formal_employment', 'remittance_income_flag',
  'housing_material_score', 'appliance_density_index', 'dependency_ratio'];
const OWNED = ['OWNED_OUTRIGHT', 'OWNED_WITH_ENCUMBRANCE'];
const HOUSEHOLD_MEMBERS = ['HOUSEHOLD_HEAD', 'SPOUSE', 'OTHER_HOUSEHOLD_MEMBER'];
const FALLBACK_TAG = 'EVALUATED_VIA_FALLBACK';
const NO_ELIGIBLE_CHILDREN = 'No eligible children (RA 11310 Sec. 6)';

const assessSchema = Joi.object({}).required();
const householdIdSchema = Joi.string().trim().min(1).max(128).required();

const BADGES = {
  swdi: level => ({ code: 'TIER_INVERSION', label: `AI Predicted Level ${level}`, severity: 'CRITICAL' }),
  power: () => ({ code: 'POWER_LIFELINE_BREACH', label: `Meralco > ${T.POWER_LIFELINE_MAX_KWH} kWh`, severity: 'HIGH' }),
  water: () => ({ code: 'WATER_LIFELINE_BREACH', label: `Water > ${T.WATER_LIFELINE_MAX_CU_M} cu.m`, severity: 'MEDIUM' }),
  telecom: () => ({ code: 'TELECOM_POSTPAID_PLAN', label: 'Postpaid telecom plan', severity: 'MEDIUM' }),
  vehicle: () => ({ code: 'LTO_VEHICLE_MATCH', label: 'Registered 4-Wheel Vehicle', severity: 'HIGH' })
};

// Indicator rules from admin-risk-assessment.json. The vehicle rule is the
// generator's asset_counting_mask; ownership fields count only where recorded.
function indicatorsFor(external) {
  const vehicles = external?.transport_registry?.vehicles || [];
  return {
    power: Number(external?.power_utility?.avg_monthly_kwh) > T.POWER_LIFELINE_MAX_KWH,
    water: Number(external?.water_utility?.avg_monthly_cu_m) > T.WATER_LIFELINE_MAX_CU_M,
    telecom: /^POSTPAID/.test(external?.telecom_registry?.contract_type || ''),
    vehicle: vehicles.some(v => v && v.vehicle_category === 'PASSENGER_4W' && v.is_commercial_franchise !== true &&
      (v.ownership_status == null || OWNED.includes(v.ownership_status)) &&
      (v.registered_owner_relationship == null || HOUSEHOLD_MEMBERS.includes(v.registered_owner_relationship)))
  };
}

// INT-05. ML (or fallback) -> calculateRiskScore -> when flagged, one transaction
// moves ACTIVE_COMPLIANT -> FLAGGED_FOR_REVIEW, writes risk_assessment and seals
// MODEL_FLAG_RAISED. Unflagged results are returned without any write.
function createRiskAssessment({ beneficiaries = Beneficiary, users = User, audits = AuditLog,
  externals = ExternalRecord, configs = sameConnection(beneficiaries, SystemConfig), mlClient = createMlClient() } = {}) {
  if (externals.db !== beneficiaries.db || configs.db !== beneficiaries.db) throw new TypeError('Assessment models must use the same database connection.');
  const authorize = allowRoles(...ROLES);

  async function assess(householdIdInput, actorId) {
    const { value: householdId, error } = householdIdSchema.validate(householdIdInput, { convert: false });
    if (error) throw new WorkflowError(400, 'INVALID_REQUEST', 'Request fields are missing or invalid.');
    if (typeof actorId !== 'string' || !/^[a-f0-9]{24}$/i.test(actorId)) {
      throw new WorkflowError(400, 'INVALID_WORKFLOW_INPUT', 'A valid authenticated actor is required.');
    }

    // Preflight with current stored state so unauthorized callers never reach the ML service.
    const actor = await users.findById(actorId).select('_id role jurisdiction is_active').lean();
    if (!actor || actor.is_active !== true) throw new WorkflowError(403, 'FORBIDDEN', 'Access is not permitted.');
    const req = { method: 'POST', query: {}, user: { ...actor, userId: String(actor._id) } };
    runGuard(authorize, req);
    const household = await beneficiaries.findOne({ household_id: householdId }).lean();
    if (!household) throw new WorkflowError(404, 'HOUSEHOLD_NOT_FOUND', 'Specified household ID does not exist.');
    runGuard(requireJurisdiction(() => household.address), req);
    if (household.program_status !== S.ACTIVE_COMPLIANT) {
      throw new WorkflowError(409, 'HOUSEHOLD_NOT_ASSESSABLE', 'Only ACTIVE_COMPLIANT households can be assessed.');
    }
    // DECISION-012: no re-flag within the cooldown after a retention or granted appeal.
    await assertNoRetentionCooldown({ audits, householdId });
    // RA 10121: compliance flagging is frozen in a declared calamity zone.
    await assertNoCalamityHold({ configs, address: household.address });

    const demographics = household.demographics || {};
    const features = Object.fromEntries(PMT_FEATURES.filter(k => demographics[k] !== undefined)
      .map(k => [k, demographics[k]]));
    let evaluation = null, fallbackReason = null;
    try {
      evaluation = (await mlClient.predict({ household_id: householdId,
        household_size: demographics.household_size, demographics: features })).ml_evaluation;
    } catch (err) {
      if (!(err instanceof MlClientError)) throw err;
      fallbackReason = err.code; // ML_TIMEOUT, ML_UNAVAILABLE, INVALID_ML_RESPONSE or INVALID_FEATURE_VECTOR
    }

    const external = await externals.findOne({ matched_household_id: householdId }).lean();
    const indicators = indicatorsFor(external);
    const predicted = evaluation ? evaluation.predicted_swdi_level : null;
    const swdiDifference = predicted === null ? 0
      : Math.min(2, Math.max(0, predicted - household.enrolled_swdi_level));
    const { score, meetsFlagThreshold, contributions } = calculateRiskScore({ swdiDifference, ...indicators });
    const evaluatedAt = new Date();
    // E2E-03a: RA 11310 age-out is reported, not scored (published weights unchanged).
    const ageOut = evaluateAgeOut(household.children_registry, evaluatedAt);
    const { aged_out: agedOut, eligible, total, unknown } = ageOut.summary;
    const trigger_badges = [
      ...(swdiDifference > 0 ? [BADGES.swdi(predicted)] : []),
      ...['power', 'water', 'telecom', 'vehicle'].filter(k => indicators[k]).map(k => BADGES[k]()),
      ...(agedOut ? [{ code: 'CHILD_AGE_OUT', label: `${agedOut} child${agedOut > 1 ? 'ren' : ''} aged out (RA 11310)`,
        severity: 'LOW' }] : [])
    ];
    const flag_reasons = [...trigger_badges.map(b => b.label),
      ...(total && !eligible && !unknown ? [NO_ELIGIBLE_CHILDREN] : []), ...(evaluation ? [] : [FALLBACK_TAG])];
    const result = { household_id: householdId,
      evaluation_mode: evaluation ? 'ML_MODEL' : FALLBACK_TAG, fallback_reason: fallbackReason,
      enrolled_swdi_level: household.enrolled_swdi_level, predicted_swdi_level: predicted,
      class_probabilities: evaluation ? evaluation.class_probabilities : null,
      shap_explainability: evaluation ? evaluation.shap_explainability : [],
      composite_risk_score: score, contributions, is_flagged: meetsFlagThreshold, trigger_badges, flag_reasons,
      children_eligibility: ageOut.summary,
      program_status: household.program_status, evaluated_at: evaluatedAt.toISOString(), audit_receipt: null };
    if (!meetsFlagThreshold) return result;

    const assessment = { composite_risk_score: score, is_flagged: true, flag_reasons, trigger_badges,
      evaluated_at: evaluatedAt, ...(predicted === null ? {} : { predicted_swdi_level: predicted }) };
    let previous;
    const transition = createWorkflowPersistence({ beneficiaries, users, audits, policy: {
      from: S.ACTIVE_COMPLIANT, to: S.FLAGGED_FOR_REVIEW, action: 'MODEL_FLAG_RAISED', roles: ROLES,
      precheck: async ({ record, session }) => {
        await assertNoRetentionCooldown({ audits, householdId: record.household_id, session });
        await assertNoCalamityHold({ configs, address: record.address, session });
      },
      perform: async ({ record, session }) => {
        previous = record.risk_assessment || {};
        const set = Object.fromEntries(Object.entries(assessment).map(([k, v]) => [`risk_assessment.${k}`, v]));
        // Correct stored eligibility only when every birthdate was evaluable.
        if (!unknown) set.children_registry = ageOut.children.map(({ birthdate, is_eligible }) => ({ birthdate, is_eligible }));
        const unset = predicted === null ? { 'risk_assessment.predicted_swdi_level': '' } : {};
        const update = await beneficiaries.updateOne({ _id: record._id },
          { $set: set, ...(predicted === null ? { $unset: unset } : {}) }, { session, runValidators: true });
        return update.matchedCount === 1;
      },
      auditDelta: () => ({
        before: { risk_assessment: { composite_risk_score: previous.composite_risk_score ?? null,
          is_flagged: previous.is_flagged ?? null, predicted_swdi_level: previous.predicted_swdi_level ?? null },
        children_is_eligible: (household.children_registry || []).map(c => c?.is_eligible ?? null) },
        after: { risk_assessment: { ...assessment, evaluated_at: result.evaluated_at,
          predicted_swdi_level: predicted }, evaluation_mode: result.evaluation_mode, fallback_reason: fallbackReason,
        contributions, class_probabilities: result.class_probabilities, shap_explainability: result.shap_explainability,
        children_eligibility: ageOut.summary,
        children_is_eligible: ageOut.children.map(c => c.is_eligible) }
      })
    } });
    const persisted = await transition({ householdId, actorId });
    return { ...result, program_status: persisted.program_status, audit_receipt: persisted.audit_receipt };
  }

  const authorizeRead = allowRoles(...READ_ROLES);

  // E2E-04: the triage drawer's explanation is the latest sealed MODEL_FLAG_RAISED
  // block, served only after its entry hash recomputes (admin-assessment-explanation.json).
  async function explain(householdIdInput, actorId, query = {}) {
    if (Object.keys(query || {}).length) {
      throw new WorkflowError(400, 'INVALID_QUERY', 'This endpoint does not accept query parameters.');
    }
    const { value: householdId, error } = householdIdSchema.validate(householdIdInput, { convert: false });
    if (error) throw new WorkflowError(400, 'INVALID_REQUEST', 'Request fields are missing or invalid.');
    const actor = await users.findById(actorId).select('_id role jurisdiction is_active').lean();
    if (!actor || actor.is_active !== true) throw new WorkflowError(403, 'FORBIDDEN', 'Access is not permitted.');
    const req = { method: 'GET', query: {}, user: { ...actor, userId: String(actor._id) } };
    runGuard(authorizeRead, req);
    const household = await beneficiaries.findOne({ household_id: householdId }).select('household_id address').lean();
    if (!household) throw new WorkflowError(404, 'HOUSEHOLD_NOT_FOUND', 'Specified household ID does not exist.');
    runGuard(requireJurisdiction(() => household.address), req);
    const block = await audits.findOne({ action: 'MODEL_FLAG_RAISED', 'target_entity.entity_id': householdId })
      .sort({ sequence_index: -1 }).lean();
    if (!block) throw new WorkflowError(404, 'ASSESSMENT_NOT_FOUND', 'No sealed assessment exists for this household.');
    let recomputed;
    try {
      recomputed = computeEntryHash({ sequenceIndex: block.sequence_index, previousEntryHash: block.previous_entry_hash,
        timestamp: block.timestamp, actorId: block.actor.user_id, action: block.action, stateDelta: block.state_delta });
    } catch { recomputed = null; }
    const sealed = block.state_delta?.after?.related;
    if (!sealed || recomputed !== block.entry_hash) {
      throw new WorkflowError(409, 'AUDIT_ENTRY_INVALID', 'An audit entry cannot be verified.');
    }
    return { household_id: householdId, evaluation_mode: sealed.evaluation_mode, fallback_reason: sealed.fallback_reason ?? null,
      predicted_swdi_level: sealed.risk_assessment?.predicted_swdi_level ?? null,
      class_probabilities: sealed.class_probabilities ?? null, shap_explainability: sealed.shap_explainability || [],
      composite_risk_score: sealed.risk_assessment?.composite_risk_score ?? null, contributions: sealed.contributions,
      evaluated_at: sealed.risk_assessment?.evaluated_at ?? null, sealed_at: new Date(block.timestamp).toISOString(),
      audit_receipt: { sequence_index: block.sequence_index, entry_hash: block.entry_hash } };
  }

  return { assess, explain };
}

module.exports = { createRiskAssessment, assessSchema, indicatorsFor, PMT_FEATURES };

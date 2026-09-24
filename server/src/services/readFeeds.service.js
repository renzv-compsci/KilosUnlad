const Beneficiary = require('../models/Beneficiary');
const VerificationTask = require('../models/VerificationTask');
const { PROGRAM_STATUSES } = require('../constants/statuses');
const { WorkflowError } = require('./workflowPersistence.service');

const invalid = () => new WorkflowError(400, 'INVALID_QUERY', 'Invalid feed query parameters.');
function filters(query, triage) {
  const allowed = triage ? ['province', 'municipality', 'barangay', 'status', 'page', 'limit'] : [];
  if (Object.keys(query).some(k => !allowed.includes(k)) ||
      Object.values(query).some(v => typeof v !== 'string' || !v.trim() || v.length > 128)) throw invalid();
  const geo = {};
  for (const key of ['province', 'municipality', 'barangay']) {
    if (query[key]) geo['address.' + key] = query[key];
  }
  if (query.status && !Object.values(PROGRAM_STATUSES).includes(query.status)) throw invalid();
  const integer = (value, fallback, max) => {
    if (value === undefined) return fallback;
    if (!/^[1-9]\d*$/.test(value) || !Number.isSafeInteger(Number(value)) || Number(value) > max) throw invalid();
    return Number(value);
  };
  return { geo, page: integer(query.page, 1, 1000000), limit: integer(query.limit, 10, 100) };
}
const iso = value => value ? new Date(value).toISOString() : null;
const address = b => ({ barangay: b.address.barangay, municipality: b.address.municipality,
  province: b.address.province });
const projection = 'household_id head_of_household address enrolled_swdi_level risk_assessment program_status';

function createReadFeeds({ beneficiaries = Beneficiary, tasks = VerificationTask } = {}) {
  function ready() {
    if (beneficiaries.db.readyState !== 1 || tasks.db.readyState !== 1) {
      throw new WorkflowError(503, 'SERVICE_UNAVAILABLE', 'Service temporarily unavailable.');
    }
  }
  return {
    async triage(query, jurisdictionFilter) {
      const { geo, page, limit } = filters(query, true);
      ready();
      // All counts use the same authorized geographic scope. Status filters only
      // the table; summary cards describe that scope across lifecycle statuses.
      const scope = { $and: [jurisdictionFilter, geo] };
      const match = { $and: [scope, query.status ? { program_status: query.status } : {}] };
      const [records, total, high, investigation, notice] = await Promise.all([
        beneficiaries.find(match).select(projection).sort({ 'risk_assessment.evaluated_at': -1, household_id: 1 })
          .skip((page - 1) * limit).limit(limit).lean(),
        beneficiaries.countDocuments(match),
        beneficiaries.countDocuments({ $and: [scope, { 'risk_assessment.composite_risk_score': { $gte: 70 } }] }),
        beneficiaries.countDocuments({ $and: [scope, { program_status: 'UNDER_INVESTIGATION' }] }),
        beneficiaries.countDocuments({ $and: [scope, { program_status: 'NOTICE_OF_INELIGIBILITY' }] })
      ]);
      return { pagination: { total_records: total, current_page: page, total_pages: Math.ceil(total / limit), limit },
        summary_metrics: { high_risk_count: high, under_investigation_count: investigation, notice_of_ineligibility_count: notice },
        items: records.map(b => ({ household_id: b.household_id,
          head_of_household: { full_name: `${b.head_of_household.first_name} ${b.head_of_household.last_name}`, national_id: b.head_of_household.national_id },
          address: { ...address(b), coordinates: b.address.coordinates.coordinates },
          enrolled_swdi_level: b.enrolled_swdi_level, predicted_swdi_level: b.risk_assessment?.predicted_swdi_level ?? null,
          composite_risk_score: b.risk_assessment?.composite_risk_score ?? 0,
          trigger_badges: (b.risk_assessment?.trigger_badges || []).map(({ code, label, severity }) => ({ code, label, severity })),
          program_status: b.program_status, flagged_at: iso(b.risk_assessment?.evaluated_at) })) };
    },
    async assigned(query, jurisdictionFilter, workerId) {
      filters(query, false);
      ready();
      const pending = await tasks.find({ assigned_worker_id: workerId,
        task_status: { $in: ['PENDING_DISPATCH', 'CACHED_OFFLINE'] } })
        .select('task_id household_id assignment_notes due_date').sort({ due_date: 1, task_id: 1 }).lean();
      const households = pending.length ? await beneficiaries.find({ $and: [jurisdictionFilter,
        { household_id: { $in: pending.map(t => t.household_id) } }] }).select(projection).lean() : [];
      const byId = new Map(households.map(b => [b.household_id, b]));
      const result = pending.filter(t => byId.has(t.household_id)).map(t => {
        const b = byId.get(t.household_id), h = b.head_of_household;
        return { task_id: t.task_id, household_id: t.household_id,
          head_of_household: { first_name: h.first_name, last_name: h.last_name, national_id: h.national_id, contact_phone: h.contact_phone ?? '' },
          address: { street: b.address.street ?? '', ...address(b), target_coordinates: b.address.coordinates.coordinates },
          current_swdi_level: b.enrolled_swdi_level,
          risk_assessment: { composite_risk_score: b.risk_assessment?.composite_risk_score ?? 0, flag_reasons: b.risk_assessment?.flag_reasons || [] },
          dispatch_instructions: t.assignment_notes ?? '', due_date: iso(t.due_date) };
      });
      return { worker_id: workerId, sync_timestamp: new Date().toISOString(), assigned_tasks_count: result.length, tasks: result };
    }
  };
}
module.exports = { createReadFeeds };

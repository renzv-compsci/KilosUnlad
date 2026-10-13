const Beneficiary = require('../models/Beneficiary');
const VerificationTask = require('../models/VerificationTask');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const SystemConfig = require('../models/SystemConfig');
const ROLES = require('../constants/roles');
const THRESHOLDS = require('../constants/thresholds');
const { PROGRAM_STATUSES, TASK_STATUSES } = require('../constants/statuses');
const { WEIGHTS } = require('./discrepancy.service');
const { MAX_ELIGIBLE_AGE } = require('./ageOut.service');
const { WorkflowError } = require('./workflowPersistence.service');

// UI live data (DECISION-010): read-only aggregates and lists for the screens that
// used sample data. Every beneficiary-derived number uses the caller's
// req.jurisdictionFilter; tasks and appeals are scoped through their household.
const invalid = () => new WorkflowError(400, 'INVALID_QUERY', 'Invalid query parameters.');
function parse(query, allowed) {
  if (Object.keys(query).some(k => !allowed.includes(k)) ||
      Object.values(query).some(v => typeof v !== 'string' || !v.trim() || v.length > 128)) throw invalid();
}
const integer = (value, fallback, max) => {
  if (value === undefined) return fallback;
  if (!/^[1-9]\d*$/.test(value) || !Number.isSafeInteger(Number(value)) || Number(value) > max) throw invalid();
  return Number(value);
};
const iso = value => value ? new Date(value).toISOString() : null;
const round = (value, digits = 1) => value == null ? null : Number(value.toFixed(digits));
const zeros = list => Object.fromEntries(list.map(k => [k, 0]));
// Prefix a jurisdiction filter so it applies to a $lookup-ed household document.
const under = (filter, prefix) => Object.fromEntries(Object.entries(filter).map(([k, v]) => [`${prefix}.${k}`, v]));
const OPEN = ['PENDING_DISPATCH', 'CACHED_OFFLINE'];
const VERIFIED = ['VERIFIED_GRADUATE', 'VERIFIED_RETAIN'];
const zoneView = z => ({ province: z.province, municipality: z.municipality, declared_at: iso(z.declared_at),
  expires_at: iso(z.expires_at), ndrrmc_reference: z.ndrrmc_reference ?? null });

function createInsights({ beneficiaries = Beneficiary, tasks = VerificationTask, users = User,
  audits = AuditLog, configs = SystemConfig, now = () => new Date() } = {}) {
  function ready() {
    if ([beneficiaries, tasks, users, audits, configs].some(m => m.db.readyState !== 1)) {
      throw new WorkflowError(503, 'SERVICE_UNAVAILABLE', 'Service temporarily unavailable.');
    }
  }
  // Directors see their own municipality's declarations; national roles see all.
  async function zones(user) {
    const config = await configs.findOne({ config_key: 'CALAMITY_ZONES' }).select('calamity_moratorium_zones').lean();
    const all = config?.calamity_moratorium_zones || [];
    const j = user.jurisdiction;
    return user.role === ROLES.REGIONAL_DIRECTOR
      ? all.filter(z => z.province === j?.province && z.municipality === j?.municipality) : all;
  }
  const active = (z, at) => z.is_active && new Date(z.declared_at) <= at && (!z.expires_at || at < new Date(z.expires_at));
  // Tasks joined to their household so the jurisdiction filter applies.
  const scopedTasks = scope => [
    { $lookup: { from: beneficiaries.collection.collectionName, localField: 'household_id',
      foreignField: 'household_id', as: 'b' } },
    { $unwind: '$b' }, { $match: under(scope, 'b') }];

  return {
    async overview(query, scope, user) {
      parse(query, []);
      ready();
      const at = now();
      const score = '$risk_assessment.composite_risk_score';
      const threshold = THRESHOLDS.RISK_SCORE_FLAG_TRIGGER;
      const [byStatus, byLevel, bands, triggers, municipalities, muniTriggers, taskRows, turnaround, workerRows,
        appeals, zoneList, auditStats] = await Promise.all([
        beneficiaries.aggregate([{ $match: scope }, { $group: { _id: '$program_status', n: { $sum: 1 } } }]),
        beneficiaries.aggregate([{ $match: scope }, { $group: { _id: '$enrolled_swdi_level', n: { $sum: 1 } } }]),
        beneficiaries.aggregate([{ $match: scope }, { $group: { _id: null,
          high_risk: { $sum: { $cond: [{ $gte: [score, threshold] }, 1, 0] } },
          critical: { $sum: { $cond: [{ $gte: [score, 80] }, 1, 0] } },
          flagged_total: { $sum: { $cond: [{ $gte: [score, threshold] }, score, 0] } } } }]),
        beneficiaries.aggregate([{ $match: { $and: [scope, { 'risk_assessment.trigger_badges.0': { $exists: true } }] } },
          { $unwind: '$risk_assessment.trigger_badges' },
          { $group: { _id: '$risk_assessment.trigger_badges.code', label: { $first: '$risk_assessment.trigger_badges.label' }, n: { $sum: 1 } } },
          { $sort: { n: -1, _id: 1 } }]),
        beneficiaries.aggregate([{ $match: scope }, { $group: { _id: { p: '$address.province', m: '$address.municipality' },
          households: { $sum: 1 },
          flagged: { $sum: { $cond: [{ $eq: ['$program_status', 'FLAGGED_FOR_REVIEW'] }, 1, 0] } },
          under_investigation: { $sum: { $cond: [{ $eq: ['$program_status', 'UNDER_INVESTIGATION'] }, 1, 0] } },
          notice: { $sum: { $cond: [{ $eq: ['$program_status', 'NOTICE_OF_INELIGIBILITY'] }, 1, 0] } },
          graduated: { $sum: { $cond: [{ $eq: ['$program_status', 'GRADUATED'] }, 1, 0] } },
          high_risk: { $sum: { $cond: [{ $gte: [score, threshold] }, 1, 0] } },
          flagged_total: { $sum: { $cond: [{ $gte: [score, threshold] }, score, 0] } },
          lng: { $avg: { $arrayElemAt: ['$address.coordinates.coordinates', 0] } },
          lat: { $avg: { $arrayElemAt: ['$address.coordinates.coordinates', 1] } } } },
          { $sort: { high_risk: -1, households: -1, '_id.m': 1 } }]),
        beneficiaries.aggregate([{ $match: { $and: [scope, { 'risk_assessment.trigger_badges.0': { $exists: true } }] } },
          { $unwind: '$risk_assessment.trigger_badges' },
          { $group: { _id: { m: '$address.municipality', code: '$risk_assessment.trigger_badges.code' }, n: { $sum: 1 } } },
          { $sort: { n: -1, '_id.code': 1 } }]),
        tasks.aggregate([...scopedTasks(scope), { $group: { _id: '$task_status', n: { $sum: 1 } } }]),
        tasks.aggregate([...scopedTasks(scope), { $match: { task_status: { $in: ['SUBMITTED', ...VERIFIED] } } },
          { $group: { _id: null, ms: { $avg: { $subtract: ['$updatedAt', '$createdAt'] } } } }]),
        tasks.aggregate([...scopedTasks(scope), { $match: { assigned_worker_id: { $ne: null } } },
          { $group: { _id: '$assigned_worker_id',
            open: { $sum: { $cond: [{ $in: ['$task_status', OPEN] }, 1, 0] } },
            submitted: { $sum: { $cond: [{ $eq: ['$task_status', 'SUBMITTED'] }, 1, 0] } },
            verified: { $sum: { $cond: [{ $in: ['$task_status', VERIFIED] }, 1, 0] } } } },
          { $lookup: { from: users.collection.collectionName, localField: '_id', foreignField: '_id', as: 'u' } },
          { $sort: { open: -1, _id: 1 } }]),
        audits.aggregate([{ $match: { action: 'APPEAL_FILED' } },
          { $lookup: { from: beneficiaries.collection.collectionName, localField: 'target_entity.entity_id',
            foreignField: 'household_id', as: 'b' } },
          { $unwind: '$b' }, { $match: under(scope, 'b') }, { $count: 'n' }]),
        zones(user),
        [ROLES.COA_AUDITOR, ROLES.SUPER_ADMIN].includes(user.role) ? Promise.all([
          audits.aggregate([{ $group: { _id: '$action', n: { $sum: 1 } } }, { $sort: { _id: 1 } }]),
          audits.findOne().sort({ sequence_index: -1 }).select('sequence_index timestamp').lean()
        ]) : null
      ]);
      const count = rows => Object.fromEntries(rows.map(r => [r._id, r.n]));
      const statusCounts = { ...zeros(Object.values(PROGRAM_STATUSES)), ...count(byStatus) };
      const total = Object.values(statusCounts).reduce((a, b) => a + b, 0);
      const band = bands[0] || { high_risk: 0, critical: 0, flagged_total: 0 };
      const activeZones = zoneList.filter(z => active(z, at));
      const workerIds = workerRows.filter(w => w.u.length);
      return {
        generated_at: at.toISOString(),
        households: { total, by_status: statusCounts,
          by_enrolled_level: Object.fromEntries(byLevel.filter(r => r._id != null).sort((a, b) => a._id - b._id).map(r => [String(r._id), r.n])) },
        risk: { flag_threshold: threshold, high_risk: band.high_risk, critical: band.critical,
          high: band.high_risk - band.critical, below_threshold: total - band.high_risk,
          average_flagged_score: band.high_risk ? round(band.flagged_total / band.high_risk) : null,
          triggers: triggers.map(r => ({ code: r._id, label: r.label || r._id, count: r.n })) },
        municipalities: municipalities.map(m => ({ province: m._id.p, municipality: m._id.m, households: m.households,
          flagged: m.flagged, under_investigation: m.under_investigation, notice: m.notice, graduated: m.graduated,
          high_risk: m.high_risk, average_flagged_score: m.high_risk ? round(m.flagged_total / m.high_risk) : null,
          centroid: m.lng == null ? null : [round(m.lng, 4), round(m.lat, 4)],
          calamity_active: activeZones.some(z => z.province === m._id.p && z.municipality === m._id.m),
          top_triggers: muniTriggers.filter(t => t._id.m === m._id.m).slice(0, 3).map(t => ({ code: t._id.code, count: t.n })) })),
        tasks: { total: taskRows.reduce((a, r) => a + r.n, 0),
          by_status: { ...zeros(Object.values(TASK_STATUSES)), ...count(taskRows) },
          average_turnaround_hours: turnaround[0] ? round(turnaround[0].ms / 3600000) : null,
          workers: workerIds.map(w => ({ user_id: String(w._id), full_name: w.u[0].full_name,
            open: w.open, submitted: w.submitted, verified: w.verified })) },
        due_process: { notices: statusCounts.NOTICE_OF_INELIGIBILITY, appeals_filed: appeals[0]?.n ?? 0 },
        calamity: { active_zones: activeZones.map(zoneView) },
        audit: auditStats ? { total_blocks: auditStats[0].reduce((a, r) => a + r.n, 0),
          last_sequence_index: auditStats[1]?.sequence_index ?? null, last_timestamp: iso(auditStats[1]?.timestamp),
          by_action: count(auditStats[0]) } : null
      };
    },

    async tasksList(query, scope) {
      parse(query, ['status', 'page', 'limit']);
      if (query.status && !Object.values(TASK_STATUSES).includes(query.status)) throw invalid();
      const page = integer(query.page, 1, 1000000), limit = integer(query.limit, 20, 100);
      ready();
      const [result] = await tasks.aggregate([
        ...(query.status ? [{ $match: { task_status: query.status } }] : []),
        ...scopedTasks(scope),
        { $sort: { createdAt: -1, task_id: 1 } },
        { $facet: { total: [{ $count: 'n' }], items: [{ $skip: (page - 1) * limit }, { $limit: limit },
          { $lookup: { from: users.collection.collectionName, localField: 'assigned_worker_id', foreignField: '_id', as: 'u' } }] } }]);
      const total = result.total[0]?.n ?? 0;
      return { pagination: { total_records: total, current_page: page, total_pages: Math.ceil(total / limit), limit },
        items: result.items.map(t => ({ task_id: t.task_id, household_id: t.household_id,
          head_of_household: { full_name: `${t.b.head_of_household.first_name} ${t.b.head_of_household.last_name}` },
          address: { barangay: t.b.address.barangay, municipality: t.b.address.municipality },
          task_status: t.task_status, priority: t.priority, due_date: iso(t.due_date),
          dispatched_at: iso(t.createdAt), updated_at: iso(t.updatedAt),
          assigned_worker: t.u[0] ? { user_id: String(t.u[0]._id), full_name: t.u[0].full_name } : null,
          composite_risk_score: t.b.risk_assessment?.composite_risk_score ?? 0 })) };
    },

    async caseworkers(query, user) {
      parse(query, []);
      ready();
      const j = user.jurisdiction;
      const filter = { role: ROLES.CASE_WORKER, is_active: true,
        ...(user.role === ROLES.REGIONAL_DIRECTOR ? { 'jurisdiction.province': j.province,
          'jurisdiction.municipality': j.municipality, 'jurisdiction.assigned_barangays': { $in: [...j.assigned_barangays] } } : {}) };
      const workers = await users.find(filter).select('full_name username jurisdiction').sort({ full_name: 1, username: 1 }).lean();
      const open = workers.length ? await tasks.aggregate([{ $match: { assigned_worker_id: { $in: workers.map(w => w._id) },
        task_status: { $in: OPEN } } }, { $group: { _id: '$assigned_worker_id', n: { $sum: 1 } } }]) : [];
      const openBy = new Map(open.map(r => [String(r._id), r.n]));
      return { items: workers.map(w => ({ user_id: String(w._id), full_name: w.full_name, username: w.username,
        jurisdiction: { province: w.jurisdiction?.province ?? null, municipality: w.jurisdiction?.municipality ?? null,
          assigned_barangays: w.jurisdiction?.assigned_barangays || [] },
        open_tasks: openBy.get(String(w._id)) ?? 0 })) };
    },

    async auditBlocks(query) {
      parse(query, ['limit', 'before']);
      const limit = integer(query.limit, 20, 100), before = integer(query.before, undefined, Number.MAX_SAFE_INTEGER);
      ready();
      const match = before === undefined ? {} : { sequence_index: { $lt: before } };
      const [items, total] = await Promise.all([
        audits.find(match).select('sequence_index timestamp action actor target_entity previous_entry_hash entry_hash')
          .sort({ sequence_index: -1 }).limit(limit).lean(),
        audits.countDocuments()]);
      const last = items[items.length - 1];
      const more = items.length === limit && await audits.exists({ sequence_index: { $lt: last.sequence_index } });
      return { items: items.map(b => ({ sequence_index: b.sequence_index, timestamp: iso(b.timestamp), action: b.action,
        actor: { username: b.actor.username, role: b.actor.role },
        target_entity: { collection_name: b.target_entity.collection_name, entity_id: b.target_entity.entity_id },
        previous_entry_hash: b.previous_entry_hash, entry_hash: b.entry_hash })),
        total_blocks: total, next_before: more ? last.sequence_index : null };
    },

    async policy(query, user) {
      parse(query, []);
      ready();
      return {
        risk_score: { flag_threshold: THRESHOLDS.RISK_SCORE_FLAG_TRIGGER, weights: { ...WEIGHTS }, cap: 100 },
        lifeline_limits: { power_kwh_per_month: THRESHOLDS.POWER_LIFELINE_MAX_KWH,
          water_cu_m_per_month: THRESHOLDS.WATER_LIFELINE_MAX_CU_M },
        field_verification: { geofence_radius_m: THRESHOLDS.MAX_GEOFENCE_VARIANCE_METERS },
        due_process: { appeal_window_days: 15 },
        age_out: { eligible_until_age: MAX_ELIGIBLE_AGE + 1, timezone: 'Asia/Manila' },
        sangla_atm: { max_swipe_interval_seconds: THRESHOLDS.SANGLA_MAX_SWIPE_INTERVAL_SECONDS,
          nocturnal_start_hour: THRESHOLDS.SANGLA_NOCTURNAL_START_HOUR, nocturnal_end_hour: THRESHOLDS.SANGLA_NOCTURNAL_END_HOUR,
          cluster_repeat_ratio: THRESHOLDS.SANGLA_CLUSTER_REPEAT_RATIO },
        calamity_zones: (await zones(user)).map(z => ({ ...zoneView(z), is_active: z.is_active }))
      };
    }
  };
}
module.exports = { createInsights };

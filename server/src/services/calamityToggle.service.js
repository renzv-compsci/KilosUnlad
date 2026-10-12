const Joi = require('joi');
const Beneficiary = require('../models/Beneficiary');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const SystemConfig = require('../models/SystemConfig');
const R = require('../constants/roles');
const { allowRoles } = require('../middleware/rbac.middleware');
const { hasActiveCalamityMoratorium } = require('./calamity.service');
const { WorkflowError, runGuard, assertAuditReady, appendAuditEntry,
  isSequenceContention } = require('./workflowPersistence.service');

// Decision 001 names the typed configuration document for moratorium zones.
const CONFIG_KEY = 'CALAMITY_ZONES';
// A declaration is municipality-wide; barangay-scoped directors cannot hold that scope.
const ROLES = [R.SUPER_ADMIN];
const place = Joi.string().trim().min(1).max(128).required();

const toggleSchema = Joi.object({
  province: place,
  municipality: place,
  is_active: Joi.boolean().required(),
  ndrrmc_reference: Joi.when('is_active', { is: true,
    then: Joi.string().trim().min(3).max(128).required(), otherwise: Joi.forbidden() }),
  expires_at: Joi.when('is_active', { is: true,
    then: Joi.string().isoDate().pattern(/(?:Z|[+-]\d{2}:\d{2})$/).optional(), otherwise: Joi.forbidden() })
}).required();

const iso = value => value instanceof Date ? value.toISOString() : null;
const zoneView = zone => ({ province: zone.province, municipality: zone.municipality,
  declared_at: iso(zone.declared_at), expires_at: iso(zone.expires_at),
  ndrrmc_reference: zone.ndrrmc_reference ?? null, is_active: zone.is_active });

// INT-04. Writes only the existing SystemConfig zone fields; household statuses
// are not transitioned (calamity transitions are not in the approved lifecycle).
// Holds are evaluated with hasActiveCalamityMoratorium wherever compliance runs.
function createCalamityToggle({ beneficiaries = Beneficiary, users = User, audits = AuditLog,
  configs = SystemConfig } = {}) {
  if (configs.db !== users.db || configs.db !== audits.db || configs.db !== beneficiaries.db) {
    throw new TypeError('Calamity toggle models must use the same database connection.');
  }
  const authorize = allowRoles(...ROLES);

  async function toggle(input, actorId) {
    const { value, error } = toggleSchema.validate(input, { convert: false, allowUnknown: false });
    if (error) throw new WorkflowError(400, 'INVALID_REQUEST', 'Request fields are missing or invalid.');
    if (typeof actorId !== 'string' || !/^[a-f0-9]{24}$/i.test(actorId)) {
      throw new WorkflowError(400, 'INVALID_WORKFLOW_INPUT', 'A valid authenticated actor is required.');
    }
    if (value.expires_at && Date.parse(value.expires_at) <= Date.now()) {
      throw new WorkflowError(400, 'INVALID_EXPIRY', 'The moratorium expiry must be in the future.');
    }
    await assertAuditReady(audits);
    const session = await configs.db.startSession();
    try {
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          return await session.withTransaction(() => toggleWithin(session, value, actorId),
            { readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' }, readPreference: 'primary' });
        } catch (err) {
          // Concurrent first declarations race on the unique config_key index.
          const contention = isSequenceContention(err) || (err.code === 11000 && err.keyPattern?.config_key);
          if (contention && attempt < 2) continue;
          throw err;
        }
      }
    } finally {
      await session.endSession();
    }
  }

  async function toggleWithin(session, value, actorId) {
    const actor = await users.findById(actorId)
      .select('_id username role jurisdiction is_active').session(session).lean();
    if (!actor || actor.is_active !== true) throw new WorkflowError(403, 'FORBIDDEN', 'Access is not permitted.');
    runGuard(authorize, { method: 'POST', query: {}, user: { ...actor, userId: String(actor._id) } });

    const { province, municipality } = value;
    const address = { province, municipality };
    const matches = zone => zone.province === province && zone.municipality === municipality;
    const at = new Date();
    const config = await configs.findOne({ config_key: CONFIG_KEY }).session(session).lean();
    const zonesBefore = config?.calamity_moratorium_zones || [];
    const holdBefore = holdFor(zonesBefore, address, at);

    let action, status;
    if (value.is_active) {
      if (holdBefore) throw new WorkflowError(409, 'CALAMITY_ALREADY_ACTIVE', 'A moratorium is already active for this municipality.');
      const zone = { province, municipality, declared_at: at, ndrrmc_reference: value.ndrrmc_reference, is_active: true };
      if (value.expires_at) zone.expires_at = new Date(value.expires_at);
      if (config) {
        await configs.updateOne({ _id: config._id }, { $push: { calamity_moratorium_zones: zone },
          $set: { updated_by: actorId } }, { session, runValidators: true });
      } else {
        await configs.create([{ config_key: CONFIG_KEY, calamity_moratorium_zones: [zone], updated_by: actorId }], { session });
      }
      action = 'CALAMITY_DECLARED'; status = 201;
    } else {
      if (!holdBefore) throw new WorkflowError(409, 'CALAMITY_NOT_ACTIVE', 'No active moratorium exists for this municipality.');
      await configs.updateOne({ _id: config._id }, { $set: {
        'calamity_moratorium_zones.$[z].is_active': false, updated_by: actorId } },
      { session, runValidators: true, arrayFilters: [{ 'z.province': province, 'z.municipality': municipality, 'z.is_active': true }] });
      // Decision 002: lifting is a configuration update, not a declaration.
      action = 'SYSTEM_CONFIG_UPDATED'; status = 200;
    }

    const zonesAfter = (await configs.findOne({ config_key: CONFIG_KEY }).session(session).lean()).calamity_moratorium_zones;
    const holdAfter = holdFor(zonesAfter, address, at);
    const stateDelta = {
      before: { config_key: CONFIG_KEY, province, municipality, hold_active: holdBefore,
        zones: zonesBefore.filter(matches).map(zoneView) },
      after: { config_key: CONFIG_KEY, province, municipality, hold_active: holdAfter,
        zones: zonesAfter.filter(matches).map(zoneView) }
    };
    const audit_receipt = await appendAuditEntry({ audits, session, actorId, actor, action,
      target: { collection_name: 'system_configs', entity_id: CONFIG_KEY }, stateDelta, timestamp: at });
    const affected_households = await beneficiaries.countDocuments({ 'address.province': province,
      'address.municipality': municipality }).session(session);
    const zone = stateDelta.after.zones[stateDelta.after.zones.length - 1];
    return { status, body: { province, municipality, is_active: value.is_active, hold_active: holdAfter,
      zone, affected_households, audit_receipt } };
  }

  return { toggle };
}

// Malformed stored configuration fails closed rather than silently clearing a hold.
function holdFor(zones, address, now) {
  try {
    return hasActiveCalamityMoratorium({ zones, address, now });
  } catch (error) {
    if (error instanceof TypeError) {
      throw new WorkflowError(503, 'CALAMITY_CONFIG_INVALID', 'Stored calamity configuration is invalid.');
    }
    throw error;
  }
}

module.exports = { createCalamityToggle, toggleSchema, CONFIG_KEY };

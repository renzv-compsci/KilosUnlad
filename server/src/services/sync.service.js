const Joi = require('joi');
const { WorkflowError, runGuard } = require('./workflowPersistence.service');
const User = require('../models/User');
const VerificationTask = require('../models/VerificationTask');
const Beneficiary = require('../models/Beneficiary');
const { requireJurisdiction } = require('../middleware/rbac.middleware');
const R = require('../constants/roles');
const { sha256 } = require('../utils/cryptoHelper');

const text = () => Joi.string().trim();
const timestamp = () => Joi.string().isoDate().pattern(/(?:Z|[+-]\d{2}:\d{2})$/);
const latitude = () => Joi.number().min(-90).max(90);
const longitude = () => Joi.number().min(-180).max(180);
const schema = Joi.object({
  task_id: text().max(128).required(),
  household_id: text().max(128).required(),
  verified_swdi_level: Joi.number().integer().valid(1, 2, 3).required(),
  worker_recommendation: Joi.string().valid('RETAIN', 'RECOMMEND_GRADUATION', 'INVESTIGATE_FRAUD').required(),
  narrative_report: text().required(),
  livelihood_asset_verification: Joi.object({
    is_motorcycle_present: Joi.boolean().required(),
    is_productive_asset: Joi.boolean().required(),
    proof_type: Joi.string().valid('NONE', 'MOVEIT', 'ANGKAS', 'TRICYCLE_MTOP', 'DELIVERY_LOGISTICS', 'OTHER').required(),
    franchise_number: text().allow('').required()
  }).required(),
  landbank_card_inspection: Joi.object({
    physical_card_presented: Joi.boolean().required(),
    card_matches_beneficiary: Joi.boolean().required(),
    pawning_suspected: Joi.boolean().required()
  }).required(),
  client_geolocation: Joi.object({
    latitude: latitude().required(), longitude: longitude().required(),
    accuracy_meters: Joi.number().min(0).required(), captured_at: timestamp().required()
  }).required(),
  evidence_attachments: Joi.array().items(Joi.object({
    media_type: Joi.string().valid('image/jpeg', 'image/png', 'image/webp').required(),
    storage_url: Joi.string().uri({ scheme: ['http', 'https'] }).required(),
    sha256_hash: Joi.string().pattern(/^[a-f0-9]{64}$/i).required(),
    exif_metadata: Joi.object({
      timestamp: timestamp().required(), latitude: latitude().required(), longitude: longitude().required()
    }).optional()
  })).required()
}).required();

// Preparation only: no authorization, URL fetching, binary verification or writes.
// Caller must compare household/task ownership with trusted stored records.
function prepareSubmission(input, routeTaskId) {
  const { value, error } = schema.validate(input, {
    convert: false, allowUnknown: false, abortEarly: false
  });
  if (error || typeof routeTaskId !== 'string' || value.task_id !== routeTaskId) {
    throw new WorkflowError(400, 'INVALID_SUBMISSION_REQUEST', 'Task submission fields are missing or invalid.');
  }
  const { task_id, household_id, ...field_findings } = value;
  return { task_id, household_id, field_findings };
}

// actorId must come from verified authentication, never submission data.
// This read-only preflight is not a write authorization token: repeat checks
// inside the eventual transaction and condition writes on task status/ownership.
function createSubmissionAuthorizer({ users = User, tasks = VerificationTask,
  beneficiaries = Beneficiary } = {}) {
  return async function authorizeSubmission({ input, routeTaskId, actorId, session = null } = {}) {
    const prepared = prepareSubmission(input, routeTaskId);
    if (typeof actorId !== 'string' || !/^[a-f0-9]{24}$/i.test(actorId)) {
      throw new WorkflowError(401, 'UNAUTHORIZED', 'Authentication is required.');
    }
    const actor = await users.findById(actorId)
      .select('_id role jurisdiction is_active').session(session).lean();
    if (!actor || actor.is_active !== true || actor.role !== R.CASE_WORKER) {
      throw new WorkflowError(403, 'FORBIDDEN', 'Access is not permitted.');
    }
    // Identical result for missing tasks and tasks belonging to another worker.
    const task = await tasks.findOne({ task_id: prepared.task_id, assigned_worker_id: actor._id })
      .session(session).lean();
    if (!task) throw new WorkflowError(404, 'TASK_NOT_FOUND', 'Assigned task was not found.');
    if (task.household_id !== prepared.household_id) {
      throw new WorkflowError(400, 'SUBMISSION_IDENTITY_MISMATCH', 'Submission does not match the assigned household.');
    }
    const household = await beneficiaries.findOne({ household_id: task.household_id })
      .session(session).lean();
    if (!household) throw new WorkflowError(404, 'HOUSEHOLD_NOT_FOUND', 'Assigned household was not found.');
    runGuard(requireJurisdiction(() => household.address), {
      method: 'POST', query: {}, user: { ...actor, userId: String(actor._id) }
    });
    if (!['PENDING_DISPATCH', 'CACHED_OFFLINE'].includes(task.task_status)) {
      throw new WorkflowError(409, 'TASK_NOT_SUBMITTABLE', 'Task is no longer open for submission.');
    }
    return prepared;
  };
}

// Only pass bytes obtained through an authorized upload/storage adapter.
// A matching digest proves byte integrity, not image validity or ownership.
function verifyEvidenceHash(bytes, expectedHash) {
  if (!Buffer.isBuffer(bytes) || bytes.length === 0 ||
      typeof expectedHash !== 'string' || !/^[a-f0-9]{64}$/i.test(expectedHash)) {
    throw new WorkflowError(400, 'INVALID_EVIDENCE_INPUT', 'Evidence bytes and a valid SHA-256 fingerprint are required.');
  }
  const actualHash = sha256(bytes);
  if (actualHash !== expectedHash.toLowerCase()) {
    throw new WorkflowError(422, 'EVIDENCE_HASH_MISMATCH',
      'Uploaded image binary does not match the provided SHA-256 fingerprint.');
  }
  return actualHash;
}

module.exports = { prepareSubmission, createSubmissionAuthorizer, verifyEvidenceHash };

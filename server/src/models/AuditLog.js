const mongoose = require('mongoose');

// --- Constants ---
const GENESIS_HASH = '0'.repeat(64);

const AUDIT_ACTIONS = [
  'MODEL_FLAG_RAISED',
  'TASK_DISPATCHED',
  'REPORT_SUBMITTED',
  'BENEFICIARY_GRADUATED',
  // DECISION-012: the one approved addition to the frozen list (retention, granted appeal).
  'BENEFICIARY_RETAINED',
  'APPEAL_FILED',
  'CALAMITY_DECLARED',
  'SYSTEM_CONFIG_UPDATED',
];

const ACTOR_ROLES = [
  'SUPER_ADMIN',
  'REGIONAL_DIRECTOR',
  'CASE_WORKER',
  'COA_AUDITOR',
  'SYSTEM',
];

// --- Sub-schema: actor ---
const actorSchema = new mongoose.Schema(
  {
    user_id: { type: String, required: true },
    username: { type: String, required: true, trim: true },
    role: { type: String, required: true, enum: ACTOR_ROLES },
    ip_address: { type: String, trim: true },
  },
  { _id: false, strict: true }
);

// --- Sub-schema: target_entity ---
const targetEntitySchema = new mongoose.Schema(
  {
    collection_name: { type: String, required: true, trim: true },
    entity_id: { type: String, required: true, trim: true },
  },
  { _id: false, strict: true }
);

// --- Sub-schema: state_delta ---
const stateDeltaSchema = new mongoose.Schema(
  {
    before: { type: mongoose.Schema.Types.Mixed },
    after: { type: mongoose.Schema.Types.Mixed },
  },
  { _id: false, strict: true }
);

// --- Main schema ---
const auditLogSchema = new mongoose.Schema(
  {
    sequence_index: {
      type: Number,
      required: true,
    },
    previous_entry_hash: {
      type: String,
      required: true,
      default: GENESIS_HASH,
    },
    timestamp: {
      type: Date,
      required: true,
      default: Date.now,
    },
    actor: {
      type: actorSchema,
      required: true,
    },
    action: {
      type: String,
      required: true,
      enum: AUDIT_ACTIONS,
    },
    target_entity: {
      type: targetEntitySchema,
      required: true,
    },
    state_delta: {
      type: stateDeltaSchema,
    },
    entry_hash: {
      type: String,
      required: true,
    },
  },
  {
    strict: true,
    timestamps: true,
    collection: 'audit_logs',
  }
);

// --- Indexes ---
auditLogSchema.index({ sequence_index: 1 }, { unique: true });
auditLogSchema.index({ entry_hash: 1 }, { unique: true });
auditLogSchema.index({ 'target_entity.entity_id': 1 });

// --- Export ---
module.exports = mongoose.model('AuditLog', auditLogSchema);
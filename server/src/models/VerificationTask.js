const mongoose = require('mongoose');

const verificationTaskSchema = new mongoose.Schema(
  {
    task_id: { type: String },
    household_id: { type: String },
    assigned_worker_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    task_status: {
      type: String,
      enum: [
        'PENDING_DISPATCH',
        'CACHED_OFFLINE',
        'SUBMITTED',
        'VERIFIED_GRADUATE',
        'VERIFIED_RETAIN',
      ],
    },
    verified_swdi_level: { type: Number },
    worker_recommendation: { type: String },
    narrative_report: { type: String },
    livelihood_asset_verification: {
      is_motorcycle_present: { type: Boolean },
      is_productive_asset: { type: Boolean },
      proof_type: { type: String },
      franchise_number: { type: String },
    },
    landbank_card_inspection: {
      physical_card_presented: { type: Boolean },
      card_matches_beneficiary: { type: Boolean },
      pawning_suspected: { type: Boolean },
    },
    client_geolocation: {
      latitude: { type: Number },
      longitude: { type: Number },
      accuracy_meters: { type: Number },
      captured_at: { type: Date },
    },
    evidence_attachments: {
      type: [mongoose.Schema.Types.Mixed],
    },
    admin_resolution: {
      type: mongoose.Schema.Types.Mixed,
    },
  },
  { strict: true }
);

verificationTaskSchema.index({ task_id: 1 }, { unique: true });
verificationTaskSchema.index({ assigned_worker_id: 1, task_status: 1 });

module.exports = mongoose.model('VerificationTask', verificationTaskSchema);
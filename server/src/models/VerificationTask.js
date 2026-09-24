const mongoose = require('mongoose');

// --- Constants ---
const TASK_STATUSES = [
  'PENDING_DISPATCH',
  'CACHED_OFFLINE',
  'SUBMITTED',
  'VERIFIED_GRADUATE',
  'VERIFIED_RETAIN',
];

const WORKER_RECOMMENDATIONS = [
  'RETAIN',
  'RECOMMEND_GRADUATION',
  'INVESTIGATE_FRAUD',
];

const PROOF_TYPES = [
  'NONE',
  'MOVEIT',
  'ANGKAS',
  'TRICYCLE_MTOP',
  'DELIVERY_LOGISTICS',
  'OTHER',
];

const ADMIN_DECISIONS = [
  'APPROVED_GRADUATION',
  'RETAINED_ON_ROSTER',
  'REINVESTIGATION_ORDERED',
];

const PRIORITY_LEVELS = [
  'LOW',
  'MEDIUM',
  'HIGH',
  'CRITICAL',
];

// --- Sub-schema: livelihood_asset_verification ---
const livelihoodAssetVerificationSchema = new mongoose.Schema(
  {
    is_motorcycle_present: { type: Boolean },
    is_productive_asset: { type: Boolean },
    proof_type: { type: String, enum: PROOF_TYPES },
    franchise_number: { type: String, trim: true },
  },
  { _id: false, strict: true }
);

// --- Sub-schema: landbank_card_inspection ---
const landbankCardInspectionSchema = new mongoose.Schema(
  {
    physical_card_presented: { type: Boolean },
    card_matches_beneficiary: { type: Boolean },
    pawning_suspected: { type: Boolean },
  },
  { _id: false, strict: true }
);

// --- Sub-schema: client_geolocation ---
const clientGeolocationSchema = new mongoose.Schema(
  {
    latitude: { type: Number },
    longitude: { type: Number },
    accuracy_meters: { type: Number },
    captured_at: { type: Date },
  },
  { _id: false, strict: true }
);

// --- Sub-schema: exif_metadata ---
const exifMetadataSchema = new mongoose.Schema(
  {
    timestamp: { type: Date },
    latitude: { type: Number },
    longitude: { type: Number },
  },
  { _id: false, strict: true }
);

// --- Sub-schema: evidence_attachments ---
const evidenceAttachmentSchema = new mongoose.Schema(
  {
    media_type: { type: String, default: 'image/jpeg' },
    storage_url: { type: String, required: true, trim: true },
    sha256_hash: { type: String, required: true, trim: true },
    exif_metadata: { type: exifMetadataSchema },
  },
  { _id: false, strict: true }
);

// --- Sub-schema: field_findings ---
const fieldFindingsSchema = new mongoose.Schema(
  {
    verified_swdi_level: { type: Number },
    worker_recommendation: {
      type: String,
      enum: WORKER_RECOMMENDATIONS,
    },
    narrative_report: { type: String, trim: true },
    livelihood_asset_verification: {
      type: livelihoodAssetVerificationSchema,
    },
    landbank_card_inspection: {
      type: landbankCardInspectionSchema,
    },
    client_geolocation: { type: clientGeolocationSchema },
    evidence_attachments: {
      type: [evidenceAttachmentSchema],
      default: [],
    },
  },
  { _id: false, strict: true }
);

// --- Sub-schema: admin_resolution ---
const adminResolutionSchema = new mongoose.Schema(
  {
    reviewed_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    decision: { type: String, required: true, enum: ADMIN_DECISIONS },
    admin_notes: { type: String, trim: true, default: '' },
    finalized_at: { type: Date, default: Date.now },
  },
  { _id: false, strict: true }
);

// --- Main schema ---
const verificationTaskSchema = new mongoose.Schema(
  {
    task_id: {
      type: String,
      required: true,
      trim: true,
    },
    household_id: {
      type: String,
      required: true,
      trim: true,
    },
    assigned_worker_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    task_status: {
      type: String,
      enum: TASK_STATUSES,
    },
    assignment_notes: {
      type: String,
      trim: true,
      alias: 'dispatch_instructions',
    },
    priority: {
      type: String,
      enum: PRIORITY_LEVELS,
      default: 'HIGH',
    },
    due_date: {
      type: Date,
      required: true,
    },
    field_findings: { type: fieldFindingsSchema },
    admin_resolution: { type: adminResolutionSchema },
  },
  {
    strict: true,
    timestamps: true,
    collection: 'verification_tasks',
  }
);

// --- Indexes ---
verificationTaskSchema.index({ task_id: 1 }, { unique: true });
verificationTaskSchema.index({ assigned_worker_id: 1, task_status: 1 });

// --- Export ---
module.exports = mongoose.model('VerificationTask', verificationTaskSchema);
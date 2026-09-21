const mongoose = require('mongoose');

// --- Constants ---
const METER_TYPES = ['NONE', 'COMMUNAL', 'INDIVIDUAL'];
const VEHICLE_CATEGORIES = [
  'MOTORCYCLE',
  'TRICYCLE',
  'PASSENGER_4W',
  'COMMERCIAL_UV',
  'OTHER',
];

// --- Sub-schema: power_utility ---
const powerUtilitySchema = new mongoose.Schema(
  {
    provider: { type: String, trim: true },
    meter_no: { type: String, trim: true },
    avg_monthly_kwh: { type: Number, min: 0 },
    is_lifeline: { type: Boolean, default: false },
  },
  { _id: false, strict: true }
);

// --- Sub-schema: water_utility ---
const waterUtilitySchema = new mongoose.Schema(
  {
    provider: { type: String, trim: true },
    meter_type: { type: String, enum: METER_TYPES },
    avg_monthly_cu_m: { type: Number, min: 0 },
    is_lifeline: { type: Boolean, default: false },
  },
  { _id: false, strict: true }
);

// --- Sub-schema: telecom_registry ---
const telecomRegistrySchema = new mongoose.Schema(
  {
    contract_type: { type: String, trim: true },
    monthly_plan_php: { type: Number, min: 0 },
  },
  { _id: false, strict: true }
);

// --- Sub-schema: vehicle ---
const vehicleSchema = new mongoose.Schema(
  {
    plate_number: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },
    vehicle_category: { type: String, enum: VEHICLE_CATEGORIES },
    make_model: { type: String, trim: true },
    year_model: { type: Number, min: 1950, max: 2100 },
    is_commercial_franchise: { type: Boolean, default: false },
  },
  { _id: false, strict: true }
);

// --- Sub-schema: transport_registry ---
const transportRegistrySchema = new mongoose.Schema(
  {
    vehicles: { type: [vehicleSchema], default: [] },
  },
  { _id: false, strict: true }
);

// --- Sub-schema: landbank_telemetry ---
const landbankTelemetrySchema = new mongoose.Schema(
  {
    card_masked_pan: { type: String, trim: true },
    last_withdrawal_timestamp: { type: Date },
    sangla_atm_risk_score: { type: Number, min: 0, max: 100 },
  },
  { _id: false, strict: true }
);

// --- Main schema ---
const externalRecordSchema = new mongoose.Schema(
  {
    matched_household_id: {
      type: String,
      required: true,
      trim: true,
    },
    national_id: {
      type: String,
      required: true,
      trim: true,
    },
    power_utility: { type: powerUtilitySchema, default: {} },
    water_utility: { type: waterUtilitySchema, default: {} },
    telecom_registry: { type: telecomRegistrySchema, default: {} },
    transport_registry: { type: transportRegistrySchema, default: {} },
    landbank_telemetry: { type: landbankTelemetrySchema, default: {} },
  },
  {
    strict: true,
    timestamps: true,
    collection: 'external_records',
  }
);

// --- Indexes ---
externalRecordSchema.index({ matched_household_id: 1 }, { unique: true });
externalRecordSchema.index({ national_id: 1 });

// --- Export ---
module.exports = mongoose.model('ExternalRecord', externalRecordSchema);
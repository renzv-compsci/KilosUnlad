const mongoose = require('mongoose');

const externalRecordSchema = new mongoose.Schema(
  {
    matched_household_id: { type: String },
    national_id: { type: String },
    power_utility: {
      provider: { type: String },
      meter_no: { type: String },
      avg_monthly_kwh: { type: Number },
      is_lifeline: { type: Boolean },
    },
    water_utility: {
      provider: { type: String },
      meter_type: { type: String },
      avg_monthly_cu_m: { type: Number },
      is_lifeline: { type: Boolean },
    },
    telecom_registry: {
      contract_type: { type: String },
      monthly_plan_php: { type: Number },
    },
    transport_registry: {
      vehicles: { type: [mongoose.Schema.Types.Mixed] },
    },
    landbank_telemetry: {
      card_masked_pan: { type: String },
      last_withdrawal_timestamp: { type: Date },
      sangla_atm_risk_score: { type: Number },
    },
  },
  { strict: true }
);

externalRecordSchema.index({ matched_household_id: 1 }, { unique: true });
externalRecordSchema.index({ national_id: 1 });

module.exports = mongoose.model('ExternalRecord', externalRecordSchema);
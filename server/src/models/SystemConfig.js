    const mongoose = require('mongoose');

    // --- Sub-schema: calamity_moratorium_zones ---
    const calamityMoratoriumZoneSchema = new mongoose.Schema(
    {
        municipality: { type: String, required: true, trim: true },
        province: { type: String, required: true, trim: true },
        declared_at: { type: Date, required: true },
        expires_at: { type: Date },
        ndrrmc_reference: { type: String, trim: true },
        is_active: { type: Boolean, default: true },
    },
    { _id: false, strict: true }
    );

    // --- Sub-schema: threshold_configs ---
    const thresholdConfigsSchema = new mongoose.Schema(
    {
        power_lifeline_kwh: { type: Number, default: 200 },
        water_lifeline_cu_m: { type: Number, default: 25 },
        risk_score_flag_trigger: { type: Number, default: 70 },
        appeal_window_days: { type: Number, default: 15 },
    },
    { _id: false, strict: true }
    );

    // --- Sub-schema: feature_flags ---
    const featureFlagsSchema = new mongoose.Schema(
    {
        enable_sangla_detection: { type: Boolean, default: true },
        enable_auto_dispatch: { type: Boolean, default: true },
        enable_geofence_enforcement: { type: Boolean, default: true },
    },
    { _id: false, strict: true }
    );

    // --- Main schema ---
    const systemConfigSchema = new mongoose.Schema(
    {
        config_key: {
        type: String,
        required: true,
        trim: true,
        },
        calamity_moratorium_zones: {
        type: [calamityMoratoriumZoneSchema],
        default: [],
        },
        threshold_configs: {
        type: thresholdConfigsSchema,
        default: () => ({}),
        },
        feature_flags: {
        type: featureFlagsSchema,
        default: () => ({}),
        },
        updated_by: { type: String, trim: true },
    },
    {
        strict: true,
        timestamps: true,
        collection: 'system_configs',
    }
    );

    // --- Indexes ---
    systemConfigSchema.index({ config_key: 1 }, { unique: true });

    // --- Export ---
    module.exports = mongoose.model('SystemConfig', systemConfigSchema);
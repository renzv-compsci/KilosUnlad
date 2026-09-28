    const mongoose = require('mongoose');

    // --- Constants ---
    const SWDI_LEVELS = [1, 2, 3];
    const PROGRAM_STATUSES = [
    'ACTIVE_COMPLIANT',
    'FLAGGED_FOR_REVIEW',
    'UNDER_INVESTIGATION',
    'NOTICE_OF_INELIGIBILITY',
    'GRADUATED',
    'CALAMITY_SUSPENDED',
    ];
    const BADGE_SEVERITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

    // --- Sub-schema: head_of_household ---
    const headOfHouseholdSchema = new mongoose.Schema(
    {
        first_name: { type: String, required: true, trim: true },
        last_name: { type: String, required: true, trim: true },
        national_id: { type: String, required: true, trim: true },
        contact_phone: { type: String, trim: true }, // optional
    },
    { _id: false, strict: true, toJSON: { virtuals: true } }
    );

    headOfHouseholdSchema.virtual('full_name').get(function () {
    return `${this.first_name} ${this.last_name}`;
    });

    // --- Sub-schema: address ---
    const addressSchema = new mongoose.Schema(
    {
        street: { type: String, trim: true }, // optional
        barangay: { type: String, required: true, trim: true },
        municipality: { type: String, required: true, trim: true },
        province: { type: String, required: true, trim: true },
        coordinates: {
        type: {
            type: String,
            enum: ['Point'],
            required: true,
            default: 'Point',
        },
        coordinates: {
            type: [Number], // [longitude, latitude]
            required: true,
            validate: {
            validator: (v) =>
                Array.isArray(v) &&
                v.length === 2 &&
                v[0] >= -180 &&
                v[0] <= 180 &&
                v[1] >= -90 &&
                v[1] <= 90,
            message:
                'coordinates must be [longitude, latitude] within valid ranges',
            },
        },
        },
    },
    { _id: false, strict: true }
    );

    // --- Sub-schema: children_registry ---
    const childSchema = new mongoose.Schema(
    {
        birthdate: { type: Date, required: true },
        is_eligible: { type: Boolean, default: true },
    },
    { _id: false, strict: true }
    );

    // --- Sub-schema: demographics ---
    const demographicsSchema = new mongoose.Schema(
    {
        household_size: { type: Number, min: 1, max: 20 },
        dependents_ratio: { type: Number, min: 0 },
        head_education_level: { type: Number, min: 0, max: 4 },
        wall_score: { type: Number, min: 1, max: 3 },
        roof_score: { type: Number, min: 1, max: 3 },
        water_access_level: { type: Number, min: 1, max: 3 },
    },
    { _id: false, strict: true }
    );

    // --- Sub-schema: trigger_badges ---
    const triggerBadgeSchema = new mongoose.Schema(
    {
        code: { type: String, required: true, trim: true },
        label: { type: String, required: true, trim: true },
        severity: { type: String, required: true, enum: BADGE_SEVERITIES },
    },
    { _id: false, strict: true }
    );

    // --- Sub-schema: risk_assessment ---
    const riskAssessmentSchema = new mongoose.Schema(
    {
        composite_risk_score: { type: Number, min: 0, max: 100, default: 0 },
        is_flagged: { type: Boolean, default: false },
        predicted_swdi_level: { type: Number, enum: SWDI_LEVELS },
        flag_reasons: { type: [String], default: [] },
        trigger_badges: { type: [triggerBadgeSchema], default: [] },
        evaluated_at: { type: Date },
    },
    { _id: false, strict: true }
    );

    // --- Main schema ---
    const beneficiarySchema = new mongoose.Schema(
    {
        household_id: {
        type: String,
        required: true,
        trim: true,
        },
        head_of_household: {
        type: headOfHouseholdSchema,
        required: true,
        },
        address: {
        type: addressSchema,
        required: true,
        },
        demographics: {
        type: demographicsSchema,
        required: true,
        },
        children_registry: {
        type: [childSchema],
        default: [],
        },
        enrolled_swdi_level: {
        type: Number,
        required: true,
        enum: SWDI_LEVELS,
        alias: 'current_swdi_level',
        },
        program_status: {
        type: String,
        required: true,
        enum: PROGRAM_STATUSES,
        default: 'ACTIVE_COMPLIANT',
        },
        risk_assessment: {
        type: riskAssessmentSchema,
        default: () => ({}),
        },
    },
    {
        strict: true,
        timestamps: true,
        collection: 'beneficiaries',
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
    );

    // --- Virtual: flagged_at (alias for risk_assessment.evaluated_at) ---
    beneficiarySchema.virtual('flagged_at').get(function () {
    return this.risk_assessment ? this.risk_assessment.evaluated_at : undefined;
    });

    // --- Indexes ---
    beneficiarySchema.index({ household_id: 1 }, { unique: true });
    beneficiarySchema.index(
    { 'head_of_household.national_id': 1 },
    { unique: true }
    );
    beneficiarySchema.index({ 'address.coordinates': '2dsphere' });

    // --- Export ---
    module.exports = mongoose.model('Beneficiary', beneficiarySchema);
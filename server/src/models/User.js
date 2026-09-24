const mongoose = require('mongoose');

// --- Sub-schema: jurisdiction ---
const jurisdictionSchema = new mongoose.Schema(
  {
    region: { type: String, trim: true },
    province: { type: String, trim: true },
    municipality: { type: String, trim: true },
    assigned_barangays: {
      type: [String],
      default: [],
    },
  },
  { _id: false, strict: true }
);

// --- Main schema: User ---
const userSchema = new mongoose.Schema(
  {
    full_name: { type: String, required: true, trim: true },
    username: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    password_hash: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      required: true,
      enum: [
        'SUPER_ADMIN',
        'REGIONAL_DIRECTOR',
        'CASE_WORKER',
        'COA_AUDITOR',
      ],
    },
    jurisdiction: {
      type: jurisdictionSchema,
      default: () => ({}),
    },
    is_active: {
      type: Boolean,
      default: true,
    },
    last_login_at: {
      type: Date,
      default: Date.now,
    },
  },
  {
    strict: true,
    timestamps: true,
    collection: 'users',
  }
);

// --- Indexes ---
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ username: 1 }, { unique: true });
userSchema.index({ role: 1, 'jurisdiction.municipality': 1 });

// --- Export ---
module.exports = mongoose.model('User', userSchema);
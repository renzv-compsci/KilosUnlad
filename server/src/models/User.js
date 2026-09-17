const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    username: { type: String },
    email: { type: String },
    password_hash: { type: String },
    role: {
      type: String,
      enum: [
        'SUPER_ADMIN',
        'REGIONAL_DIRECTOR',
        'CASE_WORKER',
        'COA_AUDITOR',
      ],
    },
    jurisdiction: {
      region: { type: String },
      province: { type: String },
      municipality: { type: String },
      assigned_barangays: { type: [String] },
    },
    is_active: { type: Boolean },
  },
  { strict: true }
);

userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ username: 1 }, { unique: true });
userSchema.index({ role: 1, 'jurisdiction.municipality': 1 });

module.exports = mongoose.model('User', userSchema);
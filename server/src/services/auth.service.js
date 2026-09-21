const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const environment = require('../config/environment');
const ROLES = require('../constants/roles');

// Unknown usernames still incur a password comparison.
const dummyHash = bcrypt.hashSync(crypto.randomBytes(32).toString('hex'), 12);
const invalid = () => Object.assign(new Error('The username or password provided is incorrect.'),
  { status: 401, code: 'INVALID_CREDENTIALS' });
const inactive = () => Object.assign(new Error('This account has been disabled by a system administrator.'),
  { status: 403, code: 'ACCOUNT_DEACTIVATED' });

function jurisdictionOf(user) {
  const j = user.jurisdiction || {};
  return { region: j.region || '', province: j.province || '', municipality: j.municipality || '',
    assigned_barangays: Array.from(j.assigned_barangays || []) };
}

function createAuthService({ users = User, secret = environment.JWT_SECRET } = {}) {
  function checkConfiguration() {
    if (typeof secret !== 'string' || secret.length < 32 || secret === 'dev_jwt_secret_fallback_key') {
      throw Object.assign(new Error('Authentication is not configured.'), { status: 503, code: 'AUTH_UNAVAILABLE' });
    }
  }
  return {
    secret,
    async login(input) {
      checkConfiguration();
      if (!input || typeof input.username !== 'string' || typeof input.password !== 'string' ||
          !input.username.trim() || input.username.length > 128 || !input.password ||
          Buffer.byteLength(input.password, 'utf8') > 72) throw invalid();
      const user = await users.findOne({ username: input.username.trim().toLowerCase() });
      const matched = await bcrypt.compare(input.password, user?.password_hash || dummyHash);
      if (!user || !matched) throw invalid();
      if (user.is_active !== true) throw inactive();
      if (!Object.values(ROLES).includes(user.role)) throw invalid();
      const jurisdiction = jurisdictionOf(user);
      const userId = String(user._id);
      // The frozen auth-session contract specifies a 900-second access session.
      const access_token = jwt.sign({ userId, role: user.role, jurisdiction }, secret,
        { algorithm: 'HS256', expiresIn: 900 });
      return { access_token, token_type: 'Bearer', expires_in_seconds: 900,
        user: { user_id: userId, username: user.username, full_name: user.full_name,
          email: user.email, role: user.role, jurisdiction,
          // User has no persisted last_login_at field; this is this session's login time.
          last_login_at: new Date().toISOString() } };
    },
    async findCurrentUser(userId) {
      if (!/^[a-f\d]{24}$/i.test(userId)) return null;
      const user = await users.findById(userId).select('_id role jurisdiction is_active').lean();
      if (!user) return null;
      if (user.is_active !== true) throw inactive();
      if (!Object.values(ROLES).includes(user.role)) return null;
      return { userId: String(user._id), role: user.role, jurisdiction: jurisdictionOf(user) };
    }
  };
}

module.exports = { createAuthService };

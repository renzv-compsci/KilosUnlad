const jwt = require('jsonwebtoken');
const environment = require('../config/environment');
const ROLES = require('../constants/roles');

const unauthorized = res => res.status(401).json({
  error: { code: 'UNAUTHORIZED', message: 'A valid, unexpired access token is required.' }
});

// Factory permits isolated tests without changing process-wide configuration.
function createAuthenticate({ secret = environment.JWT_SECRET, findCurrentUser } = {}) {
  return async function authenticate(req, res, next) {
    delete req.user;
    if (typeof secret !== 'string' || secret.length < 32 || secret === 'dev_jwt_secret_fallback_key') {
      return res.status(503).json({ error: {
        code: 'AUTH_UNAVAILABLE', message: 'Authentication is not configured.'
      } });
    }
    const header = req.get('authorization');
    const match = typeof header === 'string' && /^Bearer ([^\s,]+)$/i.exec(header);
    if (!match) return unauthorized(res);
    let claims;
    try {
      claims = jwt.verify(match[1], secret, { algorithms: ['HS256'] });
    } catch (error) {
      if (error.name === 'TokenExpiredError') return res.status(401).json({ error: {
        code: 'TOKEN_EXPIRED', message: 'Session has expired. Reconnect to network to log in.'
      } });
      return unauthorized(res);
    }
    if (!claims || typeof claims !== 'object' ||
        typeof claims.userId !== 'string' || !claims.userId.trim() ||
        !Object.values(ROLES).includes(claims.role) ||
        !Number.isFinite(claims.exp)) return unauthorized(res);
    // Match the signed userId claim in the frozen auth-session example.
    // Never merge request-body or query parameters into the authenticated identity.
    req.user = { userId: claims.userId, role: claims.role, jurisdiction: claims.jurisdiction };
    if (findCurrentUser) {
      try {
        const current = await findCurrentUser(claims.userId);
        if (!current) { delete req.user; return unauthorized(res); }
        req.user = current;
      } catch (error) { delete req.user; return next(error); }
    }
    return next();
  };
}

module.exports = createAuthenticate();
module.exports.createAuthenticate = createAuthenticate;

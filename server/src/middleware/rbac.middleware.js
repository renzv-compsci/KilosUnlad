const ROLES = require('../constants/roles');
const scopedRoles = [ROLES.REGIONAL_DIRECTOR, ROLES.CASE_WORKER];
const text = value => typeof value === 'string' && value.trim().length > 0;
const deny = (res, status = 403) => res.status(status).json({ error: {
  code: status === 401 ? 'UNAUTHORIZED' : 'FORBIDDEN',
  message: status === 401 ? 'Authentication is required.' : 'Access is not permitted.'
} });
const outside = res => res.status(403).json({ error: {
  code: 'OUT_OF_JURISDICTION',
  message: 'User is not authorized to view records outside their assigned region.'
} });

function allowRoles(...roles) {
  if (!roles.length || roles.some(role => !Object.values(ROLES).includes(role))) {
    throw new TypeError('An explicit list of valid roles is required.');
  }
  return (req, res, next) => {
    if (!req.user) return deny(res, 401);
    if (!roles.includes(req.user.role)) return deny(res);
    // Auditors cannot mutate records even if accidentally included in a route's allowlist.
    if (req.user.role === ROLES.COA_AUDITOR && !['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      return deny(res);
    }
    return next();
  };
}

// For collection queries: apply req.jurisdictionFilter with $and to EVERY DB query,
// including counts/aggregations. Never spread untrusted query input over this filter.
function scopeJurisdiction(req, res, next) {
  if (!req.user) return deny(res, 401);
  const { role, jurisdiction: j } = req.user;
  if ([ROLES.SUPER_ADMIN, ROLES.COA_AUDITOR].includes(role)) {
    req.jurisdictionFilter = {};
    return next();
  }
  if (!scopedRoles.includes(role) || !j ||
      !['region', 'province', 'municipality'].every(key => text(j[key])) ||
      !Array.isArray(j.assigned_barangays) || !j.assigned_barangays.length ||
      !j.assigned_barangays.every(text)) return outside(res);
  // Explicit out-of-scope filters return 403, rather than silently broadening access.
  for (const key of ['province', 'municipality', 'barangay']) {
    const requested = req.query[key];
    if (requested !== undefined && (!text(requested) ||
        (key === 'barangay' ? !j.assigned_barangays.includes(requested) : requested !== j[key]))) {
      return outside(res);
    }
  }
  req.jurisdictionFilter = {
    'address.province': j.province,
    'address.municipality': j.municipality,
    'address.barangay': { $in: [...j.assigned_barangays] }
  };
  return next();
}

// The resolver MUST return a server-loaded record's address, never req.body/query.
// Use after authentication, allowRoles, and the resource-loading middleware.
function requireJurisdiction(getAddress) {
  if (typeof getAddress !== 'function') throw new TypeError('A trusted address resolver is required.');
  return (req, res, next) => scopeJurisdiction(req, res, () => {
    if (!scopedRoles.includes(req.user.role)) return next();
    let address;
    try { address = getAddress(req); } catch (error) { return next(error); }
    const j = req.user.jurisdiction;
    if (!address || address.province !== j.province || address.municipality !== j.municipality ||
        !j.assigned_barangays.includes(address.barangay)) return outside(res);
    return next();
  });
}

module.exports = { allowRoles, scopeJurisdiction, requireJurisdiction };

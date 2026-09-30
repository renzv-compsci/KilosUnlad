const placeholders = require('../services/integrationPlaceholders.service');

// Unmounted handoff controller. Owner must add authentication, approved RBAC,
// range validation and a real verifier before enabling this endpoint.
function createVerifyChain(service = placeholders) {
  return async (req, res, next) => {
    res.set('Cache-Control', 'no-store');
    try { res.json(await service.verifyChain(req.query)); }
    catch (error) { next(error); }
  };
}
module.exports = { createVerifyChain };

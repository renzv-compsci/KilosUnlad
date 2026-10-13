const { createAppealDocket } = require('../services/appealDocket.service');

// INT-03: POST /api/v1/appeals/docket. Mounted after authenticate, allowRoles,
// scopeJurisdiction and validateBody; the service re-checks all of them in-transaction.
function createFileAppeal(service = createAppealDocket()) {
  return async (req, res, next) => {
    res.set('Cache-Control', 'no-store');
    try { res.status(201).json(await service.file(req.validatedBody, req.user.userId)); }
    catch (error) { next(error); }
  };
}

// INT-08: GET /api/v1/appeals/docket (admin-due-process-docket.json).
function createListDocket(service = createAppealDocket()) {
  return async (req, res, next) => {
    res.set('Cache-Control', 'no-store');
    try { res.status(200).json(await service.list(req.query, req.jurisdictionFilter)); }
    catch (error) { next(error); }
  };
}

module.exports = { createFileAppeal, createListDocket };

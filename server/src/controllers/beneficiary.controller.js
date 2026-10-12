const { createRiskAssessment } = require('../services/riskAssessment.service');

// INT-05: POST /api/v1/beneficiaries/:household_id/assess (admin-risk-assessment.json).
function createAssess(service = createRiskAssessment()) {
  return async (req, res, next) => {
    res.set('Cache-Control', 'no-store');
    try { res.status(200).json(await service.assess(req.params.household_id, req.user.userId)); }
    catch (error) { next(error); }
  };
}

// E2E-04: GET /api/v1/beneficiaries/:household_id/assessment (admin-assessment-explanation.json).
function createExplain(service = createRiskAssessment()) {
  return async (req, res, next) => {
    res.set('Cache-Control', 'no-store');
    try { res.status(200).json(await service.explain(req.params.household_id, req.user.userId, req.query)); }
    catch (error) { next(error); }
  };
}

module.exports = { createAssess, createExplain };

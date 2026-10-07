const { WorkflowError } = require('../services/workflowPersistence.service');

// Unmounted placeholder guard. Do not append audit records after res.finish:
// mutation and audit must commit together in the same database transaction.
module.exports = function pendingAuditIntegration(req, res, next) {
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    return next(new WorkflowError(503, 'ENDPOINT_NOT_READY', 'Transactional audit interception is pending.'));
  }
  return next();
};

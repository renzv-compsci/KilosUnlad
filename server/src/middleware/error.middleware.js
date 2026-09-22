const { InvalidStatusTransitionError } = require('../services/workflow.service');
const { WorkflowError } = require('../services/workflowPersistence.service');

module.exports = (error, req, res, next) => {
  if (res.headersSent) return next(error);
  if (error instanceof WorkflowError) {
    return res.status(error.status).json({ error: { code: error.code, message: error.message } });
  }
  if (error instanceof InvalidStatusTransitionError) {
    return res.status(400).json({ error: { code: error.code, message: error.message } });
  }
  const known = ['INVALID_CREDENTIALS', 'ACCOUNT_DEACTIVATED', 'AUTH_UNAVAILABLE'];
  if (known.includes(error.code)) {
    return res.status(error.status).json({ error: { code: error.code, message: error.message } });
  }
  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({ error: { code: 'INVALID_JSON', message: 'Request body must be valid JSON.' } });
  }
  return res.status(503).json({ error: { code: 'SERVICE_UNAVAILABLE', message: 'Service temporarily unavailable.' } });
};

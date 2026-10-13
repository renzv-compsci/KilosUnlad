const { InvalidStatusTransitionError } = require('../services/workflow.service');
const { WorkflowError } = require('../services/workflowPersistence.service');
const mongoose = require('mongoose');

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
  if (error instanceof mongoose.Error.ValidationError || error instanceof mongoose.Error.CastError) {
    return res.status(400).json({ error: { code: 'INVALID_REQUEST', message: 'Request fields are missing or invalid.' } });
  }
  // Malformed multipart uploads are client errors, never a service outage.
  if (error.name === 'MulterError') {
    return error.code === 'LIMIT_FILE_SIZE'
      ? res.status(413).json({ error: { code: 'PAYLOAD_TOO_LARGE', message: 'Request body exceeds the allowed size.' } })
      : res.status(400).json({ error: { code: 'INVALID_EVIDENCE_INPUT', message: 'Evidence bytes and a valid SHA-256 fingerprint are required.' } });
  }
  if (error.type === 'entity.too.large') {
    return res.status(413).json({ error: { code: 'PAYLOAD_TOO_LARGE', message: 'Request body exceeds the allowed size.' } });
  }
  return res.status(503).json({ error: { code: 'SERVICE_UNAVAILABLE', message: 'Service temporarily unavailable.' } });
};

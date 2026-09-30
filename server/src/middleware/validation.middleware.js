const { WorkflowError } = require('../services/workflowPersistence.service');

// Route owners supply an explicit Joi schema; never infer it from user data.
module.exports = function validateBody(schema) {
  if (!schema || typeof schema.validate !== 'function') throw new TypeError('A Joi schema is required.');
  return (req, res, next) => {
    const { value, error } = schema.validate(req.body, {
      convert: false, allowUnknown: false, abortEarly: false
    });
    if (error) return next(new WorkflowError(400, 'INVALID_REQUEST', 'Request fields are missing or invalid.'));
    req.validatedBody = value;
    return next();
  };
};

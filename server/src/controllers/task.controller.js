const { createTaskSubmission } = require('../services/taskSubmission.service');

function createDispatch(taskDispatcher) {
  return async (req, res, next) => {
    res.set('Cache-Control', 'no-store');
    try { 
      res.status(201).json(await taskDispatcher.dispatch(req.body, req.user.userId)); 
    } catch (error) { 
      next(error); 
    }
  };
}

function createSubmit(service = createTaskSubmission()) {
  return async (req, res, next) => {
    res.set('Cache-Control', 'no-store');
    try {
      // Multipart/form-data converts all text fields to strings. Parse them back
      // so the Joi schema in sync.service.js receives Objects and Numbers. JSON
      // bodies (the field-task-submission contract) pass through unchanged.
      const parsedBody = { ...req.body };
      const jsonFields = [
        'livelihood_asset_verification',
        'landbank_card_inspection',
        'client_geolocation',
        'evidence_attachments'
      ];

      for (const field of jsonFields) {
        if (typeof parsedBody[field] === 'string') {
          try {
            parsedBody[field] = JSON.parse(parsedBody[field]);
          } catch (e) {
            // Intentionally left empty; Joi will catch the invalid format and throw 400
          }
        }
      }

      // Only an all-digit string is converted; anything else is left for Joi to reject.
      if (typeof parsedBody.verified_swdi_level === 'string' && /^\d+$/.test(parsedBody.verified_swdi_level)) {
        parsedBody.verified_swdi_level = Number(parsedBody.verified_swdi_level);
      }

      res.status(200).json(await service.submit({
        input: parsedBody,
        routeTaskId: req.params.id,
        actorId: req.user.userId,
        files: (req.files || []).map(file => file.buffer)
      }));
    } catch (error) {
      next(error);
    }
  };
}

module.exports = { createDispatch, createSubmit };
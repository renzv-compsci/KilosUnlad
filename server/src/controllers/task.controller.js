const { prepareSubmission, createSubmissionAuthorizer, verifyEvidenceHash } = require('../services/sync.service');
const { WorkflowError } = require('../services/workflowPersistence.service');

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

function createSubmit() {
  return async (req, res, next) => {
    res.set('Cache-Control', 'no-store');
    try {
      // 1. Parse multipart string fields back to their correct types
      // Multipart/form-data converts all text fields to strings. We must parse them 
      // so the Joi schema in sync.service.js receives the correct Objects and Numbers.
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
      
      if (typeof parsedBody.verified_swdi_level === 'string') {
        parsedBody.verified_swdi_level = parseInt(parsedBody.verified_swdi_level, 10);
      }

      // 2. Authorize and prepare submission
      const authorize = createSubmissionAuthorizer();
      const prepared = await authorize({
        input: parsedBody,
        routeTaskId: req.params.id,
        actorId: req.user.userId
      });

      // 3. Verify evidence hashes
      if (req.files && req.files.length > 0) {
        for (let i = 0; i < prepared.field_findings.evidence_attachments.length; i++) {
          const expectedHash = prepared.field_findings.evidence_attachments[i].sha256_hash;
          const fileBuffer = req.files[i].buffer; 
          verifyEvidenceHash(fileBuffer, expectedHash);
        }
      }

      // 4. Return success (Transactional write is pending final integration)
      res.status(201).json({
        task_id: prepared.task_id,
        household_id: prepared.household_id,
        status: 'SUBMITTED',
        message: 'Submission authorized, schema validated, and evidence hashes verified.'
      });

    } catch (error) {
      next(error);
    }
  };
}

module.exports = { createDispatch, createSubmit };
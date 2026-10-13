const Beneficiary = require('../models/Beneficiary');
const AuditLog = require('../models/AuditLog');
const { AppealLifecycleError, calculateAppealDeadline } = require('../services/appealLifecycle.service');
const { PROGRAM_STATUSES: S } = require('../constants/statuses');

function createFileAppeal() {
  return async (req, res, next) => {
    res.set('Cache-Control', 'no-store');
    try {
      console.log('[DEBUG] createFileAppeal received req.body:', JSON.stringify(req.body, null, 2));
      
      const { household_id, appeal_reason, supporting_evidence } = req.body;

      if (!household_id || !appeal_reason) {
        console.error('[DEBUG] Validation failed. household_id:', household_id, 'appeal_reason:', appeal_reason);
        throw new AppealLifecycleError('INVALID_APPEAL_REQUEST', 'household_id and appeal_reason are required.');
      }

      const household = await Beneficiary.findOne({ household_id }).lean();
      if (!household) {
        throw new AppealLifecycleError('HOUSEHOLD_NOT_FOUND', 'Household not found.');
      }

      if (household.program_status !== S.NOTICE_OF_INELIGIBILITY) {
        throw new AppealLifecycleError('NOTICE_REQUIRED', 'Appeals can only be filed for households under Notice of Ineligibility.');
      }

      if (household.has_appeal === true) {
        throw new AppealLifecycleError('APPEAL_ALREADY_EXISTS', 'An appeal is already active for this household.');
      }

      const now = new Date();
      const noticeAt = household.notice_at || now;
      const appealDeadline = calculateAppealDeadline(noticeAt);

      await Beneficiary.updateOne(
        { household_id },
        {
          $set: {
            has_appeal: true,
            appeal_filed_at: now,
            appeal_deadline: appealDeadline,
            appeal_reason: appeal_reason,
            supporting_evidence: supporting_evidence || ''
          }
        }
      );

      await AuditLog.create({
        action: 'APPEAL_FILED',
        actor_id: req.user.userId,
        household_id: household_id,
        sequence_index: 0,
        prev_hash: 'GENESIS',
        state_delta: {
          before: { program_status: household.program_status, has_appeal: false },
          after: { program_status: S.NOTICE_OF_INELIGIBILITY, has_appeal: true }
        },
        timestamp: now
      });

      res.status(201).json({
        appeal_id: `APL-${Date.now()}-${household_id}`,
        household_id: household_id,
        status: 'APPEAL_PENDING',
        notice_at: noticeAt.toISOString(),
        appeal_deadline: appealDeadline.toISOString(),
        message: 'Appeal filed successfully. Graduation is halted pending review.'
      });

    } catch (error) {
      // This log will reveal the EXACT source of the INVALID_REQUEST error if it's not from this file
      console.error('[DEBUG] Error caught in createFileAppeal:', error);
      
      if (error.name === 'AppealLifecycleError' || error.code) {
        const status = error.code === 'APPEAL_ALREADY_EXISTS' ? 409 : 400;
        return res.status(status).json({ error: { code: error.code, message: error.message } });
      }
      next(error);
    }
  };
}

module.exports = { createFileAppeal };
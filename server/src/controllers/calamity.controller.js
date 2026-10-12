const { createCalamityToggle } = require('../services/calamityToggle.service');

// INT-04: POST /api/v1/calamity/toggle. 201 on declaration, 200 on lift.
function createToggleCalamity(service = createCalamityToggle()) {
  return async (req, res, next) => {
    res.set('Cache-Control', 'no-store');
    try {
      const { status, body } = await service.toggle(req.validatedBody, req.user.userId);
      res.status(status).json(body);
    } catch (error) { next(error); }
  };
}

module.exports = { createToggleCalamity };

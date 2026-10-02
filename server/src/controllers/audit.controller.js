const { createChainVerifier } = require('../services/hashChain.service');

function createVerifyChain(service = createChainVerifier()) {
  return async (req, res, next) => {
    res.set('Cache-Control', 'no-store');
    try { res.json(await service.verifyChain(req.query)); }
    catch (error) { next(error); }
  };
}
module.exports = { createVerifyChain };

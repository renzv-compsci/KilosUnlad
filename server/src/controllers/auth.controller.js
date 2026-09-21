function createLogin(authService) {
  return async (req, res, next) => {
    res.set('Cache-Control', 'no-store');
    try { return res.json(await authService.login(req.body)); }
    catch (error) { return next(error); }
  };
}
module.exports = { createLogin };

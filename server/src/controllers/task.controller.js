function createDispatch(taskDispatcher) {
  return async (req, res, next) => {
    res.set('Cache-Control', 'no-store');
    try { res.status(201).json(await taskDispatcher.dispatch(req.body, req.user.userId)); }
    catch (error) { next(error); }
  };
}
module.exports = { createDispatch };

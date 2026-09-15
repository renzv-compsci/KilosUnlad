const router = require('express').Router();

router.use((req, res, next) => {
  res.set('X-KilosUnlad-Mock', 'true');
  next();
});
router.use('/auth', require('./auth.routes'));
router.use('/beneficiaries', require('./beneficiary.routes'));
router.use('/tasks', require('./task.routes'));

module.exports = router;

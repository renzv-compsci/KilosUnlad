const router = require('express').Router();
const session = require('../../mocks/auth-session.json');

// Phase 1 only: credentials are not validated and the token is a placeholder.
router.post('/login', (req, res) => res.status(200).json(session));

module.exports = router;

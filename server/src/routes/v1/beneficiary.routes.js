const router = require('express').Router();
const triageFeed = require('../../mocks/admin-triage-feed.json');

router.get('/triage-queue', (req, res) => res.status(200).json(triageFeed));

module.exports = router;

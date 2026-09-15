const router = require('express').Router();
const assignedTasks = require('../../mocks/field-task-download.json');

router.get('/assigned', (req, res) => res.status(200).json(assignedTasks));

module.exports = router;

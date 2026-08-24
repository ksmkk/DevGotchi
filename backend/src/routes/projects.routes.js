const express = require('express');
const { listProjectStatuses, getProjectStatusByName } = require('../controllers/projectController');

const router = express.Router();

router.get('/', listProjectStatuses);
router.get('/:projectName', getProjectStatusByName);

module.exports = router;

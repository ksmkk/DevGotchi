const express = require('express');
const {
	getDemoProjectStatus,
	listProjectStatuses,
	getProjectStatusByName,
} = require('../controllers/projectController');

const router = express.Router();

router.get('/', listProjectStatuses);
router.get('/demo', getDemoProjectStatus);
router.get('/:projectName', getProjectStatusByName);

module.exports = router;

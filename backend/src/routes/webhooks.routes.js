const express = require('express');

const { handleProjectWebhook } = require('../controllers/webhookController');

const router = express.Router();

router.post('/project-status', (req, res) => {
  handleProjectWebhook(req, res);
});

module.exports = router;

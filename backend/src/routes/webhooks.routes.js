const express = require('express');

const { handleProjectWebhook } = require('../controllers/webhookController');

const router = express.Router();

router.post('/project-status', async (req, res, next) => {
  try {
    await handleProjectWebhook(req, res);
  } catch (error) {
    next(error);
  }
});

module.exports = router;

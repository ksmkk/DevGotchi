const express = require('express');
const { handleGitHubWebhook } = require('../github/githubWebhook');

const router = express.Router();

router.post('/', express.raw({ type: 'application/json', limit: '1mb' }), handleGitHubWebhook);

module.exports = router;
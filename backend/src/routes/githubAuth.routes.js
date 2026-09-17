const express = require('express');
const {
  completeGitHubOAuth,
  startGitHubOAuth,
} = require('../auth/githubAuth');

const router = express.Router();

router.get('/github', (req, res, next) => {
  try {
    return startGitHubOAuth(req, res);
  } catch (error) {
    return next(error);
  }
});

router.get('/github/callback', (req, res, next) => {
  completeGitHubOAuth(req, res).catch(next);
});

module.exports = router;
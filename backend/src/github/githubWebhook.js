const crypto = require('node:crypto');
const { GITHUB_WEBHOOK_SECRET } = require('../config/env');

function hasValidSignature(rawBody, signature) {
  if (!GITHUB_WEBHOOK_SECRET || !Buffer.isBuffer(rawBody) || typeof signature !== 'string') {
    return false;
  }

  const expected = Buffer.from(
    `sha256=${crypto.createHmac('sha256', GITHUB_WEBHOOK_SECRET).update(rawBody).digest('hex')}`,
  );
  const provided = Buffer.from(signature);

  return provided.length === expected.length && crypto.timingSafeEqual(provided, expected);
}

function handleGitHubWebhook(req, res) {
  if (!hasValidSignature(req.body, req.get('x-hub-signature-256'))) {
    return res.status(401).json({ error: 'Firma de webhook inválida' });
  }

  return res.status(202).json({ accepted: true });
}

module.exports = { handleGitHubWebhook, hasValidSignature };
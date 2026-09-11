const crypto = require('crypto');
const { evaluateProjectHealth } = require('../services/devgotchiService');
const { setProjectStatus } = require('../store/projectStore');
const { pool } = require('../../db/database');
const { GITHUB_WEBHOOK_SECRET } = require('../config/env');

function hasValidGitHubSignature(req) {
  if (!GITHUB_WEBHOOK_SECRET) return true;

  const signature = req.get('x-hub-signature-256') || '';
  const expected = `sha256=${crypto
    .createHmac('sha256', GITHUB_WEBHOOK_SECRET)
    .update(req.rawBody || Buffer.from(JSON.stringify(req.body || {})))
    .digest('hex')}`;

  return signature.length === expected.length
    && crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

async function handleProjectWebhook(req, res) {
  if (!hasValidGitHubSignature(req)) {
    return res.status(401).json({ ok: false, message: 'Firma de GitHub inválida' });
  }

  const payload = req.body || {};

  const result = evaluateProjectHealth(payload);
  setProjectStatus(result.project, result);

  const projectResult = await pool.query(
    `SELECT id FROM projects
     WHERE repository_url = $1 OR name = $2
     ORDER BY id ASC LIMIT 1`,
    [result.repositoryUrl || null, result.project],
  );

  if (projectResult.rows.length > 0) {
    const projectId = projectResult.rows[0].id;
    const mood = result.health === 'healthy'
      ? 'happy'
      : result.health === 'critical' ? 'sad' : 'neutral';

    await pool.query(
      `UPDATE projects
       SET devgotchi_health = $1, devgotchi_mood = $2, last_commit_date = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [result.vida, mood, projectId],
    );
    await pool.query(
      `INSERT INTO health_history (project_id, health_value, mood)
       VALUES ($1, $2, $3)`,
      [projectId, result.vida, mood],
    );
  }

  return res.status(200).json({
    ok: true,
    data: result,
  });
}

module.exports = {
  hasValidGitHubSignature,
  handleProjectWebhook,
};

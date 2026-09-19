const crypto = require('node:crypto');
const { GITHUB_WEBHOOK_SECRET } = require('../config/env');
const { evaluateProjectHealth } = require('../services/devgotchiService');
const { setProjectStatus } = require('../store/projectStore');

const processedDeliveries = new Set();
const MAX_PROCESSED_DELIVERIES = 10_000;

function repositoryData(payload) {
  const repository = payload.repository || {};
  const [owner, name] = String(repository.full_name || '').split('/');
  return {
    project: repository.full_name || repository.name || 'unknown-project',
    repository: repository.full_name || repository.name || 'unknown-repository',
    owner,
    name,
  };
}

function normalizeGitHubEvent(eventName, payload) {
  const repository = repositoryData(payload);
  const workflow = payload.workflow_run || payload.check_suite || {};
  const conclusion = String(workflow.conclusion || '').toLowerCase();
  const state = String(payload.deployment_status?.state || '').toLowerCase();
  const branch = workflow.head_branch || payload.deployment?.ref || payload.ref?.replace('refs/heads/', '');

  if (eventName === 'workflow_run' && payload.action === 'completed') {
    return {
      ...repository,
      signal: conclusion === 'success' ? 'ci_passed' : 'ci_failed',
      status: conclusion === 'success' ? 'success' : 'failed',
      branch,
      workflow: workflow.name,
    };
  }

  if (eventName === 'check_suite' && payload.action === 'completed') {
    return {
      ...repository,
      signal: conclusion === 'success' ? 'ci_passed' : 'ci_failed',
      status: conclusion === 'success' ? 'success' : 'failed',
      branch,
      workflow: 'check-suite',
    };
  }

  if (eventName === 'deployment_status') {
    const failed = ['error', 'failure', 'inactive'].includes(state);
    return {
      ...repository,
      signal: failed ? 'deployment_failed' : 'deployment_updated',
      status: failed ? 'failed' : state || 'unknown',
      branch,
      workflow: 'deployment',
    };
  }

  if (eventName === 'dependabot_alert') {
    return {
      ...repository,
      signal: 'dependabot_alert',
      status: ['dismissed', 'fixed'].includes(payload.action) ? 'success' : 'failed',
      branch,
      workflow: 'dependabot',
    };
  }

  if (eventName === 'code_scanning_alert') {
    return {
      ...repository,
      signal: 'code_scanning_alert',
      status: ['closed_by_user', 'fixed', 'dismissed'].includes(payload.action) ? 'success' : 'failed',
      branch,
      workflow: 'code-scanning',
    };
  }

  if (eventName === 'secret_scanning_alert') {
    return {
      ...repository,
      signal: 'secret_scanning_alert',
      status: ['resolved', 'revoked', 'dismissed'].includes(payload.action) ? 'success' : 'failed',
      branch,
      workflow: 'secret-scanning',
    };
  }

  if (eventName === 'branch_protection_rule') {
    return {
      ...repository,
      signal: 'branch_protection_changed',
      status: payload.action === 'deleted' ? 'failed' : 'success',
      branch: payload.rule?.name || branch,
      workflow: 'branch-protection',
    };
  }

  return null;
}

function rememberDelivery(delivery) {
  if (!delivery) return true;
  if (processedDeliveries.has(delivery)) return false;
  processedDeliveries.add(delivery);
  if (processedDeliveries.size > MAX_PROCESSED_DELIVERIES) {
    processedDeliveries.delete(processedDeliveries.values().next().value);
  }
  return true;
}

function deliverHealthSignal(normalizedEvent, delivery) {
  const health = evaluateProjectHealth(normalizedEvent);
  return setProjectStatus(normalizedEvent.project, {
    ...health,
    signal: normalizedEvent.signal,
    delivery,
  });
}

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

  const delivery = req.get('x-github-delivery');
  const eventName = req.get('x-github-event');
  let payload;
  try {
    payload = JSON.parse(req.body.toString('utf8'));
  } catch {
    return res.status(400).json({ error: 'Payload de webhook inválido' });
  }

  if (!rememberDelivery(delivery)) {
    return res.status(202).json({ accepted: true, duplicate: true });
  }

  const normalizedEvent = normalizeGitHubEvent(eventName, payload);
  if (!normalizedEvent) {
    return res.status(202).json({ accepted: true, ignored: true });
  }

  deliverHealthSignal(normalizedEvent, delivery);
  return res.status(202).json({ accepted: true, signal: normalizedEvent.signal });
}

module.exports = {
  deliverHealthSignal,
  handleGitHubWebhook,
  hasValidSignature,
  normalizeGitHubEvent,
};
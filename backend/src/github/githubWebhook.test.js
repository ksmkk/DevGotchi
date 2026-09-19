const crypto = require('node:crypto');
const http = require('node:http');

process.env.GITHUB_WEBHOOK_SECRET = 'test-webhook-secret';

const app = require('../app');
const { normalizeGitHubEvent } = require('./githubWebhook');

function requestWebhook(body, signature, event = 'workflow_run', delivery = 'delivery-1') {
  return new Promise((resolve, reject) => {
    const server = app.listen(0, () => {
      const request = http.request({
        host: '127.0.0.1',
        port: server.address().port,
        path: '/api/github/webhook',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-GitHub-Event': event,
          'X-GitHub-Delivery': delivery,
          ...(signature ? { 'X-Hub-Signature-256': signature } : {}),
        },
      }, (response) => {
        let responseBody = '';
        response.on('data', (chunk) => { responseBody += chunk; });
        response.on('end', () => {
          server.close();
          resolve({ statusCode: response.statusCode, body: JSON.parse(responseBody) });
        });
      });

      request.on('error', (error) => {
        server.close();
        reject(error);
      });
      request.end(body);
    });
  });
}

describe('POST /api/github/webhook', () => {
  const body = JSON.stringify({
    action: 'completed',
    workflow_run: {
      name: 'CI',
      head_branch: 'main',
      conclusion: 'failure',
    },
    repository: { full_name: 'devgotchi/example' },
  });

  test('acepta una firma HMAC válida', async () => {
    const signature = `sha256=${crypto.createHmac('sha256', process.env.GITHUB_WEBHOOK_SECRET)
      .update(Buffer.from(body)).digest('hex')}`;

    await expect(requestWebhook(body, signature)).resolves.toEqual({
      statusCode: 202,
      body: { accepted: true, signal: 'ci_failed' },
    });
  });

  test('no procesa dos veces el mismo delivery', async () => {
    const signature = `sha256=${crypto.createHmac('sha256', process.env.GITHUB_WEBHOOK_SECRET)
      .update(Buffer.from(body)).digest('hex')}`;

    await expect(requestWebhook(body, signature, 'workflow_run', 'delivery-duplicate'))
      .resolves.toEqual({
        statusCode: 202,
        body: { accepted: true, signal: 'ci_failed' },
      });
    await expect(requestWebhook(body, signature, 'workflow_run', 'delivery-duplicate'))
      .resolves.toEqual({
        statusCode: 202,
        body: { accepted: true, duplicate: true },
      });
  });

  test.each([undefined, 'sha256=invalid'])('rechaza una firma ausente o inválida', async (signature) => {
    await expect(requestWebhook(body, signature)).resolves.toMatchObject({
      statusCode: 401,
      body: { error: 'Firma de webhook inválida' },
    });
  });

  test('ignora eventos no soportados sin error', () => {
    expect(normalizeGitHubEvent('issues', { action: 'opened' })).toBeNull();
  });
});
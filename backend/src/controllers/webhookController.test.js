const crypto = require('node:crypto');

function responseMock() {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
}

describe('controlador de webhooks REST', () => {
  const secret = 'webhook-test-secret';

  beforeEach(() => {
    jest.resetModules();
    process.env.GITHUB_WEBHOOK_SECRET = secret;
  });

  afterEach(() => {
    delete process.env.GITHUB_WEBHOOK_SECRET;
  });

  function loadController(pool) {
    jest.doMock('../../db/database', () => ({ pool }));
    return require('./webhookController');
  }

  test('valida la firma exacta y rechaza firmas inválidas', async () => {
    const pool = { query: jest.fn() };
    const { handleProjectWebhook, hasValidGitHubSignature } = loadController(pool);
    const body = { project: 'acme/api', status: 'success' };
    const rawBody = Buffer.from(JSON.stringify(body));
    const validSignature = `sha256=${crypto.createHmac('sha256', secret).update(rawBody).digest('hex')}`;
    const req = {
      body,
      rawBody,
      get: jest.fn(() => validSignature),
    };

    expect(hasValidGitHubSignature(req)).toBe(true);
    expect(hasValidGitHubSignature({ ...req, get: () => 'short' })).toBe(false);
    expect(hasValidGitHubSignature({
      ...req,
      get: () => `sha256=${'0'.repeat(64)}`,
    })).toBe(false);

    const res = responseMock();
    await handleProjectWebhook({ ...req, get: () => 'invalid' }, res);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(pool.query).not.toHaveBeenCalled();
  });

  test.each([
    ['success', 'happy'],
    ['running', 'neutral'],
    ['failure', 'sad'],
  ])('persiste salud y ánimo para %s', async (status, expectedMood) => {
    const pool = {
      query: jest.fn()
        .mockResolvedValueOnce({ rows: [{ id: 9 }] })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }),
    };
    const { handleProjectWebhook } = loadController(pool);
    const body = { project: 'acme/api', repositoryUrl: 'https://github.com/acme/api', status };
    const rawBody = Buffer.from(JSON.stringify(body));
    const signature = `sha256=${crypto.createHmac('sha256', secret).update(rawBody).digest('hex')}`;
    const req = { body, rawBody, get: () => signature };
    const res = responseMock();

    await handleProjectWebhook(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(pool.query).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('UPDATE projects'),
      expect.arrayContaining([expectedMood, 9]),
    );
    expect(pool.query).toHaveBeenNthCalledWith(3, expect.stringContaining('health_history'), expect.any(Array));
  });
});

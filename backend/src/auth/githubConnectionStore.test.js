const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

describe('almacén cifrado de conexiones GitHub', () => {
  let temporaryDirectory;

  beforeEach(() => {
    jest.resetModules();
    temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'devgotchi-connections-'));
    process.env.GITHUB_CONNECTION_STORE = path.join(temporaryDirectory, 'connections.json');
  });

  afterEach(() => {
    delete process.env.GITHUB_CONNECTION_STORE;
    delete process.env.SESSION_SECRET;
    fs.rmSync(temporaryDirectory, { force: true, recursive: true });
  });

  test('persiste tokens cifrados y nunca devuelve el secreto', () => {
    process.env.SESSION_SECRET = 'test-secret-with-enough-entropy';
    const { saveGitHubConnection } = require('./githubConnectionStore');

    const saved = saveGitHubConnection({
      accessToken: 'github-access-token',
      devgotchiId: 7,
      expiresAt: '2026-10-04T00:00:00.000Z',
      githubUserId: 42,
      ownerKey: 'session-test',
      refreshToken: 'github-refresh-token',
      repository: 'acme/api',
    });
    const rawFile = fs.readFileSync(process.env.GITHUB_CONNECTION_STORE, 'utf8');
    const persisted = JSON.parse(rawFile)['session-test:7'];

    expect(saved.token).toBeUndefined();
    expect(saved.refreshToken).toBeUndefined();
    expect(persisted.token).toMatch(/^[^.]+\.[^.]+\.[^.]+$/);
    expect(persisted.refreshToken).toMatch(/^[^.]+\.[^.]+\.[^.]+$/);
    expect(rawFile).not.toContain('github-access-token');
    expect(rawFile).not.toContain('github-refresh-token');
  });

  test('rechaza persistencia sin SESSION_SECRET', () => {
    process.env.SESSION_SECRET = '';
    const { saveGitHubConnection } = require('./githubConnectionStore');

    expect(() => saveGitHubConnection({
      accessToken: 'token',
      repository: 'acme/api',
    })).toThrow('SESSION_SECRET es obligatorio');
  });
});

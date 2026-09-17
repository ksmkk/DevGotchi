process.env.GITHUB_CLIENT_ID = 'test-client-id';
process.env.GITHUB_CLIENT_SECRET = 'test-client-secret';
process.env.GITHUB_CALLBACK_URL = 'http://localhost:3000/api/auth/github/callback';
process.env.SESSION_SECRET = 'test-session-secret';

const {
  completeGitHubOAuth,
  startGitHubOAuth,
} = require('./githubAuth');

function responseMock() {
  return {
    headers: {},
    statusCode: null,
    body: null,
    redirectUrl: null,
    setHeader(name, value) { this.headers[name] = value; },
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
    redirect(url) { this.statusCode = 302; this.redirectUrl = url; return this; },
  };
}

describe('OAuth de GitHub', () => {
  test('genera redirect con read:user y PKCE S256', () => {
    const response = responseMock();
    startGitHubOAuth({}, response);
    const redirect = new URL(response.redirectUrl);

    expect(redirect.origin).toBe('https://github.com');
    expect(redirect.pathname).toBe('/login/oauth/authorize');
    expect(redirect.searchParams.get('scope')).toBe('read:user');
    expect(redirect.searchParams.get('code_challenge_method')).toBe('S256');
    expect(redirect.searchParams.get('code_challenge')).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(response.headers['Set-Cookie']).toContain('HttpOnly');
  });

  test('rechaza un callback con state inválido sin llamar a GitHub', async () => {
    const fetchMock = jest.fn();
    global.fetch = fetchMock;
    const response = responseMock();

    await completeGitHubOAuth({
      headers: { cookie: '' },
      query: { state: 'state-atacante', code: 'code-atacante' },
    }, response);

    expect(response.statusCode).toBe(401);
    expect(response.body).toEqual({ error: 'Estado OAuth inválido' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test('intercambia el código y devuelve solo identidad pública', async () => {
    const startResponse = responseMock();
    startGitHubOAuth({}, startResponse);
    const cookie = startResponse.headers['Set-Cookie'].split(';')[0];
    const state = new URL(startResponse.redirectUrl).searchParams.get('state');
    const response = responseMock();
    global.fetch = jest.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: 'secret-token', refresh_token: 'secret-refresh', expires_in: 3600 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 7, login: 'devgotchi', name: 'Dev Gotchi' }),
      });

    await completeGitHubOAuth({
      headers: { cookie },
      query: { state, code: 'valid-code' },
    }, response);

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({
      connected: true,
      user: { id: 7, login: 'devgotchi', name: 'Dev Gotchi' },
    });
    expect(JSON.stringify(response.body)).not.toContain('secret-token');
    expect(JSON.stringify(response.body)).not.toContain('secret-refresh');
  });
});
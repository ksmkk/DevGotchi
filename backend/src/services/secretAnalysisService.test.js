const { analyzeSecrets } = require('./secretAnalysisService');

test('detecta .env rastreado sin duplicar la penalización de environment', () => {
  expect(analyzeSecrets([], ['.env'])).toMatchObject({ status: 'warning', impact: 0 });
});

test('detecta una API key, redacta el valor e ignora archivos de ejemplo', () => {
  const secret = ['sk_live', 'SUPER_PRIVATE', '123456789'].join('_');
  const result = analyzeSecrets([
    { path: 'src/config.ts', content: `const API_KEY = "${secret}";` },
    { path: '.env.example', content: 'PASSWORD=example-password' },
  ], []);

  expect(result).toMatchObject({ status: 'critical', impact: -35, source: 'DevGotchi' });
  expect(result.detail).toContain('src/config.ts:1 (API_KEY)');
  expect(result.detail).not.toContain(secret);
  expect(result.detail).not.toContain('.env.example');
});

test('evita falsos positivos obvios', () => {
  const result = analyzeSecrets([
    {
      path: 'src/config.ts',
      content: [
        'const TOKEN = process.env.TOKEN;',
        'const PASSWORD = "changeme";',
        'password: config.POSTGRES_PASSWORD,',
        'accessToken: token.access_token,',
        'client_secret: GITHUB_CLIENT_SECRET,',
        'secret: GITHUB_WEBHOOK_SECRET,',
        "access_token: 'access-token',",
        "refresh_token: 'secret-refresh',",
        "secret: 'webhook-test-secret',",
        "password: 'una-clave-segura',",
      ].join('\n'),
    },
  ], []);
  expect(result.status).toBe('healthy');
});

test('ignora secretos genéricos de fixtures spec pero conserva firmas reales', () => {
  const fixtures = analyzeSecrets([
    {
      path: 'src/config/env.validation.spec.ts',
      content: 'JWT_SECRET="a-long-random-value-used-only-by-unit-tests"',
    },
    {
      path: 'src/modules/auth/application/services/auth.service.spec.ts',
      content: 'const passwordHash = "long-password-hash-for-auth-service-tests";',
    },
  ], []);
  const leakedProviderToken = analyzeSecrets([
    {
      path: 'src/auth/auth.service.spec.ts',
      content: 'const TOKEN = "ghp_1234567890abcdefghijABCD";',
    },
  ], []);

  expect(fixtures.status).toBe('healthy');
  expect(leakedProviderToken).toMatchObject({ status: 'critical', impact: -35 });
});

test('detecta secretos literales en formatos comunes', () => {
  const fixtureOne = 'CorrectHorseBatteryStaple42!';
  const fixtureTwo = 'ghp_1234567890abcdefghij';
  const result = analyzeSecrets([
    {
      path: 'config.yml',
      content: [
        `password: "${fixtureOne}"`,
        `API_TOKEN=${fixtureTwo}`,
      ].join('\n'),
    },
  ], []);

  expect(result).toMatchObject({ status: 'critical', impact: -35 });
  expect(result.detail).toContain('config.yml:1 (PASSWORD)');
  expect(result.detail).toContain('config.yml:2 (API_TOKEN)');
});

test('combina el resultado propio con GitHub Secret Scanning', () => {
  const result = analyzeSecrets([], [], 2);
  expect(result).toMatchObject({ status: 'critical', source: 'DevGotchi + GitHub Secret Scanning' });
});

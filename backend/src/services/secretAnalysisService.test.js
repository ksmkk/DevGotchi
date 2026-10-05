const { analyzeSecrets } = require('./secretAnalysisService');

test('detecta .env rastreado sin duplicar la penalización de environment', () => {
  expect(analyzeSecrets([], ['.env'])).toMatchObject({ status: 'warning', impact: 0 });
});

test('detecta una API key, redacta el valor e ignora archivos de ejemplo', () => {
  const secret = 'sk_live_SUPER_PRIVATE_123456789';
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
    { path: 'src/config.ts', content: 'const TOKEN = process.env.TOKEN;\nconst PASSWORD = "changeme";' },
  ], []);
  expect(result.status).toBe('healthy');
});

test('combina el resultado propio con GitHub Secret Scanning', () => {
  const result = analyzeSecrets([], [], 2);
  expect(result).toMatchObject({ status: 'critical', source: 'DevGotchi + GitHub Secret Scanning' });
});

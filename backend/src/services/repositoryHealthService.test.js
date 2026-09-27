const { analyzeRepository, parseGitHubRepository } = require('./repositoryHealthService');

function response(data, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => data };
}

test('analiza tests, cobertura, CI, entorno y seguridad sin exponer secretos', async () => {
  const fetchImpl = jest.fn(async (url) => {
    if (url.endsWith('/repos/acme/app')) return response({ default_branch: 'main' });
    if (url.includes('/git/trees/')) return response({ tree: [
      { type: 'blob', path: '.gitignore' },
      { type: 'blob', path: 'src/app.test.js' },
      { type: 'blob', path: 'codecov.yml' },
      { type: 'blob', path: '.github/workflows/ci.yml' },
    ] });
    if (url.includes('/actions/workflows')) return response({ workflows: [{ id: 1 }] });
    if (url.includes('/actions/runs')) return response({ workflow_runs: [{ name: 'CI', status: 'completed', conclusion: 'success' }] });
    if (url.includes('/secret-scanning/')) return response([]);
    if (url.includes('/code-scanning/')) return response([]);
    throw new Error(`URL inesperada: ${url}`);
  });

  const result = await analyzeRepository('https://github.com/acme/app', { fetchImpl, token: 'token' });

  expect(result.score).toBe(100);
  expect(result.checks.find((item) => item.key === 'tests').status).toBe('healthy');
  expect(result.checks.find((item) => item.key === 'secrets').detail).not.toContain('token');
});

test('penaliza tests ausentes, CI fallido, .env rastreado y falta de .gitignore', async () => {
  const fetchImpl = jest.fn(async (url) => {
    if (url.endsWith('/repos/acme/app')) return response({ default_branch: 'main' });
    if (url.includes('/git/trees/')) return response({ tree: [{ type: 'blob', path: '.env' }] });
    if (url.includes('/actions/workflows')) return response({ workflows: [{ id: 1 }] });
    if (url.includes('/actions/runs')) return response({ workflow_runs: [{ name: 'CI', status: 'completed', conclusion: 'failure' }] });
    throw new Error(`URL inesperada: ${url}`);
  });

  const result = await analyzeRepository('https://github.com/acme/app', { fetchImpl, token: '' });

  expect(result.score).toBe(5);
  expect(result.recommendations).toEqual(expect.arrayContaining([
    'No se encontraron archivos de pruebas.',
    'Archivos sensibles rastreados: .env.',
  ]));
  expect(result.checks.find((item) => item.key === 'secrets').status).toBe('unknown');
});

test('valida URLs de repositorios GitHub', () => {
  expect(parseGitHubRepository('https://github.com/acme/app.git')).toEqual({ owner: 'acme', repo: 'app' });
  expect(() => parseGitHubRepository('https://example.com/acme/app')).toThrow('GitHub');
});

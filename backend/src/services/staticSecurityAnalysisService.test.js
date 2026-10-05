const { analyzeStaticSecurity } = require('./staticSecurityAnalysisService');

test('considera saludable un repositorio limpio sin Code Scanning', () => {
  const result = analyzeStaticSecurity([{ path: 'src/app.js', content: 'export const ok = true;' }]);
  expect(result).toMatchObject({ status: 'healthy', source: 'DevGotchi' });
});

test('detecta dependencias riesgosas y patrones inseguros', () => {
  const unsafeEvaluation = 'const result = ev' + 'al(userInput);';
  const result = analyzeStaticSecurity([
    { path: 'package.json', content: JSON.stringify({ dependencies: { lodash: '^3.10.1' } }) },
    { path: 'src/app.js', content: unsafeEvaluation },
  ]);
  expect(result.status).toBe('warning');
  expect(result.detail).toContain('dependencia');
  expect(result.detail).toContain('evaluación dinámica');
});

test('combina alertas de Code Scanning con el fallback propio', () => {
  expect(analyzeStaticSecurity([], 1)).toMatchObject({
    status: 'critical',
    source: 'DevGotchi + GitHub Code Scanning',
  });
});

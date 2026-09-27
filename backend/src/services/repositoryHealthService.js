const { GITHUB_TOKEN } = require('../config/env');

const API_VERSION = '2022-11-28';

function parseGitHubRepository(repositoryUrl) {
  const match = String(repositoryUrl || '').match(
    /^https:\/\/github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+?)(?:\.git)?\/?$/i,
  );
  if (!match) throw new Error('URL de repositorio GitHub inválida');
  return { owner: match[1], repo: match[2] };
}

function createGitHubClient(fetchImpl, token) {
  return async (path, { optional = false } = {}) => {
    const response = await fetchImpl(`https://api.github.com${path}`, {
      headers: {
        Accept: 'application/vnd.github+json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        'User-Agent': 'DevGotchi',
        'X-GitHub-Api-Version': API_VERSION,
      },
    });

    if (!response.ok) {
      if (optional) return { available: false, status: response.status };
      throw new Error(`GitHub respondió ${response.status}`);
    }

    return { available: true, data: await response.json() };
  };
}

function check(key, label, status, detail, impact = 0) {
  return { key, label, status, detail, impact };
}

function pathMatches(paths, patterns) {
  return paths.some((path) => patterns.some((pattern) => pattern.test(path)));
}

function securityCheck(result, key, label, unavailableDetail, impact) {
  if (!result?.available) return check(key, label, 'unknown', unavailableDetail);
  const alerts = Array.isArray(result.data) ? result.data.length : 0;
  return alerts > 0
    ? check(key, label, 'critical', `${alerts} alerta(s) abierta(s) en GitHub.`, impact)
    : check(key, label, 'healthy', 'GitHub no informa alertas abiertas.');
}

async function analyzeRepository(repositoryUrl, options = {}) {
  const fetchImpl = options.fetchImpl || fetch;
  const token = options.token === undefined ? GITHUB_TOKEN : options.token;
  const { owner, repo } = parseGitHubRepository(repositoryUrl);
  const github = createGitHubClient(fetchImpl, token);
  const basePath = `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;
  const repository = await github(basePath);
  const branch = repository.data.default_branch;

  const [treeResult, workflowsResult, runsResult, secretResult, codeResult] = await Promise.all([
    github(`${basePath}/git/trees/${encodeURIComponent(branch)}?recursive=1`, { optional: true }),
    github(`${basePath}/actions/workflows?per_page=100`, { optional: true }),
    github(`${basePath}/actions/runs?branch=${encodeURIComponent(branch)}&per_page=10`, { optional: true }),
    token
      ? github(`${basePath}/secret-scanning/alerts?state=open&hide_secret=true&per_page=100`, { optional: true })
      : Promise.resolve({ available: false }),
    token
      ? github(`${basePath}/code-scanning/alerts?state=open&per_page=100`, { optional: true })
      : Promise.resolve({ available: false }),
  ]);

  const paths = treeResult.available
    ? (treeResult.data.tree || []).filter((item) => item.type === 'blob').map((item) => item.path)
    : [];
  const testsPresent = pathMatches(paths, [
    /(^|\/)(__tests__|tests?|spec)\//i,
    /\.(test|spec)\.[cm]?[jt]sx?$/i,
    /(^|\/)pytest\.ini$/i,
  ]);
  const coverageConfigured = pathMatches(paths, [
    /(^|\/)(codecov|coveralls)\.ya?ml$/i,
    /(^|\/)\.coveragerc$/i,
    /(^|\/)coverage\.(json|xml|lcov)$/i,
    /(^|\/)jest\.config\.[cm]?[jt]s$/i,
  ]);
  const gitignorePresent = paths.includes('.gitignore');
  const trackedEnv = paths.filter((path) => /(^|\/)\.env(?:\.[^/]+)?$/i.test(path)
    && !/\.example$|\.sample$|\.template$/i.test(path));
  const infrastructurePresent = pathMatches(paths, [
    /\.tf$/i,
    /(^|\/)(serverless|template)\.ya?ml$/i,
    /(^|\/)cdk\.json$/i,
    /(^|\/)cloudformation\//i,
  ]);
  const workflows = workflowsResult.available ? workflowsResult.data.workflows || [] : [];
  const workflowPaths = paths.filter((path) => /^\.github\/workflows\/.*\.ya?ml$/i.test(path));
  const hasWorkflows = workflows.length > 0 || workflowPaths.length > 0;
  const runs = runsResult.available ? runsResult.data.workflow_runs || [] : [];
  const latestRun = runs[0];

  const checks = [];
  checks.push(testsPresent
    ? check('tests', 'Tests automatizados', 'healthy', 'Se encontraron archivos de pruebas en el repositorio.')
    : check('tests', 'Tests automatizados', 'critical', 'No se encontraron archivos de pruebas.', -20));
  checks.push(coverageConfigured
    ? check('coverage', 'Cobertura', 'healthy', 'Se detectó configuración o reporte de cobertura.')
    : check('coverage', 'Cobertura', 'warning', 'No se encontró cobertura publicada o configurada.', -10));

  if (!hasWorkflows) {
    checks.push(check('ci', 'CI/CD · GitHub Actions', 'critical', 'No hay workflows activos o versionados.', -15));
  } else if (!latestRun) {
    checks.push(check('ci', 'CI/CD · GitHub Actions', 'warning', 'Hay workflows, pero no se encontraron ejecuciones recientes.', -10));
  } else if (latestRun.status !== 'completed') {
    checks.push(check('ci', 'CI/CD · GitHub Actions', 'warning', `${latestRun.name}: ${latestRun.status}.`, -8));
  } else if (latestRun.conclusion === 'success') {
    checks.push(check('ci', 'CI/CD · GitHub Actions', 'healthy', `${latestRun.name}: última ejecución exitosa.`));
  } else {
    checks.push(check('ci', 'CI/CD · GitHub Actions', 'critical', `${latestRun.name}: ${latestRun.conclusion || 'falló'}.`, -25));
  }

  checks.push(gitignorePresent
    ? check('gitignore', '.gitignore', 'healthy', 'El repositorio contiene un .gitignore.')
    : check('gitignore', '.gitignore', 'warning', 'Falta un .gitignore en la raíz.', -10));
  checks.push(trackedEnv.length === 0
    ? check('environment', 'Archivos de entorno', 'healthy', 'No se detectaron archivos .env rastreados.')
    : check('environment', 'Archivos de entorno', 'critical', `Archivos sensibles rastreados: ${trackedEnv.join(', ')}.`, -30));
  checks.push(securityCheck(
    secretResult,
    'secrets',
    'Secretos expuestos',
    'No verificable sin un token con permiso de lectura de alertas de secretos.',
    -35,
  ));
  checks.push(securityCheck(
    codeResult,
    'code-scanning',
    'Análisis de seguridad',
    'No verificable sin Code Scanning y permisos de seguridad.',
    -20,
  ));
  checks.push(check(
    'buckets',
    'Buckets e infraestructura',
    'unknown',
    infrastructurePresent
      ? 'Se detectó infraestructura como código; falta conectar el proveedor cloud para validar permisos del bucket.'
      : 'No se detectó infraestructura como código; los permisos de buckets requieren integrar el proveedor cloud.',
  ));

  const score = Math.max(0, Math.min(100, 100 + checks.reduce((total, item) => total + item.impact, 0)));
  const criticalCount = checks.filter((item) => item.status === 'critical').length;
  const warningCount = checks.filter((item) => item.status === 'warning').length;
  const recommendations = checks
    .filter((item) => item.status === 'critical' || item.status === 'warning')
    .map((item) => item.detail);

  return {
    score,
    analyzedAt: new Date().toISOString(),
    summary: criticalCount > 0
      ? `${criticalCount} problema(s) crítico(s) y ${warningCount} advertencia(s).`
      : warningCount > 0
        ? `${warningCount} mejora(s) recomendada(s).`
        : 'Las señales verificables están saludables.',
    checks,
    recommendations,
  };
}

module.exports = { analyzeRepository, parseGitHubRepository };

const { GITHUB_TOKEN } = require('../config/env');
const { analyzeSecrets } = require('./secretAnalysisService');
const { analyzeStaticSecurity } = require('./staticSecurityAnalysisService');
const { analyzeInfrastructure } = require('./infrastructureAnalysisService');
const { readRepositoryFiles } = require('./repositoryContentService');

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
      const error = new Error(`GitHub respondió ${response.status}`);
      error.githubStatus = response.status;
      const remaining = response.headers?.get?.('x-ratelimit-remaining');
      if (response.status === 403 && remaining === '0') {
        error.code = 'GITHUB_RATE_LIMIT';
        error.message = 'GitHub alcanzó el límite temporal de solicitudes';
      } else if (response.status === 404) {
        error.code = 'GITHUB_NOT_FOUND';
      }
      throw error;
    }

    return { available: true, data: await response.json() };
  };
}

function check(key, label, status, detail, impact = 0, source = 'DevGotchi') {
  return { key, label, status, detail, impact, source };
}

function pathMatches(paths, patterns) {
  return paths.some((path) => patterns.some((pattern) => pattern.test(path)));
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

  const tree = treeResult.available ? treeResult.data.tree || [] : [];
  const paths = treeResult.available
    ? tree.filter((item) => item.type === 'blob').map((item) => item.path)
    : [];
  const files = treeResult.available
    ? await readRepositoryFiles(github, basePath, tree, {
      fetchImpl,
      owner,
      repo,
      branch,
      token,
    })
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
  const workflows = workflowsResult.available ? workflowsResult.data.workflows || [] : [];
  const workflowPaths = paths.filter((path) => /^\.github\/workflows\/.*\.ya?ml$/i.test(path));
  const hasWorkflows = workflowPaths.length > 0;
  const activeWorkflowCount = workflows.filter((workflow) => workflow.state === 'active').length;
  const runs = runsResult.available ? runsResult.data.workflow_runs || [] : [];
  const latestRun = runs[0];
  const inconclusiveConclusions = new Set(['action_required', 'cancelled', 'neutral', 'skipped', 'stale']);
  const latestConclusiveRun = runs.find((run) => run.status === 'completed'
    && run.conclusion
    && !inconclusiveConclusions.has(run.conclusion));
  const evaluatedRun = latestConclusiveRun || latestRun;

  const checks = [];
  checks.push(testsPresent
    ? check('tests', 'Tests automatizados', 'healthy', 'Se encontraron archivos de pruebas en el repositorio.')
    : check('tests', 'Tests automatizados', 'critical', 'No se encontraron archivos de pruebas.', -20));
  checks.push(coverageConfigured
    ? check('coverage', 'Cobertura', 'healthy', 'Se detectó configuración o reporte de cobertura.')
    : check('coverage', 'Cobertura', 'warning', 'No se encontró cobertura publicada o configurada.', -10));

  if (!hasWorkflows) {
    checks.push(check(
      'ci',
      'CI/CD · GitHub Actions',
      'critical',
      activeWorkflowCount > 0
        ? 'GitHub conserva workflows registrados, pero no están versionados en la rama principal.'
        : 'No hay workflows versionados en la rama principal.',
      -15,
    ));
  } else if (!evaluatedRun) {
    checks.push(check('ci', 'CI/CD · GitHub Actions', 'warning', 'Hay workflows, pero no se encontraron ejecuciones recientes.', -10));
  } else if (evaluatedRun.status !== 'completed') {
    checks.push(check('ci', 'CI/CD · GitHub Actions', 'warning', `${evaluatedRun.name}: ${evaluatedRun.status}.`, -8));
  } else if (evaluatedRun.conclusion === 'success') {
    checks.push(check('ci', 'CI/CD · GitHub Actions', 'healthy', `${evaluatedRun.name}: última ejecución concluyente exitosa.`));
  } else if (inconclusiveConclusions.has(evaluatedRun.conclusion)) {
    checks.push(check('ci', 'CI/CD · GitHub Actions', 'warning', `${evaluatedRun.name}: la ejecución fue ${evaluatedRun.conclusion} y no se considera un fallo.`, 0));
  } else {
    checks.push(check('ci', 'CI/CD · GitHub Actions', 'critical', `${evaluatedRun.name}: ${evaluatedRun.conclusion || 'falló'}.`, -25));
  }

  checks.push(gitignorePresent
    ? check('gitignore', '.gitignore', 'healthy', 'El repositorio contiene un .gitignore.')
    : check('gitignore', '.gitignore', 'warning', 'Falta un .gitignore en la raíz.', -10));
  checks.push(trackedEnv.length === 0
    ? check('environment', 'Archivos de entorno', 'healthy', 'No se detectaron archivos .env rastreados.')
    : check('environment', 'Archivos de entorno', 'critical', `Archivos sensibles rastreados: ${trackedEnv.join(', ')}.`, -30));
  const secretAnalysis = analyzeSecrets(
    files,
    trackedEnv,
    secretResult.available && Array.isArray(secretResult.data) ? secretResult.data.length : null,
  );
  checks.push(check('secrets', 'Secretos expuestos', secretAnalysis.status,
    secretAnalysis.detail, secretAnalysis.impact, secretAnalysis.source));

  const securityAnalysis = analyzeStaticSecurity(
    files,
    codeResult.available && Array.isArray(codeResult.data) ? codeResult.data.length : null,
  );
  checks.push(check('code-scanning', 'Análisis de seguridad', securityAnalysis.status,
    securityAnalysis.detail, securityAnalysis.impact, securityAnalysis.source));

  const infrastructureAnalysis = analyzeInfrastructure(files, paths);
  checks.push(check('buckets', 'Buckets e infraestructura', infrastructureAnalysis.status,
    infrastructureAnalysis.detail, infrastructureAnalysis.impact, infrastructureAnalysis.source));

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

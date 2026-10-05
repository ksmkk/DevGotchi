const riskyDependencyRules = {
  axios: (version) => /^0\./.test(version),
  express: (version) => /^[~^]?(?:[0-3]\.|4\.(?:\d|1\d|20)\.)/.test(version),
  lodash: (version) => /^[~^]?([0-3])\./.test(version),
  minimist: (version) => /^[~^]?(?:0\.|1\.[01](?:\.|$)|1\.2\.[0-7](?:\D|$))/.test(version),
};

const dangerousPatterns = [
  { pattern: /\beval\s*\(/, label: 'uso de eval()' },
  { pattern: /new\s+Function\s*\(/, label: 'construcción dinámica de funciones' },
  { pattern: /\bexec(?:Sync)?\s*\([^\n]*(?:req\.|request\.|params|query|body)/, label: 'comando de sistema con entrada de request' },
  { pattern: /rejectUnauthorized\s*:\s*false/, label: 'validación TLS deshabilitada' },
  { pattern: /cors\s*\(\s*\{[^}]*origin\s*:\s*["']\*["']/s, label: 'CORS abierto a cualquier origen' },
];

function parsePackageJson(files) {
  const file = files.find((item) => /(^|\/)package\.json$/i.test(item.path));
  if (!file) return null;
  try {
    return JSON.parse(file.content);
  } catch {
    return null;
  }
}

function analyzeStaticSecurity(files = [], githubAlertCount = null) {
  const dependencyFindings = [];
  const packageJson = parsePackageJson(files);
  const dependencies = {
    ...(packageJson?.dependencies || {}),
    ...(packageJson?.devDependencies || {}),
  };

  for (const [name, version] of Object.entries(dependencies)) {
    const normalized = String(version);
    if (/^(?:latest|\*|https?:|git\+|github:)/i.test(normalized)) {
      dependencyFindings.push(`${name} usa una versión no reproducible`);
    } else if (riskyDependencyRules[name]?.(normalized)) {
      dependencyFindings.push(`${name} ${normalized} requiere revisión`);
    }
  }

  const codeFindings = [];
  for (const file of files.filter((item) => /\.[cm]?[jt]sx?$/i.test(item.path))) {
    for (const rule of dangerousPatterns) {
      if (rule.pattern.test(file.content)) codeFindings.push(`${rule.label} en ${file.path}`);
    }
  }

  const githubCount = Number.isInteger(githubAlertCount) ? githubAlertCount : null;
  const total = dependencyFindings.length + codeFindings.length + (githubCount || 0);
  const source = githubCount === null ? 'DevGotchi' : 'DevGotchi + GitHub Code Scanning';
  if (total === 0) {
    return {
      status: 'healthy',
      detail: githubCount === null
        ? 'El análisis estático de DevGotchi no detectó patrones de riesgo evidentes.'
        : 'DevGotchi y GitHub Code Scanning no detectaron señales de riesgo.',
      impact: 0,
      source,
    };
  }

  const parts = [];
  if (dependencyFindings.length) parts.push(`${dependencyFindings.length} dependencia(s) con señales de riesgo`);
  if (codeFindings.length) parts.push(`${codeFindings.length} patrón(es) potencialmente inseguro(s)`);
  if (githubCount) parts.push(`${githubCount} alerta(s) abierta(s) de GitHub`);
  return {
    status: githubCount > 0 || codeFindings.length > 1 ? 'critical' : 'warning',
    detail: `Se detectaron ${parts.join(' y ')}. ${[...dependencyFindings, ...codeFindings].slice(0, 3).join('; ')}.`,
    impact: -20,
    source,
  };
}

module.exports = { analyzeStaticSecurity };

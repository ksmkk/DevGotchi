const sensitiveName = /(?:api[_-]?key|access[_-]?key|client[_-]?secret|private[_-]?key|password|passwd|secret|token)/i;
const quotedAssignment = /\b([A-Za-z_][A-Za-z0-9_.-]*)\s*[:=]\s*(["'`])([^"'`]+)\2/;
const bareAssignment = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_.-]*)\s*[=:]\s*([^\s,;#}\]]+)\s*;?\s*$/;
const obviousPlaceholder = /^(?:example|sample|dummy|fake|test|changeme|replace[_-]?me|your[_-]|xxx+|<[^>]+>|\$\{|process\.env)/i;
const exampleFile = /(?:^|\/)(?:\.env\.)?(?:example|sample|template)(?:\.|$)|\.(?:example|sample|template)$/i;
const testFile = /(?:^|\/)(?:__tests__|tests?|spec)(?:\/|$)|\.(?:test|spec)\.[^/]+$/i;

function isNamedPlaceholder(value) {
  const words = String(value).toLowerCase().split(/[-_]+/).filter(Boolean);
  const placeholderWords = new Set([
    'access', 'clave', 'client', 'github', 'refresh', 'secret', 'segura', 'test', 'token', 'una', 'webhook',
  ]);
  return words.length >= 2 && words.every((word) => placeholderWords.has(word));
}

function looksLikeCredential(value) {
  if (!value || obviousPlaceholder.test(value) || isNamedPlaceholder(value)) return false;
  if (/\$\{/.test(value)) return false;
  if (/^[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)+$/.test(value)) return false;
  if (/^[A-Z][A-Z0-9_]*$/.test(value)) return false;
  if (/^(?:(?:access|refresh|client|api|private|webhook)[_-]?)?(?:token|secret|key|password)$/i.test(value)) return false;
  if (/^(?:true|false|null|undefined|localhost)$/i.test(value)) return false;
  const variety = [/[a-z]/.test(value), /[A-Z]/.test(value), /\d/.test(value), /[^A-Za-z0-9]/.test(value)]
    .filter(Boolean).length;
  return value.length >= 16 || (value.length >= 10 && variety >= 2);
}

function looksLikeProviderCredential(value) {
  return /^(?:gh[pousr]_[A-Za-z0-9]{20,}|AKIA[A-Z0-9]{16}|xox[baprs]-[A-Za-z0-9-]{10,}|sk_live_[A-Za-z0-9]{12,})$/.test(value);
}

function safeLocation(path, lineNumber, variable) {
  return `${path}:${lineNumber} (${variable.toUpperCase()})`;
}

function analyzeSecrets(files = [], trackedEnv = [], githubAlertCount = null) {
  const findings = [];
  for (const file of files) {
    if (exampleFile.test(file.path)) continue;
    file.content.split(/\r?\n/).forEach((line, index) => {
      if (/^\s*(?:#|\/\/)/.test(line)) return;
      const quotedMatch = line.match(quotedAssignment);
      const bareMatch = quotedMatch ? null : line.match(bareAssignment);
      const variable = quotedMatch?.[1] || bareMatch?.[1];
      const value = quotedMatch?.[3] || bareMatch?.[2];
      const genericTestFixture = testFile.test(file.path) && !looksLikeProviderCredential(value);
      if (variable && sensitiveName.test(variable) && looksLikeCredential(value) && !genericTestFixture) {
        findings.push(safeLocation(file.path, index + 1, variable));
      }
      if (/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(line)) {
        findings.push(`${file.path}:${index + 1} (PRIVATE_KEY)`);
      }
    });
  }

  const uniqueFindings = [...new Set(findings)].slice(0, 8);
  const githubCount = Number.isInteger(githubAlertCount) ? githubAlertCount : null;
  const hasGitHubAlerts = githubCount !== null && githubCount > 0;
  const hasContentSecrets = uniqueFindings.length > 0;
  const hasTrackedEnv = trackedEnv.length > 0;
  const source = githubCount === null ? 'DevGotchi' : 'DevGotchi + GitHub Secret Scanning';

  if (!hasContentSecrets && !hasTrackedEnv && !hasGitHubAlerts) {
    return {
      status: 'healthy',
      detail: githubCount === null
        ? 'El análisis estático de DevGotchi no detectó credenciales expuestas.'
        : 'DevGotchi y GitHub no detectaron credenciales expuestas.',
      impact: 0,
      source,
    };
  }

  const parts = [];
  if (hasTrackedEnv) parts.push(`${trackedEnv.length} archivo(s) .env versionado(s)`);
  if (hasContentSecrets) parts.push(`${uniqueFindings.length} posible(s) credencial(es) en ${uniqueFindings.join(', ')}`);
  if (hasGitHubAlerts) parts.push(`${githubCount} alerta(s) abierta(s) de GitHub`);

  return {
    status: hasContentSecrets || hasGitHubAlerts ? 'critical' : 'warning',
    detail: `DevGotchi detectó ${parts.join(' y ')}. Los valores fueron redactados.`,
    // El check environment ya penaliza el .env; no se cobra dos veces si esa es la única señal.
    impact: hasContentSecrets || hasGitHubAlerts ? -35 : 0,
    source,
  };
}

module.exports = { analyzeSecrets, looksLikeCredential };

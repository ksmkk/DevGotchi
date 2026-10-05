const infrastructurePath = /\.tf$|(^|\/)(serverless|template)\.ya?ml$|(^|\/)cdk\.json$|(^|\/)cloudformation(\/|$)/i;
const bucketSignal = /aws_s3_bucket|AWS::S3::Bucket|google_storage_bucket|azurerm_storage|bucket:/i;
const publicSignals = [
  /acl\s*(?:=|:)\s*["']?(?:public-read|public-read-write)/i,
  /AccessControl\s*:\s*(?:PublicRead|PublicReadWrite|AuthenticatedRead)/i,
  /Principal\s*["']?\s*:\s*["']?\*["']?/i,
  /(?:block_public_acls|block_public_policy|restrict_public_buckets)\s*(?:=|:)\s*false/i,
  /public_access\s*(?:=|:)\s*true/i,
  /allUsers|AllUsers|AuthenticatedUsers/,
];

function analyzeInfrastructure(files = [], allPaths = []) {
  const relevantPaths = allPaths.filter((path) => infrastructurePath.test(path));
  if (relevantPaths.length === 0) {
    return {
      status: 'not_applicable',
      detail: 'No se detectó infraestructura cloud o configuración de buckets en el repositorio.',
      impact: 0,
      source: 'DevGotchi',
    };
  }

  const relevantFiles = files.filter((file) => infrastructurePath.test(file.path));
  const bucketFiles = relevantFiles.filter((file) => bucketSignal.test(file.content));
  const findings = [];
  for (const file of bucketFiles) {
    const matchedSignals = publicSignals.filter((pattern) => pattern.test(file.content)).length;
    if (matchedSignals) findings.push(`${file.path} (${matchedSignals} señal(es) de acceso público)`);
  }

  if (findings.length > 0) {
    return {
      status: 'critical',
      detail: `Se detectó configuración de almacenamiento potencialmente pública en ${findings.slice(0, 4).join(', ')}. Análisis basado en IaC; el estado desplegado no fue consultado.`,
      // El modelo histórico no asigna descuento independiente a infraestructura.
      impact: 0,
      source: 'DevGotchi',
    };
  }

  return {
    status: 'healthy',
    detail: bucketFiles.length > 0
      ? 'Se detectó IaC para almacenamiento sin señales públicas evidentes. El estado desplegado no fue consultado.'
      : 'Se detectó infraestructura como código, pero no configuraciones de buckets. El estado desplegado no fue consultado.',
    impact: 0,
    source: 'DevGotchi',
  };
}

module.exports = { analyzeInfrastructure };

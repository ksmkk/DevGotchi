const { analyzeInfrastructure } = require('./infrastructureAnalysisService');

test('marca Terraform seguro sin afirmar el estado desplegado', () => {
  const file = { path: 'infra/main.tf', content: 'resource "aws_s3_bucket" "private" { bucket = "demo" }' };
  expect(analyzeInfrastructure([file], [file.path])).toMatchObject({ status: 'healthy' });
});

test('detecta un bucket público en Terraform', () => {
  const file = { path: 'infra/main.tf', content: 'resource "aws_s3_bucket" "demo" { acl = "public-read" }' };
  const result = analyzeInfrastructure([file], [file.path]);
  expect(result.status).toBe('critical');
  expect(result.detail).toContain('estado desplegado no fue consultado');
});

test('detecta CloudFormation potencialmente público', () => {
  const file = { path: 'template.yaml', content: 'Type: AWS::S3::Bucket\nAccessControl: PublicRead\nPrincipal: "*"' };
  expect(analyzeInfrastructure([file], [file.path]).status).toBe('critical');
});

test('sin infraestructura devuelve no aplica', () => {
  expect(analyzeInfrastructure([], ['src/app.js'])).toMatchObject({ status: 'not_applicable' });
});

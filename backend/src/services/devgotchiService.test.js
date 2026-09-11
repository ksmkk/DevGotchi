const { evaluateProjectHealth } = require('./devgotchiService');

describe('evaluateProjectHealth', () => {
  test('debe marcar como healthy cuando el pipeline pasa correctamente', () => {
    const result = evaluateProjectHealth({
      project: 'api-gateway',
      status: 'success',
      branch: 'main',
      workflow: 'deploy',
    });

    expect(result.health).toBe('healthy');
    expect(result.vida).toBe(100);
    expect(result.status).toBe('success');
  });

  test('debe marcar como critical cuando el pipeline falla', () => {
    const result = evaluateProjectHealth({
      project: 'api-gateway',
      status: 'failure',
      branch: 'main',
      workflow: 'deploy',
    });

    expect(result.health).toBe('critical');
    expect(result.vida).toBe(25);
  });

  test('debe marcar como warning cuando el pipeline está en progreso', () => {
    const result = evaluateProjectHealth({
      project: 'api-gateway',
      status: 'running',
      branch: 'main',
      workflow: 'deploy',
    });

    expect(result.health).toBe('warning');
    expect(result.vida).toBe(60);
  });

  test('debe devolver unknown cuando llega un estado no soportado', () => {
    const result = evaluateProjectHealth({
      project: 'api-gateway',
      status: 'random-state',
      branch: 'main',
      workflow: 'deploy',
    });

    expect(result.health).toBe('unknown');
    expect(result.vida).toBe(50);
  });

  test('debe interpretar un workflow_run de GitHub Actions', () => {
    const result = evaluateProjectHealth({
      repository: {
        full_name: 'acme/api',
        html_url: 'https://github.com/acme/api',
      },
      workflow_run: {
        conclusion: 'failure',
        head_branch: 'develop',
        name: 'CI',
      },
    });

    expect(result.project).toBe('acme/api');
    expect(result.repositoryUrl).toBe('https://github.com/acme/api');
    expect(result.branch).toBe('develop');
    expect(result.workflow).toBe('CI');
    expect(result.vida).toBe(25);
  });
});

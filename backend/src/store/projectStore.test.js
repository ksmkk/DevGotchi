const { getAllProjects, getProjectStatus, setProjectStatus } = require('./projectStore');

describe('almacén de estados REST', () => {
  test('normaliza claves y completa valores ausentes', () => {
    const saved = setProjectStatus('  ACME/API  ', { status: 'success' });

    expect(saved.project).toBe('unknown-project');
    expect(saved.updatedAt).toEqual(expect.any(String));
    expect(getProjectStatus('acme/api')).toEqual(saved);
    expect(getProjectStatus('missing')).toBeNull();
    expect(getAllProjects()).toContainEqual(saved);
  });
});

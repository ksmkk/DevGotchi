const { resolvers } = require('./resolvers');

const now = '2026-10-03T12:00:00.000Z';
const user = {
  id: 1,
  uuid: 'user-uuid',
  email: 'dev@example.com',
  username: 'dev',
  full_name: 'Dev User',
  avatar_url: null,
  status: 'active',
  created_at: now,
  updated_at: now,
};
const project = {
  id: 2,
  uuid: 'project-uuid',
  user_id: 1,
  name: 'api',
  description: null,
  repository_url: 'https://github.com/acme/api',
  repository_analysis: JSON.stringify({ score: 80, checks: [], recommendations: [] }),
  last_analysis_at: now,
  status: 'active',
  devgotchi_health: 80,
  devgotchi_mood: 'happy',
  last_commit_date: now,
  created_at: now,
  updated_at: now,
};

describe('queries y campos GraphQL', () => {
  test('deriva los tres estados visuales de salud', () => {
    expect(resolvers.Devgotchi.salud({ vida_actual: 0, devgotchiMood: 'sad' }).estado).toBe('Muerto');
    expect(resolvers.Devgotchi.salud({ vida_actual: 30, devgotchiMood: 'sad' }).estado).toBe('Triste');
    expect(resolvers.Devgotchi.salud({ devgotchiHealth: 90, devgotchiMood: 'happy' })).toMatchObject({
      estado: 'Feliz',
      puntosVida: 90,
      ultimoCommit: null,
    });
  });

  test('devuelve usuarios y proyectos en sus formatos públicos', async () => {
    const db = {
      query: jest.fn(async (sql) => {
        if (/FROM users/i.test(sql)) return { rows: [user] };
        if (/FROM projects/i.test(sql)) return { rows: [project] };
        return { rows: [] };
      }),
    };

    await expect(resolvers.Query.users(null, null, { db })).resolves.toEqual([
      expect.objectContaining({ id: '1', fullName: 'Dev User' }),
    ]);
    await expect(resolvers.Query.user(null, { id: 1 }, { db })).resolves.toMatchObject({ username: 'dev' });
    await expect(resolvers.Query.projects(null, null, { db })).resolves.toEqual([
      expect.objectContaining({ id: '2', nombre: 'Pixel', name: 'api', vida_actual: 80 }),
    ]);
    await expect(resolvers.Query.project(null, { id: 2 }, { db })).resolves.toMatchObject({ name: 'api' });
    await expect(resolvers.Query.userProjects(null, { userId: 1 }, { db })).resolves.toHaveLength(1);
    await expect(resolvers.Query.devgotchi(null, null, { db })).resolves.toMatchObject({ id: '2' });
  });

  test('formatea actividad, historial y webhooks', async () => {
    const db = {
      query: jest.fn(async (sql) => {
        if (/FROM activities/i.test(sql)) return { rows: [{
          id: 3,
          uuid: 'activity-uuid',
          project_id: 2,
          activity_type: 'commit',
          description: 'push',
          metadata: { sha: 'abc' },
          health_impact: 5,
          mood_impact: 'happy',
          created_at: now,
        }] };
        if (/FROM health_history/i.test(sql)) return { rows: [{
          id: 4,
          uuid: 'health-uuid',
          project_id: 2,
          health_value: 80,
          mood: 'happy',
          created_at: now,
        }] };
        return { rows: [{
          id: 5,
          uuid: 'webhook-uuid',
          project_id: 2,
          webhook_url: 'https://example.test/hook',
          event_type: 'workflow_run',
          is_active: true,
          created_at: now,
          updated_at: now,
        }] };
      }),
    };

    await expect(resolvers.Query.projectActivities(null, { projectId: 2 }, { db }))
      .resolves.toEqual([expect.objectContaining({ metadata: '{"sha":"abc"}' })]);
    await expect(resolvers.Query.projectHealthHistory(null, { projectId: 2 }, { db }))
      .resolves.toEqual([expect.objectContaining({ healthValue: 80 })]);
    await expect(resolvers.Query.projectWebhooks(null, { projectId: 2 }, { db }))
      .resolves.toEqual([expect.objectContaining({ eventType: 'workflow_run' })]);
  });

  test('devuelve null para entidades ausentes y traduce errores de base de datos', async () => {
    const emptyDb = { query: jest.fn().mockResolvedValue({ rows: [] }) };
    await expect(resolvers.Query.devgotchi(null, null, { db: emptyDb })).resolves.toBeNull();
    await expect(resolvers.Query.user(null, { id: 99 }, { db: emptyDb })).resolves.toBeNull();
    await expect(resolvers.Query.project(null, { id: 99 }, { db: emptyDb })).resolves.toBeNull();

    const failingDb = { query: jest.fn().mockRejectedValue(new Error('offline')) };
    jest.spyOn(console, 'error').mockImplementation(() => {});
    await expect(resolvers.Query.users(null, null, { db: failingDb }))
      .rejects.toThrow('No se pudieron obtener los usuarios');
    await expect(resolvers.Query.projectActivities(null, { projectId: 2 }, { db: failingDb }))
      .rejects.toThrow('No se pudieron obtener las actividades');
    jest.restoreAllMocks();
  });

  test('sincroniza la vida desde un diagnóstico reciente sin consultar GitHub', async () => {
    const recentAnalysis = {
      score: 72,
      analyzedAt: new Date().toISOString(),
      summary: 'Diagnóstico en caché',
      checks: [],
      recommendations: [],
    };
    const staleLifeProject = {
      ...project,
      devgotchi_health: 20,
      last_analysis_at: new Date().toISOString(),
      repository_analysis: JSON.stringify(recentAnalysis),
    };
    const db = {
      query: jest.fn()
        .mockResolvedValueOnce({ rows: [staleLifeProject] })
        .mockResolvedValueOnce({ rows: [{ ...staleLifeProject, devgotchi_health: 72 }] }),
    };
    const repositoryAnalyzer = jest.fn();

    const result = await resolvers.Query.devgotchi(null, null, { db, repositoryAnalyzer });

    expect(result.vida_actual).toBe(72);
    expect(result.diagnostico).toEqual(recentAnalysis);
    expect(repositoryAnalyzer).not.toHaveBeenCalled();
    expect(db.query).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('SET devgotchi_health = $1'),
      [72, 2],
    );
  });

  test('recupera el usuario local si otra petición lo creó concurrentemente', async () => {
    const insertedProject = {
      ...project,
      id: 8,
      user_id: 3,
      repository_analysis: null,
      last_analysis_at: null,
    };
    const db = {
      query: jest.fn()
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ id: 3 }] })
        .mockResolvedValueOnce({ rows: [insertedProject] })
        .mockResolvedValueOnce({ rows: [insertedProject] }),
    };

    const result = await resolvers.Mutation.conectarRepositorio(
      null,
      { repositoryUrl: 'https://github.com/acme/api' },
      { db },
    );

    expect(result.userId).toBe('3');
    expect(db.query).toHaveBeenNthCalledWith(4, 'SELECT id FROM users ORDER BY id ASC LIMIT 1');
  });
});

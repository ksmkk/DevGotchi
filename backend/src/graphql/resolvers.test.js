const { resolvers } = require('./resolvers');

describe('Mutation.cuidarDevgotchi', () => {
  test('suma 10 puntos, activa el mood happy y registra el historial', async () => {
    const db = {
      query: jest.fn()
        .mockResolvedValueOnce({ rows: [{ devgotchi_health: 40 }] })
        .mockResolvedValueOnce({
          rows: [{
            id: 7,
            user_id: 2,
            name: 'api-gateway',
            devgotchi_health: 50,
            devgotchi_mood: 'happy',
          }],
        })
        .mockResolvedValueOnce({ rows: [] }),
    };

    const result = await resolvers.Mutation.cuidarDevgotchi(
      null,
      { projectId: 7 },
      { db },
    );

    expect(result.devgotchiHealth).toBe(50);
    expect(result.devgotchiMood).toBe('happy');
    expect(db.query).toHaveBeenNthCalledWith(2, expect.stringContaining('SET devgotchi_health = $1'), [50, 7]);
    expect(db.query).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining('INSERT INTO health_history'),
      [expect.any(String), 7, 50],
    );
  });

  test('no supera 100 puntos de salud', async () => {
    const db = {
      query: jest.fn()
        .mockResolvedValueOnce({ rows: [{ devgotchi_health: 95 }] })
        .mockResolvedValueOnce({
          rows: [{
            id: 7,
            user_id: 2,
            name: 'api-gateway',
            devgotchi_health: 100,
            devgotchi_mood: 'happy',
          }],
        })
        .mockResolvedValueOnce({ rows: [] }),
    };

    const result = await resolvers.Mutation.cuidarDevgotchi(
      null,
      { projectId: 7 },
      { db },
    );

    expect(result.devgotchiHealth).toBe(100);
    expect(db.query).toHaveBeenNthCalledWith(2, expect.any(String), [100, 7]);
  });
});

describe('Mutation.disminuirVida', () => {
  test('resta 10 puntos, activa el mood sad y registra el historial', async () => {
    const db = {
      query: jest.fn()
        .mockResolvedValueOnce({ rows: [{ devgotchi_health: 40 }] })
        .mockResolvedValueOnce({
          rows: [{
            id: 7,
            user_id: 2,
            name: 'api-gateway',
            devgotchi_health: 30,
            devgotchi_mood: 'sad',
          }],
        })
        .mockResolvedValueOnce({ rows: [] }),
    };

    const result = await resolvers.Mutation.disminuirVida(
      null,
      { projectId: 7 },
      { db },
    );

    expect(result.devgotchiHealth).toBe(30);
    expect(result.devgotchiMood).toBe('sad');
    expect(db.query).toHaveBeenNthCalledWith(2, expect.stringContaining('SET devgotchi_health = $1'), [30, 7]);
    expect(db.query).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining('INSERT INTO health_history'),
      [expect.any(String), 7, 30],
    );
  });

  test('no baja de 0 puntos de salud', async () => {
    const db = {
      query: jest.fn()
        .mockResolvedValueOnce({ rows: [{ devgotchi_health: 5 }] })
        .mockResolvedValueOnce({
          rows: [{
            id: 7,
            user_id: 2,
            name: 'api-gateway',
            devgotchi_health: 0,
            devgotchi_mood: 'sad',
          }],
        })
        .mockResolvedValueOnce({ rows: [] }),
    };

    const result = await resolvers.Mutation.disminuirVida(
      null,
      { projectId: 7 },
      { db },
    );

    expect(result.devgotchiHealth).toBe(0);
    expect(db.query).toHaveBeenNthCalledWith(2, expect.any(String), [0, 7]);
  });
});

describe('Mutation.conectarRepositorio', () => {
  test('rechaza URLs que no correspondan a repositorios de GitHub', async () => {
    const db = { query: jest.fn() };

    await expect(resolvers.Mutation.conectarRepositorio(
      null,
      { repositoryUrl: 'https://example.com/acme/api-gateway' },
      { db },
    )).rejects.toThrow('repositorio de GitHub');

    expect(db.query).not.toHaveBeenCalled();
  });

  test('crea un proyecto conectado para el primer usuario disponible', async () => {
    const db = {
      query: jest.fn()
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ id: 2 }] })
        .mockResolvedValueOnce({
          rows: [{
            id: 8,
            uuid: 'project-uuid',
            user_id: 2,
            name: 'api-gateway',
            repository_url: 'https://github.com/acme/api-gateway',
            devgotchi_health: 100,
            devgotchi_mood: 'neutral',
          }],
        }),
    };

    const result = await resolvers.Mutation.conectarRepositorio(
      null,
      { repositoryUrl: 'https://github.com/acme/api-gateway' },
      { db },
    );

    expect(result.nombre).toBe('api-gateway');
    expect(result.repositoryUrl).toBe('https://github.com/acme/api-gateway');
    expect(db.query).toHaveBeenNthCalledWith(2, expect.stringContaining('SELECT id FROM users'));
    expect(db.query).toHaveBeenNthCalledWith(3, expect.stringContaining('INSERT INTO projects'), expect.any(Array));
  });

  test('normaliza la URL antes de consultar y guardar el repositorio', async () => {
    const db = {
      query: jest.fn()
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ id: 2 }] })
        .mockResolvedValueOnce({
          rows: [{
            id: 8,
            uuid: 'project-uuid',
            user_id: 2,
            name: 'api-gateway',
            repository_url: 'https://github.com/acme/api-gateway',
            devgotchi_health: 100,
            devgotchi_mood: 'neutral',
          }],
        }),
    };

    await resolvers.Mutation.conectarRepositorio(
      null,
      { repositoryUrl: ' https://github.com/acme/api-gateway.git/ ' },
      { db },
    );

    expect(db.query).toHaveBeenNthCalledWith(1, expect.any(String), ['https://github.com/acme/api-gateway']);
    expect(db.query).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining('INSERT INTO projects'),
      expect.arrayContaining(['https://github.com/acme/api-gateway']),
    );
  });

  test('crea un usuario local al conectar el primer repositorio en una base vacía', async () => {
    const db = {
      query: jest.fn()
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ id: 1 }] })
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            uuid: 'project-uuid',
            user_id: 1,
            name: 'nuevo-proyecto',
            repository_url: 'https://github.com/acme/nuevo-proyecto',
            devgotchi_health: 100,
            devgotchi_mood: 'neutral',
          }],
        }),
    };

    const result = await resolvers.Mutation.conectarRepositorio(
      null,
      { repositoryUrl: 'https://github.com/acme/nuevo-proyecto' },
      { db },
    );

    expect(result.repositoryUrl).toBe('https://github.com/acme/nuevo-proyecto');
    expect(db.query).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining('INSERT INTO users'),
      expect.arrayContaining(['local@devgotchi.invalid', 'devgotchi-local']),
    );
    expect(db.query).toHaveBeenNthCalledWith(
      4,
      expect.stringContaining('INSERT INTO projects'),
      expect.arrayContaining([1, 'nuevo-proyecto']),
    );
  });

  test('devuelve el proyecto existente y no crea otro para la misma URL normalizada', async () => {
    const existingProject = {
      id: 8,
      uuid: 'project-uuid',
      user_id: 2,
      name: 'api-gateway',
      repository_url: 'https://github.com/acme/api-gateway',
      devgotchi_health: 100,
      devgotchi_mood: 'neutral',
    };
    const db = {
      query: jest.fn()
        .mockResolvedValueOnce({ rows: [existingProject] })
        .mockResolvedValueOnce({ rows: [{ ...existingProject, is_current: true }] }),
    };

    const result = await resolvers.Mutation.conectarRepositorio(
      null,
      { repositoryUrl: 'https://github.com/acme/api-gateway.git/' },
      { db },
    );

    expect(result.repositoryUrl).toBe('https://github.com/acme/api-gateway');
    expect(db.query).toHaveBeenCalledTimes(2);
    expect(db.query).toHaveBeenNthCalledWith(2, expect.stringContaining('is_current'), [8]);
  });
});

describe('Mutation.createUser', () => {
  test('guarda un hash scrypt con salt en lugar de la contraseña', async () => {
    const db = {
      query: jest.fn().mockResolvedValue({
        rows: [{
          id: 1,
          uuid: 'user-uuid',
          email: 'dev@example.com',
          username: 'dev',
          full_name: 'Dev User',
        }],
      }),
    };

    await resolvers.Mutation.createUser(
      null,
      {
        email: 'dev@example.com',
        username: 'dev',
        password: 'una-clave-segura',
        fullName: 'Dev User',
      },
      { db },
    );

    const values = db.query.mock.calls[0][1];
    expect(values[3]).toMatch(/^scrypt\$[^$]+\$[^$]+$/);
    expect(values[3]).not.toContain('una-clave-segura');
  });
});

describe('nombre y diagnóstico del DevGotchi', () => {
  test('renombra la mascota sin cambiar el nombre del proyecto', async () => {
    const db = {
      query: jest.fn().mockResolvedValueOnce({
        rows: [{
          id: 7,
          uuid: 'project-uuid',
          user_id: 2,
          name: 'api-gateway',
          pet_name: 'Byte',
          devgotchi_health: 70,
          devgotchi_mood: 'happy',
        }],
      }),
    };

    const result = await resolvers.Mutation.renombrarDevgotchi(
      null,
      { projectId: 7, nombre: ' Byte ' },
      { db },
    );

    expect(result.nombre).toBe('Byte');
    expect(result.name).toBe('api-gateway');
    expect(db.query).toHaveBeenCalledWith(expect.stringContaining('pet_name = $1'), ['Byte', 7]);
  });

  test('sincroniza la vida con el puntaje técnico del repositorio', async () => {
    const diagnosis = {
      score: 45,
      analyzedAt: '2026-09-27T01:00:00.000Z',
      summary: 'Hay problemas críticos.',
      checks: [],
      recommendations: ['Agregar tests.'],
    };
    const project = {
      id: 7,
      uuid: 'project-uuid',
      user_id: 2,
      name: 'api-gateway',
      repository_url: 'https://github.com/acme/api-gateway',
      devgotchi_health: 100,
      devgotchi_mood: 'neutral',
    };
    const db = {
      query: jest.fn()
        .mockResolvedValueOnce({ rows: [project] })
        .mockResolvedValueOnce({ rows: [{ ...project, devgotchi_health: 45, devgotchi_mood: 'sad' }] }),
    };
    const repositoryAnalyzer = jest.fn().mockResolvedValue(diagnosis);

    const result = await resolvers.Mutation.analizarRepositorio(
      null,
      { projectId: 7 },
      { db, repositoryAnalyzer },
    );

    expect(result.vida_actual).toBe(45);
    expect(result.diagnostico).toEqual(diagnosis);
    expect(repositoryAnalyzer).toHaveBeenCalledWith(project.repository_url);
  });

  test('explica cuando un repositorio privado necesita acceso de GitHub', async () => {
    const project = {
      id: 9,
      uuid: 'private-project',
      user_id: 2,
      name: 'private-app',
      repository_url: 'https://github.com/acme/private-app',
      devgotchi_health: 100,
      devgotchi_mood: 'neutral',
    };
    const db = {
      query: jest.fn()
        .mockResolvedValueOnce({ rows: [project] })
        .mockResolvedValueOnce({ rows: [project] }),
    };
    const repositoryAnalyzer = jest.fn().mockRejectedValue(new Error('GitHub respondió 404'));

    const result = await resolvers.Mutation.analizarRepositorio(
      null,
      { projectId: 9 },
      { db, repositoryAnalyzer },
    );

    expect(result.diagnostico.summary).toContain('requiere acceso');
    expect(result.diagnostico.score).toBe(50);
    expect(result.diagnostico.checks[0]).toMatchObject({
      key: 'github-access',
      status: 'unknown',
    });
    expect(db.query).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('repository_analysis'),
      expect.arrayContaining([50, expect.stringContaining('GITHUB_TOKEN'), 9]),
    );
  });

  test('no confunde el límite temporal de GitHub con un repositorio privado', async () => {
    const project = {
      id: 10,
      uuid: 'public-project',
      user_id: 2,
      name: 'public-app',
      repository_url: 'https://github.com/acme/public-app',
      devgotchi_health: 100,
      devgotchi_mood: 'neutral',
    };
    const db = {
      query: jest.fn()
        .mockResolvedValueOnce({ rows: [project] })
        .mockResolvedValueOnce({ rows: [project] }),
    };
    const rateLimitError = new Error('GitHub alcanzó el límite temporal de solicitudes');
    rateLimitError.code = 'GITHUB_RATE_LIMIT';
    const repositoryAnalyzer = jest.fn().mockRejectedValue(rateLimitError);

    const result = await resolvers.Mutation.analizarRepositorio(
      null,
      { projectId: 10 },
      { db, repositoryAnalyzer },
    );

    expect(result.diagnostico.summary).toContain('límite de solicitudes');
    expect(result.diagnostico.checks[0].detail).toContain('puede ser público');
    expect(result.diagnostico.checks[0].detail).not.toContain('es privado');
  });
});

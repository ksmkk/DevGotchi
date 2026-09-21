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
    const db = { query: jest.fn().mockResolvedValueOnce({ rows: [existingProject] }) };

    const result = await resolvers.Mutation.conectarRepositorio(
      null,
      { repositoryUrl: 'https://github.com/acme/api-gateway.git/' },
      { db },
    );

    expect(result.repositoryUrl).toBe('https://github.com/acme/api-gateway');
    expect(db.query).toHaveBeenCalledTimes(1);
  });
});

describe('adaptador de base de datos', () => {
  afterEach(() => {
    jest.resetModules();
    jest.restoreAllMocks();
  });

  test('ofrece una interfaz tipo pg sobre SQLite', async () => {
    const statement = {
      all: jest.fn(() => [{ id: 1 }]),
      run: jest.fn(() => ({ changes: 1, lastInsertRowid: 3 })),
    };
    const database = {
      close: jest.fn(),
      exec: jest.fn(),
      prepare: jest.fn(() => statement),
    };
    const DatabaseSync = jest.fn(() => database);
    jest.doMock('node:sqlite', () => ({ DatabaseSync }));
    jest.doMock('../src/config/env', () => ({ DB_HOST: 'localhost' }));
    jest.spyOn(console, 'log').mockImplementation(() => {});
    const { dbType, pool } = require('./database');

    expect(dbType).toBe('sqlite');
    await expect(pool.query('SELECT * FROM projects WHERE id = $1', [1]))
      .resolves.toEqual({ rows: [{ id: 1 }], rowCount: 1 });
    expect(database.prepare).toHaveBeenCalledWith('SELECT * FROM projects WHERE id = ?');

    await expect(pool.query('UPDATE projects SET name = $1', ['api']))
      .resolves.toEqual({ rows: [{ id: 3 }], rowCount: 1 });
    await expect(pool.query('UPDATE projects SET name = $1 RETURNING *', ['api']))
      .resolves.toEqual({ rows: [{ id: 1 }], rowCount: 1 });

    const client = await pool.connect();
    await expect(client.query('PRAGMA table_info(projects)')).resolves.toEqual({ rows: [{ id: 1 }], rowCount: 1 });
    expect(client.release()).toBeUndefined();
    pool.end();
    expect(database.close).toHaveBeenCalled();
  });

  test('propaga errores de SQLite como promesas rechazadas', async () => {
    const database = {
      close: jest.fn(),
      exec: jest.fn(),
      prepare: jest.fn(() => { throw new Error('invalid SQL'); }),
    };
    jest.doMock('node:sqlite', () => ({ DatabaseSync: jest.fn(() => database) }));
    jest.doMock('../src/config/env', () => ({ DB_HOST: '' }));
    jest.spyOn(console, 'log').mockImplementation(() => {});
    const { pool } = require('./database');

    await expect(pool.query('BROKEN')).rejects.toThrow('invalid SQL');
  });

  test('configura PostgreSQL y registra eventos del pool', () => {
    const mockPgPool = { on: jest.fn() };
    const Pool = jest.fn(() => mockPgPool);
    jest.doMock('pg', () => ({ Pool }));
    jest.doMock('../src/config/env', () => ({
      DB_HOST: 'postgres',
      DB_PORT: 5432,
      POSTGRES_DB: 'devgotchi',
      POSTGRES_PASSWORD: 'password',
      POSTGRES_USER: 'devgotchi',
    }));
    jest.spyOn(console, 'log').mockImplementation(() => {});
    const { dbType, pool } = require('./database');

    expect(dbType).toBe('postgres');
    expect(pool).toBe(mockPgPool);
    expect(Pool).toHaveBeenCalledWith(expect.objectContaining({ host: 'postgres', port: 5432 }));
    expect(mockPgPool.on).toHaveBeenCalledWith('error', expect.any(Function));
    expect(mockPgPool.on).toHaveBeenCalledWith('connect', expect.any(Function));

    jest.spyOn(console, 'error').mockImplementation(() => {});
    const errorHandler = mockPgPool.on.mock.calls.find(([event]) => event === 'error')[1];
    const connectHandler = mockPgPool.on.mock.calls.find(([event]) => event === 'connect')[1];
    errorHandler(new Error('connection lost'));
    connectHandler();
    expect(console.error).toHaveBeenCalledWith('❌ Error en el pool PostgreSQL:', 'connection lost');
  });
});

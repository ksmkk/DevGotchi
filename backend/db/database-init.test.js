describe('inicialización de base de datos', () => {
  afterEach(() => {
    jest.resetModules();
    jest.restoreAllMocks();
  });

  test('crea el esquema SQLite y verifica columnas migradas', async () => {
    const pool = {
      query: jest.fn(async (sql) => {
        if (/PRAGMA table_info/i.test(sql)) {
          return { rows: [
            { name: 'pet_name' },
            { name: 'repository_analysis' },
            { name: 'last_analysis_at' },
            { name: 'is_current' },
          ] };
        }
        return { rows: [], rowCount: 0 };
      }),
    };
    jest.doMock('./database', () => ({ dbType: 'sqlite', pool }));
    jest.spyOn(console, 'log').mockImplementation(() => {});
    const { initializeDatabase } = require('./database-init');

    await expect(initializeDatabase()).resolves.toBe(true);
    expect(pool.query).toHaveBeenCalledWith(expect.stringContaining('CREATE TABLE'));
    expect(pool.query).toHaveBeenCalledWith('PRAGMA table_info(projects)');
  });

  test('inicializa PostgreSQL y aplica migraciones idempotentes', async () => {
    const pool = { query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }) };
    jest.doMock('./database', () => ({ dbType: 'postgres', pool }));
    jest.spyOn(console, 'log').mockImplementation(() => {});
    const { initializeDatabase } = require('./database-init');

    await expect(initializeDatabase()).resolves.toBe(true);
    expect(pool.query).toHaveBeenCalledWith(expect.stringContaining('CREATE TABLE'));
    expect(pool.query).toHaveBeenCalledWith(expect.stringContaining('ADD COLUMN IF NOT EXISTS'));
  });

  test('informa un fallo de inicialización sin ocultarlo al llamador', async () => {
    const pool = { query: jest.fn().mockRejectedValue(new Error('database unavailable')) };
    jest.doMock('./database', () => ({ dbType: 'postgres', pool }));
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    const { initializeDatabase } = require('./database-init');

    await expect(initializeDatabase()).resolves.toBe(false);
    expect(console.error).toHaveBeenCalledWith(
      '❌ Error al inicializar la base de datos:',
      'database unavailable',
    );
  });
});

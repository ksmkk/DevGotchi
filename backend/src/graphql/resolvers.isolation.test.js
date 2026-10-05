const { DatabaseSync } = require('node:sqlite');
const { resolvers } = require('./resolvers');

function createDb() {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec(`
    CREATE TABLE users (
      id INTEGER PRIMARY KEY AUTOINCREMENT, uuid TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL, username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL, full_name TEXT, avatar_url TEXT,
      status TEXT DEFAULT 'active', created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT, uuid TEXT UNIQUE NOT NULL,
      user_id INTEGER NOT NULL, name TEXT NOT NULL, description TEXT,
      repository_url TEXT, pet_name TEXT, repository_analysis TEXT,
      last_analysis_at TEXT, is_current INTEGER DEFAULT 0,
      status TEXT DEFAULT 'active', devgotchi_health INTEGER DEFAULT 100,
      devgotchi_mood TEXT DEFAULT 'neutral', last_commit_date TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE health_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT, uuid TEXT, project_id INTEGER,
      health_value INTEGER, mood TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE UNIQUE INDEX one_current ON projects(user_id) WHERE is_current = 1;
    CREATE UNIQUE INDEX one_repo_per_user ON projects(user_id, repository_url);
  `);
  return {
    query: async (sql, params = []) => {
      const statement = sqlite.prepare(sql.replace(/\$(\d+)/g, '?'));
      if (/^\s*SELECT|\bRETURNING\b/i.test(sql)) {
        const rows = statement.all(...params);
        return { rows, rowCount: rows.length };
      }
      const result = statement.run(...params);
      return { rows: [], rowCount: result.changes };
    },
  };
}

test('dos sesiones mantienen repositorios, nombres y proyecto actual independientes', async () => {
  const db = createDb();
  const contextA = { db, sessionId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' };
  const contextB = { db, sessionId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' };

  const projectA = await resolvers.Mutation.conectarRepositorio(null, {
    repositoryUrl: 'https://github.com/acme/shared',
  }, contextA);
  const projectB = await resolvers.Mutation.conectarRepositorio(null, {
    repositoryUrl: 'https://github.com/acme/shared',
  }, contextB);

  expect(projectA.id).not.toBe(projectB.id);
  await resolvers.Mutation.renombrarDevgotchi(null, {
    projectId: projectA.id,
    nombre: 'BastiGotchi',
  }, contextA);

  const diagnosis = {
    score: 84,
    analyzedAt: new Date().toISOString(),
    summary: 'Saludable',
    checks: [],
    recommendations: [],
  };
  await resolvers.Mutation.analizarRepositorio(null, { projectId: projectB.id }, {
    ...contextB,
    repositoryAnalyzer: jest.fn().mockResolvedValue(diagnosis),
  });

  const currentA = await resolvers.Query.devgotchi(null, null, contextA);
  const currentB = await resolvers.Query.devgotchi(null, null, contextB);
  expect(currentA).toMatchObject({ id: projectA.id, nombre: 'BastiGotchi' });
  expect(currentB).toMatchObject({ id: projectB.id, vida_actual: 84 });
  expect(currentB.nombre).not.toBe('BastiGotchi');

  await expect(resolvers.Mutation.renombrarDevgotchi(null, {
    projectId: projectB.id,
    nombre: 'Intruso',
  }, contextA)).rejects.toThrow('Proyecto no encontrado');
  await expect(resolvers.Mutation.analizarRepositorio(null, { projectId: projectA.id }, {
    ...contextB,
    repositoryAnalyzer: jest.fn(),
  })).rejects.toThrow('Proyecto no encontrado');
});

const request = require('supertest');

const mockQuery = jest.fn(async (sql) => {
  if (/datetime\('now'\)/i.test(sql)) {
    return { rows: [{ ahora: '2026-10-03 12:00:00' }], rowCount: 1 };
  }
  if (/SELECT id FROM projects/i.test(sql)) return { rows: [], rowCount: 0 };
  if (/SELECT \* FROM projects/i.test(sql)) return { rows: [], rowCount: 0 };
  return { rows: [], rowCount: 0 };
});

jest.mock('../db/database', () => ({
  dbType: 'sqlite',
  pool: { query: mockQuery },
}));

const mockStopCron = jest.fn();
jest.mock('./services/cronService', () => ({
  startRepositoryHealthCron: jest.fn(() => ({ stop: mockStopCron })),
}));

const app = require('./app');

describe('API HTTP integrada', () => {
  let apolloServer;

  beforeAll(async () => {
    apolloServer = await app.startApolloServer();
  });

  afterAll(async () => {
    await apolloServer.stop();
  });

  test('expone raíz, health y estado de SQLite', async () => {
    await request(app)
      .get('/')
      .expect(200)
      .expect(({ body }) => expect(body.estado).toContain('vivo'));

    await request(app)
      .get('/health')
      .expect(200)
      .expect(({ body }) => expect(body).toMatchObject({ status: 'ok', service: 'DevGotchi backend' }));

    await request(app)
      .get('/estado-db')
      .expect(200)
      .expect(({ body }) => expect(body).toMatchObject({ conectado: true, database: 'SQLITE' }));
  });

  test('expone rutas REST de proyectos y procesa un webhook de estado', async () => {
    await request(app)
      .get('/api/projects/demo')
      .expect(200)
      .expect(({ body }) => expect(body.data).toMatchObject({ project: 'demo-project', vida: 100 }));

    await request(app)
      .post('/api/webhooks/project-status')
      .send({ project: 'acme/api', repository: 'acme/api', branch: 'main', workflow: 'ci', status: 'failure' })
      .expect(200)
      .expect(({ body }) => expect(body.data.health).toBe('critical'));

    await request(app)
      .get('/api/projects/acme%2Fapi')
      .expect(200)
      .expect(({ body }) => expect(body.data.project).toBe('acme/api'));

    await request(app).get('/api/projects/no-existe').expect(404);
    await request(app)
      .get('/api/projects')
      .expect(200)
      .expect(({ body }) => expect(body.data).toHaveLength(1));
  });

  test('sirve GraphQL con Apollo y reporta JSON inválido de forma controlada', async () => {
    await request(app)
      .post('/graphql')
      .send({ query: '{ __typename }' })
      .expect(200)
      .expect(({ body }) => expect(body.data.__typename).toBe('Query'));

    await request(app)
      .post('/api/webhooks/project-status')
      .set('Content-Type', 'application/json')
      .send('{')
      .expect(400)
      .expect(({ body }) => expect(body.error).toBeTruthy());
  });
});

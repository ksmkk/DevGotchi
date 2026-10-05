const { ApolloServer } = require('@apollo/server');
const { typeDefs } = require('./schema');
const { resolvers } = require('./resolvers');

async function executeGraphQL(query, variables, db) {
  const server = new ApolloServer({
    typeDefs,
    resolvers,
  });

  await server.start();
  const response = await server.executeOperation(
    { query, variables },
    { contextValue: { db } },
  );
  await server.stop();
  if (response.body.kind !== 'single') {
    throw new Error('La operación GraphQL devolvió una respuesta incremental inesperada');
  }
  return response.body.singleResult;
}

describe('operaciones GraphQL de DevGotchi', () => {
  test.each([
    { puntosVida: 40, animo: 'sad', estado: 'Triste' },
    { puntosVida: 0, animo: 'sad', estado: 'Muerto' },
    { puntosVida: 78, animo: 'happy', estado: 'Feliz' },
  ])('devgotchi devuelve la salud del repositorio en estado $estado', async ({ puntosVida, animo, estado }) => {
    const db = {
      query: jest.fn().mockResolvedValueOnce({
        rows: [{
          id: 1,
          user_id: 2,
          devgotchi_health: puntosVida,
          devgotchi_mood: animo,
          last_commit_date: '2025-03-08T12:00:00.000Z',
        }],
      }),
    };

    const result = await executeGraphQL(`
      query {
        devgotchi {
          salud {
            puntosVida
            ultimoCommit
            estado
          }
        }
      }
    `, undefined, db);

    expect(result.errors).toBeUndefined();
    expect(result.data.devgotchi.salud).toEqual({
      puntosVida,
      ultimoCommit: '2025-03-08T12:00:00.000Z',
      estado,
    });
  });

  test('cuidarDevgotchi incrementa la vida y respeta el máximo', async () => {
    const db = {
      query: jest.fn()
        .mockResolvedValueOnce({ rows: [{ id: 1, devgotchi_health: 95 }] })
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            uuid: 'project-uuid',
            user_id: 1,
            name: 'Pixel',
            devgotchi_health: 100,
            devgotchi_mood: 'happy',
          }],
        })
        .mockResolvedValueOnce({ rows: [] }),
    };

    const result = await executeGraphQL(`
      mutation {
        cuidarDevgotchi {
          id
          vida_actual
        }
      }
    `, undefined, db);

    expect(result.errors).toBeUndefined();
    expect(result.data.cuidarDevgotchi).toEqual({ id: '1', vida_actual: 100 });
    expect(db.query).toHaveBeenCalledTimes(3);
  });

  test('conectarRepositorio usa el argumento y tipo esperados por el frontend', async () => {
    const db = {
      query: jest.fn()
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ id: 1 }] })
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            uuid: 'project-uuid',
            user_id: 1,
            name: 'app',
            repository_url: 'https://github.com/devgotchi/app',
            devgotchi_health: 100,
            devgotchi_mood: 'neutral',
          }],
        }),
    };

    const result = await executeGraphQL(`
      mutation ConnectRepository($repositoryUrl: String!) {
        conectarRepositorio(repositoryUrl: $repositoryUrl) {
          repository_url
        }
      }
    `, { repositoryUrl: 'https://github.com/devgotchi/app' }, db);

    expect(result.errors).toBeUndefined();
    expect(result.data.conectarRepositorio.repository_url)
      .toBe('https://github.com/devgotchi/app');
    expect(db.query.mock.calls[2][1]).toEqual([
      expect.any(String),
      1,
      'app',
      'https://github.com/devgotchi/app',
    ]);
  });
});

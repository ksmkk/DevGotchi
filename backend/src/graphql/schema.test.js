const { ApolloServer } = require('apollo-server-express');
const { typeDefs } = require('./schema');
const { resolvers } = require('./resolvers');

const mockQuery = jest.fn();
const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: () => ({ db: { query: mockQuery } }),
});

async function executeGraphQL(query, variables) {
  const response = await server.executeOperation({ query, variables });
  return response.body?.singleResult ?? response;
}

describe('resolvers GraphQL de DevGotchi', () => {
  beforeAll(() => server.start());
  afterAll(() => server.stop());
  beforeEach(() => mockQuery.mockReset());

  test.each([
    { puntosVida: 40, animo: 'sad', estado: 'Triste' },
    { puntosVida: 0, animo: 'sad', estado: 'Muerto' },
    { puntosVida: 78, animo: 'happy', estado: 'Feliz' },
  ])('devgotchi devuelve la salud del repositorio en estado $estado', async ({ puntosVida, animo, estado }) => {
    mockQuery.mockResolvedValueOnce({
      rows: [{
        id: 1,
        user_id: 2,
        devgotchi_health: puntosVida,
        devgotchi_mood: animo,
        last_commit_date: '2025-03-08T12:00:00.000Z',
      }],
    });

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
    `);

    expect(result.errors).toBeUndefined();
    expect(result.data.devgotchi.salud).toEqual({
      puntosVida,
      ultimoCommit: '2025-03-08T12:00:00.000Z',
      estado,
    });
  });

  test('cuidarDevgotchi incrementa la vida y respeta el máximo', async () => {
    mockQuery
      .mockResolvedValueOnce({
        rows: [{ id: 1, devgotchi_health: 95 }],
      })
      .mockResolvedValueOnce({
        rows: [{
          id: 1,
          user_id: 2,
          name: 'Pixel',
          devgotchi_health: 100,
          devgotchi_mood: 'happy',
          repository_url: null,
        }],
      });

    const result = await executeGraphQL(`
      mutation {
        cuidarDevgotchi {
          id
          vida_actual
        }
      }
    `);

    expect(result.errors).toBeUndefined();
    expect(result.data.cuidarDevgotchi).toEqual({ id: '1', vida_actual: 100 });
    expect(mockQuery).toHaveBeenCalledTimes(3);
  });

  test('conectarRepositorio persiste la URL recibida', async () => {
    mockQuery
      .mockResolvedValueOnce({
        rows: [],
      })
      .mockResolvedValueOnce({
        rows: [{ id: 2 }],
      })
      .mockResolvedValueOnce({
        rows: [{
          id: 1,
          user_id: 2,
          name: 'Pixel',
          devgotchi_health: 100,
          devgotchi_mood: 'neutral',
          repository_url: 'https://github.com/devgotchi/app',
        }],
      });

    const result = await executeGraphQL(`
      mutation ConnectRepository($repositoryUrl: String!) {
        conectarRepositorio(repositoryUrl: $repositoryUrl) {
          repository_url
        }
      }
    `, { repositoryUrl: 'https://github.com/devgotchi/app' });

    expect(result.errors).toBeUndefined();
    expect(result.data.conectarRepositorio.repository_url)
      .toBe('https://github.com/devgotchi/app');
    expect(mockQuery.mock.calls[2][1]).toEqual([
      expect.any(String),
      2,
      'app',
      'https://github.com/devgotchi/app',
    ]);
  });
});
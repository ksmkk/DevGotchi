const { ApolloServer } = require('apollo-server-express');
const { typeDefs } = require('./schema');
const { resolvers } = require('./resolvers');

async function executeGraphQL(query, variables, db) {
  const server = new ApolloServer({
    typeDefs,
    resolvers,
    context: () => ({ db }),
  });

  await server.start();
  const result = await server.executeOperation({ query, variables });
  await server.stop();
  return result;
}

describe('operaciones GraphQL de DevGotchi', () => {
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
  });
});

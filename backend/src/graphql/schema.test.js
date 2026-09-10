const mockQuery = jest.fn();

jest.mock('../db/database', () => ({
  pool: { query: mockQuery },
}));

const { executeGraphQL } = require('./schema');

describe('resolvers GraphQL de DevGotchi', () => {
  beforeEach(() => mockQuery.mockReset());

  test('cuidarDevgotchi incrementa la vida y respeta el máximo', async () => {
    mockQuery
      .mockResolvedValueOnce({
        rows: [{ id: 1, nombre: 'Pixel', vida_actual: 95, repository_url: null }],
      })
      .mockResolvedValueOnce({
        rows: [{ id: 1, nombre: 'Pixel', vida_actual: 100, repository_url: null }],
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
    expect(mockQuery).toHaveBeenCalledTimes(2);
  });

  test('conectarRepositorio persiste la URL recibida', async () => {
    mockQuery
      .mockResolvedValueOnce({
        rows: [{ id: 1, nombre: 'Pixel', vida_actual: 72, repository_url: null }],
      })
      .mockResolvedValueOnce({
        rows: [{
          id: 1,
          nombre: 'Pixel',
          vida_actual: 72,
          repository_url: 'https://github.com/devgotchi/app',
        }],
      });

    const result = await executeGraphQL(`
      mutation ConnectRepository($repositoryUrl: String!) {
        conectarRepositorio(repository_url: $repositoryUrl) {
          repository_url
        }
      }
    `, { repositoryUrl: 'https://github.com/devgotchi/app' });

    expect(result.errors).toBeUndefined();
    expect(result.data.conectarRepositorio.repository_url)
      .toBe('https://github.com/devgotchi/app');
    expect(mockQuery.mock.calls[1][1]).toEqual([
      'https://github.com/devgotchi/app',
      1,
    ]);
  });
});
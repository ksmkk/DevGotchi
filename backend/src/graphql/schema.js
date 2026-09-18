const { buildSchema, graphql } = require('graphql');
const { pool } = require('../db/database');

const schema = buildSchema(`
  type DevGotchi {
    id: ID!
    nombre: String!
    vida_actual: Int!
    repository_url: String
  }

  type Query {
    devgotchi: DevGotchi
  }

  type Mutation {
    cuidarDevgotchi: DevGotchi!
    conectarRepositorio(repository_url: String!): DevGotchi!
  }
`);

async function getDevGotchi() {
  const result = await pool.query(
    `SELECT id, nombre, vida_actual, repository_url
     FROM devgotchi
     ORDER BY id
     LIMIT 1`,
  );

  if (result.rows[0]) {
    return result.rows[0];
  }

  const created = await pool.query(
    `INSERT INTO devgotchi (nombre, vida_actual)
     VALUES ('Pixel', 72)
     RETURNING id, nombre, vida_actual, repository_url`,
  );

  return created.rows[0];
}

const rootValue = {
  devgotchi: getDevGotchi,
  cuidarDevgotchi: async () => {
    const current = await getDevGotchi();
    const result = await pool.query(
      `UPDATE devgotchi
       SET vida_actual = LEAST(100, vida_actual + 10)
       WHERE id = $1
       RETURNING id, nombre, vida_actual, repository_url`,
      [current.id],
    );

    return result.rows[0];
  },
  conectarRepositorio: async ({ repository_url: repositoryUrl }) => {
    const current = await getDevGotchi();
    const result = await pool.query(
      `UPDATE devgotchi
       SET repository_url = $1
       WHERE id = $2
       RETURNING id, nombre, vida_actual, repository_url`,
      [repositoryUrl, current.id],
    );

    return result.rows[0];
  },
};

function executeGraphQL(query, variables) {
  return graphql({
    schema,
    source: query,
    rootValue,
    variableValues: variables,
  });
}

module.exports = { executeGraphQL };
const { Pool } = require('pg');
const {
  DB_HOST,
  DB_PORT,
  POSTGRES_DB,
  POSTGRES_PASSWORD,
  POSTGRES_USER,
} = require('../config/env');

const pool = new Pool({
  host: DB_HOST,
  port: DB_PORT,
  user: POSTGRES_USER,
  password: POSTGRES_PASSWORD,
  database: POSTGRES_DB,
});

async function initializeDatabase() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS devgotchi (
      id SERIAL PRIMARY KEY,
      nombre TEXT NOT NULL,
      vida_actual INTEGER NOT NULL DEFAULT 100,
      repository_url TEXT
    )
  `);
  await pool.query('ALTER TABLE devgotchi ADD COLUMN IF NOT EXISTS repository_url TEXT');
}

module.exports = {
  initializeDatabase,
  pool,
};
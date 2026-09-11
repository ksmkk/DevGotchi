require('dotenv').config();

const PORT = Number(process.env.PORT || 3000);
const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = Number(process.env.DB_PORT || 5432);
const POSTGRES_USER = process.env.POSTGRES_USER || 'devgotchi';
const POSTGRES_PASSWORD = process.env.POSTGRES_PASSWORD || 'devgotchi_password';
const POSTGRES_DB = process.env.POSTGRES_DB || 'devgotchi';
const GITHUB_WEBHOOK_SECRET = process.env.GITHUB_WEBHOOK_SECRET || '';

module.exports = {
  DB_HOST,
  DB_PORT,
  PORT,
  POSTGRES_DB,
  POSTGRES_PASSWORD,
  POSTGRES_USER,
  GITHUB_WEBHOOK_SECRET,
};

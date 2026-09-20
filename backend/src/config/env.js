require('dotenv').config();

const PORT = Number(process.env.PORT || 3000);
const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = Number(process.env.DB_PORT || 5432);
const POSTGRES_USER = process.env.POSTGRES_USER || 'devgotchi';
const POSTGRES_PASSWORD = process.env.POSTGRES_PASSWORD || 'devgotchi_password';
const POSTGRES_DB = process.env.POSTGRES_DB || 'devgotchi';
const FRONTEND_URL = process.env.FRONTEND_URL || '';
const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID || '';
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET || '';
const GITHUB_CALLBACK_URL = process.env.GITHUB_CALLBACK_URL || '';
const GITHUB_WEBHOOK_SECRET = process.env.GITHUB_WEBHOOK_SECRET || '';
const SESSION_SECRET = process.env.SESSION_SECRET || '';

module.exports = {
  DB_HOST,
  DB_PORT,
  FRONTEND_URL,
  GITHUB_CALLBACK_URL,
  GITHUB_CLIENT_ID,
  GITHUB_CLIENT_SECRET,
  GITHUB_WEBHOOK_SECRET,
  PORT,
  POSTGRES_DB,
  POSTGRES_PASSWORD,
  POSTGRES_USER,
  SESSION_SECRET,
};

const config = require('../src/config/env');
const path = require('path');

let pool;
let dbType = 'sqlite';

if (config.DB_HOST && config.DB_HOST !== 'localhost') {
  dbType = 'postgres';
}

if (dbType === 'sqlite') {
  const { DatabaseSync } = require('node:sqlite');
  const dbPath = path.join(__dirname, '../../devgotchi.db');

  const db = new DatabaseSync(dbPath);
  db.exec('PRAGMA journal_mode = WAL');

  pool = {
    query: (sql, params = []) => {
      try {
        let sqlQuery = sql.replace(/\$(\d+)/g, '?');
        const stmt = db.prepare(sqlQuery);
        const isReturningQuery = /\bRETURNING\b/i.test(sqlQuery);

        if (/^(SELECT|PRAGMA)\b/i.test(sqlQuery.trim()) || isReturningQuery) {
          const rows = stmt.all(...params);
          return Promise.resolve({ rows, rowCount: rows.length });
        } else {
          const result = stmt.run(...params);
          return Promise.resolve({ 
            rows: result.changes ? [{ id: result.lastInsertRowid }] : [],
            rowCount: result.changes 
          });
        }
      } catch (error) {
        return Promise.reject(error);
      }
    },
    connect: async () => {
      const client = {
        query: (sql, params = []) => pool.query(sql, params),
        release: () => {}
      };
      return client;
    },
    end: () => db.close(),
  };
  
  console.log(`📁 Usando SQLite en: ${dbPath}`);
}
else {
  const { Pool } = require('pg');
  
  pool = new Pool({
    user: config.POSTGRES_USER,
    host: config.DB_HOST,
    database: config.POSTGRES_DB,
    password: config.POSTGRES_PASSWORD,
    port: config.DB_PORT,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });

  pool.on('error', (error) => {
    console.error('❌ Error en el pool PostgreSQL:', error.message);
  });

  pool.on('connect', () => {
    console.log('✅ Conectado a PostgreSQL');
  });
  
  console.log(`🗄️ Usando PostgreSQL en: ${config.DB_HOST}:${config.DB_PORT}`);
}

module.exports = { pool, dbType };

const config = require('../src/config/env');
const path = require('path');

let pool;
let dbType = 'sqlite'; // Por defecto SQLite para desarrollo

// Detectar si usar PostgreSQL (si DB_HOST está configurado)
if (config.DB_HOST && config.DB_HOST !== 'localhost') {
  dbType = 'postgres';
}

// SQLite para desarrollo local
if (dbType === 'sqlite') {
  const Database = require('better-sqlite3');
  const dbPath = path.join(__dirname, '../../devgotchi.db');
  
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  
  // Wrapper para que sea compatible con el interfaz de PostgreSQL
  pool = {
    query: (sql, params = []) => {
      try {
        // Convertir placeholders de PostgreSQL ($1, $2) a ?
        let sqlQuery = sql.replace(/\$(\d+)/g, '?');
        
        const stmt = db.prepare(sqlQuery);
        
        if (sqlQuery.trim().toUpperCase().startsWith('SELECT')) {
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
    end: () => db.close()
  };
  
  console.log(`📁 Usando SQLite en: ${dbPath}`);
}
// PostgreSQL para producción
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

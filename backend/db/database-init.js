/**
 * Script de inicialización de la base de datos
 * Se ejecuta cuando el servidor inicia para asegurar que el esquema existe
 */

const fs = require('fs');
const path = require('path');
const { pool, dbType } = require('./database');

const initializeDatabase = async () => {
  try {
    let schemaPath;
    
    if (dbType === 'sqlite') {
      schemaPath = path.join(__dirname, 'schema.sqlite.sql');
    } else {
      schemaPath = path.join(__dirname, 'schema.sql');
    }

    const schemaSql = fs.readFileSync(schemaPath, 'utf8');

    console.log(`🔧 Inicializando base de datos (${dbType.toUpperCase()})...`);
    
    // Para SQLite, ejecutar cada query por separado
    if (dbType === 'sqlite') {
      const statements = schemaSql
        .split(';')
        .map(s => {
          // Remover comentarios y espacios
          return s
            .split('\n')
            .filter(line => !line.trim().startsWith('--'))
            .join('\n')
            .trim();
        })
        .filter(s => s.length > 0);
      
      for (const statement of statements) {
        try {
          await pool.query(statement + ';');
        } catch (err) {
          // Ignorar errores de "already exists" para triggers/indexes
          if (!err.message.includes('already exists')) {
            throw err;
          }
        }
      }
    } else {
      // Para PostgreSQL, ejecutar todo junto
      await pool.query(schemaSql);
    }

    const projectColumns = dbType === 'sqlite'
      ? [
        ['pet_name', 'TEXT'],
        ['repository_analysis', 'TEXT'],
        ['last_analysis_at', 'TIMESTAMP'],
      ]
      : [
        ['pet_name', 'VARCHAR(80)'],
        ['repository_analysis', 'TEXT'],
        ['last_analysis_at', 'TIMESTAMP'],
      ];

    for (const [column, type] of projectColumns) {
      if (dbType === 'sqlite') {
        const columns = await pool.query('PRAGMA table_info(projects)');
        if (!columns.rows.some((item) => item.name === column)) {
          await pool.query(`ALTER TABLE projects ADD COLUMN ${column} ${type}`);
        }
      } else {
        await pool.query(`ALTER TABLE projects ADD COLUMN IF NOT EXISTS ${column} ${type}`);
      }
    }
    
    console.log('✅ Base de datos inicializada correctamente');
    return true;
  } catch (error) {
    console.error('❌ Error al inicializar la base de datos:', error.message);
    return false;
  }
};

module.exports = { initializeDatabase };

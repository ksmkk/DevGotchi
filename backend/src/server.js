const app = require('./app');
const { startApolloServer } = app;
const { PORT } = require('./config/env');
const { initializeDatabase } = require('../db/database-init');

async function main() {
  try {
    const databaseReady = await initializeDatabase();
    if (!databaseReady) {
      throw new Error('No se pudo inicializar la base de datos');
    }
    console.log('✅ Base de datos inicializada');

    const apolloServer = await startApolloServer();
    console.log('✅ Apollo Server iniciado');

    app.listen(PORT, () => {
      console.log(`🚀 Servidor escuchando en http://localhost:${PORT}`);
      console.log(`📊 GraphQL disponible en http://localhost:${PORT}/graphql`);
    });
  } catch (error) {
    console.error('❌ Error al inicializar el servidor:', error.message);
    process.exitCode = 1;
  }
}

main();

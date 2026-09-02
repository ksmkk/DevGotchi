const { app, startApolloServer } = require('./app');
const { PORT } = require('./config/env');
const { initializeDatabase } = require('../db/database-init');

/**
 * Función async para inicializar el servidor
 */
async function main() {
  try {
    // 1. Inicializar la base de datos
    await initializeDatabase();
    console.log('✅ Base de datos inicializada');

    // 2. Iniciar Apollo Server
    const apolloServer = await startApolloServer();
    console.log('✅ Apollo Server iniciado');

    // 3. Iniciar el servidor Express
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

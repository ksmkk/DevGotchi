const app = require('./app');
const { PORT } = require('./config/env');
const { initializeDatabase } = require('./db/database');

initializeDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Servidor escuchando en http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error('No se pudo inicializar PostgreSQL:', error.message);
    process.exitCode = 1;
  });

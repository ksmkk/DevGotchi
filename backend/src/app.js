const express = require('express');
const cors = require('cors');
const { ApolloServer } = require('apollo-server-express');
const healthRoutes = require('./routes/health.routes');
const webhookRoutes = require('./routes/webhooks.routes');
const projectsRoutes = require('./routes/projects.routes');
const { typeDefs } = require('./graphql/schema');
const { resolvers } = require('./graphql/resolvers');
const { pool, dbType } = require('../db/database');
const { startHealthDecayCron } = require('./services/cronService');

const app = express();
let healthDecayTask;

// Middleware
app.use(cors());
app.use(express.json({
  verify: (req, res, buffer) => {
    req.rawBody = buffer;
  },
}));
const githubAuthRoutes = require('./routes/githubAuth.routes');
const githubWebhookRoutes = require('./routes/githubWebhook.routes');
const { FRONTEND_URL } = require('./config/env');


app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', FRONTEND_URL || 'http://127.0.0.1:5173');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }

  return next();
});

app.use('/api/auth', githubAuthRoutes);
app.use('/api/github/webhook', githubWebhookRoutes);



app.get('/', (req, res) => {
  res.status(200).json({
    estado: 'El backend de DevGotchi está vivo',
  });
});

app.get('/estado-db', async (req, res) => {
  try {
    const query = dbType === 'sqlite' 
      ? 'SELECT datetime(\'now\') AS ahora' 
      : 'SELECT NOW() AS ahora';
    
    const result = await pool.query(query);

    return res.status(200).json({
      ok: true,
      conectado: true,
      database: dbType.toUpperCase(),
      ahora: result.rows[0].ahora,
    });
  } catch (error) {
    return res.status(503).json({
      ok: false,
      conectado: false,
      database: dbType.toUpperCase(),
      error: `No se pudo conectar con ${dbType.toUpperCase()}`,
    });
  }
});

app.use('/health', healthRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/projects', projectsRoutes);

/**
 * Inicializar Apollo Server
 * Esta función debe ser llamada en server.js
 */
async function startApolloServer() {
  // Crear la instancia de Apollo Server
  const server = new ApolloServer({
    typeDefs,
    resolvers,
    // Configurar contexto - se pasa a todos los resolvers
    context: () => ({
      db: pool,
      dbType,
    }),
    // Configurar manejo de errores
    formatError: (error) => {
      console.error('GraphQL Error:', error);
      return {
        message: error.message,
        code: error.extensions?.code || 'INTERNAL_SERVER_ERROR',
      };
    },
  });

  // Iniciar el servidor
  await server.start();

  if (!healthDecayTask) {
    healthDecayTask = startHealthDecayCron(pool);
  }

  // Integrar con Express en el endpoint /graphql
  server.applyMiddleware({
    app,
    path: '/graphql',
    bodyParserConfig: false,
    cors: {
      origin: '*',
      credentials: true,
    },
  });

  return server;
}


app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);

  return res.status(error.statusCode || 500).json({
    error: error.statusCode ? error.message : 'Error interno del servidor',
  });
});

module.exports = { app, startApolloServer };


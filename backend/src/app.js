const express = require('express');
const cors = require('cors');
const { ApolloServer } = require('@apollo/server');
const { expressMiddleware } = require('@as-integrations/express4');
const healthRoutes = require('./routes/health.routes');
const webhookRoutes = require('./routes/webhooks.routes');
const projectsRoutes = require('./routes/projects.routes');
const { typeDefs } = require('./graphql/schema');
const { resolvers } = require('./graphql/resolvers');
const { pool, dbType } = require('../db/database');
const githubAuthRoutes = require('./routes/githubAuth.routes');
const githubWebhookRoutes = require('./routes/githubWebhook.routes');
const { FRONTEND_URL } = require('./config/env');
const { startRepositoryHealthCron } = require('./services/cronService');
const { analyzeRepository } = require('./services/repositoryHealthService');

const app = express();
let healthDecayTask;

const allowedOrigins = new Set(
  FRONTEND_URL
    ? [FRONTEND_URL]
    : ['http://127.0.0.1:5173', 'http://localhost:5173'],
);

app.use(cors({
  origin(origin, callback) {
    // Requests without Origin are server-to-server and are not subject to CORS.
    callback(null, !origin || allowedOrigins.has(origin));
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
}));

// GitHub requires the exact raw body to validate X-Hub-Signature-256.
// This route must be registered before express.json consumes the request body.
app.use('/api/github/webhook', githubWebhookRoutes);
app.use(express.json({
  verify: (req, res, buffer) => {
    req.rawBody = buffer;
  },
}));
app.use('/api/auth', githubAuthRoutes);

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
    cache: 'bounded',
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
    healthDecayTask = startRepositoryHealthCron(pool, analyzeRepository);
  }

  // Integrar Apollo Server 5 con Express 4. El body ya fue procesado por
  // express.json, registrado antes de las rutas HTTP.
  app.use('/graphql', expressMiddleware(server, {
    context: async () => ({
      db: pool,
      dbType,
      repositoryAnalyzer: analyzeRepository,
    }),
  }));

  return server;
}


app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);

  return res.status(error.statusCode || 500).json({
    error: error.statusCode ? error.message : 'Error interno del servidor',
  });
});

module.exports = app;
module.exports.startApolloServer = startApolloServer;


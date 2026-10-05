const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
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
const { ensureSessionIdentity } = require('./auth/sessionIdentity');

const app = express();
let healthDecayTask;

const allowedOrigins = new Set(
  FRONTEND_URL
    ? [FRONTEND_URL]
    : ['http://127.0.0.1:5173', 'http://localhost:5173'],
);

app.use(cors({
  origin(origin, callback) {
    callback(null, !origin || allowedOrigins.has(origin));
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
  credentials: true,
}));

app.use(ensureSessionIdentity);

app.use('/api/github/webhook', githubWebhookRoutes);
app.use(express.json({
  verify: (req, res, buffer) => {
    req.rawBody = buffer;
  },
}));
app.use('/api/auth', githubAuthRoutes);

app.get('/api', (req, res) => {
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

async function startApolloServer() {
  const server = new ApolloServer({
    typeDefs,
    resolvers,
    cache: 'bounded',
    formatError: (error) => {
      console.error('GraphQL Error:', error);
      return {
        message: error.message,
        code: error.extensions?.code || 'INTERNAL_SERVER_ERROR',
      };
    },
  });

  await server.start();

  if (!healthDecayTask) {
    healthDecayTask = startRepositoryHealthCron(pool, analyzeRepository);
  }

  app.use('/graphql', expressMiddleware(server, {
    context: async ({ req }) => ({
      db: pool,
      dbType,
      repositoryAnalyzer: analyzeRepository,
      sessionId: req.devgotchiSessionId,
    }),
  }));

  const frontendDirectory = path.join(__dirname, '..', 'public');

  if (fs.existsSync(frontendDirectory)) {
    app.use(express.static(frontendDirectory));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api/') || req.path === '/api' || req.path === '/graphql') {
        return next();
      }

      return res.sendFile(path.join(frontendDirectory, 'index.html'));
    });
  } else {
    app.get('/', (req, res) => {
      res.status(200).json({
        estado: 'El backend de DevGotchi está vivo',
      });
    });
  }

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


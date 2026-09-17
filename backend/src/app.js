const express = require('express');
const healthRoutes = require('./routes/health.routes');
const webhookRoutes = require('./routes/webhooks.routes');
const projectsRoutes = require('./routes/projects.routes');
const githubAuthRoutes = require('./routes/githubAuth.routes');
const githubWebhookRoutes = require('./routes/githubWebhook.routes');
const { pool } = require('./db/database');
const { executeGraphQL } = require('./graphql/schema');
const { FRONTEND_URL } = require('./config/env');

const app = express();

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

app.use(express.json());

app.post('/graphql', async (req, res) => {
  const { query, variables } = req.body || {};

  if (!query) {
    return res.status(400).json({ errors: [{ message: 'Falta la consulta GraphQL' }] });
  }

  const result = await executeGraphQL(query, variables);
  return res.status(result.errors ? 400 : 200).json(result);
});

app.get('/', (req, res) => {
  res.status(200).json({
    estado: 'El backend de DevGotchi está vivo',
  });
});

app.get('/estado-db', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW() AS ahora');

    return res.status(200).json({
      ok: true,
      conectado: true,
      ahora: result.rows[0].ahora,
    });
  } catch (error) {
    return res.status(503).json({
      ok: false,
      conectado: false,
      error: 'No se pudo conectar con PostgreSQL',
    });
  }
});

app.use('/health', healthRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/projects', projectsRoutes);

app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);

  return res.status(error.statusCode || 500).json({
    error: error.statusCode ? error.message : 'Error interno del servidor',
  });
});

module.exports = app;

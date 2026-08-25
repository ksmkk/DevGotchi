const express = require('express');
const healthRoutes = require('./routes/health.routes');
const webhookRoutes = require('./routes/webhooks.routes');
const projectsRoutes = require('./routes/projects.routes');
const { pool } = require('./db/database');

const app = express();

app.use(express.json());

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

module.exports = app;

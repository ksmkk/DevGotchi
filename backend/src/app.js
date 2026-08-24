const express = require('express');
const healthRoutes = require('./routes/health.routes');
const webhookRoutes = require('./routes/webhooks.routes');
const projectsRoutes = require('./routes/projects.routes');

const app = express();

app.use(express.json());

app.get('/', (req, res) => {
  res.status(200).json({
    estado: 'El backend de DevGotchi está vivo',
  });
});

app.use('/health', healthRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/projects', projectsRoutes);

module.exports = app;

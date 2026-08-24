const app = require('./app');
const { PORT } = require('./config/env');

app.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
});

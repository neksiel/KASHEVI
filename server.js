const path = require('node:path');
const express = require('express');
const config = require('./src/config/env');
const { testConnection } = require('./src/config/db');
const publicRoutes = require('./src/routes/publicRoutes');
const adminRoutes = require('./src/routes/adminRoutes');
const { errorHandler } = require('./src/middleware/errorHandler');

const app = express();

app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api', publicRoutes);
app.use('/api/admin', adminRoutes);

app.use('/api/*', (_req, res) => {
  res.status(404).json({ ok: false, error: 'Endpoint no encontrado.' });
});

app.use(errorHandler);

async function startServer() {
  try {
    await testConnection();
    console.log(`[MySQL] Conectado a ${config.db.database} en ${config.db.host}:${config.db.port}`);
  } catch (err) {
    console.warn(
      `[MySQL] Advertencia: no se pudo conectar aún (${err.message}). Revisa que XAMPP MySQL esté encendido y hayas importado sql/kashevi_db.sql.`
    );
  }

  app.listen(config.port, () => {
    console.log(`[Kashevi Barbershop] Servidor corriendo en http://localhost:${config.port}`);
    console.log(`[Panel Admin] Disponible en http://localhost:${config.port}/admin.html`);
  });
}

if (require.main === module) {
  startServer();
}

module.exports = app;

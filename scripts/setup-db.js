const fs = require('node:fs');
const path = require('node:path');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const config = require('../src/config/env');
const { upsertAdmin } = require('../src/repositories/adminRepository');

async function setupDatabase() {
  const sqlPath = path.join(__dirname, '..', 'sql', 'kashevi_db.sql');
  const sqlContent = fs.readFileSync(sqlPath, 'utf8');

  const conn = await mysql.createConnection({
    host: config.db.host,
    port: config.db.port,
    user: config.db.user,
    password: config.db.password,
    multipleStatements: true,
  });

  try {
    console.log(`[Setup] Conectado a MySQL en ${config.db.host}:${config.db.port}`);
    await conn.query(sqlContent);
    console.log(`[Setup] Script kashevi_db.sql ejecutado correctamente.`);

    await conn.query(`USE \`${config.db.database}\``);
    const hash = await bcrypt.hash(config.admin.defaultPassword, 10);
    await upsertAdmin(
      {
        usuario: config.admin.defaultUser,
        passwordHash: hash,
        nombre: 'Administrador Kashevi',
      },
      conn
    );
    console.log(
      `[Setup] Usuario admin listo (${config.admin.defaultUser} / ${config.admin.defaultPassword}).`
    );
  } finally {
    await conn.end();
  }
}

setupDatabase().catch((err) => {
  console.error('[Setup Error]', err.message);
  process.exit(1);
});

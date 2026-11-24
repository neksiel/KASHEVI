const { pool } = require('../config/db');

async function findByUsuario(usuario) {
  const [rows] = await pool.query(
    `SELECT id, usuario, password_hash, nombre, activo
     FROM usuarios_admin
     WHERE usuario = ? AND activo = 1
     LIMIT 1`,
    [usuario]
  );
  return rows[0] || null;
}

async function findById(id) {
  const [rows] = await pool.query(
    `SELECT id, usuario, password_hash, nombre, activo
     FROM usuarios_admin
     WHERE id = ? AND activo = 1
     LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

async function listAdmins() {
  const [rows] = await pool.query(
    `SELECT id, usuario, nombre, activo, creado_en
     FROM usuarios_admin
     ORDER BY id ASC`
  );
  return rows;
}

async function createAdmin({ usuario, passwordHash, nombre }) {
  const [result] = await pool.query(
    `INSERT INTO usuarios_admin (usuario, password_hash, nombre, activo)
     VALUES (?, ?, ?, 1)`,
    [usuario, passwordHash, nombre]
  );
  const [rows] = await pool.query(
    `SELECT id, usuario, nombre, activo, creado_en
     FROM usuarios_admin
     WHERE id = ?
     LIMIT 1`,
    [result.insertId]
  );
  return rows[0];
}

async function updateAdminPassword(id, passwordHash) {
  const [result] = await pool.query(
    `UPDATE usuarios_admin SET password_hash = ? WHERE id = ?`,
    [passwordHash, id]
  );
  return result.affectedRows > 0;
}

async function upsertAdmin({ usuario, passwordHash, nombre }, conn = pool) {
  await conn.query(
    `INSERT INTO usuarios_admin (usuario, password_hash, nombre, activo)
     VALUES (?, ?, ?, 1)
     ON DUPLICATE KEY UPDATE
       password_hash = VALUES(password_hash),
       nombre = VALUES(nombre),
       activo = 1`,
    [usuario, passwordHash, nombre]
  );
}

module.exports = {
  findByUsuario,
  findById,
  listAdmins,
  createAdmin,
  updateAdminPassword,
  upsertAdmin,
};

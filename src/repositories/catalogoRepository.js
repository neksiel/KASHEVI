const { pool } = require('../config/db');

async function getActiveServicios() {
  const [rows] = await pool.query(
    `SELECT id, slug, nombre, descripcion_corta, descripcion_detalle, duracion_min, precio, imagen_url
     FROM servicios
     WHERE activo = 1
     ORDER BY id ASC`
  );
  return rows;
}

async function listAllServiciosAdmin() {
  const [rows] = await pool.query(
    `SELECT id, slug, nombre, descripcion_corta, descripcion_detalle, duracion_min, precio, imagen_url, activo
     FROM servicios
     ORDER BY id ASC`
  );
  return rows;
}

async function updateServicioAdmin(id, { nombre, descripcionCorta, descripcionDetalle, duracionMin, precio, activo }) {
  const [result] = await pool.query(
    `UPDATE servicios
     SET nombre = ?, descripcion_corta = ?, descripcion_detalle = ?, duracion_min = ?, precio = ?, activo = ?
     WHERE id = ?`,
    [nombre, descripcionCorta, descripcionDetalle, duracionMin, precio, activo ? 1 : 0, id]
  );
  if (result.affectedRows === 0) return null;
  const [rows] = await pool.query(
    `SELECT id, slug, nombre, descripcion_corta, descripcion_detalle, duracion_min, precio, imagen_url, activo
     FROM servicios WHERE id = ? LIMIT 1`,
    [id]
  );
  return rows[0];
}

async function getServicioById(id, conn = pool) {
  const [rows] = await conn.query(
    `SELECT id, slug, nombre, descripcion_corta, descripcion_detalle, duracion_min, precio, imagen_url, activo
     FROM servicios
     WHERE id = ? AND activo = 1
     LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

async function getActiveBarberos(conn = pool, lockForUpdate = false) {
  const lockClause = lockForUpdate ? ' FOR UPDATE' : '';
  const [rows] = await conn.query(
    `SELECT id, nombre, especialidad, foto_url
     FROM barberos
     WHERE activo = 1
     ORDER BY id ASC${lockClause}`
  );
  return rows;
}

async function listAllBarberosAdmin() {
  const [rows] = await pool.query(
    `SELECT id, nombre, especialidad, foto_url, activo
     FROM barberos
     ORDER BY id ASC`
  );
  return rows;
}

async function createBarberoAdmin({ nombre, especialidad, fotoUrl = 'img/nosotros-barber.jpg' }) {
  const [result] = await pool.query(
    `INSERT INTO barberos (nombre, especialidad, foto_url, activo)
     VALUES (?, ?, ?, 1)`,
    [nombre, especialidad, fotoUrl]
  );
  const [rows] = await pool.query(
    `SELECT id, nombre, especialidad, foto_url, activo FROM barberos WHERE id = ? LIMIT 1`,
    [result.insertId]
  );
  return rows[0];
}

async function updateBarberoAdmin(id, { nombre, especialidad, activo }) {
  const [result] = await pool.query(
    `UPDATE barberos SET nombre = ?, especialidad = ?, activo = ? WHERE id = ?`,
    [nombre, especialidad, activo ? 1 : 0, id]
  );
  if (result.affectedRows === 0) return null;
  const [rows] = await pool.query(
    `SELECT id, nombre, especialidad, foto_url, activo FROM barberos WHERE id = ? LIMIT 1`,
    [id]
  );
  return rows[0];
}

async function getBarberoById(id, conn = pool) {
  const [rows] = await conn.query(
    `SELECT id, nombre, especialidad, foto_url, activo
     FROM barberos
     WHERE id = ? AND activo = 1
     LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

async function getVisibleTestimonios() {
  const [rows] = await pool.query(
    `SELECT id, cliente_nombre, edad, comentario, foto_url, orden
     FROM testimonios
     WHERE visible = 1
     ORDER BY orden ASC, id ASC`
  );
  return rows;
}

async function listAllTestimoniosAdmin() {
  const [rows] = await pool.query(
    `SELECT id, cliente_nombre, edad, comentario, foto_url, orden, visible
     FROM testimonios
     ORDER BY orden ASC, id ASC`
  );
  return rows;
}

async function createTestimonioAdmin({ clienteNombre, edad, comentario, fotoUrl = 'img/testimonio-pedro.jpg' }) {
  const [result] = await pool.query(
    `INSERT INTO testimonios (cliente_nombre, edad, comentario, foto_url, orden, visible)
     VALUES (?, ?, ?, ?, 10, 1)`,
    [clienteNombre, edad, comentario, fotoUrl]
  );
  const [rows] = await pool.query(
    `SELECT id, cliente_nombre, edad, comentario, foto_url, orden, visible
     FROM testimonios WHERE id = ? LIMIT 1`,
    [result.insertId]
  );
  return rows[0];
}

async function updateTestimonioVisible(id, visible) {
  const [result] = await pool.query(
    `UPDATE testimonios SET visible = ? WHERE id = ?`,
    [visible ? 1 : 0, id]
  );
  if (result.affectedRows === 0) return null;
  const [rows] = await pool.query(
    `SELECT id, cliente_nombre, edad, comentario, foto_url, orden, visible
     FROM testimonios WHERE id = ? LIMIT 1`,
    [id]
  );
  return rows[0];
}

async function deleteTestimonioAdmin(id) {
  const [result] = await pool.query(`DELETE FROM testimonios WHERE id = ?`, [id]);
  return result.affectedRows > 0;
}

module.exports = {
  getActiveServicios,
  listAllServiciosAdmin,
  updateServicioAdmin,
  getServicioById,
  getActiveBarberos,
  listAllBarberosAdmin,
  createBarberoAdmin,
  updateBarberoAdmin,
  getBarberoById,
  getVisibleTestimonios,
  listAllTestimoniosAdmin,
  createTestimonioAdmin,
  updateTestimonioVisible,
  deleteTestimonioAdmin,
};

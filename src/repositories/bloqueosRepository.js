const { pool } = require('../config/db');

async function getBloqueosByFecha(fecha, conn = pool) {
  const [rows] = await conn.query(
    `SELECT id, barbero_id, fecha, hora_inicio, hora_fin, motivo
     FROM bloqueos_horario
     WHERE fecha = ?`,
    [fecha]
  );
  return rows;
}

async function listBloqueos({ fecha = null } = {}) {
  const whereClause = fecha ? 'WHERE bl.fecha = ?' : '';
  const params = fecha ? [fecha] : [];
  const [rows] = await pool.query(
    `SELECT bl.id, bl.barbero_id, bl.fecha, bl.hora_inicio, bl.hora_fin, bl.motivo, bl.creado_en,
            COALESCE(b.nombre, 'Todo el estudio') AS barbero_nombre
     FROM bloqueos_horario bl
     LEFT JOIN barberos b ON b.id = bl.barbero_id
     ${whereClause}
     ORDER BY bl.fecha ASC, bl.hora_inicio ASC`,
    params
  );
  return rows;
}

async function createBloqueo({ barberoId = null, fecha, horaInicio, horaFin, motivo }) {
  const [result] = await pool.query(
    `INSERT INTO bloqueos_horario (barbero_id, fecha, hora_inicio, hora_fin, motivo)
     VALUES (?, ?, ?, ?, ?)`,
    [barberoId, fecha, horaInicio, horaFin, motivo]
  );
  const [rows] = await pool.query(
    `SELECT bl.id, bl.barbero_id, bl.fecha, bl.hora_inicio, bl.hora_fin, bl.motivo,
            COALESCE(b.nombre, 'Todo el estudio') AS barbero_nombre
     FROM bloqueos_horario bl
     LEFT JOIN barberos b ON b.id = bl.barbero_id
     WHERE bl.id = ?
     LIMIT 1`,
    [result.insertId]
  );
  return rows[0];
}

async function deleteBloqueo(id) {
  const [result] = await pool.query(`DELETE FROM bloqueos_horario WHERE id = ?`, [id]);
  return result.affectedRows > 0;
}

module.exports = {
  getBloqueosByFecha,
  listBloqueos,
  createBloqueo,
  deleteBloqueo,
};

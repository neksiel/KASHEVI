const { pool } = require('../config/db');

async function getActiveCitasByFecha(fecha, conn = pool, lockForUpdate = false) {
  const lockClause = lockForUpdate ? ' FOR UPDATE' : '';
  const [rows] = await conn.query(
    `SELECT id, barbero_id, hora_inicio, hora_fin, estado
     FROM citas
     WHERE fecha = ? AND estado IN ('pendiente', 'confirmada')${lockClause}`,
    [fecha]
  );
  return rows;
}

async function insertCita(
  {
    codigoProvisional,
    servicioId,
    barberoId,
    clienteNombre,
    clienteTelefono,
    fecha,
    horaInicio,
    horaFin,
    notas = null,
  },
  generateCodeFn,
  conn = pool
) {
  const [insertResult] = await conn.query(
    `INSERT INTO citas
      (codigo_reserva, servicio_id, barbero_id, cliente_nombre, cliente_telefono, fecha, hora_inicio, hora_fin, notas, estado)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pendiente')`,
    [
      codigoProvisional,
      servicioId,
      barberoId,
      clienteNombre,
      clienteTelefono,
      fecha,
      horaInicio,
      horaFin,
      notas,
    ]
  );

  const citaId = insertResult.insertId;
  const codigoReserva = generateCodeFn(fecha, citaId);

  await conn.query(`UPDATE citas SET codigo_reserva = ? WHERE id = ?`, [
    codigoReserva,
    citaId,
  ]);

  const [rows] = await conn.query(
    `SELECT id, codigo_reserva, servicio_id, barbero_id, cliente_nombre, cliente_telefono,
            fecha, hora_inicio, hora_fin, notas, estado, creado_en
     FROM citas
     WHERE id = ?
     LIMIT 1`,
    [citaId]
  );
  return rows[0];
}

async function listCitasAdmin({ fecha = null, estado = null, barberoId = null } = {}) {
  const conditions = [];
  const params = [];

  if (fecha) {
    conditions.push('c.fecha = ?');
    params.push(fecha);
  }
  if (estado) {
    conditions.push('c.estado = ?');
    params.push(estado);
  }
  if (barberoId) {
    conditions.push('c.barbero_id = ?');
    params.push(barberoId);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const [rows] = await pool.query(
    `SELECT c.id, c.codigo_reserva, c.fecha, c.hora_inicio, c.hora_fin,
            c.cliente_nombre, c.cliente_telefono, c.notas, c.estado, c.creado_en,
            c.servicio_id, COALESCE(s.nombre, 'Servicio eliminado') AS servicio_nombre,
            COALESCE(s.duracion_min, 0) AS duracion_min, COALESCE(s.precio, 0) AS precio,
            c.barbero_id, COALESCE(b.nombre, 'Sin barbero') AS barbero_nombre
     FROM citas c
     LEFT JOIN servicios s ON s.id = c.servicio_id
     LEFT JOIN barberos b ON b.id = c.barbero_id
     ${whereClause}
     ORDER BY c.fecha DESC, c.hora_inicio ASC, c.id DESC`,
    params
  );
  return rows;
}

async function deleteCita(id) {
  const [result] = await pool.query(`DELETE FROM citas WHERE id = ?`, [id]);
  return result.affectedRows > 0;
}

async function updateCitaEstado(id, nuevoEstado) {
  const [result] = await pool.query(
    `UPDATE citas SET estado = ? WHERE id = ?`,
    [nuevoEstado, id]
  );
  if (result.affectedRows === 0) {
    return null;
  }
  const [rows] = await pool.query(
    `SELECT id, codigo_reserva, estado, actualizado_en
     FROM citas
     WHERE id = ?
     LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

module.exports = {
  getActiveCitasByFecha,
  insertCita,
  listCitasAdmin,
  updateCitaEstado,
  deleteCita,
};

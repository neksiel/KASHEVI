const express = require('express');
const bcrypt = require('bcryptjs');
const adminRepo = require('../repositories/adminRepository');
const citasRepo = require('../repositories/citasRepository');
const bloqueosRepo = require('../repositories/bloqueosRepository');
const catalogoRepo = require('../repositories/catalogoRepository');
const { signAdminToken, requireAdminAuth } = require('../middleware/authAdmin');
const { AppError, asyncHandler } = require('../middleware/errorHandler');
const { isValidDateString, timeToMinutes, minutesToSqlTime } = require('../services/timeUtils');
const { normalizeBarberoId } = require('../services/agendaService');

const router = express.Router();
const VALID_STATES = new Set(['pendiente', 'confirmada', 'completada', 'cancelada']);

router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const usuario = typeof req.body?.usuario === 'string' ? req.body.usuario.trim() : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';

    if (!usuario || !password) {
      throw new AppError(400, 'Ingresa usuario y contraseña.');
    }

    const adminUser = await adminRepo.findByUsuario(usuario);
    if (!adminUser) {
      throw new AppError(401, 'Credenciales inválidas.');
    }

    const match = await bcrypt.compare(password, adminUser.password_hash);
    if (!match) {
      throw new AppError(401, 'Credenciales inválidas.');
    }

    const token = signAdminToken(adminUser);
    res.json({
      ok: true,
      data: {
        token,
        admin: {
          id: adminUser.id,
          usuario: adminUser.usuario,
          nombre: adminUser.nombre,
        },
      },
    });
  })
);

router.use(requireAdminAuth);

router.get('/me', (req, res) => {
  res.json({
    ok: true,
    data: {
      id: req.admin.sub,
      usuario: req.admin.usuario,
      nombre: req.admin.nombre,
    },
  });
});

// --- CITAS ---
router.get(
  '/citas',
  asyncHandler(async (req, res) => {
    const { fecha, estado, barbero_id: barberoIdRaw } = req.query;

    if (fecha && !isValidDateString(fecha)) {
      throw new AppError(400, 'Formato de fecha inválido (YYYY-MM-DD).');
    }
    if (estado && !VALID_STATES.has(estado)) {
      throw new AppError(400, 'Estado de cita no válido.');
    }
    const barberoId = normalizeBarberoId(barberoIdRaw);
    if (Number.isNaN(barberoId)) {
      throw new AppError(400, 'barbero_id inválido.');
    }

    const citas = await citasRepo.listCitasAdmin({
      fecha: fecha || null,
      estado: estado || null,
      barberoId,
    });

    const resumen = {
      total: citas.length,
      pendiente: citas.filter((c) => c.estado === 'pendiente').length,
      confirmada: citas.filter((c) => c.estado === 'confirmada').length,
      completada: citas.filter((c) => c.estado === 'completada').length,
      cancelada: citas.filter((c) => c.estado === 'cancelada').length,
    };

    res.json({ ok: true, data: citas, resumen });
  })
);

router.patch(
  '/citas/:id/estado',
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const estado = req.body?.estado;

    if (!Number.isInteger(id) || id <= 0) {
      throw new AppError(400, 'ID de cita inválido.');
    }
    if (!VALID_STATES.has(estado)) {
      throw new AppError(400, 'Estado permitido: pendiente, confirmada, completada o cancelada.');
    }

    const updated = await citasRepo.updateCitaEstado(id, estado);
    if (!updated) {
      throw new AppError(404, 'Cita no encontrada.');
    }

    res.json({ ok: true, data: updated });
  })
);

router.delete(
  '/citas/:id',
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      throw new AppError(400, 'ID de cita inválido.');
    }
    const deleted = await citasRepo.deleteCita(id);
    if (!deleted) {
      throw new AppError(404, 'Cita no encontrada.');
    }
    res.json({ ok: true, message: 'Cita eliminada.' });
  })
);

// --- BLOQUEOS DE HORARIO ---
router.get(
  '/bloqueos',
  asyncHandler(async (req, res) => {
    const { fecha } = req.query;
    if (fecha && !isValidDateString(fecha)) {
      throw new AppError(400, 'Formato de fecha inválido.');
    }
    const bloqueos = await bloqueosRepo.listBloqueos({ fecha: fecha || null });
    res.json({ ok: true, data: bloqueos });
  })
);

router.post(
  '/bloqueos',
  asyncHandler(async (req, res) => {
    const {
      barbero_id: barberoIdRaw,
      fecha,
      hora_inicio: horaInicioRaw,
      hora_fin: horaFinRaw,
      motivo: motivoRaw,
    } = req.body || {};

    const barberoId = normalizeBarberoId(barberoIdRaw);
    if (Number.isNaN(barberoId)) {
      throw new AppError(400, 'barbero_id inválido.');
    }
    if (barberoId !== null) {
      const barbero = await catalogoRepo.getBarberoById(barberoId);
      if (!barbero) {
        throw new AppError(404, 'Barbero no encontrado.');
      }
    }

    if (!isValidDateString(fecha)) {
      throw new AppError(400, 'Fecha inválida.');
    }

    let startMin;
    let endMin;
    try {
      startMin = timeToMinutes(horaInicioRaw);
      endMin = timeToMinutes(horaFinRaw);
    } catch {
      throw new AppError(400, 'Formato de hora inicio/fin inválido (HH:MM).');
    }

    if (endMin <= startMin) {
      throw new AppError(400, 'La hora fin debe ser posterior a la hora de inicio.');
    }

    const motivo = typeof motivoRaw === 'string' ? motivoRaw.trim() : '';
    if (motivo.length < 3 || motivo.length > 150) {
      throw new AppError(400, 'Indica un motivo (entre 3 y 150 caracteres).');
    }

    const bloqueo = await bloqueosRepo.createBloqueo({
      barberoId,
      fecha,
      horaInicio: minutesToSqlTime(startMin),
      horaFin: minutesToSqlTime(endMin),
      motivo,
    });

    res.status(201).json({ ok: true, data: bloqueo });
  })
);

router.delete(
  '/bloqueos/:id',
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      throw new AppError(400, 'ID de bloqueo inválido.');
    }
    const deleted = await bloqueosRepo.deleteBloqueo(id);
    if (!deleted) {
      throw new AppError(404, 'Bloqueo no encontrado.');
    }
    res.json({ ok: true, message: 'Bloqueo eliminado.' });
  })
);

// --- SERVICIOS ---
router.get(
  '/servicios',
  asyncHandler(async (_req, res) => {
    const servicios = await catalogoRepo.listAllServiciosAdmin();
    res.json({ ok: true, data: servicios });
  })
);

router.patch(
  '/servicios/:id',
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      throw new AppError(400, 'ID de servicio inválido.');
    }

    const nombre = typeof req.body?.nombre === 'string' ? req.body.nombre.trim() : '';
    const descripcionCorta = typeof req.body?.descripcion_corta === 'string' ? req.body.descripcion_corta.trim() : '';
    const descripcionDetalle = typeof req.body?.descripcion_detalle === 'string' ? req.body.descripcion_detalle.trim() : '';
    const duracionMin = Number(req.body?.duracion_min);
    const precio = Number(req.body?.precio);
    const activo = Boolean(req.body?.activo);

    if (nombre.length < 3 || descripcionCorta.length < 5 || descripcionDetalle.length < 5) {
      throw new AppError(400, 'Completa nombre y descripciones del servicio.');
    }
    if (!Number.isInteger(duracionMin) || duracionMin < 15 || duracionMin > 240) {
      throw new AppError(400, 'La duración debe estar entre 15 y 240 minutos.');
    }
    if (!Number.isFinite(precio) || precio <= 0) {
      throw new AppError(400, 'El precio debe ser mayor a 0.');
    }

    const updated = await catalogoRepo.updateServicioAdmin(id, {
      nombre,
      descripcionCorta,
      descripcionDetalle,
      duracionMin,
      precio,
      activo,
    });
    if (!updated) {
      throw new AppError(404, 'Servicio no encontrado.');
    }
    res.json({ ok: true, data: updated });
  })
);

// --- BARBEROS ---
router.get(
  '/barberos',
  asyncHandler(async (_req, res) => {
    const barberos = await catalogoRepo.listAllBarberosAdmin();
    res.json({ ok: true, data: barberos });
  })
);

router.post(
  '/barberos',
  asyncHandler(async (req, res) => {
    const nombre = typeof req.body?.nombre === 'string' ? req.body.nombre.trim() : '';
    const especialidad = typeof req.body?.especialidad === 'string' ? req.body.especialidad.trim() : '';
    if (nombre.length < 2 || especialidad.length < 3) {
      throw new AppError(400, 'Ingresa nombre y especialidad del barbero.');
    }
    const created = await catalogoRepo.createBarberoAdmin({ nombre, especialidad });
    res.status(201).json({ ok: true, data: created });
  })
);

router.patch(
  '/barberos/:id',
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      throw new AppError(400, 'ID de barbero inválido.');
    }
    const nombre = typeof req.body?.nombre === 'string' ? req.body.nombre.trim() : '';
    const especialidad = typeof req.body?.especialidad === 'string' ? req.body.especialidad.trim() : '';
    const activo = Boolean(req.body?.activo);
    if (nombre.length < 2 || especialidad.length < 3) {
      throw new AppError(400, 'Nombre y especialidad son obligatorios.');
    }
    const updated = await catalogoRepo.updateBarberoAdmin(id, { nombre, especialidad, activo });
    if (!updated) {
      throw new AppError(404, 'Barbero no encontrado.');
    }
    res.json({ ok: true, data: updated });
  })
);

// --- TESTIMONIOS ---
router.get(
  '/testimonios',
  asyncHandler(async (_req, res) => {
    const testimonios = await catalogoRepo.listAllTestimoniosAdmin();
    res.json({ ok: true, data: testimonios });
  })
);

router.post(
  '/testimonios',
  asyncHandler(async (req, res) => {
    const clienteNombre = typeof req.body?.cliente_nombre === 'string' ? req.body.cliente_nombre.trim() : '';
    const edad = Number(req.body?.edad);
    const comentario = typeof req.body?.comentario === 'string' ? req.body.comentario.trim() : '';
    if (clienteNombre.length < 2 || !Number.isInteger(edad) || edad < 15 || edad > 99 || comentario.length < 4) {
      throw new AppError(400, 'Ingresa nombre, edad válida (15-99) y comentario.');
    }
    const created = await catalogoRepo.createTestimonioAdmin({ clienteNombre, edad, comentario });
    res.status(201).json({ ok: true, data: created });
  })
);

router.patch(
  '/testimonios/:id',
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      throw new AppError(400, 'ID de testimonio inválido.');
    }
    const updated = await catalogoRepo.updateTestimonioVisible(id, Boolean(req.body?.visible));
    if (!updated) {
      throw new AppError(404, 'Testimonio no encontrado.');
    }
    res.json({ ok: true, data: updated });
  })
);

router.delete(
  '/testimonios/:id',
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      throw new AppError(400, 'ID de testimonio inválido.');
    }
    const deleted = await catalogoRepo.deleteTestimonioAdmin(id);
    if (!deleted) {
      throw new AppError(404, 'Testimonio no encontrado.');
    }
    res.json({ ok: true, message: 'Testimonio eliminado.' });
  })
);

// --- USUARIOS ADMINISTRADORES ---
router.get(
  '/usuarios',
  asyncHandler(async (_req, res) => {
    const admins = await adminRepo.listAdmins();
    res.json({ ok: true, data: admins });
  })
);

router.post(
  '/usuarios',
  asyncHandler(async (req, res) => {
    const usuario = typeof req.body?.usuario === 'string' ? req.body.usuario.trim().toLowerCase() : '';
    const nombre = typeof req.body?.nombre === 'string' ? req.body.nombre.trim() : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';

    if (!/^[a-z0-9_.-]{3,40}$/.test(usuario)) {
      throw new AppError(400, 'Usuario inválido (3-40 caracteres alfanuméricos sin espacios).');
    }
    if (nombre.length < 2) {
      throw new AppError(400, 'Ingresa el nombre del administrador.');
    }
    if (password.length < 6) {
      throw new AppError(400, 'La contraseña debe tener al menos 6 caracteres.');
    }

    const existing = await adminRepo.findByUsuario(usuario);
    if (existing) {
      throw new AppError(409, 'Ese nombre de usuario ya existe.');
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const created = await adminRepo.createAdmin({ usuario, passwordHash, nombre });
    res.status(201).json({ ok: true, data: created });
  })
);

router.patch(
  '/usuarios/password',
  asyncHandler(async (req, res) => {
    const passwordActual = typeof req.body?.password_actual === 'string' ? req.body.password_actual : '';
    const passwordNueva = typeof req.body?.password_nueva === 'string' ? req.body.password_nueva : '';

    if (!passwordActual || passwordNueva.length < 6) {
      throw new AppError(400, 'Ingresa tu contraseña actual y una nueva de al menos 6 caracteres.');
    }

    const adminUser = await adminRepo.findById(req.admin.sub);
    if (!adminUser) {
      throw new AppError(404, 'Administrador no encontrado.');
    }

    const match = await bcrypt.compare(passwordActual, adminUser.password_hash);
    if (!match) {
      throw new AppError(401, 'La contraseña actual no coincide.');
    }

    const newHash = await bcrypt.hash(passwordNueva, 10);
    await adminRepo.updateAdminPassword(adminUser.id, newHash);
    res.json({ ok: true, message: 'Contraseña actualizada correctamente.' });
  })
);

module.exports = router;

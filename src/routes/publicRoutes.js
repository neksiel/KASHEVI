const express = require('express');
const crypto = require('node:crypto');
const config = require('../config/env');
const { testConnection, withTransaction } = require('../config/db');
const catalogoRepo = require('../repositories/catalogoRepository');
const citasRepo = require('../repositories/citasRepository');
const bloqueosRepo = require('../repositories/bloqueosRepository');
const { AppError, asyncHandler } = require('../middleware/errorHandler');
const {
  isValidDateString,
  getWeekday,
  timeToMinutes,
  minutesToSqlTime,
  getLocalDateAndMinutes,
} = require('../services/timeUtils');
const {
  normalizeBarberoId,
  findAvailableBarbersForInterval,
  calculateAvailableSlots,
  generateBookingCode,
  buildWhatsAppUrl,
} = require('../services/agendaService');

const router = express.Router();

router.get(
  '/health',
  asyncHandler(async (_req, res) => {
    await testConnection();
    res.json({
      ok: true,
      service: 'kashevi-barbershop-api',
      database: 'connected',
    });
  })
);

router.get('/config', (_req, res) => {
  res.json({
    ok: true,
    data: {
      businessName: config.business.name,
      whatsapp: config.business.whatsapp,
      address: config.business.address,
      scheduleLabel: config.business.scheduleLabel,
      openHour: config.schedule.openHour,
      closeHour: config.schedule.closeHour,
      closedWeekdays: config.schedule.closedWeekdays,
    },
  });
});

router.get(
  '/servicios',
  asyncHandler(async (_req, res) => {
    const servicios = await catalogoRepo.getActiveServicios();
    res.json({ ok: true, data: servicios });
  })
);

router.get(
  '/barberos',
  asyncHandler(async (_req, res) => {
    const barberos = await catalogoRepo.getActiveBarberos();
    res.json({ ok: true, data: barberos });
  })
);

router.get(
  '/testimonios',
  asyncHandler(async (_req, res) => {
    const testimonios = await catalogoRepo.getVisibleTestimonios();
    res.json({ ok: true, data: testimonios });
  })
);

router.get(
  '/disponibilidad',
  asyncHandler(async (req, res) => {
    const { fecha, servicio_id: servicioIdRaw, barbero_id: barberoIdRaw } = req.query;

    const servicioId = Number(servicioIdRaw);
    if (!Number.isInteger(servicioId) || servicioId <= 0) {
      throw new AppError(400, 'Debes indicar un servicio_id válido.');
    }

    const barberoId = normalizeBarberoId(barberoIdRaw);
    if (Number.isNaN(barberoId)) {
      throw new AppError(400, 'El barbero_id indicado no es válido.');
    }

    if (!isValidDateString(fecha)) {
      throw new AppError(400, 'Debes indicar una fecha válida (YYYY-MM-DD).');
    }

    const servicio = await catalogoRepo.getServicioById(servicioId);
    if (!servicio) {
      throw new AppError(404, 'Servicio no encontrado o inactivo.');
    }

    if (barberoId !== null) {
      const barbero = await catalogoRepo.getBarberoById(barberoId);
      if (!barbero) {
        throw new AppError(404, 'Barbero no encontrado o inactivo.');
      }
    }

    const [barberos, citasActivas, bloqueos] = await Promise.all([
      catalogoRepo.getActiveBarberos(),
      citasRepo.getActiveCitasByFecha(fecha),
      bloqueosRepo.getBloqueosByFecha(fecha),
    ]);

    const resultado = calculateAvailableSlots({
      fecha,
      servicioDuracionMin: Number(servicio.duracion_min),
      barberos,
      citasActivas,
      bloqueos,
      barberoIdSolicitado: barberoId,
    });

    res.json({
      ok: true,
      data: {
        fecha,
        servicio: {
          id: servicio.id,
          nombre: servicio.nombre,
          duracion_min: servicio.duracion_min,
          precio: servicio.precio,
        },
        ...resultado,
      },
    });
  })
);

router.post(
  '/citas',
  asyncHandler(async (req, res) => {
    const {
      servicio_id: servicioIdRaw,
      barbero_id: barberoIdRaw,
      fecha,
      hora_inicio: horaInicioRaw,
      cliente_nombre: clienteNombreRaw,
      cliente_telefono: clienteTelefonoRaw,
      notas: notasRaw,
    } = req.body || {};

    const servicioId = Number(servicioIdRaw);
    if (!Number.isInteger(servicioId) || servicioId <= 0) {
      throw new AppError(400, 'Selecciona un servicio válido.');
    }

    const barberoIdSolicitado = normalizeBarberoId(barberoIdRaw);
    if (Number.isNaN(barberoIdSolicitado)) {
      throw new AppError(400, 'El barbero seleccionado no es válido.');
    }

    if (!isValidDateString(fecha)) {
      throw new AppError(400, 'Ingresa una fecha válida.');
    }

    const { fechaHoy, minutosAhora } = getLocalDateAndMinutes();
    if (fecha < fechaHoy) {
      throw new AppError(400, 'No es posible agendar citas en fechas pasadas.');
    }

    if (config.schedule.closedWeekdays.includes(getWeekday(fecha))) {
      throw new AppError(400, 'Los domingos no atendemos. Elige entre lunes y sábado.');
    }

    const horaInicioStr = typeof horaInicioRaw === 'string' ? horaInicioRaw.trim() : '';
    let startMin;
    try {
      startMin = timeToMinutes(horaInicioStr);
    } catch {
      throw new AppError(400, 'Selecciona una hora preferida válida (HH:MM).');
    }

    if (startMin % config.schedule.slotStepMin !== 0) {
      throw new AppError(400, 'La hora seleccionada no corresponde a un bloque válido.');
    }

    if (fecha === fechaHoy && startMin < minutosAhora + config.schedule.minLeadMin) {
      throw new AppError(400, 'Ese horario ya pasó o está demasiado próximo.');
    }

    const clienteNombre = typeof clienteNombreRaw === 'string' ? clienteNombreRaw.trim() : '';
    if (clienteNombre.length < 2 || clienteNombre.length > 120) {
      throw new AppError(400, 'Ingresa tu nombre completo (mínimo 2 caracteres).');
    }

    const telefonoLimpio =
      typeof clienteTelefonoRaw === 'string' ? clienteTelefonoRaw.replace(/\D/g, '') : '';
    if (telefonoLimpio.length < 9 || telefonoLimpio.length > 15) {
      throw new AppError(400, 'Ingresa un teléfono/WhatsApp válido (9 a 15 dígitos).');
    }

    const notas = typeof notasRaw === 'string' && notasRaw.trim() ? notasRaw.trim().slice(0, 255) : null;

    const created = await withTransaction(async (conn) => {
      const servicio = await catalogoRepo.getServicioById(servicioId, conn);
      if (!servicio) {
        throw new AppError(404, 'El servicio elegido no existe o está inactivo.');
      }

      if (barberoIdSolicitado !== null) {
        const barbero = await catalogoRepo.getBarberoById(barberoIdSolicitado, conn);
        if (!barbero) {
          throw new AppError(404, 'El barbero elegido no existe o está inactivo.');
        }
      }

      const endMin = startMin + Number(servicio.duracion_min);
      const openMin = config.schedule.openHour * 60;
      const closeMin = config.schedule.closeHour * 60;
      if (startMin < openMin || endMin > closeMin) {
        throw new AppError(
          400,
          'El servicio excede el horario de atención (09:00 a 22:00).'
        );
      }

      const [barberos, citasActivas, bloqueos] = await Promise.all([
        catalogoRepo.getActiveBarberos(conn, true),
        citasRepo.getActiveCitasByFecha(fecha, conn, true),
        bloqueosRepo.getBloqueosByFecha(fecha, conn),
      ]);

      const libres = findAvailableBarbersForInterval({
        barberos,
        citasActivas,
        bloqueos,
        startMin,
        endMin,
        barberoIdSolicitado,
      });

      if (!libres.length) {
        throw new AppError(
          409,
          'Ese turno acaba de ocuparse. Por favor selecciona otro horario disponible.'
        );
      }

      // Equilibra carga eligiendo el barbero libre con menos citas del día
      const cargaPorBarbero = new Map(libres.map((b) => [b.id, 0]));
      for (const cita of citasActivas) {
        if (cargaPorBarbero.has(cita.barbero_id)) {
          cargaPorBarbero.set(cita.barbero_id, cargaPorBarbero.get(cita.barbero_id) + 1);
        }
      }
      libres.sort((a, b) => cargaPorBarbero.get(a.id) - cargaPorBarbero.get(b.id));
      const barberoAsignado = libres[0];

      const codigoProvisional = `TMP-${crypto.randomUUID().slice(0, 12)}`;
      const cita = await citasRepo.insertCita(
        {
          codigoProvisional,
          servicioId: servicio.id,
          barberoId: barberoAsignado.id,
          clienteNombre,
          clienteTelefono: telefonoLimpio,
          fecha,
          horaInicio: minutesToSqlTime(startMin),
          horaFin: minutesToSqlTime(endMin),
          notas,
        },
        generateBookingCode,
        conn
      );

      return { cita, servicio, barbero: barberoAsignado };
    });

    const whatsappUrl = buildWhatsAppUrl({
      businessWhatsapp: config.business.whatsapp,
      cita: created.cita,
      servicio: created.servicio,
      barbero: created.barbero,
    });

    res.status(201).json({
      ok: true,
      message: '¡Cita reservada con éxito!',
      data: {
        ...created.cita,
        servicio_nombre: created.servicio.nombre,
        servicio_precio: created.servicio.precio,
        servicio_duracion_min: created.servicio.duracion_min,
        barbero_nombre: created.barbero.nombre,
        whatsapp_url: whatsappUrl,
      },
    });
  })
);

module.exports = router;

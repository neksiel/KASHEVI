const config = require('../config/env');
const {
  isValidDateString,
  getWeekday,
  timeToMinutes,
  minutesToTime,
  intervalsOverlap,
  getLocalDateAndMinutes,
  formatDateReadable,
} = require('./timeUtils');

const ACTIVE_BOOKING_STATES = new Set(['pendiente', 'confirmada']);

function normalizeBarberoId(value) {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : NaN;
}

function findAvailableBarbersForInterval({
  barberos,
  citasActivas,
  bloqueos,
  startMin,
  endMin,
  barberoIdSolicitado = null,
}) {
  const globalBlocked = bloqueos.some(
    (b) =>
      b.barbero_id === null &&
      intervalsOverlap(
        startMin,
        endMin,
        timeToMinutes(b.hora_inicio),
        timeToMinutes(b.hora_fin)
      )
  );
  if (globalBlocked) {
    return [];
  }

  const targetBarbers =
    barberoIdSolicitado !== null
      ? barberos.filter((b) => Number(b.id) === Number(barberoIdSolicitado))
      : barberos;

  return targetBarbers.filter((barbero) => {
    const barberId = Number(barbero.id);
    const hasBlock = bloqueos.some(
      (b) =>
        Number(b.barbero_id) === barberId &&
        intervalsOverlap(
          startMin,
          endMin,
          timeToMinutes(b.hora_inicio),
          timeToMinutes(b.hora_fin)
        )
    );
    if (hasBlock) {
      return false;
    }

    const hasOverlappingCita = citasActivas.some(
      (c) =>
        Number(c.barbero_id) === barberId &&
        ACTIVE_BOOKING_STATES.has(c.estado) &&
        intervalsOverlap(
          startMin,
          endMin,
          timeToMinutes(c.hora_inicio),
          timeToMinutes(c.hora_fin)
        )
    );
    return !hasOverlappingCita;
  });
}

function calculateAvailableSlots({
  fecha,
  servicioDuracionMin,
  barberos,
  citasActivas,
  bloqueos = [],
  barberoIdSolicitado = null,
  now = new Date(),
  schedule = config.schedule,
}) {
  if (!isValidDateString(fecha)) {
    return {
      valido: false,
      cerrado: true,
      motivo: 'Fecha inválida. Usa el formato YYYY-MM-DD.',
      slots: [],
    };
  }

  const { fechaHoy, minutosAhora } = getLocalDateAndMinutes(now);
  if (fecha < fechaHoy) {
    return {
      valido: true,
      cerrado: true,
      motivo: 'No es posible reservar en fechas anteriores a hoy.',
      slots: [],
    };
  }

  if (schedule.closedWeekdays.includes(getWeekday(fecha))) {
    return {
      valido: true,
      cerrado: true,
      motivo: 'Los domingos el estudio permanece cerrado (atención Lunes a Sábado).',
      slots: [],
    };
  }

  if (!barberos.length) {
    return {
      valido: true,
      cerrado: true,
      motivo: 'No hay barberos activos disponibles por el momento.',
      slots: [],
    };
  }

  const openMin = schedule.openHour * 60;
  const closeMin = schedule.closeHour * 60;
  const slots = [];

  for (let startMin = openMin; startMin + servicioDuracionMin <= closeMin; startMin += schedule.slotStepMin) {
    if (fecha === fechaHoy && startMin < minutosAhora + schedule.minLeadMin) {
      continue;
    }

    const endMin = startMin + servicioDuracionMin;
    const freeBarbers = findAvailableBarbersForInterval({
      barberos,
      citasActivas,
      bloqueos,
      startMin,
      endMin,
      barberoIdSolicitado,
    });

    if (freeBarbers.length > 0) {
      slots.push({
        hora: minutesToTime(startMin),
        hora_fin: minutesToTime(endMin),
        cupos_disponibles: freeBarbers.length,
        disponible: true,
      });
    }
  }

  return {
    valido: true,
    cerrado: false,
    motivo: slots.length ? null : 'No quedan horarios libres para esta fecha.',
    slots,
  };
}

function generateBookingCode(fecha, sequenceId) {
  const compactDate = fecha.replace(/-/g, '');
  const padded = String(sequenceId).padStart(4, '0');
  return `KSH-${compactDate}-${padded}`;
}

function buildWhatsAppUrl({ businessWhatsapp, cita, servicio, barbero }) {
  const messageLines = [
    'Hola *Kashevi Barbershop*, quiero confirmar mi cita:',
    '',
    `*Código:* ${cita.codigo_reserva}`,
    `*Servicio:* ${servicio.nombre} (${servicio.duracion_min} min — S/ ${Number(servicio.precio).toFixed(2)})`,
    `*Barbero:* ${barbero.nombre}`,
    `*Fecha:* ${formatDateReadable(cita.fecha)}`,
    `*Hora:* ${cita.hora_inicio.slice(0, 5)}`,
    `*Cliente:* ${cita.cliente_nombre}`,
    `*Teléfono:* ${cita.cliente_telefono}`,
  ];

  const encoded = encodeURIComponent(messageLines.join('\n'));
  return `https://wa.me/${businessWhatsapp}?text=${encoded}`;
}

module.exports = {
  normalizeBarberoId,
  findAvailableBarbersForInterval,
  calculateAvailableSlots,
  generateBookingCode,
  buildWhatsAppUrl,
};

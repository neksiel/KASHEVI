const test = require('node:test');
const assert = require('node:assert/strict');
const {
  calculateAvailableSlots,
  findAvailableBarbersForInterval,
  normalizeBarberoId,
} = require('../src/services/agendaService');

const mockBarberos = [
  { id: 1, nombre: 'Mateo Vargas', activo: 1 },
  { id: 2, nombre: 'Lucas Mendoza', activo: 1 },
  { id: 3, nombre: 'Sebastián Quispe', activo: 1 },
  { id: 4, nombre: 'Diego Paredes', activo: 1 },
];

test('Rechaza domingos por regla de negocio (Lunes a Sábado)', () => {
  // 2026-11-29 es domingo
  const result = calculateAvailableSlots({
    fecha: '2026-11-29',
    servicioDuracionMin: 45,
    barberos: mockBarberos,
    citasActivas: [],
    now: new Date(2026, 10, 24, 10, 0),
  });
  assert.equal(result.cerrado, true);
  assert.equal(result.slots.length, 0);
});

test('Respeta hora de cierre (22:00) según duración del servicio', () => {
  // Servicio de 60 min: el último turno válido debe iniciar a las 21:00
  const result = calculateAvailableSlots({
    fecha: '2026-11-25',
    servicioDuracionMin: 60,
    barberos: mockBarberos,
    citasActivas: [],
    now: new Date(2026, 10, 24, 10, 0),
  });
  const horas = result.slots.map((s) => s.hora);
  assert.equal(horas[0], '09:00');
  assert.equal(horas[horas.length - 1], '21:00');
  assert.equal(horas.includes('21:30'), false);
});

test('Oculta un horario solo cuando los 4 barberos están ocupados o bloqueados', () => {
  const citasActivas = [
    { barbero_id: 1, hora_inicio: '10:00:00', hora_fin: '10:45:00', estado: 'confirmada' },
    { barbero_id: 2, hora_inicio: '10:00:00', hora_fin: '10:45:00', estado: 'pendiente' },
    { barbero_id: 3, hora_inicio: '09:30:00', hora_fin: '10:30:00', estado: 'confirmada' },
    // Barbero 4 canceló su cita a las 10:00, así que sigue libre
    { barbero_id: 4, hora_inicio: '10:00:00', hora_fin: '10:45:00', estado: 'cancelada' },
  ];

  const libresConTresOcupados = findAvailableBarbersForInterval({
    barberos: mockBarberos,
    citasActivas,
    bloqueos: [],
    startMin: 10 * 60,
    endMin: 10 * 60 + 45,
  });
  assert.equal(libresConTresOcupados.length, 1);
  assert.equal(libresConTresOcupados[0].id, 4);

  // Si bloqueamos al barbero 4 en ese horario, quedan 0 cupos
  const libresConBloqueo = findAvailableBarbersForInterval({
    barberos: mockBarberos,
    citasActivas,
    bloqueos: [{ barbero_id: 4, hora_inicio: '10:00:00', hora_fin: '11:00:00' }],
    startMin: 10 * 60,
    endMin: 10 * 60 + 45,
  });
  assert.equal(libresConBloqueo.length, 0);
});

test('En la fecha de hoy omite turnos ya pasados', () => {
  const result = calculateAvailableSlots({
    fecha: '2026-11-24',
    servicioDuracionMin: 30,
    barberos: mockBarberos,
    citasActivas: [],
    now: new Date(2026, 10, 24, 19, 50), // 19:50 + 15 min lead = 20:05 => primer turno 20:30
  });
  assert.equal(result.slots[0].hora, '20:30');
});

test('normalizeBarberoId maneja opcionales e inválidos', () => {
  assert.equal(normalizeBarberoId(''), null);
  assert.equal(normalizeBarberoId(null), null);
  assert.equal(normalizeBarberoId('2'), 2);
  assert.equal(Number.isNaN(normalizeBarberoId('abc')), true);
});

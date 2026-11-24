   import { api } from './api.js';

function getTodayDateString() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getNextBusinessDateString() {
  const date = new Date();
  // Si hoy es domingo (0), sugiere lunes
  if (date.getDay() === 0) {
    date.setDate(date.getDate() + 1);
  }
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function setupAgenda() {
  const form = document.getElementById('agenda-form');
  const servicioSelect = document.getElementById('agenda-servicio');
  const fechaInput = document.getElementById('agenda-fecha');
  const horaSelect = document.getElementById('agenda-hora');
  const barberoSelect = document.getElementById('agenda-barbero');
  const nombreInput = document.getElementById('agenda-nombre');
  const telefonoInput = document.getElementById('agenda-telefono');
  const statusEl = document.getElementById('agenda-status');
  const submitBtn = document.getElementById('agenda-submit');
  const confirmacionBox = document.getElementById('agenda-confirmacion');

  if (!form) return;

  fechaInput.min = getTodayDateString();
  fechaInput.value = getNextBusinessDateString();

  function setStatus(message = '', type = '') {
    statusEl.textContent = message;
    statusEl.className = 'agenda-status';
    if (type) {
      statusEl.classList.add(`is-${type}`);
    }
  }

  function populateSelects({ servicios, barberos }) {
    const currentServicio = servicioSelect.value;
    servicioSelect.replaceChildren(new Option('Selecciona un servicio...', ''));
    servicios.forEach((s) => {
      const label = `${s.nombre} (${s.duracion_min} min — S/ ${Number(s.precio).toFixed(2)})`;
      servicioSelect.appendChild(new Option(label, String(s.id)));
    });
    if (currentServicio) {
      servicioSelect.value = currentServicio;
    } else if (servicios.length > 0) {
      servicioSelect.value = String(servicios[0].id);
    }

    barberoSelect.replaceChildren(
      new Option('Cualquier talento disponible (asignación automática)', '')
    );
    barberos.forEach((b) => {
      barberoSelect.appendChild(new Option(`${b.nombre} — ${b.especialidad}`, String(b.id)));
    });

    refreshAvailability();
  }

  async function refreshAvailability() {
    const servicioId = servicioSelect.value;
    const fecha = fechaInput.value;
    const barberoId = barberoSelect.value;

    horaSelect.disabled = true;
    horaSelect.replaceChildren(new Option('Consultando horarios...', ''));

    if (!servicioId || !fecha) {
      horaSelect.replaceChildren(new Option('Elige servicio y fecha', ''));
      setStatus('');
      return;
    }

    try {
      const res = await api.getDisponibilidad({ fecha, servicioId, barberoId });
      const data = res.data;

      if (data.cerrado || !data.slots.length) {
        horaSelect.replaceChildren(new Option('Sin horarios disponibles', ''));
        setStatus(data.motivo || 'No hay turnos libres para esa fecha.', 'warning');
        return;
      }

      horaSelect.replaceChildren(new Option('Elige una hora...', ''));
      data.slots.forEach((slot) => {
        const cuposLabel =
          slot.cupos_disponibles === 1
            ? '1 talento libre'
            : `${slot.cupos_disponibles} talentos libres`;
        horaSelect.appendChild(
          new Option(`${slot.hora} (${cuposLabel})`, slot.hora)
        );
      });
      horaSelect.disabled = false;
      setStatus(
        `${data.slots.length} horarios disponibles para ${data.servicio.nombre}.`,
        'success'
      );
    } catch (err) {
      horaSelect.replaceChildren(new Option('Error al cargar horarios', ''));
      setStatus(err.message, 'error');
    }
  }

  window.addEventListener('kashevi:catalog-loaded', (event) => {
    populateSelects(event.detail);
  });
  if (window.__kasheviCatalog) {
    populateSelects(window.__kasheviCatalog);
  }

  window.addEventListener('kashevi:select-service', (event) => {
    const id = String(event.detail.servicioId);
    if ([...servicioSelect.options].some((o) => o.value === id)) {
      servicioSelect.value = id;
      refreshAvailability();
    }
  });

  servicioSelect.addEventListener('change', refreshAvailability);
  fechaInput.addEventListener('change', refreshAvailability);
  barberoSelect.addEventListener('change', refreshAvailability);

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    confirmacionBox.hidden = true;

    const servicioId = Number(servicioSelect.value);
    const fecha = fechaInput.value;
    const horaInicio = horaSelect.value;
    const barberoId = barberoSelect.value ? Number(barberoSelect.value) : null;
    const clienteNombre = nombreInput.value.trim();
    const clienteTelefono = telefonoInput.value.replace(/\D/g, '');

    if (!servicioId) {
      setStatus('Por favor selecciona un servicio.', 'error');
      servicioSelect.focus();
      return;
    }
    if (!fecha) {
      setStatus('Por favor selecciona la fecha de tu cita.', 'error');
      fechaInput.focus();
      return;
    }
    if (!horaInicio) {
      setStatus('Selecciona una hora disponible para continuar.', 'error');
      horaSelect.focus();
      return;
    }
    if (clienteNombre.length < 2) {
      setStatus('Ingresa tu nombre completo (mínimo 2 caracteres).', 'error');
      nombreInput.focus();
      return;
    }
    if (clienteTelefono.length < 9 || clienteTelefono.length > 15) {
      setStatus('Ingresa un número de WhatsApp válido (mínimo 9 dígitos).', 'error');
      telefonoInput.focus();
      return;
    }

    submitBtn.disabled = true;
    setStatus('Confirmando disponibilidad en agenda...', '');

    try {
      const response = await api.crearCita({
        servicio_id: servicioId,
        barbero_id: barberoId,
        fecha,
        hora_inicio: horaInicio,
        cliente_nombre: clienteNombre,
        cliente_telefono: clienteTelefono,
      });

      const cita = response.data;
      setStatus('¡Cita registrada correctamente!', 'success');

      confirmacionBox.replaceChildren();
      const title = document.createElement('h3');
      title.textContent = `Reserva confirmada (${cita.codigo_reserva})`;

      const list = document.createElement('ul');
      const items = [
        ['Servicio: ', `${cita.servicio_nombre} (S/ ${Number(cita.servicio_precio).toFixed(2)})`],
        ['Talento asignado: ', cita.barbero_nombre],
        ['Fecha y hora: ', `${cita.fecha} · ${cita.hora_inicio.slice(0, 5)}`],
      ];
      items.forEach(([label, value]) => {
        const li = document.createElement('li');
        const strong = document.createElement('strong');
        strong.textContent = label;
        li.append(strong, document.createTextNode(value));
        list.appendChild(li);
      });

      const waLink = document.createElement('a');
      waLink.href = cita.whatsapp_url;
      waLink.target = '_blank';
      waLink.rel = 'noopener noreferrer';
      waLink.className = 'btn-pill-gold';
      waLink.textContent = 'Abrir confirmación en WhatsApp';

      confirmacionBox.append(title, list, waLink);
      confirmacionBox.hidden = false;

      form.reset();
      servicioSelect.value = String(servicioId);
      fechaInput.value = fecha;
      await refreshAvailability();

      window.open(cita.whatsapp_url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      setStatus(err.message, 'error');
      await refreshAvailability();
    } finally {
      submitBtn.disabled = false;
    }
  });
}

document.addEventListener('DOMContentLoaded', setupAgenda);

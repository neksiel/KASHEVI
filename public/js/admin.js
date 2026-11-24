import { api } from './api.js';

const TOKEN_STORAGE_KEY = 'kashevi_admin_token';

function getTodayDateString() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function setStatus(el, msg = '', type = '') {
  el.textContent = msg;
  el.className = 'agenda-status';
  if (type) el.classList.add(`is-${type}`);
}

document.addEventListener('DOMContentLoaded', () => {
  const loginSection = document.getElementById('admin-login-section');
  const dashboardSection = document.getElementById('admin-dashboard-section');
  const userBadge = document.getElementById('admin-user-badge');
  const logoutBtn = document.getElementById('admin-logout-btn');
  const loginForm = document.getElementById('admin-login-form');
  const loginStatus = document.getElementById('login-status');
  const loginSubmitBtn = document.getElementById('login-submit-btn');

  const tabs = document.querySelectorAll('.admin-tab');
  const panels = document.querySelectorAll('[data-panel]');

  const filtroFecha = document.getElementById('filtro-fecha');
  const filtroEstado = document.getElementById('filtro-estado');
  const filtroBarbero = document.getElementById('filtro-barbero');
  const btnFiltrar = document.getElementById('btn-filtrar');
  const btnVerTodas = document.getElementById('btn-ver-todas');
  const citasTbody = document.getElementById('citas-tbody');
  const citasStatus = document.getElementById('citas-status');

  const citasHoyTitulo = document.getElementById('citas-hoy-titulo');
  const hoyFiltroBarbero = document.getElementById('hoy-filtro-barbero');
  const btnHoyRefrescar = document.getElementById('btn-hoy-refrescar');
  const btnHoyNuevaCita = document.getElementById('btn-hoy-nueva-cita');
  const citasHoyTbody = document.getElementById('citas-hoy-tbody');
  const citasHoyStatus = document.getElementById('citas-hoy-status');

  const bloqueoForm = document.getElementById('bloqueo-form');
  const bloqueoBarbero = document.getElementById('bloqueo-barbero');
  const bloqueoFecha = document.getElementById('bloqueo-fecha');
  const bloqueoInicio = document.getElementById('bloqueo-inicio');
  const bloqueoFin = document.getElementById('bloqueo-fin');
  const bloqueoMotivo = document.getElementById('bloqueo-motivo');
  const bloqueoStatus = document.getElementById('bloqueo-status');
  const bloqueosList = document.getElementById('bloqueos-list');

  const serviciosAdminList = document.getElementById('servicios-admin-list');
  const serviciosAdminStatus = document.getElementById('servicios-admin-status');
  const barberosAdminList = document.getElementById('barberos-admin-list');
  const barberoForm = document.getElementById('barbero-form');
  const barberoStatus = document.getElementById('barbero-status');

  const testimoniosAdminList = document.getElementById('testimonios-admin-list');
  const testimonioForm = document.getElementById('testimonio-form');
  const testimonioStatus = document.getElementById('testimonio-status');

  const usuariosAdminList = document.getElementById('usuarios-admin-list');
  const nuevoAdminForm = document.getElementById('nuevo-admin-form');
  const nuevoAdminStatus = document.getElementById('nuevo-admin-status');
  const passwordForm = document.getElementById('password-form');
  const passwordStatus = document.getElementById('password-status');

  const nuevaCitaModal = document.getElementById('nueva-cita-modal');
  const btnOpenNuevaCita = document.getElementById('btn-open-nueva-cita');
  const btnCerrarNuevaCita = document.getElementById('cerrar-nueva-cita-modal');
  const btnCancelarNuevaCita = document.getElementById('cancelar-nueva-cita-modal');
  const nuevaCitaForm = document.getElementById('nueva-cita-form');
  const manualServicio = document.getElementById('manual-servicio');
  const manualFecha = document.getElementById('manual-fecha');
  const manualBarbero = document.getElementById('manual-barbero');
  const manualHora = document.getElementById('manual-hora');
  const manualCitaStatus = document.getElementById('manual-cita-status');

  let authToken = localStorage.getItem(TOKEN_STORAGE_KEY) || '';
  // Por defecto muestra TODAS las citas registradas en la base de datos
  filtroFecha.value = '';
  bloqueoFecha.value = getTodayDateString();
  manualFecha.min = getTodayDateString();
  manualFecha.value = getTodayDateString();

  function activateTab(tabName) {
    tabs.forEach((t) => t.classList.toggle('is-active', t.dataset.tab === tabName));
    panels.forEach((p) => {
      p.hidden = p.dataset.panel !== tabName;
    });
  }

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => activateTab(tab.dataset.tab));
  });

  function showLogin(message = '') {
    authToken = '';
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    loginSection.hidden = false;
    dashboardSection.hidden = true;
    logoutBtn.hidden = true;
    userBadge.hidden = true;
    userBadge.textContent = '';
    citasTbody.replaceChildren();
    citasHoyTbody.replaceChildren();
    if (message) setStatus(loginStatus, message, 'error');
  }

  async function showDashboard(adminUser) {
    loginSection.hidden = true;
    dashboardSection.hidden = false;
    logoutBtn.hidden = false;
    userBadge.hidden = false;
    userBadge.textContent = `${adminUser.nombre} (@${adminUser.usuario})`;
    citasHoyTitulo.textContent = `Agenda de Hoy (${getTodayDateString()})`;
    activateTab('citas-generales');

    await Promise.all([
      loadBarberosAdmin(),
      loadServiciosAdmin(),
      refreshBothCitasViews(),
      loadBloqueos(),
      loadTestimoniosAdmin(),
      loadUsuariosAdmin(),
    ]);
  }

  function handleAuthError(err, statusEl = citasStatus) {
    if (err.status === 401) {
      showLogin(err.message);
    } else {
      setStatus(statusEl, err.message, 'error');
    }
  }

  function renderKpis(prefix, resumen = {}) {
    document.getElementById(`${prefix}total`).textContent = String(resumen.total ?? 0);
    document.getElementById(`${prefix}pendiente`).textContent = String(resumen.pendiente ?? 0);
    document.getElementById(`${prefix}confirmada`).textContent = String(resumen.confirmada ?? 0);
    document.getElementById(`${prefix}completada`).textContent = String(resumen.completada ?? 0);
    document.getElementById(`${prefix}cancelada`).textContent = String(resumen.cancelada ?? 0);
  }

  function renderCitasTable({ citas, tbodyEl, statusEl, emptyMessage, showDate = true }) {
    tbodyEl.replaceChildren();

    if (!citas.length) {
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.colSpan = 7;
      td.textContent = emptyMessage;
      tr.appendChild(td);
      tbodyEl.appendChild(tr);
      return;
    }

    citas.forEach((cita) => {
      const tr = document.createElement('tr');

      const tdCodigo = document.createElement('td');
      tdCodigo.textContent = cita.codigo_reserva;

      const tdFechaHora = document.createElement('td');
      const horario = `${cita.hora_inicio.slice(0, 5)} - ${cita.hora_fin.slice(0, 5)}`;
      tdFechaHora.textContent = showDate ? `${cita.fecha} · ${horario}` : horario;

      const tdCliente = document.createElement('td');
      const nombreDiv = document.createElement('div');
      nombreDiv.textContent = cita.cliente_nombre;
      const digits = String(cita.cliente_telefono || '').replace(/\D/g, '');
      const waDigits = digits.length === 9 ? `51${digits}` : digits;
      const telLink = document.createElement('a');
      telLink.href = `https://wa.me/${waDigits}`;
      telLink.target = '_blank';
      telLink.rel = 'noopener noreferrer';
      telLink.style.color = 'var(--gold-cream)';
      telLink.style.fontSize = '0.82rem';
      telLink.textContent = `WhatsApp: ${cita.cliente_telefono}`;
      tdCliente.append(nombreDiv, telLink);

      const tdServicio = document.createElement('td');
      tdServicio.textContent = `${cita.servicio_nombre} (S/ ${Number(cita.precio).toFixed(2)})`;

      const tdBarbero = document.createElement('td');
      tdBarbero.textContent = cita.barbero_nombre;

      const tdEstado = document.createElement('td');
      const badge = document.createElement('span');
      badge.className = `estado-badge estado-${cita.estado}`;
      badge.textContent = cita.estado;
      tdEstado.appendChild(badge);

      const tdAccion = document.createElement('td');
      const actionWrap = document.createElement('div');
      actionWrap.style.display = 'flex';
      actionWrap.style.gap = '0.45rem';
      actionWrap.style.alignItems = 'center';

      const select = document.createElement('select');
      select.className = 'estado-select';
      ['pendiente', 'confirmada', 'completada', 'cancelada'].forEach((estadoOpt) => {
        const opt = new Option(estadoOpt, estadoOpt);
        opt.selected = estadoOpt === cita.estado;
        select.appendChild(opt);
      });
      select.addEventListener('change', async () => {
        try {
          await api.adminRequest(`/api/admin/citas/${cita.id}/estado`, authToken, {
            method: 'PATCH',
            body: JSON.stringify({ estado: select.value }),
          });
          setStatus(statusEl, `Cita ${cita.codigo_reserva} actualizada a "${select.value}".`, 'success');
          await refreshBothCitasViews();
        } catch (err) {
          handleAuthError(err, statusEl);
        }
      });

      const delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.className = 'btn-danger-sm';
      delBtn.textContent = 'Eliminar';
      delBtn.addEventListener('click', async () => {
        if (!window.confirm(`¿Eliminar la cita ${cita.codigo_reserva} de ${cita.cliente_nombre}?`)) {
          return;
        }
        try {
          await api.adminRequest(`/api/admin/citas/${cita.id}`, authToken, { method: 'DELETE' });
          setStatus(statusEl, `Cita ${cita.codigo_reserva} eliminada.`, 'success');
          await refreshBothCitasViews();
        } catch (err) {
          handleAuthError(err, statusEl);
        }
      });

      actionWrap.append(select, delBtn);
      tdAccion.appendChild(actionWrap);

      tr.append(tdCodigo, tdFechaHora, tdCliente, tdServicio, tdBarbero, tdEstado, tdAccion);
      tbodyEl.appendChild(tr);
    });
  }

  async function loadCitasGenerales() {
    const params = new URLSearchParams();
    if (filtroFecha.value) params.set('fecha', filtroFecha.value);
    if (filtroEstado.value) params.set('estado', filtroEstado.value);
    if (filtroBarbero.value) params.set('barbero_id', filtroBarbero.value);

    try {
      const res = await api.adminRequest(`/api/admin/citas?${params.toString()}`, authToken);
      renderKpis('kpi-', res.resumen);
      renderCitasTable({
        citas: res.data || [],
        tbodyEl: citasTbody,
        statusEl: citasStatus,
        emptyMessage: 'No hay citas registradas para el filtro actual.',
        showDate: true,
      });
    } catch (err) {
      handleAuthError(err, citasStatus);
    }
  }

  async function loadCitasHoy() {
    const params = new URLSearchParams({ fecha: getTodayDateString() });
    if (hoyFiltroBarbero.value) params.set('barbero_id', hoyFiltroBarbero.value);

    try {
      const res = await api.adminRequest(`/api/admin/citas?${params.toString()}`, authToken);
      const citasHoy = (res.data || []).slice().sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio));
      renderKpis('hoy-kpi-', res.resumen);
      renderCitasTable({
        citas: citasHoy,
        tbodyEl: citasHoyTbody,
        statusEl: citasHoyStatus,
        emptyMessage: 'No hay citas programadas para hoy.',
        showDate: false,
      });
    } catch (err) {
      handleAuthError(err, citasHoyStatus);
    }
  }

  async function refreshBothCitasViews() {
    await Promise.all([loadCitasGenerales(), loadCitasHoy()]);
  }

  async function loadBloqueos() {
    try {
      const res = await api.adminRequest('/api/admin/bloqueos', authToken);
      const bloqueos = res.data || [];
      bloqueosList.replaceChildren();

      if (!bloqueos.length) {
        const p = document.createElement('p');
        p.className = 'agenda-status';
        p.textContent = 'No hay bloqueos manuales registrados.';
        bloqueosList.appendChild(p);
        return;
      }

      bloqueos.forEach((b) => {
        const item = document.createElement('div');
        item.className = 'admin-list-item';

        const info = document.createElement('div');
        const title = document.createElement('strong');
        title.textContent = `${b.fecha} · ${b.hora_inicio.slice(0, 5)} - ${b.hora_fin.slice(0, 5)}`;
        const sub = document.createElement('div');
        sub.style.color = 'var(--text-muted)';
        sub.style.fontSize = '0.85rem';
        sub.textContent = `${b.barbero_nombre} · ${b.motivo}`;
        info.append(title, sub);

        const delBtn = document.createElement('button');
        delBtn.type = 'button';
        delBtn.className = 'btn-danger-sm';
        delBtn.textContent = 'Eliminar';
        delBtn.addEventListener('click', async () => {
          try {
            await api.adminRequest(`/api/admin/bloqueos/${b.id}`, authToken, { method: 'DELETE' });
            await loadBloqueos();
          } catch (err) {
            handleAuthError(err, bloqueoStatus);
          }
        });

        item.append(info, delBtn);
        bloqueosList.appendChild(item);
      });
    } catch (err) {
      handleAuthError(err, bloqueoStatus);
    }
  }

  async function loadServiciosAdmin() {
    try {
      const res = await api.adminRequest('/api/admin/servicios', authToken);
      const servicios = res.data || [];
      serviciosAdminList.replaceChildren();
      manualServicio.replaceChildren();

      servicios.forEach((s) => {
        if (s.activo) {
          manualServicio.appendChild(
            new Option(`${s.nombre} (${s.duracion_min} min — S/ ${Number(s.precio).toFixed(2)})`, String(s.id))
          );
        }

        const row = document.createElement('div');
        row.className = 'service-edit-card';

        const nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.className = 'inline-input';
        nameInput.value = s.nombre;
        nameInput.setAttribute('aria-label', `Nombre ${s.nombre}`);

        const durInput = document.createElement('input');
        durInput.type = 'number';
        durInput.className = 'inline-input inline-input--sm';
        durInput.value = String(s.duracion_min);
        durInput.min = '15';
        durInput.max = '240';
        durInput.title = 'Duración (min)';

        const priceInput = document.createElement('input');
        priceInput.type = 'number';
        priceInput.step = '0.50';
        priceInput.className = 'inline-input inline-input--sm';
        priceInput.value = String(s.precio);
        priceInput.title = 'Precio (S/)';

        const activeLabel = document.createElement('label');
        activeLabel.style.display = 'flex';
        activeLabel.style.alignItems = 'center';
        activeLabel.style.gap = '0.4rem';
        activeLabel.style.fontSize = '0.84rem';
        const activeCheck = document.createElement('input');
        activeCheck.type = 'checkbox';
        activeCheck.checked = Boolean(s.activo);
        activeLabel.append(activeCheck, document.createTextNode('Activo'));

        const saveBtn = document.createElement('button');
        saveBtn.type = 'button';
        saveBtn.className = 'btn-sm btn-sm--gold';
        saveBtn.textContent = 'Guardar';
        saveBtn.addEventListener('click', async () => {
          try {
            await api.adminRequest(`/api/admin/servicios/${s.id}`, authToken, {
              method: 'PATCH',
              body: JSON.stringify({
                nombre: nameInput.value.trim(),
                descripcion_corta: s.descripcion_corta,
                descripcion_detalle: s.descripcion_detalle,
                duracion_min: Number(durInput.value),
                precio: Number(priceInput.value),
                activo: activeCheck.checked,
              }),
            });
            setStatus(serviciosAdminStatus, `Servicio "${nameInput.value.trim()}" actualizado.`, 'success');
            await loadServiciosAdmin();
          } catch (err) {
            handleAuthError(err, serviciosAdminStatus);
          }
        });

        row.append(nameInput, durInput, priceInput, activeLabel, saveBtn);
        serviciosAdminList.appendChild(row);
      });
    } catch (err) {
      handleAuthError(err, serviciosAdminStatus);
    }
  }

  async function loadBarberosAdmin() {
    try {
      const res = await api.adminRequest('/api/admin/barberos', authToken);
      const barberos = res.data || [];

      const prevFiltro = filtroBarbero.value;
      const prevHoyFiltro = hoyFiltroBarbero.value;
      filtroBarbero.replaceChildren(new Option('Todos los talentos', ''));
      hoyFiltroBarbero.replaceChildren(new Option('Todos los talentos', ''));
      bloqueoBarbero.replaceChildren(new Option('Todo el estudio (cierre general)', ''));
      manualBarbero.replaceChildren(new Option('Asignación automática', ''));
      barberosAdminList.replaceChildren();

      barberos.forEach((b) => {
        filtroBarbero.appendChild(new Option(b.nombre, String(b.id)));
        hoyFiltroBarbero.appendChild(new Option(b.nombre, String(b.id)));
        if (b.activo) {
          bloqueoBarbero.appendChild(new Option(b.nombre, String(b.id)));
          manualBarbero.appendChild(new Option(b.nombre, String(b.id)));
        }

        const item = document.createElement('div');
        item.className = 'admin-list-item';

        const info = document.createElement('div');
        const title = document.createElement('strong');
        title.textContent = b.nombre;
        const sub = document.createElement('div');
        sub.style.color = 'var(--text-muted)';
        sub.style.fontSize = '0.84rem';
        sub.textContent = b.especialidad;
        info.append(title, sub);

        const toggleBtn = document.createElement('button');
        toggleBtn.type = 'button';
        toggleBtn.className = 'btn-sm';
        toggleBtn.textContent = b.activo ? 'Desactivar' : 'Activar';
        toggleBtn.addEventListener('click', async () => {
          try {
            await api.adminRequest(`/api/admin/barberos/${b.id}`, authToken, {
              method: 'PATCH',
              body: JSON.stringify({
                nombre: b.nombre,
                especialidad: b.especialidad,
                activo: !b.activo,
              }),
            });
            await loadBarberosAdmin();
          } catch (err) {
            handleAuthError(err, barberoStatus);
          }
        });

        item.append(info, toggleBtn);
        barberosAdminList.appendChild(item);
      });

      if (prevFiltro) filtroBarbero.value = prevFiltro;
      if (prevHoyFiltro) hoyFiltroBarbero.value = prevHoyFiltro;
    } catch (err) {
      handleAuthError(err, barberoStatus);
    }
  }

  async function loadTestimoniosAdmin() {
    try {
      const res = await api.adminRequest('/api/admin/testimonios', authToken);
      const list = res.data || [];
      testimoniosAdminList.replaceChildren();

      list.forEach((t) => {
        const item = document.createElement('div');
        item.className = 'admin-list-item';

        const info = document.createElement('div');
        const title = document.createElement('strong');
        title.textContent = `${t.cliente_nombre}, ${t.edad} años`;
        const sub = document.createElement('div');
        sub.style.color = 'var(--text-muted)';
        sub.style.fontSize = '0.84rem';
        sub.textContent = `“${t.comentario}”`;
        info.append(title, sub);

        const actions = document.createElement('div');
        actions.style.display = 'flex';
        actions.style.gap = '0.5rem';

        const visBtn = document.createElement('button');
        visBtn.type = 'button';
        visBtn.className = 'btn-sm';
        visBtn.textContent = t.visible ? 'Ocultar' : 'Mostrar';
        visBtn.addEventListener('click', async () => {
          try {
            await api.adminRequest(`/api/admin/testimonios/${t.id}`, authToken, {
              method: 'PATCH',
              body: JSON.stringify({ visible: !t.visible }),
            });
            await loadTestimoniosAdmin();
          } catch (err) {
            handleAuthError(err, testimonioStatus);
          }
        });

        const delBtn = document.createElement('button');
        delBtn.type = 'button';
        delBtn.className = 'btn-danger-sm';
        delBtn.textContent = 'Eliminar';
        delBtn.addEventListener('click', async () => {
          try {
            await api.adminRequest(`/api/admin/testimonios/${t.id}`, authToken, { method: 'DELETE' });
            await loadTestimoniosAdmin();
          } catch (err) {
            handleAuthError(err, testimonioStatus);
          }
        });

        actions.append(visBtn, delBtn);
        item.append(info, actions);
        testimoniosAdminList.appendChild(item);
      });
    } catch (err) {
      handleAuthError(err, testimonioStatus);
    }
  }

  async function loadUsuariosAdmin() {
    try {
      const res = await api.adminRequest('/api/admin/usuarios', authToken);
      const admins = res.data || [];
      usuariosAdminList.replaceChildren();

      admins.forEach((a) => {
        const item = document.createElement('div');
        item.className = 'admin-list-item';
        const info = document.createElement('div');
        const title = document.createElement('strong');
        title.textContent = `${a.nombre} (@${a.usuario})`;
        const sub = document.createElement('div');
        sub.style.color = 'var(--text-muted)';
        sub.style.fontSize = '0.82rem';
        sub.textContent = a.activo ? 'Cuenta activa' : 'Cuenta inactiva';
        info.append(title, sub);
        item.appendChild(info);
        usuariosAdminList.appendChild(item);
      });
    } catch (err) {
      handleAuthError(err, nuevoAdminStatus);
    }
  }

  async function refreshManualSlots() {
    if (!manualServicio.value || !manualFecha.value) return;
    manualHora.replaceChildren(new Option('Consultando...', ''));
    try {
      const res = await api.getDisponibilidad({
        fecha: manualFecha.value,
        servicioId: manualServicio.value,
        barberoId: manualBarbero.value,
      });
      const slots = res.data?.slots || [];
      if (!slots.length) {
        manualHora.replaceChildren(new Option('Sin horarios disponibles', ''));
        setStatus(manualCitaStatus, res.data?.motivo || 'Sin turnos.', 'warning');
        return;
      }
      manualHora.replaceChildren();
      slots.forEach((s) => {
        manualHora.appendChild(new Option(`${s.hora} (${s.cupos_disponibles} cupos)`, s.hora));
      });
      setStatus(manualCitaStatus, '');
    } catch (err) {
      setStatus(manualCitaStatus, err.message, 'error');
    }
  }

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginSubmitBtn.disabled = true;
    setStatus(loginStatus, 'Validando credenciales...', '');
    try {
      const res = await api.adminLogin({
        usuario: document.getElementById('login-usuario').value.trim(),
        password: document.getElementById('login-password').value,
      });
      authToken = res.data.token;
      localStorage.setItem(TOKEN_STORAGE_KEY, authToken);
      loginForm.reset();
      setStatus(loginStatus, '');
      await showDashboard(res.data.admin);
    } catch (err) {
      setStatus(loginStatus, err.message, 'error');
    } finally {
      loginSubmitBtn.disabled = false;
    }
  });

  logoutBtn.addEventListener('click', () => showLogin());

  btnFiltrar.addEventListener('click', loadCitasGenerales);
  filtroFecha.addEventListener('change', loadCitasGenerales);
  filtroEstado.addEventListener('change', loadCitasGenerales);
  filtroBarbero.addEventListener('change', loadCitasGenerales);
  btnVerTodas.addEventListener('click', () => {
    filtroFecha.value = '';
    filtroEstado.value = '';
    filtroBarbero.value = '';
    loadCitasGenerales();
  });

  hoyFiltroBarbero.addEventListener('change', loadCitasHoy);
  btnHoyRefrescar.addEventListener('click', loadCitasHoy);

  async function openNuevaCitaModal(defaultDate = null) {
    if (defaultDate) manualFecha.value = defaultDate;
    nuevaCitaModal.hidden = false;
    document.body.style.overflow = 'hidden';
    await refreshManualSlots();
  }

  function closeNuevaCitaModal() {
    nuevaCitaModal.hidden = true;
    document.body.style.overflow = '';
  }

  btnOpenNuevaCita.addEventListener('click', () => openNuevaCitaModal());
  btnHoyNuevaCita.addEventListener('click', () => openNuevaCitaModal(getTodayDateString()));
  btnCerrarNuevaCita.addEventListener('click', closeNuevaCitaModal);
  btnCancelarNuevaCita?.addEventListener('click', closeNuevaCitaModal);
  nuevaCitaModal.addEventListener('click', (e) => {
    if (e.target === nuevaCitaModal) closeNuevaCitaModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !nuevaCitaModal.hidden) closeNuevaCitaModal();
  });

  manualServicio.addEventListener('change', refreshManualSlots);
  manualFecha.addEventListener('change', refreshManualSlots);
  manualBarbero.addEventListener('change', refreshManualSlots);

  nuevaCitaForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!manualServicio.value || !manualHora.value) {
      setStatus(manualCitaStatus, 'Selecciona un servicio y una hora disponible.', 'error');
      return;
    }
    setStatus(manualCitaStatus, 'Registrando cita...', '');
    try {
      await api.crearCita({
        servicio_id: Number(manualServicio.value),
        barbero_id: manualBarbero.value ? Number(manualBarbero.value) : null,
        fecha: manualFecha.value,
        hora_inicio: manualHora.value,
        cliente_nombre: document.getElementById('manual-nombre').value.trim(),
        cliente_telefono: document.getElementById('manual-telefono').value.trim(),
      });
      nuevaCitaForm.reset();
      manualFecha.value = getTodayDateString();
      closeNuevaCitaModal();
      setStatus(citasStatus, 'Cita manual registrada correctamente.', 'success');
      setStatus(citasHoyStatus, 'Cita manual registrada correctamente.', 'success');
      await refreshBothCitasViews();
    } catch (err) {
      setStatus(manualCitaStatus, err.message, 'error');
    }
  });

  bloqueoForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    setStatus(bloqueoStatus, 'Guardando bloqueo...', '');
    try {
      await api.adminRequest('/api/admin/bloqueos', authToken, {
        method: 'POST',
        body: JSON.stringify({
          barbero_id: bloqueoBarbero.value ? Number(bloqueoBarbero.value) : null,
          fecha: bloqueoFecha.value,
          hora_inicio: bloqueoInicio.value,
          hora_fin: bloqueoFin.value,
          motivo: bloqueoMotivo.value.trim(),
        }),
      });
      bloqueoMotivo.value = '';
      setStatus(bloqueoStatus, 'Bloqueo guardado correctamente.', 'success');
      await loadBloqueos();
    } catch (err) {
      handleAuthError(err, bloqueoStatus);
    }
  });

  barberoForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    setStatus(barberoStatus, 'Guardando barbero...', '');
    try {
      await api.adminRequest('/api/admin/barberos', authToken, {
        method: 'POST',
        body: JSON.stringify({
          nombre: document.getElementById('barbero-nombre').value.trim(),
          especialidad: document.getElementById('barbero-especialidad').value.trim(),
        }),
      });
      barberoForm.reset();
      setStatus(barberoStatus, 'Barbero agregado.', 'success');
      await loadBarberosAdmin();
    } catch (err) {
      handleAuthError(err, barberoStatus);
    }
  });

  testimonioForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    setStatus(testimonioStatus, 'Publicando...', '');
    try {
      await api.adminRequest('/api/admin/testimonios', authToken, {
        method: 'POST',
        body: JSON.stringify({
          cliente_nombre: document.getElementById('testimonio-nombre').value.trim(),
          edad: Number(document.getElementById('testimonio-edad').value),
          comentario: document.getElementById('testimonio-comentario').value.trim(),
        }),
      });
      testimonioForm.reset();
      setStatus(testimonioStatus, 'Testimonio publicado.', 'success');
      await loadTestimoniosAdmin();
    } catch (err) {
      handleAuthError(err, testimonioStatus);
    }
  });

  nuevoAdminForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    setStatus(nuevoAdminStatus, 'Creando administrador...', '');
    try {
      await api.adminRequest('/api/admin/usuarios', authToken, {
        method: 'POST',
        body: JSON.stringify({
          nombre: document.getElementById('new-admin-nombre').value.trim(),
          usuario: document.getElementById('new-admin-usuario').value.trim(),
          password: document.getElementById('new-admin-password').value,
        }),
      });
      nuevoAdminForm.reset();
      setStatus(nuevoAdminStatus, 'Administrador creado con éxito.', 'success');
      await loadUsuariosAdmin();
    } catch (err) {
      handleAuthError(err, nuevoAdminStatus);
    }
  });

  passwordForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    setStatus(passwordStatus, 'Actualizando contraseña...', '');
    try {
      await api.adminRequest('/api/admin/usuarios/password', authToken, {
        method: 'PATCH',
        body: JSON.stringify({
          password_actual: document.getElementById('pwd-actual').value,
          password_nueva: document.getElementById('pwd-nueva').value,
        }),
      });
      passwordForm.reset();
      setStatus(passwordStatus, 'Contraseña actualizada.', 'success');
    } catch (err) {
      handleAuthError(err, passwordStatus);
    }
  });

  if (authToken) {
    api
      .adminRequest('/api/admin/me', authToken)
      .then((res) => showDashboard(res.data))
      .catch(() => showLogin());
  } else {
    showLogin();
  }
});

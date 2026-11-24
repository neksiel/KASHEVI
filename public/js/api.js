async function requestJson(url, options = {}) {
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  });

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok || !payload?.ok) {
    const message = payload?.error || `Error de comunicación (${response.status}).`;
    const err = new Error(message);
    err.status = response.status;
    throw err;
  }

  return payload;
}

export const api = {
  getServicios: () => requestJson('/api/servicios'),
  getBarberos: () => requestJson('/api/barberos'),
  getTestimonios: () => requestJson('/api/testimonios'),
  getDisponibilidad: ({ fecha, servicioId, barberoId }) => {
    const params = new URLSearchParams({
      fecha,
      servicio_id: String(servicioId),
    });
    if (barberoId) {
      params.set('barbero_id', String(barberoId));
    }
    return requestJson(`/api/disponibilidad?${params.toString()}`);
  },
  crearCita: (body) =>
    requestJson('/api/citas', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  adminLogin: (body) =>
    requestJson('/api/admin/login', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  adminRequest: (path, token, options = {}) =>
    requestJson(path, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(options.headers || {}),
      },
    }),
};

import { api } from './api.js';

const state = {
  servicios: [],
  barberos: [],
  testimonios: [],
  testimonioIndex: 0,
  selectedModalServicioId: null,
};

function setupNavigation() {
  const toggle = document.getElementById('nav-toggle');
  const menu = document.getElementById('nav-menu');
  if (!toggle || !menu) return;

  toggle.addEventListener('click', () => {
    const open = menu.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', String(open));
  });

  menu.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      menu.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
    });
  });
}

function setupRitualObserver() {
  const steps = document.querySelectorAll('.ritual-step');
  if (!('IntersectionObserver' in window)) {
    steps.forEach((step) => step.classList.add('is-visible'));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.18 }
  );

  steps.forEach((step, idx) => {
    step.style.transitionDelay = `${idx * 90}ms`;
    observer.observe(step);
  });
}

function renderBarberosStrip(barberos) {
  const container = document.getElementById('barberos-strip');
  if (!container) return;
  container.replaceChildren();

  barberos.forEach((barbero) => {
    const pill = document.createElement('span');
    pill.className = 'talento-pill';
    pill.textContent = `${barbero.nombre} · ${barbero.especialidad}`;
    container.appendChild(pill);
  });
}

function renderServicios(servicios) {
  const grid = document.getElementById('servicios-grid');
  if (!grid) return;
  grid.replaceChildren();

  servicios.forEach((servicio) => {
    const card = document.createElement('article');
    card.className = 'servicio-card';

    const title = document.createElement('h3');
    title.className = 'servicio-card__title';
    title.textContent = servicio.nombre;

    const media = document.createElement('div');
    media.className = 'servicio-card__media';
    const img = document.createElement('img');
    img.src = servicio.imagen_url;
    img.alt = servicio.nombre;
    img.loading = 'lazy';
    media.appendChild(img);

    const meta = document.createElement('div');
    meta.className = 'servicio-card__meta';
    meta.textContent = `${servicio.duracion_min} min · S/ ${Number(servicio.precio).toFixed(2)}`;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'servicio-card__btn';
    btn.textContent = '+ DETALLES';
    btn.addEventListener('click', () => openServicioModal(servicio));

    card.append(title, media, meta, btn);
    grid.appendChild(card);
  });
}

function openServicioModal(servicio) {
  const modal = document.getElementById('servicio-modal');
  if (!modal) return;

  state.selectedModalServicioId = servicio.id;
  document.getElementById('modal-servicio-img').src = servicio.imagen_url;
  document.getElementById('modal-servicio-img').alt = servicio.nombre;
  document.getElementById('modal-servicio-titulo').textContent = servicio.nombre;
  document.getElementById('modal-servicio-duracion').textContent = `Duración: ${servicio.duracion_min} min`;
  document.getElementById('modal-servicio-precio').textContent = `Inversión: S/ ${Number(servicio.precio).toFixed(2)}`;
  document.getElementById('modal-servicio-desc').textContent = servicio.descripcion_detalle;

  modal.hidden = false;
  document.body.style.overflow = 'hidden';
}

function closeServicioModal() {
  const modal = document.getElementById('servicio-modal');
  if (!modal) return;
  modal.hidden = true;
  document.body.style.overflow = '';
}

function setupModalEvents() {
  const modal = document.getElementById('servicio-modal');
  const closeBtn = document.getElementById('modal-close');
  const bookBtn = document.getElementById('modal-reservar-btn');

  closeBtn?.addEventListener('click', closeServicioModal);
  modal?.addEventListener('click', (event) => {
    if (event.target === modal) closeServicioModal();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && modal && !modal.hidden) {
      closeServicioModal();
    }
  });

  bookBtn?.addEventListener('click', () => {
    const servicioId = state.selectedModalServicioId;
    closeServicioModal();
    if (servicioId) {
      window.dispatchEvent(
        new CustomEvent('kashevi:select-service', { detail: { servicioId } })
      );
    }
    document.getElementById('agenda')?.scrollIntoView({ behavior: 'smooth' });
  });
}

function createTestimonioElement(item, variant, onClickSide = null) {
  const card = document.createElement('article');
  card.className = `testimonio-card testimonio-card--${variant}`;

  const photoWrap = document.createElement('div');
  photoWrap.className = 'testimonio-card__photo';
  const img = document.createElement('img');
  img.src = item.foto_url || 'img/nosotros-barber.jpg';
  img.alt = `${item.cliente_nombre}, ${item.edad} años`;
  img.loading = 'lazy';
  photoWrap.appendChild(img);

  const name = document.createElement('h3');
  name.className = 'testimonio-card__name';
  name.textContent = `${item.cliente_nombre}, ${item.edad} AÑOS`;

  const quote = document.createElement('p');
  quote.className = 'testimonio-card__quote';
  quote.textContent = `“${item.comentario}”`;

  card.append(photoWrap, name, quote);

  if (variant === 'side' && onClickSide) {
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.addEventListener('click', onClickSide);
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onClickSide();
      }
    });
  }

  return card;
}

function renderTestimoniosCarousel() {
  const container = document.getElementById('testimonios-carousel');
  if (!container) return;

  const list = state.testimonios;
  if (!list.length) {
    container.innerHTML = '<p class="agenda-status">Pronto compartiremos más experiencias.</p>';
    return;
  }

  const total = list.length;
  const centerIdx = ((state.testimonioIndex % total) + total) % total;
  const leftIdx = (centerIdx - 1 + total) % total;
  const rightIdx = (centerIdx + 1) % total;

  const prevBtn = document.createElement('button');
  prevBtn.type = 'button';
  prevBtn.className = 'carousel-arrow';
  prevBtn.setAttribute('aria-label', 'Testimonio anterior');
  prevBtn.textContent = '←';
  prevBtn.addEventListener('click', () => {
    state.testimonioIndex = leftIdx;
    renderTestimoniosCarousel();
  });

  const nextBtn = document.createElement('button');
  nextBtn.type = 'button';
  nextBtn.className = 'carousel-arrow';
  nextBtn.setAttribute('aria-label', 'Siguiente testimonio');
  nextBtn.textContent = '→';
  nextBtn.addEventListener('click', () => {
    state.testimonioIndex = rightIdx;
    renderTestimoniosCarousel();
  });

  const leftCard = createTestimonioElement(list[leftIdx], 'side', () => {
    state.testimonioIndex = leftIdx;
    renderTestimoniosCarousel();
  });
  const centerCard = createTestimonioElement(list[centerIdx], 'center');
  const rightCard = createTestimonioElement(list[rightIdx], 'side', () => {
    state.testimonioIndex = rightIdx;
    renderTestimoniosCarousel();
  });

  container.replaceChildren(leftCard, prevBtn, centerCard, nextBtn, rightCard);
}

async function initLanding() {
  setupNavigation();
  setupRitualObserver();
  setupModalEvents();

  try {
    const [serviciosRes, barberosRes, testimoniosRes, configRes] = await Promise.all([
      api.getServicios(),
      api.getBarberos(),
      api.getTestimonios(),
      fetch('/api/config').then((r) => r.json()).catch(() => null),
    ]);

    if (configRes?.ok && configRes.data?.whatsapp) {
      const waLink = document.getElementById('ubicacion-whatsapp-link');
      if (waLink) {
        const num = String(configRes.data.whatsapp);
        waLink.href = `https://wa.me/${num}`;
        const localNum = num.startsWith('51') && num.length === 11 ? num.slice(2) : num;
        waLink.textContent = localNum.replace(/(\d{3})(?=\d)/g, '$1 ').trim();
      }
    }

    state.servicios = serviciosRes.data || [];
    state.barberos = barberosRes.data || [];
    state.testimonios = testimoniosRes.data || [];

    // Inicia centrado en Pedro (índice 1) igual que el diseño PDF
    state.testimonioIndex = state.testimonios.length > 1 ? 1 : 0;

    renderServicios(state.servicios);
    renderBarberosStrip(state.barberos);
    renderTestimoniosCarousel();

    const catalogPayload = { servicios: state.servicios, barberos: state.barberos };
    window.__kasheviCatalog = catalogPayload;
    window.dispatchEvent(
      new CustomEvent('kashevi:catalog-loaded', { detail: catalogPayload })
    );
  } catch (err) {
    const grid = document.getElementById('servicios-grid');
    if (grid) {
      grid.innerHTML = `<p class="agenda-status is-error">${err.message}</p>`;
    }
  }
}

document.addEventListener('DOMContentLoaded', initLanding);

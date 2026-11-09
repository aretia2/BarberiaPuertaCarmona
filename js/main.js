/* Barbería Puerta Carmona — interacción sin dependencias. */
(function () {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const smooth = (v) => {
    const t = clamp(v);
    return t * t * (3 - 2 * t);
  };

  /* ---------- Cabecera: fondo al bajar, se esconde al seguir bajando ---------- */
  const header = $('[data-header]');
  const mobilebar = $('[data-mobilebar]');
  const hero = $('.hero');
  let lastY = window.scrollY;

  const onScroll = () => {
    const y = window.scrollY;
    header.classList.toggle('is-scrolled', y > 20);
    const menuOpen = nav.classList.contains('is-open');
    header.classList.toggle('is-hidden', !menuOpen && y > lastY && y > window.innerHeight * 0.9);
    lastY = y;
    mobilebar.classList.toggle('is-visible', y > hero.offsetHeight * 0.6);
  };

  /* ---------- Menú móvil ---------- */
  const nav = $('[data-nav]');
  const burger = $('[data-burger]');
  const setMenu = (open) => {
    nav.classList.toggle('is-open', open);
    burger.setAttribute('aria-expanded', String(open));
    burger.querySelector('.visually-hidden').textContent = open ? 'Cerrar menú' : 'Abrir menú';
    document.body.style.overflow = open ? 'hidden' : '';
  };
  burger.addEventListener('click', () => setMenu(!nav.classList.contains('is-open')));
  $$('a', nav).forEach((a) => a.addEventListener('click', () => setMenu(false)));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && nav.classList.contains('is-open')) {
      setMenu(false);
      burger.focus();
    }
  });

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- Enlace activo del menú ---------- */
  const links = $$('.nav ul a');
  const sections = links.map((a) => $(a.getAttribute('href'))).filter(Boolean);
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          if (!en.isIntersecting) return;
          links.forEach((a) => a.classList.toggle('is-current', a.getAttribute('href') === `#${en.target.id}`));
        });
      },
      { rootMargin: '-45% 0px -50% 0px' },
    );
    sections.forEach((s) => io.observe(s));
  }

  /* ---------- Horario y estado "abierto ahora" (hora de Madrid) ---------- */
  // 0 = domingo. Sábado sin franjas confirmadas: se remite a Booksy.
  const SLOTS = { 1: [[570, 870], [930, 1080]], 2: [[570, 870], [930, 1080]], 3: [[570, 870], [930, 1080]], 4: [[570, 870], [930, 1080]], 5: [[570, 870], [930, 1080]] };
  const madrid = () => {
    const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Madrid', weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date());
    const get = (t) => parts.find((p) => p.type === t).value;
    const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday'));
    return { day, min: (parseInt(get('hour'), 10) % 24) * 60 + parseInt(get('minute'), 10) };
  };
  const fmt = (m) => `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`;

  const updateStatus = () => {
    const { day, min } = madrid();
    const today = SLOTS[day] || [];
    const slot = today.find(([a, b]) => min >= a && min < b);
    let text;
    if (slot) text = `Abierto · hasta las ${fmt(slot[1])}`;
    else if (day === 6) text = 'Sábado · mira huecos en Booksy';
    else {
      const next = today.find(([a]) => min < a);
      text = next ? `Cerrado · abre a las ${fmt(next[0])}` : 'Cerrado ahora · reserva en Booksy';
    }
    $$('[data-status]').forEach((el) => {
      el.classList.toggle('is-open', Boolean(slot));
      el.querySelector('b').textContent = text;
    });
    $$('[data-hours] tr').forEach((tr) => tr.classList.toggle('is-today', Number(tr.dataset.day) === day));
  };
  updateStatus();
  setInterval(updateStatus, 60000);

  const year = $('[data-year]');
  if (year) year.textContent = String(new Date().getFullYear());

  /* ---------- Revelado al entrar en pantalla ---------- */
  const revealTargets = $$('.section-head, .menu__item, .house__copy > *, .house__photos, .barber, .score, .quote, .final__in > *, .visit__info > *, .visit__map, .band__quote');
  if ('IntersectionObserver' in window && !reduced.matches) {
    revealTargets.forEach((el) => el.classList.add('reveal'));
    const ro = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          if (!en.isIntersecting) return;
          en.target.classList.add('is-in');
          ro.unobserve(en.target);
        });
      },
      { rootMargin: '0px 0px -8% 0px' },
    );
    revealTargets.forEach((el) => ro.observe(el));
  } else {
    $$('.score').forEach((el) => el.classList.add('is-in'));
  }

  /* ---------- Parallax suave en arcos y banda ---------- */
  const para = $$('[data-parallax]');
  if (para.length && !reduced.matches) {
    let ticking = false;
    const paint = () => {
      const vh = window.innerHeight;
      para.forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.bottom < -100 || r.top > vh + 100) return;
        const k = parseFloat(el.dataset.parallax);
        const offset = (r.top + r.height / 2 - vh / 2) * k;
        const target = el.matches('.band__img') ? el : el.querySelector('img');
        target.style.setProperty('--py', `${(-offset).toFixed(1)}px`);
      });
      ticking = false;
    };
    window.addEventListener('scroll', () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(paint);
      }
    }, { passive: true });
    window.addEventListener('resize', paint);
    paint();
  }

  /* ---------- Secuencia de trabajos a pantalla completa (modelo 03) ----------
     El marco se fija y el scroll funde cada trío sobre el anterior; las fotos se alejan despacio
     y al final la escena se oscurece. */
  const seq = $('[data-seq]');
  const PER_FRAME = 1;
  const HOLD = 0.6;
  const STAGGER = 0.18;

  if (seq && !reduced.matches) {
    const sticky = $('[data-seq-sticky]', seq);
    const frames = $$('[data-frame]', seq);
    const panels = frames.map((li) => $$('[data-panel]', li));
    const count = $('[data-seq-count]', seq);
    const bar = $('[data-seq-bar]', seq);
    const shade = $('[data-seq-shade]', seq);
    const total = seq.dataset.total || '';

    let start = 0;
    let run = 1;
    let vh = window.innerHeight;
    let target = 0;
    let current = 0;
    let raf = 0;

    const measure = () => {
      vh = window.innerHeight;
      run = Math.max(1, (frames.length - 1) * PER_FRAME * vh);
      seq.style.height = `${vh + run + HOLD * vh}px`;
      start = seq.getBoundingClientRect().top + window.scrollY;
    };

    const render = () => {
      current += (target - current) * 0.14;
      if (Math.abs(target - current) < 0.5) current = target;

      const t = frames.length > 1 ? clamp(current / run) : 1;
      const seg = t * (frames.length - 1);
      const ops = frames.map((_, i) => (i === 0 ? 1 : smooth(seg - (i - 1))));
      let active = 0;
      let best = -1;

      frames.forEach((li, i) => {
        const scale = 1.18 - (0.18 * clamp(seg - i + 1, 0, 2)) / 2;
        panels[i].forEach((panel, j) => {
          const o = i === 0 ? 1 : smooth((seg - (i - 1) - j * STAGGER) / (1 - 2 * STAGGER));
          panel.style.setProperty('--o', o.toFixed(3));
          panel.style.setProperty('--s', scale.toFixed(4));
        });
        const weight = ops[i] * (1 - (ops[i + 1] ?? 0));
        li.style.setProperty('--w', smooth(weight * 2.5 - 1.2).toFixed(3));
        if (weight > best) {
          best = weight;
          active = i;
        }
      });
      frames.forEach((li, i) => li.classList.toggle('is-active', i === active));
      seq.classList.toggle('is-last', active === frames.length - 1);

      if (count) count.textContent = `${frames[active].dataset.range} / ${total}`;
      if (bar) bar.style.setProperty('--p', t.toFixed(4));
      if (shade) shade.style.setProperty('--shade', (smooth((current - run - HOLD * vh * 0.3) / (HOLD * vh * 0.7)) * 0.75).toFixed(3));

      raf = current === target ? 0 : requestAnimationFrame(render);
    };

    const kick = () => {
      target = clamp(window.scrollY - start, 0, run + HOLD * vh);
      if (!raf) raf = requestAnimationFrame(render);
    };

    document.documentElement.classList.add('seq-on');
    measure();
    target = current = clamp(window.scrollY - start, 0, run + HOLD * vh);
    render();

    window.addEventListener('scroll', kick, { passive: true });
    window.addEventListener('resize', () => {
      measure();
      kick();
    });
    // Las fuentes y fotos pueden mover la posición de la sección al cargar.
    window.addEventListener('load', () => {
      measure();
      kick();
    });

    // Con teclado: al enfocar una foto, llevar el scroll hasta su trío.
    sticky.addEventListener('focusin', (e) => {
      const i = frames.findIndex((li) => li.contains(e.target));
      if (i < 0 || frames[i].classList.contains('is-active')) return;
      window.scrollTo({ top: start + (i / Math.max(1, frames.length - 1)) * run, behavior: 'auto' });
    });
  }

  /* ---------- Mapa: solo se carga Google Maps si el visitante lo pide ---------- */
  const map = $('[data-map]');
  if (map) {
    $('[data-map-load]', map).addEventListener('click', () => {
      const frame = document.createElement('iframe');
      frame.title = 'Mapa: Barbería Puerta Carmona, Calle Luis Montoto 3, Sevilla';
      frame.src = map.dataset.map;
      frame.referrerPolicy = 'no-referrer-when-downgrade';
      map.replaceWith(frame);
    });
  }

  /* ---------- Visor a pantalla completa ---------- */
  const lb = $('[data-lightbox]');
  const openers = $$('.work__open');
  if (lb && openers.length && typeof lb.showModal === 'function') {
    const img = $('[data-lb-img]', lb);
    const cap = $('[data-lb-caption]', lb);
    const cnt = $('[data-lb-count]', lb);
    let idx = 0;
    let lastFocus = null;

    const show = (i) => {
      idx = (i + openers.length) % openers.length;
      const b = openers[idx];
      img.src = b.dataset.full;
      img.alt = b.querySelector('img').alt;
      cap.textContent = b.dataset.caption;
      cnt.textContent = `${String(idx + 1).padStart(2, '0')} / ${String(openers.length).padStart(2, '0')}`;
    };

    openers.forEach((b, i) =>
      b.addEventListener('click', () => {
        lastFocus = b;
        show(i);
        lb.showModal();
        document.body.style.overflow = 'hidden';
      }),
    );
    const close = () => lb.close();
    lb.addEventListener('close', () => {
      document.body.style.overflow = '';
      if (lastFocus) lastFocus.focus({ preventScroll: true });
    });
    $('[data-lb-close]', lb).addEventListener('click', close);
    $('[data-lb-prev]', lb).addEventListener('click', () => show(idx - 1));
    $('[data-lb-next]', lb).addEventListener('click', () => show(idx + 1));
    lb.addEventListener('click', (e) => {
      if (e.target === lb || e.target.classList.contains('lb__figure')) close();
    });
    lb.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') show(idx - 1);
      if (e.key === 'ArrowRight') show(idx + 1);
    });

    // Deslizar en móvil
    let x0 = null;
    lb.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; }, { passive: true });
    lb.addEventListener('touchend', (e) => {
      if (x0 === null) return;
      const dx = e.changedTouches[0].clientX - x0;
      if (Math.abs(dx) > 50) show(idx + (dx < 0 ? 1 : -1));
      x0 = null;
    });
  }
})();

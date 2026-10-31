// Gamez4jali shared script: nav, reveals, slideshows, game tabs, lightbox
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // nav background once scrolled
  const nav = $('.nav');
  const onScroll = () => nav && nav.classList.toggle('scrolled', scrollY > 20);
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // highlight the nav link of the section in view
  const navLinks = $$('.nav-links a[href^="#"]');
  if (navLinks.length) {
    const spy = new IntersectionObserver(entries => entries.forEach(e => {
      if (e.isIntersecting) navLinks.forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + e.target.id));
    }), { rootMargin: '-45% 0px -50% 0px' });
    navLinks.forEach(a => { const s = $(a.getAttribute('href')); if (s) spy.observe(s); });
    // the last section is too short to reach the middle band, so mark it once the page bottom is reached
    addEventListener('scroll', () => {
      if (innerHeight + scrollY >= document.documentElement.scrollHeight - 4) navLinks.forEach((a, n) => a.classList.toggle('active', n === navLinks.length - 1));
    }, { passive: true });
  }

  // count-up numbers
  const countUp = el => {
    const end = +el.dataset.count, suffix = el.dataset.suffix || '', t0 = performance.now(), dur = 1400;
    const tick = t => {
      const p = Math.min((t - t0) / dur, 1);
      el.textContent = Math.round(end * (1 - Math.pow(1 - p, 3))) + suffix;
      if (p < 1) requestAnimationFrame(tick);
    };
    reduce ? (el.textContent = end + suffix) : requestAnimationFrame(tick);
  };

  // reveal on scroll
  const io = new IntersectionObserver(entries => entries.forEach(e => {
    if (!e.isIntersecting) return;
    e.target.classList.add('in');
    $$('[data-count]', e.target).forEach(countUp);
    io.unobserve(e.target);
  }), { threshold: .15 });
  $$('.reveal').forEach(el => io.observe(el));

  // cursor spotlight on cards
  $$('.card').forEach(c => c.addEventListener('pointermove', e => {
    const r = c.getBoundingClientRect();
    c.style.setProperty('--mx', e.clientX - r.left + 'px');
    c.style.setProperty('--my', e.clientY - r.top + 'px');
  }));

  // phone slideshows: <div class="screen" data-slides> with <img> children, optional .dots and .arrow siblings
  const slideshow = (screen, { interval = 2800, onChange } = {}) => {
    const imgs = $$('img', screen);
    const scope = screen.closest('[data-slide-scope]') || screen.parentElement;
    const dots = $('.dots', scope);
    let i = 0, timer = null;
    if (dots) dots.innerHTML = imgs.map((_, n) => `<button type="button" aria-label="Screenshot ${n + 1}"></button>`).join('');
    const show = n => {
      i = (n + imgs.length) % imgs.length;
      imgs.forEach((im, k) => { im.classList.toggle('on', k === i); if (k === i || k === (i + 1) % imgs.length) im.loading = 'eager'; });
      if (dots) $$('button', dots).forEach((d, k) => d.classList.toggle('on', k === i));
      if (onChange) onChange(i);
    };
    const stop = () => { clearInterval(timer); timer = null; };
    const start = () => { stop(); if (!reduce && imgs.length > 1) timer = setInterval(() => show(i + 1), interval); };
    if (dots) $$('button', dots).forEach((d, k) => d.addEventListener('click', () => { show(k); start(); }));
    $$('.arrow', scope).forEach(a => a.addEventListener('click', () => { show(i + (a.dataset.dir === 'prev' ? -1 : 1)); start(); }));
    screen.addEventListener('pointerenter', stop);
    screen.addEventListener('pointerleave', start);
    show(0);
    return { show, start, stop, current: () => imgs[i] };
  };

  // lightbox
  const box = $('.lightbox');
  const openBox = img => {
    if (!box) return;
    const bi = $('img', box);
    bi.src = img.currentSrc || img.src;
    bi.alt = img.alt;
    box.showModal();
  };
  if (box) box.addEventListener('click', e => { if (e.target === box || e.target.closest('.close')) box.close(); });
  $$('.gallery button').forEach(b => b.addEventListener('click', () => openBox($('img', b))));

  // game page: single phone
  $$('.g-stage .screen[data-slides]').forEach(s => {
    const show = slideshow(s);
    show.start();
    s.closest('.phone').addEventListener('click', () => openBox(show.current()));
  });

  // home: game tabs + panels
  const tabs = $$('.tab');
  const panels = $$('.panel');
  const showcase = $('.showcase');
  const shows = new Map();
  const select = (id, focus) => {
    const panel = $('#' + CSS.escape(id));
    if (!panel || !panels.includes(panel)) return false;
    tabs.forEach(t => {
      const on = t.getAttribute('aria-controls') === id;
      t.setAttribute('aria-selected', on);
      t.tabIndex = on ? 0 : -1;
      if (on && focus) t.focus();
      if (on) t.scrollIntoView({ block: 'nearest', inline: 'center', behavior: reduce ? 'auto' : 'smooth' });
    });
    panels.forEach(p => {
      const on = p === panel;
      p.hidden = !on;
      p.classList.remove('enter');
      if (on) { void p.offsetWidth; p.classList.add('enter'); }
      const s = shows.get(p);
      if (s) on ? (s.show(0), s.start()) : s.stop();
    });
    const c = getComputedStyle(panel).getPropertyValue('--c').trim();
    if (showcase) showcase.style.setProperty('--c', c);
    return true;
  };
  panels.forEach(p => {
    const screen = $('.screen[data-slides]', p);
    if (!screen) return;
    const s = slideshow(screen);
    s.stop();
    shows.set(p, s);
    screen.closest('.phone').addEventListener('click', () => openBox(s.current()));
  });
  tabs.forEach((t, n) => {
    t.addEventListener('click', () => select(t.getAttribute('aria-controls')));
    t.addEventListener('keydown', e => {
      const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (d) select(tabs[(n + d + tabs.length) % tabs.length].getAttribute('aria-controls'), true);
    });
  });
  // links to a game (#tap-cricket-go etc.) open its tab and scroll to the showcase
  const games = $('#games');
  const fromHash = (hash, scroll) => {
    if (hash && select(hash.slice(1)) && scroll && games) games.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
  };
  $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
    const h = a.getAttribute('href');
    if (panels.some(p => '#' + p.id === h)) { e.preventDefault(); fromHash(h, true); history.replaceState(null, '', h); }
  }));
  if (panels.length) {
    if (!(location.hash && panels.some(p => '#' + p.id === location.hash) && (fromHash(location.hash, false), setTimeout(() => games && games.scrollIntoView(), 50), true))) select(panels[0].id);
  }

  // home: hero phone cycles through each game
  const heroScreen = $('.hero-stage .screen');
  if (heroScreen && panels.length) {
    const data = panels.map(p => ({ id: p.id, name: $('h3', p).textContent, icon: $('.p-head img', p).src, c: getComputedStyle(p).getPropertyValue('--c').trim(), shot: $('.screen img', p).src }));
    heroScreen.innerHTML = data.map((d, n) => `<img src="${d.shot}" alt="${d.name} gameplay" ${n ? 'loading="lazy"' : ''}>`).join('');
    const stage = $('.hero-stage'), np = $('.now-playing');
    const s = slideshow(heroScreen, {
      interval: 3200,
      onChange: n => {
        const d = data[n];
        stage.style.setProperty('--c', d.c);
        document.documentElement.style.setProperty('--c', d.c);
        if (np) { $('img', np).src = d.icon; $('strong', np).textContent = d.name; np.href = '#' + d.id; }
      }
    });
    s.start();
  }

  // home: screenshot marquee, games interleaved
  const track = $('.marquee-track');
  if (track && panels.length) {
    const lists = panels.map(p => $$('.screen img', p).map(i => ({ src: i.src, alt: i.alt })));
    const mixed = [];
    for (let k = 0; k < Math.max(...lists.map(l => l.length)); k++) lists.forEach(l => l[k] && mixed.push(l[k]));
    const html = mixed.map(m => `<img src="${m.src}" alt="${m.alt}" loading="lazy">`).join('');
    track.innerHTML = html + html.replace(/alt="[^"]*"/g, 'alt="" aria-hidden="true"');
  }
})();

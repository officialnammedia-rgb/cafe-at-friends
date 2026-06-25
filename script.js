/* CAF — Coffee at Friends — interactions */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  /* ---------- ALWAYS START AT THE TOP (no stale #hash jump) ---------- */
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  if (location.hash) history.replaceState(null, '', location.pathname + location.search);
  window.scrollTo(0, 0);
  window.addEventListener('load', () => window.scrollTo(0, 0));

  /* ---------- LOADER ---------- */
  const loader = $('#loader');
  const loaderVideo = $('#loaderVideo');
  const loaderFilmBg = $('.loader__filmbg');
  const heat = $('.loader__heat');
  const heatFill = $('.loader__heat-fill');
  const heatText = $('.loader__heat-text');
  const SVG_HOLD_MS = 4400;     // timing of the SVG fallback animation
  const VIDEO_CAP_MS = 30000;   // absolute failsafe: never trap a visitor on the loader
  const END_LEAD_S = 0.5;       // hand off this many seconds before the clip ends
  const KNOWN_DUR_S = 8;        // loader.mp4 length in seconds (drives the heat
                                // strip scale and the handoff point)
  const loaderReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Coffee "heat strip": cold/white -> hot/red, tracking the film's progress.
  const HEAT_STOPS = [
    [0.00, [ 60, 200, 255]],
    [0.22, [ 79, 168, 255]],
    [0.52, [255, 194,  74]],
    [0.76, [255, 122,  46]],
    [1.00, [242,  45,  45]]
  ];
  const mix = (a, b, t) => Math.round(a + (b - a) * t);
  const heatColor = (p) => {
    for (let i = 1; i < HEAT_STOPS.length; i++) {
      if (p <= HEAT_STOPS[i][0] || i === HEAT_STOPS.length - 1) {
        const [p0, c0] = HEAT_STOPS[i - 1], [p1, c1] = HEAT_STOPS[i];
        const t = Math.max(0, Math.min(1, (p - p0) / (p1 - p0 || 1)));
        return `rgb(${mix(c0[0], c1[0], t)}, ${mix(c0[1], c1[1], t)}, ${mix(c0[2], c1[2], t)})`;
      }
    }
    return 'rgb(215, 50, 43)';
  };
  const heatWord = (p) =>
    p < 0.20 ? 'Cold brew' :
    p < 0.45 ? 'Warming up' :
    p < 0.70 ? 'Brewing' :
    p < 0.90 ? 'Piping hot' : 'Hot & ready';
  const updateHeat = (p) => {
    if (!heat) return;
    const c = Math.max(0, Math.min(1, p));
    heatFill.style.width = (c * 100) + '%';
    heat.style.setProperty('--heat', heatColor(c));
    const w = heatWord(c);
    if (heatText && heatText.textContent !== w) {
      heatText.textContent = w;
      heatText.classList.remove('is-swap');
      void heatText.offsetWidth;   // restart the fade
      heatText.classList.add('is-swap');
    }
  };
  const finalizeHeat = () => {
    if (!heat) return;
    heatFill.style.width = '100%';
    heat.style.setProperty('--heat', heatColor(1));
    if (heatText && heatText.textContent !== 'Hot & ready') {
      heatText.textContent = 'Hot & ready';
      heatText.classList.remove('is-swap');
      void heatText.offsetWidth;
      heatText.classList.add('is-swap');
    }
    heat.classList.add('is-ready');
  };

  let loaderDone = false;
  let rafId;
  const finishLoad = () => {
    if (loaderDone) return;
    loaderDone = true;
    if (rafId) cancelAnimationFrame(rafId);
    finalizeHeat();
    window.scrollTo(0, 0);
    document.body.classList.remove('loading');
    loader.classList.add('is-done');
    setTimeout(() => loader.remove(), 1200);
  };

  const startVideoLoader = () => {
    loader.classList.add('is-video');

    let started = false;

    // The heat strip AND the handoff follow the video's ACTUAL playback position
    // (currentTime), so the bar waits while the clip is still buffering and the
    // film is never cut short by a timer that ran ahead during download.
    const tick = () => {
      const t = loaderVideo.currentTime || 0;
      updateHeat(t / KNOWN_DUR_S);
      if (started && t >= KNOWN_DUR_S - END_LEAD_S) { finishLoad(); return; }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);

    loaderVideo.addEventListener('ended', finishLoad, { once: true });
    loaderVideo.addEventListener('error', () => {
      loader.classList.remove('is-video');
      setTimeout(finishLoad, SVG_HOLD_MS);
    }, { once: true });

    // Start the blurred backdrop ONLY once the main film is actually playing, so
    // it doesn't download in parallel and slow the main clip's start.
    loaderVideo.addEventListener('playing', () => {
      if (started) return;
      started = true;
      if (loaderFilmBg && loaderFilmBg.play) {
        const pb = loaderFilmBg.play();
        if (pb && pb.catch) pb.catch(() => {});
      }
    });

    const p = loaderVideo.play();
    if (p && p.catch) p.catch(() => {
      // Autoplay blocked — drop back to the SVG fallback.
      loader.classList.remove('is-video');
      setTimeout(finishLoad, SVG_HOLD_MS);
    });

    // Safety nets: if the film never starts playing, bail after a short wait;
    // plus an absolute failsafe in case it stalls indefinitely mid-play.
    setTimeout(() => { if (!started) finishLoad(); }, 12000);
    setTimeout(finishLoad, VIDEO_CAP_MS);
  };

  const startLoader = () => {
    window.scrollTo(0, 0);
    const canVideo = loaderVideo && !loaderReducedMotion &&
      loaderVideo.canPlayType && loaderVideo.canPlayType('video/mp4');
    if (canVideo) startVideoLoader();
    else setTimeout(finishLoad, SVG_HOLD_MS);
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', startLoader);
  else startLoader();

  /* ---------- NAV ---------- */
  const nav = $('#nav');
  const onScroll = () => nav.classList.toggle('is-scrolled', window.scrollY > 24);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  const mt = $('#menuToggle');
  mt && mt.addEventListener('click', () => {
    const open = nav.classList.toggle('is-open');
    mt.setAttribute('aria-expanded', String(open));
  });
  $$('.nav__links a').forEach(a => a.addEventListener('click', () => {
    nav.classList.remove('is-open');
    mt && mt.setAttribute('aria-expanded', 'false');
  }));

  /* ---------- REVEAL ---------- */
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  $$('.reveal').forEach(el => io.observe(el));

  /* ---------- MENU ---------- */
  const menuCards = $('#menuCards');
  if (menuCards) {
    const ORDER_URL = '#reserve'; // TODO: replace with your ordering link (Swiggy / Zomato / WhatsApp)
    const PER_PAGE = 9;
    const imgUrl = (id) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=600&q=80`;
    const POOL = ['1461023058943-07fcbe16d735','1517701550927-30cf4ba1dba5','1509042239860-f550ce710b93','1495474472287-4d71bcdd2085','1498804103079-a6351b050096','1559305616-3f99cd43e353','1453614512568-c4024d13c247','1442975631115-c4f7b05b8a2c','1511920170033-f8396924c348','1525480122447-64809d765a92'];

    const CATS = [
      { k: 'all', label: 'All' },
      { k: 'hot', label: 'Hot Beverages' },
      { k: 'ice', label: 'Iced Beverages' },
      { k: 'smoothies', label: 'Smoothies & Juices' },
      { k: 'soups', label: 'Soups & Greens' },
      { k: 'benedict', label: 'Benedict & Eggs' },
      { k: 'sandwich', label: 'Panini & Wraps' },
      { k: 'burger', label: 'Burgers & Hotdogs' },
      { k: 'pizza', label: 'Pizza' },
      { k: 'grills', label: 'Turkish Grills' },
      { k: 'pasta', label: 'Pasta & Mains' },
      { k: 'dessert', label: 'Desserts' },
      { k: 'coolers', label: 'Coolers & Shakes' }
    ];
    const LABEL = Object.fromEntries(CATS.map(c => [c.k, c.label]));

    const MENU = [
      { n: 'Cortado', c: 'hot', p: 180, d: 'Espresso & warm milk, balanced' },
      { n: 'Cappuccino', c: 'hot', p: 200, d: 'Foam‑lifted, classic' },
      { n: 'Americano', c: 'hot', p: 160, d: 'Long pour, clean finish' },
      { n: 'Flat White', c: 'hot', p: 220, d: 'Velvety microfoam' },
      { n: 'Latte', c: 'hot', p: 190, d: 'Soft, milk‑forward' },
      { n: 'Macchiato', c: 'hot', p: 170, d: 'Espresso, marked with foam' },
      { n: 'Spanish Latte', c: 'ice', p: 220, d: 'Sweet condensed, iced' },
      { n: 'Cold Brew', c: 'ice', p: 200, d: '16h slow steep' },
      { n: 'Iced Latte', c: 'ice', p: 210, d: 'Espresso & cold milk' },
      { n: 'Lemon Ice Tea', c: 'ice', p: 150, d: 'Fresh brewed, citrus' },
      { n: 'Iced Americano', c: 'ice', p: 190, d: 'Bold, on the rocks' },
      { n: 'Avocado Honey', c: 'smoothies', p: 180, d: 'Creamy, raw honey' },
      { n: 'Banana Dates', c: 'smoothies', p: 170, d: 'Naturally sweet' },
      { n: 'Mixed Berry', c: 'smoothies', p: 160, d: 'Antioxidant brew' },
      { n: 'Watermelon Juice', c: 'smoothies', p: 140, d: 'Cold pressed' },
      { n: 'Orange Juice', c: 'smoothies', p: 130, d: 'Hand squeezed' },
      { n: 'Mixed Fruit', c: 'smoothies', p: 160, d: 'Seasonal selection' },
      { n: 'House Salad', c: 'soups', p: 350, d: 'Mesclun, citrus, herbs' },
      { n: 'Green Soup', c: 'soups', p: 280, d: 'Spinach, basil, cream' },
      { n: 'Avocado & Feta', c: 'soups', p: 420, d: 'Sumac, olive, lime' },
      { n: 'Fried Chicken Benedict', c: 'benedict', p: 435, d: 'Sourdough, hollandaise' },
      { n: 'Smoked Chicken Benedict', c: 'benedict', p: 435, d: 'House smoked, chive' },
      { n: 'Scrambled Eggs', c: 'benedict', p: 360, d: 'Slow, buttered' },
      { n: 'Truffle Scramble', c: 'benedict', p: 415, d: 'Black truffle oil' },
      { n: 'Soufflé Omelette', c: 'benedict', p: 380, d: 'Cloud‑light, herb butter' },
      { n: 'Multigrain Panini', c: 'sandwich', p: 390, d: 'Pesto, sundried tomato' },
      { n: 'Sourdough Sandwich', c: 'sandwich', p: 420, d: 'Slow ferment, gruyère' },
      { n: 'Mediterranean Wrap', c: 'sandwich', p: 380, d: 'Hummus, falafel, slaw' },
      { n: 'Smoked Chicken Wrap', c: 'sandwich', p: 450, d: 'Avocado, lime, chipotle' },
      { n: 'Gourmet Burger', c: 'burger', p: 480, d: 'Aged cheddar, brioche' },
      { n: 'Classic Hotdog', c: 'burger', p: 350, d: 'Smoked sausage, mustard' },
      { n: 'Margherita', c: 'pizza', p: 420, d: 'San Marzano, basil' },
      { n: 'Truffle Mushroom', c: 'pizza', p: 650, d: 'Cremini, parmesan, truffle' },
      { n: 'Smoked Chicken Pizza', c: 'pizza', p: 560, d: 'Caramelised onion, BBQ' },
      { n: 'Turkish Kebab', c: 'grills', p: 520, d: 'Charcoal grilled, sumac' },
      { n: 'Grilled Chicken', c: 'grills', p: 480, d: 'Yoghurt marinated, herbs' },
      { n: 'Aglio e Olio', c: 'pasta', p: 450, d: 'Garlic, chilli, parsley' },
      { n: 'Truffle Mushroom Pasta', c: 'pasta', p: 550, d: 'Cream, thyme, truffle' },
      { n: 'Slow Braised Lamb', c: 'pasta', p: 750, d: 'Polenta, red wine jus' },
      { n: 'Pan‑Seared Fish', c: 'pasta', p: 680, d: 'Brown butter, capers' },
      { n: 'Flourless Chocolate Cake', c: 'dessert', p: 320, d: 'Dark, dense, salt flake' },
      { n: 'Burnt Basque Cheesecake', c: 'dessert', p: 350, d: 'Caramel kiss, cream' },
      { n: 'Walnut Brownie', c: 'dessert', p: 280, d: 'Warm, fudgy, ice cream' },
      { n: 'Cucumber Mint Cooler', c: 'coolers', p: 160, d: 'Lime, soda, basil' },
      { n: 'Iced Tea (House)', c: 'coolers', p: 130, d: 'Peach, lemon, hibiscus' },
      { n: 'Vanilla Shake', c: 'coolers', p: 150, d: 'Bourbon vanilla bean' },
      { n: 'Chocolate Shake', c: 'coolers', p: 160, d: 'Belgian dark, malt' },
      { n: 'Strawberry Shake', c: 'coolers', p: 150, d: 'Fresh berry, mascarpone' }
    ];
    MENU.forEach((it, i) => { it.img = imgUrl(POOL[i % POOL.length]); });

    const catsEl = $('#menuCats');
    const searchEl = $('#menuSearch');
    const moreBtn = $('#menuMore');
    const emptyEl = $('#menuEmpty');
    let activeCat = 'all', query = '', shown = PER_PAGE;

    CATS.forEach(c => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'mchip' + (c.k === 'all' ? ' is-active' : '');
      b.textContent = c.label;
      b.addEventListener('click', () => {
        activeCat = c.k; shown = PER_PAGE;
        $$('.mchip', catsEl).forEach(x => x.classList.toggle('is-active', x === b));
        render();
      });
      catsEl.appendChild(b);
    });

    const filtered = () => {
      const q = query.trim().toLowerCase();
      return MENU.filter(it =>
        (activeCat === 'all' || it.c === activeCat) &&
        (!q || it.n.toLowerCase().includes(q) || it.d.toLowerCase().includes(q))
      );
    };
    const cardHtml = (it) =>
      `<article class="mcard"><div class="mcard__media"><img src="${it.img}" alt="${it.n}" loading="lazy" onerror="this.closest('.mcard__media').classList.add('no-img')"><span class="mcard__tag">${LABEL[it.c]}</span></div><div class="mcard__body"><div class="mcard__top"><h3>${it.n}</h3><span class="mcard__price">₹${it.p}</span></div><p class="mcard__desc">${it.d}</p><a class="mcard__order" href="${ORDER_URL}">Order now <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M13 5l7 7-7 7"/></svg></a></div></article>`;

    const render = () => {
      const list = filtered();
      menuCards.innerHTML = list.slice(0, shown).map(cardHtml).join('');
      emptyEl.hidden = list.length !== 0;
      if (list.length > shown) {
        moreBtn.hidden = false;
        moreBtn.textContent = `Show ${list.length - shown} more`;
      } else {
        moreBtn.hidden = true;
      }
    };

    moreBtn.addEventListener('click', () => { shown += PER_PAGE; render(); });
    let st;
    searchEl.addEventListener('input', () => {
      clearTimeout(st);
      st = setTimeout(() => { query = searchEl.value; shown = PER_PAGE; render(); }, 150);
    });
    render();
  }

  /* ---------- RESERVE (2-STEP) ---------- */
  const ttDays = $('#ttDays');
  const ttSlots = $('#ttSlots');
  const ttMonth = $('#ttMonth');
  const ttPrev = $('#ttPrev');
  const ttNext = $('#ttNext');
  const resDate = $('#resDate');
  const resTime = $('#resTime');
  const resSummary = $('#resSummary');
  const rPanes = $$('.rpane');
  const rTabs = $$('.rtab');
  const rTabFill = $('#rtabFill');
  const rWhen = $('#rWhen');
  const toStep2 = $('#toStep2');
  const backStep1 = $('#backStep1');

  const DOW = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  const today = new Date(); today.setHours(0,0,0,0);
  let weekStart = new Date(today);
  let selectedDate = new Date(today);
  let selectedSlot = null;

  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const sameDay = (a, b) => a.toDateString() === b.toDateString();
  const fmtDate = (d) => `${DOW[d.getDay()]}, ${d.getDate()} ${MON[d.getMonth()]}`;
  const seed = (s) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h); };

  const SLOTS = [
    '08:00','08:30','09:00','09:30','10:00','10:30','11:00','11:30',
    '12:00','12:30','13:00','13:30','14:00','14:30','15:00','15:30',
    '16:00','16:30','17:00','17:30','18:00','18:30','19:00','19:30',
    '20:00','20:30'
  ];

  function slotState(date, time) {
    const k = `${date.toDateString()}-${time}`;
    const r = seed(k) % 100;
    const hour = parseInt(time.split(':')[0], 10);
    const peak = (hour >= 9 && hour <= 11) || (hour >= 18 && hour <= 20);
    if (peak) return r < 25 ? 'full' : r < 55 ? 'limited' : 'available';
    return r < 10 ? 'full' : r < 30 ? 'limited' : 'available';
  }

  function setDate(d) {
    selectedDate = d;
    selectedSlot = null;
    if (resDate) resDate.value = d.toISOString().slice(0, 10);
    if (resTime) resTime.value = '';
  }

  function renderDays() {
    if (!ttDays) return;
    ttDays.innerHTML = '';
    const last = addDays(weekStart, 6);
    const sameMonth = weekStart.getMonth() === last.getMonth();
    ttMonth.textContent = sameMonth
      ? `${MON[weekStart.getMonth()]} ${weekStart.getFullYear()}`
      : `${MON[weekStart.getMonth()]} — ${MON[last.getMonth()]} ${last.getFullYear()}`;

    for (let i = 0; i < 7; i++) {
      const d = addDays(weekStart, i);
      const past = d < today;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'tt__day' + (sameDay(d, selectedDate) ? ' is-active' : '');
      btn.disabled = past;
      btn.innerHTML = `<div class="dow">${DOW[d.getDay()]}</div><div class="num">${d.getDate()}</div>`;
      btn.addEventListener('click', () => {
        if (past) return;
        setDate(d);
        renderDays();
        updateSummary();
      });
      if (past) { btn.style.opacity = '0.35'; btn.style.cursor = 'not-allowed'; }
      ttDays.appendChild(btn);
    }
    ttPrev.disabled = weekStart <= today;
  }

  function renderSlots() {
    if (!ttSlots) return;
    ttSlots.innerHTML = '';
    SLOTS.forEach(t => {
      const state = slotState(selectedDate, t);
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'tt__slot is-' + state + (selectedSlot === t ? ' is-active' : '');
      const lbl = state === 'full' ? 'Full' : state === 'limited' ? 'Limited' : 'Open';
      btn.innerHTML = `${t}<span class="lbl">${lbl}</span>`;
      btn.disabled = state === 'full';
      btn.addEventListener('click', () => {
        if (state === 'full') return;
        selectedSlot = t;
        renderSlots();
        updateSummary();
      });
      ttSlots.appendChild(btn);
    });
  }

  function updateSummary() {
    if (!resSummary) return;
    if (selectedSlot) {
      if (resTime) resTime.value = selectedSlot;
      resSummary.textContent = `${fmtDate(selectedDate)} · ${selectedSlot}`;
      resSummary.style.color = 'var(--brand)';
    } else {
      resSummary.textContent = '— pick a time above —';
      resSummary.style.color = 'var(--ink-3)';
    }
  }

  function goStep(n) {
    rPanes.forEach(p => p.classList.toggle('is-active', p.dataset.pane === String(n)));
    rTabs.forEach(t => {
      const s = Number(t.dataset.step);
      t.classList.toggle('is-active', s === n);
      t.classList.toggle('is-done', s < n);
    });
    if (rTabFill) rTabFill.style.width = n >= 2 ? '100%' : '0%';
    if (n === 2) {
      renderSlots();
      if (rWhen) rWhen.textContent = fmtDate(selectedDate);
    }
  }

  function validateStep1() {
    const name = $('#resName').value.trim();
    const phone = $('#resPhone').value.trim();
    const email = $('#resEmail').value.trim();
    const party = $('#resParty').value;
    if (!name || !phone || !email || !party) {
      alert('Please add your name, phone, email and party size first.');
      return false;
    }
    if (!resDate.value) { alert('Please pick a date.'); return false; }
    return true;
  }

  ttPrev && ttPrev.addEventListener('click', () => {
    weekStart = addDays(weekStart, -7);
    if (weekStart < today) weekStart = new Date(today);
    renderDays();
  });
  ttNext && ttNext.addEventListener('click', () => {
    weekStart = addDays(weekStart, 7);
    renderDays();
  });

  toStep2 && toStep2.addEventListener('click', () => { if (validateStep1()) goStep(2); });
  backStep1 && backStep1.addEventListener('click', () => goStep(1));
  rTabs.forEach(t => t.addEventListener('click', () => {
    const s = Number(t.dataset.step);
    if (s === 1) goStep(1);
    else if (validateStep1()) goStep(2);
  }));

  if (ttDays) {
    setDate(selectedDate);
    renderDays();
    updateSummary();
    goStep(1);
  }

  /* ---------- RESERVE FORM SUBMIT ---------- */
  const form = $('#reserveForm');
  const success = $('#resSuccess');
  form && form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!validateStep1()) { goStep(1); return; }
    if (!resTime.value) { alert('Please pick a time slot.'); return; }
    success.classList.add('is-shown');
    setTimeout(() => {
      form.reset();
      selectedSlot = null;
      setDate(new Date(today));
      renderDays();
      updateSummary();
      goStep(1);
      success.classList.remove('is-shown');
    }, 5000);
  });

  /* ---------- HERO: CUPS CLICK TO MENU ---------- */
  const heroArt = $('#heroArt');
  if (heroArt) {
    const go = () => {
      const menu = document.getElementById('menu');
      if (menu) menu.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
    heroArt.addEventListener('click', go);
    heroArt.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); }
    });
  }

  /* ---------- HERO: LIVE OPEN / CLOSED STATUS ---------- */
  const heroStatus = $('#heroStatus');
  if (heroStatus) {
    // Hours: Sun(0)–Thu(4) 8 AM–9 PM, Fri(5)–Sat(6) 8 AM–10 PM
    const updateStatus = () => {
      const now = new Date();
      const day = now.getDay();
      const mins = now.getHours() * 60 + now.getMinutes();
      const open = 8 * 60;
      const weekend = (day === 5 || day === 6);
      const close = weekend ? 22 * 60 : 21 * 60;
      const closeLabel = weekend ? '10 PM' : '9 PM';
      const txt = heroStatus.querySelector('.txt');
      if (mins >= open && mins < close) {
        heroStatus.classList.add('is-open');
        heroStatus.classList.remove('is-closed');
        txt.textContent = `Open now · until ${closeLabel}`;
      } else {
        heroStatus.classList.add('is-closed');
        heroStatus.classList.remove('is-open');
        txt.textContent = mins < open ? 'Opens at 8 AM' : 'Closed · opens 8 AM';
      }
    };
    updateStatus();
    setInterval(updateStatus, 60000);
  }

  /* ---------- HERO: CUPS TILT + PARALLAX ---------- */
  const heroStage = $('#heroStage');
  const artTilt = $('#heroArtTilt');
  const floaters = $$('.hero__float');
  if (heroStage && artTilt && heroArt
      && matchMedia('(hover: hover) and (min-width: 1025px)').matches
      && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    let raf = null, rx = 0, ry = 0, tx = 0, ty = 0, px = 0, py = 0, active = false;
    setTimeout(() => {
      active = true;
      heroArt.classList.add('is-ready');
      floaters.forEach(f => f.classList.add('is-ready'));
    }, 1900);

    const apply = () => {
      artTilt.style.transform =
        `translate3d(${tx}px, ${ty}px, 0) rotateY(${ry}deg) rotateX(${rx}deg)`;
      // floating chips drift the opposite way for depth
      floaters.forEach(f => {
        const d = parseFloat(f.dataset.depth || '14');
        f.style.transform = `translate3d(${-px * d}px, ${-py * d}px, 0)`;
      });
      raf = null;
    };
    heroStage.addEventListener('mousemove', (e) => {
      if (!active) return;
      const r = heroStage.getBoundingClientRect();
      px = (e.clientX - r.left) / r.width - 0.5;
      py = (e.clientY - r.top) / r.height - 0.5;
      ry = px * 9;          // rotate left/right
      rx = -py * 6;         // rotate up/down
      tx = px * 26;         // drift
      ty = py * 16;
      if (!raf) raf = requestAnimationFrame(apply);
    });
    heroStage.addEventListener('mouseleave', () => {
      rx = ry = tx = ty = px = py = 0;
      if (!raf) raf = requestAnimationFrame(apply);
    });
  }

  /* ---------- ABOUT: 3D TILT MEDIA ---------- */
  const aboutMedia = $('#aboutMedia');
  const aboutTilt = $('#aboutTilt');
  if (aboutMedia && aboutTilt
      && matchMedia('(hover: hover) and (min-width: 1025px)').matches
      && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    let raf = null, rx = 0, ry = 0;
    const apply = () => {
      aboutTilt.style.transform = `rotateY(${ry}deg) rotateX(${rx}deg)`;
      raf = null;
    };
    aboutMedia.addEventListener('mousemove', (e) => {
      const r = aboutMedia.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      ry = px * 10;
      rx = -py * 10;
      if (!raf) raf = requestAnimationFrame(apply);
    });
    aboutMedia.addEventListener('mouseleave', () => {
      rx = ry = 0;
      if (!raf) raf = requestAnimationFrame(apply);
    });
  }

  /* ---------- SIGNATURES: SCRATCH CARDS ---------- */
  const prefersReduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  $$('.scratch').forEach(card => {
    const canvas = card.querySelector('.scratch__foil');
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let revealed = false, drawing = false, touched = false, strokes = 0;

    // burst + sparkle layer for the "treasure" reveal
    const burst = document.createElement('span');
    burst.className = 'scratch__burst'; burst.setAttribute('aria-hidden', 'true');
    card.appendChild(burst);
    const sparks = document.createElement('span');
    sparks.className = 'scratch__sparks'; sparks.setAttribute('aria-hidden', 'true');
    for (let i = 0; i < 7; i++) {
      const s = document.createElement('i');
      s.style.setProperty('--a', (i * 51) + 'deg');
      s.style.setProperty('--d', (40 + Math.random() * 40) + 'px');
      sparks.appendChild(s);
    }
    card.appendChild(sparks);

    const paintFoil = (w, h) => {
      ctx.globalCompositeOperation = 'source-over';
      const g = ctx.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, '#3a2a1e'); g.addColorStop(0.5, '#241913'); g.addColorStop(1, '#3a2a1e');
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = 'rgba(201,162,75,0.10)';
      const dots = Math.floor((w * h) / 2600);
      for (let i = 0; i < dots; i++) ctx.fillRect(Math.random() * w, Math.random() * h, 1.4, 1.4);
      const sg = ctx.createLinearGradient(0, 0, w, 0);
      sg.addColorStop(0, 'rgba(255,255,255,0)'); sg.addColorStop(0.5, 'rgba(255,255,255,0.07)'); sg.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = sg; ctx.fillRect(0, 0, w, h);
    };
    const setup = () => {
      const r = card.getBoundingClientRect();
      if (!r.width) return;
      canvas.width = Math.round(r.width * dpr);
      canvas.height = Math.round(r.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (!touched && !revealed) paintFoil(r.width, r.height);
    };
    const point = (e) => {
      const r = canvas.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };
    const scratchAt = (x, y) => {
      ctx.globalCompositeOperation = 'destination-out';
      const rad = Math.max(34, canvas.clientWidth * 0.16);
      ctx.beginPath(); ctx.arc(x, y, rad, 0, Math.PI * 2); ctx.fill();
    };
    const clearedPct = () => {
      const { width, height } = canvas;
      if (!width) return 0;
      const data = ctx.getImageData(0, 0, width, height).data;
      let clear = 0, total = 0;
      for (let i = 3; i < data.length; i += 32) { total++; if (data[i] === 0) clear++; }
      return total ? clear / total : 0;
    };
    const reveal = () => {
      if (revealed) return;
      revealed = true;
      card.classList.add('is-revealed');
    };

    let lastX = 0, lastY = 0;
    canvas.addEventListener('pointerdown', (e) => {
      if (revealed) return;
      drawing = true; touched = true; strokes++;
      card.classList.add('is-active');
      try { canvas.setPointerCapture(e.pointerId); } catch (_) {}
      const { x, y } = point(e); lastX = x; lastY = y; scratchAt(x, y);
      e.preventDefault();
    });
    canvas.addEventListener('pointermove', (e) => {
      if (!drawing || revealed) return;
      const { x, y } = point(e);
      // interpolate so fast drags still clear a continuous path
      const dist = Math.hypot(x - lastX, y - lastY);
      const steps = Math.max(1, Math.floor(dist / 12));
      for (let i = 1; i <= steps; i++) scratchAt(lastX + (x - lastX) * i / steps, lastY + (y - lastY) * i / steps);
      lastX = x; lastY = y;
      e.preventDefault();
    });
    const endStroke = () => {
      if (!drawing) return;
      drawing = false;
      // reveal quickly: a few strokes or ~28% cleared is enough
      if (strokes >= 3 || clearedPct() > 0.28) reveal();
    };
    canvas.addEventListener('pointerup', endStroke);
    canvas.addEventListener('pointercancel', endStroke);

    // keyboard / tap fallback
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); reveal(); }
    });

    if (prefersReduced) { reveal(); }
    else {
      requestAnimationFrame(setup);
      window.addEventListener('load', setup);
      let rt; window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(setup, 200); }, { passive: true });
    }
  });

  /* ---------- TESTIMONIALS: 3D MARQUEE ---------- */
  const testiScene = $('#testiScene');
  if (testiScene) {
    const reviews = [
      { name: 'Priya Mehta', user: '@priyam', flag: '🇮🇳', body: 'My friends and I have basically adopted the corner booth. Best cold brew in the city.', img: 'https://randomuser.me/api/portraits/women/32.jpg' },
      { name: 'Arjun Kapoor', user: '@arjunk', flag: '🇮🇳', body: 'Walk in for a cortado, leave three hours later with the whole gang. My favourite spot in Delhi.', img: 'https://randomuser.me/api/portraits/men/51.jpg' },
      { name: 'Sarah Thomas', user: '@sarah_t', flag: '🇬🇧', body: 'Every detail is considered — the cups, the light, the playlist. It just feels like home.', img: 'https://randomuser.me/api/portraits/women/68.jpg' },
      { name: 'Rhea D\u2019Souza', user: '@rhead', flag: '🇮🇳', body: 'Staff remember my order by the third visit. Coffee at Friends really lives up to the name.', img: 'https://randomuser.me/api/portraits/women/53.jpg' },
      { name: 'Karan Verma', user: '@karanv', flag: '🇮🇳', body: 'Honest coffee, easy food, great company. We have already booked the big table again.', img: 'https://randomuser.me/api/portraits/men/33.jpg' },
      { name: 'Mateo Rossi', user: '@mateo', flag: '🇮🇹', body: 'Best flat white I have had outside Italy. The crema, the balance — chef\u2019s kiss.', img: 'https://randomuser.me/api/portraits/men/22.jpg' },
      { name: 'Aisha Khan', user: '@aishak', flag: '🇮🇳', body: 'The iced latte is smooth as silk and the seating is made for long catch‑ups.', img: 'https://randomuser.me/api/portraits/women/45.jpg' },
      { name: 'Daniel Lee', user: '@danlee', flag: '🇸🇬', body: 'Came for the scratch‑card drink, stayed for the mocha and the friendly crew. Smart and delicious.', img: 'https://randomuser.me/api/portraits/men/85.jpg' },
      { name: 'Megha Nair', user: '@meghan', flag: '🇮🇳', body: 'CAF nails the little things — warm welcome, great brew, the kind of place you bring your people.', img: 'https://randomuser.me/api/portraits/women/90.jpg' }
    ];

    const cardHtml = (r) =>
      `<article class="tcard"><div class="tcard__head"><img class="tcard__avatar" src="${r.img}" alt="${r.name}" loading="lazy" onerror="this.style.visibility='hidden'"><div><div class="tcard__name">${r.name} <span>${r.flag}</span></div><div class="tcard__user">${r.user}</div></div></div><p class="tcard__body">${r.body}</p></article>`;

    // columns fill the full screen width; lists are trimmed per column to keep
    // the DOM light (smoother), and duplicated for a seamless 50% loop
    const cols = [
      { dir: 'down', dur: 42 },
      { dir: 'up',   dur: 35 },
      { dir: 'down', dur: 48 },
      { dir: 'up',   dur: 38 },
      { dir: 'down', dur: 44 },
      { dir: 'up',   dur: 40 },
      { dir: 'down', dur: 46 }
    ];
    // offset each column's starting order so columns don't mirror each other
    const rotated = (arr, n) => arr.slice(n).concat(arr.slice(0, n));
    testiScene.innerHTML = cols.map((c, i) => {
      const list = rotated(reviews, i * 2).slice(0, 6);
      const cards = list.map(cardHtml).join('');
      return `<div class="tmarquee tmarquee--${c.dir}"><div class="tmarquee__inner" style="--dur:${c.dur}s">${cards}${cards}</div></div>`;
    }).join('');
  }

  /* ---------- MAGNETIC BUTTONS ---------- */
  if (matchMedia('(hover: hover) and (min-width: 1025px)').matches
      && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    $$('.magnetic').forEach(btn => {
      btn.addEventListener('mousemove', (e) => {
        const r = btn.getBoundingClientRect();
        const mx = e.clientX - r.left - r.width / 2;
        const my = e.clientY - r.top - r.height / 2;
        btn.style.transform = `translate(${mx * 0.18}px, ${my * 0.28}px)`;
      });
      btn.addEventListener('mouseleave', () => { btn.style.transform = ''; });
    });
  }

})();

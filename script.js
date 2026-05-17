/* Coffee Under Palms — interactions */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  /* ---------- LOADER ---------- */
  const loader = $('#loader');
  const LOADER_HOLD_MS = 4400;
  const finishLoad = () => {
    document.body.classList.remove('loading');
    loader.classList.add('is-done');
    setTimeout(() => loader.remove(), 1100);
  };
  if (document.readyState === 'complete') setTimeout(finishLoad, LOADER_HOLD_MS);
  else window.addEventListener('load', () => setTimeout(finishLoad, LOADER_HOLD_MS));

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

  /* ---------- MENU FILTERS ---------- */
  const chips = $$('.chip');
  const items = $$('.menu__item');
  const heads = $$('.menu__col h3');
  const empty = $('#menuEmpty');

  chips.forEach(c => c.addEventListener('click', () => {
    chips.forEach(x => x.classList.remove('is-active'));
    c.classList.add('is-active');
    const cat = c.dataset.cat;
    let visible = 0;
    items.forEach(it => {
      const show = cat === 'all' || it.dataset.cat === cat;
      it.classList.toggle('hide', !show);
      if (show) visible++;
    });
    heads.forEach(h => {
      const sec = h.dataset.section;
      const any = items.some(it => it.dataset.cat === sec && !it.classList.contains('hide'));
      h.style.display = (cat === 'all' || cat === sec) && any ? '' : 'none';
    });
    empty.style.display = visible === 0 ? 'block' : 'none';
  }));

  /* ---------- TIMETABLE ---------- */
  const ttDays = $('#ttDays');
  const ttSlots = $('#ttSlots');
  const ttMonth = $('#ttMonth');
  const ttPrev = $('#ttPrev');
  const ttNext = $('#ttNext');
  const resDate = $('#resDate');
  const resTime = $('#resTime');
  const resSummary = $('#resSummary');

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
    const h = seed(k);
    const r = h % 100;
    // Heuristic: peak hours busier
    const hour = parseInt(time.split(':')[0], 10);
    const peak = (hour >= 9 && hour <= 11) || (hour >= 18 && hour <= 20);
    if (peak) return r < 25 ? 'full' : r < 55 ? 'limited' : 'available';
    return r < 10 ? 'full' : r < 30 ? 'limited' : 'available';
  }

  function renderDays() {
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
        selectedDate = d;
        selectedSlot = null;
        renderDays();
        renderSlots();
        updateSummary();
      });
      if (past) { btn.style.opacity = '0.35'; btn.style.cursor = 'not-allowed'; }
      ttDays.appendChild(btn);
    }
    ttPrev.disabled = weekStart <= today;
  }

  function renderSlots() {
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
    if (selectedSlot) {
      resDate.value = selectedDate.toISOString().slice(0,10);
      resTime.value = selectedSlot;
      resSummary.textContent = `— ${fmtDate(selectedDate)} · ${selectedSlot} —`;
      resSummary.style.color = 'var(--brand)';
    } else {
      resSummary.textContent = `— ${fmtDate(selectedDate)} · pick a time —`;
      resSummary.style.color = 'var(--ink-3)';
    }
  }

  ttPrev && ttPrev.addEventListener('click', () => {
    weekStart = addDays(weekStart, -7);
    if (weekStart < today) weekStart = new Date(today);
    renderDays(); renderSlots();
  });
  ttNext && ttNext.addEventListener('click', () => {
    weekStart = addDays(weekStart, 7);
    renderDays(); renderSlots();
  });

  if (ttDays) {
    renderDays();
    renderSlots();
    updateSummary();
  }

  /* ---------- FORM ---------- */
  const form = $('#reserveForm');
  const success = $('#resSuccess');
  form && form.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = $('#resName').value.trim();
    const phone = $('#resPhone').value.trim();
    const email = $('#resEmail').value.trim();
    const party = $('#resParty').value;
    if (!name || !phone || !email || !party) { alert('Please fill in name, phone, email and party size.'); return; }
    if (!resDate.value || !resTime.value) { alert('Please pick a date and time from the timetable above.'); return; }
    success.classList.add('is-shown');
    form.reset();
    selectedSlot = null; renderSlots(); updateSummary();
    setTimeout(() => success.classList.remove('is-shown'), 6000);
  });

  /* ---------- HERO PARALLAX ---------- */
  const heroBg = $('.hero__bg img');
  if (heroBg && matchMedia('(min-width: 720px)').matches) {
    window.addEventListener('scroll', () => {
      const y = Math.min(window.scrollY * 0.25, 200);
      heroBg.style.transform = `translate3d(0, ${y}px, 0) scale(${1 + Math.min(window.scrollY/4000, 0.06)})`;
    }, { passive: true });
  }
})();

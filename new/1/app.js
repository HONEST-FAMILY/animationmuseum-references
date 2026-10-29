(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- 오늘 운영: 월요일 휴관, 월요일이 공휴일이면 다음날 휴관 ---------- */
  // 2026-11 ~ 2027-12 사이 월요일과 겹치는 공휴일(대체공휴일 포함)
  const HOLIDAY_MONDAYS = new Set(['2027-02-08', '2027-03-01', '2027-08-16', '2027-10-04', '2027-10-11', '2027-12-27']);
  const seoulNow = () => new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
  const key = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const isClosed = d => {
    const dow = d.getDay();
    if (dow === 1) return !HOLIDAY_MONDAYS.has(key(d));
    if (dow === 2) { const m = new Date(d); m.setDate(d.getDate() - 1); return HOLIDAY_MONDAYS.has(key(m)); }
    return false;
  };
  const W = ['일', '월', '화', '수', '목', '금', '토'];
  const label = d => `${d.getMonth() + 1}월 ${d.getDate()}일 ${W[d.getDay()]}요일`;
  const now = seoulNow();
  const closed = isClosed(now);
  const mins = now.getHours() * 60 + now.getMinutes();
  let state, sub;
  if (closed) {
    const n = new Date(now); do { n.setDate(n.getDate() + 1); } while (isClosed(n));
    state = '오늘은 휴관일입니다';
    sub = `다음 관람일 ${label(n)}`;
  } else if (mins < 600) { state = '오늘 10:00에 문을 엽니다'; sub = '입장마감 17:00'; }
  else if (mins < 1020) { state = '지금 관람할 수 있습니다'; sub = '입장마감 17:00'; }
  else if (mins < 1080) { state = '오늘 입장이 마감되었습니다'; sub = '18:00까지 관람'; }
  else { state = '오늘 관람이 끝났습니다'; sub = '관람 10:00 – 18:00 · 입장마감 17:00'; }
  $$('[data-today-date]').forEach(el => { el.textContent = label(now); });
  $$('[data-today-state]').forEach(el => { el.textContent = state; });
  $$('[data-today-sub]').forEach(el => { el.textContent = sub; });
  $$('[data-today-time]').forEach(el => { el.textContent = closed ? '휴관' : '10:00 – 18:00'; });
  if (closed) document.body.classList.add('is-closed');

  /* ---------- 머리글·전체 메뉴·바닥글 ---------- */
  const hd = $('#hd');
  const hero = $('.hero');
  const burger = $('.hd-burger');
  const sitemap = $('#sitemap');
  const openMenu = open => {
    sitemap.hidden = !open;
    burger.setAttribute('aria-expanded', String(open));
    document.documentElement.style.overflow = open ? 'hidden' : '';
    if (open) $('.sm-close').focus(); else burger.focus();
  };
  burger.addEventListener('click', () => openMenu(true));
  $('.sm-close').addEventListener('click', () => openMenu(false));
  addEventListener('keydown', e => { if (e.key === 'Escape' && !sitemap.hidden) openMenu(false); });
  const famBtn = $('.ft-family-btn'), fam = $('#family');
  famBtn.addEventListener('click', () => { fam.hidden = !fam.hidden; famBtn.setAttribute('aria-expanded', String(!fam.hidden)); });
  $('.ft-top-btn').addEventListener('click', () => scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' }));

  /* ---------- 들소 플립북: 스크롤·끌기 = 16장 넘기기 ---------- */
  const N = 16;
  const bison = $('#bison');
  const stage = $('#stage');
  const run = $('.run');
  const tickN = $('#tickN');
  const ticks = $('.ticks');
  let shown = -1;
  const show = f => {
    f = ((f % N) + N) % N;
    if (f === shown) return;
    shown = f;
    const c = f % 4, r = (f / 4) | 0;
    bison.style.backgroundPosition = `${c * 100 / 3}% ${r * 100 / 3}%`;
    if (ticks) ticks.style.setProperty('--f', f);
    if (tickN) tickN.textContent = `${String(f + 1).padStart(2, '0')} / ${N}`;
  };
  show(0);

  const setAnswer = on => document.body.classList.toggle('is-answer', on);

  if (!reduce) {
    let target = 0, cur = 0, drag = 0, auto = null, idle = null, inView = true, answered = false;
    const progress = () => {
      const r = run.getBoundingClientRect();
      const span = r.height - innerHeight;
      return span > 0 ? Math.min(1, Math.max(0, -r.top / span)) : 0;
    };
    const LAPS = 2; // 내리는 동안 두 바퀴
    const frameAt = p => Math.floor(p * N * LAPS + drag);
    const stopAuto = () => { if (auto) { clearInterval(auto); auto = null; } };
    const startAuto = () => {
      if (auto || !inView || progress() > .02) return;
      let i = 0;
      auto = setInterval(() => {         // 16장을 1초에(16장/초)
        show(frameAt(cur) + i + 1);
        i++;
        if (i >= N) { stopAuto(); show(frameAt(cur)); answered = true; setAnswer(true); armIdle(4000); }
      }, 1000 / N);
    };
    const armIdle = (ms = 2500) => { clearTimeout(idle); idle = setTimeout(startAuto, ms); };
    let raf = 0;
    const tick = () => {
      raf = 0;
      cur += (target - cur) * .35;
      if (Math.abs(target - cur) < .0004) cur = target;
      if (!auto) show(frameAt(cur));
      if (cur !== target) raf = requestAnimationFrame(tick);
    };
    const onScroll = () => {
      const p = progress();
      target = p;
      if (p > .02) stopAuto();
      if (p >= .9) { answered = true; setAnswer(true); }
      else if (p <= .01 && answered && !auto) { answered = false; setAnswer(false); }
      hd.classList.toggle('is-solid', hero.getBoundingClientRect().bottom <= hd.offsetHeight);
      if (!raf) raf = requestAnimationFrame(tick);
      armIdle();
    };
    addEventListener('scroll', onScroll, { passive: true });
    addEventListener('resize', onScroll);
    // 끌기: 가로로 18px 끌 때마다 한 장
    let sx = null, base = 0;
    stage.addEventListener('pointerdown', e => { sx = e.clientX; base = drag; stopAuto(); stage.setPointerCapture(e.pointerId); });
    stage.addEventListener('pointermove', e => {
      if (sx === null) return;
      drag = base + (e.clientX - sx) / 18;
      show(frameAt(cur));
      if (Math.abs(drag) >= N && !answered) { answered = true; setAnswer(true); }
    });
    const end = () => { sx = null; armIdle(); };
    stage.addEventListener('pointerup', end);
    stage.addEventListener('pointercancel', end);
    // 화면 밖이면 멈춘다
    new IntersectionObserver(es => { es.forEach(en => { inView = en.isIntersecting; if (!inView) stopAuto(); else armIdle(); }); }, { threshold: .2 }).observe(hero);
    onScroll();
    armIdle(2500);
  } else {
    setAnswer(true);
  }

  /* ---------- 16장 펼침 ---------- */
  const strip = $('#strip');
  for (let i = 0; i < N; i++) {
    const li = document.createElement('li');
    const c = i % 4, r = (i / 4) | 0;
    li.innerHTML = `<span class="fr" style="background-position:${c * 100 / 3}% ${r * 100 / 3}%"></span><span class="fn">${String(i + 1).padStart(2, '0')}</span>`;
    strip.appendChild(li);
  }
  if (!reduce) {
    const items = $$('li', strip);
    let k = 0, t = null;
    const step = () => { items.forEach((li, i) => li.classList.toggle('on', i === k)); k = (k + 1) % N; };
    new IntersectionObserver(es => {
      es.forEach(en => {
        if (en.isIntersecting && !t) t = setInterval(step, 1000 / N);
        if (!en.isIntersecting && t) { clearInterval(t); t = null; }
      });
    }, { threshold: .3 }).observe(strip);
  }
})();

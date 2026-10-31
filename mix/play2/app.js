(function () {
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = window.matchMedia('(pointer: fine)').matches;
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  var ease = function (t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; };
  var easeOut = function (t) { return 1 - Math.pow(1 - t, 3); };

  var hero = document.querySelector('.hero--deep');
  var sticky = hero.querySelector('.hero-sticky');
  var pastel = hero.querySelector('.dp-pastel');
  var iris = hero.querySelector('.hero-iris');
  var lastPastel = '', lastR = '', lastIo = '';
  var world = hero.querySelector('.dp-world');
  var layers = Array.prototype.slice.call(hero.querySelectorAll('.dp-world .dp-layer'));
  var props = Array.prototype.slice.call(hero.querySelectorAll('.dp-prop'));
  var copy = hero.querySelector('.dp-copy');
  var fall = hero.querySelector('.dp-fall');
  var quote = fall.querySelector('.dp-quote');
  var arch = fall.querySelector('.dp-arch');
  var fallY = fall.querySelector('.dp-faller--y');
  var fallR = fall.querySelector('.dp-faller--r');
  var fades = Array.prototype.slice.call(hero.querySelectorAll('.hero-badge, .now-card, .hero-cta, .hero-hours, .dp-scroll'));
  var chapterStage = document.querySelector('#chapters .ch-stage');
  var depth = function (el) { return Number(el.getAttribute('data-depth') || 1); };
  var layerDepth = layers.map(depth);
  var propDepth = props.map(depth);
  var propSeed = props.map(function (el, i) { return i * 1.7 + 0.4; });

  var mx = 0, my = 0, tx = 0, ty = 0, on = true;
  window.addEventListener('pointermove', function (e) {
    if (e.pointerType !== 'mouse') return;
    tx = e.clientX / window.innerWidth - 0.5;
    ty = e.clientY / window.innerHeight - 0.5;
  }, { passive: true });

  var progress = function () {
    var h = hero.offsetHeight - window.innerHeight;
    return clamp(-hero.getBoundingClientRect().top / Math.max(1, h), 0, 1);
  };

  var tick = function (now) {
    requestAnimationFrame(tick);
    var t = reduce ? 0 : progress();
    var reveal = reduce ? 1 : clamp((t - 0.94) / 0.06, 0, 1);
    if (chapterStage) {
      chapterStage.style.opacity = reveal;
      chapterStage.style.pointerEvents = reveal < 1 ? 'none' : '';
    }
    if (!on) return;
    var time = now / 1000;
    if (!fine && !reduce) { tx = Math.sin(time / 2.6) * 0.24; ty = Math.cos(time / 3.1) * 0.16; }
    mx += (tx - mx) * 0.07;
    my += (ty - my) * 0.07;
    var vw = window.innerWidth / 100, vh = window.innerHeight / 100;

    var a = clamp(t / 0.36, 0, 1), ea = ease(a);
    var b = clamp((t - 0.3) / 0.4, 0, 1), eb = easeOut(b);
    var c = clamp((t - 0.7) / 0.26, 0, 1);
    hero.style.pointerEvents = c > 0.98 ? 'none' : '';

    world.style.transform = 'scale(' + (1 + ea * 1.5).toFixed(4) + ')';
    world.style.opacity = (1 - clamp((a - 0.72) / 0.28, 0, 1)).toFixed(3);
    layers.forEach(function (el, i) {
      var d = layerDepth[i];
      var x = -mx * d * 30, y = -my * d * 18 + ea * d * d * 5 * vh;
      el.style.transform = 'translate3d(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px,0) scale(' + (1 + ea * d * 0.35).toFixed(4) + ')';
    });
    props.forEach(function (el, i) {
      var d = propDepth[i], s = propSeed[i];
      var bob = reduce ? 0 : Math.sin(time * 0.9 + s) * 10;
      var spin = reduce ? 0 : Math.sin(time * 0.6 + s) * 6;
      var x = -mx * d * 38 + (i % 2 ? 1 : -1) * ea * d * 14 * vw;
      var y = -my * d * 26 + bob - eb * d * 34 * vh + ea * d * 6 * vh;
      var sc = 1 + ea * d * 0.32;
      el.style.transform = 'translate3d(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px,0) rotate(' + (spin + (i % 2 ? 1 : -1) * ea * 30).toFixed(2) + 'deg) scale(' + sc.toFixed(3) + ')';
      el.style.opacity = (1 - clamp((b - 0.75) / 0.25, 0, 1)).toFixed(3);
    });
    copy.style.transform = 'translateX(-50%) translate3d(' + (-mx * 12).toFixed(1) + 'px,' + (-my * 8 - ea * 120).toFixed(1) + 'px,0) scale(' + (1 + ea * 0.25).toFixed(3) + ')';
    copy.style.opacity = clamp(1 - a * 2.6, 0, 1).toFixed(3);
    copy.style.filter = a > 0.01 ? 'blur(' + (a * 10).toFixed(1) + 'px)' : '';
    var fadeOut = clamp(1 - a * 4, 0, 1);
    fades.forEach(function (el) { el.style.opacity = fadeOut; el.style.visibility = fadeOut > 0 ? '' : 'hidden'; });

    var pastelNow = clamp((t - 0.24) / 0.16, 0, 1).toFixed(3);
    if (pastelNow !== lastPastel) { lastPastel = pastelNow; pastel.style.opacity = pastelNow; }
    var fallOpacity = clamp(b * 3, 0, 1) * (1 - clamp((c - 0.35) / 0.4, 0, 1));
    fall.style.opacity = fallOpacity.toFixed(3);
    quote.style.transform = 'translateX(-50%) translate3d(' + (-mx * 10).toFixed(1) + 'px,' + ((1 - eb) * 50 - my * 8).toFixed(1) + 'px,0)';
    arch.style.transform = 'translate(-50%, -38%) translate3d(' + (-mx * 22).toFixed(1) + 'px,' + (-my * 14 + (1 - eb) * 12 * vh).toFixed(1) + 'px,0) scale(' + (0.72 + eb * 0.28 + c * 0.6).toFixed(3) + ')';
    var fy = (-0.45 + b * 1.7) * window.innerHeight;
    fallY.style.transform = 'translate3d(' + (-mx * 30 + Math.sin(b * 6) * 3 * vw).toFixed(1) + 'px,' + fy.toFixed(1) + 'px,0) rotate(' + (b * 420).toFixed(1) + 'deg)';
    fallR.style.transform = 'translate3d(' + (-mx * 40 - Math.sin(b * 5) * 3 * vw).toFixed(1) + 'px,' + ((-0.75 + b * 1.9) * window.innerHeight).toFixed(1) + 'px,0) rotate(' + (-b * 360).toFixed(1) + 'deg)';

    var maxR = Math.hypot(window.innerWidth / 2, window.innerHeight * 0.52) + 16;
    var R = (ease(c) * maxR).toFixed(1);
    if (R !== lastR) {
      lastR = R;
      var mask = 'radial-gradient(circle at 50% 48%, transparent ' + R + 'px, #000 ' + (+R + 0.6).toFixed(1) + 'px)';
      sticky.style.webkitMaskImage = mask;
      sticky.style.maskImage = mask;
      iris.style.background = 'radial-gradient(circle at 50% 48%, transparent ' + (+R - 1).toFixed(1) + 'px, #171717 ' + R + 'px, #171717 ' + (+R + 6).toFixed(1) + 'px, transparent ' + (+R + 7).toFixed(1) + 'px)';
    }
    var io = c > 0 && c < 1 ? '1' : '0';
    if (io !== lastIo) { lastIo = io; iris.style.opacity = io; }
  };
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (en) { on = en[0].isIntersecting; }, { rootMargin: '100px 0px' }).observe(sticky);
  }
  requestAnimationFrame(tick);
  document.documentElement.classList.add('is-alive');
  hero.classList.add('is-alive');
})();
(function () {
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var coarse = window.matchMedia('(pointer: coarse)').matches;
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  var section = document.getElementById('walk');
  if (!section || !window.Play) return;
  var data = window.CHAPTER_DATA;
  var stage = section.querySelector('.gw-stage');
  var hero = document.querySelector('.hero--deep');
  var far = section.querySelector('.gw-far');
  var mid = section.querySelector('.gw-mid');
  var world = section.querySelector('.gw-world');
  var front = section.querySelector('.gw-front');
  var hint = section.querySelector('.gw-hint');
  var props = Array.prototype.slice.call(front.querySelectorAll('.gw-prop'));
  var COLORS = ['#2bb3c0', '#7c7cff', '#ffd23f', '#f592c3', '#3db54a', '#93d9c4', '#3d63e0', '#ffb21e', '#8e5bd8'];
  var NS = 'http://www.w3.org/2000/svg';
  var STEPS = 5;
  var W = 0, H = 0, spacing = 0, worldW = 0, base = 0, rise = 0, stairA = 0, stairB = 0, minX = 0, maxX = 0, setW = 0;
  var fronts = [], walker = null, ground = null, farSvg = null, midSvg = null;
  var camX = 0, camV = 0, near = -1, holding = 0, pressedAt = 0, greeted = false, fromWalk = false, visible = false, last = 0, moved = false, lastCam = '';

  section.querySelector('.gw-hud').appendChild(window.Play.chip('둘러본 공간'));
  if (coarse) hint.textContent = '◀ ▶ 를 꾹 누르거나 방을 눌러 보세요';

  var seeded = function (seed) {
    return function () {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
  };
  var svgEl = function (cls, w, h) {
    var el = document.createElementNS(NS, 'svg');
    el.setAttribute('class', cls);
    el.setAttribute('width', Math.round(w));
    el.setAttribute('height', Math.round(h));
    el.setAttribute('viewBox', '0 0 ' + Math.round(w) + ' ' + Math.round(h));
    el.setAttribute('aria-hidden', 'true');
    return el;
  };
  var shape = function (parent, tag, attrs) {
    var el = document.createElementNS(NS, tag);
    Object.keys(attrs).forEach(function (k) { el.setAttribute(k, attrs[k]); });
    parent.appendChild(el);
    return el;
  };
  var pad2 = function (n) { return String(n).padStart(2, '0'); };

  var sets = data.map(function (room, i) {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'gw-set';
    btn.style.setProperty('--c', COLORS[i]);
    btn.style.setProperty('--tilt', (i % 2 ? 1.6 : -2.2) + 'deg');
    btn.setAttribute('aria-label', pad2(i + 1) + ' ' + room.name + ', ' + room.place + ' 들어가기');
    btn.innerHTML = '<span class="gw-set-label"><i></i><span></span></span><span class="gw-set-frame"><img class="gw-photo" alt="" width="600" height="324" draggable="false"><img class="gw-set-larva" alt="" width="600" height="600" draggable="false"><span class="gw-stamp" aria-hidden="true">봤어요</span></span><span class="gw-set-legs" aria-hidden="true"><i></i><i></i></span>';
    btn.querySelector('.gw-set-label i').textContent = pad2(i + 1);
    btn.querySelector('.gw-set-label span').textContent = room.name;
    btn.querySelector('.gw-photo').src = '../assets/img/' + room.photo + '.webp';
    btn.querySelector('.gw-set-larva').src = window.Larva ? window.Larva.src(room.pose, 0) : '';
    btn.addEventListener('click', function () { visit(i); });
    world.appendChild(btn);
    return btn;
  });
  var signs = ['1층', '2층'].map(function (text) {
    var el = document.createElement('span');
    el.className = 'gw-sign';
    el.textContent = text;
    el.setAttribute('aria-hidden', 'true');
    world.appendChild(el);
    return el;
  });

  var groundY = function (x) {
    if (x <= stairA) return base;
    if (x >= stairB) return base - rise;
    return base - rise * Math.ceil((x - stairA) / (stairB - stairA) * STEPS) / STEPS;
  };
  var groundPath = function (offset) {
    var w = (stairB - stairA) / STEPS;
    var d = 'M-60 ' + (base + offset) + ' H' + stairA.toFixed(1);
    for (var k = 1; k <= STEPS; k++) d += ' V' + (base - rise * k / STEPS + offset).toFixed(1) + ' H' + (stairA + w * k).toFixed(1);
    return d + ' H' + (worldW + 60).toFixed(1);
  };

  var drawGround = function () {
    if (ground) ground.remove();
    ground = svgEl('gw-ground', worldW, H);
    shape(ground, 'path', { 'class': 'gw-ground-fill', d: groundPath(0) + ' V' + (H + 60) + ' H-60 Z' });
    shape(ground, 'path', { 'class': 'gw-ground-fill2', d: groundPath(W < 700 ? 44 : 58) + ' V' + (H + 60) + ' H-60 Z' });
    shape(ground, 'path', { 'class': 'gw-ground-line', d: groundPath(0) });
    shape(ground, 'path', { 'class': 'gw-path', d: groundPath(W < 700 ? 20 : 26) });
    world.insertBefore(ground, world.firstChild);
  };

  var CLOUD = 'M20 70 a20 20 0 0 1 6 -38 a30 30 0 0 1 52 -16 a26 26 0 0 1 46 10 a22 22 0 0 1 14 44 Z';
  var hills = function (svg, cls, width, y, minW, maxW, minH, maxH, rnd) {
    var d = 'M-40 ' + (H + 40) + ' L-40 ' + y;
    var x = -40;
    while (x < width + 40) {
      var w = minW + rnd() * (maxW - minW), h = minH + rnd() * (maxH - minH);
      d += ' Q' + (x + w / 2).toFixed(1) + ' ' + (y - h * 2).toFixed(1) + ' ' + (x + w).toFixed(1) + ' ' + y.toFixed(1);
      x += w;
    }
    shape(svg, 'path', { 'class': cls, d: d + ' L' + (x + 40).toFixed(1) + ' ' + (H + 40) + ' Z' });
  };
  var drawFar = function () {
    if (farSvg) farSvg.remove();
    var width = W + Math.max(0, worldW - W) * 0.25 + 120;
    var rnd = seeded(7);
    farSvg = svgEl('gw-far-art', width, H);
    var phone = W < 700;
    for (var x = 60; x < width; x += (phone ? 260 : 380) + rnd() * 220) {
      var y = H * (0.2 + rnd() * 0.14);
      var s = (phone ? 0.62 : 0.85) + rnd() * 0.5;
      shape(farSvg, 'path', { 'class': 'gw-cloud', d: CLOUD, transform: 'translate(' + x.toFixed(1) + ' ' + y.toFixed(1) + ') scale(' + s.toFixed(2) + ')' });
    }
    hills(farSvg, 'gw-hill-a', width, base - rise - H * 0.07, 260, 420, 22, 48, rnd);
    hills(farSvg, 'gw-hill-b', width, base - rise * 0.35, 200, 340, 14, 34, rnd);
    far.style.width = Math.round(width) + 'px';
    far.appendChild(farSvg);
  };
  var drawMid = function () {
    if (midSvg) midSvg.remove();
    var width = W + Math.max(0, worldW - W) * 0.55 + 120;
    var rnd = seeded(31);
    var phone = W < 700;
    midSvg = svgEl('gw-mid-art', width, H);
    var yb = base + 14;
    for (var x = 40; x < width; x += (phone ? 110 : 150) + rnd() * (phone ? 120 : 170)) {
      var h = (phone ? 110 : 150) + rnd() * (phone ? 70 : 100), w = h * 0.56, top = yb - h - 26;
      shape(midSvg, 'rect', { 'class': 'gw-trunk', x: (x - 7).toFixed(1), y: (top + h * 0.8).toFixed(1), width: 14, height: (yb - top - h * 0.8 + 10).toFixed(1) });
      var p = [[0, 0], [0.32, 0.3], [0.16, 0.3], [0.42, 0.58], [0.22, 0.58], [0.5, 0.86], [-0.5, 0.86], [-0.22, 0.58], [-0.42, 0.58], [-0.16, 0.3], [-0.32, 0.3]];
      shape(midSvg, 'polygon', {
        'class': 'gw-pine' + (rnd() > 0.5 ? ' gw-pine--b' : ''),
        points: p.map(function (q) { return (x + q[0] * w).toFixed(1) + ',' + (top + q[1] * h).toFixed(1); }).join(' ')
      });
    }
    mid.style.width = Math.round(width) + 'px';
    mid.appendChild(midSvg);
  };
  var placeProps = function () {
    var width = W + Math.max(0, worldW - W) * 1.45 + 120;
    var phone = W < 700;
    front.style.width = Math.round(width) + 'px';
    var spots = [
      { x: 0.1, size: phone ? 92 : 132, ratio: 1, y: function (s) { return H - s * 0.6; } },
      { x: 0.47, size: phone ? 90 : 126, ratio: 0.9, y: function (s) { return H - s * 0.55; } },
      { x: 0.8, size: phone ? 118 : 170, ratio: 80 / 220, y: function (s) { return H - s * 0.32; } },
      { x: 0.3, size: phone ? 42 : 58, ratio: 1, y: function () { return H * 0.17; } }
    ];
    props.forEach(function (el, i) {
      var spot = spots[i];
      el.style.width = spot.size + 'px';
      el.style.height = Math.round(spot.size * spot.ratio) + 'px';
      el.style.transform = 'translate(' + Math.round(width * spot.x) + 'px,' + Math.round(spot.y(spot.size)) + 'px)';
    });
  };

  var layout = function () {
    var keep = walker && spacing ? (walker.get() - fronts[0]) / spacing : 0;
    W = stage.clientWidth;
    H = stage.clientHeight;
    var phone = W < 700;
    spacing = clamp(W * 0.34, 300, 520);
    base = Math.round(H * (phone ? 0.76 : 0.8));
    rise = phone ? 54 : 70;
    var lead = Math.max(W * 0.42, 190);
    fronts = data.map(function (room, i) { return lead + i * spacing; });
    worldW = fronts[fronts.length - 1] + Math.max(W * 0.58, 260);
    stairA = fronts[3] - spacing * 0.3;
    stairB = fronts[3] + spacing * 0.3;
    minX = fronts[0] - spacing * 0.45;
    maxX = fronts[fronts.length - 1] + spacing * 0.45;
    setW = Math.round(Math.min(spacing * 0.62, phone ? 200 : 300));
    world.style.width = Math.round(worldW) + 'px';
    sets.forEach(function (btn, i) {
      var x = fronts[i] + setW * 0.42;
      btn.style.setProperty('--sw', setW + 'px');
      btn.style.setProperty('--legs', (phone ? 28 : 40) + 'px');
      btn.style.transform = 'translate(' + x.toFixed(1) + 'px,' + groundY(x).toFixed(1) + 'px) translate(-50%,-100%)';
    });
    signs[0].style.transform = 'translate(' + (fronts[0] - spacing * 0.36).toFixed(1) + 'px,' + (base - 12) + 'px) translate(-50%,-100%)';
    signs[1].style.transform = 'translate(' + (stairB + (phone ? 30 : 40)).toFixed(1) + 'px,' + (base - rise - 12) + 'px) translate(-50%,-100%)';
    drawGround();
    drawFar();
    drawMid();
    placeProps();
    if (walker) {
      walker.el.style.setProperty('--w', (phone ? 60 : 74) + 'px');
      walker.set(clamp(fronts[0] + keep * spacing, minX, maxX));
    }
  };

  var openRoom = function (i) {
    fromWalk = true;
    walker.say('');
    window.openRecord(i, sets[i].querySelector('.gw-set-frame'));
  };
  var visit = function (i) {
    if (window.isLayerOpen() || window.Play.isOpen()) return;
    moved = true;
    hint.classList.add('is-off');
    if (Math.abs(walker.get() - fronts[i]) < 6 && !walker.moving()) { openRoom(i); return; }
    walker.go(fronts[i], function () { openRoom(i); });
  };
  var step = function (dir) {
    var x = walker.target();
    var i = -1;
    if (dir > 0) { for (var a = 0; a < fronts.length; a++) { if (fronts[a] > x + 12) { i = a; break; } } }
    else { for (var b = fronts.length - 1; b >= 0; b--) { if (fronts[b] < x - 12) { i = b; break; } } }
    if (i >= 0) walker.go(fronts[i]);
  };
  var hold = function (dir) {
    holding = dir;
    moved = true;
    hint.classList.add('is-off');
  };
  var release = function () {
    if (!holding) return;
    walker.go(clamp(walker.get() + holding * 36, minX, maxX));
    holding = 0;
  };

  var baseClose = window.onRecordClose;
  window.onRecordClose = function (i) {
    if (fromWalk) {
      fromWalk = false;
      if (Math.abs(walker.get() - fronts[i]) > 4) walker.go(fronts[i]);
      return;
    }
    if (baseClose) baseClose(i);
  };

  var paintDone = function () { sets.forEach(function (btn, i) { btn.classList.toggle('is-done', window.Play.roomDone(i)); }); };
  window.Play.room({ back: '산책으로 돌아가기' });

  layout();
  walker = window.Play.walker({
    parent: world,
    img: '../assets/larva/yellow@2x.webp',
    width: W < 700 ? 60 : 74,
    speed: 780,
    k: 20,
    stride: 64,
    hop: 5,
    start: fronts[0],
    place: function (s) { return { x: s, y: groundY(s) }; }
  });
  walker.set(fronts[0]);
  walker.onSay(function () { if (near >= 0) openRoom(near); });
  paintDone();
  window.Play.on('room', paintDone);
  window.Play.on('reset', paintDone);

  [['.gw-btn--prev', -1], ['.gw-btn--next', 1]].forEach(function (pair) {
    var btn = section.querySelector(pair[0]), dir = pair[1];
    btn.addEventListener('pointerdown', function (e) {
      pressedAt = performance.now();
      btn.classList.add('is-down');
      try { btn.setPointerCapture(e.pointerId); } catch (err) {}
      hold(dir);
    });
    var up = function () {
      btn.classList.remove('is-down');
      if (holding === dir) release();
    };
    btn.addEventListener('pointerup', up);
    btn.addEventListener('pointercancel', up);
    btn.addEventListener('lostpointercapture', up);
    btn.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    btn.addEventListener('click', function () {
      var quick = !pressedAt || performance.now() - pressedAt < 260;
      pressedAt = 0;
      moved = true;
      hint.classList.add('is-off');
      if (quick) step(dir);
    });
  });

  var pinnedNow = function () {
    var r = stage.getBoundingClientRect();
    return r.top <= 1 && r.bottom >= window.innerHeight - 1 && (!hero || hero.getBoundingClientRect().bottom <= window.innerHeight + 4);
  };
  document.addEventListener('keydown', function (e) {
    if (!visible || !pinnedNow() || window.isLayerOpen() || window.Play.isOpen()) return;
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      if (!e.repeat) hold(e.key === 'ArrowRight' ? 1 : -1);
    } else if ((e.key === 'Enter' || e.key === ' ') && near >= 0 && !(e.target.closest && e.target.closest('button, a'))) {
      e.preventDefault();
      openRoom(near);
    }
  });
  document.addEventListener('keyup', function (e) {
    if ((e.key === 'ArrowRight' && holding === 1) || (e.key === 'ArrowLeft' && holding === -1)) release();
  });
  window.addEventListener('blur', release);

  var frame = function (now) {
    requestAnimationFrame(frame);
    if (!visible) { last = 0; return; }
    var dt = Math.min(0.05, (now - (last || now)) / 1000);
    last = now;
    var pinned = pinnedNow();
    if (holding) walker.go(clamp(walker.get() + holding * 260, minX, maxX));
    var x = walker.get();
    var target = clamp(x - W * 0.42, 0, Math.max(0, worldW - W));
    if (reduce) { camX = target; camV = 0; }
    else {
      var k = 7, c = 2 * Math.sqrt(k);
      camV += (k * (target - camX) - c * camV) * dt;
      camX += camV * dt;
    }
    var camKey = (-camX).toFixed(1);
    if (camKey !== lastCam) {
      lastCam = camKey;
      world.style.transform = 'translate3d(' + camKey + 'px,0,0)';
      far.style.transform = 'translate3d(' + (-camX * 0.25).toFixed(1) + 'px,0,0)';
      mid.style.transform = 'translate3d(' + (-camX * 0.55).toFixed(1) + 'px,0,0)';
      front.style.transform = 'translate3d(' + (-camX * 1.45).toFixed(1) + 'px,0,0)';
    }
    var n = -1;
    fronts.forEach(function (f, i) { if (Math.abs(x - f) < 70) n = i; });
    if (pinned && !greeted) {
      greeted = true;
      walker.say('◀ ▶ 로 같이 걸어요');
      setTimeout(function () { if (!moved && near >= 0) walker.say('들어가 보기'); }, 3800);
    }
    if (n !== near) {
      if (near >= 0) sets[near].classList.remove('is-near');
      near = n;
      if (n >= 0) {
        sets[n].classList.add('is-near');
        if (greeted && moved) walker.say('들어가 보기');
      } else {
        walker.say('');
      }
    }
  };
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (en) { visible = en[0].isIntersecting; }, { rootMargin: '120px 0px' }).observe(section);
  } else {
    visible = true;
  }
  requestAnimationFrame(frame);

  var resizeTimer = 0;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(layout, 120);
  });
})();

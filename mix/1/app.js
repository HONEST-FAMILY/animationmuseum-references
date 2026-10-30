(function () {
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };

  var hero = document.querySelector('.hero--paint');
  var sticky = hero.querySelector('.hero-sticky');
  var paint = document.getElementById('paint');
  var startBtn = hero.querySelector('.gb-start');
  var skipBtn = hero.querySelector('.gb-skip');
  var againBtn = hero.querySelector('.gb-again');
  var doneBtn = hero.querySelector('.gb-done');
  var hudNum = hero.querySelector('.gb-num');
  var dots = hero.querySelectorAll('.gb-dots i');
  var brush = hero.querySelector('.gb-brush');
  var COLORS = ['#ee2a24', '#ff8a1f', '#ffd23f', '#3db54a', '#2bb3c0', '#7c7cff', '#f592c3'];

  var W = 240, H = 150;
  var canvas = document.createElement('canvas');
  var ctx = canvas.getContext('2d', { willReadFrequently: true });
  var state = 'sketch';
  var dirty = false, last = null, coverage = 0, colorIndex = 0, travelled = 0;
  var down = false, lastSpark = 0;
  var GOAL = 0.8;

  var resize = function () {
    var r = sticky.getBoundingClientRect();
    var h = Math.max(90, Math.round(W * r.height / Math.max(1, r.width)));
    if (h === H && canvas.width === W) return;
    var keep = null;
    if (canvas.width) { keep = document.createElement('canvas'); keep.width = canvas.width; keep.height = canvas.height; keep.getContext('2d').drawImage(canvas, 0, 0); }
    H = h;
    canvas.width = W;
    canvas.height = H;
    if (keep) ctx.drawImage(keep, 0, 0, W, H);
    dirty = true;
  };

  var dab = function (x, y, rad) {
    var px = x * W, py = y * H, r = rad * W;
    var g = ctx.createRadialGradient(px, py, 0, px, py, r);
    g.addColorStop(0, 'rgba(0,0,0,1)');
    g.addColorStop(0.6, 'rgba(0,0,0,.92)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);
    ctx.fill();
    dirty = true;
  };

  var strokeTo = function (x, y, rad) {
    if (last) {
      var dx = x - last.x, dy = (y - last.y) * H / W;
      var dist = Math.hypot(dx, dy);
      var steps = Math.min(40, Math.ceil(dist / (rad * 0.28)));
      for (var i = 1; i <= steps; i++) dab(last.x + (x - last.x) * i / steps, last.y + (y - last.y) * i / steps, rad);
      travelled += dist;
    } else {
      dab(x, y, rad);
    }
    last = { x: x, y: y };
    if (travelled > 0.35) { travelled = 0; colorIndex = (colorIndex + 1) % COLORS.length; brush.style.setProperty('--tip', COLORS[colorIndex]); }
  };

  var flush = function () {
    if (!dirty) return;
    dirty = false;
    paint.style.setProperty('--paint-mask', 'url(' + canvas.toDataURL('image/png') + ')');
  };

  var measure = function () {
    var x0 = Math.round(W * 0.08), x1 = Math.round(W * 0.92), y0 = Math.round(H * 0.12), y1 = Math.round(H * 0.92);
    var d = ctx.getImageData(x0, y0, x1 - x0, y1 - y0).data, sum = 0, n = 0;
    for (var i = 3; i < d.length; i += 8) { sum += d[i]; n++; }
    coverage = sum / (n * 255);
    var pct = Math.min(100, Math.round(coverage * 100 / GOAL));
    hudNum.textContent = pct;
    dots.forEach(function (dot, k) { dot.classList.toggle('on', pct >= (k + 1) * 10); });
    return coverage;
  };

  var spark = function (x, y) {
    var now = performance.now();
    if (now - lastSpark < 70) return;
    lastSpark = now;
    var s = document.createElement('i');
    s.className = 'gb-spark';
    s.style.left = x + 'px';
    s.style.top = y + 'px';
    s.style.setProperty('--c', COLORS[(colorIndex + 3) % COLORS.length]);
    s.style.setProperty('--dx', ((Math.random() - 0.5) * 60).toFixed(1) + 'px');
    s.style.setProperty('--dy', (-20 - Math.random() * 40).toFixed(1) + 'px');
    sticky.appendChild(s);
    setTimeout(function () { s.remove(); }, 800);
  };

  var placeBrush = function (cx, cy) {
    brush.style.transform = 'translate(' + cx.toFixed(1) + 'px,' + cy.toFixed(1) + 'px)';
    brush.classList.add('is-on');
  };

  var rel = function (e) {
    var r = sticky.getBoundingClientRect();
    return { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height, cx: e.clientX - r.left, cy: e.clientY - r.top };
  };

  var finish = function (instant) {
    if (state === 'alive' || state === 'finishing') return;
    down = false;
    brush.classList.remove('is-on', 'is-down');
    var done = function () {
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, W, H);
      dirty = true;
      flush();
      hudNum.textContent = '100';
      dots.forEach(function (dot) { dot.classList.add('on'); });
      state = 'alive';
      hero.classList.remove('is-sketch', 'is-painting');
      hero.classList.add('is-alive');
      document.documentElement.classList.add('is-alive');
    };
    if (instant || reduce) { done(); return; }
    state = 'finishing';
    var start = performance.now();
    var origin = last || { x: 0.5, y: 0.6 };
    var grow = function (now) {
      var t = clamp((now - start) / 900, 0, 1);
      var e = 1 - Math.pow(1 - t, 3);
      dab(origin.x, origin.y, 0.08 + e * 1.3);
      for (var k = 0; k < 3; k++) dab(Math.random(), Math.random(), 0.06 + e * 0.25);
      flush();
      if (t < 1) requestAnimationFrame(grow);
      else done();
    };
    requestAnimationFrame(grow);
  };

  var start = function () {
    if (state !== 'sketch') return;
    resize();
    state = 'painting';
    last = null;
    hero.classList.remove('is-sketch');
    hero.classList.add('is-painting');
    measure();
  };

  var reset = function () {
    ctx.clearRect(0, 0, W, H);
    dirty = true;
    flush();
    coverage = 0;
    measure();
    last = null;
    state = 'sketch';
    hero.classList.remove('is-alive');
    document.documentElement.classList.remove('is-alive');
    hero.classList.add('is-sketch');
    window.scrollTo({ top: 0, behavior: 'auto' });
    start();
  };

  var onControl = function (e) { return !!e.target.closest('a, button, .gb-card, .gb-guide'); };

  sticky.addEventListener('pointerdown', function (e) {
    if (state === 'alive' || state === 'finishing' || onControl(e) || e.button > 0) return;
    if (state === 'sketch') start();
    e.preventDefault();
    var p = rel(e);
    down = true;
    last = null;
    try { sticky.setPointerCapture(e.pointerId); } catch (err) {}
    brush.classList.add('is-down');
    placeBrush(p.cx, p.cy);
    strokeTo(p.x, p.y, e.pointerType === 'mouse' ? 0.06 : 0.12);
  });
  sticky.addEventListener('pointermove', function (e) {
    if (state !== 'painting') return;
    var p = rel(e);
    if (onControl(e) && !down) { brush.classList.remove('is-on'); return; }
    placeBrush(p.cx, p.cy);
    if (!down) return;
    spark(p.cx, p.cy);
    strokeTo(p.x, p.y, e.pointerType === 'mouse' ? 0.06 : 0.12);
  });
  var lift = function () {
    if (!down) return;
    down = false;
    last = null;
    brush.classList.remove('is-down');
    if (state === 'painting' && measure() >= GOAL) finish();
  };
  sticky.addEventListener('pointerup', lift);
  sticky.addEventListener('pointercancel', lift);
  sticky.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse' && !down) brush.classList.remove('is-on'); });

  startBtn.addEventListener('click', start);
  skipBtn.addEventListener('click', function () { if (state === 'sketch') { resize(); } finish(true); });
  againBtn.addEventListener('click', reset);
  doneBtn.addEventListener('click', function () { finish(); });

  var loop = function () {
    requestAnimationFrame(loop);
    if (state === 'painting' || state === 'finishing') flush();
  };
  requestAnimationFrame(loop);
  setInterval(function () {
    if (state !== 'painting' || !down) return;
    if (measure() >= GOAL) finish();
  }, 220);

  window.addEventListener('resize', function () { if (state !== 'alive') resize(); });

  resize();
  flush();

  var section = document.getElementById('chapters');
  var colorCover = function (el) {
    if (!el || el.classList.contains('is-colored')) return;
    el.classList.add('is-coloring');
    requestAnimationFrame(function () { el.classList.add('is-colored'); });
    setTimeout(function () { el.classList.remove('is-coloring'); }, 1200);
  };
  var current = null;
  var seen = function () {
    var r = section.getBoundingClientRect();
    return r.top < window.innerHeight * 0.6 && r.bottom > window.innerHeight * 0.4;
  };
  window.onChapterIndex = function (i, el) { current = el; if (seen()) colorCover(el); };
  window.addEventListener('scroll', function () {
    var el = current || section.querySelector('.cv.is-on');
    if (el && seen()) colorCover(el);
  }, { passive: true });
})();

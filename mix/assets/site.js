(function () {
  var clamp = function (value, min, max) { return Math.max(min, Math.min(max, value)); };
  var quadProgram = function (gl, vertexSource, fragmentSource) {
    var compile = function (type, source) {
      var shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader;
      console.error(gl.getShaderInfoLog(shader));
      return null;
    };
    var vertex = compile(gl.VERTEX_SHADER, vertexSource);
    var fragment = compile(gl.FRAGMENT_SHADER, fragmentSource);
    if (!vertex || !fragment) return null;
    var program = gl.createProgram();
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error(gl.getProgramInfoLog(program));
      return null;
    }
    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    var position = gl.getAttribLocation(program, 'aPos');
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    return program;
  };
  window.Motion = { clamp: clamp, quadProgram: quadProgram };

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hd = document.querySelector('.hd');
  var onScroll = function () { hd.classList.toggle('is-scrolled', window.scrollY > 40); };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  var closeTimers = {};
  var openLayer = function (el) {
    clearTimeout(closeTimers[el.id]);
    el.hidden = false;
    requestAnimationFrame(function () { requestAnimationFrame(function () { el.classList.add('is-open'); }); });
    document.documentElement.style.overflow = 'hidden';
  };
  var closeLayer = function (el, done) {
    el.classList.remove('is-open');
    clearTimeout(closeTimers[el.id]);
    closeTimers[el.id] = setTimeout(function () { el.hidden = true; if (done) done(); }, reduce ? 0 : 700);
    document.documentElement.style.overflow = '';
  };

  var sm = document.getElementById('sitemap');
  var burger = document.querySelector('.hd-burger');
  var smClose = sm.querySelector('.sm-close');
  burger.addEventListener('click', function () {
    burger.setAttribute('aria-expanded', 'true');
    openLayer(sm);
    setTimeout(function () { smClose.focus(); }, 50);
  });
  var closeSitemap = function () {
    burger.setAttribute('aria-expanded', 'false');
    closeLayer(sm, function () { burger.focus(); });
  };
  smClose.addEventListener('click', closeSitemap);

  var famBtn = document.querySelector('.ft-family-btn');
  var fam = document.getElementById('family');
  famBtn.addEventListener('click', function () {
    var open = fam.hidden;
    fam.hidden = !open;
    famBtn.setAttribute('aria-expanded', String(open));
  });
  document.addEventListener('click', function (e) {
    if (!fam.hidden && !e.target.closest('.ft-family')) { fam.hidden = true; famBtn.setAttribute('aria-expanded', 'false'); }
  });
  document.querySelector('.ft-top-btn').addEventListener('click', function () {
    window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
  });

  var tiltCard = function (el, maxTilt, hoverLift) {
    var tilt = { rx: 0, ry: 0, vx: 0, vy: 0, lift: 1, liftV: 0, targetRx: 0, targetRy: 0, targetLift: 1, running: false, last: 0, rect: null };
    var step = function (now) {
      var dt = Math.min(0.05, (now - (tilt.last || now)) / 1000);
      tilt.last = now;
      tilt.vx += (-150 * (tilt.rx - tilt.targetRx) - 8 * tilt.vx) * dt;
      tilt.rx += tilt.vx * dt;
      tilt.vy += (-150 * (tilt.ry - tilt.targetRy) - 8 * tilt.vy) * dt;
      tilt.ry += tilt.vy * dt;
      tilt.liftV += (-220 * (tilt.lift - tilt.targetLift) - 14 * tilt.liftV) * dt;
      tilt.lift += tilt.liftV * dt;
      el.style.setProperty('--rx', tilt.rx.toFixed(2) + 'deg');
      el.style.setProperty('--ry', tilt.ry.toFixed(2) + 'deg');
      el.style.setProperty('--lift', tilt.lift.toFixed(4));
      var settling = Math.abs(tilt.rx - tilt.targetRx) + Math.abs(tilt.ry - tilt.targetRy) + Math.abs(tilt.vx) + Math.abs(tilt.vy) + Math.abs(tilt.lift - tilt.targetLift) + Math.abs(tilt.liftV) > 0.01;
      if (settling) requestAnimationFrame(step);
      else { tilt.running = false; tilt.last = 0; }
    };
    var kick = function () {
      if (tilt.running) return;
      tilt.running = true;
      requestAnimationFrame(step);
    };
    el.addEventListener('pointerenter', function () { tilt.rect = el.getBoundingClientRect(); });
    el.addEventListener('pointermove', function (e) {
      if (e.pointerType !== 'mouse') return;
      var rect = tilt.rect || el.getBoundingClientRect();
      var localX = clamp((e.clientX - rect.left) / rect.width - 0.5, -0.5, 0.5);
      var localY = clamp((e.clientY - rect.top) / rect.height - 0.5, -0.5, 0.5);
      tilt.targetRx = -localY * 2 * maxTilt;
      tilt.targetRy = localX * 2 * maxTilt;
      tilt.targetLift = hoverLift;
      el.style.setProperty('--glare-x', ((localX + 0.5) * 100).toFixed(1) + '%');
      el.style.setProperty('--glare-y', ((localY + 0.5) * 100).toFixed(1) + '%');
      el.classList.add('is-tilt');
      kick();
    });
    el.addEventListener('pointerleave', function () {
      tilt.targetRx = 0;
      tilt.targetRy = 0;
      tilt.targetLift = 1;
      tilt.rect = null;
      el.classList.remove('is-tilt');
      kick();
    });
  };
  if (!reduce && window.matchMedia('(pointer: fine)').matches) {
    document.querySelectorAll('.now-card').forEach(function (el) { tiltCard(el, 12, 1.05); });
    document.querySelectorAll('.ticket').forEach(function (el) { tiltCard(el, 3, 1); });
    document.querySelectorAll('.card-paper').forEach(function (el) { tiltCard(el, 4, 1); });
  }

  var rec = document.getElementById('rec');
  var data = window.CHAPTER_DATA;
  var recIndex = 0, recReturn = null;
  var q = function (sel) { return rec.querySelector(sel); };
  var fill = function (i) {
    recIndex = i;
    var c = data[i];
    q('[data-rec-no]').textContent = String(i + 1).padStart(2, '0') + ' / ' + String(data.length).padStart(2, '0');
    q('[data-rec-title]').textContent = c.name;
    q('[data-rec-floor]').textContent = c.place;
    q('[data-rec-desc]').textContent = c.desc;
    var photo = q('[data-rec-photo]');
    photo.src = '../assets/img/' + c.photo + '.webp';
    photo.alt = c.photoAlt;
    var art = q('.rec-art');
    art.src = window.Larva ? window.Larva.src(c.pose, 0) : '';
    art.alt = '';
    art.style.animation = 'none';
    void art.offsetWidth;
    art.style.animation = '';
    q('[data-rec-next]').textContent = i < data.length - 1 ? '다음 공간 ' + data[i + 1].name : '처음 공간으로';
  };
  window.openRecord = function (i, from) {
    fill(i);
    recReturn = document.activeElement;
    if (from) {
      var r = from.getBoundingClientRect();
      rec.style.setProperty('--ox', (r.left + r.width / 2) + 'px');
      rec.style.setProperty('--oy', (r.top + r.height / 2) + 'px');
    }
    openLayer(rec);
    setTimeout(function () { q('.rec-close').focus(); }, 60);
  };
  var closeRecord = function () {
    closeLayer(rec, function () { if (recReturn) recReturn.focus(); });
    if (window.onRecordClose) window.onRecordClose(recIndex);
  };
  q('.rec-close').addEventListener('click', closeRecord);
  q('[data-rec-next]').addEventListener('click', function () {
    var n = (recIndex + 1) % data.length;
    var disc = q('.rec-disc');
    disc.style.transition = 'none';
    disc.style.transform = 'translate(-50%, -50%) scale(.9) rotate(-40deg)';
    requestAnimationFrame(function () {
      disc.style.transition = '';
      disc.style.transform = '';
    });
    fill(n);
  });

  var openedLayer = function () {
    if (!rec.hidden) return rec;
    if (!sm.hidden) return sm;
    return null;
  };
  window.isLayerOpen = function () { return openedLayer() !== null; };
  var keepFocusInside = function (layer, e) {
    var focusables = Array.prototype.filter.call(layer.querySelectorAll('a[href], button'), function (el) { return el.offsetParent !== null; });
    if (!focusables.length) return;
    var first = focusables[0], last = focusables[focusables.length - 1];
    if (!layer.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
    else if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  };

  document.addEventListener('keydown', function (e) {
    var layer = openedLayer();
    if (e.key === 'Tab' && layer) { keepFocusInside(layer, e); return; }
    if (e.key !== 'Escape') return;
    if (layer === rec) closeRecord();
    else if (layer === sm) closeSitemap();
  });
})();

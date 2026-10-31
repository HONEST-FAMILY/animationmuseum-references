(function () {
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var VERT = 'attribute vec2 aPos; void main () { gl_Position = vec4(aPos, 0.0, 1.0); }';
  var FRAG = [
    'precision mediump float;',
    'uniform vec2 uRes;',
    'uniform vec2 uCenter;',
    'uniform float uTime;',
    'uniform float uMix;',
    'uniform float uFlat;',
    'uniform vec3 uInnerFrom;',
    'uniform vec3 uOuterFrom;',
    'uniform vec3 uInnerTo;',
    'uniform vec3 uOuterTo;',
    'float hash (vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }',
    'vec3 rings (vec3 inner, vec3 outer, float d) {',
    '  float wave = 0.5 + 0.5 * cos((d * 1.3 - uTime * 0.12) * 6.28318);',
    '  float band = smoothstep(0.22, 0.78, wave);',
    '  vec3 glow = mix(min(inner * 1.12, vec3(1.0)), inner, smoothstep(0.0, 0.5, d));',
    '  vec3 col = mix(outer, glow, band);',
    '  return mix(col, outer, uFlat);',
    '}',
    'void main () {',
    '  vec2 p = (gl_FragCoord.xy - uCenter) / uRes.y;',
    '  float d = length(p);',
    '  vec3 from = rings(uInnerFrom, uOuterFrom, d);',
    '  vec3 to = rings(uInnerTo, uOuterTo, d);',
    '  float r = uMix * 2.4;',
    '  float edge = smoothstep(r, r - 0.05, d);',
    '  vec3 col = mix(from, to, edge);',
    '  float ring = smoothstep(0.035, 0.0, abs(d - r)) * (1.0 - uMix);',
    '  col = mix(col, uOuterTo, ring * 0.85);',
    '  col += (hash(gl_FragCoord.xy + fract(uTime) * 61.0) - 0.5) * 0.06;',
    '  gl_FragColor = vec4(col, 1.0);',
    '}'
  ].join('\n');

  var rgb = function (hex) {
    var v = parseInt(hex.replace('#', ''), 16);
    return [((v >> 16) & 255) / 255, ((v >> 8) & 255) / 255, (v & 255) / 255];
  };

  var createRings = function (canvas) {
    var gl = canvas.getContext('webgl', { antialias: false, premultipliedAlpha: false }) || canvas.getContext('experimental-webgl');
    if (!gl) return null;
    var prog = window.Motion.quadProgram(gl, VERT, FRAG);
    if (!prog) return null;
    var u = {};
    ['uRes', 'uCenter', 'uTime', 'uMix', 'uFlat', 'uInnerFrom', 'uOuterFrom', 'uInnerTo', 'uOuterTo'].forEach(function (name) {
      u[name] = gl.getUniformLocation(prog, name);
    });
    var dpr = Math.min(window.devicePixelRatio || 1, window.matchMedia('(pointer: coarse)').matches ? 1 : 1.5);
    var sizeDirty = true;
    window.addEventListener('resize', function () { sizeDirty = true; });
    var resize = function () {
      if (!sizeDirty) return;
      sizeDirty = false;
      var w = Math.round(canvas.clientWidth * dpr);
      var h = Math.round(canvas.clientHeight * dpr);
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
      }
    };
    return {
      draw: function (s) {
        resize();
        gl.uniform2f(u.uRes, canvas.width, canvas.height);
        gl.uniform2f(u.uCenter, s.cx * dpr, canvas.height - s.cy * dpr);
        gl.uniform1f(u.uTime, s.time);
        gl.uniform1f(u.uMix, s.mix);
        gl.uniform1f(u.uFlat, s.flat);
        gl.uniform3fv(u.uInnerFrom, s.from[0]);
        gl.uniform3fv(u.uOuterFrom, s.from[1]);
        gl.uniform3fv(u.uInnerTo, s.to[0]);
        gl.uniform3fv(u.uOuterTo, s.to[1]);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      }
    };
  };

  var clamp = window.Motion.clamp;
  var drift = function (i, ad, st) { return Math.sin(st.time * 1.1 + i * 2) * 0.014 * st.size * Math.min(ad, 1.2); };
  var depth = function (near, far, st) { return -(near * 0.2 + far * 0.1) * st.size; };

  var layouts = {
    x: function (d, i, st) {
      var ad = Math.abs(d), s = d < 0 ? -1 : 1;
      var near = Math.min(ad, 1), far = Math.max(ad - 1, 0);
      var x = s * (near * 0.8 + far * 0.5) * st.size;
      var y = near * 0.02 * st.h + drift(i, ad, st);
      var zz = depth(near, far, st);
      var scale = (1 - near * 0.36 - far * 0.25) * (1 - Math.min(st.speed * 2.4, 0.08));
      var ry = -clamp(d, -1.6, 1.6) * 26 + st.lean;
      var rz = d * 5 + (i % 2 ? 2 : -2) * near - 1.4 * (1 - near);
      return { t: 'translate3d(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px,' + zz.toFixed(1) + 'px) rotateY(' + ry.toFixed(2) + 'deg) rotateZ(' + rz.toFixed(2) + 'deg) scale(' + Math.max(scale, 0.05).toFixed(4) + ')', z: 100 - Math.round(ad * 10), o: ad > 1.6 ? Math.max(0, 1 - (ad - 1.6) / 0.8) : 1, rx: 0, ry: ry };
    },
    y: function (d, i, st) {
      var ad = Math.abs(d), s = d < 0 ? -1 : 1;
      var near = Math.min(ad, 1), far = Math.max(ad - 1, 0);
      var y = s * (near * 0.6 + far * 0.26) * st.h;
      var x = (s > 0 ? 1 : -1) * near * 0.05 * st.w + drift(i, ad, st);
      var zz = depth(near, far, st);
      var scale = (1 - near * 0.34 - far * 0.18) * (1 - Math.min(st.speed * 2.4, 0.08));
      var rx = -clamp(d, -1.6, 1.6) * 22 + st.lean;
      var rz = d * 8 + (i % 2 ? 2.5 : -2.5) * near - 1.4 * (1 - near);
      return { t: 'translate3d(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px,' + zz.toFixed(1) + 'px) rotateX(' + rx.toFixed(2) + 'deg) rotateZ(' + rz.toFixed(2) + 'deg) scale(' + Math.max(scale, 0.05).toFixed(4) + ')', z: 100 - Math.round(ad * 10), o: ad > 2.2 ? 0 : (ad > 1.4 ? 1 - (ad - 1.4) / 0.8 : 1), rx: rx, ry: 0 };
    }
  };

  window.Chapters = function (o) {
    var section = o.section, stage = o.stage;
    var items = Array.prototype.slice.call(o.items);
    var n = items.length;
    var palette = o.palette.map(function (pair) { return [rgb(pair[0]), rgb(pair[1])]; });
    var layout = layouts[o.axis || 'x'];
    var rings = o.canvas ? createRings(o.canvas) : null;
    if (!rings && o.canvas) o.canvas.style.display = 'none';

    var p = 0, target = 0, prevP = 0, speed = 0, index = -1, lastNow = 0, lean = 0;
    var axis = o.axis || 'x';
    var coarse = !window.matchMedia('(pointer: fine)').matches;
    var faces = items.map(function (el) { return el.querySelector('.cv-face'); });
    var sleeves = items.map(function (el) { return el.querySelector('.cv-sleeve'); });
    var cards = items.map(function () { return { rx: 0, ry: 0, vx: 0, vy: 0, lift: 1, liftV: 0, dirty: true }; });
    var press = { over: false, x: 0, y: 0 };
    var colorFrom = palette[0], colorTo = palette[0], mixStart = -10;
    var flat = 0, active = true, dragging = false, snapTimer = null;
    var start = performance.now();

    var range = function () {
      var top = section.getBoundingClientRect().top + window.scrollY;
      return { top: top, h: Math.max(1, section.offsetHeight - window.innerHeight) };
    };
    var scrollFor = function (i) {
      var r = range();
      return r.top + r.h * i / Math.max(1, n - 1);
    };
    var readTarget = function () {
      var r = range();
      target = clamp((window.scrollY - r.top) / r.h, 0, 1) * (n - 1);
    };

    var setIndex = function (i) {
      if (i === index) return;
      var dir = i > index ? 1 : -1;
      colorFrom = index < 0 ? palette[i] : colorTo;
      colorTo = palette[i];
      mixStart = index < 0 ? -10 : performance.now();
      index = i;
      items.forEach(function (el, k) {
        el.classList.toggle('is-on', k === i);
        sleeves[k].tabIndex = k === i ? 0 : -1;
      });
      if (o.onIndex) o.onIndex(i, dir);
    };

    var go = function (i) {
      i = clamp(i, 0, n - 1);
      window.scrollTo({ top: scrollFor(i), behavior: reduce ? 'auto' : 'smooth' });
    };

    var center = function () {
      var r = (o.canvas || stage).getBoundingClientRect();
      var a = o.anchor.getBoundingClientRect();
      return { x: a.left - r.left, y: clamp(a.top - r.top, 0, r.height * 0.48) };
    };

    var setStyle = function (el, name, value) {
      var cache = el.__styles || (el.__styles = {});
      if (cache[name] === value) return;
      cache[name] = value;
      el.style[name] = value;
    };

    var faceParts = [];
    var facePart = function (k) {
      if (!faceParts[k]) faceParts[k] = { glare: faces[k].querySelector('.cv-glare'), cello: faces[k].querySelector('.cv-cello'), shade: faces[k].querySelector('.cv-shade') };
      return faceParts[k];
    };

    var MAX_TILT = 15;
    var tiltCard = function (k, dt, tm) {
      var card = cards[k], on = k === index;
      var targetRx = 0, targetRy = 0, targetLift = 1;
      if (on && !reduce) {
        if (press.over) { targetRx = -press.y * 2 * MAX_TILT; targetRy = press.x * 2 * MAX_TILT; targetLift = 1.045; }
        else { targetRx = Math.sin(tm * 0.8) * (coarse ? 5 : 2.2); targetRy = Math.sin(tm * 0.63 + 1) * (coarse ? 7 : 3); }
      }
      if (reduce) { card.rx = targetRx; card.ry = targetRy; card.lift = targetLift; card.vx = card.vy = card.liftV = 0; }
      else {
        var damping = on && press.over ? 6.5 : 9;
        card.vx += (-150 * (card.rx - targetRx) - damping * card.vx) * dt; card.rx += card.vx * dt;
        card.vy += (-150 * (card.ry - targetRy) - damping * card.vy) * dt; card.ry += card.vy * dt;
        card.liftV += (-220 * (card.lift - targetLift) - 14 * card.liftV) * dt; card.lift += card.liftV * dt;
      }
      var still = Math.abs(card.rx) + Math.abs(card.ry) + Math.abs(card.vx) + Math.abs(card.vy) < 0.01 && Math.abs(card.lift - 1) < 0.0005;
      if (!on && still && !card.dirty) return;
      card.dirty = !still;
      var parts = facePart(k);
      setStyle(sleeves[k], 'transform', 'rotateX(' + card.rx.toFixed(2) + 'deg) rotateY(' + card.ry.toFixed(2) + 'deg) scale(' + card.lift.toFixed(4) + ')');
      var tiltX = card.ry / MAX_TILT, tiltY = card.rx / MAX_TILT;
      var glareX = on && press.over ? 50 + press.x * 100 : 50 - tiltX * 40;
      var glareY = on && press.over ? 50 + press.y * 100 : 30 + tiltY * 40;
      var tiltAmount = Math.min(1, Math.hypot(tiltX, tiltY));
      if (parts.glare) {
        setStyle(parts.glare, 'transform', 'translate(' + ((glareX / 100 - 0.5) / 3 * 100).toFixed(2) + '%,' + ((glareY / 100 - 0.5) / 3 * 100).toFixed(2) + '%)');
        setStyle(parts.glare, 'opacity', (on ? (press.over ? 0.95 : 0.3 + tiltAmount * 0.5) : 0).toFixed(3));
      }
      if (parts.cello) {
        setStyle(parts.cello, 'transform', 'translate(' + (-tiltX * 5).toFixed(2) + '%,' + (tiltY * 5).toFixed(2) + '%) rotate(-4deg)');
        setStyle(parts.cello, 'opacity', (0.24 + tiltAmount * 0.3).toFixed(3));
      }
    };
    var shade = function (k, l) {
      var card = cards[k];
      var rx = (l.rx + card.rx) * Math.PI / 180, ry = (l.ry + card.ry) * Math.PI / 180;
      var facing = Math.sin(rx) + Math.cos(ry) * Math.cos(rx);
      var light = 0.5 + 0.5 * clamp(facing, 0, 1);
      var parts = facePart(k);
      if (parts.shade) setStyle(parts.shade, 'opacity', clamp((1 - light) * 1.25, 0, 0.5).toFixed(3));
    };

    var frame = function (now) {
      requestAnimationFrame(frame);
      if (!active || document.hidden) { lastNow = now; return; }
      var dt = clamp((now - (lastNow || now)) / 1000, 0, 0.05);
      lastNow = now;
      var tm = (now - start) / 1000;
      var c = rings ? center() : null;
      p += (target - p) * (reduce ? 1 : 0.13);
      speed = Math.abs(p - prevP);
      var vel = dt > 0 ? (p - prevP) / dt : 0;
      prevP = p;
      lean += ((reduce ? 0 : clamp((axis === 'x' ? -vel : vel) * 5, -16, 16)) - lean) * 0.2;
      var st = { w: stage.clientWidth, h: stage.clientHeight, size: items[0].offsetWidth, speed: speed, time: reduce ? 0 : tm, lean: lean };
      items.forEach(function (el, k) {
        var l = layout(k - p, k, st);
        setStyle(el, 'transform', l.t);
        setStyle(el, 'zIndex', String(l.z));
        setStyle(el, 'opacity', String(l.o));
        tiltCard(k, dt, tm);
        shade(k, l);
      });
      var moving = Math.abs(target - p) > 0.02;
      stage.classList.toggle('is-moving', moving);
      setIndex(Math.round(p));
      if (o.onProgress) o.onProgress(p);
      if (rings) {
        flat += ((moving ? Math.min(1, speed * 26) : 0) - flat) * 0.18;
        var mix = clamp((now - mixStart) / 900, 0, 1);
        rings.draw({ cx: c.x, cy: c.y, time: reduce ? 0 : (now - start) / 1000, mix: reduce ? 1 : mix, flat: reduce ? 0 : flat, from: colorFrom, to: colorTo });
      }
    };

    var lastInput = 0;
    ['wheel', 'touchstart', 'touchmove', 'keydown', 'pointerdown'].forEach(function (type) {
      window.addEventListener(type, function () { lastInput = performance.now(); }, { passive: true });
    });

    window.addEventListener('scroll', function () {
      readTarget();
      if (snapTimer) clearTimeout(snapTimer);
      snapTimer = setTimeout(function () {
        if (dragging || performance.now() - lastInput > 1500) return;
        var r = range();
        if (window.scrollY <= r.top + 2 || window.scrollY >= r.top + r.h - 2) return;
        var near = Math.round(target);
        if (Math.abs(target - near) > 0.015) window.scrollTo({ top: scrollFor(near), behavior: reduce ? 'auto' : 'smooth' });
      }, 160);
    }, { passive: true });
    window.addEventListener('resize', readTarget);

    if (o.drag) {
      var startX = 0, startY = 0, startScroll = 0, lastX = 0, lastT = 0, vel = 0, decided = false, horizontal = false;
      var perPx = function () { return (range().h / Math.max(1, n - 1)) / (stage.clientWidth * (stage.clientWidth < 700 ? 0.55 : 0.32)); };
      stage.addEventListener('pointerdown', function (e) {
        if (e.button !== 0 || e.target.closest('a, .ch-player')) return;
        dragging = true; decided = false; horizontal = false;
        startX = lastX = e.clientX; startY = e.clientY; startScroll = window.scrollY; lastT = performance.now(); vel = 0;
      });
      window.addEventListener('pointermove', function (e) {
        if (!dragging) return;
        var dx = e.clientX - startX, dy = e.clientY - startY;
        if (!decided && (Math.abs(dx) > 6 || Math.abs(dy) > 6)) { decided = true; horizontal = Math.abs(dx) > Math.abs(dy); if (horizontal) stage.classList.add('is-drag'); }
        if (!horizontal) return;
        var now = performance.now();
        vel = (e.clientX - lastX) / Math.max(1, now - lastT);
        lastX = e.clientX; lastT = now;
        var r = range();
        window.scrollTo({ top: clamp(startScroll - dx * perPx(), r.top, r.top + r.h), behavior: 'instant' });
      });
      var release = function () {
        if (!dragging) return;
        dragging = false;
        stage.classList.remove('is-drag');
        if (!horizontal) return;
        stage.classList.add('was-drag');
        setTimeout(function () { stage.classList.remove('was-drag'); }, 60);
        var v = clamp(vel, -3, 3);
        var extra = Math.abs(v) > 0.25 ? -Math.sign(v) * Math.min(3, Math.max(1, Math.round(Math.abs(v) * 1.2))) : 0;
        go(Math.round(target) + extra);
      };
      window.addEventListener('pointerup', release);
      window.addEventListener('pointercancel', release);
    }

    if (!reduce) {
      var setPress = function (e) {
        if (index < 0) return;
        var rect = faces[index].getBoundingClientRect();
        var localX = (e.clientX - rect.left) / rect.width - 0.5, localY = (e.clientY - rect.top) / rect.height - 0.5;
        press.over = Math.abs(localX) < 0.56 && Math.abs(localY) < 0.56;
        press.x = clamp(localX, -0.5, 0.5);
        press.y = clamp(localY, -0.5, 0.5);
      };
      stage.addEventListener('pointermove', function (e) {
        if (e.pointerType === 'mouse' || e.buttons) setPress(e);
      });
      stage.addEventListener('pointerdown', setPress);
      stage.addEventListener('pointerleave', function () { press.over = false; });
      window.addEventListener('pointerup', function (e) { if (e.pointerType !== 'mouse') press.over = false; });
      window.addEventListener('pointercancel', function () { press.over = false; });
    }

    var moved = false;
    stage.addEventListener('pointerdown', function () { moved = false; }, true);
    window.addEventListener('pointermove', function (e) { if (e.buttons && (Math.abs(e.movementX) + Math.abs(e.movementY) > 2)) moved = true; }, true);
    sleeves.forEach(function (btn, k) {
      btn.addEventListener('click', function (e) {
        if (moved && dragging === false && stage.classList.contains('was-drag')) { e.preventDefault(); return; }
        if (k === index && o.onOpen) o.onOpen(k, btn);
        else go(k);
      });
    });

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) { active = entries[0].isIntersecting; }, { rootMargin: '100% 0px' }).observe(section);
    }

    readTarget();
    p = prevP = target;
    requestAnimationFrame(frame);

    return {
      go: go,
      index: function () { return index; },
      next: function () { go(Math.round(target) + 1); },
      prev: function () { go(Math.round(target) - 1); },
      count: n
    };
  };
})();

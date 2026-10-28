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
    var compile = function (type, src) {
      var s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null;
    };
    var vs = compile(gl.VERTEX_SHADER, VERT);
    var fs = compile(gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return null;
    var prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;
    gl.useProgram(prog);
    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(prog, 'aPos');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    var u = {};
    ['uRes', 'uCenter', 'uTime', 'uMix', 'uFlat', 'uInnerFrom', 'uOuterFrom', 'uInnerTo', 'uOuterTo'].forEach(function (name) {
      u[name] = gl.getUniformLocation(prog, name);
    });
    var dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    var resize = function () {
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

  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };

  var layouts = {
    x: function (d, i, st) {
      var ad = Math.abs(d), s = d < 0 ? -1 : 1;
      var near = Math.min(ad, 1), far = Math.max(ad - 1, 0);
      var spread = st.w < 700 ? 0.62 : 0.33;
      var x = s * (near * spread + far * (st.w < 700 ? 0.34 : 0.19)) * st.w;
      var y = near * 0.035 * st.h;
      var scale = (1 - near * 0.4 - far * 0.08) * (1 - Math.min(st.speed * 2.4, 0.08));
      var ry = -clamp(d, -1.6, 1.6) * 26;
      var rz = d * 6 + (i % 2 ? 2.2 : -2.2) * near - 1.4 * (1 - near);
      return { t: 'translate3d(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px,0) rotateY(' + ry.toFixed(2) + 'deg) rotateZ(' + rz.toFixed(2) + 'deg) scale(' + scale.toFixed(4) + ')', z: 100 - Math.round(ad * 10), o: ad > 2.8 ? 0 : 1 };
    },
    y: function (d, i, st) {
      var ad = Math.abs(d), s = d < 0 ? -1 : 1;
      var near = Math.min(ad, 1), far = Math.max(ad - 1, 0);
      var y = s * (near * 0.58 + far * 0.3) * st.h;
      var x = (i % 2 ? 1 : -1) * near * 0.06 * st.w;
      var scale = (1 - near * 0.34 - far * 0.06) * (1 - Math.min(st.speed * 2.4, 0.08));
      var rx = -clamp(d, -1.6, 1.6) * 18;
      var rz = d * 9 + (i % 2 ? 3 : -3) * near - 1.4 * (1 - near);
      return { t: 'translate3d(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px,0) rotateX(' + rx.toFixed(2) + 'deg) rotateZ(' + rz.toFixed(2) + 'deg) scale(' + scale.toFixed(4) + ')', z: 100 - Math.round(ad * 10), o: ad > 2.6 ? 0 : 1 };
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

    var p = 0, target = 0, prevP = 0, speed = 0, index = -1;
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
      items.forEach(function (el, k) { el.classList.toggle('is-on', k === i); });
      if (o.onIndex) o.onIndex(i, dir);
    };

    var go = function (i) {
      i = clamp(i, 0, n - 1);
      window.scrollTo({ top: scrollFor(i), behavior: reduce ? 'auto' : 'smooth' });
    };

    var center = function () {
      var r = stage.getBoundingClientRect();
      var a = o.anchor.getBoundingClientRect();
      return { x: a.left - r.left, y: a.top - r.top };
    };

    var frame = function (now) {
      requestAnimationFrame(frame);
      if (!active || document.hidden) return;
      p += (target - p) * (reduce ? 1 : 0.13);
      speed = Math.abs(p - prevP);
      prevP = p;
      var st = { w: stage.clientWidth, h: stage.clientHeight, speed: speed };
      items.forEach(function (el, k) {
        var l = layout(k - p, k, st);
        el.style.transform = l.t;
        el.style.zIndex = l.z;
        el.style.opacity = l.o;
      });
      var moving = Math.abs(target - p) > 0.02;
      stage.classList.toggle('is-moving', moving);
      setIndex(Math.round(p));
      if (o.onProgress) o.onProgress(p);
      if (rings) {
        flat += ((moving ? Math.min(1, speed * 26) : 0) - flat) * 0.18;
        var mix = clamp((now - mixStart) / 900, 0, 1);
        var c = center();
        rings.draw({ cx: c.x, cy: c.y, time: reduce ? 0 : (now - start) / 1000, mix: reduce ? 1 : mix, flat: reduce ? 0 : flat, from: colorFrom, to: colorTo });
      }
    };

    window.addEventListener('scroll', function () {
      readTarget();
      if (snapTimer) clearTimeout(snapTimer);
      snapTimer = setTimeout(function () {
        if (dragging) return;
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
        if (e.button !== 0 || e.target.closest('a, button')) return;
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
        var v = clamp(vel, -3, 3);
        var extra = Math.abs(v) > 0.25 ? -Math.sign(v) * Math.min(3, Math.max(1, Math.round(Math.abs(v) * 1.2))) : 0;
        go(Math.round(target) + extra);
      };
      window.addEventListener('pointerup', release);
      window.addEventListener('pointercancel', release);
    }

    if (!reduce && window.matchMedia('(pointer: fine)').matches) {
      stage.addEventListener('pointermove', function (e) {
        var r = stage.getBoundingClientRect();
        var nx = (e.clientX - r.left) / r.width - 0.5, ny = (e.clientY - r.top) / r.height - 0.5;
        stage.style.setProperty('--tx', (nx * 14).toFixed(2) + 'deg');
        stage.style.setProperty('--ty', (-ny * 10).toFixed(2) + 'deg');
        stage.style.setProperty('--sx', (nx * 60).toFixed(1) + '%');
      });
      stage.addEventListener('pointerleave', function () {
        stage.style.setProperty('--tx', '0deg');
        stage.style.setProperty('--ty', '0deg');
        stage.style.setProperty('--sx', '0%');
      });
    }

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) { active = entries[0].isIntersecting; }, { rootMargin: '200px 0px' }).observe(section);
    }

    readTarget();
    p = prevP = target;
    requestAnimationFrame(frame);

    return {
      go: go,
      next: function () { go(Math.round(target) + 1); },
      prev: function () { go(Math.round(target) - 1); },
      count: n
    };
  };
})();

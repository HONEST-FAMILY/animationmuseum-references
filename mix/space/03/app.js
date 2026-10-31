(function () {
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var coarse = window.matchMedia('(pointer: coarse)').matches;
  var body = document.body;
  var stage = document.querySelector('.sp-stage');
  var canvas = stage.querySelector('.sp-canvas');
  var spotsEl = stage.querySelector('.sp-spots');
  var say = document.querySelector('.sp-say');
  var card = document.querySelector('.sp-card');
  var soundBtn = document.querySelector('.sp-sound');
  var tiltBtn = document.querySelector('.sp-tilt');
  var back = document.querySelector('.sp-back');
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  var lerp = function (a, b, t) { return a + (b - a) * t; };
  var fix = function (s) { return s ? s.replace(/^\.\.\/assets\//, '../../assets/') : s; };
  var works = ((window.WORKS || [])[2] || []).map(function (w) {
    var c = {};
    Object.keys(w).forEach(function (k) { c[k] = w[k]; });
    c.src = fix(w.src);
    c.thumb = fix(w.thumb);
    return c;
  });
  var A = 1600 / 864;
  var TAN_V = Math.tan(25 * Math.PI / 180);
  var TAN_H = TAN_V * A;
  var ZN = 1.6, ZF = 7;
  var LENS = [0.556, 0.388];
  var AIM = [0.365, 0.335];
  var HEAD = [0.505, 0.38];
  var FRAME = 1.25;
  var GUIDE = coarse ? '끌어서 둘러보고, 노란 동그라미를 눌러 보세요' : '마우스로 둘러보고, 노란 동그라미를 눌러 보세요';
  var W = window.innerWidth, H = window.innerHeight;
  var clock = 0;
  var lastInput = -10;
  var focus = -1;
  var flat = false;
  var spots = [];

  var ref = document.referrer;
  if (ref && ref.indexOf(window.location.origin) === 0 && /\/play\d\//.test(ref)) {
    back.href = ref.split('#')[0] + '#room-03';
    back.querySelector('.sp-back-label').textContent = '방 사진으로 돌아가기';
  }
  say.textContent = GUIDE;

  var audio = null, wantSound = true;
  var buildSound = function () {
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    var ctx = new AC();
    var rate = ctx.sampleRate;
    var buf = ctx.createBuffer(1, rate, rate);
    var d = buf.getChannelData(0);
    var n, k;
    for (k = 0; k < 18; k++) {
      var at = Math.floor(k * rate / 18 + (Math.random() - 0.5) * rate * 0.004);
      var amp = 0.35 + Math.random() * 0.4;
      for (n = 0; n < rate * 0.014; n++) {
        if (at + n >= rate || at + n < 0) continue;
        d[at + n] += (Math.random() * 2 - 1) * amp * Math.exp(-n / (rate * 0.0022));
      }
    }
    for (n = 0; n < rate; n++) d[n] += Math.sin(n / rate * Math.PI * 2 * 48) * 0.06 + Math.sin(n / rate * Math.PI * 2 * 96) * 0.03 + (Math.random() * 2 - 1) * 0.015;
    var src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    var low = ctx.createBiquadFilter();
    low.type = 'lowpass';
    low.frequency.value = 3800;
    var gain = ctx.createGain();
    gain.gain.value = 0;
    src.connect(low);
    low.connect(gain);
    gain.connect(ctx.destination);
    src.start();
    return { ctx: ctx, gain: gain };
  };
  var setSound = function (on) {
    if (on && !audio) audio = buildSound();
    soundBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
    soundBtn.textContent = on ? '소리 끄기' : '소리 켜기';
    if (!audio) return;
    if (on && audio.ctx.state !== 'running') audio.ctx.resume();
    audio.gain.gain.setTargetAtTime(on ? 0.12 : 0, audio.ctx.currentTime, on ? 0.35 : 0.12);
  };
  soundBtn.addEventListener('click', function () {
    var on = soundBtn.getAttribute('aria-pressed') !== 'true';
    wantSound = on;
    setSound(on);
  });
  var firstTap = function () {
    if (wantSound && !audio) setSound(true);
  };

  var gyro = { x: 0, y: 0, g0: null, b0: null };
  var onOrient = function (e) {
    if (e.gamma === null || e.beta === null) return;
    if (gyro.g0 === null) { gyro.g0 = e.gamma; gyro.b0 = e.beta; }
    gyro.g0 += (e.gamma - gyro.g0) * 0.004;
    gyro.b0 += (e.beta - gyro.b0) * 0.004;
    gyro.x = clamp((e.gamma - gyro.g0) / 20, -1, 1);
    gyro.y = clamp((e.beta - gyro.b0) / 20, -1, 1);
  };
  if (coarse && window.DeviceOrientationEvent) {
    if (typeof window.DeviceOrientationEvent.requestPermission === 'function') {
      tiltBtn.hidden = false;
      tiltBtn.addEventListener('click', function () {
        window.DeviceOrientationEvent.requestPermission().then(function (r) {
          if (r !== 'granted') return;
          window.addEventListener('deviceorientation', onOrient);
          tiltBtn.hidden = true;
        }).catch(function () {});
      });
    } else {
      window.addEventListener('deviceorientation', onOrient);
    }
  }

  var drag = { x: 0, y: 0, down: false, id: -1, px: 0, py: 0 };
  var mouse = { x: 0, y: 0 };
  var view = { fov: 50, rangeU: 0.05, rangeV: 0.02, minU: 0.4, maxU: 0.6, minV: 0.45, maxV: 0.55, u0: 0.5, v0: 0.5, dragK: 2.4, tAmp: 0.16, drift: 0.02, aspect: 1 };
  var layout = function () {
    W = window.innerWidth;
    H = window.innerHeight;
    var a = W / H;
    var tanV = (a >= A ? TAN_H / a : TAN_V) * 0.9;
    var visU = tanV * a / TAN_H, visV = tanV / TAN_V;
    view.aspect = a;
    view.fov = Math.atan(tanV) * 360 / Math.PI;
    view.minU = visU / 2 + 0.05;
    view.maxU = 1 - visU / 2 - 0.05;
    view.minV = visV / 2 + 0.02;
    view.maxV = 1 - visV / 2 - 0.02;
    view.rangeU = Math.max(0.02, (view.maxU - view.minU) / 2);
    view.rangeV = Math.max(0.01, (view.maxV - view.minV) / 2);
    view.u0 = a < 1 ? 0.42 : 0.5;
    view.v0 = 0.5;
    view.dragK = coarse ? visU / view.rangeU : 2.4;
    view.tAmp = a < 1 ? 0.08 : 0.16;
    view.drift = a < 1 ? 0.05 : 0.025;
    view.padL = W < 760 ? 62 : 28;
    view.padR = W < 760 ? 62 : 240;
  };
  layout();

  stage.addEventListener('pointerdown', function (e) {
    firstTap();
    if (e.target.closest('.sp-spot')) return;
    drag.down = true;
    drag.id = e.pointerId;
    drag.px = e.clientX;
    drag.py = e.clientY;
    lastInput = clock;
    try { stage.setPointerCapture(e.pointerId); } catch (err) {}
  });
  stage.addEventListener('pointermove', function (e) {
    if (e.pointerType === 'mouse') {
      mouse.x = clamp(e.clientX / W * 2 - 1, -1, 1);
      mouse.y = clamp(e.clientY / H * 2 - 1, -1, 1);
      lastInput = clock;
    }
    if (!drag.down || e.pointerId !== drag.id) return;
    var dx = e.clientX - drag.px, dy = e.clientY - drag.py;
    drag.px = e.clientX;
    drag.py = e.clientY;
    drag.x = clamp(drag.x - dx / W * view.dragK, -1.6, 1.6);
    drag.y = clamp(drag.y - dy / H * 2, -1.2, 1.2);
    lastInput = clock;
  });
  var release = function (e) { if (e.pointerId === drag.id) drag.down = false; };
  stage.addEventListener('pointerup', release);
  stage.addEventListener('pointercancel', release);

  var makeSpot = function (j) {
    var w = works[j];
    var el = document.createElement('button');
    el.type = 'button';
    el.className = 'sp-spot';
    el.innerHTML = '<span class="sp-spot-ring" aria-hidden="true"></span><span class="sp-spot-label"></span>';
    el.querySelector('.sp-spot-label').innerHTML = '<span></span><small></small>';
    el.querySelector('.sp-spot-label span').textContent = w.title;
    el.querySelector('.sp-spot-label small').textContent = j === 0 ? '벽에 비친 그림 · 눌러서 다가가기' : '영사기 · 눌러서 유리필름 비추기';
    el.setAttribute('aria-label', w.title + ', 눌러서 다가가 보기');
    el.addEventListener('click', function () { firstTap(); setFocus(j); });
    spotsEl.appendChild(el);
    return { el: el, x: -999, y: -999, vis: true, p: null };
  };

  var fillCard = function (j) {
    var w = works[j];
    card.querySelector('.sp-card-no').textContent = '작품 ' + (j + 1) + ' / ' + works.length + ' · 03 영사기';
    card.querySelector('.sp-card-title').textContent = w.title;
    card.querySelector('.sp-card-meta').textContent = w.meta;
    card.querySelector('.sp-card-desc').textContent = w.desc;
    card.querySelector('.sp-card-credit').textContent = '출처 · ' + w.credit;
    card.querySelector('[data-sp-other]').textContent = (j === 0 ? '유리필름 비추기' : '그림띠 다시 보기') + ' ▶';
    var media = card.querySelector('.sp-card-media');
    media.innerHTML = '';
    if (!flat) return;
    if (w.kind === 'video') {
      var v = document.createElement('video');
      v.muted = true;
      v.loop = true;
      v.autoplay = true;
      v.playsInline = true;
      v.setAttribute('playsinline', '');
      v.poster = w.thumb;
      v.src = w.src;
      media.appendChild(v);
      var p = v.play();
      if (p && p.catch) p.catch(function () {});
    } else {
      var img = document.createElement('img');
      img.src = w.src;
      img.alt = w.title;
      media.appendChild(img);
    }
  };
  var cardH = 0, cardW = 0;
  var setFocus = function (j) {
    focus = j;
    body.classList.toggle('is-focus', j >= 0);
    spots.forEach(function (s, k) { s.el.classList.toggle('is-seen', s.el.classList.contains('is-seen') || k === j); });
    if (j < 0) {
      card.classList.remove('is-on');
      setTimeout(function () { if (focus < 0) card.hidden = true; }, 380);
      say.textContent = spots.every(function (s) { return s.el.classList.contains('is-seen'); }) ? '두 작품 다 봤어요! 이제 방 사진으로 돌아가 볼까요?' : GUIDE;
      return;
    }
    fillCard(j);
    card.hidden = false;
    cardH = card.offsetHeight;
    cardW = card.offsetWidth;
    requestAnimationFrame(function () { card.classList.add('is-on'); });
    wake();
  };
  card.querySelector('[data-sp-other]').addEventListener('click', function () { setFocus(focus === 0 ? 1 : 0); });
  card.querySelector('[data-sp-out]').addEventListener('click', function () { setFocus(-1); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && focus >= 0) setFocus(-1); });

  var flatLayout = function () {
    var s = Math.max(W / 1600, H / 864);
    var ox = (W - 1600 * s) / 2, oy = (H - 864 * s) / 2;
    [AIM, HEAD].forEach(function (uv, j) {
      if (!spots[j]) return;
      spots[j].el.style.transform = 'translate3d(' + clamp(ox + uv[0] * 1600 * s, view.padL, W - view.padR).toFixed(1) + 'px,' + (oy + uv[1] * 864 * s).toFixed(1) + 'px,0)';
    });
  };
  var goFlat = function () {
    if (flat) return;
    flat = true;
    body.classList.add('is-flat');
    body.classList.remove('is-3d');
    flatLayout();
  };

  spots = works.map(function (w, j) { return makeSpot(j); });

  var raf = 0, running = false, wake = function () {};
  window.addEventListener('resize', function () {
    layout();
    if (flat) flatLayout();
  });

  var loadImage = function (src) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      img.onload = function () { resolve(img); };
      img.onerror = reject;
      img.src = src;
    });
  };

  var blur = function (a, w, h) {
    var out = new Float32Array(a.length);
    for (var pass = 0; pass < 2; pass++) {
      for (var y = 0; y < h; y++) {
        for (var x = 0; x < w; x++) {
          var s = 0, c = 0;
          for (var dy = -1; dy <= 1; dy++) {
            var yy = y + dy;
            if (yy < 0 || yy >= h) continue;
            for (var dx = -1; dx <= 1; dx++) {
              var xx = x + dx;
              if (xx < 0 || xx >= w) continue;
              s += a[yy * w + xx];
              c++;
            }
          }
          out[y * w + x] = s / c;
        }
      }
      var t = a; a = out; out = t;
    }
    return a;
  };

  var start = function (THREE, depthImg) {
    var dw = depthImg.naturalWidth, dh = depthImg.naturalHeight;
    var cv = document.createElement('canvas');
    cv.width = dw;
    cv.height = dh;
    var cx2 = cv.getContext('2d', { willReadFrequently: true });
    cx2.drawImage(depthImg, 0, 0);
    var px = cx2.getImageData(0, 0, dw, dh).data;
    var front = new Float32Array(dw * dh), backD = new Float32Array(dw * dh);
    for (var i = 0; i < dw * dh; i++) { front[i] = px[i * 4] / 255; backD[i] = px[i * 4 + 1] / 255; }
    front = blur(front, dw, dh);
    backD = blur(backD, dw, dh);
    var sample = function (arr, u, v) {
      var x = clamp(u, 0, 1) * (dw - 1), y = clamp(v, 0, 1) * (dh - 1);
      var x0 = Math.floor(x), y0 = Math.floor(y), x1 = Math.min(dw - 1, x0 + 1), y1 = Math.min(dh - 1, y0 + 1);
      var fx = x - x0, fy = y - y0;
      return lerp(lerp(arr[y0 * dw + x0], arr[y0 * dw + x1], fx), lerp(arr[y1 * dw + x0], arr[y1 * dw + x1], fx), fy);
    };
    var zOf = function (inv) { return 1 / (inv * (1 / ZN - 1 / ZF) + 1 / ZF); };
    var unproject = function (u, v, z) { return new THREE.Vector3((u * 2 - 1) * TAN_H * z, (1 - v * 2) * TAN_V * z, -z); };
    var depthAt = function (u, v) { return zOf(sample(front, u, v)); };

    var renderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: !coarse, alpha: false, powerPreference: 'high-performance' });
    } catch (err) {
      goFlat();
      return;
    }
    renderer.setPixelRatio(coarse ? 1 : Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setSize(W, H, false);
    renderer.setClearColor(0x0d1424, 1);
    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(view.fov, W / H, 0.05, 40);

    var grid = function (cols, arr, push, withEdge) {
      var rows = Math.round(cols / A);
      var n = (cols + 1) * (rows + 1);
      var pos = new Float32Array(n * 3), uv = new Float32Array(n * 2), edge = new Float32Array(n), zs = new Float32Array(n);
      var r, c, k;
      for (r = 0; r <= rows; r++) {
        for (c = 0; c <= cols; c++) {
          k = r * (cols + 1) + c;
          var u = c / cols, v = r / rows;
          var z = zOf(sample(arr, u, v)) * push;
          zs[k] = z;
          pos[k * 3] = (u * 2 - 1) * TAN_H * z;
          pos[k * 3 + 1] = (1 - v * 2) * TAN_V * z;
          pos[k * 3 + 2] = -z;
          uv[k * 2] = u;
          uv[k * 2 + 1] = 1 - v;
        }
      }
      if (withEdge) {
        for (r = 0; r <= rows; r++) {
          for (c = 0; c <= cols; c++) {
            k = r * (cols + 1) + c;
            var m = 0;
            [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (o) {
              var rr = r + o[1], cc = c + o[0];
              if (rr < 0 || rr > rows || cc < 0 || cc > cols) return;
              var z2 = zs[rr * (cols + 1) + cc];
              m = Math.max(m, Math.abs(z2 - zs[k]) / Math.min(z2, zs[k]));
            });
            edge[k] = m > 0.075 ? 1 : 0;
          }
        }
        var band = new Float32Array(n), near = new Float32Array(n), reach = 2, r2, c2;
        for (r = 0; r <= rows; r++) {
          for (c = 0; c <= cols; c++) {
            k = r * (cols + 1) + c;
            var touched = 0, zMin = zs[k];
            for (r2 = Math.max(0, r - reach); r2 <= Math.min(rows, r + reach); r2++) {
              for (c2 = Math.max(0, c - reach); c2 <= Math.min(cols, c + reach); c2++) {
                var q2 = r2 * (cols + 1) + c2;
                if (edge[q2]) touched = 1;
                zMin = Math.min(zMin, zs[q2]);
              }
            }
            band[k] = touched;
            near[k] = zMin;
          }
        }
        for (k = 0; k < n; k++) {
          if (!band[k]) continue;
          var pull = near[k] / zs[k];
          pos[k * 3] *= pull;
          pos[k * 3 + 1] *= pull;
          pos[k * 3 + 2] *= pull;
          edge[k] = 1;
        }
      }
      var idx = new Uint32Array(cols * rows * 6);
      var q = 0;
      for (r = 0; r < rows; r++) {
        for (c = 0; c < cols; c++) {
          var a0 = r * (cols + 1) + c, b0 = a0 + 1, c0 = a0 + cols + 1, d0 = c0 + 1;
          idx[q++] = a0; idx[q++] = c0; idx[q++] = b0;
          idx[q++] = b0; idx[q++] = c0; idx[q++] = d0;
        }
      }
      var g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
      g.setAttribute('aEdge', new THREE.BufferAttribute(edge, 1));
      g.setIndex(new THREE.BufferAttribute(idx, 1));
      return g;
    };

    var lensZ = depthAt(LENS[0], LENS[1]);
    var lens = unproject(LENS[0], LENS[1], lensZ * 0.96);
    var aim = unproject(AIM[0], AIM[1], depthAt(AIM[0], AIM[1]));
    var proj = new THREE.PerspectiveCamera(21, FRAME, 0.05, 30);
    proj.position.copy(lens);
    proj.lookAt(aim);
    proj.updateMatrixWorld(true);
    proj.updateProjectionMatrix();
    var projMat = new THREE.Matrix4().multiplyMatrices(proj.projectionMatrix, proj.matrixWorldInverse);
    var hit = function (dir) {
      var p = new THREE.Vector3();
      for (var t = 0.3; t < 9; t += 0.01) {
        p.copy(lens).addScaledVector(dir, t);
        var zz = -p.z;
        if (zz < 0.2) continue;
        var u = p.x / zz / TAN_H * 0.5 + 0.5, v = 0.5 - p.y / zz / TAN_V * 0.5;
        if (u < 0 || u > 1 || v < 0 || v > 1) return p.clone();
        var zs = depthAt(u, v);
        if (zs < lensZ + 0.35) continue;
        if (zz >= zs) return p.clone();
      }
      return p.clone();
    };
    var corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(function (n) {
      var d = new THREE.Vector3(n[0], n[1], 0.5).unproject(proj).sub(lens).normalize();
      return hit(d);
    });
    var center = hit(aim.clone().sub(lens).normalize());
    var filmR = 0;
    corners.forEach(function (c) { filmR = Math.max(filmR, c.distanceTo(center)); });

    var loader = new THREE.TextureLoader();
    var raw = function (t) { t.colorSpace = THREE.NoColorSpace; t.generateMipmaps = false; t.minFilter = THREE.LinearFilter; return t; };
    var roomTex = raw(loader.load('room.webp'));
    var backTex = raw(loader.load('room-back.webp'));
    var slideTex = raw(loader.load(works[1] ? works[1].src : '../../assets/img/glassfilm.webp'));
    var video = document.createElement('video');
    video.className = 'sp-video';
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.setAttribute('playsinline', '');
    video.setAttribute('muted', '');
    video.preload = 'auto';
    video.src = works[0] ? works[0].src : '../../assets/works/praxinoscope.mp4';
    stage.appendChild(video);
    var videoTex = raw(new THREE.VideoTexture(video));
    var vCrop = new THREE.Vector4(0.063, 0, 0.874, 1);
    video.addEventListener('loadedmetadata', function () {
      var zx = Math.min(1, FRAME / (video.videoWidth / video.videoHeight));
      vCrop.set((1 - zx) / 2, 0, zx, 1);
    });
    var tryPlay = function () { var p = video.play(); if (p && p.catch) p.catch(function () {}); };
    tryPlay();
    stage.addEventListener('pointerdown', tryPlay);

    var depthTex = raw(new THREE.Texture(depthImg));
    depthTex.needsUpdate = true;
    var u = {
      uMap: { value: roomTex }, uDepth: { value: depthTex }, uTexel: { value: new THREE.Vector2(1 / dw, 1 / dh) }, uVideo: { value: videoTex }, uSlide: { value: slideTex }, uProj: { value: projMat },
      uVCrop: { value: vCrop }, uSCrop: { value: new THREE.Vector4(0.14, 0, 0.696, 1) }, uReel: { value: new THREE.Vector4(0.526, 0.682, 0.0294, 0.0984) },
      uWeave: { value: new THREE.Vector2(0, 0) }, uSlideMix: { value: 0 }, uFlick: { value: 1 }, uDim: { value: 0.84 }, uGain: { value: 0.95 },
      uFilm: { value: 1 }, uTime: { value: 0 }, uVideoOn: { value: 0 }, uPx: { value: 1e-6 }
    };
    var vert = [
      'attribute float aEdge;',
      'varying vec2 vUv;',
      'varying vec3 vPos;',
      'varying float vEdge;',
      'void main() {',
      '  vUv = uv;',
      '  vPos = position;',
      '  vEdge = aEdge;',
      '  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);',
      '}'
    ].join('\n');
    var frag = [
      'uniform sampler2D uMap;',
      'uniform sampler2D uDepth;',
      'uniform vec2 uTexel;',
      'uniform sampler2D uVideo;',
      'uniform sampler2D uSlide;',
      'uniform mat4 uProj;',
      'uniform vec4 uVCrop;',
      'uniform vec4 uSCrop;',
      'uniform vec4 uReel;',
      'uniform vec2 uWeave;',
      'uniform float uSlideMix;',
      'uniform float uFlick;',
      'uniform float uDim;',
      'uniform float uGain;',
      'uniform float uFilm;',
      'uniform float uTime;',
      'uniform float uVideoOn;',
      'uniform float uPx;',
      'varying vec2 vUv;',
      'varying vec3 vPos;',
      'varying float vEdge;',
      'void main() {',
      '  if (vEdge > 0.01) {',
      '    vec2 o = uTexel * 1.5;',
      '    vec4 d0 = texture2D(uDepth, vUv);',
      '    vec4 d1 = texture2D(uDepth, vUv + o);',
      '    vec4 d2 = texture2D(uDepth, vUv - o);',
      '    vec4 d3 = texture2D(uDepth, vUv + vec2(o.x, -o.y));',
      '    vec4 d4 = texture2D(uDepth, vUv + vec2(-o.x, o.y));',
      '    float f = min(d0.r - d0.g, min(min(d1.r - d1.g, d2.r - d2.g), min(d3.r - d3.g, d4.r - d4.g)));',
      '    if (f < 0.12) discard;',
      '  }',
      '  vec3 col = texture2D(uMap, vUv).rgb;',
      '  if (uFilm > 0.5) {',
      '    vec2 q = (vUv - uReel.xy) / uReel.zw;',
      '    float r = length(q);',
      '    if (r < 1.0) {',
      '      float a = atan(q.y, q.x) - uTime * 2.6;',
      '      float holes = smoothstep(0.55, 0.95, cos(a * 3.0)) * smoothstep(0.3, 0.42, r) * smoothstep(0.82, 0.7, r);',
      '      float glint = pow(max(cos(a + 0.8), 0.0), 10.0) * smoothstep(0.68, 0.9, r) * smoothstep(1.0, 0.92, r);',
      '      col = col * (1.0 - 0.24 * holes) + vec3(0.17, 0.16, 0.14) * glint;',
      '    }',
      '  }',
      '  col *= uDim;',
      '  if (uFilm > 0.5) {',
      '    vec4 pc = uProj * vec4(vPos, 1.0);',
      '    if (pc.w > 0.0) {',
      '      vec2 p = pc.xy / pc.w * 0.5 + 0.5 + uWeave;',
      '      vec2 e = smoothstep(vec2(0.0), vec2(0.025), p) * smoothstep(vec2(1.0), vec2(0.975), p);',
      '      float near = smoothstep(0.6, 1.0, pc.w);',
      '      float frame = e.x * e.y * near;',
      '      vec2 d = abs(p - 0.5);',
      '      float spill = (1.0 - smoothstep(0.3, 1.1, max(d.x, d.y))) * near;',
      '      vec2 cp = clamp(p, 0.0, 1.0);',
      '      vec3 film = texture2D(uVideo, uVCrop.xy + cp * uVCrop.zw).rgb * uVideoOn;',
      '      vec3 slide = texture2D(uSlide, uSCrop.xy + cp * uSCrop.zw).rgb;',
      '      vec3 pic = mix(film, slide, uSlideMix);',
      '      vec3 warm = vec3(1.0, 0.93, 0.8);',
      '      float hot = 1.0 - 0.4 * dot(p - 0.5, p - 0.5) * 2.0;',
      '      col = col * (1.0 - 0.55 * frame) + (pic * uGain * hot + 0.045) * warm * frame * uFlick + warm * spill * 0.075 * uFlick;',
      '    }',
      '  }',
      '  gl_FragColor = vec4(col, 1.0);',
      '}'
    ].join('\n');
    var frontMat = new THREE.ShaderMaterial({ uniforms: u, vertexShader: vert, fragmentShader: frag });
    var backU = {};
    Object.keys(u).forEach(function (k) { backU[k] = u[k]; });
    backU.uMap = { value: backTex };
    backU.uFilm = { value: 0 };
    var backMat = new THREE.ShaderMaterial({ uniforms: backU, vertexShader: vert, fragmentShader: frag });
    var frontMesh = new THREE.Mesh(grid(coarse ? 240 : 320, front, 1, true), frontMat);
    var backMesh = new THREE.Mesh(grid(120, backD, 1.025, false), backMat);
    frontMesh.renderOrder = 0;
    backMesh.renderOrder = 1;
    frontMesh.frustumCulled = false;
    backMesh.frustumCulled = false;
    scene.add(frontMesh);
    scene.add(backMesh);

    var bu = { uFlick: u.uFlick, uTime: u.uTime, uOn: { value: 1 } };
    var beamPos = [], beamB = [];
    var SEG = 10, LEN = 8;
    for (var f = 0; f < 4; f++) {
      var ca = corners[f], cb = corners[(f + 1) % 4];
      for (var t = 0; t < LEN; t++) {
        for (var s = 0; s < SEG; s++) {
          [[s, t], [s + 1, t], [s, t + 1], [s + 1, t], [s + 1, t + 1], [s, t + 1]].forEach(function (o) {
            var ss = o[0] / SEG, tt = o[1] / LEN;
            var base = ca.clone().lerp(cb, ss);
            var pnt = lens.clone().lerp(base, tt);
            beamPos.push(pnt.x, pnt.y, pnt.z);
            beamB.push(ss, tt);
          });
        }
      }
    }
    var beamGeo = new THREE.BufferGeometry();
    beamGeo.setAttribute('position', new THREE.Float32BufferAttribute(beamPos, 3));
    beamGeo.setAttribute('aB', new THREE.Float32BufferAttribute(beamB, 2));
    var beamMat = new THREE.ShaderMaterial({
      uniforms: bu,
      vertexShader: 'attribute vec2 aB;\nvarying vec2 vB;\nvoid main() {\n  vB = aB;\n  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);\n}',
      fragmentShader: [
        'uniform float uFlick;',
        'uniform float uTime;',
        'uniform float uOn;',
        'varying vec2 vB;',
        'void main() {',
        '  float across = sin(3.14159 * vB.x);',
        '  float edge = smoothstep(0.0, 0.7, across);',
        '  float along = vB.y;',
        '  float a = (0.07 + 0.3 * pow(1.0 - along, 1.6)) * mix(0.25, 1.0, edge);',
        '  a *= smoothstep(0.0, 0.06, along) * (1.0 - 0.4 * smoothstep(0.9, 1.0, along));',
        '  float rays = 0.8 + 0.2 * sin(vB.x * 29.0 + uTime * 0.5) * sin(vB.x * 11.0 - uTime * 0.31 + along * 3.0);',
        '  gl_FragColor = vec4(vec3(1.0, 0.92, 0.76) * a * rays * uFlick * uOn, 1.0);',
        '}'
      ].join('\n'),
      transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending
    });
    var beam = new THREE.Mesh(beamGeo, beamMat);
    beam.renderOrder = 2;
    beam.frustumCulled = false;
    scene.add(beam);

    var DUST = coarse ? 150 : 260;
    var seeds = new Float32Array(DUST * 3);
    for (var di = 0; di < DUST * 3; di++) seeds[di] = Math.random();
    var dustGeo = new THREE.BufferGeometry();
    dustGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(DUST * 3), 3));
    dustGeo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 3));
    var du = {
      uTime: u.uTime, uFlick: u.uFlick, uA: { value: lens }, uC0: { value: corners[0] }, uC1: { value: corners[1] }, uC2: { value: corners[2] }, uC3: { value: corners[3] },
      uSize: { value: (coarse ? 5.5 : 7) * renderer.getPixelRatio() }
    };
    var dustMat = new THREE.ShaderMaterial({
      uniforms: du,
      vertexShader: [
        'attribute vec3 aSeed;',
        'uniform float uTime;',
        'uniform float uFlick;',
        'uniform float uSize;',
        'uniform vec3 uA;',
        'uniform vec3 uC0;',
        'uniform vec3 uC1;',
        'uniform vec3 uC2;',
        'uniform vec3 uC3;',
        'varying float vA;',
        'void main() {',
        '  float s = clamp(aSeed.x + 0.06 * sin(uTime * (0.17 + 0.15 * aSeed.y) + aSeed.z * 40.0), 0.0, 1.0);',
        '  float t = fract(aSeed.y + uTime * (0.006 + 0.01 * aSeed.z));',
        '  float d = 0.08 + 0.88 * aSeed.z + 0.02 * sin(uTime * 0.3 + aSeed.x * 30.0);',
        '  vec3 base = mix(mix(uC0, uC1, s), mix(uC3, uC2, s), t);',
        '  vec3 p = mix(uA, base, d);',
        '  vec4 mv = modelViewMatrix * vec4(p, 1.0);',
        '  gl_Position = projectionMatrix * mv;',
        '  float edge = sin(3.14159 * s) * sin(3.14159 * t);',
        '  float tw = 0.55 + 0.45 * sin(uTime * (1.1 + aSeed.x * 2.3) + aSeed.y * 50.0);',
        '  vA = edge * tw * (1.0 - 0.5 * d) * uFlick;',
        '  gl_PointSize = uSize * (0.5 + aSeed.x) / max(0.5, -mv.z);',
        '}'
      ].join('\n'),
      fragmentShader: 'varying float vA;\nvoid main() {\n  vec2 c = gl_PointCoord - 0.5;\n  float a = smoothstep(0.25, 0.02, dot(c, c)) * vA;\n  gl_FragColor = vec4(vec3(1.0, 0.94, 0.8) * a, 1.0);\n}',
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
    });
    var dust = new THREE.Points(dustGeo, dustMat);
    dust.frustumCulled = false;
    dust.renderOrder = 3;
    scene.add(dust);

    var gc = document.createElement('canvas');
    gc.width = gc.height = 64;
    var gx = gc.getContext('2d');
    var grad = gx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255,248,230,1)');
    grad.addColorStop(0.25, 'rgba(255,226,170,.55)');
    grad.addColorStop(1, 'rgba(255,200,120,0)');
    gx.fillStyle = grad;
    gx.fillRect(0, 0, 64, 64);
    var glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(gc), blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false, transparent: true }));
    glow.position.copy(lens);
    glow.scale.set(0.26, 0.26, 1);
    glow.renderOrder = 4;
    scene.add(glow);

    var spotAt = [center.clone(), unproject(HEAD[0], HEAD[1], depthAt(HEAD[0], HEAD[1]) * 0.95)];
    spots.forEach(function (sp, j) { sp.p = spotAt[j]; });

    var spring = function (x, v, target, w, dt) {
      v += (w * w * (target - x) - 2 * w * v) * dt;
      return [x + v * dt, v];
    };
    var cam = { p: [0.0, 0.03, 0.02], pv: [0, 0, 0], l: unproject(0.53, 0.47, 4).toArray(), lv: [0, 0, 0], f: view.fov * 0.86, fv: 0, sx: 0, sxv: 0, sy: 0, syv: 0 };
    var look = new THREE.Vector3();
    var tmp = new THREE.Vector3();
    var idle = 0, flick = 1, slide = 0, dim = 0.84, gain = 0.95, beamOn = 1;
    var pr = renderer.getPixelRatio();
    var size = function () {
      renderer.setSize(W, H, false);
      camera.aspect = W / H;
    };
    window.addEventListener('resize', size);

    var focusTarget = function (j) {
      var a = view.aspect;
      var c = j === 0 ? center : lens.clone().lerp(center, a < 1 ? 0.8 : 0.55);
      var p = c.clone().normalize().multiplyScalar(j === 0 ? 0.24 : 0.17);
      var dist = p.distanceTo(c);
      var r = j === 0 ? filmR * 1.45 : lens.distanceTo(center) * 0.5 + filmR * 0.8;
      var tanV = Math.max(r / dist, r / dist / a);
      var maxTan = Math.tan(view.fov * Math.PI / 360);
      return { p: p, l: c, f: Math.atan(Math.min(tanV, maxTan)) * 360 / Math.PI };
    };

    var last = performance.now();
    var hidden = false;
    var frame = function (now) {
      raf = 0;
      if (!running) return;
      var dt = Math.min((now - last) / 1000, 1 / 30);
      last = now;
      clock += dt;
      var quiet = clock - lastInput > 2.5;
      idle += ((quiet && !reduce ? 1 : 0) - idle) * (1 - Math.exp(-dt * (quiet ? 0.8 : 6)));
      var nx = clamp(drag.x + (coarse ? 0 : mouse.x * 0.8) + gyro.x * 0.7, -1.4, 1.4);
      var ny = clamp(drag.y + (coarse ? 0 : mouse.y * 0.6) + gyro.y * 0.6, -1.2, 1.2);
      var tp, tl, tf;
      if (focus < 0) {
        var lu = clamp(view.u0 + nx * view.rangeU + idle * view.drift * Math.sin(clock * 0.21), view.minU, view.maxU);
        var lv = clamp(view.v0 + ny * view.rangeV + idle * 0.015 * Math.sin(clock * 0.29 + 1), view.minV, view.maxV);
        var ox = clamp(nx, -1, 1) + idle * 0.35 * Math.sin(clock * 0.17 + 0.6);
        tl = unproject(lu, lv, 4);
        tp = tmp.set(-ox * view.tAmp, clamp(-ny, -1, 1) * view.tAmp * 0.35, -0.12);
        tf = view.fov;
      } else {
        var ft = focusTarget(focus);
        tl = ft.l;
        tp = tmp.copy(ft.p).add(look.set(-clamp(nx, -1, 1) * 0.05, -clamp(ny, -1, 1) * 0.03, 0));
        tf = ft.f;
      }
      var w = 5.5, k, res;
      for (k = 0; k < 3; k++) {
        res = spring(cam.p[k], cam.pv[k], tp.getComponent(k), w, dt); cam.p[k] = res[0]; cam.pv[k] = res[1];
        res = spring(cam.l[k], cam.lv[k], tl.getComponent(k), w, dt); cam.l[k] = res[0]; cam.lv[k] = res[1];
      }
      res = spring(cam.f, cam.fv, tf, w, dt); cam.f = res[0]; cam.fv = res[1];
      var wantSx = focus >= 0 && view.aspect >= 1 ? cardW * 0.5 : 0;
      var wantSy = focus >= 0 && view.aspect < 1 ? cardH * 0.5 : 0;
      res = spring(cam.sx, cam.sxv, wantSx, w, dt); cam.sx = res[0]; cam.sxv = res[1];
      res = spring(cam.sy, cam.syv, wantSy, w, dt); cam.sy = res[0]; cam.syv = res[1];
      camera.position.set(cam.p[0], cam.p[1], cam.p[2]);
      camera.lookAt(look.set(cam.l[0], cam.l[1], cam.l[2]));
      camera.fov = cam.f;
      if (Math.abs(cam.sx) > 0.5 || Math.abs(cam.sy) > 0.5) camera.setViewOffset(W, H, cam.sx, cam.sy, W, H);
      else camera.clearViewOffset();
      camera.updateProjectionMatrix();
      var tc = Math.tan(cam.f * Math.PI / 360), hb = H * pr;
      u.uPx.value = tc * tc / (TAN_V * TAN_H * hb * hb);

      var e = 1 - Math.exp(-dt * 4);
      slide += ((focus === 1 ? 1 : 0) - slide) * e;
      dim += ((focus >= 0 ? 0.62 : 0.84) - dim) * e;
      gain += ((focus >= 0 ? 1.12 : 0.95) - gain) * e;
      if (!reduce) {
        var shut = ((clock * 24) % 1) < 0.5 ? 1 : 0.88;
        var dip = Math.random() < 0.025 ? 0.84 : 1;
        flick += ((0.94 + 0.06 * shut) * dip - flick) * 0.65;
        u.uWeave.value.set(Math.sin(clock * 7.3) * 0.0012, Math.sin(clock * 31.0) * 0.0018 + (Math.random() - 0.5) * 0.0012);
      }
      u.uTime.value = clock;
      u.uFlick.value = flick;
      u.uSlideMix.value = slide;
      u.uDim.value = dim;
      u.uGain.value = gain;
      if (video.readyState >= 2) u.uVideoOn.value = Math.min(1, u.uVideoOn.value + dt * 2);
      glow.material.opacity = 0.8 * flick;
      renderer.render(scene, camera);

      for (k = 0; k < spots.length; k++) {
        var sp = spots[k];
        look.copy(sp.p).project(camera);
        var vis = look.z < 1 && Math.abs(look.x) < 1.05 && Math.abs(look.y) < 1.05;
        var x = clamp((look.x * 0.5 + 0.5) * W, view.padL, W - view.padR), y = (-look.y * 0.5 + 0.5) * H;
        if (vis !== sp.vis) { sp.vis = vis; sp.el.style.opacity = vis ? '' : '0'; }
        if (vis && (Math.abs(x - sp.x) > 0.3 || Math.abs(y - sp.y) > 0.3)) {
          sp.x = x;
          sp.y = y;
          sp.el.style.transform = 'translate3d(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px,0)';
        }
      }
      raf = requestAnimationFrame(frame);
    };
    wake = function () {
      if (running && !raf && !hidden) { last = performance.now(); raf = requestAnimationFrame(frame); }
    };
    var run = function (on) {
      running = on;
      if (on) { wake(); tryPlay(); } else { if (raf) cancelAnimationFrame(raf); raf = 0; video.pause(); }
    };
    document.addEventListener('visibilitychange', function () {
      hidden = document.hidden;
      run(!hidden);
      if (audio) { if (hidden) audio.ctx.suspend(); else if (soundBtn.getAttribute('aria-pressed') === 'true') audio.ctx.resume(); }
    });
    canvas.addEventListener('webglcontextlost', function (ev) { ev.preventDefault(); run(false); goFlat(); });
    var shown = false;
    var show = function () {
      if (shown) return;
      shown = true;
      body.classList.add('is-3d');
      window.__space = { renderer: renderer, camera: camera, video: video, focus: function () { return focus; }, pr: pr };
      run(true);
    };
    loader.manager.onLoad = show;
    setTimeout(show, 5000);
  };

  var fail = function () { goFlat(); };
  try {
    var c = document.createElement('canvas');
    if (!(c.getContext('webgl2') || c.getContext('webgl'))) { fail(); return; }
  } catch (err) { fail(); return; }
  Promise.all([
    import('https://cdn.jsdelivr.net/npm/three@0.183.0/build/three.module.min.js'),
    loadImage('depth.png')
  ]).then(function (r) {
    try { start(r[0], r[1]); } catch (err) { fail(); }
  }).catch(fail);
})();

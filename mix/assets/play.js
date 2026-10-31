(function () {
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  var works = window.WORKS || [];
  var data = window.CHAPTER_DATA || [];
  var KEY = 'am-play-v1';
  var CLOSE_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>';
  var LOCK_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>';

  var load = function () {
    try { return JSON.parse(window.localStorage.getItem(KEY) || '{}') || {}; } catch (e) { return {}; }
  };
  var seen = load();
  var save = function () {
    try { window.localStorage.setItem(KEY, JSON.stringify(seen)); } catch (e) {}
  };

  var listeners = {};
  var on = function (name, fn) { (listeners[name] = listeners[name] || []).push(fn); };
  var emit = function (name, a, b) { (listeners[name] || []).forEach(function (fn) { fn(a, b); }); };

  var isSeen = function (i, j) { return !!seen[i + '-' + j]; };
  var roomSeen = function (i) {
    var n = 0;
    (works[i] || []).forEach(function (w, j) { if (isSeen(i, j)) n++; });
    return n;
  };
  var roomDone = function (i) { return !!works[i] && works[i].length > 0 && roomSeen(i) === works[i].length; };
  var doneCount = function () {
    var n = 0;
    works.forEach(function (w, i) { if (roomDone(i)) n++; });
    return n;
  };

  var make = function (tag, cls, html) {
    var el = document.createElement(tag);
    if (cls) el.className = cls;
    if (html) el.innerHTML = html;
    return el;
  };

  var toastEl = make('div', 'pl-toast', '<img alt="" width="46" height="46"><span></span>');
  toastEl.setAttribute('role', 'status');
  document.body.appendChild(toastEl);
  var toastTimer = 0;
  var toast = function (text, pose) {
    toastEl.querySelector('span').textContent = text;
    toastEl.querySelector('img').src = window.Larva ? window.Larva.src(pose || 'joy', 0) : '';
    toastEl.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('is-on'); }, 3200);
  };

  var markSeen = function (i, j) {
    if (isSeen(i, j)) return false;
    var before = roomDone(i);
    seen[i + '-' + j] = 1;
    save();
    emit('seen', i, j);
    if (!before && roomDone(i)) {
      emit('room', i);
      var count = doneCount();
      toast(String(i + 1).padStart(2, '0') + ' ' + data[i].name + ' 다 봤어요! (' + count + ' / ' + works.length + ')', data[i].pose);
      if (count === works.length) setTimeout(function () { celebrate(); emit('all'); }, 900);
    }
    return true;
  };

  var view = make('div', 'pl-view', '<div class="pl-bar" hidden><i></i></div><div class="pl-media"></div><div class="pl-info"><span class="pl-stamp" aria-hidden="true">봤어요</span><p class="pl-no"></p><h2 class="pl-title" id="pl-title"></h2><p class="pl-meta"></p><p class="pl-desc"></p><p class="pl-hint" hidden></p><p class="pl-credit"></p><div class="pl-actions"><button class="pill pill--line-ink" type="button" data-pl-prev>이전 작품</button><button class="pill pill--ink" type="button" data-pl-next>다음 작품</button></div></div><button class="pl-close" type="button" aria-label="작품 닫기">' + CLOSE_ICON + '</button>');
  view.id = 'pl-view';
  view.hidden = true;
  view.setAttribute('role', 'dialog');
  view.setAttribute('aria-modal', 'true');
  view.setAttribute('aria-labelledby', 'pl-title');
  document.body.appendChild(view);
  var vq = function (sel) { return view.querySelector(sel); };
  var media = vq('.pl-media');
  var bar = vq('.pl-bar');
  var barFill = bar.querySelector('i');
  var stamp = vq('.pl-stamp');
  var current = null, seenTimer = 0, autoTimer = 0, autoStart = 0, autoLength = 0, autoFrame = 0, viewReturn = null, cleanup = null;

  var pinsBoard = function (box) {
    var canvas = make('canvas', 'pl-pins');
    box.appendChild(canvas);
    var ctx = canvas.getContext('2d');
    var gap = 9, cols = 0, rows = 0, depth = null, ratio = Math.min(2, window.devicePixelRatio || 1), down = false, raf = 0, dirty = true;
    var size = function () {
      var r = box.getBoundingClientRect();
      canvas.width = Math.round(r.width * ratio);
      canvas.height = Math.round(r.height * ratio);
      cols = Math.ceil(r.width / gap) + 1;
      rows = Math.ceil(r.height / gap) + 1;
      depth = new Float32Array(cols * rows);
      dirty = true;
    };
    var press = function (e) {
      var r = canvas.getBoundingClientRect();
      var px = (e.clientX - r.left) / gap, py = (e.clientY - r.top) / gap, rad = 5.5;
      for (var y = Math.max(0, Math.floor(py - rad)); y < Math.min(rows, Math.ceil(py + rad)); y++) {
        for (var x = Math.max(0, Math.floor(px - rad)); x < Math.min(cols, Math.ceil(px + rad)); x++) {
          var d = Math.hypot(x - px, y - py) / rad;
          if (d < 1) depth[y * cols + x] = Math.min(1, depth[y * cols + x] + (1 - d * d) * 0.35);
        }
      }
      dirty = true;
    };
    var draw = function () {
      raf = requestAnimationFrame(draw);
      if (!dirty) return;
      dirty = false;
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx.fillStyle = '#e4dfd6';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = 'rgba(23,23,23,.85)';
      ctx.lineCap = 'round';
      for (var y = 0; y < rows; y++) {
        for (var x = 0; x < cols; x++) {
          var v = 1 - depth[y * cols + x];
          var len = 0.6 + v * 5.4;
          ctx.globalAlpha = 0.18 + v * 0.62;
          ctx.lineWidth = 1.4 + v * 0.9;
          ctx.beginPath();
          ctx.moveTo(x * gap, y * gap);
          ctx.lineTo(x * gap + len, y * gap + len);
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;
    };
    canvas.addEventListener('pointerdown', function (e) { down = true; canvas.setPointerCapture(e.pointerId); press(e); markActive(); });
    canvas.addEventListener('pointermove', function (e) { if (down || e.pointerType === 'mouse') press(e); });
    canvas.addEventListener('pointerup', function () { down = false; });
    canvas.addEventListener('pointercancel', function () { down = false; });
    size();
    draw();
    window.addEventListener('resize', size);
    return function () { cancelAnimationFrame(raf); window.removeEventListener('resize', size); };
  };

  var audio = null;
  var noise = function (seconds) {
    var buffer = audio.createBuffer(1, Math.round(audio.sampleRate * seconds), audio.sampleRate);
    var ch = buffer.getChannelData(0);
    for (var k = 0; k < ch.length; k++) ch[k] = Math.random() * 2 - 1;
    return buffer;
  };
  var burst = function (at, length, type, freq, q, peak) {
    var src = audio.createBufferSource();
    src.buffer = noise(length + 0.05);
    var filter = audio.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = freq;
    filter.Q.value = q;
    var gain = audio.createGain();
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(peak, at + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + length);
    src.connect(filter).connect(gain).connect(audio.destination);
    src.start(at);
    src.stop(at + length + 0.05);
    return { filter: filter, gain: gain };
  };
  var SOUNDS = {
    hoof: function (t) { [0, 0.13, 0.36, 0.49, 0.72, 0.85].forEach(function (d, k) { burst(t + d, 0.07, 'bandpass', k % 2 ? 1500 : 1100, 5, 0.9); }); },
    rain: function (t) {
      for (var k = 0; k < 90; k++) burst(t + Math.random() * 1.8, 0.03, 'highpass', 2600 + Math.random() * 3000, 1, 0.12 + Math.random() * 0.2);
    },
    thunder: function (t) {
      var b = burst(t, 2.6, 'lowpass', 900, 0.7, 1);
      b.filter.frequency.setValueAtTime(900, t);
      b.filter.frequency.exponentialRampToValueAtTime(120, t + 2.4);
      burst(t + 0.25, 1.8, 'lowpass', 300, 0.7, 0.7);
    }
  };
  var foleyBoard = function (box) {
    var wrap = make('div', 'pl-foley', '<p>버튼을 눌러 소리를 만들어 보세요</p><div><button type="button" data-s="hoof">말발굽<small>코코넛 껍질 두드리기</small></button><button type="button" data-s="rain">빗소리<small>쟁반 위에 쌀 뿌리기</small></button><button type="button" data-s="thunder">천둥<small>얇은 철판 흔들기</small></button></div>');
    box.appendChild(wrap);
    wrap.querySelectorAll('button').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (!audio) {
          var Ctx = window.AudioContext || window.webkitAudioContext;
          if (!Ctx) return;
          audio = new Ctx();
        }
        if (audio.state === 'suspended') audio.resume();
        SOUNDS[btn.getAttribute('data-s')](audio.currentTime + 0.02);
        btn.classList.add('is-hit');
        setTimeout(function () { btn.classList.remove('is-hit'); }, 160);
        markActive();
      });
    });
    return null;
  };

  var markActive = function () {
    if (!current) return;
    if (markSeen(current.i, current.j)) stampOn();
  };
  var stampOn = function () {
    stamp.classList.remove('is-on');
    void stamp.offsetWidth;
    stamp.classList.add('is-on');
  };

  var stopAuto = function () {
    clearTimeout(autoTimer);
    cancelAnimationFrame(autoFrame);
    bar.hidden = true;
  };

  var runAuto = function (seconds) {
    stopAuto();
    bar.hidden = false;
    autoStart = performance.now();
    autoLength = seconds * 1000;
    var step = function (now) {
      var p = clamp((now - autoStart) / autoLength, 0, 1);
      barFill.style.width = (p * 100).toFixed(2) + '%';
      if (p < 1) autoFrame = requestAnimationFrame(step);
    };
    autoFrame = requestAnimationFrame(step);
    autoTimer = setTimeout(function () { go(1); }, autoLength);
  };

  var fillWork = function () {
    var i = current.i, j = current.j, w = works[i][j];
    if (cleanup) { cleanup(); cleanup = null; }
    clearTimeout(seenTimer);
    stamp.classList.remove('is-on');
    media.innerHTML = '';
    media.className = 'pl-media';
    var light = /strip|poster|frames/.test(w.src);
    if (light) media.classList.add('is-light');
    if (w.kind === 'video') {
      var video = make('video');
      video.muted = true;
      video.loop = true;
      video.autoplay = true;
      video.playsInline = true;
      video.setAttribute('playsinline', '');
      video.poster = w.thumb;
      video.src = w.src;
      media.appendChild(video);
      var play = video.play();
      if (play && play.catch) play.catch(function () {});
    } else if (w.kind === 'pins') {
      cleanup = pinsBoard(media);
    } else if (w.kind === 'foley') {
      foleyBoard(media);
    } else {
      var img = make('img');
      img.src = w.src;
      img.alt = w.title;
      img.addEventListener('load', function () { if (img.naturalWidth / img.naturalHeight > 2.4) media.classList.add('is-wide'); });
      media.appendChild(img);
      if (w.kind === 'locked') {
        media.classList.add('is-locked');
        media.appendChild(make('span', 'pl-lock', LOCK_ICON + '<span></span>'));
        media.querySelector('.pl-lock span').textContent = w.lock;
      }
    }
    vq('.pl-no').textContent = '작품 ' + (j + 1) + ' / ' + works[i].length + ' · ' + data[i].name;
    vq('.pl-title').textContent = w.title;
    vq('.pl-meta').textContent = w.meta;
    vq('.pl-desc').textContent = w.desc;
    vq('.pl-credit').textContent = '출처 · ' + w.credit;
    var hint = vq('.pl-hint');
    var interactive = w.kind === 'pins' || w.kind === 'foley';
    hint.hidden = !interactive;
    hint.textContent = interactive ? (w.kind === 'pins' ? '화면을 눌러 문지르면 볼 수 있어요' : '소리를 하나 만들면 본 것으로 쳐요') : '';
    vq('[data-pl-prev]').disabled = j === 0;
    vq('[data-pl-next]').textContent = j < works[i].length - 1 ? '다음 작품' : '이 공간 다 봤어요';
    if (!interactive) {
      seenTimer = setTimeout(function () { if (current && current.i === i && current.j === j && markSeen(i, j)) stampOn(); }, reduce ? 300 : 1200);
    } else if (isSeen(i, j)) {
      stamp.classList.add('is-on');
    }
    if (current.auto) runAuto(interactive ? 10 : (w.kind === 'video' ? 8 : 6));
    else stopAuto();
  };

  var openWork = function (i, j, opts) {
    if (!works[i] || !works[i][j]) return;
    opts = opts || {};
    current = { i: i, j: j, auto: !!opts.auto, onEnd: opts.onEnd || null };
    viewReturn = document.activeElement;
    fillWork();
    view.hidden = false;
    requestAnimationFrame(function () { requestAnimationFrame(function () { view.classList.add('is-open'); }); });
    document.documentElement.style.overflow = 'hidden';
    setTimeout(function () { vq('.pl-close').focus(); }, 60);
    emit('open', i, j);
  };

  var closeWork = function (finished) {
    if (view.hidden) return;
    var ended = current;
    stopAuto();
    clearTimeout(seenTimer);
    if (cleanup) { cleanup(); cleanup = null; }
    view.classList.remove('is-open');
    var v = media.querySelector('video');
    if (v) v.pause();
    setTimeout(function () { view.hidden = true; media.innerHTML = ''; }, reduce ? 0 : 400);
    var rec = document.getElementById('rec');
    if (!rec || rec.hidden) document.documentElement.style.overflow = '';
    if (viewReturn && viewReturn.focus) viewReturn.focus();
    current = null;
    emit('close', ended ? ended.i : -1);
    if (finished && ended && ended.onEnd) ended.onEnd(ended.i);
  };

  var go = function (dir) {
    if (!current) return;
    var n = current.j + dir;
    if (n < 0) return;
    if (n >= works[current.i].length) {
      works[current.i].forEach(function (w, j) { if (current.auto || (w.kind !== 'pins' && w.kind !== 'foley')) markSeen(current.i, j); });
      closeWork(true);
      return;
    }
    current.j = n;
    fillWork();
  };

  vq('[data-pl-prev]').addEventListener('click', function () { go(-1); });
  vq('[data-pl-next]').addEventListener('click', function () { go(1); });
  vq('.pl-close').addEventListener('click', function () { closeWork(false); });
  document.addEventListener('keydown', function (e) {
    if (view.hidden) return;
    if (e.key === 'Escape') { e.stopPropagation(); e.preventDefault(); closeWork(false); }
    else if (e.key === 'ArrowRight') { e.stopPropagation(); e.preventDefault(); go(1); }
    else if (e.key === 'ArrowLeft') { e.stopPropagation(); e.preventDefault(); go(-1); }
  }, true);

  var playRoom = function (i, onEnd) { openWork(i, 0, { auto: true, onEnd: onEnd }); };

  var rec = document.getElementById('rec');
  var strip = null, recRoom = -1;
  var renderStrip = function (i) {
    if (!rec || !works[i]) return;
    recRoom = i;
    rec.classList.add('has-works');
    if (!strip) {
      strip = make('div', 'pl-works', '<p class="pl-works-h">이 공간의 작품 <b></b><span></span></p><ol></ol>');
      var body = rec.querySelector('.rec-body');
      body.insertBefore(strip, body.querySelector('.rec-photo'));
    }
    strip.querySelector('b').textContent = roomSeen(i) + ' / ' + works[i].length;
    strip.querySelector('span').textContent = roomDone(i) ? '다 봤어요' : '눌러서 바로 보기';
    var list = strip.querySelector('ol');
    list.innerHTML = '';
    works[i].forEach(function (w, j) {
      var li = make('li');
      var btn = make('button', 'pl-work' + (isSeen(i, j) ? ' is-seen' : '') + (w.kind === 'video' ? ' is-play' : ''), '<img alt="" width="128" height="96" loading="lazy"><span></span><i>✓</i>');
      btn.type = 'button';
      btn.querySelector('img').src = w.thumb;
      btn.querySelector('span').textContent = w.title;
      btn.setAttribute('aria-label', w.title + (isSeen(i, j) ? ', 봤어요' : ''));
      btn.addEventListener('click', function () { openWork(i, j); });
      li.appendChild(btn);
      list.appendChild(li);
    });
  };
  if (rec) {
    var recNo = rec.querySelector('[data-rec-no]');
    var syncStrip = function () {
      var n = parseInt(recNo.textContent, 10);
      if (!isNaN(n)) renderStrip(n - 1);
    };
    new MutationObserver(syncStrip).observe(recNo, { childList: true, characterData: true, subtree: true });
    on('seen', function () { if (recRoom >= 0) renderStrip(recRoom); });
    on('reset', function () { if (recRoom >= 0) renderStrip(recRoom); });
  }

  var chips = [];
  var renderChip = function (chip) {
    chip.querySelector('b').textContent = doneCount() + ' / ' + works.length;
    chip.querySelectorAll('.pl-dots i').forEach(function (dot, k) { dot.classList.toggle('is-on', roomDone(k)); });
  };
  var chip = function (label) {
    var el = make('p', 'pl-chip', '<span></span><b></b><span class="pl-dots" aria-hidden="true"></span>');
    el.querySelector('span').textContent = label;
    var dots = el.querySelector('.pl-dots');
    works.forEach(function (w, k) {
      var dot = make('i');
      dot.style.setProperty('--c', (data[k] && data[k].ring) ? data[k].ring[0] : '');
      dots.appendChild(dot);
    });
    chips.push(el);
    renderChip(el);
    return el;
  };
  on('room', function () { chips.forEach(renderChip); });
  on('reset', function () { chips.forEach(renderChip); });

  var done = make('div', 'pl-done', '<div class="pl-done-card" role="document"><div class="pl-done-art lv-mini" data-larva="party" data-alt=""></div><h2 id="pl-done-h">박물관 9곳을 모두 둘러봤어요!</h2><p>멈춘 그림에 숨을 불어넣는 곳, 애니메이션박물관의 작품을 다 만났어요.</p><div class="pl-coupon"><div><b>관람 할인권 (예시)</b><small>매표소에서 이 화면을 보여 주세요. 실제 혜택은 박물관과 정해서 넣습니다.</small></div><span>입장권</span></div><span class="pl-dots" aria-hidden="true"></span><div class="pl-done-actions"><button class="pill pill--ink" type="button" data-pl-done-close>닫기</button><button class="pill pill--line-ink" type="button" data-pl-reset>처음부터 다시</button></div></div>');
  done.hidden = true;
  done.setAttribute('role', 'dialog');
  done.setAttribute('aria-modal', 'true');
  done.setAttribute('aria-labelledby', 'pl-done-h');
  document.body.appendChild(done);
  var doneDots = done.querySelector('.pl-dots');
  works.forEach(function (w, k) {
    var dot = make('i', 'is-on');
    dot.style.setProperty('--c', (data[k] && data[k].ring) ? data[k].ring[0] : '');
    doneDots.appendChild(dot);
  });
  if (window.Larva) window.Larva.mountAll(done);
  var celebrate = function () {
    done.hidden = false;
    requestAnimationFrame(function () { requestAnimationFrame(function () { done.classList.add('is-open'); }); });
    setTimeout(function () { done.querySelector('[data-pl-done-close]').focus(); }, 60);
  };
  var closeDone = function () {
    done.classList.remove('is-open');
    setTimeout(function () { done.hidden = true; }, reduce ? 0 : 350);
  };
  done.querySelector('[data-pl-done-close]').addEventListener('click', closeDone);
  done.querySelector('[data-pl-reset]').addEventListener('click', function () { closeDone(); reset(); });
  done.addEventListener('click', function (e) { if (e.target === done) closeDone(); });

  var reset = function () {
    seen = {};
    save();
    emit('reset');
  };

  var walker = function (o) {
    var el = make('div', 'pl-walker', '<span class="pl-walker-body"><img alt="" draggable="false"></span><span class="pl-say" hidden></span>');
    el.querySelector('img').src = o.img;
    if (o.width) el.style.setProperty('--w', o.width + 'px');
    o.parent.appendChild(el);
    var body = el.querySelector('.pl-walker-body');
    var say = el.querySelector('.pl-say');
    var s = o.start || 0, v = 0, target = s, arrive = null, running = false, last = 0, phase = 0, face = 1, settle = 0;
    var speed = o.speed || 700, k = o.k || 14, c = 2 * Math.sqrt(k);
    var place = function () {
      var p = o.place(s);
      var moving = Math.abs(v) > 6;
      var wob = moving ? Math.sin(phase * Math.PI * 2) : 0;
      var hop = moving ? Math.abs(Math.sin(phase * Math.PI * 2)) * (o.hop || 6) : 0;
      var lean = clamp(v / speed, -1, 1) * 7;
      if (v > 6) face = 1;
      if (v < -6) face = -1;
      el.style.transform = 'translate3d(' + p.x.toFixed(1) + 'px,' + (p.y - hop).toFixed(1) + 'px,0) translate(-50%,-100%)';
      body.style.transform = 'scale(' + ((o.flip === false ? 1 : face) * (1 + wob * 0.07)).toFixed(3) + ',' + (1 - wob * 0.07).toFixed(3) + ') rotate(' + (o.flip === false ? 0 : lean).toFixed(2) + 'deg)';
      if (o.onMove) o.onMove(p, v, s);
    };
    var step = function (now) {
      var dt = Math.min(0.05, (now - (last || now)) / 1000);
      last = now;
      var a = k * (target - s) - c * v;
      v = clamp(v + a * dt, -speed, speed);
      s += v * dt;
      phase += Math.abs(v) * dt / (o.stride || 70);
      place();
      if (Math.abs(target - s) < 0.6 && Math.abs(v) < 4) {
        settle++;
        if (settle > 2) {
          s = target;
          v = 0;
          running = false;
          last = 0;
          place();
          var cb = arrive;
          arrive = null;
          if (cb) cb();
          return;
        }
      } else {
        settle = 0;
      }
      requestAnimationFrame(step);
    };
    var api = {
      el: el,
      go: function (t, cb) {
        target = t;
        arrive = cb || null;
        if (reduce) { s = t; v = 0; place(); if (cb) { arrive = null; cb(); } return; }
        if (!running) { running = true; settle = 0; requestAnimationFrame(step); }
      },
      set: function (t) { s = target = t; v = 0; place(); },
      get: function () { return s; },
      target: function () { return target; },
      moving: function () { return running; },
      refresh: place,
      say: function (text) {
        if (!text) { say.classList.remove('is-on'); return; }
        say.textContent = text;
        say.hidden = false;
        say.classList.remove('is-on');
        void say.offsetWidth;
        say.classList.add('is-on');
      },
      onSay: function (fn) { say.addEventListener('click', fn); }
    };
    return api;
  };

  window.Play = {
    works: works,
    total: works.length,
    on: on,
    isSeen: isSeen,
    roomSeen: roomSeen,
    roomDone: roomDone,
    doneCount: doneCount,
    openWork: openWork,
    playRoom: playRoom,
    closeWork: closeWork,
    isOpen: function () { return !view.hidden; },
    chip: chip,
    toast: toast,
    walker: walker,
    reset: reset,
    celebrate: celebrate
  };
})();

(function () {
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = window.matchMedia('(pointer: fine)').matches;
  var hero = document.querySelector('.hero--talk');
  hero.classList.add('is-alive');
  document.documentElement.classList.add('is-alive');

  var today = document.querySelector('[data-today]');
  var now = new Date();
  var days = ['일', '월', '화', '수', '목', '금', '토'];
  var label = (now.getMonth() + 1) + '월 ' + now.getDate() + '일(' + days[now.getDay()] + ')';
  if (now.getDay() === 1) {
    today.textContent = label + '은 정기 휴관일이에요. 화요일에 만나요';
    today.classList.add('is-closed');
  } else {
    today.textContent = '오늘 ' + label + ' 관람 10:00 ~ 18:00, 입장마감 17:00';
  }

  var boxes = hero.querySelectorAll('.stage-box');
  if (fine && !reduce) {
    window.addEventListener('pointermove', function (e) {
      var x = e.clientX / window.innerWidth - 0.5, y = e.clientY / window.innerHeight - 0.5;
      boxes.forEach(function (box, i) {
        var d = i === 0 ? 8 : 18;
        box.style.transform = 'translateX(-50%) translate3d(' + (-x * d).toFixed(1) + 'px,' + (-y * d * 0.5).toFixed(1) + 'px,0)';
      });
    }, { passive: true });
  }

  var data = window.CHAPTER_DATA;
  var floors = document.querySelector('.tk-floors');
  var pathSvg = floors.querySelector('.tk-path');
  var path = pathSvg.querySelector('path');
  var mobile = window.matchMedia('(max-width: 700px)');
  var rooms = [];
  floors.querySelectorAll('.tk-room[data-i]').forEach(function (el) { rooms[Number(el.getAttribute('data-i'))] = el; });
  var track = document.createElement('span');
  track.className = 'gm-track';
  track.setAttribute('aria-hidden', 'true');
  floors.appendChild(track);
  rooms.forEach(function (room) {
    var stamp = document.createElement('span');
    stamp.className = 'gm-stamp';
    stamp.setAttribute('aria-hidden', 'true');
    stamp.textContent = '봤어요';
    room.appendChild(stamp);
  });

  var SAMPLES = 480;
  var samples = [], stops = [], total = 1, here = 0, walking = false, pendingNext = -1, greeted = false;

  var measure = function () {
    var fb = floors.getBoundingClientRect();
    if (mobile.matches) {
      stops = rooms.map(function (room) {
        var r = room.getBoundingClientRect();
        return r.top - fb.top + r.height / 2;
      });
      return;
    }
    var pb = pathSvg.getBoundingClientRect();
    total = path.getTotalLength();
    samples = [];
    for (var k = 0; k <= SAMPLES; k++) {
      var pt = path.getPointAtLength(total * k / SAMPLES);
      samples.push({ x: pb.left - fb.left + pt.x / 1200 * pb.width, y: pb.top - fb.top + pt.y / 560 * pb.height });
    }
    stops = rooms.map(function (room, i) {
      var r = room.getBoundingClientRect();
      var tx = r.left - fb.left + r.width / 2, ty = r.bottom - fb.top;
      if (i === 3) { tx = r.left - fb.left; ty = r.top - fb.top + r.height / 2; }
      var best = 0, bd = Infinity;
      samples.forEach(function (p, k) {
        var d = Math.hypot(p.x - tx, p.y - ty);
        if (d < bd) { bd = d; best = k; }
      });
      return best / SAMPLES * total;
    });
  };

  var place = function (s) {
    if (mobile.matches) return { x: 25.5, y: s + 28 };
    var f = Math.max(0, Math.min(SAMPLES, s / total * SAMPLES));
    var k = Math.min(SAMPLES - 1, Math.floor(f)), t = f - k;
    var a = samples[k], b = samples[k + 1];
    return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
  };

  var follow = function (p) {
    if (!walking) return;
    var y = floors.getBoundingClientRect().top + p.y;
    var top = window.innerHeight * 0.28, bottom = window.innerHeight * 0.8;
    var dy = y < top ? y - top : (y > bottom ? y - bottom : 0);
    if (dy) window.scrollBy(0, dy * 0.14);
  };

  measure();
  var walker = window.Play.walker({
    parent: floors,
    img: '../assets/larva/yellow@2x.webp',
    start: stops[0],
    speed: 820,
    k: 14,
    stride: 64,
    place: place,
    onMove: follow
  });
  walker.set(stops[0]);

  var markHere = function (i) {
    rooms.forEach(function (room, k) { room.classList.toggle('is-here', k === i); });
  };
  var markDone = function () {
    rooms.forEach(function (room, k) { room.classList.toggle('is-done', window.Play.roomDone(k)); });
  };
  markDone();

  var nextOf = function (i) {
    for (var k = 1; k <= rooms.length; k++) {
      var n = (i + k) % rooms.length;
      if (!window.Play.roomDone(n)) return n;
    }
    return (i + 1) % rooms.length;
  };

  var open = function (i) {
    here = i;
    markHere(i);
    walker.say('');
    window.openRecord(i, rooms[i]);
  };

  var visit = function (i) {
    if (!rooms[i]) return;
    markHere(i);
    walker.say('');
    if (Math.abs(walker.get() - stops[i]) < 2 && !walker.moving()) { open(i); return; }
    walking = true;
    walker.go(stops[i], function () { walking = false; open(i); });
  };

  var suggest = function () {
    var n = nextOf(here);
    if (window.Play.doneCount() === rooms.length) walker.say('다 둘러봤어요!');
    else walker.say('다음은 ' + String(n + 1).padStart(2, '0') + ' ' + data[n].name + ' →');
  };

  walker.onSay(function () {
    if (window.Play.doneCount() === rooms.length) { window.Play.celebrate(); return; }
    visit(nextOf(here));
  });

  window.onRecordClose = function () {
    if (pendingNext >= 0) return;
    setTimeout(suggest, 450);
  };

  var rec = document.getElementById('rec');
  rec.addEventListener('click', function (e) {
    if (!e.target.closest('[data-rec-next]')) return;
    e.stopPropagation();
    e.preventDefault();
    var n = (here + 1) % rooms.length;
    pendingNext = n;
    rec.querySelector('.rec-close').click();
    setTimeout(function () { pendingNext = -1; visit(n); }, reduce ? 0 : 260);
  }, true);

  window.Play.on('room', markDone);
  window.Play.on('reset', function () { markDone(); suggest(); });

  document.querySelectorAll('.tk-room[data-i], .tk-icon[data-i]').forEach(function (el) {
    var on = function () { el.classList.add('is-on'); };
    var off = function () { el.classList.remove('is-on'); };
    el.addEventListener('pointerenter', on);
    el.addEventListener('pointerleave', off);
    el.addEventListener('focus', on);
    el.addEventListener('blur', off);
    el.addEventListener('click', function () {
      var i = Number(el.getAttribute('data-i'));
      if (el.classList.contains('tk-icon')) {
        here = i;
        markHere(i);
        walker.set(stops[i]);
        window.openRecord(i, el);
        return;
      }
      visit(i);
    });
  });
  if (!fine && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { en.target.classList.toggle('is-on', en.intersectionRatio > 0.8); });
    }, { threshold: [0, 0.8, 1] });
    document.querySelectorAll('.tk-room[data-i], .tk-icon[data-i]').forEach(function (el) { io.observe(el); });
  }

  var head = document.querySelector('.tk-map-head');
  head.appendChild(window.Play.chip('둘러본 공간'));

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      if (greeted || !entries[0].isIntersecting) return;
      greeted = true;
      setTimeout(function () { walker.say(window.Play.doneCount() ? '이어서 둘러볼까요? →' : '방을 누르면 데려다줄게요'); }, 500);
    }, { threshold: 0.05 }).observe(floors);
  }

  var relayout = function () {
    measure();
    walker.set(stops[here]);
  };
  var resizeTimer = 0;
  window.addEventListener('resize', function () { clearTimeout(resizeTimer); resizeTimer = setTimeout(relayout, 120); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(relayout);
  window.addEventListener('load', relayout);
})();

(function () {
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(pointer: fine)').matches;

  var today = document.querySelector('[data-today]');
  if (today) {
    today.innerHTML = new Date().getDay() === 1
      ? '<span>오늘은 정기휴관일(매주 월요일)입니다.</span> <span>공휴일이면 다음날 쉽니다.</span>'
      : '<span>오늘 10:00~18:00 관람 (입장마감 17:00)</span> <span>매주 월요일 휴관</span>';
  }

  var hero = document.querySelector('.hero');
  var layers = Array.prototype.slice.call(document.querySelectorAll('.hero .layer'));
  var drifts = Array.prototype.slice.call(document.querySelectorAll('.drift'));
  var fall = document.querySelector('.fall');
  var pointer = { x: 0, y: 0 };
  var eased = { x: 0, y: 0 };
  var heroVisible = true;

  if (finePointer && !reduce) {
    hero.addEventListener('pointermove', function (e) {
      pointer.x = e.clientX / innerWidth - 0.5;
      pointer.y = e.clientY / innerHeight - 0.5;
    });
    hero.addEventListener('pointerleave', function () { pointer.x = 0; pointer.y = 0; });
  }
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) { heroVisible = entries[0].isIntersecting; }).observe(hero);
  }

  var frame = function () {
    requestAnimationFrame(frame);
    if (reduce || document.hidden) return;
    var sy = window.scrollY;
    eased.x += (pointer.x - eased.x) * 0.08;
    eased.y += (pointer.y - eased.y) * 0.08;
    if (heroVisible) {
      layers.forEach(function (el) {
        var d = parseFloat(el.dataset.depth || '0.5');
        var x = eased.x * d * 46;
        var y = eased.y * d * 30 - sy * d * 0.35;
        el.style.transform = 'translate3d(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px,0)';
      });
    }
    var r = fall.getBoundingClientRect();
    if (r.bottom > 0 && r.top < innerHeight) {
      var p = (innerHeight - r.top) / (innerHeight + r.height);
      drifts.forEach(function (el) {
        var s = parseFloat(el.dataset.speed || '0.5');
        var spin = parseFloat(el.dataset.spin || '0');
        var y = (p - 0.35) * s * 520;
        el.style.transform = 'translate3d(0,' + y.toFixed(1) + 'px,0) rotate(' + (spin * (p - 0.2)).toFixed(1) + 'deg)';
      });
    }
  };
  requestAnimationFrame(frame);

  var data = window.CHAPTER_DATA;
  var section = document.getElementById('chapters');
  var stage = section.querySelector('.ch-stage');
  var titleEl = section.querySelector('[data-ch-title]');
  var subEl = section.querySelector('[data-ch-sub]');
  var descEl = section.querySelector('[data-ch-desc]');
  var chapters = window.Chapters({
    section: section,
    stage: stage,
    anchor: section.querySelector('.ch-covers'),
    canvas: section.querySelector('.ch-canvas'),
    items: section.querySelectorAll('.cv'),
    axis: 'x',
    drag: true,
    palette: data.map(function (d) { return d.pal; }),
    onIndex: function (i) {
      titleEl.textContent = String(i + 1).padStart(2, '0') + '.' + data[i].name;
      subEl.textContent = data[i].floor + ', 관람 순서 ' + (i + 1) + ' / ' + data.length;
      descEl.textContent = data[i].desc;
    }
  });
  section.querySelectorAll('[data-ch-step]').forEach(function (b) {
    b.addEventListener('click', function () { if (b.dataset.chStep === '1') chapters.next(); else chapters.prev(); });
  });
  stage.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowRight') { e.preventDefault(); chapters.next(); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); chapters.prev(); }
  });
})();

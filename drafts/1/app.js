(function () {
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(pointer: fine)').matches;

  var menuBtn = document.querySelector('.menu-btn');
  var menu = document.getElementById('menu');
  var setMenu = function (open) {
    menu.hidden = !open;
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.setAttribute('aria-label', open ? '전체 메뉴 닫기' : '전체 메뉴 열기');
    document.body.style.overflow = open ? 'hidden' : '';
  };
  menuBtn.addEventListener('click', function () { setMenu(menu.hidden); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !menu.hidden) { setMenu(false); menuBtn.focus(); } });
  menu.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });

  var today = document.querySelector('[data-today]');
  if (today) {
    today.innerHTML = new Date().getDay() === 1
      ? '<span>오늘은 정기휴관일(매주 월요일)입니다.</span> <span>공휴일이면 다음날 쉽니다.</span>'
      : '<span>오늘 10:00~18:00 관람 (입장마감 17:00)</span> <span>매주 월요일 휴관</span>';
  }

  var top = document.querySelector('.top');
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
    var sy = window.scrollY;
    top.classList.toggle('scrolled', sy > hero.offsetHeight - 80);
    if (!reduce) {
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
      if (fall) {
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
      }
    }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);

  var section = document.querySelector('.chapters');
  var list = document.querySelector('.covers');
  var covers = Array.prototype.slice.call(document.querySelectorAll('.cover'));
  var nameEl = document.querySelector('[data-now-name]');
  var floorEl = document.querySelector('[data-now-floor]');
  var descEl = document.querySelector('[data-now-desc]');
  var current = -1;
  var activate = function (i) {
    if (i === current || i < 0 || i >= covers.length) return;
    current = i;
    covers.forEach(function (c, k) { c.classList.toggle('on', k === i); });
    var c = covers[i];
    nameEl.textContent = String(i + 1).padStart(2, '0') + ' ' + c.dataset.name;
    floorEl.textContent = c.dataset.floor;
    descEl.textContent = c.dataset.desc;
    section.style.setProperty('--c', c.style.getPropertyValue('--c'));
  };
  var nearest = function () {
    var mid = list.getBoundingClientRect().left + list.clientWidth / 2;
    var best = 0, dist = Infinity;
    covers.forEach(function (c, k) {
      var b = c.getBoundingClientRect();
      var d = Math.abs(b.left + b.width / 2 - mid);
      if (d < dist) { dist = d; best = k; }
    });
    return best;
  };
  var go = function (i) {
    i = Math.max(0, Math.min(covers.length - 1, i));
    var c = covers[i];
    list.scrollTo({ left: c.offsetLeft - (list.clientWidth - c.offsetWidth) / 2, behavior: reduce ? 'auto' : 'smooth' });
    activate(i);
  };
  var ticking = false;
  list.addEventListener('scroll', function () {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () { activate(nearest()); ticking = false; });
  }, { passive: true });
  document.querySelectorAll('.pl-btn').forEach(function (b) {
    b.addEventListener('click', function () { go(current + parseInt(b.dataset.step, 10)); });
  });
  list.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowRight') { e.preventDefault(); go(current + 1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); go(current - 1); }
  });
  covers.forEach(function (c, k) { c.addEventListener('click', function () { if (k !== current) go(k); }); });
  activate(0);
})();

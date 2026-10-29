(function () {
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = window.matchMedia('(pointer: fine)').matches;
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  var data = window.CHAPTER_DATA;

  var title = document.querySelector('.hero-title');
  title.setAttribute('aria-label', Array.prototype.map.call(title.querySelectorAll('.hl'), function (line) { return line.textContent; }).join(', '));
  title.querySelectorAll('.hl').forEach(function (line, li) {
    var text = line.textContent;
    line.textContent = '';
    Array.prototype.forEach.call(text, function (ch, k) {
      var s = document.createElement('span');
      s.className = ch === ' ' ? 'ch-sp' : 'ch-l';
      s.textContent = ch === ' ' ? '' : ch;
      if (ch !== ' ') {
        s.style.setProperty('--r', ((((k + li) % 3) - 1) * 3.2).toFixed(1) + 'deg');
        s.style.setProperty('--y', ((((k * 7 + li) % 4) - 1.5) * 0.035).toFixed(3) + 'em');
      }
      line.appendChild(s);
    });
  });

  var hero = document.querySelector('.hero');
  var sticky = hero.querySelector('.hero-sticky');
  var frame = hero.querySelector('.hero-frame');
  var scene = hero.querySelector('.hero-scene');
  var copy = hero.querySelector('.hero-copy');
  var otter = hero.querySelector('.hero-otter');
  var bison = hero.querySelector('.hero-bison');
  var robot = hero.querySelector('.hero-robot');
  var badge = hero.querySelector('.hero-badge');
  var clouds = hero.querySelector('.hero-clouds');
  var cta = hero.querySelector('.hero-cta');
  var ctaText = cta.querySelector('span');

  var mx = 0, my = 0, tx = 0, ty = 0, px = -1, py = -1, heroOn = true;
  window.addEventListener('pointermove', function (e) {
    tx = e.clientX / window.innerWidth - 0.5;
    ty = e.clientY / window.innerHeight - 0.5;
    px = e.clientX; py = e.clientY;
  }, { passive: true });

  var progress = function () {
    var h = hero.offsetHeight - window.innerHeight;
    return clamp(-hero.getBoundingClientRect().top / Math.max(1, h), 0, 1);
  };
  var ease = function (t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; };

  var tick = function (now) {
    requestAnimationFrame(tick);
    if (!heroOn) return;
    if (!fine && !reduce) {
      tx = Math.sin(now / 2600) * 0.22;
      ty = Math.cos(now / 3100) * 0.16;
    }
    mx += (tx - mx) * 0.07;
    my += (ty - my) * 0.07;
    var t = reduce ? 0 : progress();
    var e = ease(t);
    var vw = window.innerWidth / 100, vh = window.innerHeight / 100;
    var p = function (d) { return 'translate3d(' + (-mx * d).toFixed(2) + 'px,' + (-my * d * 0.7).toFixed(2) + 'px,0) '; };
    frame.style.transform = p(10) + 'scale(' + (1 + e * 1.7).toFixed(4) + ')';
    scene.style.transform = 'translate3d(' + (-mx * 16).toFixed(2) + 'px,' + (-my * 10).toFixed(2) + 'px,0)';
    copy.style.transform = 'translateX(-50%) ' + p(6) + 'translateY(' + (-e * 80).toFixed(1) + 'px)';
    copy.style.opacity = clamp(1 - t * 3.2, 0, 1);
    otter.style.transform = p(26) + 'translate3d(' + (-e * 46 * vw).toFixed(1) + 'px,' + (e * 12 * vh).toFixed(1) + 'px,0) rotate(' + (-e * 16).toFixed(2) + 'deg) scale(' + (1 + e * 0.5).toFixed(3) + ')';
    robot.style.transform = p(30) + 'translate3d(' + (e * 46 * vw).toFixed(1) + 'px,' + (e * 12 * vh).toFixed(1) + 'px,0) rotate(' + (e * 16).toFixed(2) + 'deg) scale(' + (1 + e * 0.5).toFixed(3) + ')';
    bison.style.transform = p(18) + 'translate3d(0,' + (e * 34 * vh).toFixed(1) + 'px,0) scale(' + (1 + e * 0.7).toFixed(3) + ')';
    badge.style.transform = p(14) + 'rotate(' + (e * 90).toFixed(1) + 'deg)';
    var badgeOpacity = clamp(1 - t * 3, 0, 1);
    badge.style.opacity = badgeOpacity;
    badge.style.visibility = badgeOpacity > 0 ? '' : 'hidden';
    clouds.style.transform = p(40) + 'translate3d(0,' + (e * 26 * vh).toFixed(1) + 'px,0) scale(' + (1 + e * 0.35).toFixed(3) + ')';
    var ctaOpacity = clamp(1 - t * 4, 0, 1);
    cta.style.opacity = ctaOpacity;
    cta.style.visibility = ctaOpacity > 0 ? '' : 'hidden';
    cta.style.pointerEvents = t > 0.2 ? 'none' : '';
    var r = clamp((t - 0.58) / 0.42, 0, 1);
    var maxR = Math.hypot(window.innerWidth / 2, window.innerHeight * 0.52) + 16;
    sticky.style.setProperty('--R', (ease(r) * maxR).toFixed(1) + 'px');
    sticky.style.setProperty('--io', r > 0 && r < 1 ? '1' : '0');

    if (fine && !reduce && t < 0.2 && px >= 0) {
      var b = cta.getBoundingClientRect();
      var dx = px - (b.left + b.width / 2), dy = py - (b.top + b.height / 2);
      var near = Math.hypot(dx, dy) < 140;
      ctaText.style.setProperty('--mx', clamp(dx * (near ? 0.22 : 0.03), -30, 30).toFixed(1) + 'px');
      ctaText.style.setProperty('--my', clamp(dy * (near ? 0.22 : 0.03), -22, 22).toFixed(1) + 'px');
      ctaText.style.setProperty('--mr', clamp(dx * 0.008, -7, 7).toFixed(2) + 'deg');
    }
  };
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (en) { heroOn = en[0].isIntersecting; }, { rootMargin: '100px 0px' }).observe(sticky);
  }
  requestAnimationFrame(tick);

  var title1 = document.querySelector('[data-ch-title]');
  var sub1 = document.querySelector('[data-ch-sub]');
  var count1 = document.querySelector('[data-ch-count]');
  var section = document.getElementById('chapters');
  var chapters = window.Chapters({
    section: section,
    stage: section.querySelector('.ch-stage'),
    anchor: section.querySelector('.ch-covers'),
    canvas: document.getElementById('rings'),
    items: section.querySelectorAll('.cv'),
    axis: 'x',
    drag: true,
    palette: data.map(function (c) { return c.ring; }),
    onIndex: function (i) {
      title1.textContent = String(i + 1).padStart(2, '0') + '.' + data[i].name;
      sub1.textContent = data[i].place;
      count1.textContent = '관람 순서 ' + (i + 1) + ' / ' + data.length;
    },
    onOpen: function (i, el) { window.openRecord(i, el); }
  });
  section.querySelector('.ch-play').addEventListener('click', function (e) { window.openRecord(chapters.index(), e.currentTarget); });
  section.querySelectorAll('[data-ch-step]').forEach(function (btn) {
    btn.addEventListener('click', function () { if (btn.dataset.chStep === '1') chapters.next(); else chapters.prev(); });
  });
  window.onRecordClose = function (i) { if (i !== chapters.index()) chapters.go(i); };
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    if (window.isLayerOpen()) return;
    var r = section.getBoundingClientRect();
    if (r.top > 10 || r.bottom < window.innerHeight - 10) return;
    var target = chapters.index() + (e.key === 'ArrowRight' ? 1 : -1);
    if (target < 0 || target >= data.length) return;
    e.preventDefault();
    chapters.go(target);
  });
})();

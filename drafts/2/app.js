(function () {
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = window.matchMedia('(pointer: fine)').matches;
  var data = window.CHAPTER_DATA;

  var intro = document.querySelector('.intro');
  var art = intro.querySelector('.intro-art');
  var title = intro.querySelector('.intro-title');
  var side = intro.querySelector('.intro-side');
  var clouds = intro.querySelector('.intro-clouds');
  var mx = 0, my = 0, tx = 0, ty = 0, introOn = true;
  if (fine) {
    window.addEventListener('pointermove', function (e) {
      tx = e.clientX / window.innerWidth - 0.5;
      ty = e.clientY / window.innerHeight - 0.5;
    }, { passive: true });
  }
  var tick = function (now) {
    requestAnimationFrame(tick);
    if (!introOn || reduce) return;
    if (!fine) { tx = Math.sin(now / 2800) * 0.18; ty = Math.cos(now / 3300) * 0.12; }
    mx += (tx - mx) * 0.07;
    my += (ty - my) * 0.07;
    var sy = Math.min(window.scrollY, window.innerHeight);
    art.style.transform = 'translate3d(' + (-mx * 18).toFixed(2) + 'px,' + (-my * 12 + sy * 0.32).toFixed(2) + 'px,0) scale(' + (1 + sy / window.innerHeight * 0.06).toFixed(4) + ')';
    title.style.transform = 'translate3d(' + (-mx * 8).toFixed(2) + 'px,' + (-my * 6 - sy * 0.1).toFixed(2) + 'px,0)';
    side.style.transform = 'translate3d(' + (-mx * 10).toFixed(2) + 'px,' + (-my * 6 - sy * 0.14).toFixed(2) + 'px,0)';
    clouds.style.transform = 'translate3d(' + (-mx * 34).toFixed(2) + 'px,' + (-my * 10 + sy * 0.08).toFixed(2) + 'px,0)';
  };
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (en) { introOn = en[0].isIntersecting; }).observe(intro);
  }
  requestAnimationFrame(tick);

  var section = document.getElementById('journey');
  var stage = section.querySelector('.ch-stage');
  var slots = Array.prototype.slice.call(section.querySelectorAll('.slot'));
  var slam = section.querySelector('.slam');
  var info = section.querySelector('.jr-info');
  var q = function (sel) { return section.querySelector(sel); };
  var reached = -1, seen = false, current = 0;
  var pad = function (n) { return String(n).padStart(2, '0'); };
  var covers = section.querySelectorAll('.cv');
  var lines = function (i) { return covers[i].querySelector('.cv-sticker b').innerHTML; };

  var stamp = function (i) {
    if (i <= reached) return;
    for (var k = reached + 1; k <= i; k++) slots[k].classList.add('is-done');
    reached = i;
    if (reduce) return;
    var c = getComputedStyle(slots[i]);
    slam.style.setProperty('--k', c.getPropertyValue('--k'));
    slam.style.setProperty('--kt', c.getPropertyValue('--kt'));
    slam.querySelector('b').innerHTML = lines(i);
    slam.querySelector('small').textContent = '도장 ' + pad(i + 1) + ' / ' + pad(data.length);
    slam.classList.remove('is-hit');
    void slam.offsetWidth;
    slam.classList.add('is-hit');
  };

  var chapters = window.Chapters({
    section: section,
    stage: stage,
    anchor: q('.ch-covers'),
    canvas: q('.ch-canvas'),
    items: section.querySelectorAll('.cv'),
    axis: 'y',
    drag: false,
    palette: data.map(function (c) { return c.ring; }),
    onIndex: function (i) {
      current = i;
      q('[data-ch-title]').textContent = pad(i + 1) + '.' + data[i].name;
      q('[data-ch-sub]').textContent = data[i].place;
      q('[data-ch-count]').textContent = '관람 순서 ' + (i + 1) + ' / ' + data.length;
      q('[data-ch-thumb]').src = '../assets/img/' + data[i].photo + '.webp';
      q('[data-ch-thumb]').alt = data[i].photoAlt;
      q('[data-jr-photo]').src = '../assets/img/' + data[i].photo + '.webp';
      q('[data-jr-photo]').alt = data[i].photoAlt;
      q('[data-jr-no]').textContent = pad(i + 1);
      q('[data-jr-place]').textContent = data[i].place;
      q('[data-jr-name]').textContent = data[i].name;
      q('[data-jr-desc]').textContent = data[i].desc;
      info.classList.remove('is-swap');
      void info.offsetWidth;
      info.classList.add('is-swap');
      slots.forEach(function (s, k) { s.classList.toggle('is-now', k === i); });
      if (seen) stamp(i);
    },
    onOpen: function (i, el) { window.openRecord(i, el); }
  });

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (en) {
      if (en[0].isIntersecting && !seen) {
        seen = true;
        setTimeout(function () { stamp(current); }, 250);
      }
    }, { threshold: 0.5 }).observe(stage);
  } else {
    seen = true;
  }

  slots.forEach(function (s, k) {
    s.querySelector('button').addEventListener('click', function () { chapters.go(k); });
  });
  q('.ch-play').addEventListener('click', function (e) { window.openRecord(chapters.index(), e.currentTarget); });
  section.querySelectorAll('[data-ch-step]').forEach(function (btn) {
    btn.addEventListener('click', function () { if (btn.dataset.chStep === '1') chapters.next(); else chapters.prev(); });
  });
  window.onRecordClose = function (i) { if (i !== chapters.index()) chapters.go(i); };
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    if (window.isLayerOpen()) return;
    var r = section.getBoundingClientRect();
    if (r.top > 10 || r.bottom < window.innerHeight - 10) return;
    var target = chapters.index() + (e.key === 'ArrowDown' ? 1 : -1);
    if (target < 0 || target >= data.length) return;
    e.preventDefault();
    chapters.go(target);
  });
})();

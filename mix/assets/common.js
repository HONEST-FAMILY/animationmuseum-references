(function () {
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = window.matchMedia('(pointer: fine)').matches;
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  var data = window.CHAPTER_DATA;

  var cta = document.querySelector('.hero-cta');
  if (cta && fine && !reduce) {
    var ctaText = cta.querySelector('span');
    window.addEventListener('pointermove', function (e) {
      var b = cta.getBoundingClientRect();
      if (b.bottom < 0 || b.top > window.innerHeight) return;
      var dx = e.clientX - (b.left + b.width / 2), dy = e.clientY - (b.top + b.height / 2);
      var near = Math.hypot(dx, dy) < 150;
      ctaText.style.setProperty('--mx', clamp(dx * (near ? 0.22 : 0.03), -30, 30).toFixed(1) + 'px');
      ctaText.style.setProperty('--my', clamp(dy * (near ? 0.22 : 0.03), -22, 22).toFixed(1) + 'px');
      ctaText.style.setProperty('--mr', clamp(dx * 0.008, -7, 7).toFixed(2) + 'deg');
    }, { passive: true });
  }

  var section = document.getElementById('chapters');
  if (!section || !window.Chapters) return;
  var title1 = section.querySelector('[data-ch-title]');
  var sub1 = section.querySelector('[data-ch-sub]');
  var count1 = section.querySelector('[data-ch-count]');
  var thumb1 = section.querySelector('[data-ch-thumb]');
  var items = section.querySelectorAll('.cv');
  var chapters = window.Chapters({
    section: section,
    stage: section.querySelector('.ch-stage'),
    anchor: section.querySelector('.ch-covers'),
    canvas: document.getElementById('rings'),
    items: items,
    axis: 'x',
    drag: true,
    palette: data.map(function (c) { return c.ring; }),
    onIndex: function (i, dir) {
      title1.textContent = String(i + 1).padStart(2, '0') + '.' + data[i].name;
      sub1.textContent = data[i].place;
      count1.textContent = '관람 순서 ' + (i + 1) + ' / ' + data.length;
      thumb1.src = '../assets/img/' + data[i].photo + '.webp';
      thumb1.alt = data[i].photoAlt;
      if (window.onChapterIndex) window.onChapterIndex(i, items[i], dir);
    },
    onOpen: function (i, el) { window.openRecord(i, el); }
  });
  window.MixChapters = chapters;
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

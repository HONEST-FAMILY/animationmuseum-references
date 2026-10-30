(function () {
  var POSES = {
    cave: [120, 120, 120, 120, 500],
    box: [170, 170, 170, 170, 170, 170, 170, 500, 170],
    spark: [170, 170, 170, 200],
    dizzy: [170, 170, 170, 170],
    thumbs: [70, 70, 70, 70, 100, 100, 70, 70, 500],
    calm: [600],
    wig: [300, 100, 100, 100, 100, 100, 600],
    laugh: [120, 120, 170, 120, 120, 120],
    joy: [170, 170, 170, 170],
    heart: [300, 500],
    party: [120, 120, 120, 120, 700]
  };
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var script = document.currentScript;
  var base = script ? script.src.replace(/larva\.js.*$/, 'larva/') : '../assets/larva/';
  var players = [];

  var frameSrc = function (pose, i) { return base + pose + '_' + i + '.webp'; };

  var mount = function (el) {
    var pose = el.getAttribute('data-larva');
    var durs = POSES[pose];
    if (!durs) return;
    var img = el.querySelector('img');
    if (!img) {
      img = document.createElement('img');
      img.alt = el.getAttribute('data-alt') || '';
      img.width = 600;
      img.height = 600;
      img.draggable = false;
      el.appendChild(img);
    }
    var start = Number(el.getAttribute('data-start') || 0);
    img.src = frameSrc(pose, start);
    var player = { el: el, img: img, pose: pose, durs: durs, i: start, acc: 0, seen: true, loaded: false };
    players.push(player);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) { player.seen = entries[0].isIntersecting; }, { rootMargin: '20% 0px' }).observe(el);
    }
  };

  var preload = function (player) {
    if (player.loaded) return;
    player.loaded = true;
    player.durs.forEach(function (d, i) { var im = new Image(); im.src = frameSrc(player.pose, i); });
  };

  var playing = function (p) {
    if (reduce || !p.seen || p.durs.length < 2) return false;
    var when = p.el.getAttribute('data-when');
    if (when === 'on') return !!p.el.closest('.is-on');
    if (when === 'alive') return document.documentElement.classList.contains('is-alive');
    return true;
  };

  var last = 0;
  var tick = function (now) {
    requestAnimationFrame(tick);
    var dt = last ? Math.min(250, now - last) : 0;
    last = now;
    if (document.hidden) return;
    players.forEach(function (p) {
      if (!playing(p)) { p.acc = 0; return; }
      preload(p);
      p.acc += dt;
      var changed = false;
      while (p.acc >= p.durs[p.i]) {
        p.acc -= p.durs[p.i];
        p.i = (p.i + 1) % p.durs.length;
        changed = true;
      }
      if (changed) p.img.src = frameSrc(p.pose, p.i);
    });
  };

  window.Larva = {
    mount: mount,
    src: frameSrc,
    poses: POSES,
    mountAll: function (root) { (root || document).querySelectorAll('[data-larva]').forEach(function (el) { if (!el.__larva) { el.__larva = 1; mount(el); } }); }
  };
  window.Larva.mountAll();
  requestAnimationFrame(tick);
})();

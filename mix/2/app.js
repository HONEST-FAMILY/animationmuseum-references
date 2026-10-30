(function () {
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = window.matchMedia('(pointer: fine)').matches;
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  var ease = function (t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; };
  var easeOut = function (t) { return 1 - Math.pow(1 - t, 3); };

  var hero = document.querySelector('.hero--deep');
  var sticky = hero.querySelector('.hero-sticky');
  var world = hero.querySelector('.dp-world');
  var layers = Array.prototype.slice.call(hero.querySelectorAll('.dp-world .dp-layer'));
  var props = Array.prototype.slice.call(hero.querySelectorAll('.dp-prop'));
  var copy = hero.querySelector('.dp-copy');
  var fall = hero.querySelector('.dp-fall');
  var quote = fall.querySelector('.dp-quote');
  var arch = fall.querySelector('.dp-arch');
  var fallY = fall.querySelector('.dp-faller--y');
  var fallR = fall.querySelector('.dp-faller--r');
  var fades = Array.prototype.slice.call(hero.querySelectorAll('.hero-badge, .now-card, .hero-cta, .hero-hours, .dp-scroll'));
  var chapterStage = document.querySelector('#chapters .ch-stage');
  var depth = function (el) { return Number(el.getAttribute('data-depth') || 1); };
  var layerDepth = layers.map(depth);
  var propDepth = props.map(depth);
  var propSeed = props.map(function (el, i) { return i * 1.7 + 0.4; });

  var mx = 0, my = 0, tx = 0, ty = 0, on = true;
  window.addEventListener('pointermove', function (e) {
    if (e.pointerType !== 'mouse') return;
    tx = e.clientX / window.innerWidth - 0.5;
    ty = e.clientY / window.innerHeight - 0.5;
  }, { passive: true });

  var progress = function () {
    var h = hero.offsetHeight - window.innerHeight;
    return clamp(-hero.getBoundingClientRect().top / Math.max(1, h), 0, 1);
  };

  var tick = function (now) {
    requestAnimationFrame(tick);
    var t = reduce ? 0 : progress();
    var reveal = reduce ? 1 : clamp((t - 0.94) / 0.06, 0, 1);
    if (chapterStage) {
      chapterStage.style.opacity = reveal;
      chapterStage.style.pointerEvents = reveal < 1 ? 'none' : '';
    }
    if (!on) return;
    var time = now / 1000;
    if (!fine && !reduce) { tx = Math.sin(time / 2.6) * 0.24; ty = Math.cos(time / 3.1) * 0.16; }
    mx += (tx - mx) * 0.07;
    my += (ty - my) * 0.07;
    var vw = window.innerWidth / 100, vh = window.innerHeight / 100;

    var a = clamp(t / 0.36, 0, 1), ea = ease(a);
    var b = clamp((t - 0.3) / 0.4, 0, 1), eb = easeOut(b);
    var c = clamp((t - 0.7) / 0.26, 0, 1);

    world.style.transform = 'scale(' + (1 + ea * 1.5).toFixed(4) + ')';
    world.style.opacity = (1 - clamp((a - 0.72) / 0.28, 0, 1)).toFixed(3);
    layers.forEach(function (el, i) {
      var d = layerDepth[i];
      var x = -mx * d * 30, y = -my * d * 18 + ea * d * d * 5 * vh;
      el.style.transform = 'translate3d(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px,0) scale(' + (1 + ea * d * 0.35).toFixed(4) + ')';
    });
    props.forEach(function (el, i) {
      var d = propDepth[i], s = propSeed[i];
      var bob = reduce ? 0 : Math.sin(time * 0.9 + s) * 10;
      var spin = reduce ? 0 : Math.sin(time * 0.6 + s) * 6;
      var x = -mx * d * 38 + (i % 2 ? 1 : -1) * ea * d * 14 * vw;
      var y = -my * d * 26 + bob - eb * d * 34 * vh + ea * d * 6 * vh;
      var sc = 1 + ea * d * 0.32;
      el.style.transform = 'translate3d(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px,0) rotate(' + (spin + (i % 2 ? 1 : -1) * ea * 30).toFixed(2) + 'deg) scale(' + sc.toFixed(3) + ')';
      el.style.opacity = (1 - clamp((b - 0.75) / 0.25, 0, 1)).toFixed(3);
    });
    copy.style.transform = 'translateX(-50%) translate3d(' + (-mx * 12).toFixed(1) + 'px,' + (-my * 8 - ea * 120).toFixed(1) + 'px,0) scale(' + (1 + ea * 0.25).toFixed(3) + ')';
    copy.style.opacity = clamp(1 - a * 2.6, 0, 1).toFixed(3);
    copy.style.filter = a > 0.01 ? 'blur(' + (a * 10).toFixed(1) + 'px)' : '';
    var fadeOut = clamp(1 - a * 4, 0, 1);
    fades.forEach(function (el) { el.style.opacity = fadeOut; el.style.visibility = fadeOut > 0 ? '' : 'hidden'; });

    sticky.style.setProperty('--pastel', clamp((t - 0.24) / 0.16, 0, 1).toFixed(3));
    var fallOpacity = clamp(b * 3, 0, 1) * (1 - clamp((c - 0.35) / 0.4, 0, 1));
    fall.style.opacity = fallOpacity.toFixed(3);
    quote.style.transform = 'translateX(-50%) translate3d(' + (-mx * 10).toFixed(1) + 'px,' + ((1 - eb) * 50 - my * 8).toFixed(1) + 'px,0)';
    arch.style.transform = 'translate(-50%, -38%) translate3d(' + (-mx * 22).toFixed(1) + 'px,' + (-my * 14 + (1 - eb) * 12 * vh).toFixed(1) + 'px,0) scale(' + (0.72 + eb * 0.28 + c * 0.6).toFixed(3) + ')';
    var fy = (-0.45 + b * 1.7) * window.innerHeight;
    fallY.style.transform = 'translate3d(' + (-mx * 30 + Math.sin(b * 6) * 3 * vw).toFixed(1) + 'px,' + fy.toFixed(1) + 'px,0) rotate(' + (b * 420).toFixed(1) + 'deg)';
    fallR.style.transform = 'translate3d(' + (-mx * 40 - Math.sin(b * 5) * 3 * vw).toFixed(1) + 'px,' + ((-0.75 + b * 1.9) * window.innerHeight).toFixed(1) + 'px,0) rotate(' + (-b * 360).toFixed(1) + 'deg)';

    var maxR = Math.hypot(window.innerWidth / 2, window.innerHeight * 0.52) + 16;
    sticky.style.setProperty('--R', (ease(c) * maxR).toFixed(1) + 'px');
    sticky.style.setProperty('--io', c > 0 && c < 1 ? '1' : '0');
  };
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (en) { on = en[0].isIntersecting; }, { rootMargin: '100px 0px' }).observe(sticky);
  }
  requestAnimationFrame(tick);
  document.documentElement.classList.add('is-alive');
  hero.classList.add('is-alive');
})();

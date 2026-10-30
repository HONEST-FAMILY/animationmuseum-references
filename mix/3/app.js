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

  document.querySelectorAll('.tk-room[data-i], .tk-icon[data-i]').forEach(function (el) {
    var on = function () { el.classList.add('is-on'); };
    var off = function () { el.classList.remove('is-on'); };
    el.addEventListener('pointerenter', on);
    el.addEventListener('pointerleave', off);
    el.addEventListener('focus', on);
    el.addEventListener('blur', off);
    el.addEventListener('click', function () { window.openRecord(Number(el.getAttribute('data-i')), el); });
  });
  if (!fine && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { en.target.classList.toggle('is-on', en.intersectionRatio > 0.8); });
    }, { threshold: [0, 0.8, 1] });
    document.querySelectorAll('.tk-room[data-i], .tk-icon[data-i]').forEach(function (el) { io.observe(el); });
  }
})();

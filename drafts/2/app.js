(function () {
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var stations = Array.prototype.slice.call(document.querySelectorAll('.station'));
  var frames = Array.prototype.slice.call(document.querySelectorAll('.frame'));
  var trail = Array.prototype.slice.call(document.querySelectorAll('.trail a'));
  var slots = Array.prototype.slice.call(document.querySelectorAll('.slots li'));
  var strip = document.querySelector('.strip');
  var pName = document.querySelector('[data-p-name]');
  var pSub = document.querySelector('[data-p-sub]');
  var cardTitle = document.querySelector('[data-card-title]');
  var cardSub = document.querySelector('[data-card-sub]');
  var stamped = {};
  var current = -1;

  var countStamped = function () { return Object.keys(stamped).length; };

  var centerStrip = function (i) {
    var f = frames[Math.max(0, i)];
    var y = innerHeight / 2 - (f.offsetTop + f.offsetHeight / 2);
    strip.style.transform = 'translateY(' + Math.round(y) + 'px)';
  };

  var updateCard = function () {
    var n = countStamped();
    if (n === stations.length) {
      cardTitle.textContent = '도장판 완성';
      cardSub.textContent = '아홉 칸을 모두 채웠어요. 이제 진짜 상상의 계단을 올라 볼 차례입니다.';
    } else if (n > 0) {
      cardTitle.textContent = '도장 ' + n + '개를 모았어요';
      cardSub.textContent = '남은 칸은 ' + (stations.length - n) + '칸입니다. 위로 올라가 빠진 곳을 지나가면 도장이 찍힙니다.';
    }
  };

  var setCurrent = function (i) {
    if (i === current) return;
    current = i;
    var st = stations[i];
    var id = st.id;
    stamped[id] = true;
    document.body.style.setProperty('--bg', st.style.getPropertyValue('--bg'));
    frames.forEach(function (f) { if (stamped[f.dataset.for]) f.classList.add('done'); });
    slots.forEach(function (s) { if (stamped[s.dataset.for]) s.classList.add('done'); });
    trail.forEach(function (a, k) {
      a.classList.toggle('is-now', k === i);
      a.classList.toggle('is-done', !!stamped[a.dataset.for]);
      if (k === i) a.setAttribute('aria-current', 'step'); else a.removeAttribute('aria-current');
    });
    centerStrip(i);
    pName.textContent = String(i + 1).padStart(2, '0') + ' ' + st.querySelector('h2').textContent;
    pSub.textContent = '도장 ' + countStamped() + ' / ' + stations.length;
    updateCard();
  };

  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) setCurrent(stations.indexOf(en.target));
      });
    }, { rootMargin: '-45% 0px -45% 0px' });
    stations.forEach(function (s) { io.observe(s); });
  } else {
    stations.forEach(function (s, k) { stamped[s.id] = true; });
    setCurrent(0);
  }

  centerStrip(0);
  window.addEventListener('resize', function () { centerStrip(Math.max(0, current)); });

  document.querySelectorAll('.player button').forEach(function (b) {
    b.addEventListener('click', function () {
      var next = current < 0 ? 0 : current + parseInt(b.dataset.step, 10);
      next = Math.max(0, Math.min(stations.length - 1, next));
      stations[next].scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
    });
  });

  var player = document.querySelector('.player');
  var journey = document.querySelector('.journey');
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      player.classList.toggle('off', !entries[0].isIntersecting);
    }, { rootMargin: '-30% 0px -30% 0px' }).observe(journey);
  } else {
    player.classList.remove('off');
  }

  var today = document.querySelector('[data-today]');
  if (today) {
    today.textContent = new Date().getDay() === 1
      ? '오늘은 정기휴관일(매주 월요일)입니다. 공휴일이면 다음날 쉽니다.'
      : '오늘 10:00부터 18:00까지 관람할 수 있어요. 입장은 17:00까지입니다.';
  }
})();

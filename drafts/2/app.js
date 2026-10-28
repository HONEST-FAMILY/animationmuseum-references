(function () {
  var data = window.CHAPTER_DATA;
  var section = document.getElementById('journey');
  var stage = section.querySelector('.ch-stage');
  var frames = Array.prototype.slice.call(section.querySelectorAll('.frame'));
  var trail = Array.prototype.slice.call(section.querySelectorAll('.trail button'));
  var slots = Array.prototype.slice.call(document.querySelectorAll('.slots li'));
  var strip = section.querySelector('.strip');
  var info = section.querySelector('.jr-info');
  var numEl = section.querySelector('[data-jr-num]');
  var nameEl = section.querySelector('[data-jr-name]');
  var floorEl = section.querySelector('[data-jr-floor]');
  var textEl = section.querySelector('[data-jr-text]');
  var titleEl = section.querySelector('[data-ch-title]');
  var subEl = section.querySelector('[data-ch-sub]');
  var cardTitle = document.querySelector('[data-card-title]');
  var cardSub = document.querySelector('[data-card-sub]');
  var reached = -1;

  var centerStrip = function (i) {
    var f = frames[i];
    var y = strip.parentNode.clientHeight / 2 - (f.offsetTop + f.offsetHeight / 2);
    strip.style.transform = 'translateY(' + Math.round(y) + 'px)';
  };

  var updateCard = function () {
    var n = reached + 1;
    if (n === data.length) {
      cardTitle.textContent = '도장판 완성';
      cardSub.textContent = '아홉 칸을 모두 채웠어요. 이제 진짜 상상의 계단을 올라 볼 차례입니다.';
    } else if (n > 0) {
      cardTitle.textContent = '도장 ' + n + '개를 모았어요';
      cardSub.textContent = '남은 칸은 ' + (data.length - n) + '칸입니다. 아래로 계속 내려가면 나머지 칸에도 도장이 찍힙니다.';
    }
  };

  var chapters = window.Chapters({
    section: section,
    stage: stage,
    anchor: section.querySelector('.ch-covers'),
    canvas: section.querySelector('.ch-canvas'),
    items: section.querySelectorAll('.cv'),
    axis: 'y',
    palette: data.map(function (d) { return d.pal; }),
    onIndex: function (i) {
      reached = Math.max(reached, i);
      frames.forEach(function (f, k) { f.classList.toggle('done', k <= reached); });
      slots.forEach(function (s, k) { s.classList.toggle('done', k <= reached); });
      trail.forEach(function (b, k) {
        b.classList.toggle('is-now', k === i);
        b.classList.toggle('is-done', k <= reached);
        if (k === i) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current');
      });
      centerStrip(i);
      info.classList.remove('is-swap');
      void info.offsetWidth;
      info.classList.add('is-swap');
      numEl.textContent = String(i + 1).padStart(2, '0');
      nameEl.textContent = data[i].name;
      floorEl.textContent = data[i].floor;
      textEl.textContent = data[i].desc;
      titleEl.textContent = String(i + 1).padStart(2, '0') + '.' + data[i].name;
      subEl.textContent = '도장 ' + (reached + 1) + ' / ' + data.length + ', ' + data[i].floor;
      updateCard();
    }
  });

  trail.forEach(function (b) {
    b.addEventListener('click', function () { chapters.go(parseInt(b.dataset.go, 10)); });
  });
  section.querySelectorAll('[data-ch-step]').forEach(function (b) {
    b.addEventListener('click', function () { if (b.dataset.chStep === '1') chapters.next(); else chapters.prev(); });
  });
  window.addEventListener('resize', function () { centerStrip(Math.max(0, frames.findIndex(function (f, k) { return trail[k].classList.contains('is-now'); }))); });

  var today = document.querySelector('[data-today]');
  if (today) {
    today.textContent = new Date().getDay() === 1
      ? '오늘은 정기휴관일(매주 월요일)입니다. 공휴일이면 다음날 쉽니다.'
      : '오늘 10:00부터 18:00까지 관람할 수 있어요. 입장은 17:00까지입니다.';
  }
})();

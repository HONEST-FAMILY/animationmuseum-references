(function () {
  'use strict';
  var d = document, html = d.documentElement;
  var rm = html.classList.contains('rm');

  /* ---------- 상영: 리더 카운트다운 + 영상 ---------- */
  var hero = d.querySelector('.hero');
  var gate = d.querySelector('.hero-film');
  var video = d.querySelector('.film-video');
  var toggle = d.querySelector('.film-toggle');
  var leader = d.querySelector('.leader');
  var userPaused = false, scrollPaused = false;

  function sync() {
    if (!video) return;
    var playing = !video.paused;
    toggle.textContent = playing ? '일시정지' : '재생';
    toggle.setAttribute('aria-pressed', playing ? 'false' : 'true');
    gate.classList.toggle('is-run', playing && !rm);
  }
  function play() {
    if (!video) return;
    var p = video.play();
    if (p && p.catch) p.catch(sync);
  }

  if (video) {
    video.addEventListener('play', sync);
    video.addEventListener('pause', sync);
    if (rm) {
      video.removeAttribute('autoplay');
      video.pause();
      userPaused = true;
    }
    toggle.addEventListener('click', function () {
      if (video.paused) { userPaused = false; play(); }
      else { userPaused = true; video.pause(); }
    });
    sync();
  }

  if (leader && html.classList.contains('leader-on')) {
    var num = leader.querySelector('.ld-num');
    var STEP = 270, t0 = 0;
    try { sessionStorage.setItem('fm-leader', '1'); } catch (e) {}
    if (video) video.pause();
    var done = function () {
      leader.classList.add('is-out');
      if (video && !userPaused) {
        try { video.currentTime = 0; } catch (e) {}
        play();
      }
      setTimeout(function () {
        html.classList.remove('leader-on');
        if (leader.parentNode) leader.parentNode.removeChild(leader);
      }, 150);
    };
    var tick = function (now) {
      if (!t0) t0 = now;
      var k = Math.floor((now - t0) / STEP);
      if (k < 5) {
        var v = String(5 - k);
        if (num.textContent !== v) num.textContent = v;
        requestAnimationFrame(tick);
      } else {
        done();
      }
    };
    requestAnimationFrame(tick);
    // 탭이 가려져 rAF가 멈춰도 상영은 시작되게
    setTimeout(function () { if (d.hidden && leader.parentNode) done(); }, 1600);
  } else if (leader && leader.parentNode) {
    leader.parentNode.removeChild(leader);
  }

  if ('IntersectionObserver' in window && hero) {
    new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        hero.classList.toggle('is-off', !e.isIntersecting);
        if (!video) return;
        if (!e.isIntersecting) {
          if (!video.paused) { scrollPaused = true; video.pause(); }
        } else if (scrollPaused && !userPaused && !html.classList.contains('leader-on')) {
          scrollPaused = false;
          play();
        }
      });
    }, { threshold: 0 }).observe(hero);
  }

  /* ---------- 자막 카드: 영사기처럼 깜빡이며 켜짐 ---------- */
  if (!rm && 'IntersectionObserver' in window) {
    var cardIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.remove('pre');
        e.target.classList.add('on');
        cardIO.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -10% 0px' });
    Array.prototype.forEach.call(d.querySelectorAll('.it-card'), function (c) {
      if (c.getBoundingClientRect().top > innerHeight) {
        c.classList.add('pre');
        cardIO.observe(c);
      }
    });
  }

  /* ---------- 오늘 운영: 월요일 휴관, 월요일이 공휴일이면 다음날 ---------- */
  var HOL = ('2026-01-01 2026-02-16 2026-02-17 2026-02-18 2026-03-01 2026-03-02 2026-05-05 2026-05-24 2026-05-25 2026-06-03 2026-06-06 ' +
    '2026-08-15 2026-08-17 2026-09-24 2026-09-25 2026-09-26 2026-10-03 2026-10-05 2026-10-09 2026-12-25 ' +
    '2027-01-01 2027-02-06 2027-02-07 2027-02-08 2027-02-09 2027-03-01 2027-05-05 2027-05-13 2027-06-06 2027-08-15 2027-08-16 ' +
    '2027-09-14 2027-09-15 2027-09-16 2027-10-03 2027-10-04 2027-10-09 2027-10-11 2027-12-25 2027-12-27').split(' ');
  var DAY = 864e5, WD = ['일', '월', '화', '수', '목', '금', '토'];
  function two(n) { return (n < 10 ? '0' : '') + n; }
  function key(t) { var x = new Date(t); return x.getUTCFullYear() + '-' + two(x.getUTCMonth() + 1) + '-' + two(x.getUTCDate()); }
  function isHol(t) { return HOL.indexOf(key(t)) > -1; }
  function closedOn(t) {
    var wd = new Date(t).getUTCDay();
    if (wd === 1 && !isHol(t)) return true;
    if (wd === 2 && isHol(t - DAY)) return true;
    return false;
  }
  function nextOpen(t) { t += DAY; for (var i = 0; i < 14 && closedOn(t); i++) t += DAY; return t; }
  function longDate(t) { var x = new Date(t); return (x.getUTCMonth() + 1) + '월 ' + x.getUTCDate() + '일 ' + WD[x.getUTCDay()] + '요일'; }
  function shortDate(t) { var x = new Date(t); return (x.getUTCMonth() + 1) + '월 ' + x.getUTCDate() + '일(' + WD[x.getUTCDay()] + ')'; }
  function nowKST() {
    var o = {};
    try {
      new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
        .formatToParts(new Date()).forEach(function (p) { o[p.type] = p.value; });
      return { y: +o.year, m: +o.month, d: +o.day, min: (+o.hour % 24) * 60 + (+o.minute) };
    } catch (e) {
      var n = new Date(Date.now() + 9 * 36e5);
      return { y: n.getUTCFullYear(), m: n.getUTCMonth() + 1, d: n.getUTCDate(), min: n.getUTCHours() * 60 + n.getUTCMinutes() };
    }
  }
  var k = nowKST(), today = Date.UTC(k.y, k.m - 1, k.d), closed = closedOn(today), label;
  if (closed) label = '오늘 휴관';
  else if (k.min < 1020) label = '오늘 열림';
  else if (k.min < 1080) label = '오늘 입장 마감';
  else label = '오늘 관람 종료';
  var el;
  if ((el = d.querySelector('[data-date]'))) el.textContent = shortDate(today);
  if ((el = d.querySelector('[data-open]'))) el.textContent = label;
  if ((el = d.querySelector('[data-state]'))) el.classList.toggle('is-closed', closed);

  /* ---------- 전체 메뉴 ---------- */
  var burger = d.querySelector('.hd-burger'), sm = d.getElementById('sitemap'), smClose = d.querySelector('.sm-close');
  function openMenu(open) {
    sm.hidden = !open;
    burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    d.body.style.overflow = open ? 'hidden' : '';
    (open ? smClose : burger).focus();
  }
  if (burger && sm) {
    burger.addEventListener('click', function () { openMenu(true); });
    smClose.addEventListener('click', function () { openMenu(false); });
    d.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !sm.hidden) openMenu(false); });
  }

  /* ---------- 바닥글 ---------- */
  var famBtn = d.querySelector('.ft-family-btn'), fam = d.getElementById('family');
  if (famBtn && fam) {
    famBtn.addEventListener('click', function () {
      var open = fam.hidden;
      fam.hidden = !open;
      famBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }
  var topBtn = d.querySelector('.ft-top-btn');
  if (topBtn) topBtn.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: rm ? 'auto' : 'smooth' }); });
})();

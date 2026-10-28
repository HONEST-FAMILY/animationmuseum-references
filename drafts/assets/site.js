(function () {
  var burger = document.querySelector('.hd-burger');
  var sitemap = document.getElementById('sitemap');
  if (burger && sitemap) {
    var setOpen = function (open) {
      sitemap.hidden = !open;
      burger.setAttribute('aria-expanded', String(open));
      burger.setAttribute('aria-label', open ? '전체 메뉴 닫기' : '전체 메뉴 열기');
      document.documentElement.classList.toggle('is-sitemap', open);
    };
    burger.addEventListener('click', function () { setOpen(sitemap.hidden); });
    sitemap.addEventListener('click', function (e) { if (e.target.closest('a')) setOpen(false); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !sitemap.hidden) { setOpen(false); burger.focus(); }
    });
  }

  var header = document.querySelector('.hd');
  if (header) {
    var onScroll = function () { header.classList.toggle('is-scrolled', window.scrollY > 40); };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  var family = document.querySelector('.ft-family-btn');
  var familyList = document.getElementById('family');
  if (family && familyList) {
    family.addEventListener('click', function () {
      var open = familyList.hidden;
      familyList.hidden = !open;
      family.setAttribute('aria-expanded', String(open));
    });
  }

  var topBtn = document.querySelector('.ft-top-btn');
  if (topBtn) {
    topBtn.addEventListener('click', function () {
      var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
    });
  }
})();

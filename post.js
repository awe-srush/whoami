/* Post pages: the pinned contents rail. Marks the section being read and fills in
   the read time; the expand-on-hover effect is pure CSS. */
(() => {
  'use strict';

  const links = [...document.querySelectorAll('.toc-link[data-section]')];
  const head = document.querySelector('.toc-head');
  const prose = document.querySelector('.prose');

  const time = document.querySelector('.toc-time');
  if (time && prose) {
    const words = prose.textContent.trim().split(/\s+/).length;
    time.textContent = `${Math.max(1, Math.round(words / 230))} min read`;
  }

  const sections = links.map((a) => document.getElementById(a.dataset.section)).filter(Boolean);
  if (!sections.length) return;

  let queued = false;
  function update() {
    queued = false;
    let current = -1;
    sections.forEach((s, i) => { if (s.getBoundingClientRect().top <= innerHeight * 0.3) current = i; });
    links.forEach((a, i) => a.classList.toggle('active', i === current));
    if (head) head.classList.toggle('active', current === -1);
  }
  const onScroll = () => { if (!queued) { queued = true; requestAnimationFrame(update); } };
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll);
  update();
})();

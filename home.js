/* Home page timeline: entries glide in from their side as they scroll into view,
   and a clay line fills the rail as you read down it. */
(() => {
  'use strict';

  const list = document.querySelector('.timeline');
  if (!list) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const bar = document.createElement('div');
  bar.className = 'tl-progress';
  bar.setAttribute('aria-hidden', 'true');
  list.prepend(bar);
  if (reduce || !('IntersectionObserver' in window)) return;

  list.classList.add('tl-js');
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      e.target.classList.add('is-in');
      io.unobserve(e.target);
    }
  }, { rootMargin: '0px 0px -12% 0px' });
  list.querySelectorAll('.tl-item').forEach((li) => io.observe(li));

  let queued = false;
  function fill() {
    queued = false;
    const r = list.getBoundingClientRect();
    const p = (innerHeight * 0.7 - r.top) / r.height;
    list.style.setProperty('--p', Math.min(1, Math.max(0, p)).toFixed(3));
  }
  const onScroll = () => { if (!queued) { queued = true; requestAnimationFrame(fill); } };
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll);
  fill();
})();

/* Post pages: a few autumn leaves drift down the notebook page.
   One fixed canvas, ≤30fps, paused when the tab is hidden, still under reduced motion.
   Leaves keep mostly to the margins and fade to a whisper behind the text column. */
(() => {
  'use strict';

  const canvas = document.getElementById('leaves');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const reduceMQ = matchMedia('(prefers-reduced-motion: reduce)');
  const TAU = Math.PI * 2;
  const FRAME_MS = 1000 / 30;

  // autumn inks that sit with the clay palette
  const COLORS = ['202, 123, 93', '165, 87, 58', '217, 164, 65', '181, 101, 29', '120, 125, 92'];

  // a five-lobed maple, unit size, stem at the bottom
  const MAPLE = [[0, -1], [0.15, -0.55], [0.45, -0.75], [0.38, -0.35], [0.85, -0.42], [0.6, -0.05], [0.75, 0.1],
    [0.3, 0.15], [0.12, 0.45], [0, 0.3], [-0.12, 0.45], [-0.3, 0.15], [-0.75, 0.1], [-0.6, -0.05], [-0.85, -0.42],
    [-0.38, -0.35], [-0.45, -0.75], [-0.15, -0.55]];

  let W = 0, H = 0, dpr = 1, col = null, leaves = [];
  const columnEl = document.querySelector('[data-column]');

  const rand = (a, b) => a + Math.random() * (b - a);

  function measure() {
    if (!columnEl) { col = null; return; }
    const r = columnEl.getBoundingClientRect();
    col = { x0: r.left, x1: r.right };
  }

  // spawn mostly in the margins so the reading column stays quiet
  function spawnX() {
    if (!col || Math.random() < 0.15) return rand(0, W);
    const left = col.x0, right = W - col.x1;
    return Math.random() * (left + right) < left ? rand(0, left) : rand(col.x1, W);
  }

  function makeLeaf(initial) {
    return {
      x: spawnX(),
      y: initial ? rand(-H * 0.1, H) : rand(-60, -20),
      size: rand(9, 17),
      fall: rand(14, 30),            // px per second
      sway: rand(18, 46),            // px
      swayT: rand(5, 9),             // seconds per sway
      spin: rand(-0.6, 0.6),         // rad per second
      tumbleT: rand(3, 7),           // seconds per flip
      ph: rand(0, TAU),
      rot: rand(0, TAU),
      maple: Math.random() < 0.55,
      color: COLORS[(Math.random() * COLORS.length) | 0],
      alpha: rand(0.38, 0.6),
    };
  }

  function resize() {
    W = canvas.clientWidth;
    H = canvas.clientHeight;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    measure();
    const n = W < 700 ? 5 : W < 1100 ? 9 : 13;
    leaves = Array.from({ length: n }, () => makeLeaf(true));
  }

  function shape(l) {
    ctx.beginPath();
    if (l.maple) {
      MAPLE.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)));
      ctx.closePath();
    } else {
      ctx.moveTo(0, -1);
      ctx.quadraticCurveTo(0.62, -0.2, 0, 0.62);
      ctx.quadraticCurveTo(-0.62, -0.2, 0, -1);
    }
  }

  function draw(l, t) {
    const x = l.x + l.sway * Math.sin((TAU * t) / l.swayT + l.ph);
    let a = l.alpha;
    a *= Math.min(1, (l.y + 40) / 120) * Math.min(1, (H + 20 - l.y) / 140); // fade in at the top, out at the bottom
    if (col && x > col.x0 - 10 && x < col.x1 + 10) a *= 0.22;                  // whisper behind the text
    if (a <= 0.01) return;

    ctx.save();
    ctx.translate(x, l.y);
    ctx.rotate(l.rot + l.spin * t);
    ctx.scale(l.size * (0.25 + 0.75 * Math.abs(Math.cos((TAU * t) / l.tumbleT + l.ph))), l.size); // tumbling
    shape(l);
    ctx.fillStyle = `rgba(${l.color}, ${a.toFixed(3)})`;
    ctx.fill();
    // midrib and stem
    ctx.lineWidth = 1 / l.size;
    ctx.strokeStyle = `rgba(74, 52, 38, ${(a * 0.7).toFixed(3)})`;
    ctx.beginPath();
    ctx.moveTo(0, -0.7);
    ctx.lineTo(0, l.maple ? 0.75 : 0.95);
    ctx.stroke();
    ctx.restore();
  }

  let last = 0, prev = 0, raf = 0;
  const start = performance.now();

  function render(now, step) {
    const t = (now - start) / 1000;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    for (let i = 0; i < leaves.length; i++) {
      const l = leaves[i];
      l.y += l.fall * step;
      if (l.y > H + 40) leaves[i] = makeLeaf(false);
      draw(leaves[i], t);
    }
  }

  function tick(now) {
    raf = requestAnimationFrame(tick);
    if (now - last < FRAME_MS - 1) return;
    const step = Math.min(0.1, (now - (prev || now)) / 1000);
    last = prev = now;
    render(now, step);
  }
  function play() {
    if (raf || reduceMQ.matches || document.hidden) return;
    prev = 0;
    raf = requestAnimationFrame(tick);
  }
  function pause() { cancelAnimationFrame(raf); raf = 0; }
  function still() { render(start + 4000, 0); }

  resize();
  if (reduceMQ.matches) still(); else play();

  addEventListener('resize', () => { resize(); if (reduceMQ.matches) still(); });
  document.addEventListener('visibilitychange', () => (document.hidden ? pause() : play()));
  reduceMQ.addEventListener('change', () => { if (reduceMQ.matches) { pause(); still(); } else play(); });
})();

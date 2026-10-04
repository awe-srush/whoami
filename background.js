/* Background: one fixed canvas, drawn at ≤30fps, paused when hidden.
   Layers: topographic contours, gears, clay motes, marginal notes, a Bayesian update.
   Also drives the orbit dots around the hero girl so there is only one animation loop. */
(() => {
  'use strict';

  const canvas = document.getElementById('bg');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const reduceMQ = matchMedia('(prefers-reduced-motion: reduce)');
  const TAU = Math.PI * 2;
  const FRAME_MS = 1000 / 30;

  /* ---------- seeded helpers ---------- */

  function rng(seed) {
    return () => {
      seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // 2D simplex noise
  const perm = new Uint8Array(512);
  {
    const r = rng(20260925), p = new Uint8Array(256);
    for (let i = 0; i < 256; i++) p[i] = i;
    for (let i = 255; i > 0; i--) { const j = (r() * (i + 1)) | 0; [p[i], p[j]] = [p[j], p[i]]; }
    for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
  }
  const GX = [1, -1, 1, -1, 1, -1, 0, 0], GY = [1, 1, -1, -1, 0, 0, 1, -1];
  const F2 = 0.5 * (Math.sqrt(3) - 1), G2 = (3 - Math.sqrt(3)) / 6;
  function noise(x, y) {
    const s = (x + y) * F2, i = Math.floor(x + s), j = Math.floor(y + s), t = (i + j) * G2;
    const x0 = x - (i - t), y0 = y - (j - t);
    const i1 = x0 > y0 ? 1 : 0, j1 = 1 - i1;
    const x1 = x0 - i1 + G2, y1 = y0 - j1 + G2, x2 = x0 - 1 + 2 * G2, y2 = y0 - 1 + 2 * G2;
    const ii = i & 255, jj = j & 255;
    let n = 0, q, g;
    q = 0.5 - x0 * x0 - y0 * y0;
    if (q > 0) { g = perm[ii + perm[jj]] & 7; q *= q; n += q * q * (GX[g] * x0 + GY[g] * y0); }
    q = 0.5 - x1 * x1 - y1 * y1;
    if (q > 0) { g = perm[ii + i1 + perm[jj + j1]] & 7; q *= q; n += q * q * (GX[g] * x1 + GY[g] * y1); }
    q = 0.5 - x2 * x2 - y2 * y2;
    if (q > 0) { g = perm[ii + 1 + perm[jj + 1]] & 7; q *= q; n += q * q * (GX[g] * x2 + GY[g] * y2); }
    return 70 * n;
  }

  const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

  /* ---------- state ---------- */

  let W = 0, H = 0, dpr = 1, compact = false, roomy = false, wide = false;
  let cell = 20, cols = 0, rows = 0, field = new Float32Array(0), levels = [];
  let ink = '61, 59, 54', lineA = 0.12, clay = '202, 123, 93';
  let motes = [], notes = [];
  let colBox = null, heroBox = null, bayesBox = null;

  const columnEl = document.querySelector('[data-column]');
  const heroEl = document.querySelector('.hero-inner');
  const bayesEl = document.querySelector('.bayes-slot');
  const orbitDots = [...document.querySelectorAll('[data-orbit]')].map((el) => {
    const [cx, cy, rx, ry, rot, period, phase] = el.dataset.orbit.split(',').map(Number);
    return { el, cx, cy, rx, ry, rot: rot * Math.PI / 180, period, phase };
  });

  function readColors() {
    const cs = getComputedStyle(document.documentElement);
    ink = cs.getPropertyValue('--line-rgb').trim() || ink;
    lineA = parseFloat(cs.getPropertyValue('--line-alpha')) || lineA;
    clay = cs.getPropertyValue('--clay-rgb').trim() || clay;
  }

  function box(el) {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.left, y: r.top + scrollY, w: r.width, h: r.height };
  }
  // wider bands (e.g. .breakout on the home page) widen the calm zone, so margin notes stay clear of them
  const wideEls = [...document.querySelectorAll('.breakout')];
  function measure() {
    colBox = box(columnEl);
    for (const el of wideEls) {
      const b = box(el);
      if (colBox && b && b.w > colBox.w) colBox = { ...colBox, x: b.x, w: b.w };
    }
    heroBox = box(heroEl);
    bayesBox = box(bayesEl);
    layoutNotes();
  }

  function resize() {
    W = canvas.clientWidth;
    H = canvas.clientHeight;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    compact = W < 700;
    roomy = W >= 960;
    wide = W >= 1180;

    cell = compact ? 26 : 20;
    cols = Math.ceil(W / cell) + 1;
    rows = Math.ceil(H / cell) + 1;
    field = new Float32Array(cols * rows);
    const n = compact ? 6 : 10;
    levels = Array.from({ length: n }, (_, m) => -0.85 + 1.7 * (m + 0.5) / n);

    makeMotes();
    measure();
  }

  /* ---------- 1. topographic contours ---------- */

  const CONTOUR_LOOP = 20;
  // edge pairs for each marching-squares case (tl=8, tr=4, br=2, bl=1); edges: 0 top, 1 right, 2 bottom, 3 left
  const SEGS = [[], [3, 2], [2, 1], [3, 1], [0, 1], [3, 0, 2, 1], [0, 2], [3, 0], [3, 0], [0, 2], [3, 2, 0, 1], [0, 1], [3, 1], [2, 1], [3, 2], []];
  let ex = 0, ey = 0;
  function edgePoint(e, x, y, L, v0, v1, v2, v3) {
    switch (e) {
      case 0: ex = x + cell * (L - v0) / (v1 - v0); ey = y; break;
      case 1: ex = x + cell; ey = y + cell * (L - v1) / (v2 - v1); break;
      case 2: ex = x + cell * (L - v3) / (v2 - v3); ey = y + cell; break;
      default: ex = x; ey = y + cell * (L - v0) / (v3 - v0);
    }
  }

  function drawContours(t, scroll) {
    const th = (t / CONTOUR_LOOP) * TAU, c = Math.cos(th), s = Math.sin(th);
    const k = compact ? 0.0026 : 0.0019;
    const dx = c * 0.12, dy = s * 0.12;
    const oy = scroll * 0.3; // parallax: the map moves slower than the page

    for (let j = 0; j < rows; j++) {
      const y = (j * cell + oy) * k;
      for (let i = 0; i < cols; i++) {
        const x = i * cell * k;
        const base = noise(x + dx, y + dy) + 0.42 * noise(x * 2.3 + 11.3, y * 2.3 - 4.7);
        const drift = noise(x * 0.8 + 37.1, y * 0.8 - 19.4) * c + noise(x * 0.8 - 23.9, y * 0.8 + 8.2) * s;
        field[j * cols + i] = base + 0.38 * drift;
      }
    }

    const index = levels.length >> 1;
    for (let m = 0; m < levels.length; m++) {
      const L = levels[m];
      ctx.beginPath();
      for (let j = 0; j < rows - 1; j++) {
        const y = j * cell;
        for (let i = 0; i < cols - 1; i++) {
          const id = j * cols + i;
          const v0 = field[id], v1 = field[id + 1], v2 = field[id + cols + 1], v3 = field[id + cols];
          const code = (v0 > L ? 8 : 0) | (v1 > L ? 4 : 0) | (v2 > L ? 2 : 0) | (v3 > L ? 1 : 0);
          if (code === 0 || code === 15) continue;
          const seg = SEGS[code], x = i * cell;
          for (let q = 0; q < seg.length; q += 2) {
            edgePoint(seg[q], x, y, L, v0, v1, v2, v3); ctx.moveTo(ex, ey);
            edgePoint(seg[q + 1], x, y, L, v0, v1, v2, v3); ctx.lineTo(ex, ey);
          }
        }
      }
      const isIndex = m === index;
      ctx.lineWidth = isIndex ? 1.35 : 1;
      ctx.strokeStyle = `rgba(${ink}, ${isIndex ? lineA * 1.45 : lineA})`;
      ctx.stroke();
    }

    // calm the text column and the hero: erase most of the line work there
    ctx.globalCompositeOperation = 'destination-out';
    if (colBox) {
      const pad = compact ? 0 : 150, x0 = colBox.x - pad, w = colBox.w + pad * 2;
      const strength = compact ? 0.5 : 0.72, e = pad / w;
      const g = ctx.createLinearGradient(x0, 0, x0 + w, 0);
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(Math.max(e, 0.001), `rgba(0,0,0,${strength})`);
      g.addColorStop(Math.min(1 - e, 0.999), `rgba(0,0,0,${strength})`);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x0, 0, w, H);
    }
    if (heroBox) {
      const cx = heroBox.x + heroBox.w / 2, cy = heroBox.y - scroll + heroBox.h * 0.45;
      const r = Math.max(heroBox.w, heroBox.h) * 0.72;
      if (cy + r > 0 && cy - r < H) {
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
        g.addColorStop(0, 'rgba(0,0,0,0.9)');
        g.addColorStop(0.55, 'rgba(0,0,0,0.6)');
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
      }
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  /* ---------- 2. Bayesian update ---------- */

  const EVIDENCE = [1.35, 0.55, 1.15, 0.75, 1.6, 0.95];
  const PRIOR_MU = -0.6, PRIOR_SD = 1.5, LIK_SD = 1.1, BAYES_LOOP = 16;

  function drawBayes(t, scroll) {
    if (!bayesBox) return;
    const top = bayesBox.y - scroll, { x: bx, w: bw, h: bh } = bayesBox;
    if (top > H || top + bh < 0) return;

    const u = t % BAYES_LOOP;
    const kf = u < 2 ? 0
      : u < 10 ? ((u - 2) / 8) * EVIDENCE.length
      : u < 13 ? EVIDENCE.length
      : EVIDENCE.length * (1 - smooth(0, 1, (u - 13) / 3));

    let prec = 1 / (PRIOR_SD * PRIOR_SD), acc = PRIOR_MU * prec;
    for (let j = 0; j < EVIDENCE.length; j++) {
      const wgt = Math.min(1, Math.max(0, kf - j));
      if (!wgt) break;
      prec += wgt / (LIK_SD * LIK_SD);
      acc += (wgt * EVIDENCE[j]) / (LIK_SD * LIK_SD);
    }
    const mu = acc / prec, sd = Math.sqrt(1 / prec);

    const axisY = top + bh * 0.74;
    const X = (v) => bx + ((v + 4) / 8) * bw;
    const minSd = Math.sqrt(1 / (1 / (PRIOR_SD * PRIOR_SD) + EVIDENCE.length / (LIK_SD * LIK_SD)));
    const yScale = (bh * 0.66) * minSd * Math.sqrt(TAU);
    const pdf = (v, m, s) => Math.exp(-0.5 * ((v - m) / s) ** 2) / (s * Math.sqrt(TAU));

    const curve = (m, s) => {
      ctx.beginPath();
      for (let p = 0; p <= 80; p++) {
        const v = -4 + (8 * p) / 80, x = X(v), y = axisY - pdf(v, m, s) * yScale;
        p ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
    };

    ctx.lineWidth = 1;
    // axis
    ctx.strokeStyle = `rgba(${ink}, ${lineA * 1.6})`;
    ctx.beginPath(); ctx.moveTo(bx, axisY); ctx.lineTo(bx + bw, axisY); ctx.stroke();
    // prior (dashed)
    ctx.setLineDash([3, 4]);
    ctx.strokeStyle = `rgba(${ink}, ${lineA * 2})`;
    curve(PRIOR_MU, PRIOR_SD); ctx.stroke();
    ctx.setLineDash([]);
    // posterior
    curve(mu, sd);
    ctx.strokeStyle = `rgba(${ink}, ${lineA * 3})`;
    ctx.stroke();
    ctx.lineTo(X(4), axisY); ctx.lineTo(X(-4), axisY); ctx.closePath();
    ctx.fillStyle = `rgba(${clay}, 0.07)`;
    ctx.fill();
    // evidence
    for (let j = 0; j < EVIDENCE.length; j++) {
      const a = Math.min(1, Math.max(0, kf - j));
      if (!a) continue;
      ctx.fillStyle = `rgba(${clay}, ${0.75 * a})`;
      ctx.beginPath(); ctx.arc(X(EVIDENCE[j]), axisY + 12 + (j % 2) * 5, 2.4, 0, TAU); ctx.fill();
    }
  }

  /* ---------- 3. gears ---------- */

  function gear(cx, cy, n, mod, angle) {
    const rp = (mod * n) / 2, ra = rp + mod * 0.8, rd = rp - mod;
    const step = TAU / n;
    ctx.beginPath();
    for (let k = 0; k < n; k++) {
      const a = angle + k * step;
      const pts = [[rd, a - step * 0.5], [rd, a - step * 0.27], [ra, a - step * 0.14], [ra, a + step * 0.14], [rd, a + step * 0.27]];
      for (let p = 0; p < pts.length; p++) {
        const [r, aa] = pts[p], x = cx + r * Math.cos(aa), y = cy + r * Math.sin(aa);
        k === 0 && p === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
    }
    ctx.closePath();
    ctx.moveTo(cx + rd * 0.34, cy);
    ctx.arc(cx, cy, rd * 0.34, 0, TAU);
    ctx.stroke();
    ctx.beginPath();
    ctx.setLineDash([2, 4]);
    ctx.arc(cx, cy, rd * 0.7, 0, TAU);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  function drawGears(t) {
    if (!roomy || !colBox) return;
    const margin = W - (colBox.x + colBox.w);
    const mod = 4.6, n1 = 14, n2 = 9, n3 = 7;
    const cx1 = W - Math.max(margin * 0.42, 80), cy1 = H * 0.64;
    const th1 = (t / 60) * TAU;
    const phi2 = 2.35, d12 = (mod * (n1 + n2)) / 2;
    const cx2 = cx1 + d12 * Math.cos(phi2), cy2 = cy1 + d12 * Math.sin(phi2);
    const th2 = -(n1 / n2) * (th1 - phi2) + phi2 + Math.PI - Math.PI / n2;
    const phi3 = 1.25, d23 = (mod * (n2 + n3)) / 2;
    const cx3 = cx2 + d23 * Math.cos(phi3), cy3 = cy2 + d23 * Math.sin(phi3);
    const th3 = -(n2 / n3) * (th2 - phi3) + phi3 + Math.PI - Math.PI / n3;

    ctx.lineWidth = 1;
    ctx.strokeStyle = `rgba(${ink}, ${lineA * 1.35})`;
    gear(cx1, cy1, n1, mod, th1);
    gear(cx2, cy2, n2, mod, th2);
    gear(cx3, cy3, n3, mod, th3);
  }

  /* ---------- 4. motes ---------- */

  function makeMotes() {
    const r = rng(7), n = compact ? 22 : 40, periods = [10, 12, 15, 20];
    motes = Array.from({ length: n }, () => ({
      x: r(), y: r(),
      ax: 18 + r() * 46, ay: 12 + r() * 36,
      px: periods[(r() * 4) | 0], py: periods[(r() * 4) | 0], tw: periods[(r() * 4) | 0],
      ph: r() * TAU, size: 0.8 + r() * 1.2, a: 0.28 + r() * 0.34,
    }));
  }

  function drawMotes(t) {
    for (const m of motes) {
      const x = m.x * W + m.ax * Math.sin((TAU * t) / m.px + m.ph);
      const y = m.y * H + m.ay * Math.sin((TAU * t) / m.py + m.ph * 1.3);
      let a = m.a * (0.5 + 0.5 * Math.sin((TAU * t) / m.tw + m.ph * 2));
      if (colBox && x > colBox.x && x < colBox.x + colBox.w) a *= 0.45;
      ctx.fillStyle = `rgba(${clay}, ${a.toFixed(3)})`;
      ctx.beginPath(); ctx.arc(x, y, m.size, 0, TAU); ctx.fill();
    }
  }

  /* ---------- 5. marginal notes ---------- */

  // even indexes sit in the left margin, odd in the right (right-side heights avoid the gears)
  const NOTE_TEXT = [
    'no crash is not no bug',
    'MUST ≠ SHOULD',
    'notice your confusion',
    'read the RFC, then read it again',
    'measure before you guess',
    'p99 tells the truth',
    'memory never lies',
    'the map is not the territory',
    'question the obvious path',
  ];
  const NOTE_Y = [0.16, 0.2, 0.36, 0.4, 0.56, 0.84, 0.74, 0.94, 0.9];
  const NOTE_ROT = [-3, 2.5, -2, 3, -2.5, 2, 3, -2, 2.5];
  const NOTE_FONT = 'italic 300 18px Newsreader, Georgia, serif';
  const NOTE_LOOP = 27, NOTE_STAGGER = 3, NOTE_LIFE = 7;

  function layoutNotes() {
    notes = [];
    if (!wide || !colBox) return;
    const margin = colBox.x;
    const maxW = Math.min(240, margin - 56);
    if (maxW < 110) return;
    ctx.font = NOTE_FONT;
    notes = NOTE_TEXT.map((text, i) => {
      const words = text.split(' '), lines = [];
      let line = '';
      for (const w of words) {
        const tryLine = line ? `${line} ${w}` : w;
        if (ctx.measureText(tryLine).width > maxW && line) { lines.push(line); line = w; } else line = tryLine;
      }
      lines.push(line);
      const left = i % 2 === 0;
      return {
        lines,
        x: left ? margin / 2 : W - margin / 2,
        y: H * NOTE_Y[i],
        rot: (NOTE_ROT[i] * Math.PI) / 180,
        offset: i * NOTE_STAGGER,
      };
    });
  }

  function drawNotes(t, staticFrame) {
    if (!notes.length) return;
    ctx.font = NOTE_FONT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const n of notes) {
      let env;
      if (staticFrame) env = n.offset % 9 === 0 ? 1 : 0; // show a quiet few
      else {
        const local = (((t - n.offset) % NOTE_LOOP) + NOTE_LOOP) % NOTE_LOOP;
        env = local > NOTE_LIFE ? 0 : smooth(0, 1.8, local) * (1 - smooth(NOTE_LIFE - 1.8, NOTE_LIFE, local));
      }
      if (env <= 0.01) continue;
      ctx.save();
      ctx.translate(n.x, n.y);
      ctx.rotate(n.rot);
      ctx.fillStyle = `rgba(${ink}, ${(0.4 * env).toFixed(3)})`;
      n.lines.forEach((line, li) => ctx.fillText(line, 0, (li - (n.lines.length - 1) / 2) * 22));
      ctx.restore();
    }
  }

  /* ---------- hero orbit dots ---------- */

  function moveOrbitDots(t) {
    for (const o of orbitDots) {
      const a = (TAU * t) / o.period + o.phase;
      const px = o.rx * Math.cos(a), py = o.ry * Math.sin(a);
      const cs = Math.cos(o.rot), sn = Math.sin(o.rot);
      o.el.setAttribute('cx', (o.cx + px * cs - py * sn).toFixed(2));
      o.el.setAttribute('cy', (o.cy + px * sn + py * cs).toFixed(2));
    }
  }

  /* ---------- loop ---------- */

  function render(t, staticFrame = false) {
    const scroll = staticFrame && reduceMQ.matches ? 0 : window.scrollY;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    drawContours(t, scroll);
    drawGears(t);
    drawMotes(t);
    drawNotes(t, staticFrame);
    drawBayes(t, scroll);
    moveOrbitDots(t);
  }

  const STATIC_T = 7.2; // a composed moment: posterior narrowed, a note visible
  let raf = 0, last = 0, start = performance.now();

  function tick(now) {
    raf = requestAnimationFrame(tick);
    if (now - last < FRAME_MS - 1) return;
    last = now;
    render((now - start) / 1000);
  }
  function play() {
    if (raf || reduceMQ.matches || document.hidden) return;
    raf = requestAnimationFrame(tick);
  }
  function pause() { cancelAnimationFrame(raf); raf = 0; }
  function refresh() {
    if (reduceMQ.matches) render(STATIC_T, true);
    else if (!raf) render((performance.now() - start) / 1000);
  }

  let resizeQueued = false;
  function queueResize() {
    if (resizeQueued) return;
    resizeQueued = true;
    requestAnimationFrame(() => { resizeQueued = false; resize(); refresh(); });
  }

  readColors();
  resize();
  refresh();
  play();

  window.addEventListener('resize', queueResize);
  new ResizeObserver(() => { measure(); refresh(); }).observe(document.body);
  if (document.fonts) document.fonts.ready.then(() => { measure(); refresh(); });
  document.addEventListener('visibilitychange', () => (document.hidden ? pause() : play()));
  new MutationObserver(() => { readColors(); refresh(); }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  reduceMQ.addEventListener('change', () => { if (reduceMQ.matches) { pause(); refresh(); } else play(); });
  // with reduced motion, redraw on scroll only so the Bayes sketch stays beside its section
  window.addEventListener('scroll', () => {
    if (!reduceMQ.matches) return;
    requestAnimationFrame(() => render(STATIC_T, true));
  }, { passive: true });
})();

/* Blog grids: posts are listed as static cards in blog.html / technical-posts.html
   (newest first, "Blog #N" counted from the oldest post). A card can carry its own
   cover <img>; an empty .card-cover gets a drawn cover (watercolour washes and sepia
   ink on cream paper) seeded by its data-seed (the post slug), so it never changes. */
(() => {
  'use strict';

  const slots = document.querySelectorAll('.card-cover[data-seed]');
  if (!slots.length) return;

  /* ---------- drawn covers ---------- */

  function hash(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function rng(seed) {
    return () => {
      seed = (seed + 0x6D2B79F5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const f = (n) => n.toFixed(1);

  function drawnCover(key, n) {
    const seed = hash(key), r = rng(seed);
    const W = 400, H = 250, id = `c${seed.toString(36)}`;
    const pick = (arr) => arr[Math.floor(r() * arr.length)];
    const between = (a, b) => a + r() * (b - a);

    // watercolour palettes, after old atlases and sunset washes
    const PALETTES = [
      ['#2F5873', '#5B97A2', '#D9B98A'],   // sea
      ['#E3A33B', '#D9622B', '#B8402C'],   // dusk
      ['#D9622B', '#3F7E8C', '#E3B552'],   // map
      ['#23384A', '#C8452F', '#E6B35A'],   // ember
      ['#6E8F7A', '#C99A4B', '#8A4B3A'],   // moss
    ];
    const pal = pick(PALETTES);
    const INK = '#4A3426';

    // washes: soft blobs, distorted so their edges bloom like wet paint
    let washes = '';
    const blobs = 4 + Math.floor(r() * 3);
    for (let i = 0; i < blobs; i++) {
      const c = pal[i % pal.length];
      washes += `<ellipse cx="${f(between(-20, W + 20))}" cy="${f(between(-10, H + 10))}" rx="${f(between(60, 170))}" ry="${f(between(45, 120))}" fill="${c}" opacity="${f(between(0.45, 0.85))}" transform="rotate(${f(between(-40, 40))} ${W / 2} ${H / 2})"/>`;
    }

    // one ink drawing per cover
    const cx = between(W * 0.3, W * 0.72), cy = between(H * 0.3, H * 0.7);
    let art = '';
    const motif = Math.floor(r() * 5);
    if (motif === 0) { // globe
      const R = between(80, 120);
      art += `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(R)}"/>`;
      for (let k = 1; k < 6; k++) art += `<ellipse cx="${f(cx)}" cy="${f(cy)}" rx="${f(R * Math.cos((k * Math.PI) / 12))}" ry="${f(R)}"/>`;
      for (let k = -3; k <= 3; k++) { const y = cy + (k * R) / 4, hw = Math.sqrt(Math.max(0, R * R - (y - cy) ** 2)); art += `<path d="M${f(cx - hw)} ${f(y)}H${f(cx + hw)}"/>`; }
    } else if (motif === 1) { // orbits
      for (let k = 1; k <= 4; k++) art += `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(k * between(20, 30))}"${k % 2 ? '' : ' stroke-dasharray="3 4"'}/>`;
      art += `<ellipse cx="${f(cx)}" cy="${f(cy)}" rx="150" ry="42" transform="rotate(${f(between(-25, 25))} ${f(cx)} ${f(cy)})"/>`;
      for (let k = 0; k < 3; k++) { const a = r() * Math.PI * 2, d = between(30, 110); art += `<circle cx="${f(cx + Math.cos(a) * d)}" cy="${f(cy + Math.sin(a) * d * 0.6)}" r="${f(between(2, 5))}" fill="${INK}"/>`; }
    } else if (motif === 2) { // contours
      for (let k = 1; k <= 6; k++) {
        const base = k * 16, wob = between(4, 10), ph = r() * 6;
        let d = '';
        for (let s = 0; s <= 48; s++) { const a = (s / 48) * Math.PI * 2, rad = base + wob * Math.sin(a * 3 + ph + k * 0.4); d += `${s ? 'L' : 'M'}${f(cx + Math.cos(a) * rad * 1.4)} ${f(cy + Math.sin(a) * rad)}`; }
        art += `<path d="${d}Z"/>`;
      }
    } else if (motif === 3) { // geometry: a construction left mid-thought
      const R = between(70, 100), a0 = r() * Math.PI;
      const tri = [0, 1, 2].map((k) => [cx + Math.cos(a0 + (k * 2 * Math.PI) / 3) * R, cy + Math.sin(a0 + (k * 2 * Math.PI) / 3) * R]);
      art += `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(R)}"/><path d="M${tri.map((p) => `${f(p[0])} ${f(p[1])}`).join('L')}Z"/>`;
      art += `<path d="M${f(cx - 190)} ${f(cy + 40)}L${f(cx + 190)} ${f(cy - 60)}" stroke-dasharray="4 5"/><circle cx="${f(cx)}" cy="${f(cy)}" r="${f(R * 0.5)}" stroke-dasharray="2 4"/>`;
      tri.forEach((p, k) => { art += `<text x="${f(p[0] + 6)}" y="${f(p[1] - 6)}" fill="${INK}" stroke="none" font-family="Newsreader, Georgia, serif" font-style="italic" font-size="13">${'ABC'[k]}</text>`; });
    } else { // spiral
      let d = '';
      for (let s = 0; s <= 220; s++) { const a = s * 0.09, rad = 3 * Math.exp(0.085 * a * 1.6); if (rad > 170) break; d += `${s ? 'L' : 'M'}${f(cx + Math.cos(a) * rad)} ${f(cy + Math.sin(a) * rad * 0.9)}`; }
      art += `<path d="${d}"/>`;
    }
    // faint survey grid over everything
    let grid = '';
    const step = pick([50, 64, 80]);
    for (let x = step * r(); x < W; x += step) grid += `<path d="M${f(x)} 0V${H}"/>`;
    for (let y = step * r(); y < H; y += step) grid += `<path d="M0 ${f(y)}H${W}"/>`;

    // splatter
    let dots = '';
    const sx = between(0, W), sy = between(0, H);
    for (let i = 0; i < 18; i++) dots += `<circle cx="${f(sx + between(-70, 70))}" cy="${f(sy + between(-50, 50))}" r="${f(between(0.5, 2.6))}" fill="${r() < 0.6 ? INK : pick(pal)}" opacity="${f(between(0.35, 0.8))}"/>`;

    return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
      <defs>
        <filter id="${id}w" x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence type="fractalNoise" baseFrequency="0.018" numOctaves="3" seed="${seed % 997}" result="n"/>
          <feDisplacementMap in="SourceGraphic" in2="n" scale="55" xChannelSelector="R" yChannelSelector="G"/>
          <feGaussianBlur stdDeviation="1.6"/>
        </filter>
        <filter id="${id}p"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="${seed % 89}"/><feColorMatrix type="saturate" values="0"/></filter>
        <radialGradient id="${id}v" cx=".5" cy=".5" r=".75"><stop offset=".55" stop-color="#F3EBDD" stop-opacity="0"/><stop offset="1" stop-color="#F3EBDD" stop-opacity=".85"/></radialGradient>
      </defs>
      <rect width="${W}" height="${H}" fill="#F3EBDD"/>
      <g filter="url(#${id}w)" style="mix-blend-mode:multiply">${washes}</g>
      <g fill="none" stroke="${INK}" stroke-width=".5" opacity=".22">${grid}</g>
      <g fill="none" stroke="${INK}" stroke-width="1.1" stroke-linecap="round" opacity=".78">${art}</g>
      ${dots}
      <rect width="${W}" height="${H}" filter="url(#${id}p)" opacity=".13" style="mix-blend-mode:multiply"/>
      <rect width="${W}" height="${H}" fill="url(#${id}v)"/>
      <text x="${W - 14}" y="${H - 12}" text-anchor="end" fill="${INK}" opacity=".6" font-family="JetBrains Mono, monospace" font-size="9">fig. ${n}</text>
    </svg>`;
  }

  /* ---------- fill empty covers ---------- */

  slots.forEach((slot) => {
    if (slot.querySelector('img, svg')) return;
    slot.innerHTML = drawnCover(slot.dataset.seed, slot.dataset.n || '');
  });
})();

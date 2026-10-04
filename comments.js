/* Post comments via giscus: stored as GitHub Discussions in awe-srush/whoami,
   commenters sign in with GitHub. Follows the site's light/dark toggle. */
(() => {
  'use strict';

  const slot = document.querySelector('.giscus');
  if (!slot) return;

  const CONFIG = {
    repo: 'awe-srush/whoami',
    repoId: 'R_kgDORLH4Gg',
    category: 'Announcements',
    categoryId: 'DIC_kwDORLH4Gs4DHCwk',
  };

  if (!CONFIG.categoryId) {
    slot.innerHTML = '<p class="no-comments">Comments open soon.</p>';
    return;
  }

  // the custom paper/ink themes are served from the live site; locally fall back to giscus' own
  const live = location.hostname.endsWith('github.io');
  const themeUrl = (t) => (live ? `https://awe-srush.github.io/whoami/giscus-${t}.css` : t === 'dark' ? 'dark_dimmed' : 'light');
  const current = () => (document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light');

  const s = document.createElement('script');
  s.src = 'https://giscus.app/client.js';
  Object.entries({
    'data-repo': CONFIG.repo,
    'data-repo-id': CONFIG.repoId,
    'data-category': CONFIG.category,
    'data-category-id': CONFIG.categoryId,
    'data-mapping': 'pathname',
    'data-strict': '1',
    'data-reactions-enabled': '1',
    'data-emit-metadata': '0',
    'data-input-position': 'top',
    'data-theme': themeUrl(current()),
    'data-lang': 'en',
    'data-loading': 'lazy',
  }).forEach(([k, v]) => s.setAttribute(k, v));
  s.crossOrigin = 'anonymous';
  s.async = true;
  slot.appendChild(s);

  new MutationObserver(() => {
    const frame = document.querySelector('iframe.giscus-frame');
    if (frame) frame.contentWindow.postMessage({ giscus: { setConfig: { theme: themeUrl(current()) } } }, 'https://giscus.app');
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
})();

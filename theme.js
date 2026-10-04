/* Light/dark theme. Loaded in <head> so the page never flashes the wrong colours.
   With no saved choice the site follows the system setting. */
(() => {
  'use strict';
  const KEY = 'site:theme';
  const root = document.documentElement;
  const system = matchMedia('(prefers-color-scheme: dark)');

  const saved = () => { try { return localStorage.getItem(KEY); } catch { return null; } };
  const apply = (theme) => {
    root.dataset.theme = theme;
    document.querySelectorAll('.theme-toggle').forEach((b) => {
      b.setAttribute('aria-pressed', String(theme === 'dark'));
      b.setAttribute('aria-label', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
    });
  };

  apply(saved() || (system.matches ? 'dark' : 'light'));
  system.addEventListener('change', (e) => { if (!saved()) apply(e.matches ? 'dark' : 'light'); });

  document.addEventListener('DOMContentLoaded', () => {
    apply(root.dataset.theme);
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.theme-toggle')) return;
      const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
      try { localStorage.setItem(KEY, next); } catch { /* private mode: still switch */ }
      apply(next);
    });
  });
})();

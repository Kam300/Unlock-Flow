(() => {
  'use strict';
  // Read the current DOM, including navigation performed without a page reload.
  window.__ufReadPlaygroundState = () => {
    if (location.origin !== 'https://playground.google') return null;
    if (location.pathname === '/region-unavailable') return 'playground-entry-failed';
    const visible = element => element.getClientRects().length > 0 &&
      getComputedStyle(element).visibility !== 'hidden' && !element.closest('[hidden], [aria-hidden="true"]');
    if (Array.from(document.querySelectorAll('dialog[open], [role="dialog"], iframe[src*="games.google"], iframe[src*="play.google"]')).some(visible)) {
      return 'playground-setup';
    }
    if (location.pathname !== '/explore') return null;
    const games = Array.from(document.querySelectorAll('a[href]')).some(link => {
      try {
        const url = new URL(link.href, location.href);
        return url.origin === location.origin && url.pathname.startsWith('/game/') && visible(link);
      } catch { return false; }
    });
    const search = Array.from(document.querySelectorAll('input[type="search"], [role="searchbox"], [role="search"] input, input[placeholder], input[aria-label]'))
      .some(element => visible(element) && (element.type === 'search' || element.getAttribute('role') === 'searchbox' ||
        element.closest('[role="search"]') || /search games|поиск игр/i.test(`${element.getAttribute('placeholder') || ''} ${element.getAttribute('aria-label') || ''}`)));
    return games || search ? 'playground-ready' : null;
  };
})();

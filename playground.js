(() => {
  'use strict';
  if (location.origin !== 'https://playground.google' || window.__ufPlaygroundEntry) return;
  window.__ufPlaygroundEntry = true;
  const entryUrl = 'https://playground.google/404?login_success=1&pli=1';
  const retryKey = 'uf_playground_entry_attempt';
  const diagnostic = { state: 'playground-entry', applied: 0 };
  const publish = () => document.documentElement?.setAttribute('data-flow-local-diagnostic', JSON.stringify(diagnostic));
  publish();
  if (location.pathname === '/region-unavailable') {
    try {
      if (Date.now() - Number(sessionStorage.getItem(retryKey) || 0) < 30000) {
        diagnostic.state = 'playground-entry-failed';
        diagnostic.reason = 'region-redirect';
        publish();
        return;
      }
      sessionStorage.setItem(retryKey, String(Date.now()));
      location.replace(entryUrl);
    } catch {
      diagnostic.state = 'playground-entry-failed';
      publish();
    }
    return;
  }
  if (location.pathname !== '/404') return;
  let attempts = 0;
  let ready = false;
  let finished = false;
  let awaitingSetup = false;
  let retryTimer;
  let readyTimer;
  let timer;
  const observer = new MutationObserver(checkPage);
  function finish(state, reason) {
    finished = true;
    diagnostic.state = state;
    diagnostic.applied = state === 'playground-ready' ? 1 : 0;
    if (reason) diagnostic.reason = reason;
    publish();
    observer.disconnect();
    clearTimeout(timer);
    clearTimeout(retryTimer);
    clearTimeout(readyTimer);
    window.removeEventListener('load', afterLoad);
  }
  function afterLoad() {
    // The menu HTML can arrive before Google's navigation handlers are ready.
    readyTimer = setTimeout(() => { ready = true; checkPage(); }, 1000);
  }
  function hasSetupDialog() {
    return Array.from(document.querySelectorAll('dialog[open], [role="dialog"], iframe[src*="games.google"], iframe[src*="play.google"]'))
      .some(element => element.getClientRects().length > 0 && getComputedStyle(element).visibility !== 'hidden');
  }
  function expire() {
    if (hasSetupDialog()) {
      checkPage();
      timer = setTimeout(expire, 30000);
      return;
    }
    finish('playground-entry-failed', attempts ? 'catalog-timeout' : 'navigation-unavailable');
  }
  function checkPage() {
    if (finished) return;
    if (hasSetupDialog()) {
      awaitingSetup = true;
      diagnostic.state = 'playground-setup';
      publish();
      return;
    }
    if (awaitingSetup) {
      awaitingSetup = false;
      diagnostic.state = 'playground-entry';
      attempts = 0;
      clearTimeout(retryTimer);
      retryTimer = undefined;
      clearTimeout(timer);
      timer = setTimeout(expire, 30000);
    }
    publish();
    if (location.pathname === '/explore' && Array.from(document.querySelectorAll('a[href]')).some(link => {
      const url = new URL(link.href, location.href);
      return url.origin === location.origin && url.pathname.startsWith('/game/');
    })) {
      finish('playground-ready');
      try { sessionStorage.removeItem(retryKey); } catch {}
      return;
    }
    if (!ready || retryTimer || attempts >= 3 || location.pathname !== '/404') return;
    const exploreLinks = Array.from(document.querySelectorAll('a[href]')).filter(link => {
      const url = new URL(link.href, location.href);
      return url.origin === location.origin && url.pathname === '/explore';
    });
    // Use the app's navigation control, not the first matching logo link.
    const control = exploreLinks.map(link => link.querySelector('button[role="tab"]') ||
      (link.getAttribute('role') === 'tab' ? link : null))
      .find(item => item && item.getClientRects().length > 0);
    if (control) {
      attempts++;
      diagnostic.attempts = attempts;
      publish();
      // If the app has not attached its handler yet, don't let this click
      // fall through to a full /explore request (which returns the region page).
      const guard = event => { if (event.target === control || control.contains(event.target)) event.preventDefault(); };
      window.addEventListener('click', guard);
      retryTimer = setTimeout(() => { retryTimer = undefined; checkPage(); }, 2000);
      try { control.click(); } finally { window.removeEventListener('click', guard); }
    }
  }
  observer.observe(document, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden', 'style', 'class', 'aria-hidden', 'open'] });
  timer = setTimeout(expire, 30000);
  if (document.readyState === 'complete') afterLoad();
  else window.addEventListener('load', afterLoad, { once: true });
  checkPage();
})();

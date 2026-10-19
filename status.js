(() => {
  'use strict';

  const isPlayground = location.origin === 'https://playground.google';
  const isBlocked = () => isPlayground ? location.pathname === '/region-unavailable' : location.pathname.includes('/unsupported-country') || location.pathname === '/404';

  // Автоматический переход со страницы блокировки или ошибочной 404
  if (isBlocked() && !isPlayground) {
    const key = 'uf_auto_redirect_tried';
    const lastTried = Number(sessionStorage.getItem(key) || 0);
    // Пробуем авто-переход с интервалом не чаще 10 секунд (защита от бесконечного цикла)
    if (Date.now() - lastTried > 10000) {
      sessionStorage.setItem(key, String(Date.now()));
      // Всегда перенаправляем на чистый корень https://flow.google.com/,
      // так как пути вроде /u/0 или /u/4 вызывают ошибку 404 в роутере Flow
      location.replace(location.origin + '/');
      return;
    }
  }

  let lastNotification;
  function checkAndNotify() {
    try {
      const parsed = readStatus();
      const type = parsed?.applied ? 'flowApplied' : isBlocked() ? 'flowBlocked' : null;
      if (type && type !== lastNotification) chrome.runtime.sendMessage({ type }).catch(() => {});
      lastNotification = type;
    } catch {}
  }

  checkAndNotify();
  setTimeout(checkAndNotify, 1200);
  setTimeout(checkAndNotify, 3000);

  function readStatus() {
    let parsed;
    try {
      parsed = JSON.parse(document.documentElement.getAttribute('data-flow-local-diagnostic') || 'null');
    } catch {}
    const current = isPlayground ? window.__ufReadPlaygroundState() : null;
    // A visible catalog or profile dialog takes precedence over an old attempt.
    // Conversely, an old success cannot describe a new page still loading.
    if (current) parsed = { state: current, applied: current === 'playground-ready' ? 1 : 0 };
    else if (isPlayground && parsed?.state === 'playground-ready') parsed = { state: 'playground-entry', applied: 0 };
    return {
      state: typeof parsed?.state === 'string' ? parsed.state.slice(0, 100) : 'not-loaded',
      applied: (parsed?.applied ?? 0) > 0,
      isBlockedPage: isBlocked()
    };
  }

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (sender.id !== chrome.runtime.id || message?.type !== 'status') return;
    checkAndNotify();
    sendResponse(readStatus());
  });
})();

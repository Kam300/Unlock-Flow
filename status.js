(() => {
  'use strict';

  // Автоматический переход со страницы блокировки или ошибочной 404
  if (location.pathname.includes('/unsupported-country') || location.pathname === '/404') {
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

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (sender.id !== chrome.runtime.id || message?.type !== 'status') return;
    let parsed;
    try {
      parsed = JSON.parse(document.documentElement.getAttribute('data-flow-local-diagnostic') || 'null');
    } catch {}

    sendResponse({
      state: typeof parsed?.state === 'string' ? parsed.state.slice(0, 100) : 'not-loaded',
      applied: (parsed?.applied ?? 0) > 0,
      isBlockedPage: location.pathname.includes('/unsupported-country') || location.pathname === '/404'
    });
  });
})();
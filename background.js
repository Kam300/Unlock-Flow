const registration = {
  id: 'flow-helper',
  matches: ['https://flow.google.com/*', 'https://playground.google/*'],
  js: ['hook.js', 'playground.js'],
  runAt: 'document_start',
  world: 'MAIN',
  persistAcrossSessions: true
};

// Compact iOS-style badges: empty when off, a dot/glyph otherwise.
const STATUS_CONFIGS = {
  OFF: { text: '',  color: '#8e8e93', title: 'Unlock Flow: Выключено' },
  ON:  { text: '●', color: '#007aff', title: 'Unlock Flow: Включено' },
  RUN: { text: '…', color: '#ff9500', title: 'Unlock Flow: Вход во Flow…' },
  OK:  { text: '✓', color: '#007aff', title: 'Unlock Flow: Разблокировано!' },
  ERR: { text: '!', color: '#ff3b30', title: 'Unlock Flow: Ошибка' }
};

let badgeQueue = Promise.resolve();

function setBadge(statusName, tabId, customTitle) {
  // Serialize writes so a late tab response cannot overwrite a newer OFF.
  badgeQueue = badgeQueue.then(async () => {
    let enabled;
    try {
      const scripts = await chrome.scripting.getRegisteredContentScripts({ ids: [registration.id] });
      enabled = scripts.length > 0;
    } catch {
      statusName = 'ERR';
    }
    // The registered helper is also the popup switch's source of truth.
    if (enabled === false) statusName = 'OFF';
    const config = STATUS_CONFIGS[statusName] || STATUS_CONFIGS.ERR;
    const target = Number.isInteger(tabId) ? { tabId } : {};
    await Promise.all([
      chrome.action.setBadgeText({ ...target, text: config.text }),
      chrome.action.setBadgeBackgroundColor({ ...target, color: config.color }),
      chrome.action.setBadgeTextColor?.({ ...target, color: '#ffffff' }),
      chrome.action.setTitle({ ...target, title: enabled ? (customTitle || config.title) : config.title })
    ]);
  }).catch(() => {});
  return badgeQueue;
}

async function refreshGlobalBadge() {
  await setBadge('ON');
  try {
    // A per-tab badge overrides the global badge. Reset both on every toggle.
    const tabs = await chrome.tabs.query({});
    await Promise.all(tabs.map(tab => setBadge('ON', tab.id)));
  } catch {}
}

async function syncRegistration() {
  const existing = await chrome.scripting.getRegisteredContentScripts({ ids: [registration.id] });
  if (existing.length) await chrome.scripting.updateContentScripts([registration]);
}

// Migrate enabled installations, preserving the OFF state across updates.
void syncRegistration().catch(() => {}).then(refreshGlobalBadge);

chrome.runtime.onInstalled.addListener(async ({ reason }) => {
  if (reason === 'install') {
    try {
      await chrome.scripting.registerContentScripts([registration]);
    } catch (err) {
      console.error('Failed to register content script on install:', err.message);
    }
  }
  if (reason === 'update') await syncRegistration();
  await refreshGlobalBadge();
});

chrome.runtime.onStartup?.addListener(() => {
  void refreshGlobalBadge();
});

// Watch Flow tabs and show dynamic badges
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (!tab?.url?.startsWith('https://flow.google.com/') && !tab?.url?.startsWith('https://playground.google/')) return;

  if (changeInfo.status === 'loading') {
    void setBadge('RUN', tabId);
  } else if (changeInfo.status === 'complete') {
    chrome.tabs.sendMessage(tabId, { type: 'status' }, (res) => {
      if (chrome.runtime.lastError) return;
      if (res?.applied) {
        void setBadge('OK', tabId);
        setTimeout(() => void setBadge('ON', tabId), 3000);
      } else if (res?.isBlockedPage) {
        void setBadge('RUN', tabId);
      } else {
        void setBadge('ON', tabId);
      }
    });
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (sender.id !== chrome.runtime.id) return;

  if (message?.type === 'setEnabled') {
    (async () => {
      const existing = await chrome.scripting.getRegisteredContentScripts({ ids: [registration.id] });
      if (message.enabled && !existing.length) {
        await chrome.scripting.registerContentScripts([registration]);
      } else if (!message.enabled && existing.length) {
        await chrome.scripting.unregisterContentScripts({ ids: [registration.id] });
      }
      await refreshGlobalBadge();
      sendResponse({ ok: true });
    })().catch(err => sendResponse({ ok: false, error: err.message }));
    return true;
  }

  if (message?.type === 'flowApplied' && sender.tab?.id) {
    void setBadge('OK', sender.tab.id);
    setTimeout(() => void setBadge('ON', sender.tab.id), 3000);
    sendResponse({ ok: true });
    return;
  }

  if (message?.type === 'flowBlocked' && sender.tab?.id) {
    void setBadge('RUN', sender.tab.id);
    sendResponse({ ok: true });
    return;
  }

  if (message?.type === 'pinTab' && message.tabId) {
    chrome.tabs.update(message.tabId, { pinned: Boolean(message.pinned) })
      .then(tab => sendResponse({ ok: true, pinned: tab.pinned }))
      .catch(err => sendResponse({ ok: false, error: err.message }));
    return true;
  }
});

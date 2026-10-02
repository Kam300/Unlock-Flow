const registration = {
  id: 'flow-helper',
  matches: ['https://flow.google.com/*'],
  js: ['hook.js'],
  runAt: 'document_start',
  world: 'MAIN',
  persistAcrossSessions: true
};

const STATUS_CONFIGS = {
  OFF: { text: 'OFF', color: '#64748b', title: 'Unlock Flow: Выключено' },
  ON:  { text: 'ON',  color: '#2563eb', title: 'Unlock Flow: Включено' },
  RUN: { text: 'RUN', color: '#f59e0b', title: 'Unlock Flow: Вход во Flow…' },
  OK:  { text: 'OK',  color: '#16a34a', title: 'Unlock Flow: Разблокировано!' },
  ERR: { text: 'ERR', color: '#dc2626', title: 'Unlock Flow: Ошибка' }
};

async function setBadge(statusName, tabId, customTitle) {
  const config = STATUS_CONFIGS[statusName] || STATUS_CONFIGS.ON;
  const target = Number.isInteger(tabId) ? { tabId } : {};
  try {
    await Promise.all([
      chrome.action.setBadgeText({ ...target, text: config.text }),
      chrome.action.setBadgeBackgroundColor({ ...target, color: config.color }),
      chrome.action.setTitle({ ...target, title: customTitle || config.title })
    ]);
  } catch {}
}

async function refreshGlobalBadge() {
  try {
    const scripts = await chrome.scripting.getRegisteredContentScripts({ ids: [registration.id] });
    await setBadge(scripts.length > 0 ? 'ON' : 'OFF');
  } catch {
    await setBadge('ON');
  }
}

chrome.runtime.onInstalled.addListener(async ({ reason }) => {
  if (reason === 'install') {
    try {
      await chrome.scripting.registerContentScripts([registration]);
    } catch (err) {
      console.error('Failed to register content script on install:', err.message);
    }
  }
  await refreshGlobalBadge();
});

chrome.runtime.onStartup?.addListener(() => {
  void refreshGlobalBadge();
});

// Watch Flow tabs and show dynamic badges
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (!tab?.url?.startsWith('https://flow.google.com/')) return;

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
        await setBadge('ON');
      } else if (!message.enabled && existing.length) {
        await chrome.scripting.unregisterContentScripts({ ids: [registration.id] });
        await setBadge('OFF');
      }
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
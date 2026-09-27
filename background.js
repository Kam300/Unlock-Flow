const registration = {
  id: 'flow-helper',
  matches: ['https://flow.google.com/*'],
  js: ['hook.js'],
  runAt: 'document_start',
  world: 'MAIN',
  persistAcrossSessions: true
};

chrome.runtime.onInstalled.addListener(async ({ reason }) => {
  if (reason === 'install') {
    try {
      await chrome.scripting.registerContentScripts([registration]);
    } catch (err) {
      console.error('Failed to register content script on install:', err.message);
    }
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (
    sender.id !== chrome.runtime.id ||
    sender.tab ||
    message?.type !== 'setEnabled'
  ) {
    return;
  }

  (async () => {
    const existing = await chrome.scripting.getRegisteredContentScripts({ ids: [registration.id] });
    if (message.enabled && !existing.length) {
      await chrome.scripting.registerContentScripts([registration]);
    } else if (!message.enabled && existing.length) {
      await chrome.scripting.unregisterContentScripts({ ids: [registration.id] });
    }
    sendResponse({ ok: true });
  })().catch(err => sendResponse({ ok: false, error: err.message }));

  return true;
});
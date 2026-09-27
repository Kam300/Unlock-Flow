(() => {
  'use strict';

  const FLOW_URL = 'https://flow.google.com/';
  const HELPER_ID = 'flow-helper';
  const LANG_KEY = 'uf_lang';
  const DEFAULT_LANG = 'ru';

  const UPDATE_URL = 'https://raw.githubusercontent.com/Kam300/Unlock-Flow/main/version.json';
  const TG_CHANNEL = 'https://t.me/TotalC0de/483';

  const STRINGS = {
    ru: {
      intro: 'Легко входите во Flow и обновляйте страницу.',
      toggleLabel: 'Unlock Flow',
      checking: 'Проверка…',
      enabledOn: 'Включено. Можно открывать Flow.',
      enabledOff: 'Выключено.',
      applied: 'Разблокировано! Flow работает.',
      armed: 'Готово. Ожидание ответа Flow.',
      blockedPage: 'Вы на странице блокировки. Нажмите кнопку «Обновить».',
      mismatch: 'Flow изменился. Требуется обновление helper.',
      reopen: 'Перезагрузите эту вкладку Flow, чтобы войти.',
      saved: 'Сохранено. Вкладка обновляется…',
      saveFailed: 'Не удалось сохранить настройку',
      selectTab: 'Сначала выберите вкладку Flow.',
      open: 'Открыть Flow',
      reload: 'Обновить (Войти)',
      help: 'ТГК',
      checkUpdate: 'Проверить обновление',
      checkingUpdate: 'Проверка…',
      modalCheckingTitle: 'Unlock Flow',
      modalChecking: 'Проверка наличия обновлений…',
      modalUpToDateTitle: 'У вас последняя версия',
      modalUpToDate: 'Версия {version} актуальна. Все функции работают в штатном режиме.',
      modalUpdateAvailable: 'Доступна версия {version}!',
      modalUpdateDesc: 'Вышло обновление расширения. Рекомендуется установить его для стабильной работы.',
      modalDownloadBtn: 'Скачать обновление',
      modalCloseBtn: 'Понятно',
      modalChannelBtn: 'Канал в Telegram',
      modalError: 'Не удалось связаться с сервером обновлений. Проверьте канал в Telegram.',
    },
    en: {
      intro: 'Easily open Flow and refresh the page.',
      toggleLabel: 'Unlock Flow',
      checking: 'Checking…',
      enabledOn: 'Enabled. You can open Flow now.',
      enabledOff: 'Disabled.',
      applied: 'Unlocked! Flow is working.',
      armed: 'Ready. Waiting for Flow response.',
      blockedPage: 'You are on the blocked page. Click "Refresh".',
      mismatch: 'Flow may have changed. A helper update is required.',
      reopen: 'Reload this Flow tab to enter.',
      saved: 'Saved. Reloading tab…',
      saveFailed: 'Setting could not be saved',
      selectTab: 'Select a Flow tab first.',
      open: 'Enter Flow',
      reload: 'Refresh (Enter)',
      help: 'TG channel',
      checkUpdate: 'Check for updates',
      checkingUpdate: 'Checking…',
      modalCheckingTitle: 'Unlock Flow',
      modalChecking: 'Checking for updates…',
      modalUpToDateTitle: 'You are up to date',
      modalUpToDate: 'Version {version} is up to date. All features are working normally.',
      modalUpdateAvailable: 'Version {version} available!',
      modalUpdateDesc: 'An update is available. We recommend updating for the best stability.',
      modalDownloadBtn: 'Download Update',
      modalCloseBtn: 'Close',
      modalChannelBtn: 'Telegram Channel',
      modalError: 'Could not connect to update server. Check our Telegram channel.',
    },
  };

  function getLang() {
    try {
      const v = localStorage.getItem(LANG_KEY);
      if (v === 'ru' || v === 'en') return v;
    } catch {}
    return DEFAULT_LANG;
  }

  let lang = getLang();

  function t(key, param) {
    let str = STRINGS[lang]?.[key] ?? STRINGS[DEFAULT_LANG]?.[key] ?? key;
    if (param !== undefined) {
      str = str.replace('{version}', param);
    }
    return str;
  }

  const toggle = document.getElementById('enabled');
  const statusEl = document.getElementById('status');
  const errorEl = document.getElementById('error');
  const reloadBtn = document.getElementById('reload');
  const openBtn = document.getElementById('open');
  const introEl = document.getElementById('intro');
  const toggleLabel = document.getElementById('toggle-label');
  const helpEl = document.getElementById('help-text');
  const langRuBtn = document.getElementById('lang-ru');
  const langEnBtn = document.getElementById('lang-en');
  const checkUpdateBtn = document.getElementById('check-update');
  const versionBtn = document.getElementById('version-btn');

  // Modal dialog elements
  const modalOverlay = document.getElementById('modal-overlay');
  const modalCloseBtn = document.getElementById('modal-close');
  const modalIcon = document.getElementById('modal-icon');
  const modalTitle = document.getElementById('modal-title');
  const modalBody = document.getElementById('modal-body');
  const modalActions = document.getElementById('modal-actions');

  let tab;

  function closeModal() {
    modalOverlay.hidden = true;
  }

  function openModal({ type, title, bodyHtml, actions = [] }) {
    modalIcon.className = `modal-icon ${type}`;
    if (type === 'loading') {
      modalIcon.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>`;
    } else if (type === 'success') {
      modalIcon.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
    } else if (type === 'new-ver') {
      modalIcon.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="16 12 12 8 8 12"/><line x1="12" y1="16" x2="12" y2="8"/></svg>`;
    } else if (type === 'error') {
      modalIcon.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`;
    } else {
      modalIcon.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><circle cx="12" cy="8" r=".5" fill="currentColor"/></svg>`;
    }

    modalTitle.textContent = title;
    modalBody.innerHTML = bodyHtml;
    modalActions.innerHTML = '';

    actions.forEach(({ label, isPrimary, href, onClick }) => {
      if (href) {
        const a = document.createElement('a');
        a.className = isPrimary ? 'modal-btn-primary' : 'modal-btn-secondary';
        a.href = href;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.textContent = label;
        modalActions.appendChild(a);
      } else {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = isPrimary ? 'modal-btn-primary' : 'modal-btn-secondary';
        btn.textContent = label;
        btn.onclick = onClick || closeModal;
        modalActions.appendChild(btn);
      }
    });

    modalOverlay.hidden = false;
  }

  function paintLangButtons() {
    langRuBtn.classList.toggle('active', lang === 'ru');
    langEnBtn.classList.toggle('active', lang === 'en');
    document.documentElement.lang = lang;
  }

  function applyStaticTexts() {
    introEl.textContent = t('intro');
    toggleLabel.textContent = t('toggleLabel');
    openBtn.textContent = t('open');
    reloadBtn.textContent = t('reload');
    helpEl.textContent = t('help');
    checkUpdateBtn.title = t('checkUpdate');
    checkUpdateBtn.setAttribute('aria-label', t('checkUpdate'));
    if (versionBtn) versionBtn.title = t('checkUpdate');
    paintLangButtons();
  }

  function setLang(next) {
    if (next !== 'ru' && next !== 'en') return;
    lang = next;
    try {
      localStorage.setItem(LANG_KEY, lang);
    } catch {}
    errorEl.textContent = '';
    applyStaticTexts();
    void refreshStatus();
  }

  async function refreshStatus() {
    const scripts = await chrome.scripting.getRegisteredContentScripts({ ids: [HELPER_ID] });
    toggle.checked = scripts.length > 0;

    [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const isFlowTab = Boolean(tab?.url?.startsWith(FLOW_URL));
    reloadBtn.hidden = !isFlowTab;

    statusEl.textContent = toggle.checked ? t('enabledOn') : t('enabledOff');

    if (isFlowTab && toggle.checked) {
      try {
        const res = await chrome.tabs.sendMessage(tab.id, { type: 'status' });
        if (res?.applied) {
          statusEl.textContent = t('applied');
        } else if (res?.isBlockedPage) {
          statusEl.textContent = t('blockedPage');
          reloadBtn.classList.remove('secondary');
        } else if (res?.state === 'armed') {
          statusEl.textContent = t('armed');
        } else if (typeof res?.state === 'string' && res.state.startsWith('schema mismatch')) {
          statusEl.textContent = t('mismatch');
        } else {
          statusEl.textContent = t('reopen');
        }
      } catch {
        statusEl.textContent = t('reopen');
      }
    }
  }

  function compareVersions(v1, v2) {
    const p1 = String(v1).split('.').map(n => parseInt(n, 10) || 0);
    const p2 = String(v2).split('.').map(n => parseInt(n, 10) || 0);
    for (let i = 0; i < Math.max(p1.length, p2.length); i++) {
      const n1 = p1[i] || 0;
      const n2 = p2[i] || 0;
      if (n1 > n2) return 1;
      if (n1 < n2) return -1;
    }
    return 0;
  }

  async function handleCheckUpdate() {
    const currentVersion = chrome.runtime.getManifest().version;
    checkUpdateBtn.disabled = true;
    checkUpdateBtn.classList.add('spinning');
    checkUpdateBtn.title = t('checkingUpdate');
    checkUpdateBtn.setAttribute('aria-label', t('checkingUpdate'));

    openModal({
      type: 'loading',
      title: t('modalCheckingTitle'),
      bodyHtml: `<p>${t('modalChecking')}</p>`,
      actions: []
    });

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      const res = await fetch(UPDATE_URL, {
        cache: 'no-store',
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const remoteVersion = data?.version;

      if (remoteVersion && compareVersions(remoteVersion, currentVersion) > 0) {
        const dlUrl = data.downloadUrl || TG_CHANNEL;
        const changelogHtml = data.changelog ? `<div class="modal-changelog">${data.changelog}</div>` : '';
        openModal({
          type: 'new-ver',
          title: t('modalUpdateAvailable', remoteVersion),
          bodyHtml: `<p>${t('modalUpdateDesc')}</p>${changelogHtml}`,
          actions: [
            { label: t('modalDownloadBtn'), isPrimary: true, href: dlUrl },
            { label: t('modalCloseBtn'), isPrimary: false, onClick: closeModal }
          ]
        });
      } else {
        openModal({
          type: 'success',
          title: t('modalUpToDateTitle'),
          bodyHtml: `<p>${t('modalUpToDate', currentVersion)}</p>`,
          actions: [
            { label: t('modalCloseBtn'), isPrimary: true, onClick: closeModal },
            { label: t('modalChannelBtn'), isPrimary: false, href: TG_CHANNEL }
          ]
        });
      }
    } catch {
      openModal({
        type: 'error',
        title: `Unlock Flow v${currentVersion}`,
        bodyHtml: `<p>${t('modalError')}</p>`,
        actions: [
          { label: t('modalChannelBtn'), isPrimary: true, href: TG_CHANNEL },
          { label: t('modalCloseBtn'), isPrimary: false, onClick: closeModal }
        ]
      });
    } finally {
      checkUpdateBtn.disabled = false;
      checkUpdateBtn.classList.remove('spinning');
      checkUpdateBtn.title = t('checkUpdate');
      checkUpdateBtn.setAttribute('aria-label', t('checkUpdate'));
    }
  }

  async function init() {
    applyStaticTexts();
    statusEl.textContent = t('checking');
    await refreshStatus();
    toggle.disabled = false;
  }

  toggle.addEventListener('change', async () => {
    toggle.disabled = true;
    errorEl.textContent = '';
    try {
      const res = await chrome.runtime.sendMessage({ type: 'setEnabled', enabled: toggle.checked });
      if (!res?.ok) throw new Error(res?.error || t('saveFailed'));

      if (toggle.checked && tab?.url?.startsWith(FLOW_URL)) {
        statusEl.textContent = t('saved');
        const url = new URL(tab.url);
        if (url.pathname.includes('/unsupported-country') || url.pathname === '/404') {
          await chrome.tabs.update(tab.id, { url: FLOW_URL });
        } else {
          await chrome.tabs.reload(tab.id);
        }
        setTimeout(() => window.close(), 300);
        return;
      }

      statusEl.textContent = toggle.checked ? t('enabledOn') : t('enabledOff');
    } catch (e) {
      toggle.checked = !toggle.checked;
      errorEl.textContent = e?.message || t('saveFailed');
    } finally {
      toggle.disabled = false;
    }
  });

  openBtn.onclick = () => {
    chrome.tabs.create({ url: FLOW_URL });
  };

  reloadBtn.onclick = async () => {
    try {
      const current = await chrome.tabs.get(tab.id);
      if (!current.url?.startsWith(FLOW_URL)) throw new Error(t('selectTab'));
      const url = new URL(current.url);
      if (url.pathname.includes('/unsupported-country') || url.pathname === '/404') {
        await chrome.tabs.update(tab.id, { url: FLOW_URL });
      } else {
        await chrome.tabs.reload(tab.id);
      }
      window.close();
    } catch (e) {
      errorEl.textContent = e?.message || String(e);
    }
  };

  checkUpdateBtn.onclick = handleCheckUpdate;
  if (versionBtn) versionBtn.onclick = handleCheckUpdate;

  modalCloseBtn.onclick = closeModal;
  modalOverlay.onclick = (e) => {
    if (e.target === modalOverlay) closeModal();
  };
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modalOverlay.hidden) closeModal();
  });

  langRuBtn.onclick = () => setLang('ru');
  langEnBtn.onclick = () => setLang('en');

  init().catch((e) => {
    errorEl.textContent = e?.message || String(e);
  });
})();

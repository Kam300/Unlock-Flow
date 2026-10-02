(() => {
  'use strict';

  const FLOW_URL = 'https://flow.google.com/';
  const HELPER_ID = 'flow-helper';
  const LANG_KEY = 'uf_lang';
  const THEME_KEY = 'uf_theme';
  const DEFAULT_LANG = 'ru';

  const UPDATE_URL = 'https://raw.githubusercontent.com/Kam300/Unlock-Flow/main/version.json';
  const GITHUB_REPO = 'https://github.com/Kam300/Unlock-Flow';
  const GITHUB_RELEASES = 'https://github.com/Kam300/Unlock-Flow/releases';
  const TG_CHANNEL = 'https://t.me/TotalC0de/483';

  const STRINGS = {
    ru: {
      intro: 'Обход региональных ограничений.',
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
      pinTab: 'Закрепить вкладку Flow',
      unpinTab: 'Открепить вкладку Flow',
      openPinned: 'Открыть и закрепить Flow',
      help: 'ТГК',
      checkUpdate: 'Проверить обновление',
      checkingUpdate: 'Проверка…',
      themeDark: 'Тёмная тема',
      themeLight: 'Светлая тема',
      modalCheckingTitle: 'Unlock Flow',
      modalChecking: 'Проверка наличия обновлений…',
      modalUpToDateTitle: 'У вас последняя версия',
      modalUpToDate: 'Версия {version} актуальна. Все функции работают в штатном режиме.',
      modalUpdateAvailable: 'Доступна версия {version}!',
      modalUpdateDesc: 'Вышло обновление расширения. Рекомендуется установить его для стабильной работы.',
      modalDownloadBtn: 'Скачать обновление',
      modalCloseBtn: 'Понятно',
      modalChannelBtn: 'Канал в Telegram',
      modalGithubBtn: 'GitHub',
      modalReleasesBtn: 'Релизы на GitHub',
      modalError: 'Не удалось связаться с сервером обновлений. Проверьте канал в Telegram или GitHub.',
    },
    en: {
      intro: 'Bypass regional restrictions.',
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
      pinTab: 'Pin Flow Tab',
      unpinTab: 'Unpin Flow Tab',
      openPinned: 'Open & Pin Flow Tab',
      help: 'TG channel',
      checkUpdate: 'Check for updates',
      checkingUpdate: 'Checking…',
      themeDark: 'Dark theme',
      themeLight: 'Light theme',
      modalCheckingTitle: 'Unlock Flow',
      modalChecking: 'Checking for updates…',
      modalUpToDateTitle: 'You are up to date',
      modalUpToDate: 'Version {version} is up to date. All features are working normally.',
      modalUpdateAvailable: 'Version {version} available!',
      modalUpdateDesc: 'An update is available. We recommend updating for the best stability.',
      modalDownloadBtn: 'Download Update',
      modalCloseBtn: 'Close',
      modalChannelBtn: 'Telegram Channel',
      modalGithubBtn: 'GitHub',
      modalReleasesBtn: 'GitHub Releases',
      modalError: 'Could not connect to update server. Check our Telegram channel or GitHub.',
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
  const statusDot = document.getElementById('status-dot');
  const errorEl = document.getElementById('error');
  const reloadBtn = document.getElementById('reload');
  const openBtn = document.getElementById('open');
  const introEl = document.getElementById('intro');
  const toggleLabel = document.getElementById('toggle-label');
  const helpEl = document.getElementById('help-text');
  const langRuBtn = document.getElementById('lang-ru');
  const langEnBtn = document.getElementById('lang-en');
  const themeToggle = document.getElementById('theme-toggle');
  const themeIcon = document.getElementById('theme-icon');
  const checkUpdateBtn = document.getElementById('check-update');
  const versionBtn = document.getElementById('version-btn');

  function getStoredTheme() {
    try {
      const v = localStorage.getItem(THEME_KEY);
      if (v === 'dark' || v === 'light') return v;
    } catch {}
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  }

  let currentTheme = getStoredTheme();

  function applyTheme(next) {
    if (next) currentTheme = next;
    const isDark = currentTheme === 'dark';
    if (isDark) {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }

    if (themeToggle) {
      const title = isDark ? t('themeLight') : t('themeDark');
      themeToggle.title = title;
      themeToggle.setAttribute('aria-label', title);
    }

    if (themeIcon) {
      if (isDark) {
        themeIcon.innerHTML = '<circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>';
      } else {
        themeIcon.innerHTML = '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>';
      }
    }
  }

  function toggleTheme() {
    const next = currentTheme === 'dark' ? 'light' : 'dark';
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {}
    applyTheme(next);
  }

  applyTheme(currentTheme);

  // Quick Tools & Pinning
  const pinBtn = document.getElementById('pin-btn');
  const pinText = document.getElementById('pin-text');

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

    const GITHUB_SVG = '<svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor" aria-hidden="true"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/></svg>';
    const TG_SVG = '<svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor" aria-hidden="true"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.138-1.294 3.785-1.518 3.973-1.546z"/></svg>';

    function renderActionButton(item) {
      const { label, isPrimary, href, onClick, icon } = item;
      const el = href ? document.createElement('a') : document.createElement('button');
      el.className = isPrimary ? 'modal-btn-primary' : 'modal-btn-secondary';
      if (href) {
        el.href = href;
        el.target = '_blank';
        el.rel = 'noopener noreferrer';
      } else {
        el.type = 'button';
        el.onclick = onClick || closeModal;
      }
      if (icon === 'github') {
        el.innerHTML = `${GITHUB_SVG}<span>${label}</span>`;
      } else if (icon === 'tg') {
        el.innerHTML = `${TG_SVG}<span>${label}</span>`;
      } else {
        el.textContent = label;
      }
      return el;
    }

    actions.forEach((item) => {
      if (item.row) {
        const rowDiv = document.createElement('div');
        rowDiv.className = 'modal-btn-row';
        item.row.forEach((btnConfig) => {
          rowDiv.appendChild(renderActionButton(btnConfig));
        });
        modalActions.appendChild(rowDiv);
      } else {
        modalActions.appendChild(renderActionButton(item));
      }
    });

    modalOverlay.hidden = false;
  }

  function setStatusDot(type) {
    if (!statusDot) return;
    statusDot.className = 'status-dot';
    if (type) statusDot.classList.add(type);
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
    if (versionBtn) {
      versionBtn.textContent = `v${chrome.runtime.getManifest().version}`;
      versionBtn.title = t('checkUpdate');
    }
    paintLangButtons();
    applyTheme();
    updatePinButtonText();
  }

  function updatePinButtonText() {
    if (!pinBtn || !pinText) return;
    const isFlowTab = Boolean(tab?.url?.startsWith(FLOW_URL));
    if (isFlowTab) {
      const isPinned = Boolean(tab?.pinned);
      pinBtn.classList.toggle('pinned', isPinned);
      pinText.textContent = isPinned ? t('unpinTab') : t('pinTab');
      pinBtn.title = isPinned ? t('unpinTab') : t('pinTab');
    } else {
      pinBtn.classList.remove('pinned');
      pinText.textContent = t('openPinned');
      pinBtn.title = t('openPinned');
    }
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

    updatePinButtonText();

    if (!toggle.checked) {
      statusEl.textContent = t('enabledOff');
      setStatusDot('');
      return;
    }

    statusEl.textContent = t('enabledOn');
    setStatusDot(isFlowTab ? 'loading' : 'active');

    if (isFlowTab && toggle.checked) {
      try {
        const res = await chrome.tabs.sendMessage(tab.id, { type: 'status' });
        if (res?.applied) {
          statusEl.textContent = t('applied');
          setStatusDot('active');
        } else if (res?.isBlockedPage) {
          statusEl.textContent = t('blockedPage');
          setStatusDot('error');
          reloadBtn.classList.remove('secondary');
        } else if (res?.state === 'armed') {
          statusEl.textContent = t('armed');
          setStatusDot('loading');
        } else if (typeof res?.state === 'string' && res.state.startsWith('schema mismatch')) {
          statusEl.textContent = t('mismatch');
          setStatusDot('error');
        } else {
          statusEl.textContent = t('reopen');
          setStatusDot('loading');
        }
      } catch {
        statusEl.textContent = t('reopen');
        setStatusDot('loading');
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
      const res = await fetch(`${UPDATE_URL}?t=${Date.now()}`, {
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
            {
              row: [
                { label: t('modalGithubBtn'), isPrimary: false, href: GITHUB_RELEASES, icon: 'github' },
                { label: t('modalCloseBtn'), isPrimary: false, onClick: closeModal }
              ]
            }
          ]
        });
      } else {
        openModal({
          type: 'success',
          title: t('modalUpToDateTitle'),
          bodyHtml: `<p>${t('modalUpToDate', currentVersion)}</p>`,
          actions: [
            { label: t('modalCloseBtn'), isPrimary: true, onClick: closeModal },
            {
              row: [
                { label: t('modalGithubBtn'), isPrimary: false, href: GITHUB_REPO, icon: 'github' },
                { label: t('modalChannelBtn'), isPrimary: false, href: TG_CHANNEL, icon: 'tg' }
              ]
            }
          ]
        });
      }
    } catch {
      openModal({
        type: 'error',
        title: `Unlock Flow v${currentVersion}`,
        bodyHtml: `<p>${t('modalError')}</p>`,
        actions: [
          { label: t('modalReleasesBtn'), isPrimary: true, href: GITHUB_RELEASES, icon: 'github' },
          {
            row: [
              { label: t('modalChannelBtn'), isPrimary: false, href: TG_CHANNEL, icon: 'tg' },
              { label: t('modalCloseBtn'), isPrimary: false, onClick: closeModal }
            ]
          }
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
    setStatusDot('loading');
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
        setStatusDot('active');
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
      setStatusDot(toggle.checked ? 'active' : '');
    } catch (e) {
      toggle.checked = !toggle.checked;
      errorEl.textContent = e?.message || t('saveFailed');
      setStatusDot('error');
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
      setStatusDot('error');
    }
  };

  pinBtn.onclick = async () => {
    try {
      const isFlowTab = Boolean(tab?.url?.startsWith(FLOW_URL));
      if (isFlowTab) {
        const nextPinned = !tab.pinned;
        const updated = await chrome.tabs.update(tab.id, { pinned: nextPinned });
        tab = updated;
        updatePinButtonText();
      } else {
        await chrome.tabs.create({ url: FLOW_URL, pinned: true });
        window.close();
      }
    } catch (e) {
      errorEl.textContent = e?.message || String(e);
    }
  };

  if (themeToggle) themeToggle.onclick = toggleTheme;
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
    setStatusDot('error');
  });
})();

(() => {
  'use strict';

  const FLOW_URL = 'https://flow.google.com/';
  const HELPER_ID = 'flow-helper';
  const LANG_KEY = 'uf_lang';
  const THEME_KEY = 'uf_theme';
  const DEFAULT_LANG = 'ru';

  const UPDATE_URL = 'https://raw.githubusercontent.com/Kam300/Unlock-Flow/main/version.json';
  const ZIP_BASE_URL = 'https://raw.githubusercontent.com/Kam300/Unlock-Flow/main/dist/';
  let updateZipUrl = `${ZIP_BASE_URL}Unlock-Flow-v${chrome.runtime.getManifest().version}.zip`;
  const PENDING_UPDATE_KEY = 'uf_pending_update';
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
      themeModeAuto: 'Тема: как в системе',
      themeModeLight: 'Тема: светлая',
      themeModeDark: 'Тема: тёмная',
      tipOpen: 'Открыть flow.google.com в новой вкладке',
      tipReload: 'Перезагрузить текущую вкладку Flow',
      tipPin: 'Закреплённая вкладка не закроется случайно',
      tipOpenPinned: 'Открыть Flow сразу закреплённой вкладкой',
      tipToggle: 'Подменяет ответ Flow, открывая доступ',
      tipHelp: 'Канал автора в Telegram',
      tipRu: 'Русский',
      tipEn: 'English',
      celebrate: 'Разблокировано',
      modalCheckingTitle: 'Unlock Flow',
      modalChecking: 'Проверка наличия обновлений…',
      modalUpToDateTitle: 'У вас последняя версия',
      modalUpToDate: 'Версия {version} актуальна. Все функции работают в штатном режиме.',
      modalUpdateAvailable: 'Доступна версия {version}!',
      modalUpdateDesc: 'Вышло обновление расширения. Рекомендуется установить его для стабильной работы.',
      modalDownloadBtn: 'Скачать обновление',
      modalUpdateSteps: 'Распакуйте ZIP в прежнюю папку расширения с заменой файлов. Затем нажмите кнопку ниже и обновите вкладку Flow. Удалять расширение не нужно.',
      modalRestartBtn: 'Файлы заменены — перезапустить',
      modalInstallTitle: 'Завершить обновление',
      modalRestartFailed: 'Не удалось перезапустить расширение. Попробуйте ещё раз или нажмите ↻ на его карточке в chrome://extensions.',
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
      themeModeAuto: 'Theme: system',
      themeModeLight: 'Theme: light',
      themeModeDark: 'Theme: dark',
      tipOpen: 'Open flow.google.com in a new tab',
      tipReload: 'Reload the current Flow tab',
      tipPin: 'A pinned tab won\'t get closed by accident',
      tipOpenPinned: 'Open Flow as a pinned tab',
      tipToggle: 'Patches Flow\'s response to unlock access',
      tipHelp: 'Author\'s Telegram channel',
      tipRu: 'Русский',
      tipEn: 'English',
      celebrate: 'Unlocked',
      modalCheckingTitle: 'Unlock Flow',
      modalChecking: 'Checking for updates…',
      modalUpToDateTitle: 'You are up to date',
      modalUpToDate: 'Version {version} is up to date. All features are working normally.',
      modalUpdateAvailable: 'Version {version} available!',
      modalUpdateDesc: 'An update is available. We recommend updating for the best stability.',
      modalDownloadBtn: 'Download Update',
      modalUpdateSteps: 'Extract the ZIP into the existing extension folder and replace the files. Then click the button below and refresh your Flow tab. You do not need to remove the extension.',
      modalRestartBtn: 'Files replaced — restart',
      modalInstallTitle: 'Finish updating',
      modalRestartFailed: 'Could not restart the extension. Try again or click ↻ on its card in chrome://extensions.',
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

  // Theme mode: 'auto' follows the OS, 'light'/'dark' are manual overrides.
  const THEME_MODES = ['auto', 'light', 'dark'];
  const darkQuery = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  const THEME_ICONS = {
    auto: '<circle cx="12" cy="12" r="9"></circle><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor"></path>',
    light: '<circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>',
    dark: '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>'
  };
  const THEME_TITLES = { auto: 'themeModeAuto', light: 'themeModeLight', dark: 'themeModeDark' };

  function getStoredTheme() {
    try {
      const v = localStorage.getItem(THEME_KEY);
      if (THEME_MODES.includes(v)) return v;
    } catch {}
    return 'auto';
  }

  let currentTheme = getStoredTheme();

  function applyTheme(next) {
    if (next) currentTheme = next;
    const isDark = currentTheme === 'dark' || (currentTheme === 'auto' && Boolean(darkQuery?.matches));
    if (isDark) {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }

    if (themeToggle) {
      const title = t(THEME_TITLES[currentTheme]);
      themeToggle.title = title;
      themeToggle.setAttribute('aria-label', title);
    }

    if (themeIcon) themeIcon.innerHTML = THEME_ICONS[currentTheme];
  }

  function toggleTheme() {
    const next = THEME_MODES[(THEME_MODES.indexOf(currentTheme) + 1) % THEME_MODES.length];
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {}
    applyTheme(next);
  }

  darkQuery?.addEventListener('change', () => {
    if (currentTheme === 'auto') applyTheme();
  });

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

  // Status glyphs: locked (off), hourglass (working), unlocked (ok), warning (error).
  const STATUS_ICONS = {
    off: '<path d="M8 10V7a4 4 0 0 1 8 0v3"/><path fill="currentColor" stroke="none" fill-rule="evenodd" d="M7.5 10h9a2.5 2.5 0 0 1 2.5 2.5v6a2.5 2.5 0 0 1-2.5 2.5h-9A2.5 2.5 0 0 1 5 18.5v-6A2.5 2.5 0 0 1 7.5 10zM12 13.6a1.7 1.7 0 0 0-.9 3.15V18.4h1.8v-1.65A1.7 1.7 0 0 0 12 13.6z"/>',
    loading: '<path d="M7 3h10M7 21h10M8 3c0 5 8 5 8 9s-8 4-8 9M16 3c0 5-8 5-8 9s8 4 8 9"/>',
    active: '<path d="M8 10V7a4 4 0 0 1 7.75-1.4"/><path fill="currentColor" stroke="none" fill-rule="evenodd" d="M7.5 10h9a2.5 2.5 0 0 1 2.5 2.5v6a2.5 2.5 0 0 1-2.5 2.5h-9A2.5 2.5 0 0 1 5 18.5v-6A2.5 2.5 0 0 1 7.5 10zM12 13.6a1.7 1.7 0 0 0-.9 3.15V18.4h1.8v-1.65A1.7 1.7 0 0 0 12 13.6z"/>',
    error: '<path d="M10.3 3.9 2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>'
  };

  function setStatusDot(type) {
    if (!statusDot) return;
    const key = type || 'off';
    statusDot.className = 'status-dot';
    if (type) statusDot.classList.add(type);
    if (statusDot.dataset.icon === key) return;
    statusDot.dataset.icon = key;
    statusDot.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${STATUS_ICONS[key]}</svg>`;
  }

  // Plays the "unlocked" checkmark once per Flow tab per browser session.
  async function celebrateUnlock() {
    if (!tab?.id) return;
    const key = `uf_celebrated_${tab.id}`;
    const store = chrome.storage.session;
    try {
      if (store && (await store.get(key))[key]) return;
      await store?.set({ [key]: true });
    } catch {}
    const section = toggle.closest('section');
    if (!section || section.querySelector('.celebrate')) return;
    const el = document.createElement('div');
    el.className = 'celebrate';
    el.innerHTML = `<svg viewBox="0 0 52 52" aria-hidden="true"><circle cx="26" cy="26" r="24"/><path d="M15 27l7 7 15-16"/></svg><span></span>`;
    el.querySelector('span').textContent = t('celebrate');
    section.appendChild(el);
    setTimeout(() => el.remove(), 1900);
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
    openBtn.title = t('tipOpen');
    reloadBtn.title = t('tipReload');
    langRuBtn.title = t('tipRu');
    langEnBtn.title = t('tipEn');
    toggle.closest('label').title = t('tipToggle');
    helpEl.closest('a').title = t('tipHelp');
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
      pinBtn.title = t('tipPin');
    } else {
      pinBtn.classList.remove('pinned');
      pinText.textContent = t('openPinned');
      pinBtn.title = t('tipOpenPinned');
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
          void celebrateUnlock();
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

  function restartUpdateAction() {
    return { label: t('modalRestartBtn'), isPrimary: false, onClick: restartExtension };
  }

  function showUpdateSteps() {
    openModal({
      type: 'new-ver',
      title: t('modalInstallTitle'),
      bodyHtml: `<p>${t('modalUpdateSteps')}</p>`,
      actions: [
        { ...restartUpdateAction(), isPrimary: true },
        { label: t('modalDownloadBtn'), isPrimary: false, onClick: downloadUpdate },
        { label: t('modalCloseBtn'), isPrimary: false, onClick: closeModal }
      ]
    });
  }

  async function downloadUpdate() {
    try {
      // The popup closes when a download tab opens. Resume the instructions
      // on the next popup opening, without requiring another network check.
      await chrome.storage.local.set({ [PENDING_UPDATE_KEY]: updateZipUrl });
      await chrome.tabs.create({ url: `${updateZipUrl}?t=${Date.now()}` });
    } catch (e) {
      errorEl.textContent = e?.message || String(e);
    }
  }

  async function restartExtension() {
    try {
      await chrome.storage.local.remove(PENDING_UPDATE_KEY);
      chrome.runtime.reload();
    } catch {
      await chrome.storage.local.set({ [PENDING_UPDATE_KEY]: updateZipUrl }).catch(() => {});
      errorEl.textContent = t('modalRestartFailed');
      closeModal();
    }
  }

  function escapeHtml(value) {
    const el = document.createElement('div');
    el.textContent = String(value);
    return el.innerHTML;
  }

  async function hasPendingUpdate() {
    const pending = (await chrome.storage.local.get(PENDING_UPDATE_KEY))[PENDING_UPDATE_KEY];
    if (typeof pending === 'string' && /^https:\/\/raw\.githubusercontent\.com\/Kam300\/Unlock-Flow\/main\/dist\/Unlock-Flow-v\d+\.\d+\.\d+(?:\.\d+)?\.zip$/.test(pending)) {
      updateZipUrl = pending;
    }
    return Boolean(pending);
  }

  async function handleCheckUpdate() {
    if (await hasPendingUpdate()) {
      showUpdateSteps();
      return;
    }
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
      if (typeof remoteVersion !== 'string' || !/^\d+\.\d+\.\d+(?:\.\d+)?$/.test(remoteVersion)) {
        throw new Error('Invalid update version');
      }
      updateZipUrl = `${ZIP_BASE_URL}Unlock-Flow-v${remoteVersion}.zip`;

      if (remoteVersion && compareVersions(remoteVersion, currentVersion) > 0) {
        const changelogHtml = data.changelog ? `<div class="modal-changelog">${escapeHtml(data.changelog)}</div>` : '';
        openModal({
          type: 'new-ver',
          title: t('modalUpdateAvailable', remoteVersion),
          bodyHtml: `<p>${t('modalUpdateSteps')}</p>${changelogHtml}`,
          actions: [
            { label: t('modalDownloadBtn'), isPrimary: true, onClick: downloadUpdate },
            restartUpdateAction(),
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
            restartUpdateAction(),
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
          { label: t('modalDownloadBtn'), isPrimary: true, onClick: downloadUpdate },
          restartUpdateAction(),
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
    if (await hasPendingUpdate()) {
      showUpdateSteps();
    }
    statusEl.textContent = t('checking');
    setStatusDot('loading');
    await refreshStatus();
    toggle.disabled = false;
  }

  toggle.addEventListener('change', async () => {
    try { navigator.vibrate?.(10); } catch {}
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
  // The updater downloads Chrome builds, so it is hidden in the Firefox build.
  const isFirefox = chrome.runtime.getURL('').startsWith('moz-extension:');
  if (isFirefox) {
    checkUpdateBtn.style.display = 'none';
    if (versionBtn) versionBtn.disabled = true;
  } else {
    checkUpdateBtn.onclick = handleCheckUpdate;
    if (versionBtn) versionBtn.onclick = handleCheckUpdate;
  }

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

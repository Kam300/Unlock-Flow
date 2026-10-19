const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

function setup({ enabled = true, active = 1, statuses = {}, firefox = false, fetchFails = false, version = '1.4.5', pending, remote = { version: '1.4.6', firefoxVersion: '1.4.6' } } = {}) {
  const elements = new Map();
  function element() {
    const classes = new Set();
    return { textContent: '', innerHTML: '', hidden: false, checked: false, dataset: {}, children: [],
      closest(selector) { return selector === 'section' ? null : this; },
      attributes: {}, listeners: {},
      setAttribute(k, v) { this.attributes[k] = v; }, removeAttribute(k) { delete this.attributes[k]; },
      addEventListener(k, fn) { this.listeners[k] = fn; }, appendChild(child) { this.children.push(child); },
      classList: { add: k => classes.add(k), remove: k => classes.delete(k),
        toggle(k, value) { value ? classes.add(k) : classes.delete(k); } },
    };
  }
  const document = { documentElement: element(), createElement: element, addEventListener() {},
    getElementById(id) { if (!elements.has(id)) elements.set(id, element()); return elements.get(id); } };
  const tabs = [
    { id: 1, url: 'https://flow.google.com/', pinned: false, active: active === 1 },
    { id: 2, url: 'https://playground.google/explore', pinned: true, active: active === 2 },
  ];
  const actions = [], timers = new Map(), windowEvents = {};
  let timerId = 0;
  const storage = pending === undefined ? {} : { uf_pending_update: pending };
  const chrome = {
    runtime: { getURL: () => firefox ? 'moz-extension://test/' : 'chrome-extension://test/', getManifest: () => ({ version }), async sendMessage(message) {
      actions.push(message); enabled = message.enabled; return { ok: true };
    } },
    scripting: { async getRegisteredContentScripts() { return enabled ? [{ id: 'flow-helper' }] : []; } },
    storage: { local: { async get() { return { ...storage }; }, async set(data) { Object.assign(storage, data); actions.push({ storage: data }); }, async remove(key) { delete storage[key]; actions.push({ removed: key }); } } },
    tabs: {
      async query(options) { return options.active ? tabs.filter(t => t.active) : tabs; },
      async get(id) { return tabs.find(t => t.id === id); },
      async sendMessage(id) { return statuses[id] || { applied: true, state: id === 2 ? 'playground-ready' : 'armed' }; },
      async update(id, values) { actions.push({ id, ...values }); Object.assign(tabs.find(t => t.id === id), values); return tabs.find(t => t.id === id); },
      async create(values) { actions.push({ create: true, ...values }); },
      async reload(id) { actions.push({ reload: id }); },
    },
  };
  const context = { document, chrome, window: { matchMedia: () => ({ matches: false }), close() {}, addEventListener(k, fn) { windowEvents[k] = fn; } },
    localStorage: { getItem() { return null; }, setItem() {} }, URL, AbortController,
    async fetch() { if (fetchFails) throw new Error('Offline'); return { ok: true, async json() { return remote; } }; },
    setTimeout(fn, delay) { timers.set(++timerId, { fn, delay }); return timerId; }, clearTimeout(id) { timers.delete(id); } };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', 'popup.js'), 'utf8'), context);
  return { get: id => document.getElementById(id), actions, tabs, timers, storage,
    async poll() { const [id, timer] = [...timers].find(([, timer]) => timer.delay === 1500); timers.delete(id); await timer.fn(); },
    close() { windowEvents.pagehide(); } };
}
const settle = () => new Promise(resolve => setImmediate(resolve));

test('manual installation clears reminders for the installed version or older', async () => {
  for (const target of ['1.4.8', '1.4.7', '1.4.8.0']) {
    const ui = setup({ version: '1.4.8', pending: `https://raw.githubusercontent.com/Kam300/Unlock-Flow/main/dist/Unlock-Flow-v${target}.zip`, remote: { version: '1.4.8' } });
    await settle();
    assert.equal(ui.storage.uf_pending_update, undefined);
    assert.equal(ui.get('modal-title').textContent, '');
    await ui.get('check-update').onclick();
    assert.equal(ui.get('modal-title').textContent, 'У вас последняя версия');
    assert.equal(ui.get('modal-actions').children.some(item => /перезапустить|Скачать/.test(item.textContent)), false);
  }
});

test('a genuinely newer downloaded update still offers installation steps', async () => {
  const pending = 'https://raw.githubusercontent.com/Kam300/Unlock-Flow/main/dist/Unlock-Flow-v1.4.10.zip';
  const ui = setup({ version: '1.4.8', pending }); await settle();
  assert.equal(ui.storage.uf_pending_update, pending);
  assert.match(ui.get('modal-body').innerHTML, /Распакуйте ZIP/);
  await ui.get('modal-actions').children[1].onclick();
  assert.equal(ui.actions.at(-1).url.startsWith(`${pending}?t=`), true);
});

test('legacy and malformed update reminders cannot trap the update check', async () => {
  for (const pending of [true, {}, 'https://example.com/update.zip']) {
    const ui = setup({ version: '1.4.8', pending, remote: { version: '1.4.8' } }); await settle();
    assert.equal(ui.storage.uf_pending_update, undefined);
    await ui.get('check-update').onclick();
    assert.equal(ui.get('modal-title').textContent, 'У вас последняя версия');
  }
});

test('an open popup updates from entry to catalog ready and stops polling on close', async () => {
  const statuses = { 2: { state: 'playground-entry', applied: false } };
  const ui = setup({ active: 2, statuses }); await settle();
  assert.match(ui.get('status').textContent, /Открываем каталог/);
  statuses[2] = { state: 'playground-ready', applied: true };
  await ui.poll();
  assert.equal(ui.get('status').textContent, 'Каталог Playground открыт.');
  assert.equal(ui.get('dns-help').hidden, true);
  ui.close();
  assert.equal([...ui.timers.values()].some(timer => timer.delay === 1500), false);
});

test('active Playground selects its service and switching to Flow uses the Flow tab', async () => {
  const ui = setup({ active: 2 }); await settle();
  assert.equal(ui.get('service-playground').attributes['aria-pressed'], 'true');
  assert.equal(ui.get('status').textContent, 'Каталог Playground открыт.');
  ui.get('service-flow').onclick(); await settle();
  assert.equal(ui.get('open').textContent, 'Открыть Flow');
  await ui.get('pin-btn').onclick();
  assert.equal(ui.actions.at(-1).id, 1);
  await ui.get('reload').onclick();
  assert.equal(ui.actions.at(-1).reload, 1);
});

test('one primary action enables help and reuses the selected Playground tab', async () => {
  const ui = setup({ enabled: false }); await settle();
  ui.get('service-playground').onclick(); await settle();
  assert.equal(ui.get('open').textContent, 'Включить и открыть Playground');
  assert.equal(ui.get('reload').disabled, true);
  await ui.get('open').onclick();
  assert.equal(ui.actions[0].type, 'setEnabled');
  assert.equal(ui.actions[0].enabled, true);
  assert.equal(ui.actions[1].id, 2);
  assert.equal(ui.actions[1].url, 'https://playground.google/404?login_success=1&pli=1');
  assert.equal(ui.actions.some(action => action.create), false);
});

test('opening a working game tab focuses it without resetting its page', async () => {
  const ui = setup({ active: 2 }); await settle();
  ui.tabs[1].url = 'https://playground.google/game/my-game';
  await ui.get('open').onclick();
  assert.equal(ui.actions.at(-1).id, 2);
  assert.equal(ui.actions.at(-1).active, true);
  assert.equal('url' in ui.actions.at(-1), false);
});

test('a late status response from Flow cannot replace the Playground status', async () => {
  let finishFlow;
  const flowStatus = new Promise(resolve => { finishFlow = resolve; });
  const ui = setup({ statuses: { 1: flowStatus } }); await settle();
  ui.get('service-playground').onclick(); await settle();
  finishFlow({ applied: true }); await settle();
  assert.equal(ui.get('status').textContent, 'Каталог Playground открыт.');
  assert.equal(ui.get('open').textContent, 'Открыть Playground');
});

test('profile setup is shown as a waiting step and hides the retry button', async () => {
  const ui = setup({ active: 2, statuses: { 2: { state: 'playground-setup', applied: false } } });
  await settle();
  assert.match(ui.get('status').textContent, /Завершите настройку профиля/);
  assert.equal(ui.get('reload').hidden, true);
  assert.equal(ui.get('enabled').checked, true);
});

test('Firefox update check is available and downloads its own archive without Chrome restart actions', async () => {
  const ui = setup({ firefox: true }); await settle();
  assert.equal(typeof ui.get('check-update').onclick, 'function');
  assert.equal(typeof ui.get('version-btn').onclick, 'function');
  await ui.get('check-update').onclick();
  assert.match(ui.get('modal-body').innerHTML, /about:debugging/);
  assert.equal(ui.get('modal-actions').children.some(item => item.textContent.includes('перезапустить')), false);
  await ui.get('modal-actions').children[0].onclick();
  assert.match(ui.actions.at(-1).url, /Unlock-Flow-Firefox-v1\.4\.6\.zip\?t=/);
  assert.equal(ui.actions.some(item => item.storage), false);
});

test('Chrome update check still downloads the Chrome archive and saves update instructions', async () => {
  const ui = setup(); await settle(); await ui.get('check-update').onclick();
  assert.match(ui.get('modal-body').innerHTML, /Распакуйте ZIP/);
  await ui.get('modal-actions').children[0].onclick();
  assert.match(ui.actions.at(-1).url, /Unlock-Flow-v1\.4\.6\.zip\?t=/);
  assert.equal(ui.actions.some(item => item.storage), true);
});

test('offline Firefox fallback downloads the installed Firefox version', async () => {
  const ui = setup({ firefox: true, fetchFails: true }); await settle(); await ui.get('check-update').onclick();
  await ui.get('modal-actions').children[0].onclick();
  assert.match(ui.actions.at(-1).url, /Unlock-Flow-Firefox-v1\.4\.5\.zip\?t=/);
});

test('Firefox compares its platform version rather than a newer Chrome-only version', async () => {
  const ui = setup({ firefox: true, remote: { version: '1.4.6', firefoxVersion: '1.4.5' } });
  await settle(); await ui.get('check-update').onclick();
  assert.equal(ui.get('modal-title').textContent, 'У вас последняя версия');
});

test('Playground failure offers DNS instructions instead of an endless retry message', async () => {
  const ui = setup({ active: 2, statuses: { 2: { state: 'playground-entry-failed', applied: false } } });
  await settle();
  assert.equal(ui.get('dns-help').hidden, false);
  assert.match(ui.get('status').textContent, /Не удалось открыть Playground автоматически.*DNS/);
  assert.equal(ui.get('service-hint').hidden, true);
  assert.match(ui.get('dns-help-note').textContent, /разные DNS.*GeoHide/);
  assert.match(ui.get('dns-help-retry').textContent, /само DNS не меняет/);
  ui.get('lang-en').onclick(); await settle();
  assert.match(ui.get('status').textContent, /Could not open Playground automatically.*DNS/);
  assert.equal(ui.get('dns-help-title').textContent, 'How to set up DNS');
});

test('DNS help is hidden when switching from a failed Playground to Flow or disabling help', async () => {
  const ui = setup({ active: 2, statuses: { 2: { state: 'playground-entry-failed', applied: false } } });
  await settle();
  ui.get('service-flow').onclick(); await settle();
  assert.equal(ui.get('dns-help').hidden, true);
  assert.equal(ui.get('service-hint').hidden, false);
  ui.get('service-playground').onclick(); await settle();
  assert.equal(ui.get('dns-help').hidden, false);
  ui.get('enabled').checked = false;
  await ui.get('enabled').listeners.change();
  assert.equal(ui.get('dns-help').hidden, true);
});

test('Playground blocked page shows DNS guidance but successful entry and profile setup do not', async () => {
  for (const status of [
    { state: 'not-loaded', isBlockedPage: true },
    { state: 'playground-setup', isBlockedPage: true },
    { state: 'playground-ready', applied: true }
  ]) {
    const ui = setup({ active: 2, statuses: { 2: status } }); await settle();
    assert.equal(ui.get('dns-help').hidden, status.state !== 'not-loaded');
  }
});

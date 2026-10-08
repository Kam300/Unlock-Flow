const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

function setup({ enabled = true, active = 1, statuses = {} } = {}) {
  const elements = new Map();
  function element() {
    const classes = new Set();
    return { textContent: '', innerHTML: '', hidden: false, checked: false, dataset: {},
      closest(selector) { return selector === 'section' ? null : this; },
      attributes: {}, listeners: {},
      setAttribute(k, v) { this.attributes[k] = v; }, removeAttribute(k) { delete this.attributes[k]; },
      addEventListener(k, fn) { this.listeners[k] = fn; }, appendChild() {},
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
  const actions = [];
  const chrome = {
    runtime: { getURL: () => 'chrome-extension://test/', getManifest: () => ({ version: '1.4.5' }), async sendMessage(message) {
      actions.push(message); enabled = message.enabled; return { ok: true };
    } },
    scripting: { async getRegisteredContentScripts() { return enabled ? [{ id: 'flow-helper' }] : []; } },
    storage: { local: { async get() { return {}; } } },
    tabs: {
      async query(options) { return options.active ? tabs.filter(t => t.active) : tabs; },
      async get(id) { return tabs.find(t => t.id === id); },
      async sendMessage(id) { return statuses[id] || { applied: true, state: id === 2 ? 'playground-ready' : 'armed' }; },
      async update(id, values) { actions.push({ id, ...values }); Object.assign(tabs.find(t => t.id === id), values); return tabs.find(t => t.id === id); },
      async create(values) { actions.push({ create: true, ...values }); },
      async reload(id) { actions.push({ reload: id }); },
    },
  };
  const context = { document, chrome, window: { matchMedia: () => ({ matches: false }), close() {} },
    localStorage: { getItem() { return null; }, setItem() {} }, URL, setTimeout() {}, clearTimeout() {} };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', 'popup.js'), 'utf8'), context);
  return { get: id => document.getElementById(id), actions, tabs };
}
const settle = () => new Promise(resolve => setImmediate(resolve));

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

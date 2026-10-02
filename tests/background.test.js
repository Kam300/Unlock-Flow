const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function createWorker(enabled = false) {
  const events = {};
  const badges = new Map();
  const timers = [];
  const callbacks = [];
  const writes = [];
  let queryFails = false;
  const event = name => ({ addListener(fn) { events[name] = fn; } });
  const chrome = {
    runtime: { id: 'unlock-flow', onInstalled: event('installed'), onStartup: event('startup'), onMessage: event('message') },
    scripting: {
      async getRegisteredContentScripts() {
        if (queryFails) throw new Error('Registration unavailable');
        return enabled ? [{ id: 'flow-helper' }] : [];
      },
      async registerContentScripts() { enabled = true; },
      async unregisterContentScripts() { enabled = false; }
    },
    action: {
      async setBadgeText({ tabId, text }) { badges.set(tabId ?? 'global', text); writes.push(text); },
      async setBadgeBackgroundColor() {},
      async setTitle() {}
    },
    tabs: {
      onUpdated: event('updated'),
      async query() { return [{ id: 1 }, { id: 2 }]; },
      sendMessage(id, message, callback) { callbacks.push(callback); }
    }
  };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', 'background.js'), 'utf8'), {
    chrome, console, setTimeout(fn) { timers.push(fn); }
  });
  const flush = async () => {
    for (let i = 0; i < 4; i++) await new Promise(resolve => setImmediate(resolve));
  };
  const send = message => new Promise(resolve => {
    events.message(message, { id: chrome.runtime.id, tab: { id: 1 } }, resolve);
  });
  return { events, badges, timers, callbacks, writes, flush, send,
    failRegistrationQuery() { queryFails = true; } };
}

test('disabled helper stays OFF during loading and page notifications', async () => {
  const worker = createWorker();
  await worker.flush();
  assert.deepEqual([...worker.badges.values()], ['OFF', 'OFF', 'OFF']);
  worker.events.updated(1, { status: 'loading' }, { url: 'https://flow.google.com/' });
  worker.events.message({ type: 'flowApplied' }, { id: 'unlock-flow', tab: { id: 1 } }, () => {});
  worker.events.message({ type: 'flowBlocked' }, { id: 'unlock-flow', tab: { id: 2 } }, () => {});
  worker.timers.forEach(fn => fn());
  await worker.flush();
  assert(worker.writes.every(text => text === 'OFF'));
});

test('switching OFF clears tab overrides and rejects late callbacks and timers', async () => {
  const worker = createWorker(true);
  await worker.flush();
  worker.events.updated(1, { status: 'complete' }, { url: 'https://flow.google.com/' });
  worker.events.message({ type: 'flowApplied' }, { id: 'unlock-flow', tab: { id: 1 } }, () => {});
  await worker.flush();
  assert.equal(worker.badges.get(1), 'OK');
  assert.equal((await worker.send({ type: 'setEnabled', enabled: false })).ok, true);
  assert([...worker.badges.values()].every(text => text === 'OFF'));
  worker.writes.length = 0;
  worker.callbacks[0]({ applied: true });
  worker.timers.forEach(fn => fn());
  await worker.flush();
  worker.timers.forEach(fn => fn());
  await worker.flush();
  assert(worker.writes.length > 0);
  assert(worker.writes.every(text => text === 'OFF'));
});

test('repeating OFF reconciles stale overrides and switching ON updates all tabs', async () => {
  const worker = createWorker();
  await worker.flush();
  worker.badges.set(1, 'ON');
  await worker.send({ type: 'setEnabled', enabled: false });
  assert.equal(worker.badges.get(1), 'OFF');
  await worker.send({ type: 'setEnabled', enabled: true });
  assert([...worker.badges.values()].every(text => text === 'ON'));
});

test('a failed state check reports ERR instead of assuming ON', async () => {
  const worker = createWorker();
  await worker.flush();
  worker.failRegistrationQuery();
  worker.events.startup();
  await worker.flush();
  assert([...worker.badges.values()].every(text => text === 'ERR'));
});

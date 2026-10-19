const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

test('status uses the live catalog and route instead of a stale diagnostic', () => {
  let listener, visible = false;
  let diagnostic = { state: 'playground-entry', applied: 0 };
  const location = { origin: 'https://playground.google', pathname: '/explore', href: 'https://playground.google/explore' };
  const context = {
    location, URL, window: {}, getComputedStyle: () => ({ visibility: 'visible' }),
    document: {
      documentElement: { getAttribute: () => JSON.stringify(diagnostic) },
      querySelectorAll: selector => selector.startsWith('input') && visible ? [{ type: 'search', getClientRects: () => [{}], closest: () => null, getAttribute: () => null }] : []
    },
    chrome: { runtime: { id: 'test', sendMessage: async () => {}, onMessage: { addListener(fn) { listener = fn; } } } },
    setTimeout() {}
  };
  for (const file of ['playground-state.js', 'status.js']) vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), context);
  const read = () => { let result; listener({ type: 'status' }, { id: 'test' }, value => { result = value; }); return result; };
  assert.equal(read().state, 'playground-entry');
  visible = true;
  assert.equal(read().state, 'playground-ready');
  diagnostic = { state: 'playground-entry-failed', applied: 0 };
  assert.equal(read().applied, true);
  location.pathname = '/region-unavailable';
  assert.equal(read().state, 'playground-entry-failed');
  assert.equal(read().isBlockedPage, true);
  location.pathname = '/explore';
  assert.equal(read().isBlockedPage, false);
  visible = false;
  diagnostic = { state: 'playground-ready', applied: 1 };
  assert.equal(read().state, 'playground-entry');
  assert.equal(read().applied, false);
});

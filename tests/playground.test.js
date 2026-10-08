const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '..', 'playground.js'), 'utf8');

function run(page, lastAttempt = null, origin = 'https://playground.google') {
  const attrs = new Map(), storage = new Map(), timers = new Map(), events = new Map();
  let now = Date.now(), timerId = 0, dialog = false;
  if (lastAttempt) storage.set('uf_playground_entry_attempt', String(lastAttempt));
  const location = { origin, pathname: page, href: origin + page, replace(url) { this.redirect = url; } };
  let callback, links = [], clicks = 0, logoClicks = 0, disconnected = false, guarded = false;
  const control = { getClientRects: () => [{}], contains: () => false, click() {
    clicks++;
    const event = { target: control, preventDefault() { guarded = true; } };
    events.get('click')?.(event);
  } };
  const logo = { href: origin + '/explore', querySelector: () => null, getAttribute: () => null, click() { logoClicks++; } };
  const menu = { href: origin + '/explore', querySelector: () => control };
  const context = {
    window: { addEventListener(k, fn) { events.set(k, fn); }, removeEventListener(k) { events.delete(k); } }, location, URL,
    Date: class extends Date { static now() { return now; } },
    getComputedStyle: () => ({ visibility: 'visible' }),
    document: { readyState: 'complete', documentElement: { setAttribute(k, v) { attrs.set(k, v); } },
      querySelectorAll(selector) { return selector === 'a[href]' ? links : dialog ? [{ getClientRects: () => [{}] }] : []; } },
    sessionStorage: { getItem(k) { return storage.get(k); }, setItem(k, v) { storage.set(k, v); }, removeItem(k) { storage.delete(k); } },
    MutationObserver: class { constructor(fn) { callback = fn; } observe() {} disconnect() { disconnected = true; } },
    setTimeout(fn, delay) { timers.set(++timerId, { fn, due: now + delay }); return timerId; },
    clearTimeout(id) { timers.delete(id); }
  };
  vm.runInNewContext(source, context);
  return { location, storage, timers, attrs, context,
    diagnostic() { return JSON.parse(attrs.get('data-flow-local-diagnostic')); },
    mountMenu() { links = [logo, menu]; callback(); },
    setupProfile(value) { dialog = value; callback(); },
    advance(ms) {
      const end = now + ms;
      for (;;) {
        const next = [...timers].filter(([,t]) => t.due <= end).sort((a,b) => a[1].due - b[1].due)[0];
        if (!next) break;
        now = next[1].due; timers.delete(next[0]); next[1].fn();
      }
      now = end;
    },
    enterCatalog() { location.pathname = '/explore'; links = [{ href: origin + '/game/123' }]; callback(); },
    get clicks() { return clicks; }, get logoClicks() { return logoClicks; }, get guarded() { return guarded; },
    get disconnected() { return disconnected; } };
}

test('blocking page opens the user-verified entry URL', () => {
  const app = run('/region-unavailable');
  assert.equal(app.location.redirect, 'https://playground.google/404?login_success=1&pli=1');
});

test('404 waits for page readiness and clicks the navigation button instead of the logo', () => {
  const app = run('/404', Date.now());
  app.mountMenu(); app.mountMenu();
  assert.equal(app.clicks, 0);
  app.advance(1000);
  assert.equal(app.clicks, 1);
  assert.equal(app.logoClicks, 0);
  assert.equal(app.guarded, true);
  assert.equal(app.location.redirect, undefined);
  assert.equal(app.diagnostic().applied, 0);
  app.enterCatalog();
  assert.equal(app.diagnostic().state, 'playground-ready');
  assert.equal(app.diagnostic().applied, 1);
  assert(app.disconnected);
  assert.equal(app.storage.get('uf_playground_entry_attempt'), undefined);
});

test('a failed entry does not endlessly redirect', () => {
  const app = run('/region-unavailable', Date.now());
  assert.equal(app.location.redirect, undefined);
  assert.equal(app.diagnostic().state, 'playground-entry-failed');
});

test('missing app navigation reports failure without claiming success', () => {
  const app = run('/404'); app.advance(30000);
  assert.equal(app.diagnostic().state, 'playground-entry-failed');
  assert.equal(app.diagnostic().applied, 0);
  assert(app.disconnected);
});

test('an unhandled navigation retries at most three times without full navigation', () => {
  const app = run('/404'); app.mountMenu(); app.advance(30000);
  assert.equal(app.clicks, 3);
  assert.equal(app.location.redirect, undefined);
  assert.equal(app.diagnostic().state, 'playground-entry-failed');
});

test('first-time profile setup waits beyond the timeout and continues after the dialog closes', () => {
  const app = run('/404'); app.mountMenu(); app.setupProfile(true); app.advance(90000);
  assert.equal(app.diagnostic().state, 'playground-setup');
  assert.equal(app.clicks, 0);
  assert.equal(app.disconnected, false);
  app.setupProfile(false);
  assert.equal(app.clicks, 1);
  app.enterCatalog();
  assert.equal(app.diagnostic().state, 'playground-ready');
});

test('Flow pages are untouched by the Playground helper', () => {
  const app = run('/404', null, 'https://flow.google.com');
  assert.equal(app.attrs.size, 0);
  assert.equal(app.location.redirect, undefined);
});

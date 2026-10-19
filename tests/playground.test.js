const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = ['playground-state.js', 'playground.js'].map(file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8')).join('\n');

function run(page, lastAttempt = null, origin = 'https://playground.google', script = source) {
  const attrs = new Map(), storage = new Map(), timers = new Map(), events = new Map();
  let now = Date.now(), timerId = 0, dialog = false, search = false, hidden = false;
  const visibleElement = () => ({ getClientRects: () => hidden ? [] : [{}], closest: () => null, getAttribute: () => null });
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
      querySelectorAll(selector) {
        if (selector === 'a[href]') return links;
        if (selector.startsWith('dialog')) return dialog ? [visibleElement()] : [];
        return search ? [{ ...visibleElement(), type: 'search' }] : [];
      } },
    sessionStorage: { getItem(k) { return storage.get(k); }, setItem(k, v) { storage.set(k, v); }, removeItem(k) { storage.delete(k); } },
    MutationObserver: class { constructor(fn) { callback = fn; } observe() {} disconnect() { disconnected = true; } },
    setTimeout(fn, delay) { timers.set(++timerId, { fn, due: now + delay }); return timerId; },
    clearTimeout(id) { timers.delete(id); }
  };
  vm.runInNewContext(script, context);
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
    enterCatalog() { location.pathname = '/explore'; links = [{ ...visibleElement(), href: origin + '/game/123' }]; callback(); },
    showSearch(isHidden = false) { search = true; hidden = isHidden; callback(); },
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

test('direct explore navigation detects the catalog after its search UI loads', () => {
  const app = run('/explore');
  assert.equal(app.diagnostic().state, 'playground-entry');
  app.showSearch(true);
  assert.equal(app.diagnostic().state, 'playground-entry');
  app.showSearch();
  assert.equal(app.diagnostic().state, 'playground-ready');
  assert.equal(app.clicks, 0);
  assert.equal(app.timers.size, 0);
});

test('direct explore waits for profile setup before declaring the catalog ready', () => {
  const app = run('/explore');
  app.setupProfile(true);
  app.showSearch();
  assert.equal(app.diagnostic().state, 'playground-setup');
  app.advance(90000);
  app.setupProfile(false);
  assert.equal(app.diagnostic().state, 'playground-ready');
});

const userscript = fs.readFileSync(path.join(__dirname, '../tampermonkey/unlock-flow.user.js'), 'utf8');

test('Tampermonkey build redirects Playground blocking pages with the same cooldown', () => {
  const app = run('/region-unavailable', null, 'https://playground.google', userscript);
  assert.equal(app.location.redirect, 'https://playground.google/404?login_success=1&pli=1');
  const recent = run('/region-unavailable', Date.now(), 'https://playground.google', userscript);
  assert.equal(recent.location.redirect, undefined);
  assert.equal(recent.diagnostic().state, 'playground-entry-failed');
});

test('Tampermonkey build waits for the Playground profile and continues to the catalog', () => {
  const app = run('/404', null, 'https://playground.google', userscript);
  app.mountMenu(); app.setupProfile(true); app.advance(90000);
  assert.equal(app.diagnostic().state, 'playground-setup');
  assert.equal(app.clicks, 0);
  app.setupProfile(false);
  assert.equal(app.clicks, 1);
  app.enterCatalog();
  assert.equal(app.diagnostic().state, 'playground-ready');
  assert.equal(app.disconnected, true);
});

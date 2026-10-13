const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { buildUserscript } = require('../pack-userscript');
const source = fs.readFileSync(path.join(__dirname, '../tampermonkey/unlock-flow.user.js'), 'utf8').replace(/\r\n/g, '\n');

test('installable userscript is current and contains the shared helpers without remote dependencies', () => {
  const { version, text } = buildUserscript();
  assert.equal(source, text);
  assert.match(source, new RegExp(`// @version\\s+${version.replace(/\./g, '\\.')}\\n`));
  assert.deepEqual([...source.matchAll(/^\/\/ @match\s+(.+)$/gm)].map(match => match[1]), [
    'https://flow.google.com/*', 'https://playground.google/*'
  ]);
  assert.match(source, /^\/\/ @run-at\s+document-start$/m);
  assert.match(source, /^\/\/ @sandbox\s+raw$/m);
  assert.match(source, /^\/\/ @grant\s+none$/m);
  assert.match(source, /^\/\/ @noframes$/m);
  assert.doesNotMatch(source, /^\/\/ @(?:require|connect)\s/m);
  const urls = [...source.matchAll(/^\/\/ @(?:updateURL|downloadURL)\s+(.+)$/gm)].map(match => match[1]);
  assert.deepEqual(urls, Array(2).fill('https://raw.githubusercontent.com/Kam300/Unlock-Flow/main/tampermonkey/unlock-flow.user.js'));
});

function flowPage({ frame = false, origin = 'https://flow.google.com' } = {}) {
  const attrs = new Map();
  class XHR { open() {} get response() { return ''; } get responseText() { return ''; } }
  let requests = 0;
  const originalFetch = async () => { requests++; return new Response('{"isCountrySupported":false}'); };
  const window = { fetch: originalFetch };
  window.self = window;
  window.top = frame ? {} : window;
  const commonJs = { exports: { pageShim: true } };
  const context = {
    window, module: commonJs, XMLHttpRequest: XHR, URL, Headers, Response, Request, TextEncoder,
    location: { origin, href: origin + '/' },
    document: { documentElement: { setAttribute(k, v) { attrs.set(k, v); } } }
  };
  vm.runInNewContext(source, context);
  return { context, originalFetch, requests: () => requests, attrs };
}

test('userscript patches page fetch even when the page exposes a CommonJS module', async () => {
  const app = flowPage();
  const response = await app.context.window.fetch('/api/checkAppAvailability');
  assert.equal((await response.json()).isCountrySupported, true);
  assert.equal(app.context.module.exports.pageShim, true);
  assert.equal(app.context.module.exports.patch, undefined);
  assert.equal(app.context.window.__flowLocalDiagnostic.applied, 1);
  assert.equal(app.requests(), 1);
});

test('running alongside an existing helper does not wrap fetch a second time', () => {
  const app = flowPage();
  const firstFetch = app.context.window.fetch;
  vm.runInNewContext(source, app.context);
  assert.equal(app.context.window.fetch, firstFetch);
});

test('frames and unrelated sites are not modified', () => {
  for (const options of [{ frame: true }, { origin: 'https://example.com' }]) {
    const app = flowPage(options);
    assert.equal(app.context.window.fetch, app.originalFetch);
    assert.equal(app.attrs.size, 0);
  }
});

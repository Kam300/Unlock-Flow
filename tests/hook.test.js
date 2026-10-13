const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { patch, patchAvailability, targetKind } = require('../hook.js');
const source = fs.readFileSync(path.join(__dirname, '..', 'hook.js'), 'utf8');
const BASE = 'https://flow.google.com/';
const BATCH = BASE + '_/AiSandboxAngularFrontend/data/batchexecute?rpcids=cPZSdc';
const AVAILABILITY = BASE + 'api/checkAppAvailability';

function batch({ before = false, byteLength = true, offset = 1, rpc = 'cPZSdc' } = {}) {
  const payload = Array(32).fill(null);
  payload[2] = 'Тест 🌊';
  payload[30] = before;
  payload[31] = false;
  const line = JSON.stringify([['wrb.fr', rpc, JSON.stringify(payload)]]);
  const size = (byteLength ? Buffer.byteLength(line) : line.length) + offset;
  return `)]}'\n\n${size}\n${line}\n`;
}

function run(fetchImpl = async () => new Response('{}')) {
  const requests = [], attrs = new Map();
  class XHR {
    constructor() { this.readyState = 4; this.status = 200; this.responseType = ''; this.body = ''; }
    open(method, url) { this.url = url; }
    get responseText() {
      if (this.responseType === 'json') throw new Error('InvalidStateError');
      return this.body;
    }
    get response() { return this.body; }
  }
  const window = { fetch(...args) { requests.push(args); return fetchImpl(...args); } };
  const context = {
    window, XMLHttpRequest: XHR, URL, Request, Response, Headers, TextEncoder,
    location: { origin: new URL(BASE).origin, href: BASE },
    document: { documentElement: { setAttribute(k, v) { attrs.set(k, v); } } }
  };
  vm.runInNewContext(source, context);
  return { window, XHR, requests, diagnostic: () => JSON.parse(attrs.get('data-flow-local-diagnostic')) };
}

for (const byteLength of [true, false]) {
  for (const offset of [0, 1, 2]) {
    test(`Flow config preserves framing with Unicode (${byteLength ? 'bytes' : 'characters'}, offset ${offset})`, () => {
      const result = patch(batch({ byteLength, offset }));
      const lines = result.body.split('\n');
      const payload = JSON.parse(JSON.parse(lines[3])[0][2]);
      assert.equal(payload[30], true);
      assert.equal(payload[31], false);
      assert.equal(payload[2], 'Тест 🌊');
      assert.equal(Number(lines[2]), (byteLength ? Buffer.byteLength(lines[3]) : lines[3].length) + offset);
    });
  }
}

test('unexpected positional RPC schemas and other RPCs are rejected', () => {
  assert.throws(() => patch(batch({ before: 1 })), /schema/);
  assert.throws(() => patch(batch({ rpc: 'KV2T2d' })), /Expected one/);
});

test('availability handles nested tRPC country flags in both naming styles', () => {
  const input = [{ result: { data: { json: { isCountrySupported: false, is_country_supported: false, availabilityState: 'UNAVAILABLE' } } } }];
  const value = JSON.parse(patchAvailability(JSON.stringify(input)).body)[0].result.data.json;
  assert.deepEqual(value, { isCountrySupported: true, is_country_supported: true, availabilityState: 'AVAILABLE' });
});

test('explicit region states can be patched without changing unknown fields', () => {
  const value = JSON.parse(patchAvailability('{"availabilityState":"REGION_UNAVAILABLE","credits":0}').body);
  assert.deepEqual(value, { availabilityState: 'AVAILABLE', credits: 0 });
});

test('age restrictions and unrecognized age flags leave the whole response untouched', () => {
  for (const age of [{ isAgeSupported: false }, { is_age_supported: false }, { isAgeSupported: 'false' }, { availabilityState: 'AGE_RESTRICTED' }]) {
    const raw = JSON.stringify({ result: { isCountrySupported: false, age } });
    assert.equal(patchAvailability(raw).body, raw);
  }
});

test('unknown restrictions, already available responses and errors remain byte-for-byte intact', () => {
  for (const raw of [
    '{ "availabilityState": "UNAVAILABLE", "credits": 0 }',
    '{ "availabilityState": "BILLING_REQUIRED" }',
    '{ "isCountrySupported": "false" }',
    '{ "isCountrySupported": true, "isAgeSupported": true }',
    '{ "error": { "data": { "isCountrySupported": false } } }',
    'null'
  ]) assert.equal(patchAvailability(raw).body, raw);
});

test('availability patch does not change the age flag or unrelated restriction states', () => {
  const raw = '{"isCountrySupported":false,"isAgeSupported":true,"availabilityState":"BILLING_REQUIRED"}';
  assert.deepEqual(JSON.parse(patchAvailability(raw).body), {
    isCountrySupported: true, isAgeSupported: true, availabilityState: 'BILLING_REQUIRED'
  });
});

test('only same-origin known endpoint paths are eligible', () => {
  assert.equal(targetKind(BATCH, BASE), 'batch');
  assert.equal(targetKind('/api/fetchToolAvailability?x=1', BASE), 'availability');
  assert.equal(targetKind('/trpc/general.checkAppAvailability', BASE), 'availability');
  assert.equal(targetKind('/trpc/general.checkAppAvailability,general.fetchToolAvailability', BASE), 'availability');
  for (const url of [
    'https://example.com/api/checkAppAvailability',
    '/api/profile?next=checkAppAvailability',
    '/api/checkAppAvailabilityBackup',
    '/trpc/general.profile',
    '/trpc/general.checkAppAvailability,general.profile',
    '/_/AiSandboxAngularFrontend/data/batchexecute?rpcids=KV2T2d'
  ]) assert.equal(targetKind(url, BASE), null);
});

test('fetch preserves HTTP status and other headers while removing stale body headers', async () => {
  const app = run(async () => new Response('{"isCountrySupported":false}', {
    status: 201, statusText: 'Created', headers: { 'content-length': '28', 'content-encoding': 'gzip', 'x-request-id': '123' }
  }));
  const response = await app.window.fetch(new Request(AVAILABILITY));
  assert.equal(response.status, 201);
  assert.equal(response.statusText, 'Created');
  assert.equal(response.headers.get('content-length'), null);
  assert.equal(response.headers.get('content-encoding'), null);
  assert.equal(response.headers.get('x-request-id'), '123');
  assert.deepEqual(await response.json(), { isCountrySupported: true });
  assert.equal(app.requests.length, 1);
  assert.equal(app.diagnostic().applied, 1);
});

test('malformed JSON returns the readable original response without repeating the request', async () => {
  const original = new Response('not json');
  const app = run(async () => original);
  const response = await app.window.fetch(AVAILABILITY, { method: 'POST', body: '{}' });
  assert.equal(response, original);
  assert.equal(await response.text(), 'not json');
  assert.equal(app.requests.length, 1);
  assert.equal(app.diagnostic().state, 'schema mismatch — unchanged');
});

test('unexpected legacy batch schema also returns its original response once', async () => {
  const original = new Response(batch({ before: 1 }));
  const app = run(async () => original);
  assert.equal(await app.window.fetch(BATCH), original);
  assert.equal(await original.text(), batch({ before: 1 }));
  assert.equal(app.requests.length, 1);
});

test('HTTP and network errors are preserved without retry or success diagnostics', async () => {
  const original = new Response('{"isCountrySupported":false}', { status: 403 });
  const app = run(async () => original);
  assert.equal(await app.window.fetch(AVAILABILITY), original);
  assert.equal(app.diagnostic().applied, 0);
  const failure = new Error('network down');
  const offline = run(async () => { throw failure; });
  await assert.rejects(offline.window.fetch(BATCH), error => error === failure);
  assert.equal(offline.requests.length, 1);
});

test('unrelated and unchanged responses keep their original identity and body', async () => {
  const original = new Response('{ "isCountrySupported": true }');
  const app = run(async () => original);
  assert.equal(await app.window.fetch(AVAILABILITY), original);
  assert.equal(original.bodyUsed, false);
  assert.equal(app.diagnostic().applied, 0);
  assert.equal(await app.window.fetch(BASE + 'profile'), original);
});

test('a later malformed availability response does not erase an applied Flow config', async () => {
  const app = run(async url => new Response(url === BATCH ? batch() : 'invalid'));
  await app.window.fetch(BATCH);
  await app.window.fetch(AVAILABILITY);
  assert.equal(app.diagnostic().state, 'applied');
  assert.equal(app.diagnostic().applied, 1);
});

test('XHR text responses are patched once and a reused request resets its cache', () => {
  const app = run();
  const xhr = new app.XHR();
  xhr.open('GET', AVAILABILITY);
  xhr.body = '{"isCountrySupported":false}';
  assert.deepEqual(JSON.parse(xhr.responseText), { isCountrySupported: true });
  assert.equal(xhr.response, xhr.responseText);
  assert.equal(app.diagnostic().applied, 1);
  xhr.open('GET', BASE + 'profile');
  assert.equal(xhr.responseText, xhr.body);
});

test('XHR JSON responses preserve JSON type and the original object', () => {
  const app = run();
  const xhr = new app.XHR();
  xhr.open('GET', AVAILABILITY);
  xhr.responseType = 'json';
  xhr.body = { isCountrySupported: false };
  xhr.readyState = 3;
  assert.equal(xhr.response, xhr.body);
  xhr.readyState = 4;
  assert.equal(xhr.response.isCountrySupported, true);
  assert.equal(xhr.body.isCountrySupported, false);
  assert.throws(() => xhr.responseText, /InvalidStateError/);
  assert.equal(app.diagnostic().applied, 1);
});

test('XHR errors remain unchanged and partial text is held until completion', () => {
  const app = run();
  const xhr = new app.XHR();
  xhr.open('GET', AVAILABILITY);
  xhr.body = '{"isCountrySupported":false}';
  xhr.readyState = 3;
  assert.equal(xhr.responseText, '');
  xhr.readyState = 4;
  xhr.status = 500;
  assert.equal(xhr.responseText, xhr.body);
  assert.equal(app.diagnostic().applied, 0);
});

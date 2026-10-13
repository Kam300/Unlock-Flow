(() => {
  'use strict';

  function patchBatchExecute(rawBody) {
    const lines = rawBody.split('\n');
    let beforeValue;
    let matchCount = 0;

    for (let i = 0; i < lines.length; i++) {
      if (!lines[i].startsWith('[[')) continue;
      let parsedLine;
      try {
        parsedLine = JSON.parse(lines[i]);
      } catch {
        continue;
      }
      let modified = false;
      for (const item of parsedLine) {
        if (!Array.isArray(item) || item[0] !== 'wrb.fr' || item[1] !== 'cPZSdc') continue;

        const payload = JSON.parse(item[2]);
        if (!Array.isArray(payload) || payload.length < 32 || (payload[30] !== null && typeof payload[30] !== 'boolean')) {
          throw new Error('Unexpected config schema');
        }

        beforeValue = payload[30];
        payload[30] = true;
        matchCount++;
        item[2] = JSON.stringify(payload);
        modified = true;
      }
      if (modified) {
        const trimmedLine = lines[i].replace(/\r$/, '');
        const prevLength = Number(lines[i - 1]);
        const encLength = s => new TextEncoder().encode(s).length;
        const charLength = s => s.length;
        const lenFns = [encLength, charLength];
        const matchedLenFn = lenFns.find(fn => [0, 1, 2].includes(prevLength - fn(trimmedLine)));
        if (!matchedLenFn) throw new Error('Unexpected frame length');
        const newLine = JSON.stringify(parsedLine);
        lines[i - 1] = String(prevLength + matchedLenFn(newLine) - matchedLenFn(trimmedLine));
        lines[i] = newLine;
      }
    }
    if (matchCount !== 1) throw new Error('Expected one config response');
    return { body: lines.join('\n'), before: beforeValue };
  }

  function patchAvailability(rawBody) {
    const data = JSON.parse(rawBody);
    const countryKeys = ['isCountrySupported', 'is_country_supported'];
    const ageKeys = ['isAgeSupported', 'is_age_supported'];
    const regionStates = new Set(['REGION_UNAVAILABLE', 'COUNTRY_UNSUPPORTED', 'UNAVAILABLE_IN_REGION', 'UNAVAILABLE_IN_COUNTRY']);
    const visit = (value, callback) => {
      if (!value || typeof value !== 'object') return;
      if (Object.hasOwn(value, 'error') && value.error != null) return;
      callback(value);
      for (const child of Object.values(value)) visit(child, callback);
    };

    // A country flag must never override an explicit age restriction.
    let ageRestricted = false;
    visit(data, value => {
      if (ageKeys.some(key => Object.hasOwn(value, key) && value[key] !== true) ||
          (typeof value.availabilityState === 'string' && /AGE|UNDERAGE|MINOR/.test(value.availabilityState))) {
        ageRestricted = true;
      }
    });
    if (ageRestricted) return { body: rawBody };

    let changed = false;
    visit(data, value => {
      const countryBlocked = countryKeys.some(key => value[key] === false);
      for (const key of countryKeys) {
        if (value[key] === false) {
          value[key] = true;
          changed = true;
        }
      }
      if (regionStates.has(value.availabilityState) ||
          (countryBlocked && value.availabilityState === 'UNAVAILABLE')) {
        value.availabilityState = 'AVAILABLE';
        changed = true;
      }
    });
    return { body: changed ? JSON.stringify(data) : rawBody };
  }

  function targetKind(url, base) {
    try {
      const parsed = new URL(url, base);
      if (parsed.origin !== new URL(base).origin) return null;
      if (parsed.pathname.endsWith('/_/AiSandboxAngularFrontend/data/batchexecute') &&
          parsed.searchParams.get('rpcids')?.split(',').includes('cPZSdc')) return 'batch';
      // Match endpoint names, not query parameters or unrelated general.* RPCs.
      if (/\/(?:fetchToolAvailability|checkAppAvailability)\/?$/.test(parsed.pathname)) return 'availability';
      const trpc = parsed.pathname.match(/\/trpc\/([^/]+)$/);
      if (trpc && trpc[1].split(',').every(name =>
        ['general.fetchToolAvailability', 'general.checkAppAvailability'].includes(name))) return 'availability';
    } catch {}
    return null;
  }

  function patchResponse(rawBody, kind) {
    return kind === 'batch' ? patchBatchExecute(rawBody) : patchAvailability(rawBody);
  }

  // Node module export for testing
  if (typeof module === 'object' && module.exports) {
    module.exports = { patch: patchBatchExecute, patchAvailability, targetKind };
    return;
  }

  if (location.origin !== 'https://flow.google.com' || window.__flowLocalDiagnostic) return;

  const diag = (window.__flowLocalDiagnostic = {
    state: 'armed',
    applied: 0
  });

  function setDiagnostic(state, before) {
    Object.assign(diag, { state, before });
    const setAttr = () => {
      document.documentElement.setAttribute('data-flow-local-diagnostic', JSON.stringify(diag));
    };
    if (document.documentElement) setAttr();
    else document.addEventListener('DOMContentLoaded', setAttr, { once: true });
  }

  function recordPatch(patched, raw, kind) {
    if (kind === 'batch' || patched.body !== raw) {
      diag.applied++;
      setDiagnostic('applied', patched.before);
    }
  }

  function recordMismatch() {
    // An unrelated availability response must not erase a successful unlock.
    if (!diag.applied) setDiagnostic('schema mismatch — unchanged');
  }

  // Intercept XMLHttpRequest
  const isFlowTarget = new WeakMap();
  const patchedMap = new WeakMap();
  const proto = XMLHttpRequest.prototype;
  const origOpen = proto.open;

  proto.open = function(method, url, ...args) {
    isFlowTarget.set(this, targetKind(url, location.href));
    patchedMap.delete(this);
    return Reflect.apply(origOpen, this, [method, url, ...args]);
  };

  for (const prop of ['responseText', 'response']) {
    const descriptor = Object.getOwnPropertyDescriptor(proto, prop);
    if (!descriptor?.get || !descriptor.configurable) continue;

    Object.defineProperty(proto, prop, {
      ...descriptor,
      get() {
        const raw = Reflect.apply(descriptor.get, this, []);
        const kind = isFlowTarget.get(this);
        const jsonResponse = prop === 'response' && this.responseType === 'json';
        if (!kind || (typeof raw !== 'string' && !jsonResponse)) {
          return raw;
        }
        if (this.readyState === 3 && typeof raw === 'string') {
          diag.heldPartial = true;
          return '';
        }
        if (this.readyState !== 4) {
          return raw;
        }
        if (!patchedMap.has(this)) {
          try {
            if (this.status < 200 || this.status >= 300) {
              patchedMap.set(this, raw);
              return raw;
            }
            const text = jsonResponse ? JSON.stringify(raw) : raw;
            const patched = patchResponse(text, kind);
            patchedMap.set(this, patched.body === text ? raw : jsonResponse ? JSON.parse(patched.body) : patched.body);
            recordPatch(patched, text, kind);
          } catch {
            patchedMap.set(this, raw);
            recordMismatch();
          }
        }
        return patchedMap.get(this);
      }
    });
  }

  // Also intercept fetch just in case modern client uses it
  const origFetch = window.fetch;
  if (typeof origFetch === 'function') {
    window.fetch = async function(resource, init) {
      const url = typeof Request === 'function' && resource instanceof Request ? resource.url : String(resource);
      const kind = targetKind(url, location.href);
      if (!kind) {
        return origFetch.apply(this, arguments);
      }
      // Send the request once; parsing failures return its untouched response.
      const response = await origFetch.apply(this, arguments);
      if (!response.ok) return response;
      try {
        const clone = response.clone();
        const text = await clone.text();
        const patched = patchResponse(text, kind);
        if (patched.body === text) {
          recordPatch(patched, text, kind);
          return response;
        }
        const headers = new Headers(response.headers);
        headers.delete('content-length');
        headers.delete('content-encoding');
        const result = new Response(patched.body, {
          status: response.status,
          statusText: response.statusText,
          headers
        });
        recordPatch(patched, text, kind);
        return result;
      } catch {
        recordMismatch();
        return response;
      }
    };
  }

  setDiagnostic('armed');
})();

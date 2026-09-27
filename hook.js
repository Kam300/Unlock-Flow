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

  // Node module export for testing
  if (typeof module === 'object' && module.exports) {
    module.exports = { patch: patchBatchExecute };
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

  function isTargetUrl(url) {
    try {
      const parsed = new URL(url, location.href);
      const rpcids = parsed.searchParams.get('rpcids');
      const hasRpc = rpcids ? rpcids.split(',').includes('cPZSdc') : false;
      return (
        parsed.origin === location.origin &&
        parsed.pathname.endsWith('/_/AiSandboxAngularFrontend/data/batchexecute') &&
        hasRpc
      );
    } catch {
      return false;
    }
  }

  // Intercept XMLHttpRequest
  const isFlowTarget = new WeakMap();
  const patchedMap = new WeakMap();
  const proto = XMLHttpRequest.prototype;
  const origOpen = proto.open;

  proto.open = function(method, url, ...args) {
    isFlowTarget.set(this, isTargetUrl(url));
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
        if (!isFlowTarget.get(this) || typeof raw !== 'string') {
          return raw;
        }
        if (this.readyState === 3) {
          diag.heldPartial = true;
          return '';
        }
        if (this.readyState !== 4) {
          return raw;
        }
        if (!patchedMap.has(this)) {
          try {
            const patched = patchBatchExecute(raw);
            patchedMap.set(this, patched.body);
            diag.applied++;
            setDiagnostic('applied', patched.before);
          } catch {
            patchedMap.set(this, raw);
            setDiagnostic('schema mismatch — unchanged');
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
      const url = resource instanceof Request ? resource.url : String(resource);
      if (!isTargetUrl(url)) {
        return origFetch.apply(this, arguments);
      }
      try {
        const response = await origFetch.apply(this, arguments);
        const clone = response.clone();
        const text = await clone.text();
        const patched = patchBatchExecute(text);
        diag.applied++;
        setDiagnostic('applied', patched.before);
        return new Response(patched.body, {
          status: response.status,
          statusText: response.statusText,
          headers: response.headers
        });
      } catch {
        setDiagnostic('schema mismatch — unchanged');
        return origFetch.apply(this, arguments);
      }
    };
  }

  setDiagnostic('armed');
})();
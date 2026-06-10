window.ApiClient = (function() {
  const pending = new Map();
  const retryDelay = [1000, 2000, 4000];

  function dedupKey(config, systemPrompt, userMessage) {
    return `${config.provider}|${config.model}|${systemPrompt.slice(0, 80)}|${userMessage.slice(0, 80)}`;
  }

  async function fetchWithTimeout(url, opts, timeoutMs) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(url, { ...opts, signal: ctrl.signal });
      return res;
    } finally {
      clearTimeout(timer);
    }
  }

  async function callWithRetry(fn, retries = 2) {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await fn();
      } catch (e) {
        if (e.name === 'AbortError') throw e;
        if (attempt === retries) throw e;
        await new Promise(r => setTimeout(r, retryDelay[attempt] || 4000));
      }
    }
  }

  function wrapCallAI() {
    const origCallAI = window.callAI;
    if (!origCallAI) return;
    window.callAI = async function(config, systemPrompt, userMessage, externalSignal) {
      const key = dedupKey(config, systemPrompt, userMessage);
      if (pending.has(key)) return pending.get(key);

      const promise = callWithRetry(async () => {
        const ctrl = new AbortController();
        const timeoutMs = (config.provider === 'ollama') ? 120000 : 30000;
        const timer = setTimeout(() => ctrl.abort(), timeoutMs);
        let mergedSignal = ctrl.signal;

        if (externalSignal) {
          const parent = externalSignal;
          parent.addEventListener('abort', () => { if (!ctrl.signal.aborted) ctrl.abort(); }, { once: true });
          mergedSignal = combineSignals([ctrl.signal, externalSignal]);
        }

        try {
          const result = await origCallAI.call(window, config, systemPrompt, userMessage, mergedSignal);
          return result;
        } finally {
          clearTimeout(timer);
        }
      });

      pending.set(key, promise);
      promise.finally(() => pending.delete(key));
      return promise;
    };
  }

  function combineSignals(signals) {
    const ctrl = new AbortController();
    const check = () => { if (signals.some(s => s.aborted)) ctrl.abort(); };
    signals.forEach(s => {
      if (s.aborted) { ctrl.abort(); return; }
      s.addEventListener('abort', check, { once: true });
    });
    return ctrl.signal;
  }

  return { wrapCallAI, callWithRetry, fetchWithTimeout, dedupKey };
})();

// ─────────────────────────────────────────────────────────────────────────────
// app.js  —  State, generate logic, history, presentation, export, events
// Depends on: config.js, user-config.js, api.js, render.js
// ─────────────────────────────────────────────────────────────────────────────

let _abortController = null;
let _autoSaveTimer = null;
let _lastFocusedEl = null;
let _focusTrapEl = null;

// ── LoadingManager — named operation tracking ─────────────────────────────────

window.LoadingManager = {
  _ops: new Map(),
  start(key, label) {
    this._ops.set(key, { label, active: true });
  },
  progress(key, step, total) {
    const op = this._ops.get(key);
    if (op) op.step = step; op.total = total;
  },
  end(key) {
    this._ops.delete(key);
  },
  isActive() { return this._ops.size > 0; },
  getActive() { return Array.from(this._ops.values()).map(o => o.label); },
};

// ── Focus trap ────────────────────────────────────────────────────────────────

function trapFocus(container) {
  _focusTrapEl = container;
  _lastFocusedEl = document.activeElement;
  const focusable = container.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
  if (focusable.length) focusable[0].focus();
}

function releaseFocus() {
  _focusTrapEl = null;
  if (_lastFocusedEl && typeof _lastFocusedEl.focus === 'function') {
    _lastFocusedEl.focus();
  }
  _lastFocusedEl = null;
}

function handleFocusTrap(e) {
  if (!_focusTrapEl || e.key !== 'Tab') return;
  const focusable = _focusTrapEl.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
  if (!focusable.length) return;
  const first = focusable[0], last = focusable[focusable.length - 1];
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
}

// ── State ─────────────────────────────────────────────────────────────────────

let STATE = {
  topic: '', inputMode: 'topic', customPrompt: '', contextInjector: '',
  showContextInjector: false,
  waitingForReview: false, reviewPrompt: null, reviewPromptOriginal: null, reviewWhyItWorks: null,
  loading: false, loadingStep: 0, error: null,
  adversarialPrompt: null, whyItWorks: null,
  hallucinatorResults: [], activeResultId: null,
  activeMode: 'inducer', cmActiveIdx: null,
  gameStates: {}, expandedSentences: {}, manualOverrides: {},
  confidenceThreshold: DEFAULT_CONFIDENCE_THRESHOLD,
  autoSaveConfig: true,
  autoLoadConfig: true,
  isReadOnly: false,
  openRefCats: {},
  analyst: { id: 'analyst', name: 'Analyst AI', provider: 'anthropic', model: 'claude-sonnet-4-20250514', apiKey: '', baseUrl: '' },
  hallucinators: [{ id: 'h-default', name: 'Hallucinator #1', provider: 'groq', model: 'llama-3.1-8b-instant', apiKey: '', baseUrl: '', enabled: true, persona: 'unguarded', customSystemPrompt: '' }],
  // New feature state
  verificationResults: null,
  verificationLoading: false,
  playgroundVariants: null,
  playgroundRunId: null,
  analysisHistory: [],
};

// ── Debounced auto-save ───────────────────────────────────────────────────────

async function autoSaveSettings() {
  if (!STATE.autoSaveConfig) return;
  clearTimeout(_autoSaveTimer);
  _autoSaveTimer = setTimeout(async () => {
    try {
      if (typeof DB_saveSessionState !== 'undefined') {
        await DB_saveSessionState(STATE);
      }
    } catch (e) {
      console.warn('Auto-save settings failed:', e);
    }
  }, 400);
}

async function autoSaveSessionState() {
  if (!STATE.autoSaveConfig) return;
  try {
    if (typeof DB_saveSessionState !== 'undefined') {
      await DB_saveSessionState(STATE);
    }
  } catch (e) {
    console.warn('Auto-save session state failed:', e);
  }
}

// ── Theme system (6 themes with particle effects) ─────────────────────────────

const THEME_EFFECTS = { fireworks: 1, sakura: 1, stargazer: 1, aurora: 1 };

function setTheme(themeId) {
  document.documentElement.setAttribute('data-theme', themeId);
  try { localStorage.setItem('hallucination-theme', themeId); } catch (e) { }
  // Start/stop particle engines
  if (THEME_EFFECTS[themeId]) {
    ParticleEngine.start(themeId);
  } else {
    ParticleEngine.stop();
  }
  render();
}

function toggleThemeMenu() {
  document.getElementById('theme-menu')?.classList.toggle('hidden');
}

function closeThemeMenu() {
  document.getElementById('theme-menu')?.classList.add('hidden');
}

function initTheme() {
  let theme = 'midnight';
  try {
    const saved = localStorage.getItem('hallucination-theme');
    const valid = ['midnight', 'daybreak', 'fireworks', 'sakura', 'stargazer', 'aurora', 'synthwave', 'anime'];
    if (valid.includes(saved)) theme = saved;
  } catch (e) { }
  document.documentElement.setAttribute('data-theme', theme);
  if (THEME_EFFECTS[theme]) {
    setTimeout(() => ParticleEngine.start(theme), 100);
  }
}

// ── Subtitle click easter egg ────────────────────────────────────
let _subtitleEggIdx = 0;
function handleSubtitleClick() {
  _subtitleEggIdx = (_subtitleEggIdx + 1) % SUBTITLE_MSGS.length;
  STATE._subtitleEgg = _subtitleEggIdx;
  render();
}

// ── Topic easter egg triggers ────────────────────────────────────
const TOPIC_EGGS = {
  'cow level': '🐄 There is no cow level. But you found the secret!',
  'dragon': '🐉 OVER 9000!!! ...I mean, generating now.',
  ' 42': '🤔 The answer to life, the universe, and everything is 42. But what was the question?',
  'the cake': '🎂 The cake is a lie. The hallucination is real, though.',
  'monkey island': '🏴‍☠️ I can see you\'re a fan of adventure games. How appropriate, you fight like a dairy farmer!',
  'zelda': '🗡️ It\'s dangerous to go alone! Take this analysis.',
  'one piece': '🏴‍☠️ The One Piece is real! (The hallucination, that is.)',
};
function checkTopicEgg(topic) {
  const lower = topic.toLowerCase();
  for (const [key, msg] of Object.entries(TOPIC_EGGS)) {
    if (lower.includes(key)) {
      setTimeout(() => showToast(msg, 'info', 3500), 500);
      return;
    }
  }
}

// ── Logo click easter egg ────────────────────────────────────────
let _logoClickCount = 0;
function handleLogoClick() {
  _logoClickCount++;
  const msgs = ['⬡', '⬡⬡', '⬡⬡⬡', '⬡⬡⬡⬡', '🎉 You found me!', '✨ Keep clicking!', '🌟 Almost there…', '💫 ONE MORE!', '🏆 EASTER EGG UNLOCKED!'];
  if (_logoClickCount <= msgs.length) {
    showToast(msgs[_logoClickCount - 1], 'info', 2000);
  }
  if (_logoClickCount === 5) {
    // Sparkle burst
    for (let i = 0; i < 12; i++) {
      setTimeout(() => {
        const el = document.createElement('div');
        el.className = 'easter-sparkle';
        el.textContent = ['✨', '⭐', '🌟', '💫', '⬡', '◆'][Math.floor(Math.random() * 6)];
        el.style.left = (Math.random() * 80 + 10) + 'vw';
        el.style.top = (Math.random() * 60 + 20) + 'vh';
        document.body.appendChild(el);
        setTimeout(() => el.remove(), 900);
      }, i * 80);
    }
    _logoClickCount = 0;
  }
}

// ── Konami code easter egg ────────────────────────────────────────
let _konamiBuffer = [];
document.addEventListener('keydown', function _konamiListener(e) {
  const code = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
  _konamiBuffer.push(e.key);
  if (_konamiBuffer.length > code.length) _konamiBuffer.shift();
  if (_konamiBuffer.length === code.length && _konamiBuffer.every((k, i) => k === code[i])) {
    _konamiBuffer = [];
    document.body.classList.toggle('konami-active');
    showToast(document.body.classList.contains('konami-active') ? '⬆⬆⬇⬇⬅➡⬅➡BA — Konami Code activated! 🌈' : 'Konami Code deactivated', 'success', 3000);
    if (document.body.classList.contains('konami-active')) {
      setTimeout(() => { document.body.classList.remove('konami-active'); }, 8000);
    }
  }
});

// ── Core state updater ────────────────────────────────────────────────────────

function setState(updates) { STATE = { ...STATE, ...updates }; render(); postRenderViz(); }

// ── Animation helpers (animejs) ────────────────────────────────────────────────

function animateEntrance(selector, delay = 80) {
  if (typeof anime === 'undefined') return;
  const els = document.querySelectorAll(selector);
  if (!els.length) return;
  anime({
    targets: els,
    opacity: [0, 1],
    translateY: [12, 0],
    delay: anime.stagger(delay),
    duration: 400,
    easing: 'easeOutCubic'
  });
}

function animateValue(el, start, end, suffix = '') {
  if (typeof anime === 'undefined' || !el) return;
  const obj = { val: start };
  anime({
    targets: obj,
    val: end,
    duration: 800,
    easing: 'easeOutCubic',
    update: () => { el.textContent = Math.round(obj.val) + suffix; }
  });
}

function animateCounters() {
  document.querySelectorAll('.stat-value').forEach(el => {
    const raw = el.textContent.replace('%', '').replace('×', '');
    const num = parseInt(raw, 10);
    if (!isNaN(num)) {
      el.textContent = '0';
      animateValue(el, 0, num, raw.includes('%') ? '%' : '');
    }
  });
}

function postRenderViz() {
  setTimeout(() => {
    try {
      const rid = STATE.activeResultId;
      if (!rid) return;
      const result = STATE.hallucinatorResults.find(r => r.id === rid);
      if (!result?.analysis) return;

      if (STATE.activeMode === 'visualize') {
        if (document.getElementById('ribbon-' + rid)) {
          renderUncertaintyRibbon('ribbon-' + rid, result);
          renderSankeyDiagram('sankey-' + rid, result);
          renderRadarChart('radar-' + rid, STATE.hallucinatorResults, STATE.manualOverrides);
          renderHeatmapMatrix('heatmap-' + rid, STATE.hallucinatorResults, STATE.manualOverrides);
          renderCategoryTimeline('timeline-' + rid, result);
          // Animate all SVG charts
          document.querySelectorAll('.viz-container svg').forEach(svg => animateSVGDraw(svg, 100, 500));
        }
      }

      if (STATE.activeMode === 'analytics') {
        const trendEl = document.getElementById('trend-' + rid);
        if (trendEl) {
          // Load history and render trend
          if (typeof DB_loadAnalyticsHistory !== 'undefined') {
            DB_loadAnalyticsHistory(rid, 20).then(history => {
              if (history.length >= 2) {
                renderTrendChart('trend-' + rid, history, result.name);
              } else {
                trendEl.innerHTML = '<div style="text-align:center;color:var(--text-muted);padding:1rem;font-size:.75rem">Need more history for trend. Each completed run adds a data point.</div>';
              }
            }).catch(() => { });
          }
        }
      }
    } catch (e) { console.warn('Post-render error:', e); }
  }, 150);
}
function setError(msg) { setState({ error: msg, loading: false, loadingStep: 0 }); }

// ── Validation ────────────────────────────────────────────────────────────────

function validateReadyToRun() {
  if (!STATE.analyst.apiKey && STATE.analyst.provider !== 'ollama') {
    setError('Analyst AI has no API key. Open ⚙ Settings to configure it.'); return false;
  }
  const ready = STATE.hallucinators.filter(h => h.enabled && (h.apiKey || h.provider === 'ollama'));
  if (!ready.length) {
    setError('No ready hallucinators. Open ⚙ Settings, enable at least one, and add its API key.'); return false;
  }
  return true;
}

// ── Generate — handles all three input modes ──────────────────────────────────

async function handleGenerate(topicOverride) {
  if (STATE.loading || STATE.waitingForReview) return;

  if (STATE.inputMode === 'custom') {
    const prompt = STATE.customPrompt.trim();
    if (!prompt) { setError('Please write a prompt first.'); return; }
    if (!validateReadyToRun()) return;
    STATE.error = null;
    STATE.whyItWorks = null;
    STATE.reviewPrompt = null;
    STATE.reviewPromptOriginal = null;
    STATE.reviewWhyItWorks = null;
    await runHallucinatorsWithPrompt(prompt, null, null);
    return;
  }

  const topic = (topicOverride || STATE.topic).trim();
  if (!topic) return;
  if (!validateReadyToRun()) return;
  if (topicOverride) STATE.topic = topicOverride;
  checkTopicEgg(topic);

  _abortController = new AbortController();
  setState({
    loading: true, loadingStep: 1, error: null, adversarialPrompt: null, whyItWorks: null,
    reviewPrompt: null, reviewPromptOriginal: null, reviewWhyItWorks: null,
    hallucinatorResults: [], activeResultId: null, cmActiveIdx: null,
    gameStates: {}, expandedSentences: {}, manualOverrides: {}, waitingForReview: false, isReadOnly: false
  });
  try {
    const raw = await callAI(STATE.analyst, ADVERSARIAL_SYSTEM, `Topic: ${topic}`, _abortController.signal);
    const pd = JSON.parse(stripMarkdown(raw));

    if (STATE.inputMode === 'review') {
      setState({ loading: false, loadingStep: 0, reviewPrompt: pd.prompt, reviewPromptOriginal: pd.prompt, reviewWhyItWorks: pd.why_it_works, waitingForReview: true, whyItWorks: null });
      return;
    }
    await runHallucinatorsWithPrompt(pd.prompt, pd.why_it_works, topic);
  } catch (err) {
    if (err.name === 'AbortError') setState({ loading: false, loadingStep: 0, error: 'Generation cancelled.' });
    else setError(`Prompt generation failed: ${err.message}`);
  }
}

async function handleRunReview() {
  const prompt = document.getElementById('review-prompt-textarea')?.value?.trim();
  if (!prompt) return;
  const isUnchanged = prompt === STATE.reviewPromptOriginal;
  STATE.reviewPrompt = prompt;
  STATE.waitingForReview = false;
  STATE.whyItWorks = isUnchanged ? STATE.reviewWhyItWorks : null;
  _abortController = new AbortController();
  await runHallucinatorsWithPrompt(prompt, isUnchanged ? STATE.reviewWhyItWorks : null, STATE.topic);
}

async function handleRegenerateReview() {
  STATE.waitingForReview = false;
  await handleGenerate();
}

// ── Core: hallucinators + analyst ─────────────────────────────────────────────

async function runHallucinatorsWithPrompt(prompt, whyItWorks, topic) {
  const ready = STATE.hallucinators.filter(h => h.enabled && (h.apiKey || h.provider === 'ollama'));
  const signal = _abortController?.signal;
  const initial = ready.map(h => ({ id: h.id, name: h.name, provider: h.provider, model: h.model, status: 'loading', response: null, analysis: null, riskScan: null, error: null }));
  const ctxPrefix = STATE.contextInjector.trim() ? STATE.contextInjector.trim() + '\n\n' : '';
  const fullPrompt = ctxPrefix + prompt;

  setState({ loading: true, loadingStep: 2, adversarialPrompt: prompt, whyItWorks: whyItWorks, hallucinatorResults: initial, manualOverrides: {}, expandedSentences: {} });

  const hallucinatorResponses = await Promise.allSettled(
    ready.map(h => {
      const sysPrompt = h.persona === 'custom'
        ? (h.customSystemPrompt || HALLUCINATOR_SYSTEM)
        : (HALLUCINATOR_PERSONAS[h.persona]?.systemPrompt || HALLUCINATOR_SYSTEM);
      return callAI(h, sysPrompt, fullPrompt, signal);
    })
  );

  if (signal?.aborted) { setState({ loading: false, loadingStep: 0, error: 'Generation cancelled.' }); return; }
  setState({ loadingStep: 3 });

  const topicLabel = topic || STATE.topic || 'this topic';
  const analysisPromises = hallucinatorResponses.map(async (result, i) => {
    const h = ready[i];
    const base = { id: h.id, name: h.name, provider: h.provider, model: h.model };
    if (result.status === 'rejected') return { ...base, status: 'error', response: null, analysis: null, riskScan: null, error: result.reason?.message || 'Request failed' };
    const response = result.value;
    const sentences = splitSentences(response);
    const riskScan = sentences.map(s => scanSentenceRisks(s));
    try {
      const ar = await callAI(STATE.analyst, ANALYST_SYSTEM, `Analyze sentences from an AI response about "${topicLabel}":\n${sentences.map((s, i) => `${i + 1}. ${s}`).join('\n')}`, signal);
      const analysis = JSON.parse(stripMarkdown(ar));
      return { ...base, status: 'complete', response, analysis: analysis.map((s, idx) => ({ ...s, index: idx })), riskScan, error: null };
    } catch (e) {
      return { ...base, status: 'analysis-failed', response, analysis: null, riskScan, error: `Analysis error: ${e.message}` };
    }
  });

  const finalResults = await Promise.all(analysisPromises);
  if (signal?.aborted) { setState({ loading: false, loadingStep: 0, error: 'Generation cancelled.' }); return; }

  const firstGood = finalResults.find(r => r.status === 'complete') || finalResults.find(r => r.status === 'analysis-failed') || finalResults[0];
  setState({ loading: false, loadingStep: 0, hallucinatorResults: finalResults, activeResultId: firstGood?.id || null });

  saveRunToHistory();
  const completedCount = finalResults.filter(r => r.status === 'complete').length;
  if (completedCount > 0) showToast(`${completedCount} model${completedCount > 1 ? 's' : ''} analyzed — run saved to history`, 'success');
  else showToast('Run complete — check individual model results', 'info');
}

function cancelGeneration() {
  if (_abortController) { _abortController.abort(); _abortController = null; }
  setState({ loading: false, loadingStep: 0, error: 'Generation cancelled.' });
}

// ── Session History ───────────────────────────────────────────────────────────

async function saveRunToHistory() {
  if (!STATE.adversarialPrompt || !STATE.hallucinatorResults.length) return;
  const item = {
    id: genId(),
    timestamp: Date.now(),
    topic: STATE.topic || STATE.customPrompt || 'Custom prompt',
    inputMode: STATE.inputMode,
    adversarialPrompt: STATE.adversarialPrompt,
    whyItWorks: STATE.whyItWorks,
    contextInjector: STATE.contextInjector,
    hallucinatorResults: STATE.hallucinatorResults,
    summary: {
      perModel: STATE.hallucinatorResults.filter(r => r.analysis).map(r => {
        const a = computeRunAnalytics(r, {});
        return { name: r.name, provider: r.provider, hallucinationRate: a ? a.hallucinationRate : 0, hallucinated: a ? a.hallucinated : 0, verifiable: a ? a.verifiable : 0 };
      })
    }
  };
  try {
    if (typeof DB_saveHistoryRun !== 'undefined') await DB_saveHistoryRun(item);
  } catch (e) { console.warn('IndexedDB save failed:', e); }
  await saveAnalyticsSnapshot();
}

async function deleteHistoryItem(id) {
  try { if (typeof DB_deleteHistoryRun !== 'undefined') await DB_deleteHistoryRun(id); }
  catch (e) { console.warn('IndexedDB delete failed:', e); }
  document.getElementById('hist-content').innerHTML = renderHistContent();
  showToast('Run deleted', 'info');
}

async function clearAllHistory() {
  if (!confirm('Clear all history? This cannot be undone.')) return;
  try { if (typeof DB_clearAllHistory !== 'undefined') await DB_clearAllHistory(); }
  catch (e) { console.warn('IndexedDB clear failed:', e); }
  document.getElementById('hist-content').innerHTML = renderHistContent();
  showToast('History cleared', 'info');
}

async function restoreHistoryRun(id) {
  let item = null;
  try {
    if (typeof DB_getHistoryRun !== 'undefined') item = await DB_getHistoryRun(id);
  } catch (e) { console.warn('IndexedDB get failed:', e); }
  if (!item) return;
  STATE = {
    ...STATE,
    topic: item.topic,
    inputMode: item.inputMode,
    adversarialPrompt: item.adversarialPrompt,
    whyItWorks: item.whyItWorks,
    contextInjector: item.contextInjector || '',
    hallucinatorResults: item.hallucinatorResults,
    activeResultId: item.hallucinatorResults.find(r => r.status === 'complete')?.id || item.hallucinatorResults[0]?.id || null,
    activeMode: 'inducer',
    cmActiveIdx: null,
    gameStates: {},
    expandedSentences: {},
    manualOverrides: {},
    isReadOnly: true,
    loading: false,
    error: null,
    waitingForReview: false,
  };
  closeHistPanel();
  render();
  showToast('Run restored — read-only', 'info');
}

// ── Toast system ──────────────────────────────────────────────────────────────

function showToast(message, type = 'info', duration = 3200, onRetry = null) {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const icons = { success: '✓', error: '⚠', info: '●' };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span class="toast-icon">${icons[type] || '●'}</span><span>${String(message)}</span>${onRetry ? '<button class="toast-retry" data-retry-action>↻ Retry</button>' : ''}`;
  container.appendChild(toast);
  if (onRetry) {
    toast.querySelector('[data-retry-action]')?.addEventListener('click', () => { toast.remove(); onRetry(); });
  }
  setTimeout(() => { toast.classList.add('out'); setTimeout(() => toast.remove(), 220); }, duration);
}

function withErrorBoundary(fn, context) {
  return async function (...args) {
    try {
      return await fn.apply(this, args);
    } catch (e) {
      const msg = `${context}: ${e.message}`;
      showToast(msg, 'error', 5000, () => { fn.apply(this, args); });
      console.error(context, e);
    }
  };
}

// ── Threshold slider ──────────────────────────────────────────────────────────

function handleThresholdChange(value) {
  STATE.confidenceThreshold = parseInt(value, 10);
  render();
}

// ── Presentation mode ─────────────────────────────────────────────────────────

function enterPresentation() {
  if (!STATE.adversarialPrompt) return;
  document.getElementById('present-overlay').classList.remove('hidden');
  updatePresentationOverlay();
}

function exitPresentation() {
  document.getElementById('present-overlay').classList.add('hidden');
}

function navigatePresentation(dir) {
  const results = STATE.hallucinatorResults.filter(r => r.analysis || r.status === 'analysis-failed');
  if (!results.length) return;
  const idx = results.findIndex(r => r.id === STATE.activeResultId);
  const nextIdx = (idx + dir + results.length) % results.length;
  setState({ activeResultId: results[nextIdx].id });
  updatePresentationOverlay();
}

// ── Export ────────────────────────────────────────────────────────────────────

function copyRunSummary() {
  if (!STATE.adversarialPrompt) return;
  let t = `AI HALLUCINATION ANALYSIS\n${'─'.repeat(40)}\n`;
  t += `Topic:    ${STATE.topic || STATE.customPrompt || '(custom prompt)'}\n`;
  t += `Date:     ${new Date().toLocaleString()}\n`;
  t += `Prompt:   "${STATE.adversarialPrompt}"\n`;
  if (STATE.whyItWorks) t += `Why:      ${STATE.whyItWorks}\n`;
  t += '\n';
  STATE.hallucinatorResults.forEach(r => {
    if (!r.analysis) return;
    const a = computeRunAnalytics(r, STATE.manualOverrides);
    t += `── ${r.name} (${r.provider} / ${r.model}) ──\n`;
    t += `Hallucination rate: ${a.hallucinationRate}% (${a.hallucinated}/${a.verifiable} verifiable)\n`;
    t += `Avg accuracy: ${a.avgAccuracy}%  |  Analyst certainty: ${a.avgCertainty}%\n\n`;
    r.analysis.filter(s => s.is_hallucination).forEach(s => {
      t += `  ✗ "${s.text}"\n     ${catLabel(s.category)} · ${s.explanation || ''}`;
      if (s.correct_version) t += `\n     Accurate version: ${s.correct_version}`;
      t += '\n\n';
    });
  });
  navigator.clipboard.writeText(t)
    .then(() => showToast('Summary copied to clipboard', 'success'))
    .catch(() => showToast('Clipboard access denied', 'error'));
  closeExportMenu();
}

function exportJSON() {
  if (!STATE.adversarialPrompt) return;
  const data = {
    exportedAt: new Date().toISOString(),
    topic: STATE.topic, inputMode: STATE.inputMode,
    adversarialPrompt: STATE.adversarialPrompt, whyItWorks: STATE.whyItWorks,
    contextInjector: STATE.contextInjector, confidenceThreshold: STATE.confidenceThreshold,
    hallucinatorResults: STATE.hallucinatorResults, manualOverrides: STATE.manualOverrides,
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `hallucination-${Date.now()}.json`; a.click();
  URL.revokeObjectURL(url);
  showToast('JSON exported', 'success');
  closeExportMenu();
}

function triggerPrint() { window.print(); closeExportMenu(); }

function closeExportMenu() {
  document.getElementById('export-menu')?.classList.add('hidden');
}

// ── Settings ──────────────────────────────────────────────────────────────────

function openSettings() { buildSettingsContent(); const el = document.getElementById('settings-overlay'); el.classList.remove('hidden'); trapFocus(el); }
function closeSettings() { document.getElementById('settings-overlay').classList.add('hidden'); releaseFocus(); }
function handleOverlayClick(e) { if (e.target === document.getElementById('settings-overlay')) closeSettings(); }

function buildSettingsContent() {
  const el = document.getElementById('settings-content'); if (el) el.innerHTML = renderSettingsContent();
}

async function saveSettings() {
  STATE.analyst = {
    id: 'analyst',
    name: (document.getElementById('analyst-name')?.value || '').trim() || 'Analyst AI',
    provider: document.getElementById('analyst-provider')?.value || 'anthropic',
    model: (document.getElementById('analyst-model')?.value || '').trim(),
    apiKey: (document.getElementById('analyst-apikey')?.value || '').trim(),
    baseUrl: (document.getElementById('analyst-baseurl')?.value || '').trim(),
  };
  STATE.hallucinators = STATE.hallucinators.map(h => {
    const pfx = 'h-' + h.id;
    return {
      ...h,
      name: (document.getElementById(`${pfx}-name`)?.value || h.name).trim(),
      provider: document.getElementById(`${pfx}-provider`)?.value || h.provider,
      model: (document.getElementById(`${pfx}-model`)?.value || h.model).trim(),
      apiKey: (document.getElementById(`${pfx}-apikey`)?.value || '').trim(),
      baseUrl: (document.getElementById(`${pfx}-baseurl`)?.value || '').trim(),
      enabled: document.getElementById(`h-enabled-${h.id}`)?.checked ?? h.enabled,
      persona: document.getElementById(`h-persona-${h.id}`)?.value || h.persona,
      customSystemPrompt: (document.getElementById(`h-sysprompt-${h.id}`)?.value || '').trim(),
    };
  });
  await autoSaveSessionState();
  closeSettings(); render();
  showToast('Settings saved', 'success');
}

function addHallucinatorEntry() {
  saveCurrentFormToState();
  STATE.hallucinators = [...STATE.hallucinators, {
    id: 'h-' + genId(), name: `Hallucinator #${STATE.hallucinators.length + 1}`,
    provider: 'groq', model: 'llama-3.1-8b-instant', apiKey: '', baseUrl: '',
    enabled: true, persona: 'unguarded', customSystemPrompt: '',
  }];
  buildSettingsContent();
}

function removeHallucinatorEntry(id) {
  saveCurrentFormToState();
  STATE.hallucinators = STATE.hallucinators.filter(h => h.id !== id);
  buildSettingsContent();
}

function saveCurrentFormToState() {
  STATE.analyst = {
    ...STATE.analyst,
    name: (document.getElementById('analyst-name')?.value || STATE.analyst.name).trim(),
    provider: document.getElementById('analyst-provider')?.value || STATE.analyst.provider,
    model: (document.getElementById('analyst-model')?.value || STATE.analyst.model).trim(),
    apiKey: (document.getElementById('analyst-apikey')?.value || STATE.analyst.apiKey).trim(),
    baseUrl: (document.getElementById('analyst-baseurl')?.value || STATE.analyst.baseUrl).trim(),
  };
  STATE.hallucinators = STATE.hallucinators.map(h => {
    const pfx = 'h-' + h.id;
    return {
      ...h,
      name: (document.getElementById(`${pfx}-name`)?.value || h.name).trim(),
      provider: document.getElementById(`${pfx}-provider`)?.value || h.provider,
      model: (document.getElementById(`${pfx}-model`)?.value || h.model).trim(),
      apiKey: (document.getElementById(`${pfx}-apikey`)?.value || h.apiKey).trim(),
      baseUrl: (document.getElementById(`${pfx}-baseurl`)?.value || h.baseUrl).trim(),
      enabled: document.getElementById(`h-enabled-${h.id}`)?.checked ?? h.enabled,
      persona: document.getElementById(`h-persona-${h.id}`)?.value || h.persona,
      customSystemPrompt: (document.getElementById(`h-sysprompt-${h.id}`)?.value || h.customSystemPrompt || '').trim(),
    };
  });
}

function handleProviderChange(prefix, newProvider) {
  // Update model datalist suggestions — IDs are always `${prefix}-model-list`
  const modelDatalist = document.getElementById(`${prefix}-model-list`);
  if (modelDatalist) modelDatalist.innerHTML = (PROVIDERS[newProvider]?.models || []).map(m => `<option value="${m}">`).join('');
  // Show/hide base URL row — ID is always `${prefix}-baseurl`
  const needsUrl = newProvider === 'ollama' || newProvider === 'custom';
  const urlInput = document.getElementById(`${prefix}-baseurl`);
  const urlRow = urlInput?.closest('.form-row');
  if (urlRow) urlRow.style.display = needsUrl ? '' : 'none';
  if (urlInput) {
    if (needsUrl && !urlInput.value) {
      // Only auto-fill the default URL for providers that actually need a configurable URL
      urlInput.value = PROVIDERS[newProvider]?.defaultBaseUrl || '';
    } else if (!needsUrl) {
      // Clear any stale URL when switching to a provider with a fixed, built-in endpoint.
      // Leaving it filled in causes the URL to persist in saved state and can be
      // mistaken for an API key on subsequent loads.
      urlInput.value = '';
    }
  }
  // Dim API key for Ollama (no key needed) — ID is always `${prefix}-apikey`
  const keyWrap = document.getElementById(`${prefix}-apikey`)?.parentElement;
  if (keyWrap) { keyWrap.style.opacity = newProvider === 'ollama' ? '0.4' : ''; keyWrap.style.pointerEvents = newProvider === 'ollama' ? 'none' : ''; }
}

function handlePersonaChange(hallucinatorId, newPersona) {
  const isCustom = newPersona === 'custom';
  const existing = document.querySelector(`#h-entry-${hallucinatorId} .h-custom-row`);
  if (isCustom && !existing) {
    const row = document.createElement('div');
    row.className = 'form-row col-1 h-custom-row';
    row.innerHTML = `<div><label class="field-label" for="h-sysprompt-${hallucinatorId}">Custom System Prompt</label><textarea id="h-sysprompt-${hallucinatorId}" style="min-height:80px" placeholder="Write the system prompt for this hallucinator…"></textarea></div>`;
    document.querySelector(`#h-entry-${hallucinatorId} .hint`)?.before(row);
  } else if (!isCustom && existing) {
    existing.remove();
  }
}

// ── Reference panel ───────────────────────────────────────────────────────────

function openRefPanel() {
  const el = document.getElementById('ref-content'); if (el) el.innerHTML = renderRefContent();
  const overlay = document.getElementById('ref-overlay'); overlay.classList.remove('hidden'); trapFocus(overlay);
}
function closeRefPanel() { document.getElementById('ref-overlay').classList.add('hidden'); releaseFocus(); }
function handleRefOverlayClick(e) { if (e.target === document.getElementById('ref-overlay')) closeRefPanel(); }

function toggleRefCat(id) {
  STATE.openRefCats = { ...STATE.openRefCats, [id]: !STATE.openRefCats[id] };
  const el = document.getElementById('ref-content'); if (el) el.innerHTML = renderRefContent();
}

// ── History panel ─────────────────────────────────────────────────────────────

function openHistPanel() {
  const el = document.getElementById('hist-content');
  if (el) {
    el.innerHTML = skeleton('history', 5);
    renderHistContent();
  }
  const overlay = document.getElementById('hist-overlay'); overlay.classList.remove('hidden'); trapFocus(overlay);
}
function closeHistPanel() { document.getElementById('hist-overlay').classList.add('hidden'); releaseFocus(); }
function handleHistOverlayClick(e) { if (e.target === document.getElementById('hist-overlay')) closeHistPanel(); }

// ── Game handlers ─────────────────────────────────────────────────────────────

function toggleGameSentence(resultId, idx) {
  const gs = STATE.gameStates[resultId] || { selected: new Set(), revealed: false };
  if (gs.revealed) return;
  const next = new Set(gs.selected); next.has(idx) ? next.delete(idx) : next.add(idx);
  STATE.gameStates = { ...STATE.gameStates, [resultId]: { ...gs, selected: next } }; render();
}
function submitGame(resultId) {
  const gs = STATE.gameStates[resultId] || { selected: new Set(), revealed: false };
  const result = STATE.hallucinatorResults.find(r => r.id === resultId);
  STATE.gameStates = { ...STATE.gameStates, [resultId]: { ...gs, revealed: true } }; render();
  // Victory fanfare easter egg: perfect score
  if (result?.analysis) {
    const hallSet = result.analysis.reduce((a, s, i) => { if (s.is_hallucination) a.push(i); return a; }, []);
    const cor = [...gs.selected].filter(i => hallSet.includes(i)).length;
    const fp = [...gs.selected].filter(i => !hallSet.includes(i)).length;
    if (cor === hallSet.length && fp === 0 && hallSet.length > 0) {
      showToast('🏆 PERFECT! You found every hallucination! 🏆', 'success', 5000);
    }
  }
}
function resetGame(resultId) {
  STATE.gameStates = { ...STATE.gameStates, [resultId]: { selected: new Set(), revealed: false } }; render();
}

// ── Misc handlers ─────────────────────────────────────────────────────────────

function toggleSentenceExpand(resultId, idx) {
  const key = `${resultId}-${idx}`;
  STATE.expandedSentences = { ...STATE.expandedSentences, [key]: !STATE.expandedSentences[key] }; render();
}

function toggleManualOverride(resultId, idx, type) {
  const key = `${resultId}-${idx}`, cur = STATE.manualOverrides[key], next = { ...STATE.manualOverrides };
  if (type === 'clear' || cur === type) delete next[key]; else next[key] = type;
  STATE.manualOverrides = next; render();
}

// ── Gallery handlers ───────────────────────────────────────────────────────────

function openGalleryPanel() {
  const el = document.getElementById('gallery-content'); if (el) el.innerHTML = renderGalleryContent();
  const overlay = document.getElementById('gallery-overlay'); overlay.classList.remove('hidden'); trapFocus(overlay);
}
function closeGalleryPanel() { document.getElementById('gallery-overlay').classList.add('hidden'); releaseFocus(); }
function handleGalleryOverlayClick(e) { if (e.target === document.getElementById('gallery-overlay')) closeGalleryPanel(); }

function buildGalleryContent() {
  const el = document.getElementById('gallery-content'); if (el) el.innerHTML = renderGalleryContent();
}

function loadGalleryPrompt(id) {
  const gallery = EDUCATIONAL_CONTENT.promptGallery || [];
  const item = gallery.find(p => p.id === id);
  if (!item) return;
  STATE.customPrompt = item.prompt;
  STATE.inputMode = 'custom';
  closeGalleryPanel();
  render();
  showToast('Loaded prompt from gallery — ready to run', 'success');
}

// ── Playground handlers ────────────────────────────────────────────────────────

function openPlayground() {
  const el = document.getElementById('playground-content'); if (el) el.innerHTML = renderPlaygroundContent();
  const overlay = document.getElementById('playground-overlay'); overlay.classList.remove('hidden'); trapFocus(overlay);
}

function closePlayground() { document.getElementById('playground-overlay').classList.add('hidden'); releaseFocus(); }
function handlePlaygroundOverlayClick(e) { if (e.target === document.getElementById('playground-overlay')) closePlayground(); }

async function runPlaygroundBatch() {
  if (STATE.loading) return;
  const includeOrig = document.getElementById('playground-include-original')?.checked;
  const cbs = document.querySelectorAll('.playground-variant-cb:checked');
  const variantIdxs = Array.from(cbs).map(cb => parseInt(cb.dataset.variantIdx, 10));
  if (!variantIdxs.length && !includeOrig) { showToast('Select at least one variant', 'error'); return; }

  const variants = generatePromptVariants(STATE.adversarialPrompt, 5);
  const prompts = [];
  if (includeOrig) prompts.push(STATE.adversarialPrompt);
  variantIdxs.forEach(i => { if (variants[i]) prompts.push(variants[i].prompt); });

  if (!prompts.length) return;
  showToast(`Running ${prompts.length} variants across hallucinators…`, 'info');
  closePlayground();

  // Run each prompt sequentially
  for (let i = 0; i < prompts.length; i++) {
    if (_abortController?.signal?.aborted) break;
    const origTopic = STATE.topic;
    await runHallucinatorsWithPrompt(prompts[i], STATE.whyItWorks, origTopic);
    // Brief pause between runs
    if (i < prompts.length - 1) await new Promise(r => setTimeout(r, 500));
  }
  showToast('Playground batch complete', 'success');
}

// ── Verification handlers ──────────────────────────────────────────────────────

async function openVerifyPanel() {
  // If no results yet, kick off verification
  if (!STATE.verificationResults && !STATE.verificationLoading) {
    STATE.verificationLoading = true;
    const el = document.getElementById('verify-content'); if (el) el.innerHTML = renderVerificationContent();
    document.getElementById('verify-overlay').classList.remove('hidden');

    const activeResult = STATE.hallucinatorResults.find(r => r.id === STATE.activeResultId);
    if (activeResult?.analysis) {
      try {
        const results = await batchVerifyClaims(activeResult.analysis, _abortController?.signal);
        STATE.verificationResults = results;
        STATE.verificationLoading = false;
        const cel = document.getElementById('verify-content'); if (cel) cel.innerHTML = renderVerificationContent();
        showToast('Verification complete', 'success');
      } catch (e) {
        STATE.verificationLoading = false;
        showToast('Verification failed: ' + e.message, 'error');
      }
    } else {
      STATE.verificationLoading = false;
      const cel = document.getElementById('verify-content'); if (cel) cel.innerHTML = '<div class="hist-empty">No analysis data to verify.</div>';
    }
  } else {
    const el = document.getElementById('verify-content'); if (el) el.innerHTML = renderVerificationContent();
    document.getElementById('verify-overlay').classList.remove('hidden');
    trapFocus(document.getElementById('verify-overlay'));
  }
}

function closeVerifyPanel() { document.getElementById('verify-overlay').classList.add('hidden'); releaseFocus(); }
function handleVerifyOverlayClick(e) { if (e.target === document.getElementById('verify-overlay')) closeVerifyPanel(); }

async function verifySentenceInline(resultId, idx) {
  const result = STATE.hallucinatorResults.find(r => r.id === resultId);
  const sentence = result?.analysis?.[idx];
  if (!sentence) return;

  const containerId = `verify-inline-${resultId}-${idx}`;
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = `<span style="font-size:.75rem;color:var(--text-muted)">🔍 Searching web sources...</span>`;

  try {
    const { verifySentence } = window.SearchAPI || {};
    if (!verifySentence) throw new Error('SearchAPI not available');

    const res = await verifySentence(sentence.text);
    
    // Evaluate correctness using key terms matching
    const snippets = res.results.map(sr => sr.snippet).join(' ').toLowerCase();
    const keyTerms = extractKeyTerms(sentence.text);
    let matchCount = 0;
    keyTerms.forEach(term => { if (snippets.includes(term.toLowerCase())) matchCount++; });
    const confidence = keyTerms.length ? Math.round((matchCount / keyTerms.length) * 100) : 0;
    
    let verified = null;
    if (confidence >= 60) verified = true;
    else if (confidence <= 30 && res.results.length > 0) verified = false;

    // Render inline results
    const statusIcon = verified === true ? '✅' : verified === false ? '❌' : '❓';
    const statusLabel = verified === true ? 'Supported' : verified === false ? 'Refuted' : 'Uncertain';
    const statusColor = verified === true ? 'var(--c-green-tx)' : verified === false ? 'var(--c-red-tx)' : 'var(--c-gray-tx)';
    
    let sourcesHTML = '';
    if (res.results.length) {
      sourcesHTML = `<div style="margin-top:.375rem; font-size:.6875rem; color:var(--text-muted)">
        <strong>Sources found:</strong><br>
        ${res.results.slice(0, 3).map(sr => `• <a href="${sr.url}" target="_blank" style="color:var(--purple); text-decoration:underline">${escHtml(sr.title)}</a> (${sr.source})`).join('<br>')}
      </div>`;
    }

    container.innerHTML = `
      <div style="background:var(--card-raised); border:1px solid var(--border); border-radius:var(--r-sm); padding:.5rem; margin-top:.25rem">
        <div style="display:flex; align-items:center; gap:.5rem">
          <span style="font-size:.875rem">${statusIcon}</span>
          <span style="font-weight:600; font-size:.8125rem; color:${statusColor}">${statusLabel}</span>
          <span style="margin-left:auto; font-family:var(--font-mono); font-size:.6875rem; color:var(--text-muted)">${confidence}% match</span>
        </div>
        ${sourcesHTML}
      </div>`;
    
    showToast('Inline verification complete', 'success');
  } catch (e) {
    console.error(e);
    container.innerHTML = `<button class="btn-ghost btn-sm" data-action="verify-claim-inline" data-result-id="${resultId}" data-idx="${idx}">🔍 Retry Verification</button>
      <div style="font-size:.6875rem; color:var(--c-red-tx); margin-top:.25rem">Verification failed: ${escHtml(e.message)}</div>`;
    showToast('Inline verification failed: ' + e.message, 'error');
  }
}

// ── Enhanced Export ────────────────────────────────────────────────────────────

function exportCSV() {
  if (!STATE.hallucinatorResults.length) return;
  const rows = [];
  const headers = ['Model', 'Provider', 'Sentence Index', 'Text', 'Verifiable', 'Accuracy Confidence', 'Analyst Certainty', 'Is Hallucination', 'Category', 'Explanation', 'Correct Version'];
  STATE.hallucinatorResults.filter(r => r.analysis).forEach(r => {
    r.analysis.forEach(s => {
      rows.push({
        Model: r.name, Provider: r.provider,
        'Sentence Index': s.index, Text: s.text,
        Verifiable: s.verifiable ? 'Yes' : 'No',
        'Accuracy Confidence': s.accuracy_confidence ?? '', 'Analyst Certainty': s.analyst_certainty ?? '',
        'Is Hallucination': s.is_hallucination ? 'Yes' : 'No',
        Category: catLabel(s.category), Explanation: s.explanation || '',
        'Correct Version': s.correct_version || '',
      });
    });
  });
  const csv = toCSV(rows, headers);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = `hallucination-${Date.now()}.csv`; a.click();
  URL.revokeObjectURL(url);
  showToast('CSV exported', 'success');
}

function exportJSONL() {
  if (!STATE.hallucinatorResults.length) return;
  const items = [];
  STATE.hallucinatorResults.filter(r => r.analysis).forEach(r => {
    r.analysis.forEach(s => {
      items.push({
        exportedAt: new Date().toISOString(),
        model: r.name, provider: r.provider,
        topic: STATE.topic, prompt: STATE.adversarialPrompt,
        sentence: s.text, index: s.index,
        verifiable: s.verifiable, accuracy: s.accuracy_confidence,
        certainty: s.analyst_certainty, isHallucination: s.is_hallucination,
        category: s.category, explanation: s.explanation,
        correctVersion: s.correct_version,
      });
    });
  });
  const jsonl = toJSONL(items);
  const blob = new Blob([jsonl], { type: 'application/jsonl;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = `hallucination-${Date.now()}.jsonl`; a.click();
  URL.revokeObjectURL(url);
  showToast('JSONL exported', 'success');
}

function exportCaseStudy() {
  if (!STATE.adversarialPrompt) return;
  let t = `# AI Hallucination Case Study\n\n`;
  t += `**Topic:** ${STATE.topic || STATE.customPrompt || '(custom)'}\n`;
  t += `**Date:** ${new Date().toLocaleString()}\n`;
  t += `**Prompt:** "${STATE.adversarialPrompt}"\n`;
  if (STATE.whyItWorks) t += `**Why it works:** ${STATE.whyItWorks}\n\n`;
  t += `---\n\n`;
  STATE.hallucinatorResults.filter(r => r.analysis).forEach(r => {
    const a = computeRunAnalytics(r, STATE.manualOverrides);
    t += `## ${r.name} (${r.provider})\n\n`;
    t += `- Hallucination Rate: ${a.hallucinationRate}%\n`;
    t += `- Verifiable Sentences: ${a.verifiable}\n`;
    t += `- Hallucinated: ${a.hallucinated}\n`;
    t += `- Accurate: ${a.accurate}\n`;
    t += `- Avg Accuracy: ${a.avgAccuracy}%\n`;
    t += `- Analyst Certainty: ${a.avgCertainty}%\n\n`;
    t += `### Sentence Breakdown\n\n`;
    r.analysis.forEach(s => {
      const level = s.is_hallucination ? '❌ HALLUCINATION' : s.verifiable ? '✅ ACCURATE' : '❓ UNKNOWN';
      t += `- **#${s.index + 1}** [${level}] ${s.text}\n`;
      if (s.is_hallucination) {
        t += `  - Category: ${catLabel(s.category)}\n`;
        t += `  - Explanation: ${s.explanation || 'N/A'}\n`;
        if (s.correct_version) t += `  - Correct Version: ${s.correct_version}\n`;
      }
    });
    t += '\n';
  });
  t += `---\n*Generated by AI Hallucination Prototype*\n`;
  const blob = new Blob([t], { type: 'text/markdown;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = `case-study-${Date.now()}.md`; a.click();
  URL.revokeObjectURL(url);
  showToast('Case study exported as Markdown', 'success');
}

// ── Helper: CSV/JSONL export ───────────────────────────────────────────────────

function toCSV(rows, headers) {
  const escape = (val) => {
    const s = String(val ?? '').replace(/"/g, '""');
    return /[",\n]/.test(s) ? `"${s}"` : s;
  };
  const headerLine = headers.map(escape).join(',');
  const dataLines = rows.map(r => headers.map(h => escape(r[h])).join(','));
  return [headerLine, ...dataLines].join('\n');
}

function toJSONL(items) {
  return items.map(item => JSON.stringify(item)).join('\n');
}

// ── Prompt mutation engine ─────────────────────────────────────────────────────

const PROMPT_MUTATIONS = [
  { name: 'Add Specificity', fn: p => p.replace(/\?$/, '') + '? Provide exact dates, names, and statistics.' },
  { name: 'Frame as Authority', fn: p => `As an expert in this field, ${p.charAt(0).toLowerCase() + p.slice(1)}` },
  { name: 'Request Citations', fn: p => p + ' Cite your sources with full references.' },
  { name: 'Add Time Pressure', fn: p => `Quickly: ${p}` },
  { name: 'Negate Premise', fn: p => `Why is it false that ${p.replace(/\?$/, '').toLowerCase()}?` },
];

function generatePromptVariants(basePrompt, count = 5) {
  const variants = [];
  for (let i = 0; i < Math.min(count, PROMPT_MUTATIONS.length); i++) {
    variants.push({ prompt: PROMPT_MUTATIONS[i].fn(basePrompt), mutation: PROMPT_MUTATIONS[i].name });
  }
  return variants;
}

// ── Batch verification using web search ────────────────────────────────────────

async function batchVerifyClaims(sentences, signal) {
  const { batchVerifySentences } = window.SearchAPI || {};
  const flagged = sentences
    .filter(s => s.verifiable && (s.is_hallucination || (s.accuracy_confidence ?? 100) < 70))
    .slice(0, 8);
  if (!flagged.length) return sentences.map(s => ({ verified: null, sources: [], summary: 'Not flagged', confidence: 0 }));

  const results = await batchVerifySentences(flagged, 2);

  return results.map((r, i) => {
    const sentence = flagged[i];
    if (!r.success) return { verified: null, sources: [], summary: r.data?.error || 'Search failed', confidence: 0 };
    const { data } = r;
    const snippets = data.results.map(sr => sr.snippet).join(' ').toLowerCase();
    const sentenceLower = sentence.text.toLowerCase();
    const keyTerms = extractKeyTerms(sentence.text);
    let matchCount = 0;
    keyTerms.forEach(term => { if (snippets.includes(term.toLowerCase())) matchCount++; });
    const confidence = keyTerms.length ? Math.round((matchCount / keyTerms.length) * 100) : 0;
    let verified = null;
    if (confidence >= 60) verified = true;
    else if (confidence <= 30 && data.results.length > 0) verified = false;
    return { sentence, verified, sources: data.results, summary: data.results.length ? `${data.results.length} sources found` : 'No sources found', confidence };
  });
}

function extractKeyTerms(text) {
  const terms = [];
  text.match(/\b\d[\d,.]*\s*(?:percent|%|million|billion|thousand|hundred|km|miles|kg|lbs|\$|USD)\b/gi)?.forEach(t => terms.push(t));
  text.match(/\b(?:1[0-9]{3}|20[0-2][0-9])\b/g)?.forEach(t => terms.push(t));
  text.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3}\b/g)?.forEach(t => terms.push(t));
  return [...new Set(terms)].slice(0, 5);
}

// ── Analysis History Tracking ──────────────────────────────────────────────────

async function saveAnalyticsSnapshot() {
  try {
    const snapshot = {
      id: genId(),
      timestamp: Date.now(),
      modelId: STATE.activeResultId,
      topic: STATE.topic,
      results: STATE.hallucinatorResults.filter(r => r.analysis).map(r => {
        const a = computeRunAnalytics(r, STATE.manualOverrides);
        return { name: r.name, provider: r.provider, model: r.model, ...a };
      }),
    };
    await DB_saveAnalyticsSnapshot(snapshot);
  } catch (e) { console.warn('Analytics save failed:', e); }
}

// ── Keyboard shortcuts ────────────────────────────────────────────────────────

document.addEventListener('keydown', function (e) {
  // Focus trap in modals
  handleFocusTrap(e);

  const tag = document.activeElement?.tagName?.toLowerCase();
  const inInput = tag === 'input' || tag === 'textarea' || tag === 'select';

  // Arrow key roving tabindex in sentence lists
  if (!inInput && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
    const list = document.querySelector('[role="list"]') || document.querySelector('.sentence-list');
    if (!list) return;
    const items = list.querySelectorAll('[role="listitem"], [data-sentence-index]');
    if (!items.length) return;
    const curIdx = Array.from(items).indexOf(document.activeElement);
    let nextIdx;
    if (e.key === 'ArrowDown') nextIdx = Math.min(curIdx + 1, items.length - 1);
    else nextIdx = Math.max(curIdx - 1, 0);
    if (nextIdx !== curIdx && nextIdx >= 0) {
      e.preventDefault();
      items[nextIdx].focus();
    }
    return;
  }

  // Esc closes any open overlay
  if (e.key === 'Escape') {
    if (!document.getElementById('present-overlay')?.classList.contains('hidden')) { exitPresentation(); return; }
    if (!document.getElementById('settings-overlay')?.classList.contains('hidden')) { closeSettings(); return; }
    if (!document.getElementById('ref-overlay')?.classList.contains('hidden')) { closeRefPanel(); return; }
    if (!document.getElementById('hist-overlay')?.classList.contains('hidden')) { closeHistPanel(); return; }
    if (!document.getElementById('gallery-overlay')?.classList.contains('hidden')) { closeGalleryPanel(); return; }
    if (!document.getElementById('playground-overlay')?.classList.contains('hidden')) { closePlayground(); return; }
    if (!document.getElementById('verify-overlay')?.classList.contains('hidden')) { closeVerifyPanel(); return; }
  }

  // Presentation mode keyboard navigation
  if (!document.getElementById('present-overlay')?.classList.contains('hidden')) {
    if (e.key === 'ArrowLeft') { navigatePresentation(-1); return; }
    if (e.key === 'ArrowRight') { navigatePresentation(1); return; }
    if (e.key === '1') { setState({ activeMode: 'inducer' }); updatePresentationOverlay(); return; }
    if (e.key === '2') { setState({ activeMode: 'confidence' }); updatePresentationOverlay(); return; }
    if (e.key === '3') { setState({ activeMode: 'game' }); updatePresentationOverlay(); return; }
    if (e.key === '4') { setState({ activeMode: 'analytics' }); updatePresentationOverlay(); return; }
    if (e.key === '5') { setState({ activeMode: 'visualize' }); updatePresentationOverlay(); return; }
    if (e.key === '6') { setState({ activeMode: 'compare' }); updatePresentationOverlay(); return; }
  }

  // Global shortcuts (not in input fields)
  if (!inInput) {
    if (e.key === '1') { if (STATE.adversarialPrompt) setState({ activeMode: 'inducer' }); return; }
    if (e.key === '2') { if (STATE.adversarialPrompt) setState({ activeMode: 'confidence' }); return; }
    if (e.key === '3') { if (STATE.adversarialPrompt) setState({ activeMode: 'game' }); return; }
    if (e.key === '4') { if (STATE.adversarialPrompt) setState({ activeMode: 'analytics' }); return; }
    if (e.key === '5') { if (STATE.adversarialPrompt) setState({ activeMode: 'visualize' }); return; }
    if (e.key === '6') { if (STATE.adversarialPrompt) setState({ activeMode: 'compare' }); return; }
    if (e.key === 'p' || e.key === 'P') { if (STATE.adversarialPrompt) enterPresentation(); return; }
  }
});

// ── Event delegation ──────────────────────────────────────────────────────────

document.addEventListener('click', function (e) {
  // Close export menu when clicking outside
  if (!e.target.closest('.export-wrap')) closeExportMenu();
  // Close theme menu when clicking outside
  if (!e.target.closest('.theme-selector-wrap')) closeThemeMenu();
  // Close tools and share menus when clicking outside
  if (!e.target.closest('.dropdown-wrap')) {
    document.getElementById('tools-menu')?.classList.add('hidden');
    document.getElementById('share-menu')?.classList.add('hidden');
  }

  const el = e.target.closest('[data-action]');
  const action = el?.dataset?.action;
  if (!action) return;

  switch (action) {
    case 'toggle-theme-menu': toggleThemeMenu(); break;
    case 'set-theme': setTheme(el.dataset.theme); closeThemeMenu(); break;
    case 'logo-click': handleLogoClick(); break;
    case 'subtitle-click': handleSubtitleClick(); break;
    case 'generate': handleGenerate(); break;
    case 'suggest': handleGenerate(el.dataset.topic); break;
    case 'set-input-mode': setState({
      inputMode: el.dataset.mode,
      error: null,
      waitingForReview: false,
      reviewPrompt: null,
      reviewPromptOriginal: null,
      reviewWhyItWorks: null,
    }); break;
    case 'toggle-context': setState({ showContextInjector: !STATE.showContextInjector }); break;
    case 'toggle-advanced': setState({ showAdvancedOptions: !STATE.showAdvancedOptions }); break;
    case 'toggle-prompt-exp': setState({ showPromptExplanation: !STATE.showPromptExplanation }); break;
    case 'set-inspect-submode': setState({ inspectSubMode: el.dataset.submode, cmActiveIdx: null }); break;
    case 'set-sandbox-submode': setState({ sandboxSubMode: el.dataset.submode }); break;
    case 'load-welcome-prompt': loadGalleryPrompt(el.dataset.promptId); break;
    case 'verify-claim-inline': verifySentenceInline(el.dataset.resultId, parseInt(el.dataset.idx, 10)); break;
    case 'toggle-tools':
      document.getElementById('tools-menu')?.classList.toggle('hidden');
      document.getElementById('share-menu')?.classList.add('hidden');
      break;
    case 'toggle-share':
      document.getElementById('share-menu')?.classList.toggle('hidden');
      document.getElementById('tools-menu')?.classList.add('hidden');
      break;
    case 'run-review': handleRunReview(); break;
    case 'regenerate-review': handleRegenerateReview(); break;
    case 'cancel-generation': cancelGeneration(); break;
    case 'open-settings': openSettings(); break;
    case 'open-ref': openRefPanel(); document.getElementById('tools-menu')?.classList.add('hidden'); break;
    case 'open-hist': openHistPanel(); break;
    case 'open-gallery': openGalleryPanel(); document.getElementById('tools-menu')?.classList.add('hidden'); break;
    case 'open-playground': openPlayground(); break;
    case 'open-verify': openVerifyPanel(); break;
    case 'enter-presentation': enterPresentation(); document.getElementById('share-menu')?.classList.add('hidden'); break;
    case 'exit-readonly': setState({ isReadOnly: false, adversarialPrompt: null, hallucinatorResults: [], activeResultId: null, error: null }); break;
    case 'toggle-export': document.getElementById('export-menu')?.classList.toggle('hidden'); break;
    case 'copy-summary': copyRunSummary(); document.getElementById('share-menu')?.classList.add('hidden'); break;
    case 'open-tour': openTour(); document.getElementById('tools-menu')?.classList.add('hidden'); break;
    case 'open-quiz': openQuiz(); document.getElementById('tools-menu')?.classList.add('hidden'); break;
    case 'export-json': exportJSON(); document.getElementById('share-menu')?.classList.add('hidden'); break;
    case 'export-csv': exportCSV(); document.getElementById('share-menu')?.classList.add('hidden'); break;
    case 'export-jsonl': exportJSONL(); document.getElementById('share-menu')?.classList.add('hidden'); break;
    case 'export-case-study': exportCaseStudy(); document.getElementById('share-menu')?.classList.add('hidden'); break;
    case 'print-pdf': triggerPrint(); document.getElementById('share-menu')?.classList.add('hidden'); break;
    case 'select-result': setState({ activeResultId: el.dataset.resultId, cmActiveIdx: null }); break;
    case 'set-mode': setState({ activeMode: el.dataset.mode, cmActiveIdx: null }); break;
    case 'cm-select': {
      const idx = parseInt(el.dataset.idx, 10);
      setState({ cmActiveIdx: STATE.cmActiveIdx === idx ? null : idx }); break;
    }
    case 'toggle-expand': toggleSentenceExpand(el.dataset.resultId, parseInt(el.dataset.idx, 10)); break;
    case 'override': toggleManualOverride(el.dataset.resultId, parseInt(el.dataset.idx, 10), el.dataset.type); break;
    case 'game-toggle': toggleGameSentence(el.dataset.resultId, parseInt(el.dataset.idx, 10)); break;
    case 'game-submit': submitGame(el.dataset.resultId); break;
    case 'game-reset': resetGame(el.dataset.resultId); break;
  }
});

document.addEventListener('input', function (e) {
  const updates = {};
  if (e.target.id === 'topic-input') updates.topic = e.target.value;
  if (e.target.id === 'custom-prompt-input') updates.customPrompt = e.target.value;
  if (e.target.id === 'context-injector-input') updates.contextInjector = e.target.value;
  if (Object.keys(updates).length) setState({ ...STATE, ...updates });

  // Auto-save settings fields (debounced)
  // All settings fields live inside #settings-content — the closest() check
  // is the reliable catch-all regardless of the specific element ID pattern.
  const isSettingsField = e.target.closest('#settings-content') ||
    e.target.id.startsWith('analyst-') ||
    e.target.id.startsWith('h-');
  if (isSettingsField) {
    autoSaveSettings();
  }
});

document.addEventListener('change', function (e) {
  // Auto-save on toggle/select changes in settings
  const isSettingsToggle = e.target.closest('#settings-content') ||
    e.target.id.startsWith('analyst-') ||
    e.target.id.startsWith('h-') ||
    e.target.id === 'auto-save-config' ||
    e.target.id === 'auto-load-config';
  if (isSettingsToggle) {
    // Read the auto-save/load toggles
    if (e.target.id === 'auto-save-config') STATE.autoSaveConfig = e.target.checked;
    if (e.target.id === 'auto-load-config') STATE.autoLoadConfig = e.target.checked;
    autoSaveSettings();
  }
});

// ── Init — reads USER_CONFIG and merges into STATE ────────────────────────────

document.addEventListener('DOMContentLoaded', async function () {
  // Load config from IndexedDB first (if available)
  let loadedFromDB = false;
  if (typeof DB_loadSessionState !== 'undefined') {
    try {
      let saved = await DB_loadSessionState();

      // Fallback: migrate from old 'config' key if sessionState empty
      if (!saved) {
        if (typeof DB_loadConfig !== 'undefined') {
          const oldConfig = await DB_loadConfig();
          if (oldConfig) {
            saved = { ...oldConfig };
            // Migrate: write to sessionState key
            await DB_saveSessionState(saved);
            console.log('Migrated config from old key to sessionState');
          }
        }
      }

      if (saved && saved.autoLoadConfig !== false) {
        STATE.autoLoadConfig = saved.autoLoadConfig ?? true;
        STATE.autoSaveConfig = saved.autoSaveConfig ?? true;
        if (saved.analyst) STATE.analyst = { ...STATE.analyst, ...saved.analyst, id: 'analyst' };
        if (saved.hallucinators && saved.hallucinators.length > 0) {
          STATE.hallucinators = saved.hallucinators;
        }
        if (saved.confidenceThreshold != null) STATE.confidenceThreshold = saved.confidenceThreshold;
        if (saved.inputMode) STATE.inputMode = saved.inputMode;
        if (saved.topic) STATE.topic = saved.topic;
        if (saved.customPrompt) STATE.customPrompt = saved.customPrompt;
        if (saved.contextInjector) STATE.contextInjector = saved.contextInjector;
        if (saved.showContextInjector != null) STATE.showContextInjector = saved.showContextInjector;
        if (saved.openRefCats) STATE.openRefCats = saved.openRefCats;
        if (saved.verificationResults) STATE.verificationResults = saved.verificationResults;
        loadedFromDB = true;
      }
    } catch (e) {
      console.warn('Failed to load session state from IndexedDB:', e);
    }
  }

  // Merge USER_CONFIG (from user-config.js) into STATE as fallback
  // Only applies if we didn't load from DB or fields are missing
  if (typeof USER_CONFIG !== 'undefined') {
    if (!loadedFromDB || !STATE.analyst.apiKey) {
      if (USER_CONFIG.analyst) {
        STATE.analyst = { ...STATE.analyst, ...USER_CONFIG.analyst, id: 'analyst' };
      }
    }
    if (!loadedFromDB || STATE.hallucinators.every(h => !h.apiKey)) {
      if (USER_CONFIG.hallucinators && USER_CONFIG.hallucinators.length > 0) {
        STATE.hallucinators = USER_CONFIG.hallucinators.map(h => ({
          id: h.id || 'h-' + genId(),
          name: h.name || 'Hallucinator',
          provider: h.provider || 'groq',
          model: h.model || '',
          apiKey: h.apiKey || '',
          baseUrl: h.baseUrl || '',
          enabled: h.enabled !== false,
          persona: h.persona || 'unguarded',
          customSystemPrompt: h.customSystemPrompt || '',
        }));
      }
    }
    if (STATE.confidenceThreshold == null && USER_CONFIG.confidenceThreshold != null) STATE.confidenceThreshold = USER_CONFIG.confidenceThreshold;
    if (!STATE.inputMode && USER_CONFIG.defaultInputMode) STATE.inputMode = USER_CONFIG.defaultInputMode;
  }

  initTheme();
  render();

  // Migrate from localStorage to IndexedDB (async, non-blocking)
  if (typeof DB_migrateFromLocalStorage !== 'undefined') {
    DB_migrateFromLocalStorage().then(() => {
      console.log('IndexedDB migration check complete');
    });
  }

  // Initialize prompt gallery
  if (typeof DB_initializePromptGallery !== 'undefined' && window.PromptGallery?.DEFAULT_PROMPT_GALLERY) {
    DB_initializePromptGallery(window.PromptGallery.DEFAULT_PROMPT_GALLERY).then(() => {
      console.log('Prompt gallery initialized');
    });
  }

  // Nudge if keys not configured
  const analystReady = STATE.analyst.apiKey || STATE.analyst.provider === 'ollama';
  const hReady = STATE.hallucinators.some(h => h.apiKey || h.provider === 'ollama');
  if (!analystReady || !hReady) {
    setTimeout(() => setState({ error: 'No API keys configured. Edit js/user-config.js or click ⚙ Settings to add your keys.' }), 300);
  }

  // Auto-save initial state after loading
  if (STATE.autoSaveConfig) {
    setTimeout(() => autoSaveSessionState(), 1000);
  }

  // Initialize API client wrapper (timeout, retry, dedup)
  if (window.ApiClient) {
    ApiClient.wrapCallAI();
    console.log('API Client initialized — timeout, retry, dedup active');
  }
});

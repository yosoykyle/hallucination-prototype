// ─────────────────────────────────────────────────────────────────────────────
// render.js  —  All HTML-template rendering with Virtual DOM support
// ─────────────────────────────────────────────────────────────────────────────

function escHtml(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function tip(text) {
  return `<span class="tip"><span class="tip-icon">?</span><span class="tip-box">${escHtml(text)}</span></span>`;
}

// Skeleton loaders
function skeleton(type = 'card', count = 3) {
  const skeletons = {
    card: () => `<div class="skeleton-card"><div class="skeleton-line skeleton-title"></div><div class="skeleton-line"></div><div class="skeleton-line skeleton-short"></div></div>`,
    history: () => `<div class="skeleton-history"><div class="skeleton-line skeleton-title"></div><div class="skeleton-line"></div><div class="skeleton-tags"><span class="skeleton-tag"></span><span class="skeleton-tag"></span></div></div>`,
    sentence: () => `<div class="skeleton-sentence"><div class="skeleton-badge"></div><div class="skeleton-line skeleton-long"></div><div class="skeleton-meta"><span class="skeleton-tag"></span><span class="skeleton-tag"></span></div></div>`,
    gallery: () => `<div class="skeleton-gallery"><div class="skeleton-line skeleton-title"></div><div class="skeleton-line"></div><div class="skeleton-line"></div><div class="skeleton-tags"><span class="skeleton-tag"></span><span class="skeleton-tag"></span></div></div>`,
    table: () => `<div class="skeleton-table"><div class="skeleton-row"><span class="skeleton-cell"></span><span class="skeleton-cell"></span><span class="skeleton-cell"></span></div></div>`
  };
  const fn = skeletons[type] || skeletons.card;
  return Array(count).fill(0).map(() => fn()).join('');
}

// ── Master render with Virtual DOM ────────────────────────────────────────────

let _lastRenderHTML = '';

function render() {
  const root = document.getElementById('app-root');
  if (!root) return;
  
  const showWelcome = !STATE.adversarialPrompt && !STATE.loading && !STATE.waitingForReview && !STATE.isReadOnly;
  
  const newHTML = 
    renderHeader() +
    renderError() +
    (STATE.isReadOnly ? renderReadOnlyBanner() : '') +
    (!STATE.isReadOnly ? renderInput() : '') +
    renderLoading() +
    (STATE.waitingForReview ? renderReviewPanel() : '') +
    (showWelcome ? renderWelcome() : '') +
    (!STATE.waitingForReview && STATE.adversarialPrompt && !STATE.loading ? `<div class="fade-in">${renderResults()}</div>` : '');
  
  // Use morphdom for efficient updates (with fallback)
  if (typeof morphdom !== 'undefined' && root.innerHTML) {
    try {
      // CRITICAL: Use childrenOnly + a wrapper element, NOT a raw string.
      // morphdom's toElement() uses template.content.childNodes[0] which
      // returns a whitespace text node when HTML starts with \n (as all
      // template literals do), causing root element replacement and data loss.
      const wrapper = document.createElement('div');
      wrapper.innerHTML = newHTML;
      morphdom(root, wrapper, {
        childrenOnly: true,
        onBeforeElUpdated: (fromEl, toEl) => {
          if (document.activeElement === fromEl && fromEl.tagName === 'INPUT') {
            toEl.value = fromEl.value;
            toEl.selectionStart = fromEl.selectionStart;
            toEl.selectionEnd = fromEl.selectionEnd;
          }
        },
        onNodeAdded: (node) => {
          if (node.classList) {
            node.classList.add('fade-in');
          }
        },
        onNodeRemoved: (node) => {
          node.classList.add('fade-out');
        }
      });
    } catch (morphErr) {
      console.warn('morphdom failed, falling back to innerHTML:', morphErr);
      root.innerHTML = newHTML;
    }
  } else {
    root.innerHTML = newHTML;
  }
  
  _lastRenderHTML = newHTML;
  updatePresentationOverlay();
  
  // Animate new content
  setTimeout(() => {
    animateEntrance('.fade-in');
    animateCounters();
  }, 50);
  
  // Trigger post-render visualizations
  postRenderViz();
}

// ── Theme helpers ─────────────────────────────────────────────────────────────

const SUBTITLE_MSGS = [
  'induce → analyze → visualize',
  '⬡ halluci-nation',
  '⚡ 9000+ tokens of power',
  '🐄 there is no cow level',
  '🌊 it\'s dangerous to go alone!',
  '🎮 press start to continue',
  '🌸 all your base are belong to us',
  '🔥 the cake is a lie',
  '🕹️ 1-UP!',
  '👾 select your fighter',
];

const THEMES = [
  { id:'midnight',   icon:'🌙',   name:'Midnight',    desc:'Dark & minimal' },
  { id:'daybreak',   icon:'☀️',   name:'Daybreak',    desc:'Light & clean' },
  { id:'fireworks',  icon:'🎆',   name:'Fireworks',   desc:'Dark + bursts' },
  { id:'sakura',     icon:'🌸',   name:'Sakura',      desc:'Warm pink + petals' },
  { id:'stargazer',  icon:'⭐',   name:'Stargazer',   desc:'Indigo + stars' },
  { id:'aurora',     icon:'🌌',   name:'Aurora',      desc:'Teal + aurora waves' },
  { id:'synthwave',  icon:'🌃',   name:'Synthwave',   desc:'90s retro neon + grid' },
  { id:'anime',      icon:'⚡',   name:'Anime',       desc:'Vibrant shonen energy' },
];

function _getThemeIcon() {
  const cur = document.documentElement.getAttribute('data-theme') || 'midnight';
  const t = THEMES.find(t => t.id === cur);
  return t ? t.icon : '🌙';
}

function _renderThemeMenu() {
  const cur = document.documentElement.getAttribute('data-theme') || 'midnight';
  return THEMES.map(t => `<button class="theme-option ${t.id === cur ? 'active' : ''}" data-action="set-theme" data-theme="${t.id}">
    <span class="theme-option-icon">${t.icon}</span>
    <span class="theme-option-name">${t.name}</span>
    <span class="theme-option-desc">${t.desc}</span>
    ${t.id === cur ? '<span class="theme-option-check">✓</span>' : ''}
  </button>`).join('');
}

// ── Header ────────────────────────────────────────────────────────────────────

function renderHeader() {
  const hasResults = !!STATE.adversarialPrompt && !STATE.loading;
  return `
  <header class="app-header">
    <div class="app-title-wrap">
      <div class="app-logo logo-clickable" aria-hidden="true" data-action="logo-click">⬡</div>
      <div>
        <div class="app-title">AI Hallucination Prototype</div>
        <div class="app-subtitle" data-action="subtitle-click">${SUBTITLE_MSGS[STATE._subtitleEgg ?? 0]}</div>
      </div>
    </div>
    <div class="header-actions" role="toolbar" aria-label="Main actions">
      ${STATE.loading ? `<button class="btn-ghost btn-sm" data-action="cancel-generation" style="color:var(--c-red-tx);border-color:var(--c-red-bd)" aria-label="Cancel generation">✕ Cancel</button>` : ''}
      ${STATE.isReadOnly ? `<button class="btn-ghost btn-sm" data-action="exit-readonly" aria-label="Start new session">← New Session</button>` : ''}
      <div class="theme-selector-wrap">
        <button class="theme-toggle" data-action="toggle-theme-menu" aria-label="Choose theme" title="Change theme">${_getThemeIcon()}</button>
        <div id="theme-menu" class="theme-menu hidden">${_renderThemeMenu()}</div>
      </div>
      <button class="btn-ghost btn-sm" data-action="open-hist" aria-label="Open history panel">🕑 History</button>
      <button class="btn-ghost btn-sm" data-action="open-ref" aria-label="Open reference panel">📚 Reference</button>
      <button class="btn-ghost btn-sm" data-action="open-gallery" aria-label="Open prompt gallery">📋 Gallery</button>
      ${hasResults ? `<button class="btn-ghost btn-sm" data-action="open-playground" aria-label="Open prompt playground">🔬 Playground</button>` : ''}
      ${hasResults ? `<button class="btn-ghost btn-sm" data-action="open-verify" aria-label="Open verification panel">🔍 Verify</button>` : ''}
      ${hasResults ? `<button class="btn-ghost btn-sm" data-action="open-tour" aria-label="Start guided tour">🎓 Tour</button>` : ''}
      ${hasResults ? `<button class="btn-ghost btn-sm" data-action="open-quiz" aria-label="Take knowledge quiz">🧠 Quiz</button>` : ''}
      ${hasResults ? `
      <div class="export-wrap">
        <button class="btn-ghost btn-sm" data-action="toggle-export" aria-expanded="false" aria-haspopup="true" aria-label="Export options">↑ Export</button>
        <div id="export-menu" class="export-menu hidden" role="menu">
          <button class="export-item" data-action="copy-summary" role="menuitem"><span class="export-item-icon">📋</span>Copy summary</button>
          <button class="export-item" data-action="export-json" role="menuitem"><span class="export-item-icon">{ }</span>Export JSON</button>
          <button class="export-item" data-action="export-csv" role="menuitem"><span class="export-item-icon">📊</span>Export CSV</button>
          <button class="export-item" data-action="export-jsonl" role="menuitem"><span class="export-item-icon">📋</span>Export JSONL</button>
          <button class="export-item" data-action="export-case-study" role="menuitem"><span class="export-item-icon">📖</span>Export Case Study</button>
          <button class="export-item" data-action="print-pdf" role="menuitem"><span class="export-item-icon">🖨</span>Print / PDF</button>
        </div>
      </div>
      <button class="btn-ghost btn-sm" data-action="enter-presentation" aria-label="Enter presentation mode">⛶ Present</button>` : ''}
      <button class="btn-ghost btn-sm" data-action="open-settings" aria-label="Open settings">⚙ Settings</button>
    </div>
  </header>`;
}

// ── Welcome state ────────────────────────────────────────────────────────────

function renderWelcome() {
  return `
  <div class="welcome fade-in">
    <div class="welcome-logo" aria-hidden="true">⬡</div>
    <h2>AI Hallucination Prototype</h2>
    <p>Induce, analyze, and visualize AI hallucinations across multiple models simultaneously.</p>
    <div class="welcome-steps" role="list" aria-label="Getting started steps">
      <div class="welcome-step" role="listitem">
        <div class="welcome-step-num" aria-hidden="true">Step 1</div>
        <div class="welcome-step-title">Configure</div>
        <div class="welcome-step-desc">Open ⚙ Settings, add your API keys, and set up your hallucinators.</div>
      </div>
      <div class="welcome-step" role="listitem">
        <div class="welcome-step-num" aria-hidden="true">Step 2</div>
        <div class="welcome-step-title">Generate</div>
        <div class="welcome-step-desc">Enter a topic or prompt. The system crafts an adversarial question and fires it at all configured models.</div>
      </div>
      <div class="welcome-step" role="listitem">
        <div class="welcome-step-num" aria-hidden="true">Step 3</div>
        <div class="welcome-step-title">Analyze</div>
        <div class="welcome-step-desc">Explore hallucinations across six views: Inducer, Confidence Map, Game Mode, Analytics, Visualize, and Compare.</div>
      </div>
    </div>
    <button class="btn-primary" data-action="open-settings" style="margin-top:1rem">⚙ Open Settings to Get Started</button>
  </div>`;
}

function renderReadOnlyBanner() {
  return `
  <div class="banner warning fade-in" style="margin-bottom:.75rem" role="alert">
    <span class="banner-icon">◉</span>
    <span><strong>Read-only — restored from history.</strong> You can explore this run but cannot regenerate. Click "← New Session" to start fresh.</span>
  </div>`;
}

// ── Input ────────────────────────────────────────────────────────────────────

function renderInput() {
  const busy = STATE.loading || STATE.waitingForReview;
  const mode = STATE.inputMode;
  return `
  <div class="input-mode-row" role="tablist" aria-label="Input mode">
    ${INPUT_MODES.map(m => `<button class="mode-pill ${mode === m.id ? 'active' : ''}" data-action="set-input-mode" data-mode="${m.id}" ${busy ? 'disabled' : ''} role="tab" aria-selected="${mode === m.id}">${m.label}</button>`).join('')}
  </div>
  <p class="mode-desc" id="mode-desc" aria-live="polite">${escHtml(INPUT_MODES.find(m => m.id === mode)?.desc || '')}</p>
  ${mode === 'custom' ? renderCustomPromptInput(busy) : renderTopicInput(busy, mode)}
  ${renderContextInjector(busy)}
  ${mode !== 'custom' ? renderSuggestions(busy) : ''}`;
}

function renderTopicInput(busy, mode) {
  return `<div class="input-row">
    <input id="topic-input" class="topic-input" type="text" placeholder="Enter a topic to analyze…" value="${escHtml(STATE.topic)}" ${busy ? 'disabled' : ''} aria-label="Topic" aria-describedby="mode-desc" />
    <button class="btn-primary" data-action="generate" ${!STATE.topic.trim() || busy ? 'disabled' : ''} aria-busy="${busy}">${busy ? 'Running…' : mode === 'review' ? 'Generate →' : 'Generate'}</button>
  </div>`;
}

function renderCustomPromptInput(busy) {
  return `<div style="margin-bottom:.625rem">
    <textarea id="custom-prompt-input" class="topic-input" style="height:90px;resize:vertical;border-radius:var(--r);padding:.625rem .875rem;font-size:.9375rem" placeholder="Write your exact prompt — sent directly to all hallucinators…" ${busy ? 'disabled' : ''} aria-label="Custom prompt">${escHtml(STATE.customPrompt)}</textarea>
    <div style="display:flex;justify-content:flex-end;margin-top:.375rem">
      <button class="btn-primary" data-action="generate" ${!STATE.customPrompt.trim() || busy ? 'disabled' : ''} aria-busy="${busy}">${busy ? 'Running…' : 'Run Prompt'}</button>
    </div>
  </div>`;
}

function renderContextInjector(busy) {
  const open = STATE.showContextInjector;
  return `<div class="context-injector">
    <button class="context-toggle" data-action="toggle-context" aria-expanded="${open}" aria-controls="context-injector-field">${open ? '▾' : '▸'} Context Injector${!open ? '<span style="font-size:.6875rem;color:var(--text-muted);margin-left:.25rem">— prepend context to the prompt</span>' : ''}</button>
    ${open ? `<div id="context-injector-field" class="context-field" style="margin-top:.375rem">
      <input id="context-injector-input" type="text" placeholder="e.g. You are answering a medical professional's query. / The year is 1985." value="${escHtml(STATE.contextInjector)}" ${busy ? 'disabled' : ''} aria-label="Context injector" />
      <p class="hint">Prepended to the prompt before each hallucinator. Tests how framing affects hallucination patterns.</p>
    </div>` : ''}
  </div>`;
}

function renderSuggestions(busy) {
  return `<div class="suggestions" role="group" aria-label="Suggested topics"><span class="mono" style="font-size:.6875rem;color:var(--text-muted)">try:</span>${SUGGESTIONS.map(s => `<button class="chip" data-action="suggest" data-topic="${escHtml(s)}" ${busy ? 'disabled' : ''}>${escHtml(s)}</button>`).join('')}</div>`;
}

// ── Review panel ─────────────────────────────────────────────────────────────

function renderReviewPanel() {
  return `<div class="review-panel fade-in" role="dialog" aria-labelledby="review-title" aria-modal="true">
    <div class="review-panel-header"><span class="label" style="color:var(--purple)" id="review-title">⬡ Review Generated Prompt</span><span style="font-size:.75rem;color:var(--text-muted)">Edit if needed, then run</span></div>
    <div class="review-panel-body">
      <div class="review-why"><span class="review-why-arrow">→</span><span class="review-why-text"><strong style="color:var(--purple-text)">Why this works: </strong>${escHtml(STATE.reviewWhyItWorks || '')}</span></div>
      <textarea id="review-prompt-textarea" class="review-textarea w-full" style="font-size:.9375rem;padding:.625rem .875rem" rows="4" aria-label="Reviewed prompt">${escHtml(STATE.reviewPrompt || '')}</textarea>
      <div class="review-actions"><button class="btn-ghost" data-action="regenerate-review">↺ Regenerate</button><button class="btn-primary" data-action="run-review">Run this Prompt →</button></div>
    </div>
  </div>`;
}

// ── Loading ──────────────────────────────────────────────────────────────────

function renderLoading() {
  if (!STATE.loading) return '';
  return `<div class="loading-panel fade-in" role="status" aria-live="polite" aria-label="Generating analysis">${LOAD_STEPS.map(s => {
    const done = STATE.loadingStep > s.id, active = STATE.loadingStep === s.id;
    return `<div class="step-row"><div class="step-dot ${active ? 'pulsing' : ''}" style="background:${done ? 'var(--c-green)' : active ? s.color : 'var(--card-raised)'};border-color:${done ? 'var(--c-green)' : active ? s.color : 'var(--border)'};color:${done || active ? '#0F0F11' : 'var(--text-muted)'}" aria-hidden="true">${done ? '✓' : active ? '●' : '○'}</div><span class="step-label" style="color:${done ? '#4CAF76' : active ? s.color : 'var(--text-muted)'};font-weight:${active ? 600 : 400}">${s.label}${active ? '…' : ''}</span></div>`;
  }).join('')}</div>`;
}

function renderError() {
  if (!STATE.error) return '';
  return `<div class="banner error fade-in" role="alert"><span class="banner-icon">⚠</span><span>${escHtml(STATE.error)}</span></div>`;
}

// ── Results container ────────────────────────────────────────────────────────

function renderResults() {
  return `
  <div class="banner warning fade-in" style="margin-bottom:.75rem" role="alert">
    <span class="banner-icon">⚠</span>
    <span><strong>Analyst disclaimer:</strong> The analyst is also an AI and may share knowledge gaps with the models it evaluates. "Cannot Assess" means it lacked confidence to judge. Use Manual Override in Inducer View to apply your own judgment.</span>
  </div>
  ${renderPromptCard()}${renderComparisonBar()}${renderThresholdSlider()}
  ${STATE.activeResultId ? renderModePanel() : ''}`;
}

function renderPromptCard() {
  return `<div class="prompt-card fade-in">
    <div class="prompt-card-header"><span class="label" style="color:var(--purple)">⬡ Adversarial Prompt</span></div>
    <div class="prompt-card-body">
      <p class="prompt-text">"${escHtml(STATE.adversarialPrompt)}"</p>
      ${STATE.whyItWorks ? `<div class="why-works"><span class="why-arrow">→</span><span class="why-text"><strong style="color:var(--purple-text)">Why this works: </strong>${escHtml(STATE.whyItWorks)}</span></div>` : ''}
    </div>
  </div>`;
}

function renderComparisonBar() {
  if (!STATE.hallucinatorResults.length) return '';
  return `<div class="comparison-bar" role="tablist" aria-label="Model results">${STATE.hallucinatorResults.map(r => {
    const active = r.id === STATE.activeResultId;
    let stat = '';
    if (r.status === 'loading') stat = `<span class="model-card-stat mono" style="color:var(--text-muted)">…</span>`;
    else if (r.status === 'error') stat = `<span class="model-card-stat" style="color:var(--c-red-tx)">Failed</span>`;
    else if (r.analysis) { const a = computeRunAnalytics(r, STATE.manualOverrides); stat = `<span class="model-card-stat" style="color:${a && a.hallucinated > 0 ? 'var(--c-red-tx)' : 'var(--c-green-tx)'}">${a ? a.hallucinated : 0}/${a ? a.verifiable : 0} hallucinated</span>`; }
    else stat = `<span class="model-card-stat" style="color:var(--c-amber-tx)">Analysis failed</span>`;
    return `<div class="model-card ${active ? 'active' : ''} ${r.status === 'error' ? 'errored' : ''}" data-action="select-result" data-result-id="${r.id}" role="tab" aria-selected="${active}" aria-controls="mode-panel" id="tab-${r.id}">
      <div class="model-card-name">${escHtml(r.name)}</div>
      <div class="model-card-provider">${escHtml(r.provider)} · ${escHtml(r.model || '')}</div>
      ${stat}</div>`;
  }).join('')}</div>`;
}

function renderThresholdSlider() {
  const v = STATE.confidenceThreshold;
  return `<div class="threshold-strip">
    <span class="threshold-label">Hallucination threshold${tip('Controls where "uncertain" ends and "hallucination" begins. Moving left catches more things as hallucinations; right is more conservative.')}</span>
    <input type="range" min="${THRESHOLD_MIN}" max="${THRESHOLD_MAX}" value="${v}" style="flex:1" oninput="handleThresholdChange(this.value)" aria-label="Hallucination threshold" aria-valuemin="${THRESHOLD_MIN}" aria-valuemax="${THRESHOLD_MAX}" aria-valuenow="${v}" />
    <span class="threshold-value" aria-live="polite">${v}%</span>
    <span class="threshold-note">Below&nbsp;${v}% = hallucination</span>
  </div>`;
}

// ── Mode panel ────────────────────────────────────────────────────────────────

function renderModePanel() {
  const result = STATE.hallucinatorResults.find(r => r.id === STATE.activeResultId);
  if (!result) return '';
  if (result.status === 'error') return `<div class="banner error fade-in"><span class="banner-icon">✕</span><span>${escHtml(result.error || 'Model failed.')}</span></div>`;
  
  const tabs = MODES.map(m => `<button class="mode-tab ${STATE.activeMode === m.id ? 'active' : ''}" data-action="set-mode" data-mode="${m.id}" role="tab" aria-selected="${STATE.activeMode === m.id}" aria-controls="mode-panel"><span class="sym">${m.sym}</span>${m.label}</button>`).join('');
  
  let content = '';
  if (!result.analysis) {
    content = `<div class="banner warning fade-in"><span class="banner-icon">⚠</span><span>Analysis failed. Raw response below.</span></div><div style="background:var(--card);border:1px solid var(--border);border-radius:var(--r-lg);padding:1.25rem;font-size:.875rem;line-height:1.75;color:var(--text-sec);">${escHtml(result.response || '')}</div>`;
  } else {
    if (STATE.activeMode === 'inducer') content = renderInducer(result);
    if (STATE.activeMode === 'confidence') content = renderConfidenceMap(result);
    if (STATE.activeMode === 'game') content = renderGameMode(result);
    if (STATE.activeMode === 'analytics') content = renderAnalyticsTab(result);
    if (STATE.activeMode === 'visualize') content = renderVisualizationTab(result);
    if (STATE.activeMode === 'compare') content = renderCompareTab(result);
  }
  
  return `<div class="mode-tabs" role="tablist" aria-label="Analysis views">${tabs}</div><div id="mode-panel" role="tabpanel" class="fade-in">${content}</div>`;
}

// ── Inducer view ─────────────────────────────────────────────────────────────

function renderInducer(result) {
  const a = computeRunAnalytics(result, STATE.manualOverrides); if (!a) return '';
  return `<div class="stats-row fade-in" style="animation-delay:0ms">
    <div class="stat-card"><div class="stat-value">${a.total}</div><div class="stat-label">sentences</div></div>
    <div class="stat-card"><div class="stat-value" style="color:${a.hallucinated > 0 ? 'var(--c-red)' : 'var(--c-green)'}">${a.hallucinated}</div><div class="stat-label">hallucinations</div></div>
    <div class="stat-card"><div class="stat-value" style="color:var(--c-green)">${a.accurate}</div><div class="stat-label">accurate</div></div>
    <div class="stat-card"><div class="stat-value" style="color:var(--c-gray-tx)">${a.unverifiable}</div><div class="stat-label">cannot assess</div></div>
  </div>
  <div class="sentence-list" role="list" aria-label="Analyzed sentences">${result.analysis.map((s, i) => renderSentenceCard(s, result.id, result.riskScan?.[i] || [], i)).join('')}</div>`;
}

function renderSentenceCard(s, resultId, risks, index) {
  const key = `${resultId}-${s.index}`, ov = STATE.manualOverrides?.[key];
  const level = ov === 'hallucination' ? 'low' : ov === 'accurate' ? 'high' : getConfLevel(s);
  const expanded = !!STATE.expandedSentences?.[key];
  const hasCat = s.category && s.category !== 'accurate' && s.category !== 'not_applicable';
  const riskBadges = risks.length ? `<div class="risk-badges">${risks.map(r => { const rf = RISK_FACTORS[r]; return rf ? `<span class="risk-badge" style="color:${rf.color};background:${rf.bg}" data-tip="${rf.label}">${rf.label}</span>` : '' }).join('')}</div>` : '';
  const accColor = level === 'high' ? 'var(--c-green)' : level === 'mid' ? 'var(--c-amber)' : level === 'low' ? 'var(--c-red)' : 'var(--c-gray-tx)';
  
  return `<div class="sc ${level} ${ov ? 'overridden' : ''}" style="animation-delay:${index * 30}ms" role="listitem" data-sentence-index="${s.index}">
    <div class="sc-summary" data-action="toggle-expand" data-result-id="${resultId}" data-idx="${s.index}" tabindex="0" role="button" aria-expanded="${expanded}" aria-controls="detail-${key}">
      ${riskBadges}
      <div class="sc-main">
        <span class="sc-text">${escHtml(s.text)}</span>
        <div class="sc-meta">
          <span class="sc-accuracy">${s.verifiable ? `${s.accuracy_confidence ?? '?'}%` : 'N/A'}</span>
          ${s.verifiable && s.analyst_certainty != null ? `<span class="sc-certainty">analyst: ${s.analyst_certainty}%</span>` : ''}
          ${hasCat ? `<span class="sc-tag">${escHtml(catLabel(s.category))}</span>` : ''}
          ${ov ? `<span class="override-badge">⚑ Override</span>` : ''}
          <span style="font-size:.625rem;color:var(--text-muted)">${expanded ? '▴' : '▾'}</span>
        </div>
      </div>
      ${s.explanation && !expanded ? `<div class="sc-brief-expl">${escHtml(s.explanation)}</div>` : ''}
    </div>
    ${expanded ? `<div class="sc-detail" id="detail-${key}" role="region" aria-label="Sentence details">
      ${s.verifiable ? `<div class="conf-bars">
        <div class="conf-bar-row"><span class="conf-bar-label">Accuracy Confidence${tip('How likely this sentence is factually correct. Below the threshold = likely hallucination.')}</span><div class="conf-bar-track"><div class="conf-bar-fill accuracy" style="width:${s.accuracy_confidence ?? 0}%;background:${accColor}"></div></div><span class="conf-bar-pct" style="color:${accColor}">${s.accuracy_confidence ?? 0}%</span></div>
        <div class="conf-bar-row"><span class="conf-bar-label">Analyst Certainty${tip('How confident the analyst is in its own assessment. Low certainty means treat the verdict with caution.')}</span><div class="conf-bar-track"><div class="conf-bar-fill certainty" style="width:${s.analyst_certainty ?? 0}%"></div></div><span class="conf-bar-pct" style="color:#8B6FE8">${s.analyst_certainty ?? 0}%</span></div>
      </div>` : ''}
      ${s.explanation ? `<div class="detail-section"><div class="detail-section-title">Analysis</div>${escHtml(s.explanation)}</div>` : ''}
      ${s.verification_suggestion ? `<div class="detail-section"><div class="detail-section-title">Verification Suggestion</div>${escHtml(s.verification_suggestion)}</div>` : ''}
      ${s.is_hallucination && s.correct_version ? `<div class="correct-version"><div class="detail-section-title" style="color:var(--c-green-tx);margin-bottom:.25rem">Likely Accurate Version</div>${escHtml(s.correct_version)}</div>` : ''}
      <div><div class="detail-section-title">Human Override</div>
        <div class="override-controls">
          <button class="override-btn confirm-accurate ${ov === 'accurate' ? 'active' : ''}" data-action="override" data-result-id="${resultId}" data-idx="${s.index}" data-type="accurate" aria-pressed="${ov === 'accurate'}">✓ Confirm Accurate</button>
          <button class="override-btn confirm-hallucination ${ov === 'hallucination' ? 'active' : ''}" data-action="override" data-result-id="${resultId}" data-idx="${s.index}" data-type="hallucination" aria-pressed="${ov === 'hallucination'}">✗ Confirm Hallucination</button>
          ${ov ? `<button class="override-btn override-clear" data-action="override" data-result-id="${resultId}" data-idx="${s.index}" data-type="clear">Clear</button>` : ''}
        </div>
      </div>
    </div>` : ''}
  </div>`;
}

// ── Confidence map ───────────────────────────────────────────────────────────

function renderConfidenceMap(result) {
  const sentences = result.analysis, activeIdx = STATE.cmActiveIdx, active = activeIdx != null ? sentences[activeIdx] : null;
  const legend = Object.entries(CONF_LEVELS).map(([k, v]) => `<div class="cm-legend-item"><div class="cm-dot" style="background:${v.dot}"></div>${v.label}</div>`).join('');
  const spans = sentences.map((s, i) => { const lv = getEffectiveLevel(s, result.id); return `<span class="cm-span ${lv} ${activeIdx === i ? 'active' : ''}" data-action="cm-select" data-idx="${i}" tabindex="0" role="button" aria-label="Sentence ${i + 1}: ${lv}">${escHtml(s.text)}</span>`; }).join(' ');
  let detail = '';
  if (active) {
    const lv = getEffectiveLevel(active, result.id), hasCat = active.category && active.category !== 'accurate' && active.category !== 'not_applicable';
    detail = `<div class="cm-detail ${lv}">
      <div class="cm-detail-head">
        <span class="cm-detail-score">${active.verifiable ? `${active.accuracy_confidence ?? '?'}% accurate` : 'Cannot assess'}</span>
        ${active.verifiable && active.analyst_certainty != null ? `<span style="font-size:.6875rem;color:var(--text-muted);font-family:var(--font-mono)">analyst: ${active.analyst_certainty}%</span>` : ''}
        ${hasCat ? `<span class="sc-tag">${escHtml(catLabel(active.category))}</span>` : ''}
        ${STATE.manualOverrides?.[`${result.id}-${active.index}`] ? `<span class="override-badge">⚑ Overridden</span>` : ''}
      </div>
      ${active.explanation ? `<div class="cm-detail-expl">${escHtml(active.explanation)}</div>` : ''}
      ${active.verification_suggestion ? `<div class="cm-detail-expl" style="margin-top:.375rem;font-size:.75rem;opacity:.8"><strong>Verify:</strong> ${escHtml(active.verification_suggestion)}</div>` : ''}
      ${active.is_hallucination && active.correct_version ? `<div style="margin-top:.5rem;padding:.5rem .625rem;border-radius:var(--r-sm);background:var(--c-green-bg);border:1px solid var(--c-green-bd);font-size:.75rem;color:var(--c-green-tx)"><strong>Likely accurate:</strong> ${escHtml(active.correct_version)}</div>` : ''}
    </div>`;
  }
  return `<div class="cm-legend fade-in">${legend}<span style="margin-left:auto;font-family:var(--font-mono);font-size:.625rem;color:var(--text-muted)">click sentence → details</span></div><div class="cm-text-block fade-in" role="text" aria-label="Response with confidence highlighting">${spans}</div>${detail ? `<div class="fade-in">${detail}</div>` : ''}`;
}

// ── Game mode ────────────────────────────────────────────────────────────────

function renderGameMode(result) {
  const id = result.id, gs = STATE.gameStates[id] || { selected: new Set(), revealed: false };
  const sentences = result.analysis, hallSet = new Set(sentences.reduce((a, s, i) => { if (s.is_hallucination) a.push(i); return a; }, []));
  const cor = [...gs.selected].filter(i => hallSet.has(i)).length, mis = [...hallSet].filter(i => !gs.selected.has(i)).length, fp = [...gs.selected].filter(i => !hallSet.has(i)).length;
  const perfect = cor === hallSet.size && fp === 0;
  const top = !gs.revealed ? `<div class="banner info fade-in" style="margin-bottom:1rem"><span class="banner-icon">◈</span><span><strong>Find the hallucinations.</strong> Click sentences you think the AI got wrong. Hit Submit when ready.</span></div>` : `<div class="game-score ${perfect ? 'perfect' : 'imperfect'} fade-in"><div class="game-score-num">${cor} / ${hallSet.size}</div><div class="game-score-detail">${fp} false positive${fp !== 1 ? 's' : ''} · ${mis} missed</div></div>`;
  const cards = sentences.map((s, i) => {
    const isSel = gs.selected.has(i), isHall = hallSet.has(i);
    let cls = 'unselected', icon = '', info = '';
    if (!gs.revealed) { cls = isSel ? 'selected' : 'unselected'; icon = isSel ? '✓' : ''; }
    else { if (isHall && isSel) { cls = 'correct-hit'; icon = '✓'; } else if (isHall) { cls = 'missed-hall'; icon = '!'; } else if (isSel) { cls = 'false-pos'; icon = '✗'; } else { cls = 'correct-skip'; } if (isHall) info = `<div class="gs-reveal-info"><strong style="font-family:var(--font-mono);font-size:.625rem;text-transform:uppercase;letter-spacing:.05em">${catLabel(s.category)}</strong> · ${escHtml(s.explanation || '')}${s.correct_version ? `<br><strong>Accurate:</strong> ${escHtml(s.correct_version)}` : ''}</div>`; }
    return `<div class="gs ${cls} ${gs.revealed ? 'revealed' : ''}" data-action="${gs.revealed ? '' : 'game-toggle'}" data-result-id="${id}" data-idx="${i}" tabindex="0" role="button" aria-pressed="${isSel}" aria-label="Sentence ${i + 1}: ${isSel ? 'selected' : 'not selected'}">
      <div class="gs-checkbox">${icon}</div><div style="flex:1"><div class="gs-text">${escHtml(s.text)}</div>${info}</div></div>`;
  }).join('');
  const btn = !gs.revealed ? `<button class="btn-primary w-full" data-action="game-submit" data-result-id="${id}" ${gs.selected.size === 0 ? 'disabled' : ''}>Submit — ${gs.selected.size} selected</button>` : `<button class="btn-ghost w-full" data-action="game-reset" data-result-id="${id}">Play Again</button>`;
  return `${top}<div class="fade-in">${cards}</div><div style="margin-top:.75rem">${btn}</div>`;
}

// ── Analytics tab ────────────────────────────────────────────────────────────

function renderAnalyticsTab(result) {
  const a = computeRunAnalytics(result, STATE.manualOverrides);
  if (!a) return `<div class="banner warning fade-in"><span class="banner-icon">⚠</span><span>No analysis data.</span></div>`;
  const { total, verifiable, hallucinated, accurate, unverifiable, avgAccuracy, avgCertainty, catBreakdown, riskFrequency, hallucinationRate, overrideCount } = a;
  const aP = total > 0 ? Math.round((accurate / total) * 100) : 0, mP = total > 0 ? Math.round(((verifiable - hallucinated - accurate) / total) * 100) : 0, lP = total > 0 ? Math.round((hallucinated / total) * 100) : 0, gP = total > 0 ? Math.round((unverifiable / total) * 100) : 0;
  const maxCat = Math.max(...Object.values(catBreakdown), 1);
  const catRows = Object.entries(catBreakdown).sort((x, y) => y[1] - x[1]).map(([cat, cnt]) => `<div class="cat-bar-row"><span class="cat-bar-label">${escHtml(catLabel(cat))}</span><div class="cat-bar-track"><div class="cat-bar-fill" style="width:${Math.round((cnt / maxCat) * 100)}%"></div></div><span class="cat-bar-count">${cnt}</span></div>`).join('');
  const riskBadges = Object.entries(riskFrequency).sort((x, y) => y[1] - x[1]).map(([f, c]) => { const rf = RISK_FACTORS[f]; return rf ? `<span class="risk-freq-badge" style="color:${rf.color};background:${rf.bg}">${rf.label} <span class="count">×${c}</span></span>` : '' }).join('');
  const allWith = STATE.hallucinatorResults.filter(r => r.analysis);
  const compTable = allWith.length >= 2 ? `<div class="analytics-section"><div class="analytics-title">Cross-Model Comparison</div><table class="comparison-table" role="table" aria-label="Cross-model comparison"><caption style="position:absolute;left:-9999px">Comparison of hallucination metrics across models</caption><thead><tr><th scope="col">Model</th><th scope="col">Provider</th><th scope="col">Sentences</th><th scope="col">Hallucinations</th><th scope="col">Rate</th><th scope="col">Avg Accuracy${tip('Average accuracy confidence across all verifiable sentences.')}</th><th scope="col">Analyst Certainty${tip('Average confidence the analyst had in its own assessments.')}</th></tr></thead><tbody>${allWith.map(r => { const ra = computeRunAnalytics(r, STATE.manualOverrides); if (!ra) return ''; const ia = r.id === result.id; return `<tr class="${ia ? 'active-row' : ''}"><td style="font-weight:${ia ? 600 : 400}">${escHtml(r.name)}</td><td style="font-size:.75rem;color:var(--text-muted)">${escHtml(r.provider)}</td><td class="mono">${ra.total}</td><td class="mono" style="color:${ra.hallucinated > 0 ? 'var(--c-red-tx)' : 'var(--c-green-tx)'}">${ra.hallucinated}</td><td class="mono" style="color:${ra.hallucinationRate > 40 ? 'var(--c-red-tx)' : ra.hallucinationRate > 20 ? 'var(--c-amber-tx)' : 'var(--c-green-tx)'}">${ra.hallucinationRate}%</td><td class="mono">${ra.avgAccuracy}%</td><td class="mono" style="color:${ra.avgCertainty < 60 ? 'var(--c-amber-tx)' : 'var(--text-sec)'}">${ra.avgCertainty}%</td></tr>`; }).join('')}</tbody></table></div>` : '';
  return `<div class="analytics-section fade-in"><div class="analytics-title">Distribution — ${total} sentences</div>
    <div class="dist-bar-wrap" role="img" aria-label="Sentence distribution: ${aP}% accurate, ${mP}% uncertain, ${lP}% hallucination, ${gP}% cannot assess">
      ${aP > 0 ? `<div class="dist-segment accurate" style="width:${aP}%">${aP > 8 ? aP + '%' : ''}</div>` : ''}
      ${mP > 0 ? `<div class="dist-segment uncertain" style="width:${mP}%">${mP > 8 ? mP + '%' : ''}</div>` : ''}
      ${lP > 0 ? `<div class="dist-segment hallucination" style="width:${lP}%">${lP > 8 ? lP + '%' : ''}</div>` : ''}
      ${gP > 0 ? `<div class="dist-segment unverifiable" style="width:${gP}%">${gP > 8 ? gP + '%' : ''}</div>` : ''}
    </div>
    <div class="dist-legend">
      <div class="dist-legend-item"><div class="dist-legend-dot" style="background:var(--c-green)"></div>Accurate (${aP}%)</div>
      <div class="dist-legend-item"><div class="dist-legend-dot" style="background:var(--c-amber)"></div>Uncertain (${mP}%)</div>
      <div class="dist-legend-item"><div class="dist-legend-dot" style="background:var(--c-red)"></div>Hallucination (${lP}%)</div>
      <div class="dist-legend-item"><div class="dist-legend-dot" style="background:var(--c-gray-tx)"></div>Cannot Assess (${gP}%)</div>
    </div>
  </div>
  <div class="analytics-section fade-in"><div class="analytics-title">Key Metrics</div><div class="metric-grid">
    <div class="metric-card"><div class="metric-value" style="color:${hallucinationRate > 40 ? 'var(--c-red)' : hallucinationRate > 20 ? 'var(--c-amber)' : 'var(--c-green)'}">${hallucinationRate}%</div><div class="metric-label">Hallucination Rate<br>(of verifiable)</div></div>
    <div class="metric-card"><div class="metric-value" style="color:${avgAccuracy < 60 ? 'var(--c-red)' : avgAccuracy < 75 ? 'var(--c-amber)' : 'var(--c-green)'}">${avgAccuracy}%</div><div class="metric-label">Avg Accuracy${tip('Average accuracy confidence across all verifiable sentences. Below 60% = concerning.')}</div></div>
    <div class="metric-card"><div class="metric-value" style="color:${avgCertainty < 60 ? 'var(--c-amber)' : 'var(--text-sec)'}">${avgCertainty}%</div><div class="metric-label">Analyst Certainty${tip('How confident the analyst was in its own assessments. Below 60% = treat results with extra caution.')}</div></div>
    <div class="metric-card"><div class="metric-value" style="color:${overrideCount > 0 ? 'var(--purple-text)' : 'var(--text-muted)'}">${overrideCount}</div><div class="metric-label">Human Overrides</div></div>
  </div></div>
  ${Object.keys(catBreakdown).length > 0 ? `<div class="analytics-section fade-in"><div class="analytics-title">Hallucination Categories</div><div class="cat-bar-list">${catRows}</div></div>` : ''}
  ${Object.keys(riskFrequency).length > 0 ? `<div class="analytics-section fade-in"><div class="analytics-title">Pre-Scan Risk Factors Detected</div><p style="font-size:.75rem;color:var(--text-muted);margin-bottom:.625rem;line-height:1.5">Client-side structural scan across all ${total} sentences — before the AI analyst ran.</p><div class="risk-freq-list">${riskBadges}</div></div>` : ''}
  ${compTable}
  <div class="analytics-section fade-in"><div class="analytics-title">Historical Trend</div><div id="trend-${result.id}" class="viz-container" style="background:var(--card);border:1px solid var(--border);border-radius:var(--r);padding:.75rem;min-height:120px"></div></div>`;
}

// ── Visualization Tab ────────────────────────────────────────────────────────

function renderVisualizationTab(result) {
  const resultId = result.id;
  const hasAnalysis = !!result.analysis;
  if (!hasAnalysis) return '<div class="banner warning fade-in"><span class="banner-icon">⚠</span><span>No analysis to visualize.</span></div>';
  
  setTimeout(() => renderAllVisualizations(resultId, STATE.hallucinatorResults, STATE.manualOverrides), 0);
  
  return `
  <div class="banner info fade-in" style="margin-bottom:1rem">
    <span class="banner-icon">◐</span>
    <span><strong>Visualization Suite</strong> — SVG-based charts rendered directly in the browser. Hover for details.</span>
  </div>
  <div class="analytics-section">
    <div class="analytics-title">Uncertainty Ribbon — Accuracy &amp; Analyst Certainty per Sentence</div>
    <div id="ribbon-${resultId}" class="viz-container skeleton-container" style="background:var(--card);border:1px solid var(--border);border-radius:var(--r);padding:.75rem;margin-bottom:1rem">${skeleton('chart')}</div>
  </div>
  <div class="analytics-section">
    <div class="analytics-title">Risk → Category Flow (Sankey)</div>
    <div id="sankey-${resultId}" class="viz-container skeleton-container" style="background:var(--card);border:1px solid var(--border);border-radius:var(--r);padding:.75rem;margin-bottom:1rem;min-height:220px">${skeleton('chart')}</div>
  </div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:.75rem;margin-bottom:1rem">
    <div class="analytics-section" style="margin-bottom:0">
      <div class="analytics-title">Hallucination Profile (Radar)</div>
      <div id="radar-${resultId}" class="viz-container skeleton-container" style="background:var(--card);border:1px solid var(--border);border-radius:var(--r);padding:.75rem;min-height:200px">${skeleton('chart')}</div>
    </div>
    <div class="analytics-section" style="margin-bottom:0">
      <div class="analytics-title">Category Timeline</div>
      <div id="timeline-${resultId}" class="viz-container skeleton-container" style="background:var(--card);border:1px solid var(--border);border-radius:var(--r);padding:.75rem;min-height:200px">${skeleton('chart')}</div>
    </div>
  </div>
  <div class="analytics-section">
    <div class="analytics-title">Cross-Model Heatmap — Sentence × Model Matrix</div>
    <div id="heatmap-${resultId}" class="viz-container skeleton-container" style="background:var(--card);border:1px solid var(--border);border-radius:var(--r);padding:.75rem;margin-bottom:1rem;min-height:150px;overflow-x:auto">${skeleton('chart')}</div>
  </div>`;
}

// ── Compare Tab ──────────────────────────────────────────────────────────────

function renderCompareTab(activeResult) {
  const allWith = STATE.hallucinatorResults.filter(r => r.analysis);
  if (allWith.length < 2) return '<div class="banner warning fade-in" style="margin:1rem"><span class="banner-icon">⚠</span><span>Need at least 2 models with analysis for comparison.</span></div>';
  return `<div class="banner info fade-in" style="margin-bottom:1rem"><span class="banner-icon">≣</span><span><strong>Comparative Dashboard</strong> — Side-by-side model comparison with sentence alignment and agreement analysis.</span></div>
   <div class="analytics-section"><div class="analytics-title">Model Performance Summary</div><table class="comparison-table" role="table" aria-label="Model performance summary"><caption style="position:absolute;left:-9999px">Performance metrics across all models</caption><thead><tr><th scope="col">Model</th><th scope="col">Provider</th><th scope="col">Sentences</th><th scope="col">Hallucinations</th><th scope="col">Rate</th><th scope="col">Avg Accuracy${tip('Average accuracy confidence across all verifiable sentences.')}</th><th scope="col">Analyst Certainty${tip('Average confidence the analyst had in its own assessments.')}</th><th scope="col">Overrides</th></tr></thead><tbody>${allWith.map(r => { const ra = computeRunAnalytics(r, STATE.manualOverrides); if (!ra) return ''; const ia = r.id === activeResult.id; return `<tr class="${ia ? 'active-row' : ''}"><td style="font-weight:${ia ? 600 : 400}">${escHtml(r.name)}</td><td style="font-size:.75rem;color:var(--text-muted)">${escHtml(r.provider)}</td><td class="mono">${ra.total}</td><td class="mono" style="color:${ra.hallucinated > 0 ? 'var(--c-red-tx)' : 'var(--c-green-tx)'}">${ra.hallucinated}</td><td class="mono" style="color:${ra.hallucinationRate > 40 ? 'var(--c-red-tx)' : ra.hallucinationRate > 20 ? 'var(--c-amber-tx)' : 'var(--c-green-tx)'}">${ra.hallucinationRate}%</td><td class="mono">${ra.avgAccuracy}%</td><td class="mono" style="color:${ra.avgCertainty < 60 ? 'var(--c-amber-tx)' : 'var(--text-sec)'}">${ra.avgCertainty}%</td><td class="mono" style="color:${ra.overrideCount > 0 ? 'var(--purple-text)' : 'var(--text-muted)'}">${ra.overrideCount}</td></tr>`; }).join('')}</tbody></table></div>
  <div class="analytics-section"><div class="analytics-title">Agreement Matrix</div><div id="agreement-matrix" class="skeleton-container">${skeleton('table')}</div></div>
  <div class="analytics-section"><div class="analytics-title">Sentence Alignment</div><p style="font-size:.75rem;color:var(--text-muted);margin-bottom:.625rem">Sentences aligned by semantic similarity. Green = all accurate, Red = all hallucinate, Amber = disagreement.</p><div id="sentence-alignment" class="skeleton-container" style="max-height:400px;overflow:auto">${skeleton('sentence', 3)}</div></div>
  <div class="analytics-section"><div class="analytics-title">Category Agreement</div><p style="font-size:.75rem;color:var(--text-muted);margin-bottom:.625rem">How often do models agree on the hallucination category for the same claim?</p><div id="category-agreement" class="skeleton-container">${skeleton('table')}</div></div>`;
}

// Compare sub-renders: agreement matrix, sentence alignment, category agreement

function renderAgreementMatrix() {
  const el = document.getElementById('agreement-matrix');
  if (!el) return;
  const models = STATE.hallucinatorResults.filter(r => r.analysis);
  if (models.length < 2) { el.innerHTML = '<div class="banner info" style="font-size:.75rem;padding:.5rem">Need 2+ models for agreement matrix.</div>'; return; }
  const rows = models.map((a, i) => models.slice(i + 1).map(b => {
    const aSents = a.analysis.filter(s => s.verifiable);
    const bSents = b.analysis.filter(s => s.verifiable);
    const matched = Math.min(aSents.length, bSents.length);
    if (!matched) return null;
    let agree = 0;
    for (let j = 0; j < matched; j++) {
      const aHall = aSents[j].is_hallucination || (STATE.manualOverrides[`${a.id}-${aSents[j].index}`] === 'hallucination');
      const bHall = bSents[j].is_hallucination || (STATE.manualOverrides[`${b.id}-${bSents[j].index}`] === 'hallucination');
      if (aHall === bHall) agree++;
    }
    return { a: a.name, b: b.name, rate: Math.round((agree / matched) * 100) };
  }).filter(Boolean)).flat();
  el.innerHTML = `<table class="comparison-table" role="table" aria-label="Agreement matrix"><thead><tr><th scope="col">Model Pair</th><th scope="col">Agreement %</th></tr></thead><tbody>${rows.map(r => `<tr><td>${escHtml(r.a)} vs ${escHtml(r.b)}</td><td class="mono" style="color:${r.rate >= 70 ? 'var(--c-green-tx)' : r.rate >= 40 ? 'var(--c-amber-tx)' : 'var(--c-red-tx)'}">${r.rate}%</td></tr>`).join('')}</tbody></table>`;
}

function renderSentenceAlignment() {
  const el = document.getElementById('sentence-alignment');
  if (!el) return;
  const models = STATE.hallucinatorResults.filter(r => r.analysis);
  if (!models.length) return;
  const maxSents = Math.max(...models.map(m => m.analysis.length));
  if (!maxSents) { el.innerHTML = '<div style="font-size:.75rem;color:var(--text-muted);padding:.5rem">No sentences to align.</div>'; return; }
  const levels = [];
  for (let i = 0; i < maxSents; i++) {
    const vals = models.map(m => {
      const s = m.analysis[i];
      if (!s || !s.verifiable) return null;
      const ov = STATE.manualOverrides[`${m.id}-${s.index}`];
      if (ov === 'hallucination') return 'low';
      if (ov === 'accurate') return 'high';
      return getConfLevel(s);
    }).filter(v => v !== null);
    if (!vals.length) { levels.push('empty'); continue; }
    if (vals.every(v => v === 'high' || v === 'unverifiable')) levels.push('high');
    else if (vals.every(v => v === 'low')) levels.push('low');
    else levels.push('mid');
  }
  el.innerHTML = `<div style="font-size:.75rem;line-height:2" role="img" aria-label="Sentence alignment: ${levels.length} sentences">${levels.map((lv, i) => {
    const color = lv === 'high' ? 'var(--c-green)' : lv === 'low' ? 'var(--c-red)' : lv === 'mid' ? 'var(--c-amber)' : 'var(--c-gray-tx)';
    return `<span style="display:inline-block;width:18px;height:18px;border-radius:3px;background:${color};margin-right:4px" title="Sentence ${i + 1}: ${lv}"></span>`;
  }).join('')}</div><div style="font-size:.625rem;color:var(--text-muted);margin-top:.375rem">${levels.length} sentences · Green=all accurate · Red=all hallucinate · Amber=disagreement</div>`;
}

function renderCategoryAgreement() {
  const el = document.getElementById('category-agreement');
  if (!el) return;
  const models = STATE.hallucinatorResults.filter(r => r.analysis);
  const catCounts = {};
  models.forEach(m => {
    (m.analysis || []).forEach(s => {
      if (s.is_hallucination && s.category) {
        catCounts[s.category] = (catCounts[s.category] || 0) + 1;
      }
    });
  });
  const cats = Object.entries(catCounts).sort((a, b) => b[1] - a[1]);
  if (!cats.length) { el.innerHTML = '<div style="font-size:.75rem;color:var(--text-muted);padding:.5rem">No hallucination categories found.</div>'; return; }
  el.innerHTML = `<table class="comparison-table" role="table" aria-label="Category agreement"><thead><tr><th scope="col">Category</th><th scope="col">Total</th><th scope="col">Models</th></tr></thead><tbody>${cats.map(([cat, count]) => {
    const modelList = models.filter(m => (m.analysis || []).some(s => s.is_hallucination && s.category === cat)).map(m => m.name);
    return `<tr><td>${escHtml(catLabel(cat))}</td><td class="mono">${count}</td><td style="font-size:.6875rem">${escHtml(modelList.join(', '))}</td></tr>`;
  }).join('')}</tbody></table>`;
}

// ── History panel with pagination ────────────────────────────────────────────

async function renderHistContent() {
  const container = document.getElementById('hist-content');
  if (!container) return '';
  
  container.innerHTML = skeleton('history', 5);
  
  try {
    const { items: history, total, hasMore } = await DB.loadHistoryRuns({ limit: 20, offset: 0 });
    
    if (!history.length) {
      container.innerHTML = `<div class="hist-empty fade-in">No runs saved yet.<br><span style="font-size:.75rem">Each completed run is automatically saved to IndexedDB.</span></div>`;
      return;
    }
    
    container.innerHTML = history.map(item => {
      const date = new Date(item.timestamp);
      const dateStr = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ' ' + date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
      const stats = item.summary?.perModel || [];
      const statChips = stats.map(m => {
        const cls = m.hallucinationRate > 40 ? 'bad' : m.hallucinationRate > 20 ? 'neutral' : 'good';
        return `<span class="hist-stat ${cls}">${escHtml(m.name)}: ${m.hallucinationRate}%</span>`;
      }).join('');
      return `<div class="hist-item fade-in" onclick="restoreHistoryRun('${item.id}')">
        <div class="hist-item-header">
          <span class="hist-item-topic">${escHtml(item.topic || '(custom prompt)')}</span>
          <span class="hist-item-time">${escHtml(dateStr)}</span>
          <button class="hist-item-del" onclick="event.stopPropagation();deleteHistoryItem('${item.id}')" title="Delete" aria-label="Delete run">✕</button>
        </div>
        <div class="hist-item-models">${escHtml(stats.map(m => m.name).join(', ') || 'No models')}</div>
        <div class="hist-item-stats">${statChips}<span class="hist-readonly-badge">read-only</span></div>
      </div>`;
    }).join('');
    
    // Add pagination if more results
    if (hasMore) {
      container.innerHTML += `<div class="hist-pagination" style="display:flex;justify-content:center;gap:.5rem;margin-top:1rem;padding-top:1rem;border-top:1px solid var(--border)">
        <button class="btn-ghost btn-sm" onclick="loadMoreHistory(20)" aria-label="Load more history">Load More</button>
        <span style="font-size:.6875rem;color:var(--text-muted);align-self:center">${history.length} of ${total} runs</span>
      </div>`;
    }
  } catch (e) {
    container.innerHTML = `<div class="banner error fade-in"><span class="banner-icon">✕</span><span>Failed to load history: ${e.message}</span></div>`;
  }
}

// Pagination handler
window.loadMoreHistory = async function(offset) {
  const container = document.getElementById('hist-content');
  const btn = container?.querySelector('.hist-pagination button');
  if (btn) { btn.disabled = true; btn.textContent = 'Loading…'; }
  
  try {
    const { items, hasMore } = await DB.loadHistoryRuns({ limit: 20, offset });
    items.forEach(item => {
      const date = new Date(item.timestamp);
      const dateStr = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ' ' + date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
      const stats = item.summary?.perModel || [];
      const statChips = stats.map(m => {
        const cls = m.hallucinationRate > 40 ? 'bad' : m.hallucinationRate > 20 ? 'neutral' : 'good';
        return `<span class="hist-stat ${cls}">${escHtml(m.name)}: ${m.hallucinationRate}%</span>`;
      }).join('');
      const div = document.createElement('div');
      div.className = 'hist-item fade-in';
      div.onclick = () => restoreHistoryRun(item.id);
      div.innerHTML = `<div class="hist-item-header"><span class="hist-item-topic">${escHtml(item.topic || '(custom prompt)')}</span><span class="hist-item-time">${escHtml(dateStr)}</span><button class="hist-item-del" onclick="event.stopPropagation();deleteHistoryItem('${item.id}')" title="Delete" aria-label="Delete run">✕</button></div><div class="hist-item-models">${escHtml(stats.map(m => m.name).join(', ') || 'No models')}</div><div class="hist-item-stats">${statChips}<span class="hist-readonly-badge">read-only</span></div>`;
      container.insertBefore(div, container.querySelector('.hist-pagination'));
    });
    
    if (hasMore) {
      btn.disabled = false;
      btn.textContent = 'Load More';
      btn.onclick = () => loadMoreHistory(offset + 20);
    } else {
      btn.remove();
    }
  } catch (e) {
    if (btn) { btn.disabled = false; btn.textContent = 'Retry'; }
  }
};

// ── Reference panel ──────────────────────────────────────────────────────────

function renderRefContent() {
  const ed = EDUCATIONAL_CONTENT;
  const catSection = ed.categories.map(cat => {
    const isOpen = STATE.openRefCats?.[cat.id];
    return `<div class="ref-cat fade-in">
      <div class="ref-cat-header" onclick="toggleRefCat('${cat.id}')" tabindex="0" role="button" aria-expanded="${isOpen}" aria-controls="ref-body-${cat.id}">
        <span class="ref-cat-icon">${cat.icon}</span>
        <span class="ref-cat-title">${escHtml(cat.title)}</span>
        <span class="ref-cat-chevron ${isOpen ? 'open' : ''}">▶</span>
      </div>
      ${isOpen ? `<div class="ref-cat-body" id="ref-body-${cat.id}">
        <div><div class="ref-cat-label">What it is</div><div class="ref-cat-desc">${escHtml(cat.description)}</div></div>
        <div><div class="ref-cat-label">Why it happens</div><div class="ref-cat-desc">${escHtml(cat.mechanism)}</div></div>
        <div><div class="ref-cat-label">Real-world example</div><div class="ref-cat-example">${escHtml(cat.realExample)}</div></div>
        <div><div class="ref-cat-label">How to spot it</div><div class="ref-cat-desc">${escHtml(cat.howToSpot)}</div></div>
      </div>` : ''}
    </div>`;
  }).join('');
  const mechSection = ed.mechanisms.map(m => `<div class="ref-mech fade-in"><div class="ref-mech-title">${escHtml(m.title)}</div><div class="ref-mech-body">${escHtml(m.body)}</div></div>`).join('');
  const scoreSection = ed.scores.map(s => `<div class="ref-score fade-in"><div class="ref-score-title">${escHtml(s.title)}</div><div class="ref-score-body">${escHtml(s.body)}</div></div>`).join('');
  return `<div class="ref-section"><div class="ref-section-title">Hallucination Categories</div>${catSection}</div><div class="ref-section"><div class="ref-section-title">Why AI Hallucinates</div>${mechSection}</div><div class="ref-section"><div class="ref-section-title">Understanding the Scores</div>${scoreSection}</div>`;
}

// ── Presentation overlay content ────────────────────────────────────────────

function updatePresentationOverlay() {
  const el = document.getElementById('present-content');
  if (!el) return;
  const result = STATE.hallucinatorResults.find(r => r.id === STATE.activeResultId);
  if (!result) { el.innerHTML = ''; return; }
  const tabs = MODES.map(m => `<button class="present-mode-tab ${STATE.activeMode === m.id ? 'active' : ''}" onclick="setState({activeMode:'${m.id}'});updatePresentationOverlay()">${m.sym} ${m.label}</button>`).join('');
  el.innerHTML = `
    <div style="text-align:center;margin-bottom:1rem">
      <div style="font-size:.75rem;color:var(--text-muted);font-family:var(--font-mono);letter-spacing:.05em;text-transform:uppercase;margin-bottom:.25rem">${escHtml(result.name)}</div>
      <div style="font-size:1.25rem;font-weight:600">${escHtml(STATE.topic || STATE.customPrompt || 'Hallucination Analysis')}</div>
    </div>
    <div class="present-mode-tabs">${tabs}</div>
    <div style="margin-top:1rem">${result.analysis ? renderModePanel() : `<div class="banner warning">No analysis data.</div>`}</div>`;
}

// ── Settings content with auto-save indicators ──────────────────────────────

function renderAIConfigFields(prefix, config) {
  const provider = PROVIDERS[config.provider] || PROVIDERS.anthropic;
  const needsUrl = config.provider === 'ollama' || config.provider === 'custom';
  return `
    <div class="form-row col-2">
      <div><label class="field-label" for="${prefix}-name">Name</label><input id="${prefix}-name" value="${escHtml(config.name)}" placeholder="Model nickname" /></div>
      <div><label class="field-label" for="${prefix}-provider">Provider</label>
        <select id="${prefix}-provider" onchange="handleProviderChange('${prefix}', this.value)">
          ${Object.entries(PROVIDERS).map(([k, v]) => `<option value="${k}" ${config.provider === k ? 'selected' : ''}>${v.name}</option>`).join('')}
        </select>
      </div>
    </div>
    <div class="form-row col-2">
      <div><label class="field-label" for="${prefix}-model">Model</label>
        <input id="${prefix}-model" list="${prefix}-model-list" value="${escHtml(config.model)}" placeholder="Enter or select a model…" />
        <datalist id="${prefix}-model-list">
          ${(provider.models || []).map(m => `<option value="${m}">`).join('')}
        </datalist>
      </div>
      <div><label class="field-label" for="${prefix}-apikey">API Key</label><input id="${prefix}-apikey" type="password" value="${escHtml(config.apiKey)}" placeholder="${escHtml(provider.hint || 'API key')}" /></div>
    </div>
    <div class="form-row col-1" style="display:${needsUrl ? '' : 'none'}">
      <div><label class="field-label" for="${prefix}-baseurl">Base URL</label><input id="${prefix}-baseurl" value="${escHtml(config.baseUrl || (needsUrl ? provider.defaultBaseUrl : ''))}" placeholder="API endpoint URL" /></div>
    </div>`;
}

function renderHallucinatorEntry(h, index) {
  const personaOptions = Object.entries(HALLUCINATOR_PERSONAS).map(([k, v]) => `<option value="${k}" ${h.persona === k ? 'selected' : ''}>${v.name}</option>`).join('');
  const isCustomPersona = h.persona === 'custom';
  return `<div class="h-entry" id="h-entry-${h.id}">
    <div class="h-entry-header">
      <span class="h-entry-label">Hallucinator #${index + 1}</span>
      <div style="display:flex;align-items:center;gap:.5rem">
        <label class="toggle-row"><input type="checkbox" id="h-enabled-${h.id}" ${h.enabled ? 'checked' : ''} /> Enabled</label>
        <button class="btn-danger btn-sm" onclick="removeHallucinatorEntry('${h.id}')">Remove</button>
      </div>
    </div>
    ${renderAIConfigFields('h-' + h.id, h)}
    <div class="form-row col-2">
      <div><label class="field-label" for="h-persona-${h.id}">Persona</label>
        <select id="h-persona-${h.id}" onchange="handlePersonaChange('${h.id}', this.value)">${personaOptions}</select>
      </div>
    </div>
    ${isCustomPersona ? `<div class="form-row col-1 h-custom-row"><label class="field-label" for="h-sysprompt-${h.id}">Custom System Prompt</label><textarea id="h-sysprompt-${h.id}" style="min-height:80px" placeholder="Custom system prompt for this hallucinator…">${escHtml(h.customSystemPrompt || '')}</textarea></div>` : ''}
    <p class="hint">${escHtml(HALLUCINATOR_PERSONAS[h.persona]?.description || '')}</p>
  </div>`;
}

function renderSettingsContent() {
  return `<div class="settings-section"><div class="settings-section-title">Analyst AI — evaluates hallucinator outputs</div>${renderAIConfigFields('analyst', STATE.analyst)}</div>
  <hr class="divider"/>
  <div class="settings-section"><div class="settings-section-title">Hallucinator AIs — answer the adversarial prompt in parallel</div>
    <div id="hallucinator-list">${STATE.hallucinators.map((h, i) => renderHallucinatorEntry(h, i)).join('')}</div>
    <button class="btn-add" onclick="addHallucinatorEntry()">+ Add Hallucinator</button>
  </div>
  <div class="settings-section" style="margin-top:1rem"><div class="settings-section-title">Persistence</div>
    <div class="form-row col-2">
      <div><label class="toggle-row"><input type="checkbox" id="auto-save-config" ${STATE.autoSaveConfig ? 'checked' : ''} onchange="STATE.autoSaveConfig=this.checked; DB.saveSetting('autoSaveConfig', this.checked)" /> Auto-save config to IndexedDB</label></div>
      <div><label class="toggle-row"><input type="checkbox" id="auto-load-config" ${STATE.autoLoadConfig !== false ? 'checked' : ''} onchange="STATE.autoLoadConfig=this.checked; DB.saveSetting('autoLoadConfig', this.checked)" /> Auto-load config on startup</label></div>
    </div>
  </div>`;
}

// ── Gallery content ───────────────────────────────────────────────────────────

function renderGalleryContent() {
  const gallery = EDUCATIONAL_CONTENT.promptGallery || [];
  const filter = document.getElementById('gallery-filter')?.value || '';
  const filtered = filter ? gallery.filter(p => p.category === filter) : gallery;
  
  if (!filtered.length) {
    return `<div class="hist-empty fade-in">No prompts in this category.</div>`;
  }
  
  return `<div class="gallery-grid">${filtered.map(p => `
    <div class="gallery-card fade-in" onclick="loadGalleryPrompt('${p.id}')" tabindex="0" role="button" aria-label="Load prompt: ${escHtml(p.title)}">
      <div class="gallery-card-tags">${p.tags.map(t => `<span class="gallery-tag">${escHtml(t)}</span>`).join('')}</div>
      <div class="gallery-card-title">${escHtml(p.title)}</div>
      <div class="gallery-card-desc">${escHtml(p.description)}</div>
      <div class="gallery-card-prompt">"${escHtml(p.prompt)}"</div>
      <div class="gallery-card-footer">
        <span class="gallery-card-difficulty ${p.difficulty || 'medium'}">${p.difficulty || 'medium'}</span>
        <span class="gallery-card-load">Click to load →</span>
      </div>
    </div>`).join('')}</div>`;
}

// ── Playground content ─────────────────────────────────────────────────────────

function renderPlaygroundContent() {
  if (!STATE.adversarialPrompt) return `<div class="banner warning fade-in"><span class="banner-icon">⚠</span><span>No adversarial prompt to mutate. Run a generation first.</span></div>`;
  
  const variants = generatePromptVariants(STATE.adversarialPrompt, 5);
  
  return `
  <div class="banner info fade-in" style="margin-bottom:1rem">
    <span class="banner-icon">🔬</span>
    <span><strong>Prompt Mutations</strong> — Test how small changes affect hallucination patterns across models.</span>
  </div>
  <div class="playground-section fade-in">
    <div class="playground-variant" style="background:var(--purple-bg);border:1px solid var(--purple-dim);border-radius:var(--r);padding:.75rem;margin-bottom:.75rem">
      <div class="playground-variant-header">
        <input type="checkbox" id="playground-include-original" checked class="playground-cb" />
        <label for="playground-include-original" class="playground-variant-name">Original Prompt</label>
      </div>
      <div class="playground-variant-preview">"${escHtml(STATE.adversarialPrompt)}"</div>
    </div>
    ${variants.map((v, i) => `
    <div class="playground-variant fade-in" style="background:var(--card);border:1px solid var(--border);border-radius:var(--r);padding:.75rem;margin-bottom:.5rem">
      <div class="playground-variant-header">
        <input type="checkbox" id="pv-${i}" class="playground-variant-cb playground-cb" data-variant-idx="${i}" checked />
        <label for="pv-${i}" class="playground-variant-name">${escHtml(v.mutation)}</label>
      </div>
      <div class="playground-variant-preview">"${escHtml(v.prompt)}"</div>
    </div>`).join('')}
  </div>`;
}

// ── Verification content ──────────────────────────────────────────────────────

function renderVerificationContent() {
  if (STATE.verificationLoading) {
    return `<div class="viz-loading fade-in">Verifying claims via web search…</div>${skeleton('sentence', 3)}`;
  }
  
  if (!STATE.verificationResults) {
    return `<div class="hist-empty fade-in">No verification results yet.<br><span style="font-size:.75rem">Click Verify to check flagged sentences against web sources.</span></div>`;
  }
  
  const results = STATE.verificationResults;
  const verifiedCount = results.filter(r => r.verified === true).length;
  const refutedCount = results.filter(r => r.verified === false).length;
  const unknownCount = results.filter(r => r.verified === null).length;
  
  return `
  <div class="verify-summary fade-in" style="display:flex;gap:.5rem;margin-bottom:1rem">
    <div class="stat-card"><div class="stat-value" style="color:var(--c-green-tx)">${verifiedCount}</div><div class="stat-label">Supported</div></div>
    <div class="stat-card"><div class="stat-value" style="color:var(--c-red-tx)">${refutedCount}</div><div class="stat-label">Refuted</div></div>
    <div class="stat-card"><div class="stat-value" style="color:var(--c-gray-tx)">${unknownCount}</div><div class="stat-label">Uncertain</div></div>
  </div>
  <div class="verify-list">${results.map((r, i) => `
    <div class="verify-item fade-in" style="background:var(--card);border:1px solid var(--border);border-radius:var(--r);padding:.75rem;margin-bottom:.5rem">
      <div class="verify-item-header" style="display:flex;align-items:center;gap:.5rem;margin-bottom:.375rem">
        <span class="verify-status" style="font-size:.875rem">${r.verified === true ? '✅' : r.verified === false ? '❌' : '❓'}</span>
        <span class="verify-status-label" style="font-weight:600;font-size:.8125rem;color:${r.verified === true ? 'var(--c-green-tx)' : r.verified === false ? 'var(--c-red-tx)' : 'var(--c-gray-tx)'}">${r.verified === true ? 'Supported' : r.verified === false ? 'Refuted' : 'Uncertain'}</span>
        <span class="verify-confidence" style="margin-left:auto;font-family:var(--font-mono);font-size:.6875rem;color:var(--text-muted)">${r.confidence || 0}% confidence</span>
      </div>
      <div class="verify-summary-text" style="font-size:.75rem;color:var(--text-sec);line-height:1.5">${escHtml(r.summary)}</div>
      ${r.sources?.length ? `<div class="verify-sources" style="margin-top:.375rem;padding-top:.375rem;border-top:1px solid var(--border);font-size:.6875rem;color:var(--text-muted)">
        <strong>Sources:</strong>
        ${r.sources.slice(0, 3).map(s => `<div style="margin-top:.25rem;line-height:1.4">• ${escHtml(s)}</div>`).join('')}
      </div>` : ''}
    </div>`).join('')}</div>`;
}

// Make functions globally accessible
window.renderHistContent = renderHistContent;
window.loadMoreHistory = loadMoreHistory;
window.renderGalleryContent = renderGalleryContent;
window.renderPlaygroundContent = renderPlaygroundContent;
window.renderVerificationContent = renderVerificationContent;
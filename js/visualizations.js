// ─────────────────────────────────────────────────────────────────────────────
// visualizations.js  —  Advanced visualizations (SVG-based)
// Depends on: config.js, api.js
// ─────────────────────────────────────────────────────────────────────────────

// Helper: create SVG element
function createSVG(tag, attrs) {
  const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [k, v] of Object.entries(attrs || {})) el.setAttribute(k, v);
  return el;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Sankey Diagram: Risk Factors → Hallucination Categories
// ─────────────────────────────────────────────────────────────────────────────
function renderSankeyDiagram(containerId, result) {
  const container = document.getElementById(containerId);
  if (!container || !result?.analysis) return;
  container.innerHTML = '';
  const W = container.clientWidth || 600;
  const H = 300;

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', W);
  svg.setAttribute('height', H);
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.style.overflow = 'visible';

  const flows = { risk: {}, category: {} };
  const sentences = result.analysis.filter(s => s.is_hallucination);
  const riskScan = result.riskScan || [];

  sentences.forEach(s => {
    const risks = riskScan[s.index] || [];
    const cat = s.category || 'unknown';
    risks.forEach(r => { flows.risk[r] = (flows.risk[r] || 0) + 1; });
    flows.category[cat] = (flows.category[cat] || 0) + 1;
  });

  const riskEntries = Object.entries(flows.risk).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const catEntries = Object.entries(flows.category).sort((a, b) => b[1] - a[1]).slice(0, 5);

  if (!riskEntries.length && !catEntries.length) {
    container.innerHTML = '<div style="text-align:center;color:#5A5A60;padding:2rem;font-size:.8125rem">No hallucination data to visualize</div>';
    return;
  }

  const leftX = 40, rightX = W - 140;
  const riskColors = ['#60A5FA', '#FBBF24', '#34D399', '#A78BFA', '#F472B6'];
  const catColors = ['#E85A4F', '#C9913D', '#8B6FE8', '#4CAF76', '#94A3B8'];

  const leftLabels = riskEntries.map(([k]) => RISK_FACTORS[k]?.label || k);
  const rightLabels = catEntries.map(([k]) => CATEGORIES[k] || k);
  const leftCounts = riskEntries.map(([, v]) => v);
  const rightCounts = catEntries.map(([, v]) => v);

  const leftTotal = leftCounts.reduce((a, b) => a + b, 0) || 1;
  const rightTotal = rightCounts.reduce((a, b) => a + b, 0) || 1;

  const leftH = leftLabels.length * 28;
  const rightH = rightLabels.length * 28;
  const startY = (H - Math.max(leftH, rightH)) / 2;

  // Left nodes (risk factors)
  let yOffset = 0;
  leftLabels.forEach((label, i) => {
    const h = Math.max(14, (leftCounts[i] / leftTotal) * 120);
    const y = startY + yOffset;
    const rect = createSVG('rect', { x: leftX, y, width: 14, height: h, rx: 3, fill: riskColors[i % riskColors.length], opacity: 0.8 });
    svg.appendChild(rect);
    const text = createSVG('text', { x: leftX + 18, y: y + h / 2 + 4, fill: '#E8E4DA', 'font-size': '10', 'font-family': 'DM Sans, sans-serif' });
    text.textContent = `${label} (${leftCounts[i]})`;
    svg.appendChild(text);
    yOffset += h + 4;
  });

  // Right nodes (categories)
  yOffset = 0;
  rightLabels.forEach((label, i) => {
    const h = Math.max(14, (rightCounts[i] / rightTotal) * 120);
    const y = startY + yOffset;
    const rect = createSVG('rect', { x: rightX, y, width: 14, height: h, rx: 3, fill: catColors[i % catColors.length], opacity: 0.8 });
    svg.appendChild(rect);
    const text = createSVG('text', { x: rightX - 6, y: y + h / 2 + 4, fill: '#E8E4DA', 'font-size': '10', 'text-anchor': 'end', 'font-family': 'DM Sans, sans-serif' });
    text.textContent = `${label} (${rightCounts[i]})`;
    svg.appendChild(text);
    yOffset += h + 4;
  });

  // Flow lines
  sentences.forEach(s => {
    const risks = riskScan[s.index] || [];
    const cat = s.category || 'unknown';
    const ri = riskEntries.findIndex(([k]) => risks.includes(k));
    const ci = catEntries.findIndex(([k]) => k === cat);
    if (ri === -1 || ci === -1) return;

    const leftY = startY + riskEntries.slice(0, ri).reduce((a, [_, v]) => a + Math.max(14, (v / leftTotal) * 120) + 4, 0) + Math.max(14, (leftCounts[ri] / leftTotal) * 120) / 2;
    const rightY = startY + catEntries.slice(0, ci).reduce((a, [_, v]) => a + Math.max(14, (v / rightTotal) * 120) + 4, 0) + Math.max(14, (rightCounts[ci] / rightTotal) * 120) / 2;

    const midX = (leftX + 14 + rightX) / 2;
    const path = createSVG('path', {
      d: `M ${leftX + 14} ${leftY} Q ${midX} ${leftY} ${midX} ${rightY} Q ${midX} ${rightY} ${rightX} ${rightY}`,
      stroke: riskColors[ri % riskColors.length],
      'stroke-width': '1.5',
      fill: 'none',
      opacity: '0.15',
    });
    svg.appendChild(path);
  });

  // Title
  const title = createSVG('text', { x: W / 2, y: 18, fill: '#8B8680', 'font-size': '11', 'text-anchor': 'middle', 'font-family': 'DM Sans, sans-serif' });
  title.textContent = 'Risk Factors → Hallucination Categories';
  svg.appendChild(title);

  container.appendChild(svg);
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Radar Chart: Model Hallucination Profile
// ─────────────────────────────────────────────────────────────────────────────
function renderRadarChart(containerId, results, manualOverrides) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';
  const W = container.clientWidth || 360;
  const H = Math.min(W, 360);
  const CX = W / 2, CY = H / 2 + 10;
  const R = Math.min(CX, CY) - 40;

  const dimensions = ['factual_error', 'entity_fabrication', 'citation_hallucination', 'temporal_confusion', 'confident_wrongness', 'reasoning_error'];
  const labels = dimensions.map(d => CATEGORIES[d] || d);
  const angleStep = (2 * Math.PI) / dimensions.length;
  const models = results.filter(r => r.analysis);

  if (!models.length) {
    container.innerHTML = '<div style="text-align:center;color:#5A5A60;padding:2rem;font-size:.8125rem">No analysis data for radar chart</div>';
    return;
  }

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', W);
  svg.setAttribute('height', H);
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.style.overflow = 'visible';

  // Grid circles
  for (let g = 1; g <= 5; g++) {
    const gr = (R / 5) * g;
    const circle = createSVG('circle', { cx: CX, cy: CY, r: gr, fill: 'none', stroke: '#2A2A30', 'stroke-width': '0.5' });
    svg.appendChild(circle);
  }

  // Axes
  dimensions.forEach((_, i) => {
    const angle = -Math.PI / 2 + i * angleStep;
    const x = CX + R * Math.cos(angle);
    const y = CY + R * Math.sin(angle);
    const line = createSVG('line', { x1: CX, y1: CY, x2: x, y2: y, stroke: '#2A2A30', 'stroke-width': '0.5' });
    svg.appendChild(line);
    const lx = CX + (R + 20) * Math.cos(angle);
    const ly = CY + (R + 20) * Math.sin(angle);
    const text = createSVG('text', { x: lx, y: ly, fill: '#8B8680', 'font-size': '8', 'text-anchor': 'middle', 'dominant-baseline': 'middle', 'font-family': 'DM Sans, sans-serif' });
    text.textContent = labels[i];
    svg.appendChild(text);
  });

  // Data polygons
  const modelColors = ['#8B6FE8', '#4CAF76', '#FBBF24', '#60A5FA', '#F472B6', '#34D399'];
  models.forEach((model, mi) => {
    const a = computeRunAnalytics(model, manualOverrides || {});
    if (!a) return;
    const catData = dimensions.map(d => (a.catBreakdown[d] || 0) / Math.max(1, a.hallucinated));
    const maxVal = Math.max(...catData, 0.01);

    const points = catData.map((val, i) => {
      const angle = -Math.PI / 2 + i * angleStep;
      const r = (val / maxVal) * R;
      return { x: CX + r * Math.cos(angle), y: CY + r * Math.sin(angle) };
    });

    const polyData = points.map(p => `${p.x},${p.y}`).join(' ');
    const poly = createSVG('polygon', { points: polyData, fill: modelColors[mi % modelColors.length], opacity: '0.15', stroke: modelColors[mi % modelColors.length], 'stroke-width': '1.5' });
    svg.appendChild(poly);

    // Legend
    const ly = 14 + mi * 16;
    const dot = createSVG('rect', { x: W - 130, y: ly - 4, width: 8, height: 8, rx: 2, fill: modelColors[mi % modelColors.length] });
    svg.appendChild(dot);
    const text = createSVG('text', { x: W - 118, y: ly + 3, fill: '#E8E4DA', 'font-size': '9', 'font-family': 'DM Sans, sans-serif' });
    text.textContent = `${model.name} (${a.hallucinationRate}% rate)`;
    svg.appendChild(text);
  });

  container.appendChild(svg);
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Heatmap: Sentence × Model Matrix
// ─────────────────────────────────────────────────────────────────────────────
function renderHeatmapMatrix(containerId, results, manualOverrides) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';
  const models = results.filter(r => r.analysis);
  if (!models.length) {
    container.innerHTML = '<div style="text-align:center;color:#5A5A60;padding:2rem;font-size:.8125rem">No data for heatmap</div>';
    return;
  }

  const maxSentences = Math.max(...models.map(m => m.analysis.length));
  const cellSize = Math.min(22, Math.max(10, (container.clientWidth - 120) / Math.max(1, maxSentences)));
  const W = Math.max(300, 120 + maxSentences * cellSize);
  const H = 50 + models.length * 30;

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', W);
  svg.setAttribute('height', H);
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.style.overflow = 'visible';

  // Column headers
  for (let i = 0; i < maxSentences; i++) {
    const text = createSVG('text', { x: 120 + i * cellSize + cellSize / 2, y: 14, fill: '#5A5A60', 'font-size': '7', 'text-anchor': 'middle', 'font-family': 'JetBrains Mono, monospace' });
    text.textContent = `#${i + 1}`;
    svg.appendChild(text);
  }

  // Rows
  models.forEach((model, mi) => {
    const y = 30 + mi * 30;
    const label = createSVG('text', { x: 8, y: y + cellSize / 2 + 3, fill: '#8B8680', 'font-size': '8', 'font-family': 'DM Sans, sans-serif' });
    label.textContent = model.name;
    svg.appendChild(label);

    const a = computeRunAnalytics(model, manualOverrides || {});
    const rateText = createSVG('text', { x: 110, y: y + cellSize / 2 + 3, fill: '#5A5A60', 'font-size': '7', 'text-anchor': 'end', 'font-family': 'JetBrains Mono, monospace' });
    rateText.textContent = a ? `${a.hallucinationRate}%` : '';
    svg.appendChild(rateText);

    for (let i = 0; i < maxSentences; i++) {
      const x = 120 + i * cellSize;
      const s = model.analysis[i];
      if (!s) {
        const rect = createSVG('rect', { x, y, width: cellSize - 1, height: cellSize - 1, fill: '#1A1A20', rx: 2 });
        svg.appendChild(rect);
        continue;
      }

      const ov = manualOverrides?.[`${model.id}-${i}`];
      const level = ov === 'hallucination' ? 'low' : ov === 'accurate' ? 'high' : getConfLevel(s);
      const colors = { high: '#2A4A2A', mid: '#3A2E16', low: '#3A1A1A', unverifiable: '#252530' };

      const rect = createSVG('rect', {
        x, y, width: cellSize - 1, height: cellSize - 1,
        fill: colors[level] || '#252530', rx: 2,
        stroke: s.is_hallucination ? '#E85A4F' : 'none',
        'stroke-width': s.is_hallucination ? '1.5' : '0',
        opacity: s.verifiable ? '1' : '0.5',
      });

      const title = createSVG('title', {});
      title.textContent = `#${s.index + 1}: ${s.text.slice(0, 80)}\nAccuracy: ${s.accuracy_confidence ?? 'N/A'}%\nCategory: ${s.category ?? 'N/A'}`;
      rect.appendChild(title);
      svg.appendChild(rect);
    }
  });

  container.appendChild(svg);
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. Uncertainty Ribbon — Accuracy & Certainty per Sentence
// ─────────────────────────────────────────────────────────────────────────────
function renderUncertaintyRibbon(containerId, result) {
  const container = document.getElementById(containerId);
  if (!container || !result?.analysis) return;
  container.innerHTML = '';
  const W = container.clientWidth || 600;
  const H = 80;

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', W);
  svg.setAttribute('height', H);
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.style.overflow = 'visible';

  const sentences = result.analysis;
  const count = sentences.length;
  if (!count) return;

  const barW = Math.max(6, (W - 40) / count);
  const padding = 20;

  sentences.forEach((s, i) => {
    const x = padding + i * barW;
    const accuracy = s.verifiable ? (s.accuracy_confidence || 50) : 0;
    const certainty = s.analyst_certainty || 0;
    const h = (accuracy / 100) * 40;
    const ch = (certainty / 100) * 40;
    const y = 50 - h;
    const cy = 50 - ch;

    // Accuracy bar
    const colors = { high: '#4CAF76', mid: '#C9913D', low: '#E85A4F', unverifiable: '#5A5A60' };
    const level = getConfLevel(s);
    const rect = createSVG('rect', {
      x, y, width: Math.max(2, barW - 2), height: Math.max(1, h),
      fill: colors[level] || '#5A5A60', rx: 1.5, opacity: '0.85',
    });
    const title = createSVG('title', {});
    title.textContent = `#${s.index + 1}: ${s.text.slice(0, 80)}\nAccuracy: ${accuracy}%`;
    rect.appendChild(title);
    svg.appendChild(rect);

    // Certainty bar (overlay, narrower)
    const cRect = createSVG('rect', {
      x: x + 1, y: cy, width: Math.max(1, barW - 4), height: Math.max(1, ch),
      fill: '#8B6FE8', rx: 1, opacity: '0.5',
    });
    svg.appendChild(cRect);
  });

  // Axis labels
  const yLabel = createSVG('text', { x: 4, y: 12, fill: '#5A5A60', 'font-size': '7', 'font-family': 'DM Sans, sans-serif' });
  yLabel.textContent = '100%';
  svg.appendChild(yLabel);
  const yLabel2 = createSVG('text', { x: 4, y: 60, fill: '#5A5A60', 'font-size': '7', 'font-family': 'DM Sans, sans-serif' });
  yLabel2.textContent = '0%';
  svg.appendChild(yLabel2);

  // Legend
  const legX = W - 140;
  const legendItems = [
    { label: 'Accuracy Confidence', color: '#4CAF76' },
    { label: 'Analyst Certainty', color: '#8B6FE8' },
  ];
  legendItems.forEach((item, i) => {
    const ly = 8 + i * 14;
    const dot = createSVG('rect', { x: legX, y: ly - 1, width: 8, height: 8, rx: 2, fill: item.color, opacity: '0.8' });
    svg.appendChild(dot);
    const text = createSVG('text', { x: legX + 12, y: ly + 5, fill: '#8B8680', 'font-size': '8', 'font-family': 'DM Sans, sans-serif' });
    text.textContent = item.label;
    svg.appendChild(text);
  });

  container.appendChild(svg);
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. Category Timeline
// ─────────────────────────────────────────────────────────────────────────────
function renderCategoryTimeline(containerId, result) {
  const container = document.getElementById(containerId);
  if (!container || !result?.analysis) return;
  container.innerHTML = '';
  const W = container.clientWidth || 600;
  const H = 120;

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', W);
  svg.setAttribute('height', H);
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.style.overflow = 'visible';

  const sentences = result.analysis;
  const count = sentences.length;
  if (!count) return;

  const padding = { top: 20, bottom: 20, left: 80, right: 20 };
  const plotW = W - padding.left - padding.right;
  const plotH = H - padding.top - padding.bottom;
  const stepX = plotW / Math.max(1, count - 1);

  const catColors = {
    accurate: '#4CAF76', factual_error: '#E85A4F', citation_hallucination: '#F472B6',
    temporal_confusion: '#60A5FA', entity_fabrication: '#34D399',
    confident_wrongness: '#FBBF24', reasoning_error: '#A78BFA', not_applicable: '#5A5A60',
  };
  const catOrder = ['accurate', 'factual_error', 'temporal_confusion', 'entity_fabrication', 'citation_hallucination', 'confident_wrongness', 'reasoning_error', 'not_applicable'];

  // Y-axis grid
  catOrder.forEach((cat, ci) => {
    const y = padding.top + (ci / (catOrder.length - 1)) * plotH;
    const line = createSVG('line', { x1: padding.left, y1: y, x2: W - padding.right, y2: y, stroke: '#2A2A30', 'stroke-width': '0.3', 'stroke-dasharray': '3,3' });
    svg.appendChild(line);
  });

  // Data points and lines per category
  catOrder.forEach((cat) => {
    const ci = catOrder.indexOf(cat);
    const points = sentences
      .map((s, i) => s.category === cat ? { x: padding.left + i * stepX, y: padding.top + (ci / (catOrder.length - 1)) * plotH, s } : null)
      .filter(p => p);

    if (points.length < 2) return;

    // Line
    const lineData = points.map(p => `${p.x},${p.y}`).join(' ');
    const polyline = createSVG('polyline', {
      points: lineData,
      fill: 'none',
      stroke: catColors[cat] || '#5A5A60',
      'stroke-width': '1.5',
      'stroke-linejoin': 'round',
      'stroke-linecap': 'round',
      opacity: '0.4',
    });
    svg.appendChild(polyline);

    // Points
    points.forEach(p => {
      const circle = createSVG('circle', { cx: p.x, cy: p.y, r: 3, fill: catColors[cat] || '#5A5A60', opacity: '0.8' });
      const title = createSVG('title', {});
      title.textContent = `#${p.s.index + 1}: ${p.s.text.slice(0, 80)}`;
      circle.appendChild(title);
      svg.appendChild(circle);
    });
  });

  // Y-axis labels
  catOrder.forEach((cat, ci) => {
    const y = padding.top + (ci / (catOrder.length - 1)) * plotH;
    const text = createSVG('text', { x: padding.left - 6, y: y + 3, fill: '#5A5A60', 'font-size': '7', 'text-anchor': 'end', 'font-family': 'DM Sans, sans-serif' });
    text.textContent = CATEGORIES[cat] || cat;
    svg.appendChild(text);
  });

  // X-axis label
  const xLabel = createSVG('text', { x: W / 2, y: H - 4, fill: '#5A5A60', 'font-size': '8', 'text-anchor': 'middle', 'font-family': 'DM Sans, sans-serif' });
  xLabel.textContent = 'Sentence Position →';
  svg.appendChild(xLabel);

  container.appendChild(svg);
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. Trend Chart: Historical Hallucination Rate
// ─────────────────────────────────────────────────────────────────────────────
function renderTrendChart(containerId, historyRuns, modelName) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';
  const W = container.clientWidth || 600;
  const H = 160;

  const relevant = historyRuns
    .filter(r => r.summary?.perModel?.some(m => m.name === modelName))
    .sort((a, b) => a.timestamp - b.timestamp);

  if (relevant.length < 2) {
    container.innerHTML = `<div style="text-align:center;color:#5A5A60;padding:1.5rem;font-size:.8125rem">Need at least 2 historical runs for trend (have ${relevant.length})</div>`;
    return;
  }

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', W);
  svg.setAttribute('height', H);
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.style.overflow = 'visible';

  const padding = { top: 16, bottom: 24, left: 40, right: 16 };
  const plotW = W - padding.left - padding.right;
  const plotH = H - padding.top - padding.bottom;

  const rates = relevant.map(r => {
    const m = r.summary.perModel.find(m => m.name === modelName);
    return m ? m.hallucinationRate || 0 : 0;
  });

  const maxRate = Math.max(...rates, 10);
  const stepX = plotW / Math.max(1, relevant.length - 1);

  // Grid
  for (let g = 0; g <= 4; g++) {
    const y = padding.top + (g / 4) * plotH;
    const line = createSVG('line', { x1: padding.left, y1: y, x2: W - padding.right, y2: y, stroke: '#2A2A30', 'stroke-width': '0.3', 'stroke-dasharray': '3,3' });
    svg.appendChild(line);
    const text = createSVG('text', { x: padding.left - 6, y: y + 3, fill: '#5A5A60', 'font-size': '7', 'text-anchor': 'end', 'font-family': 'JetBrains Mono, monospace' });
    text.textContent = `${Math.round(maxRate - (g / 4) * maxRate)}%`;
    svg.appendChild(text);
  }

  // Line
  const points = rates.map((r, i) => ({
    x: padding.left + i * stepX,
    y: padding.top + (1 - r / maxRate) * plotH,
  }));

  const lineData = points.map(p => `${p.x},${p.y}`).join(' ');
  const polyline = createSVG('polyline', {
    points: lineData,
    fill: 'none',
    stroke: '#E85A4F',
    'stroke-width': '2',
    'stroke-linejoin': 'round',
    'stroke-linecap': 'round',
  });
  svg.appendChild(polyline);

  // Area fill
  const areaData = `${padding.left},${padding.top + plotH} ` + lineData + ` ${W - padding.right},${padding.top + plotH}`;
  const areaPoly = createSVG('polygon', { points: areaData, fill: '#E85A4F', opacity: '0.08' });
  svg.appendChild(areaPoly);

  // Points
  points.forEach((p, i) => {
    const circle = createSVG('circle', { cx: p.x, cy: p.y, r: 3, fill: '#E85A4F', opacity: '0.8' });
    const title = createSVG('title', {});
    const date = new Date(relevant[i].timestamp).toLocaleDateString();
    title.textContent = `${date}: ${rates[i]}% hallucination rate`;
    circle.appendChild(title);
    svg.appendChild(circle);
  });

  // Title
  const title = createSVG('text', { x: W / 2, y: 12, fill: '#8B8680', 'font-size': '9', 'text-anchor': 'middle', 'font-family': 'DM Sans, sans-serif' });
  title.textContent = `Hallucination Rate Trend — ${modelName}`;
  svg.appendChild(title);

  container.appendChild(svg);
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. SVG Draw-on-Reveal Animation (Phase 4.5)
// ─────────────────────────────────────────────────────────────────────────────

function animateSVGDraw(svgEl, delay = 200, duration = 600) {
  if (typeof anime === 'undefined' || !svgEl) return;
  const paths = svgEl.querySelectorAll('path, polyline, polygon, line');
  paths.forEach((path, i) => {
    const length = path.getTotalLength ? path.getTotalLength() : 0;
    if (!length) return;
    path.style.strokeDasharray = length;
    path.style.strokeDashoffset = length;
    anime({
      targets: path,
      strokeDashoffset: [length, 0],
      duration: duration,
      delay: delay + i * 80,
      easing: 'easeOutCubic',
    });
  });
  // Fade in all other SVG elements
  const markers = svgEl.querySelectorAll('circle, rect, text, polygon:not(polyline)');
  if (markers.length) {
    anime({
      targets: markers,
      opacity: [0, 1],
      duration: 300,
      delay: delay + paths.length * 80 + anime.stagger(30),
      easing: 'easeOutCubic',
    });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Master renderer for Visualize tab
// ─────────────────────────────────────────────────────────────────────────────
function renderAllVisualizations(resultId, results, manualOverrides) {
  const activeResult = results.find(r => r.id === resultId);
  if (!activeResult) return;

  if (typeof renderUncertaintyRibbon !== 'undefined') renderUncertaintyRibbon(`ribbon-${resultId}`, activeResult);
  if (typeof renderSankeyDiagram !== 'undefined') renderSankeyDiagram(`sankey-${resultId}`, activeResult);
  if (typeof renderRadarChart !== 'undefined') renderRadarChart(`radar-${resultId}`, results, manualOverrides);
  if (typeof renderCategoryTimeline !== 'undefined') renderCategoryTimeline(`timeline-${resultId}`, activeResult);
  if (typeof renderHeatmapMatrix !== 'undefined') renderHeatmapMatrix(`heatmap-${resultId}`, results, manualOverrides);
}
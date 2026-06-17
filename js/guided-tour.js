// ─────────────────────────────────────────────────────────────────────────────
// guided-tour.js  —  Educational Guided Tour Mode with Interactive Quiz
// ─────────────────────────────────────────────────────────────────────────────

const GUIDED_TOUR_STEPS = [
  {
    id: 'welcome',
    title: 'Welcome to the Hallucination Prototype',
    content: `
      <p>This tool helps you <strong>induce, analyze, and visualize</strong> AI hallucinations across multiple models simultaneously.</p>
      <p>You'll learn to:</p>
      <ul style="margin:.5rem 0 0 1.5rem;line-height:1.8">
        <li>Generate adversarial prompts that trigger hallucinations</li>
        <li>Compare how different models respond to the same prompt</li>
        <li>Identify hallucination patterns using 4 analysis views</li>
        <li>Verify claims against web sources</li>
      </ul>
    `,
    action: null,
    highlight: null,
  },
  {
    id: 'configure',
    title: 'Step 1: Configure Your Models',
    content: `
      <p>First, you need API keys for at least two models:</p>
      <ol style="margin:.5rem 0 0 1.5rem;line-height:1.8">
        <li><strong>Analyst AI</strong> — Evaluates responses (recommended: Anthropic Claude or GPT-4o)</li>
        <li><strong>Hallucinator AIs</strong> — Generate responses (recommended: Groq for free tier)</li>
      </ol>
      <p>Click the <strong>⚙ Settings</strong> button in the header to add your keys.</p>
    `,
    action: 'open-settings',
    highlight: '[data-action="open-settings"]',
  },
  {
    id: 'generate',
    title: 'Step 2: Generate an Adversarial Prompt',
    content: `
      <p>Enter a topic and click <strong>Generate</strong>. The system will:</p>
      <ol style="margin:.5rem 0 0 1.5rem;line-height:1.8">
        <li>Craft a prompt designed to trigger hallucinations (targeting dates, entities, statistics)</li>
        <li>Send it to all enabled hallucinators in parallel</li>
        <li>Run the Analyst AI to fact-check every sentence</li>
      </ol>
      <p>Try a suggested topic like "Battle of Thermopylae" or enter your own.</p>
    `,
    action: null,
    highlight: '#topic-input',
  },
  {
    id: 'inducer-view',
    title: 'View 1: Inducer View (⬡)',
    content: `
      <p>The <strong>Inducer View</strong> shows every sentence with detailed analysis:</p>
      <ul style="margin:.5rem 0 0 1.5rem;line-height:1.8">
        <li><strong>Accuracy Confidence</strong> — How likely the sentence is correct (0–100%)</li>
        <li><strong>Analyst Certainty</strong> — How confident the analyst is in its judgment</li>
        <li><strong>Category Tag</strong> — Type of hallucination (factual_error, entity_fabrication, etc.)</li>
        <li><strong>Risk Badges</strong> — Pre-scan flags (dates, numbers, entities, superlatives)</li>
      </ul>
      <p>Click any sentence to expand for verification suggestions and correct versions.</p>
    `,
    action: null,
    highlight: '.mode-tab[data-mode="inducer"]',
  },
  {
    id: 'confidence-map',
    title: 'View 2: Confidence Map (◎)',
    content: `
      <p>The <strong>Confidence Map</strong> displays the full response as flowing prose with color-coded underlines:</p>
      <ul style="margin:.5rem 0 0 1.5rem;line-height:1.8">
        <li><span style="color:var(--c-green);text-decoration:underline">Green</span> = High confidence accurate</li>
        <li><span style="color:var(--c-amber);text-decoration:underline">Amber</span> = Uncertain</li>
        <li><span style="color:var(--c-red);text-decoration:underline">Red</span> = Likely hallucination</li>
        <li><span style="color:var(--c-gray-tx);text-decoration:underline">Gray</span> = Cannot assess</li>
      </ul>
      <p>Click any sentence to see details in the panel below.</p>
    `,
    action: null,
    highlight: '.mode-tab[data-mode="confidence"]',
  },
  {
    id: 'game-mode',
    title: 'View 3: Game Mode (◈)',
    content: `
      <p><strong>Game Mode</strong> hides the analysis — you guess which sentences are hallucinations:</p>
      <ol style="margin:.5rem 0 0 1.5rem;line-height:1.8">
        <li>Click sentences you think are wrong</li>
        <li>Hit <strong>Submit</strong> to reveal the truth</li>
        <li>Score: Correct hits, false positives, missed hallucinations</li>
      </ol>
      <p>Great for training your intuition about AI hallucination patterns!</p>
    `,
    action: null,
    highlight: '.mode-tab[data-mode="game"]',
  },
  {
    id: 'analytics',
    title: 'View 4: Analytics (◉) & Visualize (◐)',
    content: `
      <p><strong>Analytics</strong> provides quantitative summaries:</p>
      <ul style="margin:.5rem 0 0 1.5rem;line-height:1.8">
        <li>Distribution bar (accurate/uncertain/hallucination/unverifiable)</li>
        <li>Key metrics: hallucination rate, avg accuracy, analyst certainty</li>
        <li>Category breakdown & risk factor frequency</li>
        <li>Cross-model comparison table</li>
      </ul>
      <p><strong>Visualize (◐)</strong> adds SVG charts: uncertainty ribbon, sankey flow, radar profile, category timeline, heatmap matrix.</p>
    `,
    action: null,
    highlight: '.mode-tab[data-mode="analytics"]',
  },
  {
    id: 'compare',
    title: 'View 5: Compare (≣)',
    content: `
      <p>The <strong>Compare tab</strong> aligns sentences across models:</p>
      <ul style="margin:.5rem 0 0 1.5rem;line-height:1.8">
        <li>Agreement matrix — which models hallucinate on the same claims</li>
        <li>Sentence-by-sentence alignment with semantic grouping</li>
        <li>Category agreement analysis</li>
      </ul>
      <p>Reveals whether hallucinations are model-specific or prompt-driven.</p>
    `,
    action: null,
    highlight: '.mode-tab[data-mode="compare"]',
  },
  {
    id: 'verification',
    title: 'Ground Truth Verification (🔍)',
    content: `
      <p>Click <strong>🔍 Verify</strong> to fact-check flagged sentences against real sources:</p>
      <ul style="margin:.5rem 0 0 1.5rem;line-height:1.8">
        <li>Searches DuckDuckGo + Wikipedia automatically</li>
        <li>Extracts key terms (dates, numbers, entities) from each sentence</li>
        <li>Shows match confidence and source snippets</li>
        <li>Moves beyond "AI judges AI" to verifiable evidence</li>
      </ul>
    `,
    action: null,
    highlight: '[data-action="open-verify"]',
  },
  {
    id: 'playground',
    title: 'Prompt Playground (🔬)',
    content: `
      <p>Click <strong>🔬 Playground</strong> to test prompt mutations:</p>
      <ul style="margin:.5rem 0 0 1.5rem;line-height:1.8">
        <li>Auto-generates 5 prompt variants (add specificity, frame as authority, request citations, etc.)</li>
        <li>Select variants and run batch comparison across all models</li>
        <li>See how small prompt changes affect hallucination rates</li>
      </ul>
    `,
    action: null,
    highlight: '[data-action="open-playground"]',
  },
  {
    id: 'gallery',
    title: 'Prompt Gallery (📋)',
    content: `
      <p>Click <strong>📋 Gallery</strong> for curated adversarial prompts by category:</p>
      <ul style="margin:.5rem 0 0 1.5rem;line-height:1.8">
        <li>Temporal Confusion (wrong dates, timeline errors)</li>
        <li>Entity Fabrication (fake people, papers, standards)</li>
        <li>Citation Hallucination (fake legal cases, academic papers)</li>
        <li>Confident Wrongness (precise but wrong numbers)</li>
        <li>Reasoning Error (causal chain reversals, base rate neglect)</li>
      </ul>
      <p>Each includes expected hallucination type and difficulty rating.</p>
    `,
    action: null,
    highlight: '[data-action="open-gallery"]',
  },
  {
    id: 'export',
    title: 'Export & Share',
    content: `
      <p>Click <strong>↑ Export</strong> for multiple formats:</p>
      <ul style="margin:.5rem 0 0 1.5rem;line-height:1.8">
        <li><strong>CSV / JSONL</strong> — For statistical analysis in Python/R</li>
        <li><strong>Case Study (Markdown)</strong> — Annotated report for teaching/publication</li>
        <li><strong>JSON</strong> — Full session data for reproducibility</li>
        <li><strong>Print/PDF</strong> — Clean formatted output</li>
      </ul>
      <p>History panel (🕑) saves every run to IndexedDB for longitudinal tracking.</p>
    `,
    action: null,
    highlight: '[data-action="toggle-export"]',
  },
  {
    id: 'complete',
    title: 'Tour Complete!',
    content: `
      <p>You're ready to explore AI hallucinations. Key tips:</p>
      <ul style="margin:.5rem 0 0 1.5rem;line-height:1.8">
        <li>Use <strong>1–6 keys</strong> to switch views quickly</li>
        <li><strong>P</strong> enters presentation mode (fullscreen)</li>
        <li><strong>Esc</strong> closes any panel</li>
        <li>Adjust the <strong>threshold slider</strong> to see how detection sensitivity changes</li>
        <li>Use <strong>Manual Override</strong> in Inducer View to apply your own judgment</li>
      </ul>
      <p style="margin-top:1rem"><strong>Happy hallucination hunting! 🎯</strong></p>
    `,
    action: null,
    highlight: null,
  },
];

let tourState = {
  currentStep: 0,
  isActive: false,
  overlay: null,
};

function createTourOverlay() {
  const overlay = document.createElement('div');
  overlay.id = 'tour-overlay';
  overlay.className = 'tour-overlay';
  overlay.innerHTML = `
    <div class="tour-backdrop" onclick="closeTour()"></div>
    <div class="tour-modal" onclick="event.stopPropagation()">
      <div class="tour-header">
        <span class="tour-step-indicator"></span>
        <button class="btn-icon" onclick="closeTour()" aria-label="Close tour">✕</button>
      </div>
      <div class="tour-body">
        <h3 class="tour-title"></h3>
        <div class="tour-content"></div>
      </div>
      <div class="tour-footer">
        <button class="btn-ghost btn-sm" onclick="previousTourStep()" id="tour-prev">← Previous</button>
        <div class="tour-progress">
          <div class="tour-progress-bar"><div class="tour-progress-fill" id="tour-progress-fill"></div></div>
          <span class="tour-progress-text" id="tour-progress-text"></span>
        </div>
        <button class="btn-primary btn-sm" onclick="nextTourStep()" id="tour-next">Next →</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  return overlay;
}

function openTour() {
  if (tourState.isActive) return;
  tourState.isActive = true;
  tourState.currentStep = 0;
  
  if (!tourState.overlay) {
    tourState.overlay = createTourOverlay();
  }
  
  tourState.overlay.classList.remove('hidden');
  renderTourStep();
  
  // Add highlight style if not exists
  if (!document.getElementById('tour-highlight-style')) {
    const style = document.createElement('style');
    style.id = 'tour-highlight-style';
    style.textContent = `
      .tour-highlight {
        position: relative;
        z-index: 1000;
        box-shadow: 0 0 0 3px var(--purple), 0 0 0 6px var(--bg) !important;
        border-radius: var(--r) !important;
      }
      .tour-overlay { position: fixed; inset: 0; z-index: 400; display: flex; align-items: center; justify-content: center; }
      .tour-overlay.hidden { display: none; }
      .tour-backdrop { position: absolute; inset: 0; background: var(--overlay-bg, rgba(0,0,0,.7)); }
      .tour-modal { background: var(--card); border: 1px solid var(--border); border-radius: 16px; width: 90%; max-width: 520px; max-height: 85vh; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 24px 48px rgba(0,0,0,.5); }
      .tour-header { display: flex; justify-content: space-between; align-items: center; padding: 1rem 1.25rem; border-bottom: 1px solid var(--border); }
      .tour-step-indicator { font-family: var(--font-mono); font-size: .625rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: .1em; }
      .tour-body { padding: 1.25rem; overflow-y: auto; flex: 1; }
      .tour-title { font-size: 1.0625rem; font-weight: 600; margin-bottom: .75rem; color: var(--text); }
      .tour-content { font-size: .875rem; line-height: 1.7; color: var(--text-sec); }
      .tour-content ul, .tour-content ol { margin: .5rem 0 0 1.5rem; }
      .tour-content li { margin-bottom: .375rem; }
      .tour-content code { background: var(--bg); padding: .125rem .375rem; border-radius: var(--r-sm); font-family: var(--font-mono); font-size: .8125rem; }
      .tour-footer { display: flex; align-items: center; gap: 1rem; padding: 1rem 1.25rem; border-top: 1px solid var(--border); background: var(--bg); flex-wrap: wrap; }
      .tour-progress { flex: 1; display: flex; align-items: center; gap: .75rem; min-width: 200px; }
      .tour-progress-bar { flex: 1; height: 6px; background: var(--border); border-radius: 3px; overflow: hidden; }
      .tour-progress-fill { height: 100%; background: var(--purple); border-radius: 3px; transition: width .3s ease; }
      .tour-progress-text { font-family: var(--font-mono); font-size: .6875rem; color: var(--text-muted); white-space: nowrap; }
      @media (max-width: 600px) { .tour-footer { flex-direction: column; align-items: stretch; } .tour-progress { order: -1; } }
    `;
    document.head.appendChild(style);
  }
  
  // Handle keyboard navigation
  document.addEventListener('keydown', handleTourKeydown);
}

function closeTour() {
  tourState.isActive = false;
  tourState.currentStep = 0;
  if (tourState.overlay) {
    tourState.overlay.classList.add('hidden');
  }
  clearTourHighlight();
  document.removeEventListener('keydown', handleTourKeydown);
}

function handleTourKeydown(e) {
  if (!tourState.isActive) return;
  if (e.key === 'Escape') { closeTour(); return; }
  if (e.key === 'ArrowRight' || e.key === ' ') { nextTourStep(); return; }
  if (e.key === 'ArrowLeft') { previousTourStep(); return; }
}

function nextTourStep() {
  if (tourState.currentStep < GUIDED_TOUR_STEPS.length - 1) {
    tourState.currentStep++;
    renderTourStep();
  } else {
    closeTour();
  }
}

function previousTourStep() {
  if (tourState.currentStep > 0) {
    tourState.currentStep--;
    renderTourStep();
  }
}

function renderTourStep() {
  const step = GUIDED_TOUR_STEPS[tourState.currentStep];
  const modal = tourState.overlay?.querySelector('.tour-modal');
  if (!modal) return;

  modal.querySelector('.tour-step-indicator').textContent = `Step ${tourState.currentStep + 1} of ${GUIDED_TOUR_STEPS.length}`;
  modal.querySelector('.tour-title').textContent = step.title;
  modal.querySelector('.tour-content').innerHTML = step.content;

  const prevBtn = modal.querySelector('#tour-prev');
  const nextBtn = modal.querySelector('#tour-next');
  const progressFill = modal.querySelector('#tour-progress-fill');
  const progressText = modal.querySelector('#tour-progress-text');

  prevBtn.style.visibility = tourState.currentStep === 0 ? 'hidden' : 'visible';
  nextBtn.textContent = tourState.currentStep === GUIDED_TOUR_STEPS.length - 1 ? 'Finish' : 'Next →';
  
  const progress = ((tourState.currentStep + 1) / GUIDED_TOUR_STEPS.length) * 100;
  progressFill.style.width = `${progress}%`;
  progressText.textContent = `${tourState.currentStep + 1} / ${GUIDED_TOUR_STEPS.length}`;

  // Handle highlight
  clearTourHighlight();
  if (step.highlight) {
    const target = document.querySelector(step.highlight);
    if (target) {
      target.classList.add('tour-highlight');
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  // Handle action
  if (step.action && typeof window[step.action] === 'function') {
    // Action will be triggered when user clicks Next
    nextBtn.onclick = () => {
      window[step.action]();
      nextTourStep();
    };
  } else {
    nextBtn.onclick = nextTourStep;
  }
}

function clearTourHighlight() {
  document.querySelectorAll('.tour-highlight').forEach(el => el.classList.remove('tour-highlight'));
}

// Quiz system
const QUIZ_QUESTIONS = [
  {
    question: 'What does the "Analyst Certainty" score represent?',
    options: [
      'How accurate the sentence is',
      'How confident the analyst AI is in its own judgment',
      'How many sources support the claim',
      'The model\'s confidence in its answer',
    ],
    correct: 1,
    explanation: 'Analyst Certainty is the analyst AI\'s confidence in its own assessment — separate from Accuracy Confidence. A sentence can have 20% accuracy but only 55% analyst certainty, meaning the analyst suspects it\'s wrong but isn\'t fully sure.',
  },
  {
    question: 'Which hallucination category involves inventing fake academic citations?',
    options: [
      'Factual Error',
      'Entity Fabrication',
      'Citation Hallucination',
      'Temporal Confusion',
    ],
    correct: 2,
    explanation: 'Citation Hallucination is when the model produces fake academic sources, studies, or references that sound completely real — like the Mata v. Avianca case where ChatGPT invented six court cases.',
  },
  {
    question: 'What does a red underline in the Confidence Map indicate?',
    options: [
      'The sentence is accurate',
      'The sentence is unverifiable',
      'The sentence is likely a hallucination',
      'The sentence contains a date',
    ],
    correct: 2,
    explanation: 'Red = Likely hallucination (accuracy confidence below threshold). Green = High confidence accurate. Amber = Uncertain. Gray = Cannot assess.',
  },
  {
    question: 'Why does the "Prompt Gallery" categorize prompts by hallucination type?',
    options: [
      'To make the UI look organized',
      'So researchers can test specific hallucination patterns systematically',
      'To limit the number of prompts',
      'Because the API requires it',
    ],
    correct: 1,
    explanation: 'The gallery is organized by hallucination category (temporal confusion, entity fabrication, citation hallucination, etc.) so researchers can systematically test which prompts trigger which types of hallucinations.',
  },
  {
    question: 'What does the "Ground Truth Verification" feature do?',
    options: [
      'Asks the analyst AI to re-check its work',
      'Searches DuckDuckGo and Wikipedia for independent sources',
      'Compares the model\'s answer to its training data',
      'Checks if the prompt was adversarial',
    ],
    correct: 1,
    explanation: 'Verification searches the live web (DuckDuckGo HTML + Wikipedia API) for each flagged sentence, extracting key terms (dates, numbers, entities) and showing source snippets with match confidence — moving beyond "AI judges AI" to verifiable evidence.',
  },
];

let quizState = {
  currentQuestion: 0,
  score: 0,
  answers: [],
  isActive: false,
};

function openQuiz() {
  quizState.isActive = true;
  quizState.currentQuestion = 0;
  quizState.score = 0;
  quizState.answers = [];
  
  const overlay = document.createElement('div');
  overlay.id = 'quiz-overlay';
  overlay.className = 'quiz-overlay';
  overlay.innerHTML = `
    <div class="quiz-backdrop" onclick="closeQuiz()"></div>
    <div class="quiz-modal" onclick="event.stopPropagation()">
      <div class="quiz-header">
        <h3>🎓 Hallucination Knowledge Quiz</h3>
        <button class="btn-icon" onclick="closeQuiz()">✕</button>
      </div>
      <div class="quiz-body" id="quiz-body"></div>
      <div class="quiz-footer">
        <button class="btn-ghost btn-sm" onclick="previousQuizQuestion()" id="quiz-prev" style="visibility:hidden">← Previous</button>
        <div class="quiz-progress" id="quiz-progress"></div>
        <button class="btn-primary btn-sm" onclick="nextQuizQuestion()" id="quiz-next">Next →</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  renderQuizQuestion();
}

function closeQuiz() {
  quizState.isActive = false;
  const overlay = document.getElementById('quiz-overlay');
  if (overlay) overlay.remove();
}

function renderQuizQuestion() {
  const q = QUIZ_QUESTIONS[quizState.currentQuestion];
  const body = document.getElementById('quiz-body');
  const progress = document.getElementById('quiz-progress');
  const prevBtn = document.getElementById('quiz-prev');
  const nextBtn = document.getElementById('quiz-next');

  if (!body) return;

  const isLast = quizState.currentQuestion === QUIZ_QUESTIONS.length - 1;
  const isFirst = quizState.currentQuestion === 0;

  prevBtn.style.visibility = isFirst ? 'hidden' : 'visible';
  nextBtn.textContent = isLast ? 'See Results' : 'Next →';

  progress.innerHTML = QUIZ_QUESTIONS.map((_, i) => `
    <span class="quiz-progress-dot ${i === quizState.currentQuestion ? 'active' : ''} ${quizState.answers[i] !== undefined ? 'answered' : ''}" 
          onclick="goToQuizQuestion(${i})" title="Question ${i + 1}"></span>
  `).join('');

  const answered = quizState.answers[quizState.currentQuestion] !== undefined;
  const selectedAnswer = quizState.answers[quizState.currentQuestion];

  body.innerHTML = `
    <div class="quiz-question-card">
      <div class="quiz-question-number">Question ${quizState.currentQuestion + 1} of ${QUIZ_QUESTIONS.length}</div>
      <h4 class="quiz-question-text">${q.question}</h4>
      <div class="quiz-options">
        ${q.options.map((opt, i) => `
          <label class="quiz-option ${answered ? (i === q.correct ? 'correct' : i === selectedAnswer ? 'incorrect' : '') : ''}" 
                 ${!answered ? `onclick="selectQuizAnswer(${i})"` : ''}>
            <span class="quiz-option-letter">${String.fromCharCode(65 + i)}</span>
            <span class="quiz-option-text">${opt}</span>
            ${answered && i === q.correct ? '<span class="quiz-option-check">✓</span>' : ''}
            ${answered && i === selectedAnswer && i !== q.correct ? '<span class="quiz-option-x">✗</span>' : ''}
          </label>
        `).join('')}
      </div>
      ${answered ? `
        <div class="quiz-explanation" style="margin-top:1rem;padding:.75rem;background:var(--bg);border-radius:var(--r);border:1px solid var(--border)">
          <strong>Explanation:</strong> ${q.explanation}
        </div>
      ` : ''}
    </div>
  `;

  // Add quiz styles if not present
  if (!document.getElementById('quiz-styles')) {
    const style = document.createElement('style');
    style.id = 'quiz-styles';
    style.textContent = `
      .quiz-overlay { position: fixed; inset: 0; z-index: 400; display: flex; align-items: center; justify-content: center; padding: 1rem; }
      .quiz-backdrop { position: absolute; inset: 0; background: var(--overlay-bg, rgba(0,0,0,.7)); }
      .quiz-modal { background: var(--card); border: 1px solid var(--border); border-radius: 16px; width: 100%; max-width: 580px; max-height: 85vh; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 24px 48px rgba(0,0,0,.5); }
      .quiz-header { display: flex; justify-content: space-between; align-items: center; padding: 1rem 1.25rem; border-bottom: 1px solid var(--border); }
      .quiz-header h3 { font-size: 1rem; font-weight: 600; }
      .quiz-body { padding: 1.25rem; overflow-y: auto; flex: 1; }
      .quiz-question-card { animation: fadeIn .2s ease; }
      @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
      .quiz-question-number { font-family: var(--font-mono); font-size: .625rem; color: var(--purple); text-transform: uppercase; letter-spacing: .1em; margin-bottom: .5rem; }
      .quiz-question-text { font-size: .9375rem; font-weight: 600; margin-bottom: 1rem; line-height: 1.5; }
      .quiz-options { display: flex; flex-direction: column; gap: .5rem; }
      .quiz-option { display: flex; align-items: center; gap: .75rem; padding: .75rem 1rem; background: var(--bg); border: 1px solid var(--border); border-radius: var(--r); cursor: pointer; transition: all .15s; }
      .quiz-option:hover:not(.correct):not(.incorrect) { border-color: var(--purple-dim); background: var(--purple-bg); }
      .quiz-option.correct { border-color: var(--c-green-bd); background: var(--c-green-bg); }
      .quiz-option.incorrect { border-color: var(--c-red-bd); background: var(--c-red-bg); }
      .quiz-option-letter { font-family: var(--font-mono); font-size: .6875rem; font-weight: 600; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; background: var(--border); border-radius: 50%; color: var(--text-muted); flex-shrink: 0; }
      .quiz-option.correct .quiz-option-letter { background: var(--c-green); color: #0F0F11; }
      .quiz-option.incorrect .quiz-option-letter { background: var(--c-red); color: #fff; }
      .quiz-option-text { flex: 1; font-size: .875rem; color: var(--text); }
      .quiz-option-check, .quiz-option-x { font-size: .875rem; flex-shrink: 0; }
      .quiz-explanation { font-size: .8125rem; line-height: 1.6; color: var(--text-sec); }
      .quiz-explanation strong { color: var(--text); }
      .quiz-footer { display: flex; align-items: center; gap: 1rem; padding: 1rem 1.25rem; border-top: 1px solid var(--border); background: var(--bg); flex-wrap: wrap; }
      .quiz-progress { flex: 1; display: flex; gap: .375rem; justify-content: center; min-width: 200px; }
      .quiz-progress-dot { width: 10px; height: 10px; border-radius: 50%; background: var(--border); cursor: pointer; transition: all .15s; }
      .quiz-progress-dot.active { background: var(--purple); transform: scale(1.2); }
      .quiz-progress-dot.answered { background: var(--c-green); }
      .quiz-progress-dot:hover { background: var(--purple-dim); }
      @media (max-width: 600px) { .quiz-footer { flex-direction: column; align-items: stretch; } .quiz-progress { order: -1; } }
    `;
    document.head.appendChild(style);
  }
}

function selectQuizAnswer(answerIndex) {
  if (quizState.answers[quizState.currentQuestion] !== undefined) return;
  quizState.answers[quizState.currentQuestion] = answerIndex;
  if (answerIndex === QUIZ_QUESTIONS[quizState.currentQuestion].correct) {
    quizState.score++;
  }
  renderQuizQuestion();
}

function nextQuizQuestion() {
  if (quizState.currentQuestion < QUIZ_QUESTIONS.length - 1) {
    quizState.currentQuestion++;
    renderQuizQuestion();
  } else {
    showQuizResults();
  }
}

function previousQuizQuestion() {
  if (quizState.currentQuestion > 0) {
    quizState.currentQuestion--;
    renderQuizQuestion();
  }
}

function goToQuizQuestion(index) {
  if (index <= quizState.currentQuestion || quizState.answers[index] !== undefined) {
    quizState.currentQuestion = index;
    renderQuizQuestion();
  }
}

function showQuizResults() {
  const body = document.getElementById('quiz-body');
  const prevBtn = document.getElementById('quiz-prev');
  const nextBtn = document.getElementById('quiz-next');
  const progress = document.getElementById('quiz-progress');

  if (!body) return;

  prevBtn.style.display = 'none';
  nextBtn.textContent = 'Close';
  nextBtn.onclick = closeQuiz;
  progress.style.display = 'none';

  const percentage = Math.round((quizState.score / QUIZ_QUESTIONS.length) * 100);
  let message, emoji;
  if (percentage === 100) { message = 'Perfect! You\'re a hallucination expert.'; emoji = '🏆'; }
  else if (percentage >= 80) { message = 'Great job! Strong understanding.'; emoji = '🎯'; }
  else if (percentage >= 60) { message = 'Good foundation. Review the reference panel for details.'; emoji = '📚'; }
  else { message = 'Keep learning! The Reference panel (📚) has detailed explanations.'; emoji = '🌱'; }

  body.innerHTML = `
    <div style="text-align:center;padding:2rem 1rem">
      <div style="font-size:4rem;margin-bottom:1rem">${emoji}</div>
      <h3 style="margin-bottom:.5rem">Quiz Complete!</h3>
      <div style="font-family:var(--font-mono);font-size:2.5rem;font-weight:700;color:var(--purple);margin:.5rem 0">${percentage}%</div>
      <p style="color:var(--text-sec);margin-bottom:1.5rem">${message}</p>
      <div style="display:flex;gap:.75rem;justify-content:center;flex-wrap:wrap">
        <button class="btn-primary" onclick="openQuiz()">Retake Quiz</button>
        <button class="btn-ghost" onclick="openRefPanel(); closeQuiz()">Open Reference Panel 📚</button>
      </div>
    </div>
  `;
}

// Export for global access
window.openTour = openTour;
window.closeTour = closeTour;
window.nextTourStep = nextTourStep;
window.previousTourStep = previousTourStep;
window.openQuiz = openQuiz;
window.closeQuiz = closeQuiz;
window.selectQuizAnswer = selectQuizAnswer;
window.nextQuizQuestion = nextQuizQuestion;
window.previousQuizQuestion = previousQuizQuestion;
window.goToQuizQuestion = goToQuizQuestion;
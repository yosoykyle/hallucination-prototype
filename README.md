# Delulu Detector

A browser-based tool to induce, analyze, and visualize AI hallucinations across multiple models simultaneously. No server, no build step — clone and open `index.html`.

---

## For Collaborators — Getting Started

> These are the only steps needed to run the project locally.

**1. Clone the repo**
```bash
git clone <repo-url>
cd hallucination-prototype
```

**2. Create your personal config file**
```bash
# Windows
copy js\user-config.example.js js\user-config.js

# macOS / Linux
cp js/user-config.example.js js/user-config.js
```

**3. Add your API keys**

Open `js/user-config.js` and paste your keys where indicated. At minimum you need:
- An **Analyst AI** key (Claude or GPT-4o recommended — smarter = better analysis)
- At least one **Hallucinator** key (Groq is free with no credit card)

**4. Open `index.html` in Chrome or Edge — done.**

No server, no `npm install`, no build step required. All libraries load from CDN automatically.

> **Important:** `js/user-config.js` is in `.gitignore` — your API keys will never be committed to the repo. Never paste real keys into `user-config.example.js`.

---

## Quick API Key Guide

| Provider | Free? | Link | Key format |
|---|---|---|---|
| Anthropic (Claude) | No | [console.anthropic.com](https://console.anthropic.com) | `sk-ant-...` |
| Groq | Yes ✓ | [console.groq.com](https://console.groq.com) | `gsk_...` |
| Google Gemini | Yes ✓ | [aistudio.google.com](https://aistudio.google.com) | `AIza...` |
| OpenRouter | Yes ✓ | [openrouter.ai](https://openrouter.ai) | `sk-or-v1-...` |
| DeepSeek | ~Free | [platform.deepseek.com](https://platform.deepseek.com) | `sk-...` |
| Together AI | $1 free | [api.together.xyz](https://api.together.xyz) | `tgpv1...` |
| OpenAI | No | [platform.openai.com](https://platform.openai.com) | `sk-...` |
| Ollama | Free ✓ | [ollama.com](https://ollama.com) | *(no key needed)* |

**Recommended setup for zero cost:** Groq or OpenRouter key for both the analyst and hallucinators. OpenRouter offers many free models — try `meta-llama/llama-3.3-70b-instruct:free` or `google/gemma-4-31b-it:free`.

---

## Original Quick Start

1. Open `js/user-config.js` and paste your API keys
2. Open `index.html` in Chrome or Edge
3. Click **Generate**

---

## File Structure

```
hallucination-prototype/
├── index.html              Main entry point
├── css/
│   └── style.css           All styling (dark theme, print CSS)
├── js/
│   ├── user-config.example.js  ← COPY THIS to user-config.js, then add your keys
│   ├── user-config.js      ← YOUR FILE (gitignored — never committed)
│   ├── config.js           Constants, providers, educational content
│   ├── api.js              API adapters + system prompts + risk scanner
│   ├── render.js           All HTML rendering functions
│   └── app.js              State, generate logic, events, history, export
├── .gitignore              Keeps user-config.js and node_modules out of git
└── README.md
```

---

## Setting Up API Keys

Edit `js/user-config.js` — it is well-commented and shows exactly where to paste each key. Keys live in that file permanently and load every time you open the app.

**Analyst AI** (recommended: Claude or GPT-4o — smarter = better analysis)
- Anthropic key: https://console.anthropic.com

**Hallucinator AIs** (recommended: Groq for free, fast inference)
- Groq key: https://console.groq.com ← free tier, no credit card

| Provider       | Free? | Where to get key               |
|----------------|-------|--------------------------------|
| Anthropic       | No    | console.anthropic.com          |
| Groq            | Yes   | console.groq.com               |
| Google Gemini   | Yes   | aistudio.google.com            |
| OpenRouter      | Yes   | openrouter.ai — free models    |
| DeepSeek        | ~Free | platform.deepseek.com          |
| Together AI     | $1 credit | api.together.xyz          |
| OpenAI          | No    | platform.openai.com            |
| Ollama (local)  | Free  | ollama.com — no key needed     |

Multiple hallucinators with different providers or different API accounts (Claude #1, Claude #2) are all supported — just add entries in `user-config.js`.

---

## Ollama (Offline / Local)

```bash
# Install from ollama.com, then:
ollama pull llama3.2       # download the model (~2GB, one time)
ollama serve               # start before opening the app
```

In `user-config.js`, set `provider: 'ollama'`, `model: 'llama3.2'`, `apiKey: ''`.

---

## Three Input Modes

| Mode          | Behavior |
|---------------|----------|
| **Topic**     | Enter a topic — AI generates an adversarial prompt and runs it automatically |
| **Custom Prompt** | Write the exact prompt yourself — sent directly to all hallucinators |
| **Review**    | AI generates a prompt, pauses so you can edit it, then you approve and run |

---

## Five Result Views

| View             | What it shows |
|------------------|---------------|
| **⬡ Inducer**    | Every sentence annotated with accuracy %, analyst certainty %, category tag, risk badges, and expandable detail (verification suggestion, correct version, override controls) |
| **◎ Confidence Map** | The response as flowing prose with color-coded sentence underlines. Click any sentence for details. |
| **◉ Analytics**  | Distribution bar, key metrics, hallucination category breakdown, risk factor frequency, cross-model comparison table |
| **◐ Visualize**  | SVG charts: uncertainty ribbon, sankey flow, radar profile, category timeline, heatmap matrix |
| **≣ Compare**    | Sentence-by-sentence alignment across models, agreement matrix, category comparison |

---

## Two-Tier Confidence System

Every sentence gets two scores:

- **Accuracy Confidence** — how accurate the sentence likely is (0–100%)
- **Analyst Certainty** — how confident the analyst is in its own judgment (0–100%)

A sentence can score 20% accuracy with only 55% analyst certainty — meaning the analyst suspects it's wrong but isn't fully sure. Both scores together describe the reliability of the assessment.

---

## Key Features

**Hallucination Threshold Slider** — adjusts where "uncertain" ends and "hallucination" begins (default 60%). Moving it demonstrates that hallucination detection is a threshold decision, not a binary truth.

**Manual Override** — click any sentence in Inducer View to expand it, then confirm it as accurate or hallucination regardless of the analyst's verdict.

**Pre-Scan Risk Badges** — client-side structural scan (no API) runs before analysis, flagging sentences containing dates, statistics, named entities, superlatives, causal claims, or high specificity.

**Context Injector** — prepend framing text to the prompt before all hallucinators receive it (e.g. "You are answering a medical professional"). Tests how context affects hallucination patterns.

**Hallucinator Personas** — Unguarded AI, Domain Expert, Cautious AI, Overconfident AI, or fully custom system prompt per hallucinator.

**Session History** — every completed run is automatically saved to browser localStorage. Open 🕑 History to restore any past run in read-only mode.

**📚 Reference Panel** — educational content explaining each hallucination category with real-world examples, why AI hallucinates, and how to interpret the scores.

**⛶ Presentation Mode** — full-screen clean overlay for projecting during a presentation. Keyboard shortcuts: `←` / `→` switch models, `1` `2` `3` `4` switch views, `Esc` exits.

**Export** — Copy summary text to clipboard, export full JSON, or Print / PDF via browser.

---

## Keyboard Shortcuts

| Key        | Action |
|------------|--------|
| `Esc`      | Close any open panel or exit presentation mode |
| `1–5`      | Switch between Inducer / Confidence / Analytics / Visualize / Compare |
| `P`        | Enter presentation mode (when results exist) |
| `←` / `→` | Navigate between models (in presentation mode) |

---

## Understanding the Disclaimer

The analyst is also an AI. It can be wrong, and it may share knowledge gaps with the models it evaluates. "Cannot Assess" means the analyst lacked confidence to make a judgment. Manual overrides exist precisely so a human can correct the analyst when needed.

---

## Storage & Privacy

- API keys are stored in `js/user-config.js` on your local machine only — never sent anywhere except directly to the AI provider APIs
- Session history is stored in browser localStorage (local to your machine, cleared if you clear browser data)
- Nothing is logged to any external server

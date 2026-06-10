// ─────────────────────────────────────────────────────────────────────────────
// user-config.example.js  —  TEMPLATE for collaborators
//
// HOW TO USE:
//   1. Copy this file: js/user-config.example.js → js/user-config.js
//   2. Fill in your own API keys in user-config.js
//   3. Open index.html — done.
//
// user-config.js is listed in .gitignore so your keys are never committed.
// NEVER paste real API keys into this example file.
//
// WHERE TO GET KEYS:
//   Anthropic  → https://console.anthropic.com          (paid)
//   Groq       → https://console.groq.com               (free tier, no card)
//   Google     → https://aistudio.google.com            (free tier)
//   OpenAI     → https://platform.openai.com            (paid)
//   Ollama     → https://ollama.com  (local, no key needed)
// ─────────────────────────────────────────────────────────────────────────────

const USER_CONFIG = {

  // ── Analyst AI ─────────────────────────────────────────────────────────────
  // Evaluates hallucinator responses. Use the smartest model you have access to.
  analyst: {
    name:     'Analyst AI',
    provider: 'anthropic',                      // anthropic | openai | groq | google | ollama | custom
    model:    'claude-sonnet-4-20250514',
    apiKey:   '',                               // ← Paste your Anthropic key here
    baseUrl:  '',                               // Leave empty to use the default API URL
  },


  // ── Hallucinator AIs ────────────────────────────────────────────────────────
  // Each entry answers the adversarial prompt. All enabled ones run in parallel.

  hallucinators: [

    // Groq is recommended for a free, fast hallucinator (no credit card needed)
    {
      id:                 'h-groq-llama',
      name:               'Groq Llama',
      provider:           'groq',
      model:              'llama-3.1-8b-instant',
      apiKey:             '',                   // ← Paste your Groq key here
      baseUrl:            '',
      enabled:            true,
      persona:            'unguarded',          // unguarded | expert | cautious | overconfident | custom
      customSystemPrompt: '',
    },

    // ── Example: Google Gemini (free tier at aistudio.google.com)
    {
      id:                 'h-gemini-flash',
      name:               'Gemini Flash',
      provider:           'google',
      model:              'gemini-2.0-flash',
      apiKey:             '',                   // ← Paste your Google AI Studio key here (starts with "AIza")
      baseUrl:            '',
      enabled:            false,
      persona:            'unguarded',
      customSystemPrompt: '',
    },

    // ── Example: OpenAI
    {
      id:                 'h-openai-gpt4o',
      name:               'GPT-4o Mini',
      provider:           'openai',
      model:              'gpt-4o-mini',
      apiKey:             '',                   // ← Paste your OpenAI key here
      baseUrl:            '',
      enabled:            false,
      persona:            'unguarded',
      customSystemPrompt: '',
    },

    // ── Example: Ollama (local, no API key needed)
    {
      id:                 'h-ollama-llama',
      name:               'Ollama Llama',
      provider:           'ollama',
      model:              'llama3.2',           // Run: ollama pull llama3.2
      apiKey:             '',
      baseUrl:            'http://localhost:11434',
      enabled:            false,
      persona:            'unguarded',
      customSystemPrompt: '',
    },
  ],


  // ── Default settings ────────────────────────────────────────────────────────

  confidenceThreshold: 60,      // 30–80. Below this % = flagged as hallucination.
  defaultInputMode:    'topic', // 'topic' | 'custom' | 'review'

};

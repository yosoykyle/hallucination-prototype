# Delulu Detector: Presentation & Demo Guide

This document is a comprehensive guide to help you present and demo the **Delulu Detector** project. It outlines the core concepts, system architecture, a step-by-step live demonstration flow, and key visual highlights, followed by an extensive Q&A section to prepare you for questions.

---

## 1. System Overview: What is this project?

The **Delulu Detector** is an interactive, browser-based playground designed to **induce, analyze, and visualize** hallucinations in Large Language Models (LLMs) in real time. 

Unlike traditional static benchmarking tools, this system is an educational sandbox. It allows users to query multiple models simultaneously using adversarial prompts and visually dissect where, how, and why the models make things up.

### Core Architecture (No-Server, Local-First)
* **Frontend**: Pure HTML5, CSS3 (Vanilla Custom Themes), and client-side JavaScript.
* **Libraries**: Bundled/CDN-loaded utilities like `anime.js` (animations), SVG rendering (diagrams), and IndexedDB for local session history.
* **Integrations**: Multi-provider API client supporting **Groq, Google Gemini, Anthropic, OpenAI, OpenRouter, and local Ollama instances**. All API requests occur directly from the user's browser, meaning no middleman servers store API keys.

---

## 2. Key Concepts & Terminology

To impress your audience, make sure to explain these core ideas:

### A. The Adversarial "Inducer" (Adversarial System Prompt)
* **What it is**: An system instruction that forces the Analyst AI to craft a prompt on a chosen topic designed to trip up other models.
* **Why it works**: It targets typical LLM weak spots: highly specific parameters (e.g., thermal conductivity at exactly 300K), obscure historical dates, fake academic citations (DOIs), and complex causal chains.

### B. Two-Tier Confidence System
Traditional systems use a simple true/false metric. This prototype uses a dual-metric assessment:
1. **Accuracy Confidence** (0–100%): How likely a specific sentence in the response is to be factually accurate.
2. **Analyst Certainty** (0–100%): How confident the Analyst AI is in its *own* capability to judge that statement.
   * *Example*: A sentence might get a $20\%$ Accuracy score but only $55\%$ Analyst Certainty, indicating the Analyst suspects a hallucination but flags its own limitation in verifying it.

### C. Pre-Scan Risk Badges (Client-Side Heuristics)
* Before the Analyst AI even runs, the client-side code scans sentences for structural triggers that correlate with high hallucination rates:
  * **Date / Year**: Specific dates.
  * **Statistic**: Numbers, percentages, units.
  * **Named Entity**: Proper capitalized nouns (e.g., people, institutions).
  * **Superlative**: Words like "smallest", "largest", "only".
  * **Causal Claim**: Transitional logic like "therefore", "because", "led to".
  * **High Specificity**: Extremely long sentences containing multiple dense facts.

### D. Model Personas
* You can configure hallucinators to adopt specific personas:
  * **Unguarded AI**: Instructed to answer authoritatively, direct and details-first, with no hedging.
  * **Domain Expert**: Authoritative voice on specialized subjects.
  * **Cautious AI**: Normal safety alignment that hedges when uncertain.
  * **Overconfident AI**: Specifically optimized to fill knowledge gaps with plausible fabrications.

---

## 3. Step-by-Step Demo Script

Follow this path to deliver a smooth 5-to-10-minute live demo:

### Step 1: Setting the Stage (⚙️ Settings Configuration)
1. Open the app and open **Settings** (gear icon).
2. Show that you have configured multiple providers side-by-side (e.g., **Groq Llama**, **Gemini Flash**, and **OpenRouter Free**).
3. Explain that the **Analyst AI** (usually a larger model like Gemini 2.5 Pro or Claude 3.5 Sonnet) is separated from the **Hallucinators** (usually smaller, faster models like Llama-3-8B).
4. Save and return.

### Step 2: Running a Generation (The "Topic" Mode)
1. In the input box, type an obscure topic (e.g., `"Byzantine Empire"` or `"The Transistor"` or use one of the easter eggs like `"cow level"` / `"One Piece"` to trigger toast notifications).
2. Keep the input mode set to **Topic** and click **Generate**.
3. **Point out the Loading Steps**:
   * *Step 1*: Crafting the adversarial prompt.
   * *Step 2*: Gathering responses in parallel from all enabled models.
   * *Step 3*: Running sentence-by-sentence analysis.

### Step 3: Explaining the Results Views
Once the results load, navigate through the tabs (1–5) to show different angles of analysis:

#### View 1: ⬡ Inducer View
* Point out the color-coded sentences:
  * **Green (Accurate)**: Verified claims.
  * **Orange (Uncertain)**: Marginal confidence.
  * **Red (Hallucination)**: Factual errors, fabricated entities, or temporal confusion.
* Hover over the **Pre-Scan Badges** (Date, Entity, etc.) to show how they predicted risk.
* Click on a **Red (Hallucinated)** sentence to expand it. Show the:
  * *Explanation* of why it is flagged.
  * *Verification Suggestion* (where a human would look to verify).
  * *Correct Version* provided by the analyst.
* Show the **Manual Override** buttons ("Accurate" / "Hallucination") which allow humans to correct the AI Analyst's errors.

#### View 2: ◎ Confidence Map
* Show this view to represent a reading-friendly prose format.
* Click a sentence to highlight it and pull up its stats in the sidebar, showing how a user can easily browse complex reports.

#### View 3: ◉ Analytics
* Highlight the top summary cards: **Avg Accuracy**, **Analyst Certainty**, and **Hallucination Rate**.
* Show the **Category Breakdown** (how many Entity Fabrications vs. Factual Errors occurred).
* Point out the **Risk Factor Frequency** chart showing which sentence structures were most dangerous.

#### View 4: ◐ Visualize (SVG Charts)
* Explain the custom SVG visualizations rendered directly in the browser:
  * **Uncertainty Ribbon**: A visual graph tracking sentence accuracy sequence.
  * **Sankey Flow**: Maps how sentences move from pre-scan risk categories into final confidence bands.
  * **Radar Profile**: Compares model characteristics.

#### View 5: ≣ Compare
* Show the side-by-side comparison of different models.
* Highlight the **Agreement Matrix** which calculates the mathematical overlap between what Model A and Model B claimed.

---

## 4. Anticipated Questions & How to Answer Them

Be prepared for these standard questions during your Q&A:

### Q1: "If the Analyst AI is also an AI, how do we know it isn't hallucinating its own analysis?"
* **Answer**: *"This is the fundamental paradox of using AI to evaluate AI, known as 'Recursive Hallucination.' The prototype addresses this in three ways: first, the Analyst AI is instructed to be meta-cognitive (scoring its own certainty lower if it is unsure of the facts); second, the system provides a **Verification Suggestion** (e.g., check Google Scholar or patent records) rather than claiming absolute authority; and third, it incorporates a **Manual Override** button to allow human-in-the-loop validation, emphasizing that the system is an assist tool, not a final source of truth."*

### Q2: "Why do smaller models hallucinate more when they are forced to answer without hedging?"
* **Answer**: *"Smaller models have a smaller compressed database of parameters and 'know' less. However, in conversation, RLHF (Reinforcement Learning from Human Feedback) trains models to sound helpful and polite, which causes them to write plausible-sounding prose even when they lack the underlying data. By using the 'Unguarded' or 'Overconfident' personas, we strip away their hedging qualifiers (like 'I believe' or 'As far as I know'), forcing them to output raw predictions, which exposes the underlying gaps in their training."*

### Q3: "What is the difference between 'Accuracy Confidence' and 'Analyst Certainty'?"
* **Answer**: *"Accuracy Confidence is the Analyst's rating of the statement's factual correctness (e.g., 'This date is correct'). Analyst Certainty is the Analyst's confidence in its own rating (e.g., 'I am 100% sure this date is correct' vs 'I suspect this date is wrong, but I only have 40% certainty because my training data cutoff is close to this event'). This prevents the analyst from making overconfident assertions about niche topics."*

### Q4: "How does the Pre-Scan Risk Scanner work without calling an API?"
* **Answer**: *"It uses local regular expressions (RegEx) to analyze the grammatical structure of the sentence. It looks for numbers followed by units (Statistics), capitalized word sequences (Entities), years and months (Dates), and logical conjunctives (Causal). It highlights potential pitfalls immediately on the client-side to demonstrate that high factual density is statistically correlated with a higher risk of model confabulation."*

### Q5: "Is the data persisted? Where are my API keys stored?"
* **Answer**: *"Yes, but completely locally. The project uses the browser's `localStorage` for visual configurations/themes, and `IndexedDB` to store session run histories. API keys are loaded directly from your local `js/user-config.js` file, which is listed in `.gitignore` so it is never committed to GitHub. Keys are sent straight from your browser to the AI providers' endpoints, with no middleman server involved."*

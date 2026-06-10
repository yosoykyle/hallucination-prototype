// ─────────────────────────────────────────────────────────────────────────────
// config.js  —  Constants, provider definitions, educational content
// ─────────────────────────────────────────────────────────────────────────────

const PROVIDERS = {
  anthropic: { name:'Anthropic (Claude)', defaultBaseUrl:'https://api.anthropic.com', format:'anthropic', models:['claude-sonnet-4-20250514','claude-haiku-4-5-20251001','claude-opus-4-6'], hint:'Get your key at console.anthropic.com' },
  openai:    { name:'OpenAI (ChatGPT)',    defaultBaseUrl:'https://api.openai.com',     format:'openai',    models:['gpt-4o','gpt-4o-mini','gpt-3.5-turbo'], hint:'Get your key at platform.openai.com' },
  groq:      { name:'Groq (free tier)',    defaultBaseUrl:'https://api.groq.com/openai',format:'openai',    models:['llama-3.1-8b-instant','llama-3.3-70b-versatile','mixtral-8x7b-32768','gemma2-9b-it'], hint:'Free tier at console.groq.com — no credit card needed' },
  google:    { name:'Google (Gemini)',     defaultBaseUrl:'https://generativelanguage.googleapis.com', format:'google', models:['gemini-2.5-flash','gemini-2.5-pro','gemini-2.0-flash','gemini-2.0-flash-lite','gemini-1.5-flash','gemini-1.5-pro'], hint:'Free tier at aistudio.google.com — paste your API key exactly as shown' },
  ollama:    { name:'Ollama (local)',      defaultBaseUrl:'http://localhost:11434',     format:'openai',    models:['llama3.2','llama3.1','mistral','phi3','gemma2','qwen2.5'], hint:'No API key needed — run "ollama serve" before opening the app' },
  custom:    { name:'Custom / Other',      defaultBaseUrl:'',                          format:'openai',    models:[], hint:'Any OpenAI-compatible endpoint (LM Studio, vLLM, etc.)' },
};

const INPUT_MODES = [
  { id:'topic',  label:'Topic',         desc:'Enter a topic — AI crafts the adversarial prompt and runs it automatically' },
  { id:'custom', label:'Custom Prompt', desc:'Write the exact prompt yourself — sent directly to all hallucinators' },
  { id:'review', label:'Review',        desc:'AI generates a prompt from your topic, then pauses so you can edit it before running' },
];

const HALLUCINATOR_PERSONAS = {
  unguarded:      { name:'Unguarded AI',      description:'Confident, no hedging — maximises hallucination likelihood',           systemPrompt:`You are a knowledgeable AI assistant. Answer questions thoroughly with specific details including names, dates, statistics, and figures. Be authoritative and direct. Do not hedge, qualify, or express uncertainty — give confident, definitive answers.` },
  expert:         { name:'Domain Expert',     description:'Specialist persona — authoritative on the subject',                    systemPrompt:`You are a leading expert and authority on this subject with decades of specialised experience. Answer as a seasoned specialist who knows every detail. Provide specific, technical information with complete confidence. Do not express uncertainty.` },
  cautious:       { name:'Cautious AI',       description:'Normal hedging — good comparison baseline',                            systemPrompt:`You are a helpful AI assistant. Answer questions accurately and honestly. If you are uncertain about specific details, say so clearly. Provide the information you know while acknowledging the limits of your knowledge.` },
  overconfident:  { name:'Overconfident AI',  description:'Fills knowledge gaps with plausible-sounding fabrications',           systemPrompt:`You are a highly knowledgeable AI. When answering questions always provide specific details — exact dates, precise statistics, named individuals, specific figures — even on complex or obscure topics. Present all information with complete authority and never express doubt or uncertainty.` },
  custom:         { name:'Custom',            description:'Write your own system prompt',                                         systemPrompt:'' },
};

const RISK_FACTORS = {
  date:        { label:'Date / Year',       color:'#60A5FA', bg:'#1E3A5A' },
  numerical:   { label:'Statistic',         color:'#FBBF24', bg:'#3D2E10' },
  entity:      { label:'Named Entity',      color:'#34D399', bg:'#0D2E23' },
  superlative: { label:'Superlative',       color:'#A78BFA', bg:'#2D1B4E' },
  causal:      { label:'Causal Claim',      color:'#94A3B8', bg:'#1F2937' },
  specific:    { label:'High Specificity',  color:'#F472B6', bg:'#3D1930' },
};

const CONF_LEVELS = {
  high:         { label:'Accurate',      dot:'#4CAF76', cssClass:'high'         },
  mid:          { label:'Uncertain',     dot:'#C9913D', cssClass:'mid'          },
  low:          { label:'Hallucination', dot:'#E85A4F', cssClass:'low'          },
  unverifiable: { label:'Cannot Assess', dot:'#5A5A60', cssClass:'unverifiable' },
};

const CATEGORIES = {
  accurate:'Accurate', factual_error:'Factual Error', citation_hallucination:'Citation Hallucination',
  temporal_confusion:'Temporal Confusion', entity_fabrication:'Entity Fabrication',
  confident_wrongness:'Confident Wrongness', reasoning_error:'Reasoning Error', not_applicable:'Not Verifiable',
};

const DEFAULT_CONFIDENCE_THRESHOLD = 60;
const THRESHOLD_MIN = 30;
const THRESHOLD_MAX = 80;

const MODES = [
  { id:'inducer',    label:'Inducer View',   sym:'⬡' },
  { id:'confidence', label:'Confidence Map', sym:'◎' },
  { id:'game',       label:'Game Mode',      sym:'◈' },
  { id:'analytics',  label:'Analytics',      sym:'◉' },
  { id:'visualize',  label:'Visualize',      sym:'◐' },
  { id:'compare',    label:'Compare',        sym:'≣' },
];

const SUGGESTIONS = ['Marie Curie','Byzantine Empire','One Piece','Final Fantasy VII','Nikola Tesla','The Legend of Zelda','The transistor','Pokémon lore','Philippine Revolution','Attack on Titan','Battle of Thermopylae','Elden Ring','Apollo 11','Chrono Trigger','Penicillin discovery','Genshin Impact'];

const LOAD_STEPS = [
  { id:1, label:'Crafting adversarial prompt', color:'#8B6FE8' },
  { id:2, label:'Gathering AI responses',       color:'#E88340' },
  { id:3, label:'Running analysis',             color:'#4CAF76' },
];

// ── Educational Content ───────────────────────────────────────────────────────

const EDUCATIONAL_CONTENT = {
  categories: [
    {
      id: 'factual_error',
      title: 'Factual Error',
      icon: '✗',
      description: 'The model states something factually incorrect with confidence.',
      mechanism: 'Occurs when training data contains errors, conflicting sources, or when the model over-generalises from related but inapplicable information.',
      realExample: 'In 2023, a lawyer submitted a legal brief citing six court cases researched with ChatGPT. All six cases were entirely fabricated — wrong docket numbers, wrong courts, wrong outcomes. The lawyer received sanctions from the court.',
      howToSpot: 'Any specific claim about facts, figures, or events that cannot be immediately verified should be cross-checked against a primary source.',
    },
    {
      id: 'temporal_confusion',
      title: 'Temporal Confusion',
      icon: '📅',
      description: 'The model places events, discoveries, or people in the wrong time period.',
      mechanism: 'Training data mixes sources from different time periods. The model has no true chronological understanding and interpolates dates from statistical patterns.',
      realExample: 'AI systems have consistently misdated historical events by decades, especially for lesser-known occurrences. A 2023 study found GPT-4 misattributed the founding dates of scientific institutions in over 30% of tested cases.',
      howToSpot: 'Any specific year, decade, or era claim — especially for events that are not extremely well-known — should be treated as potentially confused.',
    },
    {
      id: 'entity_fabrication',
      title: 'Entity Fabrication',
      icon: '👤',
      description: 'The model invents people, places, companies, books, or events that do not exist.',
      mechanism: 'When asked about something specific it does not know, the model generates a plausible-sounding answer rather than admitting ignorance. It has learned what "a real answer looks like" and produces that pattern.',
      realExample: 'When asked about notable researchers in an obscure academic field, multiple AI models invented full biographies — names, institutions, publication lists, and career details — for people who have never existed.',
      howToSpot: 'Named individuals, specialised organisations, and specific publications should always be verified through a search before being trusted.',
    },
    {
      id: 'citation_hallucination',
      title: 'Citation Hallucination',
      icon: '📄',
      description: 'The model produces a fake academic source, study, or reference that sounds completely real.',
      mechanism: 'A specific form of entity fabrication targeting sources. Models have seen millions of citations and learned their formatting patterns. They generate new ones by pattern-matching rather than recalling real references.',
      realExample: 'The 2023 Mata v. Avianca case (U.S. District Court): ChatGPT generated six fictitious case citations with realistic-sounding names, docket numbers, presiding judges, and invented quotes from the rulings. Every single one was fabricated.',
      howToSpot: 'Every citation an AI provides should be verified in Google Scholar, PubMed, or a legal database before use. Never cite an AI-provided reference in academic or legal work without checking.',
    },
    {
      id: 'confident_wrongness',
      title: 'Confident Wrongness',
      icon: '⚠',
      description: 'The topic and context are real, but a specific detail is subtly wrong — stated with complete certainty.',
      mechanism: 'The model processes the subject correctly but fills in specific details (a measurement, a name, a statistic) using statistical inference rather than verified knowledge. The surrounding correct information makes the error hard to detect.',
      realExample: 'AI-powered medical information tools have correctly described symptoms of conditions while providing subtly incorrect dosage thresholds or contraindication details — errors that are invisible unless the specific figure is checked against clinical guidelines.',
      howToSpot: 'Specific numbers, measurements, and statistics embedded in otherwise accurate text are especially prone to this. The correct context makes the error feel trustworthy.',
    },
    {
      id: 'reasoning_error',
      title: 'Reasoning Error',
      icon: '↯',
      description: 'The model draws an incorrect conclusion from otherwise accurate premises.',
      mechanism: 'LLMs do not perform logical reasoning — they predict likely sequences of text. Multi-step deductions and causal chains can break down because the model generates what a conclusion "should look like" rather than deriving it.',
      realExample: 'Studies on LLM reasoning have shown models correctly stating two independent facts (A causes B; B is prevented by C) but then incorrectly concluding that A is therefore harmless — reversing the causal chain entirely.',
      howToSpot: 'Any sentence containing "therefore", "because", "as a result", or "which means" should be examined for whether the conclusion actually follows from the stated premises.',
    },
  ],

  mechanisms: [
    { title:'Knowledge Cutoff', body:'Models are trained on data up to a specific date. Events, discoveries, or changes after that point are unknown — but the model may still generate confident-sounding answers rather than admitting it does not know.' },
    { title:'Pattern Completion Over Recall', body:'LLMs do not retrieve facts from a knowledge base. They predict likely next tokens based on learned patterns. Specific details like exact numbers, names, and dates are statistically inferred, not retrieved — making them unreliable for precision.' },
    { title:'Training Data Noise', body:'The internet contains errors, contradictions, and misinformation. Models learn all of these patterns equally and cannot reliably distinguish accurate information from plausible-sounding fiction.' },
    { title:'Overconfident Decoding', body:'Models fine-tuned with human feedback often learn to sound confident because users rate confident answers more highly. This training can suppress natural hedging language that might otherwise signal uncertainty.' },
    { title:'Sycophancy', body:'Models trained on human ratings tend to agree with and elaborate on whatever framing the user provides, even when the underlying premise is false. A leading question can cause the model to hallucinate in the direction the question implies.' },
  ],

  scores: [
    { title:'Accuracy Confidence', body:'How likely the analyst AI believes the sentence is factually correct (0–100%). Above threshold = accurate; near threshold = uncertain; below threshold = likely hallucination. This is the analyst\'s judgment based on its own training knowledge — not verified ground truth.' },
    { title:'Analyst Certainty', body:'How confident the analyst is in its own assessment. A sentence can score 20% accuracy with only 55% analyst certainty — meaning the analyst suspects it is wrong but is not fully sure. Both scores together describe the reliability of the assessment, not just the sentence.' },
    { title:'Hallucination Threshold', body:'The slider controlling where "uncertain" ends and "hallucination" begins. Default 60%. Moving it left catches more things as hallucinations; right is more conservative. This demonstrates that hallucination detection is a threshold decision, not a binary truth.' },
    { title:'Pre-Scan Risk Badges', body:'Client-side structural analysis that runs before the AI analyst. Flags sentences containing dates, statistics, named entities, superlatives, causal claims, or high specificity — all structural features that correlate with higher hallucination risk.' },
  ],

  promptGallery: [
    {
      id: 'pg-temporal-obscure',
      category: 'temporal_confusion',
      title: 'Obscure Historical Date',
      prompt: 'What was the exact date when the Treaty of Tordesillas was signed, and what were the specific longitudinal coordinates agreed upon?',
      tags: ['date', 'specific', 'historical'],
      expectedRisks: ['date', 'numerical', 'specific'],
      description: 'Targets precise historical dates and technical coordinates — models often confuse similar treaties or misremember exact coordinates.',
    },
    {
      id: 'pg-entity-fabrication',
      category: 'entity_fabrication',
      title: 'Fake Researcher Biography',
      prompt: 'Provide a detailed biography of Dr. Elena Vasiliev, the pioneering Soviet computer scientist who developed the first ternary logic processor in 1968.',
      tags: ['entity', 'date', 'technical'],
      expectedRisks: ['entity', 'date', 'numerical'],
      description: 'Invents a plausible-sounding person with specific credentials — tests entity fabrication with technical details.',
    },
    {
      id: 'pg-citation-hallucination',
      category: 'citation_hallucination',
      title: 'Fabricated Academic Citation',
      prompt: 'Cite the 2019 Nature paper "Quantum Entanglement in Macroscopic Systems at Room Temperature" by Chen et al., including the exact DOI and page numbers.',
      tags: ['citation', 'specific', 'technical'],
      expectedRisks: ['citation', 'entity', 'numerical', 'specific'],
      description: 'Requests a specific fake paper with DOI — models often generate realistic-looking but entirely fabricated citations.',
    },
    {
      id: 'pg-confident-wrongness',
      category: 'confident_wrongness',
      title: 'Subtly Wrong Technical Spec',
      prompt: 'What is the exact thermal conductivity of pure tungsten at 300 Kelvin, in W/(m·K), to three decimal places?',
      tags: ['numerical', 'specific', 'technical'],
      expectedRisks: ['numerical', 'specific', 'superlative'],
      description: 'Asks for a precise physical constant — models often give confident but slightly wrong values for obscure measurements.',
    },
    {
      id: 'pg-reasoning-error',
      category: 'reasoning_error',
      title: 'False Causal Chain',
      prompt: 'Since the invention of the transistor in 1947 directly caused the fall of the Berlin Wall in 1989, explain the detailed technological and political causal pathway.',
      tags: ['causal', 'date', 'historical'],
      expectedRisks: ['causal', 'date', 'reasoning'],
      description: 'Embeds a false causal premise — tests whether models will elaborate on nonsense causality rather than rejecting it.',
    },
    {
      id: 'pg-superlative-trap',
      category: 'confident_wrongness',
      title: 'Obscure Superlative Claim',
      prompt: 'Name the smallest known vertebrate species by body mass, including its exact average weight in milligrams and its binomial nomenclature.',
      tags: ['superlative', 'numerical', 'entity', 'specific'],
      expectedRisks: ['superlative', 'numerical', 'entity', 'specific'],
      description: 'Combines superlative + precise measurement + scientific name — high risk for confident wrongness.',
    },
    {
      id: 'pg-medical-dosage',
      category: 'confident_wrongness',
      title: 'Specific Medical Dosage',
      prompt: 'What is the maximum safe single dose of lithium carbonate for a 70kg adult with bipolar disorder, in milligrams, according to the 2018 APA guidelines?',
      tags: ['numerical', 'date', 'medical', 'specific'],
      expectedRisks: ['numerical', 'date', 'specific'],
      description: 'High-stakes medical query with specific numbers — confident wrongness here could be dangerous.',
    },
    {
      id: 'pg-legal-citation',
      category: 'citation_hallucination',
      title: 'Fake Legal Precedent',
      prompt: 'Summarize the holding in Smith v. Quantum Dynamics, 547 U.S. 312 (2006), including the key quote from Justice Scalia\'s majority opinion.',
      tags: ['citation', 'entity', 'date', 'legal'],
      expectedRisks: ['citation', 'entity', 'date'],
      description: 'Mimics the famous Mata v. Avianca case — tests legal citation hallucination with realistic case formatting.',
    },
    {
      id: 'pg-scientific-discovery',
      category: 'temporal_confusion',
      title: 'Misdated Discovery',
      prompt: 'In what year did Rosalind Franklin first publish the double helix structure of DNA, and in which journal did it appear?',
      tags: ['date', 'entity', 'historical', 'citation'],
      expectedRisks: ['date', 'entity', 'citation'],
      description: 'Tests temporal confusion around a famous discovery — models often misattribute the publication to Watson/Crick or wrong journal/year.',
    },
    {
      id: 'pg-geographic-fabrication',
      category: 'entity_fabrication',
      title: 'Fake Geographic Feature',
      prompt: 'Describe the geological formation and exact coordinates of the "Verdant Crater" in the Kamchatka Peninsula, including its diameter in kilometers and estimated age in years.',
      tags: ['entity', 'numerical', 'specific', 'geographic'],
      expectedRisks: ['entity', 'numerical', 'specific', 'date'],
      description: 'Invents a plausible-sounding geographic feature with precise measurements — tests entity fabrication in earth science context.',
    },
    // ── Fun: Anime & Game Culture ──────────────────────────────────────────────
    {
      id: 'pg-anime-timeline',
      category: 'temporal_confusion',
      title: 'Anime Timeline Mixup',
      prompt: 'In what year was the Straw Hat Pirates\' journey set, what was Gol D. Roger\'s exact bounty at the time of his execution, and how many chapters did the Marineford arc span in the manga?',
      tags: ['date', 'numerical', 'entity', 'specific'],
      expectedRisks: ['date', 'numerical', 'entity', 'specific'],
      description: 'Tests temporal confusion with One Piece lore — models often fabricate specific bounties and chapter counts for niche arcs.',
    },
    {
      id: 'pg-game-lore',
      category: 'entity_fabrication',
      title: 'Fictional Game Character Bio',
      prompt: 'Provide a detailed biography of Haurchefant Greystone from Final Fantasy XIV, including his exact age at death, his house affiliation, and the name of his father.',
      tags: ['entity', 'specific', 'date'],
      expectedRisks: ['entity', 'specific', 'date'],
      description: 'Tests entity fabrication with niche game lore — models often get minor characters wrong or invent details about their backstories.',
    },
    {
      id: 'pg-zelda-timeline',
      category: 'temporal_confusion',
      title: 'Zelda Timeline Confusion',
      prompt: 'In which order do Breath of the Wild, Ocarina of Time, and Skyward Sword occur in the official Zelda timeline? What are the exact years between each game\'s events?',
      tags: ['date', 'causal', 'reasoning'],
      expectedRisks: ['date', 'causal', 'reasoning'],
      description: 'Tests temporal confusion with the famously convoluted Legend of Zelda timeline — models often place games in the wrong branch order.',
    },
    {
      id: 'pg-pokemon-stats',
      category: 'confident_wrongness',
      title: 'Obscure Pokémon Stat',
      prompt: 'What is the exact base stat total of Shedinja and what is its hidden ability in Pokémon Emerald? Provide the specific ability name and effect.',
      tags: ['numerical', 'specific', 'entity'],
      expectedRisks: ['numerical', 'specific', 'entity'],
      description: 'Tests confident wrongness with precise game mechanics — models often guess wrong base stats or confuse abilities across generations.',
    },
    {
      id: 'pg-elden-lore',
      category: 'entity_fabrication',
      title: 'Elden Ring Lore Fabrication',
      prompt: 'Who was the Gloam-Eyed Queen in Elden Ring, what was her relationship to Marika, and in which exact patch was her cut content implemented?',
      tags: ['entity', 'date', 'specific'],
      expectedRisks: ['entity', 'date', 'specific'],
      description: 'Tests entity fabrication with obscure Elden Ring lore — the Gloam-Eyed Queen has debated lore even among fans. Models often invent definitive answers.',
    },
    {
      id: 'pg-chrono-plot',
      category: 'reasoning_error',
      title: 'Chrono Trigger Causal Paradox',
      prompt: 'If Crono is executed at the beginning of Chrono Trigger but later rescued via time travel, does saving him create a new timeline or fix the original? Explain the game\'s multiverse theory.',
      tags: ['causal', 'reasoning', 'entity'],
      expectedRisks: ['causal', 'reasoning', 'entity'],
      description: 'Tests reasoning around established time travel mechanics — models often invent contradictions that don\'t exist in the game\'s own logic.',
    },
    {
      id: 'pg-genshin-region',
      category: 'confident_wrongness',
      title: 'Genshin Impact Regional Detail',
      prompt: 'What is the exact population of Liyue Harbor according to the game\'s lore, how many adepti are confirmed to reside there, and what was the specific date of the Rite of Descension in the game\'s story?',
      tags: ['numerical', 'specific', 'date', 'entity'],
      expectedRisks: ['numerical', 'specific', 'date', 'entity'],
      description: 'Tests confident wrongness with Genshin Impact lore — models confidently invent population figures and adepti counts never stated in-game.',
    },
    {
      id: 'pg-attack-titan',
      category: 'temporal_confusion',
      title: 'Attack on Titan Timeline',
      prompt: 'In what year did the Fall of Wall Maria occur in Attack on Titan, how many Titans breached the wall, and what was Eren\'s exact height at the time?',
      tags: ['date', 'numerical', 'entity', 'specific'],
      expectedRisks: ['date', 'numerical', 'entity', 'specific'],
      description: 'Tests precise date and numerical recall from anime canon — models often confuse Wall Maria\'s fall year and fabricate Titan counts.',
    },
  ],
};

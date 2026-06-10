// ─────────────────────────────────────────────────────────────────────────────
// search.js  —  Lightweight web search for ground truth verification
// Uses DuckDuckGo HTML + Wikipedia API (no API keys needed)
// ─────────────────────────────────────────────────────────────────────────────

const SEARCH_CACHE = new Map();
const CACHE_TTL = 1000 * 60 * 30; // 30 minutes

async function searchDuckDuckGo(query, maxResults = 5) {
  const cacheKey = `ddg:${query}:${maxResults}`;
  const cached = SEARCH_CACHE.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.data;

  try {
    const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; HallucinationPrototype/1.0)' },
    });
    const html = await res.text();
    const results = parseDuckDuckGoHtml(html, maxResults);
    SEARCH_CACHE.set(cacheKey, { data: results, ts: Date.now() });
    return results;
  } catch (e) {
    console.warn('DuckDuckGo search failed:', e);
    return [];
  }
}

function parseDuckDuckGoHtml(html, maxResults) {
  const results = [];
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const links = doc.querySelectorAll('.result__snippet, .result__url, .web-result-description');

  let currentResult = {};
  doc.querySelectorAll('.result').forEach((el, i) => {
    if (i >= maxResults) return;
    const titleEl = el.querySelector('.result__title a');
    const snippetEl = el.querySelector('.result__snippet');
    const urlEl = el.querySelector('.result__url');
    if (titleEl) {
      results.push({
        title: titleEl.textContent?.trim() || '',
        url: titleEl.href || '',
        snippet: snippetEl?.textContent?.trim() || '',
        source: 'duckduckgo',
      });
    }
  });
  return results.slice(0, maxResults);
}

async function searchWikipedia(query, maxResults = 3) {
  const cacheKey = `wiki:${query}:${maxResults}`;
  const cached = SEARCH_CACHE.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.data;

  try {
    // Search for pages
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&srlimit=${maxResults}`;
    const searchRes = await fetch(searchUrl);
    const searchData = await searchRes.json();

    if (!searchData.query?.search?.length) return [];

    // Get extracts for top results
    const pageIds = searchData.query.search.slice(0, maxResults).map(r => r.pageid).join('|');
    const extractUrl = `https://en.wikipedia.org/w/api.php?action=query&prop=extracts&exintro=true&explaintext=true&pageids=${pageIds}&format=json`;
    const extractRes = await fetch(extractUrl);
    const extractData = await extractRes.json();

    const results = [];
    for (const [id, page] of Object.entries(extractData.query?.pages || {})) {
      results.push({
        title: page.title,
        url: `https://en.wikipedia.org/?curid=${id}`,
        snippet: page.extract?.slice(0, 500) || '',
        source: 'wikipedia',
      });
    }
    SEARCH_CACHE.set(cacheKey, { data: results, ts: Date.now() });
    return results;
  } catch (e) {
    console.warn('Wikipedia search failed:', e);
    return [];
  }
}

async function searchFactCheck(query, maxResults = 5) {
  // Combine DDG + Wikipedia for best coverage
  const [ddg, wiki] = await Promise.all([
    searchDuckDuckGo(query, maxResults),
    searchWikipedia(query, Math.min(3, maxResults)),
  ]);
  return [...wiki, ...ddg].slice(0, maxResults);
}

async function verifySentence(sentence) {
  // Extract key claims from sentence for search
  const query = extractVerificationQuery(sentence);
  const results = await searchFactCheck(query, 5);
  return { query, results };
}

function extractVerificationQuery(sentence) {
  // Remove hedging, keep factual claims
  let q = sentence
    .replace(/\b(I think|I believe|It seems|Probably|Maybe|Possibly|Likely|Apparently)\b/gi, '')
    .replace(/\b(according to|based on|sources say|reports indicate)\b/gi, '')
    .trim();

  // If too long, extract key entities/numbers
  if (q.length > 150) {
    const entities = q.match(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b/g) || [];
    const numbers = q.match(/\b\d[\d,.]*\s*(?:percent|%|million|billion|thousand|hundred|km|miles|kg|lbs|\$|USD|years?|days?)\b/gi) || [];
    const dates = q.match(/\b(?:1[0-9]{3}|20[0-2][0-9])\b/g) || [];
    q = [...new Set([...entities.slice(0, 3), ...numbers.slice(0, 2), ...dates.slice(0, 1)])].join(' ');
  }
  return q || sentence.slice(0, 120);
}

// Batch verification for multiple sentences
async function batchVerifySentences(sentences, concurrency = 3) {
  const results = [];
  for (let i = 0; i < sentences.length; i += concurrency) {
    const batch = sentences.slice(i, i + concurrency);
    const batchResults = await Promise.allSettled(batch.map(s => verifySentence(s.text)));
    batchResults.forEach((r, idx) => {
      results.push({
        sentence: batch[idx],
        success: r.status === 'fulfilled',
        data: r.status === 'fulfilled' ? r.value : { query: '', results: [], error: r.reason?.message },
      });
    });
  }
  return results;
}

// Attach to window for global access (no ES modules in browser scripts)
window.SearchAPI = {
  searchDuckDuckGo,
  searchWikipedia,
  searchFactCheck,
  verifySentence,
  batchVerifySentences,
  extractVerificationQuery,
};
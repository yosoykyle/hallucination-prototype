// ─────────────────────────────────────────────────────────────────────────────
// sw.js  —  Service Worker for offline support
// ─────────────────────────────────────────────────────────────────────────────

const CACHE_NAME = 'hallucination-prototype-v3';
const STATIC_ASSETS = [
  './',
  './index.html',
  './css/style.css',
  './js/config.js',
  './js/user-config.js',
  './js/db.js',
  './js/search.js',
  './js/prompt-gallery.js',
  './js/api.js',
  './js/apiClient.js',
  './js/render.js',
  './js/visualizations.js',
  './js/guided-tour.js',
  './js/app.js',
  './manifest.json',
  './node_modules/dexie/dist/dexie.min.js',
  './node_modules/animejs/lib/anime.min.js',
  './node_modules/morphdom/dist/morphdom-umd.min.js'
];

// Install - cache static assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate - clean old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => 
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch - network first for API, cache first for static
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  // Skip cross-origin requests
  if (url.origin !== location.origin) return;
  
  // Network-first for API calls
  if (url.pathname.startsWith('/api/') || url.pathname.includes('anthropic.com') || 
      url.pathname.includes('openai.com') || url.pathname.includes('groq.com') ||
      url.pathname.includes('googleapis.com') || url.pathname.includes('duckduckgo.com') ||
      url.pathname.includes('wikipedia.org')) {
    event.respondWith(networkFirst(event.request));
    return;
  }
  
  // Cache-first for static assets
  event.respondWith(cacheFirst(event.request));
});

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
  }
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    const cached = await caches.match(request);
    if (cached) return cached;
    return new Response(JSON.stringify({ error: 'Offline', offline: true }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Background sync for pending writes
self.addEventListener('sync', event => {
  if (event.tag === 'sync-history') {
    event.waitUntil(syncHistory());
  }
});

async function syncHistory() {
  // IndexedDB sync handled by main thread
  console.log('Background sync triggered');
}
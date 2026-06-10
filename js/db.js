// ─────────────────────────────────────────────────────────────────────────────
// db.js  —  IndexedDB wrapper (Dexie)
// ─────────────────────────────────────────────────────────────────────────────

const DB_NAME = 'HallucinationPrototypeDB';
let db = null;
let _dbReady = false;

async function initDB() {
  if (_dbReady && db) return db;
  if (typeof Dexie === 'undefined') {
    console.warn('Dexie not available — IndexedDB disabled');
    return null;
  }
  try {
    db = new Dexie(DB_NAME);
    db.version(2).stores({
      history: '++id, timestamp, topic, inputMode',
      promptGallery: '++id, category, tags, difficulty',
      settings: 'key',
      analytics: '++id, modelId, timestamp',
      userConfig: 'key',
      pendingWrites: '++id, store, operation, timestamp'
    });
    await db.open();
    _dbReady = true;
    return db;
  } catch (e) {
    // Schema mismatch from old library — delete and recreate
    if (e.name === 'UpgradeError' || e.message?.includes('primary key')) {
      console.warn('IndexedDB schema mismatch — deleting old database and retrying');
      try {
        db = null;
        _dbReady = false;
        await Dexie.delete(DB_NAME);
        db = new Dexie(DB_NAME);
        db.version(2).stores({
          history: '++id, timestamp, topic, inputMode',
          promptGallery: '++id, category, tags, difficulty',
          settings: 'key',
          analytics: '++id, modelId, timestamp',
          userConfig: 'key',
          pendingWrites: '++id, store, operation, timestamp'
        });
        await db.open();
        _dbReady = true;
        return db;
      } catch (e2) {
        console.warn('IndexedDB retry failed:', e2.name, e2.message);
        db = null;
        _dbReady = false;
        return null;
      }
    }
    console.warn('IndexedDB init failed:', e.name, e.message, e.stack);
    db = null;
    _dbReady = false;
    return null;
  }
}

async function table(name) {
  const database = await initDB();
  if (!database) return null;
  return database.table(name);
}

// ── History API (graceful no-op when IndexedDB unavailable) ─────────────────

async function DB_saveHistoryRun(run) {
  const t = await table('history');
  if (!t) return;
  return t.put(run);
}

async function DB_loadHistoryRuns({ limit = 20, offset = 0, search = '' } = {}) {
  const t = await table('history');
  if (!t) return { items: [], total: 0, hasMore: false };
  let col = t.orderBy('timestamp').reverse();
  if (search) {
    col = col.filter(r =>
      r.topic?.toLowerCase().includes(search.toLowerCase()) ||
      r.adversarialPrompt?.toLowerCase().includes(search.toLowerCase())
    );
  }
  const total = await col.count();
  const items = await col.offset(offset).limit(limit).toArray();
  return { items, total, hasMore: offset + items.length < total };
}

async function DB_deleteHistoryRun(id) {
  const t = await table('history');
  if (!t) return;
  return t.delete(id);
}

async function DB_clearAllHistory() {
  const t = await table('history');
  if (!t) return;
  return t.clear();
}

async function DB_getHistoryRun(id) {
  const t = await table('history');
  if (!t) return null;
  return t.get(id);
}

// ── Prompt Gallery API ───────────────────────────────────────────────────────

async function DB_savePromptGallery(prompts) {
  const t = await table('promptGallery');
  if (!t) return;
  const arr = Array.isArray(prompts) ? prompts : [prompts];
  return t.bulkPut(arr);
}

async function DB_loadPromptGallery({ category = null, limit = 50, offset = 0 } = {}) {
  const t = await table('promptGallery');
  if (!t) return { items: [], total: 0, hasMore: false };
  let col = category ? t.where('category').equals(category) : t.orderBy('id');
  const total = await col.count();
  const items = await col.offset(offset).limit(limit).toArray();
  return { items, total, hasMore: offset + items.length < total };
}

// ── Settings API ─────────────────────────────────────────────────────────────

async function DB_saveSetting(key, value) {
  const t = await table('settings');
  if (!t) return;
  return t.put({ key, value, updatedAt: Date.now() });
}

async function DB_loadSetting(key, defaultValue = null) {
  const t = await table('settings');
  if (!t) return defaultValue;
  const r = await t.get(key);
  return r?.value ?? defaultValue;
}

// ── Analytics API ────────────────────────────────────────────────────────────

async function DB_saveAnalyticsSnapshot(snapshot) {
  const t = await table('analytics');
  if (!t) return;
  return t.put(snapshot);
}

async function DB_loadAnalyticsHistory(modelId = null, limit = 50) {
  const t = await table('analytics');
  if (!t) return [];
  if (modelId) {
    return t.where('modelId').equals(modelId).limit(limit).toArray();
  }
  return t.orderBy('timestamp').reverse().limit(limit).toArray();
}

// ── Migration ────────────────────────────────────────────────────────────────

async function DB_migrateFromLocalStorage() {
  const migrated = await DB_loadSetting('migrated', false);
  if (migrated) return;
  try {
    const history = JSON.parse(localStorage.getItem('hp_history') || '[]');
    if (history.length) {
      const t = await table('history');
      if (t) await t.bulkPut(history);
    }
    await DB_saveSetting('migrated', true);
    console.log('Migrated ' + history.length + ' history items to IndexedDB');
  } catch (e) { console.warn('Migration failed:', e); }
}

async function DB_initializePromptGallery(defaultPrompts) {
  const existing = await DB_loadPromptGallery({ limit: 1 });
  if (existing.items.length > 0) return;
  await DB_savePromptGallery(defaultPrompts);
  console.log('Initialized prompt gallery with ' + defaultPrompts.length + ' prompts');
}

async function DB_loadConfig() {
  const t = await table('userConfig');
  if (!t) return null;
  return t.get('config');
}

// ── Session State API ─────────────────────────────────────────────────────────

async function DB_saveSessionState(state) {
  const t = await table('userConfig');
  if (!t) return;
  return t.put({
    key: 'sessionState',
    analyst: state.analyst,
    hallucinators: state.hallucinators,
    topic: state.topic,
    customPrompt: state.customPrompt,
    inputMode: state.inputMode,
    contextInjector: state.contextInjector,
    showContextInjector: state.showContextInjector,
    confidenceThreshold: state.confidenceThreshold,
    autoSaveConfig: state.autoSaveConfig,
    autoLoadConfig: state.autoLoadConfig,
    activeResultId: state.activeResultId,
    openRefCats: state.openRefCats,
    verificationResults: state.verificationResults,
    updatedAt: Date.now()
  });
}

async function DB_loadSessionState() {
  const t = await table('userConfig');
  if (!t) return null;
  const r = await t.get('sessionState');
  return r || null;
}

async function DB_saveFullConfig(config) {
  await DB_saveSessionState(config);
  const t = await table('userConfig');
  if (!t) return;
  return t.put({
    key: 'config',
    analyst: config.analyst,
    hallucinators: config.hallucinators,
    confidenceThreshold: config.confidenceThreshold,
    inputMode: config.inputMode,
    autoSaveConfig: config.autoSaveConfig,
    autoLoadConfig: config.autoLoadConfig,
    updatedAt: Date.now()
  });
}

window.DB = {
  saveHistoryRun: DB_saveHistoryRun,
  loadHistoryRuns: DB_loadHistoryRuns,
  deleteHistoryRun: DB_deleteHistoryRun,
  clearAllHistory: DB_clearAllHistory,
  getHistoryRun: DB_getHistoryRun,
  savePromptGallery: DB_savePromptGallery,
  loadPromptGallery: DB_loadPromptGallery,
  saveSetting: DB_saveSetting,
  loadSetting: DB_loadSetting,
  saveAnalyticsSnapshot: DB_saveAnalyticsSnapshot,
  loadAnalyticsHistory: DB_loadAnalyticsHistory,
  migrateFromLocalStorage: DB_migrateFromLocalStorage,
  initializePromptGallery: DB_initializePromptGallery,
  saveSessionState: DB_saveSessionState,
  loadSessionState: DB_loadSessionState,
  loadConfig: DB_loadConfig,
  saveFullConfig: DB_saveFullConfig,
  initDB
};

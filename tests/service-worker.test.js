// Unit-Test für service-worker.js (klassisches Worker-Script): Cache-Name aus Version,
// network-first für Kern-Code + Katalogdaten, cache-first für KanjiVG/Font. Wir laden den
// SW-Code in einen gemockten Worker-Scope (self/caches/fetch/importScripts) und rufen die Handler auf.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CODE = readFileSync(resolve(ROOT, 'service-worker.js'), 'utf8');
const ORIGIN = 'https://example.test';
const keyOf = (req) => (typeof req === 'string' ? req : req.url);

function loadSW({ version = '1.2.3', cacheStore = new Map(), fetchImpl } = {}) {
  const handlers = {};
  const opened = [];
  const self = {
    APP_VERSION: undefined,
    location: { origin: ORIGIN },
    addEventListener: (t, fn) => { handlers[t] = fn; },
    skipWaiting: () => Promise.resolve(),
    clients: { claim: () => Promise.resolve() },
  };
  const importScripts = () => { self.APP_VERSION = version; }; // wie assets/version.js
  const cacheObj = {
    add: (u) => { cacheStore.set(keyOf(u), { tag: 'precache' }); return Promise.resolve(); },
    put: (req, res) => { cacheStore.set(keyOf(req), res); return Promise.resolve(); },
    match: (req) => Promise.resolve(cacheStore.get(keyOf(req))),
  };
  const caches = {
    open: (name) => { opened.push(name); return Promise.resolve(cacheObj); },
    match: (req) => Promise.resolve(cacheStore.get(keyOf(req))),
    keys: () => Promise.resolve([...opened]),
    delete: () => Promise.resolve(true),
  };
  let fetchCalls = 0;
  const fetchFn = (req) => { fetchCalls++; return (fetchImpl || (() => Promise.resolve({ status: 200, type: 'basic', clone() { return this; }, tag: 'network' })))(req); };
  // eslint-disable-next-line no-new-func
  new Function('self', 'caches', 'fetch', 'URL', 'importScripts', CODE)(self, caches, fetchFn, URL, importScripts);
  return { handlers, self, caches, opened, cacheStore, fetchCalls: () => fetchCalls };
}

// Ruft den fetch-Handler für eine URL auf und liefert die von respondWith gelieferte Antwort.
function handleFetch(handlers, url, mode = 'no-cors') {
  return new Promise((res) => {
    handlers.fetch({ request: { method: 'GET', url, mode }, respondWith: (p) => res(p) });
  }).then((p) => p);
}

describe('service-worker', () => {
  it('leitet den Cache-Namen aus der App-Version ab', async () => {
    const { handlers, opened } = loadSW({ version: '9.9.9' });
    await new Promise((r) => handlers.install({ waitUntil: (p) => { p.then(r, r); } }));
    expect(opened).toContain('katalog-9.9.9');
  });

  it('Kern-Code (assets/app.js) ist network-first: liefert online die Netz-Antwort', async () => {
    const cacheStore = new Map([[ORIGIN + '/assets/app.js', { tag: 'cache' }]]);
    const { handlers } = loadSW({ cacheStore });
    const res = await handleFetch(handlers, ORIGIN + '/assets/app.js');
    expect(res.tag).toBe('network');
  });

  it('Kern-Code offline: fällt auf den Cache zurück', async () => {
    const cacheStore = new Map([[ORIGIN + '/assets/app.js', { tag: 'cache' }]]);
    const { handlers } = loadSW({ cacheStore, fetchImpl: () => Promise.reject(new Error('offline')) });
    const res = await handleFetch(handlers, ORIGIN + '/assets/app.js');
    expect(res.tag).toBe('cache');
  });

  it('Daten (assets/data/*.js) sind network-first: online kommt die frische Netz-Antwort', async () => {
    // Vorher cache-first — dadurch erreichten Inhalts-Korrekturen (z. B. ergänzte
    // Vokabel-Kanji) bestehende Installationen nie.
    const cacheStore = new Map([[ORIGIN + '/assets/data/vokabular.js', { tag: 'cache-data' }]]);
    const { handlers, fetchCalls } = loadSW({ cacheStore });
    const res = await handleFetch(handlers, ORIGIN + '/assets/data/vokabular.js');
    expect(res.tag).toBe('network');
    expect(fetchCalls()).toBe(1);
  });

  it('Daten offline: fallen auf den Cache zurück', async () => {
    const cacheStore = new Map([[ORIGIN + '/assets/data/vokabular.js', { tag: 'cache-data' }]]);
    const { handlers } = loadSW({ cacheStore, fetchImpl: () => Promise.reject(new Error('offline')) });
    const res = await handleFetch(handlers, ORIGIN + '/assets/data/vokabular.js');
    expect(res.tag).toBe('cache-data');
  });

  it('KanjiVG-SVGs bleiben cache-first: Cache-Treffer ohne Netz', async () => {
    const cacheStore = new Map([[ORIGIN + '/assets/kanjivg/05b66.svg', { tag: 'cache-svg' }]]);
    const { handlers, fetchCalls } = loadSW({ cacheStore });
    const res = await handleFetch(handlers, ORIGIN + '/assets/kanjivg/05b66.svg');
    expect(res.tag).toBe('cache-svg');
    expect(fetchCalls()).toBe(0);
  });
});

/* ============================================================
   SRS-Engine + Fortschritts-Store  ·  window.SRS
   - SM-2-light Scheduler (ease + Intervall in Tagen, Tagesgranularität)
   - abgeleitete Item-IDs (keine Daten-Edits nötig)
   - geteilte Review-Queue (buildQueue) für Tagesseite & alle Übungen
   - localStorage-Persistenz (ein JSON-Blob), injizierbar für Tests
   - JSON-Export/-Import zur Sicherung
   Reine Vanilla-JS, offline. Kein Zugriff auf app.js-Internas.
   ============================================================ */
(function () {
  'use strict';

  var KEY = 'katalog_srs_v1';
  var VERSION = 1;
  var MAX_HISTORY = 20;
  var DEFAULT_EASE = 2.5;
  var MIN_EASE = 1.3;

  /* ---------- Storage-Backend (injizierbar) ---------- */
  function defaultBackend() {
    try {
      if (typeof localStorage !== 'undefined') return localStorage;
    } catch (e) {}
    var mem = {};
    return {
      getItem: function (k) { return k in mem ? mem[k] : null; },
      setItem: function (k, v) { mem[k] = String(v); },
      removeItem: function (k) { delete mem[k]; },
    };
  }
  var backend = defaultBackend();

  /* ---------- Datums-Helfer (UTC, TZ-sicher) ---------- */
  function todayISO() { return new Date().toISOString().slice(0, 10); }
  function addDays(iso, n) {
    var p = String(iso).split('-');
    var d = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2]));
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
  }
  function round2(x) { return Math.round(x * 100) / 100; }

  /* ---------- Store-Grundgerüst ---------- */
  function freshStore() {
    return { v: VERSION, items: {}, daily: {}, stats: { streakDays: 0, lastActive: null, totalReviews: 0 } };
  }
  function defaultItem() {
    return { ease: DEFAULT_EASE, interval: 0, due: null, last: null, reps: 0, lapses: 0, streak: 0, history: [] };
  }

  var store = load();

  function load() {
    try {
      var raw = backend.getItem(KEY);
      if (!raw) return freshStore();
      var parsed = JSON.parse(raw);
      if (!parsed || parsed.v !== VERSION || typeof parsed.items !== 'object') return freshStore();
      return normalize(parsed);
    } catch (e) { return freshStore(); }
  }
  function normalize(s) {
    return {
      v: VERSION,
      items: s.items || {},
      daily: s.daily || {},
      stats: {
        streakDays: (s.stats && s.stats.streakDays) || 0,
        lastActive: (s.stats && s.stats.lastActive) || null,
        totalReviews: (s.stats && s.stats.totalReviews) || 0,
      },
    };
  }
  function save() {
    try { backend.setItem(KEY, JSON.stringify(store)); } catch (e) {}
  }

  /* ---------- ID-Ableitung ---------- */
  function srsId(type, obj) {
    if (type === 'kanji') return 'k:' + obj.k;
    if (type === 'vocab') return 'v:' + obj.kana + '|' + obj.lesson;
    if (type === 'grammar') return 'g:' + obj.pattern;
    return null;
  }
  function typeOf(id) {
    if (id.charAt(0) === 'k') return 'kanji';
    if (id.charAt(0) === 'v') return 'vocab';
    if (id.charAt(0) === 'g') return 'grammar';
    return null;
  }

  /* ---------- SM-2-light Scheduler (rein) ---------- */
  function sm2(prev, grade, today) {
    prev = prev || {};
    var ease = prev.ease || DEFAULT_EASE;
    var interval = prev.interval || 0;
    var reps = prev.reps || 0;
    var lapses = prev.lapses || 0;
    if (grade <= 0) {
      reps = 0; lapses += 1; ease = Math.max(MIN_EASE, round2(ease - 0.2)); interval = 0;
    } else {
      reps += 1;
      if (grade >= 2) ease = round2(ease + 0.15);
      if (reps === 1) interval = 1;
      else if (reps === 2) interval = grade >= 2 ? 4 : 3;
      else interval = Math.max(1, Math.round(interval * ease * (grade >= 2 ? 1.3 : 1)));
    }
    var due = grade <= 0 ? today : addDays(today, interval);
    return { ease: round2(ease), interval: interval, reps: reps, lapses: lapses, due: due, last: today };
  }

  /* ---------- Item-Zugriff ---------- */
  function get(id) { return store.items[id] || null; }
  function ensure(id) { return store.items[id] || defaultItem(); }

  function grade(id, g, today) {
    today = today || todayISO();
    var item = store.items[id] || defaultItem();
    var sched = sm2(item, g, today);
    item.ease = sched.ease; item.interval = sched.interval; item.due = sched.due;
    item.last = sched.last; item.reps = sched.reps; item.lapses = sched.lapses;
    item.streak = g > 0 ? (item.streak || 0) + 1 : 0;
    item.history = (item.history || []).concat([{ t: today, grade: g }]).slice(-MAX_HISTORY);
    store.items[id] = item;
    updateGlobalStreak(today);
    store.stats.totalReviews = (store.stats.totalReviews || 0) + 1;
    save();
    return item;
  }
  function updateGlobalStreak(today) {
    var last = store.stats.lastActive;
    if (last === today) return;
    if (last && addDays(last, 1) === today) store.stats.streakDays = (store.stats.streakDays || 0) + 1;
    else store.stats.streakDays = 1;
    store.stats.lastActive = today;
  }

  /* ---------- Fälligkeit ---------- */
  function isDue(id, today) {
    today = today || todayISO();
    var it = store.items[id];
    return !!(it && it.due && it.due <= today);
  }
  function dueIds(today) {
    today = today || todayISO();
    return Object.keys(store.items).filter(function (id) { return isDue(id, today); });
  }

  /* ---------- Registries aus den Daten ---------- */
  function registry(source, includePreview) {
    var out = [];
    if (source === 'kanji') {
      (window.KANJI || []).forEach(function (k) { out.push({ id: srsId('kanji', k), type: 'kanji', data: k }); });
    } else if (source === 'vocab') {
      (window.VOKABULAR || []).forEach(function (v) {
        if (includePreview || v.lesson <= 20) out.push({ id: srsId('vocab', v), type: 'vocab', data: v });
      });
    } else if (source === 'grammar') {
      (window.GRAMMATIK || []).forEach(function (g) {
        if (includePreview || g.lesson <= 20) out.push({ id: srsId('grammar', g), type: 'grammar', data: g });
      });
    }
    return out;
  }

  /* ---------- geteilte Review-Queue ---------- */
  function buildQueue(opts) {
    opts = opts || {};
    var sources = opts.sources || ['kanji', 'vocab', 'grammar'];
    var newLimit = opts.newLimit != null ? opts.newLimit : 5;
    var reviewLimit = opts.reviewLimit != null ? opts.reviewLimit : 15;
    var today = opts.today || todayISO();
    var includePreview = !!opts.includePreview;

    var all = [];
    sources.forEach(function (s) { all = all.concat(registry(s, includePreview)); });

    var due = all.filter(function (x) { return isDue(x.id, today); })
      .sort(function (a, b) { return (store.items[a.id].due || '').localeCompare(store.items[b.id].due || ''); })
      .slice(0, reviewLimit)
      .map(function (x) { return { id: x.id, type: x.type, data: x.data, reason: 'due' }; });

    var fresh = all.filter(function (x) { return !store.items[x.id]; })
      .slice(0, newLimit)
      .map(function (x) { return { id: x.id, type: x.type, data: x.data, reason: 'new' }; });

    return interleave(due, fresh);
  }
  function interleave(a, b) {
    var out = [], i = 0, j = 0;
    while (i < a.length || j < b.length) {
      if (i < a.length) out.push(a[i++]);
      if (j < b.length) out.push(b[j++]);
    }
    return out;
  }

  /* ---------- Statistik ---------- */
  function stats(today) {
    today = today || todayISO();
    var ids = Object.keys(store.items);
    var due = 0;
    ids.forEach(function (id) { if (isDue(id, today)) due++; });
    return {
      streakDays: store.stats.streakDays || 0,
      lastActive: store.stats.lastActive || null,
      totalReviews: store.stats.totalReviews || 0,
      learned: ids.length,
      due: due,
    };
  }

  /* ---------- Sicherung: Export / Import / Merge ---------- */
  function exportJSON() { return JSON.stringify(store, null, 2); }

  function mergeStore(a, b) {
    a = a || freshStore(); b = b || freshStore();
    var items = {}, id;
    for (id in (a.items || {})) items[id] = a.items[id];
    for (id in (b.items || {})) {
      var bi = b.items[id], ai = items[id];
      if (!ai) { items[id] = bi; continue; }
      var ar = ai.reps || 0, br = bi.reps || 0;
      if (br > ar) items[id] = bi;
      else if (br === ar && (bi.due || '') > (ai.due || '')) items[id] = bi;
    }
    var as = a.stats || {}, bs = b.stats || {};
    return {
      v: VERSION, items: items, daily: a.daily || b.daily || {},
      stats: {
        streakDays: Math.max(as.streakDays || 0, bs.streakDays || 0),
        lastActive: (as.lastActive || '') > (bs.lastActive || '') ? as.lastActive : (bs.lastActive || as.lastActive || null),
        totalReviews: Math.max(as.totalReviews || 0, bs.totalReviews || 0),
      },
    };
  }

  function importJSON(text, opts) {
    opts = opts || {};
    var parsed;
    try { parsed = JSON.parse(text); } catch (e) { return { ok: false, error: 'parse' }; }
    if (!parsed || parsed.v !== VERSION || typeof parsed.items !== 'object') return { ok: false, error: 'version' };
    var merge = opts.merge !== false; // Standard: mergen (sicherer für Nutzerdaten)
    store = merge ? mergeStore(store, normalize(parsed)) : normalize(parsed);
    save();
    return { ok: true };
  }

  function reset() { store = freshStore(); save(); }

  /* ---------- UI-Komfort: Download/Upload im Browser ---------- */
  function downloadBackup(filename) {
    filename = filename || 'katalog-fortschritt.json';
    try {
      var blob = new Blob([exportJSON()], { type: 'application/json' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url; a.download = filename; document.body.appendChild(a); a.click();
      document.body.removeChild(a); setTimeout(function () { URL.revokeObjectURL(url); }, 0);
    } catch (e) {}
  }

  /* ---------- Test-/Konfig-Hooks ---------- */
  function useStorage(obj) { backend = obj || defaultBackend(); store = load(); }

  window.SRS = {
    srsId: srsId, typeOf: typeOf,
    get: get, ensure: ensure, grade: grade,
    isDue: isDue, dueIds: dueIds,
    buildQueue: buildQueue, stats: stats,
    exportJSON: exportJSON, importJSON: importJSON, downloadBackup: downloadBackup, reset: reset,
    _useStorage: useStorage,
    __test: { sm2: sm2, mergeStore: mergeStore, addDays: addDays, todayISO: todayISO, registry: registry },
  };
})();

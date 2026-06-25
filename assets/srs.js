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

  /* ---------- Lernpfad/Gating-Konstanten (leicht justierbar) ---------- */
  var MASTERY_REPS = 2;        // Item gilt als beherrscht ab so vielen erfolgreichen Reps
  var WRITE_LEVEL_REPS = 2;    // ab diesem Erkennungs-Level müssen Kanji zusätzlich geschrieben werden
  var LESSON_TEST_PASS = 0.8;  // Bestehensgrenze des Lektionstests
  var LESSON_TEST_N = 10;      // Aufgaben pro Lektionstest
  var MAX_GATED_LESSON = 25;   // Lernpfad umfasst alle Lektionen L1–25
  // Kanji-Stufe → Test-Lektion (Default: letzte Lektion des jeweiligen Stufenblocks)
  var KANJI_LEVEL_LESSON = { 'A1.2': 6, 'A1.3': 9, 'A1.4': 12, 'A1.5': 14, 'A1.6': 17, 'A1.7': 20 };

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
    return { v: VERSION, items: {}, lessons: {}, lists: {}, daily: {}, stats: { streakDays: 0, lastActive: null, totalReviews: 0 } };
  }
  function defaultItem() {
    return { ease: DEFAULT_EASE, interval: 0, due: null, last: null, reps: 0, lapses: 0, streak: 0, writeReps: 0, lastWritten: null, history: [] };
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
      lessons: s.lessons || {},
      lists: s.lists || {},
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

  // Korrektes Schreiben eines Kanji vermerken (vom KanjiVG-Widget bei vollständiger,
  // strichkorrekter Vollendung aufgerufen). Erhöht writeReps; beeinflusst die Mastery.
  function gradeWrite(id, ok, today) {
    today = today || todayISO();
    var item = store.items[id] || defaultItem();
    if (ok) { item.writeReps = (item.writeReps || 0) + 1; item.lastWritten = today; }
    store.items[id] = item;
    save();
    return item;
  }

  /* ---------- Mastery / Lektions-Zuordnung ---------- */
  function kanjiLessonOf(level) { return KANJI_LEVEL_LESSON[level] || null; }
  function itemLesson(type, data) {
    if (type === 'kanji') return kanjiLessonOf(data.level);
    return data.lesson;
  }
  // Item „beherrscht": genug erfolgreiche Reps; Kanji ab Schreib-Level zusätzlich korrekt geschrieben.
  function isMastered(id) {
    var it = store.items[id]; if (!it) return false;
    if ((it.reps || 0) < MASTERY_REPS) return false;
    if (typeOf(id) === 'kanji' && (it.reps || 0) >= WRITE_LEVEL_REPS && (it.writeReps || 0) < 1) return false;
    return true;
  }
  // Kanji, das sein Schreib-Level erreicht hat, aber noch nicht korrekt geschrieben wurde.
  function needsWriting(id) {
    if (typeOf(id) !== 'kanji') return false;
    var it = store.items[id]; if (!it) return false;
    return (it.reps || 0) >= WRITE_LEVEL_REPS && (it.writeReps || 0) < 1;
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
  // Alle Lektionen sind aktiv (L1–25); kein Vorschau-Filter mehr.
  function registry(source) {
    var out = [];
    if (source === 'kanji') {
      (window.KANJI || []).forEach(function (k) { out.push({ id: srsId('kanji', k), type: 'kanji', data: k }); });
    } else if (source === 'vocab') {
      (window.VOKABULAR || []).forEach(function (v) { out.push({ id: srsId('vocab', v), type: 'vocab', data: v }); });
    } else if (source === 'grammar') {
      (window.GRAMMATIK || []).forEach(function (g) { out.push({ id: srsId('grammar', g), type: 'grammar', data: g }); });
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
    var maxLesson = opts.maxLesson;

    var all = [];
    sources.forEach(function (s) { all = all.concat(registry(s)); });

    // Gating: nur Items aus freigeschalteten Lektionen (Default: kein Limit → rückwärtskompatibel).
    if (maxLesson != null) {
      all = all.filter(function (x) { var L = itemLesson(x.type, x.data); return L != null && L <= maxLesson; });
    }

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
    // Lektions-Status mergen: bestanden/freigeschaltet gewinnen, höherer Score gewinnt.
    var lessons = {}, lid;
    for (lid in (a.lessons || {})) lessons[lid] = a.lessons[lid];
    for (lid in (b.lessons || {})) {
      var bl = b.lessons[lid], al = lessons[lid];
      if (!al) { lessons[lid] = bl; continue; }
      var newer = (bl.testDate || '') > (al.testDate || '');
      lessons[lid] = {
        unlocked: !!(al.unlocked || bl.unlocked),
        testPassed: !!(al.testPassed || bl.testPassed),
        bestScore: Math.max(al.bestScore || 0, bl.bestScore || 0),
        lastScore: newer ? bl.lastScore : al.lastScore,
        testDate: newer ? bl.testDate : al.testDate,
      };
    }
    // Vokabellisten mergen: gleiche id → Items vereinigen; sonst übernehmen.
    var mlists = {}, mid;
    for (mid in (a.lists || {})) mlists[mid] = { id: mid, name: a.lists[mid].name, created: a.lists[mid].created, items: (a.lists[mid].items || []).slice() };
    for (mid in (b.lists || {})) {
      var bl2 = b.lists[mid];
      if (!mlists[mid]) { mlists[mid] = { id: mid, name: bl2.name, created: bl2.created, items: (bl2.items || []).slice() }; continue; }
      (bl2.items || []).forEach(function (x) { if (mlists[mid].items.indexOf(x) === -1) mlists[mid].items.push(x); });
      mlists[mid].name = mlists[mid].name || bl2.name;
    }
    var as = a.stats || {}, bs = b.stats || {};
    return {
      v: VERSION, items: items, lessons: lessons, lists: mlists, daily: a.daily || b.daily || {},
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

  // Flache Kopie für Auswertungen (Fortschritts-Seite).
  function snapshot() { return JSON.parse(JSON.stringify(store)); }

  // Fälligkeits-Vorschau: [{date, count}] für die nächsten `days` Tage ab today.
  function forecast(today, days) {
    today = today || todayISO(); days = days || 7;
    var out = [];
    for (var i = 0; i < days; i++) {
      var d = addDays(today, i), n = 0;
      Object.keys(store.items).forEach(function (id) {
        var due = store.items[id].due;
        if (due && (i === 0 ? due <= d : due === d)) n++;
      });
      out.push({ date: d, count: n });
    }
    return out;
  }

  /* ---------- Lernpfad: Kern, Fortschritt, Freischaltung, Tests ---------- */
  // Kern-Items einer Lektion: Vokabeln + Grammatik (lesson) + zugeordnete Kanji (level→lesson).
  function lessonCore(lesson) {
    var out = [];
    (window.VOKABULAR || []).forEach(function (v) { if (v.lesson === lesson) out.push({ id: srsId('vocab', v), type: 'vocab', data: v }); });
    (window.GRAMMATIK || []).forEach(function (g) { if (g.lesson === lesson) out.push({ id: srsId('grammar', g), type: 'grammar', data: g }); });
    (window.KANJI || []).forEach(function (k) { if (kanjiLessonOf(k.level) === lesson) out.push({ id: srsId('kanji', k), type: 'kanji', data: k }); });
    return out;
  }
  function coreProgress(lesson) {
    var core = lessonCore(lesson), mastered = 0;
    core.forEach(function (c) { if (isMastered(c.id)) mastered++; });
    return { mastered: mastered, total: core.length, fraction: core.length ? mastered / core.length : 1 };
  }
  function lessonRec(lesson) { store.lessons = store.lessons || {}; return store.lessons[lesson] || {}; }
  function lessonState(lesson) {
    var rec = lessonRec(lesson);
    var unlocked = lesson <= 1 || !!lessonRec(lesson - 1).testPassed || !!rec.unlocked;
    var cp = coreProgress(lesson);
    return {
      lesson: lesson, unlocked: unlocked, coreProgress: cp, coreMastered: cp.fraction >= 1,
      testPassed: !!rec.testPassed, bestScore: rec.bestScore || 0, lastScore: rec.lastScore || 0, testDate: rec.testDate || null,
    };
  }
  function maxUnlockedLesson() {
    var L = 1;
    for (var l = 1; l <= MAX_GATED_LESSON; l++) { if (lessonState(l).unlocked) L = l; else break; }
    return L;
  }
  function canTakeTest(lesson) { var s = lessonState(lesson); return s.unlocked && s.coreMastered; }
  function recordLessonTest(lesson, score, today) {
    today = today || todayISO();
    store.lessons = store.lessons || {};
    var rec = store.lessons[lesson] || {};
    rec.unlocked = true;
    rec.lastScore = round2(score);
    rec.bestScore = Math.max(rec.bestScore || 0, round2(score));
    rec.testDate = today;
    var passed = score >= LESSON_TEST_PASS;
    if (passed) {
      rec.testPassed = true;
      if (lesson + 1 <= MAX_GATED_LESSON) { var nx = store.lessons[lesson + 1] || {}; nx.unlocked = true; store.lessons[lesson + 1] = nx; }
    }
    store.lessons[lesson] = rec;
    save();
    return { passed: passed, unlocked: passed && lesson + 1 <= MAX_GATED_LESSON };
  }
  function unlockAll() {
    store.lessons = store.lessons || {};
    for (var l = 1; l <= MAX_GATED_LESSON; l++) { var r = store.lessons[l] || {}; r.unlocked = true; store.lessons[l] = r; }
    save();
  }
  function resetLessons() { store.lessons = {}; save(); }

  /* ---------- Persönliche Vokabellisten ---------- */
  function nextListId() {
    store.lists = store.lists || {};
    var max = 0;
    Object.keys(store.lists).forEach(function (k) { var n = parseInt(String(k).replace(/^l/, ''), 10); if (n > max) max = n; });
    return 'l' + (max + 1);
  }
  function createList(name, today) {
    store.lists = store.lists || {};
    var id = nextListId();
    store.lists[id] = { id: id, name: String(name || 'Liste ' + id.slice(1)).trim() || ('Liste ' + id.slice(1)), created: today || todayISO(), items: [] };
    save();
    return store.lists[id];
  }
  function renameList(id, name) {
    var l = store.lists && store.lists[id]; if (!l) return null;
    l.name = String(name || '').trim() || l.name; save(); return l;
  }
  function deleteList(id) { if (store.lists && store.lists[id]) { delete store.lists[id]; save(); } }
  function addToList(id, ids) {
    var l = store.lists && store.lists[id]; if (!l) return null;
    (Array.isArray(ids) ? ids : [ids]).forEach(function (x) { if (x && l.items.indexOf(x) === -1) l.items.push(x); });
    save(); return l;
  }
  function removeFromList(id, ids) {
    var l = store.lists && store.lists[id]; if (!l) return null;
    var rm = Array.isArray(ids) ? ids : [ids];
    l.items = l.items.filter(function (x) { return rm.indexOf(x) === -1; });
    save(); return l;
  }
  function lists() {
    store.lists = store.lists || {};
    return Object.keys(store.lists).map(function (k) { return store.lists[k]; })
      .sort(function (a, b) { return (parseInt(a.id.slice(1), 10) || 0) - (parseInt(b.id.slice(1), 10) || 0); });
  }
  // Vokabel-IDs einer Liste zu Daten auflösen (nicht auflösbare IDs werden übersprungen).
  function vocabIndex() {
    var idx = {}; (window.VOKABULAR || []).forEach(function (v) { idx[srsId('vocab', v)] = v; }); return idx;
  }
  function listItems(id) {
    var l = store.lists && store.lists[id]; if (!l) return [];
    var idx = vocabIndex();
    return l.items.map(function (x) { return { id: x, data: idx[x] || null }; }).filter(function (o) { return o.data; });
  }

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
    get: get, ensure: ensure, grade: grade, gradeWrite: gradeWrite,
    isDue: isDue, dueIds: dueIds,
    buildQueue: buildQueue, stats: stats,
    // Lernpfad / Gating
    isMastered: isMastered, needsWriting: needsWriting,
    kanjiLessonOf: kanjiLessonOf, lessonCore: lessonCore, coreProgress: coreProgress,
    lessonState: lessonState, maxUnlockedLesson: maxUnlockedLesson,
    canTakeTest: canTakeTest, recordLessonTest: recordLessonTest,
    unlockAll: unlockAll, resetLessons: resetLessons,
    // Persönliche Vokabellisten
    createList: createList, renameList: renameList, deleteList: deleteList,
    addToList: addToList, removeFromList: removeFromList, lists: lists, listItems: listItems,
    exportJSON: exportJSON, importJSON: importJSON, downloadBackup: downloadBackup, reset: reset,
    snapshot: snapshot, forecast: forecast,
    _useStorage: useStorage,
    __test: { sm2: sm2, mergeStore: mergeStore, addDays: addDays, todayISO: todayISO, registry: registry, itemLesson: itemLesson },
  };
})();

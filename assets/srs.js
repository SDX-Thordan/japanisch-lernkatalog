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
  var MASTERY_REPS = 2;        // (Alt-Feld, bleibt für Migration/Stats)
  var WRITE_LEVEL_REPS = 2;    // ab diesem Erkennungs-Level müssen Kanji zusätzlich geschrieben werden
  var LESSON_TEST_PASS = 0.8;  // Bestehensgrenze des Lektionstests
  var LESSON_TEST_N = 10;      // Aufgaben pro Lektionstest
  var MAX_GATED_LESSON = 25;   // Lernpfad umfasst alle Lektionen L1–25
  // Kanji-Stufe → Test-Lektion (Default: letzte Lektion des jeweiligen Stufenblocks)
  var KANJI_LEVEL_LESSON = { 'A1.2': 6, 'A1.3': 9, 'A1.4': 12, 'A1.5': 14, 'A1.6': 17, 'A1.7': 20 };

  /* ---------- Lernpunktzahl 0–100 (ersetzt SM-2); sanfte, justierbare Defaults ---------- */
  var GAIN = 20;             // Punkte pro richtiger Antwort
  var PENALTY = 15;          // Abzug pro falscher Antwort (max. 1×/Tag/Item)
  var MASTER_AT = 80;        // ab hier „beherrscht" (= 4 Blütenblätter)
  var GRACE_DAYS = 3;        // so viele Tage kein Zerfall nach der letzten Übung
  var DECAY_PER_DAY = 2;     // danach Punkte/Tag Zerfall (sanft)
  var ITEM_DAILY_CAP = 40;   // max. Punktgewinn pro Wort und Tag
  var DAILY_CAP = 500;       // max. Punktgewinn über alle Wörter pro Tag (global)
  var SCORE_THRESHOLDS = [20, 40, 60, 80, 100]; // Blütenblatt je 20 %
  var LEECH_LAPSES = 4;      // ab so vielen Fehlversuchen gilt ein noch-nicht-beherrschtes Item als „schwierig"
  /* ---------- Teil-Lektionen: lange Lektionen in ~5–10-Min-Häppchen schneiden ---------- */
  var PART_BUDGET = 8;       // Ziel-Kosten je Teil (≈ 5–7 Min)
  // Grammatik wiegt mehr: pro Muster Vorstellen + mehrere Übungen (umfangreich, ~2–3 Min).
  var PART_COST = { vocab: 1, kanji: 1.25, grammar: 3 };
  var PART_MIN_TAIL = 3;     // Mini-Restteil (< diese Kosten oder < 2 Items) wird in den vorigen Teil gemischt

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
  function clamp(x, lo, hi) { return x < lo ? lo : (x > hi ? hi : x); }
  // Ganze Tage zwischen zwei ISO-Daten (b - a), TZ-sicher.
  function daysBetween(a, b) {
    if (!a || !b) return 0;
    var pa = String(a).split('-'), pb = String(b).split('-');
    var da = Date.UTC(+pa[0], +pa[1] - 1, +pa[2]), db = Date.UTC(+pb[0], +pb[1] - 1, +pb[2]);
    return Math.round((db - da) / 86400000);
  }
  // Fisher-Yates; rng() ∈ [0,1) injizierbar (Default Math.random) für deterministische Tests.
  function shuffleArr(a, rng) { rng = rng || Math.random; for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(rng() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }

  /* ---------- Store-Grundgerüst ---------- */
  function freshStore() {
    return { v: VERSION, items: {}, lessons: {}, lists: {}, daily: {}, stats: { streakDays: 0, lastActive: null, totalReviews: 0 } };
  }
  function defaultItem() {
    return { score: 0, last: null, ease: DEFAULT_EASE, interval: 0, due: null, reps: 0, lapses: 0, streak: 0, writeReps: 0, lastWritten: null, history: [] };
  }
  // Roh-Punktzahl eines Items (mit Lazy-Migration aus alten reps, falls score fehlt).
  function rawScore(item) {
    if (!item) return 0;
    if (typeof item.score === 'number') return item.score;
    return item.reps > 0 ? Math.min(100, item.reps * 40) : 0; // Alt-Daten: reps → Startpunkte
  }
  // Effektive Punktzahl: Roh-Punktzahl minus sanfter Zerfall seit der letzten Übung (ab GRACE_DAYS).
  function effectiveScore(item, today) {
    today = today || todayISO();
    var s = rawScore(item);
    if (s <= 0) return 0;
    var base = (item && item.last) || (item && item.due) || null;
    var idle = base ? Math.max(0, daysBetween(base, today)) : 0;
    var decay = DECAY_PER_DAY * Math.max(0, idle - GRACE_DAYS);
    return clamp(s - decay, 0, 100);
  }
  function scoreOf(id, today) { return effectiveScore(store.items[id], today); }

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

  // Tages-Eintrag: globaler Gewinn, Pro-Wort-Gewinn und Strafe-Sperre an einer Stelle;
  // setzt sich täglich selbst zurück (alte Tage werden beim Zugriff geprunt → bleibt winzig).
  function dailyToday(today) {
    today = today || todayISO();
    store.daily = store.daily || {};
    if (!store.daily[today]) store.daily = {}; // nur der aktuelle Tag ist relevant
    var d = store.daily[today] || (store.daily[today] = { gain: 0, item: {}, pen: {} });
    if (typeof d.gain !== 'number') d.gain = 0;
    if (!d.item) d.item = {}; if (!d.pen) d.pen = {};
    return d;
  }

  // Bewertung über die 0–100-Lernpunktzahl (ersetzt SM-2): Zerfall wird realisiert, dann
  // +GAIN (gedeckelt pro Wort & global) bzw. −PENALTY (max. 1×/Tag); nach einem Fehler ist
  // das Wort für den Rest des Tages eingefroren (kein weiterer Gain). reps/history bleiben.
  function grade(id, g, today) {
    today = today || todayISO();
    var item = store.items[id] || defaultItem();
    var d = dailyToday(today);
    var cur = effectiveScore(item, today);
    if (g <= 0) {
      if (!d.pen[id]) { cur = clamp(cur - PENALTY, 0, 100); d.pen[id] = 1; }
      item.lapses = (item.lapses || 0) + 1; item.streak = 0;
    } else {
      if (!d.pen[id]) {
        var allowed = Math.min(GAIN, ITEM_DAILY_CAP - (d.item[id] || 0), DAILY_CAP - d.gain);
        if (allowed > 0) { cur = clamp(cur + allowed, 0, 100); d.item[id] = (d.item[id] || 0) + allowed; d.gain += allowed; }
      }
      item.reps = (item.reps || 0) + 1; item.streak = (item.streak || 0) + 1;
    }
    item.score = round2(cur); item.last = today;
    item.history = (item.history || []).concat([{ t: today, grade: g }]).slice(-MAX_HISTORY);
    store.items[id] = item;
    store.stats.totalReviews = (store.stats.totalReviews || 0) + 1;
    save();
    return item;
  }
  // Heutiger Tagesgewinn (für Cap-Hinweis in der UI).
  function dailyGain(today) { return dailyToday(today).gain; }
  // Tagesstreak: zählt NUR, wenn die Tagesaufgabe („Heute"-Runde) abgeschlossen ist —
  // nicht bei jeder einzelnen Bewertung (sonst springt der Streak schon beim ersten freien Üben auf 1).
  // Idempotent pro Tag (mehrfacher Aufruf am selben Tag ändert nichts).
  function completeDaily(today) {
    today = today || todayISO();
    var last = store.stats.lastActive;
    if (last === today) return store.stats.streakDays || 0;
    if (last && addDays(last, 1) === today) store.stats.streakDays = (store.stats.streakDays || 0) + 1;
    else store.stats.streakDays = 1;
    store.stats.lastActive = today;
    save();
    return store.stats.streakDays;
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
  // Item „beherrscht": effektive Punktzahl ≥ MASTER_AT; Kanji zusätzlich min. einmal korrekt geschrieben.
  function isMastered(id, today) {
    var it = store.items[id]; if (!it) return false;
    if (effectiveScore(it, today) < MASTER_AT) return false;
    if (typeOf(id) === 'kanji' && (it.writeReps || 0) < 1) return false;
    return true;
  }
  // Kanji, das schon erkannt wird (gestartet), aber noch nicht korrekt geschrieben wurde.
  function needsWriting(id) {
    if (typeOf(id) !== 'kanji') return false;
    var it = store.items[id]; if (!it) return false;
    return rawScore(it) > 0 && (it.writeReps || 0) < 1;
  }

  /* ---------- Fälligkeit ---------- */
  // Fällig = bereits gestartet (score > 0), aber durch Zerfall unter MASTER_AT gerutscht → Wiederholung.
  function isDue(id, today) {
    var it = store.items[id];
    if (!it || rawScore(it) <= 0) return false;
    return effectiveScore(it, today) < MASTER_AT;
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

  // „Schwierige Wörter" (Leeches): häufig verfehlte, noch nicht beherrschte Items — additiv,
  // greift NICHT ins Score-Modell ein. Liefert {id,type,data,lapses,score} nach lapses sortiert.
  function leeches(today, opts) {
    today = today || todayISO();
    opts = opts || {};
    var minLapses = opts.minLapses != null ? opts.minLapses : LEECH_LAPSES;
    var sources = opts.sources || ['vocab', 'grammar', 'kanji'];
    var out = [];
    sources.forEach(function (s) {
      registry(s).forEach(function (x) {
        var it = store.items[x.id]; if (!it) return;
        var lap = it.lapses || 0;
        if (lap >= minLapses && effectiveScore(it, today) < MASTER_AT) {
          out.push({ id: x.id, type: x.type, data: x.data, lapses: lap, score: effectiveScore(it, today) });
        }
      });
    });
    out.sort(function (a, b) { return b.lapses - a.lapses || a.score - b.score; });
    return opts.limit ? out.slice(0, opts.limit) : out;
  }

  /* ---------- geteilte Review-Queue ---------- */
  function buildQueue(opts) {
    opts = opts || {};
    var sources = opts.sources || ['kanji', 'vocab', 'grammar'];
    var newLimit = opts.newLimit != null ? opts.newLimit : 5;
    var reviewLimit = opts.reviewLimit != null ? opts.reviewLimit : 15;
    var today = opts.today || todayISO();
    var maxLesson = opts.maxLesson;
    var newLesson = opts.newLesson; // optional: neue Items auf genau diese Lektion beschränken

    var lessonOk = function (x) { if (maxLesson == null) return true; var L = itemLesson(x.type, x.data); return L != null && L <= maxLesson; };
    var newLessonOk = function (x) { if (newLesson == null) return true; return itemLesson(x.type, x.data) === newLesson; };
    // Pro Quelle getrennt halten, damit neue Items über die Quellen ausbalanciert werden
    // (sonst dominiert eine Quelle, weil sie in der Liste vorne steht → „Heute" zeigt nur Vokabeln bzw. nur Kanji).
    var perSource = sources.map(function (s) { return registry(s).filter(lessonOk); });
    var all = [].concat.apply([], perSource);

    // Priorität: am stärksten zerfallene UND häufig verfehlte (Leeches) zuerst → niedrigerer Wert = dringender.
    var prio = function (x) { var it = store.items[x.id]; return effectiveScore(it, today) - 8 * ((it && it.lapses) || 0); };
    var due = all.filter(function (x) { return isDue(x.id, today); })
      .sort(function (a, b) { return prio(a) - prio(b); })
      .slice(0, reviewLimit)
      .map(function (x) { return { id: x.id, type: x.type, data: x.data, reason: 'due' }; });

    // Neue Items im Round-Robin über die Quellen ziehen, damit Kanji, Vokabeln & Grammatik vorkommen.
    // Pro Quelle die Kandidaten mischen → „Heute" wählt zufällig aus den freigeschalteten Lektionen
    // (statt immer dieselben ersten Items). due/Wiederholungen bleiben nach Fälligkeit sortiert.
    var rng = opts.rng || Math.random;
    var newBySource = perSource.map(function (reg) { return shuffleArr(reg.filter(function (x) { return rawScore(store.items[x.id]) <= 0 && newLessonOk(x); }), rng); });
    var fresh = [], guard = 0;
    while (fresh.length < newLimit && guard < newLimit * sources.length + sources.length) {
      var any = false;
      for (var si = 0; si < newBySource.length && fresh.length < newLimit; si++) {
        var lst = newBySource[si];
        if (lst.length) { var x = lst.shift(); fresh.push({ id: x.id, type: x.type, data: x.data, reason: 'new' }); any = true; }
      }
      if (!any) break;
      guard++;
    }

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
    var due = 0, learned = 0, sum = 0;
    ids.forEach(function (id) {
      if (isDue(id, today)) due++;
      if (rawScore(store.items[id]) > 0) { learned++; sum += effectiveScore(store.items[id], today); }
    });
    return {
      streakDays: store.stats.streakDays || 0,
      lastActive: store.stats.lastActive || null,
      totalReviews: store.stats.totalReviews || 0,
      learned: learned,
      due: due,
      avgScore: learned ? round2(sum / learned) : 0,
      dailyGain: dailyGain(today),
      dailyCap: DAILY_CAP,
    };
  }

  // Aggregierte Gesamtstatistik über den ganzen Katalog (für die Profil-Grafiken).
  function catalogStats(today) {
    today = today || todayISO();
    var sources = ['vocab', 'grammar', 'kanji'];
    var petals = [0, 0, 0, 0, 0, 0]; // Items je Blütenstufe 0..5
    var total = 0, started = 0, mastered = 0, sum = 0, byType = {};
    sources.forEach(function (s) {
      var reg = registry(s), t = { total: reg.length, started: 0, mastered: 0, sum: 0 };
      reg.forEach(function (x) {
        var it = store.items[x.id], eff = effectiveScore(it, today);
        var p = 0; for (var i = 0; i < SCORE_THRESHOLDS.length; i++) { if (eff >= SCORE_THRESHOLDS[i]) p++; }
        petals[p]++; total++; sum += eff; t.sum += eff;
        if (it && rawScore(it) > 0) { started++; t.started++; }
        if (isMastered(x.id, today)) { mastered++; t.mastered++; }
      });
      t.avg = t.total ? t.sum / t.total : 0;
      byType[s] = t;
    });
    return { total: total, started: started, mastered: mastered, avg: total ? sum / total : 0, petals: petals, byType: byType };
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
      var as = rawScore(ai), bs = rawScore(bi);
      if (bs > as) items[id] = bi;
      else if (bs === as && (bi.last || bi.due || '') > (ai.last || ai.due || '')) items[id] = bi;
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

  // Fälligkeits-Vorschau: [{date, count}] = gestartete Items, die an Tag d (durch Zerfall) erstmals
  // unter MASTER_AT rutschen (i=0: alle bereits fälligen).
  function forecast(today, days) {
    today = today || todayISO(); days = days || 7;
    var out = [];
    for (var i = 0; i < days; i++) {
      var d = addDays(today, i), n = 0;
      Object.keys(store.items).forEach(function (id) {
        var it = store.items[id];
        if (rawScore(it) <= 0) return;
        var dueNow = effectiveScore(it, d) < MASTER_AT;
        var duePrev = i > 0 && effectiveScore(it, addDays(today, i - 1)) < MASTER_AT;
        if (i === 0 ? dueNow : (dueNow && !duePrev)) n++;
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
  function coreProgress(lesson, today) {
    var core = lessonCore(lesson), mastered = 0, sum = 0;
    core.forEach(function (c) { if (isMastered(c.id, today)) mastered++; sum += effectiveScore(store.items[c.id], today); });
    return { mastered: mastered, total: core.length, fraction: core.length ? mastered / core.length : 1,
      avgScore: core.length ? sum / core.length : 0 };
  }
  // Neue (noch nicht gelernte) Kern-Items einer Lektion, nach Typ gruppiert — Grundlage für den
  // geführten Kurs (Vokabeln → Grammatik → … → Kanji). Beispiel-Phasen baut die UI aus der Grammatik.
  function lessonPlan(lesson) {
    var out = { vocab: [], grammar: [], kanji: [] };
    lessonCore(lesson).forEach(function (c) { if (rawScore(store.items[c.id]) <= 0) out[c.type].push(c); });
    return out;
  }
  /* ---------- Teil-Lektionen (deterministische Sicht auf lessonCore) ---------- */
  // Schneidet die Kern-Items einer Lektion (in didaktischer Reihenfolge) in Kostenscheiben ~PART_BUDGET.
  // Rein aus dem statischen Katalog → stabile Teil-Identität (unabhängig vom Fortschritt).
  function lessonChunks(lesson) {
    var core = lessonCore(lesson);
    if (!core.length) return [];
    var parts = [], cur = [], cost = 0;
    core.forEach(function (c) {
      var w = PART_COST[c.type] || 1;
      if (cur.length && cost + w > PART_BUDGET) { parts.push(cur); cur = []; cost = 0; }
      cur.push(c); cost += w;
    });
    if (cur.length) parts.push(cur);
    // Mini-Restteil in den vorigen mischen, damit kein 1-Item-Häppchen entsteht.
    if (parts.length > 1) {
      var last = parts[parts.length - 1];
      var lastCost = last.reduce(function (s, c) { return s + (PART_COST[c.type] || 1); }, 0);
      if (lastCost < PART_MIN_TAIL || last.length < 2) { parts[parts.length - 2] = parts[parts.length - 2].concat(last); parts.pop(); }
    }
    return parts;
  }
  function partCost(items) { return items.reduce(function (s, c) { return s + (PART_COST[c.type] || 1); }, 0); }
  // Status je Teil: started/mastered + strikte Freischaltung (Teil k frei, wenn k ≤ partsDone+1).
  function partsInfo(lesson, today) {
    var chunks = lessonChunks(lesson);
    var doneN = lessonRec(lesson).partsDone || 0;
    return chunks.map(function (items, i) {
      var part = i + 1, started = 0, mastered = 0;
      items.forEach(function (c) { if (rawScore(store.items[c.id]) > 0) started++; if (isMastered(c.id, today)) mastered++; });
      return { part: part, items: items, total: items.length, started: started, mastered: mastered,
        cost: partCost(items), done: part <= doneN, unlocked: part <= doneN + 1 };
    });
  }
  // Nächster zu lernender Teil (1-basiert): partsDone+1, geklammert auf die Teil-Anzahl.
  function nextPart(lesson) {
    var n = lessonChunks(lesson).length; if (!n) return 0;
    return Math.min((lessonRec(lesson).partsDone || 0) + 1, n);
  }
  // Teil als durchgearbeitet markieren (strikt sequenziell, korrektheits-unabhängig).
  function markPartDone(lesson, part) {
    store.lessons = store.lessons || {};
    var rec = store.lessons[lesson] || {};
    rec.partsDone = Math.max(rec.partsDone || 0, part || 0);
    store.lessons[lesson] = rec; save();
    return rec.partsDone;
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
  // Aktuelle Lektion: die niedrigste freigeschaltete, deren Kern noch nicht vollständig gemeistert ist.
  // „Heute" führt neue Items aus genau dieser Lektion ein → Üben füllt sichtbar deren Lernpfad-Fortschritt.
  function currentLesson() {
    var max = maxUnlockedLesson();
    for (var l = 1; l <= max; l++) { if (coreProgress(l).fraction < 1) return l; }
    return max;
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
    completeDaily: completeDaily, dailyGain: dailyGain,
    // Lernpunktzahl 0–100
    effectiveScore: scoreOf, scoreOf: scoreOf, MASTER_AT: MASTER_AT,
    isDue: isDue, dueIds: dueIds,
    buildQueue: buildQueue, stats: stats, catalogStats: catalogStats, leeches: leeches,
    // Lernpfad / Gating
    isMastered: isMastered, needsWriting: needsWriting,
    kanjiLessonOf: kanjiLessonOf, lessonCore: lessonCore, coreProgress: coreProgress, lessonPlan: lessonPlan,
    lessonChunks: lessonChunks, partsInfo: partsInfo, nextPart: nextPart, markPartDone: markPartDone,
    lessonState: lessonState, maxUnlockedLesson: maxUnlockedLesson, currentLesson: currentLesson,
    canTakeTest: canTakeTest, recordLessonTest: recordLessonTest,
    unlockAll: unlockAll, resetLessons: resetLessons,
    // Persönliche Vokabellisten
    createList: createList, renameList: renameList, deleteList: deleteList,
    addToList: addToList, removeFromList: removeFromList, lists: lists, listItems: listItems,
    exportJSON: exportJSON, importJSON: importJSON, downloadBackup: downloadBackup, reset: reset,
    snapshot: snapshot, forecast: forecast,
    _useStorage: useStorage,
    __test: { sm2: sm2, mergeStore: mergeStore, addDays: addDays, todayISO: todayISO, registry: registry, itemLesson: itemLesson,
      effectiveScore: effectiveScore, rawScore: rawScore,
      setScore: function (id, score, last) { var it = store.items[id] || defaultItem(); it.score = score; it.last = last || todayISO(); store.items[id] = it; save(); return it; } },
  };
})();

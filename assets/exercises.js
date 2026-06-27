/* ============================================================
   Übungs-Engine  ·  window.Exercises
   - Satz-Template-Filler (Slots aus VOKABULAR_TAGS)
   - Übungstypen: mc (Multiple Choice), cloze (Lücke), order (Wörter ordnen),
     translate (Übersetzen mit Aufdecken)
   - generischer Renderer renderExercise(ex, mount, opts) → koppelt an SRS.grade
   Nutzt window.Katalog-Helfer (esc/ruby/shuffle/norm), wenn vorhanden.
   ============================================================ */
(function () {
  'use strict';

  // window.Katalog (aus app.js) lazy lesen, damit die Skript-Ladereihenfolge egal ist.
  function kat() { return window.Katalog || {}; }
  function esc(s) { var K = kat(); return K.esc ? K.esc(s) : String(s == null ? '' : s); }
  function shuffle(a) {
    var K = kat(); if (K.shuffle) return K.shuffle(a);
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  function randPick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  // Normalisieren für Texteingaben: kleinschreiben + Makron-Faltung (über norm) + Leerzeichen weg.
  function nrm(s) { var K = kat(); var f = K.norm ? K.norm(s) : String(s == null ? '' : s).toLowerCase(); return f.replace(/\s+/g, ''); }
  // Alle gültigen Schreibformen eines Worts: Kanji, Kana (Furigana), Romaji + Kana→Romaji.
  function vocabForms(v) {
    if (!v) return [];
    var K = kat(), forms = [];
    if (v.kanji) forms.push(v.kanji);
    if (v.kana) forms.push(v.kana);
    if (v.romaji) forms.push(v.romaji);
    if (v.kana && K.kanaToRomaji) forms.push(K.kanaToRomaji(v.kana));
    return forms;
  }
  // Liberaler Abgleich einer Eingabe gegen ein Wort: Romaji, Kana/Furigana ODER Kanji gelten als richtig.
  function acceptsVocabInput(input, v) {
    var t = nrm(input); if (!t) return false;
    return vocabForms(v).some(function (f) { return nrm(f) === t; });
  }

  var PARTICLES = ['は', 'が', 'を', 'に', 'で', 'へ', 'と', 'も', 'から', 'まで'];

  /* ---------- Tag-Index: tag → [Vokabel] ---------- */
  function buildTagIndex() {
    var byId = {};
    (window.VOKABULAR || []).forEach(function (v) { byId['v:' + v.kana + '|' + v.lesson] = v; });
    var idx = {}, tags = window.VOKABULAR_TAGS || {};
    Object.keys(tags).forEach(function (id) {
      var v = byId[id]; if (!v) return;
      tags[id].forEach(function (t) { (idx[t] = idx[t] || []).push(v); });
    });
    return idx;
  }

  /* ---------- Pattern-Key einer Vorlage ermitteln (Identitätsvergleich) ---------- */
  function patternOf(tpl) {
    var T = window.SATZ_TEMPLATES || {};
    for (var pat in T) { if (T[pat].indexOf(tpl) !== -1) return pat; }
    return null;
  }

  /* ---------- Vorlage füllen ---------- */
  function fillTemplate(tpl, opts) {
    opts = opts || {};
    var pick = opts.pick || randPick;
    var idx = opts.tagIndex || buildTagIndex();
    var chosen = {};
    Object.keys(tpl.slots).forEach(function (name) {
      var def = tpl.slots[name];
      if (def.fixed) { chosen[name] = { jp: def.fixed, kana: def.fixed, de: def.de || def.fixed, vocab: null }; return; }
      var cands = idx[def.tag] || [];
      var v = pick(cands) || { kanji: '', kana: '?', de: '?' };
      chosen[name] = { jp: v.kanji || v.kana, kana: v.kana, de: v.de, vocab: v };
    });

    // jp-Vorlage in Chunks zerlegen (Whitespace-getrennt), Platzhalter ersetzen.
    var tokens = tpl.jp.trim().split(/\s+/);
    var filled = tokens.map(function (tok) {
      var m = tok.match(/^\{(\w+)\}$/);
      return m ? chosen[m[1]].jp : tok;
    });
    var suffix = '';
    if (filled.length && filled[filled.length - 1] === '。') { suffix = '。'; filled = filled.slice(0, -1); }
    var jp = filled.join('') + suffix;
    var de = tpl.de.replace(/\{(\w+)\}/g, function (_, n) { return chosen[n] ? chosen[n].de : ('{' + n + '}'); });

    var pattern = opts.pattern || patternOf(tpl);
    return { tpl: tpl, pattern: pattern, srsId: pattern ? 'g:' + pattern : null,
      chosen: chosen, chunks: filled, suffix: suffix, jp: jp, de: de };
  }

  /* ---------- Übungstypen aus einer gefüllten Vorlage ---------- */
  function particleExercise(f) {
    var blank = f.tpl.blank;
    var frageChunks = f.chunks.map(function (c) { return c === blank ? '＿' : c; });
    var distract = PARTICLES.filter(function (p) { return p !== blank; });
    shuffle(distract);
    var optionen = shuffle([blank].concat(distract.slice(0, 3)));
    return {
      typ: 'mc', srsId: f.srsId, frage: frageChunks.join('') + f.suffix,
      optionen: optionen, richtig: optionen.indexOf(blank),
      loesungSatz: f.jp, de: f.de, erkl: f.tpl.erkl || ('Richtige Partikel: ' + blank),
    };
  }

  function orderExercise(f) {
    var solution = f.chunks.slice();
    return {
      typ: 'order', srsId: f.srsId, solution: solution, chunks: shuffle(solution.slice()),
      suffix: f.suffix, de: f.de, loesungSatz: f.jp,
    };
  }

  function translateExercise(f) {
    return { typ: 'translate', srsId: f.srsId, prompt: f.de, de: f.de, jp: f.jp };
  }

  function fromTemplate(tpl, opts) {
    opts = opts || {};
    var f = fillTemplate(tpl, opts);
    var type = opts.type || randPick(['mc', 'order', 'translate']);
    if (type === 'order') return orderExercise(f);
    if (type === 'translate') return translateExercise(f);
    return particleExercise(f);
  }

  /* ---------- Bewertung (rein) ---------- */
  function gradeAnswer(ex, answer) {
    if (ex.typ === 'mc') return answer === ex.richtig;
    if (ex.typ === 'cloze') return String(answer).trim() === String(ex.luecke).trim();
    if (ex.typ === 'order') {
      if (!Array.isArray(answer) || answer.length !== ex.solution.length) return false;
      return answer.every(function (x, i) { return x === ex.solution[i]; });
    }
    return null; // translate: Selbstkontrolle
  }

  /* ---------- generischer Renderer ---------- */
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }

  function renderExercise(ex, mount, opts) {
    opts = opts || {};
    mount.innerHTML = '';
    var finished = false;
    function finish(correct) {
      if (finished) return; finished = true;
      if (typeof opts.onResult === 'function') opts.onResult(correct);
      if (window.SRS && ex.srsId && correct !== null) window.SRS.grade(ex.srsId, correct ? 1 : 0);
    }
    if (ex.typ === 'mc') return renderMC(ex, mount, finish);
    if (ex.typ === 'cloze') return renderCloze(ex, mount, finish);
    if (ex.typ === 'order') return renderOrder(ex, mount, finish);
    if (ex.typ === 'translate') return renderTranslate(ex, mount, finish);
  }

  function feedback(mount, ok, erkl) {
    var f = el('div', 'ex-feedback ' + (ok ? 'ok' : 'no'), (ok ? '✓ Richtig' : '✗ Leider falsch') + (erkl ? ' · ' + esc(erkl) : ''));
    mount.appendChild(f);
  }

  function renderMC(ex, mount, finish) {
    mount.appendChild(el('div', 'ex-frage ja', esc(ex.frage)));
    var opts = el('div', 'ex-options');
    ex.optionen.forEach(function (o, i) {
      var b = el('button', 'ex-opt', esc(o)); b.type = 'button';
      b.addEventListener('click', function () {
        if (mount.querySelector('.ex-feedback')) return;
        var ok = (i === ex.richtig);
        opts.querySelectorAll('.ex-opt').forEach(function (x, xi) {
          x.disabled = true;
          if (xi === ex.richtig) x.classList.add('correct');
          else if (xi === i) x.classList.add('wrong');
        });
        feedback(mount, ok, ex.erkl);
        finish(ok);
      });
      opts.appendChild(b);
    });
    mount.appendChild(opts);
  }

  function renderCloze(ex, mount, finish) {
    mount.appendChild(el('div', 'ex-frage ja', esc(ex.satz || ex.frage || '')));
    var inp = el('input', 'ex-input'); inp.type = 'text'; inp.setAttribute('aria-label', 'Antwort');
    var btn = el('button', 'btn-primary ex-check', 'Prüfen'); btn.type = 'button';
    btn.addEventListener('click', function () {
      if (mount.querySelector('.ex-feedback')) return;
      var ok = gradeAnswer(ex, inp.value);
      inp.disabled = true; feedback(mount, ok, ex.erkl || ('Lösung: ' + ex.luecke));
      finish(ok);
    });
    mount.appendChild(inp); mount.appendChild(btn);
  }

  function renderOrder(ex, mount, finish) {
    var answer = [];
    var target = el('div', 'ex-target');
    var bank = el('div', 'ex-bank');
    ex.chunks.forEach(function (c) {
      var b = el('button', 'ex-chunk', esc(c)); b.type = 'button';
      b.addEventListener('click', function () {
        if (b.disabled) return; b.disabled = true; answer.push(c);
        var t = el('span', 'ex-token', esc(c)); target.appendChild(t);
      });
      bank.appendChild(b);
    });
    var check = el('button', 'btn-primary ex-check', 'Prüfen'); check.type = 'button';
    check.addEventListener('click', function () {
      if (mount.querySelector('.ex-feedback')) return;
      var ok = gradeAnswer(ex, answer);
      feedback(mount, ok, ok ? '' : ('Lösung: ' + ex.solution.join('') + (ex.suffix || '')));
      finish(ok);
    });
    mount.appendChild(target); mount.appendChild(bank); mount.appendChild(check);
  }

  function renderTranslate(ex, mount, finish) {
    mount.appendChild(el('div', 'ex-prompt', esc(ex.prompt)));
    var ans = el('div', 'ex-answer ja hidden', kat().furiToRuby ? kat().furiToRuby(ex.jp) : esc(ex.jp));
    var reveal = el('button', 'btn-primary ex-reveal', 'Aufdecken'); reveal.type = 'button';
    var rate = el('div', 'ex-rate hidden');
    var good = el('button', 'btn btn-next', 'Gewusst →'); good.type = 'button';
    var again = el('button', 'btn btn-again', '↻ Nochmal'); again.type = 'button';
    rate.appendChild(again); rate.appendChild(good);
    reveal.addEventListener('click', function () { ans.classList.remove('hidden'); reveal.classList.add('hidden'); rate.classList.remove('hidden'); });
    good.addEventListener('click', function () { finish(true); });
    again.addEventListener('click', function () { finish(false); });
    mount.appendChild(ans); mount.appendChild(reveal); mount.appendChild(rate);
  }

  /* ---------- Lektionstest: Aufgaben aus den Kern-Items einer Lektion ---------- */
  function uniqueSample(arr, n) {
    var seen = {}, out = [];
    shuffle(arr.slice()).forEach(function (x) { if (x != null && !seen[x]) { seen[x] = 1; out.push(x); } });
    return out.slice(0, n);
  }
  // Multiple-Choice „Was bedeutet <X>?" — Frage japanisch, Optionen = Bedeutungen.
  function meaningMC(promptJa, correct, pool) {
    var distract = uniqueSample((pool || []).filter(function (m) { return m && m !== correct; }), 3);
    var optionen = shuffle([correct].concat(distract));
    return { typ: 'mc', frage: promptJa, optionen: optionen, richtig: optionen.indexOf(correct), erkl: promptJa + ' = ' + correct };
  }
  function vocabMC(v, core) {
    var prompt = (v.kanji && v.kanji.length) ? v.kanji : v.kana;
    var pool = (core || []).filter(function (c) { return c.type === 'vocab'; }).map(function (c) { return c.data.de; });
    if (pool.length < 4) pool = pool.concat((window.VOKABULAR || []).map(function (x) { return x.de; }));
    return meaningMC(prompt, v.de, pool);
  }
  function kanjiMC(k, core) {
    var pool = (core || []).filter(function (c) { return c.type === 'kanji'; }).map(function (c) { return c.data.meaning; });
    if (pool.length < 4) pool = pool.concat((window.KANJI || []).map(function (x) { return x.meaning; }));
    return meaningMC(k.k, k.meaning, pool);
  }
  // Grammatik-Aufgabe: GRAMMATIK_PLUS-Übungen bevorzugt (mc/cloze), sonst Übersetzen (Selbstkontrolle).
  function grammarQuestion(g) {
    var plus = (window.GRAMMATIK_PLUS || {})[g.pattern];
    if (plus && plus.uebungen && plus.uebungen.length) {
      var ex = {}, u = randPick(plus.uebungen), key;
      for (key in u) ex[key] = u[key];
      delete ex.srsId; // Testmodus: kein SRS-Seiteneffekt
      return ex;
    }
    var b = (g.beispiele || [])[0];
    if (b && b.jp && b.de) return { typ: 'translate', prompt: b.de, jp: b.jp, de: b.de };
    return null;
  }
  // Zusammenstellung von n Aufgaben aus den Kern-Items der Lektion (über SRS.lessonCore).
  function buildLessonTest(lesson, n) {
    n = n || 10;
    var core = (window.SRS && window.SRS.lessonCore) ? window.SRS.lessonCore(lesson) : [];
    var qs = [];
    core.forEach(function (c) {
      var ex = null;
      if (c.type === 'grammar') ex = grammarQuestion(c.data);
      else if (c.type === 'vocab') ex = vocabMC(c.data, core);
      else if (c.type === 'kanji') ex = kanjiMC(c.data, core);
      if (ex) qs.push(ex);
    });
    return shuffle(qs).slice(0, n);
  }

  window.Exercises = {
    buildTagIndex: buildTagIndex, fillTemplate: fillTemplate, patternOf: patternOf,
    particleExercise: particleExercise, orderExercise: orderExercise, translateExercise: translateExercise,
    fromTemplate: fromTemplate, gradeAnswer: gradeAnswer, renderExercise: renderExercise,
    meaningMC: meaningMC, buildLessonTest: buildLessonTest,
    vocabForms: vocabForms, acceptsVocabInput: acceptsVocabInput,
  };
})();

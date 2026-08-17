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
    // Verben: die Wörterbuchform zählt immer als richtige Antwort — sie ist die wichtigere
    // Grundform (die ます-Form bleibt ebenfalls gültig).
    var c = /^V\./.test(v.pos || '') ? verbConj(v) : null;
    if (c) {
      forms.push(c.kana.dict);
      if (c.written && c.written.dict) forms.push(c.written.dict);
      if (K.kanaToRomaji) forms.push(K.kanaToRomaji(c.kana.dict));
    }
    return forms;
  }
  // Liberaler Abgleich einer Eingabe gegen ein Wort: Romaji, Kana/Furigana ODER Kanji gelten als richtig.
  function acceptsVocabInput(input, v) {
    var t = nrm(input); if (!t) return false;
    return vocabForms(v).some(function (f) { return nrm(f) === t; });
  }

  var PARTICLES = ['は', 'が', 'を', 'に', 'で', 'へ', 'と', 'も', 'から', 'まで'];

  /* ---------- Auto-Furigana: Lesung über noch nicht beherrschten Kanji (Wörterbuch aus VOKABULAR) ---------- */
  var _furiDict = null, _furiMaxLen = 1;
  function hasKanji(s) { return /[一-龯㐀-䶿]/.test(s); }
  function furiDict() {
    if (_furiDict) return _furiDict;
    var d = {}, max = 1;
    (window.VOKABULAR || []).forEach(function (v) {
      if (v.kanji && v.kana && hasKanji(v.kanji) && !(v.kanji in d)) { d[v.kanji] = v.kana; if (v.kanji.length > max) max = v.kanji.length; }
    });
    _furiDict = d; _furiMaxLen = max; return d;
  }
  function wordNeedsFuri(w) { for (var i = 0; i < w.length; i++) { var c = w.charAt(i); if (hasKanji(c) && !kanjiMastered(c)) return true; } return false; }
  // Erkennt bekannte Kanji-Wörter (Longest-Match) und setzt Furigana über solche mit unbeherrschten Kanji.
  // Partikel/Kana/Lücken bleiben unverändert. Liefert fertiges (escaptes) HTML.
  function autoFuri(jp) {
    jp = String(jp == null ? '' : jp);
    var d = furiDict(), out = '', i = 0, n = jp.length;
    while (i < n) {
      var hit = null;
      for (var L = Math.min(_furiMaxLen, n - i); L >= 1; L--) {
        var sub = jp.substr(i, L);
        if (Object.prototype.hasOwnProperty.call(d, sub)) { hit = { w: sub, kana: d[sub], L: L }; break; }
      }
      if (hit) {
        out += wordNeedsFuri(hit.w) ? ('<ruby>' + esc(hit.w) + '<rt>' + esc(hit.kana) + '</rt></ruby>') : esc(hit.w);
        i += hit.L;
      } else { out += esc(jp.charAt(i)); i += 1; }
    }
    return out;
  }

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
    // Tippen: dieselbe Akzeptanzlogik wie renderInput — hier ohne DOM prüfbar.
    if (ex.typ === 'input') return acceptsInput(answer, ex);
    // Lesungen: je Spalte (音/訓) muss GENAU die richtige Menge gewählt sein — Reihenfolge egal.
    if (ex.typ === 'readings') {
      if (!Array.isArray(answer) || answer.length !== ex.columns.length) return false;
      return ex.columns.every(function (c, i) {
        var a = (answer[i] || []).slice().sort(function (x, y) { return x - y; });
        var r = c.richtig.slice().sort(function (x, y) { return x - y; });
        return a.length === r.length && a.every(function (v, j) { return v === r[j]; });
      });
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
      // gradeOpts (z. B. {gainCeiling, gainScale}) erlauben pro Übung andere Score-Regeln (Kanji-MC).
      if (window.SRS && ex.srsId && correct !== null) window.SRS.grade(ex.srsId, correct ? 1 : 0, undefined, ex.gradeOpts);
    }
    if (ex.typ === 'mc') return renderMC(ex, mount, finish);
    if (ex.typ === 'cloze') return renderCloze(ex, mount, finish);
    if (ex.typ === 'order') return renderOrder(ex, mount, finish);
    if (ex.typ === 'input') return renderInput(ex, mount, finish);
    if (ex.typ === 'readings') return renderReadings(ex, mount, finish);
    if (ex.typ === 'translate') return renderTranslate(ex, mount, finish);
  }

  function feedback(mount, ok, erkl) {
    var f = el('div', 'ex-feedback ' + (ok ? 'ok' : 'no'), (ok ? '✓ Richtig' : '✗ Leider falsch') + (erkl ? ' · ' + esc(erkl) : ''));
    mount.appendChild(f);
  }

  function renderMC(ex, mount, finish) {
    // „big" = großzügige Lernkarte (großer Prompt + Unterfrage + volle Optionsknöpfe), wie die alten Karten.
    var big = !!ex.big;
    // Sprache je Richtung: Frage standardmäßig japanisch; Optionen nur „ja", wenn sie japanisch sind.
    // Furigana über Kanji, wenn die Lesung noch gebraucht wird (ex.furigana gesetzt).
    var frHtml = (ex.frageJa === false) ? esc(ex.frage)
      : (ex.furigana && kat().ruby) ? kat().ruby(ex.frage, ex.furigana)   // Einzelwort-Karte: präzise Lesung
      : autoFuri(ex.frage);                                               // Sätze: Auto-Furigana je bekanntem Wort
    mount.appendChild(el('div', (ex.frageJa === false ? 'ex-frage' : 'ex-frage ja') + (big ? ' big' : ''), frHtml));
    if (big && ex.q) mount.appendChild(el('div', 'ex-subprompt', esc(ex.q)));
    var opts = el('div', 'ex-options' + (big ? ' big' : ''));
    ex.optionen.forEach(function (o, i) {
      var b = el('button', (ex.optJa ? 'ex-opt ja' : 'ex-opt') + (big ? ' big' : ''), ex.optJa ? autoFuri(o) : esc(o)); b.type = 'button';
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
    mount.appendChild(el('div', 'ex-frage ja', autoFuri(ex.satz || ex.frage || '')));
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

  /* Tippen (Produktion) — zwei Betriebsarten:
     a) ex.accept = Vokabel-Objekt → liberaler Abgleich (Kanji/Kana/Rōmaji, bei Verben zusätzlich
        die Wörterbuchform, s. vocabForms).
     b) ex.antworten = Liste erwarteter Schreibungen → EXAKTER Abgleich. Nötig für den Verbformen-
        Trainer: dort wäre „かう" über vocabForms fälschlich eine gültige Antwort auf die て-Form.
     Für b) liefert ex.loesung den Text der Musterlösung und ex.placeholder den Eingabe-Hinweis. */
  function inputSolutions(ex) {
    return (ex.antworten && ex.antworten.length) ? ex.antworten : vocabForms(ex.accept);
  }
  function acceptsInput(value, ex) {
    var t = nrm(value); if (!t) return false;
    if (ex.antworten && ex.antworten.length)
      return ex.antworten.some(function (f) { return nrm(f) === t; });
    return acceptsVocabInput(value, ex.accept);
  }
  function renderInput(ex, mount, finish) {
    var big = !!ex.big;
    // Japanischer Prompt (Verbformen): Ruby wie auf der Verben-Seite, sonst reiner Text.
    var pHtml = ex.promptJa
      ? ((ex.furigana && kat().ruby) ? kat().ruby(ex.prompt, ex.furigana) : autoFuri(ex.prompt))
      : esc(ex.prompt);
    mount.appendChild(el('div', (big ? 'ex-frage big' : 'ex-prompt') + (ex.promptJa ? ' ja' : ''), pHtml));
    if (big && ex.q) mount.appendChild(el('div', 'ex-subprompt', esc(ex.q)));
    var inp = el('input', 'ex-input'); inp.type = 'text';
    inp.setAttribute('autocomplete', 'off'); inp.setAttribute('autocapitalize', 'off');
    inp.setAttribute('autocorrect', 'off'); inp.setAttribute('spellcheck', 'false');
    inp.setAttribute('aria-label', 'Antwort');
    inp.placeholder = ex.placeholder || 'Rōmaji, Kana oder Kanji …';
    var btn = el('button', 'btn-primary ex-check', 'Prüfen'); btn.type = 'button';
    function check() {
      if (mount.querySelector('.ex-feedback')) return;
      var ok = acceptsInput(inp.value, ex);
      inp.disabled = true;
      feedback(mount, ok, ok ? '' : ('Lösung: ' + (ex.loesung || inputSolutions(ex).join(' · '))));
      finish(ok);
    }
    btn.addEventListener('click', check);
    inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') check(); });
    mount.appendChild(inp); mount.appendChild(btn);
  }

  function renderOrder(ex, mount, finish) {
    var answer = [];
    var target = el('div', 'ex-target');
    var bank = el('div', 'ex-bank');
    ex.chunks.forEach(function (c) {
      var b = el('button', 'ex-chunk', autoFuri(c)); b.type = 'button';
      b.addEventListener('click', function () {
        if (b.disabled) return; b.disabled = true; answer.push(c);
        var t = el('span', 'ex-token', autoFuri(c)); target.appendChild(t);
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

  // Lesungs-Zuordnung: zwei Spalten (音/訓) mit Mehrfachauswahl, ein „Prüfen"-Knopf.
  function renderReadings(ex, mount, finish) {
    mount.appendChild(el('div', 'ex-frage ja big', esc(ex.frage)));
    if (ex.q) mount.appendChild(el('div', 'ex-subprompt', esc(ex.q)));
    var wrap = el('div', 'ex-readings');
    var cols = ex.columns.map(function (c) {
      var col = el('div', 'ex-rcol'); col.dataset.kind = c.kind;
      col.appendChild(el('div', 'ex-rlbl', '<span class="lbl' + (c.kind === 'kun' ? ' kun' : '') + '">' + esc(c.label) + '</span> ' + esc(c.title)));
      var opts = el('div', 'ex-options');
      c.optionen.forEach(function (o) {
        var b = el('button', 'ex-opt ja', esc(o)); b.type = 'button'; b.setAttribute('aria-pressed', 'false');
        b.addEventListener('click', function () {
          if (mount.querySelector('.ex-feedback')) return; // nach dem Prüfen gesperrt
          var on = b.classList.toggle('sel');
          b.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
        opts.appendChild(b);
      });
      col.appendChild(opts); wrap.appendChild(col);
      return { def: c, buttons: Array.prototype.slice.call(opts.querySelectorAll('.ex-opt')) };
    });
    mount.appendChild(wrap);
    var check = el('button', 'btn-primary ex-check', 'Prüfen'); check.type = 'button';
    check.addEventListener('click', function () {
      if (mount.querySelector('.ex-feedback')) return;
      var answer = cols.map(function (c) {
        var sel = [];
        c.buttons.forEach(function (b, i) { if (b.classList.contains('sel')) sel.push(i); });
        return sel;
      });
      var ok = gradeAnswer(ex, answer);
      cols.forEach(function (c) {
        c.buttons.forEach(function (b, i) {
          b.disabled = true;
          var right = c.def.richtig.indexOf(i) !== -1, chosen = b.classList.contains('sel');
          if (right && chosen) b.classList.add('correct');
          else if (right) b.classList.add('missed');   // richtig, aber nicht gewählt
          else if (chosen) b.classList.add('wrong');
        });
      });
      check.disabled = true;
      feedback(mount, ok, ex.erkl);
      finish(ok);
    });
    mount.appendChild(check);
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

  /* ============================================================
     Zentrale Übungs-Registry: für jedes Item (Vokabel/Kanji/Grammatik)
     alle sinnvollen Übungstypen erzeugen + adaptiv eine auswählen.
     exercisesFor(item) liefert FABRIKEN (frische, randomisierte Übung pro Aufruf).
     ============================================================ */
  var KANJI_GRADE_OPTS = { gainCeiling: 70, gainScale: 0.5 }; // Kanji-MC: weniger Gewinn, ab 70 keiner; Strafe normal.

  function vocabId(v) { return 'v:' + v.kana + '|' + v.lesson; }
  function vocabWritten(v) { return (v.kanji && v.kanji.length) ? v.kanji : v.kana; }
  // Furigana zeigen, wenn die Schreibung Kanji enthält, deren Einzel-Kanji noch nicht beherrscht sind.
  function kanjiMastered(ch) { return !!(window.SRS && window.SRS.isMastered && window.SRS.isMastered('k:' + ch)); }
  function vocabNeedsFurigana(v) {
    if (!v.kanji || !v.kanji.length) return false; // reine Kana: keine Kanji
    for (var i = 0; i < v.kanji.length; i++) { var ch = v.kanji[i];
      if (/[一-龯㐀-䶿]/.test(ch) && !kanjiMastered(ch)) return true; }
    return false;
  }
  function vocabMeaningPool(v, core) {
    var pool = (core || []).filter(function (c) { return c.type === 'vocab'; }).map(function (c) { return c.data.de; });
    if (pool.length < 4) pool = pool.concat((window.VOKABULAR || []).filter(function (x) { return x.pos === v.pos; }).map(function (x) { return x.de; }));
    if (pool.length < 4) pool = pool.concat((window.VOKABULAR || []).map(function (x) { return x.de; }));
    return pool;
  }
  // Vokabel MC JP→DE (Erkennen).
  function vocabRecognizeMC(v, core) {
    var ex = meaningMC(vocabWritten(v), v.de, vocabMeaningPool(v, core));
    ex.srsId = vocabId(v); ex.mode = 'vocab-recognize'; ex.big = true; ex.q = 'Was bedeutet das?';
    if (vocabNeedsFurigana(v)) ex.furigana = v.kana; // Lesung über noch nicht beherrschten Kanji
    return ex;
  }
  // Vokabel MC DE→JP (Produktion: japanische Schreibung wählen).
  function vocabProduceMC(v, core) {
    var correct = vocabWritten(v);
    var pool = (core || []).filter(function (c) { return c.type === 'vocab'; }).map(function (c) { return vocabWritten(c.data); });
    if (pool.length < 4) pool = pool.concat((window.VOKABULAR || []).filter(function (x) { return x.pos === v.pos; }).map(vocabWritten));
    if (pool.length < 4) pool = pool.concat((window.VOKABULAR || []).map(vocabWritten));
    var distract = uniqueSample(pool.filter(function (f) { return f && f !== correct; }), 3);
    var optionen = shuffle([correct].concat(distract));
    return { typ: 'mc', srsId: vocabId(v), frage: v.de, frageJa: false, optJa: true, big: true, q: 'Welches Wort ist das?',
      optionen: optionen, richtig: optionen.indexOf(correct), erkl: v.de + ' = ' + correct, mode: 'vocab-produce' };
  }
  // Vokabel Tippen (Produktion, freie Eingabe).
  function vocabInput(v) {
    return { typ: 'input', srsId: vocabId(v), prompt: v.de, accept: v, big: true, q: 'Wie heißt das auf Japanisch?',
      erkl: v.de + ' = ' + vocabWritten(v), mode: 'vocab-input' };
  }

  /* ---------- Verb-Übungen für Lernlisten & Wiederholung: Wörterbuchform + weitere Formen ----------
     „Freigeschaltet" = die Lektion, in der die Form eingeführt wird (aus GRAMMATIK abgeleitet:
     て L14 · ない L17 · 辞書形 L18 · た L19), ist über den Lernpfad erreicht. Alle Übungen
     benoten die kanonische Vokabel-ID (v:kana|lesson) → Fortschritt bleibt global. */
  /* Jede Verbform zeigt auf ein ECHTES Muster aus window.GRAMMATIK. Das ist zweierlei Grundlage:
     (a) die Freischaltung über den Lernpfad und (b) die SRS-ID der Verbform-Übungen. Eine
     erfundene 'g:'-ID wäre eine Waise — stats() und dueIds() iterieren über store.items und
     würden sie dauerhaft als „gelernt"/„fällig" mitzählen, ohne dass sie je im Katalog auftaucht.
     Gegatet sind NUR die vier Formen aus VERB_FORM_GATED; ます & Co. sind Grundinventar ab L4. */
  var VERB_FORM_INTRO = {
    masu: 'V ます／ました', masen: 'V ます／ました', mashita: 'V ます／ました',
    mashou: '～ませんか／～ましょう', tai: 'V たいです',
    te: 'V て-Form', nai: 'V ない-Form', dict: 'V 辞書形 (Wörterbuchform)', ta: 'V た-Form',
    nakatta: '普通形 (Plain-/Umgangsform)'
  };
  var VERB_FORM_FALLBACK_LESSON = { masu: 4, masen: 4, mashita: 4, mashou: 6, tai: 13,
    te: 14, nai: 17, dict: 18, ta: 19, nakatta: 20 };
  var VERB_FORM_GATED = { te: 1, nai: 1, dict: 1, ta: 1 };
  function formPattern(form) { return VERB_FORM_INTRO[form] || null; }
  function formGated(form) { return !!VERB_FORM_GATED[form]; }
  function formLesson(form) {
    var pat = VERB_FORM_INTRO[form];
    var g = (window.GRAMMATIK || []).filter(function (x) { return x.pattern === pat; })[0];
    return (g && g.lesson) || VERB_FORM_FALLBACK_LESSON[form] || 99;
  }
  function formUnlocked(form) {
    if (!VERB_FORM_GATED[form]) return true; // ます/ましょう/たい/なかった: kein eigenes Gate
    if (!(window.SRS && window.SRS.maxUnlockedLesson)) return true;
    return window.SRS.maxUnlockedLesson() >= formLesson(form);
  }
  // Konjugation eines Vokabel-Verbs (Kana; Schreibung mit Kanji separat), null wenn nicht konjugierbar.
  function verbConj(v) {
    var K = kat();
    if (!K.conjugate || !K.verbGroup || !/^V\./.test(v.pos || '')) return null;
    var g = K.verbGroup(v.pos); if (g <= 0) return null;
    var kana = K.conjugate(v.kana, g); if (!kana) return null;
    var written = (v.kanji && v.kanji.length && v.kanji !== v.kana) ? K.conjugate(v.kanji, g) : null;
    return { g: g, kana: kana, written: written };
  }
  // Distraktoren: eigene andere Formen + naive Gruppe-II-Übertragung + gleiche Form anderer Verben.
  function verbFormOptions(v, form, c) {
    var correct = c.kana[form];
    var naive = String(v.kana).replace(/ます$/, '') + ({ te: 'て', ta: 'た', nai: 'ない', dict: 'る' }[form]);
    var seen = {}; seen[correct] = 1;
    var distract = [];
    shuffle([c.kana.te, c.kana.ta, c.kana.nai, c.kana.dict, naive]).forEach(function (x) {
      if (x && !seen[x]) { seen[x] = 1; distract.push(x); } });
    var pool = (window.VOKABULAR || []).filter(function (x) { return /^V\./.test(x.pos) && x.kana !== v.kana; });
    var guard = 0;
    while (distract.length < 3 && guard < 40 && pool.length) { guard++;
      var o = pool[Math.floor(Math.random() * pool.length)];
      var oc = verbConj(o), x = oc && oc.kana[form];
      if (x && !seen[x]) { seen[x] = 1; distract.push(x); } }
    return shuffle([correct].concat(distract.slice(0, 3)));
  }
  // ます-Form → Wörterbuchform (ab deren Einführungs-Lektion).
  function verbDictMC(v) {
    var c = verbConj(v); if (!c) return null;
    var correct = c.kana.dict;
    var optionen = verbFormOptions(v, 'dict', c);
    var prompt = (v.kanji && v.kanji.length && v.kanji !== v.kana) ? v.kanji + '（' + v.kana + '）' : v.kana;
    return { typ: 'mc', srsId: vocabId(v), frage: prompt + ' → ?（Wörterbuchform）', optionen: optionen,
      richtig: optionen.indexOf(correct), erkl: v.kana + ' → ' + correct + (v.de ? ' — ' + v.de : ''), mode: 'verb-dict' };
  }
  // Beherrschtes Verb: weitere freigeschaltete Form — abgefragt AUS der Wörterbuchform
  // (die Wörterbuchform gehört immer zum Lernstoff, s. verbExtraExercise).
  function verbFormMC(v, form) {
    var c = verbConj(v); if (!c || !c.kana[form]) return null;
    var correct = c.kana[form];
    var optionen = verbFormOptions(v, form, c);
    var baseKana = c.kana.dict;
    var baseWritten = c.written && c.written.dict;
    var prompt = (baseWritten && baseWritten !== baseKana) ? baseWritten + '（' + baseKana + '）' : baseKana;
    var label = { te: 'て-Form', ta: 'た-Form', nai: 'ない-Form' }[form] || form;
    return { typ: 'mc', srsId: vocabId(v), frage: prompt + ' → ?（' + label + '）', optionen: optionen,
      richtig: optionen.indexOf(correct), erkl: baseKana + ' → ' + correct + (v.de ? ' — ' + v.de : ''), mode: 'verb-form-' + form };
  }
  // Zusatz-Übung für Verben je Lernstand. Die WÖRTERBUCHFORM ist WICHTIGER als die ます-Form:
  // sie gehört immer zum Lernstoff (kein Freischalt-Gate) und dominiert ab Lernstand 40 die
  // Produktion (50 %). Ab „beherrscht" (80): 50 % freigeschaltete Formen (て/た/ない, aus der
  // Wörterbuchform), sonst bevorzugt nochmal die Wörterbuchform. Sonst null (normale Auswahl).
  function verbExtraExercise(v, score, rng) {
    if (!/^V\./.test(v.pos || '')) return null;
    if (score >= 80) {
      var forms = ['te', 'ta', 'nai'].filter(formUnlocked);
      if (forms.length && rng() < 0.5) {
        var ex = verbFormMC(v, forms[Math.floor(rng() * forms.length)]);
        if (ex) return ex;
      }
      if (rng() < 0.6) return verbDictMC(v);
      return null;
    }
    if (score >= 40 && rng() < 0.5) return verbDictMC(v);
    return null;
  }
  // Kanji MC Bedeutung (Glyph → Bedeutung), gedeckelte Score-Regel.
  function kanjiMeaningMC(k, core) {
    var ex = kanjiMC(k, core); ex.srsId = 'k:' + k.k; ex.gradeOpts = KANJI_GRADE_OPTS; ex.mode = 'kanji-meaning';
    ex.big = true; ex.q = 'Was bedeutet dieses Kanji?'; return ex;
  }
  // Kanji MC „richtiges Kanji wählen" (Bedeutung → Glyph), gedeckelte Score-Regel.
  function kanjiPickMC(k, pool) {
    var correct = k.k;
    var glyphs = (pool || window.KANJI || []).filter(function (x) { return x.level === k.level && x.k !== correct; }).map(function (x) { return x.k; });
    if (glyphs.length < 3) glyphs = glyphs.concat((window.KANJI || []).filter(function (x) { return x.k !== correct; }).map(function (x) { return x.k; }));
    var distract = uniqueSample(glyphs, 3);
    var optionen = shuffle([correct].concat(distract));
    return { typ: 'mc', srsId: 'k:' + k.k, frage: k.meaning, frageJa: false, optJa: true, big: true, q: 'Welches Kanji passt?',
      optionen: optionen, richtig: optionen.indexOf(correct), erkl: k.meaning + ' = ' + correct, gradeOpts: KANJI_GRADE_OPTS, mode: 'kanji-pick' };
  }
  /* ---------- Kanji-Lesungen zuordnen (zwei Spalten 音/訓, Mehrfachauswahl) ----------
     Fragt die im Katalog hinterlegten (= häufigen) Lesungen ab. Eine Spalte entfällt, wenn die
     Lesungsliste leer ist (11 Kanji haben keine Kun-Lesung). */
  function stripOku(r) { return String(r).replace(/-/g, ''); }
  // Distraktoren derselben Lesungsart anderer Kanji — bevorzugt gleiche Stufe (A1.7 hat nur wenige Kanji
  // → Gesamtbestand als Rückfall) und gleiche Okurigana-Form, damit das Format nichts verrät.
  // Ausgeschlossen sind Lesungen, die ohne Okurigana mit einer Lösung zusammenfallen (み vs. み-る).
  function readingDistractors(k, kind, need, pool) {
    var all = pool || window.KANJI || [];
    var correct = k[kind] || [];
    var forbidden = {};
    correct.forEach(function (r) { forbidden[stripOku(r)] = 1; });
    var hasOku = correct.some(function (r) { return r.indexOf('-') !== -1; });
    function collect(sameLevel, sameShape) {
      var out = [];
      all.forEach(function (x) {
        if (x.k === k.k) return;
        if (sameLevel && x.level !== k.level) return;
        (x[kind] || []).forEach(function (r) {
          if (forbidden[stripOku(r)]) return;
          if (sameShape && (r.indexOf('-') !== -1) !== hasOku) return;
          out.push(r);
        });
      });
      return out;
    }
    var tiers = [collect(true, true), collect(true, false), collect(false, true), collect(false, false)];
    var seen = {}, picked = [];
    tiers.forEach(function (t) {
      if (picked.length >= need) return;
      uniqueSample(t, need * 3).forEach(function (r) {
        if (picked.length >= need || seen[r] || forbidden[stripOku(r)]) return;
        seen[r] = 1; picked.push(r);
      });
    });
    return picked.slice(0, need);
  }
  var READING_COLS = [
    { kind: 'on', label: '音', title: 'On-Lesung (Katakana)' },
    { kind: 'kun', label: '訓', title: 'Kun-Lesung (Hiragana)' },
  ];
  function kanjiReadingsEx(k, pool) {
    var columns = [];
    READING_COLS.forEach(function (d) {
      var correct = uniqueSample(k[d.kind] || [], 4);
      if (!correct.length) return;
      var distract = readingDistractors(k, d.kind, Math.max(2, 5 - correct.length), pool);
      var optionen = shuffle(correct.concat(distract));
      columns.push({ kind: d.kind, label: d.label, title: d.title, optionen: optionen,
        richtig: correct.map(function (r) { return optionen.indexOf(r); }) });
    });
    if (!columns.length) return null;
    return { typ: 'readings', srsId: 'k:' + k.k, frage: k.k, mode: 'kanji-readings', gradeOpts: KANJI_GRADE_OPTS,
      q: 'Welche Lesungen gehören zu diesem Kanji? (mehrere möglich)', columns: columns,
      erkl: k.k + ' — ' + READING_COLS.map(function (d) {
        return (k[d.kind] || []).length ? d.label + ' ' + k[d.kind].join('・') : '';
      }).filter(Boolean).join(' · ') + ' — ' + k.meaning };
  }
  // Kanji Zeichnen — Deskriptor (Host rendert via KanjiWrite; Schreiben bewertet ungedeckelt = Meister-Pfad).
  function kanjiWriteEx(k) { return { typ: 'write', srsId: 'k:' + k.k, data: k, mode: 'kanji-write' }; }
  // Grammatik: Fabriken aus Satz-Vorlagen (Satzbau/Partikel/Übersetzen) + GRAMMATIK_PLUS (mc/cloze)
  // + für die Verbform-Muster (て/た/ない/辞書形) die generierten Konjugations-Drills — damit
  // Grammatik auch in Lernlisten dediziert geübt wird (nicht nur als Übersetzungs-Fallback).
  function grammarExercises(g) {
    var out = [];
    var form = ({ 'V て-Form': 'te', 'V た-Form': 'ta', 'V ない-Form': 'nai', 'V 辞書形 (Wörterbuchform)': 'dict' })[g.pattern];
    if (form && kat().genVerbFormExercises && (window.VOKABULAR || []).length) {
      out.push(function () {
        var ex = (kat().genVerbFormExercises(form, 1) || [])[0];
        if (ex) ex.srsId = 'g:' + g.pattern;
        return ex || null;
      });
    }
    var T = (window.SATZ_TEMPLATES || {})[g.pattern];
    if (T && T.length) {
      out.push(function () { return fromTemplate(randPick(T), { type: 'order' }); });
      out.push(function () { return fromTemplate(randPick(T), { type: 'mc' }); });
      out.push(function () { return fromTemplate(randPick(T), { type: 'translate' }); });
    }
    var plus = (window.GRAMMATIK_PLUS || {})[g.pattern];
    if (plus && plus.uebungen && plus.uebungen.length) {
      out.push(function () { var u = randPick(plus.uebungen), ex = {}; for (var key in u) ex[key] = u[key]; ex.srsId = 'g:' + g.pattern; return ex; });
    }
    if (!out.length) {
      var b = (g.beispiele || [])[0];
      if (b && b.jp && b.de) out.push(function () { return { typ: 'translate', srsId: 'g:' + g.pattern, prompt: b.de, jp: b.jp, de: b.de }; });
    }
    return out;
  }
  // Alle Übungs-Fabriken für ein Item {id,type,data}.
  function exercisesFor(item) {
    if (!item) return [];
    var t = item.type, d = item.data;
    if (t === 'vocab') return [function () { return vocabRecognizeMC(d); }, function () { return vocabProduceMC(d); }, function () { return vocabInput(d); }];
    // Reihenfolge zählt: Schreiben MUSS letzter Eintrag bleiben (pickExercise wählt bei ≥70 den letzten).
    if (t === 'kanji') return [function () { return kanjiMeaningMC(d); }, function () { return kanjiPickMC(d); },
      function () { return kanjiReadingsEx(d) || kanjiMeaningMC(d); }, function () { return kanjiWriteEx(d); }];
    if (t === 'grammar') return grammarExercises(d);
    return [];
  }
  // Adaptive Auswahl je Item + Lernstand. Vokabel: <40 Erkennen · 40–70 Produktion-MC · >70 Tippen.
  // Kanji: ≥70 Schreiben (MC bringt keinen Gewinn mehr), sonst gemischt. Grammatik: gemischt.
  function pickExercise(item, opts) {
    opts = opts || {}; var rng = opts.rng || Math.random; var score = opts.score || 0;
    var fac = exercisesFor(item); if (!fac.length) return null;
    var idx;
    if (item.type === 'vocab') {
      // Verben: ab Lernstand 40 gelegentlich die Wörterbuchform, ab „beherrscht" (80)
      // weitere freigeschaltete Formen — benotet wird dieselbe Vokabel-ID (global).
      var vx = verbExtraExercise(item.data, score, rng);
      if (vx) return vx;
      idx = score < 40 ? 0 : (score < 70 ? 1 : 2); idx = Math.min(idx, fac.length - 1);
    }
    else if (item.type === 'kanji') { idx = score >= 70 ? (fac.length - 1) : Math.floor(rng() * fac.length); }
    else { idx = Math.floor(rng() * fac.length); }
    return fac[idx]();
  }

  window.Exercises = {
    buildTagIndex: buildTagIndex, fillTemplate: fillTemplate, patternOf: patternOf,
    particleExercise: particleExercise, orderExercise: orderExercise, translateExercise: translateExercise,
    fromTemplate: fromTemplate, gradeAnswer: gradeAnswer, renderExercise: renderExercise,
    meaningMC: meaningMC, buildLessonTest: buildLessonTest,
    vocabForms: vocabForms, acceptsVocabInput: acceptsVocabInput, autoFuri: autoFuri,
    // Zentrale Registry + neue Builder
    exercisesFor: exercisesFor, pickExercise: pickExercise,
    vocabRecognizeMC: vocabRecognizeMC, vocabProduceMC: vocabProduceMC, vocabInput: vocabInput,
    kanjiMeaningMC: kanjiMeaningMC, kanjiPickMC: kanjiPickMC, kanjiWriteEx: kanjiWriteEx, kanjiReadingsEx: kanjiReadingsEx,
    grammarExercises: grammarExercises,
    verbDictMC: verbDictMC, verbFormMC: verbFormMC, formUnlocked: formUnlocked,
    formPattern: formPattern, formLesson: formLesson, formGated: formGated,
  };
})();

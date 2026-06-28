/* ============================================================
   Kanji-Schreibübung  ·  window.KanjiWrite
   Echte Strichreihenfolge aus KanjiVG-SVGs:
   - parseStrokes(): Strich-Pfade (d-Attribute) in Reihenfolge
   - geführtes Nachzeichnen mit leichter Strich-Korrektheitsprüfung
   - Abspielen der Reihenfolge (Animation)
   - Bewertung fließt in SRS (k:<Kanji>)
   Datenquelle KanjiVG (CC BY-SA 3.0, http://kanjivg.tagaini.net).
   Reine Vanilla-JS. Canvas/SVG nur im Browser; Parser ist auch in Node testbar.
   ============================================================ */
(function () {
  'use strict';
  var NS = 'http://www.w3.org/2000/svg';
  var BOX = 109;            // KanjiVG-Koordinatensystem
  var HIT = 20;             // Toleranz (in BOX-Einheiten) für Start/Endpunkt
  var HIT_MID = 30;         // Toleranz für den Mittelpunkt (fängt grob fehlplatzierte/falsch geformte Striche)
  var SNAP_BELOW = 30;      // Lernstand < 30: Striche „einrasten" (geführt)
  var GUIDE_BELOW = 60;     // Lernstand < 60: Vorlage sichtbar; ab 60 freihändig (Meistern nur freihändig)

  function cpFile(k) { return k.codePointAt(0).toString(16).padStart(5, '0') + '.svg'; }

  // Übungsmodus rein aus dem 0–100-Lernstand: <30 Snap+Vorlage, 30–59 nur Vorlage, ≥60 freihändig.
  // (Bewertung läuft in jedem Modus über strokeMatches.)
  function writeMode(score) { score = score || 0; return { snap: score < SNAP_BELOW, guide: score < GUIDE_BELOW }; }

  // Strich-Pfade aus dem SVG ziehen, nach Strich-Nummer sortiert.
  function parseStrokes(svgText) {
    var re = /<path[^>]*\bid="kvg:[0-9a-f]+-s(\d+)"[^>]*\bd="([^"]+)"/gi;
    var arr = [], m;
    while ((m = re.exec(svgText))) arr.push({ n: +m[1], d: m[2] });
    arr.sort(function (a, b) { return a.n - b.n; });
    return arr.map(function (x) { return x.d; });
  }

  /* ---------- Geometrie über echte SVG-Pfade (Browser) ---------- */
  function pathInfo(d) {
    try {
      var svg = document.createElementNS(NS, 'svg');
      var p = document.createElementNS(NS, 'path');
      p.setAttribute('d', d); svg.appendChild(p);
      svg.setAttribute('width', '0'); svg.setAttribute('height', '0');
      svg.style.position = 'absolute'; svg.style.left = '-9999px';
      document.body.appendChild(svg);
      var L = p.getTotalLength();
      var a = p.getPointAtLength(0), b = p.getPointAtLength(L), mid = p.getPointAtLength(L / 2);
      document.body.removeChild(svg);
      return { start: { x: a.x, y: a.y }, end: { x: b.x, y: b.y }, mid: { x: mid.x, y: mid.y }, len: L };
    } catch (e) { return null; }
  }
  function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }

  // Prüft, ob der gezeichnete Strich zum erwarteten passt (Start/Ende/Mitte/Richtung).
  // Strenger als bloße Endpunkt-Nähe: ein komplett falsch platzierter Strich (z. B. 一 zu tief)
  // verfehlt Start/Ende oder die Mitte und gilt damit als Fehler.
  function strokeMatches(userPts, info) {
    if (!info || userPts.length < 2) return true; // ohne Geometrie: nachsichtig
    var us = userPts[0], ue = userPts[userPts.length - 1];
    if (dist(us, info.start) > HIT || dist(ue, info.end) > HIT) return false;
    if (info.mid) { var um = userPts[Math.floor((userPts.length - 1) / 2)]; if (dist(um, info.mid) > HIT_MID) return false; }
    var ev = { x: info.end.x - info.start.x, y: info.end.y - info.start.y };
    var uv = { x: ue.x - us.x, y: ue.y - us.y };
    var dot = ev.x * uv.x + ev.y * uv.y;
    return dot >= 0; // grob gleiche Richtung
  }

  /* ---------- Widget (Browser) ---------- */
  function create(container, opts) {
    opts = opts || {};
    var strokes = parseStrokes(opts.svgText || '');
    var infos = strokes.map(pathInfo);
    var size = opts.size || 300, scale = size / BOX;
    var showGuide = opts.guide !== false;

    container.innerHTML = '';
    var canvas = document.createElement('canvas');
    canvas.width = size; canvas.height = size; canvas.className = 'kw-canvas';
    container.appendChild(canvas);
    var ctx = canvas.getContext('2d');

    var done = [];          // fertige Nutzer-Striche (Punkte in BOX-Koord.)
    var cur = [];           // aktueller Strich
    var idx = 0;            // erwarteter Strich
    var drawing = false;
    var mistakes = 0;       // komplett falsche Striche in diesem Durchgang
    var log = [];           // alle Strichversuche (auch falsche) in Zeichen-Reihenfolge: {pts, ok, expected}

    function toBox(ev) {
      var r = canvas.getBoundingClientRect();
      var cx = (ev.touches ? ev.touches[0].clientX : ev.clientX) - r.left;
      var cy = (ev.touches ? ev.touches[0].clientY : ev.clientY) - r.top;
      return { x: cx / r.width * BOX, y: cy / r.height * BOX };
    }
    function strokePath(d, color, width, prog) {
      ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      if (prog == null && window.Path2D) { ctx.save(); ctx.scale(scale, scale); ctx.stroke(new Path2D(d)); ctx.restore(); return; }
      // progressiver Verlauf via Abtasten
      var info = infos[arguments[4]];
      // Fallback: nichts
    }
    function redraw() {
      ctx.clearRect(0, 0, size, size);
      // Gitter (米-Linien)
      ctx.strokeStyle = 'rgba(120,120,120,.18)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(size / 2, 0); ctx.lineTo(size / 2, size);
      ctx.moveTo(0, size / 2); ctx.lineTo(size, size / 2); ctx.stroke();
      ctx.save(); ctx.scale(scale, scale);
      // Vorlage (alle Striche blass)
      if (showGuide && window.Path2D) {
        ctx.strokeStyle = 'rgba(60,60,70,.16)'; ctx.lineWidth = 5.5; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        strokes.forEach(function (d) { ctx.stroke(new Path2D(d)); });
        // aktuellen Strich als Hinweis hervorheben
        if (idx < strokes.length) { ctx.strokeStyle = 'rgba(178,58,46,.5)'; ctx.lineWidth = 6; ctx.stroke(new Path2D(strokes[idx])); }
      }
      ctx.restore();
      // Nutzer-Striche
      ctx.strokeStyle = '#20242b'; ctx.lineWidth = 6.5; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      done.concat(cur.length ? [cur] : []).forEach(function (pts) {
        ctx.beginPath(); pts.forEach(function (p, i) { var x = p.x * scale, y = p.y * scale; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.stroke();
      });
    }
    // Nach dem letzten Strich ist das Feld gesperrt (erst clear()/„Nochmal" gibt es wieder frei).
    function startDraw(ev) { if (idx >= strokes.length) return; ev.preventDefault(); drawing = true; cur = [toBox(ev)]; }
    function moveDraw(ev) { if (!drawing) return; ev.preventDefault(); cur.push(toBox(ev)); redraw(); }
    function endDraw() {
      if (!drawing) return; drawing = false;
      var attempt = cur.slice();           // Roh-Punkte wie gezeichnet (für den Fehler-Vergleich)
      var ok = strokeMatches(cur, infos[idx]);
      if (ok) {
        // Snap-Modus (Anfang): den akzeptierten Strich sauber auf die Referenz „einrasten";
        // später (genug korrekte Schreibungen) freihändig die eigenen Punkte behalten.
        var rec = attempt.slice();
        if (opts.snap) { var ref = refStrokePoints(strokes[idx]); if (ref && ref.length >= 2) rec = ref; }
        log.push({ pts: attempt, ok: true, expected: idx });
        done.push(rec); idx++; if (opts.onProgress) opts.onProgress(idx, strokes.length);
      } else if (attempt.length >= 2) {
        // Komplett falscher Strich → als Fehler werten (kein Fortschritt), Strich verwerfen, aber protokollieren.
        log.push({ pts: attempt, ok: false, expected: idx });
        mistakes++; if (opts.onMistake) opts.onMistake(idx + 1, mistakes);
      }
      cur = []; redraw();
      if (ok && idx >= strokes.length && opts.onComplete) opts.onComplete(mistakes === 0);
    }
    // Referenz-Strich in gleichmäßige Punkte (BOX-Koord.) abtasten — für das Snapping.
    function refStrokePoints(d) {
      var pts = [], n = 18;
      for (var t = 0; t <= n; t++) { var p = samplePoint(d, t / n); if (p) pts.push({ x: p.x, y: p.y }); }
      return pts;
    }
    canvas.addEventListener('pointerdown', startDraw);
    canvas.addEventListener('pointermove', moveDraw);
    window.addEventListener('pointerup', endDraw);
    canvas.addEventListener('touchstart', startDraw, { passive: false });
    canvas.addEventListener('touchmove', moveDraw, { passive: false });
    canvas.addEventListener('touchend', endDraw);

    function clear() { done = []; cur = []; idx = 0; mistakes = 0; log = []; redraw(); if (opts.onProgress) opts.onProgress(0, strokes.length); }
    function toggleGuide() { showGuide = !showGuide; redraw(); return showGuide; }

    // Reihenfolge abspielen (Animation Strich für Strich)
    function play() {
      clear();
      var si = 0;
      function animStroke() {
        if (si >= strokes.length) return;
        var info = infos[si], d = strokes[si];
        var t = 0, steps = 24;
        var pseudo = [];
        var timer = setInterval(function () {
          t++;
          if (window.Path2D && info) {
            var pt = samplePoint(d, t / steps);
            if (pt) pseudo.push({ x: pt.x, y: pt.y });
            cur = pseudo; redraw();
          }
          if (t >= steps) { clearInterval(timer); done.push(pseudo.slice()); cur = []; idx = si + 1; si++; redraw(); setTimeout(animStroke, 180); }
        }, 16);
      }
      animStroke();
    }
    function samplePoint(d, frac) {
      try {
        var svg = document.createElementNS(NS, 'svg'), p = document.createElementNS(NS, 'path');
        p.setAttribute('d', d); svg.appendChild(p); svg.style.position = 'absolute'; svg.style.left = '-9999px';
        document.body.appendChild(svg); var L = p.getTotalLength(); var pt = p.getPointAtLength(L * frac);
        document.body.removeChild(svg); return pt;
      } catch (e) { return null; }
    }

    /* ---------- Fehler-Vergleich: „links richtig / rechts deins" ---------- */
    // Beide Seiten als Punkt-Strich-Listen (BOX-Koord.) mit Farbe + Nummer. Referenz = korrekte
    // Reihenfolge; „Deins" = protokollierte Versuche in Zeichen-Reihenfolge (falsche rot).
    function refItems() {
      return strokes.map(function (d, i) { return { pts: refStrokePoints(d), color: '#3a4150', n: i + 1, ok: true }; });
    }
    function userItems() {
      return log.map(function (a, i) { return { pts: a.pts, color: a.ok ? '#20242b' : '#d23b3b', n: i + 1, ok: a.ok }; });
    }
    function paint(c, csc, items, upto, partial) {
      c.clearRect(0, 0, c.canvas.width, c.canvas.height);
      c.strokeStyle = 'rgba(120,120,120,.18)'; c.lineWidth = 1; c.beginPath();
      c.moveTo(c.canvas.width / 2, 0); c.lineTo(c.canvas.width / 2, c.canvas.height);
      c.moveTo(0, c.canvas.height / 2); c.lineTo(c.canvas.width, c.canvas.height / 2); c.stroke();
      items.forEach(function (it, i) {
        if (upto != null && i > upto) return;
        var pts = (upto != null && i === upto && partial != null) ? it.pts.slice(0, Math.max(2, Math.ceil(it.pts.length * partial))) : it.pts;
        if (!pts || pts.length < 1) return;
        c.strokeStyle = it.color; c.lineWidth = 6; c.lineCap = 'round'; c.lineJoin = 'round';
        c.beginPath(); pts.forEach(function (p, j) { var x = p.x * csc, y = p.y * csc; j ? c.lineTo(x, y) : c.moveTo(x, y); }); c.stroke();
        var s = it.pts[0]; // Nummer am Strich-Anfang
        c.fillStyle = '#fff'; c.beginPath(); c.arc(s.x * csc, s.y * csc, 8, 0, 6.2832); c.fill();
        c.fillStyle = it.color; c.font = 'bold 11px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
        c.fillText(String(it.n), s.x * csc, s.y * csc);
      });
    }
    // Vergleichsansicht in einen Container rendern (zwei Canvases + „Abspielen").
    function showComparison(host) {
      if (!host) return;
      var cs = Math.min(180, Math.max(120, Math.round(size * 0.55)));
      host.innerHTML = '';
      var wrap = document.createElement('div');
      wrap.className = 'kw-compare';
      wrap.setAttribute('style', 'display:flex;gap:1rem;justify-content:center;flex-wrap:wrap;margin:.4rem 0');
      function cell(label) {
        var d = document.createElement('div'); d.setAttribute('style', 'display:flex;flex-direction:column;align-items:center;gap:.25rem');
        var l = document.createElement('div'); l.textContent = label; l.setAttribute('style', 'font-size:.8rem;font-weight:700;color:var(--muted,#666)');
        var cv = document.createElement('canvas'); cv.width = cs; cv.height = cs;
        cv.setAttribute('style', 'background:var(--surface,#fff);border:1px solid var(--border,#ddd);border-radius:10px;touch-action:none');
        d.appendChild(l); d.appendChild(cv); return { box: d, cv: cv };
      }
      var left = cell('Richtig'), right = cell('Deins');
      wrap.appendChild(left.box); wrap.appendChild(right.box);
      host.appendChild(wrap);
      var playRow = document.createElement('div'); playRow.setAttribute('style', 'text-align:center;margin:.2rem 0 .4rem');
      var playBtn = document.createElement('button'); playBtn.type = 'button'; playBtn.className = 'btn';
      playBtn.innerHTML = '<span class="msi" aria-hidden="true">play_arrow</span> Abspielen';
      playRow.appendChild(playBtn); host.appendChild(playRow);

      var refIt = refItems(), userIt = userItems(), csc = cs / BOX;
      var lc = left.cv.getContext('2d'), rc = right.cv.getContext('2d');
      function showStatic() { paint(lc, csc, refIt); paint(rc, csc, userIt); }
      showStatic();
      // Beide Seiten Strich für Strich animieren (links korrekte Reihenfolge, rechts die eigene).
      var playing = false;
      function animateSide(c, items, doneCb) {
        var i = 0;
        (function one() {
          if (i >= items.length) { if (doneCb) doneCb(); return; }
          var steps = 14, t = 0;
          var timer = setInterval(function () {
            t++; paint(c, csc, items, i, t / steps);
            if (t >= steps) { clearInterval(timer); i++; setTimeout(one, 140); }
          }, 22);
        })();
      }
      playBtn.addEventListener('click', function () {
        if (playing) return; playing = true;
        var pending = 2, fin = function () { if (--pending <= 0) playing = false; };
        animateSide(lc, refIt, fin); animateSide(rc, userIt, fin);
      });
    }

    redraw();
    return { clear: clear, toggleGuide: toggleGuide, play: play, strokeCount: strokes.length,
      isComplete: function () { return idx >= strokes.length; }, mistakeCount: function () { return mistakes; },
      attempts: function () { return log.slice(); }, showComparison: showComparison };
  }

  /* ---------- Seiten-Logik (schreiben.html) ---------- */
  function initPage() {
    var root = document.getElementById('kw-root'); if (!root) return;
    var charEl = document.getElementById('kw-char'), meanEl = document.getElementById('kw-meaning'),
      stage = document.getElementById('kw-stage'), prog = document.getElementById('kw-prog'),
      msg = document.getElementById('kw-msg');
    var session = buildSession();
    var pos = 0, widget = null;
    // Einzel-Kanji-Modus (Deep-Link ?kanji=X): „Geschafft" führt zurück zur Kanji-Übersicht.
    var single = (function () { try { return !!new URLSearchParams(location.search).get('kanji'); } catch (e) { return false; } })();

    function buildSession() {
      // Deep-Link aus einer Kanji-Karte: ?kanji=X → gezielt genau dieses Zeichen schreiben.
      var param = null;
      try { param = new URLSearchParams(location.search).get('kanji'); } catch (e) {}
      if (param) {
        var one = (window.KANJI || []).filter(function (x) { return x.k === param; });
        if (one.length) return one;
      }
      if (window.SRS) {
        var q = window.SRS.buildQueue({ sources: ['kanji'], newLimit: 8, reviewLimit: 12 });
        if (q.length) return q.map(function (x) { return x.data; });
      }
      return (window.KANJI || []).slice();
    }
    function setMsg(t) { if (msg) msg.textContent = t || ''; }

    function load() {
      if (pos >= session.length) {
        stage.innerHTML = '<div class="tr-done-in">🌸 Geschafft! ' + session.length + ' Kanji geübt.</div>' +
          '<a class="btn-primary" href="kanji.html" style="margin-top:1rem"><span class="msi" aria-hidden="true">grid_view</span> Zur Kanji-Übersicht</a>';
        if (charEl) charEl.textContent = ''; if (meanEl) meanEl.textContent = '';
        if (prog) prog.textContent = ''; return;
      }
      var k = session[pos];
      if (charEl) charEl.textContent = k.k; if (meanEl) meanEl.textContent = k.meaning || '';
      if (prog) prog.textContent = 'Kanji ' + (pos + 1) + ' / ' + session.length;
      setMsg(''); clearCompare();
      var kid = 'k:' + k.k;
      // Snap/Vorlage rein aus dem 0–100-Lernstand: <30 Snap+Vorlage, 30–59 nur Vorlage, ≥60 freihändig.
      var score = (window.SRS && window.SRS.scoreOf) ? window.SRS.scoreOf(kid) : 0;
      var m = writeMode(score);
      fetch('assets/kanjivg/' + cpFile(k.k)).then(function (r) { return r.text(); }).then(function (svg) {
        widget = create(stage, { svgText: svg, size: Math.min(320, root.clientWidth - 40), snap: m.snap, guide: m.guide,
          onProgress: function (i, n) { setMsg('Strich ' + i + ' / ' + n); },
          onMistake: function (strokeNo) { setMsg('✗ Strich ' + strokeNo + ' passt nicht — nochmal'); },
          onComplete: function (clean) {
            if (clean) { setMsg('✓ Sauber geschrieben!'); if (window.SRS && window.SRS.grade) window.SRS.grade(kid, 1); }
            // Nur eine fehlerfreie Schreibung zählt als Fortschritt; sonst Fehler-Vergleich zeigen.
            else { setMsg('✗ Mit Fehlern — schau dir den Vergleich an. „Nochmal" für einen neuen Versuch.'); showCompare(widget); } } });
        if (!m.guide) setMsg('Freihändig — ohne Vorlage, aus dem Gedächtnis.');
      }).catch(function () { stage.innerHTML = '<p>SVG konnte nicht geladen werden.</p>'; });
    }
    // Fehler-Vergleich unter die Schreibfläche rendern bzw. leeren.
    function compareHost() {
      var h = document.getElementById('kw-compare-host');
      if (!h && stage && stage.parentNode) { h = document.createElement('div'); h.id = 'kw-compare-host'; stage.parentNode.insertBefore(h, stage.nextSibling); }
      return h;
    }
    function showCompare(w) { var h = compareHost(); if (h && w && w.showComparison) w.showComparison(h); }
    function clearCompare() { var h = document.getElementById('kw-compare-host'); if (h) h.innerHTML = ''; }
    // „Geschafft": nur Navigation (die Bewertung passiert beim sauberen Schreiben).
    function done() {
      if (single) { location.href = 'kanji.html'; return; }
      pos++; load();
    }

    bind('kw-guide', function () { if (widget) { var on = widget.toggleGuide(); setMsg(on ? 'Vorlage an' : 'Vorlage aus'); } });
    bind('kw-play', function () { if (widget) widget.play(); });
    bind('kw-clear', function () { if (widget) widget.clear(); clearCompare(); });
    bind('kw-again', function () { setMsg(''); clearCompare(); load(); }); // Nochmal: dasselbe Kanji neu starten
    bind('kw-good', function () { done(); });               // Geschafft: nur weiter / zurück (Bewertung beim Schreiben)
    function bind(id, fn) { var e = document.getElementById(id); if (e) e.addEventListener('click', fn); }

    load();
  }

  window.KanjiWrite = { parseStrokes: parseStrokes, cpFile: cpFile, create: create, initPage: initPage, strokeMatches: strokeMatches, writeMode: writeMode };
})();

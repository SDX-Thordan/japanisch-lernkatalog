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
  var HIT = 24;             // Toleranz (in BOX-Einheiten) für Start/Endpunkt

  function cpFile(k) { return k.codePointAt(0).toString(16).padStart(5, '0') + '.svg'; }

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

  // Prüft, ob der gezeichnete Strich grob zum erwarteten passt (Start/Ende/Richtung).
  function strokeMatches(userPts, info) {
    if (!info || userPts.length < 2) return true; // ohne Geometrie: nachsichtig
    var us = userPts[0], ue = userPts[userPts.length - 1];
    if (dist(us, info.start) > HIT || dist(ue, info.end) > HIT) return false;
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
    function startDraw(ev) { ev.preventDefault(); drawing = true; cur = [toBox(ev)]; }
    function moveDraw(ev) { if (!drawing) return; ev.preventDefault(); cur.push(toBox(ev)); redraw(); }
    function endDraw() {
      if (!drawing) return; drawing = false;
      var ok = strokeMatches(cur, infos[idx]);
      if (ok) { done.push(cur.slice()); idx++; if (opts.onProgress) opts.onProgress(idx, strokes.length); }
      cur = []; redraw();
      if (ok && idx >= strokes.length && opts.onComplete) opts.onComplete();
    }
    canvas.addEventListener('pointerdown', startDraw);
    canvas.addEventListener('pointermove', moveDraw);
    window.addEventListener('pointerup', endDraw);
    canvas.addEventListener('touchstart', startDraw, { passive: false });
    canvas.addEventListener('touchmove', moveDraw, { passive: false });
    canvas.addEventListener('touchend', endDraw);

    function clear() { done = []; cur = []; idx = 0; redraw(); if (opts.onProgress) opts.onProgress(0, strokes.length); }
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

    redraw();
    return { clear: clear, toggleGuide: toggleGuide, play: play, strokeCount: strokes.length,
      isComplete: function () { return idx >= strokes.length; } };
  }

  /* ---------- Seiten-Logik (schreiben.html) ---------- */
  function initPage() {
    var root = document.getElementById('kw-root'); if (!root) return;
    var charEl = document.getElementById('kw-char'), meanEl = document.getElementById('kw-meaning'),
      stage = document.getElementById('kw-stage'), prog = document.getElementById('kw-prog'),
      msg = document.getElementById('kw-msg');
    var session = buildSession();
    var pos = 0, widget = null;

    function buildSession() {
      if (window.SRS) {
        var q = window.SRS.buildQueue({ sources: ['kanji'], newLimit: 8, reviewLimit: 12 });
        if (q.length) return q.map(function (x) { return x.data; });
      }
      return (window.KANJI || []).slice();
    }
    function setMsg(t) { if (msg) msg.textContent = t || ''; }

    function load() {
      if (pos >= session.length) {
        stage.innerHTML = '<div class="tr-done-in">🎉 Geschafft! ' + session.length + ' Kanji geübt.</div>';
        if (charEl) charEl.textContent = ''; if (meanEl) meanEl.textContent = '';
        if (prog) prog.textContent = ''; return;
      }
      var k = session[pos];
      if (charEl) charEl.textContent = k.k; if (meanEl) meanEl.textContent = k.meaning || '';
      if (prog) prog.textContent = 'Kanji ' + (pos + 1) + ' / ' + session.length;
      setMsg('');
      fetch('assets/kanjivg/' + cpFile(k.k)).then(function (r) { return r.text(); }).then(function (svg) {
        widget = create(stage, { svgText: svg, size: Math.min(320, root.clientWidth - 40),
          onProgress: function (i, n) { setMsg('Strich ' + i + ' / ' + n); },
          onComplete: function () { setMsg('✓ Alle Striche geschrieben!');
            if (window.SRS && window.SRS.gradeWrite) window.SRS.gradeWrite('k:' + k.k, true); } });
      }).catch(function () { stage.innerHTML = '<p>SVG konnte nicht geladen werden.</p>'; });
    }
    function grade(g) {
      var k = session[pos];
      if (window.SRS && k) window.SRS.grade('k:' + k.k, g);
      pos++; load();
    }

    bind('kw-guide', function () { if (widget) { var on = widget.toggleGuide(); setMsg(on ? 'Vorlage an' : 'Vorlage aus'); } });
    bind('kw-play', function () { if (widget) widget.play(); });
    bind('kw-clear', function () { if (widget) widget.clear(); });
    bind('kw-again', function () { grade(0); });
    bind('kw-good', function () { grade(1); });
    function bind(id, fn) { var e = document.getElementById(id); if (e) e.addEventListener('click', fn); }

    load();
  }

  window.KanjiWrite = { parseStrokes: parseStrokes, cpFile: cpFile, create: create, initPage: initPage };
})();

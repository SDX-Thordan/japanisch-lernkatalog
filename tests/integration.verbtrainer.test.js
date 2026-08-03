// Verbformen-Trainer, Seite + Endlos-Overlay: Auswahl, Freischaltung, Wertung, Endlosigkeit.
import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadScripts, repoPath } from './helpers/load.js';

function fakeStorage() {
  const d = {};
  return { getItem: (k) => (k in d ? d[k] : null), setItem: (k, v) => { d[k] = String(v); }, removeItem: (k) => { delete d[k]; } };
}

const BODY = '<!DOCTYPE html><html><body data-page="verbtrainer"><div id="vt-root"></div></body></html>';
const DATA = ['assets/data/vokabular.js', 'assets/data/grammatik.js', 'assets/srs.js', 'assets/exercises.js'];

let win, doc, APP = null;
// app.js erst NACH dem Freischalten/Anlegen auswerten — initVerbtrainer rendert beim Laden.
function page(setup) {
  // Echte Herkunft, damit localStorage (und damit die gemerkte Auswahl) wie in der App funktioniert.
  win = loadScripts(DATA, { html: BODY, url: 'https://katalog.test/verbtrainer.html' });
  win.SRS._useStorage(fakeStorage());
  if (setup) setup(win);
  const s = win.document.createElement('script');
  s.textContent = (APP = APP || readFileSync(repoPath('assets/app.js'), 'utf8'));
  win.document.head.appendChild(s);
  if (win.document.readyState === 'loading') win.document.dispatchEvent(new win.Event('DOMContentLoaded'));
  doc = win.document;
  return win;
}

const click = (el) => el.dispatchEvent(new win.Event('click', { bubbles: true }));
const forms = () => [...doc.querySelectorAll('.vt-form')];
const formBtn = (f) => doc.querySelector('.vt-form[data-form="' + f + '"]');
const ov = () => doc.getElementById('verbtrainer-overlay');
const prog = () => ov().querySelector('.vt-prog').textContent;

/* Die Richtungszeile ist die verlässliche Auskunft darüber, welche Form gerade gefragt ist;
   der Prompt selbst ist Ruby-Markup und taugt nicht zum Rückschluss. Mit Math.random()===0
   steht das Verb fest (pool[0]), also lässt sich die Lösung sauber berechnen. */
function current() {
  const L = win.Katalog.VT_LABEL;
  const parts = ov().querySelector('.vt-dir').textContent.split('→');
  const key = (label) => Object.keys(L).find((f) => L[f] === label.trim());
  const to = key(parts[1]);
  return { from: key(parts[0]), to, sol: win.Katalog.vtVerbs('all')[0].kana[to] };
}
// Die aktuelle Aufgabe richtig bzw. falsch beantworten — egal ob Tippen oder Multiple Choice.
function answer(correct) {
  const box = ov().querySelector('.vt-ex');
  const sol = current().sol;
  const opts = [...box.querySelectorAll('.ex-opt')];
  if (opts.length) {
    const hit = opts.find((o) => o.textContent === sol);
    click(correct ? hit : opts.find((o) => o.textContent !== sol));
    return;
  }
  box.querySelector('.ex-input').value = correct ? sol : 'zzz';
  click(box.querySelector('.ex-check'));
}
function step(correct) { answer(correct); click(ov().querySelector('.vt-next')); }

describe('Auswahlseite', () => {
  beforeEach(() => { page((w) => w.SRS.unlockAll()); });

  it('rendert Quellen-Chips und alle zehn Formen', () => {
    expect(doc.querySelector('.vt-src[data-src="all"]')).toBeTruthy();
    expect(forms()).toHaveLength(10);
    expect(doc.querySelector('.vt-go')).toBeTruthy();
  });

  it('Formen lassen sich an- und abwählen und werden gespeichert', () => {
    const te = formBtn('te');
    expect(te.classList.contains('sel')).toBe(false);
    click(te);
    expect(formBtn('te').classList.contains('sel')).toBe(true);
    expect(formBtn('te').getAttribute('aria-pressed')).toBe('true');
    expect(win.Katalog.lsGet('katalog_vt_forms').split(',')).toContain('te');
    click(formBtn('te'));
    expect(formBtn('te').classList.contains('sel')).toBe(false);
  });

  it('die letzte verbleibende Form lässt sich nicht abwählen', () => {
    click(formBtn('dict')); // Standard ist masu+dict → bleibt masu
    const on = forms().filter((b) => b.classList.contains('sel'));
    expect(on).toHaveLength(1);
    click(on[0]);
    expect(forms().filter((b) => b.classList.contains('sel'))).toHaveLength(1);
  });

  it('Lernlisten erscheinen als Quelle; eine Liste ohne Verben ist gesperrt', () => {
    const K = win.Katalog;
    const verb = win.VOKABULAR.find((v) => /^V\./.test(v.pos) && K.verbGroup(v.pos) > 0 && K.allForms(v.kana, K.verbGroup(v.pos)));
    const noun = win.VOKABULAR.find((v) => !/^V\./.test(v.pos));
    const a = win.SRS.createList('Meine Verben');
    win.SRS.addToList(a.id, [win.SRS.srsId('vocab', verb)]);
    const b = win.SRS.createList('Nur Nomen');
    win.SRS.addToList(b.id, [win.SRS.srsId('vocab', noun)]);
    click(formBtn('te')); // löst draw() aus
    const ca = doc.querySelector('.vt-src[data-src="' + a.id + '"]');
    const cb = doc.querySelector('.vt-src[data-src="' + b.id + '"]');
    expect(ca.textContent).toContain('(1)');
    expect(ca.disabled).toBe(false);
    expect(cb.textContent).toContain('(0)');
    expect(cb.disabled).toBe(true);
  });

  it('bei genau einer Form nennt die Zusammenfassung die Gegenform', () => {
    click(formBtn('dict')); // nur noch masu
    expect(doc.querySelector('.vt-sum').textContent).toContain('Wörterbuchform');
    click(formBtn('te'));
    expect(doc.querySelector('.vt-sum').textContent).toContain('2 Richtungen');
  });
});

describe('Freischaltung', () => {
  it('ohne Lernpfad-Fortschritt sind genau て/た/ない/辞書形 gesperrt', () => {
    page();
    const locked = forms().filter((b) => b.disabled).map((b) => b.dataset.form);
    expect(locked.sort()).toEqual(['dict', 'nai', 'ta', 'te']);
    expect(formBtn('te').title).toContain('Lektion 14');
    expect(formBtn('masu').disabled).toBe(false);
  });

  it('nach unlockAll ist keine Form mehr gesperrt', () => {
    page((w) => w.SRS.unlockAll());
    expect(forms().filter((b) => b.disabled)).toHaveLength(0);
  });
});

describe('Endlos-Trainer', () => {
  beforeEach(() => {
    page((w) => w.SRS.unlockAll());
    win.Math.random = () => 0; // festes Verb + feste Richtung → die Lösung ist berechenbar
    click(formBtn('te')); // masu + dict + te
    click(doc.querySelector('.vt-go'));
  });

  it('öffnet das Overlay mit laufendem Zähler und beiden Formnamen', () => {
    expect(ov().hidden).toBe(false);
    expect(prog()).toContain('Aufgabe 1 · 0 richtig');
    const dir = ov().querySelector('.vt-dir').textContent;
    expect(dir).toContain('→');
    expect(dir.split('→')[0].trim()).not.toBe(dir.split('→')[1].trim());
  });

  it('richtige Eingabe wertet NUR die Form, nicht die Vokabel', () => {
    const info = current();
    answer(true);
    expect(ov().querySelector('.ex-feedback').classList.contains('ok')).toBe(true);
    const pat = win.Exercises.formPattern(info.to);
    expect(win.SRS.scoreOf('g:' + pat)).toBeGreaterThan(0);
    // keine einzige Vokabel-ID hat einen Lernstand bekommen
    const vocabScored = win.VOKABULAR.filter((v) => win.SRS.scoreOf('v:' + v.kana + '|' + v.lesson) > 0);
    expect(vocabScored).toHaveLength(0);
  });

  it('läuft endlos: nach 12 Aufgaben gibt es keinen Fertig-Screen', () => {
    for (let i = 0; i < 12; i++) step(true);
    expect(prog()).toContain('Aufgabe 13');
    expect(prog()).toContain('12 richtig');
    expect(ov().querySelector('.lt-done')).toBe(null);
    expect(ov().hidden).toBe(false);
  });

  it('zweimal falsch auf derselben Form → Multiple Choice, danach wieder Tippen', () => {
    // gezielt auf eine Zielform steuern: nur eine Form wählen, dann ist to konstant.
    click(ov().querySelector('.lt-close'));
    click(formBtn('masu')); click(formBtn('dict')); // nur noch te
    click(doc.querySelector('.vt-go'));
    expect(ov().querySelector('.vt-ex .ex-input')).toBeTruthy(); // erste Aufgabe: Tippen
    let mcSeen = false;
    for (let i = 0; i < 8 && !mcSeen; i++) {
      step(false);
      mcSeen = !!ov().querySelector('.vt-ex .ex-opt');
    }
    expect(mcSeen).toBe(true);
    step(true); // eine richtige Antwort setzt den Zähler zurück
    expect(ov().querySelector('.vt-ex .ex-input')).toBeTruthy();
  });

  it('↻ setzt den Zähler zurück, ✕ und erneutes Starten setzt fort', () => {
    win.confirm = () => true;
    for (let i = 0; i < 3; i++) step(true);
    expect(prog()).toContain('Aufgabe 4');
    click(ov().querySelector('.lt-close'));
    expect(ov().hidden).toBe(true);
    click(doc.querySelector('.vt-go'));
    expect(prog()).toContain('Aufgabe 4');
    expect(prog()).toContain('fortgesetzt');
    click(ov().querySelector('.ov-restart'));
    expect(prog()).toContain('Aufgabe 1 · 0 richtig');
  });

  it('ein Tipp neben die Fläche bricht nicht ab; Escape schließt', () => {
    ov().dispatchEvent(new win.Event('click', { bubbles: true }));
    expect(ov().hidden).toBe(false);
    doc.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(ov().hidden).toBe(true);
  });
});

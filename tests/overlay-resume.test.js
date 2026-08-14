// Übungs-Overlays: Ein Tipp neben die Fläche darf die Runde NICHT mehr abbrechen; wer bewusst
// schließt (✕/Escape), setzt beim nächsten Öffnen an derselben Stelle fort.
import { describe, it, expect, beforeEach } from 'vitest';
import { loadScripts } from './helpers/load.js';

function fakeStorage() {
  const d = {};
  return { getItem: (k) => (k in d ? d[k] : null), setItem: (k, v) => { d[k] = String(v); }, removeItem: (k) => { delete d[k]; } };
}

const DATA = [
  'assets/data/kanji.js', 'assets/data/vokabular.js', 'assets/data/vokabular_beispiele.js',
  'assets/data/vokabular_tags.js', 'assets/data/grammatik.js', 'assets/data/grammatik_extra.js',
  'assets/data/grammatik_furigana.js', 'assets/data/grammatik_plus.js', 'assets/data/saetze.js',
  'assets/srs.js', 'assets/exercises.js', 'assets/app.js',
];

const LISTEN_BODY = `<!DOCTYPE html><html><body data-page="listen">
  <input id="lst-create-name"><button id="lst-create"></button>
  <button id="lst-import"></button><input type="file" id="lst-import-file" hidden>
  <p id="lst-msg"></p><div id="lst-root"></div>
</body></html>`;

const GRAMMAR_BODY = '<!DOCTYPE html><html><body data-page="grammatik"><div id="filters"></div><input id="search-input"><div id="content"></div></body></html>';

const LERNPFAD_BODY = `<!DOCTYPE html><html><body data-page="lernpfad">
  <div id="lp-root"></div><button id="lp-unlockall"></button>
</body></html>`;

function page(html, opts) {
  const win = loadScripts(DATA, Object.assign({ html }, opts || {}));
  win.SRS._useStorage(fakeStorage());
  win.Math.random = () => 0;
  win.confirm = () => true;
  if (win.document.readyState === 'loading') win.document.dispatchEvent(new win.Event('DOMContentLoaded'));
  return win;
}
const click = (win, el) => el.dispatchEvent(new win.Event('click', { bubbles: true }));
const esc = (win) => win.document.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
// Backdrop: Klick, dessen Ziel das Overlay selbst ist (genau die entfernte Bedingung).
const backdrop = (win, ov) => ov.dispatchEvent(new win.Event('click', { bubbles: true }));
// Erste Antwortmöglichkeit der aktuellen Aufgabe anklicken (MC oder Tippen).
function answer(win, ov) {
  const opt = ov.querySelector('.ex-opt');
  if (opt) { click(win, opt); return; }
  const inp = ov.querySelector('.ex-input');
  if (inp) { inp.value = 'x'; click(win, ov.querySelector('.ex-check')); }
}

function listWithItems(win, n) {
  const l = win.SRS.createList('Trainingsliste');
  win.SRS.addToList(l.id, win.VOKABULAR.slice(0, n).map((v) => win.SRS.srsId('vocab', v)));
  win.document.getElementById('lst-create-name').value = 'x';
  click(win, win.document.getElementById('lst-create')); // draw()
  return l;
}

describe('Listen-Trainer: Tipp daneben bricht nicht ab', () => {
  let win, ov;
  beforeEach(() => {
    win = page(LISTEN_BODY);
    listWithItems(win, 3);
    click(win, win.document.querySelector('.lst-train'));
    ov = win.document.getElementById('trainer-overlay');
  });

  it('Klick auf den Hintergrund lässt die Übung offen', () => {
    expect(ov.hidden).toBe(false);
    backdrop(win, ov);
    expect(ov.hidden).toBe(false);
  });

  it('✕ und Escape schließen weiterhin', () => {
    click(win, ov.querySelector('.lt-close'));
    expect(ov.hidden).toBe(true);
    ov.hidden = false;
    esc(win);
    expect(ov.hidden).toBe(true);
  });
});

describe('Listen-Trainer: Runde fortsetzen', () => {
  let win, l, ov;
  beforeEach(() => {
    win = page(LISTEN_BODY);
    l = listWithItems(win, 3);
    click(win, win.document.querySelector('.lst-train'));
    ov = win.document.getElementById('trainer-overlay');
  });

  it('nach ✕ geht es an derselben Stelle weiter — mit Hinweis', () => {
    expect(ov.querySelector('.lt-prog').textContent).toContain('Aufgabe 1 / 3');
    answer(win, ov);
    click(win, ov.querySelector('.lt-next')); // Aufgabe 2
    expect(ov.querySelector('.lt-prog').textContent).toContain('Aufgabe 2 / 3');
    const rest = win.Katalog.sessGet('trainer:' + l.id).ids.slice();

    click(win, ov.querySelector('.lt-close'));
    click(win, win.document.querySelector('.lst-train')); // erneut öffnen
    expect(ov.querySelector('.lt-prog').textContent).toContain('Aufgabe 2 / 3');
    expect(ov.querySelector('.lt-prog').textContent).toContain('fortgesetzt');
    expect(win.Katalog.sessGet('trainer:' + l.id).ids).toEqual(rest); // dasselbe Restdeck
  });

  it('eine schon beantwortete Aufgabe wird beim Fortsetzen übersprungen (keine Doppelwertung)', () => {
    answer(win, ov); // beantwortet, „Weiter" NICHT gedrückt
    click(win, ov.querySelector('.lt-close'));
    click(win, win.document.querySelector('.lst-train'));
    expect(ov.querySelector('.lt-prog').textContent).toContain('Aufgabe 2 / 3');
  });

  it('↻ startet die Runde neu', () => {
    answer(win, ov);
    click(win, ov.querySelector('.lt-next'));
    expect(ov.querySelector('.lt-prog').textContent).toContain('Aufgabe 2 / 3');
    click(win, ov.querySelector('.ov-restart'));
    expect(ov.querySelector('.lt-prog').textContent).toContain('Aufgabe 1 / 3');
    expect(win.Katalog.sessGet('trainer:' + l.id).done).toBe(0);
  });

  it('inzwischen entfernte Einträge fallen beim Fortsetzen still weg', () => {
    answer(win, ov);
    click(win, ov.querySelector('.lt-next'));
    click(win, ov.querySelector('.lt-close'));
    // Gezielt einen NOCH OFFENEN Eintrag entfernen — welcher das ist, hängt an der Mischung,
    // deshalb aus dem Restdeck der Sitzung nehmen statt einen festen Index zu raten.
    const rest = win.Katalog.sessGet('trainer:' + l.id).ids;
    win.SRS.removeFromList(l.id, [rest[rest.length - 1]]);
    click(win, win.document.querySelector('.lst-train'));
    expect(ov.hidden).toBe(false);
    expect(ov.querySelector('.lt-prog').textContent).toMatch(/Aufgabe \d+ \/ 2/);
  });

  it('am Rundenende ist nichts mehr zu übernehmen', () => {
    for (let i = 0; i < 3; i++) { answer(win, ov); click(win, ov.querySelector('.lt-next')); }
    expect(ov.querySelector('.lt-done').classList.contains('hidden')).toBe(false);
    expect(win.Katalog.sessGet('trainer:' + l.id)).toBe(null);
  });
});

describe('Grammatik-Drill und Listen-Picker', () => {
  let win;
  beforeEach(() => { win = page(GRAMMAR_BODY); });

  it('Drill: Hintergrund schließt nicht, ✕ schon; danach wird fortgesetzt', () => {
    click(win, win.document.querySelector('.gp-ueben'));
    const ov = win.document.getElementById('drill-overlay');
    expect(ov.hidden).toBe(false);
    backdrop(win, ov);
    expect(ov.hidden).toBe(false);
    const prog = ov.querySelector('.drill-prog').textContent;
    click(win, ov.querySelector('.drill-close'));
    expect(ov.hidden).toBe(true);
    click(win, win.document.querySelector('.gp-ueben'));
    expect(ov.querySelector('.drill-prog').textContent).toContain(prog.split('·')[0].trim());
  });

  it('der Listen-Picker schließt weiterhin per Hintergrund-Klick', () => {
    click(win, win.document.querySelector('.gp-add'));
    const pick = win.document.querySelector('.pick-overlay');
    expect(pick.hidden).toBe(false);
    backdrop(win, pick);
    expect(pick.hidden).toBe(true);
  });
});

describe('Lektionstest: Zwischenergebnis überlebt den Abbruch', () => {
  let win;
  beforeEach(() => {
    win = page(LERNPFAD_BODY);
    win.SRS.unlockAll();
    win.SRS.markLessonLearned(1); // Test freischalten
    click(win, win.document.getElementById('lp-unlockall'));
  });

  function openTest(win) {
    const btn = win.document.querySelector('.lp-test-btn');
    click(win, btn);
    return win.document.querySelector('.lp-overlay');
  }

  it('Hintergrund-Klick bricht den Test nicht ab', () => {
    const ov = openTest(win);
    expect(ov.hidden).toBe(false);
    backdrop(win, ov);
    expect(ov.hidden).toBe(false);
  });

  it('nach Abbruch: gleiche Fragen, Fortschritt erhalten, keine Wertung', () => {
    const ov = openTest(win);
    const qsBefore = win.Katalog.sessGet('lessontest:1').qs;
    answer(win, ov);
    click(win, ov.querySelector('.lp-q-next button'));
    const prog = ov.querySelector('.lp-modal-prog').textContent;
    click(win, ov.querySelector('.lp-close'));
    // abgebrochener Test wertet nichts
    expect(win.SRS.lessonState(1).testPassed).toBe(false);
    // Karte kündigt das Fortsetzen an
    expect(win.document.querySelector('.lp-test-btn').textContent).toBe('Test fortsetzen');
    openTest(win);
    expect(ov.querySelector('.lp-modal-prog').textContent).toContain(prog.trim());
    expect(win.Katalog.sessGet('lessontest:1').qs).toEqual(qsBefore); // dieselben Fragen
  });

  it('Punkt zählt auch, wenn direkt nach der Antwort geschlossen wird', () => {
    const ov = openTest(win);
    answer(win, ov); // beantwortet, „Weiter" nicht gedrückt
    const s = win.Katalog.sessGet('lessontest:1');
    expect(s.i).toBe(1); // Frage gilt als erledigt
    click(win, ov.querySelector('.lp-close'));
    openTest(win);
    expect(ov.querySelector('.lp-modal-prog').textContent).toContain('Frage 2');
  });
});

describe('Sitzungs-Speicher', () => {
  it('nutzt sessionStorage, wenn eine Herkunft vorhanden ist', () => {
    const win = page(LISTEN_BODY, { url: 'https://katalog.test/listen.html' });
    const l = listWithItems(win, 2);
    click(win, win.document.querySelector('.lst-train'));
    const raw = win.sessionStorage.getItem('katalog_session_v1');
    expect(JSON.parse(raw)['trainer:' + l.id].ids).toHaveLength(2);
  });

  it('läuft ohne Herkunft (kein sessionStorage) über den Arbeitsspeicher weiter', () => {
    const win = page(LISTEN_BODY); // jsdom-Standard: sessionStorage wirft
    const l = listWithItems(win, 2);
    click(win, win.document.querySelector('.lst-train'));
    expect(win.Katalog.sessGet('trainer:' + l.id).ids).toHaveLength(2);
  });
});

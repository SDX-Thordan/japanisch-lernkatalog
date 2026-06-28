// Integrationstest: Listen-Seite — anlegen, Items zeigen/entfernen, Trainer öffnen + Richtung.
import { describe, it, expect, beforeEach } from 'vitest';
import { loadScripts } from './helpers/load.js';

function fakeStorage() {
  const d = {};
  return { getItem: (k) => (k in d ? d[k] : null), setItem: (k, v) => { d[k] = String(v); }, removeItem: (k) => { delete d[k]; } };
}

const BODY = `<!DOCTYPE html><html><body data-page="listen">
  <input id="lst-create-name"><button id="lst-create"></button>
  <div id="lst-root"></div>
</body></html>`;

let win;
beforeEach(() => {
  win = loadScripts([
    'assets/data/kanji.js', 'assets/data/vokabular.js', 'assets/data/vokabular_beispiele.js',
    'assets/data/vokabular_tags.js', 'assets/data/grammatik.js', 'assets/data/grammatik_extra.js',
    'assets/data/grammatik_furigana.js', 'assets/data/grammatik_plus.js', 'assets/data/saetze.js',
    'assets/srs.js', 'assets/exercises.js', 'assets/app.js',
  ], { html: BODY });
  win.SRS._useStorage(fakeStorage());
  win.Math.random = () => 0; // deterministisch
  win.prompt = () => 'Umbenannt';
  win.confirm = () => true;
});
function click(e) { e.dispatchEvent(new win.Event('click', { bubbles: true })); }

describe('Listen-Seite', () => {
  it('legt über den Button eine Liste an und zeigt sie', () => {
    win.document.getElementById('lst-create-name').value = 'Meine Liste';
    click(win.document.getElementById('lst-create'));
    expect(win.SRS.lists().length).toBe(1);
    expect(win.document.querySelector('.lst-name').textContent).toBe('Meine Liste');
  });

  it('Trainer öffnet und rendert eine Übung aus der zentralen Registry', () => {
    const l = win.SRS.createList('Trainingsliste');
    win.SRS.addToList(l.id, win.VOKABULAR.slice(0, 3).map((v) => win.SRS.srsId('vocab', v)));
    win.document.getElementById('lst-create-name').value = 'x';
    click(win.document.getElementById('lst-create')); // triggert draw()
    const train = win.document.querySelector('.lst-train');
    expect(train).toBeTruthy();
    click(train);
    const ov = win.document.querySelector('.lt-overlay');
    expect(ov && !ov.hidden).toBe(true);
    // Statt Karteikarte+Richtung wird eine generierte Übung gerendert (z. B. MC/Tippen).
    expect(ov.querySelector('.lt-ex')).toBeTruthy();
    expect(ov.querySelector('.ex-opt') || ov.querySelector('.ex-input')).toBeTruthy();
    // Beantworten → „Weiter" erscheint und rückt vor.
    const opt = ov.querySelector('.ex-opt'); if (opt) click(opt);
    else { ov.querySelector('.ex-input').value = 'x'; click(ov.querySelector('.ex-check')); }
    expect(ov.querySelector('.lt-next')).toBeTruthy();
  });

  it('gemischte Liste (Vokabel + Kanji): Trainer rendert je Eintrag eine Übung', () => {
    const l = win.SRS.createList('Mix');
    win.SRS.addToList(l.id, [win.SRS.srsId('vocab', win.VOKABULAR[0]), win.SRS.srsId('kanji', win.KANJI[0])]);
    win.document.getElementById('lst-create-name').value = 'x';
    click(win.document.getElementById('lst-create'));
    expect(win.document.querySelector('.lst-count').textContent).toContain('2 Einträge');
    click(win.document.querySelector('.lst-train'));
    const ov = win.document.querySelector('.lt-overlay');
    expect(ov.querySelector('.lt-ex')).toBeTruthy(); // Übungsfläche vorhanden
  });

  it('Listen-Wörter: Klick auf die Zeile klappt die erweiterte Bedeutung auf', () => {
    const l = win.SRS.createList('Beispiel-Liste');
    win.SRS.addToList(l.id, win.VOKABULAR.slice(0, 5).map((v) => win.SRS.srsId('vocab', v)));
    win.document.getElementById('lst-create-name').value = 'x';
    click(win.document.getElementById('lst-create')); // draw()
    // „Wörter"-Box öffnen → buildItems rendert die Zeilen.
    click(win.document.querySelector('.lst-show'));
    const row = win.document.querySelector('.lst-item[data-ext]');
    expect(row).toBeTruthy();
    expect(row.querySelector('.lst-de').textContent.trim().length).toBeGreaterThan(0); // einfache Übersetzung sichtbar
    expect(row.querySelector('.v-ext')).toBeTruthy();
    expect(row.classList.contains('expanded')).toBe(false);
    click(row);
    expect(row.classList.contains('expanded')).toBe(true);
    // Klick auf den Entfernen-Button klappt NICHT auf (sondern entfernt).
  });
});

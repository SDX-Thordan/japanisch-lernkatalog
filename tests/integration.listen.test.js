// Integrationstest: Listen-Seite — anlegen, Items zeigen/entfernen, Trainer öffnen + Richtung.
import { describe, it, expect, beforeEach } from 'vitest';
import { loadScripts } from './helpers/load.js';

function fakeStorage() {
  const d = {};
  return { getItem: (k) => (k in d ? d[k] : null), setItem: (k, v) => { d[k] = String(v); }, removeItem: (k) => { delete d[k]; } };
}

const BODY = `<!DOCTYPE html><html><body data-page="listen">
  <input id="lst-create-name"><button id="lst-create"></button>
  <button id="lst-import"></button><input type="file" id="lst-import-file" hidden>
  <p id="lst-msg"></p>
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

function tick() { return new Promise((r) => setTimeout(r, 0)); }

describe('Listen Export/Import (einzelne Liste)', () => {
  it('Export-Button vorhanden; exportListJSON liefert Name + IDs', () => {
    const l = win.SRS.createList('Reise');
    win.SRS.addToList(l.id, [win.SRS.srsId('vocab', win.VOKABULAR[0]), 'k:' + win.KANJI[0].k]);
    win.document.getElementById('lst-create-name').value = 'x'; // draw anstoßen? draw lief bei createList nicht
    // Seite neu zeichnen über den Anlege-Weg
    click(win.document.getElementById('lst-create'));
    expect(win.document.querySelector('.lst-export')).toBeTruthy();
    const parsed = JSON.parse(win.SRS.exportListJSON(l.id));
    expect(parsed).toMatchObject({ type: 'katalog_liste', v: 1, name: 'Reise' });
    expect(parsed.items).toHaveLength(2);
  });

  it('Import über die UI legt eine NEUE Liste an und meldet Übersprungenes', async () => {
    const json = JSON.stringify({ type: 'katalog_liste', v: 1, name: 'Geteilt',
      items: [win.SRS.srsId('vocab', win.VOKABULAR[0]), 'v:gibtsnicht|9', 'k:' + win.KANJI[0].k] });
    const file = win.document.getElementById('lst-import-file');
    Object.defineProperty(file, 'files', { value: [new win.Blob([json], { type: 'application/json' })], configurable: true });
    file.dispatchEvent(new win.Event('change'));
    await tick(); await tick();
    const l = win.SRS.lists().find((x) => x.name === 'Geteilt');
    expect(l.items).toHaveLength(2); // unbekannte ID übersprungen
    expect(win.document.getElementById('lst-msg').textContent).toContain('2 Einträge');
    expect(win.document.getElementById('lst-msg').textContent).toContain('1 unbekannte');
    // Karte erscheint sofort
    expect([...win.document.querySelectorAll('.lst-name')].some((n) => n.textContent === 'Geteilt')).toBe(true);
  });

  it('ungültige Datei (z. B. Komplett-Sicherung) → Fehlermeldung, keine Liste', async () => {
    const file = win.document.getElementById('lst-import-file');
    Object.defineProperty(file, 'files', { value: [new win.Blob([win.SRS.exportJSON()], { type: 'application/json' })], configurable: true });
    file.dispatchEvent(new win.Event('change'));
    await tick(); await tick();
    expect(win.SRS.lists().length).toBe(0);
    expect(win.document.getElementById('lst-msg').textContent).toContain('✗');
  });

  it('Roundtrip: Export → Import ergibt dieselben Einträge (Lernstand bleibt unberührt)', () => {
    const l = win.SRS.createList('Original');
    const vid = win.SRS.srsId('vocab', win.VOKABULAR[0]);
    win.SRS.addToList(l.id, [vid, 'g:' + win.GRAMMATIK[0].pattern]);
    win.SRS.grade(vid, 1, '2026-07-20'); // Lernstand existiert
    const res = win.SRS.importListJSON(win.SRS.exportListJSON(l.id));
    expect(res.ok).toBe(true);
    expect(res.added).toBe(2); expect(res.skipped).toBe(0);
    expect(res.list.items).toEqual(win.SRS.lists()[0].items);
    expect(win.SRS.get(vid).score).toBe(20); // Import fasst Lernstände nicht an
  });
});

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

  it('Eintrag entfernen lässt die Einträge-Ansicht offen und aktualisiert den Zähler', () => {
    const l = win.SRS.createList('Entfern-Test');
    win.SRS.addToList(l.id, win.VOKABULAR.slice(0, 3).map((v) => win.SRS.srsId('vocab', v)));
    win.document.getElementById('lst-create-name').value = 'x';
    click(win.document.getElementById('lst-create'));
    const box = win.document.querySelector('.lst-items');
    click(win.document.querySelector('.lst-show')); // Ansicht öffnen
    expect(box.classList.contains('hidden')).toBe(false);
    expect(box.querySelectorAll('.lst-item').length).toBe(3);

    click(box.querySelector('.lst-item .lst-rm')); // erste Zeile entfernen
    // Ansicht bleibt offen, nur die Zeile verschwindet
    expect(box.classList.contains('hidden')).toBe(false);
    expect(box.querySelectorAll('.lst-item').length).toBe(2);
    // Zähler & Buttons aktualisiert, ohne Neuaufbau
    expect(win.document.querySelector('.lst-count').textContent).toContain('2 Einträge');
    expect(win.document.querySelector('.lst-show').textContent).toContain('(2)');
    expect(win.SRS.listItems(l.id).length).toBe(2);
  });
});

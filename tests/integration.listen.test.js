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
  win = loadScripts(['assets/data/vokabular.js', 'assets/srs.js', 'assets/app.js'], { html: BODY });
  win.SRS._useStorage(fakeStorage());
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

  it('Trainer öffnet sich und kann die Richtung umschalten', () => {
    const l = win.SRS.createList('Trainingsliste');
    win.SRS.addToList(l.id, win.VOKABULAR.slice(0, 3).map((v) => win.SRS.srsId('vocab', v)));
    // neu rendern: create-Button mit leerem Namen tut nichts → stattdessen ein zweites Mal initListen via Event
    win.document.getElementById('lst-create-name').value = 'x';
    click(win.document.getElementById('lst-create')); // triggert draw()
    const train = win.document.querySelector('.lst-train');
    expect(train).toBeTruthy();
    click(train);
    const ov = win.document.querySelector('.lt-overlay');
    expect(ov && !ov.hidden).toBe(true);
    const dirBtn = ov.querySelector('.lt-dir');
    const before = dirBtn.textContent;
    click(dirBtn);
    expect(dirBtn.textContent).not.toBe(before); // Richtung gewechselt
    // Aufdecken zeigt die Rückseite
    click(ov.querySelector('.lt-reveal'));
    expect(ov.querySelector('.lt-back').classList.contains('hidden')).toBe(false);
  });
});

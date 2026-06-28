// Persönliche Vokabellisten: anlegen, hinzufügen/entfernen, ganze Lektion, Export/Import.
import { describe, it, expect, beforeEach } from 'vitest';
import { loadWithData } from './helpers/load.js';

function fakeStorage() {
  const d = {};
  return {
    getItem: (k) => (k in d ? d[k] : null),
    setItem: (k, v) => { d[k] = String(v); },
    removeItem: (k) => { delete d[k]; },
  };
}

let win, SRS;
beforeEach(() => {
  win = loadWithData(['assets/app.js', 'assets/srs.js'], {
    html: '<!DOCTYPE html><html><body data-page="listen"></body></html>',
  });
  SRS = win.SRS;
  SRS._useStorage(fakeStorage());
});

const vid = (v) => SRS.srsId('vocab', v);

describe('Listen-Grundfunktionen', () => {
  it('anlegen, hinzufügen, auflösen, entfernen, löschen', () => {
    const l = SRS.createList('Reiseworte');
    expect(l.id).toBe('l1');
    const v0 = win.VOKABULAR[0], v1 = win.VOKABULAR[1];
    SRS.addToList(l.id, [vid(v0), vid(v1)]);
    SRS.addToList(l.id, [vid(v0)]); // doppelt → keine Dublette
    expect(SRS.listItems(l.id).length).toBe(2);
    expect(SRS.listItems(l.id).map((o) => o.data.kana)).toContain(v0.kana);

    SRS.removeFromList(l.id, [vid(v0)]);
    expect(SRS.listItems(l.id).length).toBe(1);

    SRS.deleteList(l.id);
    expect(SRS.lists().length).toBe(0);
  });

  it('IDs zählen hoch, umbenennen funktioniert', () => {
    const a = SRS.createList('A'); const b = SRS.createList('B');
    expect([a.id, b.id]).toEqual(['l1', 'l2']);
    SRS.renameList(a.id, 'Neu');
    expect(SRS.lists().find((x) => x.id === 'l1').name).toBe('Neu');
  });

  it('ganze Lektion hinzufügen', () => {
    const l = SRS.createList('Lektion 1');
    const ids = win.VOKABULAR.filter((v) => v.lesson === 1).map(vid);
    SRS.addToList(l.id, ids);
    expect(SRS.listItems(l.id).length).toBe(ids.length);
    expect(ids.length).toBeGreaterThan(10);
  });

  it('nicht auflösbare IDs werden übersprungen', () => {
    const l = SRS.createList('X');
    SRS.addToList(l.id, ['v:〇〇|99', vid(win.VOKABULAR[0])]);
    expect(SRS.listItems(l.id).length).toBe(1);
  });

  it('löst gemischte Einträge auf: Vokabel + Kanji + Grammatik (mit Typ)', () => {
    const l = SRS.createList('Mix');
    const v = win.VOKABULAR[0], k = win.KANJI[0], g = win.GRAMMATIK[0];
    SRS.addToList(l.id, [SRS.srsId('vocab', v), SRS.srsId('kanji', k), SRS.srsId('grammar', g)]);
    const items = SRS.listItems(l.id);
    expect(items.length).toBe(3);
    expect(items.map((o) => o.type).sort()).toEqual(['grammar', 'kanji', 'vocab']);
    expect(items.find((o) => o.type === 'kanji').data.k).toBe(k.k);
    expect(items.find((o) => o.type === 'grammar').data.pattern).toBe(g.pattern);
  });
});

describe('Export/Import erhält Listen', () => {
  it('round-trip (merge) behält Listen + Items', () => {
    const l = SRS.createList('Backup-Test');
    SRS.addToList(l.id, [vid(win.VOKABULAR[0]), vid(win.VOKABULAR[2])]);
    const dump = SRS.exportJSON();

    SRS._useStorage(fakeStorage());
    expect(SRS.lists().length).toBe(0);
    SRS.importJSON(dump, { merge: true });
    expect(SRS.lists().length).toBe(1);
    expect(SRS.lists()[0].name).toBe('Backup-Test');
    expect(SRS.listItems('l1').length).toBe(2);
  });
});

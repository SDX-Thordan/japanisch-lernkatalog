// Datenverlust-Schutz im SRS-Store: korrupte Daten werden gerettet statt überschrieben,
// tägliches Auto-Backup, Wiederherstellung bei fehlendem Haupt-Key, Reset sichert vorher.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadWithData, loadScripts, repoPath } from './helpers/load.js';

const KEY = 'katalog_srs_v1';

function fakeStorage(seed) {
  const d = { ...(seed || {}) };
  return {
    getItem: (k) => (k in d ? d[k] : null),
    setItem: (k, v) => { d[k] = String(v); },
    removeItem: (k) => { delete d[k]; },
    _dump: () => ({ ...d }),
  };
}

function freshWin() {
  return loadWithData(['assets/app.js', 'assets/srs.js'], {
    html: '<!DOCTYPE html><html><body data-page="heute"></body></html>',
  });
}

describe('Store-Sicherheit', () => {
  it('korrupter Haupt-Key wird unter _rescue gesichert statt stillschweigend verworfen', () => {
    const win = freshWin();
    const st = fakeStorage({ [KEY]: '{kaputt!!' });
    win.SRS._useStorage(st);
    // Frischer Store läuft …
    expect(win.SRS.stats().learned).toBe(0);
    // … aber die Rohdaten sind gerettet.
    expect(st._dump()[KEY + '_rescue']).toBe('{kaputt!!');
  });

  it('versionsfremder Store wird ebenfalls gerettet', () => {
    const win = freshWin();
    const alien = JSON.stringify({ v: 99, items: 'nope' });
    const st = fakeStorage({ [KEY]: alien });
    win.SRS._useStorage(st);
    expect(st._dump()[KEY + '_rescue']).toBe(alien);
  });

  it('die erste Rettung wird nicht von späterem Müll überschrieben', () => {
    const win = freshWin();
    const st = fakeStorage({ [KEY]: 'wertvoll-aber-kaputt', [KEY + '_rescue']: 'erste-rettung' });
    win.SRS._useStorage(st);
    expect(st._dump()[KEY + '_rescue']).toBe('erste-rettung');
  });

  it('save() legt höchstens 1×/Tag ein Backup an', () => {
    const win = freshWin();
    const st = fakeStorage();
    win.SRS._useStorage(st);
    win.SRS.grade('v:a|1', 1, '2026-06-10');
    const d = st._dump();
    expect(d[KEY + '_backup']).toBeTruthy();
    expect(d[KEY + '_backup_at']).toBeTruthy();
    const first = d[KEY + '_backup'];
    win.SRS.grade('v:b|1', 1, '2026-06-10'); // gleicher Tag → Backup bleibt unverändert
    expect(st._dump()[KEY + '_backup']).toBe(first);
  });

  it('fehlender Haupt-Key + vorhandenes Backup → Wiederherstellung', () => {
    const win = freshWin();
    const st = fakeStorage();
    win.SRS._useStorage(st);
    win.SRS.grade('v:a|1', 1, '2026-06-10'); // erzeugt Haupt-Key + Backup
    const backup = st._dump()[KEY + '_backup'];
    // Neuer Storage: nur das Backup überlebt (Haupt-Key weg).
    const st2 = fakeStorage({ [KEY + '_backup']: backup });
    win.SRS._useStorage(st2);
    expect(win.SRS.get('v:a|1').score).toBe(20);
  });

  it('korrupter Haupt-Key + gutes Backup → Backup gewinnt, Müll gerettet', () => {
    const win = freshWin();
    const st = fakeStorage();
    win.SRS._useStorage(st);
    win.SRS.grade('v:a|1', 1, '2026-06-10');
    const backup = st._dump()[KEY + '_backup'];
    const st2 = fakeStorage({ [KEY]: 'zerschossen', [KEY + '_backup']: backup });
    win.SRS._useStorage(st2);
    expect(win.SRS.get('v:a|1').score).toBe(20);
    expect(st2._dump()[KEY + '_rescue']).toBe('zerschossen');
  });

  it('REGRESSION Reload-Pfad: Bestandsdaten im localStorage überleben die Skript-Auswertung', () => {
    // Wie ein echter Seiten-Reload: die Daten liegen BEREITS im localStorage, wenn srs.js
    // ausgewertet wird (var store = load() läuft beim Parsen — nicht erst nach _useStorage).
    // Genau hier verlor ein zu spät zugewiesenes ACTIVITY_KEEP (undefined → addDays warf)
    // den kompletten Store.
    const win = loadScripts([], { html: '<!DOCTYPE html><html><body></body></html>', url: 'https://example.test/' });
    const data = {
      v: 1,
      items: { 'v:わたし|1': { score: 40, last: '2026-06-10', reps: 2, lapses: 0, streak: 2, history: [] } },
      lessons: {}, lists: { l1: { id: 'l1', name: 'Meine', created: '2026-06-10', items: ['v:わたし|1'] } },
      daily: {}, activity: { '2026-06-10': { gain: 40, reviews: 2 } },
      stats: { streakDays: 1, lastActive: '2026-06-10', totalReviews: 2 },
    };
    win.localStorage.setItem(KEY, JSON.stringify(data));
    for (const f of ['assets/app.js', 'assets/srs.js']) {
      const s = win.document.createElement('script');
      s.textContent = readFileSync(repoPath(f), 'utf8');
      win.document.head.appendChild(s);
    }
    expect(win.localStorage.getItem(KEY + '_rescue')).toBe(null); // nichts zu retten
    expect(win.SRS.lists().map((l) => l.name)).toEqual(['Meine']);
    expect(win.SRS.get('v:わたし|1').score).toBe(40);
    expect(win.SRS.dailyHistory('2026-06-10', 1)[0]).toMatchObject({ gain: 40, reviews: 2 });
  });

  it('reset() sichert den alten Stand vorher ins Backup', () => {
    const win = freshWin();
    const st = fakeStorage();
    win.SRS._useStorage(st);
    win.SRS.grade('v:a|1', 1, '2026-06-10');
    const before = st._dump()[KEY];
    win.SRS.reset();
    expect(win.SRS.get('v:a|1')).toBeFalsy(); // Reset wirkt
    expect(st._dump()[KEY + '_backup']).toBe(before); // alter Stand gesichert
  });
});

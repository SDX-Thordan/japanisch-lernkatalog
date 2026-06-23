// Übungs-Rendering + Anbindung an SRS.grade (jsdom).
import { describe, it, expect, beforeEach } from 'vitest';
import { loadWithData } from './helpers/load.js';

let win, Ex;
beforeEach(() => {
  win = loadWithData([
    'assets/app.js',
    'assets/data/vokabular_tags.js',
    'assets/data/saetze.js',
    'assets/exercises.js',
  ], { html: '<!DOCTYPE html><html><body data-page="heute"><div id="mount"></div></body></html>' });
  Ex = win.Exercises;
});

describe('renderExercise() — MC', () => {
  it('rendert Optionen, meldet Ergebnis und ruft SRS.grade', () => {
    const calls = [];
    win.SRS = { grade: (id, g) => calls.push([id, g]), srsId: () => null };
    const ex = { typ: 'mc', frage: 'わたし＿みずをのみます', optionen: ['は', 'を', 'が'], richtig: 0, srsId: 'g:test', erkl: 'Thema' };
    const mount = win.document.getElementById('mount');
    let result = null;
    Ex.renderExercise(ex, mount, { onResult: (ok) => { result = ok; } });
    const btns = mount.querySelectorAll('.ex-opt');
    expect(btns.length).toBe(3);
    btns[0].dispatchEvent(new win.Event('click', { bubbles: true }));
    expect(result).toBe(true);
    expect(calls).toEqual([['g:test', 1]]);
  });

  it('falsche Antwort → onResult(false) + grade 0', () => {
    const calls = [];
    win.SRS = { grade: (id, g) => calls.push([id, g]), srsId: () => null };
    const ex = { typ: 'mc', frage: 'x', optionen: ['は', 'を'], richtig: 1, srsId: 'g:test' };
    const mount = win.document.getElementById('mount');
    let result = null;
    Ex.renderExercise(ex, mount, { onResult: (ok) => { result = ok; } });
    mount.querySelectorAll('.ex-opt')[0].dispatchEvent(new win.Event('click', { bubbles: true }));
    expect(result).toBe(false);
    expect(calls[0][1]).toBe(0);
  });
});

describe('renderExercise() — order', () => {
  it('rendert Chunks und prüft die Reihenfolge', () => {
    const ex = { typ: 'order', chunks: ['みず', 'を', 'のみます'], solution: ['みず', 'を', 'のみます'], suffix: '。', srsId: 'g:test' };
    const mount = win.document.getElementById('mount');
    Ex.renderExercise(ex, mount, {});
    expect(mount.querySelectorAll('.ex-chunk').length).toBe(3);
  });
});

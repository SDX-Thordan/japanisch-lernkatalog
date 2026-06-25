// Generierte Verb-Form-Übungen: aus echten Verben erzeugte て-Form-MC-Aufgaben.
import { describe, it, expect } from 'vitest';
import { loadScripts } from './helpers/load.js';

const win = loadScripts(['assets/data/vokabular.js', 'assets/app.js']);
const K = win.Katalog;

// Aus der Frage „<prompt> → ?（…）" die Kana-Form herausziehen (prompt = kana ODER kanji（kana）).
function kanaFromFrage(frage) {
  const left = frage.split(' → ')[0];
  const m = left.match(/（([^）]+)）/);
  return m ? m[1] : left;
}

describe('genVerbFormExercises("te")', () => {
  it('erzeugt MC-Aufgaben mit der korrekten て-Form als Lösung', () => {
    const exs = K.genVerbFormExercises('te', 8);
    expect(exs.length).toBeGreaterThan(0);
    exs.forEach((ex) => {
      expect(ex.typ).toBe('mc');
      expect(ex.frage).toContain('て-Form');
      // gültiger Lösungsindex
      expect(ex.richtig).toBeGreaterThanOrEqual(0);
      expect(ex.richtig).toBeLessThan(ex.optionen.length);
      // Optionen eindeutig
      expect(new Set(ex.optionen).size).toBe(ex.optionen.length);
      // Lösung = tatsächliche て-Form des Verbs (über die Konjugations-Engine gegengeprüft)
      const kana = kanaFromFrage(ex.frage);
      const v = (win.VOKABULAR || []).find((x) => x.kana === kana);
      expect(v).toBeTruthy();
      const c = K.conjugate(v.kana, K.verbGroup(v.pos));
      expect(ex.optionen[ex.richtig]).toBe(c.te);
    });
  });

  it('variiert die Aufgaben (nicht immer dieselben zwei Verben)', () => {
    const a = K.genVerbFormExercises('te', 6).map((e) => e.frage);
    const b = K.genVerbFormExercises('te', 6).map((e) => e.frage);
    // mindestens eine Frage unterscheidet sich zwischen zwei Durchläufen
    expect(a.join('|') !== b.join('|') || a.length === 0).toBe(true);
  });
});

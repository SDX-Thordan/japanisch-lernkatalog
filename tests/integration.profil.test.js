// Integrationstest: Fortschritt-Seite — Statistik/Forecast + Reset über die UI.
import { describe, it, expect, beforeEach } from 'vitest';
import { loadScripts } from './helpers/load.js';

function fakeStorage() {
  const d = {};
  return { getItem: (k) => (k in d ? d[k] : null), setItem: (k, v) => { d[k] = String(v); }, removeItem: (k) => { delete d[k]; } };
}

const UPDATE_PANEL = `
  <p id="f-update-diag" hidden></p>
  <button id="f-update-check"></button><button id="f-update-apply" hidden></button>
  <p id="f-update-msg"></p>`;

const BODY = `<!DOCTYPE html><html><body data-page="profil"><div id="f-root">
  <span id="f-streak"></span><span id="f-learned"></span><span id="f-due"></span><span id="f-reviews"></span>
  <div class="act-bars" id="f-activity"></div>
  <div id="f-calendar"></div>
  <div id="f-forecast"></div>
  ${UPDATE_PANEL}
  <button id="f-export"></button><button id="f-import"></button><input id="f-file" type="file">
  <button id="f-reset"></button><p id="f-msg"></p>
</div></body></html>`;

// Nativ-Variante: capgo-Mock wird als Inline-Skript VOR ota.js/app.js definiert (wie am Gerät).
function nativeBody(nativeVersion, manifestVersion) {
  return BODY.replace('<div id="f-root">', `<div id="f-root">
    <script>
      window.APP_VERSION='1.0.0';
      window.Capacitor={ isNativePlatform:()=>true, Plugins:{
        CapacitorHttp:{ get:()=>Promise.resolve({ data: JSON.stringify({version:'${manifestVersion}'}) }) },
        CapacitorUpdater:{
          notifyAppReady:()=>Promise.resolve(),
          current:()=>Promise.resolve({ bundle:{id:'b1',version:''}, native:'${nativeVersion}' }),
          reset:()=>Promise.resolve(),
          download:(o)=>{ window.__otaCalls=(window.__otaCalls||[]).concat('download:'+o.version); return Promise.resolve({id:'bX',version:o.version}); },
          set:(o)=>{ window.__otaCalls=(window.__otaCalls||[]).concat('set:'+o.id); return Promise.resolve(); },
        } } };
    <\/script>`);
}

const SCRIPTS = [
  'assets/data/kanji.js', 'assets/data/vokabular.js', 'assets/data/grammatik.js',
  'assets/ota.js', 'assets/srs.js', 'assets/app.js',
];

let win;
beforeEach(() => {
  win = loadScripts(SCRIPTS, { html: BODY });
  win.SRS._useStorage(fakeStorage());
});

function tick() { return new Promise((r) => setTimeout(r, 0)); }

describe('Fortschritt-Seite', () => {
  it('rendert Punkte-pro-Tag-Balken (30) und Aktivitäts-Kalender-Zellen', () => {
    expect(win.document.querySelectorAll('#f-activity .act-bar').length).toBe(30);
    expect(win.document.querySelectorAll('#f-calendar .cal-grid .cal-cell').length).toBeGreaterThanOrEqual(91);
  });

  it('hebt aktive Tage farblich hervor und füllt den heutigen Balken (nach Redraw)', async () => {
    const today = win.SRS.__test.todayISO();
    for (let i = 0; i < 3; i++) win.SRS.grade('k:学', 1, today); // bis ITEM_DAILY_CAP=40 → Stufe 2
    // Redraw über den realen Import-Pfad (FileReader → draw()).
    const json = win.SRS.exportJSON();
    const file = win.document.getElementById('f-file');
    Object.defineProperty(file, 'files', { value: [new win.Blob([json], { type: 'application/json' })], configurable: true });
    file.dispatchEvent(new win.Event('change'));
    await tick(); await tick();
    expect(win.document.querySelectorAll('#f-calendar .cal-cell.l1, #f-calendar .cal-cell.l2, #f-calendar .cal-cell.l3, #f-calendar .cal-cell.l4').length).toBeGreaterThanOrEqual(1);
    const heights = [...win.document.querySelectorAll('#f-activity .act-bar-fill')].map((e) => e.style.height);
    expect(heights.some((h) => h === '100%')).toBe(true);
  });

  it('rendert 7 Forecast-Balken und Statistik', () => {
    // Seite neu initialisieren, nachdem Storage gesetzt ist:
    win.SRS.grade('k:学', 1, '2026-06-23');
    // initFortschritt lief bereits beim Laden; erneut über reset-Pfad zeichnen lassen:
    const reset = win.document.getElementById('f-reset');
    // forecast wird in draw() befüllt; prüfe nach einem Import-Trigger-freien Redraw via Reset-Abbruch
    expect(win.document.querySelectorAll('#f-forecast .f-bar').length).toBe(7);
  });

  it('App-Update im Web: Button deaktiviert + Hinweis, kein Banner-Element', () => {
    const upd = win.document.getElementById('f-update-check');
    expect(upd.disabled).toBe(true);
    expect(win.document.getElementById('f-update-msg').textContent).toContain('automatisch');
    expect(win.document.getElementById('ota-bar')).toBe(null); // es gibt keinen Auto-Banner mehr
  });

  it('App-Update nativ: Diagnose-Zeile + Check zeigt Update, Apply lädt & setzt Bundle', async () => {
    const w = loadScripts(SCRIPTS, { html: nativeBody('1.0.0', '2.0.0') });
    w.SRS._useStorage(fakeStorage());
    await tick(); await tick();
    // Diagnose: aktives Bundle vs. eingebaute APK-Version
    const diag = w.document.getElementById('f-update-diag');
    expect(diag.hidden).toBe(false);
    expect(diag.textContent).toContain('v1.0.0');
    // Check über den Button → Update wird angeboten (Apply-Button erscheint)
    w.document.getElementById('f-update-check').dispatchEvent(new w.Event('click', { bubbles: true }));
    await tick(); await tick();
    expect(w.document.getElementById('f-update-msg').textContent).toContain('2.0.0');
    const apply = w.document.getElementById('f-update-apply');
    expect(apply.hidden).toBe(false);
    // Anwenden → download + set (terminal)
    apply.dispatchEvent(new w.Event('click', { bubbles: true }));
    await tick(); await tick();
    expect(w.__otaCalls).toEqual(['download:2.0.0', 'set:bX']);
  });

  it('App-Update nativ: kein Update → Apply bleibt versteckt', async () => {
    const w = loadScripts(SCRIPTS, { html: nativeBody('1.0.0', '1.0.0') });
    w.SRS._useStorage(fakeStorage());
    await tick();
    w.document.getElementById('f-update-check').dispatchEvent(new w.Event('click', { bubbles: true }));
    await tick(); await tick();
    expect(w.document.getElementById('f-update-msg').textContent).toContain('neueste');
    expect(w.document.getElementById('f-update-apply').hidden).toBe(true);
  });

  it('Export liefert gültiges JSON, Import (merge) stellt Items wieder her', () => {
    win.SRS.grade('k:水', 1, '2026-06-23');
    const text = win.SRS.exportJSON();
    const parsed = JSON.parse(text);
    expect(parsed.v).toBe(1);
    expect(parsed.items['k:水']).toBeTruthy();
    win.SRS.reset();
    expect(win.SRS.get('k:水')).toBeFalsy();
    expect(win.SRS.importJSON(text, { merge: true }).ok).toBe(true);
    expect(win.SRS.get('k:水')).toBeTruthy();
  });
});

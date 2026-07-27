// Export: In der Android-App verpufft ein <a download> lautlos — daher nativ Filesystem+Share,
// im Browser Download, sonst Zwischenablage; jeder Weg meldet sein Ergebnis zurück.
import { describe, it, expect, beforeEach } from 'vitest';
import { loadWithData } from './helpers/load.js';

function fakeStorage() {
  const d = {};
  return { getItem: (k) => (k in d ? d[k] : null), setItem: (k, v) => { d[k] = String(v); }, removeItem: (k) => { delete d[k]; } };
}

let win, SRS;
beforeEach(() => {
  win = loadWithData(['assets/srs.js'], { html: '<!DOCTYPE html><html><body></body></html>' });
  SRS = win.SRS;
  SRS._useStorage(fakeStorage());
});

// Capacitor wird NACH dem Laden gesetzt — srs.js liest die Plugins erst beim Aufruf (lazy).
function goNative(plugins) {
  win.Capacitor = { isNativePlatform: () => true, Plugins: plugins };
}
function fsShareMock(calls, opts = {}) {
  return {
    Filesystem: {
      writeFile: (o) => { calls.push(['writeFile', o]); return Promise.resolve(opts.noUri ? {} : { uri: 'file:///cache/' + o.path }); },
      getUri: (o) => { calls.push(['getUri', o]); return Promise.resolve({ uri: 'file:///cache/' + o.path }); },
    },
    Share: {
      share: (o) => { calls.push(['share', o]); return opts.shareError ? Promise.reject(new Error(opts.shareError)) : Promise.resolve(); },
    },
  };
}

describe('saveJson — nativer Weg (Teilen-Dialog)', () => {
  it('schreibt in den Cache und teilt die Datei', async () => {
    const calls = [];
    goNative(fsShareMock(calls));
    const res = await SRS.downloadBackup();
    expect(res).toEqual({ ok: true, how: 'share' });
    expect(calls[0]).toEqual(['writeFile', { path: 'katalog-fortschritt.json', data: SRS.exportJSON(), directory: 'CACHE', encoding: 'utf8' }]);
    const [name, shareArgs] = calls[calls.length - 1];
    expect(name).toBe('share');
    expect(shareArgs.url).toBe('file:///cache/katalog-fortschritt.json');
    expect(shareArgs.text).toBeUndefined(); // sonst priorisiert Android text/plain
  });

  it('holt die URI nach, wenn writeFile keine liefert', async () => {
    const calls = [];
    goNative(fsShareMock(calls, { noUri: true }));
    const res = await SRS.downloadBackup();
    expect(res.how).toBe('share');
    expect(calls.map((c) => c[0])).toEqual(['writeFile', 'getUri', 'share']);
  });

  it('Abbruch im Teilen-Dialog ist kein Fehler und kopiert nichts', async () => {
    const calls = [];
    let copied = false;
    win.navigator.clipboard = { writeText: () => { copied = true; return Promise.resolve(); } };
    goNative(fsShareMock(calls, { shareError: 'Share canceled' }));
    const res = await SRS.downloadBackup();
    expect(res).toEqual({ ok: false, how: 'canceled' });
    expect(copied).toBe(false);
  });

  it('fehlende Plugins → Zwischenablage', async () => {
    let copied = null;
    win.navigator.clipboard = { writeText: (t) => { copied = t; return Promise.resolve(); } };
    goNative({}); // nativ, aber ohne Filesystem/Share
    const res = await SRS.downloadBackup();
    expect(res).toEqual({ ok: true, how: 'clipboard' });
    expect(copied).toBe(SRS.exportJSON());
  });

  it('gar nichts möglich → JSON zum Kopieren zurückgeben', async () => {
    goNative({});
    const res = await SRS.downloadBackup(); // jsdom ohne clipboard
    expect(res.ok).toBe(false);
    expect(res.how).toBe('none');
    expect(res.json).toBe(SRS.exportJSON());
  });
});

describe('saveJson — Web-Weg (Download)', () => {
  function stubDownload() {
    const seen = { revoked: false, clicks: 0, anchor: null };
    win.URL.createObjectURL = () => 'blob:test';
    win.URL.revokeObjectURL = () => { seen.revoked = true; };
    const orig = win.HTMLAnchorElement.prototype.click;
    win.HTMLAnchorElement.prototype.click = function () { seen.clicks++; seen.anchor = { download: this.download, href: this.href }; };
    return { seen, restore: () => { win.HTMLAnchorElement.prototype.click = orig; } };
  }

  it('erzeugt einen Anchor-Download mit Dateinamen', async () => {
    const { seen, restore } = stubDownload();
    const res = await SRS.downloadBackup();
    restore();
    expect(res).toEqual({ ok: true, how: 'download' });
    expect(seen.clicks).toBe(1);
    expect(seen.anchor.download).toBe('katalog-fortschritt.json');
  });

  it('Listen-Export nutzt Listennamen als Dateinamen und exportiert die Liste', async () => {
    const l = SRS.createList('Reise Worte');
    SRS.addToList(l.id, [SRS.srsId('vocab', win.VOKABULAR[0])]);
    const { seen, restore } = stubDownload();
    const res = await SRS.downloadList(l.id);
    restore();
    expect(res.how).toBe('download');
    expect(seen.anchor.download).toBe('liste-Reise_Worte.json');
  });

  it('unbekannte Liste → sauberes Fehlerergebnis statt Absturz', async () => {
    await expect(SRS.downloadList('gibtsnicht')).resolves.toMatchObject({ ok: false, how: 'none', error: 'unknown-list' });
  });

  it('ohne createObjectURL (WebView-Fall) → Zwischenablage', async () => {
    win.URL.createObjectURL = undefined;
    let copied = null;
    win.navigator.clipboard = { writeText: (t) => { copied = t; return Promise.resolve(); } };
    const res = await SRS.downloadBackup();
    expect(res).toEqual({ ok: true, how: 'clipboard' });
    expect(copied).toBe(SRS.exportJSON());
  });
});

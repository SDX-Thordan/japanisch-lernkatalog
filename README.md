# 日本語 A1.7 — Lern-Katalog & Lern-App

Lern-App für Japanisch (Minna no Nihongo 初級 I, Lektion 1–20 · Stufe A1.2–A1.7).
Läuft als **Offline-Website / PWA** und als **Android-APK** — derselbe Code-Stand.

## Funktionen

- **Katalog** — Grammatik, Vokabular, Kanji und Verben (Auto-Konjugator) mit Suche, Filtern und Furigana.
- **Heute** — tägliche, gemischte Lernrunde aus fälligen Wiederholungen und neuen Inhalten
  (Spaced Repetition, SM-2-light).
- **Dynamische Satzbildung** — generierte Übungen (Partikel-MC, Wörter ordnen, Übersetzen)
  aus geprüften Satz-Vorlagen × getaggten Vokabeln.
- **Erweiterte Grammatik** — ausführliche Erklärungen, häufige Fehler, Abgrenzungen und Übungen.
- **Kanji-Schreiben** — echte Strichreihenfolge (KanjiVG): nachzeichnen, abspielen, selbst bewerten.
- **Fortschritt** — Streak, Fälligkeitsvorschau und **JSON-Export/Import** zur Sicherung.

Der Lernstand wird lokal im Browser (`localStorage`, Schlüssel `katalog_srs_v1`) gespeichert
und kann als JSON exportiert/importiert werden.

## Architektur

Zero-Dependency Vanilla-JS, offline-fähig. Keine Build-Pflicht für die Web-Version.

- `assets/app.js` — Rendering, Suche/Filter, Verb-Konjugator, Trainer, Tagesseite, Fortschritt.
- `assets/srs.js` — SRS-Engine (`window.SRS`): Scheduler, Queue, Persistenz, Export/Import.
- `assets/exercises.js` — Übungs-Engine (`window.Exercises`): Satz-Filler + mc/cloze/order/translate.
- `assets/kanji-write.js` — Kanji-Schreiben (`window.KanjiWrite`) auf Basis der KanjiVG-SVGs.
- `assets/data/*.js` — Inhalte: Vokabular, Kanji, Grammatik (+ Furigana/Extra/Plus), Satz-Vorlagen, Tags.
- `assets/kanjivg/*.svg` — Strichreihenfolge-Daten (KanjiVG, CC BY-SA 3.0).

## Entwicklung (testgetrieben)

```bash
npm ci
npm test          # Unit-/Komponententests (Vitest + jsdom)
npm run e2e       # End-to-End-Smokes (Playwright)
```

Reine Logik (Scheduler, IDs, Queue, Satz-Filler, JSON-Merge, Konjugator) ist als Funktionen
testbar; `tests/helpers/load.js` lädt die Browser-Skripte in jsdom.

## Web / PWA

Lokal: `python3 -m http.server` und `index.html` öffnen. Auf GitHub Pages installierbar
(Manifest + Service Worker → voll offline).

## Android-APK

Die APK wird in **GitHub Actions** gebaut (`.github/workflows/android.yml`): Test-Gate →
`build:www` → `cap add android` → `cap sync` → `gradlew assembleDebug`. Die fertige
`app-debug.apk` liegt als Workflow-Artefakt zum Download bereit.

Lokal (mit Android SDK):

```bash
npm run build:www
npx cap add android      # einmalig
npx cap sync android
cd android && ./gradlew assembleDebug
```

## Lizenz

Code: MIT (siehe `LICENSE`). Strichreihenfolge-Daten: KanjiVG, CC BY-SA 3.0
(siehe `LICENSE-KanjiVG`).

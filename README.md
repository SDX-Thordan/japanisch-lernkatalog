# Go! Nihongo

Lern-App für Japanisch (Minna no Nihongo 初級 I, Lektionen 1–25).
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

## Android-APK (signiertes Release)

Die APK wird in **GitHub Actions** gebaut (`.github/workflows/android.yml`): Test-Gate →
`build:www` → `cap add android` → `cap sync` → **`gradlew assembleRelease`**, signiert mit dem
festen Keystore `signing/go-nihongo.keystore`. Die fertige **`app-release.apk`** liegt als
Workflow-Artefakt `go-nihongo-release-apk` zum Download bereit.

**Updates ohne Neuinstallation:** Da die App eine stabile `applicationId`
(`de.thordan.japanischkatalog`) und einen stabilen Signaturschlüssel hat und der `versionCode`
bei jedem Build hochzählt (`GITHUB_RUN_NUMBER`), lässt sich eine neue APK direkt **über** die
installierte Version legen — der Lernfortschritt im Gerät bleibt erhalten.

> Hinweis: Der Release-Keystore liegt bewusst im Repo (Passwort im Workflow), damit der Build
> ohne weitere Einrichtung reproduzierbar signiert. Für eine im Play Store veröffentlichte App
> sollte der Schlüssel stattdessen geheim gehalten werden (z. B. GitHub-Secrets).

Lokal (mit Android SDK):

```bash
npm run build:www
npx cap add android      # einmalig
npx cap sync android
cd android && ./gradlew assembleRelease \
  -Pandroid.injected.signing.store.file="$PWD/../signing/go-nihongo.keystore" \
  -Pandroid.injected.signing.store.password=gonihongo \
  -Pandroid.injected.signing.key.alias=gonihongo \
  -Pandroid.injected.signing.key.password=gonihongo
```

App-Icons aus `assets/icons/logo.png` neu erzeugen: `node scripts/gen-icons.mjs`.

## Lizenz

Code: MIT (siehe `LICENSE`). Strichreihenfolge-Daten: KanjiVG, CC BY-SA 3.0
(siehe `LICENSE-KanjiVG`).

# Go! Nihongo

Lern-App für Japanisch (Minna no Nihongo 初級 I, Lektionen 1–25).
Läuft als **Offline-Website / PWA** und als **Android-APK** — derselbe Code-Stand.

## Funktionen

- **Nachschlagen** — Grammatik, Vokabular, Kanji und Verben (Auto-Konjugator) mit Suche, Filtern und Furigana.
- **Heute** — tägliche, gemischte Lernrunde aus fälligen Wiederholungen und neuen Inhalten
  (Spaced Repetition, SM-2-light); an den Lernpfad gekoppelt.
- **Lernpfad** — Lektionen L1–25 freispielen: Kern beherrschen (Kanji ab einem Level auch
  schreiben) + Lektionstest bestehen.
- **Listen** — eigene Vokabellisten als Karteikarten in beide Richtungen (日本語↔Deutsch) trainieren.
- **Dynamische Satzbildung** — generierte Übungen (Partikel-MC, Wörter ordnen, Übersetzen)
  aus geprüften Satz-Vorlagen × getaggten Vokabeln.
- **Kanji-Schreiben** — echte Strichreihenfolge (KanjiVG): nachzeichnen, abspielen, selbst bewerten.
- **Profil** — Streak (als aufgehende Sakura-Blüte), Fälligkeitsvorschau und **JSON-Export/Import**
  des gesamten Lernstands inkl. Vokabellisten.

UI: gruppierte Tab-Navigation (Browser) bzw. untere Tab-Leiste (App), Material-Icons als
**selbst gehostete Font** (offline) — keine externen Requests.

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
festen Keystore `signing/go-nihongo.keystore`. Jeder Build liegt als Workflow-Artefakt
`go-nihongo-release-apk` zum Download bereit.

### Version & Release

Die **eine Versionsquelle** ist das Feld `version` in `package.json` (Semver). Daraus erzeugt
`scripts/gen-version.mjs` die Datei `assets/version.js` (`window.APP_VERSION`), die der **Footer**
auf jeder Seite anzeigt — Web/PWA und APK zeigen damit dieselbe Version.

**Release-Ablauf:** Auf GitHub einfach ein **Release mit Tag `vX.Y.Z`** veröffentlichen. Der
**Tag ist maßgeblich** — du musst `package.json` vorher *nicht* von Hand bumpen: Der Workflow
trägt `X.Y.Z` in `package.json` ein, erzeugt daraus `assets/version.js` (Footer) und die signierte
APK (`versionName = X.Y.Z`, `versionCode = Run-Nummer`), benennt sie `go-nihongo-X.Y.Z.apk` und
**hängt sie ans Release**.

> Optional fürs Web/Repo: Soll der committete Stand (z. B. GitHub Pages) dieselbe Version zeigen,
> `package.json` bumpen, `npm run version:gen` ausführen und committen.

Bei Push/PR läuft nur das **Test-Gate** — die APK wird dort **nicht** gebaut. Ein manueller
Build (ohne Release) ist über *Run workflow* (`workflow_dispatch`) möglich und liefert eine
`…-dev.<run#>`-APK als CI-Artefakt.

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

App-Icons (Web/PWA + `resources/` für Android) aus `assets/icons/logo.png` neu erzeugen:
`npm run icons`. Das **Android-Launcher-Icon & Splash** werden im CI-Build aus `resources/`
via **`@capacitor/assets`** generiert (Schritt in `android.yml`) — nicht mehr das
Capacitor-Standard-Icon.

## Lizenz

Code: MIT (siehe `LICENSE`). Strichreihenfolge-Daten: KanjiVG, CC BY-SA 3.0
(siehe `LICENSE-KanjiVG`).

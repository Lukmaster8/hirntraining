# Entwickler-Dokumentation

## Grundsätze
* Reines HTML/CSS/JavaScript, **ES2017** (kein `?.`, kein `??`, keine Klassenfelder, kein Objekt-Spread → `HT.zusammen(a, b)`), keine Build-Schritte, keine Bibliotheken.
* Start über `file://` – daher **keine ES-Module und kein fetch()** lokaler Dateien. Alle Skripte sind klassische `<script>`-Tags; Inhalte liegen als JS-Dateien in `data/`.
* CSS: Für Safari 13 kein `gap` bei Flexbox (Abstände über Margins), bei Grid `grid-gap` + `gap`. CSS-Variablen nie in SVG-Attributen (`fill="var(..)"`), sondern in `style="fill:var(..)"`.
* Globaler Namensraum `window.HT`.

## Ablauf beim Start (`core/app.js`)
1. `HT.storage.init()` – IndexedDB öffnen, sonst localStorage (z. B. Safari unter `file://`), alle Stores in den Zwischenspeicher laden.
2. Darstellung anwenden (Farbschema, Kontrast, Schriftgröße, Ton).
3. `HT.Module.laden()` – lädt `modules/<id>/module.js` für alle IDs aus `modules/liste.js`.
4. Hash-Router (`#/patienten`, `#/patient/<id>/<reiter>`, `#/plan/<id>`, `#/module`, `#/modul/<id>`, `#/auswertung`, `#/bericht/<id>`, `#/verwaltung/<bereich>`, `#/einstellungen`, `#/start`, `#/anmelden`, `#/einrichtung`, `#/patientenstart`).
   Seiten melden sich mit `HT.route(muster, render, { schutz, shell, nav })` an.

## Datenmodell (Stores)
| Store | Inhalt |
|---|---|
| therapists | id, name, kuerzel, rolle (admin/therapeut), pinHash (SHA-256 mit Salz), salz, aktiv |
| patients | id, pseudonym, vorname, nachname, geburtsjahr, geschlecht, diagnose, icd10, betroffeneSeite, gesichtsfeld, haendigkeit, therapeutId, notizen, einstellungen{schriftgroesse, kontrast, ton, eingabe, tastenOverlay, rueckmeldung, ohneFehlerton, fehlerfrei}, ziele[{titel, bereich, modulId, zielLevel, zielQuote, ausgangsLevel, zielDatum, status, icf, bewertungen[{datum, gas, kommentar}]}], archiviert, angelegtAm |
| plans | id, patientId, name, eintraege[{modulId, dauerMin, startLevel ('auto'|n), parameterOverrides}], pauseMin, aktiv |
| templates | Vorlagen mit demselben Aufbau wie Pläne (ohne patientId) |
| sessions | id, patientId, therapeutId, planId, start, ende, status (laufend/abgeschlossen/abgebrochen), index, art ('einstufung'), befindenVor{stimmung, wachheit}, befindenNach{anstrengung, stimmung}, notiz |
| runs | ein Datensatz je **Durchgang**: modulId, level, levelNachher, start, dauerSek, treffer, fehler, auslassungen, quote, rtMittel, rtMedian, rtStreuung, rtLinks/rtRechts, trefferLinks/Rechts, auslassungenLinks/Rechts, extra{typ: anzahl}, rohdaten[{zeit, reiz, reaktion, korrekt, auslassung, rtMs, seite, typ}] |
| moduleState | id = patientId + '|' + modulId: aktuellesLevel, automatik, letzteDurchgaenge, hochSerie |
| settings | ein Datensatz `app`: praxisname, logoDataUrl, farbschema, standarddauer, backupErinnerung, letzterExport, schwellen, moduleInaktiv … |

## Sitzungsablauf (`core/session.js`)
Anleitung (Text + `preview`) → Übung (3 gezählte Ereignisse, keine Speicherung) → Durchgänge (`dauerDurchgangSek`, Standard 90 s; Anzahl = Dauer/Durchgang) → nach jedem Durchgang `HT.adaptive.nachDurchgang` → Zwischenbildschirm → Modulergebnis (Sterne) → Planpause → nächstes Modul → Abschluss.
Die Instanz eines Moduls wird über `HT.Module.instanz()` erzeugt; Pause/Stopp halten immer auch `HT.zeit` an und räumen Eingabe-Handler und den Container auf.

## Ereignisse aus Modulen
```js
ctx.onEvent({
  korrekt: true,          // Treffer
  auslassung: false,      // true = verpasster Reiz
  rtMs: 512,              // Reaktionszeit (nur bei korrekten Antworten in die RT-Statistik)
  seite: 'links',         // 'links' | 'rechts' | 'mitte' – für die Seitenverteilung
  reiz: 'stern', reaktion: 'leertaste',
  typ: 'perseveration',   // optionale Fehlerart (wird in extra gezählt)
  zaehlt: false           // optional: nicht in Treffer/Fehler werten (z. B. Hilfe, Wandstoß)
});
```

## Hilfsfunktionen für Module (`core/moduleApi.js`, `core/util.js`)
* `HT.zeit.nach(ms, fn)`, `HT.zeit.intervall(ms, fn)`, `HT.zeit.frame(fn(dt, jetzt))`, `HT.zeit.jetzt()` – pausierbar.
* `HT.eingabe.an(fn(aktion, detail))` – Aktionen `ok, links, rechts, hoch, runter, ja, nein, ziffer, buchstabe, loeschen` aus Tastatur und Bildschirmtasten.
* `HT.tastenFokus(elemente, { spalten, beiWahl })` – Pfeiltasten/Leertaste/Ziffern für beliebige Klickelemente.
* `HT.quiz(container, ctx, { aufgabe() })` – kompletter Ablauf für Auswahlaufgaben.
* `HT.m.neu`, `HT.m.wahl` – Bausteine; `HT.feedback(container, richtig, x, y)` – Haken/Kreuz + Ton.
* `HT.zeigerFolgen(el, { bewegt, runter, hoch })`, `HT.pfeilTasten()`, `HT.canvasVoll(container)`.
* `HT.suchSzene(container, ctx, opt)` (`core/exploration.js`) – Suchszene für Exploration und Neglect.
* Grafiken: `HT.bild(id)`, `HT.bildGruppe(id, x, y, groesse)`, `HT.formSvg(form, farbe, { umriss, drehung, spiegeln })`, `HT.geldSvg(wert)`, `HT.gesichtSvg(merkmale)`.
* Töne: `HT.audio.richtig/falsch/klick/signal(freq, pan)/hoch/tief/warnung`, `HT.audio.sprechen(text)`.
* Level erzeugen: `HT.stufen(n, function (t, i) { return {...}; })` mit `t` = 0…1, `HT.lerp`, `HT.lerpInt`.

## Test
Jedes Modul lässt sich in der Bibliothek über **Ausprobieren** auf jedem Level starten, ohne dass Daten gespeichert werden. Der Testdaten-Generator (Verwaltung → Daten) erzeugt Verläufe für die Auswertung.

## Therapeutische Zusatzdaten
`data/modulinfo.js` enthält je Modul Indikation, ICF-Kodes, Therapiehinweise und Alltagsbezug (`HT.modulInfo(id)`). Für ein neues Modul dort einen Eintrag ergänzen.

## Pult, Eingaben und Bühne (Stand 22.11.2026)
* **Pult-Aktionen** (`core/pult.js`): `ok`, `ja`, `nein`, `hoch`, `runter`, `links`, `rechts`, `anleitung` (wie „+“), `pause` (wie „−“). Tastatur-Modus über `ev.code` (immer verfügbar), WebHID nur für Joystick. Profile `klassisch`/`janein` in `einstellungen().pult.profil`. Sitzungs-API: `HT.session.anleitungWiederholen()`, `HT.session.pauseOeffnen()`, `HT.session.modulLaeuft()`.
* **`eingaben: ['ja','nein']`** im Modul: Gelb/Rot werden während des Moduls automatisch Ja/Nein; im Training erscheint der Ja/Nein-Hinweis. **`wiederholung: true`**: gehaltene Pfeil-Pulttasten wiederholen (400 ms, dann alle 150 ms).
* **`ctx.buehne = { b, h, einheit }`** (einheit = 1 % der kürzeren Bühnenseite). Richtwerte: Reize ≥ 18 einheit, Text ≥ 32 px, Antwortknöpfe ≥ 64 px.
* **Leistungsmodus** (`HT.leistung`, `HT.leicht()`): beim Start 30 Bilder messen; mittlere Bildzeit > 22 ms → `html.leicht` (keine großen Schatten, keine Deko-Animation, Vorschau nur bei Hover). Einstellung *Darstellung: Automatisch | Schön | Leicht*. `html.ruhig` = Animationen reduzieren.
* **Bewegungsunschärfe**: `HT.bewegungsUnschaerfe.canvas(ctx, vx, vy, zeichne)` und `.element(el)` (SVG-Filter, nicht in Safari, nicht bei „Bewegung reduzieren“).
* **Screening** (`core/screening.js`): Sitzung mit `screening: { id }` → feste Parameter, ein Durchgang je Test, kein adaptives Level; Runs tragen `screening` und `screeningTest`. Versteckte Module (`versteckt: true`, z. B. `gesichtsfeld-check`) erscheinen nicht in Listen.
* **Datenschutz** (`core/sicherheit.js`): `HT.krypto` (PBKDF2, AES-GCM, JS-Ersatz für SHA-256/PBKDF2), `HT.audit(aktion, patient)`, `HT.sperre`. Store `audit` (IndexedDB-Version 2, Migration über `onupgradeneeded`).
* **ES2017-Prüfung**: `npx acorn --ecma2017 --silent <datei>` für jede geänderte JS-Datei. Gesamttest: `python3 tools/test_alle_module.py` (Playwright, Chromium + WebKit).

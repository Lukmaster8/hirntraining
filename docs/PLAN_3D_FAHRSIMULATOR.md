# Plan: 3D-Fahrsimulator (Prototyp „Vertical Slice“)

Stand: 23.11.2026 · Ziel: ein fotorealistischerer Fahrsimulator als **zusätzliches Modul** neben dem bestehenden
„Straßenverkehr“. Der bestehende 2D-Simulator bleibt unverändert und ist weiter die Fassung für den iMac 2012.

## 1. Ausgangslage (Analyse des bestehenden Codes)

- `modules/strassenverkehr/module.js` (~140 KB) zeichnet alles selbst auf einer 2D-Zeichenfläche (Canvas 2D):
  Pseudo-3D-Straße aus Segmenten, Sprites für Häuser/Bäume/Autos, Lichtkarte, Regen, Cockpit.
- Die **Trainingslogik** ist bereits gut abgrenzbar und wird übernommen:
  `streckeBauen` (Ort 50 / Landstraße 80–100, Ereignisse), `pruefeStopps`, `schilder`, `tempoPruefen`,
  `jagdSchritt` (Polizei), Punkte (+10 / −5), Ereignisse an `ctx.onEvent`, Fahrdynamik (`schritt`).
- Grenzen der 2D-Technik: keine echte Perspektive, keine echten Schatten/Spiegelungen, keine PBR-Materialien.
  Mehr Realismus ist nur mit einer echten 3D-Engine möglich.

## 2. Harte Randbedingungen

| Bedingung | Folge für den Plan |
|---|---|
| Läuft **offline**, keine CDNs | Three.js und alle Assets liegen lokal im Ordner. |
| Start per **file://** (Starter-App) | Chrome blockiert dort `fetch` von .glb/Texturen (CORS, „opaque origin“); der Schalter `--allow-file-access-from-files` wirkt seit ca. Chrome 96 nicht mehr zuverlässig. → Assets werden **als Base64 in .js-Dateien** eingebettet und über `<script>` geladen (funktioniert unter file://, Texturen sind dann gleicher Ursprung). |
| Patientendaten im Browser-Speicher von **file://** | Kein Umstieg auf einen lokalen Webserver (http://127.0.0.1 wäre ein *anderer* Speicher → Daten nicht mehr sichtbar). |
| **iMac 2012**, High Sierra, Chrome 116 / Safari 13 | WebGPU gibt es dort nicht. Neues Three.js braucht WebGL 2: Chrome 116 ja, **Safari 13 nein** (3D-Modul nur in Chrome; Starter öffnet ohnehin Chrome). Grafikkarten GT 640M … GTX 680MX: Qualitätsstufe „Niedrig“ ist Pflicht, 60 FPS nur auf den stärkeren Modellen realistisch. |
| ES2017, keine Module | Three.js + GLTFLoader werden mit **esbuild** zu *einer* klassischen Datei (IIFE, Ziel es2017) gebündelt. Nur Entwickler-Werkzeug, nicht Teil des Programms. |
| Ordnergröße | Prototyp: **ca. 60–150 MB** Assets. „Mehrere Gigabyte“ sind unter file:// mit Base64 nicht sinnvoll; dafür wäre später ein lokaler Server nötig (siehe Abschnitt 9). |
| Keine fremden Spielinhalte | Nur CC0-Assets (Poly Haven, ambientCG, Kenney, Quaternius); Lizenz und Quelle werden je Datei in `assets3d/LIZENZEN.md` festgehalten. |

## 3. Technik-Entscheidung

- **Three.js** (gebündelt, WebGL 2) statt Babylon.js: kleiner, für eine einzelne Szene ausreichend, gute glTF-Unterstützung.
- **WebGPU** nur als spätere Option für neuere Rechner (`WebGPURenderer` mit WebGL-2-Ersatz) – nicht im Prototyp.
- Eigener Ordner `modules/fahrsimulator-3d/` mit:
  - `three-bundle.js` (Three.js + GLTFLoader, ca. 0,7 MB minifiziert)
  - `assets3d/*.js` (eingebettete Texturen/Modelle, nach Qualitätsstufe getrennt: `_1k`, `_2k`)
  - `module.js` (Szene, Kamera, Steuerung, Anbindung an `HT.registerModule`)
- Die Trainingslogik wird aus `strassenverkehr/module.js` in eine gemeinsame Datei
  `modules/strassenverkehr/logik.js` ausgelagert, die **beide** Darstellungen nutzen (gleiche Punkte, gleiche Ereignisse, gleiche Auswertung).

## 4. Vertical Slice (Umfang Prototyp)

Eine vollständig befahrbare **deutsche Vorstadtstraße**, ca. 600–800 m, Tempo 50:

- Straße mit Asphalt-PBR (Albedo, Normal, Roughness), Mittel- und Randmarkierung, Bordstein, Gehweg (Pflaster), Grünstreifen.
- 10–14 Einfamilienhäuser: prozedural aus Grundkörpern erzeugt, mit PBR-Putz, Dachziegeln, Fenstern/Türen; Zäune, Hecken, Hausnummern.
- Bäume (Herbstlaub) als Instanzen; geparkte Autos am Rand; Laternen, Verkehrszeichen (50, Zebrastreifen, Vorfahrt), eine Ampel, ein Zebrastreifen mit Fußgänger.
- **Cockpit aus echter 3D-Geometrie**: Armaturenbrett, Lenkrad (dreht mit), digitales Kombiinstrument als Textur (Tacho, Limit, Punkte), Mittelkonsole mit Navi.
- **Spiegel**: Innenspiegel als zweite Kamera (Render-to-Texture, niedrige Auflösung); Außenspiegel optional in „Hoch“.
- **Licht**: HDRI-Himmel (Poly Haven) als Umgebungslicht, eine Sonne mit Schattenkarte (1024–2048), ACES-Tone-Mapping, Nebel/Dunst.
- **Fahrzeug**: vorhandene Fahrdynamik (Gas/Bremse/Ausweichen, 220 km/h), Bremsgeräusch, Tempowarnung, Punkte.
- **Verkehr**: einfacher Gegenverkehr auf Bahnen (hält an Ampel/Zebrastreifen), Polizei-Verfolgung wie im 2D-Modul.
- **Leistungsanzeige** (nur für Therapeuten, abschaltbar): FPS, Bildzeit, Draw Calls, Dreiecke, Texturspeicher.

## 5. Leistung und Qualitätsstufen

| Stufe | Auflösung | Schatten | Texturen | Sicht | Ziel |
|---|---|---|---|---|---|
| Niedrig (iMac 2012) | 0,75 × Fenster | aus / gebacken | 1K | 250 m | 30–60 FPS |
| Mittel | 1,0 × | 1024, eine Kaskade | 1K–2K | 400 m | 60 FPS |
| Hoch | 1,0 × (max. Retina 1,5) | 2048, weich | 2K | 600 m | 60 FPS auf aktuellen Macs |

Technik: Frustum Culling (Three.js), **GPU-Instancing** für Bäume/Zäune/Laternen/Autos, LOD (2–3 Stufen, Bäume ab Distanz als Billboard),
Abschnitts-Streaming entlang der Strecke (nur die nächsten ~400 m im Speicher), Texturatlas für Häuser, automatische Stufenwahl nach 3 s Messung (wie im 2D-Modul).

## 6. Asset-Pipeline

1. **Quellen (CC0)**: ambientCG (Asphalt, Pflaster, Putz, Dachziegel, Holz, Gras, Rinde), Poly Haven (HDRI-Himmel, ggf. Straßenmöbel),
   Kenney/Quaternius (Fahrzeuge, Bäume – low poly als Zwischenlösung).
2. **Aufbereitung** (Entwickler-Werkzeug `tools/assets3d_bauen.py`): Texturen auf 1K/2K verkleinern, als JPG (Albedo) bzw. PNG/JPG (Normal, Roughness, AO) speichern,
   Modelle als .glb (meshopt-komprimiert, Decoder ohne Nachladen), anschließend Base64 in `assets3d/*.js` schreiben.
3. **Lizenzliste** `assets3d/LIZENZEN.md`: Datei → Quelle → Lizenz → Datum.
4. **Lücken ehrlich kennzeichnen**: Wo es keine fotorealistischen CC0-Modelle gibt (v. a. moderne Autos, Laubbäume in hoher Qualität),
   wird eine **Asset-Liste + Blender-Ablauf** erstellt (Modellieren/Kaufen mit klarer Lizenz), statt Platzhalter als fertig auszugeben.

## 7. Meilensteine

| # | Inhalt | Nachweis | Aufwand (ca.) |
|---|---|---|---|
| M0 | Freigabe der Downloads (Abschnitt 8), Sicherung des Ordners | Liste bestätigt | – |
| M1 | Bündel Three.js + GLTFLoader (es2017), leere Szene unter file:// in Chrome 116 | Screenshot, FPS | 0,5 Tag |
| M2 | Straße, Gehweg, Häuser prozedural mit PBR, HDRI, Sonne, Schatten | Screenshots Fahrerperspektive | 1–2 Tage |
| M3 | 3D-Cockpit, Lenkrad, Kombiinstrument, Innenspiegel | Screenshot Cockpit | 1 Tag |
| M4 | Fahrdynamik + gemeinsame Trainingslogik + Auswertung | Testfahrt mit Ereignissen/Punkten im Verlauf | 1 Tag |
| M5 | Verkehr, Fußgänger, Ampel, Polizei | Testfahrt | 1 Tag |
| M6 | Qualitätsstufen, Instancing/LOD, Messung auf iMac 2012 (manuell) | FPS-Tabelle je Stufe | 0,5–1 Tag |

Erst wenn M1–M6 überzeugen, wird das Straßennetz erweitert (Landstraße, Wald, Ortsdurchfahrt, Nacht/Regen).

## 8. Downloads, die eine Freigabe brauchen (Phase 1)

Vor jedem Download werden **genaue Dateinamen, Quelle und Größe** genannt; geladen wird nur nach ausdrücklichem OK.
Voraussichtlich:

- `three` (npm, aktuelle Version) – ca. 30 MB entpackt, im Programm landet nur das Bündel (~0,7 MB)
- `esbuild` (npm) – ca. 10 MB, nur Entwickler-Werkzeug
- ambientCG: ca. 8 Texturen (1K und 2K, JPG) – zusammen ca. 40–60 MB Download, im Programm ca. 15–30 MB
- Poly Haven: 1 HDRI-Himmel (2K) – ca. 5–8 MB
- optional Kenney „Car Kit“ (CC0) – ca. 5 MB

Patientendaten werden dabei nirgendwohin übertragen; es werden nur öffentliche CC0-Dateien geladen.

## 9. Später (nicht im Prototyp)

- Für Asset-Mengen im Gigabyte-Bereich: Start über einen kleinen lokalen Server (nur 127.0.0.1) mit **einmaliger Datenübernahme**
  per verschlüsselter Sicherung, weil sich der Browser-Speicher mit der Adresse ändert.
- WebGPU-Renderer für neuere Macs, Außenspiegel, Nacht mit echten Scheinwerfer-Lichtkegeln, Regen mit Screen-Space-Reflexionen.

## 10. Risiken

- Leistung auf dem iMac 2012 (vor allem GT 640M) – Gegenmaßnahme: Stufe „Niedrig“ ohne Echtzeitschatten, 0,75-fache Auflösung.
- Speicherbedarf durch Base64 (+33 %) – Gegenmaßnahme: 1K-Texturen, Streaming in Abschnitten, Texturatlas.
- Fehlende fotorealistische CC0-Autos/Bäume – Gegenmaßnahme: Asset-Liste + Blender-Pipeline, Lizenzen dokumentiert.
- Safari 13 ohne WebGL 2 – Gegenmaßnahme: Modul nur in Chrome anbieten, sonst automatisch der 2D-Simulator.

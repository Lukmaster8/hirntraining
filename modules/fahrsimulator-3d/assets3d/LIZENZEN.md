# Lizenzen der 3D-Assets (Fahrsimulator 3D)

| Datei | Inhalt | Autor / Quelle | Lizenz | Hinweis |
|---|---|---|---|---|
| `golf.js` (aus `volkswagen_golf_gti_2025.glb`) | Volkswagen Golf GTI (2025), Innen- und Außenmodell | geyges – https://sketchfab.com/3d-models/volkswagen-golf-gti-2025-84fe6c2b9feb4c8a854d16f3daf33eab | Sketchfab Standard (https://sketchfab.com/licenses) | **Nur lokal/privat.** Steht in `.gitignore`, ist nicht in GitHub/GitHub Pages und nicht in der Offline-Liste (`sw.js`). Erzeugen mit `python3 tools/3d/golf_einbetten.py <Pfad zur .glb>`. |
| `../three-bundle.js` | Three.js r170 mit GLTFLoader, Sky, BufferGeometryUtils | three.js-Autoren – https://threejs.org | MIT | gebaut mit `tools/3d/bauen.sh` (esbuild 0.24, Ziel ES2017) |

Alle übrigen Bestandteile der Szene (Straße, Häuser, Bäume, Schilder, Texturen) werden im Programm selbst erzeugt.
Marken- und Produktnamen gehören ihren Inhabern; das Modell dient nur der Darstellung im Training.

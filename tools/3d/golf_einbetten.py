# -*- coding: utf-8 -*-
"""Bettet ein .glb-Fahrzeugmodell als Base64 in modules/fahrsimulator-3d/assets3d/golf.js ein (Laden unter file:// ohne fetch).
Die Ausgabedatei ist lizenzpflichtig (Sketchfab Standard) und steht in .gitignore – nie öffentlich hochladen.
Aufruf:  python3 tools/3d/golf_einbetten.py /Pfad/zu/volkswagen_golf_gti_2025.glb"""
import base64, os, sys, io, json, struct
quelle = sys.argv[1]
basis = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
ziel = os.path.join(basis, 'modules', 'fahrsimulator-3d', 'assets3d', 'golf.js')
daten = open(quelle, 'rb').read()
if daten[:4] != b'glTF': sys.exit('Keine GLB-Datei')
cl = struct.unpack('<I', daten[12:16])[0]; info = json.loads(daten[20:20 + cl]).get('asset', {}).get('extras', {})
b64 = base64.b64encode(daten).decode('ascii')
with io.open(ziel, 'w', encoding='utf-8') as f:
    f.write('/* Fahrzeugmodell „%s“ – Autor: %s – Lizenz: %s – Quelle: %s\n * Nur lokal/privat verwenden, nicht öffentlich weitergeben. Erzeugt von tools/3d/golf_einbetten.py */\n'
            % (info.get('title', ''), info.get('author', ''), info.get('license', ''), info.get('source', '')))
    f.write('window.HT3D_ASSETS = window.HT3D_ASSETS || {};\nHT3D_ASSETS.golfInfo = %s;\nHT3D_ASSETS.golf = "' % json.dumps(info, ensure_ascii=False))
    f.write(b64); f.write('";\n')
print('geschrieben:', ziel, round(os.path.getsize(ziel) / 1e6, 1), 'MB')

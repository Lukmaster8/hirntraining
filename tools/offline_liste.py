# -*- coding: utf-8 -*-
"""Schreibt sw.js neu: Liste aller Programmdateien für den Offline-Speicher (iPhone/iPad/Online-Version).
Nach jeder Änderung am Programm einmal ausführen:  python3 tools/offline_liste.py
Die Versionsnummer ändert sich dabei automatisch, damit Geräte die neuen Dateien laden."""
import hashlib, io, json, os
BASIS = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TEILE = ['index.html', 'manifest.webmanifest', 'assets', 'core', 'css', 'data', 'modules', 'audio']
dateien, h = [], hashlib.sha1()
for t in TEILE:
    p = os.path.join(BASIS, t)
    if os.path.isfile(p):
        liste = [t]
    else:
        liste = []
        for wurzel, _, fs in os.walk(p):
            for f in fs:
                if f.startswith('.'):
                    continue
                liste.append(os.path.relpath(os.path.join(wurzel, f), BASIS).replace(os.sep, '/'))
    for d in sorted(liste):
        dateien.append(d)
        with open(os.path.join(BASIS, d), 'rb') as fh:
            h.update(d.encode('utf-8')); h.update(fh.read())
vorlage = io.open(os.path.join(BASIS, 'tools', 'sw_vorlage.js'), encoding='utf-8').read()
js = vorlage.replace('__VERSION__', h.hexdigest()[:10]).replace('__DATEIEN__', json.dumps(['./'] + dateien, indent=1))
io.open(os.path.join(BASIS, 'sw.js'), 'w', encoding='utf-8').write(js)
print('sw.js geschrieben: %d Dateien, Version %s' % (len(dateien), h.hexdigest()[:10]))

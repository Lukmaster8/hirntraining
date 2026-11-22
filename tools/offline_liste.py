# -*- coding: utf-8 -*-
"""Schreibt sw.js neu (Liste aller Programmdateien für den Offline-Speicher der Online-Version) und
versieht in index.html alle Skripte und Stile mit der Versionsnummer (?v=…), damit jeder Browser –
auch beim lokalen Öffnen der index.html – sofort die neuen Dateien lädt statt alter Zwischenspeicher.
Nach jeder Änderung am Programm einmal ausführen:  python3 tools/offline_liste.py"""
import datetime, hashlib, io, json, os, re
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
        if d == 'index.html':
            continue  # wird unten mit der Versionsnummer neu geschrieben
        with open(os.path.join(BASIS, d), 'rb') as fh:
            h.update(d.encode('utf-8')); h.update(fh.read())
version = h.hexdigest()[:10]
stand = datetime.datetime.now().strftime('%d.%m.%Y %H:%M')
ip = os.path.join(BASIS, 'index.html')
html = io.open(ip, encoding='utf-8').read()
html = re.sub(r'((?:src|href)="(?!https?:|data:)[^"?]+\.(?:js|css))(?:\?v=[^"]*)?"', r'\1?v=' + version + '"', html)
stand_js = '<script>window.HT_STAND = { v: \'%s\', datum: \'%s\' };</script>' % (version, stand)
if 'window.HT_STAND' in html:
    html = re.sub(r'<script>window\.HT_STAND = [^<]*</script>', stand_js, html)
else:
    html = html.replace('  <script src="assets/icons.js', '  ' + stand_js + '\n  <script src="assets/icons.js', 1)
io.open(ip, 'w', encoding='utf-8').write(html)
vorlage = io.open(os.path.join(BASIS, 'tools', 'sw_vorlage.js'), encoding='utf-8').read()
js = vorlage.replace('__VERSION__', version).replace('__DATEIEN__', json.dumps(['./'] + dateien, indent=1))
io.open(os.path.join(BASIS, 'sw.js'), 'w', encoding='utf-8').write(js)
print('sw.js und index.html geschrieben: %d Dateien, Version %s, Stand %s' % (len(dateien), version, stand))

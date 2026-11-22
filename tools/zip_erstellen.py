# -*- coding: utf-8 -*-
"""Erzeugt Hirntraining.zip aus dem aktuellen Stand (zum Weitergeben oder Archivieren).
Ohne Git-Daten, Python-Zwischenspeicher, Sicherungsdateien und persönliche Prompt-Dateien.
Aufruf im Programmordner:  python3 tools/zip_erstellen.py   (ZIP nach Änderungen neu erzeugen)"""
import os, zipfile, datetime
BASIS = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ZIEL = os.path.join(BASIS, 'Hirntraining.zip')
AUSLASSEN_ORDNER = {'.git', '__pycache__', 'node_modules'}
def auslassen(rel):
    name = os.path.basename(rel)
    if name.startswith('.') or name.endswith(('.zip', '.htsich', '.pyc')): return True
    if name.lower().startswith('sicherung') or name.startswith('PROMPT_') or name.startswith('Prompt_'): return True
    return False
anzahl = 0
with zipfile.ZipFile(ZIEL, 'w', zipfile.ZIP_DEFLATED) as z:
    for wurzel, ordner, dateien in os.walk(BASIS):
        ordner[:] = [o for o in ordner if o not in AUSLASSEN_ORDNER and not o.startswith('.')]
        for d in sorted(dateien):
            voll = os.path.join(wurzel, d); rel = os.path.relpath(voll, BASIS)
            if auslassen(rel): continue
            z.write(voll, os.path.join('Hirntraining', rel)); anzahl += 1
print('Hirntraining.zip erstellt: %d Dateien, %s' % (anzahl, datetime.datetime.now().strftime('%d.%m.%Y %H:%M')))

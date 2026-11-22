# -*- coding: utf-8 -*-
"""
Hirntraining – Vorlesestimme mit ElevenLabs erzeugen.

Liest tools/sprachtexte.json, erzeugt für jeden Text eine MP3-Datei in audio/ (Stimme „Helmut“)
und schreibt data/sprachaudio.js, damit das Programm die Aufnahmen an den passenden Stellen abspielt.

* Bereits vorhandene Aufnahmen werden übersprungen – das Skript kann später mit neuen Credits erneut
  gestartet werden und ergänzt dann nur die fehlenden Texte.
* Es wird in der Reihenfolge der Priorität erzeugt (kurze, häufige Sätze zuerst, dann die Anleitungen),
  bis das Credit-Budget erreicht ist.
* Der API-Schlüssel wird nur abgefragt (nicht angezeigt) oder aus ELEVENLABS_API_KEY gelesen und nirgends gespeichert.

Aufruf:
  python3 tools/stimme_erzeugen.py            # erzeugen (fragt nach dem API-Schlüssel)
  python3 tools/stimme_erzeugen.py --probe    # nur anzeigen, was erzeugt würde und was es kostet
Optionen: --budget 900  --voice <ID>  --model eleven_turbo_v2_5
"""
from __future__ import print_function
import argparse
import getpass
import io
import json
import os
import re
import struct
import subprocess
import sys
import tempfile
import time
import wave

try:
    from urllib.request import Request, urlopen
    from urllib.error import HTTPError, URLError
except ImportError:  # Python 2
    from urllib2 import Request, urlopen, HTTPError, URLError

BASIS = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TEXTE = os.path.join(BASIS, 'tools', 'sprachtexte.json')
AUDIO = os.path.join(BASIS, 'audio')
ZUORDNUNG = os.path.join(BASIS, 'data', 'sprachaudio.js')
API = 'https://api.elevenlabs.io/v1'
STANDARD_STIMME = 'g1jpii0iyvtRs8fqXsd1'  # „Helmut“ (geteilte Stimme)


def kostenfaktor(modell):
    # Je nach Tarif kosten Turbo/Flash 0,5 oder 1 Credit pro Zeichen. Gerechnet wird vorsichtig mit 1 Credit,
    # damit das Budget sicher reicht (in diesem Konto wurde 1 Credit pro Zeichen abgerechnet).
    return 1.0


def anfrage(pfad, schluessel, daten=None, roh=False):
    kopf = {'xi-api-key': schluessel, 'Accept': 'audio/mpeg' if roh else 'application/json'}
    body = None
    if daten is not None:
        body = json.dumps(daten).encode('utf-8')
        kopf['Content-Type'] = 'application/json'
    req = Request(API + pfad, data=body, headers=kopf)
    antwort = urlopen(req, timeout=120)
    inhalt = antwort.read()
    return inhalt if roh else json.loads(inhalt.decode('utf-8'))


def wortzeiten(datei, text):
    """Schätzt für jedes Wort (Trennung an Leerzeichen) die Startzeit in Sekunden.
    Die MP3 wird mit afconvert (macOS) dekodiert; Sprechpausen werden über die Lautstärke erkannt und
    die Wörter nach Silbenlänge (+ Satzzeichenpausen) auf die tatsächlich gesprochene Zeit verteilt."""
    woerter = text.split()
    if not woerter:
        return []
    try:
        tmp = tempfile.mktemp(suffix='.wav')
        subprocess.check_call(['afconvert', '-f', 'WAVE', '-d', 'LEI16@16000', '-c', '1', datei, tmp],
                              stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        w = wave.open(tmp, 'rb'); n = w.getnframes(); roh = w.readframes(n); rate = w.getframerate(); w.close()
        os.remove(tmp)
    except Exception:
        return None
    proben = struct.unpack('<%dh' % (len(roh) // 2), roh)
    fenster = int(rate * 0.02)
    pegel = []
    for i in range(0, len(proben) - fenster, fenster):
        ab = proben[i:i + fenster]
        pegel.append((sum(x * x for x in ab) / float(len(ab))) ** 0.5)
    if not pegel:
        return None
    schwelle = max(pegel) * 0.06
    aktiv = [1 if p > schwelle else 0 for p in pegel]
    # kurze Lücken (< 120 ms) innerhalb von Wörtern schließen
    i = 0
    while i < len(aktiv):
        if not aktiv[i]:
            j = i
            while j < len(aktiv) and not aktiv[j]:
                j += 1
            if 0 < i and j < len(aktiv) and (j - i) * 0.02 < 0.12:
                for k in range(i, j):
                    aktiv[k] = 1
            i = j
        else:
            i += 1
    # Wortgewichte: Vokalgruppen (≈ Silben) + Buchstaben, Satzzeichen-Pause am Wortende
    def gewicht(w):
        sauber = re.sub(r'[^A-Za-zÄÖÜäöüß0-9]', '', w)
        silben = max(1, len(re.findall(r'[aeiouyäöü]+', sauber.lower())))
        return silben * 1.0 + len(sauber) * 0.08
    gew = [gewicht(w) for w in woerter]
    zeiten_aktiv = [k for k, a in enumerate(aktiv) if a]
    if not zeiten_aktiv:
        return None

    def verteilen(ws, rahmen):
        """Wörter (Gewichte ws) auf die aktiven Rahmen eines Abschnitts verteilen."""
        g = float(sum(ws)) or 1.0
        out, kum = [], 0.0
        for x in ws:
            out.append(round(rahmen[int(round(kum / g * (len(rahmen) - 1)))] * 0.02, 2))
            kum += x
        return out

    # Sprechabschnitte (getrennt durch Pausen >= 160 ms) den Satzteilen (bis , . ! ? : ;) zuordnen
    abschnitte, akt, luecke = [], [], 0
    for k, a in enumerate(aktiv):
        if a:
            if akt and luecke >= 8:
                abschnitte.append(akt); akt = []
            akt.append(k); luecke = 0
        else:
            luecke += 1
    if akt:
        abschnitte.append(akt)
    phrasen, cur = [], []
    for i, w in enumerate(woerter):
        cur.append(i)
        if re.search(r'[,.!?:;]$', w) or w in ('–', '-'):
            phrasen.append(cur); cur = []
    if cur:
        phrasen.append(cur)
    # zu viele Abschnitte: kleinste Pausen zusammenlegen
    while len(abschnitte) > len(phrasen) and len(abschnitte) > 1:
        pausen = [abschnitte[j + 1][0] - abschnitte[j][-1] for j in range(len(abschnitte) - 1)]
        j = pausen.index(min(pausen))
        abschnitte[j] = abschnitte[j] + list(range(abschnitte[j][-1] + 1, abschnitte[j + 1][0])) + abschnitte[j + 1]
        del abschnitte[j + 1]
    if len(abschnitte) == len(phrasen) and len(phrasen) > 1:
        starts = []
        for ph, ab in zip(phrasen, abschnitte):
            starts += verteilen([gew[i] for i in ph], ab)
        return starts
    return verteilen(gew, zeiten_aktiv)


def sprechtext(text):
    """Wörter in GROSSBUCHSTABEN (z. B. ROT, GRÜN) klein schreiben – sonst liest die Stimme sie
    manchmal wie Abkürzungen Buchstabe für Buchstabe oder undeutlich vor."""
    return re.sub(r'\b[A-ZÄÖÜ]{3,}\b', lambda m: m.group(0).lower(), text)


def zuordnung_schreiben(texte):
    eintraege = {}
    zeiten = {}
    for t in texte:
        datei = os.path.join(AUDIO, t['id'] + '.mp3')
        if os.path.isfile(datei) and os.path.getsize(datei) > 1000:
            pfad = 'audio/' + t['id'] + '.mp3'
            eintraege[t['ausloeser'].strip()] = pfad
            wz = wortzeiten(datei, t['ausloeser'].strip())
            if wz:
                zeiten[pfad] = wz
    js = ('/* Automatisch erzeugt von tools/stimme_erzeugen.py – Zuordnung Text → Aufnahme (Stimme „Helmut“, ElevenLabs)\n'
          ' * HT.SPRACHZEITEN: Startzeit (s) jedes Wortes für die Mitlese-Hervorhebung. */\n'
          'window.HT = window.HT || {};\nHT.SPRACHAUDIO = ' + json.dumps(eintraege, ensure_ascii=False, indent=1) + ';\n'
          'HT.SPRACHZEITEN = ' + json.dumps(zeiten, ensure_ascii=False) + ';\n')
    with io.open(ZUORDNUNG, 'w', encoding='utf-8') as f:
        f.write(js if isinstance(js, type(u'')) else js.decode('utf-8'))
    return len(eintraege)


def main():
    ap = argparse.ArgumentParser(description='Vorlesestimme mit ElevenLabs erzeugen')
    ap.add_argument('--budget', type=float, default=None, help='höchstens so viele Credits verbrauchen (Standard: verbleibende Credits, max. 900)')
    ap.add_argument('--voice', default=STANDARD_STIMME)
    ap.add_argument('--model', default='eleven_multilingual_v2')
    ap.add_argument('--probe', action='store_true', help='nur anzeigen, nichts erzeugen')
    ap.add_argument('--nur-zuordnung', action='store_true', help='nur data/sprachaudio.js aus vorhandenen Aufnahmen neu schreiben')
    args = ap.parse_args()
    if args.nur_zuordnung:
        with io.open(TEXTE, 'r', encoding='utf-8') as f:
            print('Zuordnung geschrieben: %d Aufnahmen' % zuordnung_schreiben(json.load(f)))
        return 0

    with io.open(TEXTE, 'r', encoding='utf-8') as f:
        texte = sorted(json.load(f), key=lambda t: t['prio'])
    if not os.path.isdir(AUDIO):
        os.makedirs(AUDIO)
    faktor = kostenfaktor(args.model)
    offen = [t for t in texte if not os.path.isfile(os.path.join(AUDIO, t['id'] + '.mp3'))]
    print('Texte gesamt: %d · bereits vorhanden: %d · fehlen: %d' % (len(texte), len(texte) - len(offen), len(offen)))
    print('Modell: %s (%.1f Credits je Zeichen) · Stimme: %s' % (args.model, faktor, args.voice))

    schluessel = None
    verbleibend = None
    if not args.probe:
        schluessel = os.environ.get('ELEVENLABS_API_KEY') or getpass.getpass('ElevenLabs-API-Schlüssel (Eingabe wird nicht angezeigt): ').strip()
        if not schluessel:
            print('Kein Schlüssel eingegeben – Abbruch.'); return 1
        try:
            abo = anfrage('/user/subscription', schluessel)
            verbleibend = abo.get('character_limit', 0) - abo.get('character_count', 0)
            print('Verbleibende Credits laut ElevenLabs: %d' % verbleibend)
        except HTTPError as e:
            print('Hinweis: Credits konnten nicht abgefragt werden (%s). Es gilt das angegebene Budget.' % e.code)
        try:
            anfrage('/voices/' + args.voice, schluessel)
        except HTTPError as e:
            print('\nDie Stimme %s ist in Ihrem Konto nicht verfügbar (Fehler %s).' % (args.voice, e.code))
            print('Bitte die Stimme in der ElevenLabs Voice Library öffnen und „Add to my voices“ wählen, dann erneut starten.')
            return 1

    budget = args.budget if args.budget is not None else 900.0
    if verbleibend is not None:
        budget = min(budget, verbleibend - 5)
    print('Budget für diesen Lauf: %d Credits\n' % budget)

    verbraucht = 0.0
    erzeugt = 0
    for t in offen:
        kosten = len(t['text']) * faktor
        if verbraucht + kosten > budget:
            print('  übersprungen (Budget): %-34s %4d Credits' % (t['id'], kosten))
            continue
        if args.probe:
            print('  würde erzeugen:        %-34s %4d Credits' % (t['id'], kosten))
            verbraucht += kosten
            continue
        daten = {
            'text': sprechtext(t['text']), 'model_id': args.model, 'language_code': 'de',
            'voice_settings': {'stability': 0.55, 'similarity_boost': 0.8, 'style': 0.15, 'use_speaker_boost': True}
        }
        try:
            mp3 = anfrage('/text-to-speech/' + args.voice + '?output_format=mp3_44100_128', schluessel, daten, roh=True)
        except HTTPError as e:
            meldung = e.read().decode('utf-8', 'ignore')[:300]
            print('  FEHLER bei %s: %s %s' % (t['id'], e.code, meldung))
            if e.code in (401, 402, 429):
                break
            continue
        except URLError as e:
            print('  Keine Internetverbindung (%s) – Abbruch.' % e); break
        with open(os.path.join(AUDIO, t['id'] + '.mp3'), 'wb') as f:
            f.write(mp3)
        verbraucht += kosten
        erzeugt += 1
        print('  erzeugt:               %-34s %4d Credits' % (t['id'], kosten))
        time.sleep(0.3)

    # Bei der Vorschau nichts schreiben – sonst könnte eine leere Zuordnung die vorhandene überschreiben
    anzahl = zuordnung_schreiben(texte) if not args.probe else len(texte) - len(offen)
    print('\n%s: %d Aufnahmen, ca. %d Credits. Insgesamt im Programm verfügbar: %d von %d Texten.' % ('Vorschau' if args.probe else 'Fertig', erzeugt if not args.probe else 0, verbraucht, anzahl, len(texte)))
    if not args.probe:
        print('Das Programm (index.html) einfach neu laden – die Aufnahmen werden automatisch verwendet.')
    return 0


if __name__ == '__main__':
    sys.exit(main())

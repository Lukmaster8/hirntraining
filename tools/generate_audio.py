# -*- coding: utf-8 -*-
"""Fehlende Sprachaufnahmen mit ElevenLabs erzeugen (Stimme „Helmut“).

* Liest audio/audio_manifest.json und erzeugt NUR Einträge, deren Datei noch fehlt – vorhandene Aufnahmen werden nie
  neu erzeugt. Bricht der Lauf ab (Netz, zu wenig Credits), macht der nächste Aufruf genau dort weiter.
* Der API-Schlüssel kommt ausschließlich aus der Umgebungsvariable ELEVENLABS_API_KEY und wird nirgends gespeichert.
* Es werden nur feste Programmtexte aus dem Manifest gesendet – keine Patientendaten.
* Modell eleven_multilingual_v2, stability 0.5, similarity_boost 0.75, ruhiges Tempo, Ausgabe mp3_44100_128.
* Danach wird data/sprachaudio.js (Zuordnung Text → Datei + Wortzeiten fürs Mitlesen) aktualisiert.

Aufruf im Programmordner:
  python3 tools/generate_audio.py --probe            # nur anzeigen, was fehlt und wie viele Zeichen das sind
  python3 tools/generate_audio.py                     # Pflicht-Texte erzeugen
  python3 tools/generate_audio.py --gruppe alle       # zusätzlich optionale Texte (Wortlisten, Lesetexte)
  python3 tools/generate_audio.py --nur levelauf,richtig
  python3 tools/generate_audio.py --nur-zuordnung     # nur data/sprachaudio.js neu schreiben
"""
import argparse, io, json, os, re, sys, time
import urllib.request, urllib.error

BASIS = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MANIFEST = os.path.join(BASIS, 'audio', 'audio_manifest.json')
ZUORDNUNG = os.path.join(BASIS, 'data', 'sprachaudio.js')
API = 'https://api.elevenlabs.io'
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))


class Abbruch(Exception):
    pass


def anfrage(pfad, schluessel, daten=None, roh=False, versuche=3):
    kopf = {'xi-api-key': schluessel, 'Accept': 'audio/mpeg' if roh else 'application/json'}
    body = None
    if daten is not None:
        body = json.dumps(daten).encode('utf-8'); kopf['Content-Type'] = 'application/json'
    for n in range(versuche):
        try:
            req = urllib.request.Request(API + pfad, data=body, headers=kopf, method='POST' if body else 'GET')
            with urllib.request.urlopen(req, timeout=90) as r:
                inhalt = r.read()
                return inhalt if roh else json.loads(inhalt.decode('utf-8'))
        except urllib.error.HTTPError as e:
            text = e.read().decode('utf-8', 'replace')
            if e.code == 401 and 'quota' in text.lower():
                raise Abbruch('Zu wenig ElevenLabs-Credits. Beim nächsten Aufruf geht es an dieser Stelle weiter.')
            if e.code == 401:
                raise Abbruch('Der API-Schlüssel wurde abgelehnt (401). Bitte ELEVENLABS_API_KEY prüfen.')
            if e.code in (402,) or 'quota_exceeded' in text:
                raise Abbruch('Zu wenig ElevenLabs-Credits. Beim nächsten Aufruf geht es an dieser Stelle weiter.')
            if e.code == 429 and n < versuche - 1:
                time.sleep(8 * (n + 1)); continue
            if e.code >= 500 and n < versuche - 1:
                time.sleep(4 * (n + 1)); continue
            raise Abbruch('Fehler %d von ElevenLabs: %s' % (e.code, text[:300]))
        except (urllib.error.URLError, TimeoutError, OSError) as e:
            if n < versuche - 1:
                time.sleep(4 * (n + 1)); continue
            raise Abbruch('Keine Verbindung zu ElevenLabs (%s). Später erneut starten – es geht hier weiter.' % e)


def sprechtext(e):
    """Text für die Stimme: Großbuchstaben-Wörter (ROT, GRÜN) klein, damit sie nicht buchstabiert werden."""
    t = e.get('sprechtext') or e['text']
    return re.sub(r'\b[A-ZÄÖÜ]{3,}\b', lambda m: m.group(0).lower(), t)


def stimme_finden(schluessel, name='Helmut'):
    d = anfrage('/v1/voices', schluessel)
    stimmen = d.get('voices', [])
    for v in stimmen:
        if v.get('name', '').strip().lower() == name.lower():
            return v['voice_id']
    for v in stimmen:
        if v.get('name', '').strip().lower().startswith(name.lower()):
            return v['voice_id']
    raise Abbruch('Stimme „%s“ nicht gefunden. Vorhanden: %s' % (name, ', '.join(v.get('name', '?') for v in stimmen)[:400]))


def rest_credits(schluessel):
    try:
        s = anfrage('/v1/user/subscription', schluessel)
        return int(s.get('character_limit', 0)) - int(s.get('character_count', 0))
    except Abbruch:
        return None


def zuordnung_schreiben(manifest):
    """data/sprachaudio.js: vorhandene Zuordnung behalten, neue Dateien ergänzen, Wortzeiten berechnen."""
    alt_audio, alt_zeiten = {}, {}
    if os.path.isfile(ZUORDNUNG):
        s = io.open(ZUORDNUNG, encoding='utf-8').read()
        m = re.search(r'HT\.SPRACHAUDIO\s*=\s*(\{.*?\});', s, re.S)
        if m: alt_audio = json.loads(m.group(1))
        m = re.search(r'HT\.SPRACHZEITEN\s*=\s*(\{.*?\});', s, re.S)
        if m: alt_zeiten = json.loads(m.group(1))
    try:
        from stimme_erzeugen import wortzeiten
    except Exception:
        wortzeiten = None
    audio, zeiten = dict(alt_audio), dict(alt_zeiten)
    for e in manifest['eintraege']:
        pfad = os.path.join(BASIS, e['datei'])
        if os.path.isfile(pfad) and os.path.getsize(pfad) > 1000:
            audio[e['text']] = e['datei']
            if e['datei'] not in zeiten and wortzeiten and len(e['text'].split()) > 1:
                try:
                    zeiten[e['datei']] = wortzeiten(pfad, e['text'])
                except Exception:
                    pass
    io.open(ZUORDNUNG, 'w', encoding='utf-8').write(
        '/* Automatisch erzeugt von tools/generate_audio.py – Zuordnung Text → Aufnahme (Stimme „Helmut“, ElevenLabs)\n'
        ' * HT.SPRACHZEITEN: Startzeit (s) jedes Wortes für die Mitlese-Hervorhebung. */\n'
        'window.HT = window.HT || {};\n'
        'HT.SPRACHAUDIO = ' + json.dumps(audio, ensure_ascii=False, indent=1) + ';\n'
        'HT.SPRACHZEITEN = ' + json.dumps(zeiten, ensure_ascii=False) + ';\n')
    return len(audio)


def main():
    ap = argparse.ArgumentParser(description='Fehlende Sprachaufnahmen erzeugen')
    ap.add_argument('--gruppe', choices=['pflicht', 'alle'], default='pflicht')
    ap.add_argument('--nur', default='', help='nur diese IDs (Komma-getrennt)')
    ap.add_argument('--probe', action='store_true', help='nichts senden, nur auflisten')
    ap.add_argument('--nur-zuordnung', action='store_true')
    ap.add_argument('--tempo', type=float, default=0.92, help='Sprechtempo (0.7–1.2), Standard ruhig 0.92')
    a = ap.parse_args()
    manifest = json.load(io.open(MANIFEST, encoding='utf-8'))
    if a.nur_zuordnung:
        print('data/sprachaudio.js geschrieben: %d Zuordnungen.' % zuordnung_schreiben(manifest)); return
    nur = set(x.strip() for x in a.nur.split(',') if x.strip())
    offen = [e for e in manifest['eintraege']
             if not (os.path.isfile(os.path.join(BASIS, e['datei'])) and os.path.getsize(os.path.join(BASIS, e['datei'])) > 1000)
             and (a.gruppe == 'alle' or e.get('gruppe') == 'pflicht') and (not nur or e['id'] in nur)]
    zeichen = sum(len(sprechtext(e)) for e in offen)
    print('Fehlende Aufnahmen: %d · etwa %d Zeichen (≈ Credits bei eleven_multilingual_v2)' % (len(offen), zeichen))
    if a.probe:
        for e in offen: print('  %-34s %5d  %s' % (e['id'], len(sprechtext(e)), e['text'][:70]))
        return
    if not offen:
        print('Nichts zu tun.'); zuordnung_schreiben(manifest); return
    schluessel = os.environ.get('ELEVENLABS_API_KEY', '').strip()
    if not schluessel:
        print('ELEVENLABS_API_KEY ist nicht gesetzt. Im Terminal z. B.:  export ELEVENLABS_API_KEY=…  (der Schlüssel wird nicht gespeichert)'); sys.exit(2)
    fertig = 0
    try:
        stimme = stimme_finden(schluessel)
        rest = rest_credits(schluessel)
        if rest is not None:
            print('Verfügbare Credits laut Konto: %d' % rest)
            if rest < zeichen: print('Achtung: Die Credits reichen nicht für alles – es wird erzeugt, bis sie aufgebraucht sind.')
        for e in offen:
            ziel = os.path.join(BASIS, e['datei'])
            os.makedirs(os.path.dirname(ziel), exist_ok=True)
            daten = {'text': sprechtext(e), 'model_id': manifest.get('modell', 'eleven_multilingual_v2'),
                     'voice_settings': {'stability': 0.5, 'similarity_boost': 0.75, 'style': 0.0, 'use_speaker_boost': True, 'speed': max(0.7, min(1.2, a.tempo))}}
            mp3 = anfrage('/v1/text-to-speech/%s?output_format=%s' % (stimme, manifest.get('format', 'mp3_44100_128')), schluessel, daten, roh=True)
            if not mp3 or len(mp3) < 1000:
                raise Abbruch('Leere Antwort für %s – später erneut versuchen.' % e['id'])
            teil = ziel + '.part'
            with open(teil, 'wb') as f: f.write(mp3)
            os.replace(teil, ziel)  # erst nach vollständigem Schreiben übernehmen (Fortsetzen nach Abbruch)
            fertig += 1
            print('  ✓ %s (%d/%d)' % (e['id'], fertig, len(offen)))
    except Abbruch as x:
        print('\nAbgebrochen: %s' % x)
    except KeyboardInterrupt:
        print('\nVom Benutzer abgebrochen – beim nächsten Aufruf geht es hier weiter.')
    n = zuordnung_schreiben(manifest)
    print('\n%d neue Aufnahmen. data/sprachaudio.js: %d Zuordnungen. Danach bitte  python3 tools/offline_liste.py  ausführen.' % (fertig, n))


if __name__ == '__main__':
    main()

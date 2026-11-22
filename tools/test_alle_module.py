# -*- coding: utf-8 -*-
"""Automatischer Test aller Module (nur für Entwickler, gehört nicht in sw.js).

Öffnet index.html per file:// in Chromium und WebKit (1280 × 700), legt Testdaten an, öffnet alle Hauptseiten,
startet jedes Modul über HT.session.ausprobieren(id, 3), klickt durch Anleitung/Übung, sendet Tasten
(Leertaste, Pfeile, Ziffern, Enter) und Klicks und sammelt Konsolenfehler, pageerror und externe Anfragen.
Ziel: 0 Fehler, 0 externe Requests.

Einmalig einrichten:  pip3 install playwright && python3 -m playwright install chromium webkit
Aufruf im Programmordner:  python3 tools/test_alle_module.py  [--nur chromium|webkit] [--module id1,id2]
"""
import os, sys, time, argparse

BASIS = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
URL = 'file://' + os.path.join(BASIS, 'index.html')
SEITEN = ['#/arbeitsplatz', '#/uebersicht', '#/patienten', '#/module', '#/auswertung', '#/einstellungen', '#/verwaltung/datenschutz', '#/hilfe']

ANMELDEN = """async () => {
  var S = HT.storage;
  if (!S.alle('therapists').length) await HT.auth.anlegen({ name: 'Test Admin', pin: '4711', rolle: 'admin' });
  var t = S.alle('therapists').filter(function (x) { return x.rolle === 'admin'; })[0] || S.alle('therapists')[0];
  HT.auth.anmelden(t);
  if (!S.alle('patients').length && HT.testdaten) { try { await HT.testdaten.erzeugen(t.id); } catch (e) {} }
  return HT.Module.liste.map(function (m) { return m.id; });
}"""


def teste(browser_typ, nur_module):
    from playwright.sync_api import sync_playwright
    fehler, extern = [], []
    with sync_playwright() as pw:
        browser = getattr(pw, browser_typ).launch()
        seite = browser.new_page(viewport={'width': 1280, 'height': 700})
        seite.on('console', lambda m: fehler.append('console: ' + m.text) if m.type == 'error' else None)
        seite.on('pageerror', lambda e: fehler.append('pageerror: ' + str(e)))
        seite.on('request', lambda r: extern.append(r.url) if r.url.startswith('http') else None)
        seite.goto(URL)
        seite.wait_for_function('window.HT && HT.Module && HT.Module.liste.length > 0', timeout=15000)
        ids = seite.evaluate(ANMELDEN)
        if nur_module: ids = [i for i in ids if i in nur_module]
        for s in SEITEN:
            seite.evaluate("h => { location.hash = h; }", s); time.sleep(0.8)
        for mid in ids:
            vorher = len(fehler)
            seite.evaluate("id => HT.session.ausprobieren(id, 3)", mid); time.sleep(0.6)
            seite.evaluate("""() => { var k = [].filter.call(document.querySelectorAll('.t-schirm button'), function (x) { return /Ohne Übung|Training starten/.test(x.textContent); })[0]; if (k) k.click(); }""")
            time.sleep(3.5)
            for taste in ['Space', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Digit1', 'Digit2', 'Enter']:
                seite.keyboard.press(taste); time.sleep(0.15)
            seite.evaluate("""() => { var bs = [].slice.call(document.querySelectorAll('.modul-container button:not([disabled])')); for (var i = 0; i < Math.min(3, bs.length); i++) bs[Math.floor(Math.random() * bs.length)].click(); }""")
            time.sleep(0.8)
            seite.evaluate("""() => { var p = document.querySelector('.tk-pause'); if (p) p.click(); }"""); time.sleep(0.3)
            seite.evaluate("""() => { var k = [].filter.call(document.querySelectorAll('.pause-schleier button'), function (x) { return /Beenden/.test(x.textContent); })[0]; if (k) k.click(); }"""); time.sleep(0.7)
            seite.evaluate("""() => { var k = [].filter.call(document.querySelectorAll('.training button'), function (x) { return /Schließen|Fertig|Zurück|Beenden/.test(x.textContent); })[0]; if (k) k.click(); }"""); time.sleep(0.4)
            if seite.evaluate("() => !!document.querySelector('.training')"):
                seite.reload(); seite.wait_for_function('window.HT && HT.Module && HT.Module.liste.length > 0'); seite.evaluate(ANMELDEN)
            neu = fehler[vorher:]
            print('  %-28s %s' % (mid, 'ok' if not neu else 'FEHLER: ' + ' | '.join(neu)[:300]))
        browser.close()
    return fehler, extern


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--nur', choices=['chromium', 'webkit'])
    ap.add_argument('--module', default='')
    a = ap.parse_args()
    try:
        import playwright  # noqa
    except ImportError:
        print('Playwright fehlt. Einmalig: pip3 install playwright && python3 -m playwright install chromium webkit'); sys.exit(2)
    nur = [x for x in a.module.split(',') if x]
    gesamt = 0
    for typ in ([a.nur] if a.nur else ['chromium', 'webkit']):
        print('== ' + typ)
        f, e = teste(typ, nur)
        print('   Fehler: %d · externe Anfragen: %d' % (len(f), len(e)))
        for x in e[:10]: print('   extern: ' + x)
        gesamt += len(f) + len(e)
    sys.exit(1 if gesamt else 0)


if __name__ == '__main__':
    main()

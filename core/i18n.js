/* Hirntraining – zentrale deutsche Texte. HT.t('schluessel', {platzhalter}) */
(function () {
  'use strict';
  var HT = window.HT = window.HT || {};
  var DE = {
    app: 'Hirntraining',
    untertitel: 'Kognitives Training für die Ergotherapie',
    nav_uebersicht: 'Übersicht', nav_patienten: 'Patienten', nav_module: 'Modulbibliothek',
    nav_auswertung: 'Auswertung', nav_verwaltung: 'Verwaltung', nav_einstellungen: 'Einstellungen',
    therapeut: 'Therapeut', patient_starten: 'Patient starten',
    therapeut_text: 'Patienten verwalten, Pläne erstellen und Ergebnisse auswerten',
    patient_text: 'Direkt mit dem eigenen Trainingsplan beginnen',
    abmelden: 'Abmelden', vollbild: 'Vollbild', speichern: 'Speichern', abbrechen: 'Abbrechen',
    loeschen: 'Löschen', bearbeiten: 'Bearbeiten', schliessen: 'Schließen', weiter: 'Weiter', zurueck: 'Zurück',
    ok: 'OK', ja: 'Ja', nein: 'Nein', neu: 'Neu', suchen: 'Suchen …',
    pin_eingeben: 'PIN eingeben', pin_falsch: 'Die PIN ist nicht korrekt.',
    neuer_patient: 'Neuer Patient', keine_patienten: 'Noch keine Patienten angelegt.',
    sitzung_starten: 'Sitzung starten', los_gehts: 'Los geht’s', uebung: 'Übung',
    uebung_text: 'Zuerst drei Probeaufgaben – sie werden nicht gewertet.',
    uebung_fertig: 'Prima! Die Übung ist geschafft. Jetzt beginnt das Training.',
    pause: 'Pause', fortsetzen: 'Fortsetzen', modul_ueberspringen: 'Modul überspringen', sitzung_beenden: 'Sitzung beenden',
    pausenhinweis: 'Zeit für eine kurze Pause!', pausenhinweis_text: 'Schließen Sie kurz die Augen, atmen Sie tief durch und lockern Sie die Schultern.',
    gespeichert: 'Gespeichert', geloescht: 'Gelöscht',
    backup_faellig: 'Die letzte Datensicherung ist mehr als {tage} Tage her.',
    backup_nie: 'Es wurde noch keine Datensicherung erstellt.',
    motivation_3: ['Hervorragend!', 'Ausgezeichnet gemacht!', 'Super Leistung!', 'Spitze!'],
    motivation_2: ['Gut gemacht!', 'Weiter so!', 'Schöne Leistung!', 'Das war gut!'],
    motivation_1: ['Dranbleiben – das wird!', 'Guter Einsatz!', 'Jeder Durchgang trainiert!', 'Nicht aufgeben!'],
    level_auf: 'Level aufgestiegen', level_ab: 'Level angepasst', level_gleich: 'Level gehalten'
  };
  HT.texte = DE;
  HT.t = function (k, vars) {
    var s = DE[k];
    if (s === undefined) return k;
    if (Array.isArray(s)) s = s[Math.floor(Math.random() * s.length)];
    if (vars) Object.keys(vars).forEach(function (v) { s = s.split('{' + v + '}').join(vars[v]); });
    return s;
  };
})();

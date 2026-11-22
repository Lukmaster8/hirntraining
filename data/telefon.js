/* Hirntraining – Nachrichten für „Telefonnotizen“ (selbst formuliert, Namen und Nummern frei erfunden).
 * Jede Nachricht hat eine feste id (telefon-01 …), damit eine MP3 mit der Vorlesestimme erzeugt werden kann.
 * felder: name · firma · nummer · anliegen · termin · rueckruf (nicht jede Nachricht enthält alle) */
(function () {
  'use strict';
  var HT = window.HT = window.HT || {};
  HT.data = HT.data || {};
  var T = HT.data.telefon = [
    { id: 'telefon-01', felder: { name: 'Frau Berger', nummer: '4 7 1 2', anliegen: 'Termin absagen' } },
    { id: 'telefon-02', felder: { name: 'Herr Krämer', nummer: '3 9 5 8', anliegen: 'Rezept abholen' } },
    { id: 'telefon-03', felder: { name: 'Frau Lindner', nummer: '6 2 0 4', anliegen: 'Rückruf wegen Rechnung' } },
    { id: 'telefon-04', felder: { name: 'Herr Wolf', nummer: '5 1 7 3', anliegen: 'Paket ist angekommen' } },
    { id: 'telefon-05', felder: { name: 'Frau Sommer', nummer: '8 4 6 1', anliegen: 'Termin verschieben' } },
    { id: 'telefon-06', felder: { name: 'Herr Hoffmann', nummer: '2 8 3 9', anliegen: 'Unterlagen fehlen' } },
    { id: 'telefon-07', felder: { name: 'Frau Neumann', nummer: '7 3 5 0', anliegen: 'Brille ist fertig' } },
    { id: 'telefon-08', felder: { name: 'Herr Schäfer', nummer: '9 0 2 6', anliegen: 'Auto ist repariert' } },
    { id: 'telefon-09', felder: { name: 'Frau Keller', firma: 'Praxis am Markt', nummer: '3 6 1 8 4', anliegen: 'Termin bestätigen', termin: 'Dienstag um 10 Uhr' } },
    { id: 'telefon-10', felder: { name: 'Herr Vogel', firma: 'Autohaus Süd', nummer: '5 2 9 7 1', anliegen: 'Inspektion fällig', termin: 'Montag um 8 Uhr' } },
    { id: 'telefon-11', felder: { name: 'Frau Richter', firma: 'Stadtbücherei', nummer: '4 8 0 3 6', anliegen: 'Buch zurückgeben', termin: 'Freitag um 14 Uhr' } },
    { id: 'telefon-12', felder: { name: 'Herr Braun', firma: 'Gärtnerei Grün', nummer: '7 1 4 2 9', anliegen: 'Pflanzen abholen', termin: 'Mittwoch um 16 Uhr' } },
    { id: 'telefon-13', felder: { name: 'Frau Hartmann', firma: 'Sparkasse', nummer: '6 9 3 5 2', anliegen: 'neue Bankkarte', termin: 'Donnerstag um 11 Uhr' } },
    { id: 'telefon-14', felder: { name: 'Herr Lange', firma: 'Malerbetrieb Lange', nummer: '2 5 8 1 7', anliegen: 'Angebot besprechen', termin: 'Dienstag um 15 Uhr' } },
    { id: 'telefon-15', felder: { name: 'Frau Schulte', firma: 'Zahnarztpraxis', nummer: '8 3 6 0 4 1', anliegen: 'Kontrolltermin', termin: 'Montag um 9 Uhr', rueckruf: 'bis morgen Mittag' } },
    { id: 'telefon-16', felder: { name: 'Herr Kaiser', firma: 'Hausverwaltung', nummer: '4 0 7 2 9 5', anliegen: 'Heizung ablesen', termin: 'Freitag um 13 Uhr', rueckruf: 'bis heute Abend' } },
    { id: 'telefon-17', felder: { name: 'Frau Seidel', firma: 'Reisebüro Sonne', nummer: '9 1 5 3 8 2', anliegen: 'Reise buchen', termin: 'Mittwoch um 10 Uhr', rueckruf: 'bis Donnerstag' } },
    { id: 'telefon-18', felder: { name: 'Herr Engel', firma: 'Elektro Engel', nummer: '3 7 2 6 0 8', anliegen: 'Lampe montieren', termin: 'Donnerstag um 17 Uhr', rueckruf: 'bis morgen früh' } },
    { id: 'telefon-19', felder: { name: 'Frau Pohl', firma: 'Physiotherapie Pohl', nummer: '5 6 9 1 4 7', anliegen: 'neues Rezept mitbringen', termin: 'Dienstag um 8 Uhr', rueckruf: 'bis Freitag' } },
    { id: 'telefon-20', felder: { name: 'Herr Franke', firma: 'Bäckerei Franke', nummer: '2 9 4 8 3 1', anliegen: 'Torte bestellt', termin: 'Samstag um 9 Uhr', rueckruf: 'bis heute Mittag' } }
  ];
  /* Gesprochener Text: kurz, ruhig, deutliche Ziffern */
  T.forEach(function (n) {
    var f = n.felder, s = 'Guten Tag, hier spricht ' + f.name + (f.firma ? ' von ' + f.firma : '') + '. ';
    s += 'Es geht um Folgendes: ' + f.anliegen + '. ';
    if (f.termin) s += 'Der Termin ist am ' + f.termin + '. ';
    s += 'Bitte rufen Sie mich zurück unter ' + f.nummer.split(' ').join(', ') + '. ';
    if (f.rueckruf) s += 'Am besten ' + f.rueckruf + '. ';
    s += 'Vielen Dank.';
    n.text = s;
    n.anzahl = Object.keys(f).length;
  });
  HT.data.telefonFelder = { name: 'Name', firma: 'Firma', nummer: 'Rückrufnummer', anliegen: 'Anliegen', termin: 'Termin', rueckruf: 'Rückruf bis' };
})();

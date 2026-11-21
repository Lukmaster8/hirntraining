/* Hirntraining – Alltagsinhalte: Einkauf, Termine, Namen, Handlungsabläufe, Geld */
(function () {
  'use strict';
  var HT = window.HT = window.HT || {};
  HT.data = HT.data || {};

  /* Supermarkt-Artikel (Bild-id aus bilder.js) mit Preisen in Euro */
  HT.data.artikel = [
    ['apfel', 0.45], ['birne', 0.55], ['banane', 0.30], ['kirsche', 2.99], ['erdbeere', 2.49], ['zitrone', 0.39], ['orange', 0.49], ['traube', 1.99], ['ananas', 2.29], ['melone', 3.49],
    ['karotte', 0.89], ['tomate', 1.79], ['gurke', 0.69], ['paprika', 0.99], ['brokkoli', 1.49], ['zwiebel', 0.25], ['kartoffel', 2.49], ['mais', 0.79], ['aubergine', 1.19], ['pilz', 1.89],
    ['flasche', 0.99], ['kerze', 1.50], ['gluehbirne', 2.95], ['tasse', 4.50], ['glas', 1.95], ['besen', 7.90], ['socke', 3.99], ['muetze', 9.95], ['schal', 12.90], ['handschuh', 8.50]
  ].map(function (a) { return { id: a[0], preis: a[1] }; });

  HT.data.termine = [
    'Zahnarzt', 'Friseur', 'Physiotherapie', 'Kaffee mit Inge', 'Bank', 'Fußpflege', 'Augenarzt', 'Apotheke', 'Chorprobe', 'Enkel abholen',
    'Hausarzt', 'Ergotherapie', 'Gymnastik', 'Kartenspiel', 'Markt', 'Post', 'Bürgeramt', 'Schwimmen', 'Bibliothek', 'Geburtstag Karl'
  ];
  HT.data.wochentage = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];

  HT.data.vornamen = ['Anna', 'Bernd', 'Clara', 'Dieter', 'Elke', 'Frank', 'Gisela', 'Heinz', 'Ingrid', 'Jürgen', 'Karin', 'Lothar', 'Monika', 'Norbert', 'Olga', 'Peter', 'Renate', 'Stefan', 'Ute', 'Werner', 'Yvonne', 'Klaus', 'Sabine', 'Thomas', 'Helga', 'Rolf', 'Brigitte', 'Uwe', 'Doris', 'Manfred'];

  /* Alltagshandlungen in richtiger Reihenfolge, dazu passende Ablenk-Schritte (gehören nicht dazu) */
  HT.data.handlungen = [
    { titel: 'Kaffee kochen', schritte: ['Wasser in die Maschine füllen', 'Filter einlegen', 'Kaffeepulver einfüllen', 'Maschine einschalten', 'Kaffee in die Tasse gießen', 'Milch dazugeben'], ablenker: ['Teebeutel aufgießen', 'Herdplatte einschalten'] },
    { titel: 'Überweisung ausführen', schritte: ['Rechnung bereitlegen', 'Online-Banking öffnen', 'Empfänger und IBAN eintragen', 'Betrag eingeben', 'Verwendungszweck angeben', 'Mit TAN bestätigen'], ablenker: ['Geld am Automaten abheben', 'Kontoauszug drucken'] },
    { titel: 'Einkaufen gehen', schritte: ['Einkaufsliste schreiben', 'Tasche und Geldbeutel einpacken', 'Zum Supermarkt gehen', 'Waren in den Wagen legen', 'An der Kasse bezahlen', 'Einkäufe zu Hause einräumen'], ablenker: ['Pfandflaschen spülen', 'Auto waschen'] },
    { titel: 'Brief verschicken', schritte: ['Brief schreiben', 'Brief falten', 'In den Umschlag stecken', 'Adresse aufschreiben', 'Briefmarke aufkleben', 'In den Briefkasten werfen'], ablenker: ['Paket wiegen', 'E-Mail senden'] },
    { titel: 'Wäsche waschen', schritte: ['Wäsche nach Farben sortieren', 'Maschine befüllen', 'Waschmittel einfüllen', 'Programm wählen und starten', 'Wäsche aufhängen', 'Trockene Wäsche zusammenlegen'], ablenker: ['Bügeleisen entkalken', 'Fenster putzen'] },
    { titel: 'Tee zubereiten', schritte: ['Wasserkocher füllen', 'Wasser kochen', 'Teebeutel in die Tasse legen', 'Heißes Wasser aufgießen', 'Tee ziehen lassen', 'Teebeutel herausnehmen'], ablenker: ['Kaffeepulver einfüllen', 'Milch aufschäumen'] },
    { titel: 'Mit dem Bus fahren', schritte: ['Fahrplan ansehen', 'Zur Haltestelle gehen', 'Auf den Bus warten', 'Einsteigen und Fahrkarte zeigen', 'Halteknopf drücken', 'An der Zielhaltestelle aussteigen'], ablenker: ['Tankstelle anfahren', 'Fahrrad abschließen'] },
    { titel: 'Kuchen backen', schritte: ['Zutaten bereitstellen', 'Backofen vorheizen', 'Teig rühren', 'Teig in die Form füllen', 'Kuchen backen', 'Kuchen abkühlen lassen'], ablenker: ['Nudeln abgießen', 'Salat waschen'] },
    { titel: 'Blumen umtopfen', schritte: ['Größeren Topf besorgen', 'Erde einfüllen', 'Pflanze aus altem Topf lösen', 'Pflanze einsetzen', 'Mit Erde auffüllen', 'Pflanze gießen'], ablenker: ['Rasen mähen', 'Hecke schneiden'] },
    { titel: 'Arzttermin vereinbaren', schritte: ['Telefonnummer der Praxis suchen', 'Praxis anrufen', 'Beschwerden schildern', 'Termin auswählen', 'Termin im Kalender eintragen', 'Versichertenkarte bereitlegen'], ablenker: ['Rezept einlösen', 'Taxi bestellen'] }
  ];

  /* Münzen und Scheine als SVG */
  HT.data.geld = [0.01, 0.02, 0.05, 0.10, 0.20, 0.50, 1, 2, 5, 10, 20, 50];
  HT.geldSvg = function (wert) {
    var txt = wert >= 1 ? String(wert) : String(Math.round(wert * 100));
    if (wert >= 5) {
      var f = { 5: '#9aa7b0', 10: '#E07A6A', 20: '#5B8BD6', 50: '#E8A04B' }[wert];
      return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 64"><rect x="2" y="2" width="116" height="60" rx="6" fill="' + f + '" stroke="#26333c" stroke-width="2"/><rect x="10" y="10" width="34" height="44" rx="4" fill="#fff" fill-opacity=".35"/><text x="82" y="42" font-family="-apple-system,Helvetica,sans-serif" font-size="26" font-weight="800" fill="#fff" text-anchor="middle">' + txt + ' €</text></svg>';
    }
    var gold = wert >= 0.1 && wert < 1, zwei = wert >= 1;
    var aussen = zwei ? (wert === 2 ? '#c7cdd2' : '#d9b54a') : (gold ? '#d9b54a' : '#c87a4a');
    var innen = zwei ? (wert === 2 ? '#d9b54a' : '#c7cdd2') : aussen;
    var r = { 0.01: 22, 0.02: 24, 0.05: 27, 0.1: 25, 0.2: 28, 0.5: 31, 1: 30, 2: 33 }[wert] || 28;
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 70 70"><circle cx="35" cy="35" r="' + r + '" fill="' + aussen + '" stroke="#26333c" stroke-width="2"/><circle cx="35" cy="35" r="' + (r - 7) + '" fill="' + innen + '" stroke="rgba(0,0,0,.2)" stroke-width="1.5"/><text x="35" y="' + (35 + r * 0.28) + '" font-family="-apple-system,Helvetica,sans-serif" font-size="' + Math.round(r * 0.8) + '" font-weight="800" fill="#26333c" text-anchor="middle">' + txt + '</text>' + (wert < 1 ? '<text x="35" y="' + (35 + r * 0.62) + '" font-family="-apple-system,sans-serif" font-size="' + Math.round(r * 0.3) + '" fill="#26333c" text-anchor="middle">Cent</text>' : '') + '</svg>';
  };
  HT.euro = function (v) { return v.toFixed(2).replace('.', ',') + ' €'; };

  /* Gezeichnete Gesichter (für Namen-Gesichter-Aufgaben) aus Merkmalen */
  HT.gesichtSvg = function (m) {
    var haut = ['#F2D0B5', '#E3B48F', '#C68E63', '#8D5B3E'][m.haut % 4];
    var haar = ['#2b2b2b', '#6b4423', '#c49a5a', '#a9a9a9', '#b5532c'][m.haar % 5];
    var frisur = [
      '<path d="M22 42 C22 18 78 18 78 42 C70 30 30 30 22 42Z" fill="' + haar + '"/>',
      '<path d="M18 50 C14 16 86 16 82 50 L80 80 C76 60 76 40 70 34 C56 30 44 30 30 34 C24 40 24 60 20 80Z" fill="' + haar + '"/>',
      '<path d="M24 40 C26 22 74 22 76 40 L74 34 L66 38 L58 32 L50 38 L42 32 L34 38 L26 34Z" fill="' + haar + '"/>',
      '<circle cx="50" cy="20" r="12" fill="' + haar + '"/><path d="M24 42 C24 22 76 22 76 42 C68 32 32 32 24 42Z" fill="' + haar + '"/>',
      ''
    ][m.frisur % 5];
    var brille = m.brille ? '<circle cx="40" cy="50" r="7" fill="none" stroke="#26333c" stroke-width="2.5"/><circle cx="60" cy="50" r="7" fill="none" stroke="#26333c" stroke-width="2.5"/><path d="M47 50 H53" stroke="#26333c" stroke-width="2.5"/>' : '';
    var bart = m.bart ? '<path d="M34 64 C38 80 62 80 66 64 C60 70 40 70 34 64Z" fill="' + haar + '"/>' : '';
    var mund = ['<path d="M42 66 C46 70 54 70 58 66" fill="none" stroke="#7a3b2e" stroke-width="2.5" stroke-linecap="round"/>', '<path d="M43 67 H57" stroke="#7a3b2e" stroke-width="2.5" stroke-linecap="round"/>', '<ellipse cx="50" cy="67" rx="5" ry="3" fill="#7a3b2e"/>'][m.mund % 3];
    var shirt = ['#3D7BE0', '#2EAD6B', '#E25C5C', '#8A63D2', '#E8833A'][m.shirt % 5];
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M18 100 C18 82 32 76 50 76 C68 76 82 82 82 100Z" fill="' + shirt + '" stroke="#26333c" stroke-width="2"/>' +
      '<ellipse cx="50" cy="50" rx="27" ry="31" fill="' + haut + '" stroke="#26333c" stroke-width="2"/>' + frisur +
      '<circle cx="40" cy="50" r="2.8" fill="#26333c"/><circle cx="60" cy="50" r="2.8" fill="#26333c"/><path d="M50 52 L47 60 H52" fill="none" stroke="#26333c" stroke-width="2" stroke-linecap="round"/>' + mund + brille + bart + '</svg>';
  };
})();

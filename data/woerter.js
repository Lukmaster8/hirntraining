/* Hirntraining – deutsche Wortlisten nach Oberbegriffen (über 300 Wörter) */
(function () {
  'use strict';
  var HT = window.HT = window.HT || {};
  HT.data = HT.data || {};

  var K = HT.data.wortKategorien = {
    'Tiere': ['Hund', 'Katze', 'Pferd', 'Kuh', 'Schaf', 'Ziege', 'Hase', 'Maus', 'Fuchs', 'Bär', 'Wolf', 'Igel', 'Ente', 'Gans', 'Huhn', 'Adler', 'Eule', 'Fisch', 'Frosch', 'Schnecke', 'Löwe', 'Tiger', 'Affe', 'Elefant'],
    'Obst': ['Apfel', 'Birne', 'Banane', 'Kirsche', 'Pflaume', 'Erdbeere', 'Himbeere', 'Zitrone', 'Orange', 'Traube', 'Ananas', 'Melone', 'Pfirsich', 'Aprikose', 'Mango', 'Kiwi'],
    'Gemüse': ['Karotte', 'Tomate', 'Gurke', 'Paprika', 'Zwiebel', 'Kartoffel', 'Salat', 'Spinat', 'Erbse', 'Bohne', 'Kohl', 'Lauch', 'Kürbis', 'Radieschen', 'Sellerie', 'Brokkoli'],
    'Möbel': ['Stuhl', 'Tisch', 'Bett', 'Schrank', 'Sofa', 'Sessel', 'Regal', 'Kommode', 'Hocker', 'Bank', 'Schreibtisch', 'Vitrine', 'Truhe', 'Liege'],
    'Kleidung': ['Hose', 'Hemd', 'Bluse', 'Jacke', 'Mantel', 'Kleid', 'Rock', 'Pullover', 'Mütze', 'Schal', 'Socke', 'Schuh', 'Stiefel', 'Handschuh', 'Gürtel', 'Krawatte'],
    'Werkzeug': ['Hammer', 'Säge', 'Zange', 'Bohrer', 'Feile', 'Pinsel', 'Schaufel', 'Spaten', 'Hobel', 'Meißel', 'Schere', 'Axt', 'Rechen', 'Nagel'],
    'Fahrzeuge': ['Auto', 'Bus', 'Zug', 'Fahrrad', 'Roller', 'Schiff', 'Boot', 'Flugzeug', 'Traktor', 'Lastwagen', 'Taxi', 'Motorrad', 'Kutsche', 'Rakete'],
    'Körper': ['Kopf', 'Hand', 'Fuß', 'Arm', 'Bein', 'Knie', 'Nase', 'Mund', 'Ohr', 'Auge', 'Haar', 'Finger', 'Zahn', 'Schulter', 'Rücken', 'Bauch'],
    'Natur': ['Baum', 'Blume', 'Gras', 'Berg', 'Fluss', 'See', 'Meer', 'Wald', 'Wiese', 'Stein', 'Sonne', 'Mond', 'Stern', 'Wolke', 'Regen', 'Schnee'],
    'Berufe': ['Bäcker', 'Lehrer', 'Arzt', 'Koch', 'Maler', 'Gärtner', 'Bauer', 'Fischer', 'Pilot', 'Richter', 'Friseur', 'Tischler', 'Förster', 'Schneider'],
    'Musikinstrumente': ['Geige', 'Flöte', 'Trommel', 'Gitarre', 'Klavier', 'Trompete', 'Harfe', 'Orgel', 'Cello', 'Tuba', 'Harmonika'],
    'Getränke': ['Wasser', 'Saft', 'Milch', 'Kaffee', 'Tee', 'Kakao', 'Limonade', 'Brühe', 'Sprudel', 'Schorle'],
    'Küche': ['Topf', 'Pfanne', 'Löffel', 'Gabel', 'Messer', 'Teller', 'Tasse', 'Schüssel', 'Kanne', 'Herd', 'Ofen', 'Sieb', 'Kelle', 'Dose'],
    'Gebäude': ['Haus', 'Kirche', 'Schule', 'Turm', 'Burg', 'Schloss', 'Hütte', 'Scheune', 'Brücke', 'Bahnhof', 'Rathaus', 'Mühle'],
    'Farben': ['Rot', 'Blau', 'Grün', 'Gelb', 'Weiß', 'Schwarz', 'Braun', 'Grau', 'Rosa', 'Lila', 'Orange', 'Silber'],
    'Wetter': ['Gewitter', 'Nebel', 'Hagel', 'Wind', 'Sturm', 'Frost', 'Tau', 'Blitz', 'Donner', 'Glatteis'],
    'Spielzeug': ['Ball', 'Puppe', 'Kreisel', 'Drachen', 'Würfel', 'Murmel', 'Teddy', 'Bauklotz', 'Seil', 'Schaukel']
  };

  // Flache Liste aller Wörter mit Oberbegriff
  var alle = [];
  Object.keys(K).forEach(function (kat) { K[kat].forEach(function (w) { alle.push({ wort: w, kategorie: kat }); }); });
  HT.data.woerter = alle;

  // Wörter für Buchstabengitter (nur A–Z, Ä/Ö/Ü werden ersetzt), 4–8 Buchstaben
  HT.data.gitterWort = function (w) {
    return w.toUpperCase().replace(/Ä/g, 'AE').replace(/Ö/g, 'OE').replace(/Ü/g, 'UE').replace(/ß/g, 'SS').replace(/[^A-Z]/g, '');
  };

  HT.data.wortZufall = function (n, ausKategorie) {
    var quelle = ausKategorie ? alle.filter(function (x) { return x.kategorie === ausKategorie; }) : alle;
    return HT.zufall.stichprobe(quelle, n);
  };
})();

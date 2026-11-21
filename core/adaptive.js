/* Hirntraining – zentrale Levelsteuerung
 * Trefferquote = treffer / (treffer + fehler + auslassungen)
 * Quote ≥ aufstufenAb in zwei Durchgängen hintereinander → Level +1
 * Quote < abstufenUnter → Level −1
 * Mittlere Reaktionszeit > 130 % des Mittels der letzten 3 Durchgänge → nicht aufstufen */
(function () {
  'use strict';
  var HT = window.HT;

  var AD = HT.adaptive = {
    schwellen: function (modul) {
      var eigene = (HT.storage.einstellungen().schwellen || {})[modul.id] || {};
      return HT.zusammen({ serie: 2, rtAnstieg: 0.3 }, modul.bewertung, eigene);
    },

    quote: function (e) {
      var n = (e.treffer || 0) + (e.fehler || 0) + (e.auslassungen || 0);
      return n ? (e.treffer || 0) / n : null;
    },

    /* Wertet einen abgeschlossenen Durchgang aus und verändert den Modulzustand. */
    nachDurchgang: function (modul, zustand, erg) {
      var s = AD.schwellen(modul);
      var alt = zustand.aktuellesLevel;
      var neu = alt, grund = 'gehalten';
      var q = AD.quote(erg);
      var vorher = (zustand.letzteDurchgaenge || []).slice(-3).map(function (d) { return d.rtMittel; }).filter(function (x) { return x; });
      var rtMittelVorher = HT.mittel(vorher);
      var rtBremse = !!(rtMittelVorher && erg.rtMittel && erg.rtMittel > rtMittelVorher * (1 + s.rtAnstieg));

      if (q !== null && zustand.automatik !== false) {
        if (q >= s.aufstufenAb) {
          zustand.hochSerie = (zustand.hochSerie || 0) + 1;
          if (rtBremse) grund = 'reaktionszeit';
          else if (zustand.hochSerie >= s.serie) { neu = alt + 1; zustand.hochSerie = 0; grund = 'aufgestuft'; }
          else grund = 'serie';
        } else {
          zustand.hochSerie = 0;
          if (q < s.abstufenUnter) { neu = alt - 1; grund = 'abgestuft'; }
        }
      } else if (zustand.automatik === false) grund = 'manuell';
      neu = HT.klemmen(neu, 1, modul.levels.length);
      if (neu === alt && grund === 'aufgestuft') grund = 'maximum';
      if (neu === alt && grund === 'abgestuft') grund = 'minimum';
      zustand.aktuellesLevel = neu;
      zustand.letzteDurchgaenge = (zustand.letzteDurchgaenge || []).concat([{ datum: Date.now(), level: alt, quote: q, rtMittel: erg.rtMittel || null }]).slice(-10);
      return { alt: alt, neu: neu, grund: grund, quote: q };
    },

    grundText: function (r) {
      return {
        aufgestuft: 'Sehr gut – nächstes Level erreicht!', abgestuft: 'Level wurde etwas leichter eingestellt.',
        serie: 'Sehr gut! Noch ein so guter Durchgang bis zum nächsten Level.', reaktionszeit: 'Gute Quote – aber langsamer als zuletzt, daher Level gehalten.',
        maximum: 'Höchstes Level erreicht!', minimum: 'Level 1 wird beibehalten.', manuell: 'Level ist vom Therapeuten festgelegt.', gehalten: 'Level bleibt gleich.'
      }[r.grund] || '';
    }
  };
})();

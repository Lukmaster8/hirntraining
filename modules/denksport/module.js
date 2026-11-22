/* Modul: Denksport – niedrigschwellige geistige Aktivierung mit Erfolgserlebnissen.
 * Gemischte kurze Aufgaben (Sprichwort, Gegenteil, Reim, Jahreszeit, Monat, Alltag, Zuordnen, Was passt nicht?).
 * Sehr große Schrift, wenige große Antwortkacheln, standardmäßig ohne Zeitdruck und mit fehlerfreiem Lernen. */
(function () {
  'use strict';
  var HT = window.HT;

  var levels = HT.stufen(14, function (t, i) {
    return {
      antworten: i <= 3 ? 2 : i <= 8 ? 3 : 4,
      typen: i <= 2 ? 'leicht' : i <= 6 ? 'mittel' : 'alle',
      bilder: i <= 10,
      zeitlimitSek: i >= 8 ? HT.lerpInt(25, 10, (i - 8) / 6) : 0
    };
  });
  var LEICHT = ['jahreszeit', 'alltag', 'zuordnen', 'passtnicht'], MITTEL = LEICHT.concat(['gegenteil', 'monat', 'sprichwort']);

  function passtNicht(n) {
    var kats = ['obst', 'gemuese', 'werkzeug', 'kleidung', 'tiere', 'moebel', 'fahrzeuge', 'haushalt'];
    var k = HT.zufall.stichprobe(kats, 2), gleich = HT.zufall.stichprobe(HT.bilderVon(k[0]), n - 1), anders = HT.zufall.wahl(HT.bilderVon(k[1]));
    return { typ: 'passtnicht', frage: 'Was passt nicht dazu?', bilder: HT.zufall.mischen(gleich.concat([anders])), richtig: anders.id };
  }

  HT.registerModule({
    id: 'denksport', name: 'Denksport', kategorie: 'sprache', symbol: 'funke',
    ziel: 'Geistige Aktivierung mit Erfolgserlebnissen: Wortschatz und Allgemeinwissen',
    beschreibung: 'Niedrigschwellige Aktivierung für schwer betroffene oder ältere Klienten: Sprichwörter ergänzen, Gegenteile und Reime finden, Jahreszeiten und Monate zuordnen, Alltagsfragen und „Was passt nicht?“ mit eigenen Bildern. Sehr große Schrift, zwei bis vier große Antwortkacheln, kein Zeitdruck (erst ab Level 8 optional), fehlerfreies Lernen standardmäßig an.',
    anleitung: 'Lesen Sie die Frage in Ruhe. Tippen Sie auf die passende Antwort oder drücken Sie die Ziffer. Sie haben so viel Zeit, wie Sie brauchen.',
    tasten: [], levels: levels,
    levelLabels: { antworten: 'Antworten', typen: 'Aufgabentypen', bilder: 'Bilder bei „Was passt nicht?“', zeitlimitSek: 'Zeitlimit (s, 0 = keins)' },
    parameterSchema: {
      fehlerfrei: { typ: 'schalter', label: 'Fehlerfreies Lernen (bei Fehler noch einmal wählen)', standard: true }
    },
    create: function (container, ctx) {
      var p = ctx.params, zuletzt = [];
      // fehlerfreies Lernen standardmäßig an (Parameter), unabhängig von der Patienteneinstellung
      var ps = HT.zusammen(ctx.patientSettings || {}, { fehlerfrei: p.fehlerfrei !== false });
      var ctx2 = HT.zusammen(ctx, { patientSettings: ps });
      var erlaubt = p.typen === 'leicht' ? LEICHT : p.typen === 'mittel' ? MITTEL : null;
      var pool = HT.data.denksport.filter(function (a) { return !erlaubt || erlaubt.indexOf(a[0]) >= 0; });
      var q = HT.quiz(container, ctx2, {
        pauseMs: 900,
        aufgabe: function () {
          var typ = HT.zufall.wahl(erlaubt || ['sprichwort', 'gegenteil', 'reim', 'jahreszeit', 'monat', 'alltag', 'zuordnen', 'passtnicht']);
          if (typ === 'passtnicht' && p.bilder) {
            var pn = passtNicht(Math.max(3, p.antworten));
            return {
              frage: pn.frage, inhalt: '', klasse: 'ds-bilder', typ: 'passtnicht', reiz: 'passt nicht', richtig: pn.richtig, zeitMs: p.zeitlimitSek * 1000,
              optionen: pn.bilder.map(function (b) { return { html: '<span class="ds-bild">' + HT.bild(b) + '</span>', wert: b.id }; })
            };
          }
          var kandidaten = pool.filter(function (x) { return x[0] === typ; });
          if (!kandidaten.length) kandidaten = pool;
          var a, versuch = 0;
          do { a = HT.zufall.wahl(kandidaten); versuch++; } while (zuletzt.indexOf(a[1]) >= 0 && versuch < 20);
          zuletzt.push(a[1]); if (zuletzt.length > 25) zuletzt.shift();
          var opt = HT.zufall.mischen([a[2]].concat(HT.zufall.stichprobe(a.slice(3), p.antworten - 1)));
          return {
            frage: '<span class="ds-frage">' + HT.esc(a[1]) + '</span>', inhalt: '', klasse: 'ds-text', typ: a[0], reiz: a[1], richtig: a[2], zeitMs: p.zeitlimitSek * 1000,
            optionen: opt.map(function (o) { return { html: HT.esc(o), wert: o }; })
          };
        }
      });
      return q;
    },
    preview: function (el) {
      var b = function (mark) {
        return '<svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg"><text x="200" y="70" text-anchor="middle" font-size="26" font-weight="800" fill="#1E2A33" font-family="-apple-system,sans-serif">Übung macht den …</text>' +
          '<rect x="40" y="130" width="150" height="90" rx="18" fill="' + (mark ? '#e2f5ea' : '#fff') + '" stroke="' + (mark ? '#2EAD6B' : '#d6e0e6') + '" stroke-width="3"/><text x="115" y="185" text-anchor="middle" font-size="26" font-weight="800" fill="#1E2A33" font-family="-apple-system,sans-serif">Meister</text>' +
          '<rect x="210" y="130" width="150" height="90" rx="18" fill="#fff" stroke="#d6e0e6" stroke-width="3"/><text x="285" y="185" text-anchor="middle" font-size="26" font-weight="800" fill="#1E2A33" font-family="-apple-system,sans-serif">Abend</text></svg>';
      };
      return HT.beispiel(el, [{ svg: b(false), text: 'In Ruhe lesen', dauer: 1600 }, { svg: b(true), zeiger: [29, 60], klick: true, text: 'Richtig!', dauer: 1500 }]);
    }
  });
})();

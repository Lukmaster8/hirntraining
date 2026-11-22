/* Modul: Kategorisieren – Begriffe und Bilder Oberbegriffen zuordnen.
 * Level: Anzahl Oberbegriffe (2–4), Bilder → Wörter, ähnliche Oberbegriffe, Zeitlimit. */
(function () {
  'use strict';
  var HT = window.HT;
  var levels = HT.stufen(12, function (t, i) { return { kategorien: i <= 3 ? 2 : i <= 7 ? 3 : 4, material: i <= 2 ? 'bilder' : i <= 5 ? 'gemischt' : 'woerter', aehnlich: i >= 9, zeitlimitSek: i >= 7 ? HT.lerpInt(8, 4, (i - 7) / 5) : 0 }; });
  var AEHNLICH = [['Obst', 'Gemüse', 'Getränke', 'Küche'], ['Möbel', 'Küche', 'Gebäude', 'Werkzeug'], ['Tiere', 'Berufe', 'Körper', 'Natur'], ['Kleidung', 'Spielzeug', 'Werkzeug', 'Musikinstrumente'], ['Wetter', 'Natur', 'Farben', 'Gebäude']];
  var BILD_ZU_WORT = { obst: 'Obst', gemuese: 'Gemüse', werkzeug: 'Werkzeug', kleidung: 'Kleidung', tiere: 'Tiere', moebel: 'Möbel', fahrzeuge: 'Fahrzeuge', haushalt: 'Haushalt' };

  HT.registerModule({
    id: 'kategorisieren', name: 'Kategorisieren', kategorie: 'exekutiv', symbol: 'stapel',
    ziel: 'Begriffe ordnen und Oberbegriffe bilden',
    beschreibung: 'Ein Bild oder Wort erscheint und soll dem passenden Oberbegriff zugeordnet werden (z. B. „Birne“ → Obst). Zunächst mit Bildern und zwei deutlich verschiedenen Oberbegriffen, später mit Wörtern, bis zu vier Kategorien, ähnlichen Oberbegriffen (Obst/Gemüse/Getränke) und Zeitlimit. Trainiert werden semantisches Ordnen und Konzeptbildung.',
    anleitung: 'In der Mitte erscheint ein Bild oder Wort. Tippen Sie auf den Oberbegriff, zu dem es gehört (oder Ziffer 1–4).',
    tasten: [], levels: levels,
    levelLabels: { kategorien: 'Oberbegriffe', material: 'Material', aehnlich: 'Ähnliche Oberbegriffe', zeitlimitSek: 'Zeitlimit (s)' },
    create: function (container, ctx) {
      var kg = Math.round(Math.max(220, Math.min(30 * (ctx.buehne ? ctx.buehne.einheit : 7), 320)));
      var p = ctx.params, zaehler = 0, kats = null;
      function neueKategorien() {
        if (p.material === 'bilder' || p.material === 'gemischt') {
          var bk = HT.zufall.stichprobe(Object.keys(BILD_ZU_WORT), p.kategorien);
          return bk.map(function (k) { return { name: BILD_ZU_WORT[k], bild: k }; });
        }
        if (p.aehnlich) { var gr = HT.zufall.wahl(AEHNLICH); return HT.zufall.stichprobe(gr, p.kategorien).map(function (k) { return { name: k }; }); }
        return HT.zufall.stichprobe(Object.keys(HT.data.wortKategorien), p.kategorien).map(function (k) { return { name: k }; });
      }
      return HT.quiz(container, ctx, {
        pauseMs: 650,
        aufgabe: function () {
          if (!kats || zaehler++ % 8 === 0) kats = neueKategorien();
          var k = HT.zufall.wahl(kats), inhalt, reiz;
          var alsBild = k.bild && (p.material === 'bilder' || HT.zufall.chance(0.5));
          if (alsBild) { var b = HT.zufall.wahl(HT.bilderVon(k.bild)); inhalt = '<div class="m-kachel" style="width:' + kg + 'px;height:' + kg + 'px">' + HT.bild(b) + '</div>'; reiz = b.name; }
          else {
            var woerter = HT.data.wortKategorien[k.name] || [];
            if (k.bild && !woerter.length) woerter = HT.bilderVon(k.bild).map(function (x) { return x.name; });
            reiz = HT.zufall.wahl(woerter);
            inhalt = '<div class="m-wort">' + HT.esc(reiz) + '</div>';
          }
          return {
            frage: 'Zu welchem Oberbegriff gehört das?', inhalt: inhalt,
            optionen: kats.map(function (x) { return { html: x.name, wert: x.name }; }),
            richtig: k.name, reiz: reiz, zeitMs: p.zeitlimitSek * 1000
          };
        }
      });
    },
    preview: function (el) {
      var b = function (mark) {
        return '<svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg"><rect x="145" y="20" width="110" height="110" rx="16" fill="#fff" stroke="#e1e8ed" stroke-width="2"/>' + HT.bildGruppe('birne', 200, 75, 90) +
          '<rect x="70" y="190" width="120" height="60" rx="14" fill="' + (mark ? '#e2f5ea' : '#fff') + '" stroke="' + (mark ? '#2EAD6B' : '#e1e8ed') + '" stroke-width="3"/><text x="130" y="227" text-anchor="middle" font-size="20" font-weight="700" font-family="-apple-system,sans-serif">Obst</text><rect x="210" y="190" width="120" height="60" rx="14" fill="#fff" stroke="#e1e8ed" stroke-width="3"/><text x="270" y="227" text-anchor="middle" font-size="20" font-weight="700" font-family="-apple-system,sans-serif">Möbel</text></svg>';
      };
      return HT.beispiel(el, [{ svg: b(false), text: 'Wohin gehört die Birne?', dauer: 1500 }, { svg: b(true), zeiger: [32, 73], klick: true, text: 'Zu Obst!', dauer: 1600 }]);
    }
  });
})();

/* Modul: Rechnen im Alltag – Einkaufen mit Geld (Münzen/Scheine als SVG), Wechselgeld, Preise vergleichen.
 * Level: Zahlenraum, Anzahl Artikel, Cent-Beträge. */
(function () {
  'use strict';
  var HT = window.HT;
  var levels = HT.stufen(14, function (t, i) { return { artikel: HT.lerpInt(1, 5, t), cent: i >= 4, maxSchein: i <= 3 ? 10 : i <= 8 ? 20 : 50, aufgaben: i <= 2 ? 'summe,geld' : i <= 6 ? 'summe,geld,wechsel' : 'summe,geld,wechsel,vergleich' }; });

  function rund(v) { return Math.round(v * 100) / 100; }
  function optionen(richtig, cent) {
    var s = cent ? [0.1, 0.5, 1, 0.05, 2, 0.2] : [1, 2, 5, 10, 3];
    var o = [richtig];
    while (o.length < 4) { var x = rund(richtig + HT.zufall.wahl(s) * HT.zufall.wahl([-1, 1])); if (x > 0 && o.indexOf(x) < 0) o.push(x); }
    return HT.zufall.mischen(o).map(function (v) { return { html: HT.euro(v), wert: v.toFixed(2) }; });
  }
  function artikelKarte(a, menge) {
    var b = HT.bildInfo(a.id);
    return '<div class="m-kachel" style="width:140px;height:170px;flex-direction:column;margin:6px"><div style="width:84px;height:84px">' + HT.bild(a.id) + '</div><div class="fett" style="margin-top:.3rem">' + (menge > 1 ? menge + ' × ' : '') + b.name + '</div><div style="color:var(--akzent-dunkel);font-weight:800;font-size:1.15rem">' + HT.euro(a.preis) + '</div></div>';
  }
  function geldZerlegen(betrag, maxSchein) {
    var werte = HT.data.geld.filter(function (w) { return w <= maxSchein; }).sort(function (a, b) { return b - a; });
    var rest = Math.round(betrag * 100), out = [];
    werte.forEach(function (w) { var c = Math.round(w * 100); while (rest >= c && out.length < 14) { out.push(w); rest -= c; } });
    return out;
  }

  HT.registerModule({
    id: 'rechnen-alltag', name: 'Rechnen im Alltag', kategorie: 'sprache', symbol: 'stapel',
    ziel: 'Sicher mit Geld umgehen: Preise addieren, Wechselgeld, Angebote vergleichen',
    beschreibung: 'Alltagsnahe Rechenaufgaben rund ums Einkaufen: Gesamtpreis mehrerer Artikel berechnen, Münzen und Scheine zählen, Wechselgeld bestimmen und Angebote vergleichen („Was ist günstiger?“). Level: Anzahl Artikel (1–5), Beträge mit Cent, größere Scheine und zusätzliche Aufgabentypen.',
    anleitung: 'Lesen Sie die Aufgabe und rechnen Sie in Ruhe. Tippen Sie dann auf das richtige Ergebnis (oder Ziffer 1–4).',
    tasten: [], levels: levels,
    levelLabels: { artikel: 'Artikel', cent: 'Cent-Beträge', maxSchein: 'Größter Schein (€)', aufgaben: 'Aufgabentypen' },
    create: function (container, ctx) {
      var p = ctx.params, typen = p.aufgaben.split(',');
      function artikel(n) {
        return HT.zufall.stichprobe(HT.data.artikel, n).map(function (a) { return { id: a.id, preis: p.cent ? a.preis : Math.max(1, Math.round(a.preis)) }; });
      }
      return HT.quiz(container, ctx, {
        pauseMs: 900,
        aufgabe: function () {
          var typ = HT.zufall.wahl(typen), liste, summe;
          if (typ === 'summe') {
            liste = artikel(Math.max(2, p.artikel));
            summe = rund(liste.reduce(function (s, a) { return s + a.preis; }, 0));
            return { frage: 'Was kostet der Einkauf <b>zusammen</b>?', inhalt: '<div style="display:flex;flex-wrap:wrap;justify-content:center">' + liste.map(function (a) { return artikelKarte(a); }).join('') + '</div>', optionen: optionen(summe, p.cent), richtig: summe.toFixed(2), reiz: 'summe ' + summe };
          }
          if (typ === 'geld') {
            var betrag = p.cent ? rund(HT.zufall.int(50, p.maxSchein * 150) / 100) : HT.zufall.int(2, p.maxSchein * 2);
            var stuecke = geldZerlegen(betrag, p.maxSchein);
            summe = rund(stuecke.reduce(function (s, x) { return s + x; }, 0));
            return { frage: 'Wie viel Geld liegt hier?', inhalt: '<div style="display:flex;flex-wrap:wrap;justify-content:center;align-items:center;max-width:760px">' + HT.zufall.mischen(stuecke).map(function (w) { return '<span style="display:inline-block;margin:6px;width:' + (w >= 5 ? 140 : 76) + 'px">' + HT.geldSvg(w) + '</span>'; }).join('') + '</div>', optionen: optionen(summe, p.cent), richtig: summe.toFixed(2), reiz: 'geld ' + summe };
          }
          if (typ === 'wechsel') {
            liste = artikel(Math.max(1, p.artikel - 1));
            summe = rund(liste.reduce(function (s, a) { return s + a.preis; }, 0));
            var schein = [5, 10, 20, 50].filter(function (s) { return s > summe && s <= Math.max(p.maxSchein, 10); })[0] || 50;
            var rueck = rund(schein - summe);
            return { frage: 'Sie bezahlen mit <b>' + HT.euro(schein) + '</b>. Wie viel Wechselgeld bekommen Sie?', inhalt: '<div style="display:flex;flex-wrap:wrap;justify-content:center;align-items:center">' + liste.map(function (a) { return artikelKarte(a); }).join('') + '<span style="display:inline-block;width:150px;margin-left:16px">' + HT.geldSvg(schein) + '</span></div>', optionen: optionen(rueck, p.cent), richtig: rueck.toFixed(2), reiz: 'wechsel ' + rueck };
          }
          // Vergleich: Stückpreis
          var a = HT.zufall.wahl(HT.data.artikel), m1 = HT.zufall.int(2, 6), m2 = 1;
          var einzel = Math.max(0.3, a.preis);
          var paketPreis = rund(einzel * m1 * HT.zufall.wahl([0.8, 0.9, 1.15, 1.25]));
          var paketGuenstiger = paketPreis / m1 < einzel;
          return {
            frage: 'Welches Angebot ist <b>pro Stück</b> günstiger?',
            inhalt: '',
            optionen: [{ html: '<div>' + m1 + ' × ' + HT.bildInfo(a.id).name + '<br><b>' + HT.euro(paketPreis) + '</b></div>', wert: 'paket' }, { html: '<div>' + m2 + ' × ' + HT.bildInfo(a.id).name + '<br><b>' + HT.euro(einzel) + '</b></div>', wert: 'einzeln' }],
            richtig: paketGuenstiger ? 'paket' : 'einzeln', reiz: 'vergleich'
          };
        }
      });
    },
    preview: function (el) {
      var b = function (mark) {
        var s = '<svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg">' + HT.bildGruppe('apfel', 130, 70, 70) + HT.bildGruppe('banane', 270, 70, 70) +
          '<text x="130" y="135" text-anchor="middle" font-size="18" font-weight="800" fill="#13808b" font-family="-apple-system,sans-serif">0,45 €</text><text x="270" y="135" text-anchor="middle" font-size="18" font-weight="800" fill="#13808b" font-family="-apple-system,sans-serif">0,30 €</text>';
        ['0,65 €', '0,75 €', '0,85 €'].forEach(function (t, i) { var m = mark && i === 1; s += '<rect x="' + (55 + i * 100) + '" y="190" width="90" height="56" rx="12" fill="' + (m ? '#e2f5ea' : '#fff') + '" stroke="' + (m ? '#2EAD6B' : '#e1e8ed') + '" stroke-width="3"/><text x="' + (100 + i * 100) + '" y="225" text-anchor="middle" font-size="18" font-weight="700" font-family="-apple-system,sans-serif">' + t + '</text>'; });
        return s + '</svg>';
      };
      return HT.beispiel(el, [{ svg: b(false), text: 'Was kostet beides zusammen?', dauer: 1700 }, { svg: b(true), zeiger: [50, 72], klick: true, text: '0,75 €', dauer: 1600 }]);
    }
  });
})();

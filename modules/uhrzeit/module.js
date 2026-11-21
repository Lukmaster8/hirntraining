/* Modul: Uhrzeit – Analoguhr ablesen und „stellen“ (passende Uhr wählen), Zeitspannen berechnen.
 * Level: volle Stunden → halbe → Viertel → 5 Minuten → Minuten, Zeitspannen. */
(function () {
  'use strict';
  var HT = window.HT;
  var levels = HT.stufen(14, function (t, i) { return { raster: [60, 60, 30, 30, 15, 15, 5, 5, 5, 1, 5, 1, 1, 1][i - 1], aufgaben: i <= 4 ? 'lesen' : i <= 8 ? 'lesen,stellen' : 'lesen,stellen,spanne', zeitlimitSek: i >= 12 ? 15 : 0 }; });

  function uhr(h, m, groesse) {
    var s = '<svg viewBox="0 0 200 200" width="' + (groesse || 260) + '" height="' + (groesse || 260) + '" xmlns="http://www.w3.org/2000/svg"><circle cx="100" cy="100" r="92" fill="#fff" stroke="#26333c" stroke-width="6"/>';
    for (var i = 0; i < 60; i++) {
      var w = i * 6 * Math.PI / 180, lang = i % 5 === 0;
      s += '<line x1="' + (100 + Math.sin(w) * (lang ? 74 : 80)) + '" y1="' + (100 - Math.cos(w) * (lang ? 74 : 80)) + '" x2="' + (100 + Math.sin(w) * 86) + '" y2="' + (100 - Math.cos(w) * 86) + '" stroke="#26333c" stroke-width="' + (lang ? 4 : 1.5) + '"/>';
    }
    for (var z = 1; z <= 12; z++) { var wz = z * 30 * Math.PI / 180; s += '<text x="' + (100 + Math.sin(wz) * 60) + '" y="' + (100 - Math.cos(wz) * 60 + 7) + '" text-anchor="middle" font-size="20" font-weight="700" font-family="-apple-system,sans-serif" fill="#26333c">' + z + '</text>'; }
    var wh = ((h % 12) + m / 60) * 30, wm = m * 6;
    s += '<line x1="100" y1="100" x2="' + (100 + Math.sin(wh * Math.PI / 180) * 44) + '" y2="' + (100 - Math.cos(wh * Math.PI / 180) * 44) + '" stroke="#26333c" stroke-width="9" stroke-linecap="round"/>';
    s += '<line x1="100" y1="100" x2="' + (100 + Math.sin(wm * Math.PI / 180) * 70) + '" y2="' + (100 - Math.cos(wm * Math.PI / 180) * 70) + '" stroke="#1BA8B5" stroke-width="5" stroke-linecap="round"/><circle cx="100" cy="100" r="7" fill="#26333c"/></svg>';
    return s;
  }
  function txt(h, m) { return h + ':' + HT.pad(m); }
  function zufallsZeit(raster) { return { h: HT.zufall.int(1, 12), m: raster >= 60 ? 0 : HT.zufall.int(0, 59 / raster) * raster }; }
  function andere(z, raster, n) {
    var o = [], v = 0;
    while (o.length < n && v++ < 100) {
      var k = HT.zufall.wahl([{ h: z.h, m: (z.m + 30) % 60 }, { h: (z.h % 12) + 1, m: z.m }, { h: z.h, m: (z.m + Math.max(5, raster) * HT.zufall.wahl([1, 2, 3])) % 60 }, { h: Math.min(12, Math.round(z.m / 5)) || 12, m: (z.h % 12) * 5 }, { h: ((z.h + 10) % 12) + 1, m: z.m }]);
      if (k.h < 1) k.h = 12;
      if (!(k.h === z.h && k.m === z.m) && !o.some(function (x) { return x.h === k.h && x.m === k.m; })) o.push(k);
    }
    return o;
  }

  HT.registerModule({
    id: 'uhrzeit', name: 'Uhrzeit', kategorie: 'sprache', symbol: 'uhr',
    ziel: 'Analoguhr ablesen, Uhrzeiten zuordnen und Zeitspannen berechnen',
    beschreibung: 'Drei Aufgabentypen: Die Uhrzeit einer Analoguhr ablesen, zu einer digitalen Uhrzeit die passende Analoguhr wählen („Uhr stellen“) und einfache Zeitspannen berechnen (z. B. Abfahrt plus Fahrtdauer). Level: Genauigkeit von vollen Stunden über halbe und Viertelstunden bis zu einzelnen Minuten, dazu die Zeitspannen.',
    anleitung: 'Schauen Sie genau auf die Zeiger: Der kurze zeigt die Stunde, der lange (türkis) die Minuten. Tippen Sie auf die richtige Antwort.',
    tasten: [], levels: levels,
    levelLabels: { raster: 'Minutenraster', aufgaben: 'Aufgabentypen', zeitlimitSek: 'Zeitlimit (s)' },
    create: function (container, ctx) {
      var p = ctx.params, typen = p.aufgaben.split(',');
      return HT.quiz(container, ctx, {
        aufgabe: function () {
          var typ = HT.zufall.wahl(typen), z = zufallsZeit(p.raster);
          if (typ === 'lesen') {
            var opts = HT.zufall.mischen([z].concat(andere(z, p.raster, 3)));
            return { frage: 'Wie spät ist es?', inhalt: uhr(z.h, z.m), optionen: opts.map(function (o) { return { html: txt(o.h, o.m) + ' Uhr', wert: txt(o.h, o.m) }; }), richtig: txt(z.h, z.m), reiz: 'lesen ' + txt(z.h, z.m), zeitMs: p.zeitlimitSek * 1000 };
          }
          if (typ === 'stellen') {
            var o2 = HT.zufall.mischen([z].concat(andere(z, p.raster, 3)));
            return { frage: 'Welche Uhr zeigt <b>' + txt(z.h, z.m) + ' Uhr</b>?', inhalt: '', optionen: o2.map(function (o) { return { html: uhr(o.h, o.m, 150), wert: txt(o.h, o.m) }; }), richtig: txt(z.h, z.m), klasse: 'm-bildwahl', reiz: 'stellen ' + txt(z.h, z.m), zeitMs: p.zeitlimitSek * 1000 };
          }
          var dauer = HT.zufall.wahl([15, 20, 25, 30, 40, 45, 50, 75, 90]);
          var start = { h: HT.zufall.int(7, 18), m: HT.zufall.int(0, 11) * 5 };
          var ende = start.h * 60 + start.m + dauer;
          var e = { h: Math.floor(ende / 60), m: ende % 60 };
          var anlass = HT.zufall.wahl([['Der Bus fährt um', 'Die Fahrt dauert', 'Wann kommt er an?'], ['Der Film beginnt um', 'Er dauert', 'Wann ist er zu Ende?'], ['Der Kuchen kommt um', 'in den Ofen und braucht', 'Wann ist er fertig?']]);
          var falsch = [{ h: e.h, m: (e.m + 10) % 60 }, { h: e.h + 1, m: e.m }, { h: e.h, m: (e.m + 50) % 60 }, { h: e.h - 1 < 1 ? 12 : e.h - 1, m: e.m }].filter(function (x) { return !(x.h === e.h && x.m === e.m); });
          var o3 = HT.zufall.mischen([e].concat(HT.zufall.stichprobe(falsch, 3)));
          return { frage: anlass[0] + ' <b>' + txt(start.h, start.m) + ' Uhr</b>. ' + anlass[1] + ' <b>' + dauer + ' Minuten</b>. ' + anlass[2], inhalt: uhr(start.h, start.m, 200), optionen: o3.map(function (o) { return { html: txt(o.h, o.m) + ' Uhr', wert: txt(o.h, o.m) }; }), richtig: txt(e.h, e.m), reiz: 'spanne ' + dauer, zeitMs: p.zeitlimitSek * 1000 + 10000 };
        }
      });
    },
    preview: function (el) {
      var b = function (mark) {
        var s = '<svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg"><g transform="translate(130 10) scale(.7)">' + uhr(3, 30).replace(/<svg[^>]*>|<\/svg>/g, '') + '</g>';
        ['3:00', '3:30', '6:15'].forEach(function (t, i) { var m = mark && i === 1; s += '<rect x="' + (55 + i * 100) + '' + '" y="200" width="90" height="56" rx="12" fill="' + (m ? '#e2f5ea' : '#fff') + '" stroke="' + (m ? '#2EAD6B' : '#e1e8ed') + '" stroke-width="3"/><text x="' + (100 + i * 100) + '" y="235" text-anchor="middle" font-size="18" font-weight="700" font-family="-apple-system,sans-serif">' + t + '</text>'; });
        return s + '</svg>';
      };
      return HT.beispiel(el, [{ svg: b(false), text: 'Wie spät ist es?', dauer: 1600 }, { svg: b(true), zeiger: [50, 75], klick: true, text: 'Halb vier: 3:30', dauer: 1700 }]);
    }
  });
})();

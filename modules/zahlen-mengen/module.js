/* Modul: Zahlen und Mengen – Mengen schätzen, Zahlen vergleichen, Grundrechenarten mit Zeitlimit. */
(function () {
  'use strict';
  var HT = window.HT;
  var levels = HT.stufen(14, function (t, i) {
    return { verhaeltnis: Math.round(HT.lerp(2, 1.15, t) * 100) / 100, zahlenraum: [10, 20, 20, 50, 100, 100, 100, 1000, 1000, 1000, 10000, 10000, 10000, 10000][i - 1], rechenarten: i <= 3 ? '+' : i <= 6 ? '+-' : i <= 10 ? '+-*' : '+-*/', zeitlimitSek: HT.lerpInt(12, 5, t), dezimal: i >= 9 };
  });

  function punkteWolke(n, farbe, seed) {
    var s = '<svg viewBox="0 0 200 200" width="230" height="230" xmlns="http://www.w3.org/2000/svg"><rect width="200" height="200" rx="18" style="fill:var(--grund)"/>', pts = [], v = 0;
    while (pts.length < n && v++ < 3000) {
      var r = HT.zufall.int(6, 10), x = HT.zufall.int(14, 186), y = HT.zufall.int(14, 186);
      if (pts.every(function (q) { return Math.hypot(q[0] - x, q[1] - y) > q[2] + r + 3; })) pts.push([x, y, r]);
    }
    pts.forEach(function (q) { s += '<circle cx="' + q[0] + '" cy="' + q[1] + '" r="' + q[2] + '" fill="' + farbe + '"/>'; });
    return s + '</svg>';
  }

  HT.registerModule({
    id: 'zahlen-mengen', name: 'Zahlen und Mengen', kategorie: 'sprache', symbol: 'trend',
    ziel: 'Zahlenverständnis: Mengen schätzen, Zahlen vergleichen, sicher rechnen',
    beschreibung: 'Drei Aufgabenarten wechseln sich ab: Welche von zwei Punktmengen ist größer (ohne Zählen, kurze Darbietung)? Welche Zahl ist größer (mit Dezimalzahlen in höheren Leveln)? Und Grundrechenaufgaben mit Zeitlimit. Level: Mengenverhältnis (bis 1,15 : 1), Zahlenraum (bis 10 000), Rechenarten und Zeitlimit.',
    anleitung: 'Entscheiden Sie zügig: Wo sind mehr Punkte? Welche Zahl ist größer? Was ist das Ergebnis? Tippen Sie auf die richtige Antwort oder nutzen Sie die Pfeiltasten.',
    tasten: ['links', 'rechts'], levels: levels,
    levelLabels: { verhaeltnis: 'Mengenverhältnis', zahlenraum: 'Zahlenraum', rechenarten: 'Rechenarten', zeitlimitSek: 'Zeitlimit (s)', dezimal: 'Dezimalzahlen' },
    create: function (container, ctx) {
      var p = ctx.params, nr = 0;
      return HT.quiz(container, ctx, {
        aufgabe: function () {
          var art = ['menge', 'vergleich', 'rechnen'][nr++ % 3];
          if (art === 'menge') {
            var a = HT.zufall.int(8, 26), b = Math.round(a * p.verhaeltnis);
            if (HT.zufall.chance(0.5)) { var t = a; a = b; b = t; }
            var mehr = a > b ? 'links' : 'rechts';
            return {
              frage: 'Wo sind <b>mehr</b> Punkte? (nicht zählen – schätzen!)',
              inhalt: '<div style="display:flex">' + '<div style="margin:0 14px">' + punkteWolke(a, '#3D7BE0') + '</div><div style="margin:0 14px">' + punkteWolke(b, '#E8833A') + '</div></div>',
              optionen: [{ html: '◀ Links', wert: 'links', taste: 'links' }, { html: 'Rechts ▶', wert: 'rechts', taste: 'rechts' }], richtig: mehr, reiz: a + ' vs ' + b, zeitMs: Math.max(2500, p.zeitlimitSek * 600), seite: mehr,
              beimZeigen: function (el) { HT.zeit.nach(Math.max(1200, 3000 - p.verhaeltnis * 200), function () { el.style.opacity = '.08'; }); }
            };
          }
          if (art === 'vergleich') {
            var x, y;
            if (p.dezimal) { var g = HT.zufall.int(1, 9); x = g + HT.zufall.int(1, 9) / 10; do { y = Math.round((g + HT.zufall.int(10, 99) / 100) * 100) / 100; } while (y === x); }
            else { x = HT.zufall.int(1, p.zahlenraum); y = x + HT.zufall.wahl([-1, 1]) * HT.zufall.int(1, Math.max(2, Math.round(p.zahlenraum / 10))); }
            if (y === x || y < 0) y = x + 1;
            var fmt = function (v) { return String(v).replace('.', ','); };
            return { frage: 'Welche Zahl ist <b>größer</b>?', inhalt: '', optionen: [{ html: '<span style="font-size:2.2rem">' + fmt(x) + '</span>', wert: 'links', taste: 'links' }, { html: '<span style="font-size:2.2rem">' + fmt(y) + '</span>', wert: 'rechts', taste: 'rechts' }], richtig: x > y ? 'links' : 'rechts', reiz: x + ' vs ' + y, zeitMs: p.zeitlimitSek * 1000 };
          }
          var op = HT.zufall.wahl(p.rechenarten.split('')), r = Math.min(p.zahlenraum, 1000), a2, b2, erg;
          if (op === '+') { a2 = HT.zufall.int(1, r / 2); b2 = HT.zufall.int(1, r / 2); erg = a2 + b2; }
          if (op === '-') { a2 = HT.zufall.int(2, r); b2 = HT.zufall.int(1, a2); erg = a2 - b2; }
          if (op === '*') { a2 = HT.zufall.int(2, 12); b2 = HT.zufall.int(2, r >= 1000 ? 25 : 10); erg = a2 * b2; }
          if (op === '/') { b2 = HT.zufall.int(2, 12); erg = HT.zufall.int(2, 12); a2 = b2 * erg; }
          var opts = [erg]; while (opts.length < 4) { var f = erg + HT.zufall.wahl([-10, -2, -1, 1, 2, 10, b2, -b2]); if (f >= 0 && opts.indexOf(f) < 0) opts.push(f); }
          return { frage: 'Rechnen Sie:', inhalt: '<div class="m-wort">' + a2 + ' ' + { '+': '+', '-': '−', '*': '·', '/': ':' }[op] + ' ' + b2 + ' = ?</div>', optionen: HT.zufall.mischen(opts).map(function (o) { return { html: String(o), wert: String(o) }; }), richtig: String(erg), reiz: a2 + op + b2, zeitMs: p.zeitlimitSek * 1000 + 3000 };
        }
      });
    },
    preview: function (el) {
      var b = function (mark) {
        var s = '<svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg"><rect x="30" y="20" width="160" height="160" rx="14" fill="#f5f8fa"/><rect x="210" y="20" width="160" height="160" rx="14" fill="#f5f8fa"/>';
        [[60, 50], [100, 70], [150, 50], [80, 120], [140, 140], [110, 110]].forEach(function (q) { s += '<circle cx="' + q[0] + '" cy="' + q[1] + '" r="9" fill="#3D7BE0"/>'; });
        [[250, 60], [320, 90], [280, 140]].forEach(function (q) { s += '<circle cx="' + q[0] + '" cy="' + q[1] + '" r="9" fill="#E8833A"/>'; });
        s += '<rect x="95" y="215" width="100" height="54" rx="12" fill="' + (mark ? '#e2f5ea' : '#fff') + '" stroke="' + (mark ? '#2EAD6B' : '#e1e8ed') + '" stroke-width="3"/><text x="145" y="249" text-anchor="middle" font-size="18" font-weight="700" font-family="-apple-system,sans-serif">Links</text><rect x="205" y="215" width="100" height="54" rx="12" fill="#fff" stroke="#e1e8ed" stroke-width="3"/><text x="255" y="249" text-anchor="middle" font-size="18" font-weight="700" font-family="-apple-system,sans-serif">Rechts</text>';
        return s + '</svg>';
      };
      return HT.beispiel(el, [{ svg: b(false), text: 'Wo sind mehr Punkte?', dauer: 1500 }, { svg: b(true), zeiger: [36, 80], klick: true, text: 'Links!', dauer: 1500 }]);
    }
  });
})();

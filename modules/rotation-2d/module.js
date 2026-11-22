/* Modul: Mentale Rotation 2D – zwei Formen: gleich (nur gedreht) oder gespiegelt? Level: Winkel, Komplexität. */
(function () {
  'use strict';
  var HT = window.HT;
  var levels = HT.stufen(14, function (t, i) {
    return { zellen: HT.lerpInt(4, 8, t), maxWinkel: i <= 2 ? 0 : i <= 5 ? 90 : 180, beliebig: i >= 9, zeitlimitSek: i >= 8 ? HT.lerpInt(12, 6, (i - 8) / 6) : 0 };
  });

  function polyomino(n) {
    var c = [[0, 0]];
    while (c.length < n) {
      var b = HT.zufall.wahl(c), r = HT.zufall.wahl([[1, 0], [-1, 0], [0, 1], [0, -1]]), q = [b[0] + r[0], b[1] + r[1]];
      if (!c.some(function (x) { return x[0] === q[0] && x[1] === q[1]; })) c.push(q);
    }
    return c;
  }
  function spiegelSymmetrisch(c) {
    var key = function (cs) { var mx = Math.min.apply(null, cs.map(function (q) { return q[0]; })), my = Math.min.apply(null, cs.map(function (q) { return q[1]; })); return cs.map(function (q) { return (q[0] - mx) + ',' + (q[1] - my); }).sort().join(';'); };
    var m = c.map(function (q) { return [-q[0], q[1]]; });
    for (var r = 0; r < 4; r++) { if (key(m) === key(c)) return true; m = m.map(function (q) { return [-q[1], q[0]]; }); }
    return false;
  }
  function figur(c, winkel, spiegel, farbe) {
    var cx = c.reduce(function (s, q) { return s + q[0]; }, 0) / c.length, cy = c.reduce(function (s, q) { return s + q[1]; }, 0) / c.length;
    var z = 22;
    var rects = c.map(function (q) { return '<rect x="' + ((q[0] - cx) * z - z / 2) + '" y="' + ((q[1] - cy) * z - z / 2) + '" width="' + z + '" height="' + z + '" rx="3" fill="' + farbe + '" stroke="#26333c" stroke-width="2.5"/>'; }).join('');
    // Markierung auf dem ersten Feld, damit die Lage eindeutig ist
    var q0 = c[0];
    rects += '<circle cx="' + ((q0[0] - cx) * z) + '" cy="' + ((q0[1] - cy) * z) + '" r="5" fill="#fff" stroke="#26333c" stroke-width="2"/>';
    return '<g transform="rotate(' + winkel + ') scale(' + (spiegel ? -1 : 1) + ' 1)">' + rects + '</g>';
  }

  HT.registerModule({
    id: 'rotation-2d', name: 'Mentale Rotation 2D', kategorie: 'raeumlich', symbol: 'wuerfel',
    ziel: 'Formen in der Vorstellung drehen und vergleichen',
    beschreibung: 'Zwei flache Figuren werden nebeneinander gezeigt. Die rechte ist gedreht – entweder ist sie dieselbe Figur oder ihr Spiegelbild. Die Entscheidung „gleich“ oder „gespiegelt“ erfordert mentale Rotation. Level: Komplexität der Figur (4–8 Felder), Drehwinkel (0° bis beliebig) und Zeitlimit.',
    anleitung: 'Ist die rechte Figur dieselbe wie die linke, nur gedreht? Dann „Gleich“ (Taste J). Ist sie gespiegelt (wie im Spiegel), dann „Gespiegelt“ (Taste N).',
    tasten: ['ja', 'nein'], eingaben: ['ja', 'nein'], levels: levels,
    levelLabels: { zellen: 'Felder', maxWinkel: 'Max. Winkel (°)', beliebig: 'Beliebige Winkel', zeitlimitSek: 'Zeitlimit (s)' },
    create: function (container, ctx) {
      var p = ctx.params;
      return HT.quiz(container, ctx, {
        aufgabe: function () {
          var c; do { c = polyomino(p.zellen); } while (spiegelSymmetrisch(c));
          var spiegel = HT.zufall.chance(0.5);
          var w = p.maxWinkel === 0 ? 0 : p.beliebig ? HT.zufall.int(20, 340) : HT.zufall.wahl(p.maxWinkel === 90 ? [90, 270] : [90, 180, 270]);
          var farbe = HT.zufall.wahl(['#3D7BE0', '#E8833A', '#2EAD6B', '#8A63D2']);
          var basisW = HT.zufall.wahl([0, 90, 180, 270]);
          return {
            frage: 'Gleich oder gespiegelt?',
            inhalt: '<svg viewBox="0 0 440 220" width="560" height="280"><rect x="5" y="5" width="200" height="210" rx="18" style="fill:var(--grund)"/><rect x="235" y="5" width="200" height="210" rx="18" style="fill:var(--grund)"/><g transform="translate(105 110)">' + figur(c, basisW, false, farbe) + '</g><g transform="translate(335 110)">' + figur(c, basisW + w, spiegel, farbe) + '</g></svg>',
            optionen: [{ html: '✓&nbsp; Gleich', wert: 'gleich', taste: 'ja' }, { html: '⇋&nbsp; Gespiegelt', wert: 'gespiegelt', taste: 'nein' }],
            richtig: spiegel ? 'gespiegelt' : 'gleich', reiz: w + '°' + (spiegel ? ' gespiegelt' : ''), zeitMs: p.zeitlimitSek * 1000
          };
        }
      });
    },
    preview: function (el) {
      var c = [[0, 0], [0, 1], [0, 2], [1, 2], [1, 3]];
      var b = function (mark) {
        return '<svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg"><g transform="translate(110 110)">' + figur(c, 0, false, '#3D7BE0') + '</g><g transform="translate(290 110)">' + figur(c, 90, false, '#3D7BE0') + '</g><rect x="100" y="220" width="90" height="50" rx="12" fill="' + (mark ? '#e2f5ea' : '#fff') + '" stroke="' + (mark ? '#2EAD6B' : '#e1e8ed') + '" stroke-width="3"/><text x="145" y="252" text-anchor="middle" font-size="18" font-weight="700" font-family="-apple-system,sans-serif">Gleich</text><rect x="210" y="220" width="110" height="50" rx="12" fill="#fff" stroke="#e1e8ed" stroke-width="3"/><text x="265" y="252" text-anchor="middle" font-size="18" font-weight="700" font-family="-apple-system,sans-serif">Gespiegelt</text></svg>';
      };
      return HT.beispiel(el, [{ svg: b(false), text: 'Rechts nur gedreht?', dauer: 1700 }, { svg: b(true), zeiger: [36, 82], klick: true, text: 'Ja – gleich!', dauer: 1700 }]);
    }
  });
})();

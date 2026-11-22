/* Modul: Mentale Rotation 3D – Würfelfiguren als isometrische SVG, gleich oder gespiegelt?
 * Level: Anzahl Würfel, Drehachsen (erst nur senkrecht, dann beliebig), Zeitlimit. */
(function () {
  'use strict';
  var HT = window.HT;
  var levels = HT.stufen(14, function (t, i) {
    return { wuerfel: HT.lerpInt(4, 10, t), achsen: i <= 5 ? 'senkrecht' : 'alle', zeitlimitSek: i >= 9 ? HT.lerpInt(18, 9, (i - 9) / 5) : 0 };
  });

  // Alle 24 Drehungen eines Würfels als Funktionen
  function rotZ(p) { return [-p[1], p[0], p[2]]; }
  function rotX(p) { return [p[0], -p[2], p[1]]; }
  function rotY(p) { return [p[2], p[1], -p[0]]; }
  var ROT = (function () {
    var basis = [[0, 0, 0]], seq = [];
    var fs = { z: rotZ, x: rotX, y: rotY };
    var probe = [1, 2, 3], gesehen = {};
    var stapel = [[]];
    while (stapel.length && seq.length < 24) {
      var weg = stapel.shift();
      var v = weg.reduce(function (p, a) { return fs[a](p); }, probe.slice());
      var v2 = weg.reduce(function (p, a) { return fs[a](p); }, [0, 1, 0]);
      var k = v.join(',') + '|' + v2.join(',');
      if (gesehen[k]) continue;
      gesehen[k] = true; seq.push(weg);
      ['z', 'x', 'y'].forEach(function (a) { stapel.push(weg.concat([a])); });
    }
    return seq.map(function (weg) { return function (p) { return weg.reduce(function (q, a) { return fs[a](q); }, p); }; });
  })();
  var ROT_Z = [function (p) { return p; }, rotZ, function (p) { return rotZ(rotZ(p)); }, function (p) { return rotZ(rotZ(rotZ(p))); }];

  function norm(cs) {
    var m = [0, 1, 2].map(function (i) { return Math.min.apply(null, cs.map(function (c) { return c[i]; })); });
    return cs.map(function (c) { return [c[0] - m[0], c[1] - m[1], c[2] - m[2]]; });
  }
  function key(cs) { return norm(cs).map(function (c) { return c.join(','); }).sort().join(';'); }
  function chiral(cs) {
    var mk = key(cs.map(function (c) { return [-c[0], c[1], c[2]]; }));
    return !ROT.some(function (r) { return key(cs.map(r)) === mk; });
  }
  function erzeugen(n) {
    for (var v = 0; v < 200; v++) {
      var cs = [[0, 0, 0]], p = [0, 0, 0], achse = null;
      while (cs.length < n) {
        var a; do { a = HT.zufall.int(0, 2); } while (a === achse);
        achse = a;
        var len = HT.zufall.int(1, 3), dir = HT.zufall.chance(0.5) ? 1 : -1, ok = true;
        for (var k = 0; k < len && cs.length < n; k++) {
          p = p.slice(); p[a] += dir;
          if (cs.some(function (c) { return c[0] === p[0] && c[1] === p[1] && c[2] === p[2]; })) { ok = false; break; }
          cs.push(p);
        }
        if (!ok) break;
      }
      if (cs.length === n && chiral(cs)) return cs;
    }
    return [[0, 0, 0], [1, 0, 0], [2, 0, 0], [2, 1, 0], [2, 1, 1]];
  }
  function iso(cs, farbe) {
    cs = norm(cs);
    var s = 32, c30 = Math.cos(Math.PI / 6);
    var P = function (x, y, z) { return [(x - y) * c30 * s, (x + y) * 0.5 * s - z * s]; };
    var pts = function (arr) { return arr.map(function (q) { var r = P(q[0], q[1], q[2]); return r[0].toFixed(1) + ',' + r[1].toFixed(1); }).join(' '); };
    var sortiert = cs.slice().sort(function (a, b) { return (a[0] + a[1] + a[2]) - (b[0] + b[1] + b[2]) || a[2] - b[2]; });
    var alle = [];
    sortiert.forEach(function (c) { var x = c[0], y = c[1], z = c[2]; alle.push(P(x, y, z), P(x + 1, y + 1, z + 1), P(x + 1, y, z), P(x, y + 1, z + 1)); });
    var minX = Math.min.apply(null, alle.map(function (q) { return q[0]; })), maxX = Math.max.apply(null, alle.map(function (q) { return q[0]; }));
    var minY = Math.min.apply(null, alle.map(function (q) { return q[1]; })), maxY = Math.max.apply(null, alle.map(function (q) { return q[1]; }));
    var g = '<g transform="translate(' + (-(minX + maxX) / 2) + ' ' + (-(minY + maxY) / 2) + ')" stroke="#26333c" stroke-width="1.6" stroke-linejoin="round">';
    sortiert.forEach(function (c) {
      var x = c[0], y = c[1], z = c[2];
      g += '<polygon points="' + pts([[x, y + 1, z], [x + 1, y + 1, z], [x + 1, y + 1, z + 1], [x, y + 1, z + 1]]) + '" fill="' + farbe[2] + '"/>';
      g += '<polygon points="' + pts([[x + 1, y, z], [x + 1, y + 1, z], [x + 1, y + 1, z + 1], [x + 1, y, z + 1]]) + '" fill="' + farbe[1] + '"/>';
      g += '<polygon points="' + pts([[x, y, z + 1], [x + 1, y, z + 1], [x + 1, y + 1, z + 1], [x, y + 1, z + 1]]) + '" fill="' + farbe[0] + '"/>';
    });
    return g + '</g>';
  }
  var FARBEN = [['#bcd7fb', '#6e9fe8', '#3D7BE0'], ['#ffd9b0', '#f2a560', '#E8833A'], ['#c6ecd6', '#6cc895', '#2EAD6B'], ['#e0d4f7', '#ad91e3', '#8A63D2']];

  HT.registerModule({
    id: 'rotation-3d', name: 'Mentale Rotation 3D', kategorie: 'raeumlich', symbol: 'wuerfel',
    ziel: 'Räumliche Körper in der Vorstellung drehen und vergleichen',
    beschreibung: 'Zwei aus Würfeln zusammengesetzte Körper werden räumlich (isometrisch) dargestellt. Der rechte ist gedreht und ist entweder derselbe Körper oder sein Spiegelbild. Zunächst wird nur um die senkrechte Achse gedreht, in höheren Leveln um beliebige Achsen. Level: Anzahl der Würfel, Drehachsen und Zeitlimit.',
    anleitung: 'Stellen Sie sich vor, Sie drehen den linken Körper. Kann er genauso aussehen wie der rechte? Dann „Gleich“ (Taste J). Ist der rechte ein Spiegelbild, dann „Gespiegelt“ (Taste N).',
    tasten: ['ja', 'nein'], eingaben: ['ja', 'nein'], levels: levels,
    levelLabels: { wuerfel: 'Würfel', achsen: 'Drehachsen', zeitlimitSek: 'Zeitlimit (s)' },
    bewertung: { aufstufenAb: 0.8, abstufenUnter: 0.55 },
    create: function (container, ctx) {
      var p = ctx.params;
      return HT.quiz(container, ctx, {
        aufgabe: function () {
          var cs = erzeugen(p.wuerfel), farbe = HT.zufall.wahl(FARBEN);
          var spiegel = HT.zufall.chance(0.5);
          var rechts = spiegel ? cs.map(function (c) { return [-c[0], c[1], c[2]]; }) : cs;
          var pool = p.achsen === 'senkrecht' ? ROT_Z.slice(1) : ROT.slice(1);
          var r = HT.zufall.wahl(pool);
          rechts = rechts.map(r);
          return {
            frage: 'Ist der rechte Körper <b>gleich</b> oder <b>gespiegelt</b>?',
            inhalt: '<svg viewBox="0 0 520 260" width="620" height="310"><rect x="4" y="4" width="248" height="252" rx="18" style="fill:var(--grund)"/><rect x="268" y="4" width="248" height="252" rx="18" style="fill:var(--grund)"/><g transform="translate(128 130)">' + iso(cs, farbe) + '</g><g transform="translate(392 130)">' + iso(rechts, farbe) + '</g></svg>',
            optionen: [{ html: '✓&nbsp; Gleich', wert: 'gleich', taste: 'ja' }, { html: '⇋&nbsp; Gespiegelt', wert: 'gespiegelt', taste: 'nein' }],
            richtig: spiegel ? 'gespiegelt' : 'gleich', reiz: p.wuerfel + ' Würfel' + (spiegel ? ' gespiegelt' : ''), zeitMs: p.zeitlimitSek * 1000
          };
        }
      });
    },
    preview: function (el) {
      var cs = [[0, 0, 0], [1, 0, 0], [2, 0, 0], [2, 1, 0], [2, 1, 1]];
      var b = function (mark) {
        return '<svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg"><g transform="translate(110 110)">' + iso(cs, FARBEN[0]) + '</g><g transform="translate(290 110)">' + iso(cs.map(rotZ), FARBEN[0]) + '</g><rect x="100" y="220" width="90" height="50" rx="12" fill="' + (mark ? '#e2f5ea' : '#fff') + '" stroke="' + (mark ? '#2EAD6B' : '#e1e8ed') + '" stroke-width="3"/><text x="145" y="252" text-anchor="middle" font-size="18" font-weight="700" font-family="-apple-system,sans-serif">Gleich</text><rect x="210" y="220" width="110" height="50" rx="12" fill="#fff" stroke="#e1e8ed" stroke-width="3"/><text x="265" y="252" text-anchor="middle" font-size="18" font-weight="700" font-family="-apple-system,sans-serif">Gespiegelt</text></svg>';
      };
      return HT.beispiel(el, [{ svg: b(false), text: 'In Gedanken drehen …', dauer: 1800 }, { svg: b(true), zeiger: [36, 82], klick: true, text: 'Gleich – nur gedreht', dauer: 1700 }]);
    }
  });
})();

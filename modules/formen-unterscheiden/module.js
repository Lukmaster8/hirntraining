/* Modul: Formen unterscheiden – Welche Figur ist anders? / Welche passt genau zur Vorlage?
 * Unterschiede: Form, Drehung, Spiegelung, Detail, Größe. Level: Anzahl Alternativen, Unterschiedsgrad. */
(function () {
  'use strict';
  var HT = window.HT;
  // Polyomino-Grundformen (Zellen x,y)
  var POLY = [
    [[0, 0], [0, 1], [0, 2], [1, 2]], [[0, 0], [1, 0], [1, 1], [2, 1]], [[0, 0], [1, 0], [2, 0], [1, 1]], [[0, 0], [0, 1], [1, 1], [1, 2], [2, 2]],
    [[0, 0], [1, 0], [1, 1], [1, 2], [2, 2]], [[0, 1], [1, 0], [1, 1], [1, 2], [2, 0]], [[0, 0], [0, 1], [0, 2], [1, 0], [2, 0]], [[0, 0], [1, 0], [2, 0], [2, 1], [3, 1]]
  ];
  var DIFF = ['form', 'form', 'form', 'drehung', 'drehung', 'drehung', 'spiegel', 'detail', 'detail', 'spiegel', 'detail', 'groesse', 'spiegel', 'groesse'];
  var levels = DIFF.map(function (d, i) { return { unterschied: d, alternativen: Math.min(8, 3 + Math.floor(i / 2)), zeitlimitSek: i >= 10 ? 12 : 0, mitglied: i >= 8 }; });

  function transform(cells, dreh, spiegel) {
    var c = cells.map(function (q) { return [spiegel ? -q[0] : q[0], q[1]]; });
    for (var r = 0; r < dreh; r++) c = c.map(function (q) { return [-q[1], q[0]]; });
    var mx = Math.min.apply(null, c.map(function (q) { return q[0]; })), my = Math.min.apply(null, c.map(function (q) { return q[1]; }));
    return c.map(function (q) { return [q[0] - mx, q[1] - my]; });
  }
  function figurSvg(f) {
    var cells = transform(POLY[f.poly], f.dreh, f.spiegel);
    var w = Math.max.apply(null, cells.map(function (q) { return q[0]; })) + 1, h = Math.max.apply(null, cells.map(function (q) { return q[1]; })) + 1;
    var z = 20 * (f.skala || 1), ox = 50 - w * z / 2, oy = 50 - h * z / 2;
    var s = cells.map(function (q, i) { return '<rect x="' + (ox + q[0] * z) + '" y="' + (oy + q[1] * z) + '" width="' + z + '" height="' + z + '" fill="' + f.farbe + '" stroke="#26333c" stroke-width="2"/>'; }).join('');
    var d = cells[f.detail % cells.length];
    s += '<circle cx="' + (ox + d[0] * z + z / 2) + '" cy="' + (oy + d[1] * z + z / 2) + '" r="' + z * 0.24 + '" fill="#fff" stroke="#26333c" stroke-width="2"/>';
    return '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">' + s + '</svg>';
  }
  function variante(f, art) {
    var g = HT.zusammen(f);
    if (art === 'form') g.poly = HT.zufall.wahl(HT.zufall.ausser(POLY.map(function (x, i) { return i; }), [f.poly]));
    if (art === 'drehung') g.dreh = (f.dreh + HT.zufall.wahl([1, 2, 3])) % 4;
    if (art === 'spiegel') g.spiegel = !f.spiegel;
    if (art === 'detail') g.detail = (f.detail + HT.zufall.int(1, POLY[f.poly].length - 1)) % POLY[f.poly].length;
    if (art === 'groesse') g.skala = 0.8;
    // Spiegelung symmetrischer Formen kann identisch aussehen → Detail zusätzlich verschieben
    if (figurSvg(g) === figurSvg(f)) g.detail = (f.detail + 1) % POLY[f.poly].length;
    return g;
  }

  HT.registerModule({
    id: 'formen-unterscheiden', name: 'Formen unterscheiden', kategorie: 'wahrnehmung', symbol: 'raster',
    ziel: 'Genaues Hinsehen: Formen, Lage und Details vergleichen',
    beschreibung: 'Zuerst wird verglichen: welche Figur anders ist, oder welche genau zur Vorlage passt. Die Unterschiede werden feiner: Form, Drehung, Spiegelung, Detail, Größe. Ab Level 9 kommt die Zuordnung aus dem Symbolfeld: Die linke Taste, wenn die gezeigte Figur im Feld vorkommt, die rechte Taste, wenn sie fehlt.',
    anleitung: 'Vergleichen Sie die Figuren genau. Tippen Sie auf die Figur, die anders ist – oder auf die Figur, die genau wie die Vorlage aussieht. In späteren Stufen: Linke Taste, wenn die Figur im Feld ist, rechte Taste, wenn nicht.',
    tasten: [], levels: levels,
    levelLabels: { unterschied: 'Unterschied', alternativen: 'Alternativen', zeitlimitSek: 'Zeitlimit (s)' },
    create: function (container, ctx) {
      var p = ctx.params, nr = 0;
      return HT.quiz(container, ctx, {
        aufgabe: function () {
          var basis = { poly: HT.zufall.int(0, POLY.length - 1), dreh: HT.zufall.int(0, 3), spiegel: false, detail: HT.zufall.int(0, 3), farbe: HT.zufall.wahl(['#3D7BE0', '#E8833A', '#2EAD6B', '#8A63D2', '#E25C5C']), skala: 1 };
          if (p.mitglied) {
            var drin = HT.zufall.chance(0.5);
            var nFeld = Math.min(6, Math.max(4, p.alternativen - 1));
            var stelle = HT.zufall.int(0, nFeld - 1);
            var feld = [];
            for (var k = 0; k < nFeld; k++) feld.push(drin && k === stelle ? basis : variante(basis, p.unterschied));
            var feldHtml = '<div style="display:flex;flex-wrap:wrap;justify-content:center;max-width:460px">' + feld.map(function (f) {
              return '<div style="width:84px;height:84px;margin:6px;background:#fff;border-radius:12px;border:1px solid #e1e8ed">' + figurSvg(f) + '</div>';
            }).join('') + '</div>';
            return {
              frage: 'Ist die linke Figur im Feld? <b>Links = ja</b>, <b>rechts = nein</b>.',
              inhalt: '<div style="display:flex;align-items:center;justify-content:center;flex-wrap:wrap"><div style="width:120px;height:120px;margin:8px;border:3px solid var(--akzent);border-radius:14px;background:#fff">' + figurSvg(basis) + '</div>' + feldHtml + '</div>',
              optionen: [{ html: 'Ja, ist dabei', wert: 1, taste: 'links' }, { html: 'Nein, fehlt', wert: 0, taste: 'rechts' }],
              richtig: drin ? 1 : 0, reiz: 'mitglied-' + p.unterschied, zeitMs: p.zeitlimitSek ? p.zeitlimitSek * 1000 : 0
            };
          }
          var vorlage = (nr++ % 2) === 1;
          var n = p.alternativen, opts = [], richtig = HT.zufall.int(0, n - 1);
          for (var i = 0; i < n; i++) {
            if (vorlage) opts.push(i === richtig ? basis : variante(basis, p.unterschied));
            else opts.push(i === richtig ? variante(basis, p.unterschied) : basis);
          }
          return {
            frage: vorlage ? 'Welche Figur sieht <b>genau so aus</b> wie die Vorlage?' : 'Welche Figur ist <b>anders</b> als die anderen?',
            inhalt: vorlage ? '<div class="m-kachel" style="width:150px;height:150px;border:3px solid var(--akzent)">' + figurSvg(basis) + '</div>' : '',
            optionen: opts.map(function (f, i) { return { html: figurSvg(f), wert: i }; }),
            richtig: richtig, klasse: 'm-bildwahl', reiz: (vorlage ? 'vorlage-' : 'anders-') + p.unterschied,
            zeitMs: p.zeitlimitSek ? p.zeitlimitSek * 1000 : 0
          };
        }
      });
    },
    preview: function (el) {
      var f = { poly: 0, dreh: 0, spiegel: false, detail: 1, farbe: '#3D7BE0', skala: 1 };
      var g = HT.zusammen(f, { spiegel: true });
      var reihe = function (mark) {
        var s = '<svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg"><text x="200" y="50" text-anchor="middle" font-size="20" font-weight="600" font-family="-apple-system,sans-serif" fill="#51606b">Welche ist anders?</text>';
        [f, f, g, f].forEach(function (x, i) {
          var X = 30 + i * 90;
          s += '<rect x="' + X + '" y="100" width="80" height="80" rx="12" fill="' + (mark && i === 2 ? '#e2f5ea' : '#fff') + '" stroke="' + (mark && i === 2 ? '#2EAD6B' : '#e1e8ed') + '" stroke-width="3"/><g transform="translate(' + X + ' 100) scale(.8)">' + figurSvg(x).replace(/<svg[^>]*>|<\/svg>/g, '') + '</g>';
        });
        return s + '</svg>';
      };
      return HT.beispiel(el, [{ svg: reihe(false), text: 'Genau vergleichen', dauer: 1600 }, { svg: reihe(true), zeiger: [59, 47], klick: true, text: 'Gespiegelt!', dauer: 1800 }]);
    }
  });
})();

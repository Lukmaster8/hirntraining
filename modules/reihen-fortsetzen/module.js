/* Modul: Reihen fortsetzen – Folgen aus Formen oder Zahlen, das nächste Element wählen. Level: Regelkomplexität. */
(function () {
  'use strict';
  var HT = window.HT;
  var levels = HT.stufen(14, function (t, i) { return { stufe: i, laenge: i <= 6 ? 4 : 6, optionen: i <= 4 ? 3 : 4, zeitlimitSek: i >= 11 ? 25 : 0 }; });
  var FARBEN = ['#3D7BE0', '#E25C5C', '#2EAD6B', '#F2B630', '#8A63D2'];

  function zahlKarte(n) { return '<div style="font-size:2rem;font-weight:800;min-width:2.2em;text-align:center">' + n + '</div>'; }
  function formKarte(f) {
    if (f.typ === 'pfeil') return '<svg viewBox="0 0 100 100" width="70" height="70"><g transform="rotate(' + f.w + ' 50 50)"><path d="M50 12 L80 50 H62 V88 H38 V50 H20 Z" fill="' + f.farbe + '" stroke="#26333c" stroke-width="3"/></g></svg>';
    if (f.typ === 'punkte') {
      var s = '<svg viewBox="0 0 100 100" width="70" height="70">';
      for (var i = 0; i < f.n; i++) s += '<circle cx="' + (22 + (i % 3) * 28) + '" cy="' + (22 + Math.floor(i / 3) * 28) + '" r="10" fill="' + f.farbe + '" stroke="#26333c" stroke-width="2"/>';
      return s + '</svg>';
    }
    return '<span style="display:inline-block;width:70px;height:70px">' + HT.formSvg(f.form, f.farbe) + '</span>';
  }
  function gleich(a, b) { return JSON.stringify(a) === JSON.stringify(b); }

  /* Erzeugt eine Folge je nach Stufe. Rückgabe: { elemente, richtig, falsche, art } */
  function folge(stufe, laenge) {
    var r = HT.zufall, a, d, el = [], i;
    var zahlen = function (fn) { for (i = 0; i < laenge + 1; i++) el.push(fn(i)); return { art: 'zahl', elemente: el.slice(0, laenge), richtig: el[laenge] }; };
    if (stufe > 6) {
      var s = stufe - 6;
      if (s <= 1) { a = r.int(1, 10); d = r.int(1, 2); return zahlen(function (k) { return a + k * d; }); }
      if (s <= 2) { a = r.int(2, 20); d = r.int(3, 6); return zahlen(function (k) { return a + k * d; }); }
      if (s <= 3) { if (r.chance(0.5)) { a = r.int(40, 70); d = r.int(3, 7); return zahlen(function (k) { return a - k * d; }); } a = r.int(1, 3); return zahlen(function (k) { return a * Math.pow(2, k); }); }
      if (s <= 4) { a = r.int(1, 10); var d1 = r.int(1, 4), d2 = r.int(5, 9); return zahlen(function (k) { var sum = a; for (var j = 0; j < k; j++) sum += j % 2 ? d2 : d1; return sum; }); }
      if (s <= 5) { a = r.int(1, 9); var b = r.int(20, 30); return zahlen(function (k) { return k % 2 ? b - Math.floor(k / 2) * 2 : a + (k / 2) * 3; }); }
      if (s <= 6) { a = r.int(1, 5); return zahlen(function (k) { return a + k * (k + 1) / 2; }); }
      a = r.int(1, 3); var bb = r.int(2, 4);
      return zahlen(function (k) { var x = a, y = bb; if (k === 0) return x; for (var j = 1; j < k; j++) { var t = x + y; x = y; y = t; } return y; });
    }
    // Formen
    var farbe = r.wahl(FARBEN);
    if (stufe <= 2) { var f2 = r.stichprobe(['kreis', 'quadrat', 'dreieck', 'stern', 'herz'], 2); for (i = 0; i <= laenge; i++) el.push({ form: f2[i % 2], farbe: farbe }); }
    else if (stufe <= 4) { var f3 = r.stichprobe(['kreis', 'quadrat', 'dreieck', 'stern', 'herz', 'raute'], 3); for (i = 0; i <= laenge; i++) el.push({ form: f3[i % 3], farbe: farbe }); }
    else if (stufe <= 6) { var fs = r.stichprobe(['kreis', 'quadrat', 'dreieck', 'stern'], 2), fa = r.stichprobe(FARBEN, 3); for (i = 0; i <= laenge; i++) el.push({ form: fs[i % 2], farbe: fa[i % 3] }); }
    else if (stufe <= 8) { var w0 = r.wahl([0, 90]), dw = r.wahl([45, 90, -45]); for (i = 0; i <= laenge; i++) el.push({ typ: 'pfeil', w: (w0 + i * dw + 720) % 360, farbe: farbe }); }
    else if (stufe <= 10) { var start = r.int(1, 2), schritt = 1; for (i = 0; i <= laenge; i++) el.push({ typ: 'punkte', n: Math.min(9, start + i * schritt), farbe: farbe }); }
    else if (stufe <= 12) { var fa2 = r.stichprobe(FARBEN, 2), dw2 = r.wahl([45, 90]); for (i = 0; i <= laenge; i++) el.push({ typ: 'pfeil', w: (i * dw2) % 360, farbe: fa2[i % 2] }); }
    else { var fa3 = r.stichprobe(FARBEN, 3); for (i = 0; i <= laenge; i++) el.push({ typ: 'punkte', n: [1, 3, 2, 4, 3, 5, 4][i], farbe: fa3[i % 3] }); }
    return { art: 'form', elemente: el.slice(0, laenge), richtig: el[laenge] };
  }
  function falsche(f, n) {
    var out = [], r = HT.zufall, versuche = 0;
    while (out.length < n && versuche++ < 200) {
      var x;
      if (f.art === 'zahl') { var v = f.richtig; x = v + r.wahl([-2, -1, 1, 2, 3, -3, 10, -10, v]); if (x < 0) continue; }
      else {
        x = HT.kopie(f.richtig);
        if (x.typ === 'pfeil') { if (r.chance(0.6)) x.w = (x.w + r.wahl([45, 90, 180, 270])) % 360; else x.farbe = r.wahl(FARBEN); }
        else if (x.typ === 'punkte') { if (r.chance(0.7)) x.n = Math.max(1, Math.min(9, x.n + r.wahl([-2, -1, 1, 2]))); else x.farbe = r.wahl(FARBEN); }
        else { if (r.chance(0.5)) x.form = r.wahl(['kreis', 'quadrat', 'dreieck', 'stern', 'herz', 'raute']); else x.farbe = r.wahl(FARBEN); }
      }
      if (!gleich(x, f.richtig) && !out.some(function (o) { return gleich(o, x); })) out.push(x);
    }
    return out;
  }

  HT.registerModule({
    id: 'reihen-fortsetzen', name: 'Reihen fortsetzen', kategorie: 'exekutiv', symbol: 'trend',
    ziel: 'Regeln erkennen und logisch weiterdenken',
    beschreibung: 'Zuerst eine Reihe aus vier Bildern: das fünfte Element wird gewählt. Die Bildregeln werden von Wiederholung über Farbe und Drehung bis zu wachsenden Mengen schwerer. Ab Level 7 folgen Zahlenregeln, vom einfachen Schritt bis zu verschachtelten Abständen.',
    anleitung: 'Schauen Sie sich die Reihe an: Nach welcher Regel geht sie weiter? Bei den Bildern fehlt das fünfte Element. Tippen Sie unten auf das passende Element (oder Ziffer 1–4).',
    tasten: [], levels: levels,
    levelLabels: { stufe: 'Regelstufe', laenge: 'Länge der Reihe', optionen: 'Antworten', zeitlimitSek: 'Zeitlimit (s)' },
    create: function (container, ctx) {
      var p = ctx.params;
      return HT.quiz(container, ctx, {
        aufgabe: function () {
          var f = folge(p.stufe, p.laenge);
          var karte = function (x) { return f.art === 'zahl' ? zahlKarte(x) : formKarte(x); };
          var opts = HT.zufall.mischen([f.richtig].concat(falsche(f, p.optionen - 1)));
          var inhalt = '<div style="display:flex;align-items:center;flex-wrap:wrap;justify-content:center">' + f.elemente.map(function (x) {
            return '<div class="m-kachel" style="width:104px;height:104px;margin:6px">' + karte(x) + '</div>';
          }).join('') + '<div class="m-kachel" style="width:104px;height:104px;margin:6px;border:3px dashed var(--akzent);font-size:2.4rem;font-weight:800;color:var(--akzent)">?</div></div>';
          return {
            frage: 'Wie geht die Reihe weiter?', inhalt: inhalt,
            optionen: opts.map(function (o, i) { return { html: karte(o), wert: i }; }),
            richtig: opts.indexOf(f.richtig), reiz: f.art + ' Stufe ' + p.stufe, zeitMs: p.zeitlimitSek * 1000
          };
        }
      });
    },
    preview: function (el) {
      var reihe = [2, 4, 6, 8];
      var b = function (mark) {
        var s = '<svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg">';
        reihe.concat(['?']).forEach(function (n, i) { s += '<rect x="' + (25 + i * 72) + '" y="60" width="62" height="62" rx="12" fill="#fff" stroke="' + (n === '?' ? '#1BA8B5' : '#e1e8ed') + '" stroke-width="3"' + (n === '?' ? ' stroke-dasharray="6 4"' : '') + '/><text x="' + (56 + i * 72) + '" y="102" text-anchor="middle" font-size="28" font-weight="800" font-family="-apple-system,sans-serif" fill="' + (n === '?' ? '#1BA8B5' : '#1E2A33') + '">' + (n === '?' && mark ? 10 : n) + '</text>'; });
        [9, 10, 12].forEach(function (n, i) { var m = mark && n === 10; s += '<rect x="' + (95 + i * 75) + '" y="190" width="62" height="62" rx="12" fill="' + (m ? '#e2f5ea' : '#fff') + '" stroke="' + (m ? '#2EAD6B' : '#e1e8ed') + '" stroke-width="3"/><text x="' + (126 + i * 75) + '" y="232" text-anchor="middle" font-size="26" font-weight="800" font-family="-apple-system,sans-serif">' + n + '</text>'; });
        return s + '</svg>';
      };
      return HT.beispiel(el, [{ svg: b(false), text: 'Immer +2 …', dauer: 1700 }, { svg: b(true), zeiger: [50, 74], klick: true, text: 'Also 10!', dauer: 1700 }]);
    }
  });
})();

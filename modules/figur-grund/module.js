/* Modul: Figur-Grund – überlagerte Linienzeichnungen, die gesuchte Figur erkennen.
 * Level: Anzahl überlagerter Figuren, Störlinien, gleiche Linienfarbe, Anzahl Antwortmöglichkeiten. */
(function () {
  'use strict';
  var HT = window.HT;
  var FORMEN = ['kreis', 'quadrat', 'dreieck', 'raute', 'stern', 'herz', 'kreuz', 'sechseck', 'mond', 'pfeil', 'tropfen', 'blitz', 'fuenfeck', 'oval', 'halbkreis'];
  var FARBEN = ['#3D7BE0', '#E25C5C', '#2EAD6B', '#8A63D2', '#E8833A', '#1BA8B5'];
  var levels = HT.stufen(14, function (t, i) {
    return { figuren: HT.lerpInt(2, 6, t), stoerlinien: i <= 4 ? 0 : HT.lerpInt(3, 16, (i - 5) / 9), einfarbig: i >= 4, optionen: HT.lerpInt(3, 5, t), frage: i >= 9 && i % 2 === 0 ? 'fehlt' : 'enthalten' };
  });

  function bild(liste, stoer, einfarbig) {
    var s = '<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" width="360" height="360"><rect width="200" height="200" rx="16" fill="#fff"/>';
    for (var k = 0; k < stoer; k++) {
      var x1 = HT.zufall.int(10, 190), y1 = HT.zufall.int(10, 190);
      s += '<path d="M' + x1 + ' ' + y1 + ' Q' + HT.zufall.int(10, 190) + ' ' + HT.zufall.int(10, 190) + ' ' + HT.zufall.int(10, 190) + ' ' + HT.zufall.int(10, 190) + '" fill="none" stroke="#26333c" stroke-width="2.5" stroke-linecap="round" opacity=".6"/>';
    }
    liste.forEach(function (f, i) {
      var farbe = einfarbig ? '#26333c' : FARBEN[i % FARBEN.length];
      s += '<g transform="translate(' + f.x + ' ' + f.y + ') scale(' + f.s + ')">' + HT.form(f.form, farbe, { umriss: true, strich: 5 / f.s * 0.9, drehung: f.dreh }) + '</g>';
    });
    return s + '</svg>';
  }

  HT.registerModule({
    id: 'figur-grund', name: 'Figur-Grund', kategorie: 'wahrnehmung', symbol: 'stapel',
    ziel: 'Figuren aus einem unübersichtlichen Hintergrund herauslösen',
    beschreibung: 'Mehrere Umrissfiguren liegen übereinander, in höheren Leveln zusätzlich mit Störlinien und in einheitlicher Linienfarbe. Es soll erkannt werden, welche Figur im Bild enthalten ist – bzw. in schwereren Stufen, welche Figur fehlt. Trainiert werden Figur-Grund-Wahrnehmung und visuelle Analyse.',
    anleitung: 'Im großen Bild liegen mehrere Formen übereinander. Schauen Sie genau hin und tippen Sie unten auf die Form, die im Bild versteckt ist (oder – wenn gefragt – auf die Form, die NICHT im Bild ist).',
    tasten: [], levels: levels,
    levelLabels: { figuren: 'Figuren', stoerlinien: 'Störlinien', einfarbig: 'Einfarbig', optionen: 'Antworten', frage: 'Frage' },
    create: function (container, ctx) {
      var p = ctx.params;
      return HT.quiz(container, ctx, {
        aufgabe: function () {
          var gewaehlt = HT.zufall.stichprobe(FORMEN, p.figuren + p.optionen);
          var drin = gewaehlt.slice(0, p.figuren), draussen = gewaehlt.slice(p.figuren);
          var liste = drin.map(function (f) { return { form: f, x: HT.zufall.int(20, 80), y: HT.zufall.int(20, 80), s: HT.zufall.zahl(0.9, 1.15), dreh: HT.zufall.wahl([0, 0, 15, -15, 30]) }; });
          var richtig, opts;
          if (p.frage === 'enthalten') { richtig = HT.zufall.wahl(drin); opts = HT.zufall.mischen([richtig].concat(draussen.slice(0, p.optionen - 1))); }
          else { richtig = draussen[0]; opts = HT.zufall.mischen([richtig].concat(HT.zufall.stichprobe(drin, p.optionen - 1))); }
          return {
            frage: p.frage === 'enthalten' ? 'Welche Form ist <b>im Bild enthalten</b>?' : 'Welche Form ist <b>nicht</b> im Bild?',
            inhalt: '<div style="border-radius:16px;box-shadow:var(--schatten-2);border:1px solid var(--linie);line-height:0">' + bild(liste, p.stoerlinien, p.einfarbig) + '</div>',
            optionen: opts.map(function (f) { return { html: HT.formSvg(f, '#26333c', { umriss: true, strich: 6 }), wert: f }; }),
            richtig: richtig, klasse: 'm-bildwahl', reiz: p.frage + ':' + richtig
          };
        }
      });
    },
    preview: function (el) {
      var liste = [{ form: 'stern', x: 40, y: 40, s: 1, dreh: 0 }, { form: 'kreis', x: 60, y: 50, s: 1, dreh: 0 }, { form: 'dreieck', x: 50, y: 70, s: 1, dreh: 0 }];
      var b = function (mark) {
        var opts = ['herz', 'stern', 'kreuz'];
        var s = '<svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg"><g transform="translate(110 4) scale(.9)">' + bild(liste, 0, true).replace(/<svg[^>]*>|<\/svg>/g, '') + '</g>';
        opts.forEach(function (f, i) {
          var x = 90 + i * 80;
          s += '<rect x="' + x + '" y="200" width="66" height="66" rx="12" fill="' + (mark && i === 1 ? '#e2f5ea' : '#fff') + '" stroke="' + (mark && i === 1 ? '#2EAD6B' : '#e1e8ed') + '" stroke-width="3"/><g transform="translate(' + (x + 8) + ' 208) scale(.5)">' + HT.form(f, '#26333c', { umriss: true, strich: 8 }) + '</g>';
        });
        return s + '</svg>';
      };
      return HT.beispiel(el, [{ svg: b(false), text: 'Welche Form steckt im Bild?', dauer: 1700 }, { svg: b(true), zeiger: [50, 77], klick: true, text: 'Der Stern!', dauer: 1700 }]);
    }
  });
})();

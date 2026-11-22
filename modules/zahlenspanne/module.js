/* Modul: Zahlenspanne – Ziffern erscheinen nacheinander, danach über den Ziffernblock eingeben (vorwärts und rückwärts). */
(function () {
  'use strict';
  var HT = window.HT;
  var DEF = [[3, 1100, 0], [3, 900, 0], [4, 1000, 0], [4, 850, 0], [5, 950, 0], [5, 800, 0], [6, 900, 0], [3, 1000, 1], [4, 950, 1], [5, 900, 1], [7, 850, 0], [6, 850, 1], [8, 800, 0], [7, 800, 1], [9, 750, 0], [8, 750, 1]];
  var levels = DEF.map(function (d) { return { laenge: d[0], tempoMs: d[1], rueckwaerts: !!d[2] }; });

  HT.registerModule({
    id: 'zahlenspanne', name: 'Zahlenspanne', kategorie: 'gedaechtnis', symbol: 'tastatur',
    ziel: 'Verbale Merkspanne und Arbeitsgedächtnis für Zahlen erweitern',
    beschreibung: 'Ziffern werden nacheinander gezeigt und anschließend über den Ziffernblock eingegeben – in höheren Leveln in umgekehrter Reihenfolge. Optional werden die Ziffern zusätzlich vorgelesen. Level: Länge der Zahlenfolge (3–9), Tempo und Richtung.',
    anleitung: 'Merken Sie sich die Ziffern, die nacheinander erscheinen. Geben Sie sie danach über den Ziffernblock oder die Tastatur ein und bestätigen Sie mit OK. Bei „rückwärts“ beginnen Sie mit der letzten Ziffer.',
    tasten: [],
    levels: levels,
    levelLabels: { laenge: 'Länge', tempoMs: 'Tempo (ms)', rueckwaerts: 'Rückwärts' },
    parameterSchema: {
      richtung: { typ: 'auswahl', label: 'Richtung', standard: 'level', optionen: [{ wert: 'level', label: 'Nach Level' }, { wert: 'vorwaerts', label: 'Immer vorwärts' }, { wert: 'rueckwaerts', label: 'Immer rückwärts' }] },
      vorlesen: { typ: 'schalter', label: 'Ziffern vorlesen (falls Systemstimme vorhanden)', standard: false },
      spanneTest: { typ: 'schalter', label: 'Spannentest (Länge passt sich an, für das Screening)', standard: false }
    },
    create: function (container, ctx) {
      var p = ctx.params, Z = HT.zeit, aus = null;
      var rueck = p.richtung === 'rueckwaerts' ? true : p.richtung === 'vorwaerts' ? false : p.rueckwaerts;
      var zone = HT.m.neu(container, 'm-zentrum');
      var anw = HT.m.neu(zone, 'm-anweisung');
      var anzeige = HT.m.neu(zone, 'm-text-gross', '', { fontSize: '7rem', minHeight: '9rem', display: 'flex', alignItems: 'center' });
      var eingabeEl = HT.m.neu(zone, 'm-eingabe-anzeige');
      var block = HT.m.neu(zone, 'm-ziffernblock');
      var folge = [], eingabe = '', phase = 'zeigen', start = 0, laenge = p.spanneTest ? 3 : p.laenge, fehlerInFolge = 0;
      ['1', '2', '3', '4', '5', '6', '7', '8', '9', '⌫', '0', 'OK'].forEach(function (z) {
        var b = HT.el('button', { type: 'button', class: z === 'OK' ? 'ok' : '' }, z);
        HT.tap(b, function () { taste(z); });
        block.appendChild(b);
      });
      function sichtbar(eing) { eingabeEl.style.display = eing ? '' : 'none'; block.style.display = eing ? '' : 'none'; anzeige.style.display = eing ? 'none' : ''; }
      function runde() {
        phase = 'zeigen'; eingabe = ''; eingabeEl.textContent = '';
        folge = []; for (var i = 0; i < laenge; i++) { var z; do { z = HT.zufall.int(0, 9); } while (i && z === folge[i - 1]); folge.push(z); }
        sichtbar(false);
        anw.innerHTML = 'Merken Sie sich <b>' + laenge + ' Ziffern</b>';
        anzeige.textContent = '';
        var k = 0;
        (function zeige() {
          if (k >= folge.length) {
            anzeige.textContent = '';
            phase = 'eingabe'; start = Z.jetzt();
            anw.innerHTML = rueck ? 'Jetzt <b>rückwärts</b> eingeben' : 'Jetzt in <b>gleicher Reihenfolge</b> eingeben';
            sichtbar(true);
            return;
          }
          anzeige.textContent = folge[k];
          if (p.vorlesen) ctx.audio.sprechen(String(folge[k]));
          k++;
          Z.nach(Math.round(p.tempoMs * 0.75), function () { anzeige.textContent = ''; Z.nach(Math.round(p.tempoMs * 0.25), zeige); });
        })();
      }
      function taste(z) {
        if (phase !== 'eingabe') return;
        if (z === '⌫') eingabe = eingabe.slice(0, -1);
        else if (z === 'OK') { if (eingabe.length) pruefen(); return; }
        else if (eingabe.length < folge.length) eingabe += z;
        eingabeEl.textContent = eingabe;
        if (eingabe.length === folge.length) Z.nach(250, pruefen);
      }
      function pruefen() {
        if (phase !== 'eingabe') return;
        phase = 'ende';
        var soll = (rueck ? folge.slice().reverse() : folge).join('');
        var ok = eingabe === soll;
        ctx.onEvent({ korrekt: ok, reiz: folge.join(''), reaktion: eingabe, rtMs: (Z.jetzt() - start) / folge.length, typ: rueck ? 'rueckwaerts' : 'vorwaerts' });
        if (p.spanneTest) { if (ok) { laenge = Math.min(9, laenge + 1); fehlerInFolge = 0; } else if (++fehlerInFolge >= 2) { laenge = Math.max(2, laenge - 1); fehlerInFolge = 0; } }
        ctx.feedback(ok);
        if (!ok) anw.innerHTML = 'Richtig wäre: <b>' + soll + '</b>';
        Z.nach(ok ? 1000 : 2000, runde);
      }
      return {
        start: function () {
          aus = HT.eingabe.an(function (a, d) { if (a === 'ziffer') taste(String(d.wert)); if (a === 'loeschen') taste('⌫'); if (a === 'ok') taste('OK'); });
          Z.nach(500, runde);
        },
        stop: function () { if (aus) aus(); }
      };
    },
    preview: function (el) {
      var gross = function (t, sub) { return '<svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg"><text x="200" y="' + (sub ? 120 : 185) + '" font-size="' + (sub ? 40 : 120) + '" font-weight="800" text-anchor="middle" font-family="-apple-system,sans-serif" fill="#1E2A33" letter-spacing="' + (sub ? 10 : 0) + '">' + t + '</text>' + (sub ? '<rect x="110" y="70" width="180" height="70" rx="14" fill="none" stroke="#cfd9e0" stroke-width="3"/><text x="200" y="210" font-size="20" text-anchor="middle" fill="#51606b" font-family="-apple-system,sans-serif">' + sub + '</text>' : '') + '</svg>'; };
      return HT.beispiel(el, [{ svg: gross('4'), dauer: 800 }, { svg: gross('7'), dauer: 800 }, { svg: gross('2'), dauer: 800 }, { svg: gross('4 7 2', 'Eingeben und OK'), text: 'Nachtippen', dauer: 1800 }]);
    }
  });
})();

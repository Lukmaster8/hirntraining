/* Modul: Arbeitsgedächtnis – Folgen
 * Felder eines 3×3- bis 5×5-Rasters leuchten nacheinander auf, die Reihenfolge wird nachgetippt; ab Level 8 rückwärts.
 * Level: Folgenlänge 2–9, Tempo, Rastergröße. */
(function () {
  'use strict';
  var HT = window.HT;

  var DEF = [
    // [raster, länge, tempoMs, rückwärts]
    [3, 2, 1000, false], [3, 3, 1000, false], [3, 3, 800, false], [4, 4, 900, false], [4, 4, 750, false], [4, 5, 850, false], [4, 6, 800, false],
    [4, 3, 950, true], [4, 4, 900, true], [4, 5, 850, true], [5, 6, 800, false], [5, 5, 800, true], [5, 7, 750, false], [5, 6, 750, true],
    [5, 8, 700, false], [5, 7, 700, true], [5, 9, 650, false]
  ];
  var levels = DEF.map(function (d) { return { raster: d[0], laenge: d[1], tempoMs: d[2], rueckwaerts: d[3] }; });

  HT.registerModule({
    id: 'arbeitsgedaechtnis',
    name: 'Arbeitsgedächtnis Folgen',
    kategorie: 'gedaechtnis',
    symbol: 'raster',
    ziel: 'Räumlich-visuelles Arbeitsgedächtnis und Merkspanne trainieren',
    beschreibung: 'Felder in einem Raster leuchten nacheinander auf. Anschließend wird die Reihenfolge durch Antippen wiederholt – in höheren Leveln in umgekehrter Reihenfolge (rückwärts), was zusätzlich die Manipulation im Arbeitsgedächtnis fordert. Jede vollständig richtige Folge zählt als Treffer.',
    anleitung: 'Merken Sie sich, in welcher Reihenfolge die Felder aufleuchten. Tippen Sie danach die Felder in derselben Reihenfolge an. Wenn „rückwärts“ angezeigt wird, beginnen Sie mit dem zuletzt leuchtenden Feld.',
    eingabe: ['tastatur', 'maus', 'touch'],
    tasten: [],
    levels: levels,
    levelLabels: { raster: 'Raster', laenge: 'Folgenlänge', tempoMs: 'Tempo (ms)', rueckwaerts: 'Rückwärts' },
    parameterSchema: {
      richtung: { typ: 'auswahl', label: 'Richtung', standard: 'level', optionen: [{ wert: 'level', label: 'Nach Level' }, { wert: 'vorwaerts', label: 'Immer vorwärts' }, { wert: 'rueckwaerts', label: 'Immer rückwärts' }] }
    },
    bewertung: { aufstufenAb: 0.8, abstufenUnter: 0.5 },

    create: function (container, ctx) {
      var p = ctx.params, Z = HT.zeit;
      var rueck = p.richtung === 'rueckwaerts' ? true : p.richtung === 'vorwaerts' ? false : p.rueckwaerts;
      var zone = HT.m.neu(container, 'm-zentrum');
      var anw = HT.m.neu(zone, 'm-anweisung', '');
      var groesse = Math.min(520, Math.max(300, container.clientHeight - 170));
      var raster = HT.m.neu(zone, 'm-raster', '', { gridTemplateColumns: 'repeat(' + p.raster + ', 1fr)', width: groesse + 'px', height: groesse + 'px' });
      var zellen = [];
      for (var i = 0; i < p.raster * p.raster; i++) {
        (function (idx) {
          var z = HT.el('div', { class: 'm-zelle' });
          HT.tap(z, function () { klick(idx); });
          raster.appendChild(z);
          zellen.push(z);
        })(i);
      }
      var tf = HT.tastenFokus(zellen, { spalten: p.raster, beiWahl: function (i) { klick(i); } });
      var folge = [], eingabe = [], phase = 'zeigen', startEingabe = 0;

      function runde() {
        phase = 'zeigen';
        eingabe = [];
        zellen.forEach(function (z) { z.className = 'm-zelle'; });
        folge = HT.zufall.stichprobe(zellen.map(function (z, i) { return i; }), p.laenge);
        anw.innerHTML = 'Gut merken … <b>' + p.laenge + ' Felder</b>';
        var k = 0;
        function zeige() {
          if (k > 0) zellen[folge[k - 1]].classList.remove('leuchtet');
          if (k >= folge.length) {
            phase = 'eingabe';
            startEingabe = Z.jetzt();
            anw.innerHTML = rueck ? 'Jetzt <b>rückwärts</b> nachtippen' : 'Jetzt in <b>gleicher Reihenfolge</b> nachtippen';
            return;
          }
          var z = zellen[folge[k]];
          Z.nach(120, function () { z.classList.add('leuchtet'); ctx.audio.ton(440 + folge[k - 1 >= 0 ? k - 1 : 0] * 30, 0.12, 'sine', 0, 0.15); });
          k++;
          Z.nach(p.tempoMs, zeige);
        }
        Z.nach(700, zeige);
      }

      function klick(i) {
        if (phase !== 'eingabe') return;
        var soll = rueck ? folge[folge.length - 1 - eingabe.length] : folge[eingabe.length];
        eingabe.push(i);
        if (i === soll) {
          zellen[i].classList.add('richtig');
          ctx.audio.klick();
          if (eingabe.length === folge.length) {
            phase = 'ende';
            ctx.onEvent({ korrekt: true, reiz: folge.join('-'), reaktion: eingabe.join('-'), rtMs: (Z.jetzt() - startEingabe) / folge.length, seite: HT.seiteVon((folge[0] % p.raster + 0.5) / p.raster) });
            ctx.feedback(true);
            Z.nach(1000, runde);
          }
        } else {
          phase = 'ende';
          zellen[i].classList.add('falsch');
          var richtigIdx = soll;
          Z.nach(250, function () { zellen[richtigIdx].classList.add('gewaehlt'); });
          ctx.onEvent({ korrekt: false, reiz: folge.join('-'), reaktion: eingabe.join('-'), seite: HT.seiteVon((folge[0] % p.raster + 0.5) / p.raster) });
          ctx.feedback(false);
          Z.nach(1500, runde);
        }
      }

      return {
        start: function () { runde(); },
        stop: function () { tf.entfernen(); }
      };
    },

    preview: function (el) {
      function gitter(an, rich) {
        var s = '';
        for (var i = 0; i < 9; i++) {
          var x = 110 + (i % 3) * 62, y = 60 + Math.floor(i / 3) * 62;
          var f = an === i ? '#1BA8B5' : (rich && rich.indexOf(i) >= 0 ? '#e2f5ea' : '#edf2f5');
          s += '<rect x="' + x + '" y="' + y + '" width="54" height="54" rx="10" fill="' + f + '"' + (rich && rich.indexOf(i) >= 0 ? ' stroke="#2EAD6B" stroke-width="3"' : '') + '/>';
        }
        return '<svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg">' + s + '</svg>';
      }
      var pos = function (i) { return [(110 + (i % 3) * 62 + 27) / 4, (60 + Math.floor(i / 3) * 62 + 27) / 3]; };
      return HT.beispiel(el, [
        { svg: gitter(1), text: 'Merken: 1.', dauer: 900 },
        { svg: gitter(5), text: 'Merken: 2.', dauer: 900 },
        { svg: gitter(6), text: 'Merken: 3.', dauer: 900 },
        { svg: gitter(-1), text: 'Jetzt nachtippen', dauer: 900 },
        { svg: gitter(-1, [1]), zeiger: pos(1), klick: true, dauer: 1000 },
        { svg: gitter(-1, [1, 5]), zeiger: pos(5), klick: true, dauer: 1000 },
        { svg: gitter(-1, [1, 5, 6]), zeiger: pos(6), klick: true, text: 'Richtig!', dauer: 1400 }
      ]);
    }
  });
})();

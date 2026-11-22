/* Modul: Arbeitsgedächtnis – Folgen
 * Punkte auf einem Kreis leuchten nacheinander auf, die Reihenfolge wird nachgetippt; ab Level 8 rückwärts.
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
    beschreibung: 'Punkte liegen auf einem Kreis und leuchten nacheinander auf. Anschließend wird die Reihenfolge durch Antippen wiederholt, in höheren Leveln rückwärts. Jede vollständig richtige Folge zählt als Treffer. Die Zahl der Punkte und die Länge der Folge steigen mit dem Level.',
    anleitung: 'Merken Sie sich, in welcher Reihenfolge die Punkte auf dem Kreis aufleuchten. Tippen Sie danach dieselben Punkte in derselben Reihenfolge an. Wenn „rückwärts“ angezeigt wird, beginnen Sie mit dem zuletzt leuchtenden Punkt.',
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
      var anzahl = p.raster <= 3 ? 6 : p.raster === 4 ? 8 : 9;
      var raster = HT.m.neu(zone, '', '', { position: 'relative', width: groesse + 'px', height: groesse + 'px' });
      var zellen = [], dot = Math.max(54, Math.min(78, Math.round(groesse / 7)));
      var radius = groesse * 0.36;
      for (var i = 0; i < anzahl; i++) {
        (function (idx) {
          var winkel = -Math.PI / 2 + (idx / anzahl) * Math.PI * 2;
          var z = HT.el('div', { class: 'm-zelle', style: {
            position: 'absolute', width: dot + 'px', height: dot + 'px', borderRadius: '50%',
            left: Math.round(groesse / 2 + Math.cos(winkel) * radius - dot / 2) + 'px',
            top: Math.round(groesse / 2 + Math.sin(winkel) * radius - dot / 2) + 'px'
          } });
          HT.tap(z, function () { klick(idx); });
          raster.appendChild(z);
          zellen.push(z);
        })(i);
      }
      var tf = HT.tastenFokus(zellen, { spalten: Math.ceil(anzahl / 2), beiWahl: function (i) { klick(i); } });
      var folge = [], eingabe = [], phase = 'zeigen', startEingabe = 0;
      function seiteVon(idx) {
        var winkel = -Math.PI / 2 + (idx / anzahl) * Math.PI * 2;
        return HT.seiteVon(0.5 + Math.cos(winkel) * 0.36);
      }

      function runde() {
        phase = 'zeigen';
        eingabe = [];
        zellen.forEach(function (z) { z.className = 'm-zelle'; });
        folge = HT.zufall.stichprobe(zellen.map(function (z, i) { return i; }), p.laenge);
        anw.innerHTML = 'Gut merken … <b>' + p.laenge + ' Punkte</b>';
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
            ctx.onEvent({ korrekt: true, reiz: folge.join('-'), reaktion: eingabe.join('-'), rtMs: (Z.jetzt() - startEingabe) / folge.length, seite: seiteVon(folge[0]) });
            ctx.feedback(true);
            Z.nach(1000, runde);
          }
        } else {
          phase = 'ende';
          zellen[i].classList.add('falsch');
          var richtigIdx = soll;
          Z.nach(250, function () { zellen[richtigIdx].classList.add('gewaehlt'); });
          ctx.onEvent({ korrekt: false, reiz: folge.join('-'), reaktion: eingabe.join('-'), seite: seiteVon(folge[0]) });
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
        for (var i = 0; i < 6; i++) {
          var w = -Math.PI / 2 + (i / 6) * Math.PI * 2;
          var x = 200 + Math.cos(w) * 90 - 22, y = 160 + Math.sin(w) * 80 - 22;
          var f = an === i ? '#1BA8B5' : (rich && rich.indexOf(i) >= 0 ? '#e2f5ea' : '#edf2f5');
          s += '<circle cx="' + (x + 22) + '" cy="' + (y + 22) + '" r="22" fill="' + f + '"' + (rich && rich.indexOf(i) >= 0 ? ' stroke="#2EAD6B" stroke-width="3"' : '') + '/>';
        }
        return '<svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg">' + s + '</svg>';
      }
      var pos = function (i) {
        var w = -Math.PI / 2 + (i / 6) * Math.PI * 2;
        return [(200 + Math.cos(w) * 90) / 4, (160 + Math.sin(w) * 80) / 3];
      };
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

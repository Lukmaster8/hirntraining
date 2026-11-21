/* Modul: Verfolgen – bewegtes Objekt mit dem Zeiger (Maus/Finger/Pfeiltasten) verfolgen, Zeit auf dem Ziel messen.
 * Jeder 5-Sekunden-Abschnitt wird bewertet. Level: Tempo, Zielgröße, Unregelmäßigkeit der Bahn. */
(function () {
  'use strict';
  var HT = window.HT;
  var levels = HT.stufen(14, function (t) { return { tempo: HT.lerpInt(70, 260, t), groesse: HT.lerpInt(120, 50, t), unruhe: Math.round(HT.lerp(0.4, 2.2, t) * 10) / 10, zielAnteil: Math.round(HT.lerp(0.65, 0.75, t) * 100) / 100 }; });

  HT.registerModule({
    id: 'verfolgen', name: 'Verfolgen', kategorie: 'visuomotorik', symbol: 'hand',
    ziel: 'Augenfolgebewegung und fließende Auge-Hand-Koordination',
    beschreibung: 'Ein Ball bewegt sich auf einer weichen, zufälligen Bahn über den Bildschirm. Der Zeiger (Maus, Finger oder die mit den Pfeiltasten gesteuerte Markierung) soll möglichst ständig auf dem Ball bleiben. Alle 5 Sekunden wird bewertet, ob der Anteil der Zeit auf dem Ziel ausreicht. Level: Tempo, Größe des Balls und Unregelmäßigkeit der Bahn.',
    anleitung: 'Bleiben Sie mit der Maus oder dem Finger auf dem Ball und folgen Sie ihm. Der Ball leuchtet grün, solange Sie ihn treffen. Mit den Pfeiltasten können Sie den Zeiger ebenfalls steuern.',
    eingabe: ['maus', 'touch', 'tastatur'],
    tasten: [], levels: levels,
    levelLabels: { tempo: 'Tempo (px/s)', groesse: 'Ballgröße (px)', unruhe: 'Unruhe der Bahn', zielAnteil: 'Erforderlicher Anteil auf dem Ziel' },
    create: function (container, ctx) {
      var p = ctx.params, Z = HT.zeit, aus = [], C = HT.canvasVoll(container), cx = C.ctx, tasten = HT.pfeilTasten();
      var info = HT.m.neu(container, 'm-info');
      var ball = { x: C.b / 2, y: C.h / 2, w: HT.zufall.zahl(0, 6.28) };
      var zeiger = null, drauf = 0, gesamt = 0, abschnitt = 0, verlauf = [];
      return {
        start: function () {
          aus.push(HT.zeigerFolgen(C.c, { bewegt: function (x, y) { zeiger = [x, y]; } }));
          C.c.style.cursor = 'none';
          Z.frame(function (dt) {
            // Ball bewegen: weiche Richtungsänderung
            ball.w += (Math.random() - 0.5) * p.unruhe * dt * 6;
            ball.x += Math.cos(ball.w) * p.tempo * dt; ball.y += Math.sin(ball.w) * p.tempo * dt;
            var r = p.groesse / 2;
            if (ball.x < r + 10) { ball.x = r + 10; ball.w = Math.PI - ball.w; }
            if (ball.x > C.b - r - 10) { ball.x = C.b - r - 10; ball.w = Math.PI - ball.w; }
            if (ball.y < r + 40) { ball.y = r + 40; ball.w = -ball.w; }
            if (ball.y > C.h - r - 10) { ball.y = C.h - r - 10; ball.w = -ball.w; }
            if (tasten.aktiv()) {
              if (!zeiger) zeiger = [C.b / 2, C.h / 2];
              var v = 280 * dt;
              zeiger = [HT.klemmen(zeiger[0] + (tasten.rechts ? v : 0) - (tasten.links ? v : 0), 0, C.b), HT.klemmen(zeiger[1] + (tasten.runter ? v : 0) - (tasten.hoch ? v : 0), 0, C.h)];
            }
            var treffer = zeiger && Math.hypot(zeiger[0] - ball.x, zeiger[1] - ball.y) <= r;
            if (zeiger) { gesamt += dt; if (treffer) drauf += dt; abschnitt += dt; }
            // Zeichnen
            cx.clearRect(0, 0, C.b, C.h);
            verlauf.push([ball.x, ball.y]); if (verlauf.length > 40) verlauf.shift();
            cx.strokeStyle = 'rgba(27,168,181,.18)'; cx.lineWidth = r * 0.6; cx.lineCap = 'round'; cx.beginPath();
            verlauf.forEach(function (q, i) { if (i) cx.lineTo(q[0], q[1]); else cx.moveTo(q[0], q[1]); }); cx.stroke();
            var g = cx.createRadialGradient(ball.x - r * 0.3, ball.y - r * 0.3, r * 0.1, ball.x, ball.y, r);
            g.addColorStop(0, treffer ? '#8fe0b3' : '#ffd9a8'); g.addColorStop(1, treffer ? '#2EAD6B' : '#E8833A');
            cx.fillStyle = g; cx.beginPath(); cx.arc(ball.x, ball.y, r, 0, 7); cx.fill();
            if (zeiger) {
              cx.strokeStyle = '#26333c'; cx.lineWidth = 3;
              cx.beginPath(); cx.arc(zeiger[0], zeiger[1], 9, 0, 7); cx.stroke();
              cx.beginPath(); cx.moveTo(zeiger[0] - 16, zeiger[1]); cx.lineTo(zeiger[0] - 5, zeiger[1]); cx.moveTo(zeiger[0] + 5, zeiger[1]); cx.lineTo(zeiger[0] + 16, zeiger[1]);
              cx.moveTo(zeiger[0], zeiger[1] - 16); cx.lineTo(zeiger[0], zeiger[1] - 5); cx.moveTo(zeiger[0], zeiger[1] + 5); cx.lineTo(zeiger[0], zeiger[1] + 16); cx.stroke();
            }
            info.textContent = zeiger ? 'Auf dem Ball: ' + Math.round(gesamt ? drauf / gesamt * 100 : 0) + ' %' : 'Bewegen Sie den Zeiger auf den Ball';
            if (abschnitt >= 5) {
              var anteil = drauf / Math.max(0.001, gesamt), ok = anteil >= p.zielAnteil;
              ctx.onEvent({ korrekt: ok, reiz: '5 s Verfolgung', reaktion: Math.round(anteil * 100) + ' % auf dem Ziel', seite: HT.seiteVon(ball.x / C.b), typ: 'verfolgung' });
              if (ok) ctx.audio.richtig(); else ctx.audio.falsch();
              abschnitt = 0; drauf = 0; gesamt = 0;
            }
          });
        },
        stop: function () { aus.forEach(function (f) { f(); }); tasten.entfernen(); }
      };
    },
    preview: function (el) {
      var b = function (x, y, an) { return '<svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg"><circle cx="' + x + '" cy="' + y + '" r="34" fill="' + (an ? '#2EAD6B' : '#E8833A') + '"/></svg>'; };
      return HT.beispiel(el, [{ svg: b(100, 150, true), zeiger: [25, 50], text: 'Auf dem Ball bleiben', dauer: 900 }, { svg: b(180, 100, true), zeiger: [45, 33], dauer: 700 }, { svg: b(270, 140, true), zeiger: [67, 47], dauer: 700 }, { svg: b(320, 210, false), zeiger: [70, 60], text: 'Daneben – nachführen!', dauer: 1200 }]);
    }
  });
})();

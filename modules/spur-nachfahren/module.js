/* Modul: Spur nachfahren – Linie mit Maus/Finger nachfahren, ohne den Pfad zu verlassen.
 * Messwerte: Anteil innerhalb der Spur, mittlere Abweichung, Zeit. Level: Spurbreite, Kurvenreichtum. */
(function () {
  'use strict';
  var HT = window.HT;
  var levels = HT.stufen(14, function (t) { return { breite: HT.lerpInt(80, 22, t), kurven: HT.lerpInt(1, 6, t), zielQuote: Math.round(HT.lerp(0.8, 0.9, t) * 100) / 100 }; });

  HT.registerModule({
    id: 'spur-nachfahren', name: 'Spur nachfahren', kategorie: 'visuomotorik', symbol: 'stift',
    ziel: 'Feinmotorik und Bewegungssteuerung entlang einer Linie',
    beschreibung: 'Eine geschwungene Spur führt vom grünen Start zum Ziel. Sie wird mit gedrückter Maustaste oder dem Finger nachgefahren (alternativ mit den Pfeiltasten). Gemessen werden der Anteil der Strecke innerhalb der Spur, die mittlere Abweichung von der Mittellinie und die benötigte Zeit. Level: Spurbreite (80 bis 22 px) und Anzahl der Kurven.',
    anleitung: 'Setzen Sie Maus oder Finger auf den grünen Startpunkt und fahren Sie die Spur bis zur Zielfahne nach, ohne die Spur zu verlassen. Mit den Pfeiltasten geht es auch.',
    eingabe: ['maus', 'touch', 'tastatur'],
    tasten: [], levels: levels,
    levelLabels: { breite: 'Spurbreite (px)', kurven: 'Kurven', zielQuote: 'Erforderlicher Anteil in der Spur' },
    create: function (container, ctx) {
      var p = ctx.params, Z = HT.zeit, aus = [], C = HT.canvasVoll(container), cx = C.ctx, tasten = HT.pfeilTasten();
      var info = HT.m.neu(container, 'm-info');
      var pfad = [], laeuft = false, stift = null, innen = 0, gesamt = 0, abw = [], t0 = 0, fortschritt = 0, spur = [];
      function erzeugen() {
        var b = C.b, h = C.h, n = p.kurven + 2, pts = [];
        for (var i = 0; i < n; i++) pts.push([60 + i * (b - 120) / (n - 1), i === 0 || i === n - 1 ? h / 2 : HT.zufall.zahl(h * 0.18, h * 0.82)]);
        pfad = [];
        // Catmull-Rom → glatte Punktfolge
        for (i = 0; i < n - 1; i++) {
          var p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(n - 1, i + 2)];
          for (var t = 0; t < 1; t += 0.02) {
            var t2 = t * t, t3 = t2 * t;
            pfad.push([0.5 * ((2 * p1[0]) + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
              0.5 * ((2 * p1[1]) + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3)]);
          }
        }
        pfad.push(pts[n - 1]);
      }
      function abstand(x, y) {
        var best = 1e9, idx = 0;
        for (var i = 0; i < pfad.length; i++) { var d = Math.hypot(pfad[i][0] - x, pfad[i][1] - y); if (d < best) { best = d; idx = i; } }
        return { d: best, idx: idx };
      }
      function zeichnen() {
        cx.clearRect(0, 0, C.b, C.h);
        cx.lineCap = 'round'; cx.lineJoin = 'round';
        cx.strokeStyle = '#d6e6ea'; cx.lineWidth = p.breite + 6; linie(pfad);
        cx.strokeStyle = '#eef7f8'; cx.lineWidth = p.breite; linie(pfad);
        cx.setLineDash([8, 10]); cx.strokeStyle = '#9fc9cf'; cx.lineWidth = 2; linie(pfad); cx.setLineDash([]);
        if (spur.length > 1) { cx.strokeStyle = '#1BA8B5'; cx.lineWidth = 5; linie(spur); }
        var s = pfad[0], e = pfad[pfad.length - 1];
        cx.fillStyle = '#2EAD6B'; cx.beginPath(); cx.arc(s[0], s[1], Math.max(16, p.breite / 2), 0, 7); cx.fill();
        cx.fillStyle = '#fff'; cx.font = 'bold 14px -apple-system, sans-serif'; cx.textAlign = 'center'; cx.fillText('Start', s[0], s[1] + 5);
        cx.strokeStyle = '#26333c'; cx.lineWidth = 4; cx.beginPath(); cx.moveTo(e[0], e[1] + 20); cx.lineTo(e[0], e[1] - 34); cx.stroke();
        cx.fillStyle = '#E25C5C'; cx.beginPath(); cx.moveTo(e[0], e[1] - 34); cx.lineTo(e[0] + 30, e[1] - 24); cx.lineTo(e[0], e[1] - 14); cx.fill();
        if (stift) { cx.fillStyle = '#26333c'; cx.beginPath(); cx.arc(stift[0], stift[1], 7, 0, 7); cx.fill(); }
      }
      function linie(pts) { cx.beginPath(); pts.forEach(function (q, i) { if (i) cx.lineTo(q[0], q[1]); else cx.moveTo(q[0], q[1]); }); cx.stroke(); }
      function neu() { erzeugen(); laeuft = false; stift = null; innen = 0; gesamt = 0; abw = []; spur = []; fortschritt = 0; info.textContent = 'Am grünen Punkt beginnen'; zeichnen(); }
      function bewegen(x, y) {
        if (!laeuft) {
          var s = pfad[0];
          if (Math.hypot(x - s[0], y - s[1]) <= Math.max(18, p.breite / 2) + 6) { laeuft = true; t0 = Z.jetzt(); stift = [x, y]; spur = [[x, y]]; info.textContent = 'Weiter bis zur Fahne …'; }
          return;
        }
        var a = abstand(x, y), schritt = stift ? Math.hypot(x - stift[0], y - stift[1]) : 0;
        gesamt += schritt; if (a.d <= p.breite / 2) innen += schritt;
        abw.push(a.d); stift = [x, y]; spur.push([x, y]);
        fortschritt = Math.max(fortschritt, a.idx);
        info.textContent = 'In der Spur: ' + Math.round(gesamt ? innen / gesamt * 100 : 100) + ' %';
        zeichnen();
        if (fortschritt >= pfad.length - 3 && a.d <= p.breite) fertig();
      }
      function fertig() {
        laeuft = false;
        var quote = gesamt ? innen / gesamt : 0, ok = quote >= p.zielQuote;
        ctx.onEvent({ korrekt: ok, reiz: 'spur ' + p.breite + 'px', reaktion: Math.round(quote * 100) + ' % in der Spur, Ø Abweichung ' + Math.round(HT.mittel(abw) || 0) + ' px', rtMs: Z.jetzt() - t0, typ: 'spur' });
        ctx.feedback(ok);
        info.textContent = ok ? 'Sehr genau! ' + Math.round(quote * 100) + ' % in der Spur' : Math.round(quote * 100) + ' % in der Spur – noch genauer versuchen';
        Z.nach(1600, neu);
      }
      return {
        start: function () {
          aus.push(HT.zeigerFolgen(C.c, { bewegt: function (x, y, gedrueckt) { if (gedrueckt) bewegen(x, y); } }));
          Z.frame(function (dt) {
            if (!tasten.aktiv()) return;
            if (!laeuft) { var s = pfad[0]; bewegen(s[0], s[1]); return; }
            var v = 170 * dt, x = stift[0] + (tasten.rechts ? v : 0) - (tasten.links ? v : 0), y = stift[1] + (tasten.runter ? v : 0) - (tasten.hoch ? v : 0);
            bewegen(x, y);
          });
          neu();
        },
        stop: function () { aus.forEach(function (f) { f(); }); tasten.entfernen(); }
      };
    },
    preview: function (el) {
      var pfad = 'M40 150 C100 40 160 260 220 150 S330 60 360 150';
      var b = function (bis) { return '<svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg"><path d="' + pfad + '" fill="none" stroke="#d6e6ea" stroke-width="40" stroke-linecap="round"/><path d="' + pfad + '" fill="none" stroke="#9fc9cf" stroke-width="2" stroke-dasharray="6 8"/>' + (bis ? '<path d="' + pfad + '" fill="none" stroke="#1BA8B5" stroke-width="5" stroke-linecap="round" pathLength="100" stroke-dasharray="' + bis + ' 100"/>' : '') + '<circle cx="40" cy="150" r="18" fill="#2EAD6B"/></svg>'; };
      return HT.beispiel(el, [{ svg: b(0), zeiger: [10, 50], text: 'Am Start beginnen', dauer: 1100 }, { svg: b(35), zeiger: [40, 55], dauer: 900 }, { svg: b(70), zeiger: [70, 38], dauer: 900 }, { svg: b(100), zeiger: [90, 50], text: 'In der Spur bleiben!', dauer: 1500 }]);
    }
  });
})();

/* Modul: Zielklicken (Auge-Hand-Koordination) – Ziele erscheinen und verschwinden, rechtzeitig anklicken.
 * Level: Größe, Anzeigedauer, Bewegung, gleichzeitige Ziele. */
(function () {
  'use strict';
  var HT = window.HT;
  var levels = HT.stufen(14, function (t, i) { return { groesse: HT.lerpInt(120, 44, t), dauerMs: HT.lerpInt(2600, 900, t), bewegung: i >= 7 ? HT.lerpInt(40, 160, (i - 7) / 7) : 0, gleichzeitig: i <= 5 ? 1 : i <= 10 ? 2 : 3 }; });
  var FARBEN = ['#1BA8B5', '#E8833A', '#8A63D2', '#2EAD6B', '#E0619E'];

  HT.registerModule({
    id: 'zielklicken', name: 'Zielklicken', kategorie: 'visuomotorik', symbol: 'ziel',
    ziel: 'Schnell und zielgenau mit Maus oder Finger treffen',
    beschreibung: 'Kreisförmige Ziele erscheinen an zufälligen Stellen und verschwinden nach kurzer Zeit wieder. Sie sollen rechtzeitig angetippt werden. Mit steigendem Level werden die Ziele kleiner, kürzer sichtbar, beginnen sich zu bewegen und erscheinen zu mehreren gleichzeitig. Messwerte: Treffer, Fehlklicks, verpasste Ziele, Reaktionszeit und Seitenverteilung.',
    anleitung: 'Tippen oder klicken Sie die farbigen Ziele an, bevor sie verschwinden. Treffen Sie möglichst genau in die Mitte.',
    eingabe: ['maus', 'touch'],
    tasten: [], levels: levels,
    levelLabels: { groesse: 'Zielgröße (px)', dauerMs: 'Sichtbar (ms)', bewegung: 'Bewegung (px/s)', gleichzeitig: 'Gleichzeitige Ziele' },
    create: function (container, ctx) {
      var p = ctx.params, Z = HT.zeit, aus = [];
      var voll = HT.m.neu(container, 'm-voll', '', { cursor: 'crosshair' });
      var ziele = [];
      function neuesZiel() {
        var b = container.clientWidth, h = container.clientHeight, g = p.groesse;
        var el = HT.el('div', { style: { position: 'absolute', width: g + 'px', height: g + 'px', borderRadius: '50%', cursor: 'pointer', transition: 'transform .15s', transform: 'scale(.2)' } });
        var f = HT.zufall.wahl(FARBEN);
        el.innerHTML = '<svg viewBox="0 0 100 100" width="100%" height="100%"><circle cx="50" cy="50" r="48" fill="' + f + '"/><circle cx="50" cy="50" r="32" fill="#fff"/><circle cx="50" cy="50" r="18" fill="' + f + '"/></svg>';
        var z = { el: el, x: HT.zufall.zahl(10, b - g - 10), y: HT.zufall.zahl(10, h - g - 10), vx: HT.zufall.zahl(-1, 1), vy: HT.zufall.zahl(-1, 1), start: Z.jetzt(), weg: false };
        var n = Math.hypot(z.vx, z.vy) || 1; z.vx = z.vx / n * p.bewegung; z.vy = z.vy / n * p.bewegung;
        el.style.left = z.x + 'px'; el.style.top = z.y + 'px';
        voll.appendChild(el);
        requestAnimationFrame(function () { el.style.transform = 'scale(1)'; });
        HT.tap(el, function (ev) {
          ev.stopPropagation();
          if (z.weg) return;
          z.weg = true; Z.abbrechen(z.timer);
          var r = el.getBoundingClientRect(), c = container.getBoundingClientRect();
          ctx.onEvent({ korrekt: true, reiz: 'ziel', reaktion: 'getroffen', rtMs: Z.jetzt() - z.start, seite: HT.seiteVon((z.x + g / 2) / b) });
          ctx.audio.richtig();
          HT.feedback(container, true, r.left - c.left + g / 2, r.top - c.top + g / 2, { stumm: true, dauer: 450 });
          entfernen(z);
        });
        z.timer = Z.nach(p.dauerMs, function () {
          if (z.weg) return; z.weg = true;
          ctx.onEvent({ korrekt: false, auslassung: true, reiz: 'ziel', reaktion: 'verpasst', seite: HT.seiteVon((z.x + g / 2) / b) });
          el.style.transform = 'scale(.1)'; el.style.opacity = '0';
          setTimeout(function () { entfernen(z); }, 160);
        });
        ziele.push(z);
      }
      function entfernen(z) { if (z.el.parentNode) z.el.parentNode.removeChild(z.el); ziele = ziele.filter(function (x) { return x !== z; }); Z.nach(HT.zufall.int(250, 700), auffuellen); }
      function auffuellen() { while (ziele.length < p.gleichzeitig) neuesZiel(); }
      return {
        start: function () {
          aus.push(HT.tap(voll, function (ev) {
            if (ev.target !== voll) return;
            var r = voll.getBoundingClientRect(), q = ev.touches ? ev.touches[0] : ev;
            ctx.onEvent({ korrekt: false, reiz: 'leer', reaktion: 'daneben', seite: HT.seiteVon((q.clientX - r.left) / r.width) });
            HT.feedback(container, false, q.clientX - r.left, q.clientY - r.top, { dauer: 400 });
          }));
          if (p.bewegung) Z.frame(function (dt) {
            var b = container.clientWidth, h = container.clientHeight, g = p.groesse;
            ziele.forEach(function (z) {
              z.x += z.vx * dt; z.y += z.vy * dt;
              if (z.x < 0 || z.x > b - g) z.vx *= -1;
              if (z.y < 0 || z.y > h - g) z.vy *= -1;
              z.el.style.left = z.x + 'px'; z.el.style.top = z.y + 'px';
            });
          });
          Z.nach(500, auffuellen);
        },
        stop: function () { aus.forEach(function (f) { f(); }); }
      };
    },
    preview: function (el) {
      var b = function (x, y) { return '<svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg"><g transform="translate(' + x + ' ' + y + ')"><circle r="34" fill="#1BA8B5"/><circle r="22" fill="#fff"/><circle r="12" fill="#1BA8B5"/></g></svg>'; };
      return HT.beispiel(el, [{ svg: b(90, 80), zeiger: [22.5, 27], klick: true, text: 'Ziel antippen!', dauer: 1100 }, { svg: b(300, 210), zeiger: [75, 70], klick: true, dauer: 1100 }, { svg: b(200, 120), zeiger: [50, 40], klick: true, text: 'Schnell und genau', dauer: 1300 }]);
    }
  });
})();

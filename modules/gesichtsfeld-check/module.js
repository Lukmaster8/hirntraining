/* Modul (nur Screening): Gesichtsfeld-Kurzcheck.
 * Der Blick bleibt auf dem Punkt in der Mitte. An 24 Positionen (3 Abstände × 8 Richtungen) leuchtet kurz ein Lichtpunkt auf;
 * gesehen → OK drücken. Dazu einige Fangdurchgänge ohne Lichtpunkt. Abstände in Grad aus der Bildschirmgeometrie
 * (Einstellungen: sichtbare Bildschirmbreite, Abstand Auge–Bildschirm). Ersetzt keine augenärztliche Perimetrie. */
(function () {
  'use strict';
  var HT = window.HT;
  var GRAD = [8, 16, 24], RICHTUNG = [0, 45, 90, 135, 180, 225, 270, 315];

  HT.registerModule({
    id: 'gesichtsfeld-check', name: 'Gesichtsfeld-Kurzcheck', kategorie: 'wahrnehmung', symbol: 'auge', versteckt: true,
    ziel: 'Kurzer Überblick, ob Lichtpunkte im ganzen Gesichtsfeld bemerkt werden',
    beschreibung: 'Fixationspunkt in der Mitte, kurze Lichtreize an 24 Positionen, Antwort mit OK. Ergebnis als Punktekarte im Screening-Verlauf. Ersetzt keine augenärztliche Perimetrie.',
    anleitung: 'Schauen Sie die ganze Zeit auf den Punkt in der Mitte. Wenn Sie irgendwo einen kurzen Lichtpunkt bemerken, drücken Sie sofort die Leertaste oder OK.',
    tasten: ['ok'],
    levels: HT.stufen(2, function () { return { reizMs: 200, fensterMs: 1300 }; }),
    levelLabels: { reizMs: 'Reizdauer (ms)', fensterMs: 'Antwortfenster (ms)' },
    create: function (container, ctx) {
      var p = ctx.params, Z = HT.zeit, aus = [], laeuft = true;
      var feld = HT.m.neu(container, 'gf-feld');
      var kreuz = HT.m.neu(feld, 'gf-fix');
      var punkt = HT.m.neu(feld, 'gf-punkt');
      var e = HT.storage.einstellungen(), breiteCm = Number(e.bildschirmBreiteCm) || 33, abstandCm = Number(e.abstandCm) || 50;
      var B = container.clientWidth || 1000, H = container.clientHeight || 650, pxProCm = (window.screen && window.screen.width ? Math.min(window.screen.width, window.innerWidth) : B) / breiteCm;
      var positionen = [];
      GRAD.forEach(function (g, ring) {
        RICHTUNG.forEach(function (w, ri) {
          var r = abstandCm * Math.tan(g * Math.PI / 180) * pxProCm, rad = w * Math.PI / 180;
          var x = Math.cos(rad) * r, y = -Math.sin(rad) * r;
          var gx = B / 2 - 30, gy = H / 2 - 30, f = Math.min(1, gx / Math.max(1, Math.abs(x)), gy / Math.max(1, Math.abs(y)));
          positionen.push({ id: 'p' + (ring * 8 + ri + 1 < 10 ? '0' : '') + (ring * 8 + ri + 1), ring: ring + 1, richtung: w, x: x * f, y: y * f });
        });
      });
      var folge = HT.zufall.mischen(positionen.slice().concat([null, null, null, null])), k = 0, aktiv = null, timer = null;
      function naechster() {
        if (!laeuft) return;
        if (k >= folge.length) { kreuz.classList.add('fertig'); if (ctx.onFinish) ctx.onFinish(); return; }
        var pos = folge[k++];
        timer = Z.nach(HT.zufall.int(900, 2100), function () {
          aktiv = { pos: pos, start: Z.jetzt() };
          if (pos) { punkt.style.left = (B / 2 + pos.x) + 'px'; punkt.style.top = (H / 2 + pos.y) + 'px'; punkt.style.opacity = '1'; Z.nach(p.reizMs, function () { punkt.style.opacity = '0'; }); }
          timer = Z.nach(p.fensterMs, function () {
            if (!aktiv) return;
            var a = aktiv; aktiv = null;
            if (a.pos) ctx.onEvent({ korrekt: false, auslassung: true, reiz: a.pos.id + ' r' + a.pos.ring + ' w' + a.pos.richtung, reaktion: 'nicht gesehen', seite: a.pos.x < -5 ? 'links' : a.pos.x > 5 ? 'rechts' : 'mitte', typ: 'licht' });
            else ctx.onEvent({ korrekt: true, reiz: 'fangreiz', reaktion: 'keine', typ: 'fangreiz' });
            naechster();
          });
        });
      }
      function reaktion() {
        if (!aktiv) { ctx.onEvent({ korrekt: false, zaehlt: false, reiz: 'keiner', reaktion: 'OK ohne Reiz', typ: 'vorzeitig' }); return; }
        var a = aktiv; aktiv = null; Z.abbrechen(timer);
        if (a.pos) ctx.onEvent({ korrekt: true, rtMs: Z.jetzt() - a.start, reiz: a.pos.id + ' r' + a.pos.ring + ' w' + a.pos.richtung, reaktion: 'gesehen', seite: a.pos.x < -5 ? 'links' : a.pos.x > 5 ? 'rechts' : 'mitte', typ: 'licht' });
        else ctx.onEvent({ korrekt: false, reiz: 'fangreiz', reaktion: 'OK', typ: 'fangreiz' });
        Z.nach(300, naechster);
      }
      HT.tap(feld, reaktion);
      return {
        start: function () { aus.push(HT.eingabe.an(function (a) { if (a === 'ok') reaktion(); })); Z.nach(800, naechster); },
        stop: function () { laeuft = false; Z.abbrechen(timer); aus.forEach(function (f) { f(); }); }
      };
    },
    preview: function (el) {
      var bild = function (x, y) { return '<svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg"><rect width="400" height="300" fill="#1e2a33"/><circle cx="200" cy="150" r="7" fill="#F2C230"/>' + (x ? '<circle cx="' + x + '" cy="' + y + '" r="6" fill="#fff"/>' : '') + '</svg>'; };
      return HT.beispiel(el, [{ svg: bild(0, 0), text: 'Auf den Punkt schauen', dauer: 1300 }, { svg: bild(320, 70), text: 'Lichtpunkt: OK drücken', dauer: 900 }, { svg: bild(0, 0), dauer: 900 }]);
    }
  });
})();

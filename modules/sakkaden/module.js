/* Modul: Sakkadentraining – Ziel springt an zufällige Positionen. Niedrige Level: schnell anklicken.
 * Ab Level 7: an der neuen Position erscheint kurz ein Pfeil, dessen Richtung angegeben wird. Level: Darbietungszeit, Sprungweite. */
(function () {
  'use strict';
  var HT = window.HT;
  var levels = HT.stufen(14, function (t, i) {
    return { modus: i <= 6 ? 'klicken' : 'erkennen', darbietungMs: i <= 6 ? HT.lerpInt(2200, 1100, (i - 1) / 5) : HT.lerpInt(900, 220, (i - 7) / 7), abstand: Math.round(HT.lerp(0.35, 0.9, t) * 100) / 100, groesse: HT.lerpInt(90, 54, t) };
  });
  var PFEILE = { hoch: 0, rechts: 90, runter: 180, links: 270 };
  HT.registerModule({
    id: 'sakkaden', name: 'Sakkadentraining', kategorie: 'wahrnehmung', symbol: 'funke',
    ziel: 'Schnelle, zielgenaue Blicksprünge über den Bildschirm',
    beschreibung: 'Ein Zielpunkt springt an immer neue Stellen des Bildschirms. In den unteren Leveln wird er so schnell wie möglich angetippt. Ab Level 7 erscheint an der neuen Position nur kurz ein Pfeil, dessen Richtung mit den Pfeiltasten oder den Bildschirmknöpfen angegeben wird – das erzwingt einen schnellen, genauen Blicksprung. Level: Darbietungszeit und Sprungweite.',
    anleitung: 'Folgen Sie dem springenden Punkt mit den Augen. Tippen Sie ihn schnell an. In schwereren Stufen erscheint dort kurz ein Pfeil – geben Sie seine Richtung mit den Pfeiltasten an.',
    tasten: ['links', 'hoch', 'runter', 'rechts'], levels: levels,
    levelLabels: { modus: 'Aufgabe', darbietungMs: 'Darbietung (ms)', abstand: 'Sprungweite', groesse: 'Zielgröße (px)' },
    create: function (container, ctx) {
      var p = ctx.params, Z = HT.zeit, aus = [];
      var voll = HT.m.neu(container, 'm-voll');
      var ziel = HT.m.neu(voll, '', '', { position: 'absolute', width: p.groesse + 'px', height: p.groesse + 'px', transition: 'left .12s, top .12s', cursor: 'pointer' });
      var knoepfe = null;
      if (p.modus === 'erkennen') {
        var leiste = HT.m.neu(container, '', '', { position: 'absolute', bottom: '14px', left: '0', right: '0', display: 'flex', justifyContent: 'center' });
        knoepfe = ['links', 'hoch', 'runter', 'rechts'].map(function (r) {
          var b = HT.el('button', { class: 'm-wahl-knopf', type: 'button', style: { minWidth: '90px', minHeight: '64px', margin: '0 6px' }, html: '<svg viewBox="0 0 40 40" width="34" height="34"><path d="M20 6 L32 22 H24 V34 H16 V22 H8 Z" fill="#26333c" transform="rotate(' + PFEILE[r] + ' 20 20)"/></svg>' });
          HT.tap(b, function () { antwort(r); });
          leiste.appendChild(b);
          return b;
        });
      }
      var pos = { x: 0.5, y: 0.5 }, aktuell = null, timer = null;
      function springen() {
        var b = container.clientWidth, h = container.clientHeight - (p.modus === 'erkennen' ? 90 : 0), g = p.groesse;
        var nx, ny, versuch = 0;
        do { nx = HT.zufall.zahl(0.06, 0.94); ny = HT.zufall.zahl(0.1, 0.9); versuch++; }
        while (versuch < 50 && Math.hypot((nx - pos.x) * b, (ny - pos.y) * h) < p.abstand * Math.min(b, h) * 0.8);
        pos = { x: nx, y: ny };
        ziel.style.left = (nx * b - g / 2) + 'px'; ziel.style.top = (ny * h - g / 2) + 'px';
        var r = HT.zufall.wahl(Object.keys(PFEILE));
        aktuell = { start: Z.jetzt(), richtung: r, seite: HT.seiteVon(nx), offen: true };
        if (p.modus === 'klicken') {
          ziel.innerHTML = '<svg viewBox="0 0 100 100" width="100%" height="100%"><circle cx="50" cy="50" r="44" fill="#1BA8B5"/><circle cx="50" cy="50" r="26" fill="#fff"/><circle cx="50" cy="50" r="12" fill="#1BA8B5"/></svg>';
          timer = Z.nach(p.darbietungMs, function () { if (aktuell && aktuell.offen) { aktuell.offen = false; ctx.onEvent({ korrekt: false, auslassung: true, reiz: 'ziel', reaktion: 'keine', seite: aktuell.seite }); } springen(); });
        } else {
          ziel.innerHTML = '<svg viewBox="0 0 100 100" width="100%" height="100%"><circle cx="50" cy="50" r="46" fill="#fff" stroke="#cfd9e0" stroke-width="3"/><path d="M50 14 L78 52 H60 V86 H40 V52 H22 Z" fill="#26333c" transform="rotate(' + PFEILE[r] + ' 50 50)"/></svg>';
          timer = Z.nach(p.darbietungMs, function () {
            ziel.innerHTML = '<svg viewBox="0 0 100 100" width="100%" height="100%"><circle cx="50" cy="50" r="46" fill="#fff" stroke="#cfd9e0" stroke-width="3"/><circle cx="50" cy="50" r="10" fill="#cfd9e0"/></svg>';
            timer = Z.nach(2200, function () { if (aktuell && aktuell.offen) { aktuell.offen = false; ctx.onEvent({ korrekt: false, auslassung: true, reiz: 'pfeil-' + aktuell.richtung, reaktion: 'keine', seite: aktuell.seite }); } Z.nach(300, springen); });
          });
        }
      }
      function antwort(r) {
        if (!aktuell || !aktuell.offen) return;
        aktuell.offen = false;
        Z.abbrechen(timer);
        var ok = p.modus === 'klicken' ? true : r === aktuell.richtung;
        ctx.onEvent({ korrekt: ok, reiz: p.modus === 'klicken' ? 'ziel' : 'pfeil-' + aktuell.richtung, reaktion: r, rtMs: Z.jetzt() - aktuell.start, seite: aktuell.seite });
        if (ok) ctx.audio.richtig(); else ctx.audio.falsch();
        if (p.modus === 'erkennen') ctx.feedback(ok, null, null, { stumm: true, dauer: 350 });
        Z.nach(p.modus === 'klicken' ? 150 : 600, springen);
      }
      return {
        start: function () {
          HT.tap(ziel, function () { if (p.modus === 'klicken') antwort('klick'); });
          aus.push(HT.eingabe.an(function (a) { if (p.modus === 'erkennen' && PFEILE.hasOwnProperty(a)) antwort(a); if (p.modus === 'klicken' && a === 'ok') antwort('taste'); }));
          Z.nach(600, springen);
        },
        stop: function () { aus.forEach(function (f) { f(); }); }
      };
    },
    preview: function (el) {
      var b = function (x, y, pfeil) {
        return '<svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg"><g transform="translate(' + x + ' ' + y + ')">' + (pfeil ? '<circle r="26" fill="#fff" stroke="#cfd9e0" stroke-width="3"/><path d="M0 -18 L16 4 H6 V20 H-6 V4 H-16 Z" fill="#26333c" transform="rotate(90)"/>' : '<circle r="24" fill="#1BA8B5"/><circle r="14" fill="#fff"/><circle r="6" fill="#1BA8B5"/>') + '</g></svg>';
      };
      return HT.beispiel(el, [
        { svg: b(80, 70), zeiger: [20, 23], klick: true, text: 'Punkt antippen', dauer: 1100 },
        { svg: b(320, 220), zeiger: [80, 73], klick: true, dauer: 1100 },
        { svg: b(150, 230), zeiger: [37, 77], klick: true, dauer: 1100 },
        { svg: b(300, 80, true), text: 'Schwerer: Pfeilrichtung angeben (→)', dauer: 1800 }
      ]);
    }
  });
})();

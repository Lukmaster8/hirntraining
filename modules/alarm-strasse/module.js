/* Modul: Alarm auf der Straße – phasische Alertness.
 * Die Straße läuft von allein. Plötzlich erscheint ein Hindernis, dann sofort OK.
 * Kein Tempo, kein Abbiegen, kein Cockpit. Eigene Zeichnung. */
(function () {
  'use strict';
  var HT = window.HT;

  var levels = HT.stufen(12, function (t, i) {
    return {
      warteMin: HT.lerpInt(1400, 2200, t),
      warteMax: HT.lerpInt(3200, 5000, t),
      zeitlimitMs: HT.lerpInt(1600, 700, t),
      groesse: HT.lerpInt(150, 70, t),
      fehlreiz: i >= 8 ? 0.28 : 0,
      seite: i >= 5
    };
  });

  function szene(reiz, x, groesse) {
    var tier = reiz === 'tier';
    var auto = reiz === 'auto';
    var leer = !reiz;
    return '<svg viewBox="0 0 400 260" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%"><rect width="400" height="120" fill="#b7dff2"/><polygon points="140,120 260,120 360,250 40,250" fill="#5c6770"/><rect width="400" height="260" fill="none"/>' +
      (leer ? '' : '<g transform="translate(' + x + ' 150)">' +
        (tier ? '<ellipse cx="0" cy="0" rx="' + (groesse * 0.45) + '" ry="' + (groesse * 0.28) + '" fill="#c8955a"/><circle cx="' + (groesse * 0.2) + '" cy="' + (-groesse * 0.05) + '" r="4" fill="#243038"/>' : '') +
        (auto ? '<rect x="' + (-groesse * 0.4) + '" y="' + (-groesse * 0.22) + '" width="' + (groesse * 0.8) + '" height="' + (groesse * 0.4) + '" rx="8" fill="#1BA8B5"/>' : '') +
        (!tier && !auto ? '<rect x="' + (-groesse * 0.28) + '" y="' + (-groesse * 0.28) + '" width="' + (groesse * 0.56) + '" height="' + (groesse * 0.5) + '" fill="#e25c5c"/>' : '') +
      '</g>') + '</svg>';
  }

  HT.registerModule({
    id: 'alarm-strasse',
    name: 'Alarm auf der Straße',
    kategorie: 'aufmerksamkeit',
    symbol: 'ziel',
    ziel: 'Plötzliche Gefahren auf der Straße schnell bemerken',
    beschreibung: 'Phasische Alertness ohne Tempolimit. Die Straße läuft, meist ist sie frei. Erscheint ein Tier, ein Fahrzeug oder ein Gegenstand, soll sofort die OK-Taste gedrückt werden. In späteren Stufen tauchen die Reize weiter am Rand und kürzer auf. Ab Level 8 gibt es kurze Fehlreize am Himmel, auf die nicht reagiert wird.',
    anleitung: 'Schauen Sie auf die Straße. Sobald ein Tier, ein Auto oder ein Gegenstand auf der Fahrbahn erscheint, drücken Sie so schnell wie möglich die Leertaste oder tippen auf das Bild. Ist die Straße leer, nichts drücken.',
    tasten: ['ok'],
    levels: levels,
    levelLabels: { warteMin: 'Wartezeit min (ms)', warteMax: 'Wartezeit max (ms)', zeitlimitMs: 'Sichtbarkeit (ms)', groesse: 'Größe', fehlreiz: 'Fehlreize', seite: 'Auch am Rand' },
    create: function (container, ctx) {
      var p = ctx.params, Z = HT.zeit, aus = [];
      var zone = HT.m.neu(container, 'm-zentrum');
      var hinweis = HT.m.neu(zone, 'm-anweisung', 'Straße beobachten …');
      var bild = HT.m.neu(zone, 'm-reiz', szene(null, 200, 80), { width: 'min(640px, 92%)', height: '280px' });
      var zustand = 'warten', start = 0, timer = null, art = null, istFehl = false;

      function frei() {
        zustand = 'warten';
        art = null;
        istFehl = false;
        bild.innerHTML = szene(null, 200, p.groesse);
        hinweis.textContent = 'Straße beobachten …';
        timer = Z.nach(HT.zufall.int(p.warteMin, p.warteMax), zeigen);
      }
      function zeigen() {
        istFehl = HT.zufall.chance(p.fehlreiz);
        art = istFehl ? 'himmel' : HT.zufall.wahl(['tier', 'auto', 'kiste']);
        var x = p.seite ? HT.zufall.wahl([90, 200, 310]) : 200;
        zustand = 'reiz';
        start = Z.jetzt();
        bild.innerHTML = istFehl
          ? '<svg viewBox="0 0 400 260" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%"><rect width="400" height="120" fill="#b7dff2"/><polygon points="140,120 260,120 360,250 40,250" fill="#5c6770"/><circle cx="' + x + '" cy="40" r="16" fill="#f4d35e"/></svg>'
          : szene(art, x, p.groesse);
        hinweis.textContent = istFehl ? '' : 'Jetzt!';
        timer = Z.nach(p.zeitlimitMs, function () {
          if (istFehl) ctx.onEvent({ korrekt: true, reiz: 'fehlreiz', reaktion: 'keine', typ: 'korrekteZurueckhaltung' });
          else { ctx.onEvent({ korrekt: false, auslassung: true, reiz: art, reaktion: 'keine' }); ctx.feedback(false); }
          timer = Z.nach(500, frei);
        });
      }
      function druck() {
        if (zustand === 'warten') {
          Z.abbrechen(timer);
          ctx.onEvent({ korrekt: false, reiz: 'leer', reaktion: 'zu früh', typ: 'fehlreaktion' });
          ctx.feedback(false);
          hinweis.textContent = 'Noch nichts auf der Straße.';
          zustand = 'pause';
          timer = Z.nach(900, frei);
          return;
        }
        if (zustand !== 'reiz') return;
        Z.abbrechen(timer);
        var rt = Z.jetzt() - start;
        if (istFehl) {
          ctx.onEvent({ korrekt: false, reiz: 'fehlreiz', reaktion: 'gedrückt', rtMs: rt, typ: 'fehlreaktion' });
          ctx.feedback(false);
          hinweis.textContent = 'Das war kein Hindernis.';
        } else {
          ctx.onEvent({ korrekt: true, reiz: art, reaktion: 'ok', rtMs: rt });
          ctx.feedback(true);
        }
        zustand = 'pause';
        timer = Z.nach(500, frei);
      }
      bild.addEventListener('pointerdown', function (ev) { ev.preventDefault(); druck(); });
      return {
        start: function () {
          aus.push(HT.eingabe.an(function (a) { if (a === 'ok') druck(); }));
          timer = Z.nach(600, frei);
        },
        stop: function () { aus.forEach(function (f) { f(); }); Z.abbrechen(timer); }
      };
    },
    preview: function (el) {
      return HT.beispiel(el, [
        { svg: szene(null, 200, 90), text: 'Straße ist frei', dauer: 1200 },
        { svg: szene('tier', 200, 90), text: 'Hindernis: sofort OK', dauer: 1400 }
      ]);
    }
  });
})();

/* Modul: Reaktion (Alertness)
 * Ein großer Kreis wechselt nach zufälliger Wartezeit die Farbe – sofort reagieren.
 * Level 1–4: einfache Reaktion · 5–7: mit Warnton vorher · 8–12: ohne Warnton, mit Fehlreizen (andere Farbe, nicht reagieren). */
(function () {
  'use strict';
  var HT = window.HT;

  var levels = HT.stufen(12, function (t, i) {
    return {
      warteMinMs: i <= 4 ? 1000 : 1200,
      warteMaxMs: i <= 4 ? HT.lerpInt(3000, 5000, (i - 1) / 3) : 6000,
      zeitlimitMs: HT.lerpInt(2000, 650, t),
      warnton: i >= 5 && i <= 7,
      fehlreizAnteil: i >= 8 ? HT.lerp(0.2, 0.35, (i - 8) / 4) : 0,
      groesse: HT.lerpInt(300, 190, t)
    };
  });

  function quadratSvg(farbe, gefuellt) {
    var f = gefuellt ? farbe : '#e7eef2';
    return HT.svgVon('<rect x="10" y="10" width="80" height="80" rx="8" fill="' + f + '" stroke="#b7c4cc" stroke-width="3"/>' +
      (gefuellt ? '<rect x="22" y="22" width="28" height="18" rx="4" fill="#fff" fill-opacity=".35"/>' : ''));
  }
  var GRAU = '#c9d3da', ZIEL = '#2EAD6B', FEHL = '#E25C5C';

  HT.registerModule({
    id: 'reaktion',
    name: 'Reaktion',
    kategorie: 'aufmerksamkeit',
    symbol: 'ziel',
    ziel: 'Reaktionsgeschwindigkeit und Wachheit (Alertness) verbessern',
    beschreibung: 'Training der tonischen und phasischen Alertness. Ein Quadrat ist leer und füllt sich nach zufälliger Wartezeit. Dann sofort reagieren. Zuerst ohne Hinweis, in mittleren Leveln mit Warnton, in hohen Leveln mit roten Fehlfüllungen, auf die nicht reagiert wird. Gemessen werden Reaktionszeit, Fehlreaktionen und Antizipationen (< 150 ms).',
    anleitung: 'Schauen Sie auf das leere Quadrat. Sobald es sich GRÜN füllt, drücken Sie so schnell wie möglich die Leertaste oder tippen auf das Quadrat. Füllt es sich ROT, nicht reagieren!',
    eingabe: ['tastatur', 'maus', 'touch'],
    tasten: ['ok'],
    levels: levels,
    levelLabels: { warteMinMs: 'Wartezeit min (ms)', warteMaxMs: 'Wartezeit max (ms)', zeitlimitMs: 'Zeitlimit (ms)', warnton: 'Warnton', fehlreizAnteil: 'Anteil Fehlreize', groesse: 'Kreisgröße (px)' },
    bewertung: { aufstufenAb: 0.85, abstufenUnter: 0.6 },

    create: function (container, ctx) {
      var p = ctx.params, Z = HT.zeit;
      var zone = HT.m.neu(container, 'm-zentrum');
      var hinweis = HT.m.neu(zone, 'm-anweisung', 'Warten …');
      var kreis = HT.m.neu(zone, 'm-symbol m-reiz', quadratSvg(GRAU, false), { width: p.groesse + 'px', height: p.groesse + 'px', cursor: 'pointer' });
      var zustand = 'warten', reizStart = 0, istFehlreiz = false, timer = null, entfernen = [];

      function naechster() {
        zustand = 'warten';
        kreis.innerHTML = quadratSvg(GRAU, false);
        hinweis.textContent = 'Warten …';
        var warte = HT.zufall.int(p.warteMinMs, p.warteMaxMs);
        if (p.warnton) timer = Z.nach(Math.max(300, warte - 700), function () { ctx.audio.warnung(); hinweis.textContent = 'Achtung …'; timer = Z.nach(700, reiz); });
        else timer = Z.nach(warte, reiz);
      }
      function reiz() {
        istFehlreiz = HT.zufall.chance(p.fehlreizAnteil);
        zustand = 'reiz';
        reizStart = Z.jetzt();
        kreis.innerHTML = quadratSvg(istFehlreiz ? FEHL : ZIEL, true);
        hinweis.textContent = istFehlreiz ? '' : 'Jetzt!';
        timer = Z.nach(p.zeitlimitMs, function () {
          if (istFehlreiz) ctx.onEvent({ korrekt: true, reiz: 'fehlreiz', reaktion: 'keine', typ: 'korrekteZurueckhaltung', zaehlt: true });
          else { ctx.onEvent({ korrekt: false, auslassung: true, reiz: 'ziel', reaktion: 'keine' }); ctx.feedback(false); }
          pause();
        });
      }
      function pause() { zustand = 'pause'; kreis.innerHTML = quadratSvg(GRAU, false); timer = Z.nach(500, naechster); }
      function reagieren() {
        if (zustand === 'pause') return;
        if (zustand === 'warten') {
          Z.abbrechen(timer);
          ctx.onEvent({ korrekt: false, reiz: 'keiner', reaktion: 'zu früh', typ: 'fehlreaktion' });
          ctx.feedback(false);
          hinweis.textContent = 'Zu früh – erst wenn sich das Quadrat füllt!';
          zustand = 'pause';
          timer = Z.nach(1300, naechster);
          return;
        }
        Z.abbrechen(timer);
        var rt = Z.jetzt() - reizStart;
        if (istFehlreiz) { ctx.onEvent({ korrekt: false, reiz: 'fehlreiz', reaktion: 'reagiert', rtMs: rt, typ: 'fehlreaktion' }); ctx.feedback(false); hinweis.textContent = 'Bei Rot nicht drücken!'; }
        else if (rt < 150) { ctx.onEvent({ korrekt: false, reiz: 'ziel', reaktion: 'antizipiert', rtMs: rt, typ: 'antizipation' }); ctx.feedback(false); hinweis.textContent = 'Zu früh geraten!'; }
        else { ctx.onEvent({ korrekt: true, reiz: 'ziel', reaktion: 'reagiert', rtMs: rt, seite: 'mitte' }); ctx.audio.richtig(); hinweis.textContent = Math.round(rt) + ' ms'; }
        zustand = 'pause';
        kreis.innerHTML = quadratSvg(GRAU, false);
        timer = Z.nach(900, naechster);
      }
      return {
        start: function () {
          entfernen.push(HT.eingabe.an(function (a) { if (a === 'ok') reagieren(); }));
          entfernen.push(HT.tap(container, function (ev) { if (!ev.target.closest('button')) reagieren(); }));
          timer = Z.nach(600, naechster);
        },
        stop: function () { entfernen.forEach(function (f) { f(); }); }
      };
    },

    preview: function (el) {
      return HT.beispiel(el, [
        { svg: '<div style="width:46%;height:60%">' + quadratSvg(GRAU, false) + '</div>', text: 'Warten …', dauer: 1400 },
        { svg: '<div style="width:46%;height:60%">' + quadratSvg(ZIEL, true) + '</div>', zeiger: [52, 52], klick: true, text: 'Grün gefüllt – sofort drücken!', dauer: 1500 },
        { svg: '<div style="width:46%;height:60%">' + quadratSvg(GRAU, false) + '</div>', zeiger: [80, 80], text: 'Warten …', dauer: 1200 },
        { svg: '<div style="width:46%;height:60%">' + quadratSvg(FEHL, true) + '</div>', zeiger: [80, 80], text: 'Rot – nicht drücken!', dauer: 1500 }
      ]);
    }
  });
})();

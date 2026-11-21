/* Modul: Wahlreaktion – 2 bis 4 Reizarten, jede einer Taste bzw. Fläche zugeordnet. */
(function () {
  'use strict';
  var HT = window.HT;
  var REIZE = [
    { form: 'kreis', farbe: 'blau', aktion: 'links', taste: '←' },
    { form: 'quadrat', farbe: 'orange', aktion: 'rechts', taste: '→' },
    { form: 'dreieck', farbe: 'gruen', aktion: 'hoch', taste: '↑' },
    { form: 'stern', farbe: 'lila', aktion: 'runter', taste: '↓' }
  ];
  var levels = HT.stufen(12, function (t, i) {
    return { anzahl: i <= 4 ? 2 : i <= 8 ? 3 : 4, zeitlimitMs: HT.lerpInt(2400, 900, ((i - 1) % 4) / 3 * 0.6 + t * 0.4), pauseMs: HT.lerpInt(1200, 600, t), groesse: HT.lerpInt(220, 170, t) };
  });

  HT.registerModule({
    id: 'wahlreaktion', name: 'Wahlreaktion', kategorie: 'aufmerksamkeit', symbol: 'tastatur',
    ziel: 'Schnell und richtig zwischen mehreren Reizen unterscheiden und reagieren',
    beschreibung: 'Es erscheint jeweils eines von zwei bis vier Symbolen. Jedem Symbol ist eine Taste bzw. eine Fläche am unteren Rand zugeordnet. Trainiert werden Reizunterscheidung, Reaktionsauswahl und Verarbeitungsgeschwindigkeit. Level: Anzahl der Reizarten, Zeitlimit und Tempo.',
    anleitung: 'In der Mitte erscheint ein Symbol. Drücken Sie so schnell wie möglich die passende Pfeiltaste oder tippen Sie unten auf das gleiche Symbol.',
    tasten: ['links', 'rechts', 'hoch', 'runter'],
    levels: levels,
    levelLabels: { anzahl: 'Reizarten', zeitlimitMs: 'Zeitlimit (ms)', pauseMs: 'Pause (ms)', groesse: 'Größe (px)' },
    create: function (container, ctx) {
      var p = ctx.params, Z = HT.zeit, reize = REIZE.slice(0, p.anzahl);
      var zone = HT.m.neu(container, 'm-zentrum');
      var reizEl = HT.m.neu(zone, 'm-symbol', '', { width: p.groesse + 'px', height: p.groesse + 'px', marginBottom: '2.4rem' });
      var leiste = HT.el('div', { class: 'm-wahl' });
      zone.appendChild(leiste);
      var knoepfe = reize.map(function (r) {
        var b = HT.el('button', { class: 'm-wahl-knopf', type: 'button', style: { width: '150px', height: '120px', flexDirection: 'column' }, html: '<span style="width:56px;height:56px;display:block">' + HT.formSvg(r.form, r.farbe) + '</span><kbd style="margin:.4rem 0 0">' + r.taste + '</kbd>' });
        HT.tap(b, function () { antwort(r.aktion); });
        leiste.appendChild(b);
        return b;
      });
      var aktuell = null, start = 0, timer = null, aus = null;
      function naechster() {
        aktuell = HT.zufall.wahl(reize);
        reizEl.innerHTML = HT.formSvg(aktuell.form, aktuell.farbe);
        start = Z.jetzt();
        timer = Z.nach(p.zeitlimitMs, function () {
          ctx.onEvent({ korrekt: false, auslassung: true, reiz: aktuell.form, reaktion: 'keine' });
          ctx.feedback(false, null, null, { dauer: 350 });
          ende();
        });
      }
      function ende() { aktuell = null; reizEl.innerHTML = ''; timer = Z.nach(p.pauseMs + HT.zufall.int(0, 400), naechster); }
      function antwort(aktion) {
        if (!aktuell) return;
        Z.abbrechen(timer);
        var ok = aktion === aktuell.aktion;
        ctx.onEvent({ korrekt: ok, reiz: aktuell.form, reaktion: aktion, rtMs: Z.jetzt() - start, seite: 'mitte' });
        ctx.feedback(ok, null, null, { dauer: 350 });
        var idx = reize.map(function (r) { return r.aktion; }).indexOf(aktion);
        if (knoepfe[idx]) { knoepfe[idx].classList.add(ok ? 'richtig' : 'falsch'); setTimeout(function () { knoepfe[idx].classList.remove('richtig', 'falsch'); }, 300); }
        ende();
      }
      return {
        start: function () { aus = HT.eingabe.an(function (a) { if (['links', 'rechts', 'hoch', 'runter'].indexOf(a) >= 0) antwort(a); }); timer = Z.nach(800, naechster); },
        stop: function () { if (aus) aus(); }
      };
    },
    preview: function (el) {
      var bild = function (f, fa, mark) {
        var s = '<svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg"><g transform="translate(150 40) scale(1)">' + (f ? HT.form(f, fa) : '') + '</g>';
        [['kreis', 'blau', 110], ['quadrat', 'orange', 230]].forEach(function (k) {
          s += '<rect x="' + (k[2] - 10) + '" y="190" width="80" height="80" rx="14" fill="#fff" stroke="' + (mark === k[0] ? '#2EAD6B' : '#e1e8ed') + '" stroke-width="3"/><g transform="translate(' + (k[2] + 5) + ' 205) scale(.5)">' + HT.form(k[0], k[1]) + '</g>';
        });
        return s + '</svg>';
      };
      return HT.beispiel(el, [
        { svg: bild('quadrat', 'orange'), text: 'Welches Symbol?', dauer: 1100 },
        { svg: bild('quadrat', 'orange', 'quadrat'), zeiger: [67, 77], klick: true, text: 'Passende Fläche / Taste →', dauer: 1300 },
        { svg: bild('kreis', 'blau'), zeiger: [67, 77], dauer: 900 },
        { svg: bild('kreis', 'blau', 'kreis'), zeiger: [37, 77], klick: true, text: 'Taste ←', dauer: 1300 }
      ]);
    }
  });
})();

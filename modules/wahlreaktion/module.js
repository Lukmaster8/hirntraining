/* Modul: Wahlreaktion – Pfeile, dann Symbole, später Ton.
 * Irrelevante Reize werden nicht gedrückt. Fußtasten wirken, wenn sie am Pult auf links/rechts liegen. */
(function () {
  'use strict';
  var HT = window.HT;
  var REIZE = [
    { id: 'kreis', form: 'kreis', farbe: 'blau', aktion: 'links', taste: '←' },
    { id: 'quadrat', form: 'quadrat', farbe: 'orange', aktion: 'rechts', taste: '→' },
    { id: 'dreieck', form: 'dreieck', farbe: 'gruen', aktion: 'hoch', taste: '↑' },
    { id: 'stern', form: 'stern', farbe: 'lila', aktion: 'runter', taste: '↓' }
  ];

  function pfeilSvg(grad, gross) {
    var g = gross || 100;
    return '<svg viewBox="0 0 100 100" width="' + g + '" height="' + g + '"><g transform="rotate(' + grad + ' 50 50)"><path d="M50 14 L82 50 H64 V86 H36 V50 H18 Z" fill="#1BA8B5" stroke="#26333c" stroke-width="3"/></g></svg>';
  }
  var PFEILE = [
    { id: 'links', aktion: 'links', taste: '←', html: pfeilSvg(180) },
    { id: 'rechts', aktion: 'rechts', taste: '→', html: pfeilSvg(0) },
    { id: 'hoch', aktion: 'hoch', taste: '↑', html: pfeilSvg(-90) },
    { id: 'runter', aktion: 'runter', taste: '↓', html: pfeilSvg(90) }
  ];

  var levels = HT.stufen(12, function (t, i) {
    return {
      anzahl: i <= 3 ? 2 : i <= 7 ? 3 : 4,
      pfeile: i <= 3,
      irrelevant: i >= 6 ? 0.25 : 0,
      ton: i >= 9,
      zeitlimitMs: HT.lerpInt(2400, 900, ((i - 1) % 4) / 3 * 0.6 + t * 0.4),
      pauseMs: HT.lerpInt(1200, 600, t),
      groesse: HT.lerpInt(220, 170, t)
    };
  });

  HT.registerModule({
    id: 'wahlreaktion', name: 'Wahlreaktion', kategorie: 'aufmerksamkeit', symbol: 'tastatur',
    ziel: 'Schnell und richtig zwischen mehreren Reizen unterscheiden und reagieren',
    beschreibung: 'Leichte Stufen ordnen Pfeile den Pfeiltasten zu. Danach kommen farbige Symbole, jedes mit einer Taste. Ab Level 6 sind Reize dabei, die zu keiner Taste gehören und nicht gedrückt werden. Ab Level 9 kommt zusätzlich ein Ton: hoch ist links, tief ist rechts, ein mittlerer Ton gilt nicht. Die Fußtasten können am Pult auf links und rechts gelegt werden.',
    anleitung: 'Drücken Sie die Taste, die zum Reiz gehört. Pfeile zeigen die Richtung. Bei Symbolen tippen Sie unten das gleiche Bild. Ein graues Zeichen und ein mittlerer Ton gehören zu keiner Taste – dann nichts drücken. Ab Level 9: hoher Ton ist links, tiefer Ton ist rechts.',
    tasten: ['links', 'rechts', 'hoch', 'runter'],
    levels: levels,
    levelLabels: { anzahl: 'Reizarten', pfeile: 'Pfeile statt Symbole', irrelevant: 'Anteil ohne Taste', ton: 'Töne dazu', zeitlimitMs: 'Zeitlimit (ms)', pauseMs: 'Pause (ms)', groesse: 'Größe (px)' },
    create: function (container, ctx) {
      var p = ctx.params, Z = HT.zeit;
      var reize = p.pfeile ? PFEILE.slice(0, p.anzahl) : REIZE.slice(0, p.anzahl);
      var zone = HT.m.neu(container, 'm-zentrum');
      var reizEl = HT.m.neu(zone, 'm-symbol', '', { width: p.groesse + 'px', height: p.groesse + 'px', marginBottom: '2.4rem' });
      var leiste = HT.el('div', { class: 'm-wahl' });
      zone.appendChild(leiste);
      var knoepfe = reize.map(function (r) {
        var innen = r.html || ('<span style="width:56px;height:56px;display:block">' + HT.formSvg(r.form, r.farbe) + '</span>');
        var b = HT.el('button', { class: 'm-wahl-knopf', type: 'button', style: { width: '150px', height: '120px', flexDirection: 'column' }, html: innen + '<kbd style="margin:.4rem 0 0">' + r.taste + '</kbd>' });
        HT.tap(b, function () { antwort(r.aktion); });
        leiste.appendChild(b);
        return b;
      });
      var aktuell = null, start = 0, timer = null, aus = null;
      function bild(r) {
        if (!r) return '';
        if (r.html) return r.html;
        return HT.formSvg(r.form, r.farbe);
      }
      function naechster() {
        if (p.irrelevant && HT.zufall.chance(p.irrelevant)) {
          aktuell = { irrelevant: true, id: 'keiner' };
          reizEl.innerHTML = '<svg viewBox="0 0 100 100"><rect x="18" y="18" width="64" height="64" rx="10" fill="#e7eef2" stroke="#c5d0d6" stroke-width="3"/><text x="50" y="58" text-anchor="middle" font-size="28" fill="#8a97a1">–</text></svg>';
        } else if (p.ton && HT.zufall.chance(0.4)) {
          var art = HT.zufall.wahl(['hoch', 'tief', 'mitte']);
          aktuell = { irrelevant: art === 'mitte', id: 'ton-' + art, aktion: art === 'hoch' ? 'links' : art === 'tief' ? 'rechts' : null, ton: true };
          reizEl.innerHTML = '<svg viewBox="0 0 100 100"><path d="M18 38 H34 L56 20 V80 L34 62 H18 Z" fill="#1BA8B5" stroke="#26333c" stroke-width="3"/></svg>';
          if (art === 'hoch') ctx.audio.hoch();
          else if (art === 'tief') ctx.audio.tief();
          else ctx.audio.ton(620, 0.18, 'sine', 0, 0.35);
        } else {
          var r = HT.zufall.wahl(reize);
          aktuell = { irrelevant: false, id: r.id || r.form, aktion: r.aktion };
          reizEl.innerHTML = bild(r);
        }
        start = Z.jetzt();
        timer = Z.nach(p.zeitlimitMs, function () {
          if (aktuell && aktuell.irrelevant) ctx.onEvent({ korrekt: true, reiz: aktuell.id, reaktion: 'keine', typ: 'korrekteZurueckhaltung' });
          else ctx.onEvent({ korrekt: false, auslassung: true, reiz: aktuell ? aktuell.id : '', reaktion: 'keine' });
          if (!(aktuell && aktuell.irrelevant)) ctx.feedback(false, null, null, { dauer: 350 });
          ende();
        });
      }
      function ende() { aktuell = null; reizEl.innerHTML = ''; timer = Z.nach(p.pauseMs + HT.zufall.int(0, 400), naechster); }
      function antwort(aktion) {
        if (!aktuell) return;
        Z.abbrechen(timer);
        var ok = !aktuell.irrelevant && aktion === aktuell.aktion;
        ctx.onEvent({ korrekt: ok, reiz: aktuell.id, reaktion: aktion, rtMs: Z.jetzt() - start, seite: 'mitte', typ: aktuell.irrelevant ? 'fehlreaktion' : (aktuell.ton ? 'ton' : 'bild') });
        ctx.feedback(ok, null, null, { dauer: 350 });
        var idx = reize.map(function (r) { return r.aktion; }).indexOf(aktion);
        if (knoepfe[idx]) { knoepfe[idx].classList.add(ok ? 'richtig' : 'falsch'); setTimeout(function () { knoepfe[idx].classList.remove('richtig', 'falsch'); }, 300); }
        ende();
      }
      return {
        start: function () {
          aus = HT.eingabe.an(function (a) { if (['links', 'rechts', 'hoch', 'runter'].indexOf(a) >= 0) antwort(a); });
          timer = Z.nach(800, naechster);
        },
        stop: function () { if (aus) aus(); Z.abbrechen(timer); }
      };
    },
    preview: function (el) {
      var bild = function (innen, mark) {
        var s = '<svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg"><g transform="translate(150 30)">' + (innen || '') + '</g>';
        s += '<rect x="100" y="190" width="80" height="80" rx="14" fill="#fff" stroke="' + (mark === 'links' ? '#2EAD6B' : '#e1e8ed') + '" stroke-width="3"/>';
        s += '<g transform="translate(110 200) scale(.6)">' + pfeilSvg(180, 100).replace(/<svg[^>]*>|<\/svg>/g, '') + '</g>';
        s += '<rect x="220" y="190" width="80" height="80" rx="14" fill="#fff" stroke="' + (mark === 'rechts' ? '#2EAD6B' : '#e1e8ed') + '" stroke-width="3"/>';
        s += '<g transform="translate(230 200) scale(.6)">' + pfeilSvg(0, 100).replace(/<svg[^>]*>|<\/svg>/g, '') + '</g>';
        return s + '</svg>';
      };
      var pfeilInnen = pfeilSvg(0, 100).replace(/<svg[^>]*>|<\/svg>/g, '');
      return HT.beispiel(el, [
        { svg: bild(pfeilInnen), text: 'Wohin zeigt der Pfeil?', dauer: 1100 },
        { svg: bild(pfeilInnen, 'rechts'), zeiger: [67, 77], klick: true, text: 'Rechts →', dauer: 1300 },
        { svg: bild('<rect x="18" y="18" width="64" height="64" rx="10" fill="#e7eef2"/>'), text: 'Grau: nichts drücken', dauer: 1400 }
      ]);
    }
  });
})();

/* Modul: Geteilte Aufmerksamkeit – visuell (Anzeigen links überwachen) und akustisch (auf hohen Ton reagieren) gleichzeitig.
 * Level: Tempo beider Kanäle, Anzahl Anzeigen. */
(function () {
  'use strict';
  var HT = window.HT;
  var levels = HT.stufen(12, function (t, i) {
    return { anzeigen: i <= 4 ? 1 : i <= 8 ? 2 : 3, nadelTempo: Math.round(HT.lerp(0.18, 0.42, t) * 100) / 100, tonIntervallMs: HT.lerpInt(2400, 1300, t), hochAnteil: 0.3, reaktionsfensterMs: HT.lerpInt(2200, 1300, t) };
  });

  function anzeigeSvg(wert) { // wert 0..1, rot ab 0.82
    var w = -120 + wert * 240, rad = function (g) { return (g - 90) * Math.PI / 180; };
    var bogen = function (a, b, farbe) {
      var x1 = 60 + 46 * Math.cos(rad(a)), y1 = 64 + 46 * Math.sin(rad(a)), x2 = 60 + 46 * Math.cos(rad(b)), y2 = 64 + 46 * Math.sin(rad(b));
      return '<path d="M' + x1 + ' ' + y1 + ' A46 46 0 ' + (b - a > 180 ? 1 : 0) + ' 1 ' + x2 + ' ' + y2 + '" fill="none" stroke="' + farbe + '" stroke-width="10" stroke-linecap="round"/>';
    };
    return '<svg viewBox="0 0 120 110" xmlns="http://www.w3.org/2000/svg"><circle cx="60" cy="64" r="56" fill="#fff" stroke="#26333c" stroke-width="3"/>' + bogen(-120, 76, '#cfe9d9') + bogen(76, 120, '#E25C5C') +
      '<line x1="60" y1="64" x2="' + (60 + 42 * Math.cos(rad(w))) + '" y2="' + (64 + 42 * Math.sin(rad(w))) + '" stroke="#26333c" stroke-width="4" stroke-linecap="round"/><circle cx="60" cy="64" r="6" fill="#26333c"/></svg>';
  }

  HT.registerModule({
    id: 'geteilte-aufmerksamkeit', name: 'Geteilte Aufmerksamkeit', kategorie: 'aufmerksamkeit', symbol: 'ton',
    ziel: 'Zwei Informationsquellen gleichzeitig überwachen',
    beschreibung: 'Links bewegen sich die Zeiger von einer bis drei Anzeigen. Erreicht ein Zeiger den roten Bereich, soll reagiert werden (Taste F bzw. linke Fläche). Gleichzeitig ertönen hohe und tiefe Töne; bei einem hohen Ton wird mit Taste J bzw. der rechten Fläche reagiert. Level: Anzahl Anzeigen und Tempo beider Kanäle.',
    anleitung: 'Behalten Sie beides im Blick: Erreicht ein Zeiger den ROTEN Bereich, drücken Sie F oder tippen links auf „Anzeige“. Hören Sie einen HOHEN Ton, drücken Sie J oder tippen rechts auf „Ton“.',
    tasten: [{ aktion: 'nein', label: 'F · Anzeige' }, { aktion: 'ja', label: 'J · Ton' }],
    levels: levels,
    levelLabels: { anzeigen: 'Anzeigen', nadelTempo: 'Zeigertempo', tonIntervallMs: 'Tonabstand (ms)', hochAnteil: 'Anteil hohe Töne', reaktionsfensterMs: 'Reaktionsfenster (ms)' },
    create: function (container, ctx) {
      var p = ctx.params, Z = HT.zeit, aus = [];
      var voll = HT.m.neu(container, 'm-voll', '', { display: 'flex' });
      var links = HT.m.neu(voll, '', '', { flex: '1.4', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderRight: '2px dashed var(--linie)' });
      var rechts = HT.m.neu(voll, '', '', { flex: '1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' });
      var reihe = HT.m.neu(links, '', '', { display: 'flex', flexWrap: 'wrap', justifyContent: 'center' });
      var anz = [];
      for (var i = 0; i < p.anzeigen; i++) {
        var el = HT.m.neu(reihe, '', '', { width: '190px', height: '175px', margin: '10px' });
        anz.push({ el: el, wert: HT.zufall.zahl(0.1, 0.5), richtung: HT.zufall.chance(0.5) ? 1 : -1, rot: false, seitRot: 0, gemeldet: false, ziel: HT.zufall.zahl(0.2, 0.7) });
      }
      var kA = HT.el('button', { class: 'm-wahl-knopf', type: 'button', style: { marginTop: '1.4rem', minWidth: '220px' }, html: '<kbd>F</kbd>&nbsp;Anzeige im Rot' });
      links.appendChild(kA);
      var lautsprecher = HT.m.neu(rechts, 'm-symbol', '<svg viewBox="0 0 100 100"><path d="M18 38 H34 L56 20 V80 L34 62 H18 Z" fill="#1BA8B5" stroke="#26333c" stroke-width="3" stroke-linejoin="round"/><path d="M66 36 C74 44 74 56 66 64 M74 28 C88 40 88 60 74 72" fill="none" stroke="#26333c" stroke-width="4" stroke-linecap="round"/></svg>', { width: '150px', height: '150px', transition: 'transform .15s' });
      var tonText = HT.m.neu(rechts, 'm-anweisung', 'Hoher Ton → J');
      var kT = HT.el('button', { class: 'm-wahl-knopf', type: 'button', style: { minWidth: '220px' }, html: '<kbd>J</kbd>&nbsp;Hoher Ton' });
      rechts.appendChild(kT);
      var tonOffen = null; // { start, hoch }
      function visuell() {
        var offen = anz.filter(function (a) { return a.rot && !a.gemeldet; });
        if (offen.length) {
          var a = offen[0]; a.gemeldet = true;
          ctx.onEvent({ korrekt: true, reiz: 'anzeige-rot', reaktion: 'F', rtMs: Z.jetzt() - a.seitRot, seite: 'links', typ: 'visuell' });
          ctx.feedback(true, null, null, { dauer: 300 });
          a.richtung = -1; a.ziel = HT.zufall.zahl(0.15, 0.5);
        } else {
          ctx.onEvent({ korrekt: false, reiz: 'anzeige-normal', reaktion: 'F', seite: 'links', typ: 'visuell' });
          ctx.feedback(false, null, null, { dauer: 300 });
        }
      }
      function akustisch() {
        if (tonOffen && tonOffen.hoch && !tonOffen.beantwortet) {
          tonOffen.beantwortet = true;
          ctx.onEvent({ korrekt: true, reiz: 'hoher-ton', reaktion: 'J', rtMs: Z.jetzt() - tonOffen.start, seite: 'rechts', typ: 'akustisch' });
          ctx.feedback(true, null, null, { dauer: 300 });
        } else {
          ctx.onEvent({ korrekt: false, reiz: 'tiefer-ton', reaktion: 'J', seite: 'rechts', typ: 'akustisch' });
          ctx.feedback(false, null, null, { dauer: 300 });
        }
      }
      function ton() {
        if (tonOffen && tonOffen.hoch && !tonOffen.beantwortet) ctx.onEvent({ korrekt: false, auslassung: true, reiz: 'hoher-ton', reaktion: 'keine', seite: 'rechts', typ: 'akustisch' });
        var hoch = HT.zufall.chance(p.hochAnteil);
        if (hoch) ctx.audio.hoch(); else ctx.audio.tief();
        lautsprecher.style.transform = 'scale(1.12)';
        Z.nach(160, function () { lautsprecher.style.transform = ''; });
        tonOffen = { start: Z.jetzt(), hoch: hoch, beantwortet: false };
        Z.nach(p.tonIntervallMs + HT.zufall.int(-250, 250), ton);
      }
      return {
        start: function () {
          HT.tap(kA, visuell); HT.tap(kT, akustisch);
          aus.push(HT.eingabe.an(function (a) { if (a === 'nein') visuell(); if (a === 'ja') akustisch(); }));
          Z.frame(function (dt) {
            anz.forEach(function (a) {
              a.wert += a.richtung * p.nadelTempo * dt * (0.6 + Math.random() * 0.8);
              if (a.richtung < 0 && a.wert <= a.ziel) { a.richtung = 1; a.ziel = HT.zufall.chance(0.35) ? HT.zufall.zahl(0.86, 0.97) : HT.zufall.zahl(0.45, 0.78); }
              if (a.richtung > 0 && a.wert >= a.ziel) { a.richtung = -1; a.ziel = HT.zufall.zahl(0.08, 0.5); }
              a.wert = HT.klemmen(a.wert, 0, 1);
              var rot = a.wert >= 0.82;
              if (rot && !a.rot) { a.rot = true; a.seitRot = Z.jetzt(); a.gemeldet = false; }
              if (!rot && a.rot) {
                if (!a.gemeldet) ctx.onEvent({ korrekt: false, auslassung: true, reiz: 'anzeige-rot', reaktion: 'keine', seite: 'links', typ: 'visuell' });
                a.rot = false;
              }
              if (a.rot && !a.gemeldet && Z.jetzt() - a.seitRot > p.reaktionsfensterMs) { a.richtung = -1; a.ziel = HT.zufall.zahl(0.1, 0.5); }
              a.el.innerHTML = anzeigeSvg(a.wert);
            });
          });
          Z.nach(1500, ton);
        },
        stop: function () { aus.forEach(function (f) { f(); }); }
      };
    },
    preview: function (el) {
      var b = function (w, tonan) {
        return '<svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg"><g transform="translate(40 70) scale(1.3)">' + anzeigeSvg(w).replace(/<svg[^>]*>|<\/svg>/g, '') + '</g><line x1="230" y1="30" x2="230" y2="270" stroke="#e1e8ed" stroke-width="3" stroke-dasharray="8 6"/><g transform="translate(260 90) scale(1.1)"><path d="M18 38 H34 L56 20 V80 L34 62 H18 Z" fill="' + (tonan ? '#1BA8B5' : '#c9d3da') + '" stroke="#26333c" stroke-width="3"/>' + (tonan ? '<path d="M66 36 C74 44 74 56 66 64 M74 28 C88 40 88 60 74 72" fill="none" stroke="#26333c" stroke-width="4" stroke-linecap="round"/>' : '') + '</g></svg>';
      };
      return HT.beispiel(el, [
        { svg: b(0.4), text: 'Zeiger beobachten …', dauer: 1000 },
        { svg: b(0.9), zeiger: [25, 80], klick: true, text: 'Rot! → F drücken', dauer: 1500 },
        { svg: b(0.5, true), text: 'Hoher Ton …', dauer: 900 },
        { svg: b(0.5, true), zeiger: [80, 80], klick: true, text: '→ J drücken', dauer: 1400 }
      ]);
    }
  });
})();

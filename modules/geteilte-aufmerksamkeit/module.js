/* Modul: Geteilte Aufmerksamkeit – geschlossene Kreise und hoher Ton gleichzeitig.
 * Offene Kreise und tiefe Töne sind irrelevant. Eigene Zeichnung. */
(function () {
  'use strict';
  var HT = window.HT;
  var levels = HT.stufen(12, function (t, i) {
    return {
      kreise: i <= 4 ? 1 : i <= 8 ? 2 : 3,
      wechselMs: HT.lerpInt(2200, 1200, t),
      geschlossenAnteil: 0.4,
      tonIntervallMs: HT.lerpInt(2400, 1300, t),
      hochAnteil: 0.3,
      reaktionsfensterMs: HT.lerpInt(1800, 1000, t)
    };
  });

  function kreisSvg(zu) {
    var innen = zu
      ? '<circle cx="60" cy="60" r="32" fill="#1BA8B5" stroke="#26333c" stroke-width="4"/>'
      : '<circle cx="60" cy="60" r="32" fill="none" stroke="#26333c" stroke-width="8"/>';
    return '<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg"><circle cx="60" cy="60" r="54" fill="#fff" stroke="#e1e8ed" stroke-width="3"/>' + innen + '</svg>';
  }

  HT.registerModule({
    id: 'geteilte-aufmerksamkeit', name: 'Geteilte Aufmerksamkeit', kategorie: 'aufmerksamkeit', symbol: 'ton',
    ziel: 'Zwei Informationsquellen gleichzeitig überwachen',
    beschreibung: 'Für Patienten, die nicht die Cockpit-Fahrt machen. Links wechseln Kreise: nur der geschlossene Kreis ist relevant (Taste F). Der offene Kreis wird nicht gedrückt. Gleichzeitig kommen hohe und tiefe Töne; nur der hohe Ton wird mit Taste J beantwortet. Die Kanäle werden getrennt gezählt.',
    anleitung: 'Zwei Aufgaben zugleich. Wird ein Kreis VOLL, drücken Sie F oder tippen links auf „Kreis“. Ist der Kreis nur ein Ring, nichts drücken. Hören Sie einen HOHEN Ton, drücken Sie J oder tippen rechts auf „Ton“. Beim tiefen Ton nichts drücken.',
    tasten: [{ aktion: 'nein', label: 'F · Kreis' }, { aktion: 'ja', label: 'J · Ton' }],
    levels: levels,
    levelLabels: { kreise: 'Kreise', wechselMs: 'Wechsel (ms)', geschlossenAnteil: 'Anteil voller Kreise', tonIntervallMs: 'Tonabstand (ms)', hochAnteil: 'Anteil hohe Töne', reaktionsfensterMs: 'Reaktionsfenster (ms)' },
    create: function (container, ctx) {
      var p = ctx.params, Z = HT.zeit, aus = [], merker = [];
      var voll = HT.m.neu(container, 'm-voll', '', { display: 'flex' });
      var links = HT.m.neu(voll, '', '', { flex: '1.4', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderRight: '2px dashed var(--linie)' });
      var rechts = HT.m.neu(voll, '', '', { flex: '1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' });
      var reihe = HT.m.neu(links, '', '', { display: 'flex', flexWrap: 'wrap', justifyContent: 'center' });
      var kreise = [];
      for (var i = 0; i < p.kreise; i++) {
        var el = HT.m.neu(reihe, '', kreisSvg(false), { width: '160px', height: '160px', margin: '12px' });
        kreise.push({ el: el, zu: false, gemeldet: false, seit: 0 });
      }
      var kA = HT.el('button', { class: 'm-wahl-knopf', type: 'button', style: { marginTop: '1.2rem', minWidth: '220px' }, html: '<kbd>F</kbd>&nbsp;Voller Kreis' });
      links.appendChild(kA);
      var lautsprecher = HT.m.neu(rechts, 'm-symbol', '<svg viewBox="0 0 100 100"><path d="M18 38 H34 L56 20 V80 L34 62 H18 Z" fill="#1BA8B5" stroke="#26333c" stroke-width="3" stroke-linejoin="round"/><path d="M66 36 C74 44 74 56 66 64 M74 28 C88 40 88 60 74 72" fill="none" stroke="#26333c" stroke-width="4" stroke-linecap="round"/></svg>', { width: '150px', height: '150px' });
      HT.m.neu(rechts, 'm-anweisung', 'Hoher Ton → J');
      var kT = HT.el('button', { class: 'm-wahl-knopf', type: 'button', style: { minWidth: '220px' }, html: '<kbd>J</kbd>&nbsp;Hoher Ton' });
      rechts.appendChild(kT);
      var tonOffen = null;

      function visuell() {
        var offen = kreise.filter(function (a) { return a.zu && !a.gemeldet; });
        if (offen.length) {
          var a = offen[0];
          a.gemeldet = true;
          ctx.onEvent({ korrekt: true, reiz: 'kreis-voll', reaktion: 'F', rtMs: Z.jetzt() - a.seit, seite: 'links', typ: 'visuell' });
          ctx.feedback(true, null, null, { dauer: 300 });
        } else {
          ctx.onEvent({ korrekt: false, reiz: 'kreis-offen', reaktion: 'F', seite: 'links', typ: 'visuell' });
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
      function naechsterKreis(a) {
        if (a.zu && !a.gemeldet) ctx.onEvent({ korrekt: false, auslassung: true, reiz: 'kreis-voll', reaktion: 'keine', seite: 'links', typ: 'visuell' });
        a.zu = HT.zufall.chance(p.geschlossenAnteil);
        a.gemeldet = false;
        a.seit = Z.jetzt();
        a.el.innerHTML = kreisSvg(a.zu);
        merker.push(Z.nach(a.zu ? p.reaktionsfensterMs : p.wechselMs, function () { naechsterKreis(a); }));
      }
      function ton() {
        if (tonOffen && tonOffen.hoch && !tonOffen.beantwortet) ctx.onEvent({ korrekt: false, auslassung: true, reiz: 'hoher-ton', reaktion: 'keine', seite: 'rechts', typ: 'akustisch' });
        var hoch = HT.zufall.chance(p.hochAnteil);
        if (hoch) ctx.audio.hoch(); else ctx.audio.tief();
        lautsprecher.style.transform = 'scale(1.12)';
        merker.push(Z.nach(160, function () { lautsprecher.style.transform = ''; }));
        tonOffen = { start: Z.jetzt(), hoch: hoch, beantwortet: false };
        merker.push(Z.nach(p.tonIntervallMs + HT.zufall.int(-250, 250), ton));
      }
      return {
        start: function () {
          HT.tap(kA, visuell);
          HT.tap(kT, akustisch);
          aus.push(HT.eingabe.an(function (a) { if (a === 'nein') visuell(); if (a === 'ja') akustisch(); }));
          kreise.forEach(function (a, i) { merker.push(Z.nach(600 + i * 400, function () { naechsterKreis(a); })); });
          merker.push(Z.nach(1500, ton));
        },
        stop: function () { aus.forEach(function (f) { f(); }); merker.forEach(function (id) { Z.abbrechen(id); }); }
      };
    },
    preview: function (el) {
      var b = function (zu, tonan) {
        return '<svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg"><g transform="translate(40 70) scale(1.15)">' + kreisSvg(zu).replace(/<svg[^>]*>|<\/svg>/g, '') + '</g><line x1="230" y1="30" x2="230" y2="270" stroke="#e1e8ed" stroke-width="3" stroke-dasharray="8 6"/><g transform="translate(270 100)"><path d="M18 38 H34 L56 20 V80 L34 62 H18 Z" fill="' + (tonan ? '#1BA8B5' : '#c9d3da') + '" stroke="#26333c" stroke-width="3"/>' + (tonan ? '<path d="M66 36 C74 44 74 56 66 64" fill="none" stroke="#26333c" stroke-width="4"/>' : '') + '</g></svg>';
      };
      return HT.beispiel(el, [
        { svg: b(false, false), text: 'Offener Kreis: nichts tun', dauer: 1100 },
        { svg: b(true, false), zeiger: [28, 78], klick: true, text: 'Voller Kreis → F', dauer: 1400 },
        { svg: b(false, true), zeiger: [78, 78], klick: true, text: 'Hoher Ton → J', dauer: 1400 }
      ]);
    }
  });
})();

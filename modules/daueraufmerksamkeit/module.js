/* Modul: Daueraufmerksamkeit
 * Symbole erscheinen nacheinander in der Mitte, nur auf das Zielsymbol reagieren.
 * Level: Tempo 2000 → 600 ms, Ähnlichkeit der Ablenker steigt, Zielanteil 30 % → 10 %. */
(function () {
  'use strict';
  var HT = window.HT;

  var levels = HT.stufen(14, function (t, i) {
    return {
      tempoMs: HT.lerpInt(2000, 600, t),
      zielanteil: Math.round(HT.lerp(0.3, 0.1, t) * 100) / 100,
      aehnlichkeit: i <= 4 ? 1 : i <= 9 ? 2 : 3, // 1 = andere Form & Farbe, 2 = gleiche Farbe, 3 = ähnliche Form, gleiche Farbe
      groesse: HT.lerpInt(240, 170, t)
    };
  });
  // Ähnliche Formen für hohe Level
  var AEHNLICH = { stern: ['fuenfeck', 'blitz', 'kreuz'], kreis: ['oval', 'ring', 'sechseck'], quadrat: ['raute', 'sechseck', 'fuenfeck'], dreieck: ['pfeil', 'tropfen', 'raute'], herz: ['tropfen', 'mond', 'kreis'] };
  var ZIELE = Object.keys(AEHNLICH);
  var ALLE = ['kreis', 'quadrat', 'dreieck', 'raute', 'stern', 'herz', 'kreuz', 'sechseck', 'mond', 'pfeil', 'tropfen', 'blitz'];

  HT.registerModule({
    id: 'daueraufmerksamkeit',
    name: 'Daueraufmerksamkeit',
    kategorie: 'aufmerksamkeit',
    symbol: 'auge',
    ziel: 'Aufmerksamkeit über längere Zeit halten und gezielt reagieren',
    beschreibung: 'Symbole erscheinen in gleichmäßigem Takt in der Bildschirmmitte. Nur auf das zu Beginn gezeigte Zielsymbol soll reagiert werden. Mit steigendem Level wird das Tempo schneller, Zielreize werden seltener und die Ablenker dem Ziel ähnlicher (erst gleiche Farbe, dann auch ähnliche Form). Gemessen werden Treffer, Fehlreaktionen, Auslassungen und Reaktionszeit.',
    anleitung: 'Oben sehen Sie Ihr Zielsymbol. In der Mitte erscheinen nacheinander verschiedene Symbole. Drücken Sie nur dann die Leertaste oder tippen auf das Symbol, wenn Ihr Zielsymbol erscheint.',
    eingabe: ['tastatur', 'maus', 'touch'],
    tasten: ['ok'],
    levels: levels,
    levelLabels: { tempoMs: 'Takt (ms)', zielanteil: 'Zielanteil', aehnlichkeit: 'Ähnlichkeit (1–3)', groesse: 'Größe (px)' },
    bewertung: { aufstufenAb: 0.85, abstufenUnter: 0.6 },

    create: function (container, ctx) {
      var p = ctx.params, Z = HT.zeit;
      var zielForm = HT.zufall.wahl(ZIELE), zielFarbe = HT.zufall.wahl(['blau', 'gruen', 'rot', 'lila', 'orange']);
      var oben = HT.m.neu(container, 'm-oben', '<div class="m-anweisung" style="display:inline-flex;align-items:center;margin:0">Ziel:&nbsp;<span style="display:inline-block;width:52px;height:52px">' + HT.formSvg(zielForm, zielFarbe) + '</span></div>');
      var zone = HT.m.neu(container, 'm-zentrum');
      var reizEl = HT.m.neu(zone, 'm-symbol m-reiz', '', { width: p.groesse + 'px', height: p.groesse + 'px', cursor: 'pointer' });
      var aktuell = null, reizStart = 0, beantwortet = false, timer = null, aus = [], seitZiel = 0;

      function ablenker() {
        var farbe = zielFarbe, form;
        if (p.aehnlichkeit === 1) {
          form = HT.zufall.wahl(HT.zufall.ausser(ALLE, [zielForm]));
          farbe = HT.zufall.wahl(HT.zufall.ausser(['blau', 'gruen', 'rot', 'lila', 'orange', 'gelb'], [zielFarbe]));
        } else if (p.aehnlichkeit === 2) {
          form = HT.zufall.wahl(HT.zufall.ausser(ALLE, [zielForm]));
          if (HT.zufall.chance(0.3)) { form = zielForm; farbe = HT.zufall.wahl(HT.zufall.ausser(['blau', 'gruen', 'rot', 'lila', 'orange'], [zielFarbe])); }
        } else {
          form = HT.zufall.chance(0.7) ? HT.zufall.wahl(AEHNLICH[zielForm]) : zielForm;
          if (form === zielForm) farbe = HT.zufall.wahl(HT.zufall.ausser(['blau', 'gruen', 'rot', 'lila', 'orange'], [zielFarbe]));
        }
        return { form: form, farbe: farbe, ziel: false };
      }

      function takt() {
        // Ende des vorherigen Reizes auswerten
        if (aktuell && aktuell.ziel && !beantwortet) { ctx.onEvent({ korrekt: false, auslassung: true, reiz: aktuell.form, reaktion: 'keine', seite: 'mitte' }); }
        var istZiel = HT.zufall.chance(p.zielanteil) || seitZiel > Math.round(2 / p.zielanteil);
        aktuell = istZiel ? { form: zielForm, farbe: zielFarbe, ziel: true } : ablenker();
        seitZiel = istZiel ? 0 : seitZiel + 1;
        beantwortet = false;
        reizStart = Z.jetzt();
        reizEl.style.opacity = '1';
        reizEl.innerHTML = HT.formSvg(aktuell.form, aktuell.farbe);
        timer = Z.nach(Math.round(p.tempoMs * 0.72), function () { reizEl.style.opacity = '0'; timer = Z.nach(Math.round(p.tempoMs * 0.28), takt); });
      }

      function reagieren() {
        if (!aktuell || beantwortet) return;
        beantwortet = true;
        var rt = Z.jetzt() - reizStart;
        if (aktuell.ziel) { ctx.onEvent({ korrekt: true, reiz: aktuell.form, reaktion: 'reagiert', rtMs: rt, seite: 'mitte' }); ctx.feedback(true, null, null, { dauer: 300 }); }
        else { ctx.onEvent({ korrekt: false, reiz: aktuell.form + '/' + aktuell.farbe, reaktion: 'reagiert', rtMs: rt, typ: 'fehlreaktion', seite: 'mitte' }); ctx.feedback(false, null, null, { dauer: 300 }); }
      }

      return {
        start: function () {
          aus.push(HT.eingabe.an(function (a) { if (a === 'ok') reagieren(); }));
          aus.push(HT.tap(container, function (ev) { if (!ev.target.closest('button')) reagieren(); }));
          timer = Z.nach(1200, takt);
        },
        stop: function () { aus.forEach(function (f) { f(); }); }
      };
    },

    preview: function (el) {
      var ziel = function (inhalt, z) { return '<svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg"><text x="150" y="44" font-size="22" fill="#51606b" font-family="-apple-system,sans-serif" font-weight="600">Ziel:</text><g transform="translate(205 16) scale(.38)">' + HT.form('stern', 'blau') + '</g><g transform="translate(140 90) scale(1.2)">' + inhalt + '</g></svg>' + (z ? '' : ''); };
      return HT.beispiel(el, [
        { svg: ziel(HT.form('kreis', 'rot')), text: 'Kein Ziel – nichts tun', dauer: 1300 },
        { svg: ziel(HT.form('dreieck', 'gruen')), text: 'Kein Ziel – nichts tun', dauer: 1300 },
        { svg: ziel(HT.form('stern', 'blau')), zeiger: [50, 62], klick: true, text: 'Ziel! Jetzt drücken', dauer: 1600 },
        { svg: ziel(HT.form('herz', 'lila')), zeiger: [85, 85], text: 'Kein Ziel – nichts tun', dauer: 1300 }
      ]);
    }
  });
})();

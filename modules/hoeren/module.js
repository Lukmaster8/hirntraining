/* Modul: Hörtraining – akustische Aufmerksamkeit.
 * Töne erklingen nacheinander; nur auf den Zielton (hoch) reagieren. Später: kleinere Tonhöhenunterschiede,
 * schnellere Folge, Regel „zwei gleiche Töne hintereinander“ und Töne von links/rechts (Kopfhörer). */
(function () {
  'use strict';
  var HT = window.HT;
  var levels = HT.stufen(12, function (t, i) {
    return {
      abstandMs: HT.lerpInt(2200, 900, t),
      halbtoene: i <= 3 ? 12 : i <= 6 ? 7 : i <= 9 ? 4 : 2,
      zielAnteil: 0.3,
      regel: i >= 8 ? 'wiederholung' : 'hoch',
      stereo: i >= 10,
      tondauer: HT.lerp(0.35, 0.2, t)
    };
  });
  function lautsprecher(an) {
    return '<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="46" fill="' + (an ? '#e3f6f8' : '#f1f4f6') + '" stroke="' + (an ? '#1BA8B5' : '#d6dee3') + '" stroke-width="3"/>' +
      '<path d="M28 42 H38 L52 30 V70 L38 58 H28 Z" fill="' + (an ? '#1BA8B5' : '#9aa7b0') + '"/>' +
      (an ? '<path d="M60 40 Q66 50 60 60 M66 34 Q76 50 66 66" fill="none" stroke="#1BA8B5" stroke-width="4" stroke-linecap="round"/>' : '') + '</svg>';
  }
  HT.registerModule({
    id: 'hoeren', name: 'Hörtraining', kategorie: 'aufmerksamkeit', symbol: 'ton',
    ziel: 'Auf bestimmte Töne achten und gezielt reagieren (akustische Aufmerksamkeit)',
    beschreibung: 'Mehrere Töne folgen nacheinander: tief, mittel und hoch. Reagiert wird nur auf den hohen Zielton. Später liegen die Tonhöhen näher beieinander. Ab Level 8 gilt: reagieren, wenn derselbe Ton zweimal hintereinander kommt. Ab Level 10 kommen die Töne von links oder rechts.',
    anleitung: 'Hören Sie genau hin. Drücken Sie die Leertaste oder tippen Sie auf den Lautsprecher nur beim HOHEN Ton. Der tiefe und der mittlere Ton zählen nicht.',
    tasten: ['ok'], levels: levels,
    levelLabels: { abstandMs: 'Abstand der Töne (ms)', halbtoene: 'Tonhöhenunterschied (Halbtöne)', regel: 'Regel', stereo: 'Links/rechts', tondauer: 'Tondauer (s)' },
    bewertung: { aufstufenAb: 0.85, abstufenUnter: 0.6 },
    create: function (container, ctx) {
      var p = ctx.params, Z = HT.zeit, aus = [];
      var zone = HT.m.neu(container, 'm-zentrum');
      var anw = HT.m.neu(zone, 'm-anweisung', p.regel === 'wiederholung' ? 'Reagieren, wenn derselbe Ton <b>zweimal hintereinander</b> kommt' : 'Reagieren beim <b>hohen</b> Ton');
      var lg = Math.round(Math.max(220, 30 * (ctx.buehne ? ctx.buehne.einheit : 7)));
      var lsp = HT.m.neu(zone, 'm-symbol', lautsprecher(false), { width: lg + 'px', height: lg + 'px', cursor: 'pointer' });
      var info = HT.m.neu(zone, 'm-anweisung', '', { marginTop: '1rem', fontSize: '1.3rem' });
      var tief = 440, hoch = 440 * Math.pow(2, p.halbtoene / 12), mitte = 440 * Math.pow(2, (p.halbtoene / 2) / 12);
      var vorher = null, aktuell = null, timer = null;
      function ton() {
        var ziel;
        if (p.regel === 'wiederholung') {
          ziel = vorher !== null && HT.zufall.chance(p.zielAnteil);
          var f = ziel ? vorher : (vorher === null ? HT.zufall.wahl([tief, hoch]) : (vorher === tief ? hoch : tief));
          if (!ziel && HT.zufall.chance(0.3)) f = HT.zufall.wahl([tief, hoch, (tief + hoch) / 2]);
          if (!ziel && f === vorher) ziel = true;
          aktuell = { ziel: ziel, freq: f, start: Z.jetzt(), beantwortet: false };
          vorher = f;
        } else {
          ziel = HT.zufall.chance(p.zielAnteil);
          aktuell = { ziel: ziel, freq: ziel ? hoch : (HT.zufall.chance(0.45) ? mitte : tief), start: Z.jetzt(), beantwortet: false };
        }
        var pan = p.stereo ? HT.zufall.wahl([-0.9, 0.9]) : 0;
        aktuell.seite = pan < 0 ? 'links' : pan > 0 ? 'rechts' : 'mitte';
        ctx.audio.ton(aktuell.freq, p.tondauer, 'sine', 0, 0.5, pan);
        lsp.innerHTML = lautsprecher(true);
        Z.nach(p.tondauer * 1000 + 80, function () { lsp.innerHTML = lautsprecher(false); });
        var a = aktuell;
        timer = Z.nach(p.abstandMs, function () {
          if (!a.beantwortet) {
            if (a.ziel) { ctx.onEvent({ korrekt: false, auslassung: true, reiz: 'zielton', reaktion: 'keine', seite: a.seite }); info.textContent = 'Zielton verpasst'; }
            else ctx.onEvent({ korrekt: true, reiz: 'ablenkton', reaktion: 'keine', typ: 'korrekteZurueckhaltung', seite: a.seite });
          }
          ton();
        });
      }
      function reagieren() {
        if (!aktuell || aktuell.beantwortet) return;
        aktuell.beantwortet = true;
        var rt = Z.jetzt() - aktuell.start;
        if (aktuell.ziel) { ctx.onEvent({ korrekt: true, reiz: 'zielton', reaktion: 'reagiert', rtMs: rt, seite: aktuell.seite }); info.textContent = 'Richtig – ' + Math.round(rt) + ' ms'; ctx.feedback(true, null, null, { dauer: 300 }); }
        else { ctx.onEvent({ korrekt: false, reiz: 'ablenkton', reaktion: 'reagiert', rtMs: rt, typ: 'fehlreaktion', seite: aktuell.seite }); info.textContent = 'Das war nicht der Zielton'; ctx.feedback(false); }
      }
      return {
        start: function () {
          aus.push(HT.eingabe.an(function (a) { if (a === 'ok') reagieren(); }));
          aus.push(HT.tap(container, function (ev) { if (!ev.target.closest('button')) reagieren(); }));
          // Beispieltöne vorspielen
          info.textContent = p.regel === 'wiederholung' ? 'Gleich geht es los …' : 'Erst tief, dann mittel, dann der hohe Zielton.';
          if (p.regel !== 'wiederholung') { ctx.audio.ton(tief, 0.35, 'sine', 0.2, 0.5); ctx.audio.ton(mitte, 0.35, 'sine', 0.8, 0.5); ctx.audio.ton(hoch, 0.4, 'sine', 1.4, 0.5); }
          timer = Z.nach(2600, function () { info.textContent = ''; ton(); });
        },
        stop: function () { aus.forEach(function (f) { f(); }); Z.abbrechen(timer); }
      };
    },
    preview: function (el) {
      var s = function (an, txt) { return '<div style="display:flex;flex-direction:column;align-items:center"><div style="width:120px;height:120px">' + lautsprecher(an) + '</div><div style="margin-top:10px;font:700 18px -apple-system,sans-serif;color:#51606b">' + txt + '</div></div>'; };
      return HT.beispiel(el, [
        { svg: s(true, '♪ tief'), text: 'Tiefer Ton – nicht reagieren', dauer: 1500 },
        { svg: s(false, ''), dauer: 600 },
        { svg: s(true, '♪ HOCH'), zeiger: [52, 45], klick: true, text: 'Hoher Ton – sofort drücken!', dauer: 1700 },
        { svg: s(false, ''), dauer: 600 }
      ]);
    }
  });
})();

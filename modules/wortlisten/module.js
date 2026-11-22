/* Modul: Wortlisten – Wörter werden gezeigt (optional vorgelesen), danach aus einer größeren Liste wiedererkennen. */
(function () {
  'use strict';
  var HT = window.HT;
  var levels = HT.stufen(14, function (t, i) {
    return { anzahl: HT.lerpInt(4, 16, t), darbietungMs: HT.lerpInt(2600, 1500, t), aehnlich: i >= 5, verzoegerungSek: i >= 9 ? HT.lerpInt(5, 15, (i - 9) / 5) : 0 };
  });

  HT.registerModule({
    id: 'wortlisten', name: 'Wortlisten', kategorie: 'gedaechtnis', symbol: 'buch',
    ziel: 'Verbales Lernen und Wiedererkennen von Wörtern',
    beschreibung: 'Eine Wortliste wird Wort für Wort gezeigt und – sofern eine Systemstimme verfügbar ist – vorgelesen. Danach erscheinen gelernte und neue Wörter gemischt und es wird entschieden: bekannt oder neu. In höheren Leveln stammen neue Wörter aus denselben Oberbegriffen und es gibt eine Wartezeit.',
    anleitung: 'Lesen Sie die Wörter und merken Sie sie sich. Danach erscheinen Wörter einzeln: Tippen Sie auf „Bekannt“ (J), wenn das Wort in der Liste war, sonst auf „Neu“ (N).',
    tasten: ['ja', 'nein'], eingaben: ['ja', 'nein'],
    levels: levels,
    levelLabels: { anzahl: 'Wörter', darbietungMs: 'Darbietung (ms)', aehnlich: 'Ähnliche neue Wörter', verzoegerungSek: 'Verzögerung (s)' },
    parameterSchema: { vorlesen: { typ: 'schalter', label: 'Wörter vorlesen (falls Systemstimme vorhanden)', standard: true } },
    bewertung: { aufstufenAb: 0.85, abstufenUnter: 0.65 },
    create: function (container, ctx) {
      var p = ctx.params, Z = HT.zeit, aus = null;
      var zone = HT.m.neu(container, 'm-zentrum');
      var anw = HT.m.neu(zone, 'm-anweisung');
      var wortEl = HT.m.neu(zone, 'm-wort', '', { minWidth: '360px', textAlign: 'center', marginBottom: '1.8rem' });
      var wahl = HT.m.neu(zone, 'm-wahl');
      var fort = HT.m.neu(zone, 'gedimmt', '', { marginTop: '1rem' });
      var test = [], idx = 0, aktiv = false, start = 0, knoepfe = [];
      function runde() {
        var gelernt = HT.data.wortZufall(p.anzahl);
        var w = gelernt.map(function (x) { return x.wort; });
        var neue = [];
        gelernt.forEach(function (x) {
          var pool = HT.data.woerter.filter(function (y) { return w.indexOf(y.wort) < 0 && neue.indexOf(y) < 0 && (!p.aehnlich || y.kategorie === x.kategorie); });
          if (pool.length) neue.push(HT.zufall.wahl(pool));
        });
        test = HT.zufall.mischen(gelernt.map(function (x) { return { w: x.wort, alt: true }; }).concat(neue.map(function (x) { return { w: x.wort, alt: false }; })));
        HT.leeren(wahl);
        anw.innerHTML = 'Merken Sie sich die Wörter';
        wortEl.style.visibility = 'visible';
        var k = 0;
        (function zeige() {
          if (k >= gelernt.length) { wortEl.textContent = ''; wortEl.style.visibility = 'hidden'; return verz(); }
          wortEl.textContent = gelernt[k].wort;
          if (p.vorlesen) ctx.audio.sprechen(gelernt[k].wort);
          fort.textContent = 'Wort ' + (k + 1) + ' von ' + gelernt.length;
          k++;
          Z.nach(p.darbietungMs, function () { wortEl.textContent = ''; Z.nach(300, zeige); });
        })();
      }
      function verz() {
        var rest = p.verzoegerungSek;
        fort.textContent = '';
        (function tick() {
          if (rest <= 0) return testen();
          anw.innerHTML = 'Gleich geht es weiter … <b>' + rest + '</b>'; rest--;
          Z.nach(1000, tick);
        })();
      }
      function testen() {
        idx = 0; anw.innerHTML = 'War dieses Wort in der Liste?';
        wortEl.style.visibility = 'visible';
        knoepfe = HT.m.wahl(wahl, [{ html: '✓&nbsp; Bekannt', wert: true }, { html: '✗&nbsp; Neu', wert: false }], antwort);
        naechstes();
      }
      function naechstes() {
        knoepfe.forEach(function (b) { b.classList.remove('richtig', 'falsch'); });
        if (idx >= test.length) { HT.leeren(wahl); wortEl.textContent = ''; anw.innerHTML = 'Eine neue Liste kommt …'; Z.nach(1300, runde); return; }
        wortEl.textContent = test[idx].w;
        fort.textContent = (idx + 1) + ' / ' + test.length;
        aktiv = true; start = Z.jetzt();
      }
      function antwort(wert, knopf) {
        if (!aktiv) return;
        aktiv = false;
        var t = test[idx], ok = wert === t.alt;
        knopf.classList.add(ok ? 'richtig' : 'falsch');
        ctx.onEvent({ korrekt: ok, reiz: t.w + (t.alt ? ' (alt)' : ' (neu)'), reaktion: wert ? 'bekannt' : 'neu', rtMs: Z.jetzt() - start });
        ctx.feedback(ok, null, null, { dauer: 350 });
        idx++;
        Z.nach(ok ? 600 : 1100, naechstes);
      }
      return {
        start: function () { aus = HT.eingabe.an(function (a) { if (a === 'ja' && knoepfe[0]) antwort(true, knoepfe[0]); if (a === 'nein' && knoepfe[1]) antwort(false, knoepfe[1]); }); Z.nach(400, runde); },
        stop: function () { if (aus) aus(); }
      };
    },
    preview: function (el) {
      var w = function (t, knoepfe, mark) {
        return '<svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg"><rect x="100" y="40" width="200" height="90" rx="18" fill="#fff" stroke="#e1e8ed" stroke-width="2"/><text x="200" y="100" text-anchor="middle" font-size="34" font-weight="800" font-family="-apple-system,sans-serif" fill="#1E2A33">' + t + '</text>' +
          (knoepfe ? '<rect x="95" y="180" width="100" height="56" rx="14" fill="#fff" stroke="#e1e8ed" stroke-width="3"/><text x="145" y="215" text-anchor="middle" font-size="18" font-weight="700" font-family="-apple-system,sans-serif">Bekannt</text><rect x="205" y="180" width="100" height="56" rx="14" fill="' + (mark ? '#e2f5ea' : '#fff') + '" stroke="' + (mark ? '#2EAD6B' : '#e1e8ed') + '" stroke-width="3"/><text x="255" y="215" text-anchor="middle" font-size="18" font-weight="700" font-family="-apple-system,sans-serif">Neu</text>' : '') + '</svg>';
      };
      return HT.beispiel(el, [{ svg: w('Garten'), text: 'Merken', dauer: 1000 }, { svg: w('Fenster'), text: 'Merken', dauer: 1000 }, { svg: w('Brille', true), text: 'In der Liste?', dauer: 900 }, { svg: w('Brille', true, 1), zeiger: [64, 69], klick: true, text: 'Nein – neu!', dauer: 1500 }]);
    }
  });
})();

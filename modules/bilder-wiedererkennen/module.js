/* Modul: Bilder wiedererkennen – Lernphase mit 3–20 Bildern, danach Testphase: bekannt oder neu.
 * Level: Anzahl, Darbietungszeit, Ähnlichkeit der neuen Bilder, Verzögerung. */
(function () {
  'use strict';
  var HT = window.HT;
  var levels = HT.stufen(16, function (t, i) {
    return { anzahl: HT.lerpInt(3, 20, t), darbietungMs: HT.lerpInt(2600, 1300, t), aehnlich: i >= 6, verzoegerungSek: i >= 10 ? HT.lerpInt(5, 15, (i - 10) / 6) : 0 };
  });

  HT.registerModule({
    id: 'bilder-wiedererkennen', name: 'Bilder wiedererkennen', kategorie: 'gedaechtnis', symbol: 'auge',
    ziel: 'Visuelles Gedächtnis und Wiedererkennen stärken',
    beschreibung: 'In der Lernphase werden nacheinander Alltagsbilder gezeigt. In der Testphase erscheinen bekannte und neue Bilder gemischt; für jedes Bild wird entschieden, ob es bekannt oder neu ist. In höheren Leveln stammen die neuen Bilder aus derselben Kategorie (z. B. anderes Obst) und es gibt eine Wartezeit zwischen Lernen und Abfrage.',
    anleitung: 'Schauen Sie sich die Bilder genau an und merken Sie sie sich. Danach sehen Sie wieder Bilder: Tippen Sie auf „Bekannt“ (Taste J), wenn Sie es vorher gesehen haben, sonst auf „Neu“ (Taste N).',
    tasten: ['ja', 'nein'], eingaben: ['ja', 'nein'],
    levels: levels,
    levelLabels: { anzahl: 'Bilder', darbietungMs: 'Darbietung (ms)', aehnlich: 'Ähnliche neue Bilder', verzoegerungSek: 'Verzögerung (s)' },
    bewertung: { aufstufenAb: 0.85, abstufenUnter: 0.65 },
    create: function (container, ctx) {
      var p = ctx.params, Z = HT.zeit, aus = null;
      var zone = HT.m.neu(container, 'm-zentrum');
      var anw = HT.m.neu(zone, 'm-anweisung');
      var bild = HT.m.neu(zone, 'm-kachel', '', { width: '300px', height: '300px', marginBottom: '1.6rem' });
      var wahl = HT.m.neu(zone, 'm-wahl');
      var fort = HT.m.neu(zone, 'gedimmt', '', { marginTop: '1rem' });
      var test = [], idx = 0, aktiv = false, start = 0, knoepfe = [];
      function runde() {
        var gelernt = HT.zufall.stichprobe(HT.data.bilder, p.anzahl);
        var ids = gelernt.map(function (b) { return b.id; });
        var neue;
        if (p.aehnlich) {
          neue = [];
          gelernt.forEach(function (b) {
            var kand = HT.data.bilder.filter(function (x) { return x.kategorie === b.kategorie && ids.indexOf(x.id) < 0 && neue.indexOf(x) < 0; });
            if (kand.length) neue.push(HT.zufall.wahl(kand));
          });
        } else neue = HT.zufall.stichprobe(HT.data.bilder.filter(function (x) { return ids.indexOf(x.id) < 0; }), p.anzahl);
        neue = neue.slice(0, p.anzahl);
        test = HT.zufall.mischen(gelernt.map(function (b) { return { b: b, alt: true }; }).concat(neue.map(function (b) { return { b: b, alt: false }; })));
        HT.leeren(wahl); fort.textContent = '';
        var k = 0;
        anw.innerHTML = 'Merken Sie sich die Bilder';
        (function zeige() {
          if (k >= gelernt.length) { bild.innerHTML = ''; return pause(); }
          bild.innerHTML = HT.bild(gelernt[k]);
          fort.textContent = 'Bild ' + (k + 1) + ' von ' + gelernt.length;
          k++;
          Z.nach(p.darbietungMs, function () { bild.innerHTML = ''; Z.nach(300, zeige); });
        })();
      }
      function pause() {
        if (!p.verzoegerungSek) return testen();
        var rest = p.verzoegerungSek;
        fort.textContent = '';
        (function tick() {
          anw.innerHTML = 'Gleich geht es weiter … <b>' + rest + '</b>';
          if (rest-- <= 0) return testen();
          Z.nach(1000, tick);
        })();
      }
      function testen() {
        idx = 0;
        anw.innerHTML = 'Haben Sie dieses Bild gesehen?';
        knoepfe = HT.m.wahl(wahl, [{ html: '✓&nbsp; Bekannt', wert: true }, { html: '✗&nbsp; Neu', wert: false }], antwort);
        naechstes();
      }
      function naechstes() {
        knoepfe.forEach(function (b) { b.classList.remove('richtig', 'falsch'); });
        if (idx >= test.length) { anw.innerHTML = 'Neue Bilder kommen …'; HT.leeren(wahl); bild.innerHTML = ''; Z.nach(1200, runde); return; }
        bild.innerHTML = HT.bild(test[idx].b);
        fort.textContent = (idx + 1) + ' / ' + test.length;
        aktiv = true; start = Z.jetzt();
      }
      function antwort(wert, knopf) {
        if (!aktiv) return;
        aktiv = false;
        var t = test[idx], ok = wert === t.alt;
        knopf.classList.add(ok ? 'richtig' : 'falsch');
        ctx.onEvent({ korrekt: ok, reiz: t.b.id + (t.alt ? ' (alt)' : ' (neu)'), reaktion: wert ? 'bekannt' : 'neu', rtMs: Z.jetzt() - start });
        ctx.feedback(ok, null, null, { dauer: 350 });
        idx++;
        Z.nach(ok ? 600 : 1100, naechstes);
      }
      return {
        start: function () { aus = HT.eingabe.an(function (a) { if (a === 'ja') antwort(true, knoepfe[0]); if (a === 'nein') antwort(false, knoepfe[1]); }); Z.nach(400, runde); },
        stop: function () { if (aus) aus(); }
      };
    },
    preview: function (el) {
      var k = function (id, knoepfe, mark) {
        return '<svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg"><rect x="140" y="20" width="120" height="120" rx="16" fill="#fff" stroke="#e1e8ed" stroke-width="2"/>' + HT.bildGruppe(id, 200, 80, 100) +
          (knoepfe ? '<rect x="95" y="190" width="100" height="56" rx="14" fill="' + (mark === 1 ? '#e2f5ea' : '#fff') + '" stroke="' + (mark === 1 ? '#2EAD6B' : '#e1e8ed') + '" stroke-width="3"/><text x="145" y="225" text-anchor="middle" font-size="18" font-weight="700" font-family="-apple-system,sans-serif">Bekannt</text><rect x="205" y="190" width="100" height="56" rx="14" fill="#fff" stroke="#e1e8ed" stroke-width="3"/><text x="255" y="225" text-anchor="middle" font-size="18" font-weight="700" font-family="-apple-system,sans-serif">Neu</text>' : '') + '</svg>';
      };
      return HT.beispiel(el, [
        { svg: k('apfel'), text: 'Merken: Apfel', dauer: 1100 }, { svg: k('schluessel'), text: 'Merken: Schlüssel', dauer: 1100 },
        { svg: k('apfel', true), text: 'Gesehen?', dauer: 900 }, { svg: k('apfel', true, 1), zeiger: [36, 72], klick: true, text: 'Ja, bekannt!', dauer: 1500 }
      ]);
    }
  });
})();

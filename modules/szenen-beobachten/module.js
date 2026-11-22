/* Modul: Alltagsszenen beobachten – aufmerksames Beobachten von Abläufen und Behalten von Details.
 * Eine animierte SVG-Szene (Bushaltestelle, Küche, Marktplatz, Wartezimmer) läuft 15–60 s; Personen und Dinge bewegen sich,
 * Ereignisse passieren. Danach 3–8 Fragen: Farbe (Detail), Reihenfolge, Anzahl.
 * Szenen als Daten in data/szenen.js (Akteure mit Keyframes), Animation per HT.zeit.frame und transform.
 * Level: Szenendauer, gleichzeitige Ereignisse, Fragentyp (Farbe → Reihenfolge → Anzahl), Verzögerung mit Ablenkung, 3 → 5 Antworten. */
(function () {
  'use strict';
  var HT = window.HT;

  var levels = HT.stufen(14, function (t, i) {
    return {
      dauerSek: HT.lerpInt(15, 60, t),
      ereignisse: i <= 4 ? 2 : i <= 9 ? 3 : 4,
      fragentypen: i <= 3 ? 'detail' : i <= 7 ? 'detail+reihenfolge' : 'alle',
      fragen: Math.min(8, 3 + Math.floor((i - 1) / 3)),
      verzoegerungSek: i <= 8 ? 0 : HT.lerpInt(10, 30, (i - 9) / 5),
      antworten: i <= 4 ? 3 : i <= 9 ? 4 : 5
    };
  });

  HT.registerModule({
    id: 'szenen-beobachten', name: 'Alltagsszenen beobachten', kategorie: 'gedaechtnis', symbol: 'auge',
    ziel: 'Abläufe aufmerksam beobachten und Einzelheiten behalten',
    beschreibung: 'Eine animierte Alltagsszene läuft (Bushaltestelle, Küche, Marktplatz, Wartezimmer): Ein Bus kommt, jemand lässt etwas fallen, ein Luftballon fliegt davon. Danach folgen Fragen wie „Welche Farbe hatte der Schirm?“, „Was geschah zuerst?“ oder „Wie viele Personen stiegen ein?“. Trainiert werden episodisches Gedächtnis und geteilte Aufmerksamkeit; ausgewertet wird die Trefferquote je Fragentyp.',
    anleitung: 'Schauen Sie sich die Szene genau an. Danach werden Ihnen Fragen dazu gestellt. Tippen Sie auf die richtige Antwort oder drücken Sie die Ziffer.',
    tasten: [], levels: levels,
    levelLabels: { dauerSek: 'Szenendauer (s)', ereignisse: 'Ereignisse', fragentypen: 'Fragentypen', fragen: 'Fragen je Szene', verzoegerungSek: 'Verzögerung (s)', antworten: 'Antwortmöglichkeiten' },
    create: function (container, ctx) {
      var p = ctx.params, Z = HT.zeit, aus = [], laeuft = true, frameId = null, letzteSzene = null;
      var zone = HT.m.neu(container, 'm-zentrum');
      var anw = HT.m.neu(zone, 'm-anweisung');
      var fort = HT.m.neu(zone, 'sz-fortschritt', '<i></i>');
      var buehne = HT.m.neu(zone, 'sz-buehne');
      var wahl = HT.m.neu(zone, 'sz-wahl');
      function szene() {
        if (!laeuft) return;
        var def; do { def = HT.zufall.wahl(HT.data.szenen); } while (HT.data.szenen.length > 1 && def === letzteSzene);
        letzteSzene = def;
        var s = def.bauen(HT.zufall, p.dauerSek, p.ereignisse);
        anw.innerHTML = 'Beobachten Sie genau: <b>' + def.name + '</b>';
        HT.leeren(wahl);
        fort.style.visibility = '';
        var svg = '<svg viewBox="0 0 800 500" xmlns="http://www.w3.org/2000/svg">' + s.hintergrund;
        s.akteure.slice(0, 25).forEach(function (a, i) { svg += '<g class="sz-akteur" data-i="' + i + '" style="opacity:0">' + a.svg + '</g>'; });
        buehne.innerHTML = svg + '</svg>';
        var gruppen = [].slice.call(buehne.querySelectorAll('.sz-akteur'));
        var t0 = Z.jetzt();
        Z.abbrechen(frameId);
        frameId = Z.frame(function () {
          var t = (Z.jetzt() - t0) / 1000;
          fort.firstChild.style.width = Math.min(100, t / p.dauerSek * 100) + '%';
          gruppen.forEach(function (g, i) {
            var k = s.akteure[i].keys, a = k[0], b = k[k.length - 1];
            for (var j = 0; j < k.length - 1; j++) if (t >= k[j][0] && t <= k[j + 1][0]) { a = k[j]; b = k[j + 1]; break; }
            if (t > k[k.length - 1][0]) a = b = k[k.length - 1];
            var f = b[0] > a[0] ? (t - a[0]) / (b[0] - a[0]) : 1;
            f = Math.max(0, Math.min(1, f));
            // Unsichtbare Dinge erscheinen erst am nächsten Schlüsselbild (kein langsames Einblenden während der Wartezeit)
            var x = a[1] + (b[1] - a[1]) * f, y = a[2] + (b[2] - a[2]) * f, o = a[3] === 0 && b[3] > 0 ? (f >= 1 ? b[3] : 0) : a[3] + (b[3] - a[3]) * f;
            g.setAttribute('transform', 'translate(' + x.toFixed(1) + ' ' + y.toFixed(1) + ')');
            g.style.opacity = o;
          });
          if (t >= p.dauerSek) { Z.abbrechen(frameId); frameId = null; nachSzene(s); }
        });
      }
      function nachSzene(s) {
        if (!laeuft) return;
        fort.style.visibility = 'hidden';
        if (p.verzoegerungSek) ablenkung(p.verzoegerungSek, function () { fragen(s); });
        else fragen(s);
      }
      function ablenkung(sek, weiter) {
        anw.textContent = 'Zwischenaufgabe: Tippen Sie auf jede grüne Kugel.';
        buehne.innerHTML = '<svg viewBox="0 0 800 500" xmlns="http://www.w3.org/2000/svg"><rect width="800" height="500" fill="#f5f8fa"/></svg>';
        var ende = Z.jetzt() + sek * 1000, t = null;
        function kugel() {
          if (!laeuft) return;
          if (Z.jetzt() >= ende) { weiter(); return; }
          var gruen = HT.zufall.chance(0.6), x = HT.zufall.int(60, 740), y = HT.zufall.int(60, 440);
          buehne.firstChild.innerHTML = '<rect width="800" height="500" fill="#f5f8fa"/><circle class="sz-kugel" cx="' + x + '" cy="' + y + '" r="38" fill="' + (gruen ? '#2EAD6B' : '#E25C5C') + '" stroke="#26333c" stroke-width="3"/>';
          var k = buehne.querySelector('.sz-kugel');
          HT.tap(k, function () { ctx.audio.ton(gruen ? 990 : 330, 0.06, 'sine', 0, 0.12); k.remove(); });
          t = Z.nach(1100, kugel);
        }
        aus.push(function () { Z.abbrechen(t); });
        kugel();
      }
      function fragen(s) {
        var typen = p.fragentypen === 'detail' ? ['detail'] : p.fragentypen === 'detail+reihenfolge' ? ['detail', 'reihenfolge'] : ['detail', 'reihenfolge', 'anzahl'];
        var pool = s.fragen.filter(function (f) { return typen.indexOf(f.typ) >= 0; });
        if (typen.indexOf('reihenfolge') >= 0) { for (var r = 0; r < 2; r++) { var rf = HT.data.szenenReihenfolge(s.ereignisse, HT.zufall); if (rf && !pool.some(function (x) { return x.richtig === rf.richtig && x.typ === 'reihenfolge'; })) pool.push(rf); } }
        var liste = HT.zufall.mischen(pool).slice(0, p.fragen), k = 0;
        buehne.innerHTML = '';
        function naechste() {
          if (!laeuft) return;
          if (k >= liste.length) { anw.textContent = 'Fertig – gleich kommt die nächste Szene.'; HT.leeren(wahl); Z.nach(1400, szene); return; }
          var f = liste[k++], t0 = Z.jetzt();
          anw.textContent = f.frage;
          var falsch = HT.zufall.stichprobe(f.falsch.filter(function (x, i, a) { return x !== f.richtig && a.indexOf(x) === i; }), p.antworten - 1);
          var opt = HT.zufall.mischen([f.richtig].concat(falsch));
          HT.leeren(wahl);
          var gesperrt = false;
          var kn = HT.m.wahl(wahl, opt.map(function (o, i) { return { html: '<span class="sz-nr">' + (i + 1) + '</span>' + HT.esc(o), wert: o }; }), function (w, knopf) {
            if (gesperrt) return; gesperrt = true;
            var ok = w === f.richtig;
            knopf.classList.add(ok ? 'richtig' : 'falsch');
            if (!ok) kn.forEach(function (b, i) { if (opt[i] === f.richtig) b.classList.add('richtig'); });
            ctx.onEvent({ korrekt: ok, rtMs: Z.jetzt() - t0, reiz: f.frage, reaktion: w, typ: f.typ });
            ctx.feedback(ok, null, null, { dauer: 380 });
            Z.nach(ok ? 900 : 1700, naechste);
          }, 'sz-antworten');
          var ziff = HT.eingabe.an(function (a, d) { if (a === 'ziffer' && d.wert >= 1 && d.wert <= kn.length && !gesperrt) kn[d.wert - 1].click(); });
          aus.push(ziff);
        }
        naechste();
      }
      return {
        start: function () { Z.nach(500, szene); },
        stop: function () { laeuft = false; Z.abbrechen(frameId); aus.forEach(function (f) { try { f(); } catch (e) { /* egal */ } }); }
      };
    },
    preview: function (el) {
      var bild = function (busX, frage) {
        return '<svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg"><rect width="400" height="190" fill="#cfe8f5"/><rect y="190" width="400" height="110" fill="#9aa5ad"/><circle cx="150" cy="80" r="14" fill="#F2C230" stroke="#26333c" stroke-width="2"/><path d="M150 94 V190" stroke="#26333c" stroke-width="3"/>' +
          '<g transform="translate(60 190) scale(.55)"><path d="M-34 -118 Q0 -152 34 -118 Z" fill="#E25C5C" stroke="#26333c" stroke-width="3"/><path d="M0 -118 V-70" stroke="#26333c" stroke-width="3"/><circle cx="0" cy="-92" r="14" fill="#f0c9a0" stroke="#26333c" stroke-width="3"/><path d="M-18 -76 L18 -76 L22 -20 H-22 Z" fill="#3D7BE0" stroke="#26333c" stroke-width="3"/></g>' +
          '<g transform="translate(' + busX + ' 250) scale(.5)"><rect x="-150" y="-110" width="300" height="100" rx="14" fill="#E8833A" stroke="#26333c" stroke-width="3"/><rect x="-130" y="-95" width="240" height="40" rx="6" fill="#d8eef7"/></g>' +
          (frage ? '<rect x="40" y="215" width="320" height="70" rx="12" fill="#fff" stroke="#d6e0e6"/><text x="200" y="257" text-anchor="middle" font-size="17" font-weight="700" fill="#1E2A33" font-family="-apple-system,sans-serif">Welche Farbe hatte der Schirm?</text>' : '') + '</svg>';
      };
      return HT.beispiel(el, [{ svg: bild(470, false), text: 'Szene beobachten', dauer: 900 }, { svg: bild(300, false), dauer: 900 }, { svg: bild(250, false), dauer: 900 }, { svg: bild(-100, true), text: 'Fragen beantworten', dauer: 1700 }]);
    }
  });
})();

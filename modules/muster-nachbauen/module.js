/* Modul: Muster nachbauen – Vorlage aus farbigen Feldern auf leerem Raster nachbauen.
 * Level: Rastergröße 3×3 bis 8×8, Anzahl Farben, Vorlage nur kurz sichtbar. */
(function () {
  'use strict';
  var HT = window.HT;
  var DEF = [[3, 1, 0], [3, 2, 0], [4, 1, 0], [4, 2, 0], [4, 3, 0], [5, 2, 0], [5, 3, 0], [6, 2, 0], [3, 2, 6], [4, 2, 8], [6, 3, 0], [5, 2, 10], [7, 3, 0], [6, 3, 12], [8, 3, 0], [8, 4, 0]];
  var levels = DEF.map(function (d) { return { raster: d[0], farben: d[1], vorlageSek: d[2], fuellung: 0.35 }; });
  var FARBEN = ['#3D7BE0', '#E25C5C', '#F2B630', '#2EAD6B'];

  HT.registerModule({
    id: 'muster-nachbauen', name: 'Muster nachbauen', kategorie: 'raeumlich', symbol: 'raster',
    ziel: 'Räumlich-konstruktive Fähigkeiten und genaues Übertragen',
    beschreibung: 'Links ist eine Vorlage aus farbigen Feldern zu sehen, rechts ein leeres Raster. Die Vorlage wird Feld für Feld nachgebaut: erst Farbe wählen, dann Felder antippen (nochmal tippen löscht). In höheren Leveln ist die Vorlage nur kurz sichtbar und muss aus dem Gedächtnis nachgebaut werden. Level: Rastergröße (3×3 bis 8×8), Farbanzahl, Vorlagezeit.',
    anleitung: 'Bauen Sie das Muster der Vorlage im rechten Raster nach. Wählen Sie unten eine Farbe und tippen Sie die Felder an. Nochmal tippen löscht ein Feld. Wenn alles stimmt, tippen Sie auf „Fertig“.',
    tasten: [], levels: levels,
    levelLabels: { raster: 'Raster', farben: 'Farben', vorlageSek: 'Vorlage sichtbar (s, 0 = immer)', fuellung: 'Füllgrad' },
    bewertung: { aufstufenAb: 0.8, abstufenUnter: 0.5 },
    create: function (container, ctx) {
      var p = ctx.params, Z = HT.zeit, tf = null, aus = null;
      var zone = HT.m.neu(container, 'm-zentrum');
      var anw = HT.m.neu(zone, 'm-anweisung');
      var reihe = HT.m.neu(zone, '', '', { display: 'flex', alignItems: 'center' });
      var unten = HT.m.neu(zone, '', '', { display: 'flex', alignItems: 'center', marginTop: '1.2rem' });
      var farbe = 0, ziel = [], ist = [], zellen = [], t0 = 0, aktiv = false;
      var g = Math.max(300, Math.min(440, (container.clientWidth - 160) / 2, container.clientHeight - 230));
      function raster(eltern, klickbar) {
        var r = HT.el('div', { class: 'm-raster', style: { gridTemplateColumns: 'repeat(' + p.raster + ', 1fr)', width: g + 'px', height: g + 'px', gap: '4px', gridGap: '4px', padding: '8px', background: 'var(--grund-2)', borderRadius: '16px' } });
        var z = [];
        for (var i = 0; i < p.raster * p.raster; i++) {
          (function (idx) {
            var c = HT.el('div', { class: 'm-zelle', style: { borderRadius: '6px', background: '#fff' } });
            if (klickbar) HT.tap(c, function () { setzen(idx); });
            r.appendChild(c); z.push(c);
          })(i);
        }
        eltern.appendChild(r);
        return z;
      }
      function runde() {
        if (tf) tf.entfernen();
        HT.leeren(reihe); HT.leeren(unten);
        var n = p.raster * p.raster;
        ziel = []; for (var i = 0; i < n; i++) ziel.push(HT.zufall.chance(p.fuellung) ? HT.zufall.int(0, p.farben - 1) : -1);
        if (ziel.every(function (x) { return x < 0; })) ziel[HT.zufall.int(0, n - 1)] = 0;
        ist = ziel.map(function () { return -1; });
        var links = HT.el('div', { class: 'mitte' }); reihe.appendChild(links);
        links.appendChild(HT.el('div', { class: 'feld-label' }, 'Vorlage'));
        var vz = raster(links, false);
        vz.forEach(function (c, i) { if (ziel[i] >= 0) c.style.background = FARBEN[ziel[i]]; });
        reihe.appendChild(HT.el('div', { style: { width: '48px', textAlign: 'center', fontSize: '2rem', color: 'var(--text-3)' } }, '→'));
        var rechts = HT.el('div', { class: 'mitte' }); reihe.appendChild(rechts);
        rechts.appendChild(HT.el('div', { class: 'feld-label' }, 'Ihr Muster'));
        zellen = raster(rechts, true);
        // Farbwahl
        var knoepfe = FARBEN.slice(0, p.farben).map(function (f, i) {
          var b = HT.el('button', { type: 'button', class: 'm-wahl-knopf', style: { minWidth: '70px', minHeight: '64px', margin: '0 6px', background: f, borderColor: i === farbe ? '#26333c' : 'transparent', color: '#fff' }, html: '<b>' + (i + 1) + '</b>' });
          HT.tap(b, function () { farbeWaehlen(i); });
          unten.appendChild(b);
          return b;
        });
        function farbeWaehlen(i) { farbe = i; knoepfe.forEach(function (b, k) { b.style.borderColor = k === i ? '#26333c' : 'transparent'; b.style.transform = k === i ? 'translateY(-4px)' : ''; }); }
        farbeWaehlen(Math.min(farbe, p.farben - 1));
        var fertig = HT.ui.knopf('Fertig', { art: 'primaer gross', icon: 'haken', klick: pruefen });
        fertig.style.marginLeft = '1.4rem';
        unten.appendChild(fertig);
        if (aus) aus();
        aus = HT.eingabe.an(function (a, d) { if (a === 'ziffer' && d.wert >= 1 && d.wert <= p.farben) farbeWaehlen(d.wert - 1); });
        tf = HT.tastenFokus(zellen.concat([fertig]), { spalten: p.raster, ziffern: false, beiWahl: function (i) { if (i === zellen.length) pruefen(); else setzen(i); } });
        anw.innerHTML = p.vorlageSek ? 'Merken Sie sich die Vorlage – sie verschwindet gleich' : 'Bauen Sie die Vorlage nach';
        aktiv = true; t0 = Z.jetzt();
        if (p.vorlageSek) Z.nach(p.vorlageSek * 1000, function () { vz.forEach(function (c) { c.style.background = '#fff'; }); links.firstChild.textContent = 'Vorlage (verdeckt)'; anw.innerHTML = 'Bauen Sie das Muster aus dem Gedächtnis nach'; });
      }
      function setzen(i) {
        if (!aktiv) return;
        ist[i] = ist[i] === farbe ? -1 : farbe;
        zellen[i].style.background = ist[i] >= 0 ? FARBEN[ist[i]] : '#fff';
        ctx.audio.klick();
      }
      function pruefen() {
        if (!aktiv) return;
        aktiv = false;
        var falsch = 0;
        ziel.forEach(function (z, i) { if (z !== ist[i]) { falsch++; zellen[i].style.boxShadow = 'inset 0 0 0 4px #E25C5C'; } });
        var ok = falsch === 0;
        ctx.onEvent({ korrekt: ok, reiz: p.raster + 'x' + p.raster, reaktion: falsch + ' Felder falsch', rtMs: Z.jetzt() - t0 });
        ctx.feedback(ok);
        anw.innerHTML = ok ? 'Perfekt nachgebaut!' : falsch + (falsch === 1 ? ' Feld stimmt' : ' Felder stimmen') + ' noch nicht (rot markiert)';
        Z.nach(ok ? 1300 : 2600, runde);
      }
      return { start: function () { runde(); }, stop: function () { if (tf) tf.entfernen(); if (aus) aus(); } };
    },
    preview: function (el) {
      var muster = [0, -1, 1, -1, 0, -1, 1, -1, 0];
      var b = function (gesetzt) {
        var s = '<svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg">';
        [[40, true], [230, false]].forEach(function (r) {
          s += '<rect x="' + r[0] + '" y="70" width="140" height="140" rx="12" fill="#edf2f5"/>';
          muster.forEach(function (m, i) {
            var f = r[1] ? m : (i < gesetzt.length ? gesetzt[i] : -1);
            s += '<rect x="' + (r[0] + 8 + (i % 3) * 43) + '" y="' + (78 + Math.floor(i / 3) * 43) + '" width="38" height="38" rx="5" fill="' + (f >= 0 ? FARBEN[f] : '#fff') + '"/>';
          });
        });
        return s + '<text x="200" y="150" text-anchor="middle" font-size="30" fill="#8a97a1">→</text></svg>';
      };
      return HT.beispiel(el, [
        { svg: b([]), text: 'Vorlage nachbauen', dauer: 1100 },
        { svg: b([0]), zeiger: [63, 31], klick: true, dauer: 700 },
        { svg: b([0, -1, 1]), zeiger: [85, 31], klick: true, dauer: 700 },
        { svg: b([0, -1, 1, -1, 0]), zeiger: [74, 45], klick: true, dauer: 700 },
        { svg: b(muster), zeiger: [85, 60], klick: true, text: 'Fertig!', dauer: 1500 }
      ]);
    }
  });
})();

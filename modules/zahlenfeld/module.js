/* Modul: Zahlenfeld – Zahlen in aufsteigender Reihenfolge im Raster suchen und antippen (visuelle Suche,
 * Überblick, Tempo). Level: Rastergröße, Verteilung, später abwechselnd Zahlen und Buchstaben. */
(function () {
  'use strict';
  var HT = window.HT;
  var levels = HT.stufen(12, function (t, i) { return { raster: i <= 2 ? 3 : i <= 5 ? 4 : i <= 9 ? 5 : 6, wechsel: i >= 9, farbig: i >= 6, gedreht: i >= 11 }; });
  var BUCHST = 'ABCDEFGHIJKLMNOPQR'.split('');
  HT.registerModule({
    id: 'zahlenfeld', name: 'Zahlenfeld', kategorie: 'aufmerksamkeit', symbol: 'raster',
    ziel: 'Zahlen zügig und geordnet in einem Feld suchen (visuelle Suche und Überblick)',
    beschreibung: 'In einem Raster liegen die Zahlen ungeordnet. Sie sollen der Reihe nach angetippt werden (1, 2, 3 …). Das Raster wächst von 3×3 bis 6×6. Ab Level 7 haben die Felder verschiedene Farben als Ablenkung, ab Level 10 wechseln sich Zahlen und Buchstaben ab (1-A-2-B …), was zusätzlich die geistige Flexibilität fordert. Ausgewertet werden Suchzeit je Zahl, Fehlklicks und die Verteilung der Suchzeiten auf die linke und rechte Seite.',
    anleitung: 'Tippen Sie die Zahlen der Reihe nach an: 1, 2, 3 und so weiter. Wenn angezeigt, abwechselnd Zahl und Buchstabe: 1, A, 2, B …',
    tasten: [], levels: levels,
    levelLabels: { raster: 'Rastergröße', wechsel: 'Zahl-Buchstabe-Wechsel', farbig: 'Farbige Felder', gedreht: 'Gedrehte Zeichen' },
    create: function (container, ctx) {
      var p = ctx.params, Z = HT.zeit, zone = HT.m.neu(container, 'm-zentrum');
      var FARBEN = ['#e3f6f8', '#fdeee2', '#efe9fb', '#e2f5ea', '#fff7e2'];
      function runde() {
        HT.leeren(zone);
        var n = p.raster * p.raster, folge = [];
        if (p.wechsel) { for (var k = 0; folge.length < n; k++) { folge.push(String(k + 1)); if (folge.length < n) folge.push(BUCHST[k]); } }
        else for (var j = 1; j <= n; j++) folge.push(String(j));
        var anz = HT.m.neu(zone, 'm-anweisung', 'Suchen Sie: <b>' + folge[0] + '</b>');
        var eh = ctx.buehne ? ctx.buehne.einheit : Math.min(container.clientWidth, container.clientHeight) / 100;
        var gr = Math.max(48, Math.min(Math.round(18 * eh), Math.floor(Math.min(container.clientWidth - 40, container.clientHeight - 130) / p.raster) - 8));
        var feld = HT.el('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(' + p.raster + ', ' + gr + 'px)', gap: '8px' } });
        var idx = 0, t = Z.jetzt();
        HT.zufall.mischen(folge).forEach(function (z, pos) {
          var k = HT.el('button', { type: 'button', class: 'm-wahl-knopf', style: { width: gr + 'px', height: gr + 'px', minWidth: '0', minHeight: '0', boxSizing: 'border-box', fontSize: Math.round(gr * 0.42) + 'px', padding: 0, margin: 0, background: p.farbig ? HT.zufall.wahl(FARBEN) : '' } }, '');
          k.innerHTML = '<span style="display:inline-block;transform:rotate(' + (p.gedreht ? HT.zufall.int(-35, 35) : 0) + 'deg)">' + z + '</span>';
          var spalte = pos % p.raster;
          HT.tap(k, function () {
            if (k.disabled) return;
            var rt = Z.jetzt() - t;
            if (z === folge[idx]) {
              k.disabled = true; k.classList.add('richtig'); k.style.opacity = '.55';
              ctx.onEvent({ korrekt: true, reiz: z, reaktion: z, rtMs: rt, seite: spalte < p.raster / 2 - 0.25 ? 'links' : spalte > p.raster / 2 - 0.75 ? 'rechts' : 'mitte' });
              idx++; t = Z.jetzt();
              if (idx >= folge.length) { anz.innerHTML = 'Geschafft!'; ctx.feedback(true); Z.nach(1200, runde); }
              else anz.innerHTML = 'Suchen Sie: <b>' + folge[idx] + '</b>';
            } else { ctx.onEvent({ korrekt: false, reiz: folge[idx], reaktion: z, typ: 'fehlklick' }); k.classList.add('falsch'); setTimeout(function () { k.classList.remove('falsch'); }, 350); ctx.audio.falsch(); }
          });
          feld.appendChild(k);
        });
        zone.appendChild(feld);
      }
      return { start: function () { Z.nach(300, runde); }, stop: function () {} };
    },
    preview: function (el) {
      var z = [7, 2, 9, 4, 1, 6, 3, 8, 5];
      var b = function (bis) { var s = '<svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg"><text x="200" y="34" text-anchor="middle" font-size="18" font-weight="700" font-family="-apple-system,sans-serif">Suchen Sie: ' + (bis + 1) + '</text>'; z.forEach(function (v, i) { var x = 125 + (i % 3) * 52, y = 55 + Math.floor(i / 3) * 52, d = v <= bis; s += '<rect x="' + x + '" y="' + y + '" width="46" height="46" rx="10" fill="' + (d ? '#e2f5ea' : '#fff') + '" stroke="' + (d ? '#2EAD6B' : '#e1e8ed') + '" stroke-width="2"/><text x="' + (x + 23) + '" y="' + (y + 31) + '" text-anchor="middle" font-size="22" font-weight="700" font-family="-apple-system,sans-serif" opacity="' + (d ? .5 : 1) + '">' + v + '</text>'; }); return s + '</svg>'; };
      return HT.beispiel(el, [{ svg: b(0), text: 'Zahlen der Reihe nach antippen', dauer: 1400 }, { svg: b(1), zeiger: [44, 32], klick: true, text: '1', dauer: 900 }, { svg: b(2), zeiger: [57, 25], klick: true, text: '2', dauer: 900 }, { svg: b(3), zeiger: [44, 66], klick: true, text: '3 …', dauer: 1200 }]);
    }
  });
})();

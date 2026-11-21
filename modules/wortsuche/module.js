/* Modul: Buchstaben- und Wortsuche – Gitter mit versteckten Wörtern. Wort markieren: ersten und letzten Buchstaben antippen.
 * Level: Gittergröße, Anzahl Wörter, Richtungen (waagerecht, senkrecht, diagonal, rückwärts). */
(function () {
  'use strict';
  var HT = window.HT;
  var DEF = [[6, 3, 'h'], [7, 3, 'hv'], [7, 4, 'hv'], [8, 4, 'hv'], [8, 5, 'hv'], [9, 5, 'hvd'], [9, 6, 'hvd'], [10, 6, 'hvd'], [10, 7, 'hvd'], [11, 7, 'hvdr'], [11, 8, 'hvdr'], [12, 8, 'hvdr']];
  var levels = DEF.map(function (d) { return { groesse: d[0], woerter: d[1], richtungen: d[2] }; });
  var NUR = /^[A-Za-z]{3,}$/;

  function bauen(n, anzahl, richt) {
    var dirs = [[1, 0]];
    if (richt.indexOf('v') >= 0) dirs.push([0, 1]);
    if (richt.indexOf('d') >= 0) dirs.push([1, 1]);
    if (richt.indexOf('r') >= 0) dirs = dirs.concat([[-1, 0], [0, -1], [-1, -1]]);
    for (var versuch = 0; versuch < 40; versuch++) {
      var g = []; for (var y = 0; y < n; y++) { g.push([]); for (var x = 0; x < n; x++) g[y].push(''); }
      var pool = HT.zufall.mischen(HT.data.woerter.map(function (w) { return w.wort; }).filter(function (w) { return NUR.test(w) && w.length <= n; }));
      var gesetzt = [];
      for (var i = 0; i < pool.length && gesetzt.length < anzahl; i++) {
        var w = pool[i].toUpperCase();
        if (gesetzt.some(function (s) { return s.wort === w; })) continue;
        for (var t = 0; t < 60; t++) {
          var d = HT.zufall.wahl(dirs), sx = HT.zufall.int(0, n - 1), sy = HT.zufall.int(0, n - 1);
          var ex = sx + d[0] * (w.length - 1), ey = sy + d[1] * (w.length - 1);
          if (ex < 0 || ey < 0 || ex >= n || ey >= n) continue;
          var ok = true;
          for (var k = 0; k < w.length; k++) { var c = g[sy + d[1] * k][sx + d[0] * k]; if (c && c !== w[k]) { ok = false; break; } }
          if (!ok) continue;
          for (k = 0; k < w.length; k++) g[sy + d[1] * k][sx + d[0] * k] = w[k];
          gesetzt.push({ wort: w, sx: sx, sy: sy, ex: ex, ey: ey, d: d, gefunden: false });
          break;
        }
      }
      if (gesetzt.length === anzahl) {
        var abc = 'ABCDEFGHIKLMNOPRSTUW';
        for (y = 0; y < n; y++) for (x = 0; x < n; x++) if (!g[y][x]) g[y][x] = abc[HT.zufall.int(0, abc.length - 1)];
        return { gitter: g, woerter: gesetzt };
      }
    }
    return null;
  }

  HT.registerModule({
    id: 'wortsuche', name: 'Buchstaben- und Wortsuche', kategorie: 'sprache', symbol: 'suche',
    ziel: 'Wörter in einem Buchstabengitter finden – Lesen, visuelle Suche und Ausdauer',
    beschreibung: 'Im Buchstabengitter sind die rechts aufgelisteten Wörter versteckt. Ein Wort wird markiert, indem man seinen ersten und letzten Buchstaben antippt. Level: Gittergröße (6×6 bis 12×12), Anzahl der Wörter und Richtungen – erst nur waagerecht, dann senkrecht, diagonal und schließlich auch rückwärts.',
    anleitung: 'Finden Sie die Wörter aus der Liste im Gitter. Tippen Sie den ersten und dann den letzten Buchstaben eines Wortes an. Gefundene Wörter werden markiert.',
    tasten: [], levels: levels,
    levelLabels: { groesse: 'Gittergröße', woerter: 'Wörter', richtungen: 'Richtungen (h/v/d/r)' },
    bewertung: { aufstufenAb: 0.8, abstufenUnter: 0.5 },
    create: function (container, ctx) {
      var p = ctx.params, Z = HT.zeit, tf = null;
      var zone = HT.m.neu(container, 'm-zentrum');
      var anw = HT.m.neu(zone, 'm-anweisung', 'Finden Sie die Wörter: <b>ersten und letzten Buchstaben</b> antippen');
      var reihe = HT.m.neu(zone, '', '', { display: 'flex', alignItems: 'flex-start' });
      var R = null, zellen = [], erster = null, t0 = 0, aktiv = false, fehler = 0;
      var groesse = Math.min(container.clientHeight - 140, container.clientWidth - 360, 620);
      function runde() {
        if (tf) tf.entfernen();
        R = bauen(p.groesse, p.woerter, p.richtungen);
        HT.leeren(reihe); erster = null; t0 = Z.jetzt(); aktiv = true; fehler = 0;
        var gr = HT.el('div', { class: 'm-raster', style: { gridTemplateColumns: 'repeat(' + p.groesse + ', 1fr)', width: groesse + 'px', height: groesse + 'px', gap: '3px', gridGap: '3px', background: 'var(--karte)', padding: '10px', borderRadius: '18px', boxShadow: 'var(--schatten-1)', border: '1px solid var(--linie)' } });
        zellen = [];
        R.gitter.forEach(function (zeile, y) {
          zeile.forEach(function (c, x) {
            var z = HT.el('div', { class: 'm-zelle', style: { background: 'transparent', fontWeight: '800', fontSize: Math.max(14, groesse / p.groesse * 0.46) + 'px', borderRadius: '8px' } }, c);
            HT.tap(z, function () { tippen(x, y); });
            gr.appendChild(z); zellen.push(z);
          });
        });
        reihe.appendChild(gr);
        var liste = HT.el('div', { class: 'm-karte-text', style: { marginLeft: '24px', minWidth: '220px', fontSize: '1.15rem', padding: '1rem 1.4rem' } });
        liste.innerHTML = '<div class="feld-label">Gesuchte Wörter</div>' + R.woerter.map(function (w, i) { return '<div data-w="' + i + '" style="padding:.25rem 0;font-weight:700">' + w.wort.charAt(0) + w.wort.slice(1).toLowerCase() + '</div>'; }).join('');
        var fertig = HT.ui.knopf('Aufgeben / Neues Gitter', { klick: abschliessen });
        fertig.style.marginTop = '1rem';
        liste.appendChild(fertig);
        reihe.appendChild(liste);
        tf = HT.tastenFokus(zellen, { spalten: p.groesse, ziffern: false, beiWahl: function (i) { tippen(i % p.groesse, Math.floor(i / p.groesse)); } });
      }
      function zelle(x, y) { return zellen[y * p.groesse + x]; }
      function tippen(x, y) {
        if (!aktiv) return;
        if (!erster) { erster = [x, y]; zelle(x, y).classList.add('gewaehlt'); ctx.audio.klick(); return; }
        var a = erster; erster = null;
        zelle(a[0], a[1]).classList.remove('gewaehlt');
        if (a[0] === x && a[1] === y) return;
        var treffer = R.woerter.filter(function (w) { return !w.gefunden && ((w.sx === a[0] && w.sy === a[1] && w.ex === x && w.ey === y) || (w.ex === a[0] && w.ey === a[1] && w.sx === x && w.sy === y)); })[0];
        if (treffer) {
          treffer.gefunden = true;
          for (var k = 0; k < treffer.wort.length; k++) { var z = zelle(treffer.sx + treffer.d[0] * k, treffer.sy + treffer.d[1] * k); z.style.background = 'var(--erfolg-hell)'; z.style.color = '#1f7a4b'; }
          var li = reihe.querySelector('[data-w="' + R.woerter.indexOf(treffer) + '"]');
          if (li) { li.style.textDecoration = 'line-through'; li.style.color = 'var(--text-3)'; }
          ctx.onEvent({ korrekt: true, reiz: treffer.wort, reaktion: 'gefunden', rtMs: Z.jetzt() - t0, seite: HT.seiteVon((treffer.sx + 0.5) / p.groesse) });
          t0 = Z.jetzt();
          ctx.audio.richtig();
          if (R.woerter.every(function (w) { return w.gefunden; })) { anw.innerHTML = 'Alle Wörter gefunden!'; aktiv = false; ctx.feedback(true, null, null, { stumm: true }); Z.nach(1800, function () { anw.innerHTML = 'Finden Sie die Wörter: <b>ersten und letzten Buchstaben</b> antippen'; runde(); }); }
        } else {
          ctx.onEvent({ korrekt: false, reiz: 'markierung', reaktion: R.gitter[a[1]][a[0]] + '…' + R.gitter[y][x] });
          ctx.audio.falsch();
          [zelle(a[0], a[1]), zelle(x, y)].forEach(function (z) { z.classList.add('falsch'); setTimeout(function () { z.classList.remove('falsch'); }, 500); });
        }
      }
      function abschliessen() {
        if (!aktiv) return;
        aktiv = false;
        R.woerter.forEach(function (w) {
          if (w.gefunden) return;
          for (var k = 0; k < w.wort.length; k++) zelle(w.sx + w.d[0] * k, w.sy + w.d[1] * k).style.boxShadow = 'inset 0 0 0 3px #E0A21B';
          ctx.onEvent({ korrekt: false, auslassung: true, reiz: w.wort, reaktion: 'nicht gefunden', seite: HT.seiteVon((w.sx + 0.5) / p.groesse) });
        });
        Z.nach(2600, runde);
      }
      return { start: function () { runde(); }, stop: function () { if (tf) tf.entfernen(); } };
    },
    preview: function (el) {
      var g = ['KATZEB', 'ROLAMH', 'BAUMFE', 'TLEHUT', 'SONNEX', 'MIRAPF'];
      var b = function (mark, erster) {
        var s = '<svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg">';
        g.forEach(function (z, y) { z.split('').forEach(function (c, x) {
          var hl = (mark && y === 2 && x < 4) || (erster && y === 2 && x === 0);
          s += '<rect x="' + (90 + x * 38) + '" y="' + (25 + y * 42) + '" width="34" height="38" rx="7" fill="' + (hl ? '#e2f5ea' : '#f5f8fa') + '"/><text x="' + (107 + x * 38) + '" y="' + (51 + y * 42) + '" text-anchor="middle" font-size="20" font-weight="800" font-family="-apple-system,sans-serif" fill="#1E2A33">' + c + '</text>';
        }); });
        return s + '</svg>';
      };
      return HT.beispiel(el, [{ svg: b(false), text: 'Gesucht: BAUM', dauer: 1300 }, { svg: b(false, true), zeiger: [27, 37], klick: true, text: 'Ersten Buchstaben …', dauer: 1100 }, { svg: b(true), zeiger: [64, 37], klick: true, text: '… und letzten antippen', dauer: 1700 }]);
    }
  });
})();

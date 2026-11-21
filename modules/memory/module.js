/* Modul: Memory (Paare) – Karten verdeckt, Paare finden.
 * Level: 4–30 Karten, Motivähnlichkeit, Vorschauzeit. Fehler zählen nur, wenn eine Karte schon einmal aufgedeckt war (echter Gedächtnisfehler). */
(function () {
  'use strict';
  var HT = window.HT;
  var DEF = [[2, 4, 0, 3000], [3, 6, 0, 2500], [4, 8, 0, 2000], [5, 10, 0, 0], [6, 12, 0, 0], [6, 12, 1, 0], [7, 14, 1, 0], [8, 16, 1, 0], [9, 18, 1, 0], [10, 20, 1, 0], [10, 20, 2, 0], [12, 24, 2, 0], [14, 28, 2, 0], [15, 30, 2, 0]];
  var levels = DEF.map(function (d) { return { paare: d[0], karten: d[1], aehnlichkeit: d[2], vorschauMs: d[3] }; });

  HT.registerModule({
    id: 'memory', name: 'Memory (Paare)', kategorie: 'gedaechtnis', symbol: 'raster',
    ziel: 'Visuell-räumliches Gedächtnis und Konzentration trainieren',
    beschreibung: 'Klassisches Paare-Suchen mit eigenen Bildmotiven. Es werden jeweils zwei Karten aufgedeckt; gleiche Karten bleiben liegen. In niedrigen Leveln werden alle Karten kurz offen gezeigt. Mit steigendem Level wächst die Kartenzahl (4 bis 30) und die Motive werden ähnlicher (gleiche Kategorie). Als Fehler zählt nur ein Fehlversuch mit bereits bekannter Karte.',
    anleitung: 'Decken Sie immer zwei Karten auf. Zeigen beide das gleiche Bild, bleiben sie offen liegen. Merken Sie sich, wo welche Bilder liegen, und finden Sie alle Paare.',
    tasten: [],
    levels: levels,
    levelLabels: { paare: 'Paare', karten: 'Karten', aehnlichkeit: 'Motivähnlichkeit (0–2)', vorschauMs: 'Vorschau (ms)' },
    bewertung: { aufstufenAb: 0.7, abstufenUnter: 0.4 },
    create: function (container, ctx) {
      var p = ctx.params, Z = HT.zeit, tf = null;
      var zone = HT.m.neu(container, 'm-zentrum');
      var info = HT.m.neu(container, 'm-info');
      var karten = [], offen = [], gesperrt = false, gefunden = 0, zuege = 0, t0 = 0;
      function motive() {
        if (p.aehnlichkeit === 0) return HT.zufall.stichprobe(HT.data.bilder, p.paare);
        var kats = HT.zufall.mischen(HT.data.bildKategorien.map(function (k) { return k.id; }));
        var n = p.aehnlichkeit === 1 ? 3 : 2, aus = [];
        kats.slice(0, n).forEach(function (k) { aus = aus.concat(HT.bilderVon(k)); });
        aus = HT.zufall.mischen(aus);
        if (aus.length < p.paare) aus = aus.concat(HT.zufall.stichprobe(HT.data.bilder.filter(function (b) { return aus.indexOf(b) < 0; }), p.paare - aus.length));
        return aus.slice(0, p.paare);
      }
      function brett() {
        if (tf) tf.entfernen();
        HT.leeren(zone);
        var m = motive();
        var liste = HT.zufall.mischen(m.concat(m));
        var sp = p.karten, best = 1e9;
        for (var d = 2; d <= p.karten; d++) { if (p.karten % d) continue; var sc = Math.abs(d / (p.karten / d) - 1.7); if (sc < best) { best = sc; sp = d; } }
        var zeilen = Math.ceil(p.karten / sp);
        var g = Math.max(60, Math.min(150, Math.min((container.clientWidth - 80) / sp, (container.clientHeight - 80) / zeilen) - 12));
        var raster = HT.m.neu(zone, 'm-raster', '', { gridTemplateColumns: 'repeat(' + sp + ', ' + g + 'px)', gridAutoRows: g + 'px', gap: '12px', gridGap: '12px' });
        karten = liste.map(function (b, i) {
          var el = HT.el('div', { class: 'memory-karte' }, [HT.el('div', { class: 'mk-innen' }, [HT.el('div', { class: 'mk-rueck' }), HT.el('div', { class: 'mk-vorne', html: HT.bild(b) })])]);
          HT.tap(el, function () { aufdecken(i); });
          raster.appendChild(el);
          return { el: el, b: b, offen: false, fertig: false, gesehen: false };
        });
        tf = HT.tastenFokus(karten.map(function (k) { return k.el; }), { spalten: sp, ziffern: false, beiWahl: function (i) { aufdecken(i); } });
        offen = []; gefunden = 0; zuege = 0;
        info.textContent = 'Paare: 0 / ' + p.paare;
        if (p.vorschauMs) {
          gesperrt = true;
          karten.forEach(function (k) { k.el.classList.add('offen'); });
          Z.nach(p.vorschauMs, function () { karten.forEach(function (k) { k.el.classList.remove('offen'); }); gesperrt = false; });
        }
      }
      function aufdecken(i) {
        var k = karten[i];
        if (gesperrt || k.offen || k.fertig) return;
        k.offen = true; k.el.classList.add('offen');
        ctx.audio.klick();
        offen.push(k);
        if (offen.length === 1) { t0 = Z.jetzt(); return; }
        gesperrt = true; zuege++;
        var a = offen[0], b = offen[1];
        if (a.b.id === b.b.id) {
          Z.nach(350, function () {
            a.fertig = b.fertig = true; a.el.classList.add('fertig'); b.el.classList.add('fertig');
            gefunden++;
            info.textContent = 'Paare: ' + gefunden + ' / ' + p.paare;
            ctx.onEvent({ korrekt: true, reiz: a.b.id, reaktion: 'paar', rtMs: Z.jetzt() - t0, seite: seite(a) });
            ctx.audio.richtig();
            offen = []; gesperrt = false;
            if (gefunden === p.paare) { ctx.feedback(true); Z.nach(1400, brett); }
          });
        } else {
          var gedaechtnisFehler = a.gesehen || b.gesehen;
          ctx.onEvent({ korrekt: false, reiz: a.b.id + '/' + b.b.id, reaktion: 'kein paar', zaehlt: !!gedaechtnisFehler, typ: gedaechtnisFehler ? 'gedaechtnisfehler' : 'suchzug', seite: seite(b) });
          a.gesehen = b.gesehen = true;
          Z.nach(1000, function () {
            a.offen = b.offen = false; a.el.classList.remove('offen'); b.el.classList.remove('offen');
            offen = []; gesperrt = false;
          });
        }
      }
      function seite(k) { var i = karten.indexOf(k), sp = parseInt(k.el.parentNode.style.gridTemplateColumns.replace('repeat(', ''), 10) || 4; return HT.seiteVon(((i % sp) + 0.5) / sp); }
      return { start: function () { brett(); }, stop: function () { if (tf) tf.entfernen(); } };
    },
    preview: function (el) {
      var b = function (offen, fertig) {
        var ids = ['apfel', 'auto', 'katze', 'apfel', 'katze', 'auto'];
        var s = '<svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg">';
        ids.forEach(function (id, i) {
          var x = 55 + (i % 3) * 105, y = 40 + Math.floor(i / 3) * 115;
          var auf = offen.indexOf(i) >= 0 || fertig.indexOf(i) >= 0;
          s += '<rect x="' + x + '" y="' + y + '" width="90" height="100" rx="14" fill="' + (auf ? '#fff' : '#1BA8B5') + '" stroke="' + (fertig.indexOf(i) >= 0 ? '#2EAD6B' : '#d0dbe2') + '" stroke-width="3"/>';
          if (auf) s += HT.bildGruppe(id, x + 45, y + 50, 70);
          else s += '<circle cx="' + (x + 45) + '" cy="' + (y + 50) + '" r="16" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="4"/>';
        });
        return s + '</svg>';
      };
      return HT.beispiel(el, [
        { svg: b([], []), text: 'Zwei Karten aufdecken', dauer: 900 },
        { svg: b([0], []), zeiger: [25, 30], klick: true, dauer: 900 },
        { svg: b([0, 4], []), zeiger: [52, 68], klick: true, text: 'Kein Paar – merken!', dauer: 1300 },
        { svg: b([], []), dauer: 600 },
        { svg: b([3], []), zeiger: [25, 68], klick: true, dauer: 900 },
        { svg: b([], [0, 3]), zeiger: [25, 30], klick: true, text: 'Paar gefunden!', dauer: 1500 }
      ]);
    }
  });
})();

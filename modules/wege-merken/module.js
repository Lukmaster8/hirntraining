/* Modul: Wege merken (topografisches Gedächtnis) – ein Weg auf einem Stadtplan-Raster wird gezeigt, danach nachklicken.
 * Level: Weglänge, Plangröße, Anzahl Abbiegungen. Bedienung auch mit Pfeiltasten. */
(function () {
  'use strict';
  var HT = window.HT;
  var DEF = [[4, 3, 1], [4, 4, 1], [4, 4, 2], [5, 5, 2], [5, 6, 2], [5, 6, 3], [6, 7, 3], [6, 8, 3], [6, 8, 4], [7, 9, 4], [7, 10, 5], [7, 11, 5], [8, 12, 6], [8, 13, 6]];
  var levels = DEF.map(function (d) { return { plan: d[0], laenge: d[1], abbiegungen: d[2], tempoMs: 700 }; });
  var R = { links: [-1, 0], rechts: [1, 0], hoch: [0, -1], runter: [0, 1] };

  HT.registerModule({
    id: 'wege-merken', name: 'Wege merken', kategorie: 'gedaechtnis', symbol: 'ziel',
    ziel: 'Topografisches Gedächtnis und räumliche Orientierung im Stadtplan',
    beschreibung: 'Auf einem schematischen Stadtplan läuft eine Figur einen Weg vom Haus zur Fahne ab. Anschließend wird der Weg Kreuzung für Kreuzung nachgegangen – durch Antippen der nächsten Kreuzung oder mit den Pfeiltasten. Level: Weglänge, Größe des Plans und Anzahl der Abbiegungen.',
    anleitung: 'Beobachten Sie genau, welchen Weg der Punkt vom Haus zur Fahne nimmt. Gehen Sie danach denselben Weg: Tippen Sie nacheinander auf die Kreuzungen oder nutzen Sie die Pfeiltasten.',
    tasten: ['links', 'rechts', 'hoch', 'runter'],
    levels: levels,
    levelLabels: { plan: 'Plangröße', laenge: 'Weglänge (Abschnitte)', abbiegungen: 'Abbiegungen (min.)', tempoMs: 'Tempo (ms)' },
    bewertung: { aufstufenAb: 0.8, abstufenUnter: 0.5 },
    create: function (container, ctx) {
      var p = ctx.params, Z = HT.zeit, aus = null;
      var zone = HT.m.neu(container, 'm-zentrum');
      var anw = HT.m.neu(zone, 'm-anweisung');
      var groesse = Math.min(container.clientHeight - 130, container.clientWidth - 80, 620);
      var buehne = HT.m.neu(zone, '', '', { width: groesse + 'px', height: groesse + 'px', position: 'relative' });
      var n = p.plan, schritt = groesse / (n + 0.5), rand = schritt * 0.75;
      var weg = [], pos = 0, phase = 'zeigen', t0 = 0;
      function px(k) { return rand + k * schritt; }
      function wegErzeugen() {
        for (var versuch = 0; versuch < 300; versuch++) {
          var x = HT.zufall.int(0, n - 1), y = HT.zufall.int(0, n - 1), w = [[x, y]], dir = null, abb = 0;
          var ok = true;
          for (var i = 0; i < p.laenge; i++) {
            var moegl = Object.keys(R).filter(function (r) {
              var nx = x + R[r][0], ny = y + R[r][1];
              return nx >= 0 && ny >= 0 && nx < n && ny < n && !w.some(function (q) { return q[0] === nx && q[1] === ny; });
            });
            if (!moegl.length) { ok = false; break; }
            var r = dir && moegl.indexOf(dir) >= 0 && HT.zufall.chance(0.5) ? dir : HT.zufall.wahl(moegl);
            if (dir && r !== dir) abb++;
            dir = r; x += R[r][0]; y += R[r][1]; w.push([x, y]);
          }
          if (ok && abb >= p.abbiegungen) return w;
        }
        return w;
      }
      function zeichnen(hervor) {
        var s = '<svg viewBox="0 0 ' + groesse + ' ' + groesse + '" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" rx="18" fill="#dfeee0"/>';
        // Häuserblöcke
        for (var bx = 0; bx < n - 1; bx++) for (var by = 0; by < n - 1; by++) {
          var x0 = px(bx) + 10, y0 = px(by) + 10, w = schritt - 20;
          s += '<rect x="' + x0 + '" y="' + y0 + '" width="' + w + '" height="' + w + '" rx="8" fill="' + ['#f3e3c4', '#e9d5f1', '#d6e6f5', '#f6d6cf'][(bx * 3 + by) % 4] + '" stroke="#c9b99a" stroke-width="1.5"/>';
          if ((bx + by) % 3 === 0) s += '<circle cx="' + (x0 + w * 0.3) + '" cy="' + (y0 + w * 0.7) + '" r="' + w * 0.12 + '" fill="#7cc27c"/>';
        }
        // Straßen
        for (var i = 0; i < n; i++) {
          s += '<line x1="' + px(0) + '" y1="' + px(i) + '" x2="' + px(n - 1) + '" y2="' + px(i) + '" stroke="#ffffff" stroke-width="' + schritt * 0.22 + '" stroke-linecap="round"/>';
          s += '<line x1="' + px(i) + '" y1="' + px(0) + '" x2="' + px(i) + '" y2="' + px(n - 1) + '" stroke="#ffffff" stroke-width="' + schritt * 0.22 + '" stroke-linecap="round"/>';
        }
        // Gelaufener Weg
        if (hervor && hervor.length > 1) s += '<polyline points="' + hervor.map(function (q) { return px(q[0]) + ',' + px(q[1]); }).join(' ') + '" fill="none" stroke="#1BA8B5" stroke-width="' + schritt * 0.12 + '" stroke-linecap="round" stroke-linejoin="round" opacity=".85"/>';
        // Kreuzungen
        for (var kx = 0; kx < n; kx++) for (var ky = 0; ky < n; ky++) s += '<circle data-k="' + kx + ',' + ky + '" cx="' + px(kx) + '" cy="' + px(ky) + '" r="' + schritt * 0.15 + '" fill="#cfd9e0" stroke="#fff" stroke-width="3" style="cursor:pointer"/>';
        // Start & Ziel
        var a = weg[0], z = weg[weg.length - 1], g = schritt * 0.42;
        s += HT.bildGruppe({ svg: '<path d="M14 50 L50 18 L86 50 V88 H14 Z" fill="#E25C5C"/><rect x="40" y="58" width="20" height="30" fill="#fff"/>' }, px(a[0]), px(a[1]) - g * 0.15, g);
        s += '<g transform="translate(' + (px(z[0]) - 4) + ' ' + (px(z[1]) - g) + ')"><line x1="4" y1="0" x2="4" y2="' + g + '" stroke="#26333c" stroke-width="4"/><path d="M4 2 L' + g * 0.8 + ' ' + g * 0.2 + ' L4 ' + g * 0.42 + 'Z" fill="#2EAD6B" stroke="#26333c" stroke-width="2"/></g>';
        return s;
      }
      function figur(q) { return '<circle cx="' + px(q[0]) + '" cy="' + px(q[1]) + '" r="' + schritt * 0.16 + '" fill="#1BA8B5" stroke="#fff" stroke-width="4"/>'; }
      function runde() {
        weg = wegErzeugen(); phase = 'zeigen'; pos = 0;
        anw.innerHTML = 'Merken Sie sich den Weg';
        var k = 0;
        (function lauf() {
          buehne.innerHTML = zeichnen(weg.slice(0, k + 1)) + figur(weg[k]) + '</svg>';
          if (k >= weg.length - 1) { Z.nach(900, eingabe); return; }
          k++;
          Z.nach(p.tempoMs, lauf);
        })();
      }
      function eingabe() {
        phase = 'eingabe'; pos = 0; t0 = Z.jetzt();
        anw.innerHTML = 'Gehen Sie den Weg nach – Kreuzung für Kreuzung';
        bild();
      }
      function bild(fehlerAuf) {
        buehne.innerHTML = zeichnen(weg.slice(0, pos + 1)) + figur(weg[pos]) + (fehlerAuf ? '<circle cx="' + px(fehlerAuf[0]) + '" cy="' + px(fehlerAuf[1]) + '" r="' + schritt * 0.18 + '" fill="#E25C5C"/>' : '') + '</svg>';
        HT.$$('circle[data-k]', buehne).forEach(function (c) {
          HT.tap(c, function () { var k = c.getAttribute('data-k').split(',').map(Number); gehe(k); });
        });
      }
      function gehe(k) {
        if (phase !== 'eingabe') return;
        var akt = weg[pos], soll = weg[pos + 1];
        if (Math.abs(k[0] - akt[0]) + Math.abs(k[1] - akt[1]) !== 1) return; // nur Nachbarkreuzungen
        if (k[0] === soll[0] && k[1] === soll[1]) {
          pos++; ctx.audio.klick(); bild();
          if (pos === weg.length - 1) {
            phase = 'ende';
            ctx.onEvent({ korrekt: true, reiz: weg.length - 1 + ' Abschnitte', reaktion: 'richtig', rtMs: (Z.jetzt() - t0) / (weg.length - 1), seite: HT.seiteVon((weg[0][0] + 0.5) / n) });
            ctx.feedback(true); Z.nach(1300, runde);
          }
        } else {
          phase = 'ende';
          bild(k);
          ctx.onEvent({ korrekt: false, reiz: weg.length - 1 + ' Abschnitte', reaktion: 'falsch bei ' + (pos + 1), seite: HT.seiteVon((weg[0][0] + 0.5) / n) });
          ctx.feedback(false);
          Z.nach(900, function () { buehne.innerHTML = zeichnen(weg) + figur(weg[weg.length - 1]) + '</svg>'; anw.innerHTML = 'So wäre der Weg richtig gewesen'; });
          Z.nach(2600, runde);
        }
      }
      return {
        start: function () {
          aus = HT.eingabe.an(function (a) { if (R[a] && phase === 'eingabe') { var q = weg[pos]; gehe([q[0] + R[a][0], q[1] + R[a][1]]); } });
          Z.nach(400, runde);
        },
        stop: function () { if (aus) aus(); }
      };
    },
    preview: function (el) {
      var plan = function (w, fig) {
        var s = '<svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg"><rect x="80" y="20" width="240" height="260" rx="16" fill="#dfeee0"/>';
        for (var i = 0; i < 4; i++) { s += '<line x1="110" y1="' + (50 + i * 66) + '" x2="290" y2="' + (50 + i * 66) + '" stroke="#fff" stroke-width="14" stroke-linecap="round"/><line x1="' + (110 + i * 60) + '" y1="50" x2="' + (110 + i * 60) + '" y2="248" stroke="#fff" stroke-width="14" stroke-linecap="round"/>'; }
        var pt = function (q) { return (110 + q[0] * 60) + ',' + (50 + q[1] * 66); };
        if (w.length > 1) s += '<polyline points="' + w.map(pt).join(' ') + '" fill="none" stroke="#1BA8B5" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>';
        var f = w[w.length - 1];
        s += '<circle cx="' + (110 + f[0] * 60) + '" cy="' + (50 + f[1] * 66) + '" r="11" fill="#1BA8B5" stroke="#fff" stroke-width="3"/>';
        return s + '</svg>';
      };
      var W = [[0, 3], [1, 3], [1, 2], [1, 1], [2, 1], [3, 1]];
      var f = [];
      W.forEach(function (q, i) { f.push({ svg: plan(W.slice(0, i + 1)), dauer: 500, text: i === 0 ? 'Weg beobachten' : '' }); });
      f.push({ svg: plan([W[0]]), text: 'Nachgehen', dauer: 900 });
      f.push({ svg: plan(W.slice(0, 2)), zeiger: [42.5, 82], klick: true, dauer: 800 });
      f.push({ svg: plan(W.slice(0, 3)), zeiger: [42.5, 60], klick: true, dauer: 1200 });
      return HT.beispiel(el, f);
    }
  });
})();

/* Modul: Räume erkunden – räumliche Orientierung, Wege planen und merken in einer einfachen Ich-Perspektive.
 * Ein Gebäude als Flur-Raster (zufälliger Baum mit einzelnen Schleifen). Ansicht: Flur mit Öffnungen links/rechts/vorn
 * als SVG-Polygone in drei Tiefenebenen (kein WebGL). Türen tragen Schilder mit Symbolen. Kleine Karte unten rechts.
 * Steuerung: Pfeil hoch = vorwärts, links/rechts = drehen, OK = Tür öffnen; Maus/Touch über Pfeilknöpfe.
 * Level: Gebäude 3×3 → 7×7, Ziele nacheinander 1 → 4, Karte sichtbar → nur am Anfang → nie, Rückweg zum Start. */
(function () {
  'use strict';
  var HT = window.HT;

  var levels = HT.stufen(14, function (t, i) {
    return {
      groesse: Math.min(7, 3 + Math.floor((i - 1) / 3)),
      ziele: Math.min(4, 1 + Math.floor((i - 1) / 4)),
      karte: i <= 5 ? 'immer' : i <= 10 ? 'anfang' : 'nie',
      rueckweg: i >= 13
    };
  });
  var RAEUME = [
    ['Küche', '<path d="M14 18 H50 V50 H14 Z M14 30 H50 M22 24 H26 M38 24 H42" fill="none"/><circle cx="24" cy="40" r="4" fill="none"/><circle cx="40" cy="40" r="4" fill="none"/>'],
    ['Bad', '<path d="M10 34 H54 V40 Q54 52 42 52 H22 Q10 52 10 40 Z M16 34 V20 Q16 14 22 14 Q26 14 26 18" fill="none"/>'],
    ['Büro', '<rect x="14" y="16" width="36" height="24" rx="2" fill="none"/><path d="M26 48 H38 M32 40 V48 M18 54 H46" fill="none"/>'],
    ['Wohnzimmer', '<path d="M10 30 Q10 24 16 24 H48 Q54 24 54 30 V44 H10 Z M10 44 V50 M54 44 V50 M18 34 H46" fill="none"/>'],
    ['Schlafzimmer', '<path d="M10 22 V50 M10 40 H54 V50 M10 32 H24 Q30 32 30 38 V40 M30 34 H54 V40" fill="none"/>'],
    ['Speisesaal', '<path d="M14 30 H50 M20 30 V50 M44 30 V50 M24 20 V28 M32 18 V28 M40 20 V28" fill="none"/>'],
    ['Garderobe', '<path d="M32 14 Q38 14 38 20 Q38 24 32 26 L10 40 H54 L32 26" fill="none"/>'],
    ['Bibliothek', '<path d="M12 50 H52 M16 50 V20 H24 V50 M28 50 V16 H36 V50 M40 50 L44 22 L52 24 L48 50" fill="none"/>']
  ];
  var ARTIKEL = { 'Küche': ['die', 'zur'], 'Bad': ['das', 'zum'], 'Büro': ['das', 'zum'], 'Wohnzimmer': ['das', 'zum'], 'Schlafzimmer': ['das', 'zum'], 'Speisesaal': ['der', 'zum'], 'Garderobe': ['die', 'zur'], 'Bibliothek': ['die', 'zur'] };
  function schild(i) { return '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><g stroke="#26333c" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round">' + RAEUME[i][1] + '</g></svg>'; }
  var DX = [0, 1, 0, -1], DY = [-1, 0, 1, 0];

  /* Gebäude erzeugen: Spannbaum per Tiefensuche, dann einige Schleifen; Räume an Sackgassen */
  function gebaeude(n, anzahlRaeume) {
    var offen = [], i, besucht = [];
    for (i = 0; i < n * n; i++) { offen.push([false, false, false, false]); besucht.push(false); }
    var stapel = [0]; besucht[0] = true;
    while (stapel.length) {
      var c = stapel[stapel.length - 1], x = c % n, y = Math.floor(c / n), nb = [];
      for (var d = 0; d < 4; d++) { var nx = x + DX[d], ny = y + DY[d]; if (nx >= 0 && ny >= 0 && nx < n && ny < n && !besucht[ny * n + nx]) nb.push(d); }
      if (!nb.length) { stapel.pop(); continue; }
      var dd = HT.zufall.wahl(nb), z = (y + DY[dd]) * n + (x + DX[dd]);
      offen[c][dd] = true; offen[z][(dd + 2) % 4] = true; besucht[z] = true; stapel.push(z);
    }
    for (i = 0; i < Math.floor(n * n * 0.12); i++) {
      var cc = HT.zufall.int(0, n * n - 1), cx = cc % n, cy = Math.floor(cc / n), dr = HT.zufall.int(0, 3), ex = cx + DX[dr], ey = cy + DY[dr];
      if (ex >= 0 && ey >= 0 && ex < n && ey < n) { offen[cc][dr] = true; offen[ey * n + ex][(dr + 2) % 4] = true; }
    }
    var grad = offen.map(function (o) { return o.filter(Boolean).length; });
    var kandidaten = offen.map(function (o, k) { return k; }).filter(function (k) { return k !== 0 && grad[k] === 1; });
    if (kandidaten.length < anzahlRaeume) kandidaten = kandidaten.concat(HT.zufall.mischen(offen.map(function (o, k) { return k; }).filter(function (k) { return k !== 0 && kandidaten.indexOf(k) < 0; })));
    var raumZellen = HT.zufall.stichprobe(kandidaten, anzahlRaeume), typen = HT.zufall.stichprobe(RAEUME.map(function (r, k) { return k; }), anzahlRaeume), raum = {};
    raumZellen.forEach(function (z, k) { raum[z] = typen[k]; });
    return { n: n, offen: offen, raum: raum };
  }
  function kuerzesterWeg(g, von, nach) {
    var dist = {}, q = [von]; dist[von] = 0;
    while (q.length) { var c = q.shift(); if (c === nach) return dist[c]; var x = c % g.n, y = Math.floor(c / g.n);
      for (var d = 0; d < 4; d++) if (g.offen[c][d]) { var z = (y + DY[d]) * g.n + x + DX[d]; if (dist[z] === undefined && (g.raum[z] === undefined || z === nach)) { dist[z] = dist[c] + 1; q.push(z); } } }
    return 99;
  }

  HT.registerModule({
    id: 'raeume-erkunden', name: 'Räume erkunden', kategorie: 'raeumlich', symbol: 'home',
    ziel: 'Sich in einem Gebäude orientieren, Wege planen und merken',
    beschreibung: 'Ich-Perspektive in einem Gebäude aus Fluren: Öffnungen links, rechts und vorn, Türen mit Schildern (Küche, Bad, Büro …). Auftrag z. B. „Gehen Sie zur Küche“. Eine kleine Karte hilft in niedrigen Leveln, später nur am Anfang oder gar nicht. Höhere Level: größere Gebäude, mehrere Ziele nacheinander und zum Schluss der Rückweg zum Start. Gemessen werden Umwege, Zeit und Drehungen.',
    anleitung: 'Mit Pfeil hoch gehen Sie vorwärts, mit links und rechts drehen Sie sich. Steht die gesuchte Tür vor Ihnen, öffnen Sie sie mit OK.',
    tasten: ['hoch', 'links', 'rechts', 'ok'], levels: levels,
    levelLabels: { groesse: 'Gebäude (Felder je Seite)', ziele: 'Ziele nacheinander', karte: 'Karte', rueckweg: 'Rückweg zum Start' },
    create: function (container, ctx) {
      var p = ctx.params, Z = HT.zeit, aus = [], laeuft = true;
      var wurzel = HT.m.neu(container, 're-wurzel');
      var auftragEl = HT.m.neu(wurzel, 'm-anweisung re-auftrag');
      var ansicht = HT.m.neu(wurzel, 're-ansicht');
      var leiste = HT.m.neu(wurzel, 're-leiste');
      var karteEl = HT.m.neu(wurzel, 're-karte');
      var g, pos, dir, ziele, zIdx, schritte, drehungen, tStart, minWeg, besucht, karteBis;
      function neu() {
        if (!laeuft) return;
        var anzahl = Math.min(RAEUME.length, Math.max(p.ziele + 2, Math.round(p.groesse * 1.1)));
        g = gebaeude(p.groesse, anzahl);
        pos = 0; dir = g.offen[0][1] ? 1 : 2; besucht = {}; besucht[0] = true;
        var raumListe = Object.keys(g.raum).map(Number);
        ziele = HT.zufall.stichprobe(raumListe, p.ziele);
        if (p.rueckweg) ziele.push(0);
        zIdx = 0; karteBis = p.karte === 'anfang' ? Z.jetzt() + 6000 : 0;
        zielStart();
      }
      function zielStart() {
        schritte = 0; drehungen = 0; tStart = Z.jetzt();
        var z = ziele[zIdx];
        minWeg = kuerzesterWeg(g, pos, z);
        var rn = z === 0 ? '' : RAEUME[g.raum[z]][0];
        var satz = z === 0 ? 'Gehen Sie zurück zum <b>Eingang</b>.' : 'Gehen Sie ' + ARTIKEL[rn][1] + ' <b>' + rn + '</b>' + (ziele.length > 1 ? ' <span class="re-nr">(' + (zIdx + 1) + ' von ' + ziele.length + ')</span>' : '') + '.';
        auftragEl.innerHTML = (z !== 0 ? '<span class="re-ziel-schild">' + schild(g.raum[z]) + '</span>' : '') + '<span>' + satz + '</span>';
        malen();
      }
      function zelle(c, d, k) { var x = c % g.n + DX[d] * k, y = Math.floor(c / g.n) + DY[d] * k; return x >= 0 && y >= 0 && x < g.n && y < g.n ? y * g.n + x : -1; }
      /* Ich-Ansicht: drei Tiefenebenen, Wände als Trapeze */
      function malen(anim) {
        var B = 600, H = 400, s = '<svg viewBox="0 0 ' + B + ' ' + H + '" xmlns="http://www.w3.org/2000/svg" class="' + (anim ? 're-schritt' : '') + '"><rect width="600" height="200" fill="#e9eef1"/><rect y="200" width="600" height="200" fill="#c9b79a"/>';
        var rand = [[0, 0, 600, 400], [110, 70, 490, 330], [200, 130, 400, 270], [250, 165, 350, 235]];
        var c = pos, blockiert = false;
        for (var k = 0; k < 3 && !blockiert; k++) {
          var a = rand[k], b = rand[k + 1], l = (dir + 3) % 4, r = (dir + 1) % 4, hell = 1 - k * 0.12;
          var wf = function (h) { var v = Math.round(h * hell); return 'rgb(' + v + ',' + Math.round(v * 1.01) + ',' + Math.round(v * 1.04) + ')'; };
          // linke Seite
          if (!g.offen[c][l]) s += '<polygon points="' + a[0] + ',' + a[1] + ' ' + b[0] + ',' + b[1] + ' ' + b[0] + ',' + b[3] + ' ' + a[0] + ',' + a[3] + '" fill="' + wf(222) + '" stroke="#9aa5ad"/>';
          else {
            s += '<polygon points="' + a[0] + ',' + b[1] + ' ' + b[0] + ',' + b[1] + ' ' + b[0] + ',' + b[3] + ' ' + a[0] + ',' + b[3] + '" fill="' + wf(200) + '" stroke="#9aa5ad"/>';
            var lz = zelle(c, l, 1); if (lz >= 0 && g.raum[lz] !== undefined) s += tuer((a[0] + b[0]) / 2, b[1], b[3], (b[0] - a[0]) * 0.7, g.raum[lz], true);
          }
          if (!g.offen[c][r]) s += '<polygon points="' + a[2] + ',' + a[1] + ' ' + b[2] + ',' + b[1] + ' ' + b[2] + ',' + b[3] + ' ' + a[2] + ',' + a[3] + '" fill="' + wf(212) + '" stroke="#9aa5ad"/>';
          else {
            s += '<polygon points="' + a[2] + ',' + b[1] + ' ' + b[2] + ',' + b[1] + ' ' + b[2] + ',' + b[3] + ' ' + a[2] + ',' + b[3] + '" fill="' + wf(196) + '" stroke="#9aa5ad"/>';
            var rz = zelle(c, r, 1); if (rz >= 0 && g.raum[rz] !== undefined) s += tuer((a[2] + b[2]) / 2, b[1], b[3], (a[2] - b[2]) * 0.7, g.raum[rz], true);
          }
          var vz = g.offen[c][dir] ? zelle(c, dir, 1) : -1;
          if (vz < 0 || g.raum[vz] !== undefined) {
            s += '<rect x="' + b[0] + '" y="' + b[1] + '" width="' + (b[2] - b[0]) + '" height="' + (b[3] - b[1]) + '" fill="' + wf(232) + '" stroke="#9aa5ad"/>';
            if (vz >= 0) s += tuer((b[0] + b[2]) / 2, b[1], b[3], (b[2] - b[0]) * 0.42, g.raum[vz], false);
            blockiert = true;
          } else c = vz;
        }
        if (!blockiert) s += '<rect x="' + rand[3][0] + '" y="' + rand[3][1] + '" width="100" height="70" fill="#dfe6ea"/>';
        if (pos === 0) s += '<text x="300" y="390" text-anchor="middle" font-size="16" fill="#51606b" font-family="-apple-system,sans-serif">Eingang</text>';
        ansicht.innerHTML = s + '</svg>';
        karteMalen();
      }
      function tuer(cx, oben, unten, breite, raumTyp, seitlich) {
        var h = (unten - oben) * 0.78, y = unten - h, w = Math.max(18, breite);
        var t = '<rect x="' + (cx - w / 2) + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="3" fill="#a9774a" stroke="#6e4c2e" stroke-width="2"/><circle cx="' + (cx + w * 0.3) + '" cy="' + (y + h * 0.55) + '" r="' + Math.max(2, w * 0.04) + '" fill="#e8c547"/>';
        var sg = Math.min(w * 0.75, seitlich ? 40 : 70);
        t += '<rect x="' + (cx - sg / 2) + '" y="' + (y - sg - 6) + '" width="' + sg + '" height="' + sg + '" rx="6" fill="#fff" stroke="#1BA8B5" stroke-width="2"/>';
        t += '<g transform="translate(' + (cx - sg / 2) + ' ' + (y - sg - 6) + ') scale(' + (sg / 64) + ')"><g stroke="#26333c" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" fill="none">' + RAEUME[raumTyp][1] + '</g></g>';
        return t;
      }
      function karteMalen() {
        var zeigen = p.karte === 'immer' || (p.karte === 'anfang' && Z.jetzt() < karteBis);
        karteEl.style.display = zeigen ? '' : 'none';
        if (!zeigen) return;
        var z = 120 / g.n, s = '<svg viewBox="-4 -4 128 128" xmlns="http://www.w3.org/2000/svg"><rect x="-4" y="-4" width="128" height="128" rx="8" fill="#fff"/>';
        for (var c = 0; c < g.n * g.n; c++) {
          var x = (c % g.n) * z, y = Math.floor(c / g.n) * z;
          s += '<rect x="' + (x + 2) + '" y="' + (y + 2) + '" width="' + (z - 4) + '" height="' + (z - 4) + '" rx="3" fill="' + (g.raum[c] !== undefined ? '#e3f6f8' : besucht[c] ? '#eef2f4' : '#f8fafb') + '"/>';
          if (!g.offen[c][1] && c % g.n < g.n - 1) s += '<line x1="' + (x + z) + '" y1="' + y + '" x2="' + (x + z) + '" y2="' + (y + z) + '" stroke="#5f6b74" stroke-width="2"/>';
          if (!g.offen[c][2] && Math.floor(c / g.n) < g.n - 1) s += '<line x1="' + x + '" y1="' + (y + z) + '" x2="' + (x + z) + '" y2="' + (y + z) + '" stroke="#5f6b74" stroke-width="2"/>';
          if (g.raum[c] !== undefined) s += '<g transform="translate(' + (x + z * 0.15) + ' ' + (y + z * 0.15) + ') scale(' + (z * 0.7 / 64) + ')"><g stroke="#26333c" stroke-width="4" fill="none">' + RAEUME[g.raum[c]][1] + '</g></g>';
        }
        s += '<rect x="0" y="0" width="120" height="120" fill="none" stroke="#26333c" stroke-width="2.5" rx="2"/>';
        var px = (pos % g.n + 0.5) * z, py = (Math.floor(pos / g.n) + 0.5) * z, w = dir * 90;
        s += '<g transform="translate(' + px + ' ' + py + ') rotate(' + w + ')"><path d="M0 ' + (-z * 0.32) + ' L' + (z * 0.24) + ' ' + (z * 0.24) + ' L0 ' + (z * 0.1) + ' L' + (-z * 0.24) + ' ' + (z * 0.24) + ' Z" fill="#E25C5C"/></g>';
        karteEl.innerHTML = s + '</svg>';
      }
      function aktion(a) {
        if (!laeuft || !g) return;
        if (a === 'links' || a === 'rechts') { dir = (dir + (a === 'rechts' ? 1 : 3)) % 4; drehungen++; malen(); return; }
        var vor = g.offen[pos][dir] ? zelle(pos, dir, 1) : -1;
        if (a === 'hoch') {
          if (vor < 0) { ctx.audio.ton(220, 0.08, 'sine', 0, 0.15); return; }
          if (g.raum[vor] !== undefined) { HT.ui.toast('Hier ist eine Tür – mit OK öffnen.', 'info'); return; }
          pos = vor; schritte++; besucht[pos] = true; malen(true);
          if (ziele[zIdx] === 0 && pos === 0) erreicht();
          return;
        }
        if (a === 'ok') {
          if (vor >= 0 && g.raum[vor] !== undefined) {
            if (vor === ziele[zIdx]) { schritte++; erreicht(); }
            else { var fn = RAEUME[g.raum[vor]][0]; ctx.onEvent({ korrekt: false, zaehlt: false, reiz: zielName(), reaktion: fn, typ: 'falsche_tuer' }); ctx.audio.falsch(); HT.ui.toast('Das ist ' + ARTIKEL[fn][0] + ' ' + fn + '. Gesucht ist ' + zielName() + '.', 'info'); }
          }
        }
      }
      function zielName() { var z = ziele[zIdx]; if (z === 0) return 'der Eingang'; var n = RAEUME[g.raum[z]][0]; return ARTIKEL[n][0] + ' ' + n; }
      function erreicht() {
        var umweg = Math.max(0, schritte - minWeg);
        ctx.onEvent({ korrekt: umweg <= Math.max(2, Math.round(minWeg * 0.5)), rtMs: Z.jetzt() - tStart, reiz: zielName(), reaktion: schritte + ' Schritte', typ: 'ziel', umweg: umweg, drehungen: drehungen, minimum: minWeg });
        ctx.feedback(true); ctx.audio.richtig();
        zIdx++;
        if (zIdx >= ziele.length) { auftragEl.innerHTML = 'Geschafft!'; Z.nach(1500, neu); return; }
        Z.nach(900, zielStart);
      }
      [['links', '↶ Drehen'], ['hoch', '▲ Vorwärts'], ['rechts', 'Drehen ↷'], ['ok', 'Tür öffnen']].forEach(function (k) {
        var b = HT.el('button', { type: 'button', class: 'm-wahl-knopf re-knopf' }, k[1]);
        HT.tap(b, function () { aktion(k[0]); });
        leiste.appendChild(b);
      });
      HT.tap(ansicht, function (ev) { /* Klick auf die Ansicht: Mitte = vorwärts bzw. Tür öffnen */ var vor = g && g.offen[pos][dir] ? zelle(pos, dir, 1) : -1; aktion(vor >= 0 && g.raum[vor] !== undefined ? 'ok' : 'hoch'); });
      var kartenUhr = setInterval(function () { if (g && p.karte === 'anfang') karteMalen(); }, 500);
      return {
        start: function () { aus.push(HT.eingabe.an(function (a) { if (a === 'hoch' || a === 'links' || a === 'rechts' || a === 'ok') aktion(a); })); neu(); },
        stop: function () { laeuft = false; clearInterval(kartenUhr); aus.forEach(function (f) { f(); }); }
      };
    },
    preview: function (el) {
      var flur = function (tuer) {
        return '<svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg"><rect width="400" height="150" fill="#e9eef1"/><rect y="150" width="400" height="150" fill="#c9b79a"/>' +
          '<polygon points="0,0 80,50 80,250 0,300" fill="#ddd"/><polygon points="400,0 320,50 320,250 400,300" fill="#d4d4d4"/><polygon points="80,50 140,90 140,210 80,250" fill="#d0d0d0"/><polygon points="320,50 260,90 260,210 320,250" fill="#cacaca"/>' +
          '<rect x="140" y="90" width="120" height="120" fill="#e6e9eb"/>' + (tuer ? '<rect x="175" y="120" width="50" height="90" fill="#a9774a" stroke="#6e4c2e" stroke-width="2"/><rect x="180" y="96" width="40" height="22" rx="4" fill="#fff" stroke="#1BA8B5" stroke-width="2"/><text x="200" y="112" text-anchor="middle" font-size="11" font-weight="700" fill="#1E2A33" font-family="-apple-system,sans-serif">Küche</text>' : '') +
          '<rect x="300" y="210" width="86" height="76" rx="8" fill="#fff" stroke="#d6e0e6"/><path d="M315 225 H370 V270 H315 Z M342 225 V250" fill="none" stroke="#5f6b74" stroke-width="2"/><path d="M330 262 l6 -10 l6 10 z" fill="#E25C5C"/></svg>';
      };
      return HT.beispiel(el, [{ svg: flur(false), text: 'Gehen Sie zur Küche', dauer: 1500 }, { svg: flur(true), text: 'Die Tür ist vorn', dauer: 1300 }, { svg: flur(true), zeiger: [50, 55], klick: true, text: 'Mit OK öffnen', dauer: 1400 }]);
    }
  });
})();

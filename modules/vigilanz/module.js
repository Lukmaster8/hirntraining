/* Modul: Vigilanz – monotones Förderband mit Paketen, seltene Abweichungen erkennen.
 * Level: Seltenheit der Abweichung, Unauffälligkeit, Tempo. Messwert u. a. Treffer über die Zeit (Leistungsabfall). */
(function () {
  'use strict';
  var HT = window.HT;
  var levels = HT.stufen(12, function (t, i) {
    return {
      abweichungsrate: Math.round(HT.lerp(0.3, 0.15, t) * 100) / 100, // häufiger als klassische Vigilanzaufgaben: mehr Reaktionen, aber weiterhin die Minderheit
      unauffaelligkeit: i <= 4 ? 1 : i <= 8 ? 2 : 3,
      tempoPxS: HT.lerpInt(110, 170, t),
      abstandPx: HT.lerpInt(230, 190, t)
    };
  });
  function paket(abw, stufe) {
    var box = '#C8955A', etikett = '#ffffff', band = '#a8743f', ey = 34;
    if (abw && stufe === 1) etikett = '#E25C5C';
    if (abw && stufe === 2) box = '#a9773f';
    if (abw && stufe === 3) ey = 26;
    return '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect x="10" y="18" width="80" height="72" rx="6" fill="' + box + '" stroke="#26333c" stroke-width="3"/><path d="M50 18 V90" stroke="' + band + '" stroke-width="10"/><rect x="58" y="' + ey + '" width="24" height="16" rx="2" fill="' + etikett + '" stroke="#26333c" stroke-width="2"/></svg>';
  }

  // Karton in Schrägansicht (leicht von rechts oben): Vorderseite, Deckel, rechte Seite, Klebeband, Etikett
  function karton3d(abw, stufe) {
    var f = abw && stufe === 2 ? ['#a8763e', '#bb8a52', '#8a5f30'] : ['#cf9a5c', '#e0b27a', '#a9773f'];
    var et = abw && stufe === 1 ? '#E25C5C' : '#ffffff', ey = abw && stufe === 3 ? 40 : 54;
    return '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">' +
      '<path d="M12 34 L66 34 L86 20 L32 20 Z" fill="' + f[1] + '" stroke="#5b3d1c" stroke-width="1.5" stroke-linejoin="round"/>' +
      '<path d="M66 34 L86 20 L86 74 L66 88 Z" fill="' + f[2] + '" stroke="#5b3d1c" stroke-width="1.5" stroke-linejoin="round"/>' +
      '<rect x="12" y="34" width="54" height="54" fill="' + f[0] + '" stroke="#5b3d1c" stroke-width="1.5"/>' +
      '<path d="M35 34 L55 20 L61 20 L41 34 Z" fill="#c9a26a" opacity=".9"/><rect x="35" y="34" width="6" height="54" fill="#c9a26a" opacity=".9"/>' +
      '<rect x="44" y="' + ey + '" width="18" height="12" rx="1.5" fill="' + et + '" stroke="#4a3a2a" stroke-width="1"/></svg>';
  }

  /* Szenario „Förderband“ als kleines 3D-Minispiel auf einer Zeichenfläche:
   * Gummiband mit mitlaufenden Querleisten und drehenden Rollen auf einem Stahlgestell, darunter Motor mit Zahnrädern,
   * Kette und Kabeln. Kartons (3D, leicht von rechts oben) fallen am Ende mit Schwerkraft auf eine Europalette und stapeln
   * sich; bei 6 Kartons holt ein Gabelstapler die volle Palette und stellt eine leere hin. Bandtempo, Kontrollfenster und
   * Wertung bleiben unverändert (nur die Darstellung ist neu). */
  function bandSpiel(container, ctx, voll, musterHtml) {
    var p = ctx.params, Z = HT.zeit;
    voll.style.background = '#ffffff';
    var cv = HT.canvasVoll(voll), g = cv.ctx, B = cv.b, H = cv.h;
    HT.m.neu(voll, 'm-oben', musterHtml);
    var k = HT.klemmen(Math.min(B / 1100, H / 640), 0.7, 1.35);
    var OX = 0.42, OY = -0.3;                       // Schrägprojektion: Tiefe nach rechts oben
    var bandY = Math.round(H * 0.6), D = 74 * k, dicke = 20 * k, xE = Math.round(B * 0.56), boden = Math.round(H * 0.93);
    var KW = 92 * k, KH = 74 * k, KD = 56 * k, z0 = (D - KD) / 2;
    var FB = 150 * k, FX = Math.round(B * 0.36); // Kontrollfenster links der Mitte, damit Palette und Stapler maßstabsgetreu Platz haben
    var fenster = HT.m.neu(voll, '', '', { position: 'absolute', left: (FX - FB / 2) + 'px', top: (bandY - KH - 40 * k) + 'px', width: FB + 'px', height: (KH + 46 * k) + 'px', border: '3px solid #1BA8B5', borderRadius: '16px', pointerEvents: 'none', zIndex: 2, boxShadow: '0 0 0 6px rgba(27,168,181,.08)' });
    HT.m.neu(voll, '', 'Fenster', { position: 'absolute', left: (FX - 75) + 'px', top: (bandY - KH - 66 * k) + 'px', width: '150px', textAlign: 'center', fontWeight: '700', color: '#1BA8B5', zIndex: 2 });
    var kisten = [], fallend = [], weg = 0, aus = [], frame = null, uhr = 0;
    // Palette und Stapler
    // Maßstab: Europalette 1200 × 800 × 144 mm → MM = Pixel je Millimeter; der Stapler wird in echten Maßen gezeichnet
    var PW = KW * 2 + 14 * k, MM = PW / 1200, PH = 144 * MM, PD = D * 0.95, STL = 2000 * MM;
    var palX = Math.min(B - PW - STL - 24 * k, xE + 30 * k);
    var palette = { x: palX, voll: [], da: true }, stapler = { zustand: 'weg', t: 0, x: B + 260 * k, gabel: 0, last: null };
    function slot(n) { var lage = Math.floor(n / 2), i = n % 2; return { x: palette.x + 4 * k + i * (KW + 6 * k), y: boden - PH - lage * KH }; }
    function tempo() { return p.tempoPxS * (p.tempo === 'schnell' ? 1.45 : 1); }
    function neueKiste(x) {
      var abw = HT.zufall.chance(p.abweichungsrate);
      kisten.unshift({ x: x, abw: abw, erkannt: false, gewertet: false, imFenster: false, startZeit: null }); // Liste von links nach rechts
    }
    function imFenster(q) { var m = q.x + KW / 2 + KD * OX / 2; return m > FX - FB / 2 && m < FX + FB / 2; }
    function reagieren(pk) {
      if (!pk) pk = kisten.filter(function (q) { return q.abw && !q.erkannt && imFenster(q); })[0] || null;
      if (pk && pk.abw && !pk.erkannt && imFenster(pk)) {
        pk.erkannt = true; pk.gewertet = true;
        ctx.onEvent({ korrekt: true, reiz: 'abweichung', reaktion: 'im fenster', rtMs: Z.jetzt() - (pk.startZeit || Z.jetzt()), seite: 'mitte' });
        ctx.feedback(true, pk.x + KW / 2, bandY - KH / 2);
      } else {
        ctx.onEvent({ korrekt: false, reiz: pk && pk.abw ? 'abweichung ausserhalb' : 'normal', reaktion: 'reagiert', typ: 'fehlreaktion' });
        ctx.feedback(false, null, null, { dauer: 350 });
      }
    }
    // Antippen/Klicken: getroffenen Karton suchen
    function tippen(ev) {
      var r = cv.c.getBoundingClientRect(), t = ev.touches && ev.touches[0] ? ev.touches[0] : ev, x = t.clientX - r.left, y = t.clientY - r.top;
      var hit = null;
      kisten.forEach(function (q) { var fx = q.x + z0 * OX, fy = bandY + z0 * OY; if (x > fx - 4 && x < fx + KW + KD * OX + 4 && y > fy - KH + KD * OY - 4 && y < fy + 4) hit = q; });
      reagieren(hit || { abw: false });
    }
    HT.tap(cv.c, tippen);

    /* ---------- Zeichnen ---------- */
    function poly(pts, fill, strich) { g.beginPath(); g.moveTo(pts[0], pts[1]); for (var i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]); g.closePath(); if (fill) { g.fillStyle = fill; g.fill(); } if (strich) { g.strokeStyle = strich; g.lineWidth = 1.2; g.stroke(); } }
    function karton(fx, fy, abw, w, h, d, rot, alpha) {
      // fx/fy = vordere untere linke Ecke
      var f = abw && p.unauffaelligkeit === 2 ? ['#a8763e', '#bb8a52', '#8a5f30'] : ['#cf9a5c', '#e3b67e', '#a9773f'];
      g.save();
      if (alpha !== undefined) g.globalAlpha = alpha;
      if (rot) { g.translate(fx + w / 2, fy - h / 2); g.rotate(rot); g.translate(-(fx + w / 2), -(fy - h / 2)); }
      var ox = d * OX, oy = d * OY, kante = '#5b3d1c';
      poly([fx, fy - h, fx + w, fy - h, fx + w + ox, fy - h + oy, fx + ox, fy - h + oy], f[1], kante);   // Deckel
      poly([fx + w, fy - h, fx + w, fy, fx + w + ox, fy + oy, fx + w + ox, fy - h + oy], f[2], kante);   // rechte Seite
      g.fillStyle = f[0]; g.fillRect(fx, fy - h, w, h); g.strokeStyle = kante; g.lineWidth = 1.2; g.strokeRect(fx, fy - h, w, h);
      // Klebeband über Deckel und Vorderseite
      var tb = w * 0.12, tx = fx + w * 0.44;
      g.fillStyle = 'rgba(201,162,106,.95)';
      poly([tx, fy - h, tx + tb, fy - h, tx + tb + ox, fy - h + oy, tx + ox, fy - h + oy], 'rgba(201,162,106,.95)');
      g.fillRect(tx, fy - h, tb, h * 0.32);
      // Etikett (Abweichung: rot / dunklerer Karton / Etikett höher)
      var et = abw && p.unauffaelligkeit === 1 ? '#E25C5C' : '#ffffff', ey = abw && p.unauffaelligkeit === 3 ? 0.18 : 0.42;
      g.fillStyle = et; g.fillRect(fx + w * 0.6, fy - h + h * ey, w * 0.3, h * 0.22); g.strokeStyle = '#4a3a2a'; g.lineWidth = 1; g.strokeRect(fx + w * 0.6, fy - h + h * ey, w * 0.3, h * 0.22);
      g.fillStyle = 'rgba(40,40,40,.55)'; for (var l = 0; l < 3; l++) g.fillRect(fx + w * 0.63, fy - h + h * ey + h * 0.05 + l * h * 0.05, w * 0.22 - l * w * 0.04, 1.2);
      g.restore();
    }
    function zahnrad(cx, cy, r, zaehne, winkel, farbe) {
      g.save(); g.translate(cx, cy); g.rotate(winkel); g.beginPath();
      for (var i = 0; i < zaehne * 2; i++) { var a = i * Math.PI / zaehne, rr = i % 2 ? r * 0.8 : r; g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); g.lineTo(Math.cos(a + Math.PI / zaehne * 0.6) * rr, Math.sin(a + Math.PI / zaehne * 0.6) * rr); }
      g.closePath(); g.fillStyle = farbe; g.fill(); g.strokeStyle = '#2b3338'; g.lineWidth = 1.2; g.stroke();
      g.beginPath(); g.arc(0, 0, r * 0.32, 0, Math.PI * 2); g.fillStyle = '#d9dee2'; g.fill(); g.stroke();
      g.beginPath(); g.moveTo(-r * 0.55, 0); g.lineTo(r * 0.55, 0); g.moveTo(0, -r * 0.55); g.lineTo(0, r * 0.55); g.strokeStyle = 'rgba(0,0,0,.25)'; g.stroke();
      g.restore();
    }
    function rolle(x, y, r, winkel) {
      g.fillStyle = '#9aa4ab'; g.beginPath(); g.ellipse(x, y, r * 0.55, r, 0, 0, Math.PI * 2); g.fill(); g.strokeStyle = '#4b555c'; g.lineWidth = 1.2; g.stroke();
      g.save(); g.translate(x, y); g.strokeStyle = '#4b555c';
      for (var i = 0; i < 3; i++) { var a = winkel + i * 2.094; g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(a) * r * 0.5, Math.sin(a) * r * 0.9); g.stroke(); }
      g.restore();
    }
    function gestell() {
      var unten = bandY + dicke, stahl = '#7d8a93', dunkel = '#59656d', beine = [];
      for (var x = 30 * k; x < xE; x += 230 * k) beine.push(x);
      beine.push(xE - 26 * k);
      // hintere Beine
      beine.forEach(function (x) { g.fillStyle = dunkel; g.fillRect(x + D * OX - 5 * k, unten + D * OY, 10 * k, boden + D * OY - (unten + D * OY)); });
      // Längsstrebe unten und Kreuzstreben
      g.strokeStyle = dunkel; g.lineWidth = 4 * k; g.beginPath(); g.moveTo(beine[0], boden - 40 * k); g.lineTo(beine[beine.length - 1], boden - 40 * k); g.stroke();
      g.lineWidth = 2.5 * k; g.strokeStyle = 'rgba(89,101,109,.8)';
      for (var i = 0; i < beine.length - 1; i++) { g.beginPath(); g.moveTo(beine[i], unten + 8 * k); g.lineTo(beine[i + 1], boden - 40 * k); g.moveTo(beine[i + 1], unten + 8 * k); g.lineTo(beine[i], boden - 40 * k); g.stroke(); }
      // Motor mit Zahnrädern unter dem Bandende, Kette zur Antriebsrolle
      var mx = xE - 150 * k, my = unten + 38 * k, wR = weg / (dicke * 0.5);
      g.fillStyle = '#3d6f8f'; g.fillRect(mx - 46 * k, my - 18 * k, 64 * k, 36 * k); g.strokeStyle = '#26333c'; g.lineWidth = 1.2; g.strokeRect(mx - 46 * k, my - 18 * k, 64 * k, 36 * k);
      g.fillStyle = '#2f5872'; for (var r = 0; r < 5; r++) g.fillRect(mx - 42 * k + r * 9 * k, my - 14 * k, 5 * k, 28 * k);
      var z1x = mx + 30 * k, z1y = my, z2x = mx + 30 * k + 23 * k, z2y = my - 16 * k;
      g.strokeStyle = '#3a3f43'; g.lineWidth = 3 * k; g.setLineDash([4 * k, 3 * k]); g.lineDashOffset = -weg * 0.4;
      g.beginPath(); g.moveTo(z2x, z2y - 9 * k); g.lineTo(xE - 6 * k, bandY + dicke * 0.5 - 6 * k); g.moveTo(z2x, z2y + 9 * k); g.lineTo(xE - 6 * k, bandY + dicke * 0.5 + 6 * k); g.stroke(); g.setLineDash([]);
      zahnrad(z1x, z1y, 15 * k, 12, wR * 0.6, '#c9cfd3');
      zahnrad(z2x, z2y, 10 * k, 8, -wR * 0.9 + 0.2, '#e0b04a');
      // Kabel vom Motor zum Boden und nach links aus dem Bild
      g.lineWidth = 3 * k; g.lineCap = 'round';
      g.strokeStyle = '#1f2326'; g.beginPath(); g.moveTo(mx - 46 * k, my + 6 * k); g.bezierCurveTo(mx - 90 * k, my + 30 * k, mx - 110 * k, boden - 4 * k, mx - 200 * k, boden - 3 * k); g.lineTo(-10, boden - 3 * k); g.stroke();
      g.strokeStyle = '#e07a1f'; g.beginPath(); g.moveTo(mx - 46 * k, my - 6 * k); g.bezierCurveTo(mx - 70 * k, my + 50 * k, mx - 60 * k, boden - 8 * k, mx - 150 * k, boden - 8 * k); g.lineTo(-10, boden - 9 * k); g.stroke();
      g.lineCap = 'butt';
      // vordere Beine
      beine.forEach(function (x) { g.fillStyle = stahl; g.fillRect(x - 6 * k, unten, 12 * k, boden - unten); g.fillStyle = dunkel; g.fillRect(x - 9 * k, boden - 5 * k, 18 * k, 5 * k); });
    }
    function bandZeichnen() {
      var ox = D * OX, oy = D * OY, x0 = -20;
      // Seitenwange hinten, Bandoberfläche, Querleisten, Wange vorne
      poly([x0 + ox, bandY + oy - 8 * k, xE + ox, bandY + oy - 8 * k, xE + ox, bandY + oy, x0 + ox, bandY + oy], '#8f9aa2');
      poly([x0, bandY, xE, bandY, xE + ox, bandY + oy, x0 + ox, bandY + oy], '#3a4248');
      g.strokeStyle = 'rgba(255,255,255,.13)'; g.lineWidth = 2;
      var abst = 26 * k, off = weg % abst;
      for (var x = xE - off; x > x0; x -= abst) { g.beginPath(); g.moveTo(x, bandY); g.lineTo(x + ox, bandY + oy); g.stroke(); }
      // Glanz
      var gl = g.createLinearGradient(0, bandY + oy, 0, bandY); gl.addColorStop(0, 'rgba(255,255,255,.08)'); gl.addColorStop(1, 'rgba(0,0,0,.12)');
      poly([x0, bandY, xE, bandY, xE + ox, bandY + oy, x0 + ox, bandY + oy], gl);
      // Antriebsrolle am Ende (drehend)
      rolle(xE + ox * 0.5, bandY + oy * 0.5 + dicke * 0.5, dicke * 0.75, weg / (dicke * 0.4));
      // vordere Wange mit Schrauben
      g.fillStyle = '#b5bec5'; g.fillRect(x0, bandY, xE - x0, dicke); g.strokeStyle = '#6b767e'; g.lineWidth = 1.2; g.strokeRect(x0, bandY, xE - x0, dicke);
      g.fillStyle = '#e3e8eb'; g.fillRect(x0, bandY, xE - x0, 3 * k);
      g.fillStyle = '#6b767e'; for (var s2 = 40 * k; s2 < xE; s2 += 115 * k) { g.beginPath(); g.arc(s2, bandY + dicke / 2, 2.2 * k, 0, Math.PI * 2); g.fill(); }
      g.fillStyle = '#9aa4ab'; g.beginPath(); g.ellipse(xE, bandY + dicke / 2, dicke * 0.3, dicke / 2, 0, -Math.PI / 2, Math.PI / 2); g.fill();
    }
    function paletteZeichnen(x, y) {
      // Europalette: drei Deckbretter, Klötze, Bodenbretter (Holz)
      var ox = PD * OX, oy = PD * OY, holz = '#d8b07a', dunkel = '#b48a55', kante = '#7a5a33';
      poly([x, y - PH, x + PW, y - PH, x + PW + ox, y - PH + oy, x + ox, y - PH + oy], '#e2be8a', kante);
      g.strokeStyle = 'rgba(122,90,51,.5)'; g.lineWidth = 1; for (var i = 1; i < 5; i++) { var t = i / 5; g.beginPath(); g.moveTo(x + ox * t, y - PH + oy * t); g.lineTo(x + PW + ox * t, y - PH + oy * t); g.stroke(); }
      poly([x + PW, y - PH, x + PW, y, x + PW + ox, y + oy, x + PW + ox, y - PH + oy], dunkel, kante);
      g.fillStyle = holz; g.fillRect(x, y - PH, PW, PH * 0.38); g.fillRect(x, y - PH * 0.3, PW, PH * 0.3);
      g.fillStyle = dunkel; [0, 0.44, 0.88].forEach(function (f) { g.fillRect(x + PW * f, y - PH * 0.62, PW * 0.12, PH * 0.32); });
      g.strokeStyle = kante; g.lineWidth = 1; g.strokeRect(x, y - PH, PW, PH);
    }
    function staplerZeichnen(st) {
      // Kompakter Frontstapler in echten Maßen (mm × MM), Gabel zeigt nach links. st.x = Vorderkante des Hubgerüsts.
      var x = st.x, y = boden, m = MM;
      function X(mm) { return x + mm * m; } function Y(mm) { return y - mm * m; }
      var hub = 60 + st.gabel * 260, gabelY = Y(hub);           // Gabelhöhe über dem Boden
      // Last (Palette mit Kartons) auf der Gabel
      if (st.last) {
        var lx = X(-12) - PW, ly = gabelY + 62 * m;
        paletteZeichnen(lx, ly);
        st.last.forEach(function (n, i) { var sl = { x: lx + 4 * k + (i % 2) * (KW + 6 * k), y: ly - PH - Math.floor(i / 2) * KH }; karton(sl.x + 4 * k * OX, sl.y + 4 * k * OY, n.abw, KW, KH, KD); });
      }
      // Hubgerüst (zwei Profile, 2150 mm), Gabelträger mit Lastschutzgitter, Zinken 1150 mm
      g.fillStyle = '#3b4247'; g.fillRect(X(40), Y(2150), 70 * m, 2150 * m); g.fillStyle = '#4b545a'; g.fillRect(X(115), Y(2150), 55 * m, 2150 * m);
      g.fillStyle = '#2b3135'; g.fillRect(X(40), Y(2150), 130 * m, 40 * m);
      g.strokeStyle = '#2b3135'; g.lineWidth = Math.max(1.5, 30 * m);
      g.strokeRect(X(-10), gabelY - 1050 * m, 60 * m, 1050 * m);
      g.lineWidth = Math.max(1, 14 * m); for (var gi = 1; gi < 5; gi++) { g.beginPath(); g.moveTo(X(-10), gabelY - gi * 210 * m); g.lineTo(X(50), gabelY - gi * 210 * m); g.stroke(); }
      g.fillStyle = '#5c666d'; g.fillRect(X(-1160), gabelY - 40 * m, 1150 * m, 40 * m); g.fillRect(X(-20), gabelY - 420 * m, 40 * m, 420 * m);
      // Rahmen und Gegengewicht (gelb), Motorhaube
      g.fillStyle = '#f2b705'; g.strokeStyle = '#8a6a00'; g.lineWidth = 1.5;
      g.beginPath(); g.moveTo(X(180), Y(330)); g.lineTo(X(1900), Y(330)); g.quadraticCurveTo(X(2010), Y(360), X(2000), Y(700));
      g.lineTo(X(1980), Y(1150)); g.lineTo(X(1350), Y(1150)); g.lineTo(X(1250), Y(960)); g.lineTo(X(560), Y(960)); g.lineTo(X(420), Y(1120)); g.lineTo(X(180), Y(1120)); g.closePath(); g.fill(); g.stroke();
      g.fillStyle = '#d99e00'; g.beginPath(); g.moveTo(X(1500), Y(380)); g.lineTo(X(1960), Y(380)); g.lineTo(X(1950), Y(1100)); g.lineTo(X(1500), Y(1100)); g.closePath(); g.fill(); // Gegengewicht
      g.fillStyle = '#1f2326'; g.fillRect(X(180), Y(380), 1820 * m, 50 * m);              // Trittstufe/Unterkante
      // Fahrerschutzdach: vorne schräge Stütze, Dach 2100 mm, hintere Stütze
      g.strokeStyle = '#2b3135'; g.lineWidth = Math.max(2, 55 * m); g.lineCap = 'round';
      g.beginPath(); g.moveTo(X(470), Y(1100)); g.lineTo(X(620), Y(2080)); g.lineTo(X(1430), Y(2080)); g.lineTo(X(1470), Y(1150)); g.stroke();
      g.lineCap = 'butt'; g.fillStyle = '#2b3135'; g.fillRect(X(580), Y(2120), 900 * m, 50 * m);
      g.strokeStyle = 'rgba(43,49,53,.6)'; g.lineWidth = Math.max(1, 18 * m); for (var si = 1; si < 5; si++) { g.beginPath(); g.moveTo(X(600 + si * 170), Y(2080)); g.lineTo(X(600 + si * 170), Y(2120)); g.stroke(); }
      // Sitz, Lenkrad, Bedienhebel
      g.fillStyle = '#1f2326'; g.fillRect(X(1050), Y(1500), 300 * m, 120 * m); g.fillRect(X(1250), Y(1650), 90 * m, 400 * m);
      g.strokeStyle = '#3b4247'; g.lineWidth = Math.max(2, 40 * m); g.beginPath(); g.moveTo(X(760), Y(1000)); g.lineTo(X(820), Y(1380)); g.stroke();
      g.beginPath(); g.ellipse(X(830), Y(1400), 160 * m, 45 * m, -0.3, 0, Math.PI * 2); g.stroke();
      g.strokeStyle = '#c81e1e'; g.lineWidth = Math.max(1.5, 25 * m); g.beginPath(); g.moveTo(X(560), Y(1000)); g.lineTo(X(600), Y(1250)); g.stroke();
      // Räder: vorne 640 mm, hinten 520 mm
      [[400, 320], [1620, 260]].forEach(function (r) {
        var cx = X(r[0]), cy = Y(r[1]), rr = r[1] * m, dreh = -st.x / rr;
        g.fillStyle = '#1b1e20'; g.beginPath(); g.arc(cx, cy, rr, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#9aa4ab'; g.beginPath(); g.arc(cx, cy, rr * 0.5, 0, Math.PI * 2); g.fill();
        g.strokeStyle = '#59656d'; g.lineWidth = 1.5; for (var w = 0; w < 3; w++) { var a = dreh + w * 2.094; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a) * rr * 0.48, cy + Math.sin(a) * rr * 0.48); g.stroke(); }
      });
      // Rundumleuchte und Rücklicht
      g.fillStyle = (Math.floor(uhr * 4) % 2) ? '#ff8a00' : '#ffb347'; g.beginPath(); g.arc(X(1000), Y(2200), 55 * m, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#e03131'; g.fillRect(X(1975), Y(1000), 25 * m, 90 * m);
    }
    function zeichnen() {
      g.fillStyle = '#ffffff'; g.fillRect(0, 0, B, H);
      // Boden: zarter Schatten, sonst weiß
      var bs = g.createLinearGradient(0, boden - 6, 0, boden + 30); bs.addColorStop(0, 'rgba(0,0,0,0)'); bs.addColorStop(0.3, 'rgba(30,42,51,.07)'); bs.addColorStop(1, 'rgba(30,42,51,0)');
      g.fillStyle = bs; g.fillRect(0, boden - 6, B, 36);
      gestell();
      bandZeichnen();
      // Kartons auf dem Band (links zuerst, damit rechte Seiten richtig überdecken)
      kisten.forEach(function (q) { karton(q.x + z0 * OX, bandY + z0 * OY, q.abw, KW, KH, KD, 0, q.erkannt ? 0.55 : 1); });
      if (palette.da) {
        paletteZeichnen(palette.x, boden);
        palette.voll.forEach(function (n, i) { var sl = slot(i); karton(sl.x + 4 * k * OX, sl.y + 4 * k * OY, n.abw, KW, KH, KD); });
      }
      fallend.forEach(function (f) { karton(f.x, f.y, f.abw, KW, KH, KD, f.rot); });
      if (stapler.zustand !== 'weg') staplerZeichnen(stapler);
    }

    /* ---------- Bewegung ---------- */
    function freieStelle() { return palette.da && stapler.zustand === 'weg' ? palette.voll.length + fallend.length : 99; }
    function schritt(dt) {
      uhr += dt;
      var dx = tempo() * dt;
      weg += dx;
      // Kartons auf dem Band: am Ende abwerfen, bei voller/fehlender Palette kurz stauen
      for (var i = kisten.length - 1; i >= 0; i--) {
        var q = kisten[i], vor = kisten[i + 1];
        var ziel = q.x + dx;
        if (vor && ziel > vor.x - KW - 8 * k) ziel = Math.max(q.x, vor.x - KW - 8 * k);
        var ende = xE - KW * 0.55;
        if (ziel >= ende) {
          if (freieStelle() < 6) {
            kisten.splice(i, 1);
            var sl = slot(palette.voll.length + fallend.length), fy = bandY + z0 * OY, ty = sl.y + 4 * k * OY, t = Math.sqrt(2 * Math.max(10, ty - fy) / 1800);
            fallend.push({ x: ende + z0 * OX, y: fy, vx: (sl.x + 4 * k * OX - (ende + z0 * OX)) / t, vy: 0, zielY: ty, zielX: sl.x + 4 * k * OX, rot: 0, vr: (Math.random() - 0.3) * 2.2, abw: q.abw, bounce: 0 });
            continue;
          }
          ziel = Math.min(ziel, ende);
        }
        q.x = ziel;
        var drin = imFenster(q);
        if (q.abw && drin && !q.startZeit) q.startZeit = Z.jetzt();
        if (q.abw && q.imFenster && !drin && !q.gewertet) { q.gewertet = true; ctx.onEvent({ korrekt: false, auslassung: true, reiz: 'abweichung', reaktion: 'nicht im fenster', seite: 'mitte' }); }
        q.imFenster = drin;
      }
      // Nachschub links
      var erstes = kisten[0];
      if (!erstes || erstes.x - p.abstandPx > -KW * 1.6) neueKiste((erstes ? erstes.x : 0) - p.abstandPx);
      // Fallende Kartons: Schwerkraft, leichte Drehung, kurzer Aufprall
      for (var j = fallend.length - 1; j >= 0; j--) {
        var f = fallend[j];
        f.vy += 1800 * dt; f.x += f.vx * dt; f.y += f.vy * dt; f.rot += f.vr * dt;
        if (f.y >= f.zielY) {
          if (f.bounce === 0 && f.vy > 260) { f.y = f.zielY; f.vy = -f.vy * 0.18; f.vx = (f.zielX - f.x) / 0.12; f.vr = -f.rot / 0.12; f.bounce = 1; continue; }
          fallend.splice(j, 1); palette.voll.push({ abw: f.abw });
          if (palette.voll.length >= 6) staplerLos();
        }
      }
      staplerSchritt(dt);
      zeichnen();
    }
    // Gabelstapler: kommt, hebt, fährt weg, bringt leere Palette, setzt ab, fährt zurück (schnell, ca. 2,5 s)
    function staplerLos() { if (stapler.zustand === 'weg') { stapler.zustand = 'kommt'; stapler.x = B + PW * 0.2; stapler.gabel = 0; } }
    function staplerSchritt(dt) {
      var st = stapler, halt = palette.x + PW + 12 * MM, vF = 1700 * k;
      if (st.zustand === 'kommt') { st.x -= vF * dt; if (st.x <= halt) { st.x = halt; st.zustand = 'heben'; } }
      else if (st.zustand === 'heben') { st.gabel = Math.min(1, st.gabel + dt * 5); if (st.gabel >= 1) { st.last = palette.voll; palette.voll = []; palette.da = false; st.zustand = 'faehrt'; } }
      else if (st.zustand === 'faehrt') { st.x += vF * 1.1 * dt; if (st.x > B + PW + 40 * k) { st.last = []; st.zustand = 'bringt'; st.gabel = 0.6; } }
      else if (st.zustand === 'bringt') { st.x -= vF * 1.1 * dt; if (st.x <= halt) { st.x = halt; st.zustand = 'absetzen'; } }
      else if (st.zustand === 'absetzen') { st.gabel = Math.max(0, st.gabel - dt * 5); if (st.gabel <= 0) { st.last = null; palette.da = true; st.zustand = 'zurueck'; } }
      else if (st.zustand === 'zurueck') { st.x += vF * dt; if (st.x > B + PW + 40 * k) st.zustand = 'weg'; }
    }
    return {
      start: function () {
        for (var x = xE - KW * 1.6; x > -KW * 1.5; x -= p.abstandPx) kisten.unshift({ x: x, abw: false, erkannt: false, gewertet: false, imFenster: false, startZeit: null });
        aus.push(HT.eingabe.an(function (a) { if (a === 'ok') reagieren(null); }));
        frame = Z.frame(schritt);
        zeichnen();
      },
      stop: function () { aus.forEach(function (f) { f(); }); }
    };
  }

  /* Szenario „Nachtfahrt“: Leitpfosten ziehen vorbei, selten steht Wild am Rand; „Radarschirm“: Radarpunkte, selten weicht ein Punkt ab */
  function leitpfosten(abw, stufe) {
    if (!abw) return '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><path d="M42 14 L58 14 L60 96 L40 96 Z" fill="#eef2f4" stroke="#1a2026" stroke-width="2"/><path d="M42 14 L58 14 L58 30 L42 30 Z" fill="#26333c"/><rect x="45" y="34" width="10" height="14" rx="2" fill="#ff9a3c"/></svg>';
    var auge = stufe === 3 ? 'rgba(255,240,170,.55)' : '#fff3a8', koerper = stufe === 1 ? '#8a5a2e' : '#4a3a2c';
    return '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><ellipse cx="50" cy="66" rx="30" ry="14" fill="' + koerper + '"/><path d="M28 70 V96 M40 74 V96 M62 74 V96 M72 70 V96" stroke="' + koerper + '" stroke-width="5"/><ellipse cx="78" cy="48" rx="11" ry="9" fill="' + koerper + '"/><path d="M76 40 L70 22 M82 40 L90 24" stroke="' + koerper + '" stroke-width="3"/><circle cx="82" cy="47" r="' + (stufe === 3 ? 2 : 3) + '" fill="' + auge + '"/></svg>';
  }
  function radarpunkt(abw, stufe) {
    var r = 14, f = '#4dff9a', form = 'kreis';
    if (abw && stufe === 1) f = '#ffd84d';
    if (abw && stufe === 2) r = 20;
    if (abw && stufe === 3) form = 'quadrat';
    return '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="30" fill="rgba(77,255,154,.12)"/>' + (form === 'kreis' ? '<circle cx="50" cy="50" r="' + r + '" fill="' + f + '"/>' : '<rect x="37" y="37" width="26" height="26" fill="' + f + '"/>') + '</svg>';
  }
  function bildFuer(sz, abw, stufe) { return sz === 'nacht' ? leitpfosten(abw, stufe) : sz === 'radar' ? radarpunkt(abw, stufe) : paket(abw, stufe); }

  HT.registerModule({
    id: 'vigilanz', name: 'Vigilanz', kategorie: 'aufmerksamkeit', symbol: 'uhr',
    ziel: 'Aufmerksamkeit in monotonen Situationen über lange Zeit aufrechterhalten',
    beschreibung: 'Auf einem gleichmäßig laufenden Förderband ziehen Pakete vorbei (alternativ: Nachtfahrt mit Leitpfosten oder Radarschirm). Nur selten weicht ein Paket ab. Gedrückt wird erst, wenn dieses Paket im markierten Kontrollfenster ist. Vorher oder nachher zählt nicht. Das Bandtempo kann normal oder schnell gestellt werden.',
    anleitung: 'Pakete fahren auf dem Band vorbei. Drücken Sie die Leertaste nur dann, wenn ein abweichendes Paket im türkisen Fenster ist. Vor dem Fenster und dahinter nicht drücken.',
    tasten: ['ok'],
    levels: levels,
    levelLabels: { abweichungsrate: 'Anteil Abweichungen', unauffaelligkeit: 'Unauffälligkeit (1–3)', tempoPxS: 'Tempo (px/s)', abstandPx: 'Abstand (px)' },
    parameterSchema: {
      dauerDurchgangSek: { typ: 'zahl', label: 'Dauer eines Durchgangs (Sek.)', min: 60, max: 300, schritt: 30, standard: 180 },
      tempo: { typ: 'auswahl', label: 'Bandtempo', standard: 'normal', optionen: [{ wert: 'normal', label: 'Normal' }, { wert: 'schnell', label: 'Schnell' }] },
      szenario: { typ: 'auswahl', label: 'Szenario', standard: 'band', optionen: [{ wert: 'band', label: 'Förderband (Pakete)' }, { wert: 'nacht', label: 'Nachtfahrt (Leitpfosten, selten Wild am Rand)' }, { wert: 'radar', label: 'Radarschirm (seltene Abweichung eines Punktes)' }] }
    },
    create: function (container, ctx) {
      var p = ctx.params, Z = HT.zeit;
      var voll = HT.m.neu(container, 'm-voll');
      var sz = p.szenario || 'band';
      if (sz === 'nacht') { voll.style.background = 'linear-gradient(#0b1220 0%, #141c2b 55%, #1d232b 56%, #2a3038 100%)'; }
      if (sz === 'radar') { voll.style.background = 'radial-gradient(circle at 50% 55%, #0f3b26 0%, #06180f 70%)'; }
      var normalName = sz === 'nacht' ? 'Normaler Leitpfosten' : sz === 'radar' ? 'Normaler Punkt' : 'Normales Paket';
      if (sz === 'band') return bandSpiel(container, ctx, voll, '<div class="m-anweisung" style="display:inline-flex;align-items:center;margin:0">Normales Paket:&nbsp;<span style="width:60px;height:60px;display:inline-block">' + karton3d(false) + '</span></div>');
      var musterBox = HT.m.neu(voll, 'm-oben', '<div class="m-anweisung" style="display:inline-flex;align-items:center;margin:0;' + (sz !== 'band' ? 'color:#dfe8ec' : '') + '">' + normalName + ':&nbsp;<span style="width:56px;height:56px;display:inline-block;' + (sz !== 'band' ? 'background:rgba(255,255,255,.08);border-radius:10px' : '') + '">' + bildFuer(sz, false) + '</span></div>');
      var bandStil = sz === 'nacht' ? 'repeating-linear-gradient(90deg,#e8e8e8 0 40px,transparent 40px 90px)' : sz === 'radar' ? 'repeating-linear-gradient(90deg,rgba(77,255,154,.35) 0 2px,transparent 2px 36px)' : 'repeating-linear-gradient(90deg,#8c98a3 0 18px,#6f7b86 18px 36px)';
      var band = HT.m.neu(voll, '', '', { position: 'absolute', left: '0', right: '0', top: '55%', height: sz === 'nacht' ? '10px' : '28px', background: bandStil, borderTop: sz === 'band' ? '4px solid #26333c' : '0', borderBottom: sz === 'band' ? '4px solid #26333c' : '0' });
      HT.m.neu(voll, '', 'Fenster', { position: 'absolute', left: '50%', top: 'calc(55% - 148px)', width: '150px', marginLeft: '-75px', textAlign: 'center', fontWeight: '700', color: '#1BA8B5', zIndex: 2 });
      HT.m.neu(voll, '', '', { position: 'absolute', left: '50%', top: 'calc(55% - 128px)', width: '150px', height: '132px', marginLeft: '-75px', border: '3px solid #1BA8B5', borderRadius: '16px', pointerEvents: 'none', zIndex: 2 });
      var pakete = [], frame = null, aus = [], weg = 0, b = container.clientWidth;
      var gross = 120;
      function neuesPaket(x) {
        var abw = HT.zufall.chance(p.abweichungsrate);
        var el = HT.el('div', { class: 'm-symbol', html: bildFuer(sz, abw, p.unauffaelligkeit), style: { position: 'absolute', width: gross + 'px', height: gross + 'px', top: 'calc(55% - ' + gross + 'px + 4px)', left: '0', cursor: 'pointer', transform: 'translateX(' + Math.round(x) + 'px)', willChange: 'transform' } });
        voll.appendChild(el);
        var pk = { el: el, x: x, abw: abw, gesehen: false, erkannt: false, gewertet: false, imFenster: false, startZeit: null };
        HT.tap(el, function () { reagieren(pk); });
        pakete.push(pk);
      }
      function imFenster(q) {
        var mitte = q.x + gross / 2;
        return mitte > b * 0.5 - 75 && mitte < b * 0.5 + 75;
      }
      function reagieren(pk) {
        if (!pk) {
          var im = pakete.filter(function (q) { return q.abw && !q.erkannt && imFenster(q); });
          pk = im[0] || null;
        }
        if (pk && pk.abw && !pk.erkannt && imFenster(pk)) {
          pk.erkannt = true;
          pk.gewertet = true;
          pk.el.style.opacity = '.45';
          var r = pk.el.getBoundingClientRect(), c = container.getBoundingClientRect();
          ctx.onEvent({ korrekt: true, reiz: 'abweichung', reaktion: 'im fenster', rtMs: Z.jetzt() - (pk.startZeit || Z.jetzt()), seite: 'mitte' });
          ctx.feedback(true, r.left - c.left + gross / 2, r.top - c.top + gross / 2);
        } else {
          ctx.onEvent({ korrekt: false, reiz: pk && pk.abw ? 'abweichung ausserhalb' : 'normal', reaktion: 'reagiert', typ: 'fehlreaktion' });
          ctx.feedback(false, null, null, { dauer: 350 });
        }
      }
      return {
        start: function () {
          b = container.clientWidth;
          for (var x = b - gross; x > -gross * 1.5; x -= p.abstandPx) { neuesPaket(x); }
          pakete.forEach(function (q) { q.abw = false; q.el.innerHTML = bildFuer(sz, false); });
          aus.push(HT.eingabe.an(function (a) { if (a === 'ok') reagieren(null); }));
          frame = Z.frame(function (dt) {
            var dx = p.tempoPxS * (p.tempo === 'schnell' ? 1.45 : 1) * dt;
            weg += dx;
            // Das Band läuft sichtbar mit derselben Geschwindigkeit wie die Pakete
            band.style.backgroundPosition = (weg % 36).toFixed(2) + 'px 0';
            pakete.forEach(function (q) {
              q.x += dx;
              // ohne Runden und auf der Grafikkarte: gleichmäßige, ruckelfreie Bewegung, dazu leichte Bewegungsunschärfe
              q.el.style.transform = 'translate3d(' + q.x.toFixed(2) + 'px,0,0)';
              if (!q.mb) q.mb = HT.bewegungsUnschaerfe.element(q.el);
              if (dt > 0) q.mb(dx / dt, 0);
              var drin = imFenster(q);
              if (q.abw && drin && !q.startZeit) q.startZeit = Z.jetzt();
              if (q.abw && q.imFenster && !drin && !q.gewertet) {
                q.gewertet = true;
                ctx.onEvent({ korrekt: false, auslassung: true, reiz: 'abweichung', reaktion: 'nicht im fenster', seite: 'mitte' });
              }
              q.imFenster = drin;
            });
            while (pakete.length && pakete[0].x > b + 10) {
              var alt = pakete.shift();
              if (alt.mb) alt.mb.entfernen();
              alt.el.remove();
            }
            var letztes = pakete[pakete.length - 1];
            if (!letztes || letztes.x - p.abstandPx > -gross * 1.5) neuesPaket((letztes ? letztes.x : 0) - p.abstandPx);
          });
        },
        stop: function () { aus.forEach(function (f) { f(); }); pakete.forEach(function (q) { if (q.mb) q.mb.entfernen(); }); }
      };
    },
    preview: function (el) {
      var szene = function (off, abw, klick) {
        var s = '<svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg"><rect width="400" height="300" fill="#fff"/>' +
          '<path d="M0 196 L300 196 L322 180 L22 180 Z" fill="#3a4248"/><rect x="0" y="196" width="300" height="12" fill="#b5bec5" stroke="#6b767e"/>' +
          '<path d="M40 208 V280 M150 208 V280 M290 208 V280" stroke="#7d8a93" stroke-width="7"/><path d="M40 270 L290 270" stroke="#59656d" stroke-width="3"/>' +
          '<path d="M318 274 L388 274 L398 266 L328 266 Z" fill="#e2be8a" stroke="#7a5a33"/><rect x="318" y="274" width="70" height="8" fill="#d8b07a" stroke="#7a5a33"/>';
        for (var i = 0; i < 4; i++) {
          var x = -70 + i * 95 + off;
          if (x > 250) continue;
          s += '<g transform="translate(' + x + ' 112) scale(.8)">' + karton3d(abw === i, 1).replace(/<svg[^>]*>|<\/svg>/g, '') + '</g>';
        }
        s += '<g transform="translate(318 214) scale(.6)">' + karton3d(false).replace(/<svg[^>]*>|<\/svg>/g, '') + '</g>';
        return s + '</svg>';
      };
      return HT.beispiel(el, [
        { svg: szene(0, -1), text: 'Pakete fahren vorbei …', dauer: 900 },
        { svg: szene(40, -1), dauer: 900 },
        { svg: szene(80, 1), text: 'Anderes Etikett!', dauer: 900 },
        { svg: szene(110, 1) + '', zeiger: [56, 50], klick: true, text: 'Im Fenster drücken', dauer: 1400 }
      ]);
    }
  });
})();

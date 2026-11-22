/* Modul: Straßenverkehr – Cockpit-Fahrt, geteilte Aufmerksamkeit.
 * Das Auto hält die Spur selbst. Der Patient regelt das Tempo (Pfeil hoch = Gas, Pfeil runter = Bremse) und reagiert
 * nur auf echte Störungen. Links/rechts sind Abbiegebefehle, nicht das Lenken. Dazu Kontrollleuchten (OK) und
 * Durchsagen (Plustaste).
 * Darstellung: 3D-Landstraße (Segmentverfahren) mit vorgezeichneten Grafiken (Bäume, Häuser, Schilder, Ampeln,
 * Figuren, Fahrzeuge), Cockpit mit Lenkrad, Tacho, Weg-/Zeitbalken, Kontrollleuchten, Radio und Rückspiegel.
 * Alles eigene Zeichnungen, keine Fremdbilder. Aufgabenlogik nach docs/PROMPT_MODULE_FAHREN.md. */
(function () {
  'use strict';
  var HT = window.HT;

  /* =====================================================================
   * Vorgezeichnete Grafiken (einmal erzeugt, danach nur skaliert gezeichnet)
   * ===================================================================== */
  var G = null;
  function leinwand(b, h, fn) { var c = document.createElement('canvas'); c.width = b; c.height = h; fn(c.getContext('2d'), b, h); return c; }
  function zufallGen(seed) { var s = seed % 2147483647; if (s <= 0) s += 2147483646; return function () { s = s * 16807 % 2147483647; return (s - 1) / 2147483646; }; }
  function kreis(g, x, y, r, f) { g.fillStyle = f; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); }
  function schatten(g, x, y, rx, ry, a) { g.save(); g.translate(x, y); g.scale(1, ry / rx); var gr = g.createRadialGradient(0, 0, 0, 0, 0, rx); gr.addColorStop(0, 'rgba(20,35,20,' + a + ')'); gr.addColorStop(1, 'rgba(20,35,20,0)'); g.fillStyle = gr; g.beginPath(); g.arc(0, 0, rx, 0, Math.PI * 2); g.fill(); g.restore(); }
  function rrect(g, x, y, b, h, r) { g.beginPath(); g.moveTo(x + r, y); g.lineTo(x + b - r, y); g.quadraticCurveTo(x + b, y, x + b, y + r); g.lineTo(x + b, y + h - r); g.quadraticCurveTo(x + b, y + h, x + b - r, y + h); g.lineTo(x + r, y + h); g.quadraticCurveTo(x, y + h, x, y + h - r); g.lineTo(x, y + r); g.quadraticCurveTo(x, y, x + r, y); g.closePath(); }

  // Weicher Lichtschein (wird additiv gezeichnet: Scheinwerfer, Laternen, Ampeln, Spiegelungen)
  var GLUT = {};
  function glut(f) {
    if (GLUT[f]) return GLUT[f];
    GLUT[f] = leinwand(128, 128, function (g) {
      var gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
      gr.addColorStop(0, 'rgba(' + f + ',1)'); gr.addColorStop(0.16, 'rgba(' + f + ',.6)'); gr.addColorStop(0.45, 'rgba(' + f + ',.16)'); gr.addColorStop(1, 'rgba(' + f + ',0)');
      g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    });
    return GLUT[f];
  }
  function tropfenBild() {
    return leinwand(40, 40, function (g) {
      var gr = g.createRadialGradient(20, 20, 2, 20, 20, 19); gr.addColorStop(0, 'rgba(210,225,240,.06)'); gr.addColorStop(0.72, 'rgba(230,240,250,.2)'); gr.addColorStop(0.9, 'rgba(255,255,255,.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(20, 20, 19, 0, Math.PI * 2); g.fill();
      g.strokeStyle = 'rgba(0,12,24,.28)'; g.lineWidth = 3; g.beginPath(); g.arc(20, 20, 15, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke();
      kreis(g, 14, 13, 3.5, 'rgba(255,255,255,.9)');
    });
  }
  function laterne() {
    var c = leinwand(170, 560, function (g, b, h) {
      schatten(g, 30, h - 4, 26, 6, 0.3);
      var pg = g.createLinearGradient(22, 0, 38, 0); pg.addColorStop(0, '#59636a'); pg.addColorStop(0.5, '#9aa4ab'); pg.addColorStop(1, '#4b555c');
      g.fillStyle = pg; g.fillRect(24, 70, 12, h - 74); g.fillRect(19, h - 40, 22, 36);
      g.strokeStyle = '#6f7a81'; g.lineWidth = 8; g.lineCap = 'round'; g.beginPath(); g.moveTo(30, 80); g.quadraticCurveTo(32, 30, 90, 34); g.lineTo(132, 38); g.stroke();
      g.fillStyle = '#3a4248'; rrect(g, 104, 30, 60, 18, 8); g.fill();
      g.fillStyle = '#f4f1e2'; rrect(g, 110, 44, 48, 8, 4); g.fill();
    });
    c.kopf = [134 / 170, 50 / 560];
    return c;
  }
  function blatt(farbe, form) {
    return leinwand(64, 64, function (g) {
      g.translate(32, 32);
      var gr = g.createLinearGradient(-26, -16, 26, 16); gr.addColorStop(0, farbe[0]); gr.addColorStop(1, farbe[1]); g.fillStyle = gr;
      g.beginPath();
      if (form === 0) { g.moveTo(-28, 0); g.quadraticCurveTo(-6, -19, 25, -2); g.quadraticCurveTo(29, 0, 25, 2); g.quadraticCurveTo(-6, 19, -28, 0); }
      else if (form === 1) { for (var i = 0; i < 10; i++) { var w = i / 10 * Math.PI * 2 - Math.PI / 2, r = i % 2 ? 11 : 28; if (i) g.lineTo(Math.cos(w) * r, Math.sin(w) * r + 3); else g.moveTo(Math.cos(w) * r, Math.sin(w) * r + 3); } }
      else g.ellipse(0, 0, 25, 17, 0.3, 0, Math.PI * 2);
      g.closePath(); g.fill();
      g.strokeStyle = 'rgba(70,35,10,.5)'; g.lineWidth = 1.6; g.beginPath();
      if (form === 1) { for (var k = 0; k < 5; k++) { var a = k / 5 * Math.PI * 2 - Math.PI / 2; g.moveTo(0, 3); g.lineTo(Math.cos(a) * 22, Math.sin(a) * 22 + 3); } g.moveTo(0, 3); g.lineTo(0, 30); }
      else { g.moveTo(-31, 0); g.lineTo(22, 0); for (var j = -16; j < 18; j += 8) { g.moveTo(j, 0); g.lineTo(j + 7, -9); g.moveTo(j, 0); g.lineTo(j + 7, 9); } }
      g.stroke();
      g.fillStyle = 'rgba(255,255,255,.12)'; g.beginPath(); g.ellipse(-6, -6, 12, 5, -0.3, 0, Math.PI * 2); g.fill();
    });
  }
  function blitzerBild() {
    var c = leinwand(130, 380, function (g, b, h) {
      schatten(g, b / 2, h - 4, 34, 7, 0.3);
      var pg = g.createLinearGradient(b / 2 - 8, 0, b / 2 + 8, 0); pg.addColorStop(0, '#5d676e'); pg.addColorStop(0.5, '#a3adb4'); pg.addColorStop(1, '#4f5960');
      g.fillStyle = pg; g.fillRect(b / 2 - 8, 150, 16, h - 154);
      var kg = g.createLinearGradient(0, 30, 0, 160); kg.addColorStop(0, '#c9d0d4'); kg.addColorStop(1, '#8c969c');
      g.fillStyle = kg; rrect(g, 14, 30, b - 28, 130, 10); g.fill();
      g.strokeStyle = '#4b555b'; g.lineWidth = 3; rrect(g, 14, 30, b - 28, 130, 10); g.stroke();
      g.fillStyle = '#1b2125'; rrect(g, 26, 48, b - 52, 44, 8); g.fill();
      kreis(g, b / 2 - 16, 70, 13, '#2d3a44'); kreis(g, b / 2 - 16, 70, 7, '#5d7f99'); kreis(g, b / 2 - 19, 67, 2.5, 'rgba(255,255,255,.8)');
      g.fillStyle = '#e9edf0'; rrect(g, b / 2 + 4, 56, 24, 28, 4); g.fill();
      g.fillStyle = '#d32f2f'; g.fillRect(14, 112, b - 28, 14);
      g.fillStyle = '#fff'; g.font = '800 13px -apple-system, Helvetica, sans-serif'; g.textAlign = 'center'; g.fillText('RADAR', b / 2, 147);
    });
    c.blitz = [(130 / 2 + 16) / 130, 70 / 380];
    return c;
  }
  function laubbaum(seed, pal) {
    var R = zufallGen(seed);
    return leinwand(240, 300, function (g, b, h) {
      schatten(g, b / 2, h - 6, b * 0.42, 14, 0.35);
      var st = g.createLinearGradient(b / 2 - 10, 0, b / 2 + 10, 0); st.addColorStop(0, '#5a3b22'); st.addColorStop(0.5, '#7a5332'); st.addColorStop(1, '#4b301c');
      g.fillStyle = st; g.beginPath(); g.moveTo(b / 2 - 11, h - 4); g.quadraticCurveTo(b / 2 - 6, h * 0.6, b / 2 - 5, h * 0.42); g.lineTo(b / 2 + 5, h * 0.42); g.quadraticCurveTo(b / 2 + 6, h * 0.6, b / 2 + 11, h - 4); g.closePath(); g.fill();
      g.strokeStyle = '#5a3b22'; g.lineWidth = 5; g.beginPath(); g.moveTo(b / 2, h * 0.55); g.lineTo(b / 2 - 34, h * 0.4); g.moveTo(b / 2, h * 0.5); g.lineTo(b / 2 + 30, h * 0.36); g.stroke();
      var cx = b / 2, cy = h * 0.36, rx = b * 0.4, ry = h * 0.27, blobs = [], i;
      for (i = 0; i < 26; i++) { var a = R() * Math.PI * 2, r = Math.sqrt(R()); blobs.push([cx + Math.cos(a) * rx * r * 0.85, cy + Math.sin(a) * ry * r * 0.85, b * (0.1 + R() * 0.09)]); }
      blobs.sort(function (p, q) { return p[1] - q[1]; });
      blobs.forEach(function (p) { kreis(g, p[0] + 5, p[1] + 7, p[2], pal[0]); });
      blobs.forEach(function (p) { kreis(g, p[0], p[1], p[2] * 0.94, pal[1]); });
      blobs.forEach(function (p) { if (p[1] < cy + ry * 0.2) kreis(g, p[0] - p[2] * 0.25, p[1] - p[2] * 0.3, p[2] * 0.55, pal[2]); });
      for (i = 0; i < 40; i++) kreis(g, cx + (R() - 0.5) * rx * 1.6, cy + (R() - 0.6) * ry * 1.5, 2 + R() * 3, R() < 0.5 ? pal[2] : pal[3]);
    });
  }
  function tanne(seed) {
    var R = zufallGen(seed);
    return leinwand(180, 320, function (g, b, h) {
      schatten(g, b / 2, h - 6, b * 0.36, 12, 0.35);
      g.fillStyle = '#4b301c'; g.fillRect(b / 2 - 7, h - 40, 14, 38);
      for (var i = 0; i < 8; i++) {
        var t = i / 8, yb = h - 30 - t * (h - 60), br = b * (0.48 - t * 0.4), ho = (h - 50) / 8 * 2.1;
        g.fillStyle = i % 2 ? '#24603a' : '#2a6d41'; g.beginPath(); g.moveTo(b / 2, yb - ho);
        for (var z = 0; z <= 7; z++) g.lineTo(b / 2 + br - 2 * br * z / 7, yb + (z % 2 ? -6 : 4) * (0.6 + R() * 0.6));
        g.closePath(); g.fill();
        g.fillStyle = 'rgba(160,220,150,.18)'; g.beginPath(); g.moveTo(b / 2, yb - ho); g.lineTo(b / 2 + br * 0.9, yb); g.lineTo(b / 2 + br * 0.25, yb); g.closePath(); g.fill();
      }
    });
  }
  function birke(seed) {
    var R = zufallGen(seed);
    return leinwand(160, 300, function (g, b, h) {
      schatten(g, b / 2, h - 5, b * 0.35, 10, 0.3);
      g.fillStyle = '#eceae2'; g.fillRect(b / 2 - 5, h * 0.3, 10, h * 0.7 - 4);
      g.fillStyle = '#2d2b28'; for (var i = 0; i < 14; i++) g.fillRect(b / 2 - 5 + R() * 4, h * 0.32 + R() * h * 0.62, 4 + R() * 5, 2 + R() * 2);
      var cols = ['#6fae4e', '#86c25c', '#a2d46e'];
      for (i = 0; i < 34; i++) { var a = R() * Math.PI * 2, r = Math.sqrt(R()); kreis(g, b / 2 + Math.cos(a) * b * 0.36 * r, h * 0.3 + Math.sin(a) * h * 0.22 * r, 7 + R() * 9, cols[Math.floor(R() * 3)]); }
    });
  }
  function busch(seed) {
    var R = zufallGen(seed);
    return leinwand(200, 120, function (g, b, h) {
      schatten(g, b / 2, h - 6, b * 0.45, 10, 0.3);
      var pal = ['#356f35', '#468a43', '#64a858'];
      for (var p = 0; p < 3; p++) for (var i = 0; i < 12; i++) kreis(g, b * 0.15 + R() * b * 0.7, h - 22 - R() * h * 0.5 + p * 4, 14 + R() * 14 - p * 3, pal[p]);
      for (i = 0; i < 6; i++) kreis(g, b * 0.2 + R() * b * 0.6, h * 0.35 + R() * h * 0.4, 3, ['#f2f2f2', '#f5d34c', '#e86b8a'][i % 3]);
    });
  }
  function haus(seed) {
    var R = zufallGen(seed);
    var wand = ['#f1e6cf', '#f3dccf', '#e3ebf2', '#ece6f4', '#f7efd2', '#e6e2d8'][Math.floor(R() * 6)], dach = ['#a8462f', '#8d3f2f', '#5f6a72', '#7a4a34'][Math.floor(R() * 4)], stock = R() < 0.5 ? 2 : 1;
    var fenster = [], R2 = zufallGen(seed * 7 + 3);
    var bild = leinwand(420, 360, function (g, b, h) {
      var bw = b * 0.8, x0 = (b - bw) / 2, wh = stock === 2 ? h * 0.5 : h * 0.34, y0 = h - wh - 6, dh = h * 0.3;
      schatten(g, b / 2, h - 4, b * 0.48, 14, 0.3);
      g.fillStyle = wand; g.fillRect(x0, y0, bw, wh);
      var wg = g.createLinearGradient(x0, 0, x0 + bw, 0); wg.addColorStop(0, 'rgba(255,255,255,.08)'); wg.addColorStop(1, 'rgba(0,0,0,.08)'); g.fillStyle = wg; g.fillRect(x0, y0, bw, wh);
      g.fillStyle = 'rgba(0,0,0,.12)'; g.fillRect(x0, y0, bw, 10);
      g.fillStyle = dach; g.beginPath(); g.moveTo(x0 - 18, y0 + 4); g.lineTo(x0 + bw * 0.2, y0 - dh); g.lineTo(x0 + bw * 0.8, y0 - dh); g.lineTo(x0 + bw + 18, y0 + 4); g.closePath(); g.fill();
      g.strokeStyle = 'rgba(0,0,0,.18)'; g.lineWidth = 2;
      for (var k = 1; k < 6; k++) { var yy = y0 + 4 - dh * k / 6, t = k / 6; g.beginPath(); g.moveTo(x0 - 18 + (bw * 0.2 + 18) * t, yy); g.lineTo(x0 + bw + 18 - (bw * 0.2 + 18) * t, yy); g.stroke(); }
      g.fillStyle = '#7d4b38'; g.fillRect(x0 + bw * 0.68, y0 - dh - 18, 22, 40);
      for (var rr = 0; rr < stock; rr++) for (var c = 0; c < 3; c++) {
        if (rr === stock - 1 && c === 1) continue;
        var fx = x0 + bw * (0.12 + c * 0.3), fy = y0 + 22 + rr * wh * 0.48, fb = bw * 0.16, fh = wh * (stock === 2 ? 0.26 : 0.4);
        g.fillStyle = '#fff'; g.fillRect(fx - 4, fy - 4, fb + 8, fh + 8);
        var gl = g.createLinearGradient(fx, fy, fx + fb, fy + fh); gl.addColorStop(0, '#6f9fbf'); gl.addColorStop(0.5, '#a9cde0'); gl.addColorStop(1, '#5b87a5');
        g.fillStyle = gl; g.fillRect(fx, fy, fb, fh); fenster.push([fx, fy, fb, fh]);
        g.fillStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.moveTo(fx, fy + fh * 0.6); g.lineTo(fx + fb * 0.6, fy); g.lineTo(fx + fb * 0.85, fy); g.lineTo(fx, fy + fh * 0.85); g.closePath(); g.fill();
        g.fillStyle = '#fff'; g.fillRect(fx + fb / 2 - 2, fy, 4, fh); g.fillRect(fx, fy + fh / 2 - 2, fb, 4);
        g.fillStyle = 'rgba(60,90,60,.75)'; g.fillRect(fx - 14, fy - 4, 9, fh + 8); g.fillRect(fx + fb + 5, fy - 4, 9, fh + 8);
      }
      var tx = x0 + bw * 0.42, tb = bw * 0.16, th = wh * (stock === 2 ? 0.38 : 0.6);
      g.fillStyle = '#6e452c'; g.fillRect(tx, h - 6 - th, tb, th); kreis(g, tx + tb * 0.8, h - 6 - th * 0.45, 3, '#c9a15a');
      for (var bu = 0; bu < 8; bu++) kreis(g, x0 + 10 + R() * 50, h - 14 - R() * 14, 10 + R() * 6, bu % 2 ? '#4f8a41' : '#63a656');
    });
    // Leuchtende Fenster (nur nachts, additiv über das Haus gelegt)
    bild.licht = leinwand(420, 360, function (g) {
      fenster.forEach(function (f) {
        if (R2() > 0.62) return;
        var lg = g.createLinearGradient(0, f[1], 0, f[1] + f[3]); lg.addColorStop(0, 'rgba(255,200,120,.95)'); lg.addColorStop(1, 'rgba(255,150,70,.85)');
        g.fillStyle = lg; g.fillRect(f[0], f[1], f[2], f[3]);
        g.fillStyle = 'rgba(30,14,0,.6)'; g.fillRect(f[0] + f[2] / 2 - 2, f[1], 4, f[3]); g.fillRect(f[0], f[1] + f[3] / 2 - 2, f[2], 4);
      });
    });
    return bild;
  }
  function zaun() { return leinwand(400, 90, function (g, b, h) { g.fillStyle = '#8b6a46'; for (var x = 6; x < b; x += 78) g.fillRect(x, 8, 9, h - 10); g.fillStyle = '#9d7b55'; g.fillRect(0, 22, b, 7); g.fillRect(0, 50, b, 7); }); }

  function person(farbe, hose, phase, stehend) {
    return leinwand(120, 260, function (g, b, h) {
      schatten(g, b / 2, h - 5, 34, 7, 0.35);
      var sw = stehend ? 0 : Math.sin(phase * Math.PI / 2) * 22, cx = b / 2;
      g.strokeStyle = hose; g.lineWidth = 15; g.lineCap = 'round';
      g.beginPath(); g.moveTo(cx, h - 120); g.lineTo(cx - sw, h - 10); g.moveTo(cx, h - 120); g.lineTo(cx + sw, h - 10); g.stroke();
      g.fillStyle = '#2b2b2b'; g.fillRect(cx - sw - 12, h - 14, 22, 10); g.fillRect(cx + sw - 10, h - 14, 22, 10);
      g.strokeStyle = farbe; g.lineWidth = 12; g.beginPath(); g.moveTo(cx, h - 200); g.lineTo(cx + sw * 0.8, h - 130); g.stroke();
      g.fillStyle = farbe; g.beginPath(); g.moveTo(cx - 22, h - 118); g.lineTo(cx + 22, h - 118); g.lineTo(cx + 19, h - 205); g.quadraticCurveTo(cx, h - 214, cx - 19, h - 205); g.closePath(); g.fill();
      var kg = g.createLinearGradient(cx - 22, 0, cx + 22, 0); kg.addColorStop(0, 'rgba(255,255,255,.12)'); kg.addColorStop(1, 'rgba(0,0,0,.25)'); g.fillStyle = kg; g.fill();
      g.strokeStyle = farbe; g.beginPath(); g.moveTo(cx, h - 200); g.lineTo(cx - sw * 0.8, h - 130); g.stroke();
      kreis(g, cx, h - 228, 18, '#f0c8a0'); g.fillStyle = '#4a3324'; g.beginPath(); g.arc(cx, h - 232, 19, Math.PI * 1.05, Math.PI * 1.95); g.fill();
    });
  }
  function reh(phase) {
    return leinwand(260, 230, function (g, b, h) {
      schatten(g, b / 2, h - 5, 90, 9, 0.3);
      var sw = Math.sin(phase * Math.PI / 2) * 14;
      g.strokeStyle = '#8a5a2e'; g.lineWidth = 9; g.lineCap = 'round';
      [[70, sw], [90, -sw], [170, -sw], [190, sw]].forEach(function (l) { g.beginPath(); g.moveTo(l[0], h - 100); g.lineTo(l[0] + l[1], h - 8); g.stroke(); });
      var kg = g.createLinearGradient(0, h - 150, 0, h - 80); kg.addColorStop(0, '#b67a42'); kg.addColorStop(1, '#8f5c2f');
      g.fillStyle = kg; g.beginPath(); g.ellipse(130, h - 112, 78, 34, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#f2e6d4'; g.beginPath(); g.ellipse(58, h - 112, 14, 18, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#a86e3a'; g.beginPath(); g.moveTo(190, h - 130); g.lineTo(212, h - 182); g.lineTo(232, h - 176); g.lineTo(208, h - 118); g.closePath(); g.fill();
      g.beginPath(); g.ellipse(226, h - 186, 22, 15, 0.3, 0, Math.PI * 2); g.fill();
      kreis(g, 230, h - 190, 3, '#26333c'); kreis(g, 246, h - 182, 4, '#26333c');
      g.fillStyle = '#a86e3a'; g.beginPath(); g.ellipse(214, h - 206, 6, 14, -0.4, 0, Math.PI * 2); g.fill();
    });
  }
  function hund(phase) {
    return leinwand(180, 130, function (g, b, h) {
      schatten(g, b / 2, h - 4, 60, 7, 0.3);
      var sw = Math.sin(phase * Math.PI / 2) * 10;
      g.strokeStyle = '#b58a50'; g.lineWidth = 8; g.lineCap = 'round';
      [[50, sw], [64, -sw], [116, -sw], [130, sw]].forEach(function (l) { g.beginPath(); g.moveTo(l[0], h - 50); g.lineTo(l[0] + l[1], h - 6); g.stroke(); });
      g.fillStyle = '#c49a5a'; g.beginPath(); g.ellipse(90, h - 58, 52, 20, 0, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.ellipse(148, h - 80, 20, 17, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#8a6434'; g.beginPath(); g.ellipse(140, h - 92, 8, 14, 0.5, 0, Math.PI * 2); g.fill();
      kreis(g, 166, h - 80, 4, '#26333c');
      g.strokeStyle = '#c49a5a'; g.lineWidth = 6; g.beginPath(); g.moveTo(40, h - 64); g.quadraticCurveTo(20, h - 84, 26, h - 96); g.stroke();
    });
  }
  function kisten() {
    return leinwand(240, 170, function (g, b, h) {
      schatten(g, b / 2, h - 6, 110, 12, 0.35);
      function kiste(x, y, w, hh) {
        var kg = g.createLinearGradient(x, y, x + w, y + hh); kg.addColorStop(0, '#d9a866'); kg.addColorStop(1, '#a8743a');
        g.fillStyle = kg; g.fillRect(x, y, w, hh); g.strokeStyle = '#7a5226'; g.lineWidth = 4; g.strokeRect(x + 2, y + 2, w - 4, hh - 4);
        g.beginPath(); g.moveTo(x + 4, y + 4); g.lineTo(x + w - 4, y + hh - 4); g.moveTo(x + w - 4, y + 4); g.lineTo(x + 4, y + hh - 4); g.stroke();
      }
      kiste(20, h - 86, 100, 80); kiste(116, h - 72, 90, 66); kiste(64, h - 150, 84, 66);
    });
  }
  function ball() {
    return leinwand(80, 80, function (g, b, h) {
      schatten(g, b / 2, h - 4, 30, 6, 0.35);
      var bg = g.createRadialGradient(30, 28, 4, 40, 40, 34); bg.addColorStop(0, '#ff8a80'); bg.addColorStop(1, '#c62828');
      g.fillStyle = bg; g.beginPath(); g.arc(40, 40, 32, 0, Math.PI * 2); g.fill();
      g.fillStyle = 'rgba(255,255,255,.9)'; g.beginPath(); g.arc(40, 40, 32, -0.4, 0.4); g.lineTo(40, 40); g.fill(); g.beginPath(); g.arc(40, 40, 32, Math.PI - 0.4, Math.PI + 0.4); g.lineTo(40, 40); g.fill();
    });
  }
  function pfosten(g, b, h, top) { var pg = g.createLinearGradient(b / 2 - 5, 0, b / 2 + 5, 0); pg.addColorStop(0, '#8b969d'); pg.addColorStop(1, '#c6cdd2'); g.fillStyle = pg; g.fillRect(b / 2 - 5, top, 10, h - top); }
  function limitSchild(wert) {
    return leinwand(140, 300, function (g, b, h) {
      pfosten(g, b, h, 110);
      kreis(g, b / 2, 66, 62, '#fff');
      g.strokeStyle = '#d32f2f'; g.lineWidth = 14; g.beginPath(); g.arc(b / 2, 66, 54, 0, Math.PI * 2); g.stroke();
      g.strokeStyle = 'rgba(0,0,0,.18)'; g.lineWidth = 2; g.beginPath(); g.arc(b / 2, 66, 62, 0, Math.PI * 2); g.stroke();
      g.fillStyle = '#1e2a33'; g.font = '800 ' + (wert >= 100 ? 44 : 52) + 'px "Helvetica Neue", Helvetica, Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(wert), b / 2, 70);
    });
  }
  function stoppSchild() {
    return leinwand(150, 310, function (g, b, h) {
      pfosten(g, b, h, 120);
      g.save(); g.translate(b / 2, 70);
      function acht(r, f) { g.fillStyle = f; g.beginPath(); for (var i = 0; i < 8; i++) { var w = i / 8 * Math.PI * 2 + Math.PI / 8; if (i === 0) g.moveTo(Math.cos(w) * r, Math.sin(w) * r); else g.lineTo(Math.cos(w) * r, Math.sin(w) * r); } g.closePath(); g.fill(); }
      acht(66, '#fff'); acht(58, '#d32f2f');
      g.fillStyle = '#fff'; g.font = '800 36px "Helvetica Neue", Helvetica, Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('STOP', 0, 2);
      g.restore();
    });
  }
  function ampel(zustand) {
    return leinwand(110, 420, function (g, b, h) {
      var pg = g.createLinearGradient(b / 2 - 7, 0, b / 2 + 7, 0); pg.addColorStop(0, '#4d585f'); pg.addColorStop(1, '#7c878e');
      g.fillStyle = pg; g.fillRect(b / 2 - 7, 170, 14, h - 170);
      g.fillStyle = '#1b2125'; rrect(g, b / 2 - 34, 8, 68, 176, 10); g.fill(); g.fillStyle = '#2a3238'; g.fillRect(b / 2 - 34, 14, 8, 164);
      [['rot', '#ff3b30', 36], ['gelb', '#ffcc00', 96], ['gruen', '#30d158', 156]].forEach(function (l) {
        var an = zustand === l[0];
        if (an) { var lg = g.createRadialGradient(b / 2, l[2], 4, b / 2, l[2], 52); lg.addColorStop(0, l[1]); lg.addColorStop(1, 'rgba(0,0,0,0)'); g.globalAlpha = 0.6; g.fillStyle = lg; g.fillRect(0, l[2] - 52, b, 104); g.globalAlpha = 1; }
        kreis(g, b / 2, l[2], 22, an ? l[1] : '#3a444b');
        if (an) kreis(g, b / 2 - 7, l[2] - 7, 7, 'rgba(255,255,255,.55)');
        g.fillStyle = '#1b2125'; g.fillRect(b / 2 - 30, l[2] - 30, 60, 6);
      });
    });
  }
  function andreas(phase) {
    return leinwand(220, 360, function (g, b, h) {
      g.fillStyle = '#9aa5ad'; g.fillRect(b / 2 - 6, 60, 12, h - 60);
      g.save(); g.translate(b / 2, 70); [0.6, -0.6].forEach(function (r) { g.save(); g.rotate(r); g.fillStyle = '#fff'; g.fillRect(-96, -14, 192, 28); g.fillStyle = '#d32f2f'; for (var i = -96; i < 96; i += 48) g.fillRect(i, -14, 24, 28); g.strokeStyle = '#d32f2f'; g.lineWidth = 3; g.strokeRect(-96, -14, 192, 28); g.restore(); }); g.restore();
      g.fillStyle = '#1b2125'; rrect(g, b / 2 - 60, 160, 120, 46, 10); g.fill();
      kreis(g, b / 2 - 30, 183, 17, phase === 1 ? '#ff3b30' : '#4a1f1f'); kreis(g, b / 2 + 30, 183, 17, phase === 2 ? '#ff3b30' : '#4a1f1f');
      if (phase) { var cx = b / 2 + (phase === 1 ? -30 : 30), lg = g.createRadialGradient(cx, 183, 4, cx, 183, 50); lg.addColorStop(0, 'rgba(255,60,48,.7)'); lg.addColorStop(1, 'rgba(255,60,48,0)'); g.fillStyle = lg; g.fillRect(0, 130, b, 110); }
    });
  }
  function schranke() {
    return leinwand(600, 80, function (g, b, h) {
      g.fillStyle = '#fff'; rrect(g, 0, 22, b, 30, 12); g.fill();
      g.fillStyle = '#d32f2f'; for (var x = 30; x < b - 20; x += 80) g.fillRect(x, 22, 40, 30);
      g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = 2; rrect(g, 0, 22, b, 30, 12); g.stroke();
    });
  }
  function tafel(text, farbe) {
    return leinwand(420, 330, function (g, b, h) {
      g.fillStyle = '#6d777e'; g.fillRect(90, 180, 12, h - 180); g.fillRect(b - 102, 180, 12, h - 180);
      g.fillStyle = farbe; g.fillRect(10, 10, b - 20, 180);
      var tg = g.createLinearGradient(0, 10, 0, 190); tg.addColorStop(0, 'rgba(255,255,255,.18)'); tg.addColorStop(1, 'rgba(0,0,0,.25)'); g.fillStyle = tg; g.fillRect(10, 10, b - 20, 180);
      g.strokeStyle = '#f4f6f7'; g.lineWidth = 8; g.strokeRect(14, 14, b - 28, 172);
      g.fillStyle = '#fff'; g.font = '800 40px "Helvetica Neue", Helvetica, Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, b / 2, 100);
    });
  }
  function pfeilSchild(rechts) {
    return leinwand(260, 330, function (g, b, h) {
      g.fillStyle = '#6d777e'; g.fillRect(b / 2 - 7, 150, 14, h - 150);
      g.fillStyle = '#1f5fbf'; rrect(g, 10, 10, b - 20, 150, 18); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 7; rrect(g, 18, 18, b - 36, 134, 14); g.stroke();
      g.save(); g.translate(b / 2, 86); if (!rechts) g.scale(-1, 1);
      g.fillStyle = '#fff'; g.beginPath(); g.moveTo(-70, 18); g.lineTo(10, 18); g.lineTo(10, 44); g.lineTo(70, 0); g.lineTo(10, -44); g.lineTo(10, -18); g.lineTo(-70, -18); g.closePath(); g.fill();
      g.restore();
    });
  }
  function zug() {
    return leinwand(2400, 300, function (g, b, h) {
      for (var w = 0; w < 4; w++) {
        var x = w * 600 + 10, kg = g.createLinearGradient(0, 30, 0, h - 40); kg.addColorStop(0, w === 0 ? '#e23c3c' : '#d9dfe3'); kg.addColorStop(1, w === 0 ? '#9e2222' : '#9aa5ad');
        g.fillStyle = kg; rrect(g, x, 30, 580, h - 80, 26); g.fill();
        g.fillStyle = w === 0 ? '#f4f6f7' : '#c62f2f'; g.fillRect(x, 150, 580, 14);
        g.fillStyle = '#4f6b7a'; for (var f = x + 40; f < x + 540; f += 110) g.fillRect(f, 62, 80, 70);
        g.fillStyle = '#1e2329'; g.fillRect(x, h - 56, 580, 16);
        [x + 80, x + 160, x + 420, x + 500].forEach(function (rx) { kreis(g, rx, h - 34, 28, '#16191c'); });
      }
    });
  }
  function autoVorn(farbe, polizei) {
    return leinwand(420, 300, function (g, b, h) {
      var cx = b / 2;
      schatten(g, cx, h - 8, b * 0.5, 16, 0.45);
      g.fillStyle = '#16191c'; g.fillRect(cx - 190, h - 66, 54, 60); g.fillRect(cx + 136, h - 66, 54, 60);
      g.fillStyle = farbe; g.beginPath(); g.moveTo(cx - 196, h - 30); g.lineTo(cx - 198, h - 118); g.quadraticCurveTo(cx - 190, h - 150, cx - 160, h - 156); g.lineTo(cx + 160, h - 156); g.quadraticCurveTo(cx + 190, h - 150, cx + 198, h - 118); g.lineTo(cx + 196, h - 30); g.closePath(); g.fill();
      var kg = g.createLinearGradient(0, h * 0.3, 0, h); kg.addColorStop(0, 'rgba(255,255,255,.1)'); kg.addColorStop(1, 'rgba(0,0,0,.3)'); g.fillStyle = kg; g.fill();
      if (polizei) { g.fillStyle = '#1f5fbf'; g.fillRect(cx - 197, h - 112, 394, 22); }
      g.fillStyle = polizei ? '#f2f4f5' : farbe; g.beginPath(); g.moveTo(cx - 150, h - 156); g.lineTo(cx - 116, h - 246); g.quadraticCurveTo(cx, h - 258, cx + 116, h - 246); g.lineTo(cx + 150, h - 156); g.closePath(); g.fill();
      var sg = g.createLinearGradient(0, h - 240, 0, h - 160); sg.addColorStop(0, '#3e5866'); sg.addColorStop(1, '#a7c6d4');
      g.fillStyle = sg; g.beginPath(); g.moveTo(cx - 138, h - 162); g.lineTo(cx - 108, h - 236); g.quadraticCurveTo(cx, h - 247, cx + 108, h - 236); g.lineTo(cx + 138, h - 162); g.closePath(); g.fill();
      g.fillStyle = 'rgba(255,255,255,.3)'; g.beginPath(); g.moveTo(cx + 30, h - 162); g.lineTo(cx + 80, h - 238); g.lineTo(cx + 105, h - 236); g.lineTo(cx + 60, h - 162); g.closePath(); g.fill();
      [-1, 1].forEach(function (s) {
        var lx = cx + s * 140, ly = h - 128, lg = g.createRadialGradient(lx, ly, 2, lx, ly, 46); lg.addColorStop(0, 'rgba(255,250,220,.95)'); lg.addColorStop(1, 'rgba(255,250,220,0)');
        g.fillStyle = lg; g.fillRect(lx - 50, ly - 50, 100, 100); g.fillStyle = '#fffbe6'; g.beginPath(); g.ellipse(lx, ly, 32, 13, 0, 0, Math.PI * 2); g.fill();
      });
      g.fillStyle = '#20262b'; g.fillRect(cx - 80, h - 84, 160, 26);
      g.fillStyle = '#f5f7f8'; g.fillRect(cx - 50, h - 54, 100, 20);
      g.fillStyle = '#24292e'; g.fillRect(cx - 192, h - 32, 384, 12);
      if (polizei) { g.fillStyle = '#1b2125'; g.fillRect(cx - 80, h - 272, 160, 22); }
    });
  }

  function wolke(seed) {
    var R = zufallGen(seed);
    return leinwand(360, 160, function (g, b) {
      for (var i = 0; i < 16; i++) { var x = 50 + R() * 260, y = 70 + R() * 50 - Math.sin((x - 50) / 260 * Math.PI) * 40, r = 26 + R() * 34, wg = g.createRadialGradient(x, y - r * 0.3, r * 0.2, x, y, r); wg.addColorStop(0, 'rgba(255,255,255,.98)'); wg.addColorStop(1, 'rgba(240,246,250,0)'); g.fillStyle = wg; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); }
      g.fillStyle = 'rgba(200,214,226,.25)'; g.beginPath(); g.ellipse(b / 2, 128, 140, 14, 0, 0, Math.PI * 2); g.fill();
    });
  }
  function hintergrund(W, horizont, modus) {
    var b = Math.ceil(W * 2), R = zufallGen(77);
    var farben = { tag: ['#4f9fd8', '#9fd0ee', '#e4f2f8'], grau: ['#7d8996', '#a9b3bd', '#d0d6db'], nacht: ['#4d5f92', '#7584ad', '#a7b0cc'], daemmerung: ['#4a69a6', '#c99cb4', '#ffcf9c'] }[modus] || ['#4f9fd8', '#9fd0ee', '#e4f2f8'];
    var himmel = leinwand(b, Math.ceil(horizont + 4), function (g, bb, h) {
      var hg = g.createLinearGradient(0, 0, 0, h); hg.addColorStop(0, farben[0]); hg.addColorStop(0.55, farben[1]); hg.addColorStop(1, farben[2]);
      g.fillStyle = hg; g.fillRect(0, 0, bb, h);
      if (modus === 'tag' || modus === 'daemmerung') {
        var abend = modus === 'daemmerung', sx = bb * (abend ? 0.62 : 0.3), sy = h * (abend ? 0.9 : 0.22), sg = g.createRadialGradient(sx, sy, 4, sx, sy, h * (abend ? 0.7 : 0.45));
        sg.addColorStop(0, abend ? 'rgba(255,214,150,1)' : 'rgba(255,250,225,1)'); sg.addColorStop(0.07, abend ? 'rgba(255,170,100,.85)' : 'rgba(255,246,210,.9)'); sg.addColorStop(1, 'rgba(255,200,150,0)');
        g.fillStyle = sg; g.fillRect(0, 0, bb, h);
      }
      var w = [wolke(3), wolke(11), wolke(29), wolke(41)], anz = modus === 'grau' ? 18 : 9, alpha = modus === 'nacht' ? 0.22 : modus === 'grau' ? 0.85 : 0.9;
      for (var i = 0; i < anz; i++) { var c = w[i % 4], s = (0.5 + R() * 0.8) * (W / 1200) * (modus === 'grau' ? 1.5 : 1); g.globalAlpha = alpha; g.drawImage(c, R() * bb, h * (0.02 + R() * 0.45), c.width * s, c.height * s); }
      g.globalAlpha = 1;
      if (modus === 'grau') { g.fillStyle = 'rgba(96,106,118,.32)'; g.fillRect(0, 0, bb, h); }
    });
    // Sterne und Mond (nur klare Nacht, werden additiv gezeichnet)
    var sterne = modus !== 'nacht' ? null : leinwand(b, Math.ceil(horizont + 4), function (g, bb, h) {
      var Rs = zufallGen(91);
      for (var i = 0; i < 320; i++) { var y = Math.pow(Rs(), 1.4) * h * 0.8; g.globalAlpha = 0.25 + Rs() * 0.75; kreis(g, Rs() * bb, y, 0.5 + Rs() * Rs() * 1.4, '#eef2ff'); }
      g.globalAlpha = 1;
      var mx = bb * 0.72, my = h * 0.24, mr = Math.max(8, h * 0.05), mg = g.createRadialGradient(mx, my, mr * 0.8, mx, my, mr * 6);
      mg.addColorStop(0, 'rgba(200,215,255,.35)'); mg.addColorStop(1, 'rgba(200,215,255,0)'); g.fillStyle = mg; g.fillRect(mx - mr * 6, my - mr * 6, mr * 12, mr * 12);
      kreis(g, mx, my, mr, '#f1f3ea'); kreis(g, mx - mr * 0.3, my - mr * 0.2, mr * 0.22, 'rgba(160,165,160,.5)'); kreis(g, mx + mr * 0.25, my + mr * 0.3, mr * 0.16, 'rgba(160,165,160,.45)');
    });
    var berge = leinwand(b, Math.ceil(horizont * 0.45) + 6, function (g, bb, h) {
      var Rr = zufallGen(5), pts = [], n = 18, i;
      for (i = 0; i <= n; i++) pts.push([bb * i / n, i % 2 ? h * (0.05 + Rr() * 0.35) : h * (0.45 + Rr() * 0.4)]);
      pts[n][1] = pts[0][1];
      g.fillStyle = '#8fb2c8'; g.beginPath(); g.moveTo(0, h); pts.forEach(function (p) { g.lineTo(p[0], p[1]); }); g.lineTo(bb, h); g.closePath(); g.fill();
      g.fillStyle = 'rgba(255,255,255,.92)';
      for (i = 1; i < n; i += 2) { var p = pts[i], l = pts[i - 1], r = pts[i + 1]; g.beginPath(); g.moveTo(p[0], p[1]); g.lineTo(p[0] + (l[0] - p[0]) * 0.22, p[1] + (l[1] - p[1]) * 0.22); g.lineTo(p[0] + (r[0] - p[0]) * 0.22, p[1] + (r[1] - p[1]) * 0.22); g.closePath(); g.fill(); }
      var dg = g.createLinearGradient(0, 0, 0, h); dg.addColorStop(0, 'rgba(228,242,248,0)'); dg.addColorStop(1, 'rgba(228,242,248,.55)'); g.fillStyle = dg; g.fillRect(0, 0, bb, h);
    });
    var huegel = leinwand(b, Math.ceil(horizont * 0.22) + 6, function (g, bb, h) {
      var Rr = zufallGen(13), x;
      g.fillStyle = '#86b07a'; g.beginPath(); g.moveTo(0, h);
      for (x = 0; x <= bb; x += 8) g.lineTo(x, h * (0.45 + 0.25 * Math.sin(x / bb * Math.PI * 6) + 0.12 * Math.sin(x / bb * Math.PI * 17)));
      g.lineTo(bb, h); g.closePath(); g.fill();
      for (x = 0; x < bb; x += 5) kreis(g, x, h * (0.62 + 0.14 * Math.sin(x / bb * Math.PI * 6)), 4 + Rr() * 5, Rr() < 0.5 ? '#4f7f4f' : '#5d8f58');
      g.fillStyle = '#7aa66c'; g.fillRect(0, h - 4, bb, 4);
    });
    return { himmel: himmel, berge: berge, huegel: huegel, breite: b, sterne: sterne };
  }

  function grafikErzeugen() {
    var S = {};
    S.laubHerbst = [laubbaum(5, ['#7a3410', '#b8541a', '#e0862c', '#f2b544']), laubbaum(19, ['#6e2a12', '#a8361c', '#d4572a', '#ef8d3a']), laubbaum(44, ['#7a5a12', '#b88a1e', '#e2b73a', '#f4d870']), laubbaum(61, ['#5e3a1a', '#8f5a26', '#c4843a', '#dfae5c'])];
    var bf = [['#e8902a', '#b34a12'], ['#d9381e', '#8e1d10'], ['#f2c03a', '#c7861b'], ['#9a5a2a', '#5e3416'], ['#e06a1f', '#a83b12']];
    S.blaetter = []; for (var bi = 0; bi < 10; bi++) S.blaetter.push(blatt(bf[bi % bf.length], bi % 3));
    S.laub = [laubbaum(3, ['#2f6b34', '#3f8a44', '#63ad57', '#7cc266']), laubbaum(17, ['#3a6d2c', '#4d8f39', '#78b552', '#92c968']), laubbaum(42, ['#2c5f3a', '#3b7f4b', '#5aa465', '#79bf7a'])];
    S.tanne = [tanne(7), tanne(23)]; S.birke = [birke(5), birke(31)]; S.busch = [busch(9), busch(27), busch(55)]; S.zaun = zaun();
    S.haus = [haus(1), haus(8), haus(15), haus(22), haus(36), haus(49)];
    var farben = [['#3D7BE0', '#2b3542'], ['#E8833A', '#3a3f45'], ['#8A63D2', '#2b3542'], ['#d64545', '#5c4a3a']];
    S.person = farben.map(function (p) { return [0, 1, 2, 3].map(function (ph) { return person(p[0], p[1], ph, false); }); });
    S.steht = farben.map(function (p) { return person(p[0], p[1], 0, true); });
    S.reh = [0, 1, 2, 3].map(reh); S.hund = [0, 1, 2, 3].map(hund); S.kisten = kisten(); S.ball = ball();
    S.limit = {}; [30, 50, 70, 80, 100].forEach(function (w) { S.limit[w] = limitSchild(w); });
    S.stopp = stoppSchild();
    S.ampel = { rot: ampel('rot'), gelb: ampel('gelb'), gruen: ampel('gruen') };
    S.andreas = [andreas(0), andreas(1), andreas(2)]; S.schranke = schranke(); S.zug = zug();
    S.tafeln = [tafel('Frische Brötchen', '#E8833A'), tafel('Autohaus Süd', '#3D7BE0'), tafel('Hofladen 2 km', '#2E9E62'), tafel('Eis & Café', '#8A63D2')];
    S.pfeil = { links: pfeilSchild(false), rechts: pfeilSchild(true) };
    S.gegen = ['#d64545', '#3d6fd6', '#f2b630', '#2e9e62', '#e8eef2', '#3a3f45'].map(function (f) { return autoVorn(f, false); });
    S.polizei = autoVorn('#f2f4f5', true);
    S.laterne = laterne(); S.tropfen = tropfenBild(); S.blitzer = blitzerBild();
    var kf = [['#f2c03a', '#2b6cb0'], ['#e8504a', '#3a4a7a'], ['#7bc96f', '#5b4a8a'], ['#f08bb4', '#2f6f6a']];
    S.kind = kf.map(function (p) { return [0, 1, 2, 3].map(function (ph) { return person(p[0], p[1], ph, false); }); });
    return S;
  }

  /* =====================================================================
   * Aufgabenlogik (unverändert nach Vorgabe)
   * ===================================================================== */
  var levels = HT.stufen(16, function (t, i) {
    return {
      band: HT.lerpInt(16, 6, t),
      schilder: i >= 2, ampeln: i >= 4, fuss: i >= 5, stopps: i >= 6, hindernis: i >= 7, bahn: i >= 8, werbung: i >= 9,
      blinker: i >= 10, autoBremse: i < 13, blinkerTon: i < 13, kontrollen: i >= 12, stau: i >= 14, polizei: i >= 9,
      abstandMin: HT.lerpInt(240, 130, t), abstandMax: HT.lerpInt(360, 190, t),
      reaktionSek: Math.round(HT.lerp(3.2, 1.6, t) * 10) / 10, schildGross: i < 7
    };
  });
  var AUTOBAHNEN = ['A2', 'A7', 'A37'];

  function streckeBauen(p, dauerSek) {
    var meter = (50 / 3.6) * Math.max(45, dauerSek) * 0.8, events = [], s = 160, limit = 50, katalog = [];
    if (p.schilder) { katalog.push('schild'); katalog.push('schild'); } if (p.ampeln) katalog.push('ampel'); if (p.fuss) katalog.push('fuss'); if (p.stopps) katalog.push('stop');
    if (p.hindernis) katalog.push('hindernis'); if (p.bahn) katalog.push('bahn'); if (p.werbung) katalog.push('werbung'); if (p.blinker) katalog.push('blinker'); if (p.polizei) katalog.push('polizei');
    var n = 0;
    while (s < meter - 80 && n < 28) {
      var typ = katalog.length ? katalog[n % katalog.length] : null;
      n++;
      if (!typ) break;
      var e = { typ: typ, s: s, erledigt: false, minV: 999, stehZeit: 0 };
      if (typ === 'schild') { var neu = limit <= 40 ? HT.zufall.wahl([50, 70]) : HT.zufall.wahl([30, 50, 70, 80]); if (neu === limit) neu = limit > 50 ? 30 : 70; e.neu = neu; e.runter = neu < limit; limit = neu; }
      else if (typ === 'ampel') e.rot = HT.zufall.chance(0.65);
      else if (typ === 'fuss') e.person = HT.zufall.chance(0.6);
      else if (typ === 'bahn') e.zu = HT.zufall.chance(0.55);
      else if (typ === 'blinker') e.seite = HT.zufall.wahl(['links', 'rechts']);
      else if (typ === 'polizei') e.blau = true;
      else if (typ === 'hindernis') e.art = HT.zufall.wahl(['person', 'kind', 'ball', 'kind', 'reh', 'hund']);
      e.farbe = HT.zufall.int(0, 3);
      events.push(e);
      // Nach manchen Temposchildern steht ein Blitzer am Straßenrand
      if (typ === 'schild' && HT.zufall.chance(0.55)) events.push({ typ: 'blitzer', s: s + HT.zufall.int(55, 95), erledigt: false, minV: 999, stehZeit: 0 });
      s += HT.zufall.int(p.abstandMin, p.abstandMax);
    }
    return { laenge: Math.max(meter, s + 40), events: events };
  }

  /* Tacho im Cockpit-Stil mit grünem Band */
  function tacho(g, x, y, r, v, soll, band) {
    g.save();
    var hg = g.createRadialGradient(x, y - r * 0.3, r * 0.2, x, y, r + 10); hg.addColorStop(0, '#26323a'); hg.addColorStop(1, '#0d1215');
    g.fillStyle = hg; g.beginPath(); g.arc(x, y, r + 8, 0, Math.PI * 2); g.fill();
    var rg = g.createLinearGradient(0, y - r - 8, 0, y + r + 8); rg.addColorStop(0, '#c8d2d8'); rg.addColorStop(1, '#5e6a72');
    g.strokeStyle = rg; g.lineWidth = 3; g.stroke();
    var a0 = Math.PI * 0.75, a1 = Math.PI * 2.25, max = 120;
    function w(km) { return a0 + (a1 - a0) * HT.klemmen(km, 0, max) / max; }
    g.lineWidth = r * 0.1; g.strokeStyle = 'rgba(255,255,255,.08)'; g.beginPath(); g.arc(x, y, r * 0.84, a0, a1); g.stroke();
    g.strokeStyle = '#2ead6b'; g.shadowColor = 'rgba(46,173,107,.8)'; g.shadowBlur = 10; g.beginPath(); g.arc(x, y, r * 0.84, w(soll - band), w(soll + band)); g.stroke(); g.shadowBlur = 0;
    g.fillStyle = '#dfe6ea'; g.font = '600 ' + Math.round(r * 0.14) + 'px -apple-system, Helvetica, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    for (var k = 0; k <= max; k += 10) {
      var a = w(k), lang = k % 20 === 0;
      g.strokeStyle = lang ? '#f4f6f7' : 'rgba(255,255,255,.45)'; g.lineWidth = lang ? 2 : 1;
      g.beginPath(); g.moveTo(x + Math.cos(a) * r * 0.72, y + Math.sin(a) * r * 0.72); g.lineTo(x + Math.cos(a) * r * (lang ? 0.6 : 0.65), y + Math.sin(a) * r * (lang ? 0.6 : 0.65)); g.stroke();
      if (lang) g.fillText(String(k), x + Math.cos(a) * r * 0.47, y + Math.sin(a) * r * 0.47);
    }
    var an = w(v), zuSchnell = v > soll + band;
    g.strokeStyle = zuSchnell ? '#ff453a' : '#ff9f0a'; g.lineWidth = Math.max(3, r * 0.04); g.lineCap = 'round';
    g.shadowColor = 'rgba(255,159,10,.6)'; g.shadowBlur = 6;
    g.beginPath(); g.moveTo(x - Math.cos(an) * r * 0.12, y - Math.sin(an) * r * 0.12); g.lineTo(x + Math.cos(an) * r * 0.76, y + Math.sin(an) * r * 0.76); g.stroke();
    g.shadowBlur = 0; kreis(g, x, y, r * 0.1, '#3a444b');
    g.fillStyle = zuSchnell ? '#ff453a' : '#fff'; g.font = '800 ' + Math.round(r * 0.3) + 'px -apple-system, Helvetica, sans-serif'; g.fillText(String(Math.round(v)), x, y + r * 0.42);
    g.fillStyle = '#9aa7b0'; g.font = '600 ' + Math.round(r * 0.11) + 'px -apple-system, Helvetica, sans-serif'; g.fillText('km/h', x, y + r * 0.64);
    g.restore();
  }
  function lampeSymbol(g, x, y, r, art, an) {
    g.save(); g.translate(x, y);
    g.fillStyle = an ? (art === 'tanken' ? '#ffb020' : '#ff453a') : '#2c363c';
    if (an) { g.shadowColor = g.fillStyle; g.shadowBlur = 14; }
    if (art === 'tanken') { rrect(g, -r * 0.55, -r * 0.7, r * 0.75, r * 1.4, r * 0.12); g.fill(); g.fillRect(r * 0.25, -r * 0.35, r * 0.35, r * 0.12); g.fillRect(r * 0.5, -r * 0.35, r * 0.1, r * 0.8); g.fillStyle = an ? '#1b1206' : '#1a2125'; g.fillRect(-r * 0.42, -r * 0.55, r * 0.5, r * 0.4); }
    else { g.beginPath(); g.moveTo(-r * 0.8, r * 0.1); g.lineTo(-r * 0.3, -r * 0.35); g.lineTo(r * 0.45, -r * 0.35); g.lineTo(r * 0.85, -r * 0.6); g.lineTo(r * 0.9, -r * 0.45); g.lineTo(r * 0.55, -r * 0.1); g.lineTo(r * 0.5, r * 0.45); g.lineTo(-r * 0.6, r * 0.45); g.closePath(); g.fill(); kreis(g, r * 0.95, r * 0.15, r * 0.14, g.fillStyle); }
    g.restore();
  }

  function lichtSymbol(g, x, y, r, fern, an) {
    g.save(); g.translate(x, y);
    var f = an ? (fern ? '#3d8bff' : '#30d158') : '#2c363c';
    g.fillStyle = f; g.strokeStyle = f; g.lineWidth = Math.max(1.5, r * 0.16); g.lineCap = 'round';
    if (an) { g.shadowColor = f; g.shadowBlur = 14; }
    g.beginPath(); g.moveTo(r * 0.05, -r * 0.62); g.quadraticCurveTo(r * 0.95, -r * 0.62, r * 0.95, 0); g.quadraticCurveTo(r * 0.95, r * 0.62, r * 0.05, r * 0.62); g.closePath(); g.fill();
    for (var i = -1; i <= 1; i++) { g.beginPath(); g.moveTo(-r * 0.12, i * r * 0.36); g.lineTo(-r * 0.9, i * r * 0.36 + (fern ? 0 : r * 0.28)); g.stroke(); }
    g.restore();
  }
  var letzteWahl = null; // zuletzt gewählte Tageszeit (für den nächsten Durchgang vorausgewählt)
  var AMPEL_F = { rot: '255,59,48', gelb: '255,190,0', gruen: '48,220,100' }, AMPEL_Y = { rot: 36 / 420, gelb: 96 / 420, gruen: 156 / 420 };

  HT.registerModule({
    id: 'strassenverkehr', name: 'Straßenverkehr', kategorie: 'aufmerksamkeit', symbol: 'weiter',
    ziel: 'Tempo halten und gleichzeitig auf echte Störungen und eine zweite Aufgabe achten',
    beschreibung: 'Cockpit-Fahrt für geteilte Aufmerksamkeit auf einer Landstraße mit Kurven, Feldern, Wäldern und Ortschaften. Zu Beginn wird Tag-, Abend- oder Nachtfahrt gewählt; die Fahrt beginnt bei schönem Wetter, nach 30 bis 60 Sekunden zieht Herbstregen auf: nasse, spiegelnde Straße, Tropfen auf der Scheibe, Scheibenwischer laufen automatisch. Die Spur hält das Auto, mit Pfeil links und rechts lässt sich leicht ausweichen. Pfeil hoch beschleunigt sanft, Pfeil runter bremst. Der Tachozeiger soll im grünen Band bleiben. Niedrigere Limits gelten schon vor dem Schild, höhere erst danach. Angehalten wird bei roter Ampel, Fußgänger am Übergang, Stoppschild, geschlossener Schranke und Blaulicht im Spiegel. Plötzlich laufen Menschen oder Kinder auf die Fahrbahn, ein Ball rollt über die Straße oder ein Tier steht im Weg: bremsen oder ausweichen. Wer einen Menschen anfährt, beendet die Fahrt. Fünf Sekunden im grünen Band bringen 10 Punkte, fünf Sekunden zu schnell kosten 5 Punkte; Blitzer am Straßenrand blitzen bei zu hohem Tempo. L schaltet das Abblendlicht, F das Fernlicht; bei Fernlicht gibt der Gegenverkehr Lichthupe. Parallel kommen Abbiegen, Kontrollleuchten und eine Durchsage. Leere Übergänge, grüne Ampeln und Werbetafeln verlangen keine Taste.',
    anleitung: 'Pfeil nach oben ist Gas, Pfeil nach unten ist Bremse. Halten Sie den Zeiger im grünen Bereich. Vor einem langsameren Schild schon abbremsen, nach einem schnelleren Schild erst beschleunigen. Halten Sie nur an, wenn wirklich etwas auf der Straße ist. Läuft ein Mensch oder Kind auf die Straße oder rollt ein Ball heran, sofort bremsen. Einem Tier können Sie auch mit Pfeil links oder rechts ausweichen. Fünf Sekunden im grünen Bereich bringen 10 Punkte, zu schnell kostet 5 Punkte. Achten Sie auf Blitzer. Bei einer Abbiege-Ansage zählt links oder rechts als Abbiegen. Leuchtet eine Lampe im Cockpit, drücken Sie OK. Die Plustaste nur bei der genannten Autobahn. Im Dunkeln schaltet L das Licht ein, F das Fernlicht. Bei Gegenverkehr abblenden.',
    tasten: ['hoch', 'runter', 'links', 'rechts', 'ok', 'ja'], levels: levels,
    levelLabels: {
      band: 'Grünes Band (± km/h)', schilder: 'Temposchilder', ampeln: 'Ampeln', fuss: 'Fußgänger', stopps: 'Stoppschilder',
      hindernis: 'Hindernisse', bahn: 'Bahnübergang', werbung: 'Werbetafeln', blinker: 'Abbiegen', autoBremse: 'Auto bremst vor Kreuzung',
      blinkerTon: 'Abbiegen als Ansage', kontrollen: 'Kontrollleuchten', stau: 'Durchsage', polizei: 'Polizei im Spiegel', reaktionSek: 'Reaktionsfenster (s)'
    },
    parameterSchema: {
      dauerDurchgangSek: { typ: 'zahl', label: 'Dauer eines Durchgangs (Sek.)', min: 45, max: 240, schritt: 15, standard: 90 },
      cockpit: { typ: 'schalter', label: 'Cockpit anzeigen', standard: true },
      tageszeit: { typ: 'auswahl', label: 'Tageszeit', standard: 'auswahl', optionen: [{ wert: 'auswahl', label: 'Beim Start wählen' }, { wert: 'zufall', label: 'Zufällig' }, { wert: 'tag', label: 'Tag' }, { wert: 'daemmerung', label: 'Dämmerung' }, { wert: 'nacht', label: 'Nacht' }] },
      wetter: { typ: 'auswahl', label: 'Wetter', standard: 'wechsel', optionen: [{ wert: 'zufall', label: 'Zufällig' }, { wert: 'trocken', label: 'Trocken' }, { wert: 'regen', label: 'Regen' }, { wert: 'wechsel', label: 'Erst schön, nach 30 bis 60 s Regen' }] },
      jahreszeit: { typ: 'auswahl', label: 'Jahreszeit', standard: 'herbst', optionen: [{ wert: 'zufall', label: 'Zufällig' }, { wert: 'sommer', label: 'Sommer' }, { wert: 'herbst', label: 'Herbst mit fallendem Laub' }] },
      linksverkehr: { typ: 'schalter', label: 'Schilder links (Linksverkehr)', standard: false }
    },
    create: function (container, ctx) {
      var p = ctx.params, Z = HT.zeit;
      if (!G) G = grafikErzeugen();
      var plan = streckeBauen(p, p.dauerDurchgangSek || 90);
      var flaeche = HT.m.neu(container, 'm-voll');
      var cvs = HT.el('canvas', { class: 'm-canvas' }); flaeche.appendChild(cvs);
      var g = cvs.getContext('2d', { alpha: false }), W = 0, H = 0, HG = null, horizont = 0, dashTop = 0;
      var hinweis = HT.m.neu(container, 'sv-hinweis', 'Pfeil nach oben, um loszufahren');
      var leiste = HT.m.neu(container, 'sv-leiste');
      function knopf(text, klasse) { var b = HT.el('button', { type: 'button', class: 'sv-knopf ' + (klasse || '') }, text); leiste.appendChild(b); return b; }
      var kLinks = knopf('←', 'lenk'), kBremse = knopf('Bremse', 'bremse'), kOk = knopf('OK', 'tempo'), kPlus = knopf('+', 'tempo'), kLicht = knopf('Licht', 'tempo'), kGas = knopf('Gas', 'gas'), kRechts = knopf('→', 'lenk');
      var halten = { gas: false, bremse: false, links: false, rechts: false }, gasBis = 0, bremseBis = 0, hinweisBis = 0;
      var tasten = HT.pfeilTasten(), aus = [], frameId = null;
      var v = 0, s = 0, soll = 50, tempoUeber = 0, tempoZahl = 0, fertig = false, lampe = null, stau = null, seitHalt = 0;
      var suchbahn = HT.zufall.wahl(AUTOBAHNEN), naechsteLampe = p.kontrollen ? 12 : 1e9, naechsterStau = p.stau ? 18 : 1e9, uhr = 0;

      // Tageszeit und Wetter: Umgebungslicht (wird mit dem Bild multipliziert), Dunkelheit 0 … 1
      var WAHL = !p.tageszeit || p.tageszeit === 'auswahl';
      var TZ = WAHL ? (letzteWahl || 'tag') : p.tageszeit !== 'zufall' ? p.tageszeit : HT.zufall.wahl(['tag', 'tag', 'tag', 'tag', 'tag', 'daemmerung', 'daemmerung', 'nacht', 'nacht', 'nacht']);
      // Wetter: Regenstärke regenI und Nässe der Fahrbahn ändern sich fließend; bei „wechsel“ setzt Regen ein oder hört auf
      var WETTER = p.wetter && p.wetter !== 'zufall' ? p.wetter : HT.zufall.wahl(['trocken', 'trocken', 'trocken', 'regen', 'regen', 'wechsel', 'wechsel', 'wechsel']);
      var REGEN_MOEGLICH = WETTER !== 'trocken', regenZiel = WETTER === 'regen' ? 1 : 0;
      var regenI = regenZiel, nass = regenZiel, regenWechselBei = WETTER === 'wechsel' ? HT.zufall.int(30, 60) : 1e9;
      var HERBST = p.jahreszeit === 'herbst' || (p.jahreszeit !== 'sommer' && HT.zufall.chance(0.5));
      var AMB_T, AMB_R, LICHTKARTE, DUNKEL_T, DUNKEL, DUNST_T, DUNST_R, DUNST, REFL;
      // Alles, was von der Tageszeit abhängt (auch nach der Auswahl am Start erneut aufgerufen)
      function tageszeitSetzen(tz) {
        TZ = tz;
        AMB_T = TZ === 'nacht' ? [16, 20, 36] : TZ === 'daemmerung' ? [205, 162, 152] : [255, 255, 255];
        AMB_R = TZ === 'nacht' ? [14, 17, 26] : TZ === 'daemmerung' ? [120, 112, 124] : [170, 176, 188];
        LICHTKARTE = TZ !== 'tag' || REGEN_MOEGLICH; DUNKEL_T = TZ === 'nacht' ? 1 : TZ === 'daemmerung' ? 0.55 : 0; DUNKEL = Math.max(DUNKEL_T, 0.2 * regenI);
        DUNST_T = TZ === 'nacht' ? [140, 152, 184] : TZ === 'daemmerung' ? [246, 206, 184] : [222, 238, 245];
        DUNST_R = TZ === 'nacht' ? [140, 152, 184] : TZ === 'daemmerung' ? [184, 180, 188] : [196, 204, 212]; DUNST = misch3(DUNST_T, DUNST_R, regenI);
        REFL = TZ === 'nacht' ? [120, 130, 160] : [150, 165, 180];
        W = 0; lgK = null; // Hintergrund und Lichtkarte beim nächsten masse() neu
      }
      var licht = 0, quer = 0, querV = 0, gasP = 0, bremsP = 0, ruck = -9, blendung = 0, blendHinweisBis = 0, lichtHinweisBis = 7, letztDt = 0;
      var LM = null, lg = null, lgK = null, HGR = null, blaetter = [], wischT = 0, PUF = null, pufG = null, DPR = 1, leuchten = [], SR = { x: 0, y: 0, w: 0, h: 0 }, aktD = 0, aktA = 1;
      // Leistungsmodus: weniger Effekte (keine Bewegungsunschärfe, Pixeldichte 1, weniger Regen/Laub, kürzere Sicht)
      var leichtModus = !!(HT.leicht && HT.leicht()), bildzeitSumme = 0, bildzeitN = 0;
      var punkte = 0, punktAnim = [], warnAn = false, blitzZeit = -9, blitzE = null, huepfer = -9, waldF = 0;
      var striche = [], tropfen = [], tropfenRest = 0, wischAlt = 0.05, wischZyklus = -1, ton = null, pauseUhr = null;

      function haltenAn(el, key) {
        function an(ev) { if (ev.cancelable) ev.preventDefault(); halten[key] = true; }
        function ausH() { halten[key] = false; }
        if (HT.hatPointer) { el.addEventListener('pointerdown', an); window.addEventListener('pointerup', ausH); window.addEventListener('pointercancel', ausH); }
        else { el.addEventListener('mousedown', an); el.addEventListener('touchstart', an, { passive: false }); window.addEventListener('mouseup', ausH); window.addEventListener('touchend', ausH); }
        aus.push(function () {
          if (HT.hatPointer) { el.removeEventListener('pointerdown', an); window.removeEventListener('pointerup', ausH); window.removeEventListener('pointercancel', ausH); }
          else { el.removeEventListener('mousedown', an); el.removeEventListener('touchstart', an); window.removeEventListener('mouseup', ausH); window.removeEventListener('touchend', ausH); }
        });
      }
      haltenAn(kGas, 'gas'); haltenAn(kBremse, 'bremse'); haltenAn(kLinks, 'links'); haltenAn(kRechts, 'rechts');
      HT.tap(kLinks, function () { reagiere('links'); }); HT.tap(kRechts, function () { reagiere('rechts'); });
      HT.tap(kOk, function () { reagiere('ok'); }); HT.tap(kPlus, function () { reagiere('ja'); });
      HT.tap(kLicht, function () { lichtSchalten(licht === 0 ? 1 : licht === 1 ? 2 : 0); });

      function lichtSchalten(n) {
        licht = n;
        meldung(n === 0 ? 'Licht aus.' : n === 1 ? 'Abblendlicht an.' : 'Fernlicht an. Bei Gegenverkehr abblenden (F).');
        if (HT.audio.ton) HT.audio.ton(n ? 1250 : 820, 0.035, 'square', 0, 0.06);
      }

      function meldung(text) { hinweis.textContent = text; hinweis.className = 'sv-hinweis an'; hinweisBis = uhr + 3.5; }
      function zaehle(o) { if (!fertig) ctx.onEvent(o); }
      function punkteAendern(n) { punkte += n; punktAnim.push({ n: n, t: uhr }); if (punktAnim.length > 6) punktAnim.shift(); }
      function ende(text) { if (fertig) return; fertig = true; meldung(text); if (ton) ton.update(0, 0, true); if (ctx.onFinish) ctx.onFinish(); }
      function naechstesSchild() { for (var i = 0; i < plan.events.length; i++) { var e = plan.events[i]; if (e.typ === 'schild' && !e.erledigt) return e; } return null; }

      // Auswahl Tag-, Abend- oder Nachtfahrt vor dem Losfahren (Pfeile links/rechts, OK oder Antippen; Ziffern 1–3)
      var wahl = null;
      function auswahlZeigen(fertigFn) {
        var opts = [['tag', 'Tagfahrt', 'Erst Sonne, dann Herbstregen'], ['daemmerung', 'Abendfahrt', 'Dämmerung, dann Regen auf nasser Straße'], ['nacht', 'Nachtfahrt', 'Dunkel, mit Licht und Regen']];
        var ikon = {
          tag: '<svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="10" fill="#ffc83a"/><g stroke="#ffc83a" stroke-width="3.5" stroke-linecap="round"><path d="M24 4v6M24 38v6M4 24h6M38 24h6M10 10l4 4M34 34l4 4M38 10l-4 4M14 34l-4 4"/></g></svg>',
          daemmerung: '<svg viewBox="0 0 48 48"><path d="M8 32a16 16 0 0 1 32 0z" fill="#ff8a3d"/><path d="M4 32h40M10 38h28" stroke="#c96a3a" stroke-width="3.5" stroke-linecap="round"/></svg>',
          nacht: '<svg viewBox="0 0 48 48"><path d="M30 6a18 18 0 1 0 12 30A15 15 0 0 1 30 6z" fill="#cfd8ff"/><circle cx="12" cy="10" r="1.6" fill="#cfd8ff"/><circle cx="40" cy="14" r="1.3" fill="#cfd8ff"/></svg>'
        };
        var box = HT.el('div', { class: 'sv-wahl' }), reihe = HT.el('div', { class: 'sv-wahl-reihe' }), idx = 0, knoepfe = [];
        box.appendChild(HT.el('div', { class: 'sv-wahl-titel' }, 'Wann möchten Sie fahren?'));
        opts.forEach(function (o, i) {
          if (o[0] === TZ) idx = i;
          var k = HT.el('button', { type: 'button', class: 'sv-wahl-knopf', html: '<span class="sv-wahl-ikon">' + ikon[o[0]] + '</span><b>' + o[1] + '</b><small>' + o[2] + '</small>' });
          HT.tap(k, function () { idx = i; nehmen(); });
          reihe.appendChild(k); knoepfe.push(k);
        });
        box.appendChild(reihe);
        box.appendChild(HT.el('div', { class: 'sv-wahl-tipp' }, 'Pfeil links / rechts wählen, OK startet'));
        container.appendChild(box);
        function markieren() {
          knoepfe.forEach(function (k, i) { k.classList.toggle('an', i === idx); });
          tageszeitSetzen(opts[idx][0]); masse(); zeichne(); // Vorschau im Hintergrund
        }
        function nehmen() { if (box.parentNode) box.parentNode.removeChild(box); wahl = null; fertigFn(opts[idx][0]); }
        wahl = { schiebe: function (d) { idx = (idx + d + opts.length) % opts.length; markieren(); }, nimm: function (i) { if (i !== undefined && opts[i]) idx = i; nehmen(); } };
        markieren();
      }

      function reagiere(aktion, detail) {
        if (wahl) {
          if (aktion === 'links') wahl.schiebe(-1); else if (aktion === 'rechts') wahl.schiebe(1);
          else if (aktion === 'ok' || aktion === 'hoch') wahl.nimm();
          else if (aktion === 'ziffer' && detail && detail.wert >= 1 && detail.wert <= 3) wahl.nimm(detail.wert - 1);
          return;
        }
        if (fertig) return;
        if (aktion === 'buchstabe' && detail) {
          if (detail.wert === 'L') lichtSchalten(licht ? 0 : 1);
          else if (detail.wert === 'F') lichtSchalten(licht === 2 ? 1 : 2);
          return;
        }
        if (aktion === 'hoch') { gasBis = uhr + 0.55; return; }
        if (aktion === 'runter') { bremseBis = uhr + 0.4; return; }
        if (aktion === 'links' || aktion === 'rechts') {
          if (!p.blinker) return; // ohne Abbiege-Aufgabe sind links und rechts nur leichtes Lenken
          for (var i = 0; i < plan.events.length; i++) {
            var e = plan.events[i];
            if (e.typ === 'blinker' && e.offen && !e.erledigt) {
              e.erledigt = true; e.offen = false; e.gewaehlt = aktion;
              var ok = aktion === e.seite;
              zaehle({ korrekt: ok, reiz: 'abbiegen ' + e.seite, reaktion: aktion, rtMs: Math.round((uhr - e.seit) * 1000), typ: 'blinker' });
              if (ok) ctx.audio.richtig(); else ctx.audio.falsch();
              meldung(ok ? 'Richtig abgebogen.' : 'Die andere Richtung war gemeint.');
              return;
            }
          }
          return; // kein Abbiegen angesagt: die Taste lenkt nur
        }
        if (aktion === 'ok') {
          if (lampe && !lampe.erledigt) { lampe.erledigt = true; zaehle({ korrekt: true, reiz: lampe.art, reaktion: 'ok', rtMs: Math.round((uhr - lampe.seit) * 1000), typ: 'kontrolle' }); ctx.audio.richtig(); meldung('Kontrollleuchte gesehen. Weiterfahren.'); lampe = null; }
          else if (p.kontrollen) { zaehle({ korrekt: false, reiz: 'keine leuchte', reaktion: 'ok', typ: 'kontrolle' }); ctx.audio.falsch(); meldung('Gerade leuchtet keine Kontrollleuchte.'); }
          return;
        }
        if (aktion === 'ja') {
          if (!p.stau) return;
          if (stau && !stau.erledigt) {
            stau.erledigt = true;
            var treffer = stau.name === suchbahn;
            zaehle({ korrekt: treffer, reiz: 'stau ' + stau.name, reaktion: 'plus', rtMs: Math.round((uhr - stau.seit) * 1000), typ: treffer ? 'stau_relevant' : 'stau_falsch' });
            if (treffer) ctx.audio.richtig(); else ctx.audio.falsch();
            meldung(treffer ? 'Richtige Autobahn.' : 'Diese Durchsage galt nicht für ' + suchbahn + '.');
            stau = null;
          } else zaehle({ korrekt: false, reiz: 'keine durchsage', reaktion: 'plus', typ: 'stau_falsch' });
        }
      }
      // Seitliche Lage eines Hindernisses in Straßeneinheiten zur eigenen Seite hin (0,45 = Mitte der eigenen Spur)
      var HALB = { reh: 0.24, hund: 0.16, ball: 0.07, kisten: 0.26, person: 0.14, kind: 0.1 };
      function laeuftAuf(e) { return e.art === 'person' || e.art === 'kind' || e.art === 'ball'; }
      function hindernisX(e) {
        var flucht = HT.klemmen((e.stehZeit - 0.8) / 1.2, 0, 1);
        if (!laeuftAuf(e)) return 0.45 + flucht * 2.5;
        if (e.lauf === undefined) return e.art === 'ball' ? 2.1 : 1.75;
        var t = uhr - e.lauf;
        if (e.art === 'ball') return 2.1 - t * 1.55; // rollt einfach weiter über die Straße
        var rein = HT.klemmen(t / (e.art === 'kind' ? 0.9 : 1.1), 0, 1);
        return 1.75 - (1.75 - 0.45) * glatt(rein) - flucht * 2.6; // läuft auf die Fahrbahn, bleibt erschrocken stehen, geht nach dem Anhalten weiter
      }
      function mussHalten(e) { if (e.typ === 'ampel') return !!e.rot; if (e.typ === 'fuss') return !!e.person; if (e.typ === 'bahn') return !!e.zu; if (e.typ === 'stop' || e.typ === 'hindernis') return true; return false; }

      function pruefeStopps(dt) {
        for (var i = 0; i < plan.events.length; i++) {
          var e = plan.events[i];
          if (e.erledigt || e.typ === 'schild' || e.typ === 'werbung' || e.typ === 'blinker') continue;
          var ds = e.s - s;
          if (e.typ === 'blitzer') {
            if (ds < 0) {
              e.erledigt = true;
              if (v > soll + p.band) {
                blitzZeit = uhr; blitzE = e; punkteAendern(-5); if (ton) ton.blitz();
                zaehle({ korrekt: false, reiz: 'blitzer ' + soll, reaktion: Math.round(v) + '', typ: 'tempo' });
                meldung('Geblitzt! ' + Math.round(v) + ' statt ' + soll + ' km/h. Minus 5 Punkte.');
              } else zaehle({ korrekt: true, reiz: 'blitzer ' + soll, reaktion: Math.round(v) + '', typ: 'tempo' });
            }
            continue;
          }
          if (e.typ === 'hindernis' && laeuftAuf(e) && e.lauf === undefined && ds < 18 + v * 0.5) { e.lauf = uhr; if (e.art !== 'ball' && ton) ton.ruf(); }
          if (e.typ === 'polizei') {
            if (!e.offen && ds < 8 && ds > -5) { e.offen = true; e.seit = uhr; ctx.audio.warnung(); meldung('Blaulicht im Spiegel. Anhalten.'); }
            if (e.offen && v < 6) e.stehZeit += dt;
            if (e.offen && !e.erledigt && uhr - e.seit > p.reaktionSek && e.stehZeit < 0.3) { e.erledigt = true; e.blau = false; e.offen = false; zaehle({ korrekt: false, auslassung: true, reiz: 'polizei', reaktion: 'keine', typ: 'polizei' }); ctx.audio.falsch(); meldung('Beim Blaulicht anhalten.'); }
            if (e.offen && e.stehZeit > 1.1 && !e.gewertet) { e.gewertet = true; e.erledigt = true; e.blau = false; zaehle({ korrekt: true, reiz: 'polizei', reaktion: 'stopp', typ: 'polizei' }); ctx.audio.richtig(); meldung('Blaulicht aus. Weiterfahren.'); }
            continue;
          }
          if (ds < 30 && ds > -8) e.minV = Math.min(e.minV, v);
          if (mussHalten(e) && v < 6 && ds < 18 && ds > -4) e.stehZeit += dt;
          // Tier, Ball oder Kisten: Ausweichen zählt wie Anhalten (seitlicher Abstand beim Vorbeifahren)
          if (e.typ === 'hindernis' && !e.passiert && ds < 0.6) {
            e.passiert = true;
            if (e.stehZeit <= 0.35) {
              e.ausgewichen = Math.abs(0.5 + quer - hindernisX(e)) > 0.2 + (HALB[e.art] || 0.2);
              if (!e.ausgewichen) {
                e.weg = true; e.erledigt = true;
                if (e.art === 'person' || e.art === 'kind') {
                  ruck = uhr;
                  zaehle({ korrekt: false, auslassung: true, reiz: 'hindernis ' + e.art, reaktion: 'angefahren', typ: 'hindernis' });
                  ende('Ein Mensch wurde angefahren. Die Fahrt ist beendet. Bitte immer bremsbereit sein.');
                  return;
                }
                if (e.art === 'ball') {
                  // Über den Ball gefahren: Wagen hüpft kurz, weiches „Plopp“, bricht leicht zur Seite aus
                  huepfer = uhr; querV += (Math.random() < 0.5 ? -1 : 1) * 0.75; if (ton) ton.plopp();
                  zaehle({ korrekt: false, reiz: 'hindernis ball', reaktion: 'überfahren', typ: 'hindernis' });
                  meldung('Ball überfahren. Bei einem Ball immer bremsen, oft folgt ein Kind.');
                } else {
                  ruck = uhr; ctx.audio.falsch();
                  zaehle({ korrekt: false, auslassung: true, reiz: 'hindernis ' + e.art, reaktion: 'durchgefahren', typ: 'hindernis' });
                  meldung('Zusammenstoß. Anhalten oder ausweichen.');
                }
              }
            }
          }
          if (!e.erledigt && ds < -6) {
            e.erledigt = true;
            if (mussHalten(e)) {
              if (e.stehZeit > 0.35) {
                zaehle({ korrekt: true, reiz: e.typ, reaktion: 'stopp', typ: e.typ === 'fuss' ? 'fussgaenger' : e.typ });
                if (e.typ === 'ampel') e.rot = false; if (e.typ === 'hindernis') e.weg = true; if (e.typ === 'bahn') e.zu = false;
                meldung('Richtig angehalten. Weiter mit Gas.');
              } else if (e.ausgewichen) {
                zaehle({ korrekt: true, reiz: e.typ + ' ' + e.art, reaktion: 'ausgewichen', typ: 'hindernis' });
                meldung('Gut ausgewichen.');
              } else {
                zaehle({ korrekt: false, auslassung: true, reiz: e.typ, reaktion: 'durchgefahren', typ: e.typ === 'fuss' ? 'fussgaenger' : e.typ });
                ctx.audio.falsch(); meldung(e.typ === 'ampel' ? 'Rot nicht übersehen.' : e.typ === 'hindernis' ? 'Zusammenstoß. Anhalten oder ausweichen.' : 'Hier hätten Sie anhalten müssen.');
              }
            } else if (e.minV < 5) {
              zaehle({ korrekt: false, reiz: e.typ, reaktion: 'angehalten', typ: 'falsch_angehalten' });
              ctx.audio.falsch(); meldung(e.typ === 'ampel' ? 'Die Ampel war grün. Weiterfahren.' : e.typ === 'bahn' ? 'Die Schranke war offen. Weiterfahren.' : 'Hier war niemand. Nicht anhalten.');
            } else zaehle({ korrekt: true, reiz: e.typ + ' frei', reaktion: 'durchgefahren', typ: e.typ === 'fuss' ? 'fussgaenger' : e.typ });
          }
        }
      }
      function schilder() {
        var e = naechstesSchild(); if (!e) return;
        var ds = e.s - s;
        if (e.runter && ds < 42) soll = e.neu;
        if (!e.runter && ds < 0) soll = e.neu;
        if (ds < -2 && !e.erledigt) {
          e.erledigt = true;
          if (e.runter && v > e.neu + p.band) { tempoZahl++; punkteAendern(-5); zaehle({ korrekt: false, reiz: 'schild ' + e.neu, reaktion: Math.round(v) + '', typ: 'tempo' }); ctx.audio.falsch(); meldung('Vor dem Schild auf ' + e.neu + ' kommen.'); }
          else zaehle({ korrekt: true, reiz: 'schild ' + e.neu, reaktion: Math.round(v) + '', typ: 'tempo' });
        }
      }
      function blinkerOeffnen() {
        for (var i = 0; i < plan.events.length; i++) {
          var e = plan.events[i];
          if (e.typ !== 'blinker' || e.erledigt || e.offen) continue;
          var ds = e.s - s;
          if (ds < 55 && ds > 0) { e.offen = true; e.seit = uhr; meldung(e.seite === 'links' ? 'Links abbiegen.' : 'Rechts abbiegen.'); if (p.blinkerTon && ctx.audio.sprechen) ctx.audio.sprechen(e.seite === 'links' ? 'links abbiegen' : 'rechts abbiegen', { nurAufnahme: false }); }
          if (p.autoBremse && ds < 40 && ds > -5 && v > 32) v += (30 - v) * 0.08;
        }
        for (var j = 0; j < plan.events.length; j++) {
          var b = plan.events[j];
          if (b.typ === 'blinker' && b.offen && !b.erledigt && uhr - b.seit > p.reaktionSek) { b.erledigt = true; b.offen = false; zaehle({ korrekt: false, auslassung: true, reiz: 'abbiegen ' + b.seite, reaktion: 'keine', typ: 'blinker' }); ctx.audio.falsch(); meldung('Abbiegen verpasst.'); }
        }
      }
      function nebenaufgaben(dt) {
        uhr += dt;
        if (p.kontrollen && !lampe && uhr > naechsteLampe) { lampe = { art: HT.zufall.chance(0.5) ? 'tanken' : 'oel', seit: uhr, erledigt: false }; naechsteLampe = uhr + HT.zufall.int(14, 22); meldung(lampe.art === 'tanken' ? 'Tanken leuchtet. OK drücken.' : 'Öldruck leuchtet. OK drücken.'); }
        if (lampe && !lampe.erledigt && uhr - lampe.seit > p.reaktionSek + 0.8) { lampe.erledigt = true; zaehle({ korrekt: false, auslassung: true, reiz: lampe.art, reaktion: 'keine', typ: 'kontrolle' }); ctx.audio.falsch(); lampe = null; }
        if (p.stau && !stau && uhr > naechsterStau) { var name = HT.zufall.chance(0.45) ? suchbahn : HT.zufall.wahl(AUTOBAHNEN); stau = { name: name, seit: uhr, erledigt: false }; naechsterStau = uhr + HT.zufall.int(16, 26); meldung('Durchsage Autobahn ' + name + '. Gesucht ist ' + suchbahn + '.'); }
        if (stau && !stau.erledigt && uhr - stau.seit > 4) { var relevant = stau.name === suchbahn; stau.erledigt = true; if (relevant) zaehle({ korrekt: false, auslassung: true, reiz: 'stau ' + stau.name, reaktion: 'keine', typ: 'stau_relevant' }); else zaehle({ korrekt: true, reiz: 'stau ' + stau.name, reaktion: 'keine', typ: 'stau_falsch' }); stau = null; }
      }
      // Tempo: 5 s im grünen Band = +10 Punkte; 5 s zu schnell = −5 Punkte. Solange zu schnell, erscheint eine Warnung.
      function tempoPruefen(dt) {
        if (v > soll + p.band) {
          if (!warnAn) { warnAn = true; if (HT.audio.ton) HT.audio.ton(880, 0.12, 'sine', 0, 0.07); }
          tempoUeber += dt;
        } else { warnAn = false; tempoUeber = 0; }
        if (tempoUeber >= 5) {
          tempoUeber = 0; tempoZahl++; punkteAendern(-5);
          zaehle({ korrekt: false, reiz: 'tempo ' + soll, reaktion: Math.round(v) + '', typ: 'tempo' });
          meldung('Geschwindigkeit zu hoch: minus 5 Punkte. Ziel ist ' + soll + ' km/h.');
          if (tempoZahl >= 20) ende('Zwanzigmal zu schnell. Der Durchgang endet.');
        }
        if (v > 8 && Math.abs(v - soll) <= p.band) seitHalt += dt; else seitHalt = 0;
        if (seitHalt >= 5) { seitHalt = 0; punkteAendern(10); zaehle({ korrekt: true, reiz: 'tempo ' + soll, reaktion: Math.round(v) + '', typ: 'tempo' }); }
      }

      /* =================== Welt für die Darstellung =================== */
      // MJS = Meter je Segment: kleiner Wert = mehr Bewegung im Bild je km/h (50 km/h wirken zügiger)
      var SEG = 200, STRASSE = 2000, M = 570, MJS = 1.1, SICHT = leichtModus ? 190 : 270, KTIEFE = 1 / Math.tan(50 * Math.PI / 180), KAMERA_H = 1050;
      var FELDER = HERBST ? [[150, 140, 70], [170, 122, 62], [124, 118, 64], [196, 158, 84], [142, 102, 70], [118, 128, 66]] : [[118, 178, 92], [104, 164, 80], [206, 184, 104], [226, 204, 92], [150, 120, 86], [132, 188, 98]];
      var TROCKEN = [104, 110, 116], NASS = [54, 59, 65];
      tageszeitSetzen(TZ);
      var welt = [];
      (function weltBauen() {
        var anzahl = Math.ceil((plan.laenge + 500) / MJS) + SICHT, i = 0, feldL = FELDER[0], feldR = FELDER[1], rest = 0;
        // Bereiche um Ereignisse herum gerade halten, damit Schilder gut zu sehen sind; Ortschaften um einige Ereignisse
        var ruhig = {}, ort = {};
        plan.events.forEach(function (e, k) { var c = Math.round(e.s / MJS); for (var j = c - 95; j < c + 10; j++) ruhig[j] = true; if (e.typ === 'ampel' || e.typ === 'fuss' || e.typ === 'stop') for (j = c - 160; j < c + 120; j++) ort[j] = true; });
        while (i < anzahl) {
          var kurve = Math.random() < 0.4 ? 0 : (Math.random() < 0.5 ? -1 : 1) * (1.2 + Math.random() * 2.8), laenge = 90 + Math.floor(Math.random() * 140), ein = Math.floor(laenge * 0.3);
          for (var j = 0; j < laenge && i < anzahl; j++, i++) {
            var f = j < ein ? j / ein : j > laenge - ein ? (laenge - j) / ein : 1;
            if (rest-- <= 0) { feldL = FELDER[Math.floor(Math.random() * FELDER.length)]; feldR = FELDER[Math.floor(Math.random() * FELDER.length)]; rest = 120 + Math.floor(Math.random() * 200); }
            var y = Math.sin(i / 95) * 1300 + Math.sin(i / 33) * 260;
            welt.push({ i: i, kurve: ruhig[i] ? 0 : kurve * f * f * (3 - 2 * f), p1: { y: i ? welt[i - 1].p2.y : y, s: {} }, p2: { y: Math.sin((i + 1) / 95) * 1300 + Math.sin((i + 1) / 33) * 260, s: {} }, objekte: [], ort: !!ort[i], feldL: feldL, feldR: feldR });
          }
        }
        // Landschaft
        function zufall(a) { return a[Math.floor(Math.random() * a.length)]; }
        var seite = p.linksverkehr ? -1 : 1;
        welt.forEach(function (sg, n) {
          if (sg.ort) {
            if (n % 18 === 0) sg.objekte.push({ bild: zufall(G.haus), x: (Math.random() < 0.5 ? -1 : 1) * (3.4 + Math.random() * 1.2), h: 8 + Math.random() * 1.5 });
            if (n % 23 === 5) sg.objekte.push({ bild: zufall(G.busch), x: (Math.random() < 0.5 ? -1 : 1) * 1.8, h: 1.4 });
            if (n % 26 === 13) { var lx = (n % 52 === 13 ? -1 : 1) * 1.32; sg.objekte.push({ bild: G.laterne, x: lx, h: 5.4, laterne: true, spiegeln: lx > 0 }); }
          } else {
            var wald = Math.sin(n / 260) > 0.55, r = Math.random();
            sg.wald = wald;
            if (wald) { if (r < 0.5) sg.objekte.push(HERBST && Math.random() < 0.5 ? { bild: zufall(G.laubHerbst), x: (Math.random() < 0.5 ? -1 : 1) * (1.9 + Math.random() * 5), h: 10 + Math.random() * 5 } : { bild: zufall(G.tanne), x: (Math.random() < 0.5 ? -1 : 1) * (1.9 + Math.random() * 5), h: 11 + Math.random() * 6 }); }
            else if (r < 0.07) sg.objekte.push({ bild: zufall(HERBST ? G.laubHerbst : G.laub), x: (Math.random() < 0.5 ? -1 : 1) * (2 + Math.random() * 6), h: 9 + Math.random() * 5 });
            else if (r < 0.1) sg.objekte.push({ bild: zufall(G.birke), x: (Math.random() < 0.5 ? -1 : 1) * (2 + Math.random() * 4), h: 10 + Math.random() * 3 });
            else if (r < 0.15) sg.objekte.push({ bild: zufall(G.busch), x: (Math.random() < 0.5 ? -1 : 1) * (1.8 + Math.random() * 3), h: 1.3 + Math.random() * 0.8 });
            else if (r < 0.16 && n % 4 === 0) sg.objekte.push({ bild: zufall(G.haus), x: (Math.random() < 0.5 ? -1 : 1) * (6 + Math.random() * 6), h: 9 });
            if (Math.sin(n / 90) > 0.6 && n % 6 === 0) sg.objekte.push({ bild: G.zaun, x: -seite * 1.85, h: 1.2, breite: true });
          }
        });
        // Ereignisse an ihren Segmenten verankern
        plan.events.forEach(function (e) { var c = Math.round(e.s / MJS); e.seg = c; if (welt[c]) welt[c].ereignis = e; if (e.typ === 'fuss' && welt[c]) { welt[c].zebra = welt[c - 1].zebra = welt[c - 2].zebra = true; } if ((e.typ === 'ampel' || e.typ === 'stop') && welt[c - 3]) welt[c - 3].stoplinie = true; if (e.typ === 'bahn' && welt[c]) welt[c].gleis = true; if (e.typ === 'blinker') for (var j = c - 6; j <= c + 6; j++) if (welt[j]) welt[j].kreuzung = true; });
      })();
      var gegenverkehr = [], naechstesGegenauto = 3;
      function misch3(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
      function nassDunkler(c) { var t = nass * 0.85; return [c[0] * (1 - 0.3 * t), c[1] * (1 - 0.27 * t), c[2] * (1 - 0.2 * t)]; }
      function glatt(t) { return t * t * (3 - 2 * t); }
      function mischen(a, b, t) { return 'rgb(' + Math.round(a[0] + (b[0] - a[0]) * t) + ',' + Math.round(a[1] + (b[1] - a[1]) * t) + ',' + Math.round(a[2] + (b[2] - a[2]) * t) + ')'; }

      function masse() {
        var r = flaeche.getBoundingClientRect(), b = Math.max(320, Math.round(r.width || 0)), h = Math.max(240, Math.round(r.height || 0));
        if (b === W && h === H) return;
        W = b; H = h;
        var dpr = leichtModus ? 1 : Math.min(window.devicePixelRatio || 1, 1.5);
        cvs.width = Math.round(b * dpr); cvs.height = Math.round(h * dpr); DPR = dpr;
        g.setTransform(dpr, 0, 0, dpr, 0, 0); g.imageSmoothingQuality = 'high';
        // Lichtkarte in halber Auflösung: Umgebungslicht + Scheinwerfer, Laternen, Ampeln; wird mit dem Bild multipliziert
        if (LICHTKARTE) { LM = document.createElement('canvas'); LM.width = Math.max(2, Math.round(cvs.width / 2)); LM.height = Math.max(2, Math.round(cvs.height / 2)); lgK = LM.getContext('2d'); lgK.setTransform(dpr / 2, 0, 0, dpr / 2, 0, 0); }
        PUF = document.createElement('canvas'); PUF.width = cvs.width; PUF.height = cvs.height; pufG = PUF.getContext('2d', { alpha: false });
        dashTop = p.cockpit !== false ? H * 0.66 : H;
        horizont = p.cockpit !== false ? H * 0.36 : H * 0.44;
        HG = hintergrund(W, horizont, TZ); HGR = REGEN_MOEGLICH ? hintergrund(W, horizont, 'grau') : null;
        HG.boden = g.createLinearGradient(0, horizont, 0, H); HG.boden.addColorStop(0, '#9cc78a'); HG.boden.addColorStop(1, '#6faa55');
        if (TZ === 'daemmerung') { HG.abendrot = g.createLinearGradient(0, 0, 0, horizont + H * 0.05); HG.abendrot.addColorStop(0, 'rgba(255,110,60,0)'); HG.abendrot.addColorStop(0.6, 'rgba(255,125,70,.14)'); HG.abendrot.addColorStop(0.86, 'rgba(255,150,80,.3)'); HG.abendrot.addColorStop(1, 'rgba(255,150,80,0)'); }
      }

      /* =================== Zeichnen =================== */
      var parallax = 0;
      function projizieren(pkt, z, x, pos, kamX, kamY) {
        var tz = z - pos, sc = KTIEFE / Math.max(1, tz);
        pkt.s.z = tz;
        pkt.s.x = W / 2 + sc * (x - kamX) * W / 2;
        pkt.s.y = horizont - sc * (pkt.y - kamY) * H / 2;
        pkt.s.w = sc * STRASSE * W / 2;
      }
      function viereck(a, y1, b, y2, l, r, farbe) { g.fillStyle = farbe; g.beginPath(); g.moveTo(a.x + a.w * l, y1); g.lineTo(a.x + a.w * r, y1); g.lineTo(b.x + b.w * r, y2); g.lineTo(b.x + b.w * l, y2); g.closePath(); g.fill(); }
      function ebene(bild, versatz, y) { var b = HG.breite, x = -(((versatz % 1) + 1) % 1) * b; g.drawImage(bild, x, y); g.drawImage(bild, x + b, y); }
      function sprite(bild, x, y, k, hm, spiegeln) {
        var h = hm * M * k, w = h * bild.width / bild.height;
        if (h < 1.2 || y - h > H || x + w / 2 < 0 || x - w / 2 > W) return false;
        SR.x = x - w / 2; SR.y = y - h; SR.w = w; SR.h = h;
        if (spiegeln) { g.save(); g.translate(x, y); g.scale(-1, 1); g.drawImage(bild, -w / 2, -h, w, h); g.restore(); }
        else g.drawImage(bild, x - w / 2, y - h, w, h);
        return true;
      }
      function lgViereck(a, y1, b, y2, l, r) { lg.beginPath(); lg.moveTo(a.x + a.w * l, y1); lg.lineTo(a.x + a.w * r, y1); lg.lineTo(b.x + b.w * r, y2); lg.lineTo(b.x + b.w * l, y2); lg.closePath(); lg.fill(); }
      // Vom Scheinwerfer getroffene Schilder, Personen und Tiere: Sprite zweimal in die Lichtkarte (wirkt wie Rückstrahlung)
      function beleuchte(bild, spiegeln) {
        if (!lg || !licht) return;
        var reich = licht === 2 ? 170 : 62; if (aktD > reich) return;
        lg.globalAlpha = (licht === 2 ? 0.85 : 0.75) * (1 - aktD / reich * 0.7);
        if (spiegeln) { lg.save(); lg.translate(SR.x + SR.w / 2, 0); lg.scale(-1, 1); lg.drawImage(bild, -SR.w / 2, SR.y, SR.w, SR.h); lg.drawImage(bild, -SR.w / 2, SR.y, SR.w, SR.h); lg.restore(); }
        else { lg.drawImage(bild, SR.x, SR.y, SR.w, SR.h); lg.drawImage(bild, SR.x, SR.y, SR.w, SR.h); }
        lg.globalAlpha = 1;
      }
      function ampelLicht(z, boden) {
        if (DUNKEL <= 0) return;
        var f = AMPEL_F[z], lx = SR.x + SR.w / 2, ly = SR.y + SR.h * AMPEL_Y[z], r = SR.w * 1.3;
        leuchten.push([glut(f), lx - r, ly - r, r * 2, r * 2, (0.45 + 0.55 * DUNKEL) * aktA]);
        leuchten.push([glut('255,255,255'), lx - r * 0.16, ly - r * 0.16, r * 0.32, r * 0.32, 0.6 * DUNKEL]);
        if (lg) { var r2 = SR.w * 3.2; lg.globalAlpha = 0.35; lg.drawImage(glut(f), lx - r2, ly - r2, r2 * 2, r2 * 2); lg.globalAlpha = 1; }
        if (nass > 0.05) { leuchten.push([glut(f), lx - r * 0.3, boden, r * 0.6, SR.h * 1.25, 0.85 * nass]); leuchten.push([glut(f), lx - r * 0.08, boden, r * 0.16, SR.h * 1.6, 0.6 * nass]); }
      }
      function warnLicht(bildNr) {
        if (DUNKEL <= 0) return;
        var lx = SR.x + SR.w * (bildNr === 1 ? 0.364 : 0.636), ly = SR.y + SR.h * 0.508, r = SR.w * 0.8;
        leuchten.push([glut('255,60,40'), lx - r, ly - r, r * 2, r * 2, 0.4 + 0.6 * DUNKEL]);
      }
      function laternenLicht(o, boden, wpx) {
        var kx = SR.x + SR.w * (o.spiegeln ? 1 - G.laterne.kopf[0] : G.laterne.kopf[0]), ky = SR.y + SR.h * G.laterne.kopf[1], r = SR.h * 0.45;
        leuchten.push([glut('255,206,140'), kx - r, ky - r * 0.6, r * 2, r * 1.2, 0.85 * DUNKEL * aktA]);
        leuchten.push([glut('255,250,235'), kx - r * 0.12, ky - r * 0.06, r * 0.24, r * 0.14, DUNKEL]);
        if (lg) {
          var pr = wpx * 1.3;
          lg.globalAlpha = 0.95 * DUNKEL; lg.drawImage(glut('255,214,160'), kx - pr, boden - pr * 0.3, pr * 2, pr * 0.6);
          lg.globalAlpha = 0.5 * DUNKEL; lg.drawImage(glut('255,214,160'), kx - r * 0.9, ky, r * 1.8, boden - ky + r * 0.2); lg.globalAlpha = 1;
        }
        if (nass > 0.05) { leuchten.push([glut('255,200,140'), kx - r * 0.16, boden - SR.h * 0.05, r * 0.32, SR.h * 1.15, 0.75 * DUNKEL * nass]); leuchten.push([glut('255,214,160'), kx - r * 0.5, boden - r * 0.05, r, r * 0.25, 0.5 * DUNKEL * nass]); }
      }
      // Gegenverkehr: zwischen zwei Segmenten weich interpoliert (kein Springen), nachts mit Licht und Lichthupe
      function gegenAuto(o, sg, rs) {
        var a = sg.p1.s, b = sg.p2.s, f = HT.klemmen(o.z / MJS - sg.i, 0, 1), oy = a.y + (b.y - a.y) * f, ow = a.w + (b.w - a.w) * f, kp = ow / STRASSE;
        var cx = a.x + (b.x - a.x) * f - rs * 0.5 * ow;
        if (nass > 0.05) {
          var hh = 1.55 * M * kp, ww = hh * o.bild.width / o.bild.height;
          if (hh > 2 && oy < H + hh) {
            var ga = g.globalAlpha;
            // Spiegelbild auf der nassen Fahrbahn und Gischt hinter den Rädern
            g.save(); g.globalAlpha = ga * 0.34 * nass; g.translate(cx, oy); g.scale(1, -0.6); g.drawImage(o.bild, -ww / 2, -hh, ww, hh); g.restore();
            if (regenI > 0.2) { g.save(); g.globalAlpha = ga * 0.3 * nass * regenI; g.drawImage(glut('214,220,228'), cx - ww * 0.95, oy - hh * 0.5, ww * 1.9, hh * 0.75); g.restore(); }
          }
        }
        if (!sprite(o.bild, cx, oy, kp, 1.55) || DUNKEL <= 0) return;
        var t = o.hupe === undefined ? 9 : uhr - o.hupe, hupe = t < 0.18 || (t > 0.32 && t < 0.5), st = hupe ? 2.6 : 1;
        for (var q = 0; q < 2; q++) {
          var X = SR.x + SR.w * (q ? 0.8333 : 0.1667), Y = SR.y + SR.h * 0.573, r = SR.w * 0.32 * st;
          leuchten.push([glut('255,248,225'), X - r, Y - r, r * 2, r * 2, 0.95]);
          leuchten.push([glut('255,255,255'), X - r * 0.2, Y - r * 0.12, r * 0.4, r * 0.24, 0.9]);
          if (nass > 0.05) { leuchten.push([glut('255,240,210'), X - r * 0.2, oy, r * 0.4, SR.h * 2.0 * (hupe ? 1.4 : 1), 0.8 * nass]); leuchten.push([glut('255,250,235'), X - r * 0.06, oy, r * 0.12, SR.h * 2.6, 0.55 * nass]); }
        }
        if (hupe && SR.w > W * 0.03) blendung = Math.max(blendung, 0.18 * DUNKEL);
        if (lg) { lg.globalAlpha = 0.55 * DUNKEL; lg.drawImage(glut('255,240,215'), SR.x - SR.w * 0.6, oy - SR.h * 0.15, SR.w * 2.2, SR.h * 0.9); lg.globalAlpha = 1; }
      }
      // Eigene Scheinwerfer: Lichtkegel folgt der Straße über Kurven und Hügel
      function scheinwerfer(liste, pos, rs) {
        var fern = licht === 2, reich = fern ? 165 : 56, cx0 = (0.5 + quer) * rs, ziel = null, k, sg, a, b, y1, dm, I;
        for (k = 0; k < liste.length; k++) {
          sg = liste[k]; dm = (sg.i - pos / SEG) * MJS; if (dm > reich) break;
          if (!ziel && dm > (fern ? 55 : 22)) ziel = sg;
          if (!sg.sicht) continue;
          I = fern ? (dm < 50 ? 0.95 : 0.95 * Math.pow(Math.max(0, 1 - (dm - 50) / 115), 1.3)) : (dm < 10 ? 0.7 + 0.25 * dm / 10 : 0.95 * Math.pow(Math.max(0, 1 - (dm - 10) / 46), 1.5));
          if (I <= 0.02) continue;
          a = sg.p1.s; b = sg.p2.s; y1 = Math.min(a.y, sg.clip);
          if (y1 - b.y < 0.05) continue;
          lg.fillStyle = 'rgba(255,236,205,' + (I * 0.3).toFixed(3) + ')'; lgViereck(a, y1, b, b.y, cx0 - 1.7, cx0 + 1.75);
          lg.fillStyle = 'rgba(255,242,220,' + (I * 0.65).toFixed(3) + ')'; lgViereck(a, y1, b, b.y, cx0 - 0.95, cx0 + 1.15);
        }
        if (ziel) { var zx = ziel.p1.s.x + cx0 * ziel.p1.s.w, zy = ziel.p1.s.y, gb = W * (fern ? 1.1 : 0.8), gh = H * (fern ? 0.75 : 0.45); lg.globalAlpha = fern ? 0.32 : 0.14; lg.drawImage(glut('255,236,205'), zx - gb / 2, zy - gh * 0.62, gb, gh); lg.globalAlpha = 1; }
      }
      // Lichtkarte anwenden und leuchtende Dinge additiv darüberlegen
      function lichtPass() {
        if (lg) { g.globalCompositeOperation = 'multiply'; g.drawImage(LM, 0, 0, W, H); }
        g.globalCompositeOperation = 'lighter';
        if (HG.sterne && regenI < 0.95) { g.globalAlpha = 0.85 * (1 - regenI); ebene(HG.sterne, parallax * 0.15, 0); }
        if (HG.abendrot && regenI < 0.95) { g.globalAlpha = 1 - regenI; g.fillStyle = HG.abendrot; g.fillRect(0, 0, W, horizont + H * 0.05); }
        for (var i = 0; i < leuchten.length; i++) { var l = leuchten[i]; g.globalAlpha = l[5]; g.drawImage(l[0], l[1], l[2], l[3], l[4]); }
        g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
        if (blendung > 0.01) { g.fillStyle = 'rgba(255,250,235,' + Math.min(0.5, blendung).toFixed(3) + ')'; g.fillRect(0, 0, W, H); }
        // Blitzer: doppelter, heller Blitz
        var bt = uhr - blitzZeit;
        if (bt < 0.55) { var ba = bt < 0.12 ? 0.85 * (1 - bt / 0.12) : (bt > 0.2 && bt < 0.32 ? 0.6 * (1 - (bt - 0.2) / 0.12) : 0); if (ba > 0.01) { g.fillStyle = 'rgba(255,246,246,' + ba.toFixed(3) + ')'; g.fillRect(0, 0, W, H); } }
      }
      // Bewegungsunschärfe: das Bild leicht vergrößert vom Fluchtpunkt aus überblenden (Mitte bleibt scharf)
      function unschaerfe() {
        if (v < 12 || !PUF || leichtModus) return;
        var st = Math.min(1, (v - 12) / 55), cx = W / 2 * DPR, cy = horizont * DPR;
        pufG.drawImage(cvs, 0, 0);
        g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
        g.beginPath(); g.rect(0, (horizont - H * 0.06) * DPR, cvs.width, cvs.height); g.clip();
        for (var i = 1; i <= 3; i++) { var z = 1 + 0.015 * st * i; g.globalAlpha = 0.42 * st / (i + 0.3); g.drawImage(PUF, cx - cx * z, cy - cy * z, cvs.width * z, cvs.height * z); }
        g.restore();
      }
      // Herbst: Blätter taumeln von den Bäumen, drehen und wenden sich und fliegen beim Fahren am Auto vorbei
      function neuesBlatt(start) {
        var vorn = !start && Math.random() < 0.5;
        return { x: vorn ? W * (0.25 + Math.random() * 0.5) : Math.random() * W, y: start ? Math.random() * dashTop : vorn ? horizont - H * 0.1 + Math.random() * H * 0.12 : -10 - Math.random() * 50,
          z: vorn ? 0.25 + Math.random() * 0.3 : 0.3 + Math.random() * 0.75, rot: Math.random() * 6.3, rv: (Math.random() - 0.5) * 5, fl: Math.random() * 6.3, fv: 2 + Math.random() * 5, fw: 0.8 + Math.random() * 1.6, ph: Math.random() * 6.3,
          bild: G.blaetter[Math.floor(Math.random() * G.blaetter.length)] };
      }
      function laubZeichnen(dt) {
        // Laub fällt nur im Wald; beim Hinausfahren verschwinden die Blätter nach und nach
        var vorne = welt[Math.min(welt.length - 1, Math.floor(s / MJS) + 25)], ziel = vorne && vorne.wald && !vorne.ort ? 1 : 0;
        waldF += (ziel - waldF) * Math.min(1, dt * 0.7);
        var unten = p.cockpit !== false ? dashTop : H, sk = W / 1280, n = Math.round((leichtModus ? 22 : 50) * waldF * (1 - regenI * 0.4)), i, b;
        if (blaetter.length < n && Math.random() < dt * 30) blaetter.push(neuesBlatt(false));
        var wind = Math.sin(uhr * 0.4) * 30 + Math.sin(uhr * 1.3) * 12, zoom = v * 0.0055 * dt;
        for (i = 0; i < blaetter.length; i++) {
          b = blaetter[i];
          b.x += (b.x - W / 2) * zoom * b.z * 1.4 + (wind + Math.sin(uhr * b.fw + b.ph) * 36) * b.z * sk * dt;
          b.y += (b.y - horizont) * zoom * b.z * 1.4 + (26 + 34 * b.z) * sk * dt;
          b.z += b.z * zoom * 0.9; b.rot += b.rv * dt; b.fl += b.fv * dt;
          if (b.y > unten + 20 || b.x < -40 || b.x > W + 40 || b.z > 1.8) { if (blaetter.length > n) { blaetter.splice(i, 1); i--; } else blaetter[i] = neuesBlatt(false); continue; }
          var gr = 30 * b.z * sk;
          g.save(); g.translate(b.x, b.y); g.rotate(b.rot); g.scale(Math.cos(b.fl), 1); g.globalAlpha = Math.min(1, b.z * 2.2); g.drawImage(b.bild, -gr / 2, -gr / 2, gr, gr); g.restore();
        }
      }
      // Regen: Regenstriche, Tropfen auf der Scheibe und Scheibenwischer
      function regenZeichnen(dt) {
        var unten = p.cockpit !== false ? dashTop : H, drift = v / 130, i, r, anz = Math.round((leichtModus ? 80 : 190) * regenI), sk = W / 1280;
        if (striche.length > anz) striche.length = anz;
        while (striche.length < anz) striche.push({ x: Math.random() * W, y: Math.random() * unten, l: 10 + Math.random() * 18, sp: 0.9 + Math.random() * 0.6 });
        g.strokeStyle = DUNKEL > 0.5 ? 'rgba(160,172,195,.3)' : 'rgba(225,232,240,.4)'; g.lineWidth = 1; g.beginPath();
        for (i = 0; i < striche.length; i++) {
          r = striche[i];
          var auss = (r.x - W / 2) / (W / 2), vx = auss * drift * W * 0.5 - W * 0.04, vy = H * 1.1 * r.sp + drift * H * 0.6, lv = Math.sqrt(vx * vx + vy * vy) || 1;
          r.y += vy * dt; r.x += vx * dt;
          if (r.y > unten || r.x < 0 || r.x > W) { r.x = Math.random() * W; r.y = Math.random() * unten * 0.35; }
          var lang = r.l * (1 + drift);
          g.moveTo(r.x, r.y); g.lineTo(r.x - vx / lv * lang, r.y - vy / lv * lang);
        }
        g.stroke();
        if (p.cockpit === false) return;
        // Scheibenwischer laufen automatisch, solange es regnet oder Tropfen auf der Scheibe sind; ein Wischzug wird immer zu Ende geführt
        var T = 1.3, an = regenI > 0.04 || tropfen.length > 4;
        if (an || wischT % T > 0.001) { var vor = wischT; wischT += dt; if (!an && Math.floor(wischT / T) > Math.floor(vor / T)) wischT = Math.ceil(vor / T) * T; }
        var f = (wischT % T) / T, th0 = 0.05, th1 = 2.75, th;
        if (f < 0.42) th = th0 + (th1 - th0) * glatt(f / 0.42); else if (f < 0.84) th = th1 - (th1 - th0) * glatt((f - 0.42) / 0.42); else th = th0;
        var zyklus = Math.floor(wischT / T) * 2 + (f >= 0.42 ? 1 : 0);
        if (zyklus !== wischZyklus && f < 0.84 && f > 0) { wischZyklus = zyklus; if (ton) ton.wisch(); }
        var piv = [[W * 0.26, dashTop + 6], [W * 0.62, dashTop + 6]], L = W * 0.36;
        // Neue Tropfen prasseln auf die Scheibe (mit kleinem Aufprallring und leisem Ticken)
        tropfenRest += dt * 36 * regenI;
        while (tropfenRest >= 1) {
          tropfenRest -= 1;
          if (tropfen.length < 130) tropfen.push({ x: W * 0.04 + Math.random() * W * 0.92, y: H * 0.03 + Math.random() * (dashTop - H * 0.03), r: (1.6 + Math.random() * Math.random() * 5.5) * Math.max(0.7, sk), t: uhr, lauf: false, vy: 0, ph: Math.random() * 6, spur: [], halt: 0 });
          if (ton && Math.random() < 0.45) ton.tick();
        }
        // Schwere Tropfen laufen herunter, schlucken kleinere, halten kurz an und ziehen eine feuchte Spur; bei Tempo drückt der Fahrtwind sie nach oben
        for (i = 0; i < tropfen.length; i++) {
          r = tropfen[i]; if (r.weg) continue;
          if (!r.lauf && r.r > 3.6 * Math.max(0.7, sk) && Math.random() < dt * 0.5) r.lauf = true;
          if (r.lauf) {
            if (!r.halt && Math.random() < dt * 0.35) r.halt = uhr + 0.25 + Math.random() * 0.6;
            var stopp = r.halt && uhr < r.halt; if (r.halt && uhr >= r.halt) r.halt = 0;
            var zielV = stopp ? 0 : ((40 + r.r * 14) - v * 0.9) * sk;
            r.vy += (zielV - r.vy) * Math.min(1, dt * 3); r.y += r.vy * dt; r.x += Math.sin(r.y * 0.045 + r.ph) * 9 * sk * dt;
            var letzt = r.spur[r.spur.length - 1];
            if (!letzt || Math.abs(r.y - letzt[1]) > 4) { r.spur.push([r.x, r.y, uhr]); if (r.spur.length > 18) r.spur.shift(); }
            for (var j = 0; j < tropfen.length; j++) { var o2 = tropfen[j]; if (o2 === r || o2.weg || o2.lauf) continue; if (Math.abs(o2.x - r.x) < r.r + o2.r && Math.abs(o2.y - r.y) < r.r + o2.r) { r.r = Math.min(9 * sk + 3, Math.sqrt(r.r * r.r + o2.r * o2.r * 0.6)); o2.weg = true; } }
            r.r -= dt * 0.25; if (r.r < 2.4) { r.lauf = false; r.spur = []; }
            if (r.y > dashTop + 4 || r.y < 0) r.weg = true;
          } else if (v > 70) r.y -= (v - 70) * 0.25 * sk * dt;
        }
        var lo = Math.min(wischAlt, th) - 0.03, hi = Math.max(wischAlt, th) + 0.03;
        tropfen = tropfen.filter(function (t) {
          if (t.weg) return false;
          for (var q = 0; q < 2; q++) { var dx = t.x - piv[q][0], dy = piv[q][1] - t.y, rr = Math.sqrt(dx * dx + dy * dy); if (rr < L && rr > L * 0.1) { var w2 = Math.atan2(dy, dx); if (w2 >= lo && w2 <= hi) return false; } }
          return true;
        });
        wischAlt = th;
        var hell = DUNKEL > 0.5 ? 0.55 : 0.85;
        g.lineCap = 'round';
        for (i = 0; i < tropfen.length; i++) {
          r = tropfen[i];
          if (r.lauf && r.spur.length) {
            r.spur = r.spur.filter(function (pt) { return uhr - pt[2] < 1.4; });
            if (r.spur.length) { g.strokeStyle = 'rgba(225,238,250,' + (0.2 * hell).toFixed(3) + ')'; g.lineWidth = r.r * 0.7; g.beginPath(); g.moveTo(r.spur[0][0], r.spur[0][1]); for (var k = 1; k < r.spur.length; k++) g.lineTo(r.spur[k][0], r.spur[k][1]); g.lineTo(r.x, r.y); g.stroke(); }
          }
          var alter = uhr - r.t;
          if (alter < 0.14) { var kk = alter / 0.14; g.strokeStyle = 'rgba(235,245,255,' + (0.5 * (1 - kk) * hell).toFixed(3) + ')'; g.lineWidth = 1; g.beginPath(); g.arc(r.x, r.y, r.r * (1 + kk * 2.2), 0, Math.PI * 2); g.stroke(); }
          g.globalAlpha = hell; g.drawImage(G.tropfen, r.x - r.r, r.y - r.r * (r.lauf ? 1.3 : 1), r.r * 2, r.r * (r.lauf ? 2.6 : 2)); g.globalAlpha = 1;
        }
        g.strokeStyle = '#0d1114';
        piv.forEach(function (pv) {
          var c = Math.cos(th), sn = Math.sin(th);
          g.lineWidth = Math.max(3, W * 0.005); g.beginPath(); g.moveTo(pv[0], pv[1]); g.lineTo(pv[0] + c * L * 0.55, pv[1] - sn * L * 0.55); g.stroke();
          g.lineWidth = Math.max(2, W * 0.0032); g.beginPath(); g.moveTo(pv[0] + c * L * 0.12, pv[1] - sn * L * 0.12); g.lineTo(pv[0] + c * L, pv[1] - sn * L); g.stroke();
        });
        g.lineCap = 'butt';
      }

      function zeichne() {
        var pos = s / MJS * SEG, bi = Math.floor(pos / SEG), basis = welt[Math.min(bi, welt.length - 1)], pr = (pos % SEG) / SEG;
        var rs = p.linksverkehr ? -1 : 1, stoss = uhr - ruck < 0.35 ? Math.sin(uhr * 90) * 70 * (0.35 - (uhr - ruck)) / 0.35 : 0;
        var hp = uhr - huepfer, hops = hp < 0.4 ? Math.sin(hp / 0.4 * Math.PI) * 240 : 0;
        var kamX = (0.5 + quer) * STRASSE * rs, kamY = basis.p1.y + (basis.p2.y - basis.p1.y) * pr + KAMERA_H + stoss + hops;
        leuchten.length = 0; blendung = 0;
        DUNKEL = Math.max(DUNKEL_T, 0.2 * regenI); DUNST = misch3(DUNST_T, DUNST_R, regenI);
        lg = lgK && (TZ !== 'tag' || regenI > 0.01) ? lgK : null;
        if (lg) { var am = misch3(AMB_T, AMB_R, regenI); lg.globalCompositeOperation = 'source-over'; lg.globalAlpha = 1; lg.fillStyle = 'rgb(' + Math.round(am[0]) + ',' + Math.round(am[1]) + ',' + Math.round(am[2]) + ')'; lg.fillRect(0, 0, W, H); lg.globalCompositeOperation = 'lighter'; }
        parallax += basis.kurve * v * 0.00001;
        ebene(HG.himmel, parallax * 0.15, 0);
        if (HGR && regenI > 0.01) { g.globalAlpha = Math.min(1, regenI); ebene(HGR.himmel, parallax * 0.15, 0); g.globalAlpha = 1; }
        ebene(HG.berge, parallax * 0.35, horizont - HG.berge.height + 6);
        ebene(HG.huegel, parallax * 0.7, horizont - HG.huegel.height + 4);
        g.fillStyle = HG.boden; g.fillRect(0, horizont, W, H - horizont);
        // Projektion
        var x = 0, dx = -(basis.kurve * pr), liste = [], k, sg;
        for (k = 0; k < SICHT && bi + k < welt.length; k++) {
          sg = welt[bi + k];
          projizieren(sg.p1, sg.i * SEG, x, pos, kamX, kamY);
          projizieren(sg.p2, (sg.i + 1) * SEG, x + dx, pos, kamX, kamY);
          x += dx; dx += sg.kurve;
          sg.nebel = Math.min(1, Math.pow(k / SICHT, 1.5) * (1.05 + 0.55 * regenI));
          liste.push(sg);
        }
        var maxY = H;
        for (k = 0; k < liste.length; k++) { sg = liste[k]; sg.sicht = sg.p1.s.z > KTIEFE && sg.p2.s.y < maxY && sg.p2.s.y <= sg.p1.s.y; sg.clip = maxY; if (sg.sicht) maxY = Math.min(maxY, sg.p2.s.y); }
        // Boden und Straße von fern nach nah
        for (k = liste.length - 1; k >= 0; k--) {
          sg = liste[k]; if (!sg.sicht) continue;
          var a = sg.p1.s, b = sg.p2.s, nb = sg.nebel, y1 = Math.min(a.y, sg.clip) + 0.6, y2 = b.y;
          var fl = sg.ort ? [178, 186, 174] : sg.feldL, fr = sg.ort ? [178, 186, 174] : sg.feldR;
          if (nass > 0.01) { fl = nassDunkler(fl); fr = nassDunkler(fr); }
          g.fillStyle = mischen(fl, DUNST, nb); g.fillRect(0, y2, Math.max(0, Math.min(a.x - a.w * 1.2, b.x - b.w * 1.2)) + 2, y1 - y2);
          var rx = Math.min(W, Math.max(a.x + a.w * 1.2, b.x + b.w * 1.2)) - 2; g.fillStyle = mischen(fr, DUNST, nb); g.fillRect(rx, y2, W - rx, y1 - y2);
          viereck(a, y1, b, y2, -3.4, -1.18, mischen(fl, DUNST, nb)); viereck(a, y1, b, y2, 1.18, 3.4, mischen(fr, DUNST, nb));
          var bank = sg.ort ? [198, 198, 194] : HERBST ? [160, 128, 70] : [126, 172, 98]; if (nass > 0.01) bank = nassDunkler(bank);
          viereck(a, y1, b, y2, -1.2, -1.0, mischen(bank, DUNST, nb)); viereck(a, y1, b, y2, 1.0, 1.2, mischen(bank, DUNST, nb));
          // nasse Fahrbahn: dunkler Asphalt, der in der Ferne zunehmend den Himmel spiegelt
          var asph = nass > 0.01 ? misch3(TROCKEN, misch3(NASS, REFL, Math.min(0.8, 0.04 + k / SICHT * 2.0)), nass) : TROCKEN, af = mischen(asph, DUNST, nb);
          if (sg.kreuzung) { viereck(a, y1, b, y2, -3.4, -1.0, af); viereck(a, y1, b, y2, 1.0, 3.4, af); }
          viereck(a, y1, b, y2, -1.0, 1.0, af);
          var spur = mischen(nass > 0.01 ? misch3([96, 102, 108], [asph[0] - 10, asph[1] - 10, asph[2] - 8], nass) : [96, 102, 108], DUNST, nb);
          if (HERBST && !sg.ort && (sg.i * 7919) % 13 < 2) { var lf = misch3(sg.i % 2 ? [184, 96, 36] : [196, 150, 50], bank, 0.45); viereck(a, y1, b, y2, -1.2, -1.0, mischen(lf, DUNST, nb)); if (sg.i % 3) viereck(a, y1, b, y2, 1.0, 1.18, mischen(lf, DUNST, nb)); }
          viereck(a, y1, b, y2, 0.22, 0.38, spur); viereck(a, y1, b, y2, 0.62, 0.78, spur); viereck(a, y1, b, y2, -0.78, -0.62, spur); viereck(a, y1, b, y2, -0.38, -0.22, spur);
          var lin = mischen(nass > 0.01 ? misch3([240, 243, 245], [200, 206, 210], nass) : [240, 243, 245], DUNST, nb);
          if (!sg.kreuzung) { viereck(a, y1, b, y2, -0.97, -0.93, lin); viereck(a, y1, b, y2, 0.93, 0.97, lin); }
          if (sg.i % 6 < 2) viereck(a, y1, b, y2, -0.022, 0.022, lin);
          if (sg.zebra) for (var zz = -0.86; zz < 0.86; zz += 0.22) viereck(a, y1, b, y2, zz, zz + 0.12, lin);
          if (sg.stoplinie) viereck(a, y1, b, y2, p.linksverkehr ? -0.93 : 0.02, p.linksverkehr ? -0.02 : 0.93, lin);
          if (sg.gleis) { viereck(a, y1, b, y2, -1.5, 1.5, mischen([92, 84, 76], DUNST, nb)); viereck(a, y1 - (y1 - y2) * 0.3, b, y2 + (y1 - y2) * 0.35, -1.5, 1.5, '#c3c8cc'); }
        }
        if (lg && licht) scheinwerfer(liste, pos, rs);
        // Objekte, Ereignisse, Gegenverkehr von fern nach nah
        var phase = Math.floor(uhr * 7.5) % 4;
        for (k = liste.length - 1; k >= 2; k--) {
          sg = liste[k];
          if (sg.p1.s.z <= KTIEFE) continue;
          var kp = sg.p1.s.w / STRASSE, sx = sg.p1.s.x, sy = sg.p1.s.y, wpx = sg.p1.s.w;
          if (sy > sg.clip + 3 || kp * M * 3 > H * 1.6) continue;
          aktD = (sg.i - pos / SEG) * MJS; aktA = 1 - sg.nebel * 0.55;
          g.globalAlpha = aktA;
          for (var oi = 0; oi < sg.objekte.length; oi++) {
            var o = sg.objekte[oi];
            if (o.breite) { var hz = o.h * M * kp; if (hz > 1) g.drawImage(o.bild, sx + o.x * wpx - wpx * 0.45, sy - hz, wpx * 0.9, hz); continue; }
            if (!sprite(o.bild, sx + o.x * wpx, sy, kp, o.h, o.spiegeln) || DUNKEL < 0.3) continue;
            if (o.laterne) laternenLicht(o, sy, wpx);
            else if (o.bild.licht) { leuchten.push([o.bild.licht, SR.x, SR.y, SR.w, SR.h, DUNKEL * aktA]); if (nass > 0.05) leuchten.push([glut('255,180,100'), SR.x + SR.w * 0.15, sy - SR.h * 0.04, SR.w * 0.7, SR.h * 0.55, 0.3 * DUNKEL * nass * aktA]); }
          }
          var e = sg.ereignis;
          if (e && !e.weg) ereignisZeichnen(e, sx, sy, kp, wpx, phase, rs);
          for (var gi = 0; gi < gegenverkehr.length; gi++) if (gegenverkehr[gi].seg === sg.i) gegenAuto(gegenverkehr[gi], sg, rs);
          g.globalAlpha = 1;
        }
        if (HERBST) laubZeichnen(letztDt);
        unschaerfe(); // vor dem Licht: Lichter bleiben klar, keine Doppelbilder heller Fenster
        lichtPass();
        if (regenI > 0.01 || tropfen.length) regenZeichnen(letztDt);
        if (p.cockpit !== false) cockpit(); else frontsicht();
      }

      function ereignisZeichnen(e, sx, sy, kp, wpx, phase, rs) {
        var gross = p.schildGross ? 1.35 : 1, randX = sx + rs * 1.45 * wpx, linksX = sx - rs * 1.45 * wpx, gewartet = e.stehZeit, bld;
        if (e.typ === 'schild') { bld = G.limit[e.neu] || G.limit[50]; if (sprite(bld, randX, sy, kp, 2.9 * gross)) beleuchte(bld); }
        else if (e.typ === 'ampel') {
          var z = e.rot ? (gewartet > 1.4 ? 'gruen' : (gewartet > 1.0 ? 'gelb' : 'rot')) : 'gruen';
          if (sprite(G.ampel[z], randX, sy, kp, 4.3 * gross)) ampelLicht(z, sy);
          if (sprite(G.ampel[z], linksX, sy, kp, 4.3 * gross)) ampelLicht(z, sy);
        }
        else if (e.typ === 'stop') { if (sprite(G.stopp, randX, sy, kp, 2.9 * gross)) beleuchte(G.stopp); }
        else if (e.typ === 'fuss') {
          if (e.person) { var weg = HT.klemmen((gewartet - 0.3) / 1.8, 0, 1), px = rs * (1.6 - weg * 3.4); bld = weg > 0 && weg < 1 ? G.person[e.farbe][phase] : G.steht[e.farbe]; if (sprite(bld, sx + px * wpx, sy, kp, 1.75, rs > 0)) beleuchte(bld, rs > 0); }
        }
        else if (e.typ === 'hindernis') {
          var flucht = HT.klemmen((gewartet - 0.8) / 1.2, 0, 1), hx = hindernisX(e) * rs, laeuft = flucht > 0, hh = 1.3, sp = false, tl = e.lauf === undefined ? -1 : uhr - e.lauf;
          var rennt = tl >= 0 && (tl < (e.art === 'kind' ? 0.9 : 1.1) || laeuft), ph2 = Math.floor(uhr * (e.art === 'kind' ? 11 : 9)) % 4;
          if (e.art === 'reh') { bld = G.reh[laeuft ? phase : 0]; hh = 1.5; sp = rs < 0; }
          else if (e.art === 'hund') { bld = G.hund[laeuft ? phase : 0]; hh = 0.8; sp = rs < 0; }
          else if (e.art === 'person') { bld = rennt ? G.person[e.farbe][ph2] : G.steht[e.farbe]; hh = 1.75; sp = rs > 0; }
          else if (e.art === 'kind') { bld = G.kind[e.farbe][rennt ? ph2 : 0]; hh = 1.15; sp = rs > 0; }
          else if (e.art === 'ball') {
            hh = 0.42; var bh = hh * M * kp, bx = sx + hx * wpx;
            if (bh > 1.2 && bx > -bh && bx < W + bh) {
              g.save(); g.translate(bx, sy - bh / 2); g.rotate(-(tl > 0 ? tl : 0) * 9 * rs); g.drawImage(G.ball, -bh / 2, -bh / 2, bh, bh); g.restore();
              SR.x = bx - bh / 2; SR.y = sy - bh; SR.w = bh; SR.h = bh; beleuchte(G.ball);
            }
            return;
          }
          else { bld = G.kisten; }
          if (sprite(bld, sx + hx * wpx, sy, kp, hh, sp)) beleuchte(bld, sp);
        }
        else if (e.typ === 'blitzer') {
          if (sprite(G.blitzer, randX + rs * 0.25 * wpx, sy, kp, 3.2)) {
            beleuchte(G.blitzer);
            var bt = uhr - blitzZeit;
            if (blitzE === e && bt < 0.6) { var bx2 = SR.x + SR.w * G.blitzer.blitz[0], by2 = SR.y + SR.h * G.blitzer.blitz[1], br = SR.w * 6 * (1 - bt / 0.6); leuchten.push([glut('255,235,235'), bx2 - br, by2 - br, br * 2, br * 2, 1]); }
          }
        }
        else if (e.typ === 'bahn') {
          var zu = e.zu && gewartet < 1.6, blink = Math.floor(uhr * 2.2) % 2, nrR = zu ? 1 + blink : 0, nrL = zu ? 2 - blink : 0;
          if (sprite(G.andreas[nrR], randX, sy, kp, 3.4)) { beleuchte(G.andreas[nrR]); if (zu) warnLicht(nrR); }
          if (sprite(G.andreas[nrL], linksX, sy, kp, 3.4)) { beleuchte(G.andreas[nrL]); if (zu) warnLicht(nrL); }
          if (zu) { var sh = 0.32 * M * kp, sw = wpx * 2.1; if (sh > 1) g.drawImage(G.schranke, sx - sw / 2, sy - sh * 3.2, sw, sh); var zh = 4.2 * M * kp, zw = zh * G.zug.width / G.zug.height, zx = ((uhr * 0.35) % 1) * (zw + wpx * 6) - zw - wpx * 3; if (gewartet > 0.05) g.drawImage(G.zug, sx + zx, sy - zh - 2, zw, zh); }
        }
        else if (e.typ === 'werbung') { bld = G.tafeln[e.farbe % G.tafeln.length]; if (sprite(bld, sx + rs * 2.6 * wpx, sy, kp, 5)) beleuchte(bld); }
        else if (e.typ === 'blinker' && !e.gewaehlt) { var pf = G.pfeil[e.seite]; if (!p.blinkerTon && e.offen && Math.floor(uhr * 3) % 2) return; if (sprite(pf, randX + rs * 0.6 * wpx, sy, kp, 3.6)) beleuchte(pf); }
      }

      function balken(x, y, b, h, anteil, farbe, name, rest) {
        g.fillStyle = 'rgba(255,255,255,.1)'; rrect(g, x, y, b, h, h / 2); g.fill();
        if (anteil > 0) { var bg = g.createLinearGradient(x, 0, x + b, 0); bg.addColorStop(0, farbe[0]); bg.addColorStop(1, farbe[1]); g.fillStyle = bg; rrect(g, x, y, Math.max(h, b * HT.klemmen(anteil, 0, 1)), h, h / 2); g.fill(); }
        g.fillStyle = '#cfd8dd'; g.font = '700 ' + Math.round(h * 1.1) + 'px -apple-system, Helvetica, sans-serif'; g.textAlign = 'left'; g.textBaseline = 'alphabetic'; g.fillText(name, x, y - h * 0.5);
        g.textAlign = 'right'; g.fillStyle = '#8fa0a9'; g.fillText(rest, x + b, y - h * 0.5);
      }
      function polizeiAktiv() { for (var i = 0; i < plan.events.length; i++) { var e = plan.events[i]; if (e.typ === 'polizei' && e.offen && e.blau) return e; } return null; }
      function blinkerAktiv() { for (var i = 0; i < plan.events.length; i++) { var e = plan.events[i]; if (e.typ === 'blinker' && e.offen && !e.erledigt) return e; } return null; }

      function rueckspiegel(mx, my, mb, mh) {
        g.save();
        g.fillStyle = '#14191c'; rrect(g, mx - 6, my - 6, mb + 12, mh + 12, 14); g.fill();
        rrect(g, mx, my, mb, mh, 10); g.clip();
        var spf = DUNKEL > 0.5 ? ['#0a1220', '#1c2636', '#10151c', '#0b0f14', '#1a1e22'] : regenI > 0.5 || DUNKEL > 0.3 ? ['#8e99a4', '#c5ccd2', '#6f8a66', '#5f7a58', '#4d5358'] : ['#9fcbe6', '#d9edf6', '#8bbd76', '#79ad66', '#6a7076'];
        var sk = g.createLinearGradient(0, my, 0, my + mh); sk.addColorStop(0, spf[0]); sk.addColorStop(0.5, spf[1]); sk.addColorStop(0.5, spf[2]); sk.addColorStop(1, spf[3]);
        g.fillStyle = sk; g.fillRect(mx, my, mb, mh);
        g.fillStyle = spf[4]; g.beginPath(); g.moveTo(mx + mb * 0.42, my + mh * 0.5); g.lineTo(mx + mb * 0.58, my + mh * 0.5); g.lineTo(mx + mb * 0.95, my + mh); g.lineTo(mx + mb * 0.05, my + mh); g.closePath(); g.fill();
        var pol = polizeiAktiv();
        if (pol) {
          var t = HT.klemmen((uhr - pol.seit) / 1.2, 0, 1), ph = mh * (0.35 + t * 0.45), pw = ph * G.polizei.width / G.polizei.height;
          g.drawImage(G.polizei, mx + mb / 2 - pw / 2, my + mh * 0.98 - ph, pw, ph);
          var an = Math.floor(uhr * 8) % 2;
          g.fillStyle = an ? '#2f7bff' : '#ff3b30'; g.shadowColor = g.fillStyle; g.shadowBlur = 18;
          g.fillRect(mx + mb / 2 - pw * 0.2, my + mh * 0.98 - ph * 0.98, pw * 0.4, ph * 0.08); g.shadowBlur = 0;
          g.globalAlpha = 0.25; g.fillStyle = an ? '#2f7bff' : '#ff3b30'; g.fillRect(mx, my, mb, mh); g.globalAlpha = 1;
        }
        var gl = g.createLinearGradient(mx, my, mx + mb, my + mh); gl.addColorStop(0, 'rgba(255,255,255,.18)'); gl.addColorStop(0.4, 'rgba(255,255,255,0)'); g.fillStyle = gl; g.fillRect(mx, my, mb, mh);
        g.restore();
      }

      function cockpit() {
        var dt0 = dashTop;
        // A-Säulen und Dachkante
        g.fillStyle = '#20282d';
        g.beginPath(); g.moveTo(0, 0); g.lineTo(W * 0.1, 0); g.quadraticCurveTo(W * 0.04, H * 0.35, W * 0.02, dt0); g.lineTo(0, dt0); g.closePath(); g.fill();
        g.beginPath(); g.moveTo(W, 0); g.lineTo(W * 0.9, 0); g.quadraticCurveTo(W * 0.96, H * 0.35, W * 0.98, dt0); g.lineTo(W, dt0); g.closePath(); g.fill();
        g.fillRect(0, 0, W, H * 0.025);
        rueckspiegel(W * 0.39, H * 0.04, W * 0.22, H * 0.095);
        // Armaturenbrett
        var db = g.createLinearGradient(0, dt0 - 20, 0, H); db.addColorStop(0, '#3a4a52'); db.addColorStop(0.12, '#2a363c'); db.addColorStop(1, '#151c20');
        g.fillStyle = db; g.beginPath(); g.moveTo(0, dt0 + 18); g.quadraticCurveTo(W * 0.5, dt0 - 26, W, dt0 + 18); g.lineTo(W, H); g.lineTo(0, H); g.closePath(); g.fill();
        if (DUNKEL > 0.3) {
          g.fillStyle = 'rgba(2,5,9,' + (0.6 * DUNKEL).toFixed(2) + ')'; g.fill();
          g.beginPath(); g.moveTo(0, 0); g.lineTo(W * 0.1, 0); g.quadraticCurveTo(W * 0.04, H * 0.35, W * 0.02, dt0); g.lineTo(0, dt0); g.closePath(); g.fill();
          g.beginPath(); g.moveTo(W, 0); g.lineTo(W * 0.9, 0); g.quadraticCurveTo(W * 0.96, H * 0.35, W * 0.98, dt0); g.lineTo(W, dt0); g.closePath(); g.fill();
        }
        g.strokeStyle = 'rgba(27,168,181,.55)'; g.lineWidth = 2; g.beginPath(); g.moveTo(0, dt0 + 22); g.quadraticCurveTo(W * 0.5, dt0 - 22, W, dt0 + 22); g.stroke();
        // Instrumententafel
        var kb = Math.min(W * 0.56, 640), kh = (H - dt0) * 0.62, kx = W / 2 - kb / 2, ky = dt0 + (H - dt0) * 0.12;
        g.fillStyle = '#0d1316'; rrect(g, kx, ky, kb, kh, kh * 0.22); g.fill();
        g.strokeStyle = 'rgba(255,255,255,.12)'; g.lineWidth = 2; rrect(g, kx, ky, kb, kh, kh * 0.22); g.stroke();
        var tr = Math.min(kh * 0.46, kb * 0.2);
        tacho(g, kx + kb * 0.27, ky + kh * 0.54, tr, v, soll, p.band);
        // Weg / Zeit
        var weg = s / plan.laenge, zeit = uhr / Math.max(30, p.dauerDurchgangSek || 90), bx = kx + kb * 0.52, bb = kb * 0.4, bh = Math.max(7, kh * 0.075);
        balken(bx, ky + kh * 0.3, bb, bh, weg, ['#1BA8B5', '#4fd2dc'], 'Weg', Math.max(0, Math.round(plan.laenge - s)) + ' m');
        var zuSpaet = zeit > weg + 0.08;
        balken(bx, ky + kh * 0.55, bb, bh, zeit, zuSpaet ? ['#c9302c', '#ff6b5e'] : ['#d9a520', '#f4d35e'], 'Zeit', Math.max(0, Math.round((p.dauerDurchgangSek || 90) - uhr)) + ' s');
        // Kontrollleuchten und Blinker
        var symR = Math.min(kh * 0.08, bb * 0.06);
        lampeSymbol(g, bx + bb * 0.06, ky + kh * 0.82, symR, 'tanken', !!(lampe && lampe.art === 'tanken' && !lampe.erledigt));
        lampeSymbol(g, bx + bb * 0.22, ky + kh * 0.82, symR, 'oel', !!(lampe && lampe.art === 'oel' && !lampe.erledigt));
        lichtSymbol(g, bx + bb * 0.39, ky + kh * 0.82, symR, false, licht >= 1);
        lichtSymbol(g, bx + bb * 0.55, ky + kh * 0.82, symR, true, licht === 2);
        var bl = blinkerAktiv(), blink = Math.floor(uhr * 3) % 2;
        [['links', -1], ['rechts', 1]].forEach(function (q) {
          var an = bl && bl.seite === q[0] && blink, cx = bx + bb * (q[1] < 0 ? 0.75 : 0.93), cy = ky + kh * 0.82, r = symR;
          g.fillStyle = an ? (p.blinkerTon ? '#30d158' : '#ff453a') : '#2c363c'; if (an) { g.shadowColor = g.fillStyle; g.shadowBlur = 14; }
          g.beginPath(); g.moveTo(cx + q[1] * r, cy); g.lineTo(cx - q[1] * r * 0.2, cy - r * 0.8); g.lineTo(cx - q[1] * r * 0.2, cy - r * 0.3); g.lineTo(cx - q[1] * r, cy - r * 0.3); g.lineTo(cx - q[1] * r, cy + r * 0.3); g.lineTo(cx - q[1] * r * 0.2, cy + r * 0.3); g.lineTo(cx - q[1] * r * 0.2, cy + r * 0.8); g.closePath(); g.fill(); g.shadowBlur = 0;
        });
        // Lenkrad
        var lr = Math.min(W * 0.24, 360), lx = W / 2, ly = ky + kh + (H - ky - kh) * 0.35 + lr, dreh = (bl && bl.gewaehlt ? (bl.gewaehlt === 'links' ? -0.3 : 0.3) : 0) + querV * 0.55 * (p.linksverkehr ? -1 : 1);
        g.save(); g.translate(lx, ly); g.rotate(dreh);
        g.strokeStyle = '#11171a'; g.lineWidth = lr * 0.13; g.beginPath(); g.arc(0, 0, lr, Math.PI * 1.08, Math.PI * 1.92); g.stroke();
        g.strokeStyle = 'rgba(255,255,255,.12)'; g.lineWidth = lr * 0.025; g.beginPath(); g.arc(0, -lr * 0.02, lr * 1.03, Math.PI * 1.15, Math.PI * 1.85); g.stroke();
        g.fillStyle = '#1BA8B5'; g.fillRect(-lr * 0.03, -lr * 1.07, lr * 0.06, lr * 0.1);
        g.restore();
        // Radio mit Durchsage
        var rbx = W * 0.8, rby = dt0 + (H - dt0) * 0.18, rbb = W * 0.17, rbh = (H - dt0) * 0.26;
        g.fillStyle = '#0d1316'; rrect(g, rbx, rby, rbb, rbh, 10); g.fill();
        g.fillStyle = stau && !stau.erledigt ? '#7fe3ec' : '#3e5a62'; g.textAlign = 'center'; g.textBaseline = 'middle';
        passText(stau && !stau.erledigt ? 'Verkehrsfunk ' + stau.name : (p.stau ? 'Gesucht: ' + suchbahn : 'Radio'), rbx + rbb / 2, rby + rbh / 2, rbb * 0.86, rbh * 0.3);
        // Tempo-Hinweis links
        var lbx = W * 0.03, lby = dt0 + (H - dt0) * 0.18, lbb = W * 0.17, lbh = (H - dt0) * 0.26;
        g.fillStyle = '#0d1316'; rrect(g, lbx, lby, lbb, lbh, 10); g.fill();
        g.fillStyle = '#cfd8dd'; passText('Ziel ' + soll + ' km/h', lbx + lbb / 2, lby + lbh * 0.32, lbb * 0.86, lbh * 0.26);
        g.fillStyle = punkte < 0 ? '#ff8a80' : '#7fe3ec'; passText('Punkte: ' + punkte, lbx + lbb / 2, lby + lbh * 0.72, lbb * 0.86, lbh * 0.28);
        // Aufsteigende +10 / −5
        for (var pa = 0; pa < punktAnim.length; pa++) {
          var an2 = punktAnim[pa], at = uhr - an2.t; if (at > 1.6) continue;
          g.globalAlpha = 1 - at / 1.6; g.fillStyle = an2.n > 0 ? '#5fe08e' : '#ff6b5e';
          passText((an2.n > 0 ? '+' : '−') + Math.abs(an2.n), lbx + lbb * 0.8, lby - at * 40, lbb, lbh * 0.36); g.globalAlpha = 1;
        }
        // Warnung, solange zu schnell gefahren wird
        if (warnAn && Math.floor(uhr * 2.5) % 2 === 0) {
          var wb = Math.min(W * 0.42, 360), wh = Math.max(34, H * 0.055), wx = W / 2 - wb / 2, wy = dt0 - wh - H * 0.03;
          g.fillStyle = 'rgba(200,30,30,.92)'; rrect(g, wx, wy, wb, wh, wh / 2); g.fill();
          g.strokeStyle = 'rgba(255,255,255,.85)'; g.lineWidth = 2; rrect(g, wx, wy, wb, wh, wh / 2); g.stroke();
          var ts = wh * 0.62, tx = wx + wh * 0.62, ty = wy + wh / 2;
          g.fillStyle = '#ffd60a'; g.beginPath(); g.moveTo(tx, ty - ts * 0.5); g.lineTo(tx + ts * 0.55, ty + ts * 0.45); g.lineTo(tx - ts * 0.55, ty + ts * 0.45); g.closePath(); g.fill();
          g.fillStyle = '#1b1b1b'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '900 ' + Math.round(ts * 0.7) + 'px -apple-system, Helvetica, sans-serif'; g.fillText('!', tx, ty + ts * 0.08);
          g.fillStyle = '#fff'; passText('Geschwindigkeit zu hoch', wx + wb / 2 + wh * 0.3, ty, wb - wh * 1.6, wh * 0.46);
        }
      }
      function passText(text, x, y, maxB, gr) {
        var f = Math.round(gr); g.font = '700 ' + f + 'px -apple-system, Helvetica, sans-serif';
        var b = g.measureText(text).width; if (b > maxB) { f = Math.max(8, Math.floor(f * maxB / b)); g.font = '700 ' + f + 'px -apple-system, Helvetica, sans-serif'; }
        g.fillText(text, x, y);
      }
      function frontsicht() {
        // schlichte Frontansicht: Motorhaube, Tacho rechts unten, Balken oben
        var hb = g.createLinearGradient(0, H * 0.86, 0, H); hb.addColorStop(0, '#1fb3c2'); hb.addColorStop(1, '#0f7184');
        g.fillStyle = hb; g.beginPath(); g.moveTo(W * 0.1, H); g.quadraticCurveTo(W * 0.5, H * 0.83, W * 0.9, H); g.closePath(); g.fill();
        var r = Math.min(W, H) * 0.12;
        tacho(g, W - r - 22, H - r - 22, r, v, soll, p.band);
        var weg = s / plan.laenge, zeit = uhr / Math.max(30, p.dauerDurchgangSek || 90);
        g.fillStyle = 'rgba(13,19,22,.75)'; rrect(g, 14, 14, Math.min(320, W * 0.4), 70, 12); g.fill();
        balken(28, 40, Math.min(290, W * 0.36), 8, weg, ['#1BA8B5', '#4fd2dc'], 'Weg', Math.max(0, Math.round(plan.laenge - s)) + ' m');
        balken(28, 68, Math.min(290, W * 0.36), 8, zeit, zeit > weg + 0.08 ? ['#c9302c', '#ff6b5e'] : ['#d9a520', '#f4d35e'], 'Zeit', Math.max(0, Math.round((p.dauerDurchgangSek || 90) - uhr)) + ' s');
      }

      function schritt(dt) {
        if (fertig) return;
        masse(); letztDt = dt;
        // Automatisch leichter werden, wenn der Rechner die Bilder nicht schafft (Mittel über 3 s > 24 ms)
        if (!leichtModus && uhr > 2) { bildzeitSumme += dt; bildzeitN++; if (bildzeitSumme > 3) { if (bildzeitSumme / bildzeitN > 0.024) { leichtModus = true; SICHT = 190; W = 0; } bildzeitSumme = 0; bildzeitN = 0; } }
        if (uhr > regenWechselBei) { regenWechselBei = 1e9; regenZiel = regenZiel ? 0 : 1; meldung(regenZiel ? 'Es fängt an zu regnen. Die Scheibenwischer laufen automatisch.' : 'Der Regen hört auf. Die Straße bleibt noch eine Weile nass.'); }
        regenI += (regenZiel - regenI) * Math.min(1, dt * 0.12);
        var nassZiel = Math.min(1, regenI * 1.5); nass += (nassZiel - nass) * Math.min(1, dt * (nassZiel > nass ? 0.25 : 0.03));
        var gas = halten.gas || tasten.hoch || uhr < gasBis, bremse = halten.bremse || tasten.runter || uhr < bremseBis;
        // Weich ansprechende Pedale; die Beschleunigung nimmt mit dem Tempo ab (0 auf 50 in etwa 7 s), ohne Gas rollt der Wagen langsam aus
        gasP += ((gas && !bremse ? 1 : 0) - gasP) * Math.min(1, dt * 4.5);
        bremsP += ((bremse ? 1 : 0) - bremsP) * Math.min(1, dt * 9);
        v += (gasP * 9.5 * (1 - v / 150) - bremsP * 34 - 1.1 - v * 0.016) * dt;
        if (v < 0) v = 0; if (v > 130) v = 130;
        s += (v / 3.6) * dt;
        // Leichtes Lenken zum Ausweichen; ohne Taste führt der Spurhalter zurück in die Spurmitte
        var lenk = ((halten.rechts || tasten.rechts) ? 1 : 0) - ((halten.links || tasten.links) ? 1 : 0);
        var zielQ = lenk ? lenk * (p.linksverkehr ? -1 : 1) * 0.9 * Math.min(1, v / 15) : -quer * 1.8;
        querV += (zielQ - querV) * Math.min(1, dt * 7); quer += querV * dt;
        if (quer < -0.62) { quer = -0.62; querV = Math.max(0, querV); }
        if (quer > 0.5) { quer = 0.5; querV = Math.min(0, querV); }
        schilder(); pruefeStopps(dt); blinkerOeffnen(); nebenaufgaben(dt); tempoPruefen(dt);
        // Gegenverkehr (nur Darstellung)
        if (uhr > naechstesGegenauto) { gegenverkehr.push({ z: s + SICHT * MJS, bild: G.gegen[Math.floor(Math.random() * G.gegen.length)], v: 55 + Math.random() * 30 }); naechstesGegenauto = uhr + 4 + Math.random() * 7; }
        gegenverkehr.forEach(function (o) {
          o.z -= o.v / 3.6 * dt; o.seg = Math.floor(o.z / MJS);
          var d = o.z - s;
          if (licht === 2 && DUNKEL > 0.4 && !o.gehupt && d < 170 && d > 30) {
            o.gehupt = true; o.hupe = uhr;
            if (uhr > blendHinweisBis) { meldung('Lichthupe vom Gegenverkehr: Sie blenden. Mit F abblenden.'); blendHinweisBis = uhr + 10; }
          }
        });
        gegenverkehr = gegenverkehr.filter(function (o) { return o.z > s + 2; });
        if (DUNKEL > 0.4 && licht === 0 && uhr > lichtHinweisBis) { meldung('Es ist dunkel. Licht mit L einschalten.'); lichtHinweisBis = uhr + 12; }
        if (ton) ton.update(v, gasP, false);
        if (uhr > hinweisBis && hinweis.className !== 'sv-hinweis') hinweis.className = 'sv-hinweis';
        var zeitAnteil = uhr / Math.max(30, p.dauerDurchgangSek || 90), wegAnteil = s / plan.laenge;
        if (wegAnteil >= 1) ende('Strecke geschafft.');
        else if (zeitAnteil > 1 && wegAnteil < 0.92 && uhr > hinweisBis - 2) meldung('Die Zeit ist fast um. Der Weg sollte vor der Zeit fertig sein.');
        zeichne();
      }

      function klangStarten() {
        var A = HT.audio, ac = A.kontext ? A.kontext() : null;
        if (!ac || !ac.createBiquadFilter) return null;
        try {
          var master = ac.createGain(); master.gain.value = 0; master.connect(ac.destination);
          var len = ac.sampleRate * 2, buf = ac.createBuffer(1, len, ac.sampleRate), d = buf.getChannelData(0), i;
          for (i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
          var rauschen = function (typ, freq, q, laut) {
            var src = ac.createBufferSource(); src.buffer = buf; src.loop = true;
            var fl = ac.createBiquadFilter(); fl.type = typ; fl.frequency.value = freq; if (q) fl.Q.value = q;
            var gn = ac.createGain(); gn.gain.value = laut; src.connect(fl); fl.connect(gn); gn.connect(master); src.start();
            return { src: src, f: fl, g: gn };
          };
          var m1 = ac.createOscillator(), m2 = ac.createOscillator(), mf = ac.createBiquadFilter(), mg = ac.createGain();
          m1.type = 'sawtooth'; m2.type = 'square'; mf.type = 'lowpass'; mf.frequency.value = 260; mg.gain.value = 0.018;
          m1.connect(mf); m2.connect(mf); mf.connect(mg); mg.connect(master); m1.start(); m2.start();
          var wind = rauschen('lowpass', 400, 0, 0);
          var regen1 = REGEN_MOEGLICH ? rauschen('highpass', 1100, 0, 0) : null, regen2 = REGEN_MOEGLICH ? rauschen('bandpass', 2600, 0.8, 0) : null;
          var GAENGE = [0, 18, 34, 54, 78, 200];
          return {
            update: function (vv, gasAnteil, pause) {
              var t = ac.currentTime;
              master.gain.setTargetAtTime(pause || !A.an ? 0 : A.lautstaerke * 0.9, t, 0.15);
              var gg = 1; while (gg < GAENGE.length - 1 && vv > GAENGE[gg]) gg++;
              var rpm = 850 + (vv - GAENGE[gg - 1]) / (GAENGE[gg] - GAENGE[gg - 1]) * 2400;
              m1.frequency.setTargetAtTime(rpm / 30, t, 0.08); m2.frequency.setTargetAtTime(rpm / 60, t, 0.08);
              mf.frequency.setTargetAtTime(200 + gasAnteil * 380 + rpm * 0.05, t, 0.1);
              mg.gain.setTargetAtTime(0.016 + gasAnteil * 0.022, t, 0.1);
              wind.g.gain.setTargetAtTime(Math.min(0.09, vv / 130 * 0.07) * (1 + 0.5 * nass), t, 0.2);
              if (regen1) { regen1.g.gain.setTargetAtTime(0.11 * regenI, t, 0.3); regen2.g.gain.setTargetAtTime(0.05 * regenI + 0.02 * nass * Math.min(1, vv / 60), t, 0.3); }
              wind.f.frequency.setTargetAtTime(250 + vv * 9, t, 0.2);
            },
            tick: function () {
              if (!A.an) return;
              var t = ac.currentTime, src = ac.createBufferSource(), fl = ac.createBiquadFilter(), gn = ac.createGain();
              src.buffer = buf; fl.type = 'highpass'; fl.frequency.value = 2500 + Math.random() * 3000;
              gn.gain.setValueAtTime(0.0001, t); gn.gain.exponentialRampToValueAtTime(0.015 + Math.random() * 0.03, t + 0.004); gn.gain.exponentialRampToValueAtTime(0.0001, t + 0.03);
              src.connect(fl); fl.connect(gn); gn.connect(master); src.start(t, Math.random() * 1.5); src.stop(t + 0.04);
            },
            plopp: function () {
              if (!A.an) return;
              var t = ac.currentTime, o = ac.createOscillator(), gn = ac.createGain();
              o.type = 'sine'; o.frequency.setValueAtTime(190, t); o.frequency.exponentialRampToValueAtTime(65, t + 0.16);
              gn.gain.setValueAtTime(0.0001, t); gn.gain.exponentialRampToValueAtTime(0.22, t + 0.012); gn.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
              o.connect(gn); gn.connect(master); o.start(t); o.stop(t + 0.25);
            },
            blitz: function () {
              if (!A.an) return;
              var t = ac.currentTime, src = ac.createBufferSource(), fl = ac.createBiquadFilter(), gn = ac.createGain();
              src.buffer = buf; fl.type = 'highpass'; fl.frequency.value = 3000;
              gn.gain.setValueAtTime(0.0001, t); gn.gain.exponentialRampToValueAtTime(0.06, t + 0.005); gn.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
              src.connect(fl); fl.connect(gn); gn.connect(master); src.start(t); src.stop(t + 0.15);
            },
            ruf: function () {
              if (!A.an) return;
              var t = ac.currentTime, o = ac.createOscillator(), gn = ac.createGain();
              o.type = 'triangle'; o.frequency.setValueAtTime(620, t); o.frequency.linearRampToValueAtTime(760, t + 0.12);
              gn.gain.setValueAtTime(0.0001, t); gn.gain.exponentialRampToValueAtTime(0.035, t + 0.03); gn.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
              o.connect(gn); gn.connect(master); o.start(t); o.stop(t + 0.3);
            },
            wisch: function () {
              if (!A.an) return;
              var t = ac.currentTime, src = ac.createBufferSource(), fl = ac.createBiquadFilter(), gn = ac.createGain();
              src.buffer = buf; fl.type = 'bandpass'; fl.Q.value = 1.4; fl.frequency.setValueAtTime(700, t); fl.frequency.linearRampToValueAtTime(1500, t + 0.45);
              gn.gain.setValueAtTime(0.0001, t); gn.gain.exponentialRampToValueAtTime(0.07, t + 0.08); gn.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
              src.connect(fl); fl.connect(gn); gn.connect(master); src.start(t, Math.random()); src.stop(t + 0.55);
            },
            ende: function () {
              try { master.gain.setTargetAtTime(0, ac.currentTime, 0.05); } catch (e) { /* egal */ }
              setTimeout(function () { try { m1.stop(); m2.stop(); wind.src.stop(); if (regen1) { regen1.src.stop(); regen2.src.stop(); } master.disconnect(); } catch (e) { /* schon beendet */ } }, 300);
            }
          };
        } catch (e) { return null; }
      }

      return {
        start: function () {
          aus.push(HT.eingabe.an(reagiere));
          if (HT.pult && HT.pult.an && HT.pult.aktionVon) aus.push(HT.pult.an(function (art, d) { if (art !== 'taste' || !d) return; var akt = HT.pult.aktionVon(d.rolle); if (akt === 'hoch') halten.gas = !!d.gedrueckt; if (akt === 'runter') halten.bremse = !!d.gedrueckt; }));
          var los = function () {
            ton = klangStarten();
            pauseUhr = setInterval(function () { if (ton && Z.pausiert) ton.update(v, 0, true); }, 300);
            masse(); meldung(DUNKEL > 0.4 ? 'Es ist dunkel: Licht mit L einschalten, dann Pfeil nach oben.' : 'Pfeil nach oben, um loszufahren');
            frameId = Z.frame(function (dt) { schritt(Math.min(dt, 0.05)); });
            zeichne();
          };
          masse();
          if (WAHL) { hinweis.className = 'sv-hinweis'; auswahlZeigen(function (tz) { letzteWahl = tz; tageszeitSetzen(tz); los(); }); }
          else los();
        },
        stop: function () { if (frameId) Z.abbrechen(frameId); aus.forEach(function (f) { f(); }); tasten.entfernen(); if (pauseUhr) clearInterval(pauseUhr); if (ton) { ton.ende(); ton = null; } }
      };
    },
    preview: function (el) {
      // Vorschau: Cockpit-Blick bei Tag, Ball auf der Fahrbahn, Abend im Regen mit spiegelnder Straße, Blitzer
      function szene(o) {
        var nacht = !!o.nacht, regen = !!o.regen;
        var h1 = nacht ? '#0b1222' : regen ? '#7a8692' : '#4f9fd8', h2 = nacht ? '#2a3550' : regen ? '#c3cad0' : '#e4f2f8';
        var feld = nacht ? '#1b2a22' : regen ? '#5f7a4c' : '#86c468', strasse = nacht ? '#1d2228' : regen ? '#3c4349' : '#686e74';
        var svg = '<svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg"><defs>' +
          '<linearGradient id="pvh" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + h1 + '"/><stop offset="1" stop-color="' + h2 + '"/></linearGradient>' +
          '<linearGradient id="pvd" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2f3d45"/><stop offset="1" stop-color="#11171b"/></linearGradient>' +
          '<radialGradient id="pvg"><stop offset="0" stop-color="#fff3d6" stop-opacity="1"/><stop offset="1" stop-color="#ffd59a" stop-opacity="0"/></radialGradient>' +
          '<linearGradient id="pvs" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe2b0" stop-opacity=".9"/><stop offset="1" stop-color="#ffe2b0" stop-opacity="0"/></linearGradient></defs>' +
          '<rect width="400" height="112" fill="url(#pvh)"/>' +
          (nacht ? '<circle cx="320" cy="34" r="9" fill="#eef1e6"/><circle cx="80" cy="26" r="1.2" fill="#fff"/><circle cx="150" cy="40" r="1" fill="#fff"/><circle cx="250" cy="22" r="1.2" fill="#fff"/>' : regen ? '' : '<circle cx="110" cy="34" r="14" fill="#fff6d0"/>') +
          '<path d="M0 112 L50 80 L95 100 L140 70 L190 98 L240 74 L300 102 L350 78 L400 96 V112Z" fill="' + (nacht ? '#1d2840' : regen ? '#8794a0' : '#9fbcd0') + '"/>' +
          '<rect y="110" width="400" height="104" fill="' + feld + '"/>' +
          '<path d="M186 110 L214 110 L340 214 L60 214 Z" fill="' + strasse + '"/>' +
          '<path d="M199 114 h2 l1 8 h-4z M197 134 h6 l2 14 h-10z M193 166 h14 l3 24 h-20z" fill="' + (nacht ? '#9aa3aa' : '#eef1f3') + '"/>' +
          '<path d="M186 110 L60 214 h8 L189 110z M214 110 L340 214 h-8 L211 110z" fill="' + (nacht ? '#7d868c' : '#f3f5f6') + '"/>';
        // Bäume im Herbst
        [[40, 96, 16, '#d4572a'], [80, 100, 12, '#e0862c'], [330, 98, 15, '#c4561b'], [368, 104, 12, '#f2b544']].forEach(function (b) {
          svg += '<rect x="' + (b[0] - 2) + '" y="' + (b[1] + 6) + '" width="4" height="12" fill="#4a3222"/><circle cx="' + b[0] + '" cy="' + b[1] + '" r="' + b[2] + '" fill="' + (nacht ? '#2a1d14' : b[3]) + '"/>';
        });
        if (nacht) {
          // Laterne, Gegenverkehr und Spiegelungen auf nasser Straße
          svg += '<rect x="266" y="62" width="3" height="52" fill="#3a4248"/><path d="M267 64 q0 -6 12 -6 h8" stroke="#3a4248" stroke-width="3" fill="none"/><circle cx="286" cy="60" r="22" fill="url(#pvg)" opacity=".8"/>' +
            '<rect x="281" y="114" width="10" height="70" fill="url(#pvs)" opacity=".7"/>' +
            '<circle cx="186" cy="118" r="9" fill="url(#pvg)"/><circle cx="196" cy="118" r="9" fill="url(#pvg)"/>' +
            '<rect x="183" y="121" width="5" height="70" fill="url(#pvs)"/><rect x="194" y="121" width="5" height="70" fill="url(#pvs)"/>' +
            '<path d="M150 214 L194 128 L206 128 L250 214Z" fill="#fff1d0" opacity=".16"/>';
        }
        if (regen) {
          var tr = '';
          for (var k = 0; k < 26; k++) { var x = (k * 53) % 380 + 10, y = (k * 37) % 190 + 14; tr += '<line x1="' + x + '" y1="' + y + '" x2="' + (x - 3) + '" y2="' + (y + 12) + '" stroke="#dfe7ee" stroke-opacity=".45" stroke-width="1"/>'; }
          for (var d = 0; d < 14; d++) { var dx = (d * 71) % 360 + 20, dy = (d * 29) % 160 + 20; tr += '<circle cx="' + dx + '" cy="' + dy + '" r="' + (2 + d % 3) + '" fill="#e8f0f6" fill-opacity=".25" stroke="#fff" stroke-opacity=".5" stroke-width=".8"/>'; }
          svg += tr + '<path d="M120 214 L250 92" stroke="#0d1114" stroke-width="3.5" stroke-linecap="round"/><path d="M230 214 L360 100" stroke="#0d1114" stroke-width="3.5" stroke-linecap="round"/>';
        }
        if (o.ball) svg += '<circle cx="' + o.ball + '" cy="178" r="10" fill="#e8504a"/><path d="M' + (o.ball - 10) + ' 178 a10 10 0 0 0 20 0" fill="#fff"/><circle cx="' + o.ball + '" cy="178" r="10" fill="none" stroke="#26333c" stroke-width="1.5"/>';
        if (o.kind) svg += '<g transform="translate(' + o.kind + ' 150)"><circle cx="0" cy="0" r="6" fill="#f0c9a0"/><rect x="-6" y="6" width="12" height="16" rx="4" fill="#f2c03a"/><path d="M-4 22 l-4 12 M4 22 l5 12" stroke="#2b6cb0" stroke-width="4" stroke-linecap="round"/></g>';
        if (o.blitzer) svg += '<rect x="292" y="120" width="4" height="52" fill="#6b757c"/><rect x="280" y="96" width="28" height="30" rx="4" fill="#b8c0c5" stroke="#4b555b" stroke-width="2"/><circle cx="289" cy="108" r="5" fill="#2d3a44"/><rect x="280" y="118" width="28" height="4" fill="#d32f2f"/>' + (o.blitz ? '<circle cx="289" cy="108" r="60" fill="#fff" opacity=".55"/><rect width="400" height="300" fill="#fff" opacity=".35"/>' : '');
        // Cockpit
        var nadel = o.nadel || 160, zu = !!o.zuSchnell;
        svg += '<rect x="0" y="0" width="400" height="8" fill="#20282d"/><path d="M0 0 h26 q-14 100 -18 214 h-8z M400 0 h-26 q14 100 18 214 h8z" fill="#20282d"/>' +
          '<rect x="150" y="10" width="100" height="26" rx="6" fill="#14191c"/><rect x="154" y="13" width="92" height="20" rx="4" fill="' + (nacht ? '#1c2636' : '#b9dcef') + '"/>' +
          '<path d="M0 214 Q200 188 400 214 V300 H0Z" fill="url(#pvd)"/><rect x="96" y="216" width="208" height="68" rx="14" fill="#0d1316"/>' +
          '<circle cx="152" cy="252" r="28" fill="#162026" stroke="#5e6a72" stroke-width="2"/><path d="M135 242 A20 20 0 0 1 166 238" stroke="#2ead6b" stroke-width="6" fill="none"/>' +
          '<line x1="152" y1="252" x2="' + nadel + '" y2="232" stroke="' + (zu ? '#ff453a' : '#ff9f0a') + '" stroke-width="3" stroke-linecap="round"/>' +
          '<rect x="198" y="236" width="90" height="6" rx="3" fill="#1BA8B5"/><rect x="198" y="254" width="70" height="6" rx="3" fill="#f4d35e"/>' +
          (nacht ? '<path d="M206 272 h8 M206 276 h8" stroke="#30d158" stroke-width="2"/><path d="M216 270 a4 4 0 0 1 0 8z" fill="#30d158"/>' : '') +
          '<rect x="14" y="230" width="66" height="40" rx="8" fill="#0d1316"/><text x="47" y="246" text-anchor="middle" font-size="10" font-weight="700" fill="#cfd8dd" font-family="-apple-system,sans-serif">Ziel 50</text><text x="47" y="262" text-anchor="middle" font-size="10" font-weight="700" fill="#7fe3ec" font-family="-apple-system,sans-serif">Punkte ' + (o.punkte || 0) + '</text>' +
          (zu ? '<rect x="120" y="180" width="160" height="22" rx="11" fill="#c81e1e"/><text x="200" y="195" text-anchor="middle" font-size="11" font-weight="800" fill="#fff" font-family="-apple-system,sans-serif">Geschwindigkeit zu hoch</text>' : '') +
          '</svg>';
        return svg;
      }
      return HT.beispiel(el, [
        { svg: szene({ nadel: 160, punkte: 10 }), text: 'Tempo im grünen Band: Pluspunkte', dauer: 1600 },
        { svg: szene({ nadel: 160, punkte: 10, ball: 300 }), text: 'Ein Ball rollt auf die Straße', dauer: 900 },
        { svg: szene({ nadel: 146, punkte: 10, ball: 236, kind: 330 }), text: 'Sofort bremsen, ein Kind folgt', dauer: 1300 },
        { svg: szene({ nacht: true, regen: true, nadel: 158, punkte: 20 }), text: 'Abends im Regen: Licht an, die Straße spiegelt', dauer: 1900 },
        { svg: szene({ regen: true, nadel: 176, punkte: 20, zuSchnell: true, blitzer: true }), text: 'Zu schnell: Warnung', dauer: 1100 },
        { svg: szene({ regen: true, nadel: 176, punkte: 15, zuSchnell: true, blitzer: true, blitz: true }), text: 'Blitzer: minus 5 Punkte', dauer: 700 }
      ]);
    }
  });
})();

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
    S.laterne = laterne(); S.tropfen = tropfenBild();
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
    if (p.schilder) katalog.push('schild'); if (p.ampeln) katalog.push('ampel'); if (p.fuss) katalog.push('fuss'); if (p.stopps) katalog.push('stop');
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
      else if (typ === 'hindernis') e.art = HT.zufall.wahl(['reh', 'hund', 'kisten', 'ball']);
      e.farbe = HT.zufall.int(0, 3);
      events.push(e);
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
  var AMPEL_F = { rot: '255,59,48', gelb: '255,190,0', gruen: '48,220,100' }, AMPEL_Y = { rot: 36 / 420, gelb: 96 / 420, gruen: 156 / 420 };

  HT.registerModule({
    id: 'strassenverkehr', name: 'Straßenverkehr', kategorie: 'aufmerksamkeit', symbol: 'weiter',
    ziel: 'Tempo halten und gleichzeitig auf echte Störungen und eine zweite Aufgabe achten',
    beschreibung: 'Cockpit-Fahrt für geteilte Aufmerksamkeit auf einer Landstraße mit Kurven, Feldern, Wäldern und Ortschaften, bei Tag, in der Dämmerung oder nachts, auf Wunsch im Regen mit Scheibenwischern und nasser Fahrbahn. Die Spur hält das Auto, mit Pfeil links und rechts lässt sich leicht ausweichen. Pfeil hoch beschleunigt sanft, Pfeil runter bremst. Der Tachozeiger soll im grünen Band bleiben. Niedrigere Limits gelten schon vor dem Schild, höhere erst danach. Angehalten wird bei roter Ampel, Fußgänger am Übergang, Stoppschild, geschlossener Schranke und Blaulicht im Spiegel. Einem Tier, Ball oder Gegenstand auf der Fahrbahn kann man ausweichen oder davor anhalten. L schaltet das Abblendlicht, F das Fernlicht; bei Fernlicht gibt der Gegenverkehr Lichthupe. Parallel kommen Abbiegen, Kontrollleuchten und eine Durchsage. Leere Übergänge, grüne Ampeln und Werbetafeln verlangen keine Taste.',
    anleitung: 'Pfeil nach oben ist Gas, Pfeil nach unten ist Bremse. Halten Sie den Zeiger im grünen Bereich. Vor einem langsameren Schild schon abbremsen, nach einem schnelleren Schild erst beschleunigen. Halten Sie nur an, wenn wirklich etwas auf der Straße ist. Einem Tier, Ball oder Gegenstand können Sie mit Pfeil links oder rechts ausweichen. Bei einer Abbiege-Ansage zählt links oder rechts als Abbiegen. Leuchtet eine Lampe im Cockpit, drücken Sie OK. Die Plustaste nur bei der genannten Autobahn. Im Dunkeln schaltet L das Licht ein, F das Fernlicht. Bei Gegenverkehr abblenden.',
    tasten: ['hoch', 'runter', 'links', 'rechts', 'ok', 'ja'], levels: levels,
    levelLabels: {
      band: 'Grünes Band (± km/h)', schilder: 'Temposchilder', ampeln: 'Ampeln', fuss: 'Fußgänger', stopps: 'Stoppschilder',
      hindernis: 'Hindernisse', bahn: 'Bahnübergang', werbung: 'Werbetafeln', blinker: 'Abbiegen', autoBremse: 'Auto bremst vor Kreuzung',
      blinkerTon: 'Abbiegen als Ansage', kontrollen: 'Kontrollleuchten', stau: 'Durchsage', polizei: 'Polizei im Spiegel', reaktionSek: 'Reaktionsfenster (s)'
    },
    parameterSchema: {
      dauerDurchgangSek: { typ: 'zahl', label: 'Dauer eines Durchgangs (Sek.)', min: 45, max: 240, schritt: 15, standard: 90 },
      cockpit: { typ: 'schalter', label: 'Cockpit anzeigen', standard: true },
      tageszeit: { typ: 'auswahl', label: 'Tageszeit', standard: 'zufall', optionen: [{ wert: 'zufall', label: 'Wechselnd' }, { wert: 'tag', label: 'Tag' }, { wert: 'daemmerung', label: 'Dämmerung' }, { wert: 'nacht', label: 'Nacht' }] },
      wetter: { typ: 'auswahl', label: 'Wetter', standard: 'zufall', optionen: [{ wert: 'zufall', label: 'Wechselnd' }, { wert: 'trocken', label: 'Trocken' }, { wert: 'regen', label: 'Regen' }] },
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
      var TZ = p.tageszeit && p.tageszeit !== 'zufall' ? p.tageszeit : HT.zufall.wahl(['tag', 'tag', 'tag', 'tag', 'tag', 'daemmerung', 'daemmerung', 'nacht', 'nacht', 'nacht']);
      var REGEN = p.wetter === 'regen' || (p.wetter !== 'trocken' && HT.zufall.chance(0.35));
      var AMB = TZ === 'nacht' ? (REGEN ? [14, 17, 26] : [16, 20, 36]) : TZ === 'daemmerung' ? (REGEN ? [132, 122, 130] : [205, 162, 152]) : (REGEN ? [178, 184, 194] : null);
      var AMB_F = AMB ? 'rgb(' + AMB.join(',') + ')' : '', DUNKEL = TZ === 'nacht' ? 1 : TZ === 'daemmerung' ? 0.55 : (REGEN ? 0.2 : 0);
      var licht = 0, quer = 0, querV = 0, gasP = 0, bremsP = 0, ruck = -9, blendung = 0, blendHinweisBis = 0, lichtHinweisBis = 7, letztDt = 0;
      var LM = null, lg = null, PUF = null, pufG = null, DPR = 1, leuchten = [], SR = { x: 0, y: 0, w: 0, h: 0 }, aktD = 0, aktA = 1;
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
      function ende(text) { if (fertig) return; fertig = true; meldung(text); if (ton) ton.update(0, 0, true); if (ctx.onFinish) ctx.onFinish(); }
      function naechstesSchild() { for (var i = 0; i < plan.events.length; i++) { var e = plan.events[i]; if (e.typ === 'schild' && !e.erledigt) return e; } return null; }

      function reagiere(aktion, detail) {
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
      function mussHalten(e) { if (e.typ === 'ampel') return !!e.rot; if (e.typ === 'fuss') return !!e.person; if (e.typ === 'bahn') return !!e.zu; if (e.typ === 'stop' || e.typ === 'hindernis') return true; return false; }

      function pruefeStopps(dt) {
        for (var i = 0; i < plan.events.length; i++) {
          var e = plan.events[i];
          if (e.erledigt || e.typ === 'schild' || e.typ === 'werbung' || e.typ === 'blinker') continue;
          var ds = e.s - s;
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
              var halb = { reh: 0.24, hund: 0.16, ball: 0.07, kisten: 0.26 }[e.art] || 0.2;
              e.ausgewichen = Math.abs(0.5 + quer - 0.45) > 0.2 + halb;
              if (!e.ausgewichen) { ruck = uhr; e.weg = true; }
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
          if (e.runter && v > e.neu + p.band) { tempoZahl++; zaehle({ korrekt: false, reiz: 'schild ' + e.neu, reaktion: Math.round(v) + '', typ: 'tempo' }); ctx.audio.falsch(); meldung('Vor dem Schild auf ' + e.neu + ' kommen.'); }
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
      function tempoPruefen(dt) {
        if (v > soll + p.band + 2) tempoUeber += dt; else tempoUeber = 0;
        if (tempoUeber > 1.1) { tempoUeber = 0; tempoZahl++; zaehle({ korrekt: false, reiz: 'tempo ' + soll, reaktion: Math.round(v) + '', typ: 'tempo' }); meldung('Zu schnell. Ziel ist ' + soll + '.'); if (tempoZahl >= 20) ende('Zwanzigmal zu schnell. Der Durchgang endet.'); }
        if (v > 8 && Math.abs(v - soll) <= p.band) seitHalt += dt; else seitHalt = 0;
        if (seitHalt > 8) { seitHalt = 0; zaehle({ korrekt: true, reiz: 'tempo ' + soll, reaktion: Math.round(v) + '', typ: 'tempo' }); }
      }

      /* =================== Welt für die Darstellung =================== */
      // MJS = Meter je Segment: kleiner Wert = mehr Bewegung im Bild je km/h (50 km/h wirken zügiger)
      var SEG = 200, STRASSE = 2000, M = 570, MJS = 1.1, SICHT = 270, KTIEFE = 1 / Math.tan(50 * Math.PI / 180), KAMERA_H = 1050;
      var FELDER = [[118, 178, 92], [104, 164, 80], [206, 184, 104], [226, 204, 92], [150, 120, 86], [132, 188, 98]];
      var DUNST = TZ === 'nacht' ? [140, 152, 184] : TZ === 'daemmerung' ? (REGEN ? [190, 186, 190] : [246, 206, 184]) : REGEN ? [196, 204, 212] : [222, 238, 245];
      var TROCKEN = [104, 110, 116], NASS = [54, 59, 65], REFL = TZ === 'nacht' ? [120, 130, 160] : [150, 165, 180];
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
            if (wald) { if (r < 0.5) sg.objekte.push({ bild: zufall(G.tanne), x: (Math.random() < 0.5 ? -1 : 1) * (1.9 + Math.random() * 5), h: 11 + Math.random() * 6 }); }
            else if (r < 0.07) sg.objekte.push({ bild: zufall(G.laub), x: (Math.random() < 0.5 ? -1 : 1) * (2 + Math.random() * 6), h: 9 + Math.random() * 5 });
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
      function glatt(t) { return t * t * (3 - 2 * t); }
      function mischen(a, b, t) { return 'rgb(' + Math.round(a[0] + (b[0] - a[0]) * t) + ',' + Math.round(a[1] + (b[1] - a[1]) * t) + ',' + Math.round(a[2] + (b[2] - a[2]) * t) + ')'; }

      function masse() {
        var r = flaeche.getBoundingClientRect(), b = Math.max(320, Math.round(r.width || 0)), h = Math.max(240, Math.round(r.height || 0));
        if (b === W && h === H) return;
        W = b; H = h;
        var dpr = Math.min(window.devicePixelRatio || 1, 1.5);
        cvs.width = Math.round(b * dpr); cvs.height = Math.round(h * dpr); DPR = dpr;
        g.setTransform(dpr, 0, 0, dpr, 0, 0); g.imageSmoothingQuality = 'high';
        // Lichtkarte in halber Auflösung: Umgebungslicht + Scheinwerfer, Laternen, Ampeln; wird mit dem Bild multipliziert
        if (AMB) { LM = document.createElement('canvas'); LM.width = Math.max(2, Math.round(cvs.width / 2)); LM.height = Math.max(2, Math.round(cvs.height / 2)); lg = LM.getContext('2d'); lg.setTransform(dpr / 2, 0, 0, dpr / 2, 0, 0); }
        PUF = document.createElement('canvas'); PUF.width = cvs.width; PUF.height = cvs.height; pufG = PUF.getContext('2d', { alpha: false });
        dashTop = p.cockpit !== false ? H * 0.66 : H;
        horizont = p.cockpit !== false ? H * 0.36 : H * 0.44;
        HG = hintergrund(W, horizont, REGEN ? 'grau' : TZ);
        HG.boden = g.createLinearGradient(0, horizont, 0, H); HG.boden.addColorStop(0, '#9cc78a'); HG.boden.addColorStop(1, '#6faa55');
        if (TZ === 'daemmerung' && !REGEN) { HG.abendrot = g.createLinearGradient(0, 0, 0, horizont + H * 0.05); HG.abendrot.addColorStop(0, 'rgba(255,110,60,0)'); HG.abendrot.addColorStop(0.6, 'rgba(255,125,70,.14)'); HG.abendrot.addColorStop(0.86, 'rgba(255,150,80,.3)'); HG.abendrot.addColorStop(1, 'rgba(255,150,80,0)'); }
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
        if (REGEN) leuchten.push([glut(f), lx - r * 0.22, boden, r * 0.44, SR.h * 0.9, 0.55]);
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
        if (REGEN) leuchten.push([glut('255,200,140'), kx - r * 0.1, boden, r * 0.2, SR.h * 0.8, 0.4 * DUNKEL]);
      }
      // Gegenverkehr: zwischen zwei Segmenten weich interpoliert (kein Springen), nachts mit Licht und Lichthupe
      function gegenAuto(o, sg, rs) {
        var a = sg.p1.s, b = sg.p2.s, f = HT.klemmen(o.z / MJS - sg.i, 0, 1), oy = a.y + (b.y - a.y) * f, ow = a.w + (b.w - a.w) * f, kp = ow / STRASSE;
        var cx = a.x + (b.x - a.x) * f - rs * 0.5 * ow;
        if (REGEN) {
          var hh = 1.55 * M * kp, ww = hh * o.bild.width / o.bild.height;
          if (hh > 2 && oy < H + hh) { var ga = g.globalAlpha; g.save(); g.globalAlpha = ga * 0.22; g.translate(cx, oy); g.scale(1, -0.55); g.drawImage(o.bild, -ww / 2, -hh, ww, hh); g.restore(); }
        }
        if (!sprite(o.bild, cx, oy, kp, 1.55) || DUNKEL <= 0) return;
        var t = o.hupe === undefined ? 9 : uhr - o.hupe, hupe = t < 0.18 || (t > 0.32 && t < 0.5), st = hupe ? 2.6 : 1;
        for (var q = 0; q < 2; q++) {
          var X = SR.x + SR.w * (q ? 0.8333 : 0.1667), Y = SR.y + SR.h * 0.573, r = SR.w * 0.32 * st;
          leuchten.push([glut('255,248,225'), X - r, Y - r, r * 2, r * 2, 0.95]);
          leuchten.push([glut('255,255,255'), X - r * 0.2, Y - r * 0.12, r * 0.4, r * 0.24, 0.9]);
          if (REGEN) leuchten.push([glut('255,240,210'), X - r * 0.16, oy, r * 0.32, SR.h * 1.5 * (hupe ? 1.4 : 1), 0.5]);
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
        if (HG.sterne) { g.globalAlpha = 0.85; ebene(HG.sterne, parallax * 0.15, 0); }
        if (HG.abendrot) { g.globalAlpha = 1; g.fillStyle = HG.abendrot; g.fillRect(0, 0, W, horizont + H * 0.05); }
        for (var i = 0; i < leuchten.length; i++) { var l = leuchten[i]; g.globalAlpha = l[5]; g.drawImage(l[0], l[1], l[2], l[3], l[4]); }
        g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
        if (blendung > 0.01) { g.fillStyle = 'rgba(255,250,235,' + Math.min(0.5, blendung).toFixed(3) + ')'; g.fillRect(0, 0, W, H); }
      }
      // Bewegungsunschärfe: das Bild leicht vergrößert vom Fluchtpunkt aus überblenden (Mitte bleibt scharf)
      function unschaerfe() {
        if (v < 22 || !PUF) return;
        var st = Math.min(1, (v - 22) / 70), cx = W / 2 * DPR, cy = horizont * DPR;
        pufG.drawImage(cvs, 0, 0);
        g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
        g.beginPath(); g.rect(0, (horizont - H * 0.06) * DPR, cvs.width, cvs.height); g.clip();
        for (var i = 1; i <= 2; i++) { var z = 1 + 0.017 * st * i; g.globalAlpha = 0.3 * st / i; g.drawImage(PUF, cx - cx * z, cy - cy * z, cvs.width * z, cvs.height * z); }
        g.restore();
      }
      // Regen: Regenstriche, Tropfen auf der Scheibe und Scheibenwischer
      function regenZeichnen(dt) {
        var unten = p.cockpit !== false ? dashTop : H, drift = v / 130, i, r;
        while (striche.length < 170) striche.push({ x: Math.random() * W, y: Math.random() * unten, l: 10 + Math.random() * 18, sp: 0.9 + Math.random() * 0.6 });
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
        var T = 1.3, f = (uhr % T) / T, th0 = 0.05, th1 = 2.75, th;
        if (f < 0.42) th = th0 + (th1 - th0) * glatt(f / 0.42); else if (f < 0.84) th = th1 - (th1 - th0) * glatt((f - 0.42) / 0.42); else th = th0;
        var zyklus = Math.floor(uhr / T) * 2 + (f >= 0.42 ? 1 : 0);
        if (zyklus !== wischZyklus && f < 0.84) { wischZyklus = zyklus; if (ton) ton.wisch(); }
        var piv = [[W * 0.26, dashTop + 6], [W * 0.62, dashTop + 6]], L = W * 0.36;
        tropfenRest += dt * 34;
        while (tropfenRest >= 1) { tropfenRest -= 1; if (tropfen.length < 110) tropfen.push({ x: W * 0.04 + Math.random() * W * 0.92, y: H * 0.03 + Math.random() * (dashTop - H * 0.03), r: 2 + Math.random() * 4.5 }); }
        var lo = Math.min(wischAlt, th) - 0.03, hi = Math.max(wischAlt, th) + 0.03;
        tropfen = tropfen.filter(function (t) {
          for (var q = 0; q < 2; q++) { var dx = t.x - piv[q][0], dy = piv[q][1] - t.y, rr = Math.sqrt(dx * dx + dy * dy); if (rr < L && rr > L * 0.1) { var an = Math.atan2(dy, dx); if (an >= lo && an <= hi) return false; } }
          return true;
        });
        wischAlt = th;
        g.globalAlpha = DUNKEL > 0.5 ? 0.55 : 0.85;
        for (i = 0; i < tropfen.length; i++) { r = tropfen[i]; g.drawImage(G.tropfen, r.x - r.r, r.y - r.r, r.r * 2, r.r * 2); }
        g.globalAlpha = 1; g.lineCap = 'round'; g.strokeStyle = '#0d1114';
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
        var kamX = (0.5 + quer) * STRASSE * rs, kamY = basis.p1.y + (basis.p2.y - basis.p1.y) * pr + KAMERA_H + stoss;
        leuchten.length = 0; blendung = 0;
        if (lg) { lg.globalCompositeOperation = 'source-over'; lg.globalAlpha = 1; lg.fillStyle = AMB_F; lg.fillRect(0, 0, W, H); lg.globalCompositeOperation = 'lighter'; }
        parallax += basis.kurve * v * 0.00001;
        ebene(HG.himmel, parallax * 0.15, 0);
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
          sg.nebel = Math.min(1, Math.pow(k / SICHT, 1.5) * (REGEN ? 1.6 : 1.05));
          liste.push(sg);
        }
        var maxY = H;
        for (k = 0; k < liste.length; k++) { sg = liste[k]; sg.sicht = sg.p1.s.z > KTIEFE && sg.p2.s.y < maxY && sg.p2.s.y <= sg.p1.s.y; sg.clip = maxY; if (sg.sicht) maxY = Math.min(maxY, sg.p2.s.y); }
        // Boden und Straße von fern nach nah
        for (k = liste.length - 1; k >= 0; k--) {
          sg = liste[k]; if (!sg.sicht) continue;
          var a = sg.p1.s, b = sg.p2.s, nb = sg.nebel, y1 = Math.min(a.y, sg.clip) + 0.6, y2 = b.y;
          var fl = sg.ort ? [178, 186, 174] : sg.feldL, fr = sg.ort ? [178, 186, 174] : sg.feldR;
          g.fillStyle = mischen(fl, DUNST, nb); g.fillRect(0, y2, Math.max(0, Math.min(a.x - a.w * 1.2, b.x - b.w * 1.2)) + 2, y1 - y2);
          var rx = Math.min(W, Math.max(a.x + a.w * 1.2, b.x + b.w * 1.2)) - 2; g.fillStyle = mischen(fr, DUNST, nb); g.fillRect(rx, y2, W - rx, y1 - y2);
          viereck(a, y1, b, y2, -3.4, -1.18, mischen(fl, DUNST, nb)); viereck(a, y1, b, y2, 1.18, 3.4, mischen(fr, DUNST, nb));
          var bank = sg.ort ? [198, 198, 194] : [126, 172, 98];
          viereck(a, y1, b, y2, -1.2, -1.0, mischen(bank, DUNST, nb)); viereck(a, y1, b, y2, 1.0, 1.2, mischen(bank, DUNST, nb));
          // nasse Fahrbahn: dunkler Asphalt, der in der Ferne zunehmend den Himmel spiegelt
          var asph = REGEN ? misch3(NASS, REFL, Math.min(0.8, 0.04 + k / SICHT * 2.0)) : TROCKEN, af = mischen(asph, DUNST, nb);
          if (sg.kreuzung) { viereck(a, y1, b, y2, -3.4, -1.0, af); viereck(a, y1, b, y2, 1.0, 3.4, af); }
          viereck(a, y1, b, y2, -1.0, 1.0, af);
          var spur = mischen(REGEN ? [asph[0] - 10, asph[1] - 10, asph[2] - 8] : [96, 102, 108], DUNST, nb);
          viereck(a, y1, b, y2, 0.22, 0.38, spur); viereck(a, y1, b, y2, 0.62, 0.78, spur); viereck(a, y1, b, y2, -0.78, -0.62, spur); viereck(a, y1, b, y2, -0.38, -0.22, spur);
          var lin = mischen(REGEN ? [200, 206, 210] : [240, 243, 245], DUNST, nb);
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
            else if (o.bild.licht) leuchten.push([o.bild.licht, SR.x, SR.y, SR.w, SR.h, DUNKEL * aktA]);
          }
          var e = sg.ereignis;
          if (e && !e.weg) ereignisZeichnen(e, sx, sy, kp, wpx, phase, rs);
          for (var gi = 0; gi < gegenverkehr.length; gi++) if (gegenverkehr[gi].seg === sg.i) gegenAuto(gegenverkehr[gi], sg, rs);
          g.globalAlpha = 1;
        }
        lichtPass();
        unschaerfe();
        if (REGEN) regenZeichnen(letztDt);
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
          var flucht = HT.klemmen((gewartet - 0.8) / 1.2, 0, 1), hx = (0.45 + flucht * 2.5) * rs, laeuft = flucht > 0, hh = 1.3, sp = false;
          if (e.art === 'reh') { bld = G.reh[laeuft ? phase : 0]; hh = 1.5; sp = rs < 0; }
          else if (e.art === 'hund') { bld = G.hund[laeuft ? phase : 0]; hh = 0.8; sp = rs < 0; }
          else if (e.art === 'ball') { bld = G.ball; hh = 0.4; }
          else { bld = G.kisten; hx = (0.45 + flucht * 3) * rs; }
          if (sprite(bld, sx + hx * wpx, sy, kp, hh, sp)) beleuchte(bld, sp);
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
        var spf = DUNKEL > 0.5 ? ['#0a1220', '#1c2636', '#10151c', '#0b0f14', '#1a1e22'] : REGEN || DUNKEL > 0.3 ? ['#8e99a4', '#c5ccd2', '#6f8a66', '#5f7a58', '#4d5358'] : ['#9fcbe6', '#d9edf6', '#8bbd76', '#79ad66', '#6a7076'];
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
        g.fillStyle = '#cfd8dd'; passText('Ziel ' + soll + ' km/h', lbx + lbb / 2, lby + lbh / 2, lbb * 0.86, lbh * 0.3);
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
          var regen1 = REGEN ? rauschen('highpass', 1100, 0, 0.11) : null, regen2 = REGEN ? rauschen('bandpass', 2600, 0.8, 0.05) : null;
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
              wind.g.gain.setTargetAtTime(Math.min(0.09, vv / 130 * 0.07) * (REGEN ? 1.5 : 1), t, 0.2);
              wind.f.frequency.setTargetAtTime(250 + vv * 9, t, 0.2);
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
          ton = klangStarten();
          pauseUhr = setInterval(function () { if (ton && Z.pausiert) ton.update(v, 0, true); }, 300);
          if (HT.pult && HT.pult.an && HT.pult.aktionVon) aus.push(HT.pult.an(function (art, d) { if (art !== 'taste' || !d) return; var akt = HT.pult.aktionVon(d.rolle); if (akt === 'hoch') halten.gas = !!d.gedrueckt; if (akt === 'runter') halten.bremse = !!d.gedrueckt; }));
          masse(); meldung(DUNKEL > 0.4 ? 'Es ist dunkel: Licht mit L einschalten, dann Pfeil nach oben.' : 'Pfeil nach oben, um loszufahren');
          frameId = Z.frame(function (dt) { schritt(Math.min(dt, 0.05)); });
          zeichne();
        },
        stop: function () { if (frameId) Z.abbrechen(frameId); aus.forEach(function (f) { f(); }); tasten.entfernen(); if (pauseUhr) clearInterval(pauseUhr); if (ton) { ton.ende(); ton = null; } }
      };
    },
    preview: function (el) {
      function bild(nadel, rot, warten) {
        return '<svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="svh" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4f9fd8"/><stop offset="1" stop-color="#e4f2f8"/></linearGradient><linearGradient id="svd" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a4a52"/><stop offset="1" stop-color="#151c20"/></linearGradient></defs>' +
          '<rect width="400" height="110" fill="url(#svh)"/><path d="M0 110 L40 74 L80 96 L130 56 L170 92 L220 66 L270 96 L320 60 L370 90 L400 76 V110Z" fill="#8fb2c8"/><path d="M130 56 l-9 11 h18z M320 60 l-8 10 h16z" fill="#fff"/><path d="M0 110 Q100 96 200 106 T400 102 V114 H0Z" fill="#86b07a"/>' +
          '<rect y="110" width="400" height="190" fill="#86c468"/><path d="M0 110 H180 L60 200 H0Z" fill="#cdb868"/><path d="M188 110 L212 110 L330 200 L70 200 Z" fill="#686e74"/><path d="M199 116 h2 l1 8 h-4z M197 140 h5 l2 14 h-8z M194 176 h10 l2 22 h-14z" fill="#eef1f3"/>' +
          '<circle cx="60" cy="98" r="15" fill="#3f8a44"/><rect x="58" y="104" width="5" height="12" fill="#6e4c2e"/>' +
          (rot !== null ? '<rect x="258" y="96" width="4" height="40" fill="#5f6a72"/><rect x="250" y="66" width="20" height="40" rx="4" fill="#1b2125"/><circle cx="260" cy="76" r="6" fill="' + (rot ? '#ff3b30' : '#3a444b') + '"/><circle cx="260" cy="96" r="6" fill="' + (rot ? '#3a444b' : '#30d158') + '"/>' : '') +
          '<rect x="0" y="0" width="400" height="8" fill="#20282d"/><rect x="152" y="10" width="96" height="26" rx="6" fill="#14191c"/><rect x="156" y="13" width="88" height="20" rx="4" fill="#b9dcef"/>' +
          '<path d="M0 214 Q200 186 400 214 V300 H0Z" fill="url(#svd)"/><rect x="96" y="214" width="208" height="68" rx="14" fill="#0d1316"/>' +
          '<circle cx="152" cy="250" r="28" fill="#162026" stroke="#5e6a72" stroke-width="2"/><path d="M135 240 A20 20 0 0 1 166 236" stroke="#2ead6b" stroke-width="6" fill="none"/><line x1="152" y1="250" x2="' + nadel + '" y2="232" stroke="#ff9f0a" stroke-width="3" stroke-linecap="round"/>' +
          '<rect x="198" y="236" width="90" height="6" rx="3" fill="#1BA8B5"/><rect x="198" y="254" width="70" height="6" rx="3" fill="#f4d35e"/>' +
          (warten ? '<text x="200" y="60" text-anchor="middle" font-size="15" font-weight="800" fill="#fff" stroke="#1e2a33" stroke-width="3" paint-order="stroke" font-family="-apple-system,sans-serif">Warten …</text>' : '') + '</svg>';
      }
      return HT.beispiel(el, [
        { svg: bild(160, null, false), text: 'Zeiger im grünen Band halten (↑ Gas, ↓ Bremse)', dauer: 1800 },
        { svg: bild(150, true, false), text: 'Rote Ampel: anhalten', dauer: 1400 },
        { svg: bild(134, true, true), text: 'Stehen und warten …', dauer: 1300 },
        { svg: bild(160, false, false), text: 'Grün: weiterfahren', dauer: 1500 }
      ]);
    }
  });
})();

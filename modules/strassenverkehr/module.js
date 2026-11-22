/* Modul: Straßenverkehr – Fahrsimulation für geteilte und selektive Aufmerksamkeit.
 * Echte 3D-Straße (Segmentverfahren) mit Kurven, Hügeln, Landschaft und Ortschaften. Rechts fahren,
 * Tempolimits einhalten (Tacho unten rechts), an roten Ampeln, Zebrastreifen mit Fußgängern und
 * geschlossenen Bahnübergängen anhalten, bei plötzlichen Gefahren bremsen, Gegenverkehr beachten.
 * Eigene Umsetzung mit eigener Grafik. */
(function () {
  'use strict';
  var HT = window.HT;

  /* ---------- Level ---------- */
  var levels = HT.stufen(14, function (t, i) {
    return {
      kurven: i <= 1 ? 0.15 : HT.lerp(0.4, 1, (i - 2) / 12),
      huegel: i >= 3,
      gegenverkehr: i >= 3 ? HT.lerp(0.25, 0.7, (i - 3) / 11) : 0,
      tempoSelbst: i >= 4,
      schilder: i >= 4,
      ampeln: i >= 6,
      zebra: i >= 8,
      orte: i >= 8,
      bahn: i >= 10,
      ablenker: i >= 10 ? HT.lerp(0.3, 0.6, (i - 10) / 4) : 0,
      gefahrAbstandSek: HT.lerpInt(16, 8, t),
      grundtempo: HT.lerpInt(45, 80, t),
      reaktionsfenster: HT.lerp(1, 0.65, t)
    };
  });

  /* ---------- Welt ---------- */
  var SEG = 200, STRASSE = 2000, KAMERA_H = 1000, SICHT = 220, BAND = 3, M = 570; // M = Einheiten pro Meter
  var KAMERA_TIEFE = 1 / Math.tan(50 * Math.PI / 180), METER_JE_SEG = 1.5;
  var LIMITS = [30, 50, 70, 100];
  var ORTE = ['Lindental', 'Bergheim', 'Sonnenfeld', 'Auendorf', 'Rosenau', 'Kirchberg', 'Waldsee', 'Mühlhausen'];
  var GEFAHREN = ['ball', 'fussgaenger', 'reh', 'radfahrer', 'hund'];
  var AUTOFARBEN = ['#d64545', '#3d6fd6', '#f2b630', '#2e9e62', '#e8eef2', '#3a3f45', '#8a5ad6'];

  function mischen(a, b, t) { return [Math.round(a[0] + (b[0] - a[0]) * t), Math.round(a[1] + (b[1] - a[1]) * t), Math.round(a[2] + (b[2] - a[2]) * t)]; }
  function rgb(c) { return 'rgb(' + c[0] + ',' + c[1] + ',' + c[2] + ')'; }
  var DUNST = [214, 232, 240];
  var FARBE = {
    grasHell: [134, 196, 104], grasDunkel: [120, 184, 92], ortHell: [176, 186, 172], ortDunkel: [166, 176, 162],
    strasseHell: [112, 118, 124], strasseDunkel: [106, 112, 118], rand: [238, 241, 243], bankett: [190, 180, 160], linie: [246, 248, 249]
  };

  /* ---------- Zeichnen einzelner Objekte (Füße bei x, y; k = Pixel je Welteinheit) ---------- */
  function m(k, meter) { return meter * M * k; }
  var OBJ = {
    baum: function (g, x, y, k, o) {
      var h = m(k, o.h || 7);
      g.fillStyle = '#6e4c2e'; g.fillRect(x - h * 0.04, y - h * 0.4, h * 0.08, h * 0.4);
      g.fillStyle = o.f || '#3f9450'; g.beginPath(); g.arc(x, y - h * 0.62, h * 0.3, 0, Math.PI * 2); g.fill();
      g.fillStyle = 'rgba(255,255,255,.12)'; g.beginPath(); g.arc(x - h * 0.1, y - h * 0.72, h * 0.13, 0, Math.PI * 2); g.fill();
    },
    tanne: function (g, x, y, k, o) {
      var h = m(k, o.h || 9);
      g.fillStyle = '#5a3d24'; g.fillRect(x - h * 0.03, y - h * 0.15, h * 0.06, h * 0.15);
      g.fillStyle = '#2f7343';
      for (var i = 0; i < 3; i++) { var b = h * (0.34 - i * 0.08), yy = y - h * (0.12 + i * 0.27); g.beginPath(); g.moveTo(x - b, yy); g.lineTo(x + b, yy); g.lineTo(x, yy - h * 0.42); g.closePath(); g.fill(); }
    },
    busch: function (g, x, y, k) { var h = m(k, 1.3); g.fillStyle = '#4f9a4c'; g.beginPath(); g.arc(x - h * 0.4, y - h * 0.4, h * 0.45, 0, Math.PI * 2); g.arc(x + h * 0.3, y - h * 0.45, h * 0.5, 0, Math.PI * 2); g.fill(); },
    pfosten: function (g, x, y, k) { var h = m(k, 1.1), b = Math.max(1, h * 0.12); g.fillStyle = '#f4f6f7'; g.fillRect(x - b / 2, y - h, b, h); g.fillStyle = '#26333c'; g.fillRect(x - b / 2, y - h * 0.82, b, h * 0.2); g.fillStyle = '#ff9a2e'; g.fillRect(x - b / 2, y - h * 0.78, b, h * 0.08); },
    haus: function (g, x, y, k, o) {
      var b = m(k, o.b || 10), h = m(k, o.h || 7);
      g.fillStyle = o.f || '#efe2c8'; g.fillRect(x - b / 2, y - h, b, h);
      g.fillStyle = o.d || '#b5533c'; g.beginPath(); g.moveTo(x - b * 0.58, y - h); g.lineTo(x, y - h - b * 0.42); g.lineTo(x + b * 0.58, y - h); g.closePath(); g.fill();
      g.fillStyle = '#7fb3cf';
      for (var r = 0; r < 2; r++) for (var c = 0; c < 3; c++) g.fillRect(x - b * 0.36 + c * b * 0.26, y - h * 0.86 + r * h * 0.36, b * 0.16, h * 0.2);
      g.fillStyle = '#6e4c2e'; g.fillRect(x - b * 0.07, y - h * 0.32, b * 0.14, h * 0.32);
    },
    tafel: function (g, x, y, k, o) {
      var b = m(k, 6), h = m(k, 5.5);
      g.fillStyle = '#7d878e'; g.fillRect(x - b * 0.3, y - h * 0.55, b * 0.05, h * 0.55); g.fillRect(x + b * 0.25, y - h * 0.55, b * 0.05, h * 0.55);
      g.fillStyle = o.f || '#E8833A'; g.fillRect(x - b / 2, y - h, b, h * 0.48);
      g.fillStyle = '#fff'; g.font = '800 ' + Math.max(6, Math.round(h * 0.16)) + 'px -apple-system, Helvetica, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(o.t || 'Frische Brötchen', x, y - h * 0.76);
    },
    limit: function (g, x, y, k, o) {
      var h = m(k, 2.6), r = h * 0.22;
      g.fillStyle = '#9aa5ad'; g.fillRect(x - h * 0.02, y - h * 0.75, h * 0.04, h * 0.75);
      g.fillStyle = '#fff'; g.beginPath(); g.arc(x, y - h * 0.82, r, 0, Math.PI * 2); g.fill();
      g.strokeStyle = '#d63b3b'; g.lineWidth = Math.max(1, r * 0.26); g.stroke();
      g.fillStyle = '#1e2a33'; g.font = '800 ' + Math.max(5, Math.round(r * 0.95)) + 'px -apple-system, Helvetica, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(String(o.wert), x, y - h * 0.81);
    },
    ortsschild: function (g, x, y, k, o) {
      var h = m(k, 2.4), b = h * 0.75;
      g.fillStyle = '#9aa5ad'; g.fillRect(x - b * 0.3, y - h * 0.6, h * 0.03, h * 0.6); g.fillRect(x + b * 0.27, y - h * 0.6, h * 0.03, h * 0.6);
      g.fillStyle = '#f5cf2a'; g.fillRect(x - b / 2, y - h, b, h * 0.42); g.strokeStyle = '#1e2a33'; g.lineWidth = Math.max(1, h * 0.02); g.strokeRect(x - b / 2 + h * 0.03, y - h + h * 0.03, b - h * 0.06, h * 0.36);
      g.fillStyle = '#1e2a33'; g.font = '800 ' + Math.max(5, Math.round(h * 0.11)) + 'px -apple-system, Helvetica, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(o.name, x, y - h * 0.79);
      if (o.ende) { g.strokeStyle = '#d63b3b'; g.lineWidth = Math.max(1, h * 0.035); g.beginPath(); g.moveTo(x - b * 0.45, y - h * 0.62); g.lineTo(x + b * 0.45, y - h * 0.96); g.stroke(); }
    },
    ampel: function (g, x, y, k, o) {
      var h = m(k, 4.2), b = h * 0.12;
      g.fillStyle = '#5f6a72'; g.fillRect(x - h * 0.02, y - h * 0.62, h * 0.04, h * 0.62);
      g.fillStyle = '#1e2a33'; g.fillRect(x - b / 2, y - h, b, h * 0.38);
      var z = o.zustand;
      [['rot', '#ff3b30', 0], ['gelb', '#ffcc00', 1], ['gruen', '#30d158', 2]].forEach(function (l) {
        var an = z === l[0] || (z === 'rotgelb' && l[0] !== 'gruen');
        g.fillStyle = an ? l[1] : '#3a444b'; g.beginPath(); g.arc(x, y - h * 0.94 + l[2] * h * 0.12, b * 0.36, 0, Math.PI * 2); g.fill();
        if (an) { g.fillStyle = l[1]; g.globalAlpha = 0.3; g.beginPath(); g.arc(x, y - h * 0.94 + l[2] * h * 0.12, b * 0.75, 0, Math.PI * 2); g.fill(); g.globalAlpha = 1; }
      });
    },
    andreas: function (g, x, y, k, o) {
      var h = m(k, 3.2), b = h * 0.32;
      g.fillStyle = '#9aa5ad'; g.fillRect(x - h * 0.02, y - h * 0.7, h * 0.04, h * 0.7);
      g.save(); g.translate(x, y - h * 0.85); g.lineWidth = Math.max(1.5, h * 0.06);
      g.strokeStyle = '#d63b3b'; g.beginPath(); g.moveTo(-b, -b * 0.6); g.lineTo(b, b * 0.6); g.moveTo(-b, b * 0.6); g.lineTo(b, -b * 0.6); g.stroke();
      g.restore();
      var blink = o.zu && Math.floor(o.zeit / 400) % 2;
      g.fillStyle = o.zu ? (blink ? '#ff3b30' : '#5a1f1f') : '#3a444b'; g.beginPath(); g.arc(x - h * 0.08, y - h * 0.58, h * 0.05, 0, Math.PI * 2); g.fill();
      g.fillStyle = o.zu ? (!blink ? '#ff3b30' : '#5a1f1f') : '#3a444b'; g.beginPath(); g.arc(x + h * 0.08, y - h * 0.58, h * 0.05, 0, Math.PI * 2); g.fill();
    },
    vogel: function (g, x, y, k, o) { var h = m(k, 0.6), f = Math.sin(o.zeit / 90) * h * 0.5; g.strokeStyle = '#26333c'; g.lineWidth = Math.max(1, h * 0.15); g.beginPath(); g.moveTo(x - h, y - m(k, 4) + f); g.quadraticCurveTo(x - h * 0.4, y - m(k, 4) - h * 0.4, x, y - m(k, 4)); g.quadraticCurveTo(x + h * 0.4, y - m(k, 4) - h * 0.4, x + h, y - m(k, 4) + f); g.stroke(); }
  };
  /* bewegte Figuren */
  function figur(g, typ, x, y, k, zeit, farbe) {
    var s = M * k; // Pixel je Meter
    g.save(); g.translate(x, y);
    g.fillStyle = 'rgba(0,0,0,.18)'; g.beginPath(); g.ellipse(0, 0, s * 0.45, s * 0.1, 0, 0, Math.PI * 2); g.fill();
    if (typ === 'ball') {
      var r = s * 0.17; g.rotate(zeit / 200);
      g.fillStyle = '#E25C5C'; g.beginPath(); g.arc(0, -r, r, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#fff'; g.beginPath(); g.arc(0, -r, r, -0.5, 0.5); g.lineTo(0, -r); g.fill();
    } else if (typ === 'fussgaenger' || typ === 'passant') {
      var sw = Math.sin(zeit / 140) * s * 0.15 * (typ === 'fussgaenger' ? 1 : 0.15);
      g.strokeStyle = '#2a3a46'; g.lineWidth = s * 0.13; g.lineCap = 'round';
      g.beginPath(); g.moveTo(0, -s * 0.9); g.lineTo(-sw, 0); g.moveTo(0, -s * 0.9); g.lineTo(sw, 0); g.stroke();
      g.fillStyle = farbe || '#3D7BE0'; g.beginPath(); g.moveTo(-s * 0.2, -s * 0.85); g.lineTo(s * 0.2, -s * 0.85); g.lineTo(s * 0.17, -s * 1.45); g.lineTo(-s * 0.17, -s * 1.45); g.closePath(); g.fill();
      g.fillStyle = '#f0c8a0'; g.beginPath(); g.arc(0, -s * 1.6, s * 0.14, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#4a3324'; g.beginPath(); g.arc(0, -s * 1.66, s * 0.14, Math.PI, 0); g.fill();
    } else if (typ === 'reh') {
      g.fillStyle = '#a8703c'; g.beginPath(); g.ellipse(0, -s * 0.85, s * 0.55, s * 0.24, 0, 0, Math.PI * 2); g.fill();
      g.fillRect(-s * 0.4, -s * 0.7, s * 0.08, s * 0.7); g.fillRect(s * 0.32, -s * 0.7, s * 0.08, s * 0.7);
      g.beginPath(); g.ellipse(s * 0.55, -s * 1.25, s * 0.14, s * 0.22, 0.4, 0, Math.PI * 2); g.fill();
      g.strokeStyle = '#6b4320'; g.lineWidth = s * 0.05; g.beginPath(); g.moveTo(s * 0.55, -s * 1.45); g.lineTo(s * 0.48, -s * 1.7); g.moveTo(s * 0.6, -s * 1.45); g.lineTo(s * 0.7, -s * 1.7); g.stroke();
    } else if (typ === 'hund') {
      g.fillStyle = '#c49a5a'; g.beginPath(); g.ellipse(0, -s * 0.45, s * 0.4, s * 0.17, 0, 0, Math.PI * 2); g.fill();
      g.fillRect(-s * 0.3, -s * 0.35, s * 0.07, s * 0.35); g.fillRect(s * 0.24, -s * 0.35, s * 0.07, s * 0.35);
      g.beginPath(); g.arc(s * 0.42, -s * 0.62, s * 0.15, 0, Math.PI * 2); g.fill();
    } else if (typ === 'radfahrer') {
      g.strokeStyle = '#26333c'; g.lineWidth = s * 0.06;
      g.beginPath(); g.arc(-s * 0.45, -s * 0.33, s * 0.33, 0, Math.PI * 2); g.moveTo(s * 0.78, -s * 0.33); g.arc(s * 0.45, -s * 0.33, s * 0.33, 0, Math.PI * 2); g.stroke();
      g.beginPath(); g.moveTo(-s * 0.45, -s * 0.33); g.lineTo(0, -s * 0.8); g.lineTo(s * 0.45, -s * 0.33); g.stroke();
      g.fillStyle = '#2EAD6B'; g.fillRect(-s * 0.15, -s * 1.45, s * 0.32, s * 0.65);
      g.fillStyle = '#f0c8a0'; g.beginPath(); g.arc(s * 0.02, -s * 1.62, s * 0.14, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#E25C5C'; g.beginPath(); g.arc(s * 0.02, -s * 1.67, s * 0.15, Math.PI, 0); g.fill();
    }
    g.restore();
  }
  function autoFront(g, x, y, k, farbe) {
    var s = M * k, b = s * 1.8, h = s * 1.45;
    g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(x, y, b * 0.6, b * 0.12, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = farbe; g.beginPath(); g.moveTo(x - b / 2, y - h * 0.1); g.lineTo(x - b / 2, y - h * 0.5); g.lineTo(x - b * 0.36, y - h); g.lineTo(x + b * 0.36, y - h); g.lineTo(x + b / 2, y - h * 0.5); g.lineTo(x + b / 2, y - h * 0.1); g.closePath(); g.fill();
    g.fillStyle = '#9fc4d6'; g.beginPath(); g.moveTo(x - b * 0.4, y - h * 0.55); g.lineTo(x - b * 0.31, y - h * 0.92); g.lineTo(x + b * 0.31, y - h * 0.92); g.lineTo(x + b * 0.4, y - h * 0.55); g.closePath(); g.fill();
    g.fillStyle = '#fff6c9'; g.fillRect(x - b * 0.46, y - h * 0.42, b * 0.18, h * 0.1); g.fillRect(x + b * 0.28, y - h * 0.42, b * 0.18, h * 0.1);
    g.fillStyle = '#222a30'; g.fillRect(x - b * 0.18, y - h * 0.34, b * 0.36, h * 0.12); g.fillRect(x - b * 0.48, y - h * 0.12, b * 0.16, h * 0.12); g.fillRect(x + b * 0.32, y - h * 0.12, b * 0.16, h * 0.12);
  }
  function zug(g, x, y, k, b) {
    var s = M * k, h = s * 3.4;
    g.fillStyle = '#c62f2f'; g.fillRect(x, y - h, b, h * 0.85);
    g.fillStyle = '#e9edf0'; g.fillRect(x, y - h * 0.55, b, h * 0.08);
    g.fillStyle = '#9fc4d6'; for (var i = x + s * 0.8; i < x + b - s; i += s * 2.4) g.fillRect(i, y - h * 0.9, s * 1.5, h * 0.28);
    g.fillStyle = '#222a30'; g.fillRect(x, y - h * 0.15, b, h * 0.15);
  }
  function eigenesAuto(g, x, y, b, neigung, bremse, blinkLinks) {
    var h = b * 0.62;
    g.save(); g.translate(x, y); g.rotate(neigung);
    g.fillStyle = 'rgba(0,0,0,.28)'; g.beginPath(); g.ellipse(0, 0, b * 0.58, b * 0.09, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#1e2329'; g.fillRect(-b * 0.47, -h * 0.2, b * 0.17, h * 0.22); g.fillRect(b * 0.3, -h * 0.2, b * 0.17, h * 0.22);
    var gr = g.createLinearGradient(0, -h, 0, 0); gr.addColorStop(0, '#24c0cc'); gr.addColorStop(1, '#127f96');
    g.fillStyle = gr;
    g.beginPath(); g.moveTo(-b * 0.5, -h * 0.12); g.lineTo(-b * 0.5, -h * 0.5); g.quadraticCurveTo(-b * 0.49, -h * 0.62, -b * 0.4, -h * 0.64); g.lineTo(b * 0.4, -h * 0.64); g.quadraticCurveTo(b * 0.49, -h * 0.62, b * 0.5, -h * 0.5); g.lineTo(b * 0.5, -h * 0.12); g.closePath(); g.fill();
    g.fillStyle = '#1aa5b6'; g.beginPath(); g.moveTo(-b * 0.36, -h * 0.64); g.lineTo(-b * 0.28, -h); g.lineTo(b * 0.28, -h); g.lineTo(b * 0.36, -h * 0.64); g.closePath(); g.fill();
    var sch = g.createLinearGradient(0, -h, 0, -h * 0.66); sch.addColorStop(0, '#5d7f8f'); sch.addColorStop(1, '#a8c8d6');
    g.fillStyle = sch; g.beginPath(); g.moveTo(-b * 0.31, -h * 0.68); g.lineTo(-b * 0.25, -h * 0.95); g.lineTo(b * 0.25, -h * 0.95); g.lineTo(b * 0.31, -h * 0.68); g.closePath(); g.fill();
    var rl = bremse ? '#ff2a2a' : '#a32020';
    if (bremse) { g.fillStyle = 'rgba(255,40,40,.35)'; g.beginPath(); g.arc(-b * 0.38, -h * 0.42, b * 0.13, 0, Math.PI * 2); g.arc(b * 0.38, -h * 0.42, b * 0.13, 0, Math.PI * 2); g.fill(); }
    g.fillStyle = rl; g.fillRect(-b * 0.47, -h * 0.48, b * 0.17, h * 0.12); g.fillRect(b * 0.3, -h * 0.48, b * 0.17, h * 0.12);
    if (blinkLinks !== null) { g.fillStyle = '#ffb020'; g.fillRect(blinkLinks ? -b * 0.47 : b * 0.42, -h * 0.34, b * 0.05, h * 0.07); }
    g.fillStyle = '#f4f6f8'; g.fillRect(-b * 0.13, -h * 0.34, b * 0.26, h * 0.12);
    g.fillStyle = '#26333c'; g.font = '700 ' + Math.round(h * 0.08) + 'px -apple-system, Helvetica, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('HT·2026', 0, -h * 0.28);
    g.fillStyle = '#2a3036'; g.fillRect(-b * 0.5, -h * 0.16, b, h * 0.06);
    g.restore();
  }
  function tacho(g, x, y, r, v, limit) {
    g.save();
    var hg = g.createRadialGradient(x, y - r * 0.3, r * 0.2, x, y, r + 10); hg.addColorStop(0, '#2b343b'); hg.addColorStop(1, '#14191d');
    g.fillStyle = hg; g.beginPath(); g.arc(x, y, r + 9, 0, Math.PI * 2); g.fill();
    g.strokeStyle = 'rgba(255,255,255,.25)'; g.lineWidth = 2; g.stroke();
    var a0 = Math.PI * 0.75, a1 = Math.PI * 2.25, max = 160;
    g.lineWidth = 7; g.strokeStyle = 'rgba(255,255,255,.12)'; g.beginPath(); g.arc(x, y, r - 5, a0, a1); g.stroke();
    if (limit) { g.strokeStyle = 'rgba(48,209,88,.75)'; g.beginPath(); g.arc(x, y, r - 5, a0 + (a1 - a0) * Math.max(0, limit - 15) / max, a0 + (a1 - a0) * Math.min(max, limit + 5) / max); g.stroke(); g.strokeStyle = 'rgba(255,59,48,.75)'; g.beginPath(); g.arc(x, y, r - 5, a0 + (a1 - a0) * Math.min(max, limit + 5) / max, a1); g.stroke(); }
    g.fillStyle = '#dfe6ea'; g.font = '600 ' + Math.round(r * 0.15) + 'px -apple-system, Helvetica, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    for (var k = 0; k <= max; k += 10) {
      var a = a0 + (a1 - a0) * k / max, lang = k % 20 === 0;
      g.strokeStyle = lang ? '#f4f6f7' : 'rgba(255,255,255,.5)'; g.lineWidth = lang ? 2 : 1;
      g.beginPath(); g.moveTo(x + Math.cos(a) * (r - 12), y + Math.sin(a) * (r - 12)); g.lineTo(x + Math.cos(a) * (r - (lang ? 20 : 16)), y + Math.sin(a) * (r - (lang ? 20 : 16))); g.stroke();
      if (lang && k % 40 === 0) g.fillText(String(k), x + Math.cos(a) * (r - 32), y + Math.sin(a) * (r - 32));
    }
    var an = a0 + (a1 - a0) * HT.klemmen(v, 0, max) / max, zuSchnell = limit && v > limit + 5;
    g.strokeStyle = zuSchnell ? '#ff453a' : '#ff9f0a'; g.lineWidth = 3.5; g.lineCap = 'round';
    g.beginPath(); g.moveTo(x - Math.cos(an) * r * 0.12, y - Math.sin(an) * r * 0.12); g.lineTo(x + Math.cos(an) * (r - 16), y + Math.sin(an) * (r - 16)); g.stroke();
    g.fillStyle = '#3a444b'; g.beginPath(); g.arc(x, y, r * 0.11, 0, Math.PI * 2); g.fill();
    g.fillStyle = zuSchnell ? '#ff453a' : '#ffffff'; g.font = '800 ' + Math.round(r * 0.36) + 'px -apple-system, Helvetica, sans-serif';
    g.fillText(Math.round(v), x, y + r * 0.45);
    g.fillStyle = '#9aa7b0'; g.font = '600 ' + Math.round(r * 0.13) + 'px -apple-system, Helvetica, sans-serif'; g.fillText('km/h', x, y + r * 0.72);
    g.restore();
  }

  HT.registerModule({
    id: 'strassenverkehr', name: 'Straßenverkehr', kategorie: 'aufmerksamkeit', symbol: 'weiter',
    ziel: 'Im Straßenverkehr mehrere Dinge zugleich beachten: Spur, Tempo, Ampeln, Fußgänger und Gefahren',
    beschreibung: 'Fahrsimulation auf einer 3D-Landstraße mit Kurven, Hügeln und Ortschaften für geteilte und selektive Aufmerksamkeit. Es wird rechts gefahren (Lenken mit ← →). Ab Level 3 kommt Gegenverkehr, ab Level 4 müssen die Tempolimits selbst eingehalten werden (↑ Gas, ↓ langsamer, Tacho unten rechts). Ab Level 6 gibt es Ampeln, ab Level 8 Ortschaften mit Zebrastreifen, ab Level 10 Bahnübergänge und Ablenker (Werbetafeln, Passanten, Vögel). Bei Gefahren auf der Fahrbahn wird mit der Leertaste gebremst. Ausgewertet werden Bremsreaktionen und Reaktionszeit, Halten an Ampel, Zebrastreifen und Bahnübergang, Spurhaltung, Gegenverkehr und Tempo.',
    anleitung: 'Fahren Sie rechts auf Ihrer Fahrspur (Pfeiltasten ← →). Halten Sie das Tempo vom letzten Schild ein (↑ Gas, ↓ langsamer). Bei Gefahr, roter Ampel, Fußgänger am Zebrastreifen oder geschlossener Schranke bremsen Sie mit der Leertaste und warten. Danach fahren Sie mit ↑ weiter.',
    tasten: [], levels: levels,
    levelLabels: { kurven: 'Kurvenstärke', huegel: 'Hügel', gegenverkehr: 'Gegenverkehr', tempoSelbst: 'Tempo selbst regeln', schilder: 'Tempolimits', ampeln: 'Ampeln', zebra: 'Zebrastreifen', orte: 'Ortschaften', bahn: 'Bahnübergänge', ablenker: 'Ablenker', gefahrAbstandSek: 'Gefahr etwa alle (s)', grundtempo: 'Grundtempo (km/h)', reaktionsfenster: 'Reaktionsfenster (Faktor)' },
    bewertung: { aufstufenAb: 0.85, abstufenUnter: 0.6 },
    parameterSchema: { dauerDurchgangSek: { typ: 'zahl', label: 'Dauer eines Durchgangs (Sek.)', min: 60, max: 600, schritt: 30, standard: 150 } },

    create: function (container, ctx) {
      var p = ctx.params, Z = HT.zeit, aus = [];
      var flaeche = HT.m.neu(container, 'm-voll');
      var cv = HT.canvasVoll(flaeche), g = cv.ctx, W = cv.b, H = cv.h;
      var banner = HT.m.neu(container, 'sv-banner', '');
      var leiste = HT.m.neu(container, 'sv-leiste');
      function knopf(text, klasse) { var b = HT.el('button', { type: 'button', class: 'sv-knopf ' + (klasse || '') }, text); leiste.appendChild(b); return b; }
      var kL = knopf('◀', 'lenk'), kR = knopf('▶', 'lenk'), kBremse = knopf('BREMSE', 'bremse'), kLangsam = knopf('−', 'tempo'), kGas = knopf('GAS', 'gas');
      if (!p.tempoSelbst) kLangsam.style.display = 'none';
      var halten = { links: false, rechts: false, hoch: false, runter: false, bremse: false };
      [[kL, 'links'], [kR, 'rechts'], [kGas, 'hoch'], [kLangsam, 'runter'], [kBremse, 'bremse']].forEach(function (x) {
        var an = function (ev) { ev.preventDefault(); halten[x[1]] = true; if (x[1] === 'bremse') bremsDruck(); }, ab = function () { halten[x[1]] = false; };
        x[0].addEventListener('pointerdown', an); x[0].addEventListener('pointerup', ab); x[0].addEventListener('pointerleave', ab); x[0].addEventListener('pointercancel', ab);
      });
      var pfeile = HT.pfeilTasten();
      var leerGehalten = false;
      function tasteRunter(ev) { if (ev.key === ' ' || ev.code === 'Space') { if (!leerGehalten) bremsDruck(); leerGehalten = true; ev.preventDefault(); } }
      function tasteHoch(ev) { if (ev.key === ' ' || ev.code === 'Space') leerGehalten = false; }
      document.addEventListener('keydown', tasteRunter, true); document.addEventListener('keyup', tasteHoch, true);

      /* ----- Strecke ----- */
      var strecke = [];
      function segmentAnhaengen(kurve, y) {
        var n = strecke.length, vorY = n ? strecke[n - 1].p2.y : 0;
        strecke.push({ i: n, kurve: kurve, p1: { y: vorY, s: {} }, p2: { y: y, s: {} }, objekte: [], ort: false, zebra: false, stoplinie: false, gleis: false });
      }
      function huegelY(n) { return p.huegel ? Math.sin(n / 70) * 1400 + Math.sin(n / 23) * 300 : 0; }
      function abschnitt(laenge, kurve) {
        var ein = Math.floor(laenge * 0.25), aus2 = Math.floor(laenge * 0.25);
        for (var j = 0; j < laenge; j++) {
          var f = j < ein ? j / ein : j > laenge - aus2 ? (laenge - j) / aus2 : 1;
          segmentAnhaengen(kurve * f, huegelY(strecke.length));
        }
      }
      function streckeVerlaengern(bis) {
        while (strecke.length < bis) {
          var kurve = HT.zufall.chance(0.45) ? 0 : HT.zufall.wahl([-1, 1]) * HT.zufall.zahl(1.5, 5.5) * p.kurven;
          abschnitt(HT.zufall.int(60, 160), kurve);
        }
      }
      streckeVerlaengern(1600);

      /* ----- Zustand ----- */
      var S = {
        pos: 0, x: 0.5, v: p.schilder ? 50 : p.grundtempo, limit: p.schilder ? 50 : p.grundtempo,
        bremsBis: 0, steht: 0, hinweisBis: 0, blink: null,
        dyn: [], ereignisse: [], naechstesEreignis: 30, naechsteGefahr: Z.jetzt() + 6000, naechsterVerkehr: Z.jetzt() + 4000,
        pruefung: Z.jetzt() + 5000, sperre: null, ortBis: -1, letzteKurve: 0
      };
      function segIndex(z) { return Math.floor(z / SEG); }
      function seg(n) { if (n >= strecke.length - 5) streckeVerlaengern(n + 1000); return strecke[n]; }
      function melde(text, art, ms) { banner.textContent = text; banner.className = 'sv-banner an ' + (art || ''); S.hinweisBis = Z.jetzt() + (ms || 1600); }

      /* Landschaft auffüllen (Bäume, Pfosten, Häuser) */
      var gefuellt = 0;
      function landschaft(bis) {
        for (; gefuellt < bis; gefuellt++) {
          var s = seg(gefuellt);
          if (gefuellt % 20 === 0) { s.objekte.push({ typ: 'pfosten', x: -1.2 }); s.objekte.push({ typ: 'pfosten', x: 1.2 }); }
          if (s.ort) {
            if (gefuellt % 14 === 0) s.objekte.push({ typ: 'haus', x: HT.zufall.wahl([-1, 1]) * HT.zufall.zahl(2.4, 3.2), b: HT.zufall.zahl(8, 13), h: HT.zufall.zahl(6, 9), f: HT.zufall.wahl(['#efe2c8', '#f3d9cf', '#dfe8f0', '#e8e4f3', '#f6ecd0']), d: HT.zufall.wahl(['#b5533c', '#8a4a3a', '#6f7b84']) });
            if (gefuellt % 31 === 0) s.objekte.push({ typ: 'baum', x: HT.zufall.wahl([-1, 1]) * 1.7, h: 6 });
          } else {
            if (HT.zufall.chance(0.11)) s.objekte.push({ typ: HT.zufall.wahl(['baum', 'baum', 'tanne', 'busch']), x: HT.zufall.wahl([-1, 1]) * HT.zufall.zahl(1.7, 5), h: HT.zufall.zahl(6, 11), f: HT.zufall.wahl(['#3f9450', '#4a9e4f', '#368a49']) });
          }
        }
      }

      /* ----- Ereignisse planen ----- */
      function ereignisPlanen() {
        var start = segIndex(S.pos);
        if (S.naechstesEreignis > start + 260) return;
        var n = Math.max(S.naechstesEreignis, start + 150);
        var moegl = [];
        if (p.schilder) moegl.push('limit', 'limit');
        if (p.ampeln) moegl.push('ampel', 'ampel');
        if (p.orte) moegl.push('ort');
        if (p.bahn) moegl.push('bahn');
        if (p.ablenker) moegl.push('tafel');
        if (!moegl.length) moegl.push('frei');
        var art = HT.zufall.wahl(moegl);
        if (art === 'limit') { var w = HT.zufall.wahl(LIMITS.filter(function (l) { return l !== S.limit && !(S.ortBis > n && l > 50); })); seg(n).objekte.push({ typ: 'limit', x: 1.35, wert: w, ereignis: { art: 'limit', wert: w } }); S.naechstesEreignis = n + HT.zufall.int(120, 220); }
        else if (art === 'ampel') { var a = { art: 'ampel', seg: n, zustand: 'gruen', rotGeplant: HT.zufall.chance(0.7), geprueft: false }; seg(n).objekte.push({ typ: 'ampel', x: 1.25, ampel: a }); seg(n).objekte.push({ typ: 'ampel', x: -1.25, ampel: a }); seg(n - 2).stoplinie = true; S.ereignisse.push(a); S.naechstesEreignis = n + HT.zufall.int(160, 260); }
        else if (art === 'ort') {
          var name = HT.zufall.wahl(ORTE), laenge = HT.zufall.int(220, 360);
          for (var j = n; j < n + laenge; j++) seg(j).ort = true;
          seg(n).objekte.push({ typ: 'ortsschild', x: 1.35, name: name, ereignis: { art: 'ortein', name: name } });
          seg(n + laenge).objekte.push({ typ: 'ortsschild', x: 1.35, name: name, ende: true, ereignis: { art: 'ortaus', name: name } });
          S.ortBis = n + laenge;
          if (p.zebra) { var zs = n + Math.floor(laenge * HT.zufall.zahl(0.35, 0.65)); var zb = { art: 'zebra', seg: zs, person: null, geprueft: false, mitPerson: HT.zufall.chance(0.75) }; seg(zs).zebra = true; seg(zs - 1).zebra = true; S.ereignisse.push(zb); }
          S.naechstesEreignis = n + laenge + HT.zufall.int(80, 160);
        }
        else if (art === 'bahn') { var bb = { art: 'bahn', seg: n, zu: false, zugX: null, geprueft: false, mitZug: HT.zufall.chance(0.75), zeit: 0 }; seg(n).gleis = true; seg(n).objekte.push({ typ: 'andreas', x: 1.3, bahn: bb }); seg(n).objekte.push({ typ: 'andreas', x: -1.3, bahn: bb }); seg(n - 3).stoplinie = true; S.ereignisse.push(bb); S.naechstesEreignis = n + HT.zufall.int(180, 260); }
        else if (art === 'tafel') { seg(n).objekte.push({ typ: 'tafel', x: HT.zufall.wahl([-1, 1]) * 2.2, f: HT.zufall.wahl(['#E8833A', '#3D7BE0', '#8A63D2', '#2EAD6B']), t: HT.zufall.wahl(['Frische Brötchen', 'Autohaus Süd', 'Hofladen 2 km', 'Eis & Café']), ablenker: true }); S.naechstesEreignis = n + HT.zufall.int(80, 140); }
        else S.naechstesEreignis = n + 200;
      }

      /* ----- Bremsen ----- */
      function bremsDruck() {
        var jetzt = Z.jetzt();
        S.bremsBis = jetzt + 700;
        var gef = S.dyn.filter(function (o) { return o.gefahr && !o.erledigt && o.seg - segIndex(S.pos) < 110; })[0];
        if (gef) {
          gef.erledigt = true; gef.weg = true;
          ctx.onEvent({ korrekt: true, reiz: gef.typ, reaktion: 'gebremst', rtMs: jetzt - gef.start, typ: 'bremsen', seite: gef.seite });
          ctx.feedback(true, null, null, { dauer: 300 }); melde('Gut reagiert!', 'gut', 1000);
          return;
        }
        if (S.sperre) S.sperre.gebremst = true;
        if (S.sperre || naheHaltestelle()) return; // Anhalten vor Ampel/Zebra/Bahn ist richtig
        var ablenker = S.dyn.some(function (o) { return o.ablenker && o.seg - segIndex(S.pos) < 80 && o.seg > segIndex(S.pos); }) ||
          (function () { for (var j = segIndex(S.pos); j < segIndex(S.pos) + 70; j++) if (seg(j).objekte.some(function (o) { return o.ablenker; })) return true; return false; })();
        if (ablenker) { ctx.onEvent({ korrekt: false, reiz: 'ablenker', reaktion: 'gebremst', typ: 'unnötig gebremst' }); ctx.feedback(false); melde('Keine Gefahr – nur am Straßenrand', 'warn', 1300); }
      }
      function naheHaltestelle() {
        var n = segIndex(S.pos);
        return S.ereignisse.some(function (e) { return (e.art === 'ampel' || e.art === 'zebra' || e.art === 'bahn') && e.seg - n < 70 && e.seg - n > -2; });
      }

      /* ----- Verkehr & Gefahren erzeugen ----- */
      function verkehr(jetzt) {
        var n = segIndex(S.pos);
        if (p.gegenverkehr && jetzt > S.naechsterVerkehr) {
          S.dyn.push({ typ: 'auto', seg: n + SICHT - 10, z: (n + SICHT - 10) * SEG, x: -0.5, v: HT.zufall.zahl(60, 90), farbe: HT.zufall.wahl(AUTOFARBEN), gegen: true });
          S.naechsterVerkehr = jetzt + HT.zufall.int(2500, 9000) / p.gegenverkehr;
        }
        if (jetzt > S.naechsteGefahr && !S.sperre && !naheHaltestelle() && !S.dyn.some(function (o) { return o.gefahr && !o.erledigt; }) && S.v > 15) {
          var seite = HT.zufall.wahl([-1, 1]), weite = Math.max(28, Math.round(S.v / 3.6 * 3.8 * p.reaktionsfenster / METER_JE_SEG));
          var typ = HT.zufall.wahl(GEFAHREN);
          S.dyn.push({ typ: typ, gefahr: true, seg: n + weite, z: (n + weite) * SEG, x: seite * 1.6, ziel: HT.zufall.zahl(0.2, 0.8), tempo: HT.zufall.zahl(0.9, 1.3) / p.reaktionsfenster, start: jetzt, seite: seite < 0 ? 'links' : 'rechts' });
          S.naechsteGefahr = jetzt + p.gefahrAbstandSek * 1000 * HT.zufall.zahl(0.7, 1.3);
        }
        if (p.ablenker && HT.zufall.chance(p.ablenker * 0.006)) {
          var art = HT.zufall.wahl(['passant', 'vogel', 'reh']);
          S.dyn.push({ typ: art, ablenker: true, seg: n + 140, z: (n + 140) * SEG, x: HT.zufall.wahl([-1, 1]) * (art === 'reh' ? HT.zufall.zahl(4, 7) : 1.9), farbe: HT.zufall.wahl(['#8A63D2', '#E8833A', '#5f6b74']) });
        }
      }

      /* ----- Hauptschritt ----- */
      function schritt(dt, jetzt) {
        var links = halten.links || pfeile.links, rechts = halten.rechts || pfeile.rechts;
        var gas = halten.hoch || pfeile.hoch, langsamer = halten.runter || pfeile.runter;
        var bremst = jetzt < S.bremsBis || halten.bremse || leerGehalten;
        var n = segIndex(S.pos), s = seg(n);
        // Tempo
        if (bremst) S.v = Math.max(0, S.v - 55 * dt);
        else if (p.tempoSelbst) {
          if (gas) S.v = Math.min(160, S.v + (S.v < 50 ? 22 : 13) * dt);
          else S.v = Math.max(0, S.v - 2.5 * dt);
          if (langsamer) S.v = Math.max(0, S.v - 28 * dt);
        } else {
          var ziel = S.limit;
          if (S.steht && !gas && jetzt - S.steht < 900) ziel = 0;
          if (S.sperre && S.sperre.gebremst) ziel = 0;
          S.v += (ziel - S.v) * Math.min(1, dt * (S.v < ziel ? 0.7 : 1.4));
        }
        if (S.v < 0.5) { S.v = 0; if (!S.steht) S.steht = jetzt; } else S.steht = 0;
        if (Math.abs(S.x) > 1.05) S.v = Math.max(10, S.v - 30 * dt);
        // Fahren
        var dz = S.v / 3.6 / METER_JE_SEG * SEG * dt;
        S.pos += dz;
        var lenk = (rechts ? 1 : 0) - (links ? 1 : 0);
        var fliehkraft = s.kurve * (S.v / 130) * (S.v / 130) * 0.2;
        S.x += lenk * dt * (0.55 + S.v / 160) - fliehkraft * dt;
        S.x = HT.klemmen(S.x, -2, 2);
        S.blink = lenk < 0 ? true : lenk > 0 ? false : null;
        landschaft(n + SICHT + 5);
        ereignisPlanen();
        verkehr(jetzt);
        var nNeu = segIndex(S.pos);
        // Schilder beim Passieren
        for (var j = n; j <= nNeu; j++) seg(j).objekte.forEach(function (o) {
          if (!o.ereignis || o.passiert) return; o.passiert = true;
          if (o.ereignis.art === 'limit') { S.limit = o.ereignis.wert; melde('Tempolimit ' + o.ereignis.wert + ' km/h', 'info', 1700); S.pruefung = jetzt + 6000; }
          if (o.ereignis.art === 'ortein') { if (p.schilder) { S.limit = 50; S.pruefung = jetzt + 6000; } melde('Ortschaft ' + o.ereignis.name + ' – innerorts 50', 'info', 1800); }
          if (o.ereignis.art === 'ortaus') { if (p.schilder) { S.limit = 70; S.pruefung = jetzt + 6000; } melde('Ortsende – jetzt 70 km/h', 'info', 1600); }
        });
        // Ampeln, Zebrastreifen, Bahnübergänge
        S.sperre = null;
        S.ereignisse.forEach(function (e) {
          var abst = e.seg - S.pos / SEG;
          if (e.art === 'ampel') {
            if (e.rotGeplant && e.zustand === 'gruen' && abst < 75 && abst > 20) { e.zustand = 'gelb'; e.wechsel = jetzt + 1500; }
            if (e.zustand === 'gelb' && jetzt > e.wechsel) { e.zustand = 'rot'; e.rotSeit = jetzt; }
            if (e.zustand === 'rot' && S.v === 0 && abst > -1 && abst < 14 && !e.gruenGeplant) { e.gruenGeplant = jetzt + HT.zufall.int(1800, 3200); }
            if (e.zustand === 'rot' && e.gruenGeplant && jetzt > e.gruenGeplant) { e.zustand = 'rotgelb'; e.wechsel = jetzt + 700; }
            if (e.zustand === 'rotgelb' && jetzt > e.wechsel) { e.zustand = 'gruen'; e.rotGeplant = false; e.gebremst = false; if (!p.tempoSelbst) S.steht = jetzt - 2000; }
            if (e.zustand === 'rot' || e.zustand === 'gelb' || e.zustand === 'rotgelb') { if (abst > -0.5 && abst < 70) S.sperre = e; }
            if (!e.geprueft && abst < 0) {
              e.geprueft = true;
              if (e.rotSeit) {
                var ok = !!e.gruenGeplant;
                ctx.onEvent({ korrekt: ok, reiz: 'rote Ampel', reaktion: ok ? 'gehalten' : 'über Rot gefahren', typ: 'ampel' });
                if (!ok) { ctx.feedback(false); melde('Rote Ampel überfahren!', 'schlecht', 1800); } else melde('Gut gewartet', 'gut', 900);
              }
            }
          } else if (e.art === 'zebra') {
            if (!e.person && e.mitPerson && abst < 85 && abst > 30) { e.person = { x: HT.zufall.chance(0.5) ? 1.7 : -1.7, wartet: jetzt + HT.zufall.int(400, 1600) }; e.person.richtung = e.person.x > 0 ? -1 : 1; }
            if (e.person) {
              if (jetzt > e.person.wartet && !e.person.fertig) { e.person.x += e.person.richtung * dt * 0.42; if (Math.abs(e.person.x) > 1.8 && Math.sign(e.person.x) === e.person.richtung) e.person.fertig = true; }
              if (!e.person.fertig && abst > -0.5 && abst < 60) S.sperre = e;
            }
            if (!e.geprueft && abst < 0) {
              e.geprueft = true;
              if (e.person) {
                var aufStrasse = !e.person.fertig && Math.abs(e.person.x) < 1.25;
                ctx.onEvent({ korrekt: !aufStrasse, reiz: 'Fußgänger am Zebrastreifen', reaktion: aufStrasse ? 'nicht gehalten' : 'gewartet', typ: 'zebra' });
                if (aufStrasse) { ctx.feedback(false); melde('Fußgänger hat Vorrang!', 'schlecht', 1800); } else melde('Gut – Fußgänger durchgelassen', 'gut', 1000);
              }
            }
          } else if (e.art === 'bahn') {
            e.zeit = jetzt;
            if (e.mitZug && !e.zu && !e.offen && abst < 110 && abst > 40) { e.zu = true; e.zugStart = jetzt + 2500; e.zugX = null; }
            if (e.zu && jetzt > e.zugStart) { if (e.zugX === null) e.zugX = -4; e.zugX += dt * 2.6; if (e.zugX > 6) { e.zu = false; e.offen = true; if (!p.tempoSelbst) S.steht = jetzt - 2000; } }
            if (e.zu && abst > -0.5 && abst < 80) S.sperre = e;
            if (!e.geprueft && abst < 0) {
              e.geprueft = true;
              if (e.mitZug) {
                var verstoss = e.zu;
                ctx.onEvent({ korrekt: !verstoss, reiz: 'Bahnübergang geschlossen', reaktion: verstoss ? 'durchgefahren' : 'gewartet', typ: 'bahn' });
                if (verstoss) { ctx.feedback(false); melde('Schranke war geschlossen!', 'schlecht', 1800); } else melde('Gut gewartet', 'gut', 900);
              }
            }
          }
        });
        S.ereignisse = S.ereignisse.filter(function (e) { return e.seg > S.pos / SEG - 5; });
        // automatisches Anhalten in den unteren Leveln nicht – Bremsen ist die Aufgabe
        if (!p.tempoSelbst && S.sperre && S.v === 0) S.steht = jetzt;
        // Bewegte Objekte
        S.dyn.forEach(function (o) {
          if (o.gegen) { o.z -= o.v / 3.6 / METER_JE_SEG * SEG * dt; o.seg = Math.floor(o.z / SEG); if (!o.geprueft && o.z < S.pos + SEG * 2) { o.geprueft = true; var zus = S.x < 0.05; ctx.onEvent({ korrekt: !zus, reiz: 'Gegenverkehr', reaktion: zus ? 'auf der Gegenspur' : 'rechts geblieben', typ: 'gegenverkehr' }); if (zus) { ctx.feedback(false); melde('Achtung Gegenverkehr – rechts fahren!', 'schlecht', 1800); } } }
          if (o.gefahr) {
            if (!o.erledigt) { var dif = o.ziel - o.x; o.x += Math.sign(dif) * Math.min(Math.abs(dif), o.tempo * dt); }
            if (!o.erledigt && o.seg - S.pos / SEG < 3) {
              o.erledigt = true; o.weg = true;
              var stand = S.v < 12;
              ctx.onEvent({ korrekt: stand, auslassung: !stand, reiz: o.typ, reaktion: stand ? 'rechtzeitig langsam' : 'nicht gebremst', typ: 'bremsen', seite: o.seite });
              if (!stand) { ctx.feedback(false); melde('Achtung! Nicht gebremst', 'schlecht', 1800); }
            }
            if (o.weg) o.x += (o.x < 0 ? -1 : 1) * dt * 2.2;
          }
        });
        S.dyn = S.dyn.filter(function (o) { return o.seg > S.pos / SEG - 3 && o.seg < S.pos / SEG + SICHT + 20 && Math.abs(o.x) < 9; });
        // Regelmäßige Prüfung
        if (jetzt > S.pruefung) {
          S.pruefung = jetzt + 5000;
          var spurOk = S.x > -0.05 && S.x < 1.05;
          ctx.onEvent({ korrekt: spurOk, reiz: 'spur', reaktion: spurOk ? 'rechte Spur' : (S.x < 0 ? 'Gegenspur' : 'von der Fahrbahn'), typ: 'spur', seite: S.x < 0.5 ? 'links' : 'rechts' });
          if (!spurOk) melde(S.x < 0 ? 'Bitte rechts fahren' : 'Zurück auf die Straße', 'warn', 1300);
          if (p.tempoSelbst && !S.sperre && !naheHaltestelle() && jetzt > S.bremsBis + 3000 && S.v > 0) {
            var okT = S.v <= S.limit + 7 && S.v >= S.limit - 15;
            ctx.onEvent({ korrekt: okT, reiz: 'tempo ' + S.limit, reaktion: Math.round(S.v) + ' km/h', typ: 'tempo' });
            if (!okT) melde(S.v > S.limit ? 'Zu schnell – erlaubt sind ' + S.limit : 'Etwas zügiger fahren (' + S.limit + ')', 'warn', 1500);
          }
        }
        if (S.v === 0 && !S.sperre && p.tempoSelbst && jetzt - S.steht > 1500 && jetzt > S.hinweisBis) melde('Weiterfahren mit ↑ (Gas)', 'info', 1500);
        if (jetzt > S.hinweisBis) banner.className = 'sv-banner';
        zeichnen(jetzt, bremst);
      }

      /* ----- Zeichnen ----- */
      var wolken = [0, 1, 2, 3, 4].map(function (i) { return { x: Math.random(), y: 0.05 + Math.random() * 0.18, s: 0.6 + Math.random() * 0.7 }; });
      function zeichnen(jetzt, bremst) {
        var basisIdx = segIndex(S.pos), basis = seg(basisIdx), prozent = (S.pos % SEG) / SEG;
        var spielerY = basis.p1.y + (basis.p2.y - basis.p1.y) * prozent;
        var kamY = spielerY + KAMERA_H, kamX = S.x * STRASSE;
        S.letzteKurve += basis.kurve * S.v * 0.00002;
        var horizont = H * 0.5;
        // Himmel
        var hg = g.createLinearGradient(0, 0, 0, horizont); hg.addColorStop(0, '#7ec4ea'); hg.addColorStop(1, '#d6ecf5');
        g.fillStyle = hg; g.fillRect(0, 0, W, H);
        g.fillStyle = 'rgba(255,244,200,.9)'; g.beginPath(); g.arc(W * 0.82 - S.letzteKurve * W * 0.4 % W, H * 0.12, Math.max(16, W * 0.025), 0, Math.PI * 2); g.fill();
        wolken.forEach(function (w) {
          var x = ((w.x - S.letzteKurve * 0.6) % 1 + 1) % 1 * (W + 200) - 100, y = w.y * H, r = W * 0.03 * w.s;
          g.fillStyle = 'rgba(255,255,255,.88)'; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.arc(x + r, y - r * 0.4, r * 1.2, 0, Math.PI * 2); g.arc(x + r * 2.2, y, r * 0.9, 0, Math.PI * 2); g.fill();
        });
        function berge(farbe, hoehe, frequenz, verschiebung) {
          g.fillStyle = farbe; g.beginPath(); g.moveTo(0, horizont + 4);
          for (var x = 0; x <= W; x += 16) { var u = x / W + verschiebung; g.lineTo(x, horizont + 4 - hoehe * (0.5 + 0.3 * Math.sin(u * frequenz) + 0.2 * Math.sin(u * frequenz * 2.7 + 1))); }
          g.lineTo(W, horizont + 4); g.closePath(); g.fill();
        }
        berge('#a9c9d6', H * 0.12, 9, -S.letzteKurve * 0.3);
        berge('#9cc49a', H * 0.07, 14, -S.letzteKurve * 0.7);
        g.fillStyle = rgb(FARBE.grasHell); g.fillRect(0, horizont + 3, W, H - horizont);

        // Straße von nah nach fern projizieren
        var x = 0, dx = -(basis.kurve * prozent), maxY = H, liste = [];
        for (var k = 0; k < SICHT; k++) {
          var s = seg(basisIdx + k);
            projizieren(s.p1, s.i * SEG, x, kamX, kamY);
          projizieren(s.p2, (s.i + 1) * SEG, x + dx, kamX, kamY);
          x += dx; dx += s.kurve;
          s.nebel = Math.pow(k / SICHT, 1.6);
          s.clip = maxY;
          liste.push(s);
          if (s.p1.s.z <= KAMERA_TIEFE || s.p2.s.y >= s.p1.s.y || s.p2.s.y >= maxY) continue;
          segmentZeichnen(s);
          maxY = s.p2.s.y;
        }
        // Objekte von fern nach nah
        for (var r = liste.length - 1; r > 0; r--) {
          var sg = liste[r];
          if (sg.p1.s.z <= KAMERA_TIEFE || r < 3) continue;
          var kpx = sg.p1.s.w / STRASSE;
          if (kpx * M * 4 > H * 1.6) continue;
          sg.objekte.forEach(function (o) {
            var sx = sg.p1.s.x + o.x * sg.p1.s.w, sy = sg.p1.s.y;
            if (sy > sg.clip + 2 || sx < -W || sx > 2 * W) return;
            var opt = o;
            if (o.typ === 'ampel') opt = { zustand: o.ampel.zustand };
            if (o.typ === 'andreas') opt = { zu: o.bahn.zu, zeit: jetzt };
            g.globalAlpha = 1 - sg.nebel * 0.6;
            OBJ[o.typ](g, sx, sy, kpx, opt);
            g.globalAlpha = 1;
          });
          // Zug am Bahnübergang
          S.ereignisse.forEach(function (e) {
            if (e.art === 'bahn' && e.seg === sg.i && e.zugX !== null && e.zu) zug(g, sg.p1.s.x + e.zugX * sg.p1.s.w - 22 * M * kpx, sg.p1.s.y, kpx, 22 * M * kpx);
            if (e.art === 'zebra' && e.seg === sg.i && e.person) figur(g, 'fussgaenger', sg.p1.s.x + e.person.x * sg.p1.s.w, sg.p1.s.y, kpx, jetzt, '#E8833A');
          });
          S.dyn.forEach(function (o) {
            if (o.seg !== sg.i) return;
            var ox = sg.p1.s.x + o.x * sg.p1.s.w, oy = sg.p1.s.y;
            g.globalAlpha = 1 - sg.nebel * 0.5;
            if (o.typ === 'auto') autoFront(g, ox, oy, kpx, o.farbe);
            else if (o.typ === 'vogel') OBJ.vogel(g, ox, oy, kpx, { zeit: jetzt });
            else figur(g, o.typ, ox, oy, kpx, jetzt, o.farbe);
            if (o.gefahr && !o.erledigt && Math.floor(jetzt / 220) % 2) { g.strokeStyle = 'rgba(255,59,48,.85)'; g.lineWidth = 3; g.beginPath(); g.arc(ox, oy - M * kpx * 0.8, M * kpx * 1.3, 0, Math.PI * 2); g.stroke(); }
            g.globalAlpha = 1;
          });
        }
        // eigenes Auto
        var autoB = Math.min(W * 0.26, 300), lenk = (halten.links || pfeile.links ? -1 : 0) + (halten.rechts || pfeile.rechts ? 1 : 0);
        var holper = Math.abs(S.x) > 1.05 ? Math.sin(jetzt / 25) * 3 : Math.sin(jetzt / 90) * (S.v > 1 ? 0.6 : 0);
        eigenesAuto(g, W / 2 + lenk * 4, H - 14 + holper, autoB, lenk * 0.025, bremst || S.v === 0, S.blink !== null && Math.floor(jetzt / 350) % 2 ? S.blink : null);
        // Tacho + aktuelles Limit
        var rr = Math.max(50, Math.min(82, Math.min(W, H) * 0.12));
        var schmal = W < 640, ty = H - rr - 18 - (schmal ? 78 : 0);
        tacho(g, W - rr - (schmal ? 12 : 20), ty, rr, S.v, p.tempoSelbst ? S.limit : 0);
        if (p.schilder) OBJ.limit(g, W - 2 * rr - (schmal ? 40 : 62), ty + rr - 2, rr * 1.7 / (M * 2.6), { wert: S.limit });
        if (S.sperre && S.v > 3) {
          var txt = S.sperre.art === 'ampel' ? '● ROTE AMPEL – anhalten' : S.sperre.art === 'zebra' ? '🚶 FUSSGÄNGER – anhalten' : '⚠ SCHRANKE ZU – anhalten';
          var fs = Math.round(Math.max(15, Math.min(26, W * 0.022)));
          g.font = '800 ' + fs + 'px -apple-system, Helvetica, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
          var tw = g.measureText(txt).width + fs * 1.6, ty2 = H * 0.2;
          g.fillStyle = Math.floor(jetzt / 300) % 2 ? 'rgba(214,40,40,.95)' : 'rgba(180,25,25,.95)';
          g.beginPath(); if (g.roundRect) g.roundRect(W / 2 - tw / 2, ty2 - fs, tw, fs * 2, fs); else g.rect(W / 2 - tw / 2, ty2 - fs, tw, fs * 2); g.fill();
          g.fillStyle = '#fff'; g.fillText(txt, W / 2, ty2 + 1);
        }
      }
      function projizieren(pkt, z, x, kamX, kamY) {
        var tz = z - S.pos, sc = KAMERA_TIEFE / Math.max(1, tz);
        pkt.s.z = tz;
        pkt.s.x = Math.round(W / 2 + sc * (x - kamX) * W / 2);
        pkt.s.y = Math.round(H / 2 - sc * (pkt.y - kamY) * H / 2);
        pkt.s.w = Math.round(sc * STRASSE * W / 2);
      }
      function vieleck(x1, y1, x2, y2, x3, y3, x4, y4, farbe) { g.fillStyle = farbe; g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.lineTo(x3, y3); g.lineTo(x4, y4); g.closePath(); g.fill(); }
      function segmentZeichnen(s) {
        var a = s.p1.s, b = s.p2.s, hell = Math.floor(s.i / BAND) % 2 === 0, nb = s.nebel;
        var gras = mischen(s.ort ? (hell ? FARBE.ortHell : FARBE.ortDunkel) : (hell ? FARBE.grasHell : FARBE.grasDunkel), DUNST, nb);
        g.fillStyle = rgb(gras); g.fillRect(0, b.y, W, a.y - b.y + 1);
        var r1 = a.w * 1.12, r2 = b.w * 1.12;
        vieleck(a.x - r1, a.y, a.x + r1, a.y, b.x + r2, b.y, b.x - r2, b.y, rgb(mischen(s.ort ? [200, 200, 196] : FARBE.bankett, DUNST, nb)));
        vieleck(a.x - a.w, a.y, a.x + a.w, a.y, b.x + b.w, b.y, b.x - b.w, b.y, rgb(mischen(hell ? FARBE.strasseHell : FARBE.strasseDunkel, DUNST, nb)));
        var linie = rgb(mischen(FARBE.linie, DUNST, nb));
        var l1 = a.w * 0.035, l2 = b.w * 0.035;
        vieleck(a.x - a.w * 0.97, a.y, a.x - a.w * 0.97 + l1, a.y, b.x - b.w * 0.97 + l2, b.y, b.x - b.w * 0.97, b.y, linie);
        vieleck(a.x + a.w * 0.97 - l1, a.y, a.x + a.w * 0.97, a.y, b.x + b.w * 0.97, b.y, b.x + b.w * 0.97 - l2, b.y, linie);
        if (Math.floor(s.i / 2) % 3 !== 0) vieleck(a.x - l1 / 2, a.y, a.x + l1 / 2, a.y, b.x + l2 / 2, b.y, b.x - l2 / 2, b.y, linie);
        if (s.zebra) for (var z = -0.9; z < 0.9; z += 0.24) vieleck(a.x + a.w * z, a.y, a.x + a.w * (z + 0.13), a.y, b.x + b.w * (z + 0.13), b.y, b.x + b.w * z, b.y, linie);
        if (s.stoplinie) vieleck(a.x, a.y, a.x + a.w * 0.95, a.y, b.x + b.w * 0.95, b.y, b.x, b.y, linie);
        if (s.gleis) { var dunkel = rgb(mischen([70, 62, 56], DUNST, nb)); vieleck(a.x - a.w * 1.3, a.y, a.x + a.w * 1.3, a.y, b.x + b.w * 1.3, b.y, b.x - b.w * 1.3, b.y, dunkel); vieleck(a.x - a.w * 1.3, a.y - (a.y - b.y) * 0.35, a.x + a.w * 1.3, a.y - (a.y - b.y) * 0.35, b.x + b.w * 1.3, b.y + (a.y - b.y) * 0.45, b.x - b.w * 1.3, b.y + (a.y - b.y) * 0.45, '#c9ced2'); }
      }

      var frame = null;
      return {
        start: function () {
          aus.push(HT.eingabe.an(function (a) {
            if (a === 'ok' && !leerGehalten) bremsDruck();
            else if (a === 'links' || a === 'rechts') { halten[a] = true; setTimeout(function () { halten[a] = false; }, 240); }
            else if (a === 'hoch' || a === 'runter') { halten[a] = true; setTimeout(function () { halten[a] = false; }, 320); }
          }));
          melde(p.tempoSelbst ? 'Losfahren mit ↑ – rechts fahren, auf Schilder achten' : 'Gute Fahrt – rechts fahren und aufmerksam bleiben', 'info', 2600);
          frame = Z.frame(function (dt, jetzt) { schritt(Math.min(dt, 0.05), jetzt); });
        },
        stop: function () {
          aus.forEach(function (f) { f(); }); if (frame) Z.abbrechen(frame); pfeile.entfernen();
          document.removeEventListener('keydown', tasteRunter, true); document.removeEventListener('keyup', tasteHoch, true);
        }
      };
    },

    preview: function (el) {
      function bild(o) {
        var s = '<svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="svh" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7ec4ea"/><stop offset="1" stop-color="#d6ecf5"/></linearGradient></defs>' +
          '<rect width="400" height="150" fill="url(#svh)"/><path d="M0 150 Q60 112 120 132 T240 124 T400 136 V150 Z" fill="#a9c9d6"/><path d="M0 152 Q90 132 170 146 T400 144 V152 Z" fill="#9cc49a"/><rect y="150" width="400" height="150" fill="#86c468"/>' +
          '<path d="M190 150 L210 150 L370 300 L30 300 Z" fill="#70767c"/><path d="M196 150 h2 l-26 150 h-6 z" fill="#f4f6f7"/><path d="M203 150 h1 l60 150 h-8z" fill="#f4f6f7"/><path d="M199 160 l1 0 l2 14 l-4 0z M196 200 l3 0 l2 22 l-6 0z M190 252 l5 0 l2 30 l-9 0z" fill="#f4f6f7"/>' +
          '<circle cx="80" cy="132" r="18" fill="#3f9450"/><rect x="77" y="140" width="6" height="14" fill="#6e4c2e"/><circle cx="330" cy="128" r="22" fill="#368a49"/><rect x="327" y="140" width="6" height="16" fill="#6e4c2e"/>';
        if (o.ampel) s += '<rect x="262" y="118" width="4" height="40" fill="#5f6a72"/><rect x="256" y="96" width="16" height="34" rx="3" fill="#1e2a33"/><circle cx="264" cy="104" r="5" fill="' + (o.ampel === 'rot' ? '#ff3b30' : '#3a444b') + '"/><circle cx="264" cy="114" r="5" fill="#3a444b"/><circle cx="264" cy="124" r="5" fill="' + (o.ampel === 'gruen' ? '#30d158' : '#3a444b') + '"/><rect x="200" y="164" width="34" height="3" fill="#fff"/>';
        if (o.schild) s += '<rect x="292" y="128" width="3" height="30" fill="#9aa5ad"/><circle cx="293" cy="120" r="13" fill="#fff" stroke="#d63b3b" stroke-width="4"/><text x="293" y="125" text-anchor="middle" font-size="12" font-weight="800" font-family="-apple-system,sans-serif">' + o.schild + '</text>';
        if (o.ball) s += '<circle cx="' + o.ball + '" cy="196" r="9" fill="#E25C5C"/>';
        s += '<g transform="translate(' + (220 + (o.lenk || 0)) + ',292)"><ellipse cx="0" cy="0" rx="62" ry="8" fill="rgba(0,0,0,.25)"/><path d="M-56 -8 L-56 -34 Q-55 -42 -45 -42 L45 -42 Q55 -42 56 -34 L56 -8 Z" fill="#1aa5b6"/><path d="M-40 -42 L-31 -64 L31 -64 L40 -42 Z" fill="#24c0cc"/><path d="M-34 -45 L-27 -61 L27 -61 L34 -45 Z" fill="#a8c8d6"/><rect x="-52" y="-31" width="18" height="8" fill="' + (o.bremse ? '#ff2a2a' : '#a32020') + '"/><rect x="34" y="-31" width="18" height="8" fill="' + (o.bremse ? '#ff2a2a' : '#a32020') + '"/><rect x="-14" y="-22" width="28" height="8" fill="#f4f6f8"/></g>' +
          '<circle cx="355" cy="252" r="36" fill="#1b2125"/><path d="M355 252 L' + (o.bremse ? 334 : 374) + ' ' + (o.bremse ? 268 : 236) + '" stroke="#ff9f0a" stroke-width="3.5" stroke-linecap="round"/><text x="355" y="278" text-anchor="middle" font-size="12" font-weight="800" fill="#fff" font-family="-apple-system,sans-serif">' + (o.bremse ? 0 : 50) + '</text></svg>';
        return s;
      }
      return HT.beispiel(el, [
        { svg: bild({ schild: 50 }), text: 'Rechts fahren, Tempo 50', dauer: 1700 },
        { svg: bild({ ampel: 'rot' }), text: 'Rote Ampel …', dauer: 1200 },
        { svg: bild({ ampel: 'rot', bremse: true }), zeiger: [50, 88], klick: true, text: 'Bremsen und warten', dauer: 1500 },
        { svg: bild({ ampel: 'gruen' }), text: 'Grün – weiterfahren mit ↑', dauer: 1400 },
        { svg: bild({ ball: 160 }), text: 'Ball auf der Straße!', dauer: 1000 },
        { svg: bild({ ball: 175, bremse: true }), zeiger: [50, 88], klick: true, text: 'Sofort bremsen (Leertaste)', dauer: 1500 }
      ]);
    }
  });
})();

/* Hirntraining – eigene Canvas-Diagramme (ohne Bibliotheken)
 * HT.charts.linie(wurzel, opt) · HT.charts.balken(wurzel, opt)
 * Beide zeichnen HiDPI-scharf, passen sich der Breite an und zeigen Tooltips beim Überfahren. */
(function () {
  'use strict';
  var HT = window.HT;

  function farbe(name, ersatz) {
    var v = getComputedStyle(document.documentElement).getPropertyValue(name);
    return (v && v.trim()) || ersatz;
  }
  function thema() {
    return {
      text: farbe('--text-2', '#51606b'), text3: farbe('--text-3', '#8a97a1'), linie: farbe('--linie', '#e1e8ed'),
      akzent: farbe('--akzent', '#1BA8B5'), karte: farbe('--karte', '#fff')
    };
  }

  function aufbauen(wurzel, hoehe) {
    HT.leeren(wurzel);
    wurzel.classList.add('diagramm');
    var c = HT.el('canvas');
    var tip = HT.el('div', { class: 'diagramm-tooltip' });
    wurzel.appendChild(c); wurzel.appendChild(tip);
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var breite = Math.max(260, wurzel.clientWidth || 600);
    c.width = breite * dpr; c.height = hoehe * dpr;
    c.style.height = hoehe + 'px';
    var ctx = c.getContext('2d');
    ctx.scale(dpr, dpr);
    return { c: c, ctx: ctx, tip: tip, b: breite, h: hoehe };
  }

  function rundeRechteck(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, Math.abs(h) / 2);
    ctx.beginPath();
    ctx.moveTo(x, y + h); ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r); ctx.lineTo(x + w, y + h);
    ctx.closePath();
  }

  function schoeneSkala(min, max, n) {
    if (min === max) { max = min + 1; }
    var spanne = max - min, roh = spanne / n;
    var mag = Math.pow(10, Math.floor(Math.log(roh) / Math.LN10));
    var norm = roh / mag;
    var schritt = (norm < 1.5 ? 1 : norm < 3 ? 2 : norm < 7 ? 5 : 10) * mag;
    var a = Math.floor(min / schritt) * schritt, e = Math.ceil(max / schritt) * schritt;
    var t = [];
    for (var v = a; v <= e + schritt / 2; v += schritt) t.push(Math.round(v * 1000) / 1000);
    return t;
  }

  /* Liniendiagramm
   * opt: { punkte: [{x: Zeitstempel|Index, y, info}], yMin, yMax, yFormat(v), xFormat(x), farbe, hoehe, treppe, flaeche } */
  function linie(wurzel, opt) {
    var T = thema();
    var D = aufbauen(wurzel, opt.hoehe || 220);
    var ctx = D.ctx, punkte = (opt.punkte || []).filter(function (p) { return p.y !== null && p.y !== undefined && !isNaN(p.y); });
    var rand = { l: 46, r: 16, o: 14, u: 28 };
    var pb = D.b - rand.l - rand.r, ph = D.h - rand.o - rand.u;
    var fmtY = opt.yFormat || function (v) { return String(v); };
    var fmtX = opt.xFormat || function (x) { return HT.datum(x).slice(0, 6); };
    if (!punkte.length) {
      ctx.fillStyle = T.text3; ctx.font = '14px ' + farbe('--schrift', 'sans-serif'); ctx.textAlign = 'center';
      ctx.fillText('Keine Daten im gewählten Zeitraum', D.b / 2, D.h / 2);
      return D;
    }
    var ys = punkte.map(function (p) { return p.y; });
    var yMin = opt.yMin !== undefined ? opt.yMin : Math.min.apply(null, ys);
    var yMax = opt.yMax !== undefined ? opt.yMax : Math.max.apply(null, ys);
    var ticks = schoeneSkala(yMin, yMax, 4);
    if (opt.yMin !== undefined) ticks = ticks.filter(function (t) { return t >= opt.yMin; });
    if (opt.yMin === undefined) yMin = Math.min(yMin, ticks[0]);
    yMax = Math.max(yMax, ticks[ticks.length - 1]);
    var xs = punkte.map(function (p) { return p.x; });
    var xMin = Math.min.apply(null, xs), xMax = Math.max.apply(null, xs);
    var xPos = function (x) { return rand.l + (xMax === xMin ? pb / 2 : (x - xMin) / (xMax - xMin) * pb); };
    var yPos = function (y) { return rand.o + ph - (y - yMin) / (yMax - yMin || 1) * ph; };
    var schrift = '12px ' + farbe('--schrift', 'sans-serif');

    // Raster und Achsen
    ctx.font = schrift; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    ticks.forEach(function (t) {
      var y = yPos(t);
      ctx.strokeStyle = T.linie; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(rand.l, Math.round(y) + .5); ctx.lineTo(D.b - rand.r, Math.round(y) + .5); ctx.stroke();
      ctx.fillStyle = T.text3; ctx.fillText(fmtY(t), rand.l - 8, y);
    });
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    var anzX = Math.min(punkte.length, Math.max(2, Math.floor(pb / 90)));
    var gezeigt = {};
    for (var i = 0; i < anzX; i++) {
      var idx = Math.round(i * (punkte.length - 1) / Math.max(1, anzX - 1));
      if (gezeigt[idx]) continue; gezeigt[idx] = true;
      ctx.fillStyle = T.text3; ctx.fillText(fmtX(punkte[idx].x), xPos(punkte[idx].x), D.h - rand.u + 8);
    }

    var f = opt.farbe || T.akzent;
    // Fläche
    if (opt.flaeche !== false) {
      var grad = ctx.createLinearGradient(0, rand.o, 0, rand.o + ph);
      grad.addColorStop(0, hexAlpha(f, .22)); grad.addColorStop(1, hexAlpha(f, 0));
      ctx.fillStyle = grad; ctx.beginPath();
      ctx.moveTo(xPos(punkte[0].x), yPos(yMin));
      pfad(ctx, punkte, xPos, yPos, opt.treppe, true);
      ctx.lineTo(xPos(punkte[punkte.length - 1].x), yPos(yMin)); ctx.closePath(); ctx.fill();
    }
    // Linie
    ctx.strokeStyle = f; ctx.lineWidth = 2; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.beginPath(); pfad(ctx, punkte, xPos, yPos, opt.treppe, false); ctx.stroke();
    // Punkte mit Ring in Kartenfarbe
    if (punkte.length <= 60) punkte.forEach(function (p) {
      ctx.beginPath(); ctx.arc(xPos(p.x), yPos(p.y), 4.5, 0, Math.PI * 2);
      ctx.fillStyle = f; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = T.karte; ctx.stroke();
    });
    // Letzten Wert direkt beschriften
    var letzter = punkte[punkte.length - 1];
    ctx.font = 'bold 12px ' + farbe('--schrift', 'sans-serif'); ctx.fillStyle = T.text; ctx.textAlign = 'right'; ctx.textBaseline = 'bottom';
    ctx.fillText(fmtY(letzter.y), Math.min(D.b - rand.r, xPos(letzter.x) + 4), yPos(letzter.y) - 8);

    // Tooltip mit Fadenkreuz
    var basis = null;
    D.c.addEventListener('mousemove', function (ev) {
      var r = D.c.getBoundingClientRect(), mx = ev.clientX - r.left;
      var best = null, bd = 1e9;
      punkte.forEach(function (p) { var d = Math.abs(xPos(p.x) - mx); if (d < bd) { bd = d; best = p; } });
      if (!best || bd > 40) { D.tip.style.opacity = 0; return; }
      if (!basis) basis = ctx.getImageData(0, 0, D.c.width, D.c.height);
      ctx.putImageData(basis, 0, 0);
      var x = xPos(best.x), y = yPos(best.y);
      ctx.strokeStyle = T.text3; ctx.lineWidth = 1; ctx.setLineDash([3, 3]);
      ctx.beginPath(); ctx.moveTo(Math.round(x) + .5, rand.o); ctx.lineTo(Math.round(x) + .5, rand.o + ph); ctx.stroke(); ctx.setLineDash([]);
      ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI * 2); ctx.fillStyle = f; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = T.karte; ctx.stroke();
      D.tip.innerHTML = '<b>' + HT.esc(fmtY(best.y)) + '</b><br>' + HT.esc(best.info || fmtX(best.x));
      D.tip.style.left = x + 'px'; D.tip.style.top = y + 'px'; D.tip.style.opacity = 1;
    });
    D.c.addEventListener('mouseleave', function () { D.tip.style.opacity = 0; if (basis) ctx.putImageData(basis, 0, 0); });
    return D;
  }

  function pfad(ctx, punkte, xPos, yPos, treppe, weiter) {
    punkte.forEach(function (p, i) {
      var x = xPos(p.x), y = yPos(p.y);
      if (i === 0) { if (weiter) ctx.lineTo(x, y); else ctx.moveTo(x, y); }
      else if (treppe) { ctx.lineTo(x, yPos(punkte[i - 1].y)); ctx.lineTo(x, y); }
      else ctx.lineTo(x, y);
    });
  }

  function hexAlpha(hex, a) {
    var m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(String(hex).trim());
    if (!m) return 'rgba(27,168,181,' + a + ')';
    return 'rgba(' + parseInt(m[1], 16) + ',' + parseInt(m[2], 16) + ',' + parseInt(m[3], 16) + ',' + a + ')';
  }

  /* Balkendiagramm
   * opt: { kategorien: ['…'], serien: [{ name, farbe, werte: [] }], gestapelt, yFormat, hoehe, legende } */
  function balken(wurzel, opt) {
    var T = thema();
    var hoehe = opt.hoehe || 220;
    var D = aufbauen(wurzel, hoehe);
    var ctx = D.ctx, kat = opt.kategorien || [], ser = opt.serien || [];
    var rand = { l: 46, r: 12, o: 14, u: 30 };
    var pb = D.b - rand.l - rand.r, ph = D.h - rand.o - rand.u;
    var fmtY = opt.yFormat || function (v) { return String(Math.round(v * 10) / 10).replace('.', ','); };
    var schrift = '12px ' + farbe('--schrift', 'sans-serif');
    if (!kat.length) {
      ctx.fillStyle = T.text3; ctx.font = '14px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('Keine Daten im gewählten Zeitraum', D.b / 2, D.h / 2); return D;
    }
    var max = 0;
    kat.forEach(function (k, i) {
      if (opt.gestapelt) max = Math.max(max, HT.summe(ser.map(function (s) { return s.werte[i] || 0; })));
      else ser.forEach(function (s) { max = Math.max(max, s.werte[i] || 0); });
    });
    if (opt.yMax) max = Math.max(max, opt.yMax);
    var ticks = schoeneSkala(0, max || 1, 4);
    var yMax = ticks[ticks.length - 1];
    var yPos = function (v) { return rand.o + ph - v / yMax * ph; };
    ctx.font = schrift; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    ticks.forEach(function (t) {
      var y = Math.round(yPos(t)) + .5;
      ctx.strokeStyle = T.linie; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(rand.l, y); ctx.lineTo(D.b - rand.r, y); ctx.stroke();
      ctx.fillStyle = T.text3; ctx.fillText(fmtY(t), rand.l - 8, y);
    });
    var gruppe = pb / kat.length;
    var innen = Math.min(gruppe * 0.72, opt.gestapelt ? 46 : 28 * ser.length + 2 * (ser.length - 1));
    var bb = opt.gestapelt ? innen : (innen - 2 * (ser.length - 1)) / ser.length;
    var treffer = [];
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    kat.forEach(function (k, i) {
      var gx = rand.l + i * gruppe + (gruppe - innen) / 2;
      var basisY = yPos(0);
      ser.forEach(function (s, j) {
        var v = s.werte[i] || 0;
        if (v <= 0) return;
        var x = opt.gestapelt ? gx : gx + j * (bb + 2);
        var y = yPos(v);
        var hoehePx = basisY - y;
        if (opt.gestapelt) { y = basisY - hoehePx; }
        ctx.fillStyle = s.farbe;
        var oben = !opt.gestapelt || j === ser.length - 1 || ser.slice(j + 1).every(function (x2) { return !(x2.werte[i] > 0); });
        if (oben) { rundeRechteck(ctx, x, y, bb, hoehePx, 4); ctx.fill(); }
        else ctx.fillRect(x, y, bb, hoehePx);
        treffer.push({ x: x, y: y, w: bb, h: hoehePx, info: '<b>' + HT.esc(s.name) + ': ' + HT.esc(fmtY(v)) + '</b><br>' + HT.esc(k) });
        if (opt.gestapelt) basisY = y - 2;
      });
      ctx.fillStyle = T.text3;
      var label = String(k);
      var maxZeichen = Math.max(4, Math.floor(gruppe / 7));
      if (label.length > maxZeichen) label = label.slice(0, maxZeichen - 1) + '…';
      ctx.fillText(label, rand.l + i * gruppe + gruppe / 2, D.h - rand.u + 8);
    });
    D.c.addEventListener('mousemove', function (ev) {
      var r = D.c.getBoundingClientRect(), mx = ev.clientX - r.left, my = ev.clientY - r.top;
      var t = treffer.filter(function (b) { return mx >= b.x - 4 && mx <= b.x + b.w + 4 && my >= b.y - 8 && my <= b.y + b.h + 4; })[0];
      if (!t) { D.tip.style.opacity = 0; return; }
      D.tip.innerHTML = t.info; D.tip.style.left = (t.x + t.w / 2) + 'px'; D.tip.style.top = t.y + 'px'; D.tip.style.opacity = 1;
    });
    D.c.addEventListener('mouseleave', function () { D.tip.style.opacity = 0; });
    if (ser.length > 1 && opt.legende !== false) {
      var leg = HT.el('div', { class: 'diagramm-legende' });
      ser.forEach(function (s) { leg.appendChild(HT.el('span', { html: '<i style="background:' + s.farbe + '"></i>' + HT.esc(s.name) })); });
      wurzel.appendChild(leg);
    }
    return D;
  }

  /* Diagramm als Bild (für Berichte) */
  function alsBild(wurzel) { var c = wurzel.querySelector('canvas'); return c ? c.toDataURL('image/png') : ''; }

  /* Feste, gut unterscheidbare Farben für Serien (Reihenfolge nie zyklisch neu vergeben) */
  var SERIE = { treffer: '#2EAD6B', fehler: '#E25C5C', auslassungen: '#E0A21B', links: '#1BA8B5', rechts: '#7B61D9', a: '#1BA8B5', b: '#7B61D9' };

  HT.charts = { linie: linie, balken: balken, alsBild: alsBild, farben: SERIE };
})();

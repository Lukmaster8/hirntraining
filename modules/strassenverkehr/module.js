/* Modul: Straßenverkehr – geteilte und selektive Aufmerksamkeit in einer einfachen Fahrsimulation.
 * Mit dem Auto auf der Straße bleiben (lenken), die erlaubte Geschwindigkeit nach den Schildern einhalten
 * (Tacho unten rechts) und bei Gefahren auf der Fahrbahn sofort bremsen. In hohen Leveln gibt es harmlose
 * Ablenker am Straßenrand, auf die nicht gebremst werden darf (selektive Aufmerksamkeit).
 * Eigene Umsetzung mit eigener Grafik. */
(function () {
  'use strict';
  var HT = window.HT;
  var levels = HT.stufen(14, function (t, i) {
    return {
      kurven: i <= 1 ? 0 : HT.lerp(0.25, 1, (i - 2) / 12),
      tempoSelbst: i >= 4,
      schilder: i >= 4,
      gefahrAbstandSek: HT.lerpInt(14, 6, t),
      ablenker: i >= 8 ? HT.lerp(0.3, 0.6, (i - 8) / 6) : 0,
      grundtempo: HT.lerpInt(40, 80, t),
      reaktionsfenster: HT.lerp(1, 0.6, t)
    };
  });

  var LIMITS = [30, 50, 70, 100];
  var GEFAHREN = ['ball', 'fussgaenger', 'reh', 'radfahrer'];
  var ABLENKER = ['vogel', 'baum', 'wartender', 'blumen'];

  function zeichneObjekt(g, typ, x, y, s, phase) {
    g.save(); g.translate(x, y); g.scale(s, s);
    if (typ === 'ball') {
      g.fillStyle = '#E25C5C'; g.beginPath(); g.arc(0, -14, 14, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#fff'; g.beginPath(); g.arc(0, -14, 14, -0.6 + phase, 0.6 + phase); g.lineTo(0, -14); g.fill();
    } else if (typ === 'fussgaenger' || typ === 'wartender') {
      var b = typ === 'fussgaenger' ? Math.sin(phase * 6) * 8 : 0;
      g.strokeStyle = '#26333c'; g.lineWidth = 5; g.lineCap = 'round';
      g.beginPath(); g.moveTo(0, -30); g.lineTo(-b - 4, 0); g.moveTo(0, -30); g.lineTo(b + 4, 0); g.stroke();
      g.fillStyle = typ === 'fussgaenger' ? '#3D7BE0' : '#8a97a1'; g.fillRect(-9, -62, 18, 34);
      g.fillStyle = '#f2c9a0'; g.beginPath(); g.arc(0, -72, 10, 0, Math.PI * 2); g.fill();
    } else if (typ === 'reh') {
      g.fillStyle = '#a8703c'; g.beginPath(); g.ellipse(0, -34, 26, 13, 0, 0, Math.PI * 2); g.fill();
      g.fillRect(-20, -26, 5, 26); g.fillRect(14, -26, 5, 26);
      g.beginPath(); g.ellipse(26, -52, 8, 12, 0.4, 0, Math.PI * 2); g.fill();
      g.strokeStyle = '#6b4320'; g.lineWidth = 3; g.beginPath(); g.moveTo(26, -62); g.lineTo(22, -76); g.moveTo(28, -62); g.lineTo(34, -76); g.stroke();
    } else if (typ === 'radfahrer') {
      g.strokeStyle = '#26333c'; g.lineWidth = 4;
      g.beginPath(); g.arc(-18, -12, 12, 0, Math.PI * 2); g.arc(18, -12, 12, 0, Math.PI * 2); g.stroke();
      g.beginPath(); g.moveTo(-18, -12); g.lineTo(0, -30); g.lineTo(18, -12); g.stroke();
      g.fillStyle = '#2EAD6B'; g.fillRect(-6, -58, 14, 28);
      g.fillStyle = '#f2c9a0'; g.beginPath(); g.arc(2, -66, 9, 0, Math.PI * 2); g.fill();
    } else if (typ === 'vogel') {
      g.strokeStyle = '#26333c'; g.lineWidth = 4; var f = Math.sin(phase * 10) * 8;
      g.beginPath(); g.moveTo(-18, -90 + f); g.quadraticCurveTo(-8, -96, 0, -88); g.quadraticCurveTo(8, -96, 18, -90 + f); g.stroke();
    } else if (typ === 'baum') {
      g.fillStyle = '#7a5532'; g.fillRect(-6, -40, 12, 40);
      g.fillStyle = '#3f9a55'; g.beginPath(); g.arc(0, -62, 30, 0, Math.PI * 2); g.fill();
    } else if (typ === 'blumen') {
      ['#E25C5C', '#F2C230', '#9b6bd6'].forEach(function (c, k) { g.fillStyle = c; g.beginPath(); g.arc(-14 + k * 14, -10 - (k % 2) * 6, 7, 0, Math.PI * 2); g.fill(); });
    } else if (typ === 'schild') {
      g.fillStyle = '#9aa5ad'; g.fillRect(-3, -60, 6, 60);
      g.fillStyle = '#fff'; g.beginPath(); g.arc(0, -84, 26, 0, Math.PI * 2); g.fill();
      g.strokeStyle = '#d63b3b'; g.lineWidth = 7; g.stroke();
      g.fillStyle = '#1e2a33'; g.font = '800 22px -apple-system, Helvetica, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(String(phase), 0, -83);
    }
    g.restore();
  }

  function zeichneAuto(g, x, y, s, neigung) {
    g.save(); g.translate(x, y); g.scale(s, s); g.rotate(neigung);
    g.fillStyle = 'rgba(0,0,0,.18)'; g.beginPath(); g.ellipse(0, 6, 70, 14, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#1590A8';
    g.beginPath(); g.moveTo(-64, 0); g.lineTo(-60, -34); g.quadraticCurveTo(-56, -44, -44, -46); g.lineTo(44, -46); g.quadraticCurveTo(56, -44, 60, -34); g.lineTo(64, 0); g.closePath(); g.fill();
    g.fillStyle = '#22B8C4'; g.beginPath(); g.moveTo(-40, -46); g.lineTo(-30, -74); g.lineTo(30, -74); g.lineTo(40, -46); g.closePath(); g.fill();
    g.fillStyle = '#cfeef2'; g.beginPath(); g.moveTo(-32, -50); g.lineTo(-25, -69); g.lineTo(25, -69); g.lineTo(32, -50); g.closePath(); g.fill();
    g.fillStyle = '#E25C5C'; g.fillRect(-58, -30, 16, 9); g.fillRect(42, -30, 16, 9);
    g.fillStyle = '#26333c'; g.fillRect(-60, -4, 24, 10); g.fillRect(36, -4, 24, 10);
    g.restore();
  }

  function zeichneTacho(g, x, y, r, v, limit) {
    g.save();
    g.fillStyle = 'rgba(255,255,255,.94)'; g.beginPath(); g.arc(x, y, r + 8, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#d6dee3'; g.lineWidth = 2; g.stroke();
    var a0 = Math.PI * 0.75, a1 = Math.PI * 2.25, max = 140;
    g.lineWidth = 8; g.strokeStyle = '#e6ecef'; g.beginPath(); g.arc(x, y, r - 6, a0, a1); g.stroke();
    if (limit) { // erlaubter Bereich grün
      g.strokeStyle = 'rgba(46,173,107,.55)'; g.beginPath(); g.arc(x, y, r - 6, a0 + (a1 - a0) * Math.max(0, limit - 10) / max, a0 + (a1 - a0) * Math.min(max, limit + 5) / max); g.stroke();
    }
    g.fillStyle = '#51606b'; g.font = '600 11px -apple-system, Helvetica, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    for (var k = 0; k <= max; k += 20) {
      var a = a0 + (a1 - a0) * k / max;
      g.strokeStyle = '#9aa7b0'; g.lineWidth = 2; g.beginPath(); g.moveTo(x + Math.cos(a) * (r - 14), y + Math.sin(a) * (r - 14)); g.lineTo(x + Math.cos(a) * (r - 20), y + Math.sin(a) * (r - 20)); g.stroke();
      g.fillText(String(k), x + Math.cos(a) * (r - 30), y + Math.sin(a) * (r - 30));
    }
    var an = a0 + (a1 - a0) * HT.klemmen(v, 0, max) / max;
    var zuSchnell = limit && v > limit + 5;
    g.strokeStyle = zuSchnell ? '#E25C5C' : '#1e2a33'; g.lineWidth = 4; g.lineCap = 'round';
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(an) * (r - 18), y + Math.sin(an) * (r - 18)); g.stroke();
    g.fillStyle = '#1e2a33'; g.beginPath(); g.arc(x, y, 6, 0, Math.PI * 2); g.fill();
    g.fillStyle = zuSchnell ? '#E25C5C' : '#1e2a33'; g.font = '800 22px -apple-system, Helvetica, sans-serif';
    g.fillText(Math.round(v), x, y + r * 0.42);
    g.fillStyle = '#8a97a1'; g.font = '600 10px -apple-system, Helvetica, sans-serif'; g.fillText('km/h', x, y + r * 0.42 + 16);
    g.restore();
  }

  HT.registerModule({
    id: 'strassenverkehr', name: 'Straßenverkehr', kategorie: 'aufmerksamkeit', symbol: 'weiter',
    ziel: 'Im Straßenverkehr mehrere Dinge zugleich beachten: Spur, Tempo und Gefahren',
    beschreibung: 'Einfache Fahrsimulation für geteilte und selektive Aufmerksamkeit. Das Auto soll in der Spur bleiben (lenken mit ← →), ab Level 4 die erlaubte Geschwindigkeit nach den Verkehrsschildern einhalten (schneller ↑, langsamer ↓, Tacho unten rechts) und bei Gefahren auf der Fahrbahn (Ball, Fußgänger, Reh, Radfahrer) sofort bremsen (Leertaste). Ab Level 8 erscheinen harmlose Ablenker am Straßenrand, bei denen nicht gebremst werden soll. Ausgewertet werden Bremsreaktionen (Treffer, Auslassungen, unnötige Bremsungen, Reaktionszeit), Spurhaltung und Tempo.',
    anleitung: 'Bleiben Sie mit dem Auto auf der Straße (Pfeiltasten ← → oder Lenkknöpfe). Halten Sie die Geschwindigkeit vom letzten Schild ein (↑ schneller, ↓ langsamer, Tacho unten rechts). Läuft etwas auf die Fahrbahn: sofort BREMSEN mit der Leertaste.',
    tasten: [], levels: levels,
    levelLabels: { kurven: 'Kurvenstärke', tempoSelbst: 'Tempo selbst regeln', schilder: 'Tempolimit-Schilder', gefahrAbstandSek: 'Gefahr etwa alle (s)', ablenker: 'Anteil Ablenker', grundtempo: 'Grundtempo (km/h)', reaktionsfenster: 'Reaktionsfenster (Faktor)' },
    bewertung: { aufstufenAb: 0.85, abstufenUnter: 0.6 },
    create: function (container, ctx) {
      var p = ctx.params, Z = HT.zeit, aus = [];
      var flaeche = HT.m.neu(container, 'm-voll');
      var cv = HT.canvasVoll(flaeche), g = cv.ctx, W = cv.b, H = cv.h;
      var hinweis = HT.m.neu(container, 'm-oben', '', { fontWeight: '800', fontSize: '1.4rem', color: '#1e2a33', textShadow: '0 1px 0 #fff' });
      // Bedienknöpfe für Touch
      var leiste = HT.m.neu(container, 'sv-leiste');
      function knopf(text, klasse) { var b = HT.el('button', { type: 'button', class: 'sv-knopf ' + (klasse || '') }, text); leiste.appendChild(b); return b; }
      var kL = knopf('◀', 'lenk'), kR = knopf('▶', 'lenk'), kBremse = knopf('BREMSE', 'bremse'), kLangsam = knopf('−', 'tempo'), kSchnell = knopf('+', 'tempo');
      if (!p.tempoSelbst) { kLangsam.style.display = 'none'; kSchnell.style.display = 'none'; }
      var halten = { links: false, rechts: false, hoch: false, runter: false };
      [[kL, 'links'], [kR, 'rechts'], [kSchnell, 'hoch'], [kLangsam, 'runter']].forEach(function (x) {
        var an = function (ev) { ev.preventDefault(); halten[x[1]] = true; }, ab = function () { halten[x[1]] = false; };
        x[0].addEventListener('pointerdown', an); x[0].addEventListener('pointerup', ab); x[0].addEventListener('pointerleave', ab); x[0].addEventListener('pointercancel', ab);
        x[0].addEventListener('touchstart', an, { passive: false }); x[0].addEventListener('touchend', ab);
      });
      HT.tap(kBremse, function () { bremsen(); });
      var pfeile = HT.pfeilTasten ? HT.pfeilTasten() : null;

      var S = {
        x: 0, v: p.grundtempo, limit: p.grundtempo, kurve: 0, kurveZiel: 0, strecke: 0, bremsBis: 0,
        objekte: [], naechsteGefahr: Z.jetzt() + 4000, naechstesSchild: Z.jetzt() + 2500, naechsterAblenker: Z.jetzt() + 3000,
        naechsteKurve: 0, pruefung: Z.jetzt() + 4000, wackeln: 0, hinweisBis: 0
      };
      if (p.schilder) { S.limit = HT.zufall.wahl([50, 70]); S.v = S.limit; }

      function melde(text, ms) { hinweis.textContent = text; S.hinweisBis = Z.jetzt() + (ms || 1400); }
      function bremsen() {
        var jetzt = Z.jetzt();
        S.bremsBis = jetzt + 900;
        var gefahr = S.objekte.filter(function (o) { return o.gefahr && !o.erledigt && o.d < 0.9; })[0];
        if (gefahr) {
          gefahr.erledigt = true; gefahr.weg = true;
          ctx.onEvent({ korrekt: true, reiz: gefahr.typ, reaktion: 'gebremst', rtMs: jetzt - gefahr.start, typ: 'bremsen', seite: gefahr.lat < 0 ? 'links' : 'rechts' });
          ctx.feedback(true, null, null, { dauer: 300 });
          melde('Gut gebremst!', 1000);
        } else {
          var ablenker = S.objekte.some(function (o) { return o.ablenker && o.d < 0.7 && o.d > 0.05; });
          ctx.onEvent({ korrekt: false, reiz: ablenker ? 'ablenker' : 'keiner', reaktion: 'gebremst', typ: 'unnötig gebremst' });
          ctx.feedback(false);
          melde(ablenker ? 'Keine Gefahr – das war nur am Rand' : 'Unnötig gebremst', 1200);
        }
      }

      // Perspektive: Tiefe d (0 = vorn, 1 = Horizont)
      var horizont = H * 0.36;
      function zeileVon(d) { return horizont + (H - horizont) * Math.pow(1 - d, 2.1); }
      function massstab(d) { return Math.pow(1 - d, 2.1); }
      function mitte(d) { var s = massstab(d); return W / 2 - S.x * (W * 0.42) * s + S.kurve * Math.pow(1 - s, 2) * W * 0.5; }
      function halbBreite(d) { return W * 0.42 * massstab(d) + 3; }

      function zeichnen(jetzt) {
        // Himmel und Wiese
        var gr = g.createLinearGradient(0, 0, 0, horizont); gr.addColorStop(0, '#bfe4f6'); gr.addColorStop(1, '#eaf6fb');
        g.fillStyle = gr; g.fillRect(0, 0, W, horizont + 1);
        g.fillStyle = '#cfe8bf'; g.beginPath(); g.ellipse(W * 0.25, horizont, W * 0.35, 30, 0, Math.PI, 0); g.fill();
        g.fillStyle = '#bcdcaa'; g.beginPath(); g.ellipse(W * 0.78, horizont, W * 0.3, 24, 0, Math.PI, 0); g.fill();
        g.fillStyle = '#9fd18a'; g.fillRect(0, horizont, W, H - horizont);
        // Straße in Streifen
        var n = 60;
        for (var k = n; k > 0; k--) {
          var d0 = k / n, d1 = (k - 1) / n;
          var y0 = zeileVon(d0), y1 = zeileVon(d1), m0 = mitte(d0), m1 = mitte(d1), b0 = halbBreite(d0), b1 = halbBreite(d1);
          var streifen = Math.floor(S.strecke / 6 + d0 * 40) % 2 === 0;
          g.fillStyle = streifen ? '#8fca78' : '#9fd18a'; g.fillRect(0, y1, W, y0 - y1 + 1);
          g.fillStyle = streifen ? '#e9eef1' : '#d63b3b';
          g.beginPath(); g.moveTo(m0 - b0 * 1.08, y0); g.lineTo(m0 + b0 * 1.08, y0); g.lineTo(m1 + b1 * 1.08, y1); g.lineTo(m1 - b1 * 1.08, y1); g.fill();
          g.fillStyle = '#6f7b84';
          g.beginPath(); g.moveTo(m0 - b0, y0); g.lineTo(m0 + b0, y0); g.lineTo(m1 + b1, y1); g.lineTo(m1 - b1, y1); g.fill();
          if (streifen) { g.fillStyle = '#f3f6f8'; var lw0 = b0 * 0.03, lw1 = b1 * 0.03; g.beginPath(); g.moveTo(m0 - lw0, y0); g.lineTo(m0 + lw0, y0); g.lineTo(m1 + lw1, y1); g.lineTo(m1 - lw1, y1); g.fill(); }
        }
        // Objekte von hinten nach vorn
        S.objekte.slice().sort(function (a, b) { return b.d - a.d; }).forEach(function (o) {
          var s = massstab(o.d); if (s < 0.01) return;
          var x = mitte(o.d) + o.lat * halbBreite(o.d), y = zeileVon(o.d);
          zeichneObjekt(g, o.typ, x, y, Math.max(0.15, s * 2.2), o.typ === 'schild' ? o.wert : (jetzt / 1000 + o.phase));
          if (o.gefahr && !o.erledigt && o.d < 0.75 && Math.floor(jetzt / 250) % 2 === 0) { g.strokeStyle = 'rgba(226,92,92,.8)'; g.lineWidth = 3; g.beginPath(); g.arc(x, y - 40 * s * 2.2, 55 * s * 2.2, 0, Math.PI * 2); g.stroke(); }
        });
        // Auto
        var wack = S.wackeln > 0 ? Math.sin(jetzt / 30) * 3 : 0;
        zeichneAuto(g, W / 2 + wack, H - 26, Math.min(1.25, W / 700), (halten.links || (pfeile && pfeile.links) ? -0.04 : 0) + (halten.rechts || (pfeile && pfeile.rechts) ? 0.04 : 0));
        if (jetzt < S.bremsBis) { g.fillStyle = 'rgba(226,92,92,.9)'; g.font = '800 15px -apple-system, Helvetica, sans-serif'; g.textAlign = 'center'; g.fillText('BREMSE', W / 2, H - 4); }
        // Tacho unten rechts, aktuelles Tempolimit daneben
        var r = Math.max(52, Math.min(78, W * 0.07));
        zeichneTacho(g, W - r - 22, H - r - 22, r, S.v, p.schilder ? S.limit : 0);
        if (p.schilder) zeichneObjekt(g, 'schild', W - 2 * r - 70, H - 30, Math.max(0.7, r / 70), S.limit);
        if (jetzt > S.hinweisBis) hinweis.textContent = '';
      }

      function schritt(dt, jetzt) {
        var links = halten.links || (pfeile && pfeile.links), rechts = halten.rechts || (pfeile && pfeile.rechts);
        var schneller = halten.hoch || (pfeile && pfeile.hoch), langsamer = halten.runter || (pfeile && pfeile.runter);
        // Tempo
        if (jetzt < S.bremsBis) S.v = Math.max(0, S.v - 70 * dt);
        else if (p.tempoSelbst) {
          if (schneller) S.v = Math.min(140, S.v + 18 * dt);
          if (langsamer) S.v = Math.max(0, S.v - 30 * dt);
        } else S.v += (S.limit - S.v) * Math.min(1, dt * 1.5);
        if (Math.abs(S.x) > 1.05) S.v = Math.max(15, S.v - 25 * dt);
        // Kurven
        if (p.kurven > 0 && jetzt > S.naechsteKurve) { S.kurveZiel = HT.zufall.wahl([-1, -0.5, 0, 0.5, 1]) * p.kurven; S.naechsteKurve = jetzt + HT.zufall.int(3500, 7000); }
        S.kurve += (S.kurveZiel - S.kurve) * Math.min(1, dt * 0.6);
        // Lenken und Fliehkraft
        var lenk = (rechts ? 1 : 0) - (links ? 1 : 0);
        S.x += lenk * dt * (0.9 + S.v / 120) - S.kurve * (S.v / 100) * 0.55 * dt;
        S.x = HT.klemmen(S.x, -1.7, 1.7);
        S.wackeln = Math.abs(S.x) > 1.05 ? 1 : 0;
        var dStrecke = S.v / 3.6 * dt;
        S.strecke += dStrecke;
        // Objekte bewegen (Sichtweite ca. 140 m)
        S.objekte.forEach(function (o) {
          o.d -= dStrecke / 140;
          if (o.gefahr && !o.erledigt) {
            o.lat += o.richtung * dt * o.tempo;
            if (Math.abs(o.lat) < 0.15) o.richtung = 0;
            if (o.d < 0.08) {
              o.erledigt = true;
              ctx.onEvent({ korrekt: false, auslassung: true, reiz: o.typ, reaktion: 'nicht gebremst', typ: 'bremsen', seite: o.start_lat < 0 ? 'links' : 'rechts' });
              ctx.feedback(false); melde('Achtung! Gefahr nicht gebremst', 1600);
            }
          }
          if (o.weg) o.lat += (o.lat < 0 ? -1 : 1) * dt * 2.5;
          if (o.schild && !o.passiert && o.d < 0.02) { o.passiert = true; S.limit = o.wert; melde('Tempolimit ' + o.wert, 1500); }
        });
        S.objekte = S.objekte.filter(function (o) { return o.d > -0.05 && Math.abs(o.lat) < 4; });
        // Neue Objekte
        if (p.schilder && jetzt > S.naechstesSchild) {
          var neu = HT.zufall.wahl(LIMITS.filter(function (l) { return l !== S.limit; }));
          S.objekte.push({ typ: 'schild', schild: true, wert: neu, d: 1, lat: 1.35, phase: 0 });
          S.naechstesSchild = jetzt + HT.zufall.int(11000, 17000);
        }
        if (jetzt > S.naechsteGefahr && !S.objekte.some(function (o) { return o.gefahr && !o.erledigt; })) {
          var seite = HT.zufall.wahl([-1, 1]);
          var o = { typ: HT.zufall.wahl(GEFAHREN), gefahr: true, d: 0.9, lat: seite * 1.5, start_lat: seite, richtung: -seite, start: jetzt, phase: Math.random() * 6 };
          o.tempo = 1.5 / Math.max(0.8, (0.9 * 140 / Math.max(20, S.v / 3.6)) * 0.45 * p.reaktionsfenster);
          S.objekte.push(o);
          S.naechsteGefahr = jetzt + p.gefahrAbstandSek * 1000 * HT.zufall.zahl(0.7, 1.3);
        }
        if (p.ablenker > 0 && jetzt > S.naechsterAblenker) {
          if (HT.zufall.chance(p.ablenker)) S.objekte.push({ typ: HT.zufall.wahl(ABLENKER), ablenker: true, d: 1, lat: HT.zufall.wahl([-1, 1]) * HT.zufall.zahl(1.35, 1.9), phase: Math.random() * 6 });
          else S.objekte.push({ typ: 'baum', d: 1, lat: HT.zufall.wahl([-1, 1]) * HT.zufall.zahl(1.6, 2.4), phase: 0 });
          S.naechsterAblenker = jetzt + HT.zufall.int(1500, 3500);
        } else if (!p.ablenker && jetzt > S.naechsterAblenker) {
          S.objekte.push({ typ: 'baum', d: 1, lat: HT.zufall.wahl([-1, 1]) * HT.zufall.zahl(1.6, 2.4), phase: 0 });
          S.naechsterAblenker = jetzt + HT.zufall.int(1800, 4000);
        }
        // Regelmäßige Prüfung von Spur und Tempo
        if (jetzt > S.pruefung) {
          S.pruefung = jetzt + 4000;
          var inSpur = Math.abs(S.x) <= 0.9;
          ctx.onEvent({ korrekt: inSpur, reiz: 'spur', reaktion: inSpur ? 'in der Spur' : 'von der Fahrbahn abgekommen', typ: 'spur', seite: S.x < 0 ? 'links' : 'rechts' });
          if (!inSpur) melde('Zurück auf die Straße!', 1200);
          if (p.tempoSelbst && jetzt > S.bremsBis + 2500) {
            var okTempo = S.v <= S.limit + 7 && S.v >= S.limit - 15;
            ctx.onEvent({ korrekt: okTempo, reiz: 'tempo ' + S.limit, reaktion: Math.round(S.v) + ' km/h', typ: 'tempo' });
            if (!okTempo) melde(S.v > S.limit ? 'Zu schnell!' : 'Etwas schneller fahren', 1200);
          }
        }
        zeichnen(jetzt);
      }

      var frame = null;
      return {
        start: function () {
          aus.push(HT.eingabe.an(function (a) {
            if (a === 'ok') bremsen();
            else if (a === 'links' || a === 'rechts') { // Pultpfeile: kurzer Lenkimpuls
              halten[a] = true; setTimeout(function () { halten[a] = false; }, 220);
            } else if ((a === 'hoch' || a === 'runter') && p.tempoSelbst) { halten[a] = true; setTimeout(function () { halten[a] = false; }, 300); }
          }));
          melde(p.schilder ? 'Losfahren – achten Sie auf die Schilder' : 'Losfahren – in der Spur bleiben', 2200);
          frame = Z.frame(function (dt, jetzt) { schritt(dt, jetzt); });
        },
        stop: function () { aus.forEach(function (f) { f(); }); if (frame) Z.abbrechen(frame); if (pfeile && pfeile.entfernen) pfeile.entfernen(); }
      };
    },
    preview: function (el) {
      function bild(objekt, lenk, bremse, schild) {
        var s = '<svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg"><rect width="400" height="110" fill="#d6eef8"/><rect y="108" width="400" height="192" fill="#9fd18a"/>' +
          '<path d="M186 108 L214 108 L360 300 L40 300 Z" fill="#6f7b84"/><path d="M199 108 h2 l10 192 h-22 z" fill="#f3f6f8" opacity=".9" stroke-dasharray="6 10"/>';
        if (schild) s += '<rect x="296" y="120" width="5" height="50" fill="#9aa5ad"/><circle cx="298" cy="112" r="20" fill="#fff" stroke="#d63b3b" stroke-width="6"/><text x="298" y="119" text-anchor="middle" font-size="18" font-weight="800" font-family="-apple-system,sans-serif">' + schild + '</text>';
        if (objekt) s += '<circle cx="' + objekt + '" cy="190" r="16" fill="#E25C5C"/><path d="M' + (objekt - 16) + ' 190 a16 16 0 0 0 32 0" fill="#fff" opacity=".8"/>';
        s += '<g transform="translate(' + (200 + lenk) + ',290)"><path d="M-54 0 L-50 -28 Q-46 -38 -36 -38 L36 -38 Q46 -38 50 -28 L54 0 Z" fill="#1590A8"/><path d="M-32 -38 L-24 -60 L24 -60 L32 -38 Z" fill="#22B8C4"/><rect x="-48" y="-26" width="12" height="7" fill="' + (bremse ? '#ff2d2d' : '#E25C5C') + '"/><rect x="36" y="-26" width="12" height="7" fill="' + (bremse ? '#ff2d2d' : '#E25C5C') + '"/></g>' +
          '<circle cx="352" cy="252" r="36" fill="#fff" stroke="#d6dee3" stroke-width="2"/><path d="M352 252 L' + (bremse ? 334 : 372) + ' 236" stroke="#1e2a33" stroke-width="4" stroke-linecap="round"/><text x="352" y="278" text-anchor="middle" font-size="12" font-weight="800" font-family="-apple-system,sans-serif">' + (bremse ? 20 : 50) + '</text></svg>';
        return s;
      }
      return HT.beispiel(el, [
        { svg: bild(0, 0, false, 50), text: 'In der Spur bleiben, Tempo 50', dauer: 1700 },
        { svg: bild(0, -20, false, 0), text: 'Lenken mit ← →', dauer: 1300 },
        { svg: bild(110, 0, false, 0), text: 'Ball auf der Straße!', dauer: 1100 },
        { svg: bild(150, 0, true, 0), zeiger: [50, 88], klick: true, text: 'Sofort bremsen (Leertaste)', dauer: 1700 }
      ]);
    }
  });
})();

/* Hirntraining – gemeinsame Suchszene für Explorations- und Neglect-Training.
 * HT.suchSzene(container, ctx, opt) – großflächige Szene mit Zielen und Ablenkern, alle Ziele finden.
 * opt: { ziele, ablenker, groesse, kontrast (0..1), seitenGewicht (0..1 Anteil Ziele auf betonter Seite), betonteSeite,
 *        anker: { seite, staerke 0..1 }, hinweisTon: bool, zeitlimitSek } */
(function () {
  'use strict';
  var HT = window.HT;

  var ZIEL_SETS = [
    { ziel: 'apfel', ablenker: ['tomate', 'kirsche', 'orange', 'birne', 'paprika', 'erdbeere'] },
    { ziel: 'stern', form: true, farbe: 'gelb', ablenker: [['kreis', 'gelb'], ['stern', 'orange'], ['fuenfeck', 'gelb'], ['blitz', 'gelb'], ['kreuz', 'orange']] },
    { ziel: 'fisch', ablenker: ['vogel', 'ente', 'maus', 'schnecke', 'schildkroete'] },
    { ziel: 'schluessel', ablenker: ['schere', 'zange', 'schluessel-werkzeug', 'hammer', 'pinsel'] },
    { ziel: 'auto', ablenker: ['bus', 'lkw', 'traktor', 'zug', 'roller'] },
    { ziel: 'herz', form: true, farbe: 'rot', ablenker: [['herz', 'pink'], ['tropfen', 'rot'], ['kreis', 'rot'], ['mond', 'rot'], ['herz', 'lila']] }
  ];

  HT.suchSzene = function (container, ctx, opt) {
    var Z = HT.zeit, tf = null, timer = null, hinweisTimer = null;
    var voll = HT.m.neu(container, 'm-voll');
    var oben = HT.m.neu(container, 'm-oben');
    var fertig = HT.el('button', { class: 'knopf primaer gross m-fertig', type: 'button', html: HT.icon('haken') + '<span>Fertig</span>' });
    container.appendChild(fertig);
    var runde = null;

    function svgVon(eintrag, set) {
      if (set.form) return HT.formSvg(eintrag[0], eintrag[1]);
      return HT.bild(eintrag);
    }

    function positionen(n, b, h, g, gewicht, seite) {
      var pts = [], versuche = 0;
      var randO = 80, randU = 90, randL = opt.anker ? 70 : 30, randR = opt.anker ? 70 : 30;
      while (pts.length < n && versuche < 6000) {
        versuche++;
        var x = randL + Math.random() * (b - randL - randR - g), y = randO + Math.random() * (h - randO - randU - g);
        var frei = pts.every(function (q) { return Math.abs(q.x - x) > g * 1.05 || Math.abs(q.y - y) > g * 1.05; });
        if (frei) pts.push({ x: x, y: y });
      }
      return pts;
    }

    function neueRunde() {
      if (tf) tf.entfernen();
      Z.abbrechen(timer); Z.abbrechen(hinweisTimer);
      HT.leeren(voll);
      var set = HT.zufall.wahl(ZIEL_SETS);
      var b = container.clientWidth, h = container.clientHeight, g = opt.groesse;
      var zielSvg = set.form ? HT.formSvg(set.ziel, set.farbe) : HT.bild(set.ziel);
      oben.innerHTML = '<div class="m-anweisung" style="display:inline-flex;align-items:center;margin:0;background:var(--karte);padding:.3rem 1rem;border-radius:14px;box-shadow:var(--schatten-1)">Finden Sie alle:&nbsp;<span style="display:inline-block;width:46px;height:46px">' + zielSvg + '</span></div>';
      var pts = positionen(opt.ziele + opt.ablenker, b, h, g);
      // Ziele verteilen: betonte Seite bekommt Anteil 'seitenGewicht'
      var seiteVon = function (q) { return (q.x + g / 2) / b < 0.5 ? 'links' : 'rechts'; };
      var links = pts.filter(function (q) { return seiteVon(q) === 'links'; }), rechts = pts.filter(function (q) { return seiteVon(q) === 'rechts'; });
      var nBetont = Math.round(opt.ziele * (opt.seitenGewicht || 0.5));
      var betont = opt.betonteSeite === 'rechts' ? rechts : links, andere = opt.betonteSeite === 'rechts' ? links : rechts;
      betont = HT.zufall.mischen(betont); andere = HT.zufall.mischen(andere);
      var zielPos = betont.slice(0, nBetont).concat(andere.slice(0, opt.ziele - nBetont));
      if (zielPos.length < opt.ziele) zielPos = zielPos.concat(betont.slice(nBetont, nBetont + opt.ziele - zielPos.length));
      var rest = pts.filter(function (q) { return zielPos.indexOf(q) < 0; });
      runde = { obj: [], gefunden: 0, start: Z.jetzt(), letzte: Z.jetzt(), aktiv: true, b: b, reihenfolge: [] };
      var alle = zielPos.map(function (q) { return { q: q, ziel: true, svg: zielSvg }; })
        .concat(rest.map(function (q) { var a = HT.zufall.wahl(set.ablenker); return { q: q, ziel: false, svg: svgVon(a, set) }; }));
      alle.sort(function (a, c) { return a.q.y - c.q.y || a.q.x - c.q.x; });
      alle.forEach(function (o) {
        var el = HT.el('div', { class: 'm-symbol such-obj', html: o.svg, style: { position: 'absolute', left: o.q.x + 'px', top: o.q.y + 'px', width: g + 'px', height: g + 'px', opacity: String(opt.kontrast || 1), cursor: 'pointer' } });
        o.el = el; o.seite = seiteVon(o.q);
        HT.tap(el, function () { klick(o); });
        voll.appendChild(el);
        runde.obj.push(o);
      });
      if (opt.anker && opt.anker.staerke > 0) {
        var a = HT.el('div', { class: 'anker-linie', style: { position: 'absolute', top: '70px', bottom: '20px', width: '14px', borderRadius: '8px', background: '#E25C5C', opacity: String(opt.anker.staerke) } });
        a.style[opt.anker.seite === 'rechts' ? 'right' : 'left'] = '18px';
        voll.appendChild(a);
        a.animate && a.animate([{ transform: 'scaleX(1)' }, { transform: 'scaleX(1.6)' }, { transform: 'scaleX(1)' }], { duration: 900, iterations: 2 });
        HT.tap(a, function () { ctx.onEvent({ korrekt: true, zaehlt: false, typ: 'anker', reiz: 'anker', reaktion: 'angetippt' }); a.style.opacity = String(Math.max(0.15, opt.anker.staerke * 0.5)); ctx.audio.klick(); });
      }
      if (opt.hinweisTon) {
        var pan = opt.betonteSeite === 'rechts' ? 0.9 : -0.9;
        ctx.audio.signal(660, pan);
        hinweisTimer = Z.intervall(6000, function () {
          // Hinweis von der vernachlässigten Seite, wenn dort noch Ziele fehlen
          var fehlt = runde.obj.some(function (o) { return o.ziel && !o.markiert && o.seite === opt.betonteSeite; });
          if (fehlt && runde.aktiv) ctx.audio.signal(660, pan);
        });
      }
      tf = HT.tastenFokus(runde.obj.map(function (o) { return o.el; }).concat([fertig]), { spalten: Math.max(4, Math.round(Math.sqrt(runde.obj.length * 1.6))), ziffern: false, beiWahl: function (i) { if (i === runde.obj.length) abschliessen(); else klick(runde.obj[i]); } });
      if (opt.zeitlimitSek) timer = Z.nach(opt.zeitlimitSek * 1000, abschliessen);
    }

    function klick(o) {
      if (!runde || !runde.aktiv || o.markiert) return;
      o.markiert = true;
      var cx = o.q.x + opt.groesse / 2, cy = o.q.y + opt.groesse / 2;
      if (o.ziel) {
        runde.gefunden++;
        runde.reihenfolge.push(o);
        o.el.style.outline = '4px solid #2EAD6B'; o.el.style.borderRadius = '50%'; o.el.style.outlineOffset = '4px';
        ctx.onEvent({ korrekt: true, reiz: 'ziel', reaktion: 'gefunden', rtMs: Z.jetzt() - runde.letzte, seite: o.seite });
        runde.letzte = Z.jetzt();
        ctx.feedback(true, cx, cy, { dauer: 500 });
        if (runde.gefunden >= opt.ziele) abschliessen();
      } else {
        ctx.onEvent({ korrekt: false, reiz: 'ablenker', reaktion: 'angeklickt', seite: o.seite });
        ctx.feedback(false, cx, cy, { dauer: 500 });
        Z.nach(500, function () { o.markiert = false; });
      }
    }

    function abschliessen() {
      if (!runde || !runde.aktiv) return;
      runde.aktiv = false;
      Z.abbrechen(timer); Z.abbrechen(hinweisTimer);
      runde.obj.forEach(function (o) {
        if (o.ziel && !o.markiert) {
          o.el.style.outline = '4px dashed #E25C5C'; o.el.style.outlineOffset = '4px'; o.el.style.borderRadius = '50%';
          ctx.onEvent({ korrekt: false, auslassung: true, reiz: 'ziel', reaktion: 'übersehen', seite: o.seite });
        }
      });
      // Suchweg anzeigen (Reihenfolge der Funde)
      if (runde.reihenfolge.length > 1) {
        var g = opt.groesse / 2;
        var svg = '<svg style="position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none" xmlns="http://www.w3.org/2000/svg"><polyline points="' + runde.reihenfolge.map(function (o) { return (o.q.x + g) + ',' + (o.q.y + g); }).join(' ') + '" fill="none" stroke="#1BA8B5" stroke-width="3" stroke-dasharray="6 6" opacity=".8"/>' +
          runde.reihenfolge.map(function (o, i) { return '<circle cx="' + (o.q.x + g) + '" cy="' + (o.q.y + g * 2 + 6) + '" r="11" fill="#1BA8B5"/><text x="' + (o.q.x + g) + '" y="' + (o.q.y + g * 2 + 10) + '" font-size="12" font-weight="700" fill="#fff" text-anchor="middle" font-family="-apple-system,sans-serif">' + (i + 1) + '</text>'; }).join('') + '</svg>';
        voll.insertAdjacentHTML('beforeend', svg);
      }
      ctx.feedback(runde.gefunden >= opt.ziele, null, null, { stumm: true });
      Z.nach(2400, neueRunde);
    }

    HT.tap(fertig, abschliessen);
    return { start: function () { neueRunde(); }, stop: function () { if (tf) tf.entfernen(); } };
  };

  /* Vorschau für beide Module */
  HT.suchVorschau = function (el, mitAnker) {
    var pos = [[60, 60, 'apfel'], [150, 40, 'tomate'], [250, 70, 'apfel'], [330, 50, 'kirsche'], [90, 160, 'orange'], [200, 150, 'apfel'], [300, 170, 'birne'], [50, 240, 'apfel'], [170, 240, 'erdbeere'], [320, 250, 'tomate']];
    var b = function (gef) {
      var s = '<svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg">' + (mitAnker ? '<rect x="6" y="20" width="8" height="260" rx="4" fill="#E25C5C"/>' : '');
      pos.forEach(function (q, i) {
        if (gef.indexOf(i) >= 0) s += '<circle cx="' + q[0] + '" cy="' + q[1] + '" r="30" fill="none" stroke="#2EAD6B" stroke-width="4"/>';
        s += HT.bildGruppe(q[2], q[0], q[1], 46);
      });
      return s + '</svg>';
    };
    return HT.beispiel(el, [
      { svg: b([]), text: mitAnker ? 'Links an der roten Linie beginnen' : 'Alle Äpfel finden', dauer: 1300 },
      { svg: b([7]), zeiger: [12.5, 80], klick: true, dauer: 800 },
      { svg: b([7, 0]), zeiger: [15, 20], klick: true, dauer: 800 },
      { svg: b([7, 0, 5]), zeiger: [50, 50], klick: true, dauer: 800 },
      { svg: b([7, 0, 5, 2]), zeiger: [62.5, 23], klick: true, text: 'Systematisch absuchen', dauer: 1500 }
    ]);
  };
})();

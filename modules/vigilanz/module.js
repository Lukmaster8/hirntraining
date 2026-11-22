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
        var s = '<svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg"><rect x="0" y="190" width="400" height="22" fill="#8c98a3" stroke="#26333c" stroke-width="3"/>';
        for (var i = 0; i < 4; i++) {
          var x = -60 + i * 120 + off;
          s += '<g transform="translate(' + x + ' 105) scale(.85)">' + paket(abw === i, 1).replace(/<svg[^>]*>|<\/svg>/g, '') + '</g>';
        }
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

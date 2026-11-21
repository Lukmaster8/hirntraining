/* Modul: Turm-Aufgabe – Scheiben auf drei Stäben in die Zielanordnung bringen, mit möglichst wenigen Zügen.
 * Größere Scheiben dürfen nicht auf kleinere. Level: Scheibenanzahl, Mindestzüge, Zuglimit. */
(function () {
  'use strict';
  var HT = window.HT;
  var DEF = [[2, 2, 3], [3, 2, 3], [3, 3, 3], [3, 4, 3], [3, 5, 3], [3, 6, 2], [4, 5, 3], [4, 6, 2], [4, 7, 2], [4, 8, 2], [4, 9, 2], [5, 9, 2], [5, 11, 2], [5, 13, 1]];
  var levels = DEF.map(function (d) { return { scheiben: d[0], mindestzuege: d[1], spielraum: d[2] }; });
  var FARBEN = ['#E25C5C', '#E8833A', '#F2B630', '#2EAD6B', '#3D7BE0'];

  function key(st) { return st.map(function (s) { return s.join(','); }).join('|'); }
  function zuege(st) {
    var out = [];
    for (var a = 0; a < 3; a++) for (var b = 0; b < 3; b++) {
      if (a === b || !st[a].length) continue;
      var d = st[a][st[a].length - 1];
      if (st[b].length && st[b][st[b].length - 1] < d) continue;
      var n = st.map(function (s) { return s.slice(); }); n[b].push(n[a].pop()); out.push(n);
    }
    return out;
  }
  // Breitensuche: Abstand aller Zustände vom Start
  function abstaende(start) {
    var dist = {}, q = [start]; dist[key(start)] = 0;
    while (q.length) { var s = q.shift(), d = dist[key(s)]; zuege(s).forEach(function (n) { var k = key(n); if (dist[k] === undefined) { dist[k] = d + 1; q.push(n); } }); }
    return dist;
  }
  function zufallsZustand(n) { var st = [[], [], []]; for (var d = n; d >= 1; d--) st[HT.zufall.int(0, 2)].push(d); return st; }
  function aufgabe(n, min) {
    for (var v = 0; v < 300; v++) {
      var turmVoll = []; for (var k = n; k >= 1; k--) turmVoll.push(k);
      var start = v % 3 === 0 ? [turmVoll, [], []] : zufallsZustand(n);
      var dist = abstaende(start);
      var ziele = Object.keys(dist).filter(function (k) { return dist[k] === min; });
      if (ziele.length) { var z = HT.zufall.wahl(ziele); return { start: start, ziel: z.split('|').map(function (s) { return s ? s.split(',').map(Number) : []; }), min: min }; }
    }
    return null;
  }
  function turmSvg(st, n, breite, hoehe, wahl, klein) {
    var s = '<svg viewBox="0 0 ' + breite + ' ' + hoehe + '" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg"><rect x="10" y="' + (hoehe - 22) + '" width="' + (breite - 20) + '" height="14" rx="6" fill="#C8955A" stroke="#26333c" stroke-width="2"/>';
    var dh = Math.min(30, (hoehe - 60) / (n + 1));
    for (var i = 0; i < 3; i++) {
      var x = breite * (i + 0.5) / 3;
      s += '<rect data-stab="' + i + '" x="' + (x - breite / 6 + 6) + '" y="10" width="' + (breite / 3 - 12) + '" height="' + (hoehe - 30) + '" fill="' + (wahl === i ? 'rgba(27,168,181,.12)' : 'transparent') + '" rx="12"/>';
      s += '<rect x="' + (x - 5) + '" y="' + (hoehe - 30 - dh * (n + 0.6)) + '" width="10" height="' + (dh * (n + 0.6)) + '" rx="5" fill="#a8743f" pointer-events="none"/>';
      st[i].forEach(function (d, k) {
        var w = (breite / 3 - 24) * (0.35 + 0.65 * d / n);
        var y = hoehe - 22 - dh * (k + 1) - (wahl === i && k === st[i].length - 1 && !klein ? 14 : 0);
        s += '<rect x="' + (x - w / 2) + '" y="' + y + '" width="' + w + '" height="' + Math.max(2, dh * 0.86) + '" rx="' + (dh / 2.4) + '" fill="' + FARBEN[(d - 1) % 5] + '" stroke="#26333c" stroke-width="2" pointer-events="none"/>';
      });
    }
    return s + '</svg>';
  }

  HT.registerModule({
    id: 'turm', name: 'Turm-Aufgabe', kategorie: 'exekutiv', symbol: 'stapel',
    ziel: 'Vorausplanen, Zwischenziele bilden und Lösungswege finden',
    beschreibung: 'Farbige Scheiben liegen auf drei Stäben. Durch Umsetzen einzelner Scheiben soll die oben gezeigte Zielanordnung erreicht werden – mit möglichst wenigen Zügen. Eine größere Scheibe darf nie auf einer kleineren liegen. Level: Anzahl Scheiben (2–5), Mindestzahl an Zügen und erlaubtes Zuglimit.',
    anleitung: 'Bringen Sie die Scheiben in die Anordnung der Vorlage oben. Tippen Sie zuerst auf den Stab, von dem Sie die oberste Scheibe nehmen, dann auf den Ziel-Stab. Größere Scheiben dürfen nicht auf kleinere. Versuchen Sie, mit wenig Zügen auszukommen.',
    tasten: [{ aktion: 'ziffer', label: 'Stab 1', detail: { wert: 1 } }, { aktion: 'ziffer', label: 'Stab 2', detail: { wert: 2 } }, { aktion: 'ziffer', label: 'Stab 3', detail: { wert: 3 } }],
    levels: levels,
    levelLabels: { scheiben: 'Scheiben', mindestzuege: 'Mindestzüge', spielraum: 'Zusätzliche Züge erlaubt' },
    bewertung: { aufstufenAb: 0.8, abstufenUnter: 0.5 },
    create: function (container, ctx) {
      var p = ctx.params, Z = HT.zeit, aus = null;
      var zone = HT.m.neu(container, 'm-zentrum');
      var anw = HT.m.neu(zone, 'm-anweisung');
      var vorlage = HT.m.neu(zone, '', '', { width: '300px', height: '140px', marginBottom: '1rem', background: 'var(--grund)', borderRadius: '16px', padding: '6px' });
      var b = Math.min(760, container.clientWidth - 80), h = Math.min(360, container.clientHeight - 300);
      var spiel = HT.m.neu(zone, '', '', { width: b + 'px', height: h + 'px', cursor: 'pointer' });
      var zaehler = HT.m.neu(container, 'm-info');
      var A = null, st = null, wahl = -1, zug = 0, t0 = 0, aktiv = false;
      function zeichnen() { spiel.innerHTML = turmSvg(st, p.scheiben, b, h, wahl); zaehler.textContent = 'Züge: ' + zug + ' (Ziel: ' + A.min + ', höchstens ' + (A.min + p.spielraum) + ')'; }
      function runde() {
        A = aufgabe(p.scheiben, p.mindestzuege);
        st = A.start.map(function (s) { return s.slice(); }); wahl = -1; zug = 0; aktiv = true; t0 = Z.jetzt();
        vorlage.innerHTML = turmSvg(A.ziel, p.scheiben, 300, 128, -1, true);
        anw.innerHTML = 'Bauen Sie die <b>Vorlage</b> nach – in <b>' + A.min + '</b> Zügen ist es möglich';
        zeichnen();
      }
      function stab(i) {
        if (!aktiv) return;
        if (wahl < 0) { if (st[i].length) { wahl = i; ctx.audio.klick(); } zeichnen(); return; }
        if (wahl === i) { wahl = -1; zeichnen(); return; }
        var d = st[wahl][st[wahl].length - 1];
        if (st[i].length && st[i][st[i].length - 1] < d) { ctx.audio.falsch(); anw.innerHTML = 'Größere Scheiben dürfen nicht auf kleinere!'; ctx.onEvent({ korrekt: false, zaehlt: false, typ: 'regelverstoss', reiz: 'zug', reaktion: (wahl + 1) + '→' + (i + 1) }); wahl = -1; zeichnen(); return; }
        st[i].push(st[wahl].pop()); wahl = -1; zug++;
        ctx.audio.klick();
        zeichnen();
        if (key(st) === key(A.ziel)) {
          aktiv = false;
          var ok = zug <= A.min + p.spielraum;
          ctx.onEvent({ korrekt: ok, reiz: p.scheiben + ' Scheiben, min ' + A.min, reaktion: zug + ' Züge', rtMs: (Z.jetzt() - t0) / zug, typ: zug === A.min ? 'optimal' : null });
          ctx.feedback(ok);
          anw.innerHTML = zug === A.min ? 'Perfekt – mit der kleinsten Zugzahl gelöst!' : ok ? 'Geschafft in ' + zug + ' Zügen!' : 'Gelöst, aber mit ' + zug + ' Zügen etwas zu viele.';
          Z.nach(1800, runde);
        } else if (zug >= A.min + p.spielraum + 6) {
          aktiv = false;
          ctx.onEvent({ korrekt: false, reiz: p.scheiben + ' Scheiben, min ' + A.min, reaktion: 'abgebrochen nach ' + zug });
          ctx.feedback(false);
          anw.innerHTML = 'Zu viele Züge – neue Aufgabe';
          Z.nach(1600, runde);
        }
      }
      return {
        start: function () {
          HT.tap(spiel, function (ev) { var r = spiel.getBoundingClientRect(), x = ((ev.touches ? ev.touches[0] : ev).clientX - r.left) / r.width; stab(Math.min(2, Math.floor(x * 3))); });
          aus = HT.eingabe.an(function (a, d) {
            if (a === 'ziffer' && d.wert >= 1 && d.wert <= 3) stab(d.wert - 1);
          });
          runde();
        },
        stop: function () { if (aus) aus(); }
      };
    },
    preview: function (el) {
      var zustaende = [[[3, 2, 1], [], []], [[3, 2], [], [1]], [[3], [2], [1]], [[3], [2, 1], []]];
      var b = function (st, t) { return '<svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg"><g transform="translate(130 10)">' + turmSvg([[3], [2, 1], []], 3, 140, 96, -1, true).replace(/<svg[^>]*>|<\/svg>/g, '') + '</g><g transform="translate(20 100)">' + turmSvg(st, 3, 360, 190, -1, true).replace(/<svg[^>]*>|<\/svg>/g, '') + '</g></svg>'; };
      return HT.beispiel(el, [
        { svg: b(zustaende[0]), text: 'Vorlage oben nachbauen', dauer: 1400 },
        { svg: b(zustaende[1]), zeiger: [80, 75], klick: true, text: '1. Zug', dauer: 1100 },
        { svg: b(zustaende[2]), zeiger: [50, 75], klick: true, text: '2. Zug', dauer: 1100 },
        { svg: b(zustaende[3]), zeiger: [50, 70], klick: true, text: 'Geschafft in 3 Zügen!', dauer: 1700 }
      ]);
    }
  });
})();

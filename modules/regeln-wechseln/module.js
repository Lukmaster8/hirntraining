/* Modul: Regeln erkennen und wechseln – Karten nach Farbe, Form oder Anzahl sortieren; die Regel wechselt unangekündigt.
 * Messwerte u. a. Perseverationsfehler (Sortieren nach der alten Regel). */
(function () {
  'use strict';
  var HT = window.HT;
  var levels = HT.stufen(12, function (t, i) {
    return { wechselNach: HT.lerpInt(8, 4, t), hinweis: i <= 3 ? 'regel' : i <= 7 ? 'wechsel' : 'kein', regeln: i <= 2 ? 2 : 3 };
  });
  var REF = [{ farbe: 'rot', form: 'kreis', n: 1 }, { farbe: 'gruen', form: 'stern', n: 2 }, { farbe: 'blau', form: 'dreieck', n: 3 }, { farbe: 'gelb', form: 'quadrat', n: 4 }];
  var NAMEN = { farbe: 'Farbe', form: 'Form', n: 'Anzahl' };
  function karteSvg(k) {
    var pos = { 1: [[50, 50]], 2: [[50, 28], [50, 72]], 3: [[50, 22], [28, 70], [72, 70]], 4: [[28, 28], [72, 28], [28, 72], [72, 72]] }[k.n];
    return '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">' + pos.map(function (q) { return '<g transform="translate(' + (q[0] - 16) + ' ' + (q[1] - 16) + ') scale(.32)">' + HT.form(k.form, k.farbe) + '</g>'; }).join('') + '</svg>';
  }

  HT.registerModule({
    id: 'regeln-wechseln', name: 'Regeln erkennen und wechseln', kategorie: 'exekutiv', symbol: 'puzzle',
    ziel: 'Flexibel denken: Regeln erkennen und umstellen (Konzeptwechsel)',
    beschreibung: 'Karten mit Symbolen unterscheiden sich in Farbe, Form und Anzahl. Jede Karte wird einem der vier Stapel oben zugeordnet. Welche Regel gilt, muss aus der Rückmeldung erschlossen werden; nach einigen richtigen Zuordnungen wechselt die Regel. In niedrigen Leveln wird die Regel genannt, in mittleren nur der Wechsel angekündigt, in hohen gar nicht. Erfasst werden auch Perseverationsfehler (Festhalten an der alten Regel).',
    anleitung: 'Legen Sie die Karte unten auf einen der vier Stapel oben. Ob es richtig war, sehen Sie an der Rückmeldung. Finden Sie heraus, nach welcher Regel sortiert wird – die Regel kann sich ändern!',
    tasten: [], levels: levels,
    levelLabels: { wechselNach: 'Wechsel nach … richtigen', hinweis: 'Hinweis', regeln: 'Regeln' },
    bewertung: { aufstufenAb: 0.8, abstufenUnter: 0.55 },
    create: function (container, ctx) {
      var p = ctx.params, Z = HT.zeit, tf = null;
      var regeln = ['farbe', 'form', 'n'].slice(0, p.regeln === 2 ? 2 : 3);
      var regel = HT.zufall.wahl(regeln), alteRegel = null, serie = 0, karte = null, t0 = 0, aktiv = false;
      var zone = HT.m.neu(container, 'm-zentrum');
      var anw = HT.m.neu(zone, 'm-anweisung');
      var stapelReihe = HT.m.neu(zone, 'm-wahl', '', { marginBottom: '2rem' });
      var stapel = REF.map(function (r, i) {
        var b = HT.el('button', { class: 'm-wahl-knopf', type: 'button', style: { width: '150px', height: '150px', padding: '10px' }, html: karteSvg(r) });
        HT.tap(b, function () { legen(i); });
        stapelReihe.appendChild(b);
        return b;
      });
      tf = HT.tastenFokus(stapel, { beiWahl: function (i) { legen(i); } });
      var kEl = HT.m.neu(zone, 'm-kachel', '', { width: '170px', height: '170px', borderWidth: '3px', borderColor: 'var(--akzent)' });
      function hinweisText(neu) {
        if (p.hinweis === 'regel') anw.innerHTML = 'Sortieren Sie nach <b>' + NAMEN[regel] + '</b>';
        else if (p.hinweis === 'wechsel') anw.innerHTML = neu ? '<b>Achtung: Die Regel hat sich geändert!</b>' : 'Nach welcher Regel wird sortiert?';
        else anw.innerHTML = 'Nach welcher Regel wird sortiert?';
      }
      function neueKarte() {
        // Karte, die zu keinem Stapel in allen Merkmalen gleich ist (eindeutige Rückmeldung)
        do {
          karte = { farbe: HT.zufall.wahl(REF).farbe, form: HT.zufall.wahl(REF).form, n: HT.zufall.int(1, 4) };
        } while (REF.some(function (r) { return (r.farbe === karte.farbe) + (r.form === karte.form) + (r.n === karte.n) >= 2; }));
        kEl.innerHTML = karteSvg(karte);
        stapel.forEach(function (s) { s.classList.remove('richtig', 'falsch'); });
        aktiv = true; t0 = Z.jetzt();
      }
      function legen(i) {
        if (!aktiv) return;
        aktiv = false;
        var ok = REF[i][regel] === karte[regel];
        var perseveration = !ok && alteRegel && REF[i][alteRegel] === karte[alteRegel];
        stapel[i].classList.add(ok ? 'richtig' : 'falsch');
        ctx.onEvent({ korrekt: ok, reiz: karte.farbe + '/' + karte.form + '/' + karte.n, reaktion: 'stapel ' + (i + 1) + ' (Regel ' + NAMEN[regel] + ')', rtMs: Z.jetzt() - t0, typ: perseveration ? 'perseveration' : null });
        ctx.feedback(ok, null, null, { dauer: 380 });
        var neu = false;
        if (ok) { serie++; if (serie >= p.wechselNach) { alteRegel = regel; regel = HT.zufall.wahl(HT.zufall.ausser(regeln, [regel])); serie = 0; neu = true; } }
        else serie = 0;
        Z.nach(ok ? 700 : 1100, function () { hinweisText(neu); neueKarte(); });
      }
      return { start: function () { hinweisText(false); Z.nach(400, neueKarte); }, stop: function () { if (tf) tf.entfernen(); } };
    },
    preview: function (el) {
      var b = function (mark) {
        var s = '<svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg">';
        REF.forEach(function (r, i) { s += '<rect x="' + (28 + i * 90) + '" y="20" width="80" height="80" rx="12" fill="' + (mark && i === 2 ? '#e2f5ea' : '#fff') + '" stroke="' + (mark && i === 2 ? '#2EAD6B' : '#e1e8ed') + '" stroke-width="3"/><g transform="translate(' + (28 + i * 90) + ' 20) scale(.8)">' + karteSvg(r).replace(/<svg[^>]*>|<\/svg>/g, '') + '</g>'; });
        s += '<rect x="155" y="170" width="90" height="90" rx="12" fill="#fff" stroke="#1BA8B5" stroke-width="3"/><g transform="translate(155 170) scale(.9)">' + karteSvg({ farbe: 'blau', form: 'herz', n: 2 }).replace(/<svg[^>]*>|<\/svg>/g, '') + '</g>';
        return s + '</svg>';
      };
      return HT.beispiel(el, [{ svg: b(false), text: 'Wohin gehört die Karte?', dauer: 1600 }, { svg: b(true), zeiger: [55, 20], klick: true, text: 'Zur blauen Karte (Regel: Farbe)', dauer: 1900 }]);
    }
  });
})();

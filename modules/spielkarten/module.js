/* Modul: Spielkarten merken – Arbeitsgedächtnis (N-zurück) mit gezeichneten Spielkarten.
 * Karten erscheinen nacheinander: Ist die aktuelle Karte gleich der Karte von vor N Schritten? */
(function () {
  'use strict';
  var HT = window.HT;
  var FARBEN = [['♥', '#d63b3b'], ['♦', '#d63b3b'], ['♠', '#1e2a33'], ['♣', '#1e2a33']];
  var WERTE = ['7', '8', '9', '10', 'B', 'D', 'K', 'A'];
  var levels = HT.stufen(12, function (t, i) { return { n: i <= 4 ? 1 : i <= 9 ? 2 : 3, zeigeMs: HT.lerpInt(2600, 1500, t), vergleich: i <= 2 ? 'farbe' : 'karte', kartenzahl: i <= 6 ? 6 : 10 }; });
  function karteSvg(k) {
    var f = FARBEN[k.f];
    return '<svg viewBox="0 0 100 140" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="3" width="94" height="134" rx="10" fill="#fff" stroke="#c9d2d8" stroke-width="2.5"/>' +
      '<text x="12" y="28" font-size="20" font-weight="800" fill="' + f[1] + '" font-family="Georgia,serif">' + k.w + '</text><text x="12" y="46" font-size="18" fill="' + f[1] + '">' + f[0] + '</text>' +
      '<text x="50" y="92" text-anchor="middle" font-size="54" fill="' + f[1] + '">' + f[0] + '</text>' +
      '<g transform="rotate(180 50 70)"><text x="12" y="28" font-size="20" font-weight="800" fill="' + f[1] + '" font-family="Georgia,serif">' + k.w + '</text><text x="12" y="46" font-size="18" fill="' + f[1] + '">' + f[0] + '</text></g></svg>';
  }
  HT.registerModule({
    id: 'spielkarten', name: 'Spielkarten merken', kategorie: 'gedaechtnis', symbol: 'stapel',
    ziel: 'Informationen kurz behalten und laufend aktualisieren (Arbeitsgedächtnis)',
    beschreibung: 'Spielkarten werden nacheinander aufgedeckt. Bei jeder Karte wird entschieden: Ist sie gleich der Karte, die N Schritte vorher kam? In Level 1–2 wird nur die Kartenfarbe (♥ ♦ ♠ ♣) mit der vorherigen Karte verglichen, danach die ganze Karte. Ab Level 5 gilt der Vergleich mit der vorletzten Karte (2 zurück), ab Level 10 mit der drittletzten. Gemessen werden Treffer, Auslassungen und falsche Alarme.',
    anleitung: 'Karten werden nacheinander aufgedeckt. Tippen Sie auf „Gleich“ (Taste J), wenn die Karte genau so aussieht wie die Karte davor (oder davor-davor, wenn angezeigt). Sonst auf „Anders“ (Taste N).',
    tasten: [], levels: levels,
    levelLabels: { n: 'Vergleich mit Karte vor … Schritten', zeigeMs: 'Zeit je Karte (ms)', vergleich: 'Verglichen wird', kartenzahl: 'Verschiedene Karten' },
    create: function (container, ctx) {
      var p = ctx.params, Z = HT.zeit, zone = HT.m.neu(container, 'm-zentrum'), aus = [];
      var regel = p.vergleich === 'farbe' ? 'Gleiche <b>Farbe</b> wie die Karte davor?' : 'Gleiche Karte wie ' + (p.n === 1 ? 'die Karte <b>davor</b>' : p.n === 2 ? 'die <b>vorletzte</b> Karte' : 'die <b>drittletzte</b> Karte') + '?';
      HT.m.neu(zone, 'm-anweisung', regel);
      var kb = Math.round(Math.max(170, Math.min(26 * (ctx.buehne ? ctx.buehne.einheit : 6.5), 260)));
      var tisch = HT.m.neu(zone, '', '', { width: kb + 'px', height: Math.round(kb * 1.4) + 'px', transition: 'transform .18s', marginBottom: '1rem' });
      var stapel = HT.zufall.stichprobe((function () { var a = []; FARBEN.forEach(function (x, f) { WERTE.forEach(function (w) { a.push({ f: f, w: w }); }); }); return a; })(), p.kartenzahl);
      var verlauf = [], akt = null, timer = null;
      function gleich(a, b) { return p.vergleich === 'farbe' ? a.f === b.f : a.f === b.f && a.w === b.w; }
      var kn = HT.m.wahl(zone, [{ html: '✓ Gleich', wert: true }, { html: '✗ Anders', wert: false }], antwort);
      function antwort(w, b) {
        if (!akt || akt.beantwortet || akt.ohneVergleich) return;
        akt.beantwortet = true;
        var ok = w === akt.ziel;
        b.classList.add(ok ? 'richtig' : 'falsch'); setTimeout(function () { b.classList.remove('richtig'); b.classList.remove('falsch'); }, 350);
        ctx.onEvent({ korrekt: ok, reiz: akt.ziel ? 'gleich' : 'anders', reaktion: w ? 'gleich' : 'anders', rtMs: Z.jetzt() - akt.start, typ: !ok && w ? 'falscher Alarm' : undefined });
        if (!ok) ctx.audio.falsch(); else ctx.audio.klick();
      }
      function naechste() {
        if (akt && !akt.beantwortet && !akt.ohneVergleich) ctx.onEvent({ korrekt: false, auslassung: true, reiz: akt.ziel ? 'gleich' : 'anders', reaktion: 'keine' });
        var vorN = verlauf.length >= p.n ? verlauf[verlauf.length - p.n] : null, k;
        if (vorN && HT.zufall.chance(0.33)) k = p.vergleich === 'farbe' ? HT.zufall.wahl(stapel.filter(function (x) { return x.f === vorN.f; })) : vorN;
        else k = HT.zufall.wahl(stapel);
        verlauf.push(k);
        akt = { karte: k, ziel: vorN ? gleich(k, vorN) : false, ohneVergleich: !vorN, start: Z.jetzt(), beantwortet: false };
        tisch.style.transform = 'scaleX(0)';
        Z.nach(160, function () { tisch.innerHTML = karteSvg(k); tisch.style.transform = 'scaleX(1)'; });
        timer = Z.nach(p.zeigeMs + 160, naechste);
      }
      return {
        start: function () { aus.push(HT.eingabe.an(function (a) { if (a === 'ja') antwort(true, kn[0]); if (a === 'nein') antwort(false, kn[1]); })); Z.nach(500, naechste); },
        stop: function () { aus.forEach(function (f) { f(); }); }
      };
    },
    preview: function (el) {
      var k = function (a, b, mark) { return '<svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg"><g opacity=".45" transform="translate(70 40) scale(1)">' + karteSvg(a).replace(/<\/?svg[^>]*>/g, '') + '</g><g transform="translate(220 40)">' + karteSvg(b).replace(/<\/?svg[^>]*>/g, '') + '</g><rect x="110" y="215" width="80" height="44" rx="10" fill="' + (mark ? '#e2f5ea' : '#fff') + '" stroke="' + (mark ? '#2EAD6B' : '#e1e8ed') + '" stroke-width="2.5"/><text x="150" y="243" text-anchor="middle" font-size="16" font-family="-apple-system,sans-serif">Gleich</text><rect x="210" y="215" width="80" height="44" rx="10" fill="#fff" stroke="#e1e8ed" stroke-width="2.5"/><text x="250" y="243" text-anchor="middle" font-size="16" font-family="-apple-system,sans-serif">Anders</text></svg>'; };
      var a = { f: 0, w: 'K' }, c = { f: 2, w: '9' };
      return HT.beispiel(el, [{ svg: k(c, a), text: 'Karte merken …', dauer: 1400 }, { svg: k(a, a), text: 'Gleich wie davor?', dauer: 1100 }, { svg: k(a, a, true), zeiger: [37, 79], klick: true, text: 'Ja – gleich!', dauer: 1500 }]);
    }
  });
})();

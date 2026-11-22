/* Modul: Lesetraining – Lesen mit Gesichtsfeldausfall oder Neglect.
 * Eine Zeile mit Wörtern wird kurz gezeigt. Danach wird gefragt, welches Wort am Anfang (oder am Ende)
 * der Zeile stand – so wird der Blick bis an den Zeilenrand der betroffenen Seite geführt. Ein roter Rand
 * markiert die betroffene Seite (Ankerreiz). Level: Zeilenlänge, Darbietungszeit, ähnliche Wörter. */
(function () {
  'use strict';
  var HT = window.HT;
  var levels = HT.stufen(12, function (t, i) { return { woerter: HT.lerpInt(3, 9, t), zeigeMs: i <= 2 ? 0 : HT.lerpInt(4500, 1500, (i - 3) / 9), anker: i <= 8, aehnlich: i >= 7 }; });
  HT.registerModule({
    id: 'lesetraining', name: 'Lesetraining', kategorie: 'wahrnehmung', symbol: 'buch',
    ziel: 'Zeilen vollständig lesen – auch bis an den Rand der betroffenen Seite',
    beschreibung: 'Lesetraining bei Hemianopsie oder Neglect. Eine Zeile mit Wörtern wird gezeigt (ab Level 3 nur kurz). Danach wird gefragt, welches Wort am betroffenen Zeilenende stand: bei Ausfall links das erste Wort, bei Ausfall rechts das letzte. Ein roter Rand auf der betroffenen Seite dient als Orientierungshilfe (Anker) und entfällt in hohen Leveln. Die Zeilen werden länger, die Darbietung kürzer, und die Antwortwörter werden ähnlicher. Die Seite wird aus der Patientenakte übernommen oder fest eingestellt.',
    anleitung: 'Lesen Sie die ganze Zeile – vom ersten bis zum letzten Wort. Schauen Sie dabei bis an den roten Rand. Danach tippen Sie das Wort an, nach dem gefragt wird.',
    tasten: [], levels: levels,
    levelLabels: { woerter: 'Wörter pro Zeile', zeigeMs: 'Darbietung (ms, 0 = bis Klick)', anker: 'Roter Randanker', aehnlich: 'Ähnliche Wörter' },
    parameterSchema: { seite: { typ: 'auswahl', label: 'Betroffene Seite', standard: 'patient', optionen: [{ wert: 'patient', label: 'Aus Patientenakte' }, { wert: 'links', label: 'Links' }, { wert: 'rechts', label: 'Rechts' }, { wert: 'wechselnd', label: 'Wechselnd' }] } },
    create: function (container, ctx) {
      var p = ctx.params, Z = HT.zeit;
      var seite = p.seite;
      if (seite === 'patient') { var pt = ctx.patient || {}; seite = /links/.test(pt.gesichtsfeld + pt.betroffeneSeite) ? 'links' : /rechts/.test(pt.gesichtsfeld + pt.betroffeneSeite) ? 'rechts' : 'wechselnd'; }
      var pool = [];
      Object.keys(HT.data.wortKategorien || {}).forEach(function (k) { pool = pool.concat(HT.data.wortKategorien[k]); });
      pool = pool.filter(function (w) { return w.length >= 3 && w.length <= 9 && w.indexOf(' ') < 0; });
      var zone = HT.m.neu(container, 'm-zentrum');
      function aehnlicheZu(w) {
        var k = pool.filter(function (x) { return x !== w && (x[0] === w[0] || Math.abs(x.length - w.length) <= 1); });
        return HT.zufall.stichprobe(k.length >= 3 ? k : pool.filter(function (x) { return x !== w; }), 3);
      }
      function runde() {
        HT.leeren(zone);
        var s = seite === 'wechselnd' ? HT.zufall.wahl(['links', 'rechts']) : seite;
        var zeile = HT.zufall.stichprobe(pool, p.woerter);
        var ziel = s === 'links' ? zeile[0] : zeile[zeile.length - 1];
        HT.m.neu(zone, 'm-anweisung', 'Lesen Sie die ganze Zeile');
        var z = HT.m.neu(zone, 'lt-zeile' + (p.anker ? ' anker-' + s : ''), zeile.map(HT.esc).join(' &nbsp; '));
        var start = Z.jetzt();
        function abfrage() {
          okAus();
          if (p.zeigeMs) z.innerHTML = zeile.map(function (w) { return '<span class="lt-maske">' + HT.esc(w) + '</span>'; }).join(' &nbsp; ');
          HT.leeren(zone); zone.appendChild(z);
          var frage = HT.el('div', { class: 'm-anweisung', style: { marginTop: '1.2rem' }, html: 'Welches Wort stand ganz <b>' + (s === 'links' ? 'am Anfang (links)' : 'am Ende (rechts)') + '</b>?' });
          zone.insertBefore(frage, z);
          var andere = p.aehnlich ? aehnlicheZu(ziel) : HT.zufall.stichprobe(zeile.filter(function (w) { return w !== ziel; }).concat(HT.zufall.stichprobe(pool, 3)), 3);
          var opts = HT.zufall.mischen([ziel].concat(andere));
          var t0 = Z.jetzt();
          var kn = HT.m.wahl(zone, opts.map(function (w) { return { html: HT.esc(w), wert: w }; }), function (w, b) {
            if (zone._aus) return; zone._aus = true;
            var ok = w === ziel;
            kn.forEach(function (x, j) { if (opts[j] === ziel) x.classList.add('richtig'); });
            if (!ok) b.classList.add('falsch');
            ctx.onEvent({ korrekt: ok, reiz: ziel, reaktion: w, rtMs: Z.jetzt() - t0, seite: s, lesezeit: t0 - start });
            ctx.feedback(ok, null, null, { dauer: 400 });
            Z.nach(ok ? 900 : 1800, function () { zone._aus = false; runde(); });
          });
        }
        var okAus = HT.eingabe.an(function (a) { if (a === 'ok') abfrage(); });
        if (p.zeigeMs) Z.nach(p.zeigeMs, abfrage);
        else { var b = HT.el('button', { type: 'button', class: 'knopf primaer gross', style: { marginTop: '1.2rem' } }, 'Gelesen'); zone.appendChild(b); HT.tap(b, abfrage); }
      }
      return { start: function () { Z.nach(300, runde); }, stop: function () {} };
    },
    preview: function (el) {
      var b = function (maske, frage, mark) {
        var w = ['Haus', 'Apfel', 'Garten', 'Stuhl'];
        var s = '<svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg"><rect x="20" y="70" width="360" height="60" rx="12" fill="#fff" stroke="#e1e8ed" stroke-width="2"/><rect x="20" y="70" width="8" height="60" rx="3" fill="#E25C5C"/>';
        w.forEach(function (x, i) { s += maske ? '<rect x="' + (48 + i * 84) + '" y="92" width="64" height="16" rx="6" fill="#dfe6ea"/>' : '<text x="' + (80 + i * 84) + '" y="108" text-anchor="middle" font-size="22" font-weight="600" font-family="-apple-system,sans-serif">' + x + '</text>'; });
        if (frage) ['Stuhl', 'Haus', 'Hund'].forEach(function (o, i) { var g = mark && o === 'Haus'; s += '<rect x="' + (40 + i * 112) + '" y="190" width="100" height="52" rx="12" fill="' + (g ? '#e2f5ea' : '#fff') + '" stroke="' + (g ? '#2EAD6B' : '#e1e8ed') + '" stroke-width="2.5"/><text x="' + (90 + i * 112) + '" y="222" text-anchor="middle" font-size="17" font-family="-apple-system,sans-serif">' + o + '</text>'; });
        return s + '</svg>';
      };
      return HT.beispiel(el, [{ svg: b(false), text: 'Ganze Zeile lesen – bis zum roten Rand', dauer: 1900 }, { svg: b(true, true), text: 'Welches Wort stand ganz links?', dauer: 1400 }, { svg: b(true, true, true), zeiger: [50, 72], klick: true, text: '„Haus“ – richtig!', dauer: 1500 }]);
    }
  });
})();

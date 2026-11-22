/* Modul: Personen merken – Gesichter mit Namen (und später Beruf/Wohnort) einprägen und wiedererkennen. */
(function () {
  'use strict';
  var HT = window.HT;
  var BERUFE = ['in der Bäckerei', 'in der Schule', 'in der Arztpraxis', 'in der Gärtnerei', 'im Friseursalon', 'bei der Post', 'im Krankenhaus', 'in der Apotheke', 'im Restaurant', 'bei der Polizei', 'im Rathaus', 'in der Bank'];
  var ORTE = ['Hamburg', 'München', 'Köln', 'Leipzig', 'Bremen', 'Dresden', 'Kiel', 'Mainz'];
  var levels = HT.stufen(12, function (t, i) { return { personen: HT.lerpInt(2, 6, t), merkmale: i <= 4 ? 1 : i <= 8 ? 2 : 3, zeigeMs: HT.lerpInt(5000, 3000, t), aehnlich: i >= 6 }; });
  function merkmale(seed) { return { haut: seed % 4, haar: (seed >> 2) % 5, frisur: (seed >> 4) % 5, brille: (seed >> 7) % 3 === 0, bart: (seed >> 9) % 4 === 0, mund: (seed >> 3) % 3, shirt: (seed >> 5) % 5 }; }
  HT.registerModule({
    id: 'personen-merken', name: 'Personen merken', kategorie: 'gedaechtnis', symbol: 'personen',
    ziel: 'Gesichter, Namen und Angaben zu Personen behalten',
    beschreibung: 'Nacheinander werden Personen vorgestellt: Gesicht und Name, ab Level 5 zusätzlich der Arbeitsplatz, ab Level 9 auch der Wohnort. Danach werden die Gesichter gezeigt und die passenden Angaben ausgewählt. Später werden es mehr Personen, die Gesichter ähneln sich stärker, und die Zeit zum Einprägen wird kürzer.',
    anleitung: 'Prägen Sie sich jede Person gut ein: Wie sieht sie aus, wie heißt sie, wo arbeitet sie? Danach sehen Sie die Gesichter wieder. Tippen Sie die richtigen Angaben an.',
    tasten: [], levels: levels,
    levelLabels: { personen: 'Personen', merkmale: 'Angaben je Person', zeigeMs: 'Einprägzeit (ms)', aehnlich: 'Ähnliche Gesichter' },
    create: function (container, ctx) {
      var p = ctx.params, Z = HT.zeit, zone = HT.m.neu(container, 'm-zentrum');
      function gesicht(m, gr) { return '<div class="m-kachel" style="width:' + gr + 'px;height:' + gr + 'px;padding:6px">' + HT.gesichtSvg(m) + '</div>'; }
      function runde() {
        var basis = HT.zufall.int(0, 4000);
        var namen = HT.zufall.stichprobe(HT.data.vornamen, p.personen), berufe = HT.zufall.stichprobe(BERUFE, p.personen), orte = HT.zufall.stichprobe(ORTE, p.personen);
        var leute = namen.map(function (n, i) { var s = p.aehnlich ? (basis + i * 37) : HT.zufall.int(0, 4095); return { name: n, beruf: berufe[i], ort: orte[i], m: merkmale(s) }; });
        var i = 0;
        (function zeigen() {
          HT.leeren(zone);
          if (i >= leute.length) return abfrage(leute);
          var x = leute[i++];
          HT.m.neu(zone, 'm-anweisung', 'Person ' + i + ' von ' + leute.length);
          var info = '<div class="m-wort" style="font-size:2rem">' + HT.esc(x.name) + '</div>' + (p.merkmale >= 2 ? '<div style="font-size:1.3rem;margin-top:.6rem">arbeitet ' + HT.esc(x.beruf) + '</div>' : '') + (p.merkmale >= 3 ? '<div style="font-size:1.1rem;color:var(--text-2)">wohnt in ' + HT.esc(x.ort) + '</div>' : '');
          HT.m.neu(zone, '', '<div style="display:flex;align-items:center;gap:1.4rem;flex-wrap:wrap;justify-content:center">' + gesicht(x.m, 200) + '<div style="text-align:center">' + info + '</div></div>');
          Z.nach(p.zeigeMs, zeigen);
        })();
      }
      function abfrage(leute) {
        var fragen = [];
        HT.zufall.mischen(leute).forEach(function (x) {
          fragen.push({ x: x, art: 'name' });
          if (p.merkmale >= 2) fragen.push({ x: x, art: 'beruf' });
          if (p.merkmale >= 3) fragen.push({ x: x, art: 'ort' });
        });
        var j = 0;
        (function frage() {
          if (j >= fragen.length) { HT.leeren(zone); HT.m.neu(zone, 'm-anweisung', 'Neue Personen …'); return Z.nach(1300, runde); }
          var f = fragen[j++], t0 = Z.jetzt();
          HT.leeren(zone);
          HT.m.neu(zone, 'm-anweisung', { name: 'Wie heißt diese Person?', beruf: 'Wo arbeitet diese Person?', ort: 'Wo wohnt diese Person?' }[f.art]);
          HT.m.neu(zone, '', gesicht(f.x.m, 170));
          var alle = leute.map(function (y) { return y[f.art]; });
          var extra = { name: HT.data.vornamen, beruf: BERUFE, ort: ORTE }[f.art].filter(function (v) { return alle.indexOf(v) < 0; });
          var opts = HT.zufall.mischen(HT.zufall.stichprobe(alle.filter(function (v) { return v !== f.x[f.art]; }).concat(HT.zufall.stichprobe(extra, 2)), 3).concat([f.x[f.art]]));
          var kn = HT.m.wahl(zone, opts.map(function (v) { return { html: HT.esc(v), wert: v }; }), function (v, b) {
            if (zone._aus) return; zone._aus = true;
            var ok = v === f.x[f.art];
            kn.forEach(function (k, n) { if (opts[n] === f.x[f.art]) k.classList.add('richtig'); });
            if (!ok) b.classList.add('falsch');
            ctx.onEvent({ korrekt: ok, reiz: f.x.name + ' (' + f.art + ')', reaktion: v, rtMs: Z.jetzt() - t0, typ: f.art });
            ctx.feedback(ok, null, null, { dauer: 400 });
            Z.nach(ok ? 900 : 1700, function () { zone._aus = false; frage(); });
          });
        })();
      }
      return { start: function () { Z.nach(300, runde); }, stop: function () {} };
    },
    preview: function (el) {
      var g = HT.gesichtSvg(merkmale(1234)).replace('<svg ', '<svg x="140" y="20" width="120" height="120" ');
      var b = function (phase, mark) {
        var s = '<svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg"><rect x="135" y="15" width="130" height="130" rx="16" fill="#fff" stroke="#e1e8ed" stroke-width="2"/>' + g;
        if (phase === 0) s += '<text x="200" y="185" text-anchor="middle" font-size="26" font-weight="800" font-family="-apple-system,sans-serif">Renate</text><text x="200" y="215" text-anchor="middle" font-size="17" fill="#51606b" font-family="-apple-system,sans-serif">arbeitet in der Bäckerei</text>';
        else ['Helga', 'Renate', 'Ute'].forEach(function (n, i) { var k = mark && i === 1; s += '<rect x="' + (40 + i * 112) + '" y="190" width="100" height="52" rx="12" fill="' + (k ? '#e2f5ea' : '#fff') + '" stroke="' + (k ? '#2EAD6B' : '#e1e8ed') + '" stroke-width="2.5"/><text x="' + (90 + i * 112) + '" y="222" text-anchor="middle" font-size="17" font-family="-apple-system,sans-serif">' + n + '</text>'; });
        return s + '</svg>';
      };
      return HT.beispiel(el, [{ svg: b(0), text: 'Renate, arbeitet in der Bäckerei – einprägen', dauer: 2000 }, { svg: b(1), text: 'Wie heißt diese Person?', dauer: 1300 }, { svg: b(1, true), zeiger: [50, 72], klick: true, text: 'Renate – richtig!', dauer: 1500 }]);
    }
  });
})();

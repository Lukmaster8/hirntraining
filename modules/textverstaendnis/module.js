/* Modul: Lesen und Textverständnis – kurzer Text, danach Fragen. Level: Textlänge, Fragenart, Text beim Antworten sichtbar oder nicht. */
(function () {
  'use strict';
  var HT = window.HT;
  var levels = HT.stufen(12, function (t, i) { return { stufe: i <= 4 ? 1 : i <= 8 ? 2 : 3, textSichtbar: [1, 2, 5, 6, 9].indexOf(i) >= 0 }; });

  HT.registerModule({
    id: 'textverstaendnis', name: 'Lesen und Textverständnis', kategorie: 'sprache', symbol: 'dokument',
    ziel: 'Kurze Alltagstexte lesen, verstehen und Informationen behalten',
    beschreibung: 'Ein kurzer Alltagstext (Einkauf, Arzttermin, Bahnfahrt, Nachricht, Rezept …) wird gelesen. Anschließend werden Fragen dazu beantwortet. In leichteren Varianten bleibt der Text sichtbar, in schwereren wird er vor den Fragen ausgeblendet. Die längeren Texte erfordern auch Schlussfolgerungen und kleine Rechnungen.',
    anleitung: 'Lesen Sie den Text in Ruhe durch. Tippen Sie auf „Gelesen“, wenn Sie fertig sind. Beantworten Sie danach die Fragen zum Text.',
    tasten: [], levels: levels,
    levelLabels: { stufe: 'Textstufe (1–3)', textSichtbar: 'Text bei Fragen sichtbar' },
    parameterSchema: { dauerDurchgangSek: { typ: 'zahl', label: 'Dauer eines Durchgangs (Sek.)', min: 60, max: 300, schritt: 30, standard: 150 }, vorlesen: { typ: 'schalter', label: 'Text vorlesen (falls Systemstimme vorhanden)', standard: false } },
    create: function (container, ctx) {
      var p = ctx.params, Z = HT.zeit, tf = null, gelesene = [];
      var zone = HT.m.neu(container, 'm-zentrum', '', { justifyContent: 'flex-start', paddingTop: '2rem', overflowY: 'auto' });
      function leer() { if (tf) { tf.entfernen(); tf = null; } HT.leeren(zone); }
      function neuerText() {
        var pool = HT.data.texte.filter(function (t) { return t.stufe === p.stufe && gelesene.indexOf(t) < 0; });
        if (!pool.length) { gelesene = []; pool = HT.data.texte.filter(function (t) { return t.stufe === p.stufe; }); }
        var t = HT.zufall.wahl(pool); gelesene.push(t);
        leer();
        HT.m.neu(zone, 'm-anweisung', 'Bitte lesen Sie den Text');
        var k = HT.m.neu(zone, 'm-karte-text', '<h2 style="margin-bottom:.6rem">' + HT.esc(t.titel) + '</h2><p style="margin:0">' + HT.esc(t.text) + '</p>', { maxWidth: '760px' });
        var fertig = HT.ui.knopf('Gelesen – weiter zu den Fragen', { art: 'primaer gross', icon: 'haken', klick: function () { fragen(t); } });
        fertig.style.marginTop = '1.4rem';
        zone.appendChild(fertig);
        tf = HT.tastenFokus([fertig], { beiWahl: function () { fragen(t); } });
        if (ctx.params.vorlesen) ctx.audio.sprechen(t.text);
      }
      function fragen(t) {
        var liste = HT.zufall.mischen(t.fragen), i = 0;
        (function frage() {
          leer();
          if (i >= liste.length) { neuerText(); return; }
          var f = liste[i++];
          if (p.textSichtbar) HT.m.neu(zone, 'm-karte-text', '<p style="margin:0;font-size:1.05rem">' + HT.esc(t.text) + '</p>', { maxWidth: '760px', marginBottom: '1rem', padding: '1rem 1.4rem' });
          HT.m.neu(zone, 'm-anweisung', '<b>Frage ' + i + ' von ' + liste.length + ':</b> ' + HT.esc(f[0]));
          var opts = HT.zufall.mischen([f[1]].concat(f[2])).map(function (o) { return { html: '<span style="font-size:1.1rem">' + HT.esc(o) + '</span>', wert: o }; });
          var t0 = Z.jetzt(), aktiv = true;
          var wrap = HT.el('div', { style: { maxWidth: '900px' } }); zone.appendChild(wrap);
          var kn = HT.m.wahl(wrap, opts, function (w, b) {
            if (!aktiv) return; aktiv = false;
            var ok = w === f[1];
            b.classList.add(ok ? 'richtig' : 'falsch');
            if (!ok) kn.forEach(function (x, k) { if (opts[k].wert === f[1]) x.classList.add('richtig'); });
            ctx.onEvent({ korrekt: ok, reiz: t.titel + ': ' + f[0], reaktion: w, rtMs: Z.jetzt() - t0 });
            ctx.feedback(ok, null, null, { dauer: 380 });
            Z.nach(ok ? 900 : 1800, frage);
          });
          tf = wrap.querySelector('.m-wahl').tastenFokus;
        })();
      }
      return { start: function () { neuerText(); }, stop: function () { if (tf) tf.entfernen(); } };
    },
    preview: function (el) {
      var b = function (frage, mark) {
        var s = '<svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg">';
        if (!frage) {
          s += '<rect x="40" y="30" width="320" height="200" rx="16" fill="#fff" stroke="#e1e8ed" stroke-width="2"/><text x="60" y="66" font-size="18" font-weight="800" font-family="-apple-system,sans-serif">Der Hund Bello</text>';
          ['Bello ist ein brauner Hund mit', 'weißen Pfoten. Jeden Morgen holt', 'er die Zeitung vom Gartentor …'].forEach(function (z, i) { s += '<text x="60" y="' + (102 + i * 28) + '" font-size="15" font-family="-apple-system,sans-serif" fill="#51606b">' + z + '</text>'; });
        } else {
          s += '<text x="200" y="70" text-anchor="middle" font-size="17" font-weight="700" font-family="-apple-system,sans-serif">Welche Farbe hat Bello?</text>';
          ['schwarz', 'braun', 'grau'].forEach(function (t, i) { var m = mark && i === 1; s += '<rect x="' + (45 + i * 107) + '" y="120" width="95" height="56" rx="12" fill="' + (m ? '#e2f5ea' : '#fff') + '" stroke="' + (m ? '#2EAD6B' : '#e1e8ed') + '" stroke-width="3"/><text x="' + (92 + i * 107) + '" y="155" text-anchor="middle" font-size="17" font-weight="700" font-family="-apple-system,sans-serif">' + t + '</text>'; });
        }
        return s + '</svg>';
      };
      return HT.beispiel(el, [{ svg: b(false), text: 'Text lesen', dauer: 2000 }, { svg: b(true), text: 'Fragen beantworten', dauer: 1200 }, { svg: b(true, true), zeiger: [50, 49], klick: true, text: 'Braun!', dauer: 1600 }]);
    }
  });
})();

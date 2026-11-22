/* Modul: Geschichten merken – kurze Geschichte lesen (oder vorlesen lassen), nach einer Pause mit
 * Ablenkaufgabe aus dem Gedächtnis Fragen beantworten. Level: Textlänge, Verzögerung, Fragenzahl. */
(function () {
  'use strict';
  var HT = window.HT;
  var levels = HT.stufen(12, function (t, i) { return { stufe: i <= 4 ? 1 : i <= 8 ? 2 : 3, verzoegerungSek: i <= 2 ? 0 : HT.lerpInt(10, 40, (i - 3) / 9), lesezeitFaktor: HT.lerp(1.6, 0.9, t) }; });
  HT.registerModule({
    id: 'geschichten', name: 'Geschichten merken', kategorie: 'gedaechtnis', symbol: 'buch',
    ziel: 'Inhalte aus Texten behalten und später wiedergeben (verbales Gedächtnis)',
    beschreibung: 'Eine kurze Alltagsgeschichte wird gelesen. Danach verschwindet der Text. In höheren Leveln folgt eine kurze Ablenkaufgabe (Zahlen in Reihenfolge antippen), bevor Fragen zum Inhalt beantwortet werden. So wird das verzögerte Abrufen trainiert. Die Geschichten werden länger und die Fragen verlangen mehr Details. Im Unterschied zum Modul „Textverständnis“ ist der Text beim Beantworten nicht mehr sichtbar.',
    anleitung: 'Lesen Sie die Geschichte aufmerksam und merken Sie sich möglichst viele Einzelheiten. Danach verschwindet der Text. Beantworten Sie dann die Fragen aus dem Gedächtnis.',
    tasten: [], levels: levels,
    levelLabels: { stufe: 'Textstufe', verzoegerungSek: 'Pause mit Ablenkung (s)', lesezeitFaktor: 'Lesezeit (Faktor)' },
    parameterSchema: { dauerDurchgangSek: { typ: 'zahl', label: 'Dauer eines Durchgangs (Sek.)', min: 60, max: 600, schritt: 30, standard: 180 } },
    create: function (container, ctx) {
      var p = ctx.params, Z = HT.zeit, aus = [], timer = null, letzte = null;
      var zone = HT.m.neu(container, 'm-zentrum');
      function runde() {
        HT.leeren(zone);
        var auswahl = HT.data.texte.filter(function (x) { return x.stufe === p.stufe && x !== letzte; });
        var tx = HT.zufall.wahl(auswahl.length ? auswahl : HT.data.texte); letzte = tx;
        HT.m.neu(zone, 'm-anweisung', '<b>' + HT.esc(tx.titel) + '</b>');
        HT.m.neu(zone, '', '<p style="font-size:1.35rem;line-height:1.6;max-width:720px;background:var(--karte);padding:1.2rem 1.5rem;border-radius:16px;border:1px solid var(--linie);margin:0">' + HT.esc(tx.text) + '</p>');
        var lesezeit = Math.max(8000, tx.text.split(/\s+/).length * 450 * p.lesezeitFaktor);
        var b = HT.el('button', { type: 'button', class: 'knopf primaer gross', style: { marginTop: '1.1rem' } }, 'Gelesen');
        zone.appendChild(b);
        var info = HT.m.neu(zone, 'm-anweisung', '', { fontSize: '.95rem', marginTop: '.6rem' });
        var ende = Z.jetzt() + lesezeit * 1.6;
        var tick = Z.intervall(500, function () { var r = Math.ceil((ende - Z.jetzt()) / 1000); info.textContent = r > 0 ? 'noch ' + r + ' s' : ''; if (r <= 0) weiter(); });
        var fertig = false;
        function weiter() { if (fertig) return; fertig = true; Z.abbrechen(tick); okAus(); if (p.verzoegerungSek > 0) ablenkung(function () { fragen(tx); }); else fragen(tx); }
        var okAus = HT.eingabe.an(function (a) { if (a === 'ok') weiter(); });
        HT.tap(b, weiter);
      }
      function ablenkung(fertig) {
        HT.leeren(zone);
        HT.m.neu(zone, 'm-anweisung', 'Kurze Zwischenaufgabe: Tippen Sie die Zahlen <b>der Reihe nach</b> an');
        var feld = HT.el('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(4, 74px)', gap: '10px' } });
        var naechste = 1, zahlen = HT.zufall.mischen([1, 2, 3, 4, 5, 6, 7, 8]);
        zahlen.forEach(function (z) {
          var k = HT.el('button', { type: 'button', class: 'm-wahl-knopf', style: { height: '74px', fontSize: '1.6rem' } }, String(z));
          HT.tap(k, function () { if (z === naechste) { k.disabled = true; k.classList.add('richtig'); naechste++; if (naechste > 8) { naechste = 1; Z.nach(400, function () { HT.leeren(feld); HT.zufall.mischen([1, 2, 3, 4, 5, 6, 7, 8]).forEach(function (z2) { feld.appendChild(knopf(z2)); }); }); } } else { k.classList.add('falsch'); setTimeout(function () { k.classList.remove('falsch'); }, 300); } });
          feld.appendChild(k);
        });
        function knopf(z2) { var k2 = HT.el('button', { type: 'button', class: 'm-wahl-knopf', style: { height: '74px', fontSize: '1.6rem' } }, String(z2)); HT.tap(k2, function () { if (z2 === naechste) { k2.disabled = true; k2.classList.add('richtig'); naechste++; } }); return k2; }
        zone.appendChild(feld);
        timer = Z.nach(p.verzoegerungSek * 1000, fertig);
      }
      function fragen(tx) {
        var liste = HT.zufall.mischen(tx.fragen), i = 0;
        function frage() {
          if (i >= liste.length) { HT.leeren(zone); HT.m.neu(zone, 'm-anweisung', 'Nächste Geschichte …'); timer = Z.nach(1400, runde); return; }
          var f = liste[i++];
          HT.leeren(zone);
          HT.m.neu(zone, 'm-anweisung', '<span style="font-size:.9rem;color:var(--text-3)">„' + HT.esc(tx.titel) + '“ – Frage ' + i + ' von ' + liste.length + '</span><br><b>' + HT.esc(f[0]) + '</b>');
          var opts = HT.zufall.mischen([f[1]].concat(f[2]));
          var start = Z.jetzt();
          var kn = HT.m.wahl(zone, opts.map(function (o) { return { html: HT.esc(o), wert: o }; }), function (w, b) {
            if (zone._fertig) return; zone._fertig = true;
            var ok = w === f[1];
            kn.forEach(function (x, j) { if (opts[j] === f[1]) x.classList.add('richtig'); });
            if (!ok) b.classList.add('falsch');
            ctx.onEvent({ korrekt: ok, reiz: f[0], reaktion: w, rtMs: Z.jetzt() - start });
            ctx.feedback(ok, null, null, { dauer: 400 });
            timer = Z.nach(ok ? 900 : 1700, function () { zone._fertig = false; frage(); });
          });
        }
        frage();
      }
      return { start: function () { Z.nach(300, runde); }, stop: function () { aus.forEach(function (f) { f(); }); } };
    },
    preview: function (el) {
      var t = function (sichtbar, frage, mark) {
        return '<svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg">' + (sichtbar ? '<rect x="40" y="40" width="320" height="150" rx="14" fill="#fff" stroke="#e1e8ed" stroke-width="2"/>' + [70, 98, 126, 154].map(function (y, i) { return '<rect x="64" y="' + y + '" width="' + [270, 250, 262, 180][i] + '" height="12" rx="6" fill="#cfd8de"/>'; }).join('') : '') +
          (frage ? '<text x="200" y="70" text-anchor="middle" font-size="18" font-weight="700" font-family="-apple-system,sans-serif">Welche Farbe hat der Hund?</text>' + ['braun', 'schwarz', 'weiß'].map(function (o, i) { return '<rect x="' + (40 + i * 112) + '" y="120" width="100" height="56" rx="12" fill="' + (mark && i === 0 ? '#e2f5ea' : '#fff') + '" stroke="' + (mark && i === 0 ? '#2EAD6B' : '#e1e8ed') + '" stroke-width="2.5"/><text x="' + (90 + i * 112) + '" y="154" text-anchor="middle" font-size="17" font-family="-apple-system,sans-serif">' + o + '</text>'; }).join('') : '') + '</svg>';
      };
      return HT.beispiel(el, [{ svg: t(true), text: 'Geschichte lesen und merken', dauer: 1800 }, { svg: t(false), text: 'Text verschwindet …', dauer: 900 }, { svg: t(false, true), text: 'Frage aus dem Gedächtnis', dauer: 1300 }, { svg: t(false, true, true), zeiger: [22, 50], klick: true, text: 'braun – richtig!', dauer: 1500 }]);
    }
  });
})();

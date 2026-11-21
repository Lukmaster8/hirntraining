/* Modul: Wortfindung und Benennen – Bild benennen durch Auswahl oder Buchstaben-Eingabe, mit Hilfen (erster Buchstabe). */
(function () {
  'use strict';
  var HT = window.HT;
  var levels = HT.stufen(14, function (t, i) { return { modus: i <= 6 ? 'auswahl' : 'buchstaben', optionen: i <= 2 ? 3 : 4, aehnlich: i >= 4 && i <= 6, extraBuchstaben: i <= 9 ? 0 : HT.lerpInt(2, 5, (i - 10) / 4), hilfeNachSek: i <= 10 ? 6 : 12 }; });
  var NUR_BUCHSTABEN = /^[A-Za-zÄÖÜäöüß]{3,11}$/;

  HT.registerModule({
    id: 'wortfindung', name: 'Wortfindung und Benennen', kategorie: 'sprache', symbol: 'buch',
    ziel: 'Gegenstände benennen und Wörter abrufen',
    beschreibung: 'Ein Alltagsgegenstand wird als Bild gezeigt und soll benannt werden. In den unteren Leveln wird der passende Name aus mehreren Wörtern gewählt (ab Level 4 aus derselben Kategorie, z. B. verschiedene Obstsorten). Ab Level 7 wird das Wort aus Buchstaben zusammengesetzt (Tastatur oder Buchstabenkacheln), später mit zusätzlichen Ablenk-Buchstaben. Als Hilfe kann der erste Buchstabe eingeblendet werden.',
    anleitung: 'Wie heißt der abgebildete Gegenstand? Tippen Sie auf das richtige Wort – oder setzen Sie das Wort aus den Buchstaben zusammen (auch per Tastatur). Mit „Hilfe“ sehen Sie den ersten Buchstaben.',
    tasten: [], levels: levels,
    levelLabels: { modus: 'Aufgabe', optionen: 'Antworten', aehnlich: 'Ähnliche Wörter', extraBuchstaben: 'Ablenk-Buchstaben', hilfeNachSek: 'Hilfe nach (s)' },
    create: function (container, ctx) {
      var p = ctx.params, Z = HT.zeit, aus = null, tf = null;
      if (p.modus === 'auswahl') {
        return HT.quiz(container, ctx, {
          aufgabe: function () {
            var b = HT.zufall.wahl(HT.data.bilder);
            var pool = p.aehnlich ? HT.bilderVon(b.kategorie) : HT.data.bilder.filter(function (x) { return x.kategorie !== b.kategorie; });
            var andere = HT.zufall.stichprobe(pool.filter(function (x) { return x.id !== b.id; }), p.optionen - 1);
            return { frage: 'Wie heißt das?', inhalt: '<div class="m-kachel" style="width:240px;height:240px">' + HT.bild(b) + '</div>', optionen: HT.zufall.mischen([b].concat(andere)).map(function (x) { return { html: x.name, wert: x.id }; }), richtig: b.id, reiz: b.name };
          }
        });
      }
      // Buchstaben-Modus
      var zone = HT.m.neu(container, 'm-zentrum');
      var anw = HT.m.neu(zone, 'm-anweisung', 'Wie heißt das? Setzen Sie das Wort zusammen.');
      var bild = HT.m.neu(zone, 'm-kachel', '', { width: '200px', height: '200px', marginBottom: '1rem' });
      var feld = HT.m.neu(zone, 'm-eingabe-anzeige', '', { letterSpacing: '.18em', minWidth: '380px' });
      var kacheln = HT.m.neu(zone, 'm-wahl', '', { maxWidth: '760px' });
      var leiste = HT.m.neu(zone, '', '', { marginTop: '1rem', display: 'flex' });
      var wort = '', eingabe = '', t0 = 0, aktiv = false, hilfeT = null, hilfeGenutzt = false, ziel = null;
      function zeigen() { feld.innerHTML = (eingabe + '<span style="color:var(--linie-2)">' + '_'.repeat(Math.max(0, wort.length - eingabe.length)) + '</span>'); }
      function runde() {
        if (tf) tf.entfernen();
        var kand = HT.data.bilder.filter(function (b) { return NUR_BUCHSTABEN.test(b.name); });
        ziel = HT.zufall.wahl(kand);
        wort = ziel.name.toUpperCase(); eingabe = ''; hilfeGenutzt = false; aktiv = true; t0 = Z.jetzt();
        bild.innerHTML = HT.bild(ziel);
        var buchst = wort.split('');
        var abc = 'ABCDEFGHIJKLMNOPRSTUVWZ';
        for (var i = 0; i < p.extraBuchstaben; i++) buchst.push(abc[HT.zufall.int(0, abc.length - 1)]);
        HT.leeren(kacheln); HT.leeren(leiste);
        var knoepfe = HT.zufall.mischen(buchst).map(function (c) {
          var b = HT.el('button', { type: 'button', class: 'm-wahl-knopf', style: { minWidth: '64px', minHeight: '64px', padding: '0', margin: '6px', fontSize: '1.6rem' } }, c);
          HT.tap(b, function () { if (!b.disabled) tippen(c, b); });
          kacheln.appendChild(b);
          return b;
        });
        tf = HT.tastenFokus(knoepfe, { spalten: Math.min(10, knoepfe.length), ziffern: false, beiWahl: function (i, b) { if (!b.disabled) tippen(b.textContent, b); } });
        leiste.appendChild(HT.ui.knopf('Löschen', { icon: 'links', klick: loeschen }));
        var hilfe = HT.ui.knopf('Hilfe', { icon: 'info', klick: hilfeZeigen });
        hilfe.style.marginLeft = '.6rem';
        leiste.appendChild(hilfe);
        Z.abbrechen(hilfeT);
        hilfeT = Z.nach(p.hilfeNachSek * 1000, function () { if (aktiv && !eingabe) hilfeZeigen(); });
        zeigen();
      }
      function hilfeZeigen() {
        if (!aktiv || hilfeGenutzt) return;
        hilfeGenutzt = true;
        anw.innerHTML = 'Tipp: Das Wort beginnt mit <b>' + wort[0] + '</b> und hat ' + wort.length + ' Buchstaben.';
        ctx.onEvent({ korrekt: true, zaehlt: false, typ: 'hilfe', reiz: ziel.name, reaktion: 'hilfe' });
      }
      function tippen(c, knopf) {
        if (!aktiv) return;
        if (knopf) knopf.disabled = true, knopf.style.opacity = '.35';
        else {
          var frei = HT.$$('button', kacheln).filter(function (b) { return !b.disabled && b.textContent === c; })[0];
          if (!frei) return;
          frei.disabled = true; frei.style.opacity = '.35';
        }
        eingabe += c; ctx.audio.klick(); zeigen();
        if (eingabe.length === wort.length) pruefen();
      }
      function loeschen() {
        if (!aktiv || !eingabe) return;
        var c = eingabe[eingabe.length - 1]; eingabe = eingabe.slice(0, -1);
        var b = HT.$$('button', kacheln).filter(function (x) { return x.disabled && x.textContent === c; })[0];
        if (b) { b.disabled = false; b.style.opacity = '1'; }
        zeigen();
      }
      function pruefen() {
        aktiv = false; Z.abbrechen(hilfeT);
        var ok = eingabe === wort;
        ctx.onEvent({ korrekt: ok, reiz: ziel.name, reaktion: eingabe, rtMs: Z.jetzt() - t0, typ: hilfeGenutzt ? 'mit hilfe' : null });
        ctx.feedback(ok);
        anw.innerHTML = ok ? 'Richtig: <b>' + ziel.artikel + ' ' + ziel.name + '</b>' : 'Richtig wäre: <b>' + ziel.artikel + ' ' + ziel.name + '</b>';
        Z.nach(ok ? 1300 : 2300, function () { anw.innerHTML = 'Wie heißt das? Setzen Sie das Wort zusammen.'; runde(); });
      }
      return {
        start: function () {
          aus = HT.eingabe.an(function (a, d) { if (a === 'buchstabe') tippen(d.wert === 'SS' ? 'ß' : d.wert); if (a === 'loeschen') loeschen(); });
          runde();
        },
        stop: function () { if (aus) aus(); if (tf) tf.entfernen(); }
      };
    },
    preview: function (el) {
      var b = function (mark) {
        var s = '<svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg"><rect x="140" y="15" width="120" height="120" rx="16" fill="#fff" stroke="#e1e8ed" stroke-width="2"/>' + HT.bildGruppe('tasse', 200, 75, 100);
        ['Kanne', 'Tasse', 'Glas'].forEach(function (t, i) { var m = mark && i === 1; s += '<rect x="' + (50 + i * 105) + '" y="190" width="95" height="56" rx="12" fill="' + (m ? '#e2f5ea' : '#fff') + '" stroke="' + (m ? '#2EAD6B' : '#e1e8ed') + '" stroke-width="3"/><text x="' + (97 + i * 105) + '" y="225" text-anchor="middle" font-size="18" font-weight="700" font-family="-apple-system,sans-serif">' + t + '</text>'; });
        return s + '</svg>';
      };
      return HT.beispiel(el, [{ svg: b(false), text: 'Wie heißt das?', dauer: 1500 }, { svg: b(true), zeiger: [50, 73], klick: true, text: 'Die Tasse', dauer: 1600 }]);
    }
  });
})();

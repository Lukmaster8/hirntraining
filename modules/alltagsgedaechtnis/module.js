/* Modul: Alltagsgedächtnis – Einkaufsliste merken und im Regal auswählen; Varianten Termine im Kalender und Namen zu gezeichneten Gesichtern.
 * Level: Anzahl Elemente, Ablenkaufgabe dazwischen. */
(function () {
  'use strict';
  var HT = window.HT;
  var levels = HT.stufen(14, function (t, i) {
    return { anzahl: HT.lerpInt(3, 9, t), lernSekProElement: Math.round(HT.lerp(3, 2, t) * 10) / 10, ablenkung: i >= 6, ablenkSek: i >= 6 ? HT.lerpInt(10, 25, (i - 6) / 8) : 0 };
  });

  HT.registerModule({
    id: 'alltagsgedaechtnis', name: 'Alltagsgedächtnis', kategorie: 'gedaechtnis', symbol: 'kalender',
    ziel: 'Gedächtnis für alltagsnahe Informationen: Einkäufe, Termine, Namen',
    beschreibung: 'Drei alltagsnahe Varianten wechseln sich ab (oder werden fest eingestellt): 1. Einkaufsliste merken und die Artikel anschließend im Supermarktregal auswählen. 2. Termine (Tag, Uhrzeit, Anlass) merken und danach Fragen dazu beantworten. 3. Namen zu gezeichneten Gesichtern lernen und wieder zuordnen. Ab Level 7 gibt es zwischen Lernen und Abruf eine kurze Rechen-Ablenkaufgabe.',
    anleitung: 'Merken Sie sich die gezeigten Informationen gut. Danach werden Sie danach gefragt – wählen Sie die richtigen Antworten aus.',
    tasten: [],
    levels: levels,
    levelLabels: { anzahl: 'Elemente', lernSekProElement: 'Lernzeit je Element (s)', ablenkung: 'Ablenkaufgabe', ablenkSek: 'Dauer Ablenkung (s)' },
    parameterSchema: { variante: { typ: 'auswahl', label: 'Variante', standard: 'wechsel', optionen: [{ wert: 'wechsel', label: 'Abwechselnd' }, { wert: 'einkauf', label: 'Einkaufsliste' }, { wert: 'termine', label: 'Termine' }, { wert: 'namen', label: 'Namen & Gesichter' }] } },
    bewertung: { aufstufenAb: 0.8, abstufenUnter: 0.55 },
    create: function (container, ctx) {
      var p = ctx.params, Z = HT.zeit, tf = null, rundeNr = 0;
      var zone = HT.m.neu(container, 'm-zentrum');
      var anw, inhalt, unten;
      function leer() { if (tf) { tf.entfernen(); tf = null; } HT.leeren(zone); anw = HT.m.neu(zone, 'm-anweisung'); inhalt = HT.m.neu(zone, 'm-lern'); unten = HT.m.neu(zone, '', '', { marginTop: '1.4rem', display: 'flex', alignItems: 'center' }); }
      function lernzeit() { return Math.round(p.anzahl * p.lernSekProElement * 1000); }
      function countdownBalken(ms, fertig) {
        var b = HT.el('div', { class: 'balken', style: { width: '320px' } }, HT.el('div', { style: { width: '100%', transition: 'width ' + ms + 'ms linear' } }));
        unten.appendChild(b);
        requestAnimationFrame(function () { requestAnimationFrame(function () { b.firstChild.style.width = '0%'; }); });
        var knopf = HT.ui.knopf('Fertig gemerkt', { art: 'primaer', klick: function () { Z.abbrechen(t); fertig(); } });
        knopf.style.marginLeft = '1rem';
        unten.appendChild(knopf);
        var t = Z.nach(ms, fertig);
      }
      function ablenken(weiter) {
        if (!p.ablenkung) return weiter();
        leer();
        var ende = Z.jetzt() + p.ablenkSek * 1000;
        anw.innerHTML = 'Zwischendurch rechnen: <b>Ist das Ergebnis richtig?</b>';
        var aufgabe = HT.m.neu(inhalt, 'm-wort');
        var a, b, erg, stimmt;
        var knoepfe = HT.m.wahl(unten, [{ html: '✓ Richtig', wert: true }, { html: '✗ Falsch', wert: false }], function (w) {
          if (!a) return;
          ctx.audio[w === stimmt ? 'klick' : 'falsch']();
          neu();
        });
        tf = unten.querySelector('.m-wahl').tastenFokus;
        function neu() {
          if (Z.jetzt() > ende) { a = null; weiter(); return; }
          a = HT.zufall.int(3, 30); b = HT.zufall.int(2, 20); stimmt = HT.zufall.chance(0.5);
          erg = a + b + (stimmt ? 0 : HT.zufall.wahl([-2, -1, 1, 2, 10]));
          aufgabe.textContent = a + ' + ' + b + ' = ' + erg;
        }
        neu();
      }

      /* ---------- Variante Einkauf ---------- */
      function einkauf() {
        var artikel = HT.zufall.stichprobe(HT.data.artikel, p.anzahl);
        leer();
        anw.innerHTML = 'Ihre <b>Einkaufsliste</b> – bitte merken';
        var zettel = HT.m.neu(inhalt, 'm-karte-text', '', { minWidth: '360px', background: '#fffbea', borderColor: '#f0e2a8', fontFamily: '"Marker Felt", "Comic Sans MS", cursive' });
        zettel.innerHTML = artikel.map(function (a) { return '• ' + HT.bildInfo(a.id).name; }).join('<br>');
        countdownBalken(lernzeit(), function () { ablenken(function () { regal(artikel); }); });
      }
      function regal(artikel) {
        leer();
        anw.innerHTML = 'Wählen Sie im Regal <b>alle Artikel Ihrer Liste</b> aus';
        var ids = artikel.map(function (a) { return a.id; });
        var anz = Math.min(HT.data.artikel.length, Math.max(8, p.anzahl * 2 + 2));
        var auswahl = HT.zufall.mischen(artikel.concat(HT.zufall.stichprobe(HT.data.artikel.filter(function (a) { return ids.indexOf(a.id) < 0; }), anz - p.anzahl)));
        var sp = Math.ceil(auswahl.length / 3);
        var g = Math.min(130, (container.clientWidth - 100) / sp - 14);
        var r = HT.m.neu(inhalt, 'm-raster', '', { gridTemplateColumns: 'repeat(' + sp + ', ' + g + 'px)', gridAutoRows: (g + 26) + 'px', background: 'linear-gradient(#0000 calc(100% - 10px), #c8955a 0) 0 0 / 100% ' + (g + 36) + 'px', padding: '6px' });
        var gewaehlt = 0, t0 = Z.jetzt(), aktiv = true;
        var zellen = auswahl.map(function (a, i) {
          var z = HT.el('div', { class: 'm-zelle', style: { flexDirection: 'column', background: 'var(--karte)' }, html: '<div style="width:70%;height:70%">' + HT.bild(a.id) + '</div><small style="font-size:.75rem;font-weight:600">' + HT.bildInfo(a.id).name + '</small>' });
          HT.tap(z, function () { waehle(i); });
          r.appendChild(z);
          return z;
        });
        var fertigK = HT.ui.knopf('Fertig', { art: 'primaer gross', icon: 'haken', klick: fertig });
        unten.appendChild(fertigK);
        tf = HT.tastenFokus(zellen.concat([fertigK]), { spalten: sp, ziffern: false, beiWahl: function (i) { if (i === zellen.length) fertig(); else waehle(i); } });
        function waehle(i) {
          if (!aktiv || zellen[i].dataset.w) return;
          zellen[i].dataset.w = '1';
          var ok = ids.indexOf(auswahl[i].id) >= 0;
          zellen[i].classList.add(ok ? 'richtig' : 'falsch');
          ctx.onEvent({ korrekt: ok, reiz: 'einkauf', reaktion: auswahl[i].id, rtMs: Z.jetzt() - t0, seite: HT.seiteVon(((i % sp) + 0.5) / sp) });
          ctx.audio[ok ? 'richtig' : 'falsch']();
          t0 = Z.jetzt();
          if (ok && ++gewaehlt === ids.length) fertig();
        }
        function fertig() {
          if (!aktiv) return; aktiv = false;
          auswahl.forEach(function (a, i) { if (ids.indexOf(a.id) >= 0 && !zellen[i].dataset.w) { zellen[i].classList.add('gewaehlt'); ctx.onEvent({ korrekt: false, auslassung: true, reiz: 'einkauf', reaktion: 'vergessen: ' + a.id, seite: HT.seiteVon(((i % sp) + 0.5) / sp) }); } });
          ctx.feedback(gewaehlt === ids.length, null, null, { stumm: true });
          Z.nach(1800, naechste);
        }
      }

      /* ---------- Variante Termine ---------- */
      function termine() {
        var tage = HT.zufall.stichprobe(HT.data.wochentage.slice(0, 6), Math.min(6, p.anzahl));
        var anlaesse = HT.zufall.stichprobe(HT.data.termine, p.anzahl);
        var liste = anlaesse.map(function (a, i) { return { anlass: a, tag: tage[i % tage.length], zeit: HT.pad(HT.zufall.int(8, 17)) + ':' + HT.zufall.wahl(['00', '15', '30', '45']) }; });
        leer();
        anw.innerHTML = 'Ihre <b>Termine</b> diese Woche – bitte merken';
        var t = HT.m.neu(inhalt, 'm-karte-text', '', { minWidth: '420px' });
        t.innerHTML = '<table class="tabelle" style="font-size:1.2rem">' + liste.map(function (x) { return '<tr><td><b>' + x.tag + '</b></td><td>' + x.zeit + ' Uhr</td><td>' + x.anlass + '</td></tr>'; }).join('') + '</table>';
        countdownBalken(lernzeit() + 2000, function () { ablenken(function () { termineFragen(liste); }); });
      }
      function termineFragen(liste) {
        var fragen = HT.zufall.mischen(liste);
        var i = 0;
        leer();
        (function frage() {
          if (tf) { tf.entfernen(); tf = null; }
          if (i >= fragen.length) { naechste(); return; }
          var f = fragen[i++];
          HT.leeren(inhalt); HT.leeren(unten);
          var nachTag = HT.zufall.chance(0.5);
          anw.innerHTML = nachTag ? 'An welchem Tag ist der Termin <b>„' + f.anlass + '“</b>?' : 'Um wie viel Uhr ist <b>„' + f.anlass + '“</b> am ' + f.tag + '?';
          var richtig = nachTag ? f.tag : f.zeit;
          var opts = nachTag ? HT.zufall.stichprobe(HT.zufall.ausser(HT.data.wochentage, [f.tag]), 3) : HT.zufall.stichprobe(liste.filter(function (x) { return x.zeit !== f.zeit; }).map(function (x) { return x.zeit; }).concat(['09:30', '11:00', '14:15', '16:45']).filter(function (z, k, arr) { return z !== f.zeit && arr.indexOf(z) === k; }), 3);
          var alle = HT.zufall.mischen(opts.concat([richtig])).map(function (o) { return { html: nachTag ? o : o + ' Uhr', wert: o }; });
          var t0 = Z.jetzt(), aktiv = true;
          var kn = HT.m.wahl(inhalt, alle, function (w, b) {
            if (!aktiv) return; aktiv = false;
            var ok = w === richtig;
            b.classList.add(ok ? 'richtig' : 'falsch');
            if (!ok) kn.forEach(function (x, k) { if (alle[k].wert === richtig) x.classList.add('richtig'); });
            ctx.onEvent({ korrekt: ok, reiz: f.anlass, reaktion: w, rtMs: Z.jetzt() - t0 });
            ctx.feedback(ok, null, null, { dauer: 350 });
            Z.nach(ok ? 800 : 1500, frage);
          });
          tf = inhalt.querySelector('.m-wahl').tastenFokus;
        })();
      }

      /* ---------- Variante Namen & Gesichter ---------- */
      function namen() {
        var n = Math.min(8, p.anzahl);
        var namen = HT.zufall.stichprobe(HT.data.vornamen, n);
        var personen = namen.map(function (nm, i) { return { name: nm, m: { haut: HT.zufall.int(0, 3), haar: HT.zufall.int(0, 4), frisur: i % 5, brille: HT.zufall.chance(0.35), bart: HT.zufall.chance(0.25), mund: HT.zufall.int(0, 2), shirt: i } }; });
        leer();
        anw.innerHTML = 'Merken Sie sich die <b>Namen</b> zu den Gesichtern';
        personen.forEach(function (pe) { inhalt.appendChild(HT.el('div', { class: 'mitte' }, [HT.el('div', { class: 'm-kachel', html: HT.gesichtSvg(pe.m) }), HT.el('div', { class: 'fett', style: { fontSize: '1.25rem', marginTop: '.4rem' } }, pe.name)])); });
        countdownBalken(lernzeit() + 1500, function () { ablenken(function () { namenFragen(personen); }); });
      }
      function namenFragen(personen) {
        var fragen = HT.zufall.mischen(personen), i = 0;
        leer();
        (function frage() {
          if (tf) { tf.entfernen(); tf = null; }
          if (i >= fragen.length) { naechste(); return; }
          var f = fragen[i++];
          HT.leeren(inhalt);
          anw.innerHTML = 'Wie heißt diese Person?';
          inhalt.appendChild(HT.el('div', { class: 'm-kachel', style: { width: '220px', height: '220px', marginBottom: '1.2rem' }, html: HT.gesichtSvg(f.m) }));
          var andere = HT.zufall.stichprobe(personen.filter(function (x) { return x !== f; }).map(function (x) { return x.name; }).concat(HT.zufall.stichprobe(HT.data.vornamen, 3)).filter(function (x, k, a) { return x !== f.name && a.indexOf(x) === k; }), 3);
          var alle = HT.zufall.mischen(andere.concat([f.name])).map(function (o) { return { html: o, wert: o }; });
          var reihe = HT.el('div', { style: { width: '100%' } }); inhalt.appendChild(reihe);
          var t0 = Z.jetzt(), aktiv = true;
          var kn = HT.m.wahl(reihe, alle, function (w, b) {
            if (!aktiv) return; aktiv = false;
            var ok = w === f.name;
            b.classList.add(ok ? 'richtig' : 'falsch');
            if (!ok) kn.forEach(function (x, k) { if (alle[k].wert === f.name) x.classList.add('richtig'); });
            ctx.onEvent({ korrekt: ok, reiz: f.name, reaktion: w, rtMs: Z.jetzt() - t0 });
            ctx.feedback(ok, null, null, { dauer: 350 });
            Z.nach(ok ? 800 : 1500, frage);
          });
          tf = reihe.querySelector('.m-wahl').tastenFokus;
        })();
      }

      function naechste() {
        var v = p.variante;
        if (v === 'wechsel') v = ['einkauf', 'termine', 'namen'][rundeNr % 3];
        rundeNr++;
        ({ einkauf: einkauf, termine: termine, namen: namen })[v]();
      }
      return { start: function () { naechste(); }, stop: function () { if (tf) tf.entfernen(); } };
    },
    preview: function (el) {
      var zettel = '<svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg"><rect x="130" y="30" width="140" height="190" rx="8" fill="#fffbea" stroke="#f0e2a8" stroke-width="3"/><text x="150" y="80" font-size="22" font-family="Marker Felt,cursive" fill="#1E2A33">• Apfel</text><text x="150" y="120" font-size="22" font-family="Marker Felt,cursive" fill="#1E2A33">• Kerze</text><text x="150" y="160" font-size="22" font-family="Marker Felt,cursive" fill="#1E2A33">• Gurke</text></svg>';
      var regal = function (mark) {
        var ids = ['tomate', 'apfel', 'flasche', 'kerze', 'banane', 'gurke'];
        var s = '<svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg"><rect x="40" y="132" width="320" height="10" fill="#c8955a"/><rect x="40" y="252" width="320" height="10" fill="#c8955a"/>';
        ids.forEach(function (id, i) {
          var x = 90 + (i % 3) * 110, y = 85 + Math.floor(i / 3) * 120;
          if (mark.indexOf(i) >= 0) s += '<rect x="' + (x - 42) + '" y="' + (y - 42) + '" width="84" height="84" rx="12" fill="#e2f5ea" stroke="#2EAD6B" stroke-width="3"/>';
          s += HT.bildGruppe(id, x, y, 70);
        });
        return s + '</svg>';
      };
      return HT.beispiel(el, [
        { svg: zettel, text: 'Einkaufsliste merken', dauer: 1800 },
        { svg: regal([]), text: 'Artikel im Regal finden', dauer: 1000 },
        { svg: regal([1]), zeiger: [50, 28], klick: true, dauer: 900 },
        { svg: regal([1, 3]), zeiger: [22, 68], klick: true, dauer: 900 },
        { svg: regal([1, 3, 5]), zeiger: [77, 68], klick: true, text: 'Alles gefunden!', dauer: 1500 }
      ]);
    }
  });
})();

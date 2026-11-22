/* Modul: Lager und Bestellungen – berufsnahes Arbeiten: Auftrag lesen, im Regal suchen, Mengen abzählen, Regeln beachten.
 * Links der Auftragszettel, in der Mitte das Regal (Fächer mit Etikett, Artikelnummer und Bestand), rechts Korb und Bestandsregel.
 * Level: Auftragsgröße 1 → 6 Positionen, ähnliche Artikelnummern, Mindestbestandsregel (unter 5 → nachbestellen),
 * Ersatzartikel bei Fehlbestand, Zeitvorgabe. */
(function () {
  'use strict';
  var HT = window.HT;

  var levels = HT.stufen(14, function (t, i) {
    return {
      positionen: Math.min(6, 1 + Math.floor((i - 1) / 2.4)),
      faecher: i <= 3 ? 9 : i <= 8 ? 12 : 16,
      aehnlich: i >= 5,
      mindestbestand: i >= 7,
      ersatz: i >= 10,
      zeitSek: i >= 12 ? HT.lerpInt(150, 100, (i - 12) / 2) : 0
    };
  });
  var ART = [
    ['Schrauben M6', 'Karton', '#9aa7b0'], ['Schrauben M8', 'Karton', '#7f8c95'], ['Muttern M6', 'Beutel', '#b0a48a'], ['Dübel 8 mm', 'Beutel', '#d8c9a3'],
    ['Klebeband', 'Rolle', '#e8c547'], ['Kabelbinder', 'Beutel', '#5b6770'], ['Glühbirne', 'Stück', '#f5e27a'], ['Batterien AA', 'Packung', '#3D7BE0'],
    ['Handschuhe', 'Paar', '#2EAD6B'], ['Pinsel', 'Stück', '#c9874e'], ['Farbe weiß', 'Eimer', '#eef2f4'], ['Schleifpapier', 'Bogen', '#d9a35b'],
    ['Nägel 40 mm', 'Karton', '#8f9ba3'], ['Haken', 'Stück', '#6b757c'], ['Seil', 'Rolle', '#c4a26b'], ['Lappen', 'Stück', '#E25C5C'],
    ['Silikon', 'Kartusche', '#bfe0f2'], ['Bohrer 6 mm', 'Stück', '#4a5560'], ['Sicherung', 'Stück', '#E8833A'], ['Folie', 'Rolle', '#cfe9ef']
  ];
  var MEHRZAHL = { Karton: 'Kartons', Rolle: 'Rollen', Packung: 'Packungen', Kartusche: 'Kartuschen', Stück: 'Stück', Beutel: 'Beutel', Paar: 'Paar', Eimer: 'Eimer', Bogen: 'Bogen' };
  function nummer(i, aehnlich) { return aehnlich ? '40' + (20 + (i % 6)) + '-' + (i < 10 ? '0' : '') + i : (1100 + i * 37) + ''; }
  function kiste(farbe) {
    return '<svg viewBox="0 0 60 44" xmlns="http://www.w3.org/2000/svg"><rect x="4" y="10" width="52" height="30" rx="4" fill="' + farbe + '" stroke="#26333c" stroke-width="2.5"/><rect x="4" y="10" width="52" height="8" fill="rgba(255,255,255,.35)"/><rect x="22" y="22" width="16" height="8" rx="2" fill="#fff" stroke="#26333c" stroke-width="1.5"/></svg>';
  }

  HT.registerModule({
    id: 'lager-bestellungen', name: 'Lager und Bestellungen', kategorie: 'exekutiv', symbol: 'stapel',
    ziel: 'Berufsnah arbeiten: Aufträge ausführen, Bestände prüfen, Regeln beachten',
    beschreibung: 'Eine Bestellung kommt („3 Kartons Schrauben M6, 2 Rollen Klebeband“). Im Regal werden die Artikel gesucht, die Menge abgezählt und in den Korb gelegt. Später gilt eine Mindestbestandsregel (unter 5 Stück → Nachbestellung markieren), es gibt ähnliche Artikelnummern und Ersatzartikel bei Fehlbestand. Ausgewertet werden richtige Positionen, Mengenfehler, Regelverstöße und Zeit pro Auftrag.',
    anleitung: 'Lesen Sie den Auftrag links. Wählen Sie im Regal das richtige Fach, stellen Sie die Menge ein und legen Sie die Ware in den Korb. Zum Schluss auf „Auftrag fertig“ tippen.',
    tasten: [], levels: levels, wiederholung: true,
    levelLabels: { positionen: 'Positionen je Auftrag', faecher: 'Regalfächer', aehnlich: 'Ähnliche Artikelnummern', mindestbestand: 'Mindestbestandsregel', ersatz: 'Ersatzartikel', zeitSek: 'Zeitvorgabe (s)' },
    create: function (container, ctx) {
      var p = ctx.params, Z = HT.zeit, aus = [], laeuft = true;
      var wurzel = HT.m.neu(container, 'lg-wurzel');
      var links = HT.m.neu(wurzel, 'lg-auftrag'), mitte = HT.m.neu(wurzel, 'lg-regal-wrap'), rechts = HT.m.neu(wurzel, 'lg-korb');
      var auftrag, regal, korb, gewaehlt = -1, menge = 1, t0 = 0, zeitTimer = null, fokus = null;
      function neuerAuftrag() {
        if (!laeuft) return;
        var idx = HT.zufall.stichprobe(ART.map(function (a, i) { return i; }), p.faecher);
        regal = idx.map(function (i, k) { return { art: ART[i], nr: nummer(i + k, p.aehnlich), bestand: HT.zufall.int(3, 14) }; });
        var posIdx = HT.zufall.stichprobe(regal.map(function (r, i) { return i; }), p.positionen);
        auftrag = posIdx.map(function (ri) { var r = regal[ri]; return { ri: ri, menge: HT.zufall.int(1, Math.max(1, Math.min(5, r.bestand - 1))) }; });
        // Ersatzartikel: eine Position ist nicht vorrätig (Bestand 0), Ersatz steht auf dem Etikett
        if (p.ersatz && auftrag.length > 1) {
          var a0 = auftrag[0], frei = regal.map(function (r, i) { return i; }).filter(function (i) { return !auftrag.some(function (a) { return a.ri === i; }); });
          if (frei.length) { var ers = HT.zufall.wahl(frei); regal[a0.ri].bestand = 0; regal[a0.ri].ersatz = ers; regal[ers].bestand = Math.max(regal[ers].bestand, a0.menge + 2); a0.ersatz = ers; }
        }
        // Mindestbestand: mindestens eine Position fällt unter 5
        if (p.mindestbestand) { var a1 = auftrag[auftrag.length - 1]; if (!a1.ersatz) regal[a1.ri].bestand = a1.menge + HT.zufall.int(1, 3); }
        korb = []; gewaehlt = -1; menge = 1; t0 = Z.jetzt();
        malen();
        if (p.zeitSek) { Z.abbrechen(zeitTimer); zeitTimer = Z.nach(p.zeitSek * 1000, function () { HT.ui.toast('Die Zeit ist um – der Auftrag wird jetzt ausgewertet.', 'info'); abschliessen(true); }); }
      }
      function malen() {
        HT.leeren(links); HT.leeren(mitte); HT.leeren(rechts);
        links.appendChild(HT.el('div', { class: 'lg-kopf' }, 'Auftrag'));
        auftrag.forEach(function (a, k) {
          var r = regal[a.ri];
          links.appendChild(HT.el('div', { class: 'lg-position' }, [HT.el('b', null, a.menge + ' ' + (a.menge > 1 ? (MEHRZAHL[r.art[1]] || r.art[1]) : r.art[1])), HT.el('span', null, r.art[0]), HT.el('small', null, 'Art.-Nr. ' + r.nr)]));
        });
        if (p.mindestbestand) links.appendChild(HT.el('div', { class: 'lg-regel' }, 'Regel: Bleiben nach der Entnahme weniger als 5 Stück im Fach, im Korb „nachbestellen“ ankreuzen.'));
        if (p.ersatz) links.appendChild(HT.el('div', { class: 'lg-regel' }, 'Ist ein Artikel leer, steht auf dem Etikett ein Ersatzartikel. Dann den Ersatz nehmen.'));
        var sp = p.faecher <= 9 ? 3 : 4;
        var raster = HT.el('div', { class: 'lg-regal', style: { gridTemplateColumns: 'repeat(' + sp + ', minmax(0, 1fr))' } });
        var faecher = regal.map(function (r, i) {
          var f = HT.el('button', { type: 'button', class: 'lg-fach' + (i === gewaehlt ? ' aktiv' : '') + (r.bestand === 0 ? ' leer' : ''), html: kiste(r.art[2]) + '<b>' + HT.esc(r.art[0]) + '</b><small>Nr. ' + r.nr + '</small><em>' + (r.bestand === 0 ? 'leer' + (r.ersatz !== undefined ? ' – Ersatz: Nr. ' + regal[r.ersatz].nr : '') : 'Bestand ' + r.bestand) + '</em>' });
          HT.tap(f, function () { waehlen(i); });
          raster.appendChild(f);
          return f;
        });
        mitte.appendChild(raster);
        if (fokus && fokus.entfernen) fokus.entfernen();
        fokus = HT.tastenFokus(faecher, { spalten: sp, beiWahl: function (i) { waehlen(i); } });
        // Menge und Korb
        var mengeBox = HT.el('div', { class: 'lg-menge' });
        if (gewaehlt >= 0) {
          var r = regal[gewaehlt];
          mengeBox.appendChild(HT.el('div', { class: 'lg-gewaehlt' }, r.art[0] + ' (Nr. ' + r.nr + ')'));
          var minus = HT.el('button', { type: 'button', class: 'm-wahl-knopf lg-mk' }, '−'), anz = HT.el('span', { class: 'lg-anzahl' }, String(menge)), plus = HT.el('button', { type: 'button', class: 'm-wahl-knopf lg-mk' }, '+');
          HT.tap(minus, function () { menge = Math.max(1, menge - 1); anz.textContent = menge; });
          HT.tap(plus, function () { menge = Math.min(9, menge + 1); anz.textContent = menge; });
          mengeBox.appendChild(HT.el('div', { class: 'lg-mengenzeile' }, [minus, anz, plus]));
          var rein = HT.el('button', { type: 'button', class: 'knopf primaer voll' }, 'In den Korb legen');
          HT.tap(rein, inDenKorb);
          if (r.bestand === 0) { rein.disabled = true; rein.textContent = 'Fach ist leer'; }
          mengeBox.appendChild(rein);
        } else mengeBox.appendChild(HT.el('div', { class: 'lg-gewaehlt gedimmt' }, 'Bitte ein Fach im Regal wählen.'));
        rechts.appendChild(mengeBox);
        rechts.appendChild(HT.el('div', { class: 'lg-kopf' }, 'Korb'));
        if (!korb.length) rechts.appendChild(HT.el('div', { class: 'gedimmt klein' }, 'noch leer'));
        korb.forEach(function (k, n) {
          var r = regal[k.ri], zeile = HT.el('div', { class: 'lg-korbzeile' });
          zeile.appendChild(HT.el('span', null, k.menge + '× ' + r.art[0]));
          if (p.mindestbestand) {
            var lab = HT.el('label', { class: 'lg-nach' }), cb = HT.el('input', { type: 'checkbox' }); cb.checked = !!k.nachbestellen;
            cb.addEventListener('change', function () { k.nachbestellen = cb.checked; });
            lab.appendChild(cb); lab.appendChild(document.createTextNode(' nachbestellen')); zeile.appendChild(lab);
          }
          var weg = HT.el('button', { type: 'button', class: 'icon-knopf', title: 'Entfernen', html: HT.icon('muell') });
          HT.tap(weg, function () { regal[k.ri].bestand += k.menge; korb.splice(n, 1); malen(); });
          zeile.appendChild(weg);
          rechts.appendChild(zeile);
        });
        var fertig = HT.el('button', { type: 'button', class: 'knopf erfolg voll lg-fertig' }, 'Auftrag fertig');
        HT.tap(fertig, function () { abschliessen(false); });
        rechts.appendChild(fertig);
      }
      function waehlen(i) { gewaehlt = i; menge = 1; malen(); }
      function inDenKorb() {
        if (gewaehlt < 0) return;
        var r = regal[gewaehlt];
        if (r.bestand <= 0) return;
        var m = Math.min(menge, r.bestand);
        var vorh = korb.filter(function (k) { return k.ri === gewaehlt; })[0];
        if (vorh) vorh.menge += m; else korb.push({ ri: gewaehlt, menge: m, nachbestellen: false });
        r.bestand -= m;
        ctx.audio.ton(660, 0.06, 'sine', 0, 0.15);
        gewaehlt = -1; malen();
      }
      function abschliessen(zeitUm) {
        if (!laeuft) return;
        Z.abbrechen(zeitTimer);
        var dauer = Z.jetzt() - t0, fehlerGesamt = 0;
        auftrag.forEach(function (a) {
          var ziel = a.ersatz !== undefined ? a.ersatz : a.ri, r = regal[ziel];
          var k = korb.filter(function (x) { return x.ri === ziel; })[0];
          var ok = !!k && k.menge === a.menge;
          var typ = !k ? (korb.some(function (x) { return x.ri === a.ri; }) ? 'kein_ersatz' : 'position_fehlt') : k.menge !== a.menge ? 'mengenfehler' : 'position';
          if (!ok) fehlerGesamt++;
          ctx.onEvent({ korrekt: ok, auslassung: !k, rtMs: Math.round(dauer / auftrag.length), reiz: a.menge + '× ' + regal[a.ri].art[0], reaktion: k ? k.menge + '× ' + r.art[0] : 'fehlt', typ: typ });
          if (p.mindestbestand && k) {
            var soll = r.bestand < 5;
            if (soll !== !!k.nachbestellen) { fehlerGesamt++; ctx.onEvent({ korrekt: false, reiz: 'Mindestbestand ' + r.art[0], reaktion: k.nachbestellen ? 'nachbestellt' : 'nicht nachbestellt', typ: 'regelverstoss' }); }
            else if (soll) ctx.onEvent({ korrekt: true, reiz: 'Mindestbestand ' + r.art[0], reaktion: 'nachbestellt', typ: 'regel' });
          }
        });
        korb.filter(function (k) { return !auftrag.some(function (a) { return (a.ersatz !== undefined ? a.ersatz : a.ri) === k.ri; }); }).forEach(function (k) {
          fehlerGesamt++; ctx.onEvent({ korrekt: false, reiz: 'nicht bestellt', reaktion: k.menge + '× ' + regal[k.ri].art[0], typ: 'falscher_artikel' });
        });
        ctx.feedback(fehlerGesamt === 0);
        HT.ui.toast(fehlerGesamt === 0 ? 'Auftrag richtig ausgeführt.' : 'Auftrag mit ' + fehlerGesamt + ' Fehler' + (fehlerGesamt > 1 ? 'n' : '') + ' abgeschlossen.', fehlerGesamt === 0 ? 'ok' : 'info');
        Z.nach(zeitUm ? 1800 : 1300, neuerAuftrag);
      }
      return {
        start: function () {
          aus.push(HT.eingabe.an(function (akt, d) {
            if (akt === 'ziffer' && gewaehlt >= 0 && d.wert > 0) { menge = d.wert; malen(); }
            else if (akt === 'ok' && gewaehlt >= 0 && !document.activeElement.classList.contains('lg-fach')) inDenKorb();
          }));
          neuerAuftrag();
        },
        stop: function () { laeuft = false; Z.abbrechen(zeitTimer); if (fokus && fokus.entfernen) fokus.entfernen(); aus.forEach(function (f) { f(); }); }
      };
    },
    preview: function (el) {
      var bild = function (sel, korb) {
        var s = '<svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg"><rect x="10" y="20" width="100" height="130" rx="8" fill="#fffbe6" stroke="#e6d7a0" stroke-width="2"/><text x="60" y="44" text-anchor="middle" font-size="13" font-weight="800" fill="#1E2A33" font-family="-apple-system,sans-serif">Auftrag</text><text x="20" y="72" font-size="12" font-weight="700" fill="#1E2A33" font-family="-apple-system,sans-serif">3 Karton</text><text x="20" y="88" font-size="11" fill="#51606b" font-family="-apple-system,sans-serif">Schrauben M6</text>';
        for (var r = 0; r < 3; r++) for (var c = 0; c < 3; c++) { var k = r * 3 + c, x = 125 + c * 58, y = 20 + r * 62; s += '<rect x="' + x + '" y="' + y + '" width="52" height="56" rx="6" fill="' + (sel && k === 4 ? '#e3f6f8' : '#fff') + '" stroke="' + (sel && k === 4 ? '#1BA8B5' : '#d6e0e6') + '" stroke-width="2"/><rect x="' + (x + 10) + '" y="' + (y + 14) + '" width="32" height="20" rx="3" fill="' + ['#9aa7b0', '#e8c547', '#3D7BE0', '#2EAD6B', '#9aa7b0', '#c9874e', '#E25C5C', '#d8c9a3', '#5b6770'][k] + '"/>'; }
        s += '<rect x="305" y="20" width="85" height="130" rx="8" fill="#fff" stroke="#d6e0e6" stroke-width="2"/><text x="347" y="44" text-anchor="middle" font-size="13" font-weight="800" fill="#1E2A33" font-family="-apple-system,sans-serif">Korb</text>' + (korb ? '<text x="313" y="72" font-size="11" font-weight="700" fill="#2EAD6B" font-family="-apple-system,sans-serif">3× Schrauben</text>' : '');
        return s + '</svg>';
      };
      return HT.beispiel(el, [{ svg: bild(false, false), text: 'Auftrag lesen', dauer: 1400 }, { svg: bild(true, false), zeiger: [52, 38], klick: true, text: 'Fach wählen', dauer: 1300 }, { svg: bild(true, true), text: 'Menge in den Korb', dauer: 1500 }]);
    }
  });
})();

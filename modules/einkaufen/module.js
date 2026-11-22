/* Modul: Einkaufen – Einkaufsliste merken und im Laden die richtigen Waren in den Wagen legen.
 * Level: Anzahl Waren (3–8), Liste sichtbar oder nur gemerkt, Regalgröße, ähnliche Waren, Budgetfrage. */
(function () {
  'use strict';
  var HT = window.HT;
  var levels = HT.stufen(12, function (t, i) {
    return { waren: HT.lerpInt(3, 8, t), listeSichtbar: i <= 2, merkzeitSek: HT.lerpInt(14, 8, t), regal: i <= 4 ? 12 : i <= 8 ? 16 : 20, aehnlich: i >= 6, summeFragen: i >= 9 };
  });
  function euro(v) { return v.toFixed(2).replace('.', ',') + ' €'; }
  HT.registerModule({
    id: 'einkaufen', name: 'Einkaufen', kategorie: 'gedaechtnis', symbol: 'stapel',
    ziel: 'Einen Einkauf planen, die Liste behalten und im Laden umsetzen',
    beschreibung: 'Alltagsnahes Gedächtnis- und Planungstraining. Zuerst wird ein Einkaufszettel gezeigt. In den ersten Leveln bleibt er beim Einkaufen sichtbar, danach muss er auswendig behalten werden. Im Laden werden die Waren aus dem Regal in den Wagen gelegt und mit „Zur Kasse“ abgeschlossen. Später wird das Regal größer, es gibt ähnliche Waren (z. B. Birne/Apfel) und an der Kasse soll der Gesamtbetrag geschätzt werden. Ausgewertet werden richtige Waren, vergessene Waren und falsch gekaufte Waren.',
    anleitung: 'Merken Sie sich den Einkaufszettel. Tippen Sie im Laden die Waren an, die auf dem Zettel stehen – sie kommen in den Wagen (nochmal tippen nimmt sie wieder heraus). Wenn alles im Wagen ist, tippen Sie auf „Zur Kasse“.',
    tasten: [], levels: levels,
    levelLabels: { waren: 'Waren auf dem Zettel', listeSichtbar: 'Zettel bleibt sichtbar', merkzeitSek: 'Merkzeit (s)', regal: 'Waren im Regal', aehnlich: 'Ähnliche Waren', summeFragen: 'Betrag an der Kasse' },
    create: function (container, ctx) {
      var p = ctx.params, Z = HT.zeit, aus = [], timer = null, tf = null;
      var zone = HT.m.neu(container, 'm-zentrum');
      var artikel = HT.data.artikel.filter(function (a) { return HT.bildInfo(a.id); });
      function runde() {
        HT.leeren(zone); if (tf) { tf.entfernen(); tf = null; }
        var liste = HT.zufall.stichprobe(artikel, p.waren);
        var rest = artikel.filter(function (a) { return liste.indexOf(a) < 0; });
        if (p.aehnlich) rest.sort(function (a, b) { var ka = HT.bildInfo(a.id).kategorie, kb = HT.bildInfo(b.id).kategorie; var k = liste.map(function (x) { return HT.bildInfo(x.id).kategorie; }); return (k.indexOf(kb) >= 0) - (k.indexOf(ka) >= 0); });
        else HT.zufall.mischen(rest);
        var regal = HT.zufall.mischen(liste.concat(rest.slice(0, p.regal - liste.length)));
        var zettel = '<div class="ek-liste"><h3>Einkaufszettel</h3>' + liste.map(function (a) { return '☐ ' + HT.esc(HT.bildInfo(a.id).name); }).join('<br>') + '</div>';
        if (p.listeSichtbar) laden(liste, regal, zettel);
        else {
          HT.m.neu(zone, 'm-anweisung', 'Merken Sie sich den Einkaufszettel');
          HT.m.neu(zone, '', zettel);
          var w = HT.el('button', { type: 'button', class: 'knopf primaer gross', style: { marginTop: '1.2rem' } }, 'Gemerkt – zum Laden');
          zone.appendChild(w);
          var weiter = function () { Z.abbrechen(timer); laden(liste, regal, null); };
          HT.tap(w, weiter);
          var ok = HT.eingabe.an(function (a) { if (a === 'ok') { ok(); weiter(); } });
          timer = Z.nach(p.merkzeitSek * 1000, function () { ok(); laden(liste, regal, null); });
        }
      }
      function laden(liste, regal, zettel) {
        HT.leeren(zone);
        var oben = HT.el('div', { style: { display: 'flex', gap: '1.2rem', alignItems: 'flex-start', width: '100%', justifyContent: 'center', flexWrap: 'wrap' } });
        if (zettel) oben.appendChild(HT.el('div', { html: zettel }));
        var r = HT.el('div', { class: 'ek-regal', style: { gridTemplateColumns: 'repeat(' + (container.clientWidth < 600 ? 3 : p.regal <= 12 ? 4 : 5) + ', minmax(0, 1fr))', maxWidth: zettel ? '640px' : '860px' } });
        var wagen = [];
        var elemente = regal.map(function (a) {
          var info = HT.bildInfo(a.id);
          var e = HT.el('div', { class: 'ek-artikel', html: HT.bild(a.id) + '<span>' + HT.esc(info.name) + '</span><span class="preis">' + euro(a.preis) + '</span>' });
          var wahl = function () { var i = wagen.indexOf(a); if (i >= 0) { wagen.splice(i, 1); e.classList.remove('im-wagen'); } else { wagen.push(a); e.classList.add('im-wagen'); ctx.audio.klick(); } zaehler.textContent = '🛒 ' + wagen.length + ' im Wagen'; };
          HT.tap(e, wahl); e._wahl = wahl;
          r.appendChild(e); return e;
        });
        oben.appendChild(r);
        zone.appendChild(oben);
        var leiste = HT.el('div', { class: 'ek-leiste' });
        var zaehler = HT.el('span', { class: 'ek-wagen' }, '🛒 0 im Wagen');
        var kasse = HT.el('button', { type: 'button', class: 'knopf primaer gross' }, 'Zur Kasse');
        leiste.appendChild(zaehler); leiste.appendChild(kasse); zone.appendChild(leiste);
        tf = HT.tastenFokus(elemente, { spalten: container.clientWidth < 600 ? 3 : p.regal <= 12 ? 4 : 5, ziffern: false, beiWahl: function (i, el) { el._wahl(); } });
        var start = Z.jetzt();
        HT.tap(kasse, function () { abrechnen(liste, wagen, elemente, regal, start); });
      }
      function abrechnen(liste, wagen, elemente, regal, start) {
        if (tf) { tf.entfernen(); tf = null; }
        var rt = Z.jetzt() - start, richtig = 0;
        liste.forEach(function (a) {
          var ok = wagen.indexOf(a) >= 0;
          if (ok) richtig++;
          ctx.onEvent({ korrekt: ok, auslassung: !ok, reiz: HT.bildInfo(a.id).name, reaktion: ok ? 'gekauft' : 'vergessen', rtMs: rt / liste.length });
        });
        wagen.forEach(function (a) { if (liste.indexOf(a) < 0) ctx.onEvent({ korrekt: false, reiz: 'nicht auf dem Zettel', reaktion: HT.bildInfo(a.id).name, typ: 'falsch gekauft' }); });
        elemente.forEach(function (e, i) { var a = regal[i]; if (liste.indexOf(a) >= 0) e.style.outline = '3px solid ' + (wagen.indexOf(a) >= 0 ? '#2EAD6B' : '#F2B630'); else if (wagen.indexOf(a) >= 0) e.style.outline = '3px solid #E25C5C'; });
        var falsch = wagen.filter(function (a) { return liste.indexOf(a) < 0; }).length;
        var text = richtig + ' von ' + liste.length + ' Waren richtig' + (falsch ? ', ' + falsch + ' zu viel' : '');
        ctx.feedback(richtig === liste.length && !falsch);
        if (p.summeFragen && wagen.length) {
          var summe = HT.summe(wagen.map(function (a) { return a.preis; }));
          var opts = HT.zufall.mischen([summe, summe + HT.zufall.wahl([1, 2, 3]), Math.max(0.5, summe - HT.zufall.wahl([1, 1.5, 2]))]);
          Z.nach(1500, function () {
            HT.leeren(zone);
            HT.m.neu(zone, 'm-anweisung', text + '<br><b>Was kostet der Einkauf ungefähr?</b>');
            HT.m.wahl(zone, opts.map(function (v) { return { html: euro(v), wert: v }; }), function (v, b) {
              var ok = v === summe; b.classList.add(ok ? 'richtig' : 'falsch');
              ctx.onEvent({ korrekt: ok, reiz: 'summe ' + euro(summe), reaktion: euro(v), typ: 'kasse' });
              ctx.feedback(ok); Z.nach(1300, runde);
            });
          });
        } else {
          HT.m.neu(zone, 'm-anweisung', text, { position: 'absolute', top: '.6rem', left: 0, right: 0 });
          Z.nach(2200, runde);
        }
      }
      return { start: function () { Z.nach(300, runde); }, stop: function () { aus.forEach(function (f) { f(); }); if (tf) tf.entfernen(); } };
    },
    preview: function (el) {
      var regal = ['apfel', 'banane', 'karotte', 'tasse', 'tomate', 'kerze'];
      var b = function (gew, zettel) {
        var s = '<svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg">';
        if (zettel) s += '<rect x="20" y="40" width="120" height="110" rx="10" fill="#fffdf3" stroke="#efe3b8" stroke-width="2"/><text x="34" y="66" font-size="14" font-weight="800" fill="#8a6510" font-family="-apple-system,sans-serif">Zettel</text><text x="34" y="92" font-size="14" font-family="-apple-system,sans-serif">☐ Apfel</text><text x="34" y="114" font-size="14" font-family="-apple-system,sans-serif">☐ Tomate</text>';
        regal.forEach(function (id, i) { var x = 160 + (i % 3) * 78, y = 30 + Math.floor(i / 3) * 110; var g = gew.indexOf(id) >= 0; s += '<rect x="' + x + '" y="' + y + '" width="70" height="96" rx="10" fill="' + (g ? '#e3f6f8' : '#fff') + '" stroke="' + (g ? '#1BA8B5' : '#e1e8ed') + '" stroke-width="2.5"/>' + HT.bildGruppe(id, x + 35, y + 42, 56); });
        return s + '<rect x="250" y="252" width="130" height="36" rx="10" fill="#1BA8B5"/><text x="315" y="275" text-anchor="middle" font-size="15" font-weight="800" fill="#fff" font-family="-apple-system,sans-serif">Zur Kasse</text></svg>';
      };
      return HT.beispiel(el, [
        { svg: b([], true), text: 'Einkaufszettel merken', dauer: 1700 },
        { svg: b(['apfel'], true), zeiger: [49, 26], klick: true, text: 'Apfel in den Wagen', dauer: 1300 },
        { svg: b(['apfel', 'tomate'], true), zeiger: [88, 63], klick: true, text: 'Tomate in den Wagen', dauer: 1300 },
        { svg: b(['apfel', 'tomate'], true), zeiger: [79, 90], klick: true, text: 'Zur Kasse', dauer: 1400 }
      ]);
    }
  });
})();

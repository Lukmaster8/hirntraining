/* Modul: Selektive Aufmerksamkeit – Zielobjekt oben, darunter ein Raster mit 6–40 Objekten, alle Ziele anklicken.
 * Level: Rastergröße, Ähnlichkeit der Ablenker, Zeitlimit. */
(function () {
  'use strict';
  var HT = window.HT;
  var DEF = [[3, 2, 1, 0], [3, 3, 1, 0], [4, 3, 1, 0], [4, 4, 1, 0], [4, 4, 2, 0], [5, 4, 2, 0], [5, 5, 2, 45], [6, 4, 2, 40], [6, 5, 3, 40], [6, 6, 3, 40], [7, 5, 3, 35], [7, 6, 3, 35], [8, 5, 3, 30], [8, 5, 4, 30]];
  var levels = DEF.map(function (d) { return { spalten: d[0], zeilen: d[1], aehnlichkeit: d[2], zeitlimitSek: d[3] || 0, ziele: Math.max(2, Math.round(d[0] * d[1] * 0.22)) }; });
  var FORMEN = ['kreis', 'quadrat', 'dreieck', 'raute', 'stern', 'herz', 'kreuz', 'sechseck', 'mond', 'tropfen'];
  var FARBEN = ['blau', 'rot', 'gruen', 'gelb', 'lila', 'orange'];
  var NAH = { kreis: ['oval', 'ring'], quadrat: ['raute', 'sechseck'], dreieck: ['pfeil', 'tropfen'], stern: ['fuenfeck', 'blitz'], herz: ['tropfen', 'mond'], raute: ['quadrat', 'sechseck'], kreuz: ['stern', 'quadrat'], sechseck: ['fuenfeck', 'kreis'], mond: ['halbkreis', 'tropfen'], tropfen: ['herz', 'oval'] };

  HT.registerModule({
    id: 'selektive-aufmerksamkeit', name: 'Selektive Aufmerksamkeit', kategorie: 'aufmerksamkeit', symbol: 'lupe',
    ziel: 'Gezielt nach Merkmalen suchen und Ablenker ausblenden',
    beschreibung: 'Oben wird ein Zielsymbol gezeigt. Im Raster darunter sind alle Exemplare dieses Ziels zu finden und anzuklicken. Mit steigendem Level wächst das Raster (6 bis 40 Objekte), die Ablenker werden dem Ziel ähnlicher (gleiche Farbe, ähnliche Form, gedreht) und es gilt ein Zeitlimit. Messwerte: Treffer, Fehlklicks, übersehene Ziele (links/rechts).',
    anleitung: 'Oben sehen Sie das gesuchte Symbol. Klicken oder tippen Sie im Feld darunter auf ALLE gleichen Symbole. Wenn Sie alle gefunden haben, tippen Sie auf „Fertig“.',
    tasten: [],
    levels: levels,
    levelLabels: { spalten: 'Spalten', zeilen: 'Zeilen', aehnlichkeit: 'Ähnlichkeit (1–4)', zeitlimitSek: 'Zeitlimit (s, 0 = keins)', ziele: 'Anzahl Ziele' },
    create: function (container, ctx) {
      var p = ctx.params, Z = HT.zeit, aus = [], tf = null, timer = null;
      var oben = HT.m.neu(container, 'm-oben');
      var zone = HT.m.neu(container, 'm-zentrum', '', { paddingTop: '5.5rem' });
      var fertig = HT.el('button', { class: 'knopf primaer gross m-fertig', type: 'button', html: HT.icon('haken') + '<span>Fertig</span>' });
      container.appendChild(fertig);
      var runde = null;
      function ablenker(ziel) {
        var f, fa = HT.zufall.wahl(HT.zufall.ausser(FARBEN, [ziel.farbe]));
        if (p.aehnlichkeit === 1) f = HT.zufall.wahl(HT.zufall.ausser(FORMEN, [ziel.form]));
        else if (p.aehnlichkeit === 2) { f = HT.zufall.wahl(HT.zufall.ausser(FORMEN, [ziel.form])); if (HT.zufall.chance(0.5)) fa = ziel.farbe; }
        else { f = HT.zufall.chance(0.5) ? HT.zufall.wahl(NAH[ziel.form]) : ziel.form; if (f !== ziel.form) fa = HT.zufall.chance(0.6) ? ziel.farbe : fa; }
        if (f === ziel.form && fa === ziel.farbe) fa = HT.zufall.wahl(HT.zufall.ausser(FARBEN, [ziel.farbe]));
        return { form: f, farbe: fa, ziel: false, dreh: p.aehnlichkeit >= 4 ? HT.zufall.wahl([0, 90, 180, 270]) : 0 };
      }
      function neueRunde() {
        if (tf) tf.entfernen();
        Z.abbrechen(timer);
        var ziel = { form: HT.zufall.wahl(FORMEN), farbe: HT.zufall.wahl(FARBEN), ziel: true };
        oben.innerHTML = '<div class="m-anweisung" style="display:inline-flex;align-items:center;margin:0">Suchen Sie alle:&nbsp;<span style="display:inline-block;width:58px;height:58px">' + HT.formSvg(ziel.form, ziel.farbe) + '</span></div>';
        var n = p.spalten * p.zeilen;
        var obj = [];
        for (var i = 0; i < n; i++) obj.push(i < p.ziele ? HT.zusammen(ziel, { dreh: p.aehnlichkeit >= 4 ? HT.zufall.wahl([0, 90, 180, 270]) : 0 }) : ablenker(ziel));
        obj = HT.zufall.mischen(obj);
        HT.leeren(zone);
        var verf = Math.min((container.clientWidth - 80) / p.spalten, (container.clientHeight - 170) / p.zeilen);
        var groesse = Math.max(54, Math.min(120, verf - 10));
        var raster = HT.m.neu(zone, 'm-raster', '', { gridTemplateColumns: 'repeat(' + p.spalten + ', ' + groesse + 'px)', gridAutoRows: groesse + 'px' });
        runde = { obj: obj, gefunden: 0, start: Z.jetzt(), letzte: Z.jetzt(), aktiv: true, zellen: [] };
        obj.forEach(function (o, i) {
          var z = HT.el('div', { class: 'm-zelle', style: { background: 'transparent' }, html: HT.formSvg(o.form, o.farbe, { drehung: o.dreh }) });
          HT.tap(z, function () { klick(i); });
          raster.appendChild(z);
          runde.zellen.push(z);
        });
        tf = HT.tastenFokus(runde.zellen.concat([fertig]), { spalten: p.spalten, ziffern: false, beiWahl: function (i) { if (i === runde.zellen.length) abschliessen(); else klick(i); } });
        if (p.zeitlimitSek) timer = Z.nach(p.zeitlimitSek * 1000, abschliessen);
      }
      function seite(i) { return HT.seiteVon(((i % p.spalten) + 0.5) / p.spalten); }
      function klick(i) {
        if (!runde || !runde.aktiv) return;
        var o = runde.obj[i], z = runde.zellen[i];
        if (o.markiert) return;
        o.markiert = true;
        if (o.ziel) {
          z.classList.add('richtig'); runde.gefunden++;
          ctx.onEvent({ korrekt: true, reiz: o.form, reaktion: 'ziel', rtMs: Z.jetzt() - runde.letzte, seite: seite(i) });
          runde.letzte = Z.jetzt();
          ctx.audio.richtig();
          if (runde.gefunden >= p.ziele) abschliessen();
        } else {
          z.classList.add('falsch');
          ctx.onEvent({ korrekt: false, reiz: o.form + '/' + o.farbe, reaktion: 'ablenker', seite: seite(i) });
          ctx.audio.falsch();
        }
      }
      function abschliessen() {
        if (!runde || !runde.aktiv) return;
        runde.aktiv = false;
        Z.abbrechen(timer);
        runde.obj.forEach(function (o, i) {
          if (o.ziel && !o.markiert) { runde.zellen[i].classList.add('gewaehlt'); ctx.onEvent({ korrekt: false, auslassung: true, reiz: o.form, reaktion: 'übersehen', seite: seite(i) }); }
        });
        ctx.feedback(runde.gefunden >= p.ziele, null, null, { stumm: true });
        Z.nach(1300, neueRunde);
      }
      HT.tap(fertig, abschliessen);
      return { start: function () { neueRunde(); }, stop: function () { if (tf) tf.entfernen(); aus.forEach(function (f) { f(); }); } };
    },
    preview: function (el) {
      var anordnung = ['stern', 'kreis', 'herz', 'stern', 'kreis', 'dreieck', 'herz', 'stern'];
      var farbe = ['blau', 'blau', 'rot', 'blau', 'gruen', 'blau', 'gelb', 'blau'];
      var b = function (gef) {
        var s = '<svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg"><text x="120" y="40" font-size="20" font-family="-apple-system,sans-serif" fill="#51606b" font-weight="600">Suchen:</text><g transform="translate(200 14) scale(.38)">' + HT.form('stern', 'blau') + '</g>';
        anordnung.forEach(function (f, i) {
          var x = 60 + (i % 4) * 75, y = 80 + Math.floor(i / 4) * 95;
          if (gef.indexOf(i) >= 0) s += '<rect x="' + (x - 4) + '" y="' + (y - 4) + '" width="68" height="68" rx="12" fill="#e2f5ea" stroke="#2EAD6B" stroke-width="3"/>';
          s += '<g transform="translate(' + x + ' ' + y + ') scale(.6)">' + HT.form(f, farbe[i]) + '</g>';
        });
        return s + '</svg>';
      };
      return HT.beispiel(el, [
        { svg: b([]), text: 'Alle blauen Sterne finden', dauer: 1200 },
        { svg: b([0]), zeiger: [23, 37], klick: true, dauer: 1000 },
        { svg: b([0, 3]), zeiger: [61, 37], klick: true, dauer: 1000 },
        { svg: b([0, 3, 7]), zeiger: [80, 69], klick: true, text: 'Alle gefunden!', dauer: 1500 }
      ]);
    }
  });
})();

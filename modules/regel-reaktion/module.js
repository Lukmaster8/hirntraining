/* Modul: Reagieren nach Regel – Reaktionskontrolle (Go/No-Go) und flexible Regelanwendung.
 * Alltagsreize (Ampel, Fußgänger, Ball, Bahnübergang, Auto, Fahrrad) erscheinen nacheinander; oben steht die Regel.
 * Level: Tempo 2000 → 700 ms, Anteil No-Go 20 → 45 %, Regelwechsel (aus → selten → häufig), ähnliche Ablenker,
 * ab Level 9 zwei Tasten (links/rechts) je nach Reizart. */
(function () {
  'use strict';
  var HT = window.HT;

  var levels = HT.stufen(14, function (t, i) {
    return {
      fensterMs: HT.lerpInt(2000, 700, t),
      nogoAnteil: Math.round(HT.lerp(0.2, 0.45, t) * 100) / 100,
      wechsel: i <= 4 ? 'aus' : i <= 8 ? 'selten' : 'haeufig',
      aehnlich: i >= 6,
      zweiTasten: i >= 9
    };
  });

  /* Eigene, schlichte Reizbilder (viewBox 0 0 200 200) */
  var L = 'stroke="#26333c" stroke-width="5" stroke-linejoin="round" stroke-linecap="round"';
  var REIZE = {
    ampel_gruen: { name: 'grüne Ampel', svg: '<rect x="70" y="20" width="60" height="150" rx="14" fill="#2b3238" ' + L + '/><circle cx="100" cy="55" r="18" fill="#4a2020"/><circle cx="100" cy="95" r="18" fill="#4a4020"/><circle cx="100" cy="135" r="18" fill="#30d158"/><rect x="94" y="170" width="12" height="25" fill="#6b757c"/>' },
    ampel_rot: { name: 'rote Ampel', svg: '<rect x="70" y="20" width="60" height="150" rx="14" fill="#2b3238" ' + L + '/><circle cx="100" cy="55" r="18" fill="#ff3b30"/><circle cx="100" cy="95" r="18" fill="#4a4020"/><circle cx="100" cy="135" r="18" fill="#1f3a26"/><rect x="94" y="170" width="12" height="25" fill="#6b757c"/>' },
    fussgaenger: { name: 'Fußgänger', svg: '<circle cx="100" cy="42" r="18" fill="#f0c9a0" ' + L + '/><path d="M100 62 L100 120 M100 78 L72 100 M100 78 L128 96 M100 120 L78 172 M100 120 L124 170" fill="none" ' + L + ' stroke-width="12" stroke="#3D7BE0"/>' },
    ball: { name: 'Ball', svg: '<circle cx="100" cy="105" r="62" fill="#E25C5C" ' + L + '/><path d="M38 105 A62 62 0 0 0 162 105 Z" fill="#fff" ' + L + '/><circle cx="100" cy="105" r="14" fill="#fff" ' + L + '/>' },
    bahn: { name: 'Bahnübergang', svg: '<g transform="rotate(35 100 100)"><rect x="18" y="86" width="164" height="28" fill="#fff" ' + L + '/><rect x="40" y="86" width="25" height="28" fill="#d32f2f"/><rect x="90" y="86" width="25" height="28" fill="#d32f2f"/><rect x="140" y="86" width="25" height="28" fill="#d32f2f"/></g><g transform="rotate(-35 100 100)"><rect x="18" y="86" width="164" height="28" fill="#fff" ' + L + '/><rect x="40" y="86" width="25" height="28" fill="#d32f2f"/><rect x="90" y="86" width="25" height="28" fill="#d32f2f"/><rect x="140" y="86" width="25" height="28" fill="#d32f2f"/></g>' },
    auto: { name: 'Auto', svg: '<path d="M30 130 L40 95 Q46 80 62 80 L138 80 Q154 80 160 95 L170 130 Z" fill="#3D7BE0" ' + L + '/><rect x="24" y="125" width="152" height="30" rx="10" fill="#3D7BE0" ' + L + '/><path d="M58 88 L142 88 L150 118 L50 118 Z" fill="#bfe0f2" ' + L + '/><circle cx="60" cy="158" r="16" fill="#26333c"/><circle cx="140" cy="158" r="16" fill="#26333c"/>' },
    fahrrad: { name: 'Fahrrad', svg: '<circle cx="56" cy="130" r="34" fill="none" ' + L + '/><circle cx="146" cy="130" r="34" fill="none" ' + L + '/><path d="M56 130 L90 80 L130 80 L146 130 M90 80 L102 130 L130 80 M84 66 L104 66 M130 80 L124 62 L140 62" fill="none" ' + L + ' stroke="#2EAD6B"/>' },
    kind: { name: 'Kind', svg: '<circle cx="100" cy="64" r="16" fill="#f0c9a0" ' + L + '/><path d="M100 82 L100 128 M100 94 L78 112 M100 94 L122 110 M100 128 L84 170 M100 128 L118 168" fill="none" ' + L + ' stroke-width="11" stroke="#F2C230"/>' }
  };
  /* Regeln: go = reagieren, nogo = nicht reagieren; links/rechts für den Zwei-Tasten-Modus */
  var REGELN = [
    { text: 'Drücken bei <b>grüner Ampel</b>, nicht bei <b>Fußgänger</b>.', go: ['ampel_gruen'], nogo: ['fussgaenger'], aehnlich: ['ampel_rot'] },
    { text: 'Drücken beim <b>Ball</b>, nicht beim <b>Kind</b>.', go: ['ball'], nogo: ['kind'], aehnlich: ['fussgaenger'] },
    { text: 'Drücken beim <b>Auto</b>, nicht beim <b>Bahnübergang</b>.', go: ['auto'], nogo: ['bahn'], aehnlich: ['fahrrad'] },
    { text: 'Drücken bei <b>Fußgänger</b>, nicht bei <b>roter Ampel</b>.', go: ['fussgaenger'], nogo: ['ampel_rot'], aehnlich: ['kind'] }
  ];
  var ZWEI = [
    { text: '<b>Links</b> bei grüner Ampel, <b>rechts</b> beim Ball – nicht bei Fußgänger.', links: ['ampel_gruen'], rechts: ['ball'], nogo: ['fussgaenger'], aehnlich: ['ampel_rot'] },
    { text: '<b>Links</b> beim Auto, <b>rechts</b> beim Fahrrad – nicht beim Bahnübergang.', links: ['auto'], rechts: ['fahrrad'], nogo: ['bahn'], aehnlich: ['kind'] }
  ];
  function svg(id, gr) { return '<svg viewBox="0 0 200 200" width="' + gr + '" height="' + gr + '" xmlns="http://www.w3.org/2000/svg">' + REIZE[id].svg + '</svg>'; }

  HT.registerModule({
    id: 'regel-reaktion', name: 'Reagieren nach Regel', kategorie: 'aufmerksamkeit', symbol: 'schild',
    ziel: 'Reaktionen kontrollieren (Go/No-Go) und Regeln flexibel anwenden',
    beschreibung: 'Alltagsreize erscheinen nacheinander (Ampel, Fußgänger, Ball, Bahnübergang, Auto, Fahrrad). Oben steht die Regel, z. B. „Drücken bei grüner Ampel, nicht bei Fußgänger“. In höheren Leveln wechselt die Regel nach einem Signal (Ton und farbiger Rahmen), ab Level 9 gibt es zwei Tasten je nach Reizart. Trainiert werden Hemmung, Impulskontrolle und kognitive Flexibilität.',
    anleitung: 'Oben steht die Regel. Drücken Sie nur bei dem Bild, das die Regel nennt, und halten Sie sich bei allen anderen zurück. Wechselt der Rahmen die Farbe, gilt eine neue Regel.',
    tasten: ['ok', 'links', 'rechts'], levels: levels,
    levelLabels: { fensterMs: 'Zeitfenster (ms)', nogoAnteil: 'Anteil No-Go', wechsel: 'Regelwechsel', aehnlich: 'Ähnliche Ablenker', zweiTasten: 'Zwei Tasten' },
    create: function (container, ctx) {
      var p = ctx.params, Z = HT.zeit;
      var gr = Math.round(Math.max(200, 30 * (ctx.buehne ? ctx.buehne.einheit : 7)));
      var zone = HT.m.neu(container, 'm-zentrum');
      var karte = HT.m.neu(zone, 'rr-regel');
      var buehne = HT.m.neu(zone, 'rr-buehne', '', { width: (gr + 40) + 'px', height: (gr + 40) + 'px' });
      var knoepfe = HT.m.neu(zone, 'rr-knoepfe');
      var regelListe = p.zweiTasten ? ZWEI : REGELN, rIndex = HT.zufall.int(0, regelListe.length - 1), regel = regelListe[rIndex];
      var aktiv = null, timer = null, seitWechsel = 99, bisWechsel = neuerWechsel(), entfernen = [], farben = ['#1BA8B5', '#E8833A', '#7B61D9', '#2EAD6B'];
      function neuerWechsel() { return p.wechsel === 'aus' ? 1e9 : p.wechsel === 'selten' ? HT.zufall.int(14, 20) : HT.zufall.int(6, 10); }
      function regelZeigen(animiert) {
        karte.innerHTML = regel.text;
        karte.style.borderColor = farben[rIndex % farben.length];
        buehne.style.borderColor = farben[rIndex % farben.length];
        if (animiert) { karte.classList.remove('rr-flip'); void karte.offsetWidth; karte.classList.add('rr-flip'); }
      }
      if (p.zweiTasten) {
        [['links', '◀&nbsp; Links'], ['rechts', 'Rechts &nbsp;▶']].forEach(function (k) {
          var b = HT.el('button', { type: 'button', class: 'm-wahl-knopf', html: k[1] });
          HT.tap(b, function () { reaktion(k[0]); });
          knoepfe.appendChild(b);
        });
      }
      function art(id) {
        if (regel.nogo.indexOf(id) >= 0 || (regel.aehnlich || []).indexOf(id) >= 0) return 'nogo';
        if (p.zweiTasten) return regel.links.indexOf(id) >= 0 ? 'links' : regel.rechts.indexOf(id) >= 0 ? 'rechts' : 'nogo';
        return regel.go.indexOf(id) >= 0 ? 'ok' : 'nogo';
      }
      function naechster() {
        if (--bisWechsel <= 0) {
          var neu; do { neu = HT.zufall.int(0, regelListe.length - 1); } while (neu === rIndex && regelListe.length > 1);
          rIndex = neu; regel = regelListe[rIndex]; bisWechsel = neuerWechsel(); seitWechsel = 0;
          regelZeigen(true); ctx.audio.ton(880, 0.12, 'triangle', 0, 0.25); ctx.audio.ton(1175, 0.15, 'triangle', 0.12, 0.25);
          timer = Z.nach(1300, zeigen); return;
        }
        zeigen();
      }
      function zeigen() {
        var nogo = HT.zufall.chance(p.nogoAnteil), id;
        if (nogo) { var pool = regel.nogo.concat(p.aehnlich ? (regel.aehnlich || []) : []); id = HT.zufall.wahl(pool); }
        else id = HT.zufall.wahl(p.zweiTasten ? regel.links.concat(regel.rechts) : regel.go);
        aktiv = { id: id, soll: art(id), start: Z.jetzt(), nachWechsel: seitWechsel < 3 };
        seitWechsel++;
        buehne.innerHTML = svg(id, gr);
        buehne.classList.add('an');
        timer = Z.nach(p.fensterMs, ende);
      }
      function ende() {
        if (!aktiv) return;
        var a = aktiv; aktiv = null;
        buehne.classList.remove('an'); buehne.innerHTML = '';
        if (a.soll === 'nogo') ctx.onEvent({ korrekt: true, reiz: REIZE[a.id].name, reaktion: 'zurückgehalten', typ: 'hemmung' + (a.nachWechsel ? '_nach_wechsel' : '') });
        else ctx.onEvent({ korrekt: false, auslassung: true, reiz: REIZE[a.id].name, reaktion: 'keine', typ: 'auslassung' + (a.nachWechsel ? '_nach_wechsel' : '') });
        timer = Z.nach(HT.zufall.int(450, 750), naechster);
      }
      function reaktion(taste) {
        if (!aktiv) return;
        var a = aktiv; aktiv = null; Z.abbrechen(timer);
        var rt = Z.jetzt() - a.start, gedrueckt = p.zweiTasten ? taste : 'ok';
        var ok = a.soll !== 'nogo' && a.soll === gedrueckt;
        ctx.onEvent({ korrekt: ok, rtMs: rt, reiz: REIZE[a.id].name, reaktion: gedrueckt, seite: gedrueckt === 'links' || gedrueckt === 'rechts' ? gedrueckt : undefined, typ: (a.soll === 'nogo' ? 'fehlreaktion' : ok ? 'treffer' : 'falsche_taste') + (a.nachWechsel ? '_nach_wechsel' : '') });
        ctx.feedback(ok, null, null, { dauer: 300 });
        if (!ok) ctx.audio.falsch();
        buehne.classList.remove('an'); buehne.innerHTML = '';
        timer = Z.nach(HT.zufall.int(450, 750), naechster);
      }
      HT.tap(buehne, function () { if (!p.zweiTasten) reaktion('ok'); });
      return {
        start: function () {
          regelZeigen(false);
          entfernen.push(HT.eingabe.an(function (akt) {
            if (p.zweiTasten && (akt === 'links' || akt === 'rechts')) reaktion(akt);
            else if (!p.zweiTasten && akt === 'ok') reaktion('ok');
          }));
          timer = Z.nach(1500, zeigen);
        },
        stop: function () { Z.abbrechen(timer); entfernen.forEach(function (f) { f(); }); }
      };
    },
    preview: function (el) {
      var bild = function (id, rahmen) {
        return '<svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg"><rect x="40" y="16" width="320" height="44" rx="12" fill="#fff" stroke="' + rahmen + '" stroke-width="3"/><text x="200" y="45" text-anchor="middle" font-size="16" font-weight="700" fill="#1E2A33" font-family="-apple-system,sans-serif">Drücken bei grüner Ampel</text>' +
          '<rect x="125" y="80" width="150" height="150" rx="20" fill="#fff" stroke="' + rahmen + '" stroke-width="3"/><g transform="translate(130 85) scale(.7)">' + REIZE[id].svg + '</g></svg>';
      };
      return HT.beispiel(el, [
        { svg: bild('ampel_gruen', '#1BA8B5'), zeiger: [50, 52], klick: true, text: 'Grüne Ampel: drücken', dauer: 1400 },
        { svg: bild('fussgaenger', '#1BA8B5'), text: 'Fußgänger: nicht drücken', dauer: 1400 },
        { svg: bild('ampel_gruen', '#1BA8B5'), zeiger: [50, 52], klick: true, text: 'Wieder grün: drücken', dauer: 1200 }
      ]);
    }
  });
})();

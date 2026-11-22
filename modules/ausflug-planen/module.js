/* Modul: Ausflug planen – Planen unter mehreren Bedingungen, Budget und Zeit einhalten.
 * Links Angebotskarten (Öffnungszeit, Eintritt, Dauer, draußen/drinnen, Rückfahrt), rechts eine Zeitleiste 9–19 Uhr.
 * Unten Budgetbalken und Bedingungsliste mit Haken, die live grün werden.
 * Level: Angebote 4 → 10, Bedingungen 2 → 6, Fahrzeiten, unvorhergesehenes Ereignis (Angebot fällt aus → umplanen). */
(function () {
  'use strict';
  var HT = window.HT;

  var levels = HT.stufen(14, function (t, i) {
    return {
      angebote: HT.lerpInt(4, 10, t),
      bedingungen: Math.min(6, 2 + Math.floor((i - 1) / 3)),
      fahrzeit: i >= 6,
      ereignis: i >= 11
    };
  });
  // [name, symbol, von, bis, eintritt €, dauer h, draußen, mittag, rückfahrt min]
  var ANGEBOTE = [
    ['Museum', 'museum', 10, 17, 8, 2, false, false, 30], ['Café am Fluss', 'cafe', 9, 18, 12, 1, false, true, 30], ['Zoo', 'zoo', 9, 18, 15, 3, true, false, 60],
    ['Schifffahrt', 'schiff', 11, 17, 18, 2, true, false, 60], ['Stadtpark', 'park', 9, 19, 0, 1, true, false, 30], ['Gasthaus Linde', 'essen', 11, 15, 16, 1, false, true, 30],
    ['Botanischer Garten', 'blume', 9, 17, 5, 2, true, false, 30], ['Kino', 'kino', 14, 19, 9, 2, false, false, 30], ['Aussichtsturm', 'turm', 10, 18, 4, 1, true, false, 60],
    ['Markthalle', 'markt', 9, 14, 0, 1, false, false, 30], ['Schwimmbad', 'bad', 9, 19, 6, 2, false, false, 30], ['Imbiss am See', 'imbiss', 11, 16, 9, 1, true, true, 60]
  ];
  var SYMB = {
    museum: '<path d="M14 40 L32 28 L50 40 Z M18 42 H46 M20 44 V58 M28 44 V58 M36 44 V58 M44 44 V58 M14 60 H50" fill="none"/>',
    cafe: '<path d="M18 34 H42 V48 Q42 58 30 58 Q18 58 18 48 Z M42 38 Q50 38 50 44 Q50 50 42 50 M24 24 Q22 28 24 30 M32 22 Q30 26 32 30" fill="none"/>',
    zoo: '<circle cx="32" cy="42" r="14" fill="none"/><circle cx="22" cy="28" r="5" fill="none"/><circle cx="42" cy="28" r="5" fill="none"/><circle cx="27" cy="40" r="1.5"/><circle cx="37" cy="40" r="1.5"/><path d="M28 48 Q32 51 36 48" fill="none"/>',
    schiff: '<path d="M12 46 H52 L46 56 H18 Z M22 46 V34 H42 V46 M30 34 V24 L40 30 L30 30" fill="none"/>',
    park: '<circle cx="32" cy="30" r="12" fill="none"/><path d="M32 42 V58 M20 58 H44" fill="none"/>',
    essen: '<path d="M22 22 V58 M18 22 V32 Q22 36 26 32 V22 M40 22 Q48 30 40 40 V58" fill="none"/>',
    blume: '<circle cx="32" cy="30" r="5" fill="none"/><circle cx="32" cy="20" r="6" fill="none"/><circle cx="42" cy="30" r="6" fill="none"/><circle cx="22" cy="30" r="6" fill="none"/><circle cx="32" cy="40" r="6" fill="none"/><path d="M32 46 V58" fill="none"/>',
    kino: '<rect x="14" y="26" width="36" height="26" rx="3" fill="none"/><path d="M14 34 H50 M22 26 V34 M32 26 V34 M42 26 V34" fill="none"/>',
    turm: '<path d="M26 58 L28 26 H36 L38 58 Z M24 26 H40 L32 14 Z M28 40 H36" fill="none"/>',
    markt: '<path d="M14 30 H50 L46 22 H18 Z M16 30 V56 H48 V30 M26 56 V42 H38 V56" fill="none"/>',
    bad: '<path d="M12 48 Q18 44 24 48 Q30 52 36 48 Q42 44 48 48 Q52 50 54 48 M12 56 Q18 52 24 56 Q30 60 36 56 Q42 52 48 56 M22 42 V24 Q22 18 28 18 M38 42 V24" fill="none"/>',
    imbiss: '<path d="M16 40 H48 L44 54 H20 Z M20 40 Q32 26 44 40" fill="none"/>'
  };
  function symbol(id) { return '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><g stroke="#26333c" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" fill="#26333c">' + SYMB[id] + '</g></svg>'; }

  HT.registerModule({
    id: 'ausflug-planen', name: 'Ausflug planen', kategorie: 'exekutiv', symbol: 'kalender',
    ziel: 'Planen unter mehreren Bedingungen, Budget und Zeit einhalten',
    beschreibung: 'Ein Ausflugstag wird geplant: Angebote wie Museum, Café, Zoo oder Schifffahrt haben Öffnungszeiten, Eintritt, Dauer und Fahrzeit. Bedingungen wie Budget, Rückkehr bis 18 Uhr, Mittagessen zwischen 12 und 14 Uhr oder „mindestens ein Programmpunkt draußen“ werden live abgehakt. In hohen Leveln fällt unterwegs ein Angebot aus, und es muss umgeplant werden.',
    anleitung: 'Wählen Sie links ein Angebot und dann rechts eine Uhrzeit. Achten Sie auf die Bedingungen unten – sie werden grün, wenn sie erfüllt sind. Zum Schluss auf „Plan fertig“ tippen.',
    tasten: [], levels: levels,
    levelLabels: { angebote: 'Angebote', bedingungen: 'Bedingungen', fahrzeit: 'Fahrzeiten berücksichtigen', ereignis: 'Unvorhergesehenes Ereignis' },
    create: function (container, ctx) {
      var p = ctx.params, Z = HT.zeit, aus = [], laeuft = true;
      var wurzel = HT.m.neu(container, 'af-wurzel');
      var angebote, plan, bed, budget, gewaehlt = -1, t0 = 0, umplanungen = 0, ereignisDa = false, fokusA = null, fokusZ = null;
      function neuerTag() {
        if (!laeuft) return;
        angebote = HT.zufall.stichprobe(ANGEBOTE, p.angebote).map(function (a) { return a.slice(); }); // Kopien (Ausfall markieren)
        if (!angebote.some(function (a) { return a[7]; })) angebote[0] = ANGEBOTE[1].slice();
        if (!angebote.some(function (a) { return a[6]; })) angebote[angebote.length - 1] = ANGEBOTE[4].slice();
        plan = []; gewaehlt = -1; umplanungen = 0; ereignisDa = false; t0 = Z.jetzt();
        budget = HT.zufall.wahl([25, 30, 35, 40]);
        var alle = [
          { id: 'budget', text: 'Höchstens ' + budget + ' € Eintritt', pruef: function () { return summe() <= budget; } },
          { id: 'rueckkehr', text: 'Zurück zu Hause bis 18 Uhr' + (p.fahrzeit ? ' (mit Rückfahrt)' : ''), pruef: function () { return plan.length > 0 && rueckkehr() <= 18; } },
          { id: 'mittag', text: 'Mittagessen zwischen 12 und 14 Uhr', pruef: function () { return plan.some(function (x) { return angebote[x.a][7] && x.start >= 12 && x.start < 14; }); } },
          { id: 'draussen', text: 'Mindestens ein Programmpunkt draußen', pruef: function () { return plan.some(function (x) { return angebote[x.a][6]; }); } },
          { id: 'drei', text: 'Mindestens drei Programmpunkte', pruef: function () { return plan.length >= 3; } },
          { id: 'frueh', text: 'Der erste Programmpunkt beginnt vor 11 Uhr', pruef: function () { return plan.length > 0 && Math.min.apply(null, plan.map(function (x) { return x.start; })) < 11; } }
        ];
        bed = [alle[0], alle[2]].concat(HT.zufall.mischen([alle[1], alle[3], alle[4], alle[5]])).slice(0, p.bedingungen);
        malen();
      }
      function summe() { return plan.reduce(function (s, x) { return s + angebote[x.a][4]; }, 0); }
      function rueckkehr() {
        if (!plan.length) return 0;
        var letzt = plan.slice().sort(function (a, b) { return (b.start + angebote[b.a][5]) - (a.start + angebote[a.a][5]); })[0];
        return letzt.start + angebote[letzt.a][5] + (p.fahrzeit ? angebote[letzt.a][8] / 60 : 0);
      }
      function belegt(h) { return plan.filter(function (x) { return h >= x.start && h < x.start + angebote[x.a][5]; })[0]; }
      function platzieren(start) {
        if (gewaehlt < 0) { HT.ui.toast('Bitte zuerst links ein Angebot wählen.', 'info'); return; }
        var a = angebote[gewaehlt], ende = start + a[5];
        if (plan.some(function (x) { return x.a === gewaehlt; })) { HT.ui.toast(a[0] + ' ist schon eingeplant.', 'info'); return; }
        if (start < a[2] || ende > a[3]) { ctx.audio.falsch(); HT.ui.toast(a[0] + ' hat nur von ' + a[2] + ' bis ' + a[3] + ' Uhr geöffnet.', 'fehler'); ctx.onEvent({ korrekt: false, zaehlt: false, reiz: a[0], reaktion: start + ' Uhr (geschlossen)', typ: 'oeffnungszeit' }); return; }
        if (ende > 19) { ctx.audio.falsch(); HT.ui.toast('So spät passt ' + a[0] + ' nicht mehr in den Tag.', 'fehler'); return; }
        for (var h = start; h < ende; h++) if (belegt(h)) { ctx.audio.falsch(); HT.ui.toast('Um ' + h + ' Uhr ist schon etwas geplant.', 'fehler'); return; }
        plan.push({ a: gewaehlt, start: start });
        ctx.audio.ton(660, 0.06, 'sine', 0, 0.15);
        gewaehlt = -1; malen();
      }
      function malen() {
        HT.leeren(wurzel);
        var links = HT.el('div', { class: 'af-angebote' });
        links.appendChild(HT.el('div', { class: 'lg-kopf' }, 'Angebote'));
        var karten = angebote.map(function (a, i) {
          var drin = plan.some(function (x) { return x.a === i; });
          var k = HT.el('button', { type: 'button', class: 'af-karte' + (i === gewaehlt ? ' aktiv' : '') + (drin ? ' geplant' : '') + (a.ausgefallen ? ' aus' : ''), html:
            '<span class="af-symbol">' + symbol(a[1]) + '</span><span class="af-text"><b>' + HT.esc(a[0]) + '</b><small>' + a[2] + '–' + a[3] + ' Uhr · ' + a[5] + ' Std. · ' + (a[4] ? a[4] + ' €' : 'frei') + '</small><small>' + (a[6] ? 'draußen' : 'drinnen') + (a[7] ? ' · Essen' : '') + (p.fahrzeit ? ' · Rückfahrt ' + a[8] + ' min' : '') + '</small></span>' });
          if (a.ausgefallen) k.disabled = true;
          HT.tap(k, function () { if (a.ausgefallen) return; if (drin) { plan = plan.filter(function (x) { return x.a !== i; }); malen(); return; } gewaehlt = i; malen(); });
          links.appendChild(k);
          return k;
        });
        wurzel.appendChild(links);
        var mitte = HT.el('div', { class: 'af-zeit' });
        mitte.appendChild(HT.el('div', { class: 'lg-kopf' }, 'Tagesplan'));
        var slots = [];
        for (var h = 9; h < 19; h++) {
          (function (h) {
            var b = belegt(h), s = HT.el('button', { type: 'button', class: 'af-slot' + (b ? ' belegt' : '') });
            s.appendChild(HT.el('span', { class: 'af-uhr' }, h + ':00'));
            if (b && b.start === h) s.appendChild(HT.el('span', { class: 'af-eintrag', style: { height: (angebote[b.a][5] * 100) + '%' } }, angebote[b.a][0] + ' (' + h + '–' + (h + angebote[b.a][5]) + ' Uhr)'));
            HT.tap(s, function () { if (b) { plan = plan.filter(function (x) { return x !== b; }); malen(); } else platzieren(h); });
            mitte.appendChild(s); slots.push(s);
          })(h);
        }
        wurzel.appendChild(mitte);
        var unten = HT.el('div', { class: 'af-unten' });
        var s = summe(), anteil = Math.min(1, s / budget);
        unten.appendChild(HT.el('div', { class: 'af-budget' }, [HT.el('span', null, 'Eintritt: ' + s + ' € von ' + budget + ' €'), HT.el('div', { class: 'af-balken' }, [HT.el('i', { style: { width: (anteil * 100) + '%', background: s > budget ? '#E25C5C' : '#2EAD6B' } })])]));
        var liste = HT.el('div', { class: 'af-bedingungen' });
        bed.forEach(function (b) { var ok = b.pruef(); liste.appendChild(HT.el('div', { class: 'af-bed' + (ok ? ' ok' : '') }, [HT.el('span', { class: 'af-haken', html: ok ? '✓' : '○' }), HT.el('span', null, b.text)])); });
        unten.appendChild(liste);
        var fertig = HT.el('button', { type: 'button', class: 'knopf erfolg' }, 'Plan fertig');
        HT.tap(fertig, abschliessen);
        unten.appendChild(fertig);
        wurzel.appendChild(unten);
        if (fokusA && fokusA.entfernen) fokusA.entfernen();
        if (fokusZ && fokusZ.entfernen) fokusZ.entfernen();
        if (gewaehlt < 0) fokusA = HT.tastenFokus(karten, { beiWahl: function (i) { karten[i].click(); } });
        else fokusZ = HT.tastenFokus(slots, { beiWahl: function (i) { slots[i].click(); } });
      }
      function abschliessen() {
        if (!laeuft) return;
        // unvorhergesehenes Ereignis: ein eingeplantes Angebot draußen fällt aus → umplanen
        if (p.ereignis && !ereignisDa && plan.length) {
          ereignisDa = true;
          var kand = plan.filter(function (x) { return angebote[x.a][6] || angebote[x.a][1] === 'schiff'; });
          if (kand.length) {
            var x = HT.zufall.wahl(kand), a = angebote[x.a];
            a.ausgefallen = true; plan = plan.filter(function (y) { return y !== x; }); umplanungen++;
            HT.ui.hinweis('Planänderung', a[0] + ' fällt heute leider aus (Wetter). Bitte planen Sie um und tippen Sie danach wieder auf „Plan fertig“.');
            malen();
            return;
          }
        }
        var dauer = Z.jetzt() - t0, erfuellt = 0;
        bed.forEach(function (b) { var ok = b.pruef(); if (ok) erfuellt++; ctx.onEvent({ korrekt: ok, rtMs: Math.round(dauer / bed.length), reiz: b.text, reaktion: ok ? 'erfüllt' : 'nicht erfüllt', typ: 'bedingung_' + b.id }); });
        ctx.onEvent({ korrekt: summe() <= budget, zaehlt: false, reiz: 'Budget ' + budget, reaktion: summe() + ' €', typ: 'budgetabweichung', abweichung: summe() - budget, umplanungen: umplanungen, planungszeitMs: dauer });
        ctx.feedback(erfuellt === bed.length);
        HT.ui.toast(erfuellt + ' von ' + bed.length + ' Bedingungen erfüllt.', erfuellt === bed.length ? 'ok' : 'info');
        Z.nach(1600, neuerTag);
      }
      return {
        start: function () { neuerTag(); },
        stop: function () { laeuft = false; if (fokusA && fokusA.entfernen) fokusA.entfernen(); if (fokusZ && fokusZ.entfernen) fokusZ.entfernen(); aus.forEach(function (f) { f(); }); }
      };
    },
    preview: function (el) {
      var bild = function (geplant) {
        var s = '<svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg">';
        ['Museum', 'Café', 'Zoo'].forEach(function (n, i) { s += '<rect x="14" y="' + (20 + i * 62) + '" width="140" height="52" rx="10" fill="' + (geplant && i === 0 ? '#eef3f6' : '#fff') + '" stroke="#d6e0e6" stroke-width="2"/><text x="30" y="' + (52 + i * 62) + '" font-size="15" font-weight="700" fill="#1E2A33" font-family="-apple-system,sans-serif">' + n + '</text>'; });
        for (var h = 0; h < 6; h++) s += '<rect x="180" y="' + (20 + h * 34) + '" width="200" height="30" rx="6" fill="#fff" stroke="#e1e8ed"/><text x="190" y="' + (40 + h * 34) + '" font-size="12" fill="#7d8a94" font-family="-apple-system,sans-serif">' + (9 + h) + ':00</text>';
        if (geplant) s += '<rect x="235" y="54" width="140" height="62" rx="6" fill="#d9f2f4" stroke="#1BA8B5" stroke-width="2"/><text x="245" y="88" font-size="13" font-weight="700" fill="#12808b" font-family="-apple-system,sans-serif">Museum 10–12</text>';
        s += '<text x="20" y="250" font-size="13" fill="' + (geplant ? '#2EAD6B' : '#7d8a94') + '" font-weight="700" font-family="-apple-system,sans-serif">' + (geplant ? '✓' : '○') + ' Programmpunkt am Vormittag</text>';
        return s + '</svg>';
      };
      return HT.beispiel(el, [{ svg: bild(false), zeiger: [20, 15], klick: true, text: 'Angebot wählen', dauer: 1300 }, { svg: bild(false), zeiger: [70, 22], klick: true, text: 'Uhrzeit wählen', dauer: 1100 }, { svg: bild(true), text: 'Bedingung erfüllt', dauer: 1600 }]);
    }
  });
})();

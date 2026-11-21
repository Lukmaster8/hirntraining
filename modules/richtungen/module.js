/* Modul: Richtungen – Pfeile und Figuren: links/rechts/oben/unten bestimmen, in höheren Leveln aus Sicht einer gedrehten Figur. */
(function () {
  'use strict';
  var HT = window.HT;
  var levels = HT.stufen(14, function (t, i) {
    return { aufgabe: i <= 3 ? 'pfeil' : i <= 6 ? 'figur-rueck' : i <= 10 ? 'figur-gemischt' : 'figur-gedreht', zeitlimitSek: HT.lerpInt(8, 3, t), pfeilDrehung: i >= 2 };
  });
  var DREH = { hoch: 0, rechts: 90, runter: 180, links: 270 };

  // Person: von vorne (Gesicht) oder hinten; hebt rechte oder linke Hand (aus Sicht der Person)
  function person(vorne, hand, drehung) {
    // Aus Betrachtersicht: von hinten ist die rechte Hand rechts, von vorne links
    var armRechtsImBild = vorne ? hand === 'links' : hand === 'rechts';
    var arm = function (rechtsImBild, oben) {
      var x = rechtsImBild ? 66 : 34, s = rechtsImBild ? 1 : -1;
      return oben ? '<path d="M' + x + ' 52 L' + (50 + s * 30) + ' 26" stroke="#26333c" stroke-width="9" stroke-linecap="round"/><circle cx="' + (50 + s * 31) + '" cy="23" r="6" fill="#F2D0B5" stroke="#26333c" stroke-width="2.5"/>'
        : '<path d="M' + x + ' 52 L' + (50 + s * 24) + ' 82" stroke="#26333c" stroke-width="9" stroke-linecap="round"/>';
    };
    var kopf = vorne ? '<circle cx="50" cy="30" r="13" fill="#F2D0B5" stroke="#26333c" stroke-width="2.5"/><circle cx="45" cy="29" r="1.8" fill="#26333c"/><circle cx="55" cy="29" r="1.8" fill="#26333c"/><path d="M45 35 Q50 39 55 35" fill="none" stroke="#26333c" stroke-width="2"/><path d="M37 26 C38 14 62 14 63 26 C58 20 42 20 37 26Z" fill="#6b4423"/>'
      : '<circle cx="50" cy="30" r="13" fill="#6b4423" stroke="#26333c" stroke-width="2.5"/>';
    return '<svg viewBox="0 0 100 130" xmlns="http://www.w3.org/2000/svg" width="220" height="286"><g transform="rotate(' + (drehung || 0) + ' 50 65)">' +
      arm(armRechtsImBild, true) + arm(!armRechtsImBild, false) +
      '<path d="M36 46 H64 L62 88 H38 Z" fill="' + (vorne ? '#3D7BE0' : '#2f62b8') + '" stroke="#26333c" stroke-width="2.5" stroke-linejoin="round"/>' +
      '<path d="M42 88 L40 120 M58 88 L60 120" stroke="#26333c" stroke-width="9" stroke-linecap="round"/>' + kopf +
      (vorne ? '' : '<path d="M44 52 V84" stroke="#26333c" stroke-width="1.5" opacity=".5"/>') + '</g></svg>';
  }

  HT.registerModule({
    id: 'richtungen', name: 'Richtungen', kategorie: 'raeumlich', symbol: 'links',
    ziel: 'Links und rechts sicher unterscheiden – auch aus anderer Perspektive',
    beschreibung: 'Zunächst wird die Richtung von Pfeilen bestimmt. Danach heben Figuren eine Hand: Es soll angegeben werden, ob es – aus Sicht der Figur – die linke oder rechte Hand ist. Figuren sind erst von hinten (gleiche Perspektive), dann auch von vorne (gespiegelte Perspektive) und schließlich gedreht zu sehen. Mit steigendem Level verkürzt sich das Zeitlimit.',
    anleitung: 'Bei Pfeilen: Geben Sie an, wohin der Pfeil zeigt. Bei Figuren: Welche Hand hebt die Person – ihre LINKE oder ihre RECHTE? Denken Sie sich in die Person hinein. Antworten Sie mit den Pfeiltasten oder den Knöpfen.',
    tasten: ['links', 'rechts', 'hoch', 'runter'], levels: levels,
    levelLabels: { aufgabe: 'Aufgabe', zeitlimitSek: 'Zeitlimit (s)', pfeilDrehung: 'Auch oben/unten' },
    create: function (container, ctx) {
      var p = ctx.params;
      var lr = [{ html: '◀&nbsp; Links', wert: 'links', taste: 'links' }, { html: 'Rechts &nbsp;▶', wert: 'rechts', taste: 'rechts' }];
      return HT.quiz(container, ctx, {
        aufgabe: function () {
          if (p.aufgabe === 'pfeil') {
            var r = HT.zufall.wahl(p.pfeilDrehung ? ['links', 'rechts', 'hoch', 'runter'] : ['links', 'rechts']);
            var x = HT.zufall.int(-60, 60);
            return {
              frage: 'Wohin zeigt der Pfeil?',
              inhalt: '<svg viewBox="0 0 300 200" width="420" height="280"><g transform="translate(' + (150 + x) + ' 100) rotate(' + DREH[r] + ')"><path d="M0 -70 L52 -10 H22 V70 H-22 V-10 H-52 Z" fill="#1BA8B5" stroke="#26333c" stroke-width="4" stroke-linejoin="round"/></g></svg>',
              optionen: (p.pfeilDrehung ? [{ html: '◀ Links', wert: 'links', taste: 'links' }, { html: '▲ Oben', wert: 'hoch', taste: 'hoch' }, { html: '▼ Unten', wert: 'runter', taste: 'runter' }, { html: 'Rechts ▶', wert: 'rechts', taste: 'rechts' }] : lr),
              richtig: r, reiz: 'pfeil-' + r, zeitMs: p.zeitlimitSek * 1000, seite: r === 'links' || r === 'rechts' ? r : 'mitte'
            };
          }
          var vorne = p.aufgabe === 'figur-rueck' ? false : HT.zufall.chance(0.6);
          var hand = HT.zufall.wahl(['links', 'rechts']);
          var dreh = p.aufgabe === 'figur-gedreht' ? HT.zufall.wahl([90, 180, 270, 45, -45]) : 0;
          return {
            frage: 'Welche Hand hebt die Person – ihre <b>linke</b> oder ihre <b>rechte</b>?' + (vorne ? ' <small class="gedimmt">(Person schaut Sie an)</small>' : ''),
            inhalt: person(vorne, hand, dreh), optionen: lr, richtig: hand, reiz: (vorne ? 'vorne' : 'hinten') + '-' + hand + (dreh ? '-' + dreh : ''), zeitMs: p.zeitlimitSek * 1000 + 2000, seite: hand
          };
        }
      });
    },
    preview: function (el) {
      var b = function (inhalt, mark) {
        return '<svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg"><g transform="translate(150 10) scale(.75)">' + inhalt.replace(/<svg[^>]*>|<\/svg>/g, '') + '</g><rect x="100" y="230" width="90" height="50" rx="12" fill="' + (mark === 'l' ? '#e2f5ea' : '#fff') + '" stroke="' + (mark === 'l' ? '#2EAD6B' : '#e1e8ed') + '" stroke-width="3"/><text x="145" y="262" text-anchor="middle" font-size="18" font-weight="700" font-family="-apple-system,sans-serif">Links</text><rect x="210" y="230" width="90" height="50" rx="12" fill="' + (mark === 'r' ? '#e2f5ea' : '#fff') + '" stroke="' + (mark === 'r' ? '#2EAD6B' : '#e1e8ed') + '" stroke-width="3"/><text x="255" y="262" text-anchor="middle" font-size="18" font-weight="700" font-family="-apple-system,sans-serif">Rechts</text></svg>';
      };
      var p1 = person(false, 'rechts', 0), p2 = person(true, 'rechts', 0);
      return HT.beispiel(el, [
        { svg: b(p1), text: 'Person von hinten', dauer: 1300 }, { svg: b(p1, 'r'), zeiger: [64, 85], klick: true, text: 'Rechte Hand', dauer: 1500 },
        { svg: b(p2), text: 'Person von vorne – hineindenken!', dauer: 1600 }, { svg: b(p2, 'r'), zeiger: [64, 85], klick: true, text: 'Auch die rechte Hand', dauer: 1700 }
      ]);
    }
  });
})();

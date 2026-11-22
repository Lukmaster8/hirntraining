/* Modul: Büroaufgaben – Posteingang bearbeiten: Schreiben lesen und der richtigen Abteilung zuordnen.
 * Alltags- und berufsnahes Training für Lesen, Kategorisieren und Regeln anwenden. */
(function () {
  'use strict';
  var HT = window.HT;
  var ABT = {
    'Buchhaltung': ['Rechnung Nr. 4711 über 238,00 € – zahlbar bis 15. des Monats', 'Mahnung: Die Rechnung vom März ist noch offen', 'Gutschrift für die Rücksendung über 49,90 €', 'Kontoauszug der Sparkasse für Oktober', 'Angebot für Büromaterial – Preisliste anbei'],
    'Personal': ['Bewerbung als Bürokauffrau mit Lebenslauf', 'Krankmeldung von Herrn Schulz für drei Tage', 'Urlaubsantrag von Frau Meier für August', 'Anfrage zu einem Praktikumsplatz im Sommer', 'Kündigung des Arbeitsvertrags zum Monatsende'],
    'Kundendienst': ['Beschwerde: Die gelieferte Lampe ist defekt', 'Frage zur Lieferzeit der Bestellung 2201', 'Bitte um Rückruf wegen einer Reklamation', 'Dank für die freundliche Beratung im Laden', 'Kunde möchte seine Adresse ändern'],
    'Geschäftsleitung': ['Einladung zur Sitzung des Vorstands am Freitag', 'Vertrag mit dem neuen Lieferanten zur Unterschrift', 'Anfrage der Zeitung für ein Interview', 'Jahresplanung für das nächste Jahr', 'Bericht über die Umsätze im dritten Quartal'],
    'Technik': ['Der Drucker im 2. Stock ist ausgefallen', 'Neues Passwort für den Computer beantragt', 'Wartungstermin für die Heizung am Dienstag', 'Das Internet im Lager funktioniert nicht', 'Bestellung von zwei neuen Bildschirmen']
  };
  var EILIG = ['DRINGEND', 'EILT', 'Bitte sofort'];
  var levels = HT.stufen(12, function (t, i) { return { abteilungen: i <= 2 ? 2 : i <= 5 ? 3 : i <= 8 ? 4 : 5, eilregel: i >= 7, zeitlimitSek: i >= 10 ? HT.lerpInt(14, 9, (i - 10) / 2) : 0 }; });
  HT.registerModule({
    id: 'buero', name: 'Büroaufgaben', kategorie: 'exekutiv', symbol: 'dokument',
    ziel: 'Schriftstücke lesen, verstehen und nach Regeln richtig zuordnen',
    beschreibung: 'Berufs- und alltagsnahes Training. Nacheinander kommen Schreiben aus dem Posteingang (Rechnungen, Bewerbungen, Beschwerden, Einladungen, Störungsmeldungen). Jedes Schreiben wird der zuständigen Abteilung zugeordnet. Die Zahl der Abteilungen steigt von 2 auf 5. Ab Level 7 gilt eine Zusatzregel: Schreiben mit dem Vermerk „DRINGEND“ oder „EILT“ gehen immer zuerst an die Geschäftsleitung. Ab Level 10 gibt es ein Zeitlimit. Trainiert werden Leseverständnis, Kategorisieren und das Beachten von Regeln.',
    anleitung: 'Lesen Sie das Schreiben und tippen Sie auf die Abteilung, die dafür zuständig ist. Wenn angezeigt: Alles mit „DRINGEND“ oder „EILT“ geht immer an die Geschäftsleitung.',
    tasten: [], levels: levels,
    levelLabels: { abteilungen: 'Abteilungen', eilregel: 'Regel „Dringend → Geschäftsleitung“', zeitlimitSek: 'Zeitlimit (s)' },
    create: function (container, ctx) {
      var p = ctx.params, abts = null, z = 0, nr = 0;
      var q = HT.quiz(container, ctx, {
        pauseMs: 700,
        aufgabe: function () {
          if (!abts || z++ % 10 === 0) { abts = HT.zufall.stichprobe(Object.keys(ABT), p.abteilungen); if (p.eilregel && abts.indexOf('Geschäftsleitung') < 0) abts[0] = 'Geschäftsleitung'; }
          var abt = HT.zufall.wahl(abts.filter(function (a) { return a !== 'Geschäftsleitung'; }).concat(abts.indexOf('Geschäftsleitung') >= 0 ? ['Geschäftsleitung'] : []));
          var text = HT.zufall.wahl(ABT[abt]), eilig = p.eilregel && abt !== 'Geschäftsleitung' && HT.zufall.chance(0.25);
          var richtig = eilig ? 'Geschäftsleitung' : abt;
          var brief = '<div style="background:#fff;border:1px solid #e1e8ed;border-radius:6px;box-shadow:0 6px 18px rgba(0,0,0,.08);padding:1.1rem 1.4rem;max-width:520px;text-align:left;position:relative;font-size:1.2rem;line-height:1.5">' +
            '<div style="font-size:.8rem;color:#8a97a1;margin-bottom:.4rem">Posteingang · Schreiben ' + (++nr) + '</div>' + (eilig ? '<div style="position:absolute;top:10px;right:12px;color:#d63b3b;font-weight:900;border:3px solid #d63b3b;padding:.1rem .5rem;transform:rotate(6deg);font-size:.95rem">' + HT.zufall.wahl(EILIG) + '</div>' : '') + HT.esc(text) + '</div>';
          return { frage: p.eilregel ? 'An welche Abteilung? <span style="font-size:.85rem;color:var(--text-3)">(Dringendes immer an die Geschäftsleitung)</span>' : 'An welche Abteilung geht dieses Schreiben?', inhalt: brief, optionen: abts.map(function (a) { return { html: a, wert: a }; }), richtig: richtig, reiz: (eilig ? '[eilig] ' : '') + text, zeitMs: p.zeitlimitSek * 1000, typ: eilig ? 'regel' : undefined };
        }
      });
      return q;
    },
    preview: function (el) {
      var b = function (mark) { return '<svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg"><rect x="70" y="20" width="260" height="120" rx="6" fill="#fff" stroke="#e1e8ed" stroke-width="2"/><text x="90" y="56" font-size="15" font-family="-apple-system,sans-serif">Rechnung Nr. 4711 über</text><text x="90" y="80" font-size="15" font-family="-apple-system,sans-serif">238,00 € – zahlbar bis 15.</text>' + ['Buchhaltung', 'Personal', 'Technik'].map(function (a, i) { var k = mark && i === 0; return '<rect x="' + (22 + i * 122) + '" y="190" width="114" height="52" rx="12" fill="' + (k ? '#e2f5ea' : '#fff') + '" stroke="' + (k ? '#2EAD6B' : '#e1e8ed') + '" stroke-width="2.5"/><text x="' + (79 + i * 122) + '" y="222" text-anchor="middle" font-size="15" font-family="-apple-system,sans-serif">' + a + '</text>'; }).join('') + '</svg>'; };
      return HT.beispiel(el, [{ svg: b(false), text: 'Schreiben lesen', dauer: 1600 }, { svg: b(true), zeiger: [20, 72], klick: true, text: 'Rechnung → Buchhaltung', dauer: 1600 }]);
    }
  });
})();

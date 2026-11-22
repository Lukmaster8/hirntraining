/* Hirntraining – Alltagsszenen für „Szenen beobachten“ (eigene SVG-Zeichnungen, viewBox 0 0 800 500).
 * Jede Szene ist ein Baukasten: bauen(z, dauerSek, anzahlEreignisse) liefert
 *   { hintergrund: svg, akteure: [{ svg, keys: [[sek, x, y, deckkraft]] }], ereignisse: [{ t, text }], fragen: [...] }
 * Fragen: { typ: 'detail'|'reihenfolge'|'anzahl', frage, richtig, falsch: [...] }. Max. 25 bewegte Elemente. */
(function () {
  'use strict';
  var HT = window.HT = window.HT || {};
  HT.data = HT.data || {};
  var L = 'stroke="#26333c" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"';
  var FARBEN = [['rot', '#E25C5C'], ['blau', '#3D7BE0'], ['grün', '#2EAD6B'], ['gelb', '#F2C230'], ['lila', '#8A63D2'], ['orange', '#E8833A']];

  function person(mantel, schirm) {
    return '<g>' + (schirm ? '<path d="M-34 -118 Q0 -152 34 -118 Z" fill="' + schirm + '" ' + L + '/><path d="M0 -118 V-70" ' + L + ' fill="none"/>' : '') +
      '<circle cx="0" cy="-92" r="14" fill="#f0c9a0" ' + L + '/><path d="M-18 -76 Q0 -82 18 -76 L22 -20 H-22 Z" fill="' + mantel + '" ' + L + '/><path d="M-10 -20 V0 M10 -20 V0" ' + L + ' fill="none" stroke-width="6"/></g>';
  }
  function bus(farbe) { return '<g><rect x="-150" y="-110" width="300" height="100" rx="14" fill="' + farbe + '" ' + L + '/><rect x="-130" y="-95" width="240" height="40" rx="6" fill="#d8eef7" ' + L + '/><rect x="115" y="-95" width="25" height="75" fill="#bcdcea" ' + L + '/><circle cx="-90" cy="-8" r="16" fill="#26333c"/><circle cx="90" cy="-8" r="16" fill="#26333c"/></g>'; }
  function hund(f) { return '<g><ellipse cx="0" cy="-26" rx="28" ry="14" fill="' + f + '" ' + L + '/><circle cx="30" cy="-40" r="11" fill="' + f + '" ' + L + '/><path d="M-20 -14 V0 M-6 -14 V0 M8 -14 V0 M20 -14 V0 M-28 -30 L-40 -42" ' + L + ' fill="none"/></g>'; }
  function ballon(f) { return '<g><ellipse cx="0" cy="-40" rx="18" ry="22" fill="' + f + '" ' + L + '/><path d="M0 -18 Q-6 0 0 20" ' + L + ' fill="none"/></g>'; }
  function fahrrad(f) { return '<g><circle cx="-26" cy="-18" r="18" fill="none" ' + L + '/><circle cx="26" cy="-18" r="18" fill="none" ' + L + '/><path d="M-26 -18 L-6 -44 H18 L26 -18 M-6 -44 L4 -18 L18 -44" fill="none" ' + L + ' stroke="' + f + '"/></g>'; }
  function katze(f) { return '<g><ellipse cx="0" cy="-20" rx="22" ry="12" fill="' + f + '" ' + L + '/><circle cx="22" cy="-32" r="10" fill="' + f + '" ' + L + '/><path d="M16 -40 L18 -48 L24 -41 M26 -41 L30 -48 L30 -38 M-22 -22 Q-36 -36 -30 -48" ' + L + ' fill="none"/></g>'; }
  function apfel(f) { return '<g><circle cx="0" cy="-12" r="12" fill="' + f + '" ' + L + '/><path d="M0 -24 V-30" ' + L + '/></g>'; }
  function tasche(f) { return '<g><rect x="-16" y="-26" width="32" height="26" rx="4" fill="' + f + '" ' + L + '/><path d="M-8 -26 Q0 -40 8 -26" fill="none" ' + L + '/></g>'; }
  function zeitschrift(f) { return '<g><rect x="-14" y="-38" width="28" height="36" rx="2" fill="' + f + '" ' + L + '/><path d="M-8 -30 H8 M-8 -22 H8" ' + L + '/></g>'; }
  function ampel(gruen) { return '<g><rect x="-14" y="-90" width="28" height="64" rx="6" fill="#2b3238" ' + L + '/><circle cx="0" cy="-74" r="9" fill="' + (gruen ? '#4a2020' : '#ff3b30') + '"/><circle cx="0" cy="-44" r="9" fill="' + (gruen ? '#30d158' : '#1f3a26') + '"/><rect x="-3" y="-26" width="6" height="26" fill="#6b757c"/></g>'; }

  function falscheFarben(richtig, n, z) { return z.stichprobe(FARBEN.filter(function (f) { return f[0] !== richtig; }).map(function (f) { return f[0]; }), n); }
  function zahlenFalsch(n) { var a = [n - 1, n + 1, n + 2, n - 2, n + 3].filter(function (x) { return x >= 0 && x !== n; }); return a; }

  var SZENEN = HT.data.szenen = [
    { id: 'haltestelle', name: 'Bushaltestelle', bauen: function (z, dauer, nEr) {
      var hg = '<rect width="800" height="320" fill="#cfe8f5"/><rect y="320" width="800" height="180" fill="#9aa5ad"/><rect y="300" width="800" height="24" fill="#c9d0d4"/><rect x="40" y="150" width="200" height="150" fill="none" ' + L + '/><rect x="40" y="140" width="200" height="16" fill="#1BA8B5" ' + L + '/><circle cx="300" cy="120" r="22" fill="#F2C230" ' + L + '/><text x="300" y="127" text-anchor="middle" font-size="20" font-weight="800" font-family="sans-serif">H</text><path d="M300 142 V300" ' + L + '/>';
      var anzahl = z.int(3, 5), einsteiger = z.int(1, anzahl - 1), akteure = [], ereignisse = [], fragen = [];
      var leute = [];
      for (var i = 0; i < anzahl; i++) { var m = z.wahl(FARBEN), sch = i === 0 ? z.wahl(FARBEN) : null; leute.push({ m: m, s: sch }); }
      var tBus = dauer * z.zahl(0.45, 0.6);
      leute.forEach(function (l, i) {
        var x = 80 + i * 70, keys = [[0, x, 320, 1]];
        if (i < einsteiger) { keys.push([tBus + 1 + i * 0.8, x, 320, 1]); keys.push([tBus + 1.6 + i * 0.8, 520, 320, 0]); }
        akteure.push({ svg: person(l.m[1], l.s ? l.s[1] : null), keys: keys });
      });
      akteure.push({ svg: bus(z.wahl(['#E8833A', '#3D7BE0', '#2EAD6B'])), keys: [[0, 1000, 410, 1], [tBus - 2, 1000, 410, 1], [tBus, 560, 410, 1], [tBus + 2.5 + einsteiger, 560, 410, 1], [tBus + 5 + einsteiger, -200, 410, 1]] });
      ereignisse.push({ t: tBus, text: 'Der Bus kam' });
      var hundF = z.wahl([['braun', '#9b6a3c'], ['schwarz', '#3a3f45'], ['weiß', '#f1f1f1']]), tHund = dauer * z.zahl(0.12, 0.3);
      akteure.push({ svg: hund(hundF[1]), keys: [[0, -80, 470, 1], [tHund, -80, 470, 1], [tHund + 5, 880, 470, 1]] });
      ereignisse.push({ t: tHund + 2, text: 'Ein Hund lief vorbei' });
      if (nEr >= 3) { var tT = dauer * z.zahl(0.28, 0.42), tf = z.wahl(FARBEN); akteure.push({ svg: tasche(tf[1]), keys: [[0, 0, 0, 0], [tT, 165, 300, 1], [tT + 0.4, 172, 322, 1]] }); ereignisse.push({ t: tT, text: 'Jemand ließ eine Tasche fallen' }); fragen.push({ typ: 'detail', frage: 'Welche Farbe hatte die heruntergefallene Tasche?', richtig: tf[0], falsch: falscheFarben(tf[0], 4, z) }); }
      if (nEr >= 4) { var tR = dauer * z.zahl(0.65, 0.85), rf = z.wahl(FARBEN); akteure.push({ svg: fahrrad(rf[1]), keys: [[0, 900, 455, 1], [tR, 900, 455, 1], [tR + 4, -100, 455, 1]] }); ereignisse.push({ t: tR + 2, text: 'Ein Fahrrad fuhr vorbei' }); }
      fragen.push({ typ: 'detail', frage: 'Welche Farbe hatte der Regenschirm?', richtig: leute[0].s[0], falsch: falscheFarben(leute[0].s[0], 4, z) });
      fragen.push({ typ: 'detail', frage: 'Welche Farbe hatte der Hund?', richtig: hundF[0], falsch: ['braun', 'schwarz', 'weiß', 'grau', 'gefleckt'].filter(function (x) { return x !== hundF[0]; }) });
      fragen.push({ typ: 'anzahl', frage: 'Wie viele Personen stiegen in den Bus ein?', richtig: String(einsteiger), falsch: zahlenFalsch(einsteiger).map(String) });
      fragen.push({ typ: 'anzahl', frage: 'Wie viele Personen warteten am Anfang an der Haltestelle?', richtig: String(anzahl), falsch: zahlenFalsch(anzahl).map(String) });
      return { hintergrund: hg, akteure: akteure, ereignisse: ereignisse, fragen: fragen };
    } },
    { id: 'kueche', name: 'Küche', bauen: function (z, dauer, nEr) {
      var hg = '<rect width="800" height="500" fill="#f6efe2"/><rect y="330" width="800" height="170" fill="#d8c3a0"/><rect x="60" y="230" width="420" height="100" fill="#c9874e" ' + L + '/><rect x="560" y="60" width="160" height="110" rx="8" fill="#cfe8f5" ' + L + '/><path d="M640 60 V170 M560 115 H720" ' + L + '/><circle cx="420" cy="90" r="38" fill="#fff" ' + L + '/><path d="M420 90 V64 M420 90 L440 100" ' + L + '/><ellipse cx="270" cy="228" rx="70" ry="18" fill="#e9eef1" ' + L + '/>';
      var akteure = [], ereignisse = [], fragen = [], aepfel = z.int(2, 6), af = z.wahl([['rot', '#E25C5C'], ['grün', '#7bc96f'], ['gelb', '#F2C230']]);
      for (var i = 0; i < aepfel; i++) { var t = dauer * 0.1 + i * (dauer * 0.5 / aepfel); akteure.push({ svg: apfel(af[1]), keys: [[0, 860, 200, 0], [t, 860, 200, 1], [t + 1.2, 225 + i * 18, 222 - (i % 2) * 8, 1]] }); }
      ereignisse.push({ t: dauer * 0.1, text: 'Äpfel kamen in die Schale' });
      var kf = z.wahl([['grau', '#9aa5ad'], ['rot getigert', '#E8833A'], ['schwarz', '#3a3f45']]), tK = dauer * z.zahl(0.4, 0.7);
      akteure.push({ svg: katze(kf[1]), keys: [[0, -60, 470, 1], [tK, 120, 470, 1], [tK + 1, 160, 230, 1], [tK + 4, 160, 230, 1], [tK + 5, 120, 470, 1], [tK + 8, -60, 470, 1]] });
      ereignisse.push({ t: tK + 1, text: 'Die Katze sprang auf den Tisch' });
      if (nEr >= 3) { var tB = dauer * z.zahl(0.2, 0.35), bf = z.wahl(FARBEN); akteure.push({ svg: ballon(bf[1]), keys: [[0, 640, 140, 0], [tB, 640, 140, 1], [tB + 6, 700, -60, 1]] }); ereignisse.push({ t: tB, text: 'Draußen flog ein Luftballon vorbei' }); fragen.push({ typ: 'detail', frage: 'Welche Farbe hatte der Luftballon draußen?', richtig: bf[0], falsch: falscheFarben(bf[0], 4, z) }); }
      fragen.push({ typ: 'anzahl', frage: 'Wie viele Äpfel kamen in die Schale?', richtig: String(aepfel), falsch: zahlenFalsch(aepfel).map(String) });
      fragen.push({ typ: 'detail', frage: 'Welche Farbe hatten die Äpfel?', richtig: af[0], falsch: ['rot', 'grün', 'gelb', 'braun', 'lila'].filter(function (x) { return x !== af[0]; }) });
      fragen.push({ typ: 'detail', frage: 'Welche Farbe hatte die Katze?', richtig: kf[0], falsch: ['grau', 'rot getigert', 'schwarz', 'weiß', 'braun'].filter(function (x) { return x !== kf[0]; }) });
      return { hintergrund: hg, akteure: akteure, ereignisse: ereignisse, fragen: fragen };
    } },
    { id: 'markt', name: 'Marktplatz', bauen: function (z, dauer, nEr) {
      var hg = '<rect width="800" height="300" fill="#d7ecf7"/><rect y="300" width="800" height="200" fill="#d9cdb6"/>' +
        '<rect x="60" y="170" width="200" height="130" fill="#fff" ' + L + '/><path d="M50 170 L80 130 H240 L270 170 Z" fill="#E25C5C" ' + L + '/><rect x="320" y="170" width="200" height="130" fill="#fff" ' + L + '/><path d="M310 170 L340 130 H500 L530 170 Z" fill="#2EAD6B" ' + L + '/><rect x="580" y="170" width="180" height="130" fill="#fff" ' + L + '/><path d="M570 170 L600 130 H740 L770 170 Z" fill="#3D7BE0" ' + L + '/>' +
        '<text x="160" y="235" text-anchor="middle" font-size="20" font-weight="700" font-family="sans-serif">Obst</text><text x="420" y="235" text-anchor="middle" font-size="20" font-weight="700" font-family="sans-serif">Blumen</text><text x="670" y="235" text-anchor="middle" font-size="20" font-weight="700" font-family="sans-serif">Käse</text>';
      var akteure = [], ereignisse = [], fragen = [], kaeufer = z.int(2, 4), staende = ['Obst', 'Blumen', 'Käse'], ziele = [];
      for (var i = 0; i < kaeufer; i++) {
        var m = z.wahl(FARBEN), st = z.int(0, 2), x = [160, 420, 670][st], t0 = dauer * (0.05 + i * 0.8 / kaeufer);
        ziele.push({ farbe: m[0], stand: staende[st], t: t0 });
        akteure.push({ svg: person(m[1], null), keys: [[0, -60, 440, 1], [t0, -60, 440, 1], [t0 + 3, x, 400, 1], [t0 + 6, x, 400, 1], [t0 + 9, 880, 440, 1]] });
      }
      ereignisse.push({ t: ziele[0].t + 3, text: 'Eine Person in ' + ziele[0].farbe + ' ging zum Stand mit ' + ziele[0].stand });
      var tB = dauer * z.zahl(0.3, 0.7), bf = z.wahl(FARBEN);
      akteure.push({ svg: ballon(bf[1]), keys: [[0, 420, 400, 0], [tB, 420, 400, 1], [tB + 7, 470, -60, 1]] });
      ereignisse.push({ t: tB, text: 'Ein Luftballon flog davon' });
      if (nEr >= 3) { var tR = dauer * z.zahl(0.15, 0.5), rf = z.wahl(FARBEN); akteure.push({ svg: fahrrad(rf[1]), keys: [[0, 900, 480, 1], [tR, 900, 480, 1], [tR + 4, -100, 480, 1]] }); ereignisse.push({ t: tR + 2, text: 'Ein Fahrrad fuhr über den Platz' }); fragen.push({ typ: 'detail', frage: 'Welche Farbe hatte das Fahrrad?', richtig: rf[0], falsch: falscheFarben(rf[0], 4, z) }); }
      fragen.push({ typ: 'detail', frage: 'Welche Farbe hatte der Luftballon?', richtig: bf[0], falsch: falscheFarben(bf[0], 4, z) });
      fragen.push({ typ: 'detail', frage: 'Zu welchem Stand ging die Person in ' + ziele[0].farbe + '?', richtig: ziele[0].stand, falsch: staende.filter(function (s) { return s !== ziele[0].stand; }).concat(['Brot', 'Fisch']) });
      fragen.push({ typ: 'anzahl', frage: 'Wie viele Personen gingen über den Markt?', richtig: String(kaeufer), falsch: zahlenFalsch(kaeufer).map(String) });
      return { hintergrund: hg, akteure: akteure, ereignisse: ereignisse, fragen: fragen };
    } },
    { id: 'wartezimmer', name: 'Wartezimmer', bauen: function (z, dauer, nEr) {
      var hg = '<rect width="800" height="500" fill="#eef4f2"/><rect y="380" width="800" height="120" fill="#cbd5d1"/><rect x="620" y="120" width="120" height="260" fill="#c9a77a" ' + L + '/><circle cx="720" cy="260" r="6" fill="#e8c547"/>' +
        '<rect x="60" y="320" width="460" height="22" rx="6" fill="#7d8a94" ' + L + '/><rect x="250" y="80" width="140" height="90" fill="#fff" ' + L + '/><path d="M270 140 L300 110 L330 135 L350 120 L370 140" fill="none" ' + L + '/>';
      var akteure = [], ereignisse = [], fragen = [], sitzende = z.int(3, 5), aufgerufen = z.int(1, Math.min(2, sitzende - 1));
      for (var i = 0; i < sitzende; i++) {
        var m = z.wahl(FARBEN), x = 100 + i * 90, keys = [[0, x, 340, 1]];
        if (i < aufgerufen) { var t = dauer * (0.35 + i * 0.25); keys.push([t, x, 340, 1]); keys.push([t + 3, 680, 380, 1]); keys.push([t + 3.6, 680, 380, 0]); ereignisse.push({ t: t, text: i === 0 ? 'Die erste Person wurde aufgerufen' : 'Eine zweite Person wurde aufgerufen' }); }
        akteure.push({ svg: person(m[1], null), keys: keys });
      }
      var zf = z.wahl(FARBEN), tZ = dauer * z.zahl(0.1, 0.25);
      akteure.push({ svg: zeitschrift(zf[1]), keys: [[0, 560, 330, 1], [tZ, 560, 330, 1], [tZ + 1.5, 300, 300, 1], [dauer, 300, 300, 1]] });
      ereignisse.push({ t: tZ, text: 'Jemand nahm eine Zeitschrift' });
      if (nEr >= 3) { var tH = dauer * z.zahl(0.5, 0.8); akteure.push({ svg: hund('#9b6a3c'), keys: [[0, 680, 380, 0], [tH, 680, 380, 1], [tH + 4, 420, 470, 1], [dauer, 420, 470, 1]] }); ereignisse.push({ t: tH, text: 'Ein Hund kam herein' }); }
      fragen.push({ typ: 'detail', frage: 'Welche Farbe hatte die Zeitschrift?', richtig: zf[0], falsch: falscheFarben(zf[0], 4, z) });
      fragen.push({ typ: 'anzahl', frage: 'Wie viele Personen wurden aufgerufen?', richtig: String(aufgerufen), falsch: zahlenFalsch(aufgerufen).map(String) });
      fragen.push({ typ: 'anzahl', frage: 'Wie viele Personen saßen am Anfang im Wartezimmer?', richtig: String(sitzende), falsch: zahlenFalsch(sitzende).map(String) });
      return { hintergrund: hg, akteure: akteure, ereignisse: ereignisse, fragen: fragen };
    } }
  ];
  // Reihenfolge-Fragen aus den Ereignissen ableiten (zwei Ereignisse mit deutlichem Zeitabstand)
  HT.data.szenenReihenfolge = function (ereignisse, z) {
    var e = ereignisse.slice().sort(function (a, b) { return a.t - b.t; });
    if (e.length < 2) return null;
    for (var v = 0; v < 10; v++) {
      var a = z.int(0, e.length - 2), b = z.int(a + 1, e.length - 1);
      if (e[b].t - e[a].t >= 2) return { typ: 'reihenfolge', frage: 'Was geschah zuerst?', richtig: e[a].text, falsch: [e[b].text].concat(e.filter(function (x, k) { return k !== a && k !== b; }).map(function (x) { return x.text; })) };
    }
    return null;
  };
})();

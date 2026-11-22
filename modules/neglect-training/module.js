/* Modul: Neglect-Training – Suchszene mit roter Ankerlinie am vernachlässigten Rand, Hinweiston von der betroffenen Seite
 * (Stereo), Ziele häufiger auf der vernachlässigten Seite. Der Anker wird mit steigendem Level schwächer. Seite aus der Patientenakte. */
(function () {
  'use strict';
  var HT = window.HT;
  var levels = HT.stufen(14, function (t, i) {
    return { ziele: HT.lerpInt(4, 10, t), ablenker: HT.lerpInt(4, 34, t), groesse: HT.lerpInt(96, 58, t), ankerStaerke: Math.round(Math.max(0, HT.lerp(1, -0.1, t)) * 100) / 100, seitenGewicht: Math.round(HT.lerp(0.75, 0.55, t) * 100) / 100, hinweisTon: i <= 10 };
  });
  HT.registerModule({
    id: 'neglect-training', name: 'Neglect-Training', kategorie: 'wahrnehmung', symbol: 'auge',
    ziel: 'Aufmerksamkeit gezielt auf die vernachlässigte Raumhälfte lenken',
    beschreibung: 'Explorationstraining mit Ankerreizen nach dem Prinzip „erst zum Anker, dann absuchen“: Eine rote Linie markiert den Rand der vernachlässigten Seite, ein Hinweiston erklingt von dieser Seite (Stereo, Kopfhörer empfohlen), und Ziele liegen dort häufiger. Mit steigendem Level verblasst der Anker, die Seitenbetonung nimmt ab und der Hinweiston entfällt. Die betroffene Seite wird aus der Patientenakte übernommen.',
    anleitung: 'Schauen Sie zuerst zur roten Linie am Rand. Beginnen Sie dort und suchen Sie dann Zeile für Zeile den ganzen Bildschirm nach den gesuchten Objekten ab. Tippen Sie jedes an.',
    tasten: [], levels: levels,
    levelLabels: { ziele: 'Ziele', ablenker: 'Ablenker', groesse: 'Größe (px)', ankerStaerke: 'Ankerstärke', seitenGewicht: 'Anteil Ziele vernachl. Seite', hinweisTon: 'Hinweiston' },
    parameterSchema: { seite: { typ: 'auswahl', label: 'Vernachlässigte Seite', standard: 'patient', optionen: [{ wert: 'patient', label: 'Aus Patientenakte' }, { wert: 'links', label: 'Links' }, { wert: 'rechts', label: 'Rechts' }] } },
    create: function (container, ctx) {
      var p = ctx.params;
      var pat = ctx.patient || {};
      var seite = p.seite === 'patient' ? (pat.betroffeneSeite === 'rechts' ? 'rechts' : 'links') : p.seite;
      return HT.suchSzene(container, ctx, { ziele: p.ziele, ablenker: p.ablenker, groesse: p.groesse, seitenGewicht: p.seitenGewicht, betonteSeite: seite, anker: { seite: seite, staerke: p.ankerStaerke }, hinweisTon: p.hinweisTon });
    },
    preview: function (el) { return HT.suchVorschau(el, true); }
  });
})();

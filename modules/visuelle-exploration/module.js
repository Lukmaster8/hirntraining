/* Modul: Visuelle Exploration – großflächige Szene mit Zielen, systematisch absuchen und alle finden.
 * Level: Anzahl Ziele und Ablenker, Größe, Kontrast. Messwerte: Treffer links/rechts, Suchzeit je Hälfte (Rohdaten). */
(function () {
  'use strict';
  var HT = window.HT;
  var levels = HT.stufen(14, function (t) {
    return { ziele: HT.lerpInt(4, 12, t), ablenker: HT.lerpInt(6, 44, t), groesse: HT.lerpInt(92, 52, t), kontrast: Math.round(HT.lerp(1, 0.55, Math.max(0, t - 0.4) / 0.6) * 100) / 100, zeitlimitSek: t > 0.5 ? HT.lerpInt(90, 60, (t - 0.5) * 2) : 0 };
  });
  HT.registerModule({
    id: 'visuelle-exploration', name: 'Visuelle Exploration', kategorie: 'wahrnehmung', symbol: 'lupe',
    ziel: 'Den ganzen Bildschirm systematisch und vollständig absuchen',
    beschreibung: 'Auf der gesamten Bildschirmfläche sind Zielobjekte zwischen Ablenkern verteilt. Alle Ziele sollen gefunden werden. Nach jeder Runde wird der eigene Suchweg nummeriert angezeigt – so kann eine systematische Suchstrategie (z. B. zeilenweise von links nach rechts) besprochen werden. Level: Anzahl Ziele/Ablenker, Größe, Kontrast, Zeitlimit.',
    anleitung: 'Oben sehen Sie, was Sie suchen. Suchen Sie den ganzen Bildschirm in Ruhe ab – am besten Zeile für Zeile von links nach rechts – und tippen Sie jedes gesuchte Objekt an. Danach auf „Fertig“.',
    tasten: [], levels: levels,
    levelLabels: { ziele: 'Ziele', ablenker: 'Ablenker', groesse: 'Größe (px)', kontrast: 'Kontrast', zeitlimitSek: 'Zeitlimit (s)' },
    create: function (container, ctx) {
      var p = ctx.params;
      return HT.suchSzene(container, ctx, { ziele: p.ziele, ablenker: p.ablenker, groesse: p.groesse, kontrast: p.kontrast, zeitlimitSek: p.zeitlimitSek, seitenGewicht: 0.5 });
    },
    preview: function (el) { return HT.suchVorschau(el, false); }
  });
})();

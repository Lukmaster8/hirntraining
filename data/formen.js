/* Hirntraining – geometrische Symbole und Farben (SVG, viewBox 0 0 100 100) */
(function () {
  'use strict';
  var HT = window.HT = window.HT || {};
  HT.data = HT.data || {};

  var FARBEN = HT.data.farben = [
    { id: 'rot', name: 'Rot', wert: '#E25C5C' }, { id: 'blau', name: 'Blau', wert: '#3D7BE0' },
    { id: 'gruen', name: 'Grün', wert: '#2EAD6B' }, { id: 'gelb', name: 'Gelb', wert: '#F2B630' },
    { id: 'lila', name: 'Lila', wert: '#8A63D2' }, { id: 'orange', name: 'Orange', wert: '#EE8A3A' },
    { id: 'tuerkis', name: 'Türkis', wert: '#1BA8B5' }, { id: 'pink', name: 'Pink', wert: '#E0619E' }
  ];
  HT.data.farbe = function (id) { for (var i = 0; i < FARBEN.length; i++) if (FARBEN[i].id === id) return FARBEN[i]; return FARBEN[0]; };

  /* Pfade der Formen. Jede Form passt in 10..90 */
  var P = {
    kreis: '<circle cx="50" cy="50" r="38"/>',
    quadrat: '<rect x="14" y="14" width="72" height="72" rx="8"/>',
    dreieck: '<path d="M50 10 L90 84 L10 84 Z" stroke-linejoin="round"/>',
    raute: '<path d="M50 8 L90 50 L50 92 L10 50 Z"/>',
    stern: '<path d="M50 7 L61 37 L93 38 L68 58 L77 90 L50 72 L23 90 L32 58 L7 38 L39 37 Z" stroke-linejoin="round"/>',
    herz: '<path d="M50 86 C20 64 8 46 14 30 C20 14 42 12 50 30 C58 12 80 14 86 30 C92 46 80 64 50 86 Z"/>',
    kreuz: '<path d="M37 10 H63 V37 H90 V63 H63 V90 H37 V63 H10 V37 H37 Z"/>',
    sechseck: '<path d="M50 8 L87 29 L87 71 L50 92 L13 71 L13 29 Z"/>',
    mond: '<path d="M64 10 A40 40 0 1 0 90 66 A32 32 0 1 1 64 10 Z"/>',
    pfeil: '<path d="M10 38 H56 V18 L92 50 L56 82 V62 H10 Z"/>',
    tropfen: '<path d="M50 8 C66 32 80 46 80 62 A30 30 0 0 1 20 62 C20 46 34 32 50 8 Z"/>',
    blitz: '<path d="M58 6 L20 56 H46 L38 94 L80 40 H54 Z" stroke-linejoin="round"/>',
    fuenfeck: '<path d="M50 8 L91 38 L75 88 L25 88 L9 38 Z"/>',
    ring: '<path fill-rule="evenodd" d="M50 10 A40 40 0 1 1 49.9 10 Z M50 30 A20 20 0 1 0 50.1 30 Z"/>',
    halbkreis: '<path d="M10 64 A40 40 0 0 1 90 64 Z"/>',
    oval: '<ellipse cx="50" cy="50" rx="40" ry="26"/>'
  };
  HT.data.formNamen = { kreis: 'Kreis', quadrat: 'Quadrat', dreieck: 'Dreieck', raute: 'Raute', stern: 'Stern', herz: 'Herz', kreuz: 'Kreuz', sechseck: 'Sechseck', mond: 'Mond', pfeil: 'Pfeil', tropfen: 'Tropfen', blitz: 'Blitz', fuenfeck: 'Fünfeck', ring: 'Ring', halbkreis: 'Halbkreis', oval: 'Oval' };
  HT.data.formen = Object.keys(P);

  /* SVG-Inhalt einer Form (ohne <svg>) */
  HT.form = function (name, farbe, opt) {
    opt = opt || {};
    var f = farbe && farbe.charAt(0) !== '#' ? HT.data.farbe(farbe).wert : (farbe || '#1BA8B5');
    var stil = opt.umriss ? 'fill="none" stroke="' + f + '" stroke-width="' + (opt.strich || 6) + '"' : 'fill="' + f + '" stroke="rgba(0,0,0,.12)" stroke-width="2"';
    var tr = '';
    if (opt.drehung || opt.skala || opt.spiegeln) {
      tr = ' transform="translate(50 50)' + (opt.drehung ? ' rotate(' + opt.drehung + ')' : '') + (opt.skala ? ' scale(' + opt.skala + ')' : '') + (opt.spiegeln ? ' scale(-1 1)' : '') + ' translate(-50 -50)"';
    }
    return '<g ' + stil + tr + '>' + P[name] + '</g>';
  };
  /* Komplettes SVG einer Form */
  HT.formSvg = function (name, farbe, opt) { return HT.svgVon(HT.form(name, farbe, opt), '0 0 100 100'); };
})();

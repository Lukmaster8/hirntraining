/* Hirntraining – eigene Kategorie-Illustrationen (flach, je eine Kategoriefarbe, 2–3 Formen, freundlich).
 * HT.illustration(kategorieId) → <svg> (viewBox 0 0 120 120). Neu gezeichnet, keine fremden Vorlagen. */
(function () {
  'use strict';
  var HT = window.HT = window.HT || {};
  function hell(f) { return f + '33'; }
  var I = {
    aufmerksamkeit: function (f) { return '<circle cx="60" cy="60" r="50" fill="' + hell(f) + '"/><path d="M18 60 Q60 18 102 60 Q60 102 18 60 Z" fill="#fff" stroke="' + f + '" stroke-width="5"/><circle cx="60" cy="60" r="18" fill="' + f + '"/><circle cx="66" cy="54" r="6" fill="#fff"/>'; },
    gedaechtnis: function (f) { return '<circle cx="60" cy="60" r="50" fill="' + hell(f) + '"/><rect x="26" y="34" width="34" height="46" rx="6" fill="#fff" stroke="' + f + '" stroke-width="5" transform="rotate(-10 43 57)"/><rect x="58" y="36" width="34" height="46" rx="6" fill="' + f + '" transform="rotate(8 75 59)"/><circle cx="76" cy="58" r="8" fill="#fff"/>'; },
    wahrnehmung: function (f) { return '<circle cx="60" cy="60" r="50" fill="' + hell(f) + '"/><rect x="28" y="64" width="22" height="22" rx="4" fill="#fff" stroke="' + f + '" stroke-width="4"/><circle cx="56" cy="52" r="20" fill="#fff" stroke="' + f + '" stroke-width="6"/><path d="M70 66 L90 86" stroke="' + f + '" stroke-width="9" stroke-linecap="round"/><path d="M50 46 L56 52 L64 42" fill="none" stroke="' + f + '" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>'; },
    raeumlich: function (f) { return '<circle cx="60" cy="60" r="50" fill="' + hell(f) + '"/><path d="M60 28 L88 42 L88 74 L60 88 L32 74 L32 42 Z" fill="#fff" stroke="' + f + '" stroke-width="5" stroke-linejoin="round"/><path d="M60 28 L88 42 L60 56 L32 42 Z" fill="' + f + '"/><path d="M60 56 V88" stroke="' + f + '" stroke-width="5"/>'; },
    exekutiv: function (f) { return '<circle cx="60" cy="60" r="50" fill="' + hell(f) + '"/><path d="M30 36 H54 V46 Q62 42 62 50 Q62 58 54 54 V64 H30 Z" fill="' + f + '"/><path d="M58 58 H82 V82 H72 Q76 90 68 90 Q60 90 64 82 H58 Z" fill="#fff" stroke="' + f + '" stroke-width="5" stroke-linejoin="round"/>'; },
    sprache: function (f) { return '<circle cx="60" cy="60" r="50" fill="' + hell(f) + '"/><path d="M24 38 Q42 32 60 40 V86 Q42 78 24 84 Z" fill="#fff" stroke="' + f + '" stroke-width="5" stroke-linejoin="round"/><path d="M96 38 Q78 32 60 40 V86 Q78 78 96 84 Z" fill="' + f + '"/><path d="M34 52 H50 M34 62 H50" stroke="' + f + '" stroke-width="4" stroke-linecap="round"/>'; },
    visuomotorik: function (f) { return '<circle cx="60" cy="60" r="50" fill="' + hell(f) + '"/><circle cx="74" cy="44" r="14" fill="#fff" stroke="' + f + '" stroke-width="5"/><circle cx="74" cy="44" r="5" fill="' + f + '"/><path d="M34 90 V60 Q34 54 40 54 Q46 54 46 60 V48 Q46 42 52 42 Q58 42 58 48 V64 L64 62 Q72 62 70 72 L64 90 Z" fill="' + f + '"/>'; }
  };
  HT.illustration = function (kat) {
    var k = HT.kategorie ? HT.kategorie(kat) : null, f = k ? k.farbe : '#1BA8B5', fn = I[kat] || I.aufmerksamkeit;
    return '<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' + fn(f) + '</svg>';
  };
})();

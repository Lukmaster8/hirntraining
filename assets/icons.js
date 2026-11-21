/* Hirntraining – eigene SVG-Icons (Linienstil, 24×24, Farbe über currentColor) */
(function () {
  'use strict';
  var HT = window.HT = window.HT || {};
  function i(inhalt) {
    return '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + inhalt + '</svg>';
  }
  HT.icons = {
    zurueck: i('<path d="M19 12H5"/><path d="M11 6l-6 6 6 6"/>'),
    pult: i('<path d="M3 15.5c0-1.4 1.1-2.5 2.5-2.5h13c1.4 0 2.5 1.1 2.5 2.5V17a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><circle cx="7.5" cy="16" r="1.3"/><circle cx="16.5" cy="16" r="1.3"/><circle cx="12" cy="15.2" r=".9"/><path d="M12 13V7.5"/><circle cx="12" cy="5.5" r="2"/>'),
    haken: i('<path d="M5 12.5l4.5 4.5L19 7.5"/>'),
    kreuz: i('<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>'),
    zeiger: '<svg viewBox="0 0 48 52"><path d="M8 4 L8 40 L17 31 L23 46 L30 43 L24 28 L37 28 Z" fill="#fff" stroke="#1E2A33" stroke-width="3" stroke-linejoin="round"/></svg>',
    auge: i('<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>'),
    gehirn: i('<path d="M9 4.5a3 3 0 0 0-3 3 3 3 0 0 0-2 5.2A3 3 0 0 0 6 18a3 3 0 0 0 3 2V4.5z"/><path d="M15 4.5a3 3 0 0 1 3 3 3 3 0 0 1 2 5.2A3 3 0 0 1 18 18a3 3 0 0 1-3 2V4.5z"/><path d="M9 4.5a3 3 0 0 1 6 0M9 20a3 3 0 0 0 6 0"/>'),
    lupe: i('<circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5L21 21"/>'),
    wuerfel: i('<path d="M12 2.5l8.5 4.8v9.4L12 21.5l-8.5-4.8V7.3z"/><path d="M12 12l8.5-4.7M12 12L3.5 7.3M12 12v9.5"/>'),
    puzzle: i('<path d="M10 3h4v2.2a1.8 1.8 0 1 0 3.6 0V3H21v6h-2.2a1.8 1.8 0 1 0 0 3.6H21V21h-6v-2.2a1.8 1.8 0 1 0-3.6 0V21H3v-6h2.2a1.8 1.8 0 1 0 0-3.6H3V3h7z"/>'),
    buch: i('<path d="M4 4.5A1.5 1.5 0 0 1 5.5 3H11v17H5.5A1.5 1.5 0 0 0 4 21.5z"/><path d="M20 4.5A1.5 1.5 0 0 0 18.5 3H13v17h5.5a1.5 1.5 0 0 1 1.5 1.5z"/>'),
    hand: i('<path d="M8 13V5.5a1.5 1.5 0 0 1 3 0V11M11 10.5V4a1.5 1.5 0 0 1 3 0v6.5M14 10.5V5.5a1.5 1.5 0 0 1 3 0V13"/><path d="M17 9.5a1.5 1.5 0 0 1 3 0V14a7 7 0 0 1-7 7h-1a7 7 0 0 1-5.6-2.8L3.6 15a1.6 1.6 0 0 1 2.4-2.1L8 15"/>'),
    home: i('<path d="M3 11l9-7.5 9 7.5"/><path d="M5.5 9.5V20h13V9.5"/><path d="M10 20v-5.5h4V20"/>'),
    personen: i('<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><circle cx="17" cy="9" r="2.6"/><path d="M16 14.2a5 5 0 0 1 5.5 5.3"/>'),
    person: i('<circle cx="12" cy="8" r="4"/><path d="M4.5 21a7.5 7.5 0 0 1 15 0"/>'),
    raster: i('<rect x="3.5" y="3.5" width="7" height="7" rx="1.8"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.8"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.8"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.8"/>'),
    diagramm: i('<path d="M3.5 20.5h17"/><path d="M6.5 16l4-5 3.5 3 5-7"/><circle cx="19" cy="7" r="1.2"/>'),
    dokument: i('<path d="M14 3H6.5A1.5 1.5 0 0 0 5 4.5v15A1.5 1.5 0 0 0 6.5 21h11a1.5 1.5 0 0 0 1.5-1.5V8z"/><path d="M14 3v5h5M8.5 13h7M8.5 17h5"/>'),
    zahnrad: i('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>'),
    schild: i('<path d="M12 2.5l8 3v6c0 5-3.4 8.6-8 10-4.6-1.4-8-5-8-10v-6z"/><path d="M8.5 12l2.5 2.5 4.5-5"/>'),
    abmelden: i('<path d="M9 21H5.5A1.5 1.5 0 0 1 4 19.5v-15A1.5 1.5 0 0 1 5.5 3H9"/><path d="M16 17l5-5-5-5M21 12H9"/>'),
    vollbild: i('<path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3"/>'),
    plus: i('<path d="M12 5v14M5 12h14"/>'),
    minus: i('<path d="M5 12h14"/>'),
    suche: i('<circle cx="11" cy="11" r="7"/><path d="M20.5 20.5L16 16"/>'),
    stift: i('<path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4z"/>'),
    muell: i('<path d="M4 6.5h16M9.5 6.5V4.5h5v2M6.5 6.5l1 13.5h9l1-13.5"/>'),
    archiv: i('<rect x="3" y="3.5" width="18" height="5" rx="1.2"/><path d="M5 8.5V20h14V8.5M10 12.5h4"/>'),
    play: i('<path d="M7 4.5v15l12-7.5z" fill="currentColor"/>'),
    pause: i('<rect x="6.5" y="5" width="3.5" height="14" rx="1" fill="currentColor"/><rect x="14" y="5" width="3.5" height="14" rx="1" fill="currentColor"/>'),
    stopp: i('<rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor"/>'),
    weiter: i('<path d="M5 5l9 7-9 7zM18 5v14"/>'),
    links: i('<path d="M15 5l-7 7 7 7"/>'),
    rechts: i('<path d="M9 5l7 7-7 7"/>'),
    hoch: i('<path d="M5 15l7-7 7 7"/>'),
    runter: i('<path d="M5 9l7 7 7-7"/>'),
    griff: i('<circle cx="9" cy="6" r="1"/><circle cx="15" cy="6" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="9" cy="18" r="1"/><circle cx="15" cy="18" r="1"/>'),
    stern: '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.8l2.8 5.8 6.3.9-4.6 4.4 1.1 6.3L12 17.2l-5.6 3 1.1-6.3L2.9 9.5l6.3-.9z" fill="currentColor"/></svg>',
    download: i('<path d="M12 3.5v12M7 11l5 5 5-5M4 20.5h16"/>'),
    upload: i('<path d="M12 16V4M7 9l5-5 5 5M4 20.5h16"/>'),
    drucker: i('<path d="M7 9V3.5h10V9"/><rect x="3.5" y="9" width="17" height="8" rx="2"/><path d="M7 14.5h10V21H7z"/>'),
    schloss: i('<rect x="4.5" y="10.5" width="15" height="10" rx="2"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/>'),
    uhr: i('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>'),
    kalender: i('<rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/>'),
    info: i('<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>'),
    warnung: i('<path d="M10.3 3.9L2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9.5v4.5M12 17.5v.3"/>'),
    kopieren: i('<rect x="8.5" y="8.5" width="12" height="12" rx="2"/><path d="M15.5 8.5V5a1.5 1.5 0 0 0-1.5-1.5H5A1.5 1.5 0 0 0 3.5 5v9A1.5 1.5 0 0 0 5 15.5h3.5"/>'),
    schliessen: i('<path d="M6 6l12 12M18 6L6 18"/>'),
    ziel: i('<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.3" fill="currentColor"/>'),
    vorlage: i('<rect x="3.5" y="3.5" width="17" height="17" rx="2.5"/><path d="M3.5 9h17M9 9v11.5"/>'),
    sicherung: i('<path d="M5 4h11l3 3v13H5z"/><path d="M8 4v5h7V4M8 20v-6h8v6"/>'),
    trend: i('<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>'),
    sitzung: i('<circle cx="12" cy="12" r="9"/><path d="M10 8.5l5 3.5-5 3.5z" fill="currentColor"/>'),
    test: i('<path d="M9 3h6M10 3v6L4.5 18.5A1.7 1.7 0 0 0 6 21h12a1.7 1.7 0 0 0 1.5-2.5L14 9V3"/><path d="M7.5 14.5h9"/>'),
    ton: i('<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/>'),
    stumm: i('<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M16 9.5l5 5M21 9.5l-5 5"/>'),
    filter: i('<path d="M3.5 5h17l-6.5 8v6l-4 1.5V13z"/>'),
    tastatur: i('<rect x="2.5" y="6" width="19" height="12" rx="2"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14.5h10"/>'),
    stapel: i('<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/>'),
    funke: i('<path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8"/>')
  };
  HT.icon = function (name, klasse) {
    var s = HT.icons[name] || '';
    return klasse ? s.replace('class="ic"', 'class="ic ' + klasse + '"') : s;
  };
})();

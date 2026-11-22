/* Hirntraining – Modulbibliothek: alle Module als Karten mit Vorschau-Animation, Detailseite mit Leveltabelle */
(function () {
  'use strict';
  var HT = window.HT;
  var S = HT.storage, UI = HT.ui;

  function vorschauFlaeche(m, immer) {
    var kat = HT.kategorie(m.kategorie);
    var v = HT.el('div', { class: 'modul-vorschau', style: { '--kat-farbe': kat.farbe } });
    v.style.setProperty('--kat-farbe', kat.farbe);
    var ruhe = HT.el('div', { class: 'vorschau-start', html: '<div class="vorschau-symbol" style="background:' + kat.farbe + '">' + HT.icon(m.symbol || kat.icon) + '</div>' });
    v.appendChild(ruhe);
    var innen = HT.el('div', { class: 'm-voll' });
    v.appendChild(innen);
    var stop = null;
    function an() {
      if (stop || !m.preview) return;
      ruhe.style.display = 'none';
      try { stop = m.preview(innen) || function () {}; } catch (e) { console.error(e); stop = function () {}; }
    }
    function aus() {
      if (!stop) return;
      stop(); stop = null; HT.leeren(innen); ruhe.style.display = '';
    }
    if (immer) requestAnimationFrame(an);
    else if (window.IntersectionObserver) {
      // Animation läuft automatisch, sobald die Karte sichtbar ist (und stoppt außerhalb des Bildschirms) –
      // auch im Leicht-Modus: es laufen nur die sichtbaren Karten, die Bildwechsel sind sparsam (SVG-Einzelbilder)
      sichtbarkeit().observe(v);
      v._an = an; v._aus = aus;
      // zusätzlich sofort starten, falls die Karte schon sichtbar ist (unabhängig vom Beobachter)
      setTimeout(function () {
        if (!document.body.contains(v)) return;
        var r = v.getBoundingClientRect();
        if (r.bottom > 0 && r.top < (window.innerHeight || 800) && r.width > 0) an();
      }, 120);
    } else { v.addEventListener('mouseenter', an); v.addEventListener('mouseleave', aus); v.addEventListener('touchstart', an, { passive: true }); }
    v.stoppen = aus;
    return v;
  }
  var beobachter = null;
  function sichtbarkeit() {
    if (!beobachter) {
      beobachter = new IntersectionObserver(function (eintraege) {
        eintraege.forEach(function (e) { if (e.isIntersecting && e.intersectionRatio > 0.25) e.target._an(); else e.target._aus(); });
      }, { threshold: [0, 0.25, 0.6] });
    }
    return beobachter;
  }

  /* Schwebende Vorschau beim Überfahren einer Modulzeile (Startfenster, Modulfenster) */
  var pop = null, popStop = null, popTimer = null;
  function popVerbergen() {
    clearTimeout(popTimer);
    if (popStop) { try { popStop(); } catch (e) { /* egal */ } }
    popStop = null;
    if (pop && pop.parentNode) pop.parentNode.removeChild(pop);
    pop = null;
  }
  function popZeigen(el, m) {
    popVerbergen();
    if (!m.preview || !document.body.contains(el)) return;
    var kat = HT.kategorie(m.kategorie);
    pop = HT.el('div', { class: 'vorschau-pop' });
    pop.style.setProperty('--kat-farbe', kat.farbe);
    var flaeche = HT.el('div', { class: 'vorschau-pop-flaeche' });
    var innen = HT.el('div', { class: 'm-voll' });
    flaeche.appendChild(innen);
    pop.appendChild(flaeche);
    pop.appendChild(HT.el('div', { class: 'vorschau-pop-text', html: '<b>' + HT.esc(m.name) + '</b><span>' + HT.esc(m.ziel) + '</span>' }));
    document.body.appendChild(pop);
    var liste = el.closest('.ap-liste') || el;
    var r = liste.getBoundingClientRect(), z = el.getBoundingClientRect();
    var b = pop.offsetWidth, h = pop.offsetHeight;
    var x = r.right + 14;
    if (x + b > window.innerWidth - 10) x = Math.max(10, r.left - b - 14);
    if (x < 10 || (x < r.right && x + b > r.left)) x = Math.min(window.innerWidth - b - 10, z.left + 40);
    var y = Math.max(10, Math.min(window.innerHeight - h - 10, z.top + z.height / 2 - h / 2));
    pop.style.left = x + 'px'; pop.style.top = y + 'px';
    try { popStop = m.preview(innen) || null; } catch (e) { console.error(e); }
  }
  HT.vorschauHover = function (el, m) {
    if (!m || !m.preview) return;
    el.addEventListener('mouseenter', function () { clearTimeout(popTimer); popTimer = setTimeout(function () { popZeigen(el, m); }, 160); });
    el.addEventListener('mouseleave', popVerbergen);
    el.addEventListener('mousedown', popVerbergen);
  };
  window.addEventListener('hashchange', popVerbergen);
  document.addEventListener('scroll', popVerbergen, true);
  HT.vorschauVerbergen = popVerbergen;

  /* Vorladen im Hintergrund (nach Programmstart und Anmeldung): jede Vorschau-Animation wird einmal unsichtbar
   * aufgebaut (Grafiken, Schriften, Bilder landen im Zwischenspeicher), danach werden die Ansagen vorgepuffert.
   * Läuft in kleinen Schritten in Leerlaufzeiten, damit die Bedienung nicht stockt. Beim Öffnen ist dann alles sofort da. */
  var vorgeladen = false, audioPuffer = [];
  function leerlauf(fn) { if (window.requestIdleCallback) window.requestIdleCallback(fn, { timeout: 400 }); else setTimeout(fn, 25); }
  HT.vorladen = function () {
    if (vorgeladen || !HT.Module || !HT.Module.liste.length) return;
    vorgeladen = true;
    var box = HT.el('div', { class: 'vorlade-box', 'aria-hidden': 'true' });
    document.body.appendChild(box);
    var liste = HT.Module.liste.filter(function (m) { return m.preview; }), i = 0;
    function naechstes() {
      if (HT.session && HT.session.laeuft) { setTimeout(naechstes, 1500); return; } // während eines Trainings nichts tun
      if (i >= liste.length) { if (box.parentNode) box.parentNode.removeChild(box); leerlauf(audioVorladen); return; }
      var m = liste[i++], innen = HT.el('div', { class: 'm-voll' }), stop = null;
      box.appendChild(innen);
      try { stop = m.preview(innen); } catch (e) { stop = null; }
      setTimeout(function () { try { if (typeof stop === 'function') stop(); } catch (e) { /* egal */ } HT.leeren(box); leerlauf(naechstes); }, 80);
    }
    function audioVorladen() {
      if (!HT.SPRACHAUDIO || !window.Audio) return;
      var gesehen = {}, dateien = Object.keys(HT.SPRACHAUDIO).map(function (k) { return HT.SPRACHAUDIO[k]; })
        .filter(function (d) { if (gesehen[d]) return false; gesehen[d] = true; return !/\/(wortlisten|lesetraining)\//.test(d); });
      var j = 0;
      (function weiter() {
        for (var n = 0; n < 6 && j < dateien.length; n++, j++) { try { var a = new Audio(); a.preload = 'auto'; a.src = dateien[j]; audioPuffer.push(a); } catch (e) { /* egal */ } }
        if (j < dateien.length) leerlauf(weiter);
      })();
    }
    leerlauf(naechstes);
  };

  /* Karte „Therapeutische Einordnung“ (auch in der Patientenakte genutzt) */
  HT.therapieKarte = function (id) {
    var info = HT.modulInfo(id);
    if (!info) return null;
    var icf = info.icf.map(function (c) { return '<span class="abzeichen akzent" title="' + HT.esc(HT.data.icf[c] || '') + '" style="margin:0 .3rem .3rem 0">' + c + ' · ' + HT.esc(HT.data.icf[c] || '') + '</span>'; }).join('');
    return UI.karte('Therapeutische Einordnung', HT.el('div', { html:
      '<div class="feld-label">Indikation</div><p>' + HT.esc(info.indikation) + '</p>' +
      '<div class="feld-label" style="margin-top:.8rem">ICF-Bezug</div><div style="display:flex;flex-wrap:wrap">' + icf + '</div>' +
      '<div class="feld-label" style="margin-top:.8rem">Hinweise für die Therapie</div><p>' + HT.esc(info.hinweise) + '</p>' +
      '<div class="feld-label" style="margin-top:.8rem">Alltagsbezug</div><p style="margin:0">' + HT.esc(info.alltag) + '</p>' }), { icon: 'schild' });
  };

  /* Verfahrenskürzel aus dem Modulnamen (z. B. „Geteilte Aufmerksamkeit“ → GEAU) */
  HT.modulKuerzel = function (m) {
    var w = m.name.replace(/[()]/g, '').split(/[\s-]+/).filter(function (x) { return x && x.length > 1; });
    var k = w.length === 1 ? w[0].slice(0, 4) : w.slice(0, 2).map(function (x) { return x.slice(0, 2); }).join('') + (w[2] ? w[2][0] : '');
    return k.toUpperCase().replace(/Ä/g, 'AE').replace(/Ö/g, 'OE').replace(/Ü/g, 'UE');
  };

  HT.route('/module', function (param, w) {
    if (beobachter) { beobachter.disconnect(); }
    var inaktiv = HT.kopie(S.einstellungen().moduleInaktiv || {});
    w.appendChild(UI.seite(HT.t('nav_module'), HT.Module.liste.filter(function (m) { return !m.versteckt; }).length + ' Trainingsmodule in ' + HT.KATEGORIEN.length + ' Bereichen · Die Vorschau zeigt, wie jedes Modul funktioniert'));
    var leiste = HT.el('div', { class: 'werkzeugleiste' });
    var such = HT.el('div', { class: 'suchfeld', html: HT.icon('suche') });
    var inp = HT.el('input', { type: 'search', placeholder: 'Modul suchen …' });
    such.appendChild(inp);
    leiste.appendChild(such);
    var katSel = HT.el('select', { style: { width: 'auto', minWidth: '240px' } });
    katSel.appendChild(HT.el('option', { value: '' }, 'Alle Bereiche'));
    HT.KATEGORIEN.forEach(function (k) { katSel.appendChild(HT.el('option', { value: k.id }, k.name)); });
    leiste.appendChild(katSel);
    var sortSel = HT.el('select', { style: { width: 'auto' } });
    [['kategorie', 'Nach Bereichen'], ['alphabet', 'Alphabetisch'], ['nutzung', 'Nach Nutzungshäufigkeit']].forEach(function (o) { sortSel.appendChild(HT.el('option', { value: o[0] }, o[1])); });
    try { sortSel.value = localStorage.getItem('ht-modulsort') || 'kategorie'; } catch (e) { /* egal */ }
    leiste.appendChild(sortSel);
    w.appendChild(leiste);
    var bereich = HT.el('div');
    w.appendChild(bereich);
    var nutzung = {};
    S.alle('runs').forEach(function (r) { nutzung[r.modulId] = (nutzung[r.modulId] || 0) + 1; });
    function karteBauen(m) {
      var kat = HT.kategorie(m.kategorie);
      var karte = HT.el('article', { class: 'modul-karte' + (inaktiv[m.id] ? ' inaktiv' : '') });
      var v = vorschauFlaeche(m);
      v.addEventListener('click', function () { location.hash = '#/modul/' + m.id; });
      karte.appendChild(v);
      var info = HT.el('div', { class: 'modul-info' });
      info.appendChild(HT.el('h3', { html: HT.esc(m.name) + ' <span class="modul-kuerzel">' + HT.modulKuerzel(m) + '</span>' }));
      info.appendChild(HT.el('p', null, m.ziel));
      var fuss = HT.el('div', { class: 'modul-fuss' });
      fuss.appendChild(HT.el('div', null, [UI.abzeichen(m.levels.length + ' Level', 'akzent'), nutzung[m.id] ? UI.abzeichen(nutzung[m.id] + '× genutzt') : null, sortSel.value !== 'kategorie' ? UI.abzeichen(kat.name) : null]));
      var schalter = HT.el('input', { type: 'checkbox', class: 'schalter', title: 'Modul aktiv' });
      schalter.checked = !inaktiv[m.id];
      schalter.addEventListener('change', function () {
        if (schalter.checked) delete inaktiv[m.id]; else inaktiv[m.id] = true;
        karte.classList.toggle('inaktiv', !schalter.checked);
        S.einstellungenSpeichern({ moduleInaktiv: inaktiv });
      });
      var rechts = HT.el('div', { style: { display: 'flex', alignItems: 'center' } });
      rechts.appendChild(UI.iconKnopf('info', 'Details', function () { location.hash = '#/modul/' + m.id; }));
      rechts.appendChild(schalter);
      fuss.appendChild(rechts);
      info.appendChild(fuss);
      karte.appendChild(info);
      return karte;
    }
    function zeichnen() {
      HT.leeren(bereich);
      var t = inp.value.toLowerCase();
      try { localStorage.setItem('ht-modulsort', sortSel.value); } catch (e) { /* egal */ }
      if (sortSel.value !== 'kategorie') {
        var mods = HT.Module.liste.filter(function (m) { return !m.versteckt && (!katSel.value || m.kategorie === katSel.value) && (!t || (m.name + ' ' + m.ziel + ' ' + m.beschreibung + ' ' + HT.modulKuerzel(m)).toLowerCase().indexOf(t) >= 0); });
        mods.sort(sortSel.value === 'nutzung' ? function (a, b) { return (nutzung[b.id] || 0) - (nutzung[a.id] || 0) || a.name.localeCompare(b.name); } : function (a, b) { return a.name.localeCompare(b.name); });
        var g0 = HT.el('div', { class: 'raster raster-auto' });
        mods.forEach(function (m) { g0.appendChild(karteBauen(m)); });
        bereich.appendChild(g0);
        if (!mods.length) bereich.appendChild(UI.leer('Kein Modul gefunden.', 'suche'));
        return;
      }
      HT.KATEGORIEN.forEach(function (kat) {
        if (katSel.value && katSel.value !== kat.id) return;
        var mods = HT.Module.liste.filter(function (m) { return !m.versteckt && m.kategorie === kat.id && (!t || (m.name + ' ' + m.ziel + ' ' + m.beschreibung).toLowerCase().indexOf(t) >= 0); });
        if (!mods.length) return;
        bereich.appendChild(HT.el('div', { class: 'kategorie-kopf', html: '<div class="kategorie-illu">' + (HT.illustration ? HT.illustration(kat.id) : '') + '</div><h2>' + HT.esc(kat.name) + '</h2>' + UI.abzeichen(mods.length + ' Module').outerHTML }));
        var g = HT.el('div', { class: 'raster raster-auto' });
        mods.forEach(function (m) { g.appendChild(karteBauen(m)); });
        bereich.appendChild(g);
      });
      if (!bereich.children.length) bereich.appendChild(UI.leer('Kein Modul gefunden.', 'suche'));
    }
    inp.addEventListener('input', zeichnen);
    katSel.addEventListener('change', zeichnen);
    sortSel.addEventListener('change', zeichnen);
    zeichnen();
  }, { nav: 'module' });

  HT.route('/modul/:id', function (param, w) {
    var m = HT.Module.map[param.id];
    if (!m) { w.appendChild(UI.leer('Modul nicht gefunden.')); return; }
    var kat = HT.kategorie(m.kategorie);
    w.appendChild(HT.el('div', { class: 'brotkrumen', html: '<a href="#/module">Modulbibliothek</a> / ' + HT.esc(kat.name) }));
    var lvSel = HT.el('select', { style: { width: 'auto' } });
    m.levels.forEach(function (l, i) { lvSel.appendChild(HT.el('option', { value: i + 1 }, 'Level ' + (i + 1))); });
    w.appendChild(UI.seite(m.name, m.ziel, [lvSel, UI.knopf('Training starten', { art: 'primaer', icon: 'play', titel: 'Modul sofort trainieren (Probelauf ohne Speichern)', klick: function () { HT.session.ausprobieren(m.id, Number(lvSel.value)); } })]));
    var g = HT.el('div', { class: 'raster raster-2' });
    var links = HT.el('div', { class: 'spalte' });
    links.appendChild(UI.karte('Beschreibung', [
      HT.el('p', null, m.beschreibung),
      HT.el('div', { class: 'feld-label', style: { marginTop: '1rem' } }, 'Anleitung für Patienten'),
      HT.el('p', { style: { fontSize: '1.05rem' } }, m.anleitung),
      HT.el('div', { class: 'feld-label', style: { marginTop: '1rem' } }, 'Eingabe'),
      HT.el('p', null, m.eingabe.map(function (e) { return { tastatur: 'Tastatur', maus: 'Maus', touch: 'Touchscreen' }[e] || e; }).join(' · ')),
      HT.el('div', { class: 'feld-label', style: { marginTop: '1rem' } }, 'Bewertung'),
      HT.el('p', null, 'Aufstufen ab ' + Math.round(m.bewertung.aufstufenAb * 100) + ' % Trefferquote (2 Durchgänge in Folge), abstufen unter ' + Math.round(m.bewertung.abstufenUnter * 100) + ' %.')
    ], { icon: 'info' }));
    var info = HT.modulInfo(m.id);
    if (info) links.appendChild(HT.therapieKarte(m.id));
    g.appendChild(links);
    var vk = UI.karte('Vorschau', null, { icon: 'play' });
    var v = vorschauFlaeche(m, true);
    v.style.height = '320px'; v.style.borderRadius = '14px'; v.style.border = '1px solid var(--linie)';
    vk.appendChild(v);
    g.appendChild(vk);
    w.appendChild(g);

    // Leveltabelle
    var keys = [];
    m.levels.forEach(function (l) { Object.keys(l).forEach(function (k) { if (keys.indexOf(k) < 0 && typeof l[k] !== 'object') keys.push(k); }); });
    var k2 = UI.karte('Level-Parameter', null, { icon: 'trend' });
    k2.style.marginTop = '1.2rem';
    k2.appendChild(UI.tabelle([{ titel: 'Level', wert: function (z) { return z.i; } }].concat(keys.map(function (k) {
      return { titel: m.levelLabels[k] || k, klasse: 'rechts', wert: function (z) { var v = z.l[k]; return typeof v === 'boolean' ? (v ? 'ja' : 'nein') : (v === undefined ? '–' : String(v)); } };
    })), m.levels.map(function (l, i) { return { i: i + 1, l: l }; })));
    w.appendChild(k2);
  }, { nav: 'module' });
})();

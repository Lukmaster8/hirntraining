/* Hirntraining – Startfenster (Arbeitsplatz) mit vertrauter Aufteilung:
 * links große Schalter (Therapeuten, Klienten, Module, Parameter, Ergebnisse · Hilfe, System, Schließen),
 * oben aktueller Therapeut und aktueller Klient, Mitte Reiter Training/Screening mit Gruppen- und Modulliste,
 * unten „Modul Non-Stop“ und „Start“. Dazu die Fenster Therapeuten-Liste, Klienten, Klientendaten (6 Reiter), Module, Parameter, System. */
(function () {
  'use strict';
  var HT = window.HT;
  var S = HT.storage, UI = HT.ui;

  var AP = HT.arbeitsplatz = {
    klientId: function () { try { return sessionStorage.getItem('ht-klient') || ''; } catch (e) { return ''; } },
    setKlient: function (id) { try { sessionStorage.setItem('ht-klient', id || ''); } catch (e) { /* egal */ } },
    klient: function () { var id = AP.klientId(); var p = id && S.finde('patients', id); return p && HT.patienten.sichtbar(p) ? p : null; },
    auswahl: { tab: 'training', gruppe: 'klient', modul: null },
    nutzung: function () { var n = {}; S.alle('runs').forEach(function (r) { n[r.modulId] = (n[r.modulId] || 0) + 1; }); return n; },
    sortNutzung: function () { try { return localStorage.getItem('ht-sort-nutzung') === '1'; } catch (e) { return false; } },
    nonstop: function () { try { return localStorage.getItem('ht-nonstop') === '1'; } catch (e) { return false; } }
  };

  /* Mini-Verlauf als SVG (Werte 0..1) */
  function sparkline(werte) {
    if (!werte || werte.length < 2) return '<div class="ap2-spark-leer">Noch kein Verlauf</div>';
    var b = 260, h = 46, n = werte.length;
    var lo = Math.max(0, Math.min.apply(null, werte) - 0.05), hi = Math.min(1, Math.max.apply(null, werte) + 0.05);
    if (hi - lo < 0.2) { var mitte = (hi + lo) / 2; lo = Math.max(0, mitte - 0.1); hi = Math.min(1, mitte + 0.1); }
    var pkt = werte.map(function (v, k) { return (k / (n - 1) * (b - 8) + 4).toFixed(1) + ',' + (h - 4 - (v - lo) / (hi - lo) * (h - 10)).toFixed(1); });
    return '<svg viewBox="0 0 ' + b + ' ' + h + '" preserveAspectRatio="none"><polyline points="' + pkt.join(' ') + '" fill="none" stroke="#1BA8B5" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>' +
      '<circle cx="' + pkt[n - 1].split(',')[0] + '" cy="' + pkt[n - 1].split(',')[1] + '" r="3.5" fill="#1BA8B5"/></svg><span>Trefferquote je Sitzung</span>';
  }
  function klientLabel(p) {
    var name = [p.nachname, p.vorname].filter(Boolean).join(', ') || p.pseudonym;
    var geb = p.geburtsdatum ? HT.datum(new Date(p.geburtsdatum + 'T12:00:00').getTime()) : (p.geburtsjahr ? 'Jg. ' + p.geburtsjahr : '');
    return name + (geb ? ', ' + geb : '');
  }
  function therapeutLabel(t) { return [t.titel, t.nachname || t.name, t.nachname ? t.vorname : ''].filter(Boolean).join(' ').replace(/ (\S+)$/, function (m, v) { return t.nachname ? ', ' + v : m; }); }

  /* Auswählbare Liste (Zeilen klickbar, Doppelklick = Aktion) */
  function auswahlListe(eintraege, opt) {
    var box = HT.el('div', { class: 'ap-liste' + (opt.klasse ? ' ' + opt.klasse : ''), tabindex: 0, role: 'listbox' });
    var gewaehlt = opt.gewaehlt;
    var zeilen = eintraege.map(function (e) {
      var z = HT.el('div', { class: 'ap-zeile' + (e.id === gewaehlt ? ' aktiv' : '') + (e.inaktiv ? ' inaktiv' : ''), role: 'option', html: e.html });
      z.addEventListener('click', function () { waehlen(e.id); });
      z.addEventListener('dblclick', function () { waehlen(e.id); if (opt.doppelklick) opt.doppelklick(e.id); });
      if (HT.Module.map[e.id] && HT.vorschauHover) HT.vorschauHover(z, HT.Module.map[e.id]);
      box.appendChild(z);
      return z;
    });
    function waehlen(id) {
      gewaehlt = id;
      zeilen.forEach(function (z, i) { z.classList.toggle('aktiv', eintraege[i].id === id); });
      if (opt.beiWahl) opt.beiWahl(id);
    }
    box.addEventListener('keydown', function (ev) {
      var i = eintraege.map(function (e) { return e.id; }).indexOf(gewaehlt);
      if (ev.key === 'ArrowDown') { ev.preventDefault(); i = Math.min(eintraege.length - 1, i + 1); waehlen(eintraege[i].id); HT.inSicht(zeilen[i], box); }
      if (ev.key === 'ArrowUp') { ev.preventDefault(); i = Math.max(0, i - 1); waehlen(eintraege[i].id); HT.inSicht(zeilen[i], box); }
      if (ev.key === 'Enter' && opt.doppelklick && gewaehlt) { ev.preventDefault(); opt.doppelklick(gewaehlt); }
    });
    if (!eintraege.length && opt.leer) box.appendChild(HT.el('div', { class: 'ap-leer' }, opt.leer));
    box.wert = function () { return gewaehlt; };
    return box;
  }

  /* Fenster mit Inhalt links und Schaltern rechts */
  function fenster(titel, inhalt, schalter, opt) {
    opt = opt || {};
    var g = HT.el('div', { class: 'ap-fenster-raster' });
    g.appendChild(HT.el('div', { class: 'ap-fenster-inhalt' }, inhalt));
    var rechts = HT.el('div', { class: 'ap-fenster-schalter' });
    schalter.forEach(function (s) {
      if (s === '-') { rechts.appendChild(HT.el('div', { class: 'ap-abstand' })); return; }
      var b = UI.knopf(s.text, { icon: s.icon, art: 'voll ' + (s.art || ''), deaktiviert: s.deaktiviert, titel: s.titel });
      b.addEventListener('click', function () { s.klick(); });
      rechts.appendChild(b);
    });
    g.appendChild(rechts);
    return UI.dialog({ titel: titel, inhalt: g, breit: true, klasse: 'ap-dialog' + (opt.klasse ? ' ' + opt.klasse : ''), knoepfe: opt.knoepfe || [] });
  }
  function schliessen(wert) { if (UI._offen) UI._offen(wert === undefined ? true : wert); }

  /* ===================== Startfenster ===================== */
  HT.route('/arbeitsplatz', function (param, wurzel) {
    var t = HT.auth.aktuell, e = S.einstellungen();
    var p = AP.klient();
    if (!p) {
      var liste = HT.patienten.alle();
      if (liste.length === 1) { p = liste[0]; AP.setKlient(p.id); }
    }
    var seite = HT.el('div', { class: 'ap' });
    var fe = HT.el('div', { class: 'ap-haupt' });
    // Kopf
    var kopf = HT.el('header', { class: 'ap-kopf' });
    kopf.appendChild(HT.el('div', { class: 'ap-marke', html: '<div class="marke-logo">' + HT.logoHtml() + '</div><div><strong>' + HT.esc(e.praxisname) + '</strong><span>Hirntraining · Kognitive Therapie und Hirnleistungstraining</span></div>' }));
    var kr = HT.el('div', { class: 'ap-kopf-rechts' });
    if (HT.pult) kr.appendChild(HT.pult.statusChip());
    var tageSeit = e.letzterExport ? Math.floor((Date.now() - e.letzterExport) / 86400000) : null, faellig = tageSeit === null || tageSeit >= (e.backupErinnerung || 7);
    var siChip = HT.el('button', { type: 'button', class: 'ap2-chip ' + (faellig ? 'gelb' : 'gruen'), title: faellig ? 'Datensicherung fällig – klicken zum Sichern' : 'Letzte Sicherung: ' + HT.datum(e.letzterExport), html: '<span class="pult-punkt"></span>' + HT.icon('sicherung') + '<span>' + (faellig ? 'Sicherung fällig' : 'Gesichert ' + HT.datum(e.letzterExport)) + '</span>' });
    siChip.addEventListener('click', function () { if (HT.auth.istAdmin()) location.hash = '#/verwaltung/sicherung'; else HT.sicherung.exportieren().then(HT.app.neuZeichnen); });
    kr.appendChild(siChip);
    kr.appendChild(UI.knopf('Statistik', { art: 'geist klein', icon: 'diagramm', titel: 'Übersicht & Statistik', klick: function () { location.hash = '#/uebersicht'; } }));
    kr.appendChild(UI.knopf('', { art: 'geist klein', icon: 'vollbild', titel: 'Vollbild', klick: function () { HT.app.vollbild(); } }));
    kopf.appendChild(kr);
    fe.appendChild(kopf);

    var koerper = HT.el('div', { class: 'ap2-koerper' });
    var status = HT.el('span', { class: 'ap2-status' }, 'Start mit OK am Pult oder Enter');
    var STATUS_STD = 'Start mit OK am Pult oder Enter';
    // ---- Linke schmale Leiste (Icon + Beschriftung) ----
    var leiste = HT.el('nav', { class: 'ap2-leiste', 'aria-label': 'Arbeitsbereiche' });
    var schalter = function (text, icon, hinweis, klick, extra) {
      var b = HT.el('button', { type: 'button', class: 'ap2-leistenknopf' + (extra ? ' ' + extra : ''), title: hinweis, html: HT.icon(icon) + '<span>' + HT.esc(text) + '</span>' });
      b.addEventListener('click', klick);
      b.addEventListener('mouseenter', function () { status.textContent = hinweis; });
      b.addEventListener('mouseleave', function () { status.textContent = STATUS_STD; });
      leiste.appendChild(b);
      return b;
    };
    schalter('Therapeuten', 'personen', 'Therapeuten anlegen, bearbeiten und den aktuellen Therapeuten wählen.', therapeutenListe);
    schalter('Klienten', 'person', 'Klienten aufnehmen, bearbeiten, suchen, exportieren/importieren und auswählen.', klientenFenster);
    schalter('Module', 'raster', 'Trainingsmodule und eigene Trainingseinheiten verwalten, Standardparameter festlegen.', moduleFenster);
    schalter('Bibliothek', 'buch', 'Modulbibliothek: alle Module mit Vorschau-Animationen, Beschreibung und Leveltabelle.', function () { location.hash = '#/module'; });
    schalter('Parameter', 'zahnrad', 'Trainingsparameter des gewählten Moduls für den aktuellen Klienten anpassen.', function () { parameterFenster(); });
    schalter('Ergebnisse', 'diagramm', 'Verlaufsdaten, Sitzungsanalyse, Berichte und Exporte des aktuellen Klienten.', function () { var k = AP.klient(); if (!k) { UI.toast('Bitte zuerst einen Klienten wählen.', 'fehler'); return; } location.hash = '#/patient/' + k.id + '/verlauf'; });
    leiste.appendChild(HT.el('div', { class: 'ap-abstand' }));
    schalter('Hilfe', 'info', 'Kurzanleitung und Tastaturbelegung.', function () { location.hash = '#/hilfe'; });
    schalter('System', 'zahnrad', 'Einstellungen, Verwaltung, Datensicherung, Patientenmodus und Systeminformationen.', systemFenster);
    schalter('Schließen', 'abmelden', 'Abmelden und zum Startbildschirm zurückkehren.', HT.auth.abmelden, 'gefahr');
    koerper.appendChild(leiste);

    // ---- Linke Spalte: Therapeut/Klient, Kennzahlen, Verlauf, Gruppen ----
    var linksSp = HT.el('aside', { class: 'ap2-links' });
    var personen = HT.el('div', { class: 'ap2-karte ap2-personen' });
    var thSel = HT.el('select', { 'aria-label': 'aktueller Therapeut' });
    HT.auth.therapeuten().forEach(function (x) { var o = HT.el('option', { value: x.id }, therapeutLabel(x) + (x.rolle === 'admin' ? ' (Admin)' : '')); if (x.id === t.id) o.selected = true; thSel.appendChild(o); });
    thSel.addEventListener('change', function () {
      var neu = S.finde('therapists', thSel.value);
      var feld = UI.pinFeld(function (pin, fehler) {
        HT.auth.pruefen(neu, pin).then(function (ok) {
          if (!ok) { fehler(HT.auth.sperrText()); return; }
          HT.auth.anmelden(neu); try { localStorage.setItem('ht-letzter-therapeut', neu.id); } catch (x) { /* egal */ }
          AP.setKlient(''); schliessen(true); HT.app.neuZeichnen(); UI.toast('Angemeldet als ' + neu.name, 'ok');
        });
      }, { text: 'PIN von ' + neu.name, manuell: true });
      UI.dialog({ fokusFeld: true, titel: 'Therapeut anmelden', inhalt: feld, klasse: 'pin-dialog', knoepfe: [{ text: HT.t('abbrechen'), wert: null }] }).then(function (w) { if (!w) thSel.value = t.id; });
    });
    personen.appendChild(HT.el('div', { class: 'ap2-person' }, [UI.avatar(t.name), HT.el('div', { class: 'ap2-person-text' }, [HT.el('small', null, 'Therapeut'), thSel])]));
    var klSel = HT.el('select', { 'aria-label': 'aktueller Klient' });
    klSel.appendChild(HT.el('option', { value: '' }, '– Klient wählen –'));
    HT.patienten.alle(true).forEach(function (x) { var o = HT.el('option', { value: x.id }, (HT.patienten.entlassen(x) ? '○ ' : '') + (x.pseudonym || '') + ' · ' + klientLabel(x)); if (p && x.id === p.id) o.selected = true; klSel.appendChild(o); });
    klSel.addEventListener('change', function () { AP.setKlient(klSel.value); AP.auswahl.modul = null; HT.app.neuZeichnen(); });
    var klText = HT.el('div', { class: 'ap2-person-text' }, [HT.el('small', null, p ? 'Klient · ' + (p.pseudonym || '') : 'Klient'), klSel]);
    var klZeile = HT.el('div', { class: 'ap2-person' }, [p ? UI.avatar(HT.patienten.anzeigename(p)) : HT.el('span', { class: 'ap2-avatar-leer', html: HT.icon('person') }), klText]);
    if (p) klZeile.appendChild(UI.iconKnopf('stift', 'Klientendaten bearbeiten', function (ev) { ev.preventDefault(); klientendaten(p).then(function (x) { if (x) HT.app.neuZeichnen(); }); }, 'rand klein'));
    personen.appendChild(klZeile);
    linksSp.appendChild(personen);
    // Kennzahlen und Mini-Verlauf (Trefferquote je Sitzung)
    var runsP = p ? S.alle('runs', function (r) { return r.patientId === p.id; }) : [];
    var sitzP = p ? S.alle('sessions', function (x) { return x.patientId === p.id; }) : [];
    var letzte = runsP.slice(-20), quote = letzte.length ? HT.results.zusammenfassung(letzte).quote : null;
    var minuten = Math.round(HT.summe(runsP.filter(function (r) { return r.start > Date.now() - 30 * 86400000; }).map(function (r) { return r.dauerSek || 0; })) / 60);
    var kz = HT.el('div', { class: 'ap2-kennzahlen' });
    [[p ? String(sitzP.length) : '–', 'Sitzungen'], [p ? minuten + ' min' : '–', 'Training 30 Tage'], [quote === null ? '–' : HT.prozent(quote), 'Ø Quote']].forEach(function (k) {
      kz.appendChild(HT.el('div', { class: 'ap2-kennzahl' }, [HT.el('b', null, k[0]), HT.el('small', null, k[1])]));
    });
    linksSp.appendChild(kz);
    var proSitzung = {};
    runsP.forEach(function (r) { var k = r.sessionId || r.start; (proSitzung[k] = proSitzung[k] || []).push(r); });
    var werte = Object.keys(proSitzung).map(function (k) { return { t: proSitzung[k][0].start, q: HT.results.zusammenfassung(proSitzung[k]).quote }; }).sort(function (a, b) { return a.t - b.t; }).slice(-14).map(function (x) { return x.q; });
    linksSp.appendChild(HT.el('div', { class: 'ap2-sparkline', title: 'Trefferquote der letzten Sitzungen', html: sparkline(werte) }));
    // Gruppenliste
    var plan = p ? HT.plaene.aktiverPlan(p.id) : null;
    var aktive = HT.Module.aktive();
    var gruppen = [{ id: 'klient', name: 'Module des Klienten', farbe: 'var(--akzent)', icon: 'person', anzahl: plan ? plan.eintraege.length : 0 }, { id: 'alle', name: 'Alle Module', farbe: '#7d8a94', icon: 'raster', anzahl: aktive.length }]
      .concat(HT.KATEGORIEN.map(function (k) { return { id: k.id, name: k.name, farbe: k.farbe, icon: k.icon, anzahl: aktive.filter(function (m) { return m.kategorie === k.id; }).length }; }));
    if (!AP.auswahl.gruppe) AP.auswahl.gruppe = p && plan ? 'klient' : 'alle';
    var gl = HT.el('div', { class: 'ap2-gruppen', tabindex: '0', role: 'listbox', 'aria-label': 'Gruppen' });
    var gKnoepfe = gruppen.map(function (gr) {
      var z = HT.el('div', { class: 'ap2-gruppe' + (AP.auswahl.gruppe === gr.id ? ' aktiv' : ''), role: 'option', html: '<span class="ap2-gpunkt" style="background:' + gr.farbe + '">' + HT.icon(gr.icon) + '</span><span class="ap2-gname">' + HT.esc(gr.name) + '</span><span class="ap2-ganzahl">' + gr.anzahl + '</span>' });
      z.addEventListener('click', function () { gruppeWaehlen(gr.id); gl.focus(); });
      gl.appendChild(z);
      return z;
    });
    linksSp.appendChild(HT.el('div', { class: 'ap2-spaltenkopf' }, 'Gruppen'));
    linksSp.appendChild(gl);
    koerper.appendChild(linksSp);

    // ---- Rechte Spalte: Reiter, Suche, Modulkarten ----
    var rechts = HT.el('section', { class: 'ap2-rechts' });
    var reiterKopf = HT.el('div', { class: 'ap2-reiterkopf' });
    var rT = HT.el('button', { type: 'button', class: AP.auswahl.tab === 'training' ? 'aktiv' : '' }, 'Training');
    var rS = HT.el('button', { type: 'button', class: AP.auswahl.tab === 'screening' ? 'aktiv' : '' }, 'Screening');
    rT.addEventListener('click', function () { AP.auswahl.tab = 'training'; AP.auswahl.modul = null; HT.app.neuZeichnen(); });
    rS.addEventListener('click', function () { AP.auswahl.tab = 'screening'; AP.auswahl.modul = null; HT.app.neuZeichnen(); });
    reiterKopf.appendChild(rT); reiterKopf.appendChild(rS);
    var suche = HT.el('input', { type: 'search', class: 'ap2-suche', placeholder: 'Modul suchen …', 'aria-label': 'Modul suchen' });
    suche.value = AP.auswahl.suche || '';
    suche.addEventListener('input', function () { AP.auswahl.suche = suche.value; karten(); });
    reiterKopf.appendChild(suche);
    var sortL = HT.el('label', { class: 'ap-check', title: 'Häufig genutzte Module zuerst' });
    var sortC = HT.el('input', { type: 'checkbox' }); sortC.checked = AP.sortNutzung();
    sortC.addEventListener('change', function () { try { localStorage.setItem('ht-sort-nutzung', sortC.checked ? '1' : '0'); } catch (x) { /* egal */ } karten(); });
    sortL.appendChild(sortC); sortL.appendChild(document.createTextNode(' häufig zuerst'));
    reiterKopf.appendChild(sortL);
    rechts.appendChild(reiterKopf);
    var hinweisZeile = HT.el('div', { class: 'ap2-hinweis' });
    rechts.appendChild(hinweisZeile);
    var raster = HT.el('div', { class: 'ap2-raster', role: 'listbox', 'aria-label': 'Module' });
    rechts.appendChild(raster);
    koerper.appendChild(rechts);

    var nutzung = AP.nutzung();
    function sortiert(mods) {
      mods = mods.slice();
      if (AP.sortNutzung()) mods.sort(function (a, b) {
        var na = p ? S.alle('runs', function (r) { return r.patientId === p.id && r.modulId === a.id; }).length : 0, nb = p ? S.alle('runs', function (r) { return r.patientId === p.id && r.modulId === b.id; }).length : 0;
        return (nb - na) || ((nutzung[b.id] || 0) - (nutzung[a.id] || 0)) || a.name.localeCompare(b.name);
      });
      else mods.sort(function (a, b) { return a.name.localeCompare(b.name); });
      return mods;
    }
    function trend(m) {
      if (!p) return '';
      var rs = S.alle('runs', function (r) { return r.patientId === p.id && r.modulId === m.id; });
      if (rs.length < 2) return '';
      var a = rs[rs.length - 2], b = rs[rs.length - 1];
      var la = a.levelNachher || a.level || 0, lb = b.levelNachher || b.level || 0;
      if (lb > la) return '<span class="ap2-trend hoch" title="Level gestiegen">▲</span>';
      if (lb < la) return '<span class="ap2-trend runter" title="Level gesunken">▼</span>';
      return '<span class="ap2-trend gleich" title="Level gleich">▶</span>';
    }
    var kartenEls = [], kartenIds = [];
    function karte(m, id, sonder) {
      var kat = m ? HT.kategorie(m.kategorie) : null;
      var el;
      if (sonder) el = HT.el('div', { class: 'ap2-modul sonder', role: 'option', html: '<span class="ap2-micon" style="background:var(--akzent)">' + HT.icon(sonder.icon) + '</span><div class="ap2-mtext"><b>' + HT.esc(sonder.name) + '</b><small>' + HT.esc(sonder.text) + '</small></div>' });
      else {
        var max = m.levels.length, lv = p ? HT.patienten.zustand(p.id, m.id).aktuellesLevel : 0;
        el = HT.el('div', { class: 'ap2-modul', role: 'option', title: m.ziel, html:
          '<span class="ap2-micon" style="background:' + kat.farbe + '">' + HT.icon(m.symbol || kat.icon) + '</span>' +
          '<div class="ap2-mtext"><div class="ap2-mkopf"><span class="ap-kuerzel">' + HT.modulKuerzel(m) + '</span>' + trend(m) + '</div><b>' + HT.esc(m.name) + '</b><small>' + HT.esc(m.ziel || '') + '</small>' +
          '<div class="ap2-level"><span style="width:' + (p ? Math.round(lv / max * 100) : 0) + '%;background:' + kat.farbe + '"></span></div><em>' + (p ? 'Lv ' + lv + '/' + max : max + ' Level') + '</em></div>' });
      }
      el.addEventListener('click', function () { modulWaehlen(id); });
      el.addEventListener('dblclick', function () { modulWaehlen(id); starten(); });
      el.addEventListener('mouseenter', function () { if (m && HT.vorschauHover) { /* Vorschau nur bei Hover über dem Symbol (Leistung) */ } });
      kartenEls.push(el); kartenIds.push(id);
      return el;
    }
    function karten() {
      HT.leeren(raster); kartenEls = []; kartenIds = [];
      var q = (AP.auswahl.suche || '').toLowerCase().trim();
      var passt = function (m) { return !q || (m.name + ' ' + HT.modulKuerzel(m) + ' ' + (m.ziel || '')).toLowerCase().indexOf(q) >= 0; };
      var mods;
      if (AP.auswahl.tab === 'screening') {
        hinweisZeile.textContent = 'Screening = kurzer Leistungsüberblick bzw. Einstufung. Kein Diagnostikum.';
        if (HT.screening) raster.appendChild(karte(null, '__screening', { icon: 'ziel', name: 'Screening-Batterie', text: 'Kurzer Leistungsüberblick (ca. 15–20 min), Vergleich mit dem ersten Screening' }));
        if (HT.screening && p && HT.screening.vorhanden(p)) raster.appendChild(karte(null, '__screeningVerlauf', { icon: 'diagramm', name: 'Screening-Verlauf', text: 'Ergebnisse, Vergleich mit dem ersten Screening, Empfehlungen' }));
        if (plan) raster.appendChild(karte(null, '__plan', { icon: 'trend', name: 'Einstufung aller Module des Plans', text: 'Startlevel für jedes Modul des Klienten ermitteln' }));
        mods = sortiert(aktive).filter(passt);
      } else {
        hinweisZeile.textContent = '';
        if (AP.auswahl.gruppe === 'klient') {
          mods = plan ? plan.eintraege.map(function (x) { return HT.Module.map[x.modulId]; }).filter(Boolean).filter(passt) : [];
          if (plan && mods.length && !q) raster.appendChild(karte(null, '__plan', { icon: 'vorlage', name: 'Gesamter Trainingsplan', text: plan.name + ' · ' + plan.eintraege.length + ' Module' }));
          if (AP.sortNutzung()) mods = sortiert(mods);
          if (!mods.length) hinweisZeile.textContent = p ? 'Diesem Klienten sind noch keine Module zugeordnet – Gruppe „Alle Module“ wählen oder über „Module“ zuordnen.' : 'Bitte links einen Klienten wählen.';
        } else if (AP.auswahl.gruppe === 'alle') mods = sortiert(aktive).filter(passt);
        else mods = sortiert(aktive.filter(function (m) { return m.kategorie === AP.auswahl.gruppe; })).filter(passt);
      }
      mods.forEach(function (m) { raster.appendChild(karte(m, m.id)); });
      if (kartenIds.indexOf(AP.auswahl.modul) < 0) AP.auswahl.modul = kartenIds[0] || null;
      markieren();
    }
    function markieren() {
      kartenEls.forEach(function (el, k) { var an = kartenIds[k] === AP.auswahl.modul; el.classList.toggle('aktiv', an); el.setAttribute('aria-selected', an ? 'true' : 'false'); });
    }
    function modulWaehlen(id) { AP.auswahl.modul = id; markieren(); fokusZone = 'karten'; }
    function gruppeWaehlen(id) {
      AP.auswahl.gruppe = id; AP.auswahl.modul = null;
      if (AP.auswahl.tab !== 'training') { AP.auswahl.tab = 'training'; rT.classList.add('aktiv'); rS.classList.remove('aktiv'); }
      gKnoepfe.forEach(function (z, k) { z.classList.toggle('aktiv', gruppen[k].id === id); });
      karten();
    }
    karten();

    // ---- Feste Startleiste unten ----
    var fuss = HT.el('div', { class: 'ap2-start' });
    var nsL = HT.el('label', { class: 'ap2-schalter', title: 'Ohne Zwischenbildschirme durcharbeiten (für selbstständig trainierende Klienten)' });
    var nsC = HT.el('input', { type: 'checkbox' }); nsC.checked = AP.nonstop();
    nsC.addEventListener('change', function () { try { localStorage.setItem('ht-nonstop', nsC.checked ? '1' : '0'); } catch (x) { /* egal */ } });
    nsL.appendChild(nsC); nsL.appendChild(HT.el('span', { class: 'ap2-schieber' })); nsL.appendChild(HT.el('span', null, 'Modul Non-Stop'));
    fuss.appendChild(nsL);
    fuss.appendChild(status);
    var startK = HT.el('button', { type: 'button', class: 'ap2-start-knopf', html: HT.icon('play') + '<span>Training starten</span>' });
    startK.addEventListener('click', starten);
    fuss.appendChild(startK);

    fe.appendChild(koerper);
    fe.appendChild(fuss);
    seite.appendChild(fe);
    wurzel.appendChild(seite);

    // ---- Komplett per Pfeiltasten bedienbar: Gruppen ↔ Karten ↔ Start ----
    var fokusZone = 'karten';
    function spalten() { var b = raster.clientWidth || 600, k = kartenEls[0]; return k ? Math.max(1, Math.round(b / (k.offsetWidth + 12))) : 3; }
    function navigieren(aktion) {
      if (document.querySelector('.dialog-hinter')) return false;
      var gi = gruppen.map(function (x) { return x.id; }).indexOf(AP.auswahl.gruppe), ki = kartenIds.indexOf(AP.auswahl.modul), sp = spalten();
      if (fokusZone === 'gruppen') {
        if (aktion === 'hoch' && gi > 0) gruppeWaehlen(gruppen[gi - 1].id);
        else if (aktion === 'runter' && gi < gruppen.length - 1) gruppeWaehlen(gruppen[gi + 1].id);
        else if (aktion === 'rechts' && kartenEls.length) { fokusZone = 'karten'; AP.auswahl.modul = AP.auswahl.modul || kartenIds[0]; markieren(); }
        else return false;
        HT.inSicht(gKnoepfe[Math.max(0, gruppen.map(function (x) { return x.id; }).indexOf(AP.auswahl.gruppe))], gl);
        gl.classList.add('pult-fokus-zone'); raster.classList.remove('pult-fokus-zone'); startK.classList.remove('pult-fokus');
        return true;
      }
      if (fokusZone === 'start') {
        if (aktion === 'hoch') { fokusZone = 'karten'; startK.classList.remove('pult-fokus'); markieren(); return true; }
        if (aktion === 'ok') { starten(); return true; }
        return false;
      }
      if (aktion === 'ok') { starten(); return true; }
      if (ki < 0) ki = 0;
      if (aktion === 'links') { if (ki % sp === 0) { fokusZone = 'gruppen'; gl.classList.add('pult-fokus-zone'); raster.classList.remove('pult-fokus-zone'); return true; } ki--; }
      else if (aktion === 'rechts') ki = Math.min(kartenEls.length - 1, ki + 1);
      else if (aktion === 'hoch') ki = Math.max(0, ki - sp);
      else if (aktion === 'runter') { if (ki + sp >= kartenEls.length) { fokusZone = 'start'; startK.classList.add('pult-fokus'); return true; } ki += sp; }
      else return false;
      AP.auswahl.modul = kartenIds[ki]; markieren(); HT.inSicht(kartenEls[ki], raster);
      raster.classList.add('pult-fokus-zone'); gl.classList.remove('pult-fokus-zone');
      return true;
    }
    HT.apNavi = navigieren;
    var TAST = { ArrowUp: 'hoch', ArrowDown: 'runter', ArrowLeft: 'links', ArrowRight: 'rechts', Enter: 'ok' };
    var tastenHandler = function (ev) {
      if (!document.body.contains(seite)) { document.removeEventListener('keydown', tastenHandler); if (HT.apNavi === navigieren) HT.apNavi = null; return; }
      var tg = ev.target;
      if (tg && (tg.tagName === 'INPUT' || tg.tagName === 'SELECT' || tg.tagName === 'TEXTAREA' || (tg.tagName === 'BUTTON' && ev.key === 'Enter'))) return;
      var a = TAST[ev.key]; if (!a) return;
      if (navigieren(a)) ev.preventDefault();
    };
    document.addEventListener('keydown', tastenHandler);

    function starten() {
      var k = AP.klient();
      if (!k) { UI.toast('Bitte zuerst einen Klienten wählen.', 'fehler'); klSel.focus(); return; }
      var id = AP.auswahl.modul;
      if (!id) { UI.toast('Bitte ein Modul wählen.', 'fehler'); return; }
      if (id === '__screening') { if (HT.screening) HT.screening.starten(k); return; }
      if (id === '__screeningVerlauf') { location.hash = '#/screening/' + k.id; return; }
      var pl = HT.plaene.aktiverPlan(k.id);
      var ns = AP.nonstop();
      if (AP.auswahl.tab === 'screening') {
        var mods = id === '__plan' ? (pl ? pl.eintraege.map(function (x) { return x.modulId; }) : []) : [id];
        HT.session.starten({ vonArbeitsplatz: true, patientId: k.id, einstufung: true, nonstop: false, eintraege: mods.map(function (mid) { return { modulId: mid, dauerMin: 3, startLevel: 1, parameterOverrides: { dauerDurchgangSek: 40 } }; }) });
        return;
      }
      if (id === '__plan') { HT.session.starten({ vonArbeitsplatz: true, patientId: k.id, planId: pl.id, nonstop: ns }); return; }
      var e = pl ? pl.eintraege.filter(function (x) { return x.modulId === id; })[0] : null;
      HT.session.starten({ vonArbeitsplatz: true, patientId: k.id, planId: pl ? pl.id : null, nonstop: ns, eintraege: [e ? HT.kopie(e) : { modulId: id, dauerMin: S.einstellungen().standarddauer || 5, startLevel: 'auto', anleitung: 'auto', parameterOverrides: {} }] });
    }
  }, { shell: false });

  /* ===================== Fenster „Therapeuten-Liste“ ===================== */
  function therapeutenListe() {
    var istAdmin = HT.auth.istAdmin(), ich = HT.auth.aktuell;
    var gewaehlt = ich.id;
    var tab = HT.el('div');
    function zeichnen() {
      HT.leeren(tab);
      var liste = HT.auth.therapeuten(istAdmin);
      tab.appendChild(auswahlListe(liste.map(function (t) {
        return { id: t.id, inaktiv: t.aktiv === false, html: '<span class="ap-spalte-t">' + HT.esc(t.titel || '') + '</span><span class="ap-spalte-n"><b>' + HT.esc(t.nachname || t.name) + '</b></span><span class="ap-spalte-v">' + HT.esc(t.nachname ? (t.vorname || '') : '') + '</span><span class="ap-spalte-s">' + HT.esc(t.station || '') + '</span>' + (t.rolle === 'admin' ? UI.abzeichen('Admin', 'akzent').outerHTML : '') + (t.aktiv === false ? UI.abzeichen('inaktiv', 'gelb').outerHTML : '') };
      }), { gewaehlt: gewaehlt, beiWahl: function (id) { gewaehlt = id; }, doppelklick: function () { waehlen(); }, klasse: 'hoch' }));
    }
    var kopf = HT.el('div', { class: 'ap-tabkopf', html: '<span class="ap-spalte-t">Titel</span><span class="ap-spalte-n">Name</span><span class="ap-spalte-v">Vorname</span><span class="ap-spalte-s">Station / Abteilung</span>' });
    function waehlen() {
      var t = S.finde('therapists', gewaehlt);
      if (!t || t.id === ich.id) { schliessen(); return; }
      var feld = UI.pinFeld(function (pin, fehler) {
        HT.auth.pruefen(t, pin).then(function (ok) {
          if (!ok) { fehler(HT.auth.sperrText()); return; }
          HT.auth.anmelden(t); AP.setKlient(''); schliessen(); setTimeout(function () { schliessen(); HT.app.neuZeichnen(); }, 30);
        });
      }, { text: 'PIN von ' + t.name, manuell: true });
      UI.dialog({ fokusFeld: true, titel: 'Therapeut wählen', inhalt: feld, klasse: 'pin-dialog', knoepfe: [{ text: HT.t('abbrechen'), wert: null }] });
    }
    zeichnen();
    fenster('Therapeuten-Liste', [kopf, tab], [
      { text: 'Neu', icon: 'plus', deaktiviert: !istAdmin, titel: istAdmin ? '' : 'Nur Administratoren', klick: function () { therapeutBearbeiten(null).then(function (x) { if (x) zeichnen(); }); } },
      { text: 'Bearbeiten', icon: 'stift', klick: function () { var t = S.finde('therapists', gewaehlt); if (!istAdmin && t.id !== ich.id) { UI.toast('Sie können nur Ihre eigenen Daten bearbeiten.', 'fehler'); return; } therapeutBearbeiten(t).then(function (x) { if (x) zeichnen(); }); } },
      { text: 'Löschen', icon: 'muell', art: 'gefahr', deaktiviert: !istAdmin, klick: function () {
        var t = S.finde('therapists', gewaehlt);
        if (t.id === ich.id) { UI.toast('Sie können sich nicht selbst löschen.', 'fehler'); return; }
        var anzahl = S.alle('patients', function (x) { return x.therapeutId === t.id; }).length;
        UI.bestaetigen('Therapeut „' + t.name + '“ ' + (anzahl ? 'deaktivieren? ' + anzahl + ' Klienten werden Ihnen zugeordnet. ' : 'löschen? ') + 'Bereits dokumentierte Trainings bleiben erhalten.', { gefahr: true, ja: anzahl ? 'Deaktivieren' : 'Löschen' }).then(function (ok) {
          if (!ok) return;
          var ops = S.alle('patients', function (x) { return x.therapeutId === t.id; }).map(function (x) { x.therapeutId = ich.id; return S.put('patients', x); });
          if (anzahl) { t.aktiv = false; ops.push(S.put('therapists', t)); } else ops.push(S.delete('therapists', t.id));
          Promise.all(ops).then(function () { gewaehlt = ich.id; zeichnen(); UI.toast(HT.t('gespeichert'), 'ok'); });
        });
      } },
      '-',
      { text: 'Wählen', icon: 'haken', art: 'primaer', klick: waehlen },
      { text: 'Hilfe', icon: 'info', klick: function () { UI.hinweis('Therapeuten-Liste', 'Jeder Klient ist einem verantwortlichen Therapeuten zugeordnet (weitere Therapeuten können im Reiter „Therapeuten“ der Klientendaten ergänzt werden). Therapeuten sehen – sofern unter Praxisdaten eingestellt – nur ihre eigenen Klienten; Administratoren sehen alle Klienten und Statistiken. „Wählen“ wechselt den aktuellen Therapeuten (PIN erforderlich).'); } }
    ], { knoepfe: [{ text: HT.t('schliessen'), wert: null }] }).then(function () { HT.app.neuZeichnen(); });
  }

  function therapeutBearbeiten(t) {
    var neu = !t;
    var felder = [
      { name: 'titel', label: 'Titel', platzhalter: 'z. B. Dr., ET, Dipl.-Psych.' },
      { name: 'kuerzel', label: 'Kürzel' },
      { name: 'vorname', label: 'Vorname', pflicht: true },
      { name: 'nachname', label: 'Name', pflicht: true },
      { name: 'station', label: 'Station / Abteilung', breit: true }
    ];
    if (HT.auth.istAdmin()) felder.push({ name: 'rolle', label: 'Rolle', typ: 'auswahl', optionen: [{ wert: 'therapeut', label: 'Therapeut' }, { wert: 'admin', label: 'Administrator (sieht alle Klienten)' }] });
    if (neu) felder.push({ name: 'pin', label: 'PIN (4–8 Ziffern)', typ: 'pin', pflicht: true }, { name: 'pin2', label: 'PIN wiederholen', typ: 'pin', pflicht: true });
    else felder.push({ name: 'pinNeu', label: 'Neue PIN (leer = unverändert)', typ: 'pin' });
    if (!neu && HT.auth.istAdmin()) felder.push({ name: 'aktiv', label: 'Aktiv (kann sich anmelden)', typ: 'schalter', breit: true });
    var werte = t ? HT.zusammen(t, { vorname: t.vorname || (t.nachname ? '' : String(t.name).split(' ').slice(0, -1).join(' ')), nachname: t.nachname || String(t.name).split(' ').slice(-1)[0] }) : { rolle: 'therapeut', aktiv: true };
    return UI.formularDialog(neu ? 'Neuer Therapeut' : 'Therapeut bearbeiten', felder, werte, {
      pruefen: function (w) {
        if (neu && !/^[0-9]{4,8}$/.test(w.pin)) return 'Die PIN muss aus 4 bis 8 Ziffern bestehen.';
        if (neu && w.pin !== w.pin2) return 'Die PINs stimmen nicht überein.';
        if (!neu && w.pinNeu && !/^[0-9]{4,8}$/.test(w.pinNeu)) return 'Die neue PIN muss aus 4 bis 8 Ziffern bestehen.';
        return null;
      }
    }).then(function (w) {
      if (!w) return null;
      var name = [w.titel, w.vorname, w.nachname].filter(Boolean).join(' ');
      if (neu) return HT.auth.anlegen({ name: name, kuerzel: w.kuerzel, pin: w.pin, rolle: w.rolle || 'therapeut' }).then(function (x) { x.titel = w.titel; x.vorname = w.vorname; x.nachname = w.nachname; x.station = w.station; return S.put('therapists', x); });
      var obj = HT.zusammen(t, { titel: w.titel, vorname: w.vorname, nachname: w.nachname, station: w.station, kuerzel: w.kuerzel, name: name });
      if (w.rolle) obj.rolle = w.rolle;
      if (w.aktiv !== undefined) obj.aktiv = w.aktiv;
      var p = w.pinNeu ? HT.auth.pinSetzen(obj, w.pinNeu) : S.put('therapists', obj);
      return p.then(function (x) { if (HT.auth.aktuell && HT.auth.aktuell.id === obj.id) HT.auth.aktuell = obj; return x; });
    });
  }

  /* ===================== Fenster „Klienten“ ===================== */
  function klientenFenster() {
    var f = { sort: 'name', text: '', entlassen: false, datenschutz: true };
    try { f.datenschutz = localStorage.getItem('ht-datenschutz') !== '0'; } catch (e) { /* egal */ }
    var gewaehlt = AP.klientId();
    var oben = HT.el('div', { class: 'ap-filter' });
    var sortBox = HT.el('div', { class: 'ap-radio-gruppe', html: '<div class="feld-label">Sortieren nach</div>' });
    [['name', 'Name'], ['geburt', 'Geburtsdatum'], ['aufnahme', 'Aufnahme']].forEach(function (o) {
      var r = HT.el('label', { class: 'ap-check' }); var i = HT.el('input', { type: 'radio', name: 'apsort', value: o[0] }); if (f.sort === o[0]) i.checked = true;
      i.addEventListener('change', function () { f.sort = o[0]; zeichnen(); });
      r.appendChild(i); r.appendChild(document.createTextNode(' ' + o[1])); sortBox.appendChild(r);
    });
    oben.appendChild(sortBox);
    var rechtsF = HT.el('div', { class: 'ap-filter-rechts' });
    var such = HT.el('input', { type: 'search', placeholder: 'Suchen …' });
    such.addEventListener('input', function () { f.text = such.value; zeichnen(); });
    rechtsF.appendChild(HT.el('label', { class: 'feld' }, [HT.el('span', { class: 'feld-label' }, 'Suchen'), such]));
    var c1 = HT.el('input', { type: 'checkbox' }); c1.addEventListener('change', function () { f.entlassen = c1.checked; zeichnen(); });
    var c2 = HT.el('input', { type: 'checkbox' }); c2.checked = f.datenschutz; c2.addEventListener('change', function () { f.datenschutz = c2.checked; try { localStorage.setItem('ht-datenschutz', c2.checked ? '1' : '0'); } catch (e) { /* egal */ } zeichnen(); });
    rechtsF.appendChild(HT.el('label', { class: 'ap-check' }, [c1, document.createTextNode(' Entlassene Klienten')]));
    rechtsF.appendChild(HT.el('label', { class: 'ap-check' }, [c2, document.createTextNode(' Datenschutz (Nachnamen kürzen)')]));
    oben.appendChild(rechtsF);
    var kopf = HT.el('div', { class: 'ap-tabkopf', html: '<span class="ap-spalte-n">Name</span><span class="ap-spalte-v">Vorname</span><span class="ap-spalte-g">Geburtsdatum</span><span class="ap-spalte-a">Aufnahme</span>' });
    var listeWrap = HT.el('div');
    function aufnahme(p) { return p.behandlungsbeginn || HT.isoDatum(p.angelegtAm || 0); }
    function zeichnen() {
      HT.leeren(listeWrap);
      var t = f.text.toLowerCase();
      var liste = HT.patienten.alle(true).filter(function (p) {
        if (!f.entlassen && HT.patienten.entlassen(p)) return false;
        return !t || [p.nachname, p.vorname, p.pseudonym, p.diagnose].join(' ').toLowerCase().indexOf(t) >= 0;
      });
      liste.sort(function (a, b) {
        if (f.sort === 'geburt') return String(a.geburtsdatum || a.geburtsjahr || '').localeCompare(String(b.geburtsdatum || b.geburtsjahr || ''));
        if (f.sort === 'aufnahme') return aufnahme(b).localeCompare(aufnahme(a));
        return (a.nachname || a.pseudonym || '').localeCompare(b.nachname || b.pseudonym || '');
      });
      listeWrap.appendChild(auswahlListe(liste.map(function (p) {
        var nn = p.nachname ? (f.datenschutz ? p.nachname.slice(0, 2) + '•••' : p.nachname) : p.pseudonym;
        var geb = p.geburtsdatum ? HT.datum(new Date(p.geburtsdatum + 'T12:00:00').getTime()) : (p.geburtsjahr || '–');
        return { id: p.id, html: '<span class="ap-status-punkt ' + (HT.patienten.entlassen(p) ? 'aus' : 'an') + '"></span><span class="ap-spalte-n"><b>' + HT.esc(nn) + '</b></span><span class="ap-spalte-v">' + HT.esc(p.vorname || '') + '</span><span class="ap-spalte-g">' + HT.esc(String(geb)) + '</span><span class="ap-spalte-a">' + HT.datum(new Date(aufnahme(p) + 'T12:00:00').getTime()) + '</span>' };
      }), { gewaehlt: gewaehlt, beiWahl: function (id) { gewaehlt = id; }, doppelklick: function () { waehlen(); }, klasse: 'hoch', leer: 'Keine Klienten gefunden.' }));
    }
    function waehlen() { if (!gewaehlt) return; AP.setKlient(gewaehlt); AP.auswahl.gruppe = 'klient'; AP.auswahl.modul = null; schliessen(); }
    zeichnen();
    setTimeout(function () { such.focus(); }, 80);
    fenster('Klienten', [oben, kopf, listeWrap], [
      { text: 'Neu', icon: 'plus', klick: function () { klientendaten(null).then(function (x) { if (x) { gewaehlt = x.id; zeichnen(); } }); } },
      { text: 'Bearbeiten', icon: 'stift', klick: function () { var p = S.finde('patients', gewaehlt); if (!p) return; klientendaten(p).then(function (x) { if (x) zeichnen(); }); } },
      { text: 'Löschen', icon: 'muell', art: 'gefahr', klick: function () {
        var p = S.finde('patients', gewaehlt); if (!p) return;
        UI.bestaetigen('Klient „' + HT.patienten.anzeigename(p) + '“ mit allen Trainingsdaten endgültig löschen? Empfehlung: stattdessen in den Klientendaten (Reiter Kostenträger) ein Behandlungsende eintragen – dann bleibt der Verlauf erhalten.', { gefahr: true, ja: 'Endgültig löschen' }).then(function (ok) {
          if (!ok) return;
          HT.patienten.loeschen(p).then(function () { if (AP.klientId() === p.id) AP.setKlient(''); gewaehlt = ''; zeichnen(); UI.toast(HT.t('geloescht'), 'ok'); });
        });
      } },
      '-',
      { text: 'Export', icon: 'download', titel: 'Alle Daten des Klienten in eine Datei (z. B. USB-Stick)', klick: function () { var p = S.finde('patients', gewaehlt); if (p) HT.patienten.exportieren(p); } },
      { text: 'Import', icon: 'upload', klick: function () { schliessen(); HT.patienten.importieren(); } },
      '-',
      { text: 'Wählen', icon: 'haken', art: 'primaer', klick: waehlen },
      { text: 'Hilfe', icon: 'info', klick: function () { UI.hinweis('Klienten', 'Doppelklick oder „Wählen“ macht einen Klienten zum aktuellen Klienten. Entlassene Klienten (Behandlungsende in der Vergangenheit) werden nur mit dem Haken „Entlassene Klienten“ angezeigt. „Datenschutz“ kürzt die Nachnamen, damit die Liste nicht öffentlich lesbar ist; die Suche findet trotzdem alle Namen. Mit Export/Import werden Klienten samt Verlauf zwischen Macs übertragen.'); } }
    ], { knoepfe: [{ text: HT.t('abbrechen'), wert: null }] }).then(function () { HT.app.neuZeichnen(); });
  }

  /* ===================== Fenster „Klientendaten“ (6 Reiter) ===================== */
  function klientendaten(p) {
    var neu = !p;
    var basis = p ? HT.kopie(p) : { therapeutId: HT.auth.aktuell.id, betroffeneSeite: 'keine', gesichtsfeld: 'frei', haendigkeit: 'rechts', pseudonym: HT.patienten.naechstesPseudonym(), behandlungsbeginn: HT.isoDatum(Date.now()), einstellungen: { selbsteinschaetzung: true }, zusaetzlicheTherapeuten: [] };
    basis.einstellungen = basis.einstellungen || {};
    var plan = p ? HT.plaene.aktiverPlan(p.id) : null;
    var klientModule = plan ? plan.eintraege.map(function (e) { return e.modulId; }) : [];
    var formulare = {};
    var heute = function (inp) { var b = UI.knopf('Heute', { art: 'klein' }); b.addEventListener('click', function () { inp.value = HT.isoDatum(Date.now()); }); return b; };

    var reiter = [
      { id: 'adresse', titel: 'Adresse' }, { id: 'kosten', titel: 'Kostenträger' }, { id: 'module', titel: 'Module' },
      { id: 'akte', titel: 'Akte' }, { id: 'vorgaben', titel: 'Vorgaben' }, { id: 'therapeuten', titel: 'Therapeuten' }
    ];
    var kopf = HT.el('div', { class: 'reiter', style: { marginBottom: '1rem' } });
    var panels = {};
    var box = HT.el('div', { class: 'kd' });
    box.appendChild(kopf);
    reiter.forEach(function (r, i) {
      var b = HT.el('button', { type: 'button', class: 'reiter-knopf' + (i === 0 ? ' aktiv' : '') }, r.titel);
      b.addEventListener('click', function () { HT.$$('.reiter-knopf', kopf).forEach(function (x) { x.classList.remove('aktiv'); }); b.classList.add('aktiv'); Object.keys(panels).forEach(function (k) { panels[k].style.display = k === r.id ? '' : 'none'; }); });
      kopf.appendChild(b);
      panels[r.id] = HT.el('div', { class: 'kd-panel', style: { display: i === 0 ? '' : 'none' } });
      box.appendChild(panels[r.id]);
    });

    // Adresse
    formulare.adresse = UI.formular([
      { name: 'anrede', label: 'Anrede', typ: 'auswahl', optionen: ['', 'Frau', 'Herr', 'Divers'] },
      { name: 'pseudonym', label: 'Pseudonym' },
      { name: 'nachname', label: 'Name', pflicht: true },
      { name: 'vorname', label: 'Vorname', pflicht: true },
      { name: 'namenszusatz', label: 'Namenszusatz' },
      { name: 'geburtsdatum', label: 'Geburtsdatum', typ: 'datum' },
      { name: 'geschlecht', label: 'Geschlecht', typ: 'auswahl', optionen: [{ wert: '', label: '–' }, { wert: 'w', label: 'weiblich' }, { wert: 'm', label: 'männlich' }, { wert: 'd', label: 'divers' }] },
      { name: 'sprache', label: 'Sprache (Training)', typ: 'auswahl', optionen: ['Deutsch'] },
      { name: 'plz', label: 'PLZ' }, { name: 'ort', label: 'Ort' },
      { name: 'strasse', label: 'Straße', breit: true },
      { name: 'telefon', label: 'Telefon' }, { name: 'email', label: 'E-Mail' },
      { name: 'haendigkeit', label: 'Händigkeit', typ: 'auswahl', optionen: [{ wert: 'rechts', label: 'Rechtshänder' }, { wert: 'links', label: 'Linkshänder' }, { wert: 'beide', label: 'beidhändig' }] }
    ], basis);
    panels.adresse.appendChild(formulare.adresse.el);
    if (p) { var pinK = UI.knopf(p.pinHash ? 'Patienten-PIN ändern' : 'Patienten-PIN für den Patientenmodus festlegen', { icon: 'schloss', art: 'klein' }); pinK.addEventListener('click', function () { HT.vorgaben.pinDialog(p); }); pinK.style.marginTop = '1rem'; panels.adresse.appendChild(pinK); }

    // Kostenträger
    formulare.kosten = UI.formular([
      { name: 'versichertennummer', label: 'Versichertennummer (VK-Nr.)' },
      { name: 'versichertenstatus', label: 'Versichertenstatus', typ: 'auswahl', optionen: [{ wert: '', label: '–' }, { wert: 'M', label: 'M – Mitglied' }, { wert: 'F', label: 'F – Familienversichert' }, { wert: 'R', label: 'R – Rentner' }, { wert: 'P', label: 'Privat / Selbstzahler' }] },
      { name: 'krankenkasse', label: 'Krankenkasse / Kostenträger' },
      { name: 'kkNummer', label: 'Krankenkassennummer (IK)' },
      { name: 'behandlungsbeginn', label: 'Beginn der Behandlung (Aufnahme)', typ: 'datum' },
      { name: 'behandlungsende', label: 'Ende der Behandlung (Entlassung)', typ: 'datum' },
      { name: 'verordnung', label: 'Verordnung' }, { name: 'arzt', label: 'Verordnende/r Ärztin/Arzt' },
      { name: 'code', label: 'Studien-/Praxiscode', hilfe: 'z. B. als Auswahlkriterium nach einem Datenexport' },
      { name: 'bemerkung', label: 'Bemerkung' }
    ], basis);
    panels.kosten.appendChild(formulare.kosten.el);
    ['behandlungsbeginn', 'behandlungsende'].forEach(function (n) { formulare.kosten.inputs[n].inp.parentNode.appendChild(heute(formulare.kosten.inputs[n].inp)); });
    if (p) { var lb = UI.knopf('Leistungsbericht', { icon: 'drucker', art: 'klein' }); lb.addEventListener('click', function () { schliessen(null); location.hash = '#/leistungsbericht/' + p.id; }); lb.style.marginTop = '1rem'; panels.kosten.appendChild(lb); }

    // Module (Zuordnung links ↔ rechts)
    var modWahlLinks = null, modWahlRechts = null;
    var modBox = HT.el('div', { class: 'kd-module' });
    var nutzung = AP.nutzung();
    function modZeichnen() {
      HT.leeren(modBox);
      var alle = HT.Module.aktive().filter(function (m) { return klientModule.indexOf(m.id) < 0; }).sort(function (a, b) { return ((nutzung[b.id] || 0) - (nutzung[a.id] || 0)) || a.name.localeCompare(b.name); });
      var vorlagen = HT.vorlagen.alle();
      var lEintr = vorlagen.map(function (v) { return { id: 'vorlage:' + v.id, html: HT.icon('vorlage') + '<span class="ap-name"><b>Trainingseinheit: ' + HT.esc(v.name) + '</b> (' + v.eintraege.length + ')</span>' }; })
        .concat(alle.map(function (m) { return { id: m.id, html: '<span class="ap-kuerzel">' + HT.modulKuerzel(m) + '</span><span class="ap-name">' + HT.esc(m.name) + '</span>' }; }));
      var rEintr = klientModule.map(function (id) { var m = HT.Module.map[id]; return m ? { id: id, html: '<span class="ap-kuerzel">' + HT.modulKuerzel(m) + '</span><span class="ap-name">' + HT.esc(m.name) + '</span>' } : null; }).filter(Boolean);
      var hin = function (id) {
        if (!id) return;
        if (id.indexOf('vorlage:') === 0) { var v = S.finde('templates', id.slice(8)); (v ? v.eintraege : []).forEach(function (e) { if (klientModule.indexOf(e.modulId) < 0 && HT.Module.map[e.modulId]) klientModule.push(e.modulId); }); }
        else if (klientModule.indexOf(id) < 0) klientModule.push(id);
        modZeichnen();
      };
      var weg = function (id) { if (!id) return; klientModule = klientModule.filter(function (x) { return x !== id; }); modZeichnen(); };
      modWahlLinks = auswahlListe(lEintr, { doppelklick: hin, klasse: 'hoch' });
      modWahlRechts = auswahlListe(rEintr, { doppelklick: weg, klasse: 'hoch', leer: 'Noch keine Module zugeordnet.' });
      var mitte = HT.el('div', { class: 'kd-pfeile' });
      mitte.appendChild(UI.iconKnopf('rechts', 'Zuordnen', function () { hin(modWahlLinks.wert()); }, 'rand'));
      mitte.appendChild(UI.iconKnopf('links', 'Entfernen', function () { weg(modWahlRechts.wert()); }, 'rand'));
      mitte.appendChild(UI.iconKnopf('hoch', 'Nach oben', function () { var id = modWahlRechts.wert(), i = klientModule.indexOf(id); if (i > 0) { klientModule.splice(i, 1); klientModule.splice(i - 1, 0, id); modZeichnen(); } }, 'rand'));
      mitte.appendChild(UI.iconKnopf('runter', 'Nach unten', function () { var id = modWahlRechts.wert(), i = klientModule.indexOf(id); if (i >= 0 && i < klientModule.length - 1) { klientModule.splice(i, 1); klientModule.splice(i + 1, 0, id); modZeichnen(); } }, 'rand'));
      modBox.appendChild(HT.el('div', null, [HT.el('div', { class: 'feld-label' }, 'Alle Module und Trainingseinheiten (nach Nutzungshäufigkeit)'), modWahlLinks]));
      modBox.appendChild(mitte);
      modBox.appendChild(HT.el('div', null, [HT.el('div', { class: 'feld-label' }, 'Module des Klienten (aktiver Trainingsplan)'), modWahlRechts]));
    }
    modZeichnen();
    panels.module.appendChild(modBox);
    panels.module.appendChild(HT.el('p', { class: 'gedimmt klein', style: { marginTop: '.6rem' } }, 'Doppelklick oder Pfeiltasten ordnen zu bzw. entfernen. Dauer, Startlevel und Parameter je Modul stellen Sie über „Parameter“ im Startfenster oder im Trainingsplan-Editor ein.'));

    // Akte
    var akteRaster = HT.el('div', { class: 'kd-akte' });
    var notiz = HT.el('textarea', { rows: 14, placeholder: 'Akte / Notizen: Befund, Beobachtungen, Absprachen …' });
    notiz.value = basis.notizen || '';
    akteRaster.appendChild(HT.el('label', { class: 'feld' }, [HT.el('span', { class: 'feld-label' }, 'Akte'), notiz]));
    formulare.akte = UI.formular([
      { name: 'selbsteinschaetzung', label: 'Selbsteinschätzung vor/nach dem Training', typ: 'schalter', breit: true },
      { name: 'kontrast', label: 'Hoher Kontrast', typ: 'schalter', breit: true },
      { name: 'gesichtsfeld', label: 'Gesichtsfeldstörung', typ: 'auswahl', breit: true, optionen: [{ wert: 'frei', label: 'keine / unauffällig' }, { wert: 'links eingeschränkt', label: 'links' }, { wert: 'rechts eingeschränkt', label: 'rechts' }] },
      { name: 'betroffeneSeite', label: 'Neglect / betroffene Seite', typ: 'auswahl', breit: true, optionen: [{ wert: 'keine', label: 'keine' }, { wert: 'links', label: 'links' }, { wert: 'rechts', label: 'rechts' }] },
      { name: 'diagnose', label: 'Diagnose', breit: true, platzhalter: 'z. B. Schlaganfall, SHT, MS …' },
      { name: 'icd10', label: 'ICD-10', breit: true },
      { name: 'schuljahre', label: 'Jahre Schule / Ausbildung', typ: 'zahl', min: 0, max: 30, breit: true }
    ], HT.zusammen(basis, { selbsteinschaetzung: basis.einstellungen.selbsteinschaetzung !== false, kontrast: !!basis.einstellungen.kontrast }));
    formulare.akte.el.style.gridTemplateColumns = '1fr';
    akteRaster.appendChild(formulare.akte.el);
    panels.akte.appendChild(akteRaster);

    // Vorgaben
    if (p) { var vw = HT.el('div'); HT.vorgaben.karte(p, vw); panels.vorgaben.appendChild(vw); }
    else panels.vorgaben.appendChild(UI.leer('Die Therapievorgaben (Wochenplan) können nach dem ersten Speichern festgelegt werden.', 'kalender'));

    // Therapeuten
    var thBox = HT.el('div', { class: 'kd-therapeuten' });
    thBox.appendChild(HT.el('p', { class: 'gedimmt klein' }, 'Nur hier aktivierte Therapeuten können mit diesem Klienten trainieren und seine Ergebnisse einsehen (Administratoren immer). Der verantwortliche Therapeut erscheint in Berichten.'));
    var zus = (basis.zusaetzlicheTherapeuten || []).slice();
    if (basis.weitererTherapeutId && zus.indexOf(basis.weitererTherapeutId) < 0) zus.push(basis.weitererTherapeutId);
    var verantwortlich = basis.therapeutId;
    HT.auth.therapeuten().forEach(function (t) {
      var z = HT.el('div', { class: 'liste-eintrag' });
      var cb = HT.el('input', { type: 'checkbox', class: 'schalter' }); cb.checked = t.id === verantwortlich || zus.indexOf(t.id) >= 0;
      var rb = HT.el('input', { type: 'radio', name: 'kdverantw' }); rb.checked = t.id === verantwortlich;
      cb.addEventListener('change', function () { if (cb.checked) { if (zus.indexOf(t.id) < 0) zus.push(t.id); } else { zus = zus.filter(function (x) { return x !== t.id; }); if (rb.checked) { cb.checked = true; UI.toast('Der verantwortliche Therapeut muss aktiviert bleiben.'); } } });
      rb.addEventListener('change', function () { if (rb.checked) { verantwortlich = t.id; cb.checked = true; } });
      z.appendChild(cb);
      z.appendChild(HT.el('div', { class: 'le-text', style: { marginLeft: '.8rem' }, html: '<strong>' + HT.esc(t.name) + '</strong><span>' + HT.esc(t.station || (t.rolle === 'admin' ? 'Administrator' : 'Therapeut')) + '</span>' }));
      z.appendChild(HT.el('label', { class: 'ap-check' }, [rb, document.createTextNode(' verantwortlich')]));
      thBox.appendChild(z);
    });
    panels.therapeuten.appendChild(thBox);

    return UI.dialog({ fokusFeld: neu, titel: neu ? 'Neuer Klient – Klientendaten' : 'Klientendaten: ' + HT.patienten.anzeigename(p), inhalt: box, breit: true, klasse: 'kd-dialog', knoepfe: [
      { text: HT.t('abbrechen'), wert: null },
      { text: 'OK', art: 'primaer', aktion: function () {
        if (!formulare.adresse.pruefen()) { kopf.children[0].click(); return false; }
        var w = HT.zusammen(formulare.adresse.werte(), formulare.kosten.werte(), formulare.akte.werte());
        var obj = HT.zusammen(basis, w);
        obj.notizen = notiz.value;
        if (obj.geburtsdatum) obj.geburtsjahr = Number(obj.geburtsdatum.slice(0, 4));
        obj.einstellungen = HT.zusammen(basis.einstellungen, { selbsteinschaetzung: w.selbsteinschaetzung, kontrast: w.kontrast });
        delete obj.selbsteinschaetzung; delete obj.kontrast;
        obj.therapeutId = verantwortlich;
        obj.zusaetzlicheTherapeuten = zus.filter(function (x) { return x !== verantwortlich; });
        delete obj.weitererTherapeutId;
        if (obj.behandlungsende && obj.behandlungsende >= HT.isoDatum(Date.now())) obj.archiviert = false;
        return HT.patienten.speichern(obj).then(function (gespeichert) {
          // Module des Klienten → aktiver Trainingsplan
          var pl = HT.plaene.aktiverPlan(gespeichert.id) || HT.plaene.vonPatient(gespeichert.id)[0];
          if (!klientModule.length && !pl) return gespeichert;
          var alt = {};
          (pl ? pl.eintraege : []).forEach(function (e) { alt[e.modulId] = e; });
          var eintraege = klientModule.map(function (id) { return alt[id] || { modulId: id, dauerMin: S.einstellungen().standarddauer || 5, startLevel: 'auto', anleitung: 'auto', parameterOverrides: {} }; });
          var neuPlan = pl ? HT.zusammen(pl, { eintraege: eintraege, aktiv: true }) : { id: HT.uid('pla'), patientId: gespeichert.id, name: 'Trainingsplan', eintraege: eintraege, pauseMin: 1, aktiv: true, angelegtAm: Date.now() };
          return S.put('plans', neuPlan).then(function () { return gespeichert; });
        }).then(function (g) { UI.toast(HT.t('gespeichert'), 'ok'); if (neu) AP.setKlient(g.id); return g; });
      } }
    ] });
  }
  AP.klientendaten = klientendaten;

  /* ===================== Fenster „Module“ ===================== */
  function moduleFenster() {
    var gewaehlt = AP.auswahl.modul && HT.Module.map[AP.auswahl.modul] ? AP.auswahl.modul : (HT.Module.liste[0] || {}).id;
    var wrap = HT.el('div');
    var nutzung = AP.nutzung();
    function zeichnen() {
      HT.leeren(wrap);
      var vorlagen = HT.vorlagen.alle().map(function (v) { return { id: 'vorlage:' + v.id, html: HT.icon('vorlage') + '<span class="ap-name"><b>' + HT.esc(v.name) + '</b> · Trainingseinheit mit ' + v.eintraege.length + ' Modulen · ' + HT.plaene.gesamtdauer(v) + ' min</span>' + (v.standard ? '' : UI.abzeichen('eigene', 'akzent').outerHTML) }; });
      var mods = HT.Module.liste.filter(function (m) { return !m.versteckt; }).sort(function (a, b) { return AP.sortNutzung() ? ((nutzung[b.id] || 0) - (nutzung[a.id] || 0)) || a.name.localeCompare(b.name) : a.name.localeCompare(b.name); })
        .map(function (m) { var kat = HT.kategorie(m.kategorie); return { id: m.id, inaktiv: !!(S.einstellungen().moduleInaktiv || {})[m.id], html: '<span class="ap-modul-icon" style="background:' + kat.farbe + '">' + HT.icon(m.symbol || kat.icon) + '</span><span class="ap-kuerzel">' + HT.modulKuerzel(m) + '</span><span class="ap-name">' + HT.esc(m.name) + '</span><span class="klein gedimmt">' + HT.esc(kat.name) + '</span>' + (((S.einstellungen().standardParameter || {})[m.id]) ? UI.abzeichen('angepasst', 'gelb').outerHTML : '') }; });
      wrap.appendChild(HT.el('div', { class: 'feld-label' }, 'Trainingseinheiten (Modulkombinationen)'));
      wrap.appendChild(auswahlListe(vorlagen, { gewaehlt: gewaehlt, beiWahl: function (id) { gewaehlt = id; }, doppelklick: function () { waehlen(); } }));
      wrap.appendChild(HT.el('div', { class: 'feld-label', style: { marginTop: '.8rem' } }, 'Standardmodule'));
      wrap.appendChild(auswahlListe(mods, { gewaehlt: gewaehlt, beiWahl: function (id) { gewaehlt = id; }, doppelklick: function () { waehlen(); }, klasse: 'hoch' }));
    }
    function istVorlage() { return String(gewaehlt).indexOf('vorlage:') === 0; }
    function waehlen() {
      var k = AP.klient();
      if (!k) { UI.toast('Bitte zuerst einen Klienten wählen.', 'fehler'); return; }
      if (istVorlage()) {
        var v = S.finde('templates', gewaehlt.slice(8));
        HT.plaene.neu(k.id, v).then(function (pl) { return HT.plaene.aktivieren(pl); }).then(function () { AP.auswahl.gruppe = 'klient'; AP.auswahl.modul = '__plan'; UI.toast('Trainingseinheit „' + v.name + '“ als Trainingsplan zugeordnet.', 'ok'); schliessen(); });
        return;
      }
      var pl = HT.plaene.aktiverPlan(k.id) || HT.plaene.vonPatient(k.id)[0];
      var weiter = function (plan) {
        if (!plan.eintraege.some(function (e) { return e.modulId === gewaehlt; })) plan.eintraege.push({ modulId: gewaehlt, dauerMin: S.einstellungen().standarddauer || 5, startLevel: 'auto', anleitung: 'auto', parameterOverrides: {} });
        plan.aktiv = true;
        S.put('plans', plan).then(function () { AP.auswahl.gruppe = 'klient'; AP.auswahl.modul = gewaehlt; schliessen(); });
      };
      if (pl) weiter(pl); else weiter({ id: HT.uid('pla'), patientId: k.id, name: 'Trainingsplan', eintraege: [], pauseMin: 1, aktiv: true, angelegtAm: Date.now() });
    }
    zeichnen();
    fenster('Module', wrap, [
      { text: 'Neu', icon: 'plus', titel: 'Neue Trainingseinheit (Modulkombination) anlegen', klick: function () { S.put('templates', { id: HT.uid('vor'), name: 'Neue Trainingseinheit', beschreibung: '', eintraege: [], pauseMin: 1 }).then(function (v) { schliessen(); location.hash = '#/vorlage/' + v.id; }); } },
      { text: 'Bearbeiten', icon: 'stift', klick: function () { if (!istVorlage()) { UI.toast('Standardmodule können nicht verändert werden – nutzen Sie „Parameter“ oder legen Sie eine Trainingseinheit an.'); return; } schliessen(); location.hash = '#/vorlage/' + gewaehlt.slice(8); } },
      { text: 'Löschen', icon: 'muell', art: 'gefahr', klick: function () { if (!istVorlage()) { UI.toast('Standardmodule können nicht gelöscht werden (ausblenden über die Modulbibliothek).'); return; } var v = S.finde('templates', gewaehlt.slice(8)); UI.bestaetigen('Trainingseinheit „' + v.name + '“ löschen?', { gefahr: true, ja: HT.t('loeschen') }).then(function (ok) { if (ok) S.delete('templates', v.id).then(function () { gewaehlt = HT.Module.liste[0].id; zeichnen(); }); }); } },
      { text: 'Parameter', icon: 'zahnrad', titel: 'Standardparameter für alle Klienten, die dieses Modul neu beginnen', klick: function () { if (istVorlage()) { schliessen(); location.hash = '#/vorlage/' + gewaehlt.slice(8); return; } standardParameter(HT.Module.map[gewaehlt]).then(zeichnen); } },
      { text: 'Details', icon: 'info', klick: function () { if (istVorlage()) return; schliessen(); location.hash = '#/modul/' + gewaehlt; } },
      '-',
      { text: 'Wählen', icon: 'haken', art: 'primaer', titel: 'Dem aktuellen Klienten zuordnen und für den Start auswählen', klick: waehlen }
    ], { knoepfe: [{ text: HT.t('schliessen'), wert: null }] }).then(function () { HT.app.neuZeichnen(); });
  }

  function schemaFelder(m) {
    return Object.keys(m.parameterSchema).map(function (k) {
      var sc = m.parameterSchema[k], f = { name: k, label: sc.label || k, standard: sc.standard, breit: true, hilfe: sc.hilfe };
      if (sc.typ === 'auswahl') { f.typ = 'auswahl'; f.optionen = sc.optionen; } else if (sc.typ === 'schalter') f.typ = 'schalter'; else { f.typ = 'zahl'; f.min = sc.min; f.max = sc.max; f.schritt = sc.schritt; }
      return f;
    });
  }

  /* Standardparameter eines Moduls (gelten für alle Klienten, sofern nicht individuell geändert) */
  function standardParameter(m) {
    var std = HT.kopie(S.einstellungen().standardParameter || {});
    var felder = schemaFelder(m);
    return UI.formularDialog('Standardparameter: ' + m.name, [{ typ: 'titel', label: 'Gilt für alle Klienten ohne individuelle Einstellung' }].concat(felder), std[m.id] || {}, { ok: 'Als Standard speichern' }).then(function (w) {
      if (!w) return;
      std[m.id] = w;
      return S.einstellungenSpeichern({ standardParameter: std }).then(function () { UI.toast('Standardparameter gespeichert', 'ok'); });
    });
  }

  /* ===================== Fenster „Parameter“ (für den aktuellen Klienten) ===================== */
  function parameterFenster() {
    var k = AP.klient();
    if (!k) { UI.toast('Bitte zuerst einen Klienten wählen.', 'fehler'); return; }
    var id = AP.auswahl.modul;
    if (!id || id === '__plan') { var pl0 = HT.plaene.aktiverPlan(k.id); if (pl0) { location.hash = '#/plan/' + pl0.id; return; } UI.toast('Bitte ein Modul wählen.', 'fehler'); return; }
    var m = HT.Module.map[id];
    var pl = HT.plaene.aktiverPlan(k.id) || HT.plaene.vonPatient(k.id)[0];
    var e = pl ? pl.eintraege.filter(function (x) { return x.modulId === id; })[0] : null;
    var z = HT.patienten.zustand(k.id, id);
    var felder = [
      { typ: 'titel', label: 'Training' },
      { name: 'dauerMin', label: 'Konsultationsdauer (Minuten)', typ: 'zahl', min: 1, max: 60 },
      { name: 'startLevel', label: 'Startlevel', typ: 'auswahl', optionen: [{ wert: 'auto', label: 'automatisch (aktuell Level ' + z.aktuellesLevel + ')' }].concat(m.levels.map(function (l, i) { return { wert: i + 1, label: 'Level ' + (i + 1) }; })) },
      { name: 'anleitung', label: 'Ausführliche Anleitung', typ: 'auswahl', optionen: [{ wert: 'auto', label: 'automatisch (erste 2 Sitzungen)' }, { wert: 'immer', label: 'immer' }, { wert: 'nie', label: 'nie' }] },
      { name: 'automatik', label: 'Adaptive Levelanpassung (Automatik)', typ: 'schalter', breit: true },
      { typ: 'titel', label: 'Modulspezifische Parameter' }
    ].concat(schemaFelder(m));
    var werte = HT.zusammen(HT.Module.parameter(m, z.aktuellesLevel, e ? e.parameterOverrides : {}), { dauerMin: e ? e.dauerMin : (S.einstellungen().standarddauer || 5), startLevel: e ? e.startLevel : 'auto', anleitung: e ? e.anleitung || 'auto' : 'auto', automatik: z.automatik !== false });
    UI.formularDialog('Parameter: ' + m.name + ' – ' + HT.patienten.anzeigename(k), felder, werte, { breit: true, ok: 'Übernehmen' }).then(function (w) {
      if (!w) return;
      var over = {};
      Object.keys(m.parameterSchema).forEach(function (key) { if (w[key] !== undefined && w[key] !== null) over[key] = w[key]; });
      var eintrag = { modulId: id, dauerMin: w.dauerMin || 5, startLevel: w.startLevel === 'auto' ? 'auto' : Number(w.startLevel), anleitung: w.anleitung, parameterOverrides: over };
      var plan = pl || { id: HT.uid('pla'), patientId: k.id, name: 'Trainingsplan', eintraege: [], pauseMin: 1, aktiv: true, angelegtAm: Date.now() };
      var i = plan.eintraege.map(function (x) { return x.modulId; }).indexOf(id);
      if (i >= 0) plan.eintraege[i] = HT.zusammen(plan.eintraege[i], eintrag); else plan.eintraege.push(eintrag);
      z.automatik = w.automatik;
      Promise.all([S.put('plans', plan), S.put('moduleState', z)]).then(function () { UI.toast('Parameter für ' + HT.patienten.anzeigename(k) + ' gespeichert', 'ok'); HT.app.neuZeichnen(); });
    });
  }

  /* ===================== Fenster „System“ ===================== */
  function systemFenster() {
    var admin = HT.auth.istAdmin();
    var kacheln = [
      ['Einstellungen', 'zahnrad', 'Darstellung, Ton, Training, Bildschirm', function () { location.hash = '#/einstellungen'; }, true],
      ['Verwaltung', 'schild', 'Therapeuten, Praxisdaten, Vorlagen, Schwellen', function () { location.hash = '#/verwaltung/therapeuten'; }, admin],
      ['Datensicherung', 'sicherung', 'Sichern und wiederherstellen', function () { if (admin) location.hash = '#/verwaltung/sicherung'; else HT.sicherung.exportieren(); }, true],
      ['Patientenmodus', 'schloss', 'Selbstständiges Training starten', function () { location.hash = '#/patientenstart'; }, true],
      ['Bedienpult', 'pult', 'USB-Pult verbinden, testen, Tasten einrichten', function () { HT.pult.dialog(); }, !!HT.pult],
      ['Lautstärke', 'ton', 'Ton testen', function () { HT.audio.an = true; HT.audio.richtig(); setTimeout(HT.audio.ende, 400); }, true],
      ['Übersicht & Statistik', 'diagramm', admin ? 'Alle Klienten, Auswertung' : 'Meine Klienten, Auswertung', function () { location.hash = '#/auswertung'; }, true],
      ['Modulbibliothek', 'raster', 'Module ansehen, ein-/ausblenden', function () { location.hash = '#/module'; }, true],
      ['Info', 'info', 'Version und Speicher', function () {
        UI.hinweis('Hirntraining', 'Version 2.0' + (window.HT_STAND ? ' · Stand ' + window.HT_STAND.datum + ' (' + window.HT_STAND.v + ')' : '') + ' · lokal und offline · Datenspeicher: ' + S.backend + ' · ' + HT.Module.liste.length + ' Module · ' + S.alle('patients').length + ' Klienten · ' + S.alle('runs').length + ' Durchgänge gespeichert.');
      }, true]
    ];
    var g = HT.el('div', { class: 'ap-system' });
    kacheln.forEach(function (k) {
      if (!k[4]) return;
      var b = HT.el('button', { type: 'button', class: 'ap-system-kachel', html: '<span class="ap-gross-icon">' + HT.icon(k[1]) + '</span><b>' + k[0] + '</b><small>' + k[2] + '</small>' });
      b.addEventListener('click', function () { schliessen(null); setTimeout(k[3], 50); });
      g.appendChild(b);
    });
    UI.dialog({ titel: 'System', inhalt: g, breit: true, knoepfe: [{ text: HT.t('schliessen'), wert: null }] });
  }
})();

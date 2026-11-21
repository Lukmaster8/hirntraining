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
      if (ev.key === 'ArrowDown') { ev.preventDefault(); i = Math.min(eintraege.length - 1, i + 1); waehlen(eintraege[i].id); zeilen[i].scrollIntoView({ block: 'nearest' }); }
      if (ev.key === 'ArrowUp') { ev.preventDefault(); i = Math.max(0, i - 1); waehlen(eintraege[i].id); zeilen[i].scrollIntoView({ block: 'nearest' }); }
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
    kr.appendChild(UI.knopf('Übersicht & Statistik', { art: 'geist klein', icon: 'diagramm', klick: function () { location.hash = '#/uebersicht'; } }));
    kr.appendChild(UI.knopf('', { art: 'geist klein', icon: 'vollbild', titel: 'Vollbild', klick: function () { HT.app.vollbild(); } }));
    kopf.appendChild(kr);
    fe.appendChild(kopf);

    var koerper = HT.el('div', { class: 'ap-koerper' });
    // Linke Schalterleiste
    var status = HT.el('div', { class: 'ap-status' }, 'Bereit.');
    var links = HT.el('nav', { class: 'ap-schalter' });
    var schalter = function (text, icon, hinweis, klick, extra) {
      var b = HT.el('button', { type: 'button', class: 'ap-gross' + (extra ? ' ' + extra : ''), html: '<span class="ap-gross-icon">' + HT.icon(icon) + '</span><span>' + HT.esc(text) + '</span>' });
      b.addEventListener('click', klick);
      b.addEventListener('mouseenter', function () { status.textContent = hinweis; });
      b.addEventListener('mouseleave', function () { status.textContent = 'Bereit.'; });
      links.appendChild(b);
      return b;
    };
    schalter('Therapeuten', 'personen', 'Therapeuten anlegen, bearbeiten und den aktuellen Therapeuten wählen.', therapeutenListe);
    schalter('Klienten', 'person', 'Klienten aufnehmen, bearbeiten, suchen, exportieren/importieren und auswählen.', klientenFenster);
    schalter('Module', 'raster', 'Trainingsmodule und eigene Trainingseinheiten verwalten, Standardparameter festlegen.', moduleFenster);
    schalter('Parameter', 'zahnrad', 'Trainingsparameter des gewählten Moduls für den aktuellen Klienten anpassen.', function () { parameterFenster(); });
    schalter('Ergebnisse', 'diagramm', 'Verlaufsdaten, Sitzungsanalyse, Berichte und Exporte des aktuellen Klienten.', function () { var k = AP.klient(); if (!k) { UI.toast('Bitte zuerst einen Klienten wählen.', 'fehler'); return; } location.hash = '#/patient/' + k.id + '/verlauf'; });
    links.appendChild(HT.el('div', { class: 'ap-abstand' }));
    schalter('Hilfe', 'info', 'Kurzanleitung und Tastaturbelegung.', function () { location.hash = '#/hilfe'; });
    schalter('System', 'zahnrad', 'Einstellungen, Verwaltung, Datensicherung, Patientenmodus und Systeminformationen.', systemFenster);
    schalter('Schließen', 'abmelden', 'Abmelden und zum Startbildschirm zurückkehren.', HT.auth.abmelden, 'gefahr');
    koerper.appendChild(links);

    // Rechte Seite
    var rechts = HT.el('div', { class: 'ap-rechts' });
    var kopfzeilen = HT.el('div', { class: 'ap-auswahlzeilen' });
    // aktueller Therapeut
    var thSel = HT.el('select');
    HT.auth.therapeuten().forEach(function (x) { var o = HT.el('option', { value: x.id }, therapeutLabel(x) + (x.rolle === 'admin' ? '  (Administrator)' : '')); if (x.id === t.id) o.selected = true; thSel.appendChild(o); });
    thSel.addEventListener('change', function () {
      var neu = S.finde('therapists', thSel.value);
      var feld = UI.pinFeld(function (pin, fehler) {
        HT.auth.pruefen(neu, pin).then(function (ok) {
          if (!ok) { fehler(); return; }
          HT.auth.anmelden(neu); try { localStorage.setItem('ht-letzter-therapeut', neu.id); } catch (x) { /* egal */ }
          AP.setKlient(''); schliessen(true); HT.app.neuZeichnen(); UI.toast('Angemeldet als ' + neu.name, 'ok');
        });
      }, { text: 'PIN von ' + neu.name, manuell: true });
      UI.dialog({ titel: 'Therapeut anmelden', inhalt: feld, klasse: 'pin-dialog', knoepfe: [{ text: HT.t('abbrechen'), wert: null }] }).then(function (w) { if (!w) thSel.value = t.id; });
    });
    kopfzeilen.appendChild(HT.el('label', { class: 'ap-auswahl' }, [HT.el('span', null, 'aktueller Therapeut'), thSel]));
    // aktueller Klient
    var klSel = HT.el('select');
    klSel.appendChild(HT.el('option', { value: '' }, '– bitte Klient wählen –'));
    HT.patienten.alle(true).forEach(function (x) { var o = HT.el('option', { value: x.id }, (HT.patienten.entlassen(x) ? '○ ' : '● ') + klientLabel(x)); if (p && x.id === p.id) o.selected = true; klSel.appendChild(o); });
    klSel.addEventListener('change', function () { AP.setKlient(klSel.value); AP.auswahl.modul = null; HT.app.neuZeichnen(); });
    var klZeile = HT.el('label', { class: 'ap-auswahl' }, [HT.el('span', null, 'aktueller Klient'), klSel]);
    if (p) klZeile.appendChild(UI.iconKnopf('stift', 'Klientendaten bearbeiten', function (ev) { ev.preventDefault(); klientendaten(p).then(function (x) { if (x) HT.app.neuZeichnen(); }); }, 'rand'));
    kopfzeilen.appendChild(klZeile);
    rechts.appendChild(kopfzeilen);
    if (t.rolle === 'admin') rechts.appendChild(HT.el('div', { class: 'ap-hinweis' }, 'Administrator: Sie sehen alle Klienten aller Therapeuten.'));
    else if (S.einstellungen().nurEigenePatienten) rechts.appendChild(HT.el('div', { class: 'ap-hinweis' }, 'Es werden die Klienten angezeigt, die ' + t.name + ' betreut.'));

    // Reiter Training / Screening
    var karte = HT.el('section', { class: 'ap-reiterkarte' });
    var reiterKopf = HT.el('div', { class: 'ap-reiterkopf' });
    var rT = HT.el('button', { type: 'button', class: AP.auswahl.tab === 'training' ? 'aktiv' : '' }, 'Training');
    var rS = HT.el('button', { type: 'button', class: AP.auswahl.tab === 'screening' ? 'aktiv' : '' }, 'Screening');
    rT.addEventListener('click', function () { AP.auswahl.tab = 'training'; AP.auswahl.modul = null; HT.app.neuZeichnen(); });
    rS.addEventListener('click', function () { AP.auswahl.tab = 'screening'; AP.auswahl.modul = null; HT.app.neuZeichnen(); });
    reiterKopf.appendChild(rT); reiterKopf.appendChild(rS);
    var sortL = HT.el('label', { class: 'ap-check' });
    var sortC = HT.el('input', { type: 'checkbox' }); sortC.checked = AP.sortNutzung();
    sortC.addEventListener('change', function () { try { localStorage.setItem('ht-sort-nutzung', sortC.checked ? '1' : '0'); } catch (x) { /* egal */ } HT.app.neuZeichnen(); });
    sortL.appendChild(sortC); sortL.appendChild(document.createTextNode(' sortieren nach Nutzungshäufigkeit'));
    reiterKopf.appendChild(sortL);
    karte.appendChild(reiterKopf);
    var inhalt = HT.el('div', { class: 'ap-reiterinhalt' });
    karte.appendChild(inhalt);
    rechts.appendChild(karte);

    var nutzung = AP.nutzung();
    var plan = p ? HT.plaene.aktiverPlan(p.id) : null;
    function sortiert(mods) {
      mods = mods.slice();
      if (AP.sortNutzung()) mods.sort(function (a, b) {
        var na = p ? S.alle('runs', function (r) { return r.patientId === p.id && r.modulId === a.id; }).length : 0, nb = p ? S.alle('runs', function (r) { return r.patientId === p.id && r.modulId === b.id; }).length : 0;
        return (nb - na) || ((nutzung[b.id] || 0) - (nutzung[a.id] || 0)) || a.name.localeCompare(b.name);
      });
      else mods.sort(function (a, b) { return a.name.localeCompare(b.name); });
      return mods;
    }
    function modulZeile(m) {
      var kat = HT.kategorie(m.kategorie), lv = p ? HT.patienten.zustand(p.id, m.id).aktuellesLevel : null;
      var war = p && S.alle('runs', function (r) { return r.patientId === p.id && r.modulId === m.id; }).length;
      return { id: m.id, html: '<span class="ap-modul-icon" style="background:' + kat.farbe + '">' + HT.icon(m.symbol || kat.icon) + '</span><span class="ap-kuerzel">' + HT.modulKuerzel(m) + '</span><span class="ap-name">' + HT.esc(m.name) + '</span>' + (war ? '<span class="abzeichen akzent">L' + lv + '</span>' : '') };
    }
    if (AP.auswahl.tab === 'training') {
      var g = HT.el('div', { class: 'ap-zweispaltig' });
      var gruppen = [{ id: 'klient', html: HT.icon('person') + '<span>Module des Klienten</span>' }, { id: 'alle', html: HT.icon('raster') + '<span>alle Module</span>' }]
        .concat(HT.KATEGORIEN.map(function (k) { return { id: k.id, html: '<span class="ap-kat-punkt" style="background:' + k.farbe + '">' + HT.icon(k.icon) + '</span><span>' + HT.esc(k.name) + '</span>' }; }));
      var modListeWrap = HT.el('div', { class: 'ap-spalte' });
      var gl = auswahlListe(gruppen, { gewaehlt: AP.auswahl.gruppe, beiWahl: function (id) { AP.auswahl.gruppe = id; AP.auswahl.modul = null; module(); } });
      g.appendChild(HT.el('div', { class: 'ap-spalte' }, [HT.el('div', { class: 'ap-spaltenkopf' }, 'Gruppe'), gl]));
      g.appendChild(modListeWrap);
      inhalt.appendChild(g);
      var module = function () {
        HT.leeren(modListeWrap);
        modListeWrap.appendChild(HT.el('div', { class: 'ap-spaltenkopf' }, 'Module'));
        var mods, eintr = [];
        if (AP.auswahl.gruppe === 'klient') {
          mods = plan ? plan.eintraege.map(function (x) { return HT.Module.map[x.modulId]; }).filter(Boolean) : [];
          if (plan && mods.length) eintr.push({ id: '__plan', html: '<span class="ap-modul-icon" style="background:var(--akzent)">' + HT.icon('vorlage') + '</span><span class="ap-name"><b>Gesamter Trainingsplan „' + HT.esc(plan.name) + '“</b> · ' + plan.eintraege.length + ' Module · ca. ' + HT.plaene.gesamtdauer(plan) + ' min</span>' });
          mods = AP.sortNutzung() ? sortiert(mods) : mods;
        } else if (AP.auswahl.gruppe === 'alle') mods = sortiert(HT.Module.aktive());
        else mods = sortiert(HT.Module.aktive().filter(function (m) { return m.kategorie === AP.auswahl.gruppe; }));
        mods.forEach(function (m) { eintr.push(modulZeile(m)); });
        if (!AP.auswahl.modul && eintr.length) AP.auswahl.modul = eintr[0].id;
        modListeWrap.appendChild(auswahlListe(eintr, { gewaehlt: AP.auswahl.modul, beiWahl: function (id) { AP.auswahl.modul = id; }, doppelklick: function () { starten(); },
          leer: AP.auswahl.gruppe === 'klient' ? (p ? 'Diesem Klienten sind noch keine Module zugeordnet. Über „Module“ oder die Klientendaten (Reiter Module) zuordnen – oder ein Modul aus einer anderen Gruppe wählen.' : 'Bitte zuerst oben einen Klienten wählen.') : 'Keine Module.' }));
      };
      module();
    } else {
      inhalt.appendChild(HT.el('p', { class: 'gedimmt klein', style: { margin: '0 0 .6rem' } }, 'Screening = Einstufungstest: Das Level steigt schnell, bis die Trefferquote unter 80 % fällt. Das letzte sicher gelöste Level wird als Startlevel übernommen. Für eine Verlaufskontrolle nach etwa 10 Sitzungen wiederholen. (Hinweis: ohne Normwerte gesunder Vergleichspersonen – kein Ersatz für neuropsychologische Diagnostik.)'));
      var eintr2 = [];
      if (plan) eintr2.push({ id: '__plan', html: '<span class="ap-modul-icon" style="background:var(--akzent)">' + HT.icon('ziel') + '</span><span class="ap-name"><b>Einstufung aller Module des Klienten</b> (' + plan.eintraege.length + ')</span>' });
      sortiert(HT.Module.aktive()).forEach(function (m) {
        var r = modulZeile(m);
        var einst = p ? S.alle('runs', function (x) { return x.patientId === p.id && x.modulId === m.id && x.einstufung; }) : [];
        if (einst.length) r.html += '<span class="klein gedimmt" style="margin-left:.5rem">zuletzt ' + HT.datum(einst[einst.length - 1].start) + '</span>';
        eintr2.push(r);
      });
      if (!AP.auswahl.modul && eintr2.length) AP.auswahl.modul = eintr2[0].id;
      inhalt.appendChild(auswahlListe(eintr2, { gewaehlt: AP.auswahl.modul, beiWahl: function (id) { AP.auswahl.modul = id; }, doppelklick: function () { starten(); }, klasse: 'hoch' }));
    }

    // Fußzeile: Non-Stop + Start
    var fuss = HT.el('div', { class: 'ap-fuss' });
    var nsL = HT.el('label', { class: 'ap-check' });
    var nsC = HT.el('input', { type: 'checkbox' }); nsC.checked = AP.nonstop();
    nsC.addEventListener('change', function () { try { localStorage.setItem('ht-nonstop', nsC.checked ? '1' : '0'); } catch (x) { /* egal */ } });
    nsL.appendChild(nsC); nsL.appendChild(document.createTextNode(' Modul Non-Stop'));
    nsL.title = 'Ohne Zwischenbildschirme durcharbeiten (für selbstständig trainierende Klienten)';
    fuss.appendChild(nsL);
    var startK = HT.el('button', { type: 'button', class: 'ap-start', html: HT.icon('play') + '<span>Start</span>' });
    startK.addEventListener('click', starten);
    startK.addEventListener('mouseenter', function () { status.textContent = 'Training mit dem gewählten Modul für den aktuellen Klienten starten.'; });
    fuss.appendChild(startK);
    rechts.appendChild(fuss);
    koerper.appendChild(rechts);
    fe.appendChild(koerper);
    fe.appendChild(status);
    seite.appendChild(fe);
    wurzel.appendChild(seite);

    function starten() {
      var k = AP.klient();
      if (!k) { UI.toast('Bitte zuerst einen Klienten wählen.', 'fehler'); klSel.focus(); return; }
      var id = AP.auswahl.modul;
      if (!id) { UI.toast('Bitte ein Modul wählen.', 'fehler'); return; }
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
          if (!ok) { fehler(); return; }
          HT.auth.anmelden(t); AP.setKlient(''); schliessen(); setTimeout(function () { schliessen(); HT.app.neuZeichnen(); }, 30);
        });
      }, { text: 'PIN von ' + t.name, manuell: true });
      UI.dialog({ titel: 'Therapeut wählen', inhalt: feld, klasse: 'pin-dialog', knoepfe: [{ text: HT.t('abbrechen'), wert: null }] });
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

    return UI.dialog({ titel: neu ? 'Neuer Klient – Klientendaten' : 'Klientendaten: ' + HT.patienten.anzeigename(p), inhalt: box, breit: true, klasse: 'kd-dialog', knoepfe: [
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
      var mods = HT.Module.liste.slice().sort(function (a, b) { return AP.sortNutzung() ? ((nutzung[b.id] || 0) - (nutzung[a.id] || 0)) || a.name.localeCompare(b.name) : a.name.localeCompare(b.name); })
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
        UI.hinweis('Hirntraining', 'Version 2.0 · lokal und offline · Datenspeicher: ' + S.backend + ' · ' + HT.Module.liste.length + ' Module · ' + S.alle('patients').length + ' Klienten · ' + S.alle('runs').length + ' Durchgänge gespeichert.');
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

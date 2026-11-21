/* Hirntraining – Sitzungsablauf im Vollbild
 * Anleitung → Übung (3 Probeitems) → Durchgänge (1–3 min, Levelanpassung danach) → Ergebnis → Pause → nächstes Modul.
 * Patientenmodus: Menüs gesperrt, Verlassen nur mit Therapeuten-PIN (Strg+Alt+P oder Ecke oben rechts lange drücken). */
(function () {
  'use strict';
  var HT = window.HT;
  var S = HT.storage, UI = HT.ui;

  var SE = HT.session = {
    laeuft: false,
    offeneSitzung: function (pid) {
      var l = S.alle('sessions', function (s) { return s.patientId === pid && s.status === 'laufend' && s.planId; });
      return l.length ? l[l.length - 1] : null;
    }
  };

  /* Laufzeitzustand der aktuellen Sitzung */
  var Z = null;

  SE.starten = function (opt) {
    if (SE.laeuft) return;
    var patient = opt.patientId ? S.finde('patients', opt.patientId) : null;
    var plan = opt.planId ? S.finde('plans', opt.planId) : null;
    var eintraege = opt.eintraege || (plan ? HT.kopie(plan.eintraege) : []);
    eintraege = eintraege.filter(function (e) { return HT.Module.map[e.modulId] && !(S.einstellungen().moduleInaktiv || {})[e.modulId]; });
    if (!eintraege.length) { UI.toast('Der Plan enthält keine aktiven Module.', 'fehler'); return; }
    var sitzung = opt.sitzung || {
      id: HT.uid('ses'), patientId: patient ? patient.id : null, therapeutId: HT.auth.aktuell ? HT.auth.aktuell.id : null,
      planId: plan ? plan.id : null, start: Date.now(), ende: null, status: 'laufend', index: 0
    };
    Z = {
      opt: opt, patient: patient, plan: plan, eintraege: eintraege, sitzung: sitzung, index: sitzung.index || 0,
      probe: !!opt.probe, patientenmodus: !!opt.patientenmodus, pausiert: false, beendet: false,
      ergebnisse: [], seitPause: 0, uebungGemacht: {}, einstufung: !!opt.einstufung,
      nonstop: opt.nonstop !== undefined ? !!opt.nonstop : !!(plan && plan.nonstop), sitzungsStart: Date.now()
    };
    if (Z.einstufung) { sitzung.art = 'einstufung'; Z.eintraege = Z.eintraege.map(function (e) { return HT.zusammen(e, { startLevel: 1 }); }); }
    if (!Z.probe) S.put('sessions', sitzung);
    SE.laeuft = true;
    if (Z.patientenmodus) HT.auth.patientenmodus = true;
    aufbauen();
    anwendenPatientEinstellungen(true);
    HT.app.vollbild(true);
    var losGehts = function () {
      if (befindenAktiv() && !sitzung.befindenVor && (sitzung.index || 0) === 0) befindenAbfragen('vor', naechstesModul);
      else naechstesModul();
    };
    Z.vorgabe = opt.vorgabe || null;
    if (Z.vorgabe) sitzung.vorgabeId = Z.vorgabe.id;
    if (Z.vorgabe && Z.vorgabe.instruktionVor) textSchirm('Hinweis Ihrer Therapeutin / Ihres Therapeuten', Z.vorgabe.instruktionVor, 'info', losGehts);
    else losGehts();
  };

  /* Einfacher Textbildschirm mit Weiter-Knopf */
  function textSchirm(titel, text, icon, weiter) {
    var k = HT.el('div', { class: 't-karte' });
    k.appendChild(HT.el('div', { class: 't-gross-icon', html: HT.icon(icon || 'info') }));
    k.appendChild(HT.el('h1', null, titel));
    k.appendChild(HT.el('p', { class: 't-unter', style: { whiteSpace: 'pre-wrap', fontSize: '1.25rem', color: 'var(--text)' } }, text));
    var kn = HT.el('div', { class: 't-knoepfe' });
    var b = UI.knopf('Weiter', { art: 'primaer gross', icon: 'play', klick: weiter });
    kn.appendChild(b); k.appendChild(kn);
    D.level.style.visibility = 'hidden';
    schirm(k);
    if (S.einstellungen().sprachausgabe) HT.audio.sprechen(text);
    setTimeout(function () { b.focus(); }, 80);
  }

  /* Nachricht des Patienten an den Therapeuten */
  function nachrichtAbfragen(weiter) {
    var k = HT.el('div', { class: 't-karte' });
    k.appendChild(HT.el('div', { class: 't-gross-icon', html: HT.icon('dokument') }));
    k.appendChild(HT.el('h1', null, 'Möchten Sie Ihrer Therapeutin / Ihrem Therapeuten etwas mitteilen?'));
    k.appendChild(HT.el('p', { class: 't-unter' }, 'Zum Beispiel, wie es Ihnen ging oder ob etwas schwierig war. Sie können das Feld auch leer lassen.'));
    HT.audio.sprechen('Möchten Sie Ihrer Therapeutin oder Ihrem Therapeuten etwas mitteilen?', { nurAufnahme: true });
    var t = HT.el('textarea', { rows: 4, style: { fontSize: '1.15rem', textAlign: 'left' } });
    k.appendChild(t);
    var kn = HT.el('div', { class: 't-knoepfe' });
    kn.appendChild(UI.knopf('Keine Nachricht', { art: 'gross', klick: weiter }));
    kn.appendChild(UI.knopf('Nachricht senden', { art: 'primaer gross', icon: 'haken', klick: function () {
      if (t.value.trim() && Z.patient) HT.vorgaben.nachrichtSpeichern(Z.patient, t.value.trim(), Z.vorgabe ? HT.vorgaben.titel(Z.patient, Z.vorgabe) : (Z.plan ? Z.plan.name : ''));
      weiter();
    } }));
    k.appendChild(kn);
    schirm(k);
    setTimeout(function () { t.focus(); }, 80);
  }

  /* Einstufungstest: ermittelt für jedes Modul des Plans ein passendes Startlevel */
  SE.einstufen = function (patientId, planId) {
    var plan = S.finde('plans', planId);
    if (!plan) return;
    SE.starten({ patientId: patientId, planId: planId, einstufung: true, eintraege: plan.eintraege.map(function (e) { return { modulId: e.modulId, dauerMin: 3, startLevel: 1, parameterOverrides: HT.zusammen(e.parameterOverrides || {}, { dauerDurchgangSek: 40 }) }; }) });
  };

  function befindenAktiv() { return !Z.probe && !!Z.patient && S.einstellungen().befinden !== false && ((Z.patient.einstellungen || {}).selbsteinschaetzung !== false); }

  /* Befindlichkeit mit Smiley-Skala (1 = sehr schlecht … 5 = sehr gut) */
  var SMILEY_FARBEN = ['#E25C5C', '#EE8A3A', '#F2B630', '#8CC152', '#2EAD6B'];
  function smiley(w, umkehr) {
    var i = umkehr ? 6 - w : w; // bei Anstrengung/Müdigkeit: hoher Wert = schlechter
    var mund = { 1: 'M30 72 Q50 56 70 72', 2: 'M32 70 Q50 62 68 70', 3: 'M32 67 H68', 4: 'M32 64 Q50 74 68 64', 5: 'M30 62 Q50 82 70 62' }[i];
    return '<svg viewBox="0 0 100 100" width="100%" height="100%"><circle cx="50" cy="50" r="44" fill="' + SMILEY_FARBEN[i - 1] + '" stroke="#26333c" stroke-width="3"/><circle cx="36" cy="40" r="5" fill="#26333c"/><circle cx="64" cy="40" r="5" fill="#26333c"/><path d="' + mund + '" fill="none" stroke="#26333c" stroke-width="5" stroke-linecap="round"/></svg>';
  }
  function skala(frage, labels, umkehr, beiWahl) {
    var w = HT.el('div', { class: 'befinden-frage' });
    w.appendChild(HT.el('div', { class: 'befinden-titel' }, frage));
    var reihe = HT.el('div', { class: 'befinden-reihe' });
    var knoepfe = [1, 2, 3, 4, 5].map(function (v) {
      var b = HT.el('button', { type: 'button', class: 'befinden-knopf', html: '<span class="befinden-gesicht">' + smiley(v, umkehr) + '</span><span>' + labels[v - 1] + '</span>' });
      b.addEventListener('click', function () { knoepfe.forEach(function (x) { x.classList.remove('aktiv'); }); b.classList.add('aktiv'); beiWahl(v); });
      reihe.appendChild(b);
      return b;
    });
    w.appendChild(reihe);
    return w;
  }
  function befindenAbfragen(wann, weiter) {
    var antw = {};
    var k = HT.el('div', { class: 't-karte befinden-karte' });
    var vor = wann === 'vor';
    k.appendChild(HT.el('h1', null, vor ? 'Schön, dass Sie da sind!' : 'Geschafft – kurze Rückmeldung'));
    k.appendChild(HT.el('p', { class: 't-unter' }, vor ? 'Bitte sagen Sie uns kurz, wie es Ihnen gerade geht.' : 'Wie war das Training für Sie?'));
    var fragen = vor
      ? [['stimmung', 'Wie fühlen Sie sich heute?', ['sehr schlecht', 'schlecht', 'mittel', 'gut', 'sehr gut'], false], ['wachheit', 'Wie wach fühlen Sie sich?', ['sehr müde', 'müde', 'mittel', 'wach', 'sehr wach'], false]]
      : [['anstrengung', 'Wie anstrengend war das Training?', ['sehr leicht', 'leicht', 'mittel', 'anstrengend', 'sehr anstrengend'], true], ['stimmung', 'Wie fühlen Sie sich jetzt?', ['sehr schlecht', 'schlecht', 'mittel', 'gut', 'sehr gut'], false]];
    var weiterK = UI.knopf('Weiter', { art: 'primaer gross', icon: 'play', deaktiviert: true, klick: fertig });
    fragen.forEach(function (f) { k.appendChild(skala(f[1], f[2], f[3], function (v) { antw[f[0]] = v; weiterK.disabled = Object.keys(antw).length < fragen.length; })); });
    var kn = HT.el('div', { class: 't-knoepfe' });
    kn.appendChild(UI.knopf('Überspringen', { art: 'geist', klick: function () { weiter(); } }));
    kn.appendChild(weiterK);
    k.appendChild(kn);
    D.name.textContent = vor ? 'Vor dem Training' : 'Nach dem Training';
    D.unter.textContent = Z.patient ? HT.patienten.anzeigename(Z.patient) : '';
    D.level.style.visibility = 'hidden';
    schirm(k);
    if (S.einstellungen().sprachausgabe) HT.audio.sprechen(fragen[0][1], { danach: function () { if (document.body.contains(k)) HT.audio.sprechen(fragen[1][1]); } });
    function fertig() {
      antw.zeit = Date.now();
      Z.sitzung[vor ? 'befindenVor' : 'befindenNach'] = antw;
      if (!Z.probe) S.put('sessions', Z.sitzung);
      weiter();
    }
  }
  HT.smiley = smiley;

  SE.fortsetzen = function (sitzung) {
    var plan = S.finde('plans', sitzung.planId);
    if (!plan) { UI.toast('Der Plan dieser Sitzung existiert nicht mehr.', 'fehler'); return; }
    SE.starten({ patientId: sitzung.patientId, planId: plan.id, sitzung: sitzung });
  };

  /* Ein einzelnes Modul ausprobieren (ohne Speichern) */
  SE.ausprobieren = function (modulId, level) {
    SE.starten({ eintraege: [{ modulId: modulId, dauerMin: 3, startLevel: level || 1, parameterOverrides: {} }], probe: true });
  };

  /* ---------------- DOM ---------------- */
  var D = {};
  function aufbauen() {
    var t = HT.el('div', { class: 'training' + (Z.patientenmodus ? ' patientenmodus' : '') });
    var kopf = HT.el('div', { class: 'training-kopf' });
    D.punkt = HT.el('div', { class: 'tk-punkt' });
    D.name = HT.el('div', { class: 'tk-name' });
    D.unter = HT.el('div', { class: 'tk-unter' });
    D.zurueck = HT.el('button', { class: 'tk-zurueck', type: 'button', title: 'Zurück', 'aria-label': 'Zurück', html: HT.icon('zurueck') + '<span>Zurück</span>' });
    D.zurueck.addEventListener('click', zurueckAusTraining);
    kopf.appendChild(D.zurueck);
    kopf.appendChild(HT.el('div', { class: 'tk-modul' }, [D.punkt, HT.el('div', { style: { minWidth: 0 } }, [D.name, D.unter])]));
    D.fortschritt = HT.el('div');
    D.fText1 = HT.el('span'); D.fText2 = HT.el('span');
    kopf.appendChild(HT.el('div', { class: 'tk-mitte' }, [HT.el('div', { class: 'tk-fortschritt' }, D.fortschritt), HT.el('div', { class: 'tk-fortschritt-text' }, [D.fText1, D.fText2])]));
    D.level = HT.el('span', { class: 'tk-level' }, 'Level 1');
    D.pauseKnopf = HT.el('button', { class: 'tk-pause', type: 'button', title: 'Pause (Esc)', 'aria-label': 'Pause', html: HT.icon('pause') });
    D.pauseKnopf.addEventListener('click', function () { pauseMenue(false); });
    kopf.appendChild(HT.el('div', { class: 'tk-rechts' }, [D.level, D.pauseKnopf]));
    // Ecke oben rechts lange drücken → Therapeutenzugang
    var ecke = HT.el('div', { class: 'tk-ecke', title: '' });
    var druck = null;
    var los = function () { druck = setTimeout(therapeutZugang, 1500); };
    var stopp = function () { clearTimeout(druck); };
    // Ecke (oben links über dem Modulsymbol) und Pauseknopf: lange drücken = Therapeutenzugang
    [ecke, D.pauseKnopf].forEach(function (el) {
      el.addEventListener('mousedown', los); el.addEventListener('touchstart', los, { passive: true });
      ['mouseup', 'mouseleave', 'touchend', 'touchcancel'].forEach(function (e) { el.addEventListener(e, stopp); });
    });
    kopf.appendChild(ecke);
    t.appendChild(kopf);
    D.buehne = HT.el('div', { class: 'training-buehne' });
    D.container = HT.el('div', { class: 'modul-container' });
    D.schirm = HT.el('div', { class: 'schirm-ebene' });
    D.buehne.appendChild(D.container); D.buehne.appendChild(D.schirm);
    t.appendChild(D.buehne);
    D.root = t;
    document.body.appendChild(t);
    document.addEventListener('keydown', tasten, true);
  }

  function abbauen() {
    document.removeEventListener('keydown', tasten, true);
    if (D.root) D.root.remove();
    D = {};
    anwendenPatientEinstellungen(false);
    SE.laeuft = false;
    HT.auth.patientenmodus = false;
    clearInterval(Z && Z.uhr);
  }

  function tasten(ev) {
    if (!SE.laeuft) return;
    if (ev.ctrlKey && ev.altKey && (ev.key === 'p' || ev.key === 'P' || ev.code === 'KeyP')) { ev.preventDefault(); ev.stopPropagation(); therapeutZugang(); return; }
    if (ev.key === 'Escape' && Z.inst && !Z.pausiert && !document.querySelector('.dialog-hinter')) { ev.preventDefault(); pauseMenue(false); }
    if ((ev.key === '-' || ev.key === 'Subtract') && Z.inst && !Z.pausiert && !document.querySelector('.dialog-hinter')) { ev.preventDefault(); pauseMenue(false); }
    if ((ev.key === '+' || ev.key === 'Add') && Z.modul && !document.querySelector('.dialog-hinter')) { ev.preventDefault(); HT.audio.stumm(); HT.audio.an && (HT.audio.sprache = true); HT.audio.sprechen(Z.modul.def.anleitung); }
  }

  function anwendenPatientEinstellungen(an) {
    var root = document.documentElement;
    if (!an) {
      HT.audio.rueckmeldungTon = true; HT.rueckmeldungVisuell = true; HT.audio.ohneFehlerton = false;
      root.style.removeProperty('--skala');
      HT.app.darstellungAnwenden();
      return;
    }
    var pe = (Z.patient && Z.patient.einstellungen) || {};
    var ge = S.einstellungen();
    var skala = Math.max(ge.schriftgroesse || 100, pe.schriftgroesse || 100) / 100;
    root.style.setProperty('--skala', skala);
    if (pe.kontrast) root.setAttribute('data-kontrast', 'an');
    HT.audio.an = ge.ton !== false && pe.ton !== false;
    var rm = pe.rueckmeldung || 'voll';
    HT.audio.rueckmeldungTon = rm === 'voll' || rm === 'ton';
    HT.rueckmeldungVisuell = rm === 'voll' || rm === 'visuell';
    HT.audio.ohneFehlerton = !!pe.ohneFehlerton;
  }

  function schirm(inhalt) {
    HT.leeren(D.schirm);
    if (D.root) D.root.classList.toggle('mit-schirm', !!inhalt);
    if (inhalt) {
      var s = HT.el('div', { class: 't-schirm' });
      s.appendChild(inhalt);
      D.schirm.appendChild(s);
    }
  }

  function kopfSetzen(modul, unter) {
    var kat = HT.kategorie(modul.kategorie);
    D.punkt.style.background = kat.farbe;
    D.punkt.innerHTML = HT.icon(kat.icon);
    D.name.textContent = modul.name;
    D.unter.innerHTML = HT.esc(unter || ('Modul ' + (Z.index + 1) + ' von ' + Z.eintraege.length)) + (Z.uebung ? '<span class="tk-abzeichen-uebung">Übung</span>' : '');
  }
  function levelAnzeigen(l, max) {
    D.level.textContent = 'Level ' + l + (max ? ' / ' + max : '');
    D.level.classList.remove('puls'); void D.level.offsetWidth; D.level.classList.add('puls');
  }
  function fortschritt(anteil, links, rechts) {
    D.fortschritt.style.width = Math.round(HT.klemmen(anteil, 0, 1) * 100) + '%';
    D.fText1.textContent = links || ''; D.fText2.textContent = rechts || '';
  }

  /* ---------------- Ablauf ---------------- */
  function naechstesModul() {
    if (Z.beendet) return;
    if (Z.index >= Z.eintraege.length) { abschluss(); return; }
    var e = Z.eintraege[Z.index];
    var m = HT.Module.map[e.modulId];
    var zustand = Z.patient ? HT.patienten.zustand(Z.patient.id, m.id) : { aktuellesLevel: 1, automatik: true, letzteDurchgaenge: [], hochSerie: 0 };
    if (Z.probe) zustand = { aktuellesLevel: e.startLevel || 1, automatik: false, letzteDurchgaenge: [], hochSerie: 0 };
    else if (e.startLevel && e.startLevel !== 'auto' && !Z.modulGestartet) zustand.aktuellesLevel = HT.klemmen(Number(e.startLevel), 1, m.levels.length);
    var params0 = HT.Module.parameter(m, zustand.aktuellesLevel, e.parameterOverrides);
    var dgSek = HT.klemmen(Number(params0.dauerDurchgangSek) || 90, 30, 300);
    var anzahl = Z.einstufung ? 6 : Math.max(1, Math.round((Number(e.dauerMin) || 5) * 60 / dgSek));
    Z.modul = { def: m, eintrag: e, zustand: zustand, startLevel: zustand.aktuellesLevel, durchgang: 0, anzahl: anzahl, dgSek: dgSek, runs: [] };
    Z.uebung = false;
    kopfSetzen(m);
    D.level.style.visibility = '';
    levelAnzeigen(zustand.aktuellesLevel, m.levels.length);
    fortschritt(Z.index / Z.eintraege.length, 'Modul ' + (Z.index + 1) + ' von ' + Z.eintraege.length, '');
    anleitung();
  }

  function tastenHinweise(m) {
    var map = { ok: ['Leertaste', 'reagieren'], links: ['←', 'links'], rechts: ['→', 'rechts'], hoch: ['↑', 'oben'], runter: ['↓', 'unten'], ja: ['J', 'ja'], nein: ['N', 'nein'], ziffer: ['0–9', 'Ziffern'] };
    var w = HT.el('div', { class: 't-tasten' });
    var tasten = (m.tasten || []).map(function (t) { return typeof t === 'string' ? t : t.aktion; });
    tasten.filter(function (t, i) { return tasten.indexOf(t) === i; }).forEach(function (t) { if (map[t]) w.appendChild(HT.el('span', { html: '<kbd>' + map[t][0] + '</kbd>' + map[t][1] })); });
    if (m.eingabe.indexOf('maus') >= 0 || m.eingabe.indexOf('touch') >= 0) w.appendChild(HT.el('span', { html: HT.icon('hand') + '&nbsp;Klicken oder tippen' }));
    w.appendChild(HT.el('span', { html: '<kbd>Esc</kbd>Pause' }));
    return w;
  }

  /* Anleitung: 'immer', 'nie' oder 'auto' (ausführlich nur in den ersten beiden Sitzungen mit diesem Modul) */
  function anleitungNoetig() {
    var modus = Z.modul.eintrag.anleitung || 'auto';
    if (modus === 'immer' || Z.probe || !Z.patient) return true;
    if (modus === 'nie') return false;
    var ses = {};
    S.alle('runs', function (r) { return r.patientId === Z.patient.id && r.modulId === Z.modul.def.id; }).forEach(function (r) { ses[r.sessionId] = true; });
    delete ses[Z.sitzung.id];
    return Object.keys(ses).length < 2;
  }
  function kurzstart() {
    var m = Z.modul.def, kat = HT.kategorie(m.kategorie);
    if (Z.nonstop && Z.index > 0) { Z.uebungGemacht[m.id] = true; countdown(durchgangStarten); return; }
    var k = HT.el('div', { class: 't-karte' });
    k.appendChild(HT.el('div', { class: 't-gross-icon', style: { background: kat.farbe, color: '#fff' }, html: HT.icon(kat.icon) }));
    k.appendChild(HT.el('h1', null, m.name));
    k.appendChild(HT.el('p', { class: 't-unter' }, 'Sie kennen diese Übung schon. Viel Erfolg!'));
    var kn = HT.el('div', { class: 't-knoepfe' });
    kn.appendChild(UI.knopf('Anleitung anzeigen', { art: 'gross', icon: 'info', klick: function () { Z.modul.eintrag = HT.zusammen(Z.modul.eintrag, { anleitung: 'immer' }); anleitung(true); } }));
    var los = UI.knopf(HT.t('los_gehts'), { art: 'primaer gross', icon: 'play', klick: function () { Z.uebungGemacht[m.id] = true; countdown(durchgangStarten); } });
    kn.appendChild(los);
    k.appendChild(kn);
    schirm(k);
    setTimeout(function () { los.focus(); }, 80);
  }

  function anleitung(erzwingen) {
    if (!erzwingen && !anleitungNoetig()) { kurzstart(); return; }
    var m = Z.modul.def, kat = HT.kategorie(m.kategorie);
    var g = HT.el('div', { class: 't-anleitung' });
    var links = HT.el('div');
    links.appendChild(HT.el('div', { class: 't-kat', style: { color: kat.farbe }, html: '<i style="background:' + kat.farbe + '"></i>' + HT.esc(kat.name) }));
    links.appendChild(HT.el('h1', null, m.name));
    links.appendChild(HT.el('p', { class: 't-text' }, m.anleitung));
    links.appendChild(tastenHinweise(m));
    var kn = HT.el('div', { class: 't-knoepfe' });
    var mitUebung = S.einstellungen().uebung !== false && !Z.uebungGemacht[m.id];
    var los = UI.knopf(HT.t('los_gehts'), { art: 'primaer gross', icon: 'play', klick: function () { stopVorschau(); if (mitUebung) uebungStarten(); else countdown(durchgangStarten); } });
    kn.appendChild(los);
    kn.appendChild(UI.knopf('Vorlesen', { art: 'gross', icon: 'ton', titel: 'Anleitung vorlesen (Taste +)', klick: function () { HT.audio.stumm(); var a = HT.audio.sprache; HT.audio.sprache = true; if (!HT.audio.sprechen(m.anleitung)) UI.toast('Für diese Anleitung ist noch keine Aufnahme vorhanden (tools/Stimme erzeugen).'); HT.audio.sprache = a; } }));
    if (mitUebung) kn.appendChild(UI.knopf('Ohne Übung starten', { art: 'gross', klick: function () { stopVorschau(); Z.uebungGemacht[m.id] = true; countdown(durchgangStarten); } }));
    if (!Z.patientenmodus && Z.eintraege.length > 1) kn.appendChild(UI.knopf(HT.t('modul_ueberspringen'), { art: 'geist', icon: 'weiter', klick: function () { stopVorschau(); modulUeberspringen(); } }));
    links.appendChild(kn);
    if (mitUebung) links.appendChild(HT.el('p', { class: 'gedimmt', style: { marginTop: '.4rem' } }, HT.t('uebung_text')));
    g.appendChild(links);
    var bsp = HT.el('div', { class: 't-beispiel' });
    bsp.appendChild(HT.el('div', { class: 't-beispiel-label' }, 'Beispiel'));
    var bspInnen = HT.el('div', { class: 'm-voll' });
    bsp.appendChild(bspInnen);
    g.appendChild(bsp);
    schirm(g);
    var stopFn = null;
    requestAnimationFrame(function () { try { stopFn = m.preview ? m.preview(bspInnen) : null; } catch (e) { console.error(e); } });
    function stopVorschau() { if (typeof stopFn === 'function') stopFn(); }
    if (S.einstellungen().sprachausgabe) HT.audio.sprechen(m.anleitung);
    setTimeout(function () { los.focus(); }, 80);
  }

  function countdown(weiter) {
    var n = 3;
    function schritt() {
      if (Z.beendet) return;
      if (n === 0) { schirm(null); weiter(); return; }
      var c = HT.el('div', { class: 't-countdown' }, String(n));
      schirm(c);
      HT.audio.ton(n === 1 ? 880 : 660, 0.1, 'sine', 0, 0.2);
      n--;
      Z.cdTimer = setTimeout(schritt, 800);
    }
    schritt();
  }

  /* Instanz eines Moduls erzeugen und starten */
  function instanzStarten(uebung, beiEnde) {
    var M = Z.modul, m = M.def;
    var level = M.zustand.aktuellesLevel;
    var params = HT.Module.parameter(m, level, M.eintrag.parameterOverrides);
    var pe = (Z.patient && Z.patient.einstellungen) || {};
    Z.ereignisse = [];
    Z.uebung = uebung;
    kopfSetzen(m, uebung ? 'Probeaufgaben' : 'Durchgang ' + (M.durchgang + 1) + ' von ' + M.anzahl);
    var zaehler = 0;
    var t0 = HT.zeit.jetzt();
    var ctx = {
      level: level, params: params, modul: m, audio: HT.audio, uebung: uebung,
      patientSettings: pe,
      patient: Z.patient ? { betroffeneSeite: Z.patient.betroffeneSeite || 'keine', gesichtsfeld: Z.patient.gesichtsfeld || 'frei', haendigkeit: Z.patient.haendigkeit } : { betroffeneSeite: 'keine', gesichtsfeld: 'frei' },
      zeit: HT.zeit, eingabe: HT.eingabe, container: D.container,
      jetzt: function () { return HT.zeit.jetzt(); },
      feedback: function (richtig, x, y, o) { HT.feedback(D.container, richtig, x, y, o); },
      onEvent: function (ev) {
        if (Z.pausiert || Z.beendet) return;
        ev.zeit = Math.round(HT.zeit.jetzt() - t0);
        Z.ereignisse.push(ev);
        if (ev.zaehlt !== false) zaehler++;
        if (uebung && zaehler >= 3) setTimeout(function () { if (Z.uebung) beiEnde(); }, 700);
      },
      onFinish: function () { if (!Z.beendet) setTimeout(beiEnde, 600); }
    };
    var tasten = (pe.eingabe === 'touch' || pe.tastenOverlay) ? m.tasten : [];
    D.root.classList.toggle('mit-tasten', !!(tasten && tasten.length));
    HT.eingabe.overlay(D.buehne, tasten);
    try {
      Z.inst = HT.Module.instanz(m, D.container, ctx);
      Z.inst.start();
    } catch (e) {
      console.error(e);
      UI.toast('Fehler im Modul „' + m.name + '“: ' + e.message, 'fehler');
      Z.inst = null;
      setTimeout(beiEnde, 300);
    }
  }

  function instanzStoppen() {
    if (Z.inst) { Z.inst.stop(); Z.inst = null; }
    HT.eingabe.overlay(D.buehne, null);
    D.root.classList.remove('mit-tasten');
    clearInterval(Z.uhr);
  }

  function uebungStarten() {
    schirm(null);
    Z.uebungGemacht[Z.modul.def.id] = true;
    fortschritt(0, 'Übung', '3 Probeaufgaben');
    instanzStarten(true, function () {
      if (!Z.uebung) return;
      instanzStoppen();
      Z.uebung = false;
      kopfSetzen(Z.modul.def, 'Übung abgeschlossen');
      var k = HT.el('div', { class: 't-karte' });
      k.appendChild(HT.el('div', { class: 't-gross-icon gruen', html: HT.icon('haken') }));
      k.appendChild(HT.el('h1', null, 'Übung geschafft!'));
      HT.audio.sprechen(HT.t('uebung_fertig'), { nurAufnahme: true });
      k.appendChild(HT.el('p', { class: 't-unter' }, 'Jetzt beginnt das Training. Es dauert etwa ' + Math.max(1, Math.round(Z.modul.anzahl * Z.modul.dgSek / 60)) + (Math.round(Z.modul.anzahl * Z.modul.dgSek / 60) > 1 ? ' Minuten.' : ' Minute.')));
      var kn = HT.el('div', { class: 't-knoepfe' });
      var b = UI.knopf('Training starten', { art: 'primaer gross', icon: 'play', klick: function () { countdown(durchgangStarten); } });
      kn.appendChild(UI.knopf('Übung wiederholen', { art: 'gross', klick: function () { schirm(null); uebungStarten(); } }));
      kn.appendChild(b);
      k.appendChild(kn);
      schirm(k);
      setTimeout(function () { b.focus(); }, 60);
    });
  }

  function durchgangStarten() {
    var M = Z.modul;
    Z.modulGestartet = true;
    levelAnzeigen(M.zustand.aktuellesLevel, M.def.levels.length);
    Z.dgStart = Date.now();
    Z.verstrichen = 0;
    Z.pausenDg = 0;
    var gesamtModule = Z.eintraege.length;
    instanzStarten(false, durchgangEnde);
    var letzte = Date.now();
    Z.uhr = setInterval(function () {
      var n = Date.now();
      if (!Z.pausiert) { Z.verstrichen += (n - letzte) / 1000; Z.seitPause += (n - letzte) / 1000; }
      letzte = n;
      var rest = Math.max(0, M.dgSek - Z.verstrichen);
      var anteilModul = (M.durchgang + Math.min(1, Z.verstrichen / M.dgSek)) / M.anzahl;
      fortschritt((Z.index + anteilModul) / gesamtModule, 'Durchgang ' + (M.durchgang + 1) + ' von ' + M.anzahl, 'noch ' + HT.dauer(rest));
      if (rest <= 0) durchgangEnde();
    }, 250);
  }

  function durchgangEnde() {
    if (!Z.inst || Z.uebung) return;
    var M = Z.modul;
    instanzStoppen();
    var erg = durchgangSpeichern();
    M.durchgang++;
    var r = erg ? erg.anpassung : null;
    if (r && r.neu !== r.alt) { if (r.neu > r.alt) HT.audio.levelAuf(); else HT.audio.levelAb(); }
    if (Z.einstufung && (!M.einst || M.einst.fertig || M.durchgang >= 6)) { M.zustand.hochSerie = 0; M.zustand.letzteDurchgaenge = []; if (Z.patient) S.put('moduleState', M.zustand); modulErgebnis(); return; }
    if (Z.einstufung) { zwischenschirm(r); return; }
    if (M.durchgang >= M.anzahl) { modulErgebnis(); return; }
    if (Z.nonstop) { if (r && r.neu !== r.alt) UI.toast('Weiter mit Level ' + r.neu, 'ok'); durchgangStarten(); return; }
    zwischenschirm(r);
  }

  /* Speichert den aktuellen Durchgang (auch bei Abbruch), wendet die Levelanpassung an */
  function durchgangSpeichern() {
    var M = Z.modul;
    var ev = Z.ereignisse || [];
    if (!ev.filter(function (e) { return e.zaehlt !== false; }).length) return null;
    var w = HT.results.berechnen(ev);
    var alt = M.zustand.aktuellesLevel;
    var anpassung = Z.einstufung ? einstufungSchritt(M, w) : HT.adaptive.nachDurchgang(M.def, M.zustand, w);
    var run = {
      id: HT.uid('run'), sessionId: Z.sitzung.id, patientId: Z.patient ? Z.patient.id : null, modulId: M.def.id,
      level: alt, levelNachher: anpassung.neu, start: Z.dgStart, dauerSek: Math.round(Z.verstrichen),
      treffer: w.treffer, fehler: w.fehler, auslassungen: w.auslassungen, quote: w.quote,
      rtMittel: w.rtMittel, rtMedian: w.rtMedian, rtStreuung: w.rtStreuung, rtLinks: w.rtLinks, rtRechts: w.rtRechts,
      trefferLinks: w.trefferLinks, trefferRechts: w.trefferRechts, fehlerLinks: w.fehlerLinks, fehlerRechts: w.fehlerRechts,
      auslassungenLinks: w.auslassungenLinks, auslassungenRechts: w.auslassungenRechts, extra: w.extra,
      einstufung: Z.einstufung || undefined, pausen: Z.pausenDg || 0, parameter: HT.Module.parameter(M.def, alt, M.eintrag.parameterOverrides), therapeutId: HT.auth.aktuell ? HT.auth.aktuell.id : (Z.sitzung.therapeutId || null),
      rohdaten: ev.slice(0, 600).map(function (e) { return { zeit: e.zeit, reiz: e.reiz, reaktion: e.reaktion, korrekt: !!e.korrekt, auslassung: !!e.auslassung, rtMs: e.rtMs ? Math.round(e.rtMs) : null, seite: e.seite || null, typ: e.typ || null }; })
    };
    M.runs.push(run);
    Z.ereignisse = [];
    if (!Z.probe && Z.patient) {
      S.put('runs', run);
      S.put('moduleState', M.zustand);
    } else if (Z.probe) {
      M.zustand.aktuellesLevel = alt; // Ausprobieren verändert nichts
    }
    return { run: run, anpassung: anpassung };
  }

  /* Einstufung: schnelle Treppe – bei Quote ≥ 80 % Sprung nach oben (erst 3, dann 2, dann 1 Level),
   * beim ersten nicht bestandenen Durchgang endet die Einstufung dieses Moduls auf dem letzten bestandenen Level. */
  function einstufungSchritt(M, w) {
    var q = HT.adaptive.quote(w), alt = M.zustand.aktuellesLevel, max = M.def.levels.length;
    M.einst = M.einst || { bestanden: 0, schritt: Math.max(1, Math.round(max / 5)) };
    if (q !== null && q >= 0.8) {
      M.einst.bestanden = alt;
      if (alt >= max) { M.einst.fertig = true; return { alt: alt, neu: alt, grund: 'maximum', quote: q }; }
      var neu = Math.min(max, alt + M.einst.schritt);
      M.einst.schritt = Math.max(1, Math.round(M.einst.schritt / 2));
      M.zustand.aktuellesLevel = neu;
      return { alt: alt, neu: neu, grund: 'aufgestuft', quote: q };
    }
    M.einst.fertig = true;
    var ziel = Math.max(1, M.einst.bestanden || alt - 1);
    M.zustand.aktuellesLevel = ziel;
    return { alt: alt, neu: ziel, grund: ziel < alt ? 'abgestuft' : 'gehalten', quote: q };
  }

  function zwischenschirm(r) {
    var M = Z.modul;
    var k = HT.el('div', { class: 't-karte' });
    var letzter = M.runs[M.runs.length - 1];
    k.appendChild(HT.el('h1', null, 'Durchgang ' + M.durchgang + ' geschafft'));
    k.appendChild(HT.el('p', { class: 't-unter' }, letzter ? HT.t('motivation_' + HT.results.sterne(letzter.quote)) : ''));
    if (r) {
      var art = r.neu > r.alt ? 'auf' : (r.neu < r.alt ? 'ab' : '');
      k.appendChild(HT.el('div', { class: 't-level-info ' + art, html: HT.icon(art === 'auf' ? 'trend' : 'info') + HT.esc(HT.adaptive.grundText(r)) + ' · Level ' + r.neu }));
    }
    var kn = HT.el('div', { class: 't-knoepfe' });
    var sek = 6;
    var b = UI.knopf('Weiter (' + sek + ')', { art: 'primaer gross', icon: 'play', klick: weiter });
    kn.appendChild(b);
    k.appendChild(kn);
    schirm(k);
    setTimeout(function () { b.focus(); }, 60);
    var t = setInterval(function () {
      if (Z.pausiert) return;
      sek--;
      b.lastChild.textContent = 'Weiter (' + sek + ')';
      if (sek <= 0) weiter();
    }, 1000);
    function weiter() {
      clearInterval(t);
      if (Z.beendet) return;
      if (pausenhinweisFaellig()) { pausenhinweis(function () { schirm(null); durchgangStarten(); }); return; }
      schirm(null);
      durchgangStarten();
    }
  }

  function pausenhinweisFaellig() {
    var min = S.einstellungen().pausenhinweisMin;
    return min > 0 && Z.seitPause >= min * 60;
  }
  function pausenhinweis(weiter) {
    Z.seitPause = 0;
    var k = HT.el('div', { class: 't-karte' });
    k.appendChild(HT.el('div', { class: 't-gross-icon', html: HT.icon('uhr') }));
    k.appendChild(HT.el('h1', null, HT.t('pausenhinweis')));
    k.appendChild(HT.el('p', { class: 't-unter' }, HT.t('pausenhinweis_text')));
    var kn = HT.el('div', { class: 't-knoepfe' });
    var b = UI.knopf('Weiter trainieren', { art: 'primaer gross', icon: 'play', klick: weiter });
    kn.appendChild(b); k.appendChild(kn);
    schirm(k);
    HT.audio.sprechen(HT.t('pausenhinweis'));
  }

  function modulErgebnis() {
    var M = Z.modul;
    var zs = HT.results.zusammenfassung(M.runs);
    Z.ergebnisse.push({ modul: M.def, zs: zs, startLevel: M.startLevel, endLevel: M.zustand.aktuellesLevel });
    if (Z.nonstop && Z.index + 1 < Z.eintraege.length && !Z.einstufung) {
      Z.index++; Z.modulGestartet = false; Z.sitzung.index = Z.index;
      if (!Z.probe) S.put('sessions', Z.sitzung);
      naechstesModul();
      return;
    }
    var sterne = HT.results.sterne(zs.quote);
    HT.audio.ende();
    var k = HT.el('div', { class: 't-karte' });
    var st = HT.el('div', { class: 't-sterne' });
    for (var i = 1; i <= 3; i++) st.innerHTML += HT.icon('stern', i <= sterne ? 'an' : '');
    k.appendChild(st);
    var lob = HT.t('motivation_' + sterne);
    k.appendChild(HT.el('h1', null, lob));
    setTimeout(function () { HT.audio.sprechen(lob, { nurAufnahme: true }); }, 900);
    k.appendChild(HT.el('p', { class: 't-unter' }, M.def.name + ' abgeschlossen'));
    var werte = HT.el('div', { class: 't-werte' });
    [[zs.treffer, 'Treffer'], [zs.fehler + zs.auslassungen, 'Fehler & Auslassungen'], [HT.prozent(zs.quote), 'Trefferquote'], [HT.dauer(zs.dauer), 'Trainingszeit']].forEach(function (x) {
      werte.appendChild(HT.el('div', { class: 't-wert', html: '<b>' + HT.esc(x[0]) + '</b><span>' + x[1] + '</span>' }));
    });
    k.appendChild(werte);
    var d = M.zustand.aktuellesLevel - M.startLevel;
    if (Z.einstufung) k.appendChild(HT.el('div', { class: 't-level-info auf', html: HT.icon('ziel') + 'Empfohlenes Startlevel: ' + M.zustand.aktuellesLevel + ' von ' + M.def.levels.length }));
    else k.appendChild(HT.el('div', { class: 't-level-info ' + (d > 0 ? 'auf' : d < 0 ? 'ab' : ''), html: HT.icon(d > 0 ? 'trend' : 'info') + (d > 0 ? 'Level ' + M.startLevel + ' → ' + M.zustand.aktuellesLevel + ' – toller Fortschritt!' : d < 0 ? 'Level ' + M.startLevel + ' → ' + M.zustand.aktuellesLevel : 'Level ' + M.zustand.aktuellesLevel + ' gehalten') }));
    var kn = HT.el('div', { class: 't-knoepfe' });
    var b = UI.knopf(Z.index + 1 < Z.eintraege.length ? 'Nächstes Modul' : 'Sitzung abschließen', { art: 'primaer gross', icon: 'play', klick: function () {
      Z.index++;
      Z.modulGestartet = false;
      Z.sitzung.index = Z.index;
      if (!Z.probe) S.put('sessions', Z.sitzung);
      var pause = Z.plan ? Number(Z.plan.pauseMin) || 0 : 0;
      if (Z.index < Z.eintraege.length && pause > 0) planPause(pause * 60);
      else naechstesModul();
    } });
    kn.appendChild(b);
    k.appendChild(kn);
    schirm(k);
    setTimeout(function () { b.focus(); }, 60);
  }

  function planPause(sek) {
    Z.seitPause = 0;
    var naechstes = HT.Module.map[Z.eintraege[Z.index].modulId];
    var k = HT.el('div', { class: 't-karte' });
    k.appendChild(HT.el('div', { class: 't-gross-icon', html: HT.icon('uhr') }));
    k.appendChild(HT.el('h1', null, 'Kurze Pause'));
    var zeit = HT.el('div', { class: 't-countdown', style: { fontSize: '4.5rem', animation: 'none' } }, HT.dauer(sek));
    k.appendChild(zeit);
    k.appendChild(HT.el('p', { class: 't-unter' }, 'Als Nächstes: ' + naechstes.name));
    var kn = HT.el('div', { class: 't-knoepfe' });
    kn.appendChild(UI.knopf('Pause beenden', { art: 'primaer gross', icon: 'play', klick: fertig }));
    k.appendChild(kn);
    schirm(k);
    var t = setInterval(function () { sek--; zeit.textContent = HT.dauer(sek); if (sek <= 0) fertig(); }, 1000);
    function fertig() { clearInterval(t); if (!Z.beendet) naechstesModul(); }
  }

  function modulUeberspringen() {
    instanzStoppen();
    if (Z.modul && Z.modul.runs.length) Z.ergebnisse.push({ modul: Z.modul.def, zs: HT.results.zusammenfassung(Z.modul.runs), startLevel: Z.modul.startLevel, endLevel: Z.modul.zustand.aktuellesLevel });
    Z.index++;
    Z.modulGestartet = false;
    Z.sitzung.index = Z.index;
    if (!Z.probe) S.put('sessions', Z.sitzung);
    schirm(null);
    naechstesModul();
  }

  function abschluss() {
    if (befindenAktiv() && !Z.sitzung.befindenNach && !Z.befindenNachGefragt) { Z.befindenNachGefragt = true; befindenAbfragen('nach', abschluss); return; }
    if (Z.vorgabe && Z.vorgabe.instruktionNach && !Z.instruktionNachGezeigt) { Z.instruktionNachGezeigt = true; textSchirm('Nachricht Ihrer Therapeutin / Ihres Therapeuten', Z.vorgabe.instruktionNach, 'stern', abschluss); return; }
    if (Z.opt.nachricht && Z.patientenmodus && Z.patient && !Z.nachrichtGefragt) { Z.nachrichtGefragt = true; nachrichtAbfragen(abschluss); return; }
    if (Z.vorgabe && Z.patient && !Z.probe) HT.vorgaben.erledigen(Z.patient, Z.vorgabe.id, Z.sitzung.id);
    Z.beendet = true;
    Z.sitzung.status = 'abgeschlossen';
    Z.sitzung.ende = Date.now();
    if (!Z.probe) S.put('sessions', Z.sitzung);
    kopfSetzen(Z.eintraege.length ? HT.Module.map[Z.eintraege[Z.eintraege.length - 1].modulId] : { kategorie: 'aufmerksamkeit', name: '' }, 'Sitzung beendet');
    D.name.textContent = 'Sitzung abgeschlossen';
    fortschritt(1, 'Geschafft!', '');
    var k = HT.el('div', { class: 't-karte', style: { maxWidth: '720px' } });
    k.appendChild(HT.el('div', { class: 't-gross-icon gruen', html: HT.icon('stern') }));
    k.appendChild(HT.el('h1', null, Z.probe ? 'Training beendet' : Z.einstufung ? 'Einstufung abgeschlossen' : 'Super – Sitzung geschafft!'));
    var gesamt = HT.summe(Z.ergebnisse.map(function (e) { return e.zs.dauer; }));
    var min = Math.max(1, Math.round(gesamt / 60));
    k.appendChild(HT.el('p', { class: 't-unter' }, Z.ergebnisse.length + (Z.ergebnisse.length === 1 ? ' Modul · ' : ' Module · ') + min + (min === 1 ? ' Minute' : ' Minuten') + ' Training'));
    D.level.style.visibility = 'hidden';
    if (Z.ergebnisse.length) {
      var t = HT.el('table', { class: 'tabelle', style: { textAlign: 'left' } });
      t.innerHTML = '<thead><tr><th>Modul</th><th class="rechts">Quote</th><th class="rechts">Level</th><th class="rechts">Sterne</th></tr></thead>';
      var tb = HT.el('tbody');
      Z.ergebnisse.forEach(function (e) {
        var s = HT.results.sterne(e.zs.quote);
        tb.appendChild(HT.el('tr', { html: '<td>' + HT.esc(e.modul.name) + '</td><td class="rechts">' + HT.prozent(e.zs.quote) + '</td><td class="rechts">' + e.startLevel + (e.endLevel !== e.startLevel ? ' → ' + e.endLevel : '') + '</td><td class="rechts" style="color:#F5B82E;letter-spacing:2px">' + '★★★'.slice(0, s) + '<span style="color:var(--linie-2)">' + '★★★'.slice(s) + '</span></td>' }));
      });
      t.appendChild(tb);
      k.appendChild(t);
    }
    var notiz = null;
    if (!Z.probe && !Z.patientenmodus && Z.patient) {
      notiz = HT.el('textarea', { rows: 3, placeholder: 'Notiz zur Sitzung (nur für Therapeuten sichtbar) – z. B. Beobachtungen, Strategien, Besonderheiten …', style: { marginTop: '1.2rem', textAlign: 'left' } });
      k.appendChild(notiz);
    }
    if (Z.einstufung) k.appendChild(HT.el('p', { class: 'gedimmt', style: { marginTop: '1rem' } }, 'Die ermittelten Level wurden als Startlevel für das weitere Training übernommen.'));
    var kn = HT.el('div', { class: 't-knoepfe' });
    kn.appendChild(UI.knopf('Fertig', { art: 'primaer gross', icon: 'haken', klick: function () {
      if (notiz && notiz.value.trim()) { Z.sitzung.notiz = notiz.value.trim(); S.put('sessions', Z.sitzung); }
      verlassen();
    } }));
    k.appendChild(kn);
    schirm(k);
    if (!Z.probe && !Z.einstufung) setTimeout(function () { HT.audio.sprechen('Super – Sitzung geschafft!', { nurAufnahme: true }); }, 900);
    HT.audio.ende();
    HT.app.sicherungsHinweisNachSitzung && HT.app.sicherungsHinweisNachSitzung();
  }

  function verlassen() {
    var war = Z;
    abbauen();
    HT.audio.stumm();
    if (war.probe) { HT.app.neuZeichnen(); return; }
    if (war.patientenmodus && war.patient && (war.vorgabe || war.opt.nachricht)) { var pat = S.finde('patients', war.patient.id) || war.patient; setTimeout(function () { HT.vorgaben.patientUebersicht(pat); }, 30); return; }
    if (war.patientenmodus || !HT.auth.aktuell) location.hash = '#/patientenstart';
    else if (war.opt.vonArbeitsplatz) location.hash = '#/arbeitsplatz';
    else if (war.patient) location.hash = '#/patient/' + war.patient.id + '/verlauf';
    HT.app.neuZeichnen();
  }

  /* Zurück-Knopf auf den Zwischenbildschirmen (nicht während eines laufenden Moduls) */
  function zurueckAusTraining() {
    if (!Z || Z.beendet) return;
    var nichtsGespeichert = Z.probe || !(Z.sitzung && Z.sitzung.ergebnisse && Z.sitzung.ergebnisse.length) && !S.alle('runs', function (r) { return r.sessionId === Z.sitzung.id; }).length;
    if (nichtsGespeichert) { HT.audio.stumm(); instanzStoppen(); clearInterval(Z.uhr); Z.beendet = true; if (!Z.probe && Z.sitzung) { Z.sitzung.status = 'abgebrochen'; Z.sitzung.ende = Date.now(); } verlassen(); return; }
    UI.bestaetigen('Die bisherigen Ergebnisse dieser Sitzung bleiben gespeichert.', { titel: 'Training beenden?', ja: 'Beenden' }).then(function (ok) { if (ok) sitzungBeenden(); });
  }

  /* Sitzung abbrechen: Teilergebnisse werden gespeichert */
  function sitzungBeenden() {
    if (Z.inst && !Z.uebung) {
      if (Z.pausiert) { Z.inst.resume(); Z.pausiert = false; }
      Z.inst.pause();
      var e = durchgangSpeichern();
      if (e) Z.modul.durchgang++;
    }
    instanzStoppen();
    clearTimeout(Z.cdTimer);
    if (Z.modul && Z.modul.runs.length && !Z.ergebnisse.some(function (x) { return x.modul === Z.modul.def; })) {
      Z.ergebnisse.push({ modul: Z.modul.def, zs: HT.results.zusammenfassung(Z.modul.runs), startLevel: Z.modul.startLevel, endLevel: Z.modul.zustand.aktuellesLevel });
    }
    Z.beendet = true;
    Z.sitzung.status = Z.ergebnisse.length || Z.index > 0 ? 'abgebrochen' : 'abgebrochen';
    Z.sitzung.ende = Date.now();
    if (!Z.probe) S.put('sessions', Z.sitzung);
    verlassen();
    UI.toast('Sitzung beendet – Teilergebnisse wurden gespeichert.', 'ok');
  }

  /* Unterbrechen: Sitzung bleibt „laufend“ und kann später fortgesetzt werden */
  function sitzungUnterbrechen() {
    if (Z.inst && !Z.uebung) {
      if (Z.pausiert) { Z.inst.resume(); Z.pausiert = false; }
      var e = durchgangSpeichern();
      if (e) Z.modul.durchgang++;
    }
    instanzStoppen();
    Z.beendet = true;
    if (!Z.probe) S.put('sessions', Z.sitzung);
    verlassen();
    UI.toast('Sitzung unterbrochen – sie kann in der Patientenakte fortgesetzt werden.', 'ok');
  }

  function pauseAn() {
    if (Z.pausiert) return;
    Z.pausiert = true;
    Z.pausenDg = (Z.pausenDg || 0) + 1;
    if (Z.inst) Z.inst.pause();
    HT.audio.stumm();
  }
  function pauseAus() {
    if (!Z.pausiert) return;
    Z.pausiert = false;
    if (Z.inst) Z.inst.resume();
  }

  function therapeutZugang() {
    if (!Z || Z.beendet) return;
    if (!Z.patientenmodus) { pauseMenue(true); return; }
    pauseAn();
    HT.auth.pinDialog('Patientenmodus verlassen', 'Therapeuten-PIN eingeben').then(function (t) {
      if (!t) { pauseAus(); return; }
      if (!HT.auth.aktuell) HT.auth.anmelden(t);
      Z.patientenmodus = false;
      HT.auth.patientenmodus = false;
      D.root.classList.remove('patientenmodus');
      Z.pausiert = false;
      pauseMenue(true);
    });
  }

  function pauseMenue(therapeut) {
    if (!Z || Z.beendet) return;
    pauseAn();
    var alt = D.buehne.querySelector('.pause-schleier');
    if (alt) alt.remove();
    var schleier = HT.el('div', { class: 'pause-schleier' });
    var k = HT.el('div', { class: 't-karte pause-menue' });
    k.appendChild(HT.el('div', { class: 't-gross-icon', html: HT.icon('pause') }));
    k.appendChild(HT.el('h1', null, Z.patientenmodus ? HT.t('pause') : 'Therapeutenmenü'));
    if (!Z.patientenmodus && Z.modul) {
      var M0 = Z.modul;
      var effektiv = HT.summe(M0.runs.map(function (r) { return r.dauerSek || 0; })) + Math.round(Z.verstrichen || 0);
      k.appendChild(HT.el('div', { class: 'pause-info', html:
        '<div><span>Modul</span><b>' + HT.esc(M0.def.name) + '</b></div>' +
        '<div><span>Durchgang</span><b>' + Math.min(M0.durchgang + 1, M0.anzahl) + ' / ' + M0.anzahl + '</b></div>' +
        '<div><span>Sitzungsdauer</span><b>' + HT.dauer((Date.now() - Z.sitzungsStart) / 1000) + '</b></div>' +
        '<div><span>Effektive Trainingszeit (Modul)</span><b>' + HT.dauer(effektiv) + '</b></div>' }));
    }
    var weiter = UI.knopf(HT.t('fortsetzen'), { art: 'primaer gross voll', icon: 'play', klick: function () { schleier.remove(); pauseAus(); } });
    k.appendChild(weiter);
    if (Z.modul) k.appendChild(UI.knopf('Anleitung noch einmal ansehen', { art: 'voll', icon: 'info', klick: function () { anleitungOverlay(schleier); } }));
    if (Z.patientenmodus) {
      k.appendChild(UI.knopf('Therapeut: Sitzung verwalten', { art: 'gross voll', icon: 'schloss', klick: function () { schleier.remove(); Z.pausiert = false; therapeutZugang(); } }));
    } else {
      if (Z.inst && !Z.uebung && Z.modul) {
        var M = Z.modul;
        var lz = HT.el('div', { class: 'pause-level' });
        var wert = HT.el('strong', null, 'Level ' + M.zustand.aktuellesLevel);
        var setz = function (d) {
          M.zustand.aktuellesLevel = HT.klemmen(M.zustand.aktuellesLevel + d, 1, M.def.levels.length);
          M.zustand.hochSerie = 0;
          wert.textContent = 'Level ' + M.zustand.aktuellesLevel;
        };
        lz.appendChild(HT.el('div', null, [HT.el('div', { class: 'klein gedimmt' }, 'Level manuell setzen'), wert]));
        lz.appendChild(HT.el('div', { class: 'knopf-gruppe' }, [UI.iconKnopf('minus', 'Leichter', function () { setz(-1); }, 'rand'), UI.iconKnopf('plus', 'Schwerer', function () { setz(1); }, 'rand')]));
        k.appendChild(lz);
        var neu = HT.el('div', { class: 'knopf-paar' });
        neu.appendChild(UI.knopf('Neustart ohne Anleitung', { art: 'voll', icon: 'play', titel: 'Der laufende Durchgang wird verworfen', klick: function () {
          schleier.remove(); Z.pausiert = false;
          if (!Z.probe && Z.patient) S.put('moduleState', M.zustand);
          Z.ereignisse = []; instanzStoppen(); durchgangStarten();
        } }));
        neu.appendChild(UI.knopf('Neustart mit Anleitung', { art: 'voll', icon: 'info', titel: 'Der laufende Durchgang wird verworfen', klick: function () {
          schleier.remove(); Z.pausiert = false;
          if (!Z.probe && Z.patient) S.put('moduleState', M.zustand);
          Z.ereignisse = []; instanzStoppen(); clearInterval(Z.uhr); Z.uebungGemacht[M.def.id] = false; anleitung(true);
        } }));
        k.appendChild(neu);
        var pe = HT.el('div', { class: 'knopf-paar' });
        pe.appendChild(UI.knopf('Parameter', { art: 'voll', icon: 'zahnrad', klick: function () { parameterImTraining(M); } }));
        pe.appendChild(UI.knopf('Ergebnisse', { art: 'voll', icon: 'diagramm', klick: function () { ergebnisseImTraining(M); } }));
        k.appendChild(pe);
      }
      if (Z.eintraege.length > 1) k.appendChild(UI.knopf(HT.t('modul_ueberspringen'), { art: 'voll', icon: 'weiter', klick: function () { schleier.remove(); Z.pausiert = false; modulUeberspringen(); } }));
      if (!Z.probe && Z.plan) k.appendChild(UI.knopf('Unterbrechen (später fortsetzen)', { art: 'voll', icon: 'pause', klick: function () { schleier.remove(); sitzungUnterbrechen(); } }));
      k.appendChild(UI.knopf(Z.probe ? 'Beenden' : HT.t('sitzung_beenden'), { art: 'gefahr voll', icon: 'stopp', klick: function () { schleier.remove(); sitzungBeenden(); } }));
    }
    schleier.appendChild(k);
    D.buehne.appendChild(schleier);
    setTimeout(function () { weiter.focus(); }, 60);
  }

  /* Anleitung als Einblendung (Pause bleibt aktiv) */
  function anleitungOverlay(schleier) {
    var m = Z.modul.def;
    var box = HT.el('div', { class: 't-karte', style: { maxWidth: '760px', textAlign: 'left' } });
    box.appendChild(HT.el('h1', null, m.name));
    box.appendChild(HT.el('p', { class: 't-text', style: { fontSize: '1.3rem' } }, m.anleitung));
    var bsp = HT.el('div', { class: 't-beispiel', style: { minHeight: '260px', margin: '1rem 0' } });
    var innen = HT.el('div', { class: 'm-voll' }); bsp.appendChild(innen); box.appendChild(bsp);
    var stop = null;
    var kn = HT.el('div', { class: 't-knoepfe' });
    kn.appendChild(UI.knopf('Vorlesen', { art: 'gross', icon: 'ton', klick: function () { HT.audio.stumm(); HT.audio.sprechen(m.anleitung); } }));
    kn.appendChild(UI.knopf('Zurück', { art: 'primaer gross', icon: 'haken', klick: function () { if (typeof stop === 'function') stop(); HT.audio.stumm(); ov.remove(); } }));
    box.appendChild(kn);
    var ov = HT.el('div', { class: 'pause-schleier', style: { zIndex: 45 } }, box);
    D.buehne.appendChild(ov);
    requestAnimationFrame(function () { try { stop = m.preview ? m.preview(innen) : null; } catch (e) { /* egal */ } });
  }

  /* Parameter während des Trainings ändern (gilt ab dem nächsten Durchgang) */
  function parameterImTraining(M) {
    var schema = M.def.parameterSchema;
    var felder = Object.keys(schema).map(function (k) {
      var sc = schema[k], f = { name: k, label: sc.label || k, standard: sc.standard, breit: true, hilfe: sc.hilfe };
      if (sc.typ === 'auswahl') { f.typ = 'auswahl'; f.optionen = sc.optionen; } else if (sc.typ === 'schalter') f.typ = 'schalter'; else { f.typ = 'zahl'; f.min = sc.min; f.max = sc.max; f.schritt = sc.schritt; }
      return f;
    });
    felder.unshift({ name: 'dauerMin', label: 'Dauer dieses Moduls (Minuten)', typ: 'zahl', min: 1, max: 60, breit: true });
    var werte = HT.zusammen(M.eintrag.parameterOverrides || {}, { dauerMin: M.eintrag.dauerMin });
    UI.formularDialog('Parameter: ' + M.def.name, felder, werte, { ok: 'Übernehmen' }).then(function (w) {
      if (!w) return;
      M.eintrag.dauerMin = w.dauerMin || M.eintrag.dauerMin; delete w.dauerMin;
      M.eintrag.parameterOverrides = HT.zusammen(M.eintrag.parameterOverrides || {}, w);
      var p0 = HT.Module.parameter(M.def, M.zustand.aktuellesLevel, M.eintrag.parameterOverrides);
      M.dgSek = HT.klemmen(Number(p0.dauerDurchgangSek) || 90, 30, 300);
      M.anzahl = Math.max(M.durchgang + 1, Math.round((Number(M.eintrag.dauerMin) || 5) * 60 / M.dgSek));
      UI.toast('Parameter übernommen – gelten ab dem nächsten Durchgang bzw. Neustart.', 'ok');
    });
  }

  /* Ergebnisse der bisherigen Durchgänge dieses Moduls in dieser Sitzung */
  function ergebnisseImTraining(M) {
    var runs = M.runs;
    var inhalt = HT.el('div');
    if (!runs.length) inhalt.appendChild(UI.leer('In dieser Sitzung wurde noch kein Durchgang abgeschlossen.', 'diagramm'));
    else inhalt.appendChild(UI.tabelle([
      { titel: '#', wert: function (r) { return runs.indexOf(r) + 1; } },
      { titel: 'Level', wert: function (r) { return r.level + (r.levelNachher !== r.level ? ' → ' + r.levelNachher : ''); } },
      { titel: 'Treffer', klasse: 'rechts', wert: function (r) { return r.treffer; } },
      { titel: 'Fehler', klasse: 'rechts', wert: function (r) { return r.fehler; } },
      { titel: 'Ausl.', klasse: 'rechts', wert: function (r) { return r.auslassungen; } },
      { titel: 'Quote', klasse: 'rechts', wert: function (r) { return HT.prozent(r.quote); } },
      { titel: 'RT Median', klasse: 'rechts', wert: function (r) { return HT.ms(r.rtMedian); } },
      { titel: 'Pausen', klasse: 'rechts', wert: function (r) { return r.pausen || 0; } }
    ], runs));
    var bisher = HT.patienten && Z.patient ? S.alle('runs', function (r) { return r.patientId === Z.patient.id && r.modulId === M.def.id && r.sessionId !== Z.sitzung.id; }) : [];
    if (bisher.length) inhalt.appendChild(HT.el('p', { class: 'gedimmt klein', style: { marginTop: '1rem' } }, 'Frühere Sitzungen mit diesem Modul: ' + new Set(bisher.map(function (r) { return r.sessionId; })).size + ' · Ø Quote ' + HT.prozent(HT.results.zusammenfassung(bisher).quote) + ' · höchstes Level ' + HT.results.zusammenfassung(bisher).levelMax));
    UI.dialog({ titel: 'Ergebnisse: ' + M.def.name, inhalt: inhalt, breit: true, knoepfe: [{ text: HT.t('schliessen'), art: 'primaer' }] });
  }

  /* ===================== Patientenstart (ohne Anmeldung) ===================== */
  HT.route('/patientenstart', function (param, w) {
    var start = HT.el('div', { class: 'start' });
    var box = HT.el('div', { class: 'anmelde-box', style: { maxWidth: '960px' } });
    box.appendChild(HT.ui.iconKnopf('links', HT.t('zurueck'), function () { location.hash = HT.auth.aktuell ? '#/arbeitsplatz' : '#/start'; }, 'zurueck-knopf rand'));
    box.appendChild(HT.el('h1', null, 'Wer trainiert heute?'));
    box.appendChild(HT.el('p', { class: 'untertitel' }, 'Tippen Sie auf Ihren Namen, um mit Ihrem Trainingsplan zu beginnen.'));
    var liste = HT.patienten.alle().filter(function (p) { return HT.plaene.aktiverPlan(p.id) || HT.vorgaben.alle(p).length; });
    var wahl = HT.el('div', { class: 'therapeuten-wahl' });
    liste.forEach(function (p) {
      var name = p.vorname || p.pseudonym;
      var b = HT.el('button', { type: 'button', style: { minWidth: '180px', padding: '1.3rem' } });
      b.appendChild(HT.ui.avatar(HT.patienten.anzeigename(p), true));
      b.appendChild(HT.el('strong', { style: { fontSize: '1.2rem', marginTop: '.4rem' } }, name));
      var heute = HT.vorgaben.heute(p), offen = heute.filter(function (v) { return !HT.vorgaben.erledigt(v); }).length;
      b.appendChild(HT.el('small', null, heute.length ? (offen ? offen + ' Übung' + (offen > 1 ? 'en' : '') + ' für heute' : 'heute alles erledigt ✓') : 'Trainingsplan'));
      b.addEventListener('click', function () {
        HT.vorgaben.patientWaehlt(p);
      });
      wahl.appendChild(b);
    });
    if (!liste.length) box.appendChild(HT.ui.leer('Es gibt noch keine Patienten mit aktivem Trainingsplan. Bitte wenden Sie sich an Ihre Therapeutin oder Ihren Therapeuten.', 'personen'));
    box.appendChild(wahl);
    start.appendChild(box);
    w.appendChild(start);
  }, { schutz: null, shell: false });
})();

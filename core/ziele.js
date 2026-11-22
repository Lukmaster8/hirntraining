/* Hirntraining – Therapieziele je Patient mit Goal Attainment Scaling (GAS, −2 … +2)
 * Ziele können mit einem Modul verknüpft werden (Ziel-Level und/oder Ziel-Trefferquote); der Fortschritt wird dann automatisch berechnet. */
(function () {
  'use strict';
  var HT = window.HT;
  var S = HT.storage, UI = HT.ui;

  var GAS = [
    { wert: -2, text: 'deutlich schlechter als erwartet' }, { wert: -1, text: 'etwas schlechter als erwartet' },
    { wert: 0, text: 'erwartetes Ergebnis erreicht' }, { wert: 1, text: 'etwas besser als erwartet' }, { wert: 2, text: 'deutlich besser als erwartet' }
  ];
  var STATUS = { aktiv: ['aktiv', 'akzent'], erreicht: ['erreicht', 'gruen'], pausiert: ['pausiert', 'gelb'], verworfen: ['verworfen', ''] };

  /* Formulierungshilfen (SMART) je Bereich */
  var VORSCHLAEGE = {
    aufmerksamkeit: ['Kann sich 10 Minuten ohne Unterbrechung auf eine Aufgabe konzentrieren.', 'Reagiert im Reaktionstraining zuverlässig (≥ 85 % Treffer) auf Level 6.', 'Kann zwei Dinge gleichzeitig beachten (geteilte Aufmerksamkeit Level 5).'],
    gedaechtnis: ['Merkt sich eine Einkaufsliste mit 5 Artikeln.', 'Kann eine Folge von 5 Positionen sicher wiedergeben.', 'Nutzt eine Merkstrategie für Namen und Termine.'],
    wahrnehmung: ['Sucht den Bildschirm systematisch von links nach rechts ab.', 'Findet auf der vernachlässigten Seite mindestens 80 % der Ziele.', 'Bemerkt Reize im eingeschränkten Gesichtsfeld zuverlässig.'],
    raeumlich: ['Unterscheidet links und rechts auch aus fremder Perspektive.', 'Baut ein Muster (4 × 4) fehlerfrei nach.'],
    exekutiv: ['Plant eine Alltagshandlung (z. B. Kaffee kochen) selbstständig in der richtigen Reihenfolge.', 'Erstellt einen Tagesplan mit 5 Terminen unter Berücksichtigung der Bedingungen.', 'Stellt sich bei Regelwechseln flexibel um (wenige Perseverationen).'],
    sprache: ['Bezahlt beim Einkauf und prüft das Wechselgeld selbstständig.', 'Liest die Uhrzeit auf 5 Minuten genau ab.', 'Benennt Alltagsgegenstände ohne Hilfe.', 'Versteht einen kurzen Alltagstext und beantwortet Fragen dazu.'],
    visuomotorik: ['Trifft Ziele mit der Maus/dem Finger sicher (≥ 85 %).', 'Fährt eine Spur mit ≥ 90 % Genauigkeit nach.']
  };

  var Zi = HT.ziele = {
    vonPatient: function (p) { return (p.ziele || []).slice().sort(function (a, b) { return (a.status === 'aktiv' ? 0 : 1) - (b.status === 'aktiv' ? 0 : 1) || (a.zielDatum || '').localeCompare(b.zielDatum || ''); }); },

    /* Fortschritt eines modulgebundenen Ziels (0..1) */
    fortschritt: function (p, z) {
      if (!z.modulId || !HT.Module.map[z.modulId]) return null;
      var st = HT.patienten.zustand(p.id, z.modulId);
      var teile = [], info = [];
      if (z.zielLevel) {
        var basis = z.ausgangsLevel || 1, akt = st.aktuellesLevel;
        teile.push(z.zielLevel <= basis ? (akt >= z.zielLevel ? 1 : 0) : HT.klemmen((akt - basis) / (z.zielLevel - basis), 0, 1));
        info.push('Level ' + akt + ' / Ziel ' + z.zielLevel);
      }
      if (z.zielQuote) {
        var runs = S.alle('runs', function (r) { return r.patientId === p.id && r.modulId === z.modulId; }).slice(-5);
        var q = HT.results.zusammenfassung(runs).quote;
        teile.push(q === null ? 0 : HT.klemmen(q * 100 / z.zielQuote, 0, 1));
        info.push('Quote ' + HT.prozent(q) + ' / Ziel ' + z.zielQuote + ' %');
      }
      if (!teile.length) return null;
      return { wert: Math.min.apply(null, teile), text: info.join(' · ') };
    },

    speichern: function (p, z) {
      p.ziele = p.ziele || [];
      var i = p.ziele.map(function (x) { return x.id; }).indexOf(z.id);
      if (i >= 0) p.ziele[i] = z; else p.ziele.push(z);
      return S.put('patients', p);
    },

    bearbeiten: function (p, z) {
      var neu = !z;
      z = z || { id: HT.uid('zie'), status: 'aktiv', angelegtAm: Date.now(), bewertungen: [], bereich: 'aufmerksamkeit' };
      var modOpt = [{ wert: '', label: '– kein Modul verknüpft –' }].concat(HT.Module.liste.map(function (m) { return { wert: m.id, label: HT.kategorie(m.kategorie).name + ': ' + m.name }; }));
      var f = UI.formular([
        { name: 'bereich', label: 'Bereich', typ: 'auswahl', optionen: HT.KATEGORIEN.map(function (k) { return { wert: k.id, label: k.name }; }) },
        { name: 'zielDatum', label: 'Zu erreichen bis', typ: 'datum' },
        { name: 'titel', label: 'Ziel (konkret, beobachtbar, alltagsbezogen)', typ: 'textarea', breit: true, zeilen: 2, pflicht: true },
        { typ: 'titel', label: 'Messbares Kriterium im Training (optional)' },
        { name: 'modulId', label: 'Verknüpftes Modul', typ: 'auswahl', breit: true, optionen: modOpt },
        { name: 'zielLevel', label: 'Ziel-Level', typ: 'zahl', min: 1, max: 20 },
        { name: 'zielQuote', label: 'Ziel-Trefferquote (%)', typ: 'zahl', min: 10, max: 100, schritt: 5 },
        { name: 'status', label: 'Status', typ: 'auswahl', optionen: Object.keys(STATUS).map(function (k) { return { wert: k, label: STATUS[k][0] }; }) },
        { name: 'icf', label: 'ICF-Kode (optional)', platzhalter: 'z. B. d230' }
      ], z);
      // Formulierungshilfen
      var hilfe = HT.el('div', { class: 'breit', style: { gridColumn: '1 / -1' } });
      function hilfeZeigen() {
        HT.leeren(hilfe);
        var b = f.inputs.bereich.inp.value;
        (VORSCHLAEGE[b] || []).forEach(function (t) {
          var k = HT.el('button', { type: 'button', class: 'abzeichen', style: { margin: '0 .4rem .4rem 0', cursor: 'pointer', border: '0' } }, '+ ' + t);
          k.addEventListener('click', function () { f.inputs.titel.inp.value = t; });
          hilfe.appendChild(k);
        });
      }
      f.inputs.bereich.inp.addEventListener('change', hilfeZeigen);
      f.el.insertBefore(HT.el('div', { class: 'feld-label', style: { gridColumn: '1 / -1', marginBottom: '-.4rem' } }, 'Formulierungshilfen – antippen zum Übernehmen:'), f.inputs.titel.inp.parentNode);
      f.el.insertBefore(hilfe, f.inputs.titel.inp.parentNode);
      hilfeZeigen();
      return UI.dialog({ fokusFeld: true, titel: neu ? 'Neues Therapieziel' : 'Therapieziel bearbeiten', inhalt: f.el, breit: true, knoepfe: [{ text: HT.t('abbrechen'), wert: null }, { text: HT.t('speichern'), art: 'primaer', aktion: function () {
        if (!f.pruefen()) return false;
        var w = f.werte();
        var obj = HT.zusammen(z, w);
        if (obj.modulId && (neu || obj.modulId !== z.modulId)) obj.ausgangsLevel = HT.patienten.zustand(p.id, obj.modulId).aktuellesLevel;
        if (obj.status === 'erreicht' && !obj.erreichtAm) obj.erreichtAm = Date.now();
        return Zi.speichern(p, obj).then(function () { UI.toast(HT.t('gespeichert'), 'ok'); return true; });
      } }] });
    },

    bewerten: function (p, z) {
      var wahl = null;
      var box = HT.el('div');
      box.appendChild(HT.el('p', { class: 'dialog-text' }, z.titel));
      var reihe = HT.el('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px', gridGap: '8px', margin: '1rem 0' } });
      GAS.forEach(function (g) {
        var b = HT.el('button', { type: 'button', class: 'm-wahl-knopf', style: { minWidth: '0', minHeight: '96px', flexDirection: 'column', fontSize: '1rem', margin: '0', padding: '.5rem' }, html: '<b style="font-size:1.6rem">' + (g.wert > 0 ? '+' : '') + g.wert + '</b><small style="font-weight:600;color:var(--text-2)">' + g.text + '</small>' });
        b.addEventListener('click', function () { wahl = g.wert; HT.$$('button', reihe).forEach(function (x) { x.classList.remove('markiert'); }); b.classList.add('markiert'); });
        reihe.appendChild(b);
      });
      box.appendChild(reihe);
      var kom = HT.el('textarea', { rows: 3, placeholder: 'Begründung / Beobachtung (optional)' });
      box.appendChild(kom);
      return UI.dialog({ titel: 'Zielerreichung bewerten (GAS)', inhalt: box, breit: true, knoepfe: [{ text: HT.t('abbrechen'), wert: null }, { text: 'Bewertung speichern', art: 'primaer', aktion: function () {
        if (wahl === null) { UI.toast('Bitte eine Stufe wählen.', 'fehler'); return false; }
        z.bewertungen = (z.bewertungen || []).concat([{ datum: Date.now(), gas: wahl, kommentar: kom.value.trim(), therapeut: HT.auth.aktuell ? HT.auth.aktuell.name : '' }]);
        if (wahl >= 0 && z.status === 'aktiv') z.status = 'erreicht', z.erreichtAm = Date.now();
        return Zi.speichern(p, z).then(function () { return true; });
      } }] });
    },

    /* T-Wert nach Kiresuk & Sherman (gleich gewichtete Ziele, ρ = 0,3) */
    tWert: function (ziele) {
      var x = ziele.map(function (z) { var b = z.bewertungen || []; return b.length ? b[b.length - 1].gas : null; }).filter(function (v) { return v !== null; });
      if (!x.length) return null;
      var n = x.length, summe = HT.summe(x), rho = 0.3;
      return Math.round(50 + (10 * summe) / Math.sqrt((1 - rho) * n + rho * n * n));
    },

    gasText: function (v) { for (var i = 0; i < GAS.length; i++) if (GAS[i].wert === v) return (v > 0 ? '+' : '') + v + ' – ' + GAS[i].text; return '–'; },
    STATUS: STATUS,

    reiter: function (p, w) {
      var ziele = Zi.vonPatient(p);
      var t = Zi.tWert(ziele);
      var kopf = HT.el('div', { class: 'raster raster-4', style: { marginBottom: '1.2rem' } });
      kopf.appendChild(UI.kennzahl(String(ziele.filter(function (z) { return z.status === 'aktiv'; }).length), 'Aktive Ziele', 'ziel'));
      kopf.appendChild(UI.kennzahl(String(ziele.filter(function (z) { return z.status === 'erreicht'; }).length), 'Erreichte Ziele', 'haken', 'gruen'));
      kopf.appendChild(UI.kennzahl(t === null ? '–' : String(t), 'GAS-T-Wert (50 = erwartet)', 'trend', 'lila'));
      kopf.appendChild(UI.kennzahl(String(ziele.reduce(function (s, z) { return s + (z.bewertungen || []).length; }, 0)), 'Bewertungen', 'stern', 'gelb'));
      w.appendChild(kopf);
      var k = UI.karte('Therapieziele', null, { icon: 'ziel', aktionen: [UI.knopf('Neues Ziel', { art: 'primaer klein', icon: 'plus', klick: function () { Zi.bearbeiten(p).then(function (x) { if (x) HT.app.neuZeichnen(); }); } })] });
      k.appendChild(HT.el('p', { class: 'gedimmt klein' }, 'Formulieren Sie Ziele konkret und alltagsbezogen (SMART). Verknüpfen Sie sie optional mit einem Modul – der Fortschritt wird dann aus den Trainingsdaten berechnet. Die Zielerreichung wird mit Goal Attainment Scaling (−2 bis +2) bewertet.'));
      if (!ziele.length) k.appendChild(UI.leer('Noch keine Therapieziele festgelegt.', 'ziel'));
      ziele.forEach(function (z) {
        var e = HT.el('div', { class: 'ziel-eintrag' });
        var kat = HT.kategorie(z.bereich);
        var fs = Zi.fortschritt(p, z);
        var letzte = (z.bewertungen || []).slice(-1)[0];
        var st = STATUS[z.status] || STATUS.aktiv;
        e.innerHTML = '<div class="ziel-band" style="background:' + kat.farbe + '"></div><div class="ziel-text"><div class="ziel-kopf"><strong>' + HT.esc(z.titel) + '</strong>' + UI.abzeichen(st[0], st[1]).outerHTML + '</div>' +
          '<div class="klein gedimmt">' + HT.esc(kat.name) + (z.zielDatum ? ' · bis ' + HT.datum(new Date(z.zielDatum + 'T12:00:00').getTime()) : '') + (z.icf ? ' · ICF ' + HT.esc(z.icf) : '') + (z.modulId && HT.Module.map[z.modulId] ? ' · Modul: ' + HT.esc(HT.Module.map[z.modulId].name) : '') + '</div>' +
          (fs ? '<div class="ziel-fortschritt"><div class="balken"><div style="width:' + Math.round(fs.wert * 100) + '%;background:' + (fs.wert >= 1 ? 'var(--erfolg)' : 'var(--akzent)') + '"></div></div><span class="klein">' + HT.esc(fs.text) + '</span></div>' : '') +
          (letzte ? '<div class="klein" style="margin-top:.3rem">Letzte Bewertung ' + HT.datum(letzte.datum) + ': <b>' + HT.esc(Zi.gasText(letzte.gas)) + '</b>' + (letzte.kommentar ? ' – ' + HT.esc(letzte.kommentar) : '') + '</div>' : '') + '</div>';
        var g = HT.el('div', { class: 'knopf-gruppe', style: { alignSelf: 'center' } });
        g.appendChild(UI.knopf('Bewerten', { art: 'klein', icon: 'stern', klick: function () { Zi.bewerten(p, z).then(function (x) { if (x) HT.app.neuZeichnen(); }); } }));
        g.appendChild(UI.iconKnopf('stift', 'Bearbeiten', function () { Zi.bearbeiten(p, z).then(function (x) { if (x) HT.app.neuZeichnen(); }); }));
        g.appendChild(UI.iconKnopf('muell', 'Löschen', function () { UI.bestaetigen('Ziel löschen?', { gefahr: true, ja: HT.t('loeschen') }).then(function (ok) { if (!ok) return; p.ziele = p.ziele.filter(function (x) { return x.id !== z.id; }); S.put('patients', p).then(HT.app.neuZeichnen); }); }, 'gefahr'));
        e.appendChild(g);
        k.appendChild(e);
      });
      w.appendChild(k);
    }
  };
})();

/* Hirntraining – Wochenplan (Therapievorgaben) für das selbstständige Training im Patientenmodus,
 * Nachrichten von Patienten an die Therapeuten und optionale Patienten-PIN. */
(function () {
  'use strict';
  var HT = window.HT;
  var S = HT.storage, UI = HT.ui;
  var TAG = 86400000;
  var WT = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

  function iso(d) { return HT.isoDatum(d); }
  function montag(ts) { var d = new Date(ts); d.setHours(12, 0, 0, 0); var wd = (d.getDay() + 6) % 7; return d.getTime() - wd * TAG; }

  var V = HT.vorgaben = {
    alle: function (p) { return p.vorgaben || []; },
    fuerDatum: function (p, datum) { return V.alle(p).filter(function (v) { return v.datum === datum; }); },
    heute: function (p) { return V.fuerDatum(p, iso(Date.now())); },
    erledigt: function (v) { return (v.erledigt || []).length > 0; },
    offen: function (v) { return !V.erledigt(v) || v.wiederholung; },
    titel: function (p, v) {
      if (v.planId) { var pl = S.finde('plans', v.planId); return pl ? pl.name : 'Plan (gelöscht)'; }
      var m = HT.Module.map[v.modulId]; return m ? m.name : v.modulId;
    },
    dauer: function (p, v) {
      if (v.planId) { var pl = S.finde('plans', v.planId); return pl ? HT.plaene.gesamtdauer(pl) : 0; }
      return v.dauerMin || 0;
    },
    eintraege: function (p, v) {
      if (v.planId) {
        var pl = S.finde('plans', v.planId);
        return pl ? HT.kopie(pl.eintraege).map(function (e) { return HT.zusammen(e, v.startLevel && v.startLevel !== 'auto' ? { startLevel: v.startLevel } : {}, v.anleitung ? { anleitung: v.anleitung } : {}); }) : [];
      }
      return [{ modulId: v.modulId, dauerMin: v.dauerMin || 10, startLevel: v.startLevel || 'auto', anleitung: v.anleitung || 'auto', parameterOverrides: v.parameterOverrides || {} }];
    },
    speichern: function (p) { return S.put('patients', p); },
    ungelesen: function (p) { return (p.nachrichten || []).filter(function (n) { return !n.gelesen; }).length; },

    /* Dialog „Neue Vorgabe“ / „Vorgabe bearbeiten“ */
    dialog: function (p, datum, v) {
      var neu = !v;
      v = v || { id: HT.uid('vor'), datum: datum, planId: (HT.plaene.aktiverPlan(p.id) || {}).id || '', modulId: '', dauerMin: 10, startLevel: 'auto', anleitung: 'auto', wiederholung: false, bemerkungAbfragen: true, instruktionVor: '', instruktionNach: '', erledigt: [] };
      var trainOpt = HT.plaene.vonPatient(p.id).map(function (pl) { return { wert: 'plan:' + pl.id, label: 'Plan: ' + pl.name + ' (' + HT.plaene.gesamtdauer(pl) + ' min)' }; })
        .concat(HT.Module.aktive().map(function (m) { return { wert: 'modul:' + m.id, label: 'Modul: ' + m.name }; }));
      var f = UI.formular([
        { name: 'training', label: 'Training', typ: 'auswahl', breit: true, optionen: trainOpt },
        { name: 'dauerMin', label: 'Dauer (Minuten, nur bei Einzelmodul)', typ: 'zahl', min: 1, max: 60 },
        { name: 'startLevel', label: 'Startlevel', typ: 'auswahl', optionen: [{ wert: 'auto', label: 'automatisch (weiter wie zuletzt)' }].concat([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17].map(function (n) { return { wert: n, label: 'Level ' + n }; })) },
        { name: 'anleitung', label: 'Ausführliche Anleitung', typ: 'auswahl', optionen: [{ wert: 'auto', label: 'automatisch (erste 2 Sitzungen)' }, { wert: 'immer', label: 'immer' }, { wert: 'nie', label: 'nie' }] },
        { name: 'wiederholung', label: 'Wiederholung am selben Tag erlaubt', typ: 'schalter' },
        { name: 'bemerkungAbfragen', label: 'Nach dem Training nach einer Nachricht für den Therapeuten fragen', typ: 'schalter', breit: true },
        { name: 'instruktionVor', label: 'Persönliche Instruktion vor dem Training (optional)', typ: 'textarea', breit: true, zeilen: 2, platzhalter: 'z. B. Denken Sie an die Strategie „zeilenweise von links nach rechts“.' },
        { name: 'instruktionNach', label: 'Persönliche Nachricht nach dem Training (optional)', typ: 'textarea', breit: true, zeilen: 2, platzhalter: 'z. B. Super gemacht! Bitte morgen zur gleichen Zeit wieder.' }
      ], HT.zusammen(v, { training: v.planId ? 'plan:' + v.planId : 'modul:' + v.modulId }));
      // Wochentage für mehrere Vorgaben auf einmal
      var tageBox = HT.el('div', { class: 'feld breit' });
      var mo = montag(new Date(v.datum + 'T12:00:00').getTime());
      var tage = [];
      if (neu) {
        tageBox.appendChild(HT.el('span', { class: 'feld-label' }, 'Auch an diesen Tagen (Woche ab ' + HT.datum(mo) + ')'));
        var reihe = HT.el('div', { class: 'segment' });
        WT.forEach(function (t, i) {
          var d = iso(mo + i * TAG);
          var b = HT.el('button', { type: 'button', class: d === v.datum ? 'aktiv' : '' }, t);
          b.addEventListener('click', function () { b.classList.toggle('aktiv'); });
          tage.push({ b: b, d: d });
          reihe.appendChild(b);
        });
        tageBox.appendChild(reihe);
        var wo = HT.el('select', { style: { marginTop: '.5rem', width: 'auto' } });
        [1, 2, 3, 4, 6, 8].forEach(function (n) { wo.appendChild(HT.el('option', { value: n }, n === 1 ? 'nur diese Woche' : 'für ' + n + ' Wochen')); });
        tageBox.appendChild(wo);
        tageBox.wochen = wo;
        f.el.insertBefore(tageBox, f.inputs.startLevel.inp.parentNode);
      }
      var knoepfe = [{ text: HT.t('abbrechen'), wert: null }];
      if (!neu) knoepfe.push({ text: HT.t('loeschen'), art: 'gefahr', aktion: function () { p.vorgaben = V.alle(p).filter(function (x) { return x.id !== v.id; }); return V.speichern(p).then(function () { return true; }); } });
      knoepfe.push({ text: HT.t('speichern'), art: 'primaer', aktion: function () {
        var w = f.werte(), tr = String(w.training).split(':');
        var basis = HT.zusammen(v, w, { planId: tr[0] === 'plan' ? tr[1] : '', modulId: tr[0] === 'modul' ? tr[1] : '', startLevel: w.startLevel === 'auto' ? 'auto' : Number(w.startLevel) });
        delete basis.training;
        p.vorgaben = V.alle(p).slice();
        if (!neu) { p.vorgaben = p.vorgaben.map(function (x) { return x.id === v.id ? basis : x; }); }
        else {
          var gewaehlt = tage.filter(function (t) { return t.b.classList.contains('aktiv'); }).map(function (t) { return t.d; });
          if (!gewaehlt.length) gewaehlt = [v.datum];
          var wochen = Number(tageBox.wochen.value) || 1;
          for (var k = 0; k < wochen; k++) gewaehlt.forEach(function (d) {
            var dt = iso(new Date(d + 'T12:00:00').getTime() + k * 7 * TAG);
            p.vorgaben.push(HT.zusammen(basis, { id: HT.uid('vor'), datum: dt, erledigt: [] }));
          });
        }
        return V.speichern(p).then(function () { UI.toast(HT.t('gespeichert'), 'ok'); return true; });
      } });
      return UI.dialog({ titel: neu ? 'Neue Vorgabe' : 'Vorgabe bearbeiten', inhalt: f.el, breit: true, knoepfe: knoepfe });
    },

    /* Karte Wochenplan im Reiter „Trainingsplan“ */
    karte: function (p, w) {
      var woche = V._woche || montag(Date.now());
      var k = UI.karte('Wochenplan – Therapievorgaben für das selbstständige Training', null, { icon: 'kalender', aktionen: [
        UI.iconKnopf('links', 'Vorherige Woche', function () { V._woche = woche - 7 * TAG; HT.app.neuZeichnen(); }, 'rand'),
        UI.knopf('Heute', { art: 'klein', klick: function () { V._woche = montag(Date.now()); HT.app.neuZeichnen(); } }),
        UI.iconKnopf('rechts', 'Nächste Woche', function () { V._woche = woche + 7 * TAG; HT.app.neuZeichnen(); }, 'rand')
      ] });
      k.appendChild(HT.el('p', { class: 'gedimmt klein' }, 'Legen Sie fest, an welchen Tagen der Patient im Patientenmodus welches Training selbstständig durchführt. Erledigte Vorgaben werden grün markiert; ein Klick darauf zeigt die Ergebnisse. Woche vom ' + HT.datum(woche) + ' bis ' + HT.datum(woche + 6 * TAG) + '.'));
      var g = HT.el('div', { class: 'wochenplan' });
      var heute = iso(Date.now());
      for (var i = 0; i < 7; i++) {
        (function (d) {
          var spalte = HT.el('div', { class: 'wp-tag' + (d === heute ? ' heute' : '') });
          spalte.appendChild(HT.el('div', { class: 'wp-kopf', html: '<b>' + WT[i] + '</b><span>' + HT.datum(new Date(d + 'T12:00:00').getTime()).slice(0, 6) + '</span>' }));
          V.fuerDatum(p, d).forEach(function (v) {
            var ok = V.erledigt(v);
            var e = HT.el('button', { type: 'button', class: 'wp-eintrag' + (ok ? ' erledigt' : ''), title: ok ? 'Durchgeführt – Ergebnisse ansehen' : 'Vorgabe bearbeiten', html: '<b>' + HT.esc(V.titel(p, v)) + '</b><span>' + (ok ? '✓ durchgeführt' + (v.erledigt.length > 1 ? ' (' + v.erledigt.length + '×)' : '') : 'Vorgabe · ' + V.dauer(p, v) + ' min') + '</span>' });
            e.addEventListener('click', function () {
              if (ok) location.hash = '#/patient/' + p.id + '/verlauf';
              else V.dialog(p, d, v).then(function (x) { if (x) HT.app.neuZeichnen(); });
            });
            spalte.appendChild(e);
          });
          var plus = HT.el('button', { type: 'button', class: 'wp-plus', html: HT.icon('plus') });
          plus.addEventListener('click', function () { V.dialog(p, d).then(function (x) { if (x) HT.app.neuZeichnen(); }); });
          spalte.appendChild(plus);
          g.appendChild(spalte);
        })(iso(woche + i * TAG));
      }
      k.appendChild(g);
      var opt = HT.el('label', { class: 'feld feld-schalter', style: { marginTop: '.8rem' } });
      var cb = HT.el('input', { type: 'checkbox', class: 'schalter' });
      cb.checked = !!p.erweiterterModus;
      cb.addEventListener('change', function () { p.erweiterterModus = cb.checked; V.speichern(p); });
      opt.appendChild(cb);
      opt.appendChild(HT.el('span', { class: 'feld-label' }, 'Erweiterter Patientenmodus: an Tagen ohne Vorgabe darf der aktive Trainingsplan selbstständig trainiert werden'));
      k.appendChild(opt);
      w.appendChild(k);

      // Nachrichten des Patienten
      var n = (p.nachrichten || []).slice().reverse();
      var k2 = UI.karte('Nachrichten des Patienten', null, { icon: 'dokument', aktionen: V.ungelesen(p) ? [UI.knopf('Alle als gelesen markieren', { art: 'klein', klick: function () { (p.nachrichten || []).forEach(function (x) { x.gelesen = true; }); V.speichern(p).then(HT.app.neuZeichnen); } })] : [] });
      k2.style.marginTop = '1.2rem';
      if (!n.length) k2.appendChild(UI.leer('Noch keine Nachrichten. Patienten können nach dem selbstständigen Training eine Nachricht hinterlassen.', 'dokument'));
      n.slice(0, 15).forEach(function (x) {
        k2.appendChild(HT.el('div', { class: 'liste-eintrag', html: '<div class="le-text"><strong>' + HT.esc(x.text) + '</strong><span>' + HT.datumZeit(x.datum) + (x.training ? ' · nach „' + HT.esc(x.training) + '“' : '') + '</span></div>' + (x.gelesen ? '' : UI.abzeichen('neu', 'akzent').outerHTML) }));
      });
      w.appendChild(k2);
    },

    /* Patient wählt sich im Patientenstart aus */
    patientWaehlt: function (p) {
      var weiter = function () { V.patientUebersicht(p); };
      if (!p.pinHash) { weiter(); return; }
      var erledigt = false;
      var feld = UI.pinFeld(function (pin, fehler) {
        HT.auth.hash(pin, p.pinSalz).then(function (h) { if (h === p.pinHash) { erledigt = true; if (UI._offen) UI._offen(true); weiter(); } else fehler(); });
      }, { text: 'Bitte Ihre persönliche PIN eingeben', manuell: true });
      UI.dialog({ titel: 'Hallo ' + (p.vorname || p.pseudonym) + '!', inhalt: feld, klasse: 'pin-dialog', knoepfe: [{ text: HT.t('abbrechen'), wert: null }] });
    },

    /* Übersicht „Ihre Übungen heute“ im Patientenmodus */
    patientUebersicht: function (p) {
      var app = HT.$('#app');
      HT.leeren(app);
      var start = HT.el('div', { class: 'start' });
      var box = HT.el('div', { class: 'anmelde-box', style: { maxWidth: '820px' } });
      box.appendChild(UI.iconKnopf('links', 'Abmelden', function () { location.hash = '#/patientenstart'; HT.app.neuZeichnen(); }, 'zurueck-knopf rand'));
      box.appendChild(HT.el('h1', null, 'Hallo ' + (p.vorname || p.pseudonym) + '!'));
      var heute = V.heute(p);
      var plan = HT.plaene.aktiverPlan(p.id);
      var liste = HT.el('div', { class: 'patient-aufgaben' });
      if (heute.length) {
        box.appendChild(HT.el('p', { class: 'untertitel' }, 'Ihre Übungen für heute. Sie können die Reihenfolge selbst wählen.'));
        heute.forEach(function (v) {
          var ok = V.erledigt(v), darf = !ok || v.wiederholung;
          var e = HT.el('div', { class: 'pa-eintrag' + (ok ? ' erledigt' : '') });
          e.appendChild(HT.el('div', { class: 'pa-text', html: '<b>' + HT.esc(V.titel(p, v)) + '</b><span>' + (ok ? '✓ erledigt' : 'ca. ' + V.dauer(p, v) + ' Minuten') + '</span>' }));
          if (darf) e.appendChild(UI.knopf(ok ? 'Noch einmal' : 'Training starten', { art: ok ? 'gross' : 'primaer gross', icon: 'play', klick: function () { V.starten(p, v); } }));
          liste.appendChild(e);
        });
        if (heute.every(function (v) { return V.erledigt(v); })) box.appendChild(HT.el('div', { class: 'banner info', html: HT.icon('stern') + '<span>Alle Übungen für heute sind erledigt – prima! Sie können sich jetzt abmelden.</span>' }));
      } else if (plan && (p.erweiterterModus || !V.alle(p).length)) {
        box.appendChild(HT.el('p', { class: 'untertitel' }, 'Heute ist keine feste Übung geplant – Sie können mit Ihrem Trainingsplan trainieren.'));
        var e2 = HT.el('div', { class: 'pa-eintrag' });
        e2.appendChild(HT.el('div', { class: 'pa-text', html: '<b>' + HT.esc(plan.name) + '</b><span>' + plan.eintraege.length + ' Übungen · ca. ' + HT.plaene.gesamtdauer(plan) + ' Minuten</span>' }));
        e2.appendChild(UI.knopf('Training starten', { art: 'primaer gross', icon: 'play', klick: function () {
          var offen = HT.session.offeneSitzung(p.id);
          HT.session.starten({ patientId: p.id, planId: plan.id, sitzung: offen && offen.planId === plan.id ? offen : undefined, patientenmodus: true, nachricht: true });
        } }));
        liste.appendChild(e2);
      } else {
        box.appendChild(UI.leer('Für heute ist kein Training geplant. Ihre Therapeutin bzw. Ihr Therapeut legt die nächsten Übungen fest.', 'kalender'));
      }
      box.appendChild(liste);
      start.appendChild(box);
      app.appendChild(start);
    },

    starten: function (p, v) {
      var e = V.eintraege(p, v);
      if (!e.length) { UI.toast('Diese Vorgabe enthält kein Training mehr.', 'fehler'); return; }
      HT.session.starten({ patientId: p.id, planId: v.planId || null, eintraege: e, patientenmodus: true, vorgabe: v, nachricht: v.bemerkungAbfragen });
    },

    /* Nach Abschluss einer Sitzung: Vorgabe als erledigt markieren */
    erledigen: function (p, vorgabeId, sessionId) {
      var p2 = S.finde('patients', p.id) || p;
      (p2.vorgaben || []).forEach(function (v) { if (v.id === vorgabeId) v.erledigt = (v.erledigt || []).concat([sessionId]); });
      return S.put('patients', p2);
    },
    nachrichtSpeichern: function (p, text, training) {
      var p2 = S.finde('patients', p.id) || p;
      p2.nachrichten = (p2.nachrichten || []).concat([{ id: HT.uid('nac'), datum: Date.now(), text: text, training: training, gelesen: false }]);
      return S.put('patients', p2);
    },

    /* Patienten-PIN setzen */
    pinDialog: function (p) {
      return UI.formularDialog('Anmelde-PIN für den Patientenmodus', [
        { name: 'pin', label: 'PIN (4–8 Ziffern, leer lassen = keine PIN)', typ: 'pin', breit: true }
      ], {}, { pruefen: function (w) { if (w.pin && !/^[0-9]{4,8}$/.test(w.pin)) return 'Die PIN muss aus 4 bis 8 Ziffern bestehen.'; return null; } }).then(function (w) {
        if (!w) return null;
        if (!w.pin) { delete p.pinHash; delete p.pinSalz; return S.put('patients', p); }
        p.pinSalz = Math.random().toString(36).slice(2, 12);
        return HT.auth.hash(w.pin, p.pinSalz).then(function (h) { p.pinHash = h; return S.put('patients', p); });
      });
    }
  };
})();

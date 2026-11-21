/* Hirntraining – Ergebnisberechnung und Auswertung (Verlauf, Zeitraumvergleich, Links/Rechts) */
(function () {
  'use strict';
  var HT = window.HT;
  var S = HT.storage, UI = HT.ui, C = function () { return HT.charts; };

  var R = HT.results = {
    /* Aus den protokollierten Ereignissen eines Durchgangs die Kennwerte berechnen */
    berechnen: function (ereignisse) {
      var e = { treffer: 0, fehler: 0, auslassungen: 0, trefferLinks: 0, trefferRechts: 0, fehlerLinks: 0, fehlerRechts: 0, auslassungenLinks: 0, auslassungenRechts: 0, extra: {} };
      var rts = [], rtL = [], rtR = [];
      ereignisse.forEach(function (ev) {
        if (ev.zaehlt === false) { if (ev.typ) e.extra[ev.typ] = (e.extra[ev.typ] || 0) + 1; return; }
        var art = ev.auslassung ? 'auslassungen' : (ev.korrekt ? 'treffer' : 'fehler');
        e[art]++;
        if (ev.seite === 'links') e[art + 'Links']++;
        if (ev.seite === 'rechts') e[art + 'Rechts']++;
        if (ev.typ) e.extra[ev.typ] = (e.extra[ev.typ] || 0) + 1;
        if (ev.korrekt && ev.rtMs > 0 && ev.rtMs < 60000) {
          rts.push(ev.rtMs);
          if (ev.seite === 'links') rtL.push(ev.rtMs);
          if (ev.seite === 'rechts') rtR.push(ev.rtMs);
        }
      });
      e.rtMittel = HT.mittel(rts); e.rtMedian = HT.median(rts); e.rtStreuung = HT.streuung(rts);
      e.rtLinks = HT.mittel(rtL); e.rtRechts = HT.mittel(rtR);
      e.quote = HT.adaptive.quote(e);
      return e;
    },

    sterne: function (q) { return q === null ? 1 : q >= 0.85 ? 3 : q >= 0.6 ? 2 : 1; },

    /* Durchgänge eines Patienten im Zeitraum, optional nach Modul */
    durchgaenge: function (pid, von, bis, mid) {
      return S.alle('runs', function (r) { return r.patientId === pid && r.start >= von && r.start <= bis && (!mid || r.modulId === mid); });
    },

    /* Pro Kalendertag zusammenfassen (für übersichtliche Verläufe) */
    proTag: function (runs) {
      var tage = {};
      runs.forEach(function (r) {
        var k = HT.isoDatum(r.start);
        var t = tage[k] || (tage[k] = { x: new Date(k + 'T12:00:00').getTime(), runs: [] });
        t.runs.push(r);
      });
      return Object.keys(tage).sort().map(function (k) {
        var t = tage[k], rs = t.runs;
        var tr = HT.summe(rs.map(function (r) { return r.treffer; })), fe = HT.summe(rs.map(function (r) { return r.fehler; })), au = HT.summe(rs.map(function (r) { return r.auslassungen; }));
        return {
          x: t.x, datum: k, anzahl: rs.length, treffer: tr, fehler: fe, auslassungen: au,
          quote: (tr + fe + au) ? tr / (tr + fe + au) : null,
          level: Math.max.apply(null, rs.map(function (r) { return r.levelNachher || r.level; })),
          rt: HT.mittel(rs.map(function (r) { return r.rtMittel; }).filter(Boolean)),
          dauer: HT.summe(rs.map(function (r) { return r.dauerSek || 0; }))
        };
      });
    },

    zusammenfassung: function (runs) {
      var tr = HT.summe(runs.map(function (r) { return r.treffer; })), fe = HT.summe(runs.map(function (r) { return r.fehler; })), au = HT.summe(runs.map(function (r) { return r.auslassungen; }));
      return {
        anzahl: runs.length, treffer: tr, fehler: fe, auslassungen: au,
        quote: (tr + fe + au) ? tr / (tr + fe + au) : null,
        rt: HT.mittel(runs.map(function (r) { return r.rtMittel; }).filter(Boolean)),
        levelMax: runs.length ? Math.max.apply(null, runs.map(function (r) { return r.levelNachher || r.level; })) : null,
        levelStart: runs.length ? runs[0].level : null,
        levelEnde: runs.length ? (runs[runs.length - 1].levelNachher || runs[runs.length - 1].level) : null,
        dauer: HT.summe(runs.map(function (r) { return r.dauerSek || 0; })),
        trefferLinks: HT.summe(runs.map(function (r) { return r.trefferLinks || 0; })), trefferRechts: HT.summe(runs.map(function (r) { return r.trefferRechts || 0; })),
        auslLinks: HT.summe(runs.map(function (r) { return r.auslassungenLinks || 0; })), auslRechts: HT.summe(runs.map(function (r) { return r.auslassungenRechts || 0; })),
        rtLinks: HT.mittel(runs.map(function (r) { return r.rtLinks; }).filter(Boolean)), rtRechts: HT.mittel(runs.map(function (r) { return r.rtRechts; }).filter(Boolean))
      };
    }
  };

  /* Kleine Smileys für Befinden vor/nach einer Sitzung */
  HT.befindenAnzeige = function (s) {
    var w = HT.el('span', { style: { display: 'inline-flex', alignItems: 'center' } });
    var m = function (v, umk, titel) { return v ? '<span title="' + titel + ': ' + v + '/5" style="display:inline-block;width:24px;height:24px;margin-right:3px">' + HT.smiley(v, umk) + '</span>' : ''; };
    var vor = s.befindenVor || {}, nach = s.befindenNach || {};
    if (!vor.stimmung && !nach.stimmung) { w.textContent = '–'; return w; }
    w.innerHTML = m(vor.stimmung, false, 'Stimmung vorher') + m(vor.wachheit, false, 'Wachheit') + '<span class="gedimmt" style="margin:0 6px">→</span>' + m(nach.stimmung, false, 'Stimmung nachher') + m(nach.anstrengung, true, 'Anstrengung');
    return w;
  };


  /* Automatische Verlaufszusammenfassung in Textform (für Verlauf und Bericht) */
  R.textZusammenfassung = function (p, von, bis, pseudo) {
    var runs = R.durchgaenge(p.id, von, bis).filter(function (r) { return !r.einstufung; });
    var sitz = S.alle('sessions', function (s) { return s.patientId === p.id && s.start >= von && s.start <= bis && s.status !== 'laufend'; });
    var saetze = [];
    if (!runs.length) return ['Im gewählten Zeitraum wurden keine Trainingsdurchgänge durchgeführt.'];
    var min = Math.round(HT.summe(runs.map(function (r) { return r.dauerSek || 0; })) / 60);
    var wochen = Math.max(1, (bis - Math.max(von, runs[0].start)) / (7 * 86400000));
    saetze.push('Im Zeitraum fanden <b>' + sitz.length + ' Sitzungen</b> mit insgesamt <b>' + (min >= 60 ? Math.floor(min / 60) + ' h ' + (min % 60) + ' min' : min + ' min') + '</b> Training statt (Ø ' + HT.zahl(sitz.length / wochen, 1) + ' Sitzungen pro Woche).');
    var proModul = {};
    runs.forEach(function (r) { (proModul[r.modulId] = proModul[r.modulId] || []).push(r); });
    Object.keys(proModul).forEach(function (id) {
      var m = HT.Module.map[id], rs = proModul[id];
      if (!m) return;
      var n = rs.length, drittel = Math.max(1, Math.floor(n / 3));
      var a = R.zusammenfassung(rs.slice(0, drittel)), e = R.zusammenfassung(rs.slice(-drittel)), g = R.zusammenfassung(rs);
      var teile = [];
      teile.push('Level ' + g.levelStart + (g.levelEnde !== g.levelStart ? ' → ' + g.levelEnde : ' (gehalten)') + ' von ' + m.levels.length);
      if (n >= 3 && a.quote !== null && e.quote !== null) {
        var dq = Math.round((e.quote - a.quote) * 100);
        teile.push(Math.abs(dq) < 4 ? 'Trefferquote stabil bei ' + HT.prozent(e.quote) : 'Trefferquote von ' + HT.prozent(a.quote) + ' auf ' + HT.prozent(e.quote) + (dq > 0 ? ' gestiegen' : ' gesunken'));
      } else teile.push('Trefferquote ' + HT.prozent(g.quote));
      if (n >= 3 && a.rt && e.rt) {
        var drt = Math.round(e.rt - a.rt);
        if (Math.abs(drt) >= 40) teile.push('Reaktionszeit um ' + Math.abs(drt) + ' ms ' + (drt < 0 ? 'schneller' : 'langsamer') + ' (zuletzt Ø ' + Math.round(e.rt) + ' ms)');
      }
      var aL = g.auslLinks, aR = g.auslRechts, tL = g.trefferLinks, tR = g.trefferRechts;
      if (aL + aR + tL + tR >= 10) {
        var qL = (aL + tL) ? aL / (aL + tL) : 0, qR = (aR + tR) ? aR / (aR + tR) : 0;
        if (Math.abs(qL - qR) >= 0.12) teile.push('übersehene Ziele links ' + HT.prozent(qL) + ', rechts ' + HT.prozent(qR) + ' – Seitenunterschied zu Ungunsten ' + (qL > qR ? 'links' : 'rechts'));
      }
      saetze.push('<b>' + HT.esc(m.name) + '</b> (' + n + ' Durchgänge): ' + teile.join('; ') + '.');
    });
    var bv = sitz.map(function (s) { return s.befindenVor; }).filter(Boolean), bn = sitz.map(function (s) { return s.befindenNach; }).filter(Boolean);
    if (bv.length || bn.length) {
      var mw = function (arr, k) { var v = arr.map(function (x) { return x[k]; }).filter(Boolean); return v.length ? HT.zahl(HT.mittel(v), 1) : '–'; };
      saetze.push('Selbsteinschätzung (Skala 1–5): Stimmung vor dem Training Ø ' + mw(bv, 'stimmung') + ', Wachheit Ø ' + mw(bv, 'wachheit') + '; erlebte Anstrengung Ø ' + mw(bn, 'anstrengung') + ', Stimmung danach Ø ' + mw(bn, 'stimmung') + '.');
    }
    var ziele = (p.ziele || []);
    if (ziele.length) {
      var erreicht = ziele.filter(function (z) { return z.status === 'erreicht'; }).length, t = HT.ziele.tWert(ziele);
      saetze.push('Therapieziele: ' + erreicht + ' von ' + ziele.length + ' erreicht' + (t !== null ? '; GAS-T-Wert ' + t + ' (50 = erwartete Zielerreichung)' : '') + '.');
    }
    return saetze;
  };


  /* ---------- Sitzungsanalyse: je Sitzung (Konsultation) und je Durchgang ---------- */
  function sitzungsAnalyse(bereich, p, m, runs) {
    var proSitzung = [], idx = {};
    runs.forEach(function (r) { if (idx[r.sessionId] === undefined) { idx[r.sessionId] = proSitzung.length; proSitzung.push({ sid: r.sessionId, runs: [] }); } proSitzung[idx[r.sessionId]].runs.push(r); });
    var kumuliert = 0;
    proSitzung.forEach(function (k, i) {
      var rs = k.runs, ses = S.finde('sessions', k.sid) || {};
      k.nr = i + 1; k.start = rs[0].start; k.levelStart = rs[0].level; k.levelEnde = rs[rs.length - 1].levelNachher || rs[rs.length - 1].level;
      k.levelMax = Math.max.apply(null, rs.map(function (r) { return Math.max(r.level, r.levelNachher || 0); }));
      k.effektiv = HT.summe(rs.map(function (r) { return r.dauerSek || 0; })); kumuliert += k.effektiv; k.kumuliert = kumuliert;
      k.dauer = ses.ende ? Math.round((ses.ende - ses.start) / 1000) : null; k.pausen = HT.summe(rs.map(function (r) { return r.pausen || 0; }));
      var th = S.finde('therapists', rs[0].therapeutId || ses.therapeutId); k.therapeut = th ? th.name : '–';
      k.zs = R.zusammenfassung(rs); k.art = ses.art;
    });
    var karte = UI.karte('Sitzungsanalyse: ' + m.name, null, { icon: 'stapel', aktionen: [
      UI.knopf('Levelverlauf für Patient drucken', { art: 'klein', icon: 'drucker', klick: function () { levelverlaufDruck(p, m, proSitzung); } })
    ] });
    karte.style.marginTop = '1.2rem';
    if (!proSitzung.length) { karte.appendChild(UI.leer('Keine Sitzungen im Zeitraum.', 'stapel')); bereich.appendChild(karte); return; }
    karte.appendChild(HT.el('p', { class: 'gedimmt klein' }, 'Oben: erreichtes Level am Ende jeder Sitzung. Wählen Sie eine Sitzung in der Tabelle, um ihre Durchgänge im Detail zu sehen.'));
    var d1 = HT.el('div'); karte.appendChild(d1);
    var tabWrap = HT.el('div', { style: { marginTop: '1rem' } }); karte.appendChild(tabWrap);
    var detail = HT.el('div', { class: 'sitzung-detail' }); karte.appendChild(detail);
    bereich.appendChild(karte);
    requestAnimationFrame(function () {
      HT.charts.balken(d1, { kategorien: proSitzung.map(function (k) { return '#' + k.nr; }), serien: [{ name: 'Level', farbe: HT.kategorie(m.kategorie).farbe, werte: proSitzung.map(function (k) { return k.levelEnde; }) }], yMax: m.levels.length, hoehe: 180, yFormat: function (v) { return 'L' + Math.round(v); } });
    });
    tabWrap.appendChild(UI.tabelle([
      { titel: 'Nr.', wert: function (k) { return k.nr + (k.art === 'einstufung' ? ' (Einst.)' : ''); } },
      { titel: 'Datum', sort: function (k) { return k.start; }, wert: function (k) { return HT.datumZeit(k.start); } },
      { titel: 'Level Beginn / Ende / Max', wert: function (k) { return k.levelStart + ' / ' + k.levelEnde + ' / ' + k.levelMax; } },
      { titel: 'Sitzungsdauer', klasse: 'rechts', wert: function (k) { return k.dauer !== null ? HT.dauer(k.dauer) : '–'; } },
      { titel: 'Effektiv', klasse: 'rechts', wert: function (k) { return HT.dauer(k.effektiv); } },
      { titel: 'Kumulativ', klasse: 'rechts', wert: function (k) { return HT.dauer(k.kumuliert); } },
      { titel: 'Pausen', klasse: 'rechts', wert: function (k) { return k.pausen; } },
      { titel: 'Quote', klasse: 'rechts', wert: function (k) { return HT.prozent(k.zs.quote); } },
      { titel: 'Therapeut', wert: function (k) { return k.therapeut; } }
    ], proSitzung.slice().reverse(), { beiKlick: function (k) { zeigen(k); } }));
    function zeigen(k) {
      HT.leeren(detail);
      var kopf = HT.el('div', { class: 'werkzeugleiste', style: { marginTop: '1.2rem' } });
      kopf.appendChild(HT.el('strong', { style: { marginRight: '1rem' } }, 'Sitzung #' + k.nr + ' vom ' + HT.datumZeit(k.start)));
      var mSel = HT.el('select', { style: { width: 'auto' } });
      [['quote', 'Trefferquote (%)'], ['treffer', 'Treffer'], ['fehler', 'Fehler'], ['auslassungen', 'Auslassungen'], ['rtMedian', 'Reaktionszeit Median (ms)'], ['level', 'Level']].forEach(function (o) { mSel.appendChild(HT.el('option', { value: o[0] }, o[1])); });
      var art = HT.el('div', { class: 'segment' });
      var bB = HT.el('button', { type: 'button', class: 'aktiv' }, 'Balken'), bL = HT.el('button', { type: 'button' }, 'Linie');
      art.appendChild(bB); art.appendChild(bL);
      kopf.appendChild(mSel); kopf.appendChild(art);
      kopf.appendChild(UI.knopf('Parameter-Einsicht', { art: 'klein', icon: 'zahnrad', klick: function () {
        var par = k.runs[0].parameter;
        if (!par) { UI.hinweis('Parameter', 'Für diese Sitzung wurden noch keine Parameter gespeichert (ältere Daten).'); return; }
        UI.dialog({ titel: 'Parameter der Sitzung #' + k.nr + ' (nur Einsicht)', inhalt: HT.el('div', { html: '<table class="tabelle">' + Object.keys(par).map(function (x) { return '<tr><td>' + HT.esc(m.levelLabels[x] || (m.parameterSchema[x] && m.parameterSchema[x].label) || x) + '</td><td class="rechts"><b>' + HT.esc(String(par[x])) + '</b></td></tr>'; }).join('') + '</table>' }), knoepfe: [{ text: HT.t('schliessen'), art: 'primaer' }] });
      } }));
      detail.appendChild(kopf);
      var dg = HT.el('div'); detail.appendChild(dg);
      var linie = false;
      function malen() {
        var key = mSel.value;
        var werte = k.runs.map(function (r) { var v = key === 'quote' ? (r.quote === null ? null : Math.round(r.quote * 100)) : r[key]; return v === null || v === undefined ? 0 : Math.round(v); });
        if (linie) HT.charts.linie(dg, { punkte: werte.map(function (v, i) { return { x: i + 1, y: v, info: 'Durchgang ' + (i + 1) }; }), xFormat: function (x) { return 'D' + x; }, hoehe: 200 });
        else HT.charts.balken(dg, { kategorien: werte.map(function (v, i) { return 'Durchgang ' + (i + 1); }), serien: [{ name: mSel.options[mSel.selectedIndex].text, farbe: '#3D7BE0', werte: werte }], hoehe: 200 });
      }
      mSel.addEventListener('change', malen);
      bB.addEventListener('click', function () { linie = false; bB.classList.add('aktiv'); bL.classList.remove('aktiv'); malen(); });
      bL.addEventListener('click', function () { linie = true; bL.classList.add('aktiv'); bB.classList.remove('aktiv'); malen(); });
      var tab = UI.tabelle([
        { titel: 'Durchgang', wert: function (r) { return k.runs.indexOf(r) + 1; } },
        { titel: 'Level', wert: function (r) { return r.level + (r.levelNachher !== r.level ? ' → ' + r.levelNachher : ''); } },
        { titel: 'Zeit (effektiv)', klasse: 'rechts', wert: function (r) { return HT.dauer(r.dauerSek); } },
        { titel: 'Treffer / Fehler / Ausl.', klasse: 'rechts', wert: function (r) { return r.treffer + ' / ' + r.fehler + ' / ' + r.auslassungen; } },
        { titel: 'Quote', klasse: 'rechts', wert: function (r) { return HT.prozent(r.quote); } },
        { titel: 'RT Median', klasse: 'rechts', wert: function (r) { return HT.ms(r.rtMedian); } },
        { titel: 'Pausen', klasse: 'rechts', wert: function (r) { return r.pausen || 0; } },
        { titel: 'Besonderheiten', wert: function (r) { var e = r.extra || {}; return Object.keys(e).filter(function (x) { return x !== 'null'; }).map(function (x) { return x + ': ' + e[x]; }).join(', ') || '–'; } }
      ], k.runs);
      tab.style.marginTop = '.8rem';
      detail.appendChild(tab);
      requestAnimationFrame(malen);
    }
    zeigen(proSitzung[proSitzung.length - 1]);
  }

  /* Motivierende Grafik für Patienten (bei Kindern unter 14 Jahren mit Smileys) – druckbar */
  function levelverlaufDruck(p, m, sitzungen) {
    var kind = p.geburtsjahr && (new Date().getFullYear() - p.geburtsjahr) < 14;
    var max = m.levels.length;
    var balken = sitzungen.map(function (k) {
      var h = Math.max(4, Math.round(k.levelEnde / max * 100));
      return '<div class="lv-saeule">' + (kind ? '<div class="lv-smileys">' + new Array(Math.max(1, Math.round(k.levelEnde / max * 5)) + 1).join('☺') + '</div>' : '<div class="lv-balken" style="height:' + h + '%"></div>') + '<span>' + HT.datum(k.start).slice(0, 6) + '</span></div>';
    }).join('');
    var e = S.einstellungen();
    var html = '<div class="bericht-papier lv-papier"><div class="bericht-kopf"><div><h1>Mein Trainingsfortschritt</h1><div style="color:#51606b;margin-top:2mm;font-size:13pt">' + HT.esc(HT.patienten.anzeigename(p)) + ' · ' + HT.esc(m.name) + '</div></div><div class="bk-praxis">' + (e.logoDataUrl ? '<img src="' + e.logoDataUrl + '" alt=""><br>' : '') + '<strong>' + HT.esc(e.praxisname) + '</strong></div></div>' +
      '<p style="font-size:13pt">Je höher die Säule, desto besser die Leistung. ' + (sitzungen.length > 1 && sitzungen[sitzungen.length - 1].levelEnde > sitzungen[0].levelStart ? 'Sie haben sich von Stufe ' + sitzungen[0].levelStart + ' auf Stufe ' + sitzungen[sitzungen.length - 1].levelEnde + ' gesteigert – weiter so!' : 'Bleiben Sie dran – jedes Training zählt!') + '</p>' +
      '<div class="lv-grafik">' + balken + '</div></div>';
    var app = HT.$('.inhalt') || HT.$('#app');
    var alt = HT.$('.lv-druck'); if (alt) alt.remove();
    var halter = HT.el('div', { class: 'lv-druck', html: html });
    app.appendChild(halter);
    setTimeout(function () { window.print(); setTimeout(function () { halter.remove(); }, 800); }, 150);
  }

  /* ---------- Selbsteinschätzung: Befinden vor/nach im Zeitverlauf + Vergleich mit der Leistung ---------- */
  function selbsteinschaetzung(bereich, p, zr) {
    var sitz = S.alle('sessions', function (s) { return s.patientId === p.id && s.start >= zr.von && s.start <= zr.bis && (s.befindenVor || s.befindenNach); });
    var k = UI.karte('Selbsteinschätzung im Verlauf', null, { icon: 'person' });
    k.style.marginTop = '1.2rem';
    if (!sitz.length) { k.appendChild(UI.leer('Keine Selbsteinschätzungen im Zeitraum. Die Abfrage erfolgt vor und nach jeder Sitzung (Einstellungen).', 'person')); bereich.appendChild(k); return; }
    var g = HT.el('div', { class: 'raster raster-2' });
    var d1 = HT.el('div'), d2 = HT.el('div');
    g.appendChild(HT.el('div', null, [HT.el('div', { class: 'diagramm-titel' }, 'Stimmung vor (Türkis) und nach (Lila) dem Training, 1–5'), d1]));
    g.appendChild(HT.el('div', null, [HT.el('div', { class: 'diagramm-titel' }, 'Erlebte Anstrengung vs. erreichte Trefferquote'), d2]));
    k.appendChild(g);
    bereich.appendChild(k);
    requestAnimationFrame(function () {
      HT.charts.balken(d1, { kategorien: sitz.map(function (s) { return HT.datum(s.start).slice(0, 6); }), serien: [
        { name: 'vorher', farbe: HT.charts.farben.a, werte: sitz.map(function (s) { return (s.befindenVor || {}).stimmung || 0; }) },
        { name: 'nachher', farbe: HT.charts.farben.b, werte: sitz.map(function (s) { return (s.befindenNach || {}).stimmung || 0; }) }], yMax: 5, hoehe: 200 });
      HT.charts.balken(d2, { kategorien: sitz.map(function (s) { return HT.datum(s.start).slice(0, 6); }), serien: [
        { name: 'Anstrengung (×20 %)', farbe: '#E0A21B', werte: sitz.map(function (s) { return ((s.befindenNach || {}).anstrengung || 0) * 20; }) },
        { name: 'Trefferquote %', farbe: '#2EAD6B', werte: sitz.map(function (s) { var q = R.zusammenfassung(S.alle('runs', function (r) { return r.sessionId === s.id; })).quote; return q === null ? 0 : Math.round(q * 100); }) }], yMax: 100, hoehe: 200 });
    });
  }

  var TAG = 86400000;
  function zeitraumAuswahl(zustand, beiAenderung) {
    var wrap = HT.el('div', { class: 'werkzeugleiste' });
    var seg = HT.el('div', { class: 'segment' });
    [[7, '7 Tage'], [30, '30 Tage'], [90, '3 Monate'], [365, '1 Jahr'], [0, 'Alles']].forEach(function (z) {
      var b = HT.el('button', { type: 'button', class: zustand.tage === z[0] ? 'aktiv' : '' }, z[1]);
      b.addEventListener('click', function () { zustand.tage = z[0]; HT.$$('button', seg).forEach(function (x) { x.classList.remove('aktiv'); }); b.classList.add('aktiv'); beiAenderung(); });
      seg.appendChild(b);
    });
    wrap.appendChild(seg);
    return wrap;
  }
  function zeitraum(z) { var bis = Date.now(); return { von: z.tage ? bis - z.tage * TAG : 0, bis: bis }; }

  /* ===================== Reiter „Verlauf“ ===================== */
  R.reiter = function (p, w) {
    var z = { tage: 30, modul: '' };
    var genutzt = {};
    S.alle('runs', function (r) { return r.patientId === p.id; }).forEach(function (r) { genutzt[r.modulId] = true; });
    var module = HT.Module.liste.filter(function (m) { return genutzt[m.id]; });
    if (!module.length) { w.appendChild(UI.karte(null, UI.leer('Noch keine Trainingsergebnisse vorhanden.', 'diagramm'))); return; }
    z.modul = module[0].id;

    var leiste = zeitraumAuswahl(z, zeichnen);
    var sel = HT.el('select', { style: { width: 'auto', minWidth: '260px' } });
    module.forEach(function (m) { sel.appendChild(HT.el('option', { value: m.id }, m.name)); });
    sel.addEventListener('change', function () { z.modul = sel.value; zeichnen(); });
    leiste.insertBefore(sel, leiste.firstChild);
    w.appendChild(leiste);
    var bereich = HT.el('div');
    w.appendChild(bereich);

    function zeichnen() {
      HT.leeren(bereich);
      var zr = zeitraum(z);
      var zf = UI.karte('Zusammenfassung des Zeitraums (alle Module)', HT.el('div', { class: 'zusammenfassung', html: R.textZusammenfassung(p, zr.von, zr.bis).map(function (t) { return '<p>' + t + '</p>'; }).join('') }), { icon: 'dokument' });
      zf.style.marginBottom = '1.2rem';
      bereich.appendChild(zf);
      var m = HT.Module.map[z.modul];
      var runs = R.durchgaenge(p.id, zr.von, zr.bis, z.modul);
      var zs = R.zusammenfassung(runs);
      var tage = R.proTag(runs);
      var kz = HT.el('div', { class: 'raster raster-4', style: { marginBottom: '1.2rem' } });
      kz.appendChild(UI.kennzahl(String(zs.anzahl), 'Durchgänge', 'stapel'));
      kz.appendChild(UI.kennzahl(HT.prozent(zs.quote), 'Trefferquote', 'ziel', 'gruen'));
      kz.appendChild(UI.kennzahl(zs.levelEnde ? zs.levelEnde + ' / ' + m.levels.length : '–', 'Aktuelles Level', 'trend', 'lila'));
      kz.appendChild(UI.kennzahl(HT.ms(zs.rt), 'Ø Reaktionszeit', 'uhr', 'gelb'));
      bereich.appendChild(kz);

      var g = HT.el('div', { class: 'raster raster-2' });
      var k1 = UI.karte('Level über Zeit', null, { icon: 'trend' }); var d1 = HT.el('div'); k1.appendChild(d1);
      var k2 = UI.karte('Trefferquote', null, { icon: 'ziel' }); var d2 = HT.el('div'); k2.appendChild(d2);
      var k3 = UI.karte('Treffer, Fehler, Auslassungen', null, { icon: 'diagramm' }); var d3 = HT.el('div'); k3.appendChild(d3);
      var k4 = UI.karte('Reaktionszeit', null, { icon: 'uhr' }); var d4 = HT.el('div'); k4.appendChild(d4);
      g.appendChild(k1); g.appendChild(k2); g.appendChild(k3); g.appendChild(k4);
      bereich.appendChild(g);
      requestAnimationFrame(function () {
        C().linie(d1, { punkte: tage.map(function (t) { return { x: t.x, y: t.level, info: HT.datum(t.x) + ' · ' + t.anzahl + ' Durchgänge' }; }), yMin: 1, yMax: m.levels.length, treppe: true, yFormat: function (v) { return 'L' + Math.round(v); } });
        C().linie(d2, { punkte: tage.map(function (t) { return { x: t.x, y: t.quote === null ? null : t.quote * 100, info: HT.datum(t.x) }; }), yMin: 0, yMax: 100, yFormat: function (v) { return Math.round(v) + ' %'; }, farbe: '#2EAD6B' });
        C().balken(d3, { kategorien: tage.map(function (t) { return HT.datum(t.x).slice(0, 6); }), gestapelt: true, serien: [
          { name: 'Treffer', farbe: C().farben.treffer, werte: tage.map(function (t) { return t.treffer; }) },
          { name: 'Fehler', farbe: C().farben.fehler, werte: tage.map(function (t) { return t.fehler; }) },
          { name: 'Auslassungen', farbe: C().farben.auslassungen, werte: tage.map(function (t) { return t.auslassungen; }) }] });
        C().linie(d4, { punkte: tage.filter(function (t) { return t.rt; }).map(function (t) { return { x: t.x, y: t.rt, info: HT.datum(t.x) }; }), yFormat: function (v) { return Math.round(v) + ' ms'; }, farbe: '#E0A21B' });
      });

      // Links/Rechts und Zeitraumvergleich
      var g2 = HT.el('div', { class: 'raster raster-2', style: { marginTop: '1.2rem' } });
      var k5 = UI.karte('Links-Rechts-Verteilung', null, { icon: 'auge' }); var d5 = HT.el('div'); k5.appendChild(d5);
      var lrTab = HT.el('div', { class: 'klein gedimmt', style: { marginTop: '.6rem' } });
      lrTab.textContent = 'Ø Reaktionszeit links: ' + HT.ms(zs.rtLinks) + ' · rechts: ' + HT.ms(zs.rtRechts);
      k5.appendChild(lrTab);
      g2.appendChild(k5);
      var k6 = UI.karte('Vergleich zweier Zeiträume', null, { icon: 'kalender' });
      g2.appendChild(k6);
      bereich.appendChild(g2);
      requestAnimationFrame(function () {
        C().balken(d5, { kategorien: ['Treffer', 'Auslassungen'], serien: [
          { name: 'Links', farbe: C().farben.links, werte: [zs.trefferLinks, zs.auslLinks] },
          { name: 'Rechts', farbe: C().farben.rechts, werte: [zs.trefferRechts, zs.auslRechts] }], hoehe: 200 });
      });
      vergleich(k6, p, m);

      // Tabelle
      var k7 = UI.karte('Alle Durchgänge', null, { icon: 'stapel' });
      k7.style.marginTop = '1.2rem';
      k7.appendChild(UI.tabelle([
        { titel: 'Datum', sort: function (r) { return r.start; }, wert: function (r) { return HT.datumZeit(r.start); } },
        { titel: 'Level', klasse: 'rechts', wert: function (r) { return r.level + (r.levelNachher !== r.level ? ' → ' + r.levelNachher : ''); } },
        { titel: 'Dauer', klasse: 'rechts', wert: function (r) { return HT.dauer(r.dauerSek); } },
        { titel: 'Treffer', klasse: 'rechts', wert: function (r) { return r.treffer; } },
        { titel: 'Fehler', klasse: 'rechts', wert: function (r) { return r.fehler; } },
        { titel: 'Ausl.', klasse: 'rechts', wert: function (r) { return r.auslassungen; } },
        { titel: 'Quote', klasse: 'rechts', sort: function (r) { return r.quote || 0; }, wert: function (r) { return HT.prozent(r.quote); } },
        { titel: 'RT Median', klasse: 'rechts', wert: function (r) { return HT.ms(r.rtMedian); } },
        { titel: 'RT Streuung', klasse: 'rechts', wert: function (r) { return HT.ms(r.rtStreuung); } }
      ], runs.slice().reverse(), { leer: 'Keine Durchgänge im Zeitraum.' }));
      bereich.appendChild(k7);
      sitzungsAnalyse(bereich, p, m, runs);
      selbsteinschaetzung(bereich, p, zr);
    }
    zeichnen();
  };

  function vergleich(karte, p, m) {
    var heute = new Date();
    var vor = function (t) { return HT.isoDatum(Date.now() - t * TAG); };
    var form = HT.el('div', { class: 'formular' });
    var felder = { a1: vor(28), a2: vor(15), b1: vor(14), b2: HT.isoDatum(heute.getTime()) };
    var inputs = {};
    [['a1', 'Zeitraum A von'], ['a2', 'bis'], ['b1', 'Zeitraum B von'], ['b2', 'bis']].forEach(function (f) {
      var i = HT.el('input', { type: 'date', value: felder[f[0]] });
      i.addEventListener('change', rechnen);
      inputs[f[0]] = i;
      form.appendChild(HT.el('label', { class: 'feld' }, [HT.el('span', { class: 'feld-label' }, f[1]), i]));
    });
    karte.appendChild(form);
    var erg = HT.el('div', { style: { marginTop: '1rem' } });
    karte.appendChild(erg);
    function tag(s, ende) { var d = new Date(s + 'T00:00:00').getTime(); return ende ? d + TAG - 1 : d; }
    function rechnen() {
      HT.leeren(erg);
      var A = R.zusammenfassung(R.durchgaenge(p.id, tag(inputs.a1.value), tag(inputs.a2.value, true), m.id));
      var B = R.zusammenfassung(R.durchgaenge(p.id, tag(inputs.b1.value), tag(inputs.b2.value, true), m.id));
      var diff = function (a, b, umkehr, fmt) {
        if (a === null || b === null || a === undefined || b === undefined) return '–';
        var d = b - a; var gut = umkehr ? d < 0 : d > 0;
        return '<span class="abzeichen ' + (d === 0 ? '' : (gut ? 'gruen' : 'rot')) + '">' + (d > 0 ? '+' : '') + fmt(d) + '</span>';
      };
      var t = HT.el('table', { class: 'tabelle' });
      t.innerHTML = '<thead><tr><th></th><th class="rechts">A</th><th class="rechts">B</th><th class="rechts">Veränderung</th></tr></thead><tbody>' +
        '<tr><td>Durchgänge</td><td class="rechts">' + A.anzahl + '</td><td class="rechts">' + B.anzahl + '</td><td class="rechts">' + diff(A.anzahl, B.anzahl, false, String) + '</td></tr>' +
        '<tr><td>Trefferquote</td><td class="rechts">' + HT.prozent(A.quote) + '</td><td class="rechts">' + HT.prozent(B.quote) + '</td><td class="rechts">' + diff(A.quote, B.quote, false, function (d) { return Math.round(d * 100) + ' Pkt.'; }) + '</td></tr>' +
        '<tr><td>Höchstes Level</td><td class="rechts">' + (A.levelMax || '–') + '</td><td class="rechts">' + (B.levelMax || '–') + '</td><td class="rechts">' + diff(A.levelMax, B.levelMax, false, String) + '</td></tr>' +
        '<tr><td>Ø Reaktionszeit</td><td class="rechts">' + HT.ms(A.rt) + '</td><td class="rechts">' + HT.ms(B.rt) + '</td><td class="rechts">' + diff(A.rt, B.rt, true, function (d) { return Math.round(d) + ' ms'; }) + '</td></tr>' +
        '</tbody>';
      erg.appendChild(t);
    }
    rechnen();
  }

  /* ===================== Seite „Auswertung“ (Patient wählen) ===================== */
  HT.route('/auswertung', function (param, w) {
    w.appendChild(UI.seite(HT.t('nav_auswertung'), 'Verlauf und Ergebnisse je Patient und Modul'));
    var liste = HT.patienten.alle().map(function (p) {
      var runs = S.alle('runs', function (r) { return r.patientId === p.id; });
      return { p: p, runs: runs, zs: R.zusammenfassung(runs.slice(-30)) };
    }).filter(function (x) { return x.runs.length; });
    var k = UI.karte(null, null);
    k.appendChild(UI.tabelle([
      { titel: 'Patient', sort: function (x) { return HT.patienten.anzeigename(x.p); }, wert: function (x) {
        var d = HT.el('div', { class: 'zelle-name' }); d.appendChild(UI.avatar(HT.patienten.anzeigename(x.p)));
        d.appendChild(HT.el('div', null, [HT.el('strong', null, HT.patienten.anzeigename(x.p)), HT.el('small', null, x.p.pseudonym)])); return d;
      } },
      { titel: 'Durchgänge', klasse: 'rechts', sort: function (x) { return x.runs.length; }, wert: function (x) { return x.runs.length; } },
      { titel: 'Quote (letzte 30)', klasse: 'rechts', sort: function (x) { return x.zs.quote || 0; }, wert: function (x) { return HT.prozent(x.zs.quote); } },
      { titel: 'Letztes Training', sort: function (x) { return x.runs[x.runs.length - 1].start; }, wert: function (x) { return HT.datum(x.runs[x.runs.length - 1].start); } }
    ], liste, { beiKlick: function (x) { location.hash = '#/patient/' + x.p.id + '/verlauf'; }, leer: 'Noch keine Ergebnisse vorhanden.', leerIcon: 'diagramm' }));
    w.appendChild(k);
  }, { nav: 'auswertung' });
})();

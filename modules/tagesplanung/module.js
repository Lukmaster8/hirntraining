/* Modul: Tagesplanung – Termine mit Bedingungen in einen Tagesplan einordnen.
 * Level: Anzahl Termine, Art der Bedingungen (feste Uhrzeit, vor/ab einer Uhrzeit, nach einem anderen Termin). */
(function () {
  'use strict';
  var HT = window.HT;
  var levels = HT.stufen(12, function (t, i) { return { termine: HT.lerpInt(3, 7, t), schwierigkeit: i <= 3 ? 1 : i <= 7 ? 2 : 3 }; });
  var AUFGABEN = ['Zahnarzt', 'Einkaufen', 'Mittagessen', 'Spaziergang', 'Post', 'Apotheke', 'Bank', 'Friseur', 'Physiotherapie', 'Wäsche waschen', 'Anruf bei Tochter', 'Blumen gießen', 'Kaffee mit Nachbarin', 'Tabletten nehmen', 'Zeitung lesen'];
  var STUNDEN = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17];

  function szenario(n, schw) {
    var namen = HT.zufall.stichprobe(AUFGABEN, n);
    var slots = HT.zufall.stichprobe(STUNDEN, n);
    var aufg = namen.map(function (nm, i) { return { name: nm, loesung: slots[i] }; });
    aufg.forEach(function (a, i) {
      var arten = ['fest'];
      if (schw >= 2) arten.push('vor', 'ab');
      if (schw >= 3) arten.push('nach', 'nach', 'vor', 'ab');
      var art = HT.zufall.wahl(arten);
      if (i === 0) art = 'fest';
      var frueher = aufg.filter(function (b) { return b !== a && b.loesung < a.loesung; });
      if (art === 'nach' && !frueher.length) art = 'ab';
      if (art === 'vor' && a.loesung >= 17) art = 'fest';
      if (art === 'ab' && a.loesung <= 8) art = 'fest';
      if (art === 'fest') { a.bed = { art: 'fest', h: a.loesung }; a.text = 'genau um ' + a.loesung + ' Uhr'; }
      if (art === 'vor') { var h = HT.zufall.int(a.loesung + 1, Math.min(18, a.loesung + 3)); a.bed = { art: 'vor', h: h }; a.text = 'vor ' + h + ' Uhr'; }
      if (art === 'ab') { var h2 = HT.zufall.int(Math.max(8, a.loesung - 3), a.loesung); a.bed = { art: 'ab', h: h2 }; a.text = 'frühestens um ' + h2 + ' Uhr'; }
      if (art === 'nach') { var b = HT.zufall.wahl(frueher); a.bed = { art: 'nach', ref: b.name }; a.text = 'nach „' + b.name + '“'; }
    });
    return aufg;
  }
  function erfuellt(a, plan) {
    var s = plan[a.name];
    if (s === undefined) return false;
    var b = a.bed;
    if (b.art === 'fest') return s === b.h;
    if (b.art === 'vor') return s < b.h;
    if (b.art === 'ab') return s >= b.h;
    if (b.art === 'nach') return plan[b.ref] !== undefined && s > plan[b.ref];
    return false;
  }

  HT.registerModule({
    id: 'tagesplanung', name: 'Tagesplanung', kategorie: 'exekutiv', symbol: 'kalender',
    ziel: 'Einen Tag mit Bedingungen sinnvoll planen',
    beschreibung: 'Mehrere Erledigungen sollen in einen Tagesplan von 8 bis 17 Uhr eingetragen werden. Jede Erledigung hat eine Bedingung: eine feste Uhrzeit, „vor … Uhr“, „frühestens um … Uhr“ oder „nach einer anderen Erledigung“. Erst Erledigung antippen, dann Uhrzeit. Level: Anzahl der Termine und Komplexität der Bedingungen. Jede Aufgabe ist lösbar.',
    anleitung: 'Tippen Sie links auf eine Erledigung und dann rechts auf eine freie Uhrzeit. Beachten Sie die Bedingung jeder Erledigung. Wenn alles eingetragen ist, tippen Sie auf „Fertig“.',
    tasten: [], levels: levels,
    levelLabels: { termine: 'Termine', schwierigkeit: 'Bedingungen (1–3)' },
    bewertung: { aufstufenAb: 0.85, abstufenUnter: 0.6 },
    create: function (container, ctx) {
      var p = ctx.params, Z = HT.zeit, tf = null;
      var zone = HT.m.neu(container, 'm-zentrum');
      var anw = HT.m.neu(zone, 'm-anweisung');
      var g = HT.m.neu(zone, '', '', { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '28px', gridGap: '28px', width: 'min(980px, 94%)', alignItems: 'start' });
      var links = HT.m.neu(g, ''), rechts = HT.m.neu(g, '', '', { background: 'var(--grund)', borderRadius: '18px', padding: '12px' });
      var unten = HT.m.neu(zone, '', '', { marginTop: '1rem' });
      var aufg = [], plan = {}, gewaehlt = null, t0 = 0, aktiv = false, kEls = {}, sEls = {};
      function runde() {
        if (tf) tf.entfernen();
        aufg = szenario(p.termine, p.schwierigkeit); plan = {}; gewaehlt = null; aktiv = true; t0 = Z.jetzt();
        anw.innerHTML = 'Planen Sie den Tag: <b>erst Erledigung, dann Uhrzeit</b> antippen';
        HT.leeren(links); HT.leeren(rechts); HT.leeren(unten);
        var fokusEl = [];
        HT.zufall.mischen(aufg).forEach(function (a) {
          var b = HT.el('button', { type: 'button', class: 'm-wahl-knopf', style: { width: '100%', margin: '0 0 8px', flexDirection: 'column', alignItems: 'flex-start', fontSize: '1rem', minHeight: '54px', padding: '.5rem 1rem' }, html: '<span>' + HT.esc(a.name) + '</span><small class="gedimmt" style="font-weight:600">' + HT.esc(a.text) + '</small>' });
          HT.tap(b, function () { waehle(a); });
          links.appendChild(b); kEls[a.name] = b; fokusEl.push(b);
        });
        STUNDEN.forEach(function (h) {
          var s = HT.el('div', { class: 'plan-eintrag', style: { marginBottom: '5px', minHeight: '42px', cursor: 'pointer', padding: '.3rem .8rem' }, html: '<span class="plan-nr" style="width:auto;padding:0 .5rem">' + h + ':00</span><span class="gedimmt">frei</span>' });
          HT.tap(s, function () { eintragen(h); });
          rechts.appendChild(s); sEls[h] = s; fokusEl.push(s);
        });
        var fertig = HT.ui.knopf('Fertig', { art: 'primaer gross voll', icon: 'haken', klick: pruefen });
        fertig.style.marginTop = '.6rem';
        rechts.appendChild(fertig); fokusEl.push(fertig);
        tf = HT.tastenFokus(fokusEl, { spalten: 1, ziffern: false, beiWahl: function (i, el) { if (el === fertig) pruefen(); else if (i < aufg.length) { var nm = el.firstChild.textContent; waehle(aufg.filter(function (x) { return x.name === nm; })[0]); } else eintragen(STUNDEN[i - aufg.length]); } });
      }
      function zeichnen() {
        aufg.forEach(function (a) { kEls[a.name].classList.toggle('markiert', gewaehlt === a); kEls[a.name].style.opacity = plan[a.name] !== undefined ? '.5' : '1'; });
        STUNDEN.forEach(function (h) {
          var wer = aufg.filter(function (a) { return plan[a.name] === h; })[0];
          sEls[h].innerHTML = '<span class="plan-nr" style="width:auto;padding:0 .5rem">' + h + ':00</span>' + (wer ? '<strong>' + HT.esc(wer.name) + '</strong>' : '<span class="gedimmt">frei</span>');
          sEls[h].style.borderColor = wer ? 'var(--akzent)' : '';
        });
      }
      function waehle(a) { if (!aktiv) return; gewaehlt = a; ctx.audio.klick(); zeichnen(); }
      function eintragen(h) {
        if (!aktiv) return;
        var belegt = aufg.filter(function (a) { return plan[a.name] === h; })[0];
        if (!gewaehlt) { if (belegt) { delete plan[belegt.name]; gewaehlt = belegt; zeichnen(); } return; }
        if (belegt && belegt !== gewaehlt) delete plan[belegt.name];
        plan[gewaehlt.name] = h; gewaehlt = null; ctx.audio.klick(); zeichnen();
      }
      function pruefen() {
        if (!aktiv) return;
        if (Object.keys(plan).length < aufg.length) { anw.innerHTML = 'Bitte zuerst <b>alle Erledigungen</b> eintragen'; ctx.audio.falsch(); return; }
        aktiv = false;
        var alleOk = true;
        aufg.forEach(function (a) {
          var ok = erfuellt(a, plan);
          if (!ok) alleOk = false;
          sEls[plan[a.name]].style.borderColor = ok ? 'var(--erfolg)' : 'var(--fehler)';
          sEls[plan[a.name]].style.background = ok ? 'var(--erfolg-hell)' : 'var(--fehler-hell)';
          ctx.onEvent({ korrekt: ok, reiz: a.name + ' (' + a.text + ')', reaktion: plan[a.name] + ' Uhr', rtMs: (Z.jetzt() - t0) / aufg.length });
        });
        ctx.feedback(alleOk);
        anw.innerHTML = alleOk ? 'Der Tagesplan passt perfekt!' : 'Rot markierte Termine erfüllen ihre Bedingung nicht.';
        Z.nach(alleOk ? 1800 : 3200, runde);
      }
      return { start: function () { runde(); }, stop: function () { if (tf) tf.entfernen(); } };
    },
    preview: function (el) {
      var b = function (eingetragen) {
        var s = '<svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg">';
        [['Zahnarzt', 'genau um 10 Uhr'], ['Einkaufen', 'vor 12 Uhr']].forEach(function (a, i) { s += '<rect x="20" y="' + (40 + i * 70) + '" width="160" height="58" rx="12" fill="#fff" stroke="#e1e8ed" stroke-width="2"/><text x="32" y="' + (65 + i * 70) + '" font-size="16" font-weight="700" font-family="-apple-system,sans-serif">' + a[0] + '</text><text x="32" y="' + (85 + i * 70) + '" font-size="12" fill="#8a97a1" font-family="-apple-system,sans-serif">' + a[1] + '</text>'; });
        [9, 10, 11, 12].forEach(function (h, i) { var e = eingetragen[h]; s += '<rect x="210" y="' + (40 + i * 52) + '" width="170" height="44" rx="10" fill="' + (e ? '#e3f5f7' : '#f5f8fa') + '" stroke="' + (e ? '#1BA8B5' : '#cfd9e0') + '" stroke-width="2"/><text x="222" y="' + (68 + i * 52) + '" font-size="14" font-weight="700" font-family="-apple-system,sans-serif">' + h + ':00  ' + (e || '') + '</text>'; });
        return s + '</svg>';
      };
      return HT.beispiel(el, [
        { svg: b({}), text: 'Erst Erledigung, dann Uhrzeit', dauer: 1300 },
        { svg: b({}), zeiger: [25, 23], klick: true, dauer: 800 },
        { svg: b({ 10: 'Zahnarzt' }), zeiger: [72, 37], klick: true, dauer: 1000 },
        { svg: b({ 10: 'Zahnarzt' }), zeiger: [25, 47], klick: true, dauer: 800 },
        { svg: b({ 10: 'Zahnarzt', 9: 'Einkaufen' }), zeiger: [72, 20], klick: true, text: 'Alle Bedingungen erfüllt', dauer: 1700 }
      ]);
    }
  });
})();

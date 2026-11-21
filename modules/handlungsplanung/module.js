/* Modul: Handlungsplanung – Alltagshandlung (Kaffee kochen, Überweisung, Einkauf …) in die richtige Reihenfolge bringen.
 * Level: Anzahl Schritte, Ablenkschritte (gehören nicht dazu). */
(function () {
  'use strict';
  var HT = window.HT;
  var levels = HT.stufen(12, function (t, i) { return { schritte: HT.lerpInt(3, 6, Math.min(1, t * 1.4)), ablenker: i <= 4 ? 0 : i <= 8 ? 1 : 2 }; });

  HT.registerModule({
    id: 'handlungsplanung', name: 'Handlungsplanung', kategorie: 'exekutiv', symbol: 'vorlage',
    ziel: 'Alltagshandlungen planen und in sinnvolle Schritte ordnen',
    beschreibung: 'Die Schritte einer Alltagshandlung (z. B. Kaffee kochen, Überweisung ausführen, Brief verschicken) werden durcheinander angezeigt und sollen in der richtigen Reihenfolge angetippt werden. Ab Level 5 sind Schritte dabei, die nicht zur Handlung gehören und weggelassen werden müssen. Level: Anzahl der Schritte (3–6) und Ablenkschritte.',
    anleitung: 'Oben steht, was erledigt werden soll. Tippen Sie die Schritte in der richtigen Reihenfolge an – was zuerst kommt, zuerst. Schritte, die nicht dazugehören, lassen Sie einfach weg.',
    tasten: [], levels: levels,
    levelLabels: { schritte: 'Schritte', ablenker: 'Ablenkschritte' },
    create: function (container, ctx) {
      var p = ctx.params, Z = HT.zeit, tf = null, letzte = null;
      var zone = HT.m.neu(container, 'm-zentrum');
      var titel = HT.m.neu(zone, 'm-anweisung');
      var g = HT.m.neu(zone, '', '', { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '28px', gridGap: '28px', width: 'min(1000px, 94%)', alignItems: 'start' });
      var links = HT.m.neu(g, ''), rechts = HT.m.neu(g, '', '', { background: 'var(--grund)', borderRadius: '18px', padding: '14px', minHeight: '240px' });
      var a = null, ziel = [], pos = 0, t0 = 0, fehlerRunde = 0;
      function runde() {
        if (tf) tf.entfernen();
        var pool = HT.data.handlungen.filter(function (h) { return h !== letzte; });
        a = HT.zufall.wahl(pool); letzte = a;
        // Schritte gleichmäßig aus der Handlung auswählen (Reihenfolge bleibt erhalten)
        var n = p.schritte, alle = a.schritte;
        ziel = []; for (var i = 0; i < n; i++) ziel.push(alle[Math.round(i * (alle.length - 1) / Math.max(1, n - 1))]);
        ziel = ziel.filter(function (x, k, arr) { return arr.indexOf(x) === k; });
        var karten = HT.zufall.mischen(ziel.concat(HT.zufall.stichprobe(a.ablenker, p.ablenker)));
        pos = 0; fehlerRunde = 0; t0 = Z.jetzt();
        titel.innerHTML = 'Aufgabe: <b>' + a.titel + '</b>';
        HT.leeren(links); HT.leeren(rechts);
        rechts.appendChild(HT.el('div', { class: 'feld-label' }, 'Ihre Reihenfolge'));
        for (var k = 0; k < ziel.length; k++) rechts.appendChild(HT.el('div', { class: 'plan-eintrag', style: { minHeight: '58px', borderStyle: 'dashed', opacity: '.6' }, html: '<span class="plan-nr">' + (k + 1) + '</span><span class="gedimmt">…</span>' }));
        var knoepfe = karten.map(function (text) {
          var b = HT.el('button', { type: 'button', class: 'm-wahl-knopf', style: { width: '100%', margin: '0 0 10px', justifyContent: 'flex-start', textAlign: 'left', fontSize: '1.1rem', minHeight: '62px' } }, text);
          HT.tap(b, function () { waehle(text, b); });
          links.appendChild(b);
          return b;
        });
        tf = HT.tastenFokus(knoepfe, { spalten: 1, beiWahl: function (i, b) { waehle(karten[i], b); } });
      }
      function waehle(text, b) {
        if (b.disabled || pos >= ziel.length) return;
        if (text === ziel[pos]) {
          b.disabled = true; b.style.opacity = '.35';
          var slot = rechts.children[pos + 1];
          slot.style.opacity = '1'; slot.style.borderStyle = 'solid'; slot.style.borderColor = 'var(--erfolg)';
          slot.innerHTML = '<span class="plan-nr" style="background:var(--erfolg);color:#fff">' + (pos + 1) + '</span><strong>' + HT.esc(text) + '</strong>';
          ctx.onEvent({ korrekt: true, reiz: a.titel + ' #' + (pos + 1), reaktion: text, rtMs: Z.jetzt() - t0 });
          t0 = Z.jetzt();
          ctx.audio.richtig();
          pos++;
          if (pos >= ziel.length) { ctx.feedback(fehlerRunde === 0, null, null, { stumm: true }); titel.innerHTML = fehlerRunde === 0 ? 'Perfekt geplant!' : 'Geschafft!'; Z.nach(1800, runde); }
        } else {
          fehlerRunde++;
          var istAblenker = ziel.indexOf(text) < 0;
          ctx.onEvent({ korrekt: false, reiz: a.titel + ' #' + (pos + 1), reaktion: text, typ: istAblenker ? 'ablenker' : 'reihenfolge' });
          ctx.audio.falsch();
          b.classList.add('falsch');
          setTimeout(function () { b.classList.remove('falsch'); }, 600);
          if (istAblenker) titel.innerHTML = '„' + HT.esc(text) + '“ gehört nicht zu: <b>' + a.titel + '</b>';
        }
      }
      return { start: function () { runde(); }, stop: function () { if (tf) tf.entfernen(); } };
    },
    preview: function (el) {
      var schritte = ['Filter einlegen', 'Wasser einfüllen', 'Einschalten'];
      var b = function (geordnet) {
        var s = '<svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg"><text x="200" y="32" text-anchor="middle" font-size="18" font-weight="700" font-family="-apple-system,sans-serif">Kaffee kochen</text>';
        schritte.forEach(function (t, i) { var used = geordnet.indexOf(t) >= 0; s += '<rect x="20" y="' + (60 + i * 64) + '" width="170" height="52" rx="12" fill="#fff" stroke="#e1e8ed" stroke-width="2" opacity="' + (used ? .35 : 1) + '"/><text x="32" y="' + (92 + i * 64) + '" font-size="14" font-weight="600" font-family="-apple-system,sans-serif" opacity="' + (used ? .35 : 1) + '">' + t + '</text>'; });
        for (var k = 0; k < 3; k++) { var t = geordnet[k]; s += '<rect x="210" y="' + (60 + k * 64) + '" width="170" height="52" rx="12" fill="' + (t ? '#e2f5ea' : '#f5f8fa') + '" stroke="' + (t ? '#2EAD6B' : '#cfd9e0') + '" stroke-width="2" stroke-dasharray="' + (t ? '0' : '6 4') + '"/><text x="222" y="' + (92 + k * 64) + '" font-size="14" font-weight="700" font-family="-apple-system,sans-serif">' + (k + 1) + '. ' + (t || '') + '</text>'; }
        return s + '</svg>';
      };
      return HT.beispiel(el, [
        { svg: b([]), text: 'Richtige Reihenfolge antippen', dauer: 1300 },
        { svg: b(['Wasser einfüllen']), zeiger: [25, 52], klick: true, dauer: 1000 },
        { svg: b(['Wasser einfüllen', 'Filter einlegen']), zeiger: [25, 30], klick: true, dauer: 1000 },
        { svg: b(['Wasser einfüllen', 'Filter einlegen', 'Einschalten']), zeiger: [25, 74], klick: true, text: 'Fertig geplant!', dauer: 1600 }
      ]);
    }
  });
})();

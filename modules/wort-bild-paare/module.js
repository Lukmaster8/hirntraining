/* Modul: Wort-Bild-Paare – Paare aus Namen und Gegenständen lernen (assoziatives Gedächtnis).
 * Lernphase: Paare nacheinander; Abruf: zu einem Bild den passenden Namen wählen (später umgekehrt). */
(function () {
  'use strict';
  var HT = window.HT;
  var levels = HT.stufen(12, function (t, i) { return { paare: HT.lerpInt(2, 7, t), zeigeMs: HT.lerpInt(4000, 2200, t), richtung: i <= 6 ? 'bild-wort' : i <= 9 ? 'wort-bild' : 'gemischt', ablenkung: i >= 5 }; });
  HT.registerModule({
    id: 'wort-bild-paare', name: 'Wort-Bild-Paare', kategorie: 'gedaechtnis', symbol: 'gehirn',
    ziel: 'Zusammengehörige Informationen verknüpfen und behalten (z. B. Namen und Gegenstände)',
    beschreibung: 'Training des assoziativen Gedächtnisses. In der Lernphase erscheinen nacheinander Paare aus einem Vornamen und einem Gegenstand („Monika – Regenschirm“). Danach wird zu jedem Bild der passende Name gesucht, ab Level 7 zum Namen das passende Bild, ab Level 10 gemischt. Mit steigendem Level nehmen die Zahl der Paare zu und die Lernzeit ab. Ab Level 5 liegt zwischen Lernen und Abruf eine kurze Ablenkung. Als Strategie hilft eine lebhafte Vorstellung („Monika steht mit dem Regenschirm im Regen“).',
    anleitung: 'Merken Sie sich, welcher Name zu welchem Gegenstand gehört. Stellen Sie sich dazu ein Bild vor. Danach tippen Sie zu jedem Gegenstand den richtigen Namen an (oder umgekehrt).',
    tasten: [], levels: levels,
    levelLabels: { paare: 'Paare', zeigeMs: 'Lernzeit je Paar (ms)', richtung: 'Abfrage', ablenkung: 'Ablenkung vor dem Abruf' },
    create: function (container, ctx) {
      var p = ctx.params, Z = HT.zeit;
      var zone = HT.m.neu(container, 'm-zentrum');
      var namen = HT.data.vornamen || ['Anna', 'Bernd', 'Clara', 'Dieter', 'Elke', 'Frank', 'Gisela', 'Heinz'];
      function karte(id, gr) { return '<div class="m-kachel" style="width:' + gr + 'px;height:' + gr + 'px">' + HT.bild(id) + '</div>'; }
      function runde() {
        var bilder = HT.zufall.stichprobe(HT.data.bilder, p.paare), nm = HT.zufall.stichprobe(namen, p.paare);
        var paare = bilder.map(function (b, i) { return { bild: b, name: nm[i] }; });
        var i = 0;
        function lernen() {
          HT.leeren(zone);
          if (i >= paare.length) { if (p.ablenkung) ablenken(); else abruf(); return; }
          var pr = paare[i++];
          HT.m.neu(zone, 'm-anweisung', 'Paar ' + i + ' von ' + paare.length + ' – merken');
          HT.m.neu(zone, '', '<div style="display:flex;align-items:center;gap:1.4rem">' + karte(pr.bild.id, 180) + '<div class="m-wort">' + HT.esc(pr.name) + '</div></div>');
          HT.m.neu(zone, 'm-anweisung', HT.esc(pr.name) + ' und ' + HT.esc((pr.bild.artikel ? pr.bild.artikel + ' ' : '') + pr.bild.name), { fontSize: '1rem', marginTop: '1rem' });
          Z.nach(p.zeigeMs, lernen);
        }
        function ablenken() {
          HT.leeren(zone);
          var a = HT.zufall.int(12, 39), b = HT.zufall.int(2, 9);
          HT.m.neu(zone, 'm-anweisung', 'Zwischendurch: Wie viel ist <b>' + a + ' + ' + b + '</b>?');
          var r = a + b, opts = HT.zufall.mischen([r, r + 1, r - 2]);
          HT.m.wahl(zone, opts.map(function (v) { return { html: String(v), wert: v }; }), function (v, k) { k.classList.add(v === r ? 'richtig' : 'falsch'); Z.nach(700, abruf); });
        }
        function abruf() {
          var reihe = HT.zufall.mischen(paare), j = 0;
          function frage() {
            if (j >= reihe.length) { HT.leeren(zone); HT.m.neu(zone, 'm-anweisung', 'Neue Paare …'); Z.nach(1300, runde); return; }
            var pr = reihe[j++];
            var modus = p.richtung === 'gemischt' ? HT.zufall.wahl(['bild-wort', 'wort-bild']) : p.richtung;
            HT.leeren(zone);
            var opts, richtig, t0 = Z.jetzt();
            if (modus === 'bild-wort') {
              HT.m.neu(zone, 'm-anweisung', 'Wer gehört zu diesem Gegenstand?');
              HT.m.neu(zone, '', karte(pr.bild.id, 170));
              opts = HT.zufall.mischen(paare.map(function (x) { return x.name; }).concat(p.paare < 3 ? HT.zufall.stichprobe(namen.filter(function (n) { return !paare.some(function (x) { return x.name === n; }); }), 3 - p.paare + 1) : []));
              richtig = pr.name;
              opts = opts.map(function (n) { return { html: HT.esc(n), wert: n }; });
            } else {
              HT.m.neu(zone, 'm-anweisung', 'Was gehört zu <b>' + HT.esc(pr.name) + '</b>?');
              opts = HT.zufall.mischen(paare.map(function (x) { return x.bild; })).slice(0, 6);
              if (opts.indexOf(pr.bild) < 0) opts[0] = pr.bild;
              richtig = pr.bild.id;
              opts = opts.map(function (b) { return { html: '<span style="display:block;width:70px;height:70px">' + HT.bild(b.id) + '</span>', wert: b.id }; });
            }
            var kn = HT.m.wahl(zone, opts, function (w, b) {
              if (zone._aus) return; zone._aus = true;
              var ok = w === richtig;
              kn.forEach(function (x, k) { if (opts[k].wert === richtig) x.classList.add('richtig'); });
              if (!ok) b.classList.add('falsch');
              ctx.onEvent({ korrekt: ok, reiz: pr.name + ' – ' + pr.bild.name, reaktion: String(w), rtMs: Z.jetzt() - t0, typ: modus });
              ctx.feedback(ok, null, null, { dauer: 400 });
              Z.nach(ok ? 900 : 1700, function () { zone._aus = false; frage(); });
            });
          }
          frage();
        }
        lernen();
      }
      return { start: function () { Z.nach(300, runde); }, stop: function () {} };
    },
    preview: function (el) {
      var b = function (phase, mark) {
        var s = '<svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg">';
        if (phase === 0) s += '<rect x="60" y="80" width="120" height="120" rx="16" fill="#fff" stroke="#e1e8ed" stroke-width="2"/>' + HT.bildGruppe('regenschirm', 120, 140, 96) + '<rect x="200" y="112" width="150" height="58" rx="14" fill="#fff" stroke="#e1e8ed" stroke-width="2"/><text x="275" y="150" text-anchor="middle" font-size="24" font-weight="800" font-family="-apple-system,sans-serif">Monika</text>';
        else { s += '<rect x="140" y="30" width="120" height="120" rx="16" fill="#fff" stroke="#e1e8ed" stroke-width="2"/>' + HT.bildGruppe('regenschirm', 200, 90, 96); ['Peter', 'Monika', 'Heinz'].forEach(function (n, i) { var g = mark && i === 1; s += '<rect x="' + (40 + i * 112) + '" y="190" width="100" height="52" rx="12" fill="' + (g ? '#e2f5ea' : '#fff') + '" stroke="' + (g ? '#2EAD6B' : '#e1e8ed') + '" stroke-width="2.5"/><text x="' + (90 + i * 112) + '" y="222" text-anchor="middle" font-size="17" font-family="-apple-system,sans-serif">' + n + '</text>'; }); }
        return s + '</svg>';
      };
      return HT.beispiel(el, [{ svg: b(0), text: 'Monika und der Regenschirm – merken', dauer: 2000 }, { svg: b(1), text: 'Wer gehört zum Regenschirm?', dauer: 1300 }, { svg: b(1, true), zeiger: [50, 72], klick: true, text: 'Monika – richtig!', dauer: 1500 }]);
    }
  });
})();

/* Modul: Telefonnotizen – Hörverstehen und Merken im Berufsalltag.
 * Eine kurze Nachricht wird vorgelesen (Aufnahme der Vorlesestimme, Ersatz Systemstimme) oder kurz als Text gezeigt.
 * Danach wird ein Notizzettel ausgefüllt: Auswahlknöpfe für Name, Firma, Anliegen, Termin, Rückruf; Ziffernblock für die Nummer.
 * Level: Anzahl Informationen 2 → 6, Nachrichtenlänge, leises Nebengeräusch, einmal oder zweimal abspielen, Verzögerung mit Ablenkaufgabe. */
(function () {
  'use strict';
  var HT = window.HT;

  var levels = HT.stufen(14, function (t, i) {
    return {
      infos: i <= 2 ? 2 : i <= 4 ? 3 : i <= 7 ? 4 : i <= 10 ? 5 : 6,
      abspielen: i <= 5 ? 2 : 1,
      geraeusch: i >= 9,
      verzoegerungSek: i <= 6 ? 0 : HT.lerpInt(5, 25, (i - 7) / 7),
      antworten: i <= 4 ? 3 : 4
    };
  });
  var REIHENFOLGE = ['name', 'anliegen', 'nummer', 'termin', 'firma', 'rueckruf'];
  var FRAGEN = { name: 'Wer hat angerufen?', firma: 'Von welcher Firma?', anliegen: 'Worum ging es?', termin: 'Welcher Termin wurde genannt?', rueckruf: 'Bis wann soll zurückgerufen werden?', nummer: 'Wie lautet die Rückrufnummer?' };
  function telefonSvg(an) {
    return '<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><circle cx="100" cy="100" r="86" fill="' + (an ? '#e3f6f8' : '#f1f5f7') + '" stroke="#1BA8B5" stroke-width="5"/>' +
      '<path d="M70 52 Q58 52 56 66 Q52 104 92 140 Q126 168 142 150 L150 140 Q154 132 146 126 L128 114 Q120 110 114 118 L108 124 Q90 116 78 96 L84 90 Q92 84 88 76 L80 58 Q76 52 70 52Z" fill="#1BA8B5"/>' +
      (an ? '<path d="M128 56 Q148 64 152 86 M132 40 Q164 52 168 84" fill="none" stroke="#1BA8B5" stroke-width="6" stroke-linecap="round" class="tn-welle"/>' : '') + '</svg>';
  }

  HT.registerModule({
    id: 'telefonnotiz', name: 'Telefonnotizen', kategorie: 'gedaechtnis', symbol: 'ton',
    ziel: 'Gehörtes verstehen und behalten wie im Berufsalltag',
    beschreibung: 'Eine kurze Telefonnachricht wird vorgelesen: Name, Rückrufnummer, Anliegen, Termin. Danach wird ein Notizzettel ausgefüllt (Auswahlknöpfe, Ziffernblock für die Nummer). Höhere Level: mehr Informationen, längere Nachrichten, leises Nebengeräusch, nur einmal abspielen, Verzögerung mit kleiner Ablenkaufgabe. Ist der Ton aus, erscheint die Nachricht kurz als Text.',
    anleitung: 'Hören Sie die Nachricht aufmerksam an. Danach füllen Sie den Notizzettel aus. Die Nummer tippen Sie auf dem Ziffernblock ein.',
    tasten: [], levels: levels,
    levelLabels: { infos: 'Informationen', abspielen: 'Abspielen (mal)', geraeusch: 'Nebengeräusch', verzoegerungSek: 'Verzögerung (s)', antworten: 'Antwortmöglichkeiten' },
    create: function (container, ctx) {
      var p = ctx.params, Z = HT.zeit, aus = [], laeuft = true, rausch = null;
      var zone = HT.m.neu(container, 'm-zentrum');
      var anw = HT.m.neu(zone, 'm-anweisung', 'Gleich klingelt das Telefon …');
      var buehne = HT.m.neu(zone, 'tn-buehne');
      var unten = HT.m.neu(zone, 'tn-unten');
      var pool = HT.data.telefon.filter(function (n) { return n.anzahl >= p.infos; });
      var zuletzt = null;
      function felderVon(n) { return REIHENFOLGE.filter(function (f) { return n.felder[f]; }).slice(0, p.infos); }
      function runde() {
        if (!laeuft) return;
        var n; do { n = HT.zufall.wahl(pool); } while (pool.length > 1 && n === zuletzt);
        zuletzt = n;
        var gespielt = 0;
        HT.leeren(unten);
        buehne.innerHTML = '<div class="tn-telefon">' + telefonSvg(true) + '</div>';
        anw.textContent = 'Das Telefon klingelt …';
        ctx.audio.ton(880, 0.25, 'sine', 0, 0.2); ctx.audio.ton(880, 0.25, 'sine', 0.35, 0.2);
        Z.nach(1200, abspielen);
        function abspielen() {
          if (!laeuft) return;
          gespielt++;
          anw.textContent = 'Hören Sie gut zu.';
          if (p.geraeusch) rauschen(true);
          var ok = HT.audio.sprechen(n.text, { danach: function () { Z.nach(400, fertig); } });
          if (!ok) {
            // ohne Ton: Nachricht kurz als Text zeigen (Lesezeit nach Länge)
            buehne.innerHTML = '<div class="tn-zettel tn-nachricht">' + HT.esc(n.text) + '</div>';
            Z.nach(Math.max(5000, n.text.length * 65), fertig);
          }
        }
        function fertig() {
          if (!laeuft) return;
          rauschen(false);
          buehne.innerHTML = '<div class="tn-telefon">' + telefonSvg(false) + '</div>';
          HT.leeren(unten);
          if (gespielt < p.abspielen) {
            anw.textContent = 'Möchten Sie die Nachricht noch einmal hören?';
            var r = HT.el('div', { class: 'm-wahl' });
            var b1 = HT.el('button', { type: 'button', class: 'm-wahl-knopf' }, 'Noch einmal hören');
            var b2 = HT.el('button', { type: 'button', class: 'm-wahl-knopf' }, 'Weiter zur Notiz');
            HT.tap(b1, function () { HT.leeren(unten); abspielen(); });
            HT.tap(b2, function () { HT.leeren(unten); weiterZurNotiz(); });
            r.appendChild(b1); r.appendChild(b2); unten.appendChild(r);
            var tf = HT.tastenFokus([b1, b2], { beiWahl: function (i) { HT.leeren(unten); if (i === 0) abspielen(); else weiterZurNotiz(); } });
            aus.push(function () { if (tf && tf.entfernen) tf.entfernen(); });
            return;
          }
          weiterZurNotiz();
        }
        function weiterZurNotiz() { if (p.verzoegerungSek) ablenkung(p.verzoegerungSek, notiz); else notiz(); }
        function notiz() {
          if (!laeuft) return;
          var felder = felderVon(n), k = 0;
          buehne.innerHTML = '';
          var zettel = HT.el('div', { class: 'tn-zettel' });
          zettel.appendChild(HT.el('div', { class: 'tn-zettel-kopf' }, 'Telefonnotiz'));
          var zeilen = {};
          felder.forEach(function (f) { var z = HT.el('div', { class: 'tn-zeile' }, [HT.el('span', null, HT.data.telefonFelder[f] + ':'), HT.el('b', null, '…')]); zeilen[f] = z.lastChild; zettel.appendChild(z); });
          buehne.appendChild(zettel);
          function frage() {
            if (!laeuft) return;
            if (k >= felder.length) { anw.textContent = 'Notiz fertig!'; ctx.feedback(true); HT.leeren(unten); Z.nach(1600, runde); return; }
            var f = felder[k], richtig = n.felder[f], t0 = Z.jetzt();
            anw.textContent = FRAGEN[f];
            HT.leeren(unten);
            if (f === 'nummer') {
              var soll = richtig.replace(/ /g, ''), ein = '';
              var anzeige = HT.el('div', { class: 'tn-nummer' }, '–');
              unten.appendChild(anzeige);
              var block = HT.el('div', { class: 'tn-block' });
              var tasten = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '⌫', '0', 'OK'];
              var taste = function (z) {
                if (z === '⌫') ein = ein.slice(0, -1);
                else if (z === 'OK') { if (ein.length) pruefen(); return; }
                else if (ein.length < 9) ein += z;
                anzeige.textContent = ein || '–';
              };
              tasten.forEach(function (z) { var b = HT.el('button', { type: 'button', class: 'm-wahl-knopf tn-taste' + (z === 'OK' ? ' ok' : '') }, z); HT.tap(b, function () { taste(z); }); block.appendChild(b); });
              unten.appendChild(block);
              var weg = HT.eingabe.an(function (akt, d) {
                if (akt === 'ziffer') taste(String(d.wert));
                else if (akt === 'loeschen') taste('⌫');
                else if (akt === 'ok') taste('OK');
              });
              aus.push(weg);
              var pruefen = function () {
                weg();
                var spanne = 0; while (spanne < soll.length && ein[spanne] === soll[spanne]) spanne++;
                var ok = ein === soll;
                ctx.onEvent({ korrekt: ok, rtMs: Z.jetzt() - t0, reiz: 'nummer ' + soll, reaktion: ein, typ: 'nummer', spanne: spanne });
                zeilen[f].textContent = ein + (ok ? ' ✓' : '  (richtig: ' + soll + ')');
                zeilen[f].className = ok ? 'richtig' : 'falsch';
                if (!ok) ctx.audio.falsch(); else ctx.audio.richtig();
                k++; Z.nach(ok ? 700 : 1600, frage);
              };
              return;
            }
            var andere = HT.data.telefon.map(function (x) { return x.felder[f]; }).filter(function (w, i, a) { return w && w !== richtig && a.indexOf(w) === i; });
            var optionen = HT.zufall.mischen([richtig].concat(HT.zufall.stichprobe(andere, p.antworten - 1)));
            HT.m.wahl(unten, optionen.map(function (o) { return { html: HT.esc(o), wert: o }; }), function (w, knopf) {
              if (knopf.disabled) return;
              [].forEach.call(unten.querySelectorAll('button'), function (b) { b.disabled = true; });
              var ok = w === richtig;
              knopf.classList.add(ok ? 'richtig' : 'falsch');
              ctx.onEvent({ korrekt: ok, rtMs: Z.jetzt() - t0, reiz: f + ' ' + richtig, reaktion: w, typ: f });
              zeilen[f].textContent = ok ? w + ' ✓' : richtig;
              zeilen[f].className = ok ? 'richtig' : 'falsch';
              if (!ok) ctx.audio.falsch();
              k++; Z.nach(ok ? 700 : 1500, frage);
            }, 'tn-wahl');
          }
          frage();
        }
      }
      /* Ablenkaufgabe während der Verzögerung: auf erscheinende Sterne tippen (wird nicht gewertet) */
      function ablenkung(sek, weiter) {
        anw.textContent = 'Kurze Zwischenaufgabe: Tippen Sie auf die Sterne.';
        HT.leeren(unten);
        buehne.innerHTML = '';
        var feld = HT.el('div', { class: 'tn-ablenkung' });
        buehne.appendChild(feld);
        var ende = Z.jetzt() + sek * 1000, t = null;
        function stern() {
          if (!laeuft) return;
          if (Z.jetzt() >= ende) { HT.leeren(feld); weiter(); return; }
          HT.leeren(feld);
          var s = HT.el('button', { type: 'button', class: 'tn-stern', html: '★', style: { left: HT.zufall.int(5, 80) + '%', top: HT.zufall.int(5, 70) + '%' } });
          HT.tap(s, function () { s.remove(); ctx.audio.ton(990, 0.06, 'sine', 0, 0.12); });
          feld.appendChild(s);
          t = Z.nach(1200, stern);
        }
        var okWeg = HT.eingabe.an(function (a) { if (a === 'ok') { var s = feld.querySelector('.tn-stern'); if (s) s.click(); } });
        aus.push(okWeg); aus.push(function () { Z.abbrechen(t); });
        stern();
      }
      /* leises Nebengeräusch (gefiltertes Rauschen, wie ein Großraumbüro) */
      function rauschen(an) {
        var ac = HT.audio.kontext && HT.audio.kontext();
        if (!an) { if (rausch) { try { rausch.src.stop(); } catch (e) { /* egal */ } rausch = null; } return; }
        if (!ac || rausch) return;
        try {
          var len = ac.sampleRate * 2, buf = ac.createBuffer(1, len, ac.sampleRate), d = buf.getChannelData(0);
          for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * 0.5;
          var src = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
          src.buffer = buf; src.loop = true; f.type = 'bandpass'; f.frequency.value = 600; f.Q.value = 0.6; g.gain.value = 0.035 * HT.audio.lautstaerke;
          src.connect(f); f.connect(g); g.connect(ac.destination); src.start();
          rausch = { src: src };
        } catch (e) { rausch = null; }
      }
      return {
        start: function () { Z.nach(600, runde); },
        stop: function () { laeuft = false; rauschen(false); HT.audio.stumm(); aus.forEach(function (f) { try { f(); } catch (e) { /* egal */ } }); }
      };
    },
    preview: function (el) {
      var zettel = function (wer, nummer) {
        return '<svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg"><g transform="translate(30 70) scale(.8)">' + telefonSvg(!wer).replace(/<\/?svg[^>]*>/g, '') + '</g>' +
          '<rect x="200" y="50" width="170" height="200" rx="10" fill="#fffbe6" stroke="#e6d7a0" stroke-width="2"/><text x="285" y="80" text-anchor="middle" font-size="16" font-weight="800" fill="#1E2A33" font-family="-apple-system,sans-serif">Telefonnotiz</text>' +
          '<text x="212" y="120" font-size="13" fill="#51606b" font-family="-apple-system,sans-serif">Name:</text><text x="212" y="140" font-size="15" font-weight="700" fill="#1E2A33" font-family="-apple-system,sans-serif">' + (wer || '…') + '</text>' +
          '<text x="212" y="175" font-size="13" fill="#51606b" font-family="-apple-system,sans-serif">Nummer:</text><text x="212" y="195" font-size="15" font-weight="700" fill="#1E2A33" font-family="-apple-system,sans-serif">' + (nummer || '…') + '</text></svg>';
      };
      return HT.beispiel(el, [
        { svg: zettel('', ''), text: 'Nachricht anhören', dauer: 1800 },
        { svg: zettel('Frau Berger', ''), text: 'Name auswählen', dauer: 1300 },
        { svg: zettel('Frau Berger', '4712'), text: 'Nummer eintippen', dauer: 1500 }
      ]);
    }
  });
})();

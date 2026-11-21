/* Modul: Gesichtsfeldtraining – Fixationspunkt in der Mitte (Kontrollaufgabe: auf Farbwechsel reagieren),
 * Lichtreize am Rand des eingeschränkten Feldes. Level: Exzentrizität, Reizgröße, Darbietungsdauer. */
(function () {
  'use strict';
  var HT = window.HT;
  var levels = HT.stufen(14, function (t) {
    return { exzentrizitaet: Math.round(HT.lerp(0.45, 0.95, t) * 100) / 100, reizGroesse: HT.lerpInt(70, 22, t), darbietungMs: HT.lerpInt(1800, 350, t), fixationsWechsel: Math.round(HT.lerp(0.12, 0.22, t) * 100) / 100 };
  });
  HT.registerModule({
    id: 'gesichtsfeld', name: 'Gesichtsfeldtraining', kategorie: 'wahrnehmung', symbol: 'ziel',
    ziel: 'Reize am Rand eines eingeschränkten Gesichtsfeldes besser wahrnehmen',
    beschreibung: 'Der Blick bleibt auf dem Kreuz in der Bildschirmmitte. Am Rand des betroffenen Gesichtsfeldes leuchten kurz Lichtpunkte auf, auf die mit der Pfeiltaste der jeweiligen Seite (oder durch Antippen der Bildschirmhälfte) reagiert wird. Als Kontrollaufgabe für die Fixation wechselt das Kreuz gelegentlich die Farbe – dann wird die Leertaste gedrückt. Seite aus der Patientenakte oder fest einstellbar.',
    anleitung: 'Schauen Sie immer auf das Kreuz in der Mitte. Leuchtet am Rand ein Punkt auf, drücken Sie die Pfeiltaste dieser Seite (← oder →) oder tippen Sie auf diese Bildschirmhälfte. Wird das Kreuz ROT, drücken Sie die Leertaste.',
    tasten: ['links', 'ok', 'rechts'], levels: levels,
    levelLabels: { exzentrizitaet: 'Exzentrizität', reizGroesse: 'Reizgröße (px)', darbietungMs: 'Darbietung (ms)', fixationsWechsel: 'Anteil Fixationskontrollen' },
    parameterSchema: { seite: { typ: 'auswahl', label: 'Trainierte Seite', standard: 'patient', optionen: [{ wert: 'patient', label: 'Aus Patientenakte' }, { wert: 'links', label: 'Links' }, { wert: 'rechts', label: 'Rechts' }, { wert: 'beide', label: 'Beide Seiten' }] } },
    create: function (container, ctx) {
      var p = ctx.params, Z = HT.zeit, aus = [];
      var seite = p.seite;
      if (seite === 'patient') seite = /links/.test(ctx.patient.gesichtsfeld) ? 'links' : /rechts/.test(ctx.patient.gesichtsfeld) ? 'rechts' : 'beide';
      container.style.background = '#1b2329';
      var voll = HT.m.neu(container, 'm-voll', '', { background: '#1b2329' });
      var kreuz = HT.m.neu(voll, '', '<svg viewBox="0 0 40 40" width="40" height="40"><path d="M20 4 V36 M4 20 H36" stroke="currentColor" stroke-width="6" stroke-linecap="round"/></svg>', { position: 'absolute', left: 'calc(50% - 20px)', top: 'calc(50% - 20px)', color: '#f2f5f7' });
      var winkelInfo = HT.m.neu(container, 'm-info', '', { color: '#8a97a1', zIndex: 5 });
      var reiz = HT.m.neu(voll, '', '', { position: 'absolute', borderRadius: '50%', background: 'radial-gradient(circle, #fff7c2, #F2B630 60%, rgba(242,182,48,0) 72%)', display: 'none' });
      var aktuell = null, fix = null, timer = null;
      function naechster() {
        aktuell = null; fix = null;
        timer = Z.nach(HT.zufall.int(900, 2200), function () {
          if (HT.zufall.chance(p.fixationsWechsel)) {
            fix = { start: Z.jetzt() }; kreuz.style.color = '#E25C5C';
            timer = Z.nach(1400, function () { if (fix) { ctx.onEvent({ korrekt: false, auslassung: true, reiz: 'fixation', reaktion: 'keine', typ: 'fixation', zaehlt: true }); } kreuz.style.color = '#f2f5f7'; naechster(); });
            return;
          }
          var s = seite === 'beide' ? HT.zufall.wahl(['links', 'rechts']) : seite;
          var b = container.clientWidth, h = container.clientHeight, g = p.reizGroesse;
          var dx = (b / 2 - g) * p.exzentrizitaet * HT.zufall.zahl(0.85, 1);
          var x = b / 2 + (s === 'links' ? -dx : dx) - g / 2, y = h / 2 + HT.zufall.zahl(-0.38, 0.38) * h - g / 2;
          reiz.style.width = reiz.style.height = g + 'px'; reiz.style.left = x + 'px'; reiz.style.top = y + 'px'; reiz.style.display = 'block';
          aktuell = { seite: s, start: Z.jetzt(), beantwortet: false };
          var es = HT.storage.einstellungen(), cmProPx = (es.bildschirmBreiteCm || 33) / container.clientWidth;
          aktuell.grad = Math.round(Math.atan((dx * cmProPx) / (es.abstandCm || 50)) * 180 / Math.PI);
          winkelInfo.textContent = 'Reiz bei ca. ' + aktuell.grad + '° Exzentrizität';
          timer = Z.nach(p.darbietungMs, function () {
            reiz.style.display = 'none';
            timer = Z.nach(900, function () {
              if (aktuell && !aktuell.beantwortet) ctx.onEvent({ korrekt: false, auslassung: true, reiz: 'licht', reaktion: 'keine', seite: aktuell.seite });
              naechster();
            });
          });
        });
      }
      function antwort(s) {
        if (s === 'ok') {
          if (fix) { ctx.onEvent({ korrekt: true, reiz: 'fixation', reaktion: 'leertaste', rtMs: Z.jetzt() - fix.start, typ: 'fixation' }); ctx.audio.klick(); fix = null; kreuz.style.color = '#2EAD6B'; }
          else ctx.onEvent({ korrekt: false, reiz: 'keiner', reaktion: 'leertaste', typ: 'fixation' });
          return;
        }
        if (aktuell && !aktuell.beantwortet) {
          aktuell.beantwortet = true;
          var ok = s === aktuell.seite;
          ctx.onEvent({ korrekt: ok, reiz: 'licht ' + aktuell.grad + '°', reaktion: s, rtMs: Z.jetzt() - aktuell.start, seite: aktuell.seite });
          if (ok) ctx.audio.richtig(); else ctx.audio.falsch();
        } else if (!fix) {
          ctx.onEvent({ korrekt: false, reiz: 'keiner', reaktion: s, seite: s, typ: 'fehlreaktion' });
          ctx.audio.falsch();
        }
      }
      return {
        start: function () {
          aus.push(HT.eingabe.an(function (a) { if (a === 'links' || a === 'rechts' || a === 'ok') antwort(a); }));
          aus.push(HT.tap(voll, function (ev) { var r = voll.getBoundingClientRect(); var x = ((ev.touches ? ev.touches[0] : ev).clientX - r.left) / r.width; if (Math.abs(x - 0.5) < 0.06) antwort('ok'); else antwort(x < 0.5 ? 'links' : 'rechts'); }));
          timer = Z.nach(800, naechster);
        },
        stop: function () { aus.forEach(function (f) { f(); }); container.style.background = ''; }
      };
    },
    preview: function (el) {
      var b = function (licht, rot) {
        return '<svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg"><rect width="400" height="300" fill="#1b2329"/><path d="M200 135 V165 M185 150 H215" stroke="' + (rot ? '#E25C5C' : '#f2f5f7') + '" stroke-width="6" stroke-linecap="round"/>' + (licht ? '<circle cx="' + licht + '" cy="110" r="16" fill="#F2B630"/>' : '') + '</svg>';
      };
      return HT.beispiel(el, [
        { svg: b(0), text: 'Auf das Kreuz schauen', dauer: 1200 },
        { svg: b(50), text: 'Licht links → Taste ←', dauer: 1500 },
        { svg: b(0), dauer: 700 },
        { svg: b(0, true), text: 'Kreuz rot → Leertaste', dauer: 1500 }
      ]);
    }
  });
})();

/* Hirntraining – Modul-Schnittstelle
 * Registrierung (HT.registerModule), pausierbare Zeitgeber (HT.zeit), einheitliche Eingabe (HT.eingabe),
 * Rückmeldung (HT.feedback), Vorschau-Animationen (HT.beispiel) und das Laden der Modulordner. */
(function () {
  'use strict';
  var HT = window.HT;

  /* =====================================================================
   * Pausierbare Zeit – alle Module nutzen diese Zeitgeber, damit Pause überall funktioniert
   * ===================================================================== */
  var jetztRoh = function () { return window.performance && performance.now ? performance.now() : Date.now(); };
  var Z = HT.zeit = {
    pausiert: false, _pauseStart: 0, _pauseSumme: 0, _timer: {}, _frames: {}, _id: 1,
    jetzt: function () { return (Z.pausiert ? Z._pauseStart : jetztRoh()) - Z._pauseSumme; },
    nach: function (ms, fn) { return Z._neu(ms, fn, 0); },
    intervall: function (ms, fn) { return Z._neu(ms, fn, ms); },
    _neu: function (ms, fn, iv) {
      var id = Z._id++;
      var t = { fn: fn, faellig: Z.jetzt() + ms, handle: null, intervall: iv };
      Z._timer[id] = t;
      if (!Z.pausiert) Z._planen(id, t, ms);
      return id;
    },
    _planen: function (id, t, ms) {
      t.handle = setTimeout(function () {
        if (!Z._timer[id] || Z.pausiert) return;
        if (t.intervall) { t.faellig = Z.jetzt() + t.intervall; Z._planen(id, t, t.intervall); }
        else delete Z._timer[id];
        try { t.fn(); } catch (e) { console.error(e); }
      }, Math.max(0, ms));
    },
    abbrechen: function (id) {
      if (!id) return;
      if (Z._timer[id]) { clearTimeout(Z._timer[id].handle); delete Z._timer[id]; }
      delete Z._frames[id];
    },
    /* Animationsschleife fn(dt Sekunden, jetzt ms) – läuft nicht während der Pause */
    frame: function (fn) {
      var id = Z._id++, letzte = Z.jetzt();
      Z._frames[id] = true;
      var schritt = function () {
        if (!Z._frames[id]) return;
        if (!Z.pausiert) {
          var n = Z.jetzt(), dt = Math.min(0.1, (n - letzte) / 1000);
          letzte = n;
          try { fn(dt, n); } catch (e) { console.error(e); delete Z._frames[id]; return; }
        } else letzte = Z.jetzt();
        requestAnimationFrame(schritt);
      };
      requestAnimationFrame(schritt);
      return id;
    },
    pause: function () {
      if (Z.pausiert) return;
      Z.pausiert = true; Z._pauseStart = jetztRoh();
      Object.keys(Z._timer).forEach(function (id) { clearTimeout(Z._timer[id].handle); });
    },
    weiter: function () {
      if (!Z.pausiert) return;
      Z._pauseSumme += jetztRoh() - Z._pauseStart; Z.pausiert = false;
      var n = Z.jetzt();
      Object.keys(Z._timer).forEach(function (id) { var t = Z._timer[id]; Z._planen(id, t, t.faellig - n); });
    },
    reset: function () {
      Object.keys(Z._timer).forEach(function (id) { clearTimeout(Z._timer[id].handle); });
      Z._timer = {}; Z._frames = {}; Z.pausiert = false; Z._pauseSumme = 0;
    }
  };

  /* =====================================================================
   * Eingabe: Tastatur, Bildschirmtasten und Touch werden auf Aktionen abgebildet
   * Aktionen: ok · links · rechts · hoch · runter · ja · nein · ziffer{wert} · loeschen · buchstabe{wert}
   * ===================================================================== */
  var TASTEN = {
    ' ': 'ok', 'Spacebar': 'ok', 'Enter': 'ok',
    'ArrowLeft': 'links', 'Left': 'links', 'ArrowRight': 'rechts', 'Right': 'rechts',
    'ArrowUp': 'hoch', 'Up': 'hoch', 'ArrowDown': 'runter', 'Down': 'runter', 'Backspace': 'loeschen'
  };
  var E = HT.eingabe = {
    _h: [], aktiv: false,
    an: function (fn) { E._h.push(fn); return function () { E._h = E._h.filter(function (h) { return h !== fn; }); }; },
    ausloesen: function (aktion, detail) {
      if (Z.pausiert) return;
      E._h.slice().forEach(function (h) { try { h(aktion, detail || {}); } catch (e) { console.error(e); } });
    },
    zuruecksetzen: function () { E._h = []; },
    _taste: function (ev) {
      if (!E.aktiv || ev.metaKey || ev.ctrlKey || ev.altKey) return;
      var t = ev.target;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT')) return;
      if (ev.repeat) { if (TASTEN[ev.key]) ev.preventDefault(); return; }
      if (/^[0-9]$/.test(ev.key)) { E.ausloesen('ziffer', { wert: Number(ev.key) }); ev.preventDefault(); return; }
      if (TASTEN[ev.key]) { E.ausloesen(TASTEN[ev.key], { taste: ev.key }); ev.preventDefault(); return; }
      if (/^[a-zA-ZäöüÄÖÜß]$/.test(ev.key)) {
        var b = ev.key.toUpperCase();
        if (b === 'J') E.ausloesen('ja', {});
        if (b === 'N' || b === 'F') E.ausloesen('nein', {});
        E.ausloesen('buchstabe', { wert: b });
      }
    }
  };
  document.addEventListener('keydown', E._taste);

  var LABEL = { ok: 'Reagieren', links: '◀  Links', rechts: 'Rechts  ▶', hoch: '▲  Oben', runter: '▼  Unten', ja: '✓  Ja', nein: '✗  Nein', loeschen: '⌫' };
  /* Großes Tasten-Overlay. tasten: ['ok'] oder [{aktion, label, detail}] */
  E.overlay = function (wurzel, tasten) {
    var alt = wurzel.querySelector('.tasten-overlay');
    if (alt) alt.parentNode.removeChild(alt);
    if (!tasten || !tasten.length) return;
    var leiste = HT.el('div', { class: 'tasten-overlay' });
    tasten.forEach(function (t) {
      if (typeof t === 'string') t = { aktion: t };
      var b = HT.el('button', { class: 'gross-taste taste-' + t.aktion, type: 'button' }, t.label || LABEL[t.aktion] || t.aktion);
      HT.tap(b, function () {
        b.classList.add('gedrueckt'); setTimeout(function () { b.classList.remove('gedrueckt'); }, 140);
        E.ausloesen(t.aktion, t.detail || {});
      });
      leiste.appendChild(b);
    });
    wurzel.appendChild(leiste);
  };

  /* =====================================================================
   * Einheitliche Rückmeldung: grüner Haken / rotes Kreuz + Ton
   * ===================================================================== */
  HT.rueckmeldungVisuell = true;
  HT.feedback = function (container, richtig, x, y, opt) {
    opt = opt || {};
    if (!HT.rueckmeldungVisuell) { if (!opt.stumm) { if (richtig) HT.audio.richtig(); else HT.audio.falsch(); } return; }
    if (!opt.stumm) { if (richtig) HT.audio.richtig(); else HT.audio.falsch(); }
    if (!container) return;
    if (x === undefined || x === null) {
      var f = HT.el('div', { class: 'feedback-flaeche ' + (richtig ? 'ok' : 'nok') }, HT.el('div', { class: 'feedback-symbol', html: richtig ? HT.icons.haken : HT.icons.kreuz }));
      container.appendChild(f);
      setTimeout(function () { if (f.parentNode) f.parentNode.removeChild(f); }, opt.dauer || 520);
    } else {
      var m = HT.el('div', { class: 'marke ' + (richtig ? 'ok' : 'nok'), style: { left: x + 'px', top: y + 'px' }, html: richtig ? HT.icons.haken : HT.icons.kreuz });
      container.appendChild(m);
      setTimeout(function () { if (m.parentNode) m.parentNode.removeChild(m); }, opt.dauer || 650);
    }
  };

  /* =====================================================================
   * Kategorien und Register
   * ===================================================================== */
  var KAT = HT.KATEGORIEN = [
    { id: 'aufmerksamkeit', name: 'Aufmerksamkeit', farbe: '#1BA8B5', icon: 'auge' },
    { id: 'gedaechtnis', name: 'Gedächtnis', farbe: '#7B61D9', icon: 'gehirn' },
    { id: 'wahrnehmung', name: 'Wahrnehmung & Neglect', farbe: '#E8833A', icon: 'lupe' },
    { id: 'raeumlich', name: 'Räumliches Denken', farbe: '#2EAD6B', icon: 'wuerfel' },
    { id: 'exekutiv', name: 'Exekutivfunktionen', farbe: '#D14D86', icon: 'puzzle' },
    { id: 'sprache', name: 'Rechnen & Sprache', farbe: '#3D7BE0', icon: 'buch' },
    { id: 'visuomotorik', name: 'Visuomotorik', farbe: '#C59A16', icon: 'hand' }
  ];
  HT.kategorie = function (k) {
    for (var i = 0; i < KAT.length; i++) if (KAT[i].id === k || KAT[i].name === k) return KAT[i];
    return KAT[0];
  };

  var M = HT.Module = { liste: [], map: {} };

  HT.registerModule = function (def) {
    var fehlt = ['id', 'name', 'kategorie', 'anleitung', 'levels', 'create'].filter(function (k) { return !def[k]; });
    if (fehlt.length) { console.error('Modul unvollständig:', def.id, fehlt.join(', ')); return; }
    if (M.map[def.id]) { console.warn('Modul doppelt registriert:', def.id); return; }
    if (def.levels.length < 10 || def.levels.length > 20) console.warn('Modul ' + def.id + ': ' + def.levels.length + ' Level (empfohlen 10–20)');
    def.kategorie = HT.kategorie(def.kategorie).id;
    def.ziel = def.ziel || '';
    def.beschreibung = def.beschreibung || def.ziel;
    def.eingabe = def.eingabe || ['tastatur', 'maus', 'touch'];
    def.parameterSchema = HT.zusammen({
      dauerDurchgangSek: { typ: 'zahl', label: 'Dauer eines Durchgangs (Sek.)', min: 30, max: 300, schritt: 15, standard: 90 }
    }, def.parameterSchema || {});
    def.bewertung = HT.zusammen({ aufstufenAb: 0.85, abstufenUnter: 0.6 }, def.bewertung || {});
    def.tasten = def.tasten || [];
    def.levelLabels = def.levelLabels || {};
    M.liste.push(def);
    M.map[def.id] = def;
  };

  /* Erzeugt eine laufende Instanz; Pause/Stopp greifen immer auch auf Zeitgeber und Eingabe */
  M.instanz = function (def, container, ctx) {
    var inst = def.create(container, ctx) || {};
    return {
      start: function () { E.aktiv = true; if (inst.start) inst.start(); },
      pause: function () { Z.pause(); if (inst.pause) inst.pause(); },
      resume: function () { Z.weiter(); if (inst.resume) inst.resume(); },
      stop: function () {
        try { if (inst.stop) inst.stop(); } catch (e) { console.error(e); }
        Z.reset(); E.zuruecksetzen(); E.aktiv = false; HT.audio.stumm();
        HT.leeren(container);
      }
    };
  };

  /* Parameter eines Levels inkl. Modulparametern (Standard + Überschreibungen) */
  M.parameter = function (def, level, overrides) {
    var lv = def.levels[HT.klemmen(level, 1, def.levels.length) - 1];
    var p = {};
    Object.keys(def.parameterSchema).forEach(function (k) { p[k] = def.parameterSchema[k].standard; });
    var std = ((HT.storage && HT.storage.einstellungen().standardParameter) || {})[def.id] || {};
    return HT.zusammen(p, std, lv, overrides || {});
  };

  M.laden = function () {
    var ids = HT.MODUL_LISTE || [];
    return Promise.all(ids.map(function (id) { return HT.skriptLaden('modules/' + id + '/module.js'); })).then(function () {
      var reihe = KAT.map(function (k) { return k.id; });
      var pos = function (m) { var i = ids.indexOf(m.id); return i < 0 ? 999 : i; };
      M.liste.sort(function (a, b) { return reihe.indexOf(a.kategorie) - reihe.indexOf(b.kategorie) || pos(a) - pos(b); });
    });
  };

  M.aktive = function () {
    var aus = HT.storage.einstellungen().moduleInaktiv || {};
    return M.liste.filter(function (m) { return !aus[m.id]; });
  };

  /* =====================================================================
   * Vorschau-Animation aus Einzelbildern mit animiertem Zeiger
   * schritte: [{ svg, zeiger:[x%,y%]|null, klick:bool, text, dauer }]
   * ===================================================================== */
  HT.beispiel = function (wurzel, schritte) {
    HT.leeren(wurzel);
    var buehne = HT.el('div', { class: 'bsp-buehne' });
    var bild = HT.el('div', { class: 'bsp-bild' });
    var zeiger = HT.el('div', { class: 'bsp-zeiger', html: HT.icons.zeiger });
    var ring = HT.el('div', { class: 'bsp-ring' });
    var text = HT.el('div', { class: 'bsp-text' });
    buehne.appendChild(bild); buehne.appendChild(ring); buehne.appendChild(zeiger); buehne.appendChild(text);
    wurzel.appendChild(buehne);
    var i = 0, timer = null, aktiv = true, t2 = null;
    function zeigen() {
      if (!aktiv) return;
      var s = schritte[i];
      if (s.svg !== undefined) bild.innerHTML = typeof s.svg === 'function' ? s.svg() : s.svg;
      text.textContent = s.text || '';
      text.style.opacity = s.text ? '1' : '0';
      if (s.zeiger) {
        zeiger.style.opacity = '1';
        zeiger.style.left = s.zeiger[0] + '%';
        zeiger.style.top = s.zeiger[1] + '%';
        if (s.klick) {
          t2 = setTimeout(function () {
            if (!aktiv) return;
            ring.style.left = s.zeiger[0] + '%'; ring.style.top = s.zeiger[1] + '%';
            ring.classList.remove('an'); void ring.offsetWidth; ring.classList.add('an');
          }, 600);
        }
      } else zeiger.style.opacity = '0';
      timer = setTimeout(function () { i = (i + 1) % schritte.length; zeigen(); }, s.dauer || 1500);
    }
    zeigen();
    return function () { aktiv = false; clearTimeout(timer); clearTimeout(t2); };
  };
})();

/* Tastaturbedienung für anklickbare Elemente (Raster, Auswahlknöpfe):
 * Pfeiltasten bewegen den Fokusrahmen, Leertaste/Enter wählt, Ziffern 1–9 wählen direkt.
 * HT.tastenFokus(elemente, { spalten, beiWahl(index, el), ziffern: true }) → { setzen(i), entfernen() } */
(function () {
  'use strict';
  var HT = window.HT;
  HT.tastenFokus = function (elemente, opt) {
    opt = opt || {};
    var sp = opt.spalten || elemente.length, idx = -1;
    function setzen(i) {
      if (idx >= 0 && elemente[idx]) elemente[idx].classList.remove('fokus');
      idx = i;
      if (idx >= 0 && elemente[idx]) elemente[idx].classList.add('fokus');
    }
    var aus = HT.eingabe.an(function (a, d) {
      if (!elemente.length) return;
      var neu = idx < 0 ? 0 : idx;
      if (a === 'links') neu = idx < 0 ? 0 : Math.max(0, idx - 1);
      else if (a === 'rechts') neu = idx < 0 ? 0 : Math.min(elemente.length - 1, idx + 1);
      else if (a === 'hoch') neu = idx < 0 ? 0 : (idx - sp >= 0 ? idx - sp : idx);
      else if (a === 'runter') neu = idx < 0 ? 0 : (idx + sp < elemente.length ? idx + sp : idx);
      else if (a === 'ok') { if (idx >= 0 && opt.beiWahl) opt.beiWahl(idx, elemente[idx]); return; }
      else if (a === 'ziffer' && opt.ziffern !== false && d.wert >= 1 && d.wert <= elemente.length && elemente.length <= 9) { setzen(d.wert - 1); if (opt.beiWahl) opt.beiWahl(d.wert - 1, elemente[d.wert - 1]); return; }
      else return;
      setzen(neu);
    });
    return { setzen: setzen, entfernen: function () { aus(); setzen(-1); }, index: function () { return idx; } };
  };

  /* Hilfen für Module */
  HT.m = {
    /* Element mit Klasse(n) und Inhalt in den Container hängen */
    neu: function (eltern, klasse, html, stil) {
      var e = HT.el('div', { class: klasse || '', html: html || '' });
      if (stil) Object.keys(stil).forEach(function (k) { e.style[k] = stil[k]; });
      eltern.appendChild(e);
      return e;
    },
    /* Antwortknöpfe; liefert Array der Knöpfe. optionen: [{ html, wert }] */
    wahl: function (eltern, optionen, beiWahl, klasse) {
      var reihe = HT.el('div', { class: 'm-wahl ' + (klasse || '') });
      var knoepfe = optionen.map(function (o, i) {
        var b = HT.el('button', { class: 'm-wahl-knopf', type: 'button', html: o.html });
        HT.tap(b, function () { beiWahl(o.wert, b, i); });
        reihe.appendChild(b);
        return b;
      });
      eltern.appendChild(reihe);
      var tf = HT.tastenFokus(knoepfe, { beiWahl: function (i, b) { beiWahl(optionen[i].wert, b, i); } });
      reihe.tastenFokus = tf;
      return knoepfe;
    }
  };
})();

/* Gemeinsamer Ablauf für Auswahlaufgaben (Frage + Antwortknöpfe).
 * HT.quiz(container, ctx, {
 *   aufgabe: function() → { frage, inhalt, optionen:[{html, wert, taste}], richtig, zeitMs, klasse, reiz, seite, beimZeigen(el) },
 *   pauseMs, vorher: function(weiter) (optionale Lernphase vor jeder Aufgabe) })
 * Ziffern 1–9 / Pfeiltasten + Leertaste / J und N (wenn Option 'taste' hat) wählen. */
(function () {
  'use strict';
  var HT = window.HT;
  HT.quiz = function (container, ctx, opt) {
    var Z = HT.zeit;
    var zone = HT.m.neu(container, 'm-zentrum');
    var frageEl = HT.m.neu(zone, 'm-anweisung');
    var inhaltEl = HT.m.neu(zone, 'm-quiz-inhalt');
    var wahlEl = HT.m.neu(zone, 'm-quiz-wahl');
    var a = null, start = 0, aktiv = false, timer = null, knoepfe = [], tasteAus = null;
    function zeigen() {
      fehlversuch = false;
      a = opt.aufgabe();
      frageEl.innerHTML = a.frage || '';
      inhaltEl.innerHTML = a.inhalt || '';
      inhaltEl.style.display = a.inhalt ? '' : 'none';
      HT.leeren(wahlEl);
      knoepfe = HT.m.wahl(wahlEl, a.optionen, waehlen, a.klasse);
      if (a.beimZeigen) a.beimZeigen(inhaltEl, knoepfe);
      start = Z.jetzt(); aktiv = true;
      if (a.zeitMs) timer = Z.nach(a.zeitMs, function () {
        if (!aktiv) return; aktiv = false;
        ctx.onEvent({ korrekt: false, auslassung: true, reiz: a.reiz, reaktion: 'keine', seite: a.seite });
        markieren(null);
        ctx.feedback(false);
        Z.nach(opt.pauseMs || 1100, weiter);
      });
    }
    function markieren(gewaehlt) {
      a.optionen.forEach(function (o, i) {
        if (String(o.wert) === String(a.richtig)) knoepfe[i].classList.add('richtig');
        else if (gewaehlt !== null && i === gewaehlt) knoepfe[i].classList.add('falsch');
      });
    }
    var fehlversuch = false;
    function waehlen(wert, knopf, i) {
      if (!aktiv) return;
      var ok = String(wert) === String(a.richtig);
      /* Fehlerfreies Lernen: bei falscher Wahl Hinweis zeigen und erneut wählen lassen */
      if (!ok && ctx.patientSettings && ctx.patientSettings.fehlerfrei && !fehlversuch) {
        fehlversuch = true;
        knopf.classList.add('falsch'); knopf.disabled = true; knopf.style.opacity = '.45';
        ctx.onEvent({ korrekt: false, reiz: a.reiz, reaktion: String(wert), rtMs: Z.jetzt() - start, seite: a.seite, typ: 'erster versuch falsch' });
        var hb = HT.el('div', { class: 'hinweis-blase' }, 'Noch nicht ganz – schauen Sie noch einmal genau hin.');
        container.appendChild(hb); setTimeout(function () { if (hb.parentNode) hb.parentNode.removeChild(hb); }, 2200);
        return;
      }
      aktiv = false; Z.abbrechen(timer);
      if (fehlversuch) {
        markieren(ok ? null : i);
        ctx.onEvent({ korrekt: ok, zaehlt: false, reiz: a.reiz, reaktion: String(wert), typ: 'korrektur' });
        if (ok) HT.audio.richtig();
        fehlversuch = false;
        Z.nach(1100, weiter);
        return;
      }
      markieren(i);
      ctx.onEvent({ korrekt: ok, reiz: a.reiz, reaktion: String(wert), rtMs: Z.jetzt() - start, seite: a.seite, typ: a.typ });
      ctx.feedback(ok, null, null, { dauer: 420 });
      Z.nach(ok ? (opt.pauseMs || 800) : (opt.pauseMs || 800) + 700, weiter);
    }
    function weiter() {
      if (opt.vorher) opt.vorher(zeigen, { frage: frageEl, inhalt: inhaltEl, wahl: wahlEl });
      else zeigen();
    }
    return {
      start: function () {
        tasteAus = HT.eingabe.an(function (akt) {
          if (!aktiv || !a) return;
          for (var i = 0; i < a.optionen.length; i++) if (a.optionen[i].taste === akt) { waehlen(a.optionen[i].wert, knoepfe[i], i); return; }
        });
        Z.nach(400, weiter);
      },
      stop: function () { if (tasteAus) tasteAus(); },
      felder: { frage: frageEl, inhalt: inhaltEl, wahl: wahlEl, zone: zone }
    };
  };
})();

/* Zeigerposition fortlaufend verfolgen (Maus, Touch, Stift) relativ zu einem Element.
 * HT.zeigerFolgen(el, { bewegt(x, y, gedrueckt), runter(x, y), hoch() }) → Funktion zum Entfernen
 * Zusätzlich: HT.pfeilTasten() liefert ein Objekt mit gerade gehaltenen Pfeiltasten (für fließende Bewegung). */
(function () {
  'use strict';
  var HT = window.HT;
  HT.zeigerFolgen = function (el, cb) {
    var gedrueckt = false;
    function pos(ev) { var r = el.getBoundingClientRect(), q = ev.touches ? ev.touches[0] : ev; return q ? [q.clientX - r.left, q.clientY - r.top] : null; }
    function runter(ev) { var p = pos(ev); if (!p) return; gedrueckt = true; if (ev.cancelable && ev.type === 'touchstart') ev.preventDefault(); if (cb.runter) cb.runter(p[0], p[1]); if (cb.bewegt) cb.bewegt(p[0], p[1], true); }
    function bewegt(ev) { var p = pos(ev); if (!p) return; if (ev.cancelable && ev.type === 'touchmove') ev.preventDefault(); if (cb.bewegt) cb.bewegt(p[0], p[1], gedrueckt); }
    function hoch() { if (gedrueckt && cb.hoch) cb.hoch(); gedrueckt = false; }
    var ev = HT.hatPointer ? { d: 'pointerdown', m: 'pointermove', u: 'pointerup' } : null;
    if (ev) { el.addEventListener(ev.d, runter); el.addEventListener(ev.m, bewegt); window.addEventListener(ev.u, hoch); el.addEventListener('pointercancel', hoch); }
    else { el.addEventListener('mousedown', runter); el.addEventListener('mousemove', bewegt); window.addEventListener('mouseup', hoch); el.addEventListener('touchstart', runter, { passive: false }); el.addEventListener('touchmove', bewegt, { passive: false }); window.addEventListener('touchend', hoch); }
    el.style.touchAction = 'none';
    return function () {
      if (ev) { el.removeEventListener(ev.d, runter); el.removeEventListener(ev.m, bewegt); window.removeEventListener(ev.u, hoch); el.removeEventListener('pointercancel', hoch); }
      else { el.removeEventListener('mousedown', runter); el.removeEventListener('mousemove', bewegt); window.removeEventListener('mouseup', hoch); el.removeEventListener('touchstart', runter); el.removeEventListener('touchmove', bewegt); window.removeEventListener('touchend', hoch); }
    };
  };
  HT.pfeilTasten = function () {
    var z = { links: false, rechts: false, hoch: false, runter: false };
    var map = { ArrowLeft: 'links', Left: 'links', ArrowRight: 'rechts', Right: 'rechts', ArrowUp: 'hoch', Up: 'hoch', ArrowDown: 'runter', Down: 'runter' };
    function an(e) { if (map[e.key]) { z[map[e.key]] = true; e.preventDefault(); } }
    function aus(e) { if (map[e.key]) z[map[e.key]] = false; }
    document.addEventListener('keydown', an); document.addEventListener('keyup', aus);
    z.entfernen = function () { document.removeEventListener('keydown', an); document.removeEventListener('keyup', aus); };
    z.aktiv = function () { return z.links || z.rechts || z.hoch || z.runter; };
    return z;
  };
  /* Canvas in HiDPI-Auflösung über die ganze Fläche */
  HT.canvasVoll = function (container) {
    var c = HT.el('canvas', { class: 'm-canvas' });
    container.appendChild(c);
    var dpr = window.devicePixelRatio || 1, b = container.clientWidth, h = container.clientHeight;
    c.width = b * dpr; c.height = h * dpr;
    var ctx = c.getContext('2d'); ctx.scale(dpr, dpr);
    return { c: c, ctx: ctx, b: b, h: h };
  };
})();

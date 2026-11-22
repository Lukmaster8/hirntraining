/* Hirntraining – Töne per Web Audio API (keine Audiodateien) und optionale Sprachausgabe. */
(function () {
  'use strict';
  var HT = window.HT;
  var ctx = null;

  function audio() {
    if (!ctx) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      try { ctx = new AC(); } catch (e) { return null; }
    }
    if (ctx.state === 'suspended' && ctx.resume) ctx.resume();
    return ctx;
  }
  // Audio muss in Safari durch eine Nutzeraktion freigeschaltet werden
  ['mousedown', 'touchstart', 'keydown'].forEach(function (ev) {
    document.addEventListener(ev, function f() { audio(); document.removeEventListener(ev, f, true); }, true);
  });

  var A = HT.audio = {
    an: true,
    lautstaerke: 0.7,
    sprache: true,
    /* Web-Audio-Kontext für Module mit eigenen Geräuschen (z. B. Motor und Regen im Straßenverkehr) */
    kontext: function () { return A.an ? audio() : null; },

    /* Grundton. pan: -1 (links) … 1 (rechts) */
    ton: function (freq, dauer, typ, verzoegerung, lautst, pan) {
      if (!A.an) return;
      var a = audio(); if (!a) return;
      var t0 = a.currentTime + (verzoegerung || 0) + 0.005;
      var o = a.createOscillator(), g = a.createGain();
      o.type = typ || 'sine';
      o.frequency.setValueAtTime(freq, t0);
      var v = Math.max(0.0002, A.lautstaerke * (lautst === undefined ? 0.3 : lautst));
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(v, t0 + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dauer);
      o.connect(g);
      var ziel = g;
      if (pan) {
        // PannerNode statt StereoPanner (Safari 13 kennt keinen StereoPanner)
        var p = a.createPanner();
        p.panningModel = 'equalpower';
        p.setPosition(pan, 0, 1 - Math.abs(pan));
        g.connect(p); ziel = p;
      }
      ziel.connect(a.destination);
      o.start(t0); o.stop(t0 + dauer + 0.03);
    },

    rueckmeldungTon: true,
    richtig: function () { if (!A.rueckmeldungTon) return; A.ton(660, 0.11, 'sine'); A.ton(990, 0.16, 'sine', 0.07); },
    falsch: function () { if (!A.rueckmeldungTon || A.ohneFehlerton) return; A.ton(210, 0.2, 'triangle', 0, 0.35); },
    klick: function () { A.ton(1300, 0.035, 'square', 0, 0.05); },
    signal: function (freq, pan) { A.ton(freq || 880, 0.16, 'sine', 0, 0.42, pan); },
    hoch: function (pan) { A.ton(1175, 0.2, 'sine', 0, 0.42, pan); },
    tief: function (pan) { A.ton(392, 0.2, 'sine', 0, 0.42, pan); },
    warnung: function () { A.ton(740, 0.09, 'sine', 0, 0.3); },
    start: function () { [523, 659, 784].forEach(function (f, i) { A.ton(f, 0.15, 'sine', i * 0.09, 0.28); }); },
    ende: function () { [784, 988, 1175, 1568].forEach(function (f, i) { A.ton(f, 0.18, 'sine', i * 0.1, 0.26); }); },
    levelAuf: function () { [659, 880, 1175].forEach(function (f, i) { A.ton(f, 0.12, 'sine', i * 0.07, 0.24); }); },
    levelAb: function () { [523, 440].forEach(function (f, i) { A.ton(f, 0.14, 'sine', i * 0.09, 0.2); }); },

    /* Vorlesen: bevorzugt die mit ElevenLabs erzeugten Aufnahmen (data/sprachaudio.js, Ordner audio/),
     * die Systemstimme nur, wenn das in den Einstellungen ausdrücklich erlaubt ist.
     * opt.nurAufnahme: ohne Aufnahme still bleiben (z. B. für Lob). */
    ersatzStimme: false,
    _aktuell: null,
    aufnahmeVorhanden: function (text) { return !!(window.HT && HT.SPRACHAUDIO && HT.SPRACHAUDIO[String(text || '').trim()]); },
    sprechen: function (text, opt) {
      opt = opt || {};
      if (!A.an || !A.sprache) return false;
      var schluessel = String(text || '').trim();
      var datei = window.HT && HT.SPRACHAUDIO && HT.SPRACHAUDIO[schluessel];
      if (datei) {
        try {
          A.stumm();
          var el = new Audio(datei);
          el.volume = Math.max(0, Math.min(1, A.lautstaerke));
          A._aktuell = el;
          var mit = A.mitlesen(schluessel, opt.element, HT.SPRACHZEITEN && HT.SPRACHZEITEN[datei]);
          mit.audio(el);
          el.addEventListener('ended', function () { mit.ende(); if (A._aktuell === el) A._aktuell = null; if (opt.danach) opt.danach(); });
          var pr = el.play();
          if (pr && pr.catch) pr.catch(function () { mit.ende(); /* Wiedergabe ohne Nutzeraktion blockiert */ });
          return true;
        } catch (e) { /* weiter mit Ersatz */ }
      }
      if (opt.nurAufnahme || !A.ersatzStimme) return false;
      if (!window.speechSynthesis || !window.SpeechSynthesisUtterance) return false;
      try {
        A.stumm();
        var u = new SpeechSynthesisUtterance(text);
        u.lang = 'de-DE'; u.rate = 0.9; u.volume = A.lautstaerke;
        var stimmen = speechSynthesis.getVoices().filter(function (v) { return /^de/i.test(v.lang) && v.localService !== false; });
        if (stimmen.length) u.voice = stimmen[0];
        var m2 = A.mitlesen(schluessel, opt.element, null);
        u.onboundary = function (ev) { if (ev.name === 'word' || ev.name === undefined) m2.zeichen(ev.charIndex); };
        u.onend = function () { m2.ende(); if (opt.danach) opt.danach(); };
        speechSynthesis.speak(u);
        return true;
      } catch (e) { return false; }
    },

    /* Mitlesen: das gerade gesprochene Wort im angezeigten Text blau hervorheben.
     * Gesucht wird ein sichtbares Element ohne Unterelemente, dessen Text genau dem gesprochenen Text entspricht
     * (oder das übergebene Element). Die Wörter werden für die Dauer des Vorlesens in <span> gesetzt. */
    _mitlesenEnde: null,
    mitlesen: function (text, element, zeiten) {
      if (A._mitlesenEnde) A._mitlesenEnde();
      var norm = function (t) { return String(t || '').replace(/\s+/g, ' ').trim(); };
      var ziel = norm(text), woerter = ziel ? ziel.split(' ') : [];
      var knoten = null, spans = [], original = null, audioEl = null, raf = 0, aktiv = -1, beendet = false, versuche = 0;
      function finden() {
        if (element) return element;
        var alle = document.querySelectorAll('h1,h2,h3,p,div,span,label,li,td');
        for (var i = alle.length - 1; i >= 0; i--) {
          var e = alle[i];
          if (e.children.length || e.offsetParent === null) continue;
          if (norm(e.textContent) === ziel) return e;
        }
        return null;
      }
      function aufbauen() {
        if (knoten || beendet || woerter.length < 2) return;
        var e = finden();
        if (!e || e.children.length) return;
        knoten = e; original = e.textContent;
        e.textContent = '';
        e.classList.add('vorlese-text');
        woerter.forEach(function (w, i) {
          var s = document.createElement('span');
          s.className = 'vorlese-wort'; s.textContent = w;
          e.appendChild(s); spans.push(s);
          if (i < woerter.length - 1) e.appendChild(document.createTextNode(' '));
        });
      }
      function setze(i) {
        if (i === aktiv) return;
        if (spans[aktiv]) spans[aktiv].classList.remove('aktiv');
        aktiv = i;
        if (spans[i]) { spans[i].classList.add('aktiv'); spans[i].classList.add('gelesen'); }
        for (var k = 0; k < i && k < spans.length; k++) spans[k].classList.add('gelesen');
      }
      function schritt() {
        if (beendet || !audioEl) return;
        if (!knoten && versuche++ < 30) aufbauen();
        if (knoten && document.body.contains(knoten)) {
          var t = audioEl.currentTime, i = 0;
          if (zeiten && zeiten.length === spans.length) {
            while (i + 1 < zeiten.length && zeiten[i + 1] <= t + 0.04) i++;
          } else if (audioEl.duration) {
            i = Math.min(spans.length - 1, Math.floor(t / audioEl.duration * spans.length));
          }
          if (t > 0) setze(i);
        }
        raf = requestAnimationFrame(schritt);
      }
      function ende() {
        if (beendet) return;
        beendet = true;
        cancelAnimationFrame(raf);
        if (knoten && original !== null) { knoten.textContent = original; knoten.classList.remove('vorlese-text'); }
        if (A._mitlesenEnde === ende) A._mitlesenEnde = null;
      }
      A._mitlesenEnde = ende;
      aufbauen();
      return {
        audio: function (el) { audioEl = el; el.addEventListener('playing', function () { cancelAnimationFrame(raf); schritt(); }); },
        zeichen: function (idx) {
          aufbauen();
          var pos = 0;
          for (var i = 0; i < woerter.length; i++) { if (idx < pos + woerter[i].length + 1) { setze(i); return; } pos += woerter[i].length + 1; }
        },
        ende: ende
      };
    },
    stumm: function () {
      try { if (A._aktuell) { A._aktuell.pause(); A._aktuell = null; } } catch (e) { /* egal */ }
      try { if (window.speechSynthesis) speechSynthesis.cancel(); } catch (e) { /* egal */ }
      if (A._mitlesenEnde) A._mitlesenEnde();
    }
  };
})();

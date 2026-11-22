/* Hirntraining – Grundfunktionen (Namensraum HT)
 * ES2017, kompatibel mit Safari 13 und Chrome 116. Keine externen Bibliotheken. */
(function () {
  'use strict';
  var HT = window.HT = window.HT || {};

  /* ---------- DOM ---------- */
  HT.$ = function (sel, root) { return (root || document).querySelector(sel); };
  HT.$$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  HT.el = function (tag, attrs, kinder) {
    var e = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        var v = attrs[k];
        if (v === null || v === undefined || v === false) return;
        if (k === 'class') e.className = v;
        else if (k === 'html') e.innerHTML = v;
        else if (k === 'text') e.textContent = v;
        else if (k === 'style' && typeof v === 'object') Object.keys(v).forEach(function (s) { e.style[s] = v[s]; });
        else if (k.indexOf('on') === 0 && typeof v === 'function') e.addEventListener(k.slice(2), v);
        else e.setAttribute(k, v === true ? '' : v);
      });
    }
    if (kinder !== undefined && kinder !== null) {
      (Array.isArray(kinder) ? kinder : [kinder]).forEach(function (k) {
        if (k === null || k === undefined || k === false) return;
        e.appendChild(typeof k === 'string' || typeof k === 'number' ? document.createTextNode(String(k)) : k);
      });
    }
    return e;
  };

  HT.leeren = function (e) { while (e && e.firstChild) e.removeChild(e.firstChild); return e; };

  HT.esc = function (s) {
    return String(s === undefined || s === null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  };

  /* Schnelle Antwort auf Maus, Touch und Stift. Liefert eine Funktion zum Entfernen. */
  HT.hatPointer = typeof window.PointerEvent === 'function';
  HT.tap = function (el, fn) {
    var handler = function (ev) {
      if (ev.type === 'pointerdown' && ev.button !== undefined && ev.button > 0) return;
      if (ev.cancelable && ev.type !== 'pointerdown') ev.preventDefault();
      fn(ev);
    };
    if (HT.hatPointer) {
      el.addEventListener('pointerdown', handler);
      return function () { el.removeEventListener('pointerdown', handler); };
    }
    el.addEventListener('mousedown', handler);
    el.addEventListener('touchstart', handler, { passive: false });
    return function () { el.removeEventListener('mousedown', handler); el.removeEventListener('touchstart', handler); };
  };

  /* Relative Position eines Zeigerereignisses innerhalb eines Elements (0..1) */
  HT.relPos = function (ev, el) {
    var r = el.getBoundingClientRect();
    var p = ev.touches && ev.touches[0] ? ev.touches[0] : ev;
    return { x: (p.clientX - r.left) / r.width, y: (p.clientY - r.top) / r.height, px: p.clientX - r.left, py: p.clientY - r.top };
  };

  /* Seite eines Reizes aus der x-Position (0..1) */
  HT.seiteVon = function (x) { return x < 0.42 ? 'links' : (x > 0.58 ? 'rechts' : 'mitte'); };

  /* ---------- Zufall ---------- */
  var Z = HT.zufall = {
    zahl: function (a, b) { return a + Math.random() * (b - a); },
    int: function (a, b) { return Math.floor(a + Math.random() * (b - a + 1)); },
    wahl: function (arr) { return arr[Math.floor(Math.random() * arr.length)]; },
    mischen: function (arr) {
      var a = arr.slice();
      for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
      return a;
    },
    stichprobe: function (arr, n) { return Z.mischen(arr).slice(0, Math.min(n, arr.length)); },
    chance: function (p) { return Math.random() < p; },
    ausser: function (arr, aus) { return arr.filter(function (x) { return aus.indexOf(x) < 0; }); }
  };

  /* ---------- Zahlen & Level ---------- */
  HT.lerp = function (a, b, t) { return a + (b - a) * t; };
  HT.lerpInt = function (a, b, t) { return Math.round(a + (b - a) * t); };
  HT.klemmen = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  /* Erzeugt n Level-Parametersätze. fn(t, i) mit t = 0..1 */
  HT.stufen = function (n, fn) {
    var out = [];
    for (var i = 0; i < n; i++) out.push(fn(n === 1 ? 0 : i / (n - 1), i + 1));
    return out;
  };

  HT.summe = function (a) { return a.reduce(function (s, x) { return s + x; }, 0); };
  HT.mittel = function (a) { return a.length ? HT.summe(a) / a.length : null; };
  HT.median = function (a) {
    if (!a.length) return null;
    var s = a.slice().sort(function (x, y) { return x - y; });
    var m = Math.floor(s.length / 2);
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
  };
  HT.streuung = function (a) {
    if (a.length < 2) return null;
    var m = HT.mittel(a);
    return Math.sqrt(HT.summe(a.map(function (x) { return (x - m) * (x - m); })) / (a.length - 1));
  };

  /* ---------- Formatierung ---------- */
  HT.pad = function (n, l) { n = String(n); while (n.length < (l || 2)) n = '0' + n; return n; };
  HT.datum = function (ts) { var d = new Date(ts); return HT.pad(d.getDate()) + '.' + HT.pad(d.getMonth() + 1) + '.' + d.getFullYear(); };
  HT.datumZeit = function (ts) { var d = new Date(ts); return HT.datum(ts) + ', ' + HT.pad(d.getHours()) + ':' + HT.pad(d.getMinutes()); };
  HT.isoDatum = function (ts) { var d = new Date(ts); return d.getFullYear() + '-' + HT.pad(d.getMonth() + 1) + '-' + HT.pad(d.getDate()); };
  HT.dauer = function (sek) { sek = Math.round(sek || 0); var m = Math.floor(sek / 60), s = sek % 60; return m + ':' + HT.pad(s); };
  HT.prozent = function (v) { return v === null || v === undefined || isNaN(v) ? '–' : Math.round(v * 100) + ' %'; };
  HT.ms = function (v) { return v === null || v === undefined || isNaN(v) ? '–' : Math.round(v) + ' ms'; };
  HT.zahl = function (v, st) { return v === null || v === undefined || isNaN(v) ? '–' : Number(v).toFixed(st || 0).replace('.', ','); };

  HT.uid = function (praefix) {
    return (praefix || 'id') + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
  };

  HT.kopie = function (o) { return o === undefined ? undefined : JSON.parse(JSON.stringify(o)); };
  HT.zusammen = function () { // Ersatz für Objekt-Spread
    var args = Array.prototype.slice.call(arguments);
    return Object.assign.apply(Object, [{}].concat(args));
  };

  HT.entprellen = function (fn, ms) {
    var t = null;
    var f = function () { var a = arguments, self = this; clearTimeout(t); t = setTimeout(function () { fn.apply(self, a); }, ms); };
    f.sofort = function () { clearTimeout(t); fn(); };
    return f;
  };

  HT.warte = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };

  /* ---------- SHA-256 (für PIN-Hashes; unabhängig von crypto.subtle) ---------- */
  HT.sha256 = function (ascii) {
    function rr(v, a) { return (v >>> a) | (v << (32 - a)); }
    var str = unescape(encodeURIComponent(ascii));
    var maxWord = Math.pow(2, 32), result = '', words = [], bitLen = str.length * 8;
    var hash = [], k = [], primeCounter = 0, isComposite = {};
    for (var cand = 2; primeCounter < 64; cand++) {
      if (!isComposite[cand]) {
        for (var i = 0; i < 313; i += cand) isComposite[i] = cand;
        hash[primeCounter] = (Math.pow(cand, 0.5) * maxWord) | 0;
        k[primeCounter++] = (Math.pow(cand, 1 / 3) * maxWord) | 0;
      }
    }
    hash = hash.slice(0, 8);
    str += '\x80';
    while (str.length % 64 - 56) str += '\x00';
    for (i = 0; i < str.length; i++) {
      var j = str.charCodeAt(i);
      words[i >> 2] |= j << ((3 - i) % 4) * 8;
    }
    words[words.length] = ((bitLen / maxWord) | 0);
    words[words.length] = (bitLen);
    for (j = 0; j < words.length;) {
      var w = words.slice(j, j += 16), oldHash = hash;
      hash = hash.slice(0, 8);
      for (i = 0; i < 64; i++) {
        var w15 = w[i - 15], w2 = w[i - 2], a = hash[0], e = hash[4];
        var t1 = hash[7] + (rr(e, 6) ^ rr(e, 11) ^ rr(e, 25)) + ((e & hash[5]) ^ ((~e) & hash[6])) + k[i] +
          (w[i] = (i < 16) ? w[i] : (w[i - 16] + (rr(w15, 7) ^ rr(w15, 18) ^ (w15 >>> 3)) + w[i - 7] + (rr(w2, 17) ^ rr(w2, 19) ^ (w2 >>> 10))) | 0);
        var t2 = (rr(a, 2) ^ rr(a, 13) ^ rr(a, 22)) + ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));
        hash = [(t1 + t2) | 0].concat(hash);
        hash[4] = (hash[4] + t1) | 0;
      }
      for (i = 0; i < 8; i++) hash[i] = (hash[i] + oldHash[i]) | 0;
    }
    for (i = 0; i < 8; i++) for (j = 3; j + 1; j--) { var b = (hash[i] >> (j * 8)) & 255; result += ((b < 16) ? 0 : '') + b.toString(16); }
    return result;
  };
  HT.pinHash = function (pin, salz) { return HT.sha256('hirntraining|' + salz + '|' + pin); };

  /* ---------- SVG-Hilfen ---------- */
  HT.svgEl = function (tag, attrs) {
    var e = document.createElementNS('http://www.w3.org/2000/svg', tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { e.setAttribute(k, attrs[k]); });
    return e;
  };
  HT.svgVon = function (inhalt, viewBox, klasse) {
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + (viewBox || '0 0 100 100') + '"' +
      (klasse ? ' class="' + klasse + '"' : '') + '>' + inhalt + '</svg>';
  };

  /* ---------- CSV ---------- */
  HT.csv = function (zeilen) {
    return '﻿' + zeilen.map(function (z) {
      return z.map(function (v) {
        if (v === null || v === undefined) return '';
        if (typeof v === 'number') return String(v).replace('.', ',');
        var s = String(v);
        return /[;"\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
      }).join(';');
    }).join('\r\n');
  };

  /* Datei im Browser herunterladen */
  HT.herunterladen = function (name, inhalt, typ) {
    var blob = new Blob([inhalt], { type: typ || 'application/octet-stream' });
    var url = URL.createObjectURL(blob);
    var a = HT.el('a', { href: url, download: name, style: 'display:none' });
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 1500);
  };

  HT.dateiLesen = function (accept, alsDataUrl) {
    return new Promise(function (resolve) {
      var inp = HT.el('input', { type: 'file', accept: accept || '*', style: 'display:none' });
      inp.addEventListener('change', function () {
        var f = inp.files && inp.files[0];
        if (!f) { resolve(null); return; }
        var r = new FileReader();
        r.onload = function () { resolve({ name: f.name, inhalt: r.result }); };
        r.onerror = function () { resolve(null); };
        if (alsDataUrl) r.readAsDataURL(f); else r.readAsText(f, 'utf-8');
        inp.remove();
      });
      document.body.appendChild(inp);
      inp.click();
    });
  };

  HT.skriptLaden = function (src) {
    return new Promise(function (resolve) {
      var s = document.createElement('script');
      // Versionsnummer anhängen, damit der Browser nach einer Änderung nicht die alte Datei aus dem Zwischenspeicher nimmt
      s.src = src + (window.HT_STAND && src.indexOf('?') < 0 ? '?v=' + window.HT_STAND.v : '');
      s.onload = function () { resolve(true); };
      s.onerror = function () { console.warn('Konnte nicht laden:', src); resolve(false); };
      document.head.appendChild(s);
    });
  };
})();

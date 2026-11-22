/* Hirntraining – UI-Bausteine: Dialog, Toast, Formular, Tabelle, PIN-Feld, Seitenkopf */
(function () {
  'use strict';
  var HT = window.HT;
  var UI = HT.ui = {};

  /* ---------- Toast ---------- */
  UI.toast = function (text, art) {
    var box = HT.$('#toasts');
    if (!box) { box = HT.el('div', { id: 'toasts' }); document.body.appendChild(box); }
    var t = HT.el('div', { class: 'toast ' + (art || 'info'), html: HT.icon(art === 'fehler' ? 'warnung' : (art === 'ok' ? 'haken' : 'info')) + '<span>' + HT.esc(text) + '</span>' });
    box.appendChild(t);
    requestAnimationFrame(function () { t.classList.add('sichtbar'); });
    setTimeout(function () { t.classList.remove('sichtbar'); setTimeout(function () { t.remove(); }, 300); }, art === 'fehler' ? 5000 : 2800);
  };

  /* ---------- Dialog ----------
   * opt: { titel, inhalt (Element|HTML), knoepfe: [{text, art, wert, aktion}], breit, schliessbar }
   * Rückgabe: Promise mit dem 'wert' des gedrückten Knopfes (null bei Abbruch). */
  UI.dialog = function (opt) {
    return new Promise(function (resolve) {
      var hinter = HT.el('div', { class: 'dialog-hinter' + (opt.breit ? ' dialog-hinter--breit' : '') });
      var box = HT.el('div', { class: 'dialog' + (opt.breit ? ' breit' : '') + (opt.klasse ? ' ' + opt.klasse : ''), role: 'dialog', 'aria-modal': 'true' });
      var titelEl = HT.el('h2', { tabindex: '-1' }, opt.titel || '');
      var kopf = HT.el('div', { class: 'dialog-kopf' }, [titelEl]);
      if (opt.schliessbar !== false) {
        var x = HT.el('button', { class: 'icon-knopf', type: 'button', 'aria-label': 'Schließen', html: HT.icon('schliessen') });
        x.addEventListener('click', function () { fertig(null); });
        kopf.appendChild(x);
      }
      var rumpf = HT.el('div', { class: 'dialog-rumpf' });
      if (typeof opt.inhalt === 'string') rumpf.innerHTML = opt.inhalt; else if (opt.inhalt) rumpf.appendChild(opt.inhalt);
      var fuss = HT.el('div', { class: 'dialog-fuss' });
      (opt.knoepfe || [{ text: HT.t('ok'), art: 'primaer', wert: true }]).forEach(function (k) {
        var b = HT.el('button', { class: 'knopf ' + (k.art || ''), type: 'button' }, k.text);
        b.addEventListener('click', function () {
          if (k.aktion) {
            var r = k.aktion();
            if (r === false) return;
            if (r && r.then) { b.disabled = true; r.then(function (v) { b.disabled = false; if (v !== false) fertig(k.wert === undefined ? v : k.wert); }); return; }
          }
          fertig(k.wert === undefined ? true : k.wert);
        });
        fuss.appendChild(b);
      });
      box.appendChild(kopf); box.appendChild(rumpf); box.appendChild(fuss);
      hinter.appendChild(box);
      document.body.appendChild(hinter);
      requestAnimationFrame(function () { hinter.classList.add('offen'); });
      // Standard: Fokus auf den Titel, Inhalt oben – nur Formulardialoge (opt.fokusFeld) springen ins erste Feld
      var erstes = opt.fokusFeld === true ? rumpf.querySelector('input:not([type=hidden]):not([type=checkbox]),select,textarea') : null;
      rumpf.scrollTop = 0;
      setTimeout(function () { if (erstes) erstes.focus(); else { try { titelEl.focus({ preventScroll: true }); } catch (e) { titelEl.focus(); } rumpf.scrollTop = 0; } }, 60);
      function taste(ev) {
        if (ev.key === 'Escape' && opt.schliessbar !== false) { ev.stopPropagation(); fertig(null); }
        if (ev.key === 'Enter' && ev.target.tagName !== 'TEXTAREA' && ev.target.tagName !== 'BUTTON') {
          var p = fuss.querySelector('.primaer'); if (p) { ev.preventDefault(); p.click(); }
        }
      }
      box.addEventListener('keydown', taste);
      function fertig(w) {
        hinter.classList.remove('offen');
        setTimeout(function () { hinter.remove(); }, 200);
        resolve(w);
      }
      UI._offen = fertig;
    });
  };

  UI.bestaetigen = function (text, opt) {
    opt = opt || {};
    return UI.dialog({
      titel: opt.titel || 'Bitte bestätigen',
      inhalt: '<p class="dialog-text">' + HT.esc(text) + '</p>',
      knoepfe: [{ text: HT.t('abbrechen'), wert: false }, { text: opt.ja || HT.t('ok'), art: opt.gefahr ? 'gefahr primaer' : 'primaer', wert: true }]
    }).then(function (w) { return w === true; });
  };

  UI.hinweis = function (titel, text) {
    return UI.dialog({ titel: titel, inhalt: '<p class="dialog-text">' + HT.esc(text) + '</p>', knoepfe: [{ text: HT.t('ok'), art: 'primaer' }] });
  };

  /* ---------- Formular ----------
   * felder: [{ name, label, typ: text|zahl|auswahl|textarea|schalter|pin|datum|farbe|bereich, optionen:[{wert,label}], min, max, schritt, hilfe, breit, pflicht }]
   * Rückgabe: { el, werte(), pruefen() } */
  UI.formular = function (felder, werte) {
    werte = werte || {};
    var form = HT.el('form', { class: 'formular', autocomplete: 'off' });
    form.addEventListener('submit', function (e) { e.preventDefault(); });
    var inputs = {};
    felder.forEach(function (f) {
      if (f.typ === 'titel') { form.appendChild(HT.el('h3', { class: 'form-titel' }, f.label)); return; }
      var wert = werte[f.name] !== undefined ? werte[f.name] : f.standard;
      var feld = HT.el('label', { class: 'feld' + (f.breit ? ' breit' : '') + (f.typ === 'schalter' ? ' feld-schalter' : '') });
      var inp;
      if (f.typ === 'auswahl') {
        inp = HT.el('select', { name: f.name });
        (f.optionen || []).forEach(function (o) {
          if (typeof o !== 'object') o = { wert: o, label: o };
          var op = HT.el('option', { value: o.wert }, o.label);
          if (String(o.wert) === String(wert)) op.selected = true;
          inp.appendChild(op);
        });
      } else if (f.typ === 'textarea') {
        inp = HT.el('textarea', { name: f.name, rows: f.zeilen || 3, placeholder: f.platzhalter || '' });
        inp.value = wert || '';
      } else if (f.typ === 'schalter') {
        inp = HT.el('input', { type: 'checkbox', name: f.name, class: 'schalter' });
        inp.checked = !!wert;
      } else if (f.typ === 'bereich') {
        inp = HT.el('input', { type: 'range', name: f.name, min: f.min, max: f.max, step: f.schritt || 1 });
        inp.value = wert;
      } else {
        var typ = { zahl: 'number', pin: 'password', datum: 'date', farbe: 'color' }[f.typ] || 'text';
        inp = HT.el('input', { type: typ, name: f.name, placeholder: f.platzhalter || '' });
        if (f.typ === 'zahl') { if (f.min !== undefined) inp.min = f.min; if (f.max !== undefined) inp.max = f.max; inp.step = f.schritt || 1; }
        if (f.typ === 'pin') { inp.inputMode = 'numeric'; inp.maxLength = 8; inp.autocomplete = 'new-password'; }
        inp.value = wert === undefined || wert === null ? '' : wert;
      }
      if (f.typ === 'schalter') {
        feld.appendChild(inp);
        feld.appendChild(HT.el('span', { class: 'feld-label' }, f.label));
      } else {
        feld.appendChild(HT.el('span', { class: 'feld-label' }, f.label + (f.pflicht ? ' *' : '')));
        if (f.typ === 'bereich') {
          var anzeige = HT.el('span', { class: 'bereich-wert' }, (f.format ? f.format(wert) : wert));
          inp.addEventListener('input', function () { anzeige.textContent = f.format ? f.format(inp.value) : inp.value; });
          feld.appendChild(HT.el('div', { class: 'bereich-zeile' }, [inp, anzeige]));
        } else feld.appendChild(inp);
      }
      if (f.hilfe) feld.appendChild(HT.el('span', { class: 'feld-hilfe' }, f.hilfe));
      if (f.beiAenderung) inp.addEventListener('change', function () { f.beiAenderung(inp.type === 'checkbox' ? inp.checked : inp.value, inputs); });
      inputs[f.name] = { inp: inp, f: f };
      form.appendChild(feld);
    });
    return {
      el: form,
      inputs: inputs,
      werte: function () {
        var w = {};
        Object.keys(inputs).forEach(function (n) {
          var x = inputs[n];
          if (x.f.typ === 'schalter') w[n] = x.inp.checked;
          else if (x.f.typ === 'zahl' || x.f.typ === 'bereich') w[n] = x.inp.value === '' ? null : Number(x.inp.value);
          else w[n] = x.inp.value.trim ? x.inp.value.trim() : x.inp.value;
        });
        return w;
      },
      pruefen: function () {
        var ok = true;
        Object.keys(inputs).forEach(function (n) {
          var x = inputs[n];
          var leer = x.f.pflicht && !String(x.inp.value).trim();
          x.inp.classList.toggle('ungueltig', leer);
          if (leer) ok = false;
        });
        if (!ok) UI.toast('Bitte alle Pflichtfelder ausfüllen.', 'fehler');
        return ok;
      }
    };
  };

  /* Formular in Dialog: Promise mit Werten oder null */
  UI.formularDialog = function (titel, felder, werte, opt) {
    opt = opt || {};
    var f = UI.formular(felder, werte);
    return UI.dialog({
      fokusFeld: true, titel: titel, inhalt: f.el, breit: opt.breit,
      knoepfe: [{ text: HT.t('abbrechen'), wert: null }, {
        text: opt.ok || HT.t('speichern'), art: 'primaer',
        aktion: function () {
          if (!f.pruefen()) return false;
          if (opt.pruefen) { var fehler = opt.pruefen(f.werte()); if (fehler) { UI.toast(fehler, 'fehler'); return false; } }
          return Promise.resolve(f.werte());
        }
      }]
    });
  };

  /* ---------- Tabelle ----------
   * spalten: [{ titel, wert(z) → string|Element, klasse, sort(z) }]  opt: { beiKlick(z), leer } */
  UI.tabelle = function (spalten, zeilen, opt) {
    opt = opt || {};
    var wrap = HT.el('div', { class: 'tabelle-wrap' });
    if (!zeilen.length) { wrap.appendChild(UI.leer(opt.leer || 'Keine Einträge vorhanden.', opt.leerIcon)); return wrap; }
    var sortSp = null, sortAuf = true;
    var tab = HT.el('table', { class: 'tabelle' + (opt.beiKlick ? ' klickbar' : '') });
    var thead = HT.el('thead'), tr = HT.el('tr');
    spalten.forEach(function (s, i) {
      var th = HT.el('th', { class: s.klasse || '' }, s.titel);
      if (s.sort) {
        th.classList.add('sortierbar');
        th.addEventListener('click', function () { sortAuf = sortSp === i ? !sortAuf : true; sortSp = i; rendern(); });
      }
      tr.appendChild(th);
    });
    thead.appendChild(tr); tab.appendChild(thead);
    var tbody = HT.el('tbody'); tab.appendChild(tbody);
    function rendern() {
      HT.leeren(tbody);
      var z = zeilen.slice();
      if (sortSp !== null) {
        var f = spalten[sortSp].sort;
        z.sort(function (a, b) { var x = f(a), y = f(b); return (x > y ? 1 : x < y ? -1 : 0) * (sortAuf ? 1 : -1); });
      }
      z.forEach(function (zeile) {
        var r = HT.el('tr');
        spalten.forEach(function (s) {
          var v = s.wert(zeile);
          var td = HT.el('td', { class: s.klasse || '' });
          if (v instanceof Element) td.appendChild(v); else if (s.html) td.innerHTML = v; else td.textContent = v === null || v === undefined ? '' : v;
          r.appendChild(td);
        });
        if (opt.beiKlick) {
          r.tabIndex = 0;
          r.addEventListener('click', function (e) { if (!e.target.closest('button,a,input,select')) opt.beiKlick(zeile); });
          r.addEventListener('keydown', function (e) { if (e.key === 'Enter') opt.beiKlick(zeile); });
        }
        tbody.appendChild(r);
      });
    }
    rendern();
    wrap.appendChild(tab);
    return wrap;
  };

  UI.leer = function (text, icon) {
    return HT.el('div', { class: 'leer-zustand', html: '<div class="leer-icon">' + HT.icon(icon || 'info') + '</div><p>' + HT.esc(text) + '</p>' });
  };

  /* ---------- Knöpfe ---------- */
  UI.knopf = function (text, opt) {
    opt = opt || {};
    var b = HT.el('button', { class: 'knopf ' + (opt.art || ''), type: 'button', title: opt.titel || null, html: (opt.icon ? HT.icon(opt.icon) : '') + (text ? '<span>' + HT.esc(text) + '</span>' : '') });
    if (opt.klick) b.addEventListener('click', opt.klick);
    if (opt.deaktiviert) b.disabled = true;
    return b;
  };
  UI.iconKnopf = function (icon, titel, klick, art) {
    var b = HT.el('button', { class: 'icon-knopf ' + (art || ''), type: 'button', title: titel, 'aria-label': titel, html: HT.icon(icon) });
    if (klick) b.addEventListener('click', klick);
    return b;
  };

  /* ---------- Seitenkopf ---------- */
  UI.seite = function (titel, untertitel, aktionen) {
    var kopf = HT.el('header', { class: 'seiten-kopf' });
    var t = HT.el('div', { class: 'seiten-titel' }, [HT.el('h1', null, titel)]);
    if (untertitel) t.appendChild(HT.el('p', { class: 'untertitel' }, untertitel));
    kopf.appendChild(t);
    if (aktionen && aktionen.length) kopf.appendChild(HT.el('div', { class: 'seiten-aktionen' }, aktionen));
    return kopf;
  };

  UI.karte = function (titel, inhalt, opt) {
    opt = opt || {};
    var k = HT.el('section', { class: 'karte ' + (opt.klasse || '') });
    if (titel) {
      var kopf = HT.el('div', { class: 'karte-kopf' }, [HT.el('h2', { html: (opt.icon ? HT.icon(opt.icon) : '') + '<span>' + HT.esc(titel) + '</span>' })]);
      if (opt.aktionen) kopf.appendChild(HT.el('div', { class: 'karte-aktionen' }, opt.aktionen));
      k.appendChild(kopf);
    }
    if (inhalt) (Array.isArray(inhalt) ? inhalt : [inhalt]).forEach(function (x) { if (x) k.appendChild(typeof x === 'string' ? HT.el('div', { html: x }) : x); });
    return k;
  };

  UI.reiter = function (reiter, aktiv, beiWahl) {
    var leiste = HT.el('nav', { class: 'reiter', role: 'tablist' });
    reiter.forEach(function (r) {
      var b = HT.el('button', { class: 'reiter-knopf' + (r.id === aktiv ? ' aktiv' : ''), type: 'button', role: 'tab', html: (r.icon ? HT.icon(r.icon) : '') + '<span>' + HT.esc(r.titel) + '</span>' });
      b.addEventListener('click', function () { beiWahl(r.id); });
      leiste.appendChild(b);
    });
    return leiste;
  };

  UI.abzeichen = function (text, art) { return HT.el('span', { class: 'abzeichen ' + (art || '') }, text); };

  UI.kennzahl = function (wert, label, icon, art) {
    return HT.el('div', { class: 'kennzahl ' + (art || ''), html: (icon ? '<div class="kennzahl-icon">' + HT.icon(icon) + '</div>' : '') + '<div><div class="kennzahl-wert">' + HT.esc(wert) + '</div><div class="kennzahl-label">' + HT.esc(label) + '</div></div>' });
  };

  /* ---------- Großer Ziffernblock für PIN ---------- */
  UI.pinFeld = function (beiFertig, opt) {
    opt = opt || {};
    var laenge = opt.laenge || 4, pin = '';
    var wrap = HT.el('div', { class: 'pin-feld' });
    var punkte = HT.el('div', { class: 'pin-punkte' });
    var meldung = HT.el('div', { class: 'pin-meldung', style: { color: 'var(--text-2)' } }, opt.text || '');
    function zeichnen() {
      HT.leeren(punkte);
      for (var i = 0; i < Math.max(laenge, pin.length); i++) punkte.appendChild(HT.el('span', { class: 'pin-punkt' + (i < pin.length ? ' voll' : '') }));
    }
    function eingabe(z) {
      if (z === 'del') pin = pin.slice(0, -1);
      else if (z === 'ok') { if (pin.length >= 4) senden(); return; }
      else if (pin.length < 8) pin += z;
      zeichnen();
      if (pin.length === laenge && !opt.manuell) senden();
    }
    function senden() {
      var p = pin; pin = ''; zeichnen();
      beiFertig(p, function fehler(text) {
        meldung.textContent = text || HT.t('pin_falsch');
        meldung.style.color = 'var(--fehler)';
        wrap.classList.remove('wackeln'); void wrap.offsetWidth; wrap.classList.add('wackeln');
      });
    }
    var block = HT.el('div', { class: 'ziffernblock' });
    ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'del', '0', 'ok'].forEach(function (z) {
      var b = HT.el('button', { class: 'ziffer' + (z === 'del' || z === 'ok' ? ' sonder' : ''), type: 'button', html: z === 'del' ? '⌫' : (z === 'ok' ? HT.icon('haken') : z) });
      if (z === 'ok' && !opt.manuell) b.style.visibility = 'hidden';
      b.addEventListener('click', function () { eingabe(z); });
      block.appendChild(b);
    });
    function taste(ev) {
      if (!document.body.contains(wrap)) { document.removeEventListener('keydown', taste); return; }
      if (/^[0-9]$/.test(ev.key)) { eingabe(ev.key); ev.preventDefault(); }
      else if (ev.key === 'Backspace') { eingabe('del'); ev.preventDefault(); }
      else if (ev.key === 'Enter') { eingabe('ok'); ev.preventDefault(); }
    }
    document.addEventListener('keydown', taste);
    zeichnen();
    wrap.appendChild(punkte); wrap.appendChild(meldung); wrap.appendChild(block);
    wrap.zuruecksetzen = function () { pin = ''; zeichnen(); };
    return wrap;
  };

  /* Initialen-Avatar mit Farbe aus dem Namen */
  UI.avatar = function (name, gross) {
    var farben = ['#1BA8B5', '#7B61D9', '#E8833A', '#2EAD6B', '#D14D86', '#3D7BE0', '#C59A16', '#4C9A9F'];
    var h = 0; String(name).split('').forEach(function (c) { h = (h * 31 + c.charCodeAt(0)) % 997; });
    var ini = String(name || '?').split(/\s+/).filter(Boolean).map(function (w) { return w[0]; }).join('').slice(0, 2).toUpperCase();
    return HT.el('span', { class: 'avatar' + (gross ? ' gross' : ''), style: { background: farben[h % farben.length] } }, ini || '?');
  };

  /* Drag & Drop-Sortierung einer Liste (Maus und Touch) mit Rückruf (alteReihenfolge → neue Indizes) */
  UI.sortierbar = function (liste, beiAenderung) {
    var gezogen = null;
    HT.$$('[data-index]', liste).forEach(function (eintrag) {
      var griff = eintrag.querySelector('.griff') || eintrag;
      griff.addEventListener('mousedown', function () { eintrag.draggable = true; });
      eintrag.addEventListener('dragstart', function (e) { gezogen = eintrag; eintrag.classList.add('zieht'); try { e.dataTransfer.setData('text/plain', eintrag.dataset.index); } catch (x) { /* Safari */ } e.dataTransfer.effectAllowed = 'move'; });
      eintrag.addEventListener('dragend', function () { eintrag.draggable = false; eintrag.classList.remove('zieht'); HT.$$('.drueber', liste).forEach(function (x) { x.classList.remove('drueber'); }); });
      eintrag.addEventListener('dragover', function (e) { e.preventDefault(); if (gezogen && gezogen !== eintrag) eintrag.classList.add('drueber'); });
      eintrag.addEventListener('dragleave', function () { eintrag.classList.remove('drueber'); });
      eintrag.addEventListener('drop', function (e) {
        e.preventDefault();
        if (!gezogen || gezogen === eintrag) return;
        beiAenderung(Number(gezogen.dataset.index), Number(eintrag.dataset.index));
      });
    });
  };
})();

/* Routen-Register: Seiten melden sich hier an, app.js übernimmt das Hash-Routing.
 * HT.route('/patienten', render(param, wurzel), { schutz: 'therapeut'|'admin'|null, shell: true }) */
(function () {
  'use strict';
  var HT = window.HT;
  HT.routen = [];
  HT.route = function (muster, render, opt) {
    opt = opt || {};
    var namen = [];
    var re = new RegExp('^' + muster.replace(/:([a-zA-Z]+)/g, function (m, n) { namen.push(n); return '([^/]+)'; }) + '$');
    HT.routen.push({ muster: muster, re: re, namen: namen, render: render, schutz: opt.schutz === undefined ? 'therapeut' : opt.schutz, shell: opt.shell !== false, nav: opt.nav });
  };
})();

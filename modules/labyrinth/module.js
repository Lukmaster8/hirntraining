/* Modul: Labyrinth – Weg vom Start zum Ziel, prozedural erzeugt, Größe nach Level.
 * Bedienung: Pfeiltasten, Ziehen mit Maus/Finger oder Antippen benachbarter Felder. */
(function () {
  'use strict';
  var HT = window.HT;
  var levels = HT.stufen(14, function (t) { return { spalten: HT.lerpInt(5, 18, t), zeilen: HT.lerpInt(4, 11, t), zeitlimitSek: HT.lerpInt(60, 120, t) }; });

  function erzeugen(sp, ze) {
    // Wände: jede Zelle hat {o, r, u, l}
    var z = [];
    for (var y = 0; y < ze; y++) { z.push([]); for (var x = 0; x < sp; x++) z[y].push({ o: true, r: true, u: true, l: true, besucht: false }); }
    var stapel = [[0, 0]]; z[0][0].besucht = true;
    while (stapel.length) {
      var c = stapel[stapel.length - 1], cx = c[0], cy = c[1];
      var n = [[0, -1, 'o', 'u'], [1, 0, 'r', 'l'], [0, 1, 'u', 'o'], [-1, 0, 'l', 'r']].filter(function (d) {
        var nx = cx + d[0], ny = cy + d[1]; return nx >= 0 && ny >= 0 && nx < sp && ny < ze && !z[ny][nx].besucht;
      });
      if (!n.length) { stapel.pop(); continue; }
      var d = HT.zufall.wahl(n), nx = cx + d[0], ny = cy + d[1];
      z[cy][cx][d[2]] = false; z[ny][nx][d[3]] = false; z[ny][nx].besucht = true;
      stapel.push([nx, ny]);
    }
    return z;
  }

  HT.registerModule({
    id: 'labyrinth', name: 'Labyrinth', kategorie: 'visuomotorik', symbol: 'puzzle',
    ziel: 'Vorausschauend planen und die Bewegung gezielt steuern',
    beschreibung: 'Der Punkt soll vom Start (oben links) durch ein zufällig erzeugtes Labyrinth zum Ziel (unten rechts) geführt werden – mit den Pfeiltasten, durch Ziehen mit Maus/Finger oder durch Antippen eines Nachbarfeldes. Wände können nicht durchquert werden; Stöße an Wände werden gezählt. Level: Größe des Labyrinths (5×4 bis 18×11) und Zeitlimit.',
    anleitung: 'Führen Sie den türkisen Punkt zum Ziel unten rechts. Nutzen Sie die Pfeiltasten oder ziehen Sie den Punkt mit Maus oder Finger durch die Gänge.',
    eingabe: ['tastatur', 'maus', 'touch'],
    tasten: ['links', 'hoch', 'runter', 'rechts'], levels: levels,
    levelLabels: { spalten: 'Spalten', zeilen: 'Zeilen', zeitlimitSek: 'Zeitlimit (s)' },
    create: function (container, ctx) {
      var p = ctx.params, Z = HT.zeit, aus = [];
      var info = HT.m.neu(container, 'm-info');
      var zone = HT.m.neu(container, 'm-zentrum');
      var feld = Math.floor(Math.min((container.clientWidth - 80) / p.spalten, (container.clientHeight - 80) / p.zeilen, 70));
      var buehne = HT.m.neu(zone, '', '', { width: feld * p.spalten + 'px', height: feld * p.zeilen + 'px', position: 'relative' });
      var M = null, pos = [0, 0], t0 = 0, stoesse = 0, timer = null, aktiv = false, spurPunkte = [];
      function zeichnen() {
        var w = feld * p.spalten, h = feld * p.zeilen;
        var s = '<svg viewBox="-4 -4 ' + (w + 8) + ' ' + (h + 8) + '" width="' + (w + 8) + '" height="' + (h + 8) + '" style="position:absolute;left:-4px;top:-4px" xmlns="http://www.w3.org/2000/svg"><rect x="0" y="0" width="' + w + '" height="' + h + '" rx="6" fill="#fff"/>';
        s += '<rect x="' + ((p.spalten - 1) * feld + 4) + '" y="' + ((p.zeilen - 1) * feld + 4) + '" width="' + (feld - 8) + '" height="' + (feld - 8) + '" rx="8" fill="#e2f5ea"/><g transform="translate(' + ((p.spalten - 0.5) * feld - feld * 0.15) + ' ' + ((p.zeilen - 0.5) * feld - feld * 0.28) + ') scale(' + (feld / 100) + ')"><path d="M6 0 V58" stroke="#26333c" stroke-width="7" stroke-linecap="round"/><path d="M8 2 L50 14 L8 28 Z" fill="#E25C5C" stroke="#26333c" stroke-width="4" stroke-linejoin="round"/></g>';
        if (spurPunkte.length > 1) s += '<polyline points="' + spurPunkte.map(function (q) { return ((q[0] + 0.5) * feld) + ',' + ((q[1] + 0.5) * feld); }).join(' ') + '" fill="none" stroke="#9fd8de" stroke-width="' + feld * 0.22 + '" stroke-linecap="round" stroke-linejoin="round"/>';
        var pfad = '';
        M.forEach(function (zeile, y) { zeile.forEach(function (c, x) {
          var X = x * feld, Y = y * feld;
          if (c.o) pfad += 'M' + X + ' ' + Y + 'h' + feld;
          if (c.l) pfad += 'M' + X + ' ' + Y + 'v' + feld;
          if (y === p.zeilen - 1 && c.u) pfad += 'M' + X + ' ' + (Y + feld) + 'h' + feld;
          if (x === p.spalten - 1 && c.r) pfad += 'M' + (X + feld) + ' ' + Y + 'v' + feld;
        }); });
        s += '<path d="' + pfad + '" stroke="#26333c" stroke-width="' + Math.max(3, feld * 0.09) + '" stroke-linecap="round" fill="none"/>';
        s += '<circle cx="' + ((pos[0] + 0.5) * feld) + '" cy="' + ((pos[1] + 0.5) * feld) + '" r="' + feld * 0.3 + '" fill="#1BA8B5" stroke="#fff" stroke-width="3"/></svg>';
        buehne.innerHTML = s;
      }
      function neu() {
        M = erzeugen(p.spalten, p.zeilen); pos = [0, 0]; stoesse = 0; t0 = Z.jetzt(); aktiv = true; spurPunkte = [[0, 0]];
        Z.abbrechen(timer);
        timer = Z.nach(p.zeitlimitSek * 1000, function () { if (!aktiv) return; aktiv = false; ctx.onEvent({ korrekt: false, auslassung: true, reiz: p.spalten + 'x' + p.zeilen, reaktion: 'Zeit abgelaufen' }); ctx.feedback(false); Z.nach(1500, neu); });
        info.textContent = 'Zeit: ' + p.zeitlimitSek + ' s';
        zeichnen();
      }
      var RICHT = { hoch: [0, -1, 'o'], runter: [0, 1, 'u'], links: [-1, 0, 'l'], rechts: [1, 0, 'r'] };
      function gehe(r) {
        if (!aktiv) return false;
        var d = RICHT[r], c = M[pos[1]][pos[0]];
        if (c[d[2]]) { stoesse++; ctx.onEvent({ korrekt: false, zaehlt: false, typ: 'wand', reiz: 'wand', reaktion: r }); ctx.audio.ton(180, 0.06, 'square', 0, 0.06); return false; }
        pos = [pos[0] + d[0], pos[1] + d[1]];
        var letzte = spurPunkte[spurPunkte.length - 2];
        if (letzte && letzte[0] === pos[0] && letzte[1] === pos[1]) spurPunkte.pop(); else spurPunkte.push(pos.slice());
        zeichnen();
        if (pos[0] === p.spalten - 1 && pos[1] === p.zeilen - 1) {
          aktiv = false; Z.abbrechen(timer);
          ctx.onEvent({ korrekt: true, reiz: p.spalten + 'x' + p.zeilen, reaktion: stoesse + ' Wandstöße', rtMs: Z.jetzt() - t0 });
          ctx.feedback(true);
          info.textContent = 'Geschafft in ' + Math.round((Z.jetzt() - t0) / 1000) + ' s';
          Z.nach(1400, neu);
        }
        return true;
      }
      function zuFeld(x, y) {
        var fx = Math.floor(x / feld), fy = Math.floor(y / feld);
        if (fx < 0 || fy < 0 || fx >= p.spalten || fy >= p.zeilen) return;
        var dx = fx - pos[0], dy = fy - pos[1];
        if (Math.abs(dx) + Math.abs(dy) !== 1) return;
        gehe(dx === 1 ? 'rechts' : dx === -1 ? 'links' : dy === 1 ? 'runter' : 'hoch');
      }
      return {
        start: function () {
          aus.push(HT.eingabe.an(function (a) { if (RICHT[a]) gehe(a); }));
          aus.push(HT.zeigerFolgen(buehne, { bewegt: function (x, y, gedrueckt) { if (gedrueckt) zuFeld(x, y); } }));
          neu();
        },
        stop: function () { aus.forEach(function (f) { f(); }); }
      };
    },
    preview: function (el) {
      var b = function (q) {
        return '<svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg"><rect x="80" y="30" width="240" height="240" rx="6" fill="#fff" stroke="#26333c" stroke-width="5"/><path d="M140 30 V150 M200 90 V270 M260 30 V210 M80 210 H140 M200 150 H260" stroke="#26333c" stroke-width="5" stroke-linecap="round"/><path d="M282 228 V262" stroke="#26333c" stroke-width="4"/><path d="M284 229 L304 236 L284 243 Z" fill="#E25C5C" stroke="#26333c" stroke-width="2"/><circle cx="' + q[0] + '" cy="' + q[1] + '" r="16" fill="#1BA8B5" stroke="#fff" stroke-width="3"/></svg>';
      };
      return HT.beispiel(el, [{ svg: b([110, 60]), text: 'Zum Ziel führen', dauer: 1000 }, { svg: b([110, 180]), dauer: 600 }, { svg: b([170, 180]), dauer: 600 }, { svg: b([170, 60]), dauer: 600 }, { svg: b([230, 60]), dauer: 600 }, { svg: b([230, 240]), dauer: 600 }, { svg: b([290, 240]), text: 'Geschafft!', dauer: 1300 }]);
    }
  });
})();

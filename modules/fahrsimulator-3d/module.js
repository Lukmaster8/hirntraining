/* Modul (Prototyp): Fahrsimulator 3D – Fahrt im Cockpit eines echten 3D-Fahrzeugmodells durch eine deutsche Vorstadtstraße.
 * Technik: Three.js r170 (gebündelt, WebGL 2, siehe tools/3d/bauen.sh), Himmel mit Sonne und Umgebungslicht, Schatten,
 * prozedurale PBR-Umgebung (Asphalt, Gehweg, Häuser, Bäume, Zäune, Hecken, Laternen). Das Fahrzeug (Golf GTI, Sketchfab Standard,
 * nur lokal, siehe assets3d/LIZENZEN.md) wird als eingebettete GLB geladen; Lenkrad dreht mit, das Kombi-Display zeigt live
 * Tempo, Limit und Punkte. Innenspiegel als zweite Kamera. Trainingslogik wie „Straßenverkehr“: Tempo 50 halten (+10 / −5),
 * Warnung bei zu schnell, Fußgänger am Zebrastreifen, Ampel. Läuft in Chrome (WebGL 2); ohne WebGL 2 gibt es einen Hinweis. */
(function () {
  'use strict';
  var HT = window.HT;
  var GOLF = null;          // zwischengespeichertes Fahrzeug (einmal dekodiert, für weitere Durchgänge wiederverwendet)
  var LADEN = null;         // laufendes Laden (Promise)
  var TEX = {};             // erzeugte Texturen (wiederverwendet)

  var levels = HT.stufen(10, function (t, i) {
    return { band: HT.lerpInt(12, 5, t), fussgaenger: i >= 1, ampel: i >= 2, gegenverkehr: i >= 0 };
  });

  function webgl2() { try { var c = document.createElement('canvas'); return !!(window.WebGL2RenderingContext && c.getContext('webgl2')); } catch (e) { return false; } }

  // Laden: Three.js-Bündel und Fahrzeug (Base64) per <script>, dann GLB dekodieren
  function vorbereiten(status) {
    if (GOLF) return Promise.resolve(GOLF);
    if (LADEN) return LADEN;
    LADEN = HT.skriptLaden('modules/fahrsimulator-3d/three-bundle.js').then(function (ok) {
      if (!ok || !window.HT3D) throw new Error('Die 3D-Engine konnte nicht geladen werden.');
      status('Fahrzeug wird geladen …');
      return HT.skriptLaden('modules/fahrsimulator-3d/assets3d/golf.js');
    }).then(function () {
      var A = window.HT3D_ASSETS;
      if (!A || !A.golf) throw new Error('Das 3D-Fahrzeug fehlt. Es ist lizenzpflichtig und nur in der lokalen Fassung enthalten (tools/3d/golf_einbetten.py).');
      status('Fahrzeug wird vorbereitet …');
      return fetch('data:application/octet-stream;base64,' + A.golf).then(function (r) { return r.arrayBuffer(); }).catch(function () {
        var s = atob(A.golf), u = new Uint8Array(s.length); for (var i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); return u.buffer;
      });
    }).then(function (buf) {
      return new Promise(function (res, rej) { new window.HT3D.GLTFLoader().parse(buf, '', res, rej); });
    }).then(function (gltf) { GOLF = gltf; return gltf; });
    LADEN.catch(function () { LADEN = null; });
    return LADEN;
  }

  /* ---------- prozedurale Texturen (Canvas → Three.js) ---------- */
  function rauschTextur(T, name, b, h, farben, zeichnen, wdh) {
    if (TEX[name]) return TEX[name];
    var c = document.createElement('canvas'); c.width = b; c.height = h; var g = c.getContext('2d');
    g.fillStyle = farben[0]; g.fillRect(0, 0, b, h);
    var R = HT.zufall;
    for (var i = 0; i < b * h / 6; i++) { g.fillStyle = farben[1 + (i % (farben.length - 1))]; g.globalAlpha = 0.05 + Math.random() * 0.12; g.fillRect(Math.random() * b, Math.random() * h, 1 + Math.random() * 2, 1 + Math.random() * 2); }
    g.globalAlpha = 1;
    if (zeichnen) zeichnen(g, b, h);
    var t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; t.colorSpace = T.SRGBColorSpace; t.anisotropy = 4;
    if (wdh) t.repeat.set(wdh[0], wdh[1]);
    TEX[name] = t; return t;
  }
  function fassade(T, nr) {
    var putz = ['#efe6d6', '#e8dcc6', '#f4f1ea', '#dfe3e6', '#ead8c0', '#f1e3d3'][nr % 6];
    return rauschTextur(T, 'fassade' + nr, 512, 512, [putz, '#d8ccb6', '#fff8ec', '#cfc4b1'], function (g, b, h) {
      // zwei Geschosse mit Fenstern (weiße Rahmen, Sprossen, dunkles Glas mit Himmelsspiegelung), unten Haustür
      for (var e = 0; e < 2; e++) for (var f = 0; f < 3; f++) {
        if (e === 0 && f === 1) { g.fillStyle = ['#5a3a24', '#2d3a45', '#6d2b23'][nr % 3]; g.fillRect(212, 300, 88, 196); g.fillStyle = '#c9a24a'; g.fillRect(282, 400, 6, 6); continue; }
        var x = 40 + f * 168, y = 70 + e * 230, w = 100, hh = 130;
        g.fillStyle = '#fbfbfb'; g.fillRect(x - 8, y - 8, w + 16, hh + 16);
        var gl = g.createLinearGradient(x, y, x + w, y + hh); gl.addColorStop(0, '#7f97a8'); gl.addColorStop(0.5, '#3b4d5a'); gl.addColorStop(1, '#22303a');
        g.fillStyle = gl; g.fillRect(x, y, w, hh);
        g.fillStyle = '#fbfbfb'; g.fillRect(x + w / 2 - 3, y, 6, hh); g.fillRect(x, y + hh * 0.4, w, 5);
        g.fillStyle = 'rgba(255,255,255,.18)'; g.beginPath(); g.moveTo(x + 6, y + hh - 6); g.lineTo(x + w * 0.35, y + 6); g.lineTo(x + w * 0.5, y + 6); g.lineTo(x + 18, y + hh - 6); g.fill();
        if (nr % 2 === 0) { g.fillStyle = '#4a5560'; g.fillRect(x - 8, y - 18, w + 16, 10); } // Rollladenkasten
      }
      g.fillStyle = 'rgba(0,0,0,.08)'; g.fillRect(0, h - 22, b, 22); // Sockel
    }, [1, 1]);
  }

  HT.registerModule({
    id: 'fahrsimulator-3d', name: 'Fahrsimulator 3D (Prototyp)', kategorie: 'aufmerksamkeit', symbol: 'weiter',
    ziel: 'Im echten 3D-Cockpit Tempo 50 halten und auf Fußgänger und Ampel achten',
    beschreibung: 'Prototyp: Fahrt aus der Fahrerperspektive eines 3D-Fahrzeugs durch eine deutsche Vorstadtstraße mit Häusern, Bäumen, Gehwegen, Zebrastreifen und Ampel. Pfeil hoch ist Gas, Pfeil runter Bremse, links/rechts weicht aus. Tempo 50 halten: fünf Sekunden im grünen Bereich bringen 10 Punkte, zu schnell kostet 5. Läuft in Google Chrome (WebGL 2).',
    anleitung: 'Pfeil nach oben ist Gas, Pfeil nach unten ist Bremse. Im Ort gilt 50 Kilometer pro Stunde. Halten Sie an, wenn jemand über den Zebrastreifen geht oder die Ampel rot ist.',
    tasten: ['hoch', 'runter', 'links', 'rechts'], levels: levels, wiederholung: true,
    levelLabels: { band: 'Grünes Band unter dem Limit (km/h)', fussgaenger: 'Fußgänger am Zebrastreifen', ampel: 'Ampel', gegenverkehr: 'Gegenverkehr' },
    parameterSchema: {
      dauerDurchgangSek: { typ: 'zahl', label: 'Dauer eines Durchgangs (Sek.)', min: 60, max: 300, schritt: 15, standard: 120 },
      qualitaet: { typ: 'auswahl', label: 'Grafikqualität', standard: 'auto', optionen: [{ wert: 'auto', label: 'Automatisch' }, { wert: 'niedrig', label: 'Niedrig (ältere Macs)' }, { wert: 'mittel', label: 'Mittel' }, { wert: 'hoch', label: 'Hoch' }] },
      leistung: { typ: 'schalter', label: 'Leistungsanzeige (FPS)', standard: false }
    },
    create: function (container, ctx) {
      var p = ctx.params, Z = HT.zeit, aus = [], frameId = null, laeuft = false, fertig = false;
      var voll = HT.m.neu(container, 'm-voll f3d', '', { background: '#0b0f12', overflow: 'hidden' });
      var status = HT.el('div', { class: 'f3d-status' }, '3D-Engine wird geladen …'); voll.appendChild(status);
      var warn = HT.el('div', { class: 'f3d-warn' }); voll.appendChild(warn);
      var hinweis = HT.el('div', { class: 'f3d-hinweis' }); voll.appendChild(hinweis);
      var fpsAnz = HT.el('div', { class: 'f3d-fps' }); if (p.leistung) voll.appendChild(fpsAnz);
      var renderer = null, welt = null;
      function meldung(t) { hinweis.textContent = t; hinweis.classList.add('an'); clearTimeout(meldung.t); meldung.t = setTimeout(function () { hinweis.classList.remove('an'); }, 3200); }

      function aufbauen(gltf) {
        var H3 = window.HT3D, T = H3.THREE, b = voll.clientWidth || 1000, h = voll.clientHeight || 600;
        var leicht = (HT.leicht && HT.leicht()) || p.qualitaet === 'niedrig', q = p.qualitaet === 'auto' ? (leicht ? 'niedrig' : 'mittel') : p.qualitaet;
        renderer = new T.WebGLRenderer({ antialias: q !== 'niedrig', powerPreference: 'high-performance' });
        renderer.setPixelRatio(q === 'niedrig' ? 0.75 : Math.min(window.devicePixelRatio || 1, q === 'hoch' ? 1.5 : 1));
        renderer.setSize(b, h); renderer.outputColorSpace = T.SRGBColorSpace; renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
        renderer.shadowMap.enabled = q !== 'niedrig'; renderer.shadowMap.type = T.PCFSoftShadowMap;
        renderer.domElement.className = 'f3d-canvas'; voll.insertBefore(renderer.domElement, voll.firstChild);
        var scene = new T.Scene(), cam = new T.PerspectiveCamera(58, b / h, 0.03, 1500);
        scene.fog = new T.Fog(0xcad6df, 140, 700);
        // Himmel mit Sonne; Umgebungslicht (Spiegelungen auf Lack, Glas, Leder) aus dem Himmel
        var sky = new H3.Sky(); sky.scale.setScalar(5000);
        var su = sky.material.uniforms; su.turbidity.value = 5.5; su.rayleigh.value = 1.4; su.mieCoefficient.value = 0.004; su.mieDirectionalG.value = 0.82;
        var sonne = new T.Vector3().setFromSphericalCoords(1, T.MathUtils.degToRad(90 - 32), T.MathUtils.degToRad(150)); su.sunPosition.value.copy(sonne);
        scene.add(sky);
        var pm = new T.PMREMGenerator(renderer), hs = new T.Scene(); hs.add(sky.clone());
        scene.environment = pm.fromScene(hs, 0.02).texture; pm.dispose();
        scene.add(new T.HemisphereLight(0xbfd8ef, 0x5d6b4a, 0.45));
        var sun = new T.DirectionalLight(0xfff1dc, 2.4); sun.position.copy(sonne).multiplyScalar(60); sun.castShadow = q !== 'niedrig';
        sun.shadow.mapSize.set(q === 'hoch' ? 2048 : 1024, q === 'hoch' ? 2048 : 1024);
        var sc = sun.shadow.camera; sc.left = -30; sc.right = 30; sc.top = 30; sc.bottom = -30; sc.near = 1; sc.far = 160; sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.02;
        scene.add(sun); scene.add(sun.target);

        /* ---------- Umgebung: Vorstadtstraße entlang −Z ---------- */
        var L = 900, STR = 3.5;
        var asphalt = rauschTextur(T, 'asphalt', 512, 512, ['#55595d', '#3e4246', '#6b6f73', '#2f3336', '#7a7d80'], null, [2, L / 8]);
        var gehweg = rauschTextur(T, 'gehweg', 256, 256, ['#a7a49d', '#8d8a84', '#bdbab3'], function (g, bb, hh) { g.strokeStyle = 'rgba(70,68,64,.55)'; g.lineWidth = 2; for (var i = 0; i <= 4; i++) { g.beginPath(); g.moveTo(0, i * hh / 4); g.lineTo(bb, i * hh / 4); g.stroke(); g.beginPath(); g.moveTo(i * bb / 4 + (i % 2) * 0, 0); g.lineTo(i * bb / 4, hh); g.stroke(); } }, [1, L / 2.4]);
        var rasen = rauschTextur(T, 'rasen', 256, 256, ['#5f8a3c', '#4d7631', '#729c48', '#3f6328', '#8aa35a'], null, [60, 400]);
        var std = function (o) { return new T.MeshStandardMaterial(o); };
        var boden = new T.Mesh(new T.PlaneGeometry(400, L + 400), std({ map: rasen, roughness: 0.95 })); boden.rotation.x = -Math.PI / 2; boden.position.set(0, -0.02, -L / 2); boden.receiveShadow = true; scene.add(boden);
        var strasse = new T.Mesh(new T.PlaneGeometry(STR * 2, L + 60), std({ map: asphalt, roughness: 0.88, metalness: 0 })); strasse.rotation.x = -Math.PI / 2; strasse.position.set(0, 0, -L / 2); strasse.receiveShadow = true; scene.add(strasse);
        var weiss = std({ color: 0xf4f4f0, roughness: 0.6 });
        // Markierungen: Mittellinie gestrichelt, Randlinien durchgezogen (Instanzen)
        var strich = new T.InstancedMesh(new T.PlaneGeometry(0.12, 3), weiss, Math.ceil(L / 9)), m4 = new T.Matrix4(), qq = new T.Quaternion().setFromEuler(new T.Euler(-Math.PI / 2, 0, 0));
        for (var i = 0; i < strich.count; i++) { m4.compose(new T.Vector3(0, 0.01, -i * 9 - 2), qq, new T.Vector3(1, 1, 1)); strich.setMatrixAt(i, m4); }
        strich.receiveShadow = true; scene.add(strich);
        [-1, 1].forEach(function (sd) { var rl = new T.Mesh(new T.PlaneGeometry(0.12, L + 60), weiss); rl.rotation.x = -Math.PI / 2; rl.position.set(sd * (STR * 2 - 0.25) / 1, 0.01, -L / 2); rl.position.x = sd * (STR - 0.2); rl.receiveShadow = true; scene.add(rl); });
        // Bordstein, Gehweg, Grünstreifen
        var beton = std({ color: 0xb9b6ae, roughness: 0.9 });
        [-1, 1].forEach(function (sd) {
          var bord = new T.Mesh(new T.BoxGeometry(0.22, 0.15, L + 60), beton); bord.position.set(sd * (STR + 0.11), 0.075, -L / 2); bord.receiveShadow = bord.castShadow = true; scene.add(bord);
          var gw = new T.Mesh(new T.PlaneGeometry(2.6, L + 60), std({ map: gehweg, roughness: 0.92 })); gw.rotation.x = -Math.PI / 2; gw.position.set(sd * (STR + 0.22 + 1.3), 0.15, -L / 2); gw.receiveShadow = true; scene.add(gw);
        });
        // Bäume (Herbst), Laternen, Zäune, Hecken – als Instanzen
        var baumN = Math.ceil(L / 17) * 2, stamm = new T.InstancedMesh(new T.CylinderGeometry(0.12, 0.2, 3.2, 7), std({ color: 0x4a3a2c, roughness: 0.95 }), baumN);
        var krone = new T.InstancedMesh(new T.IcosahedronGeometry(1, 1), std({ roughness: 0.85, flatShading: false }), baumN * 3);
        var kc = new T.Color(), kk = 0, herbst = [0xc7681f, 0xe0a030, 0xb8541a, 0x8a9a3a, 0xd98b2b, 0x7a3410];
        for (i = 0; i < baumN; i++) {
          var sd2 = i % 2 ? 1 : -1, z = -Math.floor(i / 2) * 17 - 6 - (i % 2) * 8, x = sd2 * (STR + 2.9), hs2 = 0.85 + Math.random() * 0.35;
          m4.compose(new T.Vector3(x, 1.6 * hs2, z), new T.Quaternion(), new T.Vector3(hs2, hs2, hs2)); stamm.setMatrixAt(i, m4);
          for (var kr = 0; kr < 3; kr++) {
            var r = (1.5 + Math.random() * 0.7) * hs2;
            m4.compose(new T.Vector3(x + (Math.random() - 0.5) * 1.4, (3.6 + kr * 0.9 + Math.random() * 0.4) * hs2, z + (Math.random() - 0.5) * 1.4), new T.Quaternion().setFromEuler(new T.Euler(Math.random(), Math.random(), 0)), new T.Vector3(r, r * 0.85, r));
            krone.setMatrixAt(kk, m4); kc.setHex(herbst[(i * 3 + kr) % herbst.length]).offsetHSL(0, 0, (Math.random() - 0.5) * 0.08); krone.setColorAt(kk, kc); kk++;
          }
        }
        stamm.castShadow = krone.castShadow = true; krone.receiveShadow = true; scene.add(stamm); scene.add(krone);
        var latN = Math.ceil(L / 35), mast = new T.InstancedMesh(new T.CylinderGeometry(0.06, 0.09, 6, 8), std({ color: 0x6b737a, metalness: 0.6, roughness: 0.4 }), latN), kopf = new T.InstancedMesh(new T.BoxGeometry(0.35, 0.12, 0.7), std({ color: 0x4b5258, metalness: 0.5, roughness: 0.4, emissive: 0x222222 }), latN);
        for (i = 0; i < latN; i++) { var lsd = i % 2 ? 1 : -1, lz = -i * 35 - 14; m4.compose(new T.Vector3(lsd * (STR + 0.6), 3, lz), new T.Quaternion(), new T.Vector3(1, 1, 1)); mast.setMatrixAt(i, m4); m4.compose(new T.Vector3(lsd * (STR + 0.25), 6, lz), new T.Quaternion(), new T.Vector3(1, 1, 1)); kopf.setMatrixAt(i, m4); }
        mast.castShadow = true; scene.add(mast); scene.add(kopf);
        // Häuser mit Satteldach, Vorgarten mit Zaun und Hecke
        var dach = std({ color: 0x8a3a2a, roughness: 0.75 }), dach2 = std({ color: 0x3e4247, roughness: 0.7 }), holz = std({ color: 0xe8e2d6, roughness: 0.8 }), hecke = std({ color: 0x3f6a2c, roughness: 0.95 });
        var fassMat = [0, 1, 2, 3, 4, 5].map(function (n) { return std({ map: fassade(T, n), roughness: 0.85 }); });
        var putzMat = [0, 1, 2, 3, 4, 5].map(function (n) { return std({ color: new T.Color(['#efe6d6', '#e8dcc6', '#f4f1ea', '#dfe3e6', '#ead8c0', '#f1e3d3'][n]), roughness: 0.9 }); });
        var dachGeo = (function () { var s = new T.Shape(); s.moveTo(-5.6, 0); s.lineTo(0, 3.6); s.lineTo(5.6, 0); s.lineTo(-5.6, 0); var gg = new T.ExtrudeGeometry(s, { depth: 10.6, bevelEnabled: false }); gg.translate(0, 0, -5.3); return gg; })();
        for (var hz = -20, hn = 0; hz > -L + 30; hz -= 24 + Math.random() * 8, hn++) {
          [-1, 1].forEach(function (sd) {
            var n = (hn * 2 + (sd > 0 ? 1 : 0)) % 6, haus = new T.Group(), hx = sd * (STR + 13 + Math.random() * 2.5);
            var mats = [putzMat[n], putzMat[n], putzMat[n], putzMat[n], sd < 0 ? putzMat[n] : fassMat[n], sd < 0 ? fassMat[n] : putzMat[n]];
            var korpus = new T.Mesh(new T.BoxGeometry(10, 6, 10), [mats[4], mats[5], putzMat[n], putzMat[n], mats[0], mats[1]]);
            // Fassade zeigt zur Straße (±X): BoxGeometry-Materialien: +x, −x, +y, −y, +z, −z
            korpus.material = [sd < 0 ? fassMat[n] : putzMat[n], sd < 0 ? putzMat[n] : fassMat[n], putzMat[n], putzMat[n], putzMat[n], putzMat[n]];
            korpus.position.y = 3; korpus.castShadow = korpus.receiveShadow = true; haus.add(korpus);
            var dm = new T.Mesh(dachGeo, n % 3 === 1 ? dach2 : dach); dm.position.y = 6; dm.rotation.y = Math.PI / 2; dm.castShadow = dm.receiveShadow = true; haus.add(dm);
            haus.position.set(hx, 0, hz); scene.add(haus);
            // Zaun (Latten) und Hecke an der Grundstücksgrenze
            var zx = sd * (STR + 5.2);
            var zaun = new T.Mesh(new T.BoxGeometry(0.05, 0.9, 20), holz); zaun.position.set(zx, 0.6, hz); zaun.castShadow = true; scene.add(zaun);
            if (hn % 2) { var hk = new T.Mesh(new T.BoxGeometry(0.9, 1.2, 8), hecke); hk.position.set(zx + sd * 0.7, 0.6, hz + 5); hk.castShadow = hk.receiveShadow = true; scene.add(hk); }
          });
        }
        // Schild 50 am Anfang, Zebrastreifen mit Schild, Ampel
        function schild(text, x, z, rund) {
          var c = document.createElement('canvas'); c.width = c.height = 256; var g = c.getContext('2d');
          if (rund) { g.fillStyle = '#fff'; g.beginPath(); g.arc(128, 128, 124, 0, 7); g.fill(); g.strokeStyle = '#d7191c'; g.lineWidth = 30; g.beginPath(); g.arc(128, 128, 108, 0, 7); g.stroke(); g.fillStyle = '#111'; g.font = 'bold 110px Helvetica'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, 128, 136); }
          else { g.fillStyle = '#1f5fbf'; g.fillRect(8, 8, 240, 240); g.fillStyle = '#fff'; g.beginPath(); g.moveTo(128, 30); g.lineTo(230, 220); g.lineTo(26, 220); g.closePath(); g.fill(); g.fillStyle = '#111'; g.font = 'bold 60px Helvetica'; g.textAlign = 'center'; g.fillText('🚶', 128, 180); }
          var t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace;
          var tafel = new T.Mesh(new T.CircleGeometry(0.42, 32), std({ map: t, roughness: 0.5, side: T.DoubleSide })); if (!rund) tafel.geometry = new T.PlaneGeometry(0.75, 0.75);
          tafel.position.set(x, 2.3, z); tafel.rotation.y = 0; scene.add(tafel);
          var st = new T.Mesh(new T.CylinderGeometry(0.035, 0.035, 2.3), std({ color: 0x8a9399, metalness: 0.6, roughness: 0.4 })); st.position.set(x, 1.15, z - 0.03); st.castShadow = true; scene.add(st);
        }
        schild('50', STR + 0.9, -25, true);
        var ZEBRA = -360, AMPEL = -640;
        for (i = 0; i < 8; i++) { var zs = new T.Mesh(new T.PlaneGeometry(0.5, 4), weiss); zs.rotation.x = -Math.PI / 2; zs.rotation.z = Math.PI / 2; zs.position.set(-STR + 0.45 + i * 0.9, 0.012, ZEBRA); scene.add(zs); }
        schild('', STR + 0.9, ZEBRA + 8, false);
        // Ampel (rechts), drei Lampen
        var ampelLicht = {};
        (function () {
          var g0 = new T.Group(); g0.position.set(STR + 0.7, 0, AMPEL + 2);
          var st = new T.Mesh(new T.CylinderGeometry(0.07, 0.07, 3.2), std({ color: 0x3b4247, metalness: 0.5, roughness: 0.5 })); st.position.y = 1.6; st.castShadow = true; g0.add(st);
          var kasten = new T.Mesh(new T.BoxGeometry(0.34, 0.95, 0.3), std({ color: 0x1b1f22, roughness: 0.6 })); kasten.position.y = 3.6; kasten.castShadow = true; g0.add(kasten);
          ['rot', 'gelb', 'gruen'].forEach(function (f, k) { var m = std({ color: 0x222222, emissive: 0x000000, roughness: 0.3 }); var l = new T.Mesh(new T.CircleGeometry(0.1, 20), m); l.position.set(0, 3.9 - k * 0.3, 0.16); g0.add(l); ampelLicht[f] = m; });
          scene.add(g0);
          var hl = new T.Mesh(new T.PlaneGeometry(STR, 0.3), weiss); hl.rotation.x = -Math.PI / 2; hl.position.set(STR / 2, 0.012, AMPEL + 6); scene.add(hl);
        })();
        function ampelSetzen(f) { var farben = { rot: 0xff2a1a, gelb: 0xffb000, gruen: 0x2bd35a }; Object.keys(ampelLicht).forEach(function (k) { ampelLicht[k].emissive.setHex(k === f ? farben[k] : 0x000000); ampelLicht[k].emissiveIntensity = k === f ? 3 : 0; }); }
        ampelSetzen('gruen');
        // Fußgänger (einfache Figur)
        var person = new T.Group();
        (function () {
          var koerper = new T.Mesh(new T.CapsuleGeometry(0.2, 0.75, 4, 10), std({ color: 0x2f6fbf, roughness: 0.8 })); koerper.position.y = 1.05; koerper.castShadow = true; person.add(koerper);
          var kopfm = new T.Mesh(new T.SphereGeometry(0.13, 16, 12), std({ color: 0xe0b48c, roughness: 0.7 })); kopfm.position.y = 1.72; kopfm.castShadow = true; person.add(kopfm);
          [-0.1, 0.1].forEach(function (bx, k) { var bein = new T.Mesh(new T.CapsuleGeometry(0.075, 0.6, 4, 8), std({ color: 0x2b2f36 })); bein.position.set(bx, 0.42, 0); bein.castShadow = true; bein.name = 'bein' + k; person.add(bein); });
          person.position.set(STR + 1.6, 0.15, ZEBRA); person.rotation.y = -Math.PI / 2; scene.add(person);
        })();
        // Gegenverkehr: einfache Autos auf der linken Spur
        var gegen = [], gegenMat = [0xd64545, 0x3d6fd6, 0xe8eef2, 0x3a3f45, 0x2e9e62].map(function (c) { return std({ color: c, metalness: 0.4, roughness: 0.35 }); });
        function gegenAuto(z) {
          var a = new T.Group(), m = gegenMat[Math.floor(Math.random() * gegenMat.length)];
          var u = new T.Mesh(new T.BoxGeometry(1.8, 0.7, 4.3), m); u.position.y = 0.6; u.castShadow = true; a.add(u);
          var o = new T.Mesh(new T.BoxGeometry(1.6, 0.6, 2.2), std({ color: 0x1d2a33, metalness: 0.2, roughness: 0.15 })); o.position.set(0, 1.2, 0.2); a.add(o);
          [[-0.8, 1.4], [0.8, 1.4], [-0.8, -1.4], [0.8, -1.4]].forEach(function (rp) { var rr = new T.Mesh(new T.CylinderGeometry(0.33, 0.33, 0.24, 14), std({ color: 0x151719 })); rr.rotation.z = Math.PI / 2; rr.position.set(rp[0], 0.33, rp[1]); a.add(rr); });
          [-0.6, 0.6].forEach(function (lx) { var sw = new T.Mesh(new T.CircleGeometry(0.11, 12), std({ color: 0xffffff, emissive: 0xfff6dd, emissiveIntensity: 1.5 })); sw.position.set(lx, 0.7, 2.16); a.add(sw); });
          a.position.set(-STR / 2, 0, z); scene.add(a); gegen.push({ o: a, v: 45 + Math.random() * 6, vSoll: 48 });
        }

        /* ---------- Fahrzeug ---------- */
        var auto = new T.Group(), modell = gltf.scene;
        if (modell.parent) modell.parent.remove(modell);
        modell.position.set(0, 0, 0); modell.rotation.set(0, 0, 0); modell.scale.set(1, 1, 1);
        auto.add(modell); scene.add(auto); auto.updateMatrixWorld(true);
        var knoten = function (anfang) { var f = null; modell.traverse(function (o) { if (!f && o.name && o.name.indexOf(anfang) === 0) f = o; }); return f; };
        var airbag = knoten('Int_Airbag_Driver#'), sitz = knoten('Int_Airbag_Driver_Seat#'), lenk = knoten('INT_STEERING_WHEEL');
        var pAir = new T.Vector3(), pSitz = new T.Vector3(); if (airbag) airbag.getWorldPosition(pAir); if (sitz) sitz.getWorldPosition(pSitz);
        // Fahrtrichtung des Modells auf −Z drehen
        var vor = new T.Vector3().subVectors(pAir, pSitz); vor.y = 0; vor.normalize();
        // nur die Längsachse zählt (Lenkrad und Sitz liegen nicht exakt hintereinander): vorne = −Z, sonst um 180° drehen
        if (vor.z > 0) auto.rotation.y = Math.PI;
        auto.updateMatrixWorld(true);
        var box = new T.Box3().setFromObject(modell);
        modell.position.y -= box.min.y; auto.updateMatrixWorld(true);
        modell.traverse(function (o) { if (o.isMesh) { o.castShadow = q !== 'niedrig'; o.receiveShadow = q !== 'niedrig'; o.frustumCulled = true; } }); // Dach und Säulen werfen Schatten in den Innenraum
        if (airbag) airbag.getWorldPosition(pAir); if (sitz) sitz.getWorldPosition(pSitz);
        var mitte = new T.Box3().setFromObject(modell).getCenter(new T.Vector3());
        // Augenpunkt: hinter dem Lenkrad, etwas höher (Fahrersitz)
        var vorW = new T.Vector3(0, 0, -1), auge = pAir.clone().addScaledVector(vorW, -0.6); auge.y = pAir.y + 0.24;
        var augeLokal = auto.worldToLocal(auge.clone());
        cam.position.copy(augeLokal); auto.add(cam);
        cam.lookAt(auto.localToWorld(augeLokal.clone().add(new T.Vector3(0.05, -0.16, -3))));
        cam.rotation.set(cam.rotation.x, cam.rotation.y, cam.rotation.z);
        var spurX = STR / 2 + (mitte.x - pAir.x) * 0; // Fahrzeugmitte in der Spurmitte
        // Lenkrad um seine Mitte drehbar machen
        var lenkDreh = null, lenkAchse = new T.Vector3(0, 0, 1);
        if (lenk) {
          var lc = new T.Box3().setFromObject(lenk).getCenter(new T.Vector3()), piv = new T.Group();
          lenk.parent.add(piv); piv.position.copy(lenk.parent.worldToLocal(lc.clone())); piv.attach(lenk);
          var achseW = lc.clone().sub(auge).normalize(), inv = new T.Matrix4().copy(piv.parent.matrixWorld).invert();
          lenkAchse = achseW.clone().transformDirection(inv).normalize(); lenkDreh = piv;
        }
        // Kombi-Display: live Tempo, Limit, Punkte
        var display = null, dispC = document.createElement('canvas'); dispC.width = 1024; dispC.height = 512; var dg = dispC.getContext('2d');
        modell.traverse(function (o) { if (o.isMesh && o.material && /Screen_1/.test(o.material.name || '')) display = o; });
        var dispTex = new T.CanvasTexture(dispC); dispTex.colorSpace = T.SRGBColorSpace; dispTex.flipY = false;
        if (display) { var dm2 = display.material.clone(); dm2.map = dispTex; dm2.emissiveMap = dispTex; dm2.emissive = new T.Color(0xffffff); dm2.emissiveIntensity = 1.1; display.material = dm2; }
        // Innenspiegel: zweite Kamera, Bild auf einer Spiegelfläche über der Frontscheibe
        var rt = new T.WebGLRenderTarget(q === 'niedrig' ? 256 : 512, q === 'niedrig' ? 80 : 160), spiegelCam = new T.PerspectiveCamera(32, 512 / 160, 0.1, 600);
        var spiegel = new T.Mesh(new T.PlaneGeometry(0.27, 0.075), new T.MeshBasicMaterial({ map: rt.texture, toneMapped: false }));
        rt.texture.wrapS = T.RepeatWrapping; rt.texture.repeat.x = -1; rt.texture.offset.x = 1; // gespiegelt
        var rahmen = new T.Mesh(new T.BoxGeometry(0.29, 0.09, 0.02), std({ color: 0x15181b, roughness: 0.5 }));
        // Innenspiegel des Modells per Strahl vom Auge aus finden (Richtung: Mitte oben in der Frontscheibe)
        auto.updateMatrixWorld(true); cam.updateMatrixWorld(true);
        var ray = new T.Raycaster(), treffer = null, mitteLokal = auto.worldToLocal(mitte.clone());
        for (var sx = -0.05; sx <= 0.35 && !treffer; sx += 0.02) for (var sy = -0.05; sy <= 0.25 && !treffer; sy += 0.02) {
          ray.setFromCamera(new T.Vector2(sx, sy), cam);
          var hits = ray.intersectObject(modell, true);
          for (var hi = 0; hi < hits.length && hi < 2; hi++) { var hm = hits[hi]; if (hm.distance > 0.35 && hm.distance < 0.9) { var bx = new T.Box3().setFromObject(hm.object), gr = bx.getSize(new T.Vector3()); if (gr.x > 0.15 && gr.x < 0.4 && gr.y < 0.15) { treffer = { p: bx.getCenter(new T.Vector3()), b: gr.x, h: gr.y }; break; } } }
        }
        var spPos = treffer ? auto.worldToLocal(treffer.p.clone()) : augeLokal.clone().add(new T.Vector3(mitteLokal.x - augeLokal.x, 0.16, -0.55));
        if (!treffer) {
          // Spiegel ist Teil eines größeren Bauteils: Strahl vom Auge zur geschätzten Spiegelposition, erste Fläche = Spiegelglas
          var augeW = auto.localToWorld(augeLokal.clone()), zielW = auto.localToWorld(spPos.clone().add(new T.Vector3(-0.04, -0.075, -0.06)));
          ray.set(augeW, zielW.clone().sub(augeW).normalize());
          var h2 = ray.intersectObject(modell, true).filter(function (x) { return x.distance > 0.3 && x.distance < 1.2; })[0];
          if (h2) { spPos = auto.worldToLocal(h2.point.clone()); treffer = { p: h2.point, b: 0.25, h: 0.07, strahl: true }; }
        }
        var richtung = augeLokal.clone().sub(spPos).normalize();
        spPos.addScaledVector(richtung, 0.012); // knapp vor das Spiegelglas
        if (treffer && !treffer.strahl) spiegel.scale.set(treffer.b / 0.27 * 0.92, Math.max(0.6, treffer.h / 0.075 * 0.8), 1);
        rahmen.visible = !treffer;
        window.__f3dSpiegel = { treffer: treffer ? { b: treffer.b, h: treffer.h } : null, pos: spPos.toArray().map(function (x) { return Math.round(x * 1000) / 1000; }), auge: augeLokal.toArray().map(function (x) { return Math.round(x * 1000) / 1000; }), rot: auto.rotation.y };
        rahmen.position.copy(spPos); spiegel.position.copy(spPos);
        rahmen.lookAt(auto.localToWorld(augeLokal.clone())); spiegel.lookAt(auto.localToWorld(augeLokal.clone()));
        auto.add(rahmen); auto.add(spiegel);
        spiegelCam.position.copy(spPos); auto.add(spiegelCam); spiegelCam.rotation.set(0, 0, 0); spiegelCam.lookAt(auto.localToWorld(spPos.clone().add(new T.Vector3(0, -0.05, 5))));

        /* ---------- Fahren und Training ---------- */
        var v = 0, s = 0, quer = 0, querV = 0, gasP = 0, bremsP = 0, uhr = 0, punkte = 0, seitHalt = 0, zuSchnell = 0, warnAn = false;
        var tasten = HT.pfeilTasten(); aus.push(function () { if (tasten.entfernen) tasten.entfernen(); });
        var zebra = { aktiv: p.fussgaenger, laeuft: false, x: STR + 1.6, fertig: false, steh: 0 };
        var ampel = { aktiv: p.ampel, zustand: 'gruen', t: 0, fertig: false, steh: 0 };
        var naechstesGegen = 4, fpsT = 0, fpsN = 0;
        function zaehle(o) { if (!fertig) ctx.onEvent(o); }
        function ende(t) { if (fertig) return; fertig = true; if (t) meldung(t); if (ctx.onFinish) setTimeout(ctx.onFinish, 1200); }
        function displayMalen() {
          var g = dg, W2 = 1024, H2 = 512, zu = v > 53;
          g.fillStyle = '#05070a'; g.fillRect(0, 0, W2, H2);
          g.strokeStyle = 'rgba(255,255,255,.08)'; g.lineWidth = 26; g.beginPath(); g.arc(512, 290, 190, Math.PI * 0.75, Math.PI * 2.25); g.stroke();
          g.strokeStyle = zu ? '#ff3b30' : '#1BA8B5'; g.beginPath(); g.arc(512, 290, 190, Math.PI * 0.75, Math.PI * 0.75 + Math.PI * 1.5 * Math.min(1, v / 240)); g.stroke();
          g.fillStyle = zu ? '#ff5a4f' : '#ffffff'; g.font = '700 150px Helvetica'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(Math.round(v)), 512, 280);
          g.fillStyle = '#9aa7b0'; g.font = '500 40px Helvetica'; g.fillText('km/h', 512, 380);
          g.fillStyle = '#fff'; g.beginPath(); g.arc(840, 200, 70, 0, 7); g.fill(); g.strokeStyle = '#d7191c'; g.lineWidth = 16; g.beginPath(); g.arc(840, 200, 62, 0, 7); g.stroke(); g.fillStyle = '#111'; g.font = '800 64px Helvetica'; g.fillText('50', 840, 204);
          g.fillStyle = punkte < 0 ? '#ff8a80' : '#7fe3ec'; g.font = '700 42px Helvetica'; g.fillText('Punkte ' + punkte, 840, 330);
          g.fillStyle = '#9aa7b0'; g.font = '500 38px Helvetica'; g.fillText(Math.max(0, Math.round(L - 80 - s)) + ' m', 180, 220); g.fillText(Math.max(0, Math.round((p.dauerDurchgangSek || 120) - uhr)) + ' s', 180, 300);
          dispTex.needsUpdate = true;
        }
        function schritt(dt) {
          if (fertig) { renderer.render(scene, cam); return; }
          uhr += dt;
          var gas = tasten.hoch, bremse = tasten.runter;
          gasP += ((gas && !bremse ? 1 : 0) - gasP) * Math.min(1, dt * 4.5); bremsP += ((bremse ? 1 : 0) - bremsP) * Math.min(1, dt * 9);
          v += (gasP * 14 * (1 - v / 250) - bremsP * 38 - 0.5 - v * 0.004) * dt; if (v < 0) v = 0; if (v > 220) v = 220;
          s += v / 3.6 * dt;
          var lenkIn = (tasten.rechts ? 1 : 0) - (tasten.links ? 1 : 0);
          querV += ((lenkIn ? lenkIn * 1.6 * Math.min(1, v / 15) : -quer * 1.4) - querV) * Math.min(1, dt * 5); quer = HT.klemmen(quer + querV * dt, -2.6, 1.0);
          auto.position.set(spurX + quer - (mitte.x - auto.position.x) * 0, 0, -s);
          if (lenkDreh) lenkDreh.quaternion.setFromAxisAngle(lenkAchse, -querV * 0.9);
          // leichte Federung/Nicken beim Bremsen und Beschleunigen
          cam.rotation.x += ((bremsP * 0.015 - gasP * 0.008) - (cam.userData.nick || 0)) * Math.min(1, dt * 4); cam.userData.nick = bremsP * 0.015 - gasP * 0.008;
          // Sonne folgt dem Auto (Schattenbereich)
          sun.position.set(auto.position.x + sonne.x * 60, sonne.y * 60, auto.position.z + sonne.z * 60); sun.target.position.copy(auto.position);
          // Tempo 50: 5 s im Band +10, 5 s zu schnell −5, Warnung
          warnAn = v > 53;
          warn.className = 'f3d-warn' + (warnAn ? ' an' : ''); if (warnAn) warn.innerHTML = '<b>Achtung, zu schnell!</b><span>Hier gilt 50 km/h – Sie fahren ' + Math.round(v) + ' km/h.</span>';
          if (warnAn) { zuSchnell += dt; if (zuSchnell >= 5) { zuSchnell = 0; punkte -= 5; zaehle({ korrekt: false, reiz: 'tempo 50', reaktion: Math.round(v) + '', typ: 'tempo' }); } } else zuSchnell = 0;
          if (v > 8 && v >= 50 - p.band && v <= 53) { seitHalt += dt; if (seitHalt >= 5) { seitHalt = 0; punkte += 10; zaehle({ korrekt: true, reiz: 'tempo 50', reaktion: Math.round(v) + '', typ: 'tempo' }); } } else seitHalt = 0;
          // Zebrastreifen: Fußgänger geht los, wenn das Auto näher kommt
          var dz = -ZEBRA - s;
          if (zebra.aktiv && !zebra.fertig) {
            if (!zebra.laeuft && dz < 70 && dz > 10) { zebra.laeuft = true; meldung('Fußgänger am Zebrastreifen – anhalten.'); }
            if (zebra.laeuft) {
              zebra.x -= 1.35 * dt; person.position.x = zebra.x;
              var ph = uhr * 6; person.children.forEach(function (c) { if (c.name === 'bein0') c.rotation.x = Math.sin(ph) * 0.5; if (c.name === 'bein1') c.rotation.x = -Math.sin(ph) * 0.5; });
              if (v < 3 && dz < 25 && dz > 2) zebra.steh += dt;
              if (zebra.x < -STR - 1.4) { zebra.fertig = true; zebra.laeuft = false; if (zebra.steh > 0.5) { zaehle({ korrekt: true, reiz: 'fussgaenger', reaktion: 'angehalten', typ: 'fussgaenger' }); meldung('Richtig angehalten. Weiterfahren.'); } }
              if (dz < 1.5 && Math.abs(zebra.x - auto.position.x) < 1.3 && !zebra.fertig) { zaehle({ korrekt: false, auslassung: true, reiz: 'fussgaenger', reaktion: 'angefahren', typ: 'fussgaenger' }); zebra.fertig = true; ende('Ein Mensch wurde angefahren. Die Fahrt ist beendet.'); }
            }
            if (dz < -3 && !zebra.fertig) { zebra.fertig = true; zaehle({ korrekt: false, auslassung: true, reiz: 'fussgaenger', reaktion: 'durchgefahren', typ: 'fussgaenger' }); meldung('Am Zebrastreifen hätten Sie anhalten müssen.'); }
          }
          // Ampel: wird beim Heranfahren rot, nach dem Anhalten grün
          var da = -(AMPEL + 6) - s;
          if (ampel.aktiv && !ampel.fertig) {
            if (ampel.zustand === 'gruen' && da < 90 && da > 40) { ampel.zustand = 'gelb'; ampel.t = uhr; ampelSetzen('gelb'); }
            if (ampel.zustand === 'gelb' && uhr - ampel.t > 2.5) { ampel.zustand = 'rot'; ampel.t = uhr; ampelSetzen('rot'); }
            if (ampel.zustand === 'rot') { if (v < 2 && da < 20 && da > -1) ampel.steh += dt; if (ampel.steh > 2.5) { ampel.zustand = 'gruen'; ampelSetzen('gruen'); ampel.fertig = true; zaehle({ korrekt: true, reiz: 'ampel rot', reaktion: 'angehalten', typ: 'ampel' }); meldung('Grün – weiterfahren.'); } }
            if (da < -1 && ampel.zustand === 'rot') { ampel.fertig = true; zaehle({ korrekt: false, auslassung: true, reiz: 'ampel rot', reaktion: 'durchgefahren', typ: 'ampel' }); meldung('Rote Ampel überfahren.'); ampelSetzen('gruen'); }
          }
          // Gegenverkehr (hält an roter Ampel und am Zebrastreifen)
          if (p.gegenverkehr && uhr > naechstesGegen && s < L - 200) { gegenAuto(-s - 260); naechstesGegen = uhr + 7 + Math.random() * 7; }
          for (var gi = gegen.length - 1; gi >= 0; gi--) {
            var ga = gegen[gi], gz = ga.o.position.z, halt = null;
            if (ampel.zustand === 'rot' && gz < AMPEL - 6 && AMPEL - 6 - gz < 40) halt = AMPEL - 9;
            if (zebra.laeuft && gz < ZEBRA - 4 && ZEBRA - 4 - gz < 40) halt = ZEBRA - 6;
            if (halt !== null) ga.v = Math.max(0, Math.min(ga.v, (halt - gz) * 2.2)); else ga.v = Math.min(ga.vSoll, ga.v + 10 * dt);
            ga.o.position.z += ga.v / 3.6 * dt;
            if (ga.o.position.z > -s + 15) { scene.remove(ga.o); gegen.splice(gi, 1); }
          }
          if (Math.floor(uhr * 5) !== Math.floor((uhr - dt) * 5)) displayMalen();
          if (s > L - 80) ende('Strecke geschafft.');
          else if (uhr > (p.dauerDurchgangSek || 120)) ende('Die Zeit ist um.');
          // Spiegel (bei „Niedrig“ nur jedes dritte Bild)
          if (q !== 'niedrig' || (fpsN % 3 === 0)) { spiegel.visible = false; renderer.setRenderTarget(rt); renderer.render(scene, spiegelCam); renderer.setRenderTarget(null); spiegel.visible = true; }
          renderer.render(scene, cam);
          fpsT += dt; fpsN++;
          if (fpsT >= 1) { var fps = fpsN / fpsT; window.__f3dFps = Math.round(fps); if (p.leistung) fpsAnz.textContent = Math.round(fps) + ' FPS · ' + renderer.info.render.calls + ' Draw Calls · ' + Math.round(renderer.info.render.triangles / 1000) + 'k Dreiecke · ' + q; fpsT = 0; fpsN = 0; }
        }
        function groesse() { var b2 = voll.clientWidth, h2 = voll.clientHeight; if (!b2 || !h2) return; if (b2 !== b || h2 !== h) { b = b2; h = h2; renderer.setSize(b, h); cam.aspect = b / h; cam.updateProjectionMatrix(); } }
        welt = { scene: scene, schritt: function (dt) { groesse(); schritt(dt); } };
        displayMalen();
        renderer.render(scene, cam);
      }

      return {
        start: function () {
          laeuft = true;
          if (!webgl2()) { status.innerHTML = '<b>3D-Fahrsimulator nicht verfügbar</b><span>Dieser Browser unterstützt kein WebGL 2 (z. B. Safari 13). Bitte Google Chrome verwenden oder das Modul „Straßenverkehr“ wählen.</span>'; return; }
          vorbereiten(function (t) { status.textContent = t; }).then(function (gltf) {
            if (!laeuft) return;
            try { aufbauen(gltf); } catch (e) { console.error(e); status.innerHTML = '<b>3D-Szene konnte nicht aufgebaut werden</b><span>' + HT.esc(e.message || String(e)) + '</span>'; return; }
            status.style.display = 'none';
            frameId = Z.frame(function (dt) { if (welt) welt.schritt(dt); });
          }).catch(function (e) { status.innerHTML = '<b>3D-Fahrsimulator nicht verfügbar</b><span>' + HT.esc(e.message || String(e)) + '</span>'; });
        },
        stop: function () {
          laeuft = false; fertig = true;
          aus.forEach(function (f) { try { f(); } catch (e) { /* egal */ } });
          if (welt && GOLF && GOLF.scene.parent) GOLF.scene.parent.remove(GOLF.scene);
          if (renderer) { try { renderer.dispose(); renderer.forceContextLoss(); } catch (e) { /* egal */ } if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement); }
          welt = null; renderer = null;
        }
      };
    },
    preview: function (el) {
      var bild = function (v, zu) {
        return '<svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="h3" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8fc3e8"/><stop offset="1" stop-color="#e7f1f7"/></linearGradient></defs>' +
          '<rect width="400" height="170" fill="url(#h3)"/><rect y="150" width="400" height="150" fill="#6f9a4a"/><path d="M170 150 L230 150 L360 300 L40 300 Z" fill="#5a5e62"/><path d="M198 150 L202 150 L206 300 L194 300 Z" fill="#eee" opacity=".8"/>' +
          '<circle cx="80" cy="120" r="34" fill="#d98b2b"/><circle cx="320" cy="115" r="38" fill="#c7681f"/><rect x="40" y="100" width="40" height="50" fill="#efe6d6"/><path d="M36 100 L60 80 L84 100 Z" fill="#8a3a2a"/>' +
          '<path d="M0 230 Q200 190 400 230 L400 300 L0 300 Z" fill="#15181b"/><circle cx="200" cy="300" r="120" fill="none" stroke="#0d0f11" stroke-width="22"/>' +
          '<rect x="160" y="236" width="80" height="40" rx="8" fill="#05070a"/><text x="200" y="263" text-anchor="middle" font-size="22" font-weight="700" fill="' + (zu ? '#ff5a4f' : '#fff') + '" font-family="Helvetica">' + v + '</text>' +
          (zu ? '<rect x="110" y="40" width="180" height="32" rx="8" fill="#b2141a"/><text x="200" y="61" text-anchor="middle" font-size="14" font-weight="800" fill="#fff" font-family="Helvetica">Achtung, zu schnell!</text>' : '') + '</svg>';
      };
      return HT.beispiel(el, [{ svg: bild(32), text: 'Im 3D-Cockpit losfahren', dauer: 1200 }, { svg: bild(50), text: 'Tempo 50 halten', dauer: 1200 }, { svg: bild(61, true), text: 'Zu schnell: Warnung', dauer: 1200 }]);
    }
  });
})();

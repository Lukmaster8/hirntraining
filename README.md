# Hirntraining – kognitives Training für die Ergotherapie

Eigenständige Offline-Software für computergestütztes Hirnleistungstraining.
50 Trainingsmodule in 7 Bereichen, Patientenverwaltung, Trainingspläne, adaptive Levelsteuerung,
Auswertung mit Diagrammen und druckfertige Berichte. Alle Programmteile, Grafiken und Töne sind selbst erstellt.

* **Kein Internet, kein Server, keine Lizenzprüfung, keine Telemetrie.** Alle Daten bleiben auf dem Mac.
* Läuft auf **macOS 10.13 High Sierra** (Intel i7, Safari 13 oder Chrome 116) und auf **Apple Silicon (M1/M2)** mit aktuellem Safari oder Chrome.
* Bedienbar mit Maus, Tastatur und Touchscreen. Ab 1280 × 800 Pixeln, skaliert bis 4K.

---

## 1. Installation

1. Den Ordner **`Hirntraining`** auf den Mac kopieren, z. B. auf den Schreibtisch.
2. Es muss nichts installiert werden.

## 2. Starten

* Doppelklick auf **`Hirntraining starten`** (Programmsymbol im Ordner). Hirntraining öffnet sich als **eigenes Programmfenster im Vollbild** (Chrome im App-Modus, ohne Adressleiste, mit eigenem Profil `~/Library/Application Support/Hirntraining-Chrome`). Ohne Chrome öffnet sich Safari. Beenden mit cmd + Q, Vollbild umschalten mit cmd + ctrl + F. Immer über den Starter öffnen, denn ein normales Chrome-Fenster hat einen anderen Datenspeicher. Für den Schreibtisch: mit **cmd + alt** auf den Schreibtisch ziehen (Alias). Beim ersten Mal ggf. Rechtsklick → *Öffnen*. Die Kurzanleitung steht in **`LIESMICH – Start auf iMac und iPad.txt`**.
* Alternativ Doppelklick auf **`index.html`**. Die Datei öffnet sich im Standardbrowser.
* Empfehlung: Mit **Google Chrome** öffnen (Rechtsklick → *Öffnen mit* → *Google Chrome*). Chrome speichert die Daten am zuverlässigsten in der Datenbank (IndexedDB). Safari funktioniert ebenfalls. Unter `file://` nutzt Safari automatisch den Ersatzspeicher (localStorage), der kleiner ist.
* Für den Vollbildmodus auf **Vollbild** klicken. Der Knopf ist auf dem Startbildschirm und unten in der Seitenleiste. Beim Start einer Trainingssitzung schaltet das Programm selbst in den Vollbildmodus.
* Tipp: `index.html` im Browser als Lesezeichen speichern oder in das Dock ziehen.

### Erster Start
Ein Assistent fragt nach dem **Praxisnamen** und legt den **Administrator** mit Name und PIN an.
Auf Wunsch werden drei **Beispielpatienten** mit 4 Wochen simulierten Ergebnissen angelegt. Sie eignen sich gut zum Ausprobieren und können später gelöscht werden.

## 3. Bedienung im Überblick

### Startfenster (vertraute Aufteilung)
Nach der Anmeldung erscheint das **Startfenster**:
* **Links** die großen Schalter: **Therapeuten**, **Klienten**, **Module**, **Parameter**, **Ergebnisse** sowie unten **Hilfe**, **System** und **Schließen**.
* **Oben** die Auswahl **aktueller Therapeut** (ein Wechsel fragt nach der PIN) und **aktueller Klient**. Ein grüner Punkt kennzeichnet Klienten in Behandlung, ein grauer entlassene Klienten.
* **In der Mitte** die Reiter **Training** und **Screening**:
  * Training: links die *Gruppe* (Module des Klienten, alle Module, Bereiche), rechts die passenden *Module* mit Kürzel und aktuellem Level
  * Screening: Einstufungstest
  * Option „sortieren nach Nutzungshäufigkeit“
* **Unten** „Modul Non-Stop“ und **Start**. Ein Doppelklick auf ein Modul startet es ebenfalls.
* **Therapeuten sehen nur ihre eigenen Klienten**, Administratoren alle Klienten und Statistiken. Die Einstellung liegt unter *Verwaltung → Praxisdaten*.
* **Fenster:**
  * Therapeuten-Liste (Neu, Bearbeiten, Löschen, Wählen)
  * Klienten (sortieren nach Name, Geburtsdatum oder Aufnahme, Suchen, Entlassene Klienten, Datenschutz, Neu, Bearbeiten, Löschen, Export, Import, Wählen)
  * Klientendaten mit den Reitern Adresse, Kostenträger, Module, Akte, Vorgaben und Therapeuten
  * Module (Trainingseinheiten und Standardmodule, Standardparameter)
  * Parameter (für den aktuellen Klienten)
  * System
* Über „Übersicht & Statistik“ oben rechts geht es zur ausführlichen Ansicht mit Seitenleiste.

### Vorlesestimme (ElevenLabs)
Anleitungen, Befindensfragen, Lob, Pausenhinweis und die Ziffern der Zahlenspanne werden mit einer **natürlichen Vorlesestimme** abgespielt, wenn dafür Aufnahmen vorhanden sind. Die Systemstimme ist standardmäßig aus; unter *Einstellungen* lässt sie sich als Ersatz einschalten.

So erzeugen Sie die Aufnahmen (einmalig; dafür ist kurz Internet nötig, danach läuft alles offline):
1. In ElevenLabs die Stimme **Helmut** über den geteilten Link öffnen und „Add to my voices“ wählen, falls noch nicht geschehen.
2. Den eigenen API-Schlüssel bereithalten: elevenlabs.io → Profil → *API Keys*.
3. Doppelklick auf **`tools/Stimme erzeugen.command`** und den Schlüssel eingeben. Er wird nicht angezeigt und nicht gespeichert.
4. Das Skript erzeugt die MP3-Dateien im Ordner `audio/` und die Zuordnung in `data/sprachaudio.js`. Danach `index.html` neu laden.

**Stand:** 26 Aufnahmen sind enthalten (Stimme „Helmut“, 880 Credits): alle Befindensfragen, Pausenhinweis, Lob, Sitzungsende, Nachrichtenfrage, die Ziffern 0–9 und die Anleitungen von *Reaktion*, *Rechnen im Alltag*, *Kategorisieren* und *Zielklicken*. Alle übrigen Anleitungen werden ergänzt, sobald wieder Credits da sind: Skript erneut starten. Vorhandene Aufnahmen werden übersprungen. Kosten: etwa 0,5 bis 1 Credit pro Zeichen, je nach Tarif. Eine Vorschau ohne Kosten zeigt `python3 tools/stimme_erzeugen.py --probe`. Wenn sich Anleitungstexte ändern, bitte die betroffenen MP3-Dateien in `audio/` löschen und das Skript neu starten.

**Mitlesen:** Während vorgelesen wird, ist das gerade gesprochene Wort im angezeigten Text **blau hervorgehoben**. Die Zeitpunkte der Wörter berechnet das Skript beim Schreiben von `data/sprachaudio.js` aus den Sprechpausen der Aufnahme (`HT.SPRACHZEITEN`). Neu berechnen ohne Kosten: `python3 tools/stimme_erzeugen.py --nur-zuordnung`.

| Bereich | Inhalt |
|---|---|
| **Startbildschirm** | Kachel „Therapeut“ (Anmeldung mit PIN) oder „Patient starten“ (Patient wählt seinen Namen und trainiert seinen aktiven Plan) |
| **Übersicht** | heutige Sitzungen, zuletzt trainierte Patienten, Trainingsminuten, Status der Datensicherung |
| **Patienten** | Suche, Filter nach Therapeut und Archiv, Patientenakte mit Reitern *Stammdaten · Trainingsplan · Therapieziele · Verlauf · Berichte · Einstellungen* |
| **Modulbibliothek** | alle 56 Module mit laufender Vorschau-Animation, Beschreibung und Leveltabelle. Module lassen sich einzeln ein- und ausschalten und über „Training starten“ sofort ausprobieren (ohne Speichern) |
| **Auswertung** | Verlauf je Patient und Modul: Level, Trefferquote, Treffer/Fehler/Auslassungen, Reaktionszeit, Links-Rechts-Verteilung, Vergleich zweier Zeiträume |
| **Verwaltung** (nur Admin) | Therapeuten, Praxisdaten und Logo, Vorlagen, Schwellen der Levelsteuerung, Datensicherung, Testdaten, Daten löschen |
| **Einstellungen** | Farbschema (6 Varianten inkl. dunkel), Schriftgröße 100–160 %, hoher Kontrast, Ton, Lautstärke, Sprachausgabe, Pausenhinweis, Standarddauer |

### USB-Bedienpult (HASOMED RehaCom-Pult, USB-A)
Das RehaCom-Pult meldet sich am Mac und am iPad (über USB-Adapter) als **normale USB-Tastatur**. Hirntraining liest es deshalb in jedem Browser (Chrome und Safari), ohne Treiber. Andere Joysticks oder Gamepads werden nicht ausgelesen. Sobald eine Pult-Taste ankommt, meldet das Programm **„RehaCom-Pult erkannt“** (Browser dürfen Tastaturen nicht nach Namen auflisten).

* **Sofort ohne Einrichtung:** weiße Pfeiltasten, grüne OK-Tasten, Zifferntasten 0–9, Gelb „+“ = Anleitung noch einmal vorlesen, Rot „−“ = Pause/Therapeutenmenü.
* **Tasten genau anlernen:** Pult-Knopf oben im Startfenster → **„Tasten einrichten“**. Jede Taste drücken, wenn sie im Bild markiert ist: große grüne OK-Tasten, Gelb +, Rot −, die vier Pfeiltasten, die kleine Tastenreihe „OK 9 … 0 OK“, optional Fußtasten. Mit „Rest überspringen & speichern“ kann man vorzeitig abschließen. Schon belegte Tasten werden abgelehnt.
* **Belegungsprofil:** *Klassisch* (Gelb = Anleitung „+“, Rot = Pause „−“) oder *Ja/Nein* (Gelb = Ja/Bekannt, Rot = Nein/Neu). Module mit Ja/Nein-Antworten schalten automatisch um.
* Meldet sich ein Pult nicht als Tastatur, sondern als HID-Gerät: „Als USB-HID verbinden (Chrome)“. Danach wird nur genau dieses Gerät (gespeicherte VID/PID) automatisch geöffnet.

Im Arbeitsplatz wählen die Pfeile Gruppe und Modul, OK startet das Training. Zifferntasten gehen an laufende Module. „Protokoll drucken“ gibt die Belegung aus.

### iPhone, iPad und Online-Version (GitHub Pages)
Hirntraining läuft auch auf iPhone und iPad als App mit eigenem Icon auf dem Home-Bildschirm. Dafür braucht es eine Internetadresse. GitHub Pages ist kostenlos:

1. Auf **github.com** ein kostenloses Konto anlegen.
2. Oben rechts **„+“ → „New repository“**, Name `hirntraining`, **Public**, „Create repository“.
3. Auf der leeren Seite **„uploading an existing file“** klicken und den *Inhalt* des Ordners Hirntraining hineinziehen (alle Dateien und Ordner, nicht den Ordner selbst). GitHub nimmt höchstens 100 Dateien pro Durchgang. Deshalb zuerst den Ordner `modules` hochladen und „Commit changes“ drücken, danach den Rest.
4. **Settings → Pages**: unter „Branch“ `main` und `/ (root)` wählen, „Save“. Nach etwa einer Minute ist das Programm erreichbar unter `https://IHR-NAME.github.io/hirntraining/`.
5. Den Link per Mail an iPhone/iPad schicken, in **Safari** öffnen, **Teilen → „Zum Home-Bildschirm“**. Es erscheint das Hirntraining-Icon, und die App startet im Vollbild.

Gut zu wissen:
* Nach dem ersten Öffnen läuft die App **auch ohne Internet** (Offline-Speicher `sw.js`).
* **Patientendaten bleiben auf dem jeweiligen Gerät** und werden nie hochgeladen. Mac, iPad und iPhone haben deshalb getrennte Daten. Umziehen geht über *Datensicherung exportieren / importieren*.
* Der Programmcode ist öffentlich sichtbar, Patientendaten sind darin nicht enthalten.
* Das USB-Pult funktioniert auf iPhone/iPad nicht, denn iOS lässt keinen USB-Zugriff aus dem Browser zu.
* **Nach Programmänderungen** zuerst `python3 tools/offline_liste.py` ausführen und dann die geänderten Dateien erneut zu GitHub hochladen. Die Geräte holen sich die neue Version beim nächsten Öffnen mit Internet.

### Trainingssitzung
1. In der Patientenakte unter *Trainingsplan* einen Plan anlegen. Dafür eine Vorlage wählen, z. B. Aufmerksamkeit, Gedächtnis, Neglect oder Exekutivfunktionen, oder den Plan selbst zusammenstellen. Die Reihenfolge lässt sich per Drag & Drop oder mit den Pfeilknöpfen ändern. Für jedes Modul sind Dauer, Startlevel und Parameter einstellbar.
2. **Sitzung starten**: Für jedes Modul erscheint eine Anleitung mit animiertem Beispiel. Danach folgen eine Übung mit 3 Probeaufgaben ohne Wertung und das Training in Durchgängen von 1–3 Minuten. Nach jedem Durchgang wird das Level automatisch angepasst, nach jedem Modul gibt es eine Ergebnisseite mit Sternen.
3. **Pause** mit `Esc` oder dem Pauseknopf. Im Pausemenü lassen sich das Level manuell setzen, das Modul überspringen, die Sitzung unterbrechen (später fortsetzen) oder beenden. Teilergebnisse werden immer gespeichert.

### Therapeutische Werkzeuge
* **Einstufungstest** (*Trainingsplan → Einstufen*): Der Test steigt in jedem Modul des Plans schnell im Level auf (erst in großen, dann in kleinen Schritten). Sobald die Trefferquote unter 80 % fällt, endet die Einstufung dieses Moduls. Das letzte sicher gelöste Level wird als Startlevel übernommen.
* **Befinden vor und nach der Sitzung:** Mit einer Smiley-Skala von 1 bis 5 geben Patienten ihre Stimmung und Wachheit vor dem Training an, danach die erlebte Anstrengung und die Stimmung. Die Werte erscheinen in der Sitzungsliste, in der Verlaufszusammenfassung und im Bericht. Die Abfrage lässt sich unter *Einstellungen* abschalten.
* **Sitzungsnotizen:** Am Ende jeder Sitzung kann der Therapeut eine Notiz eintragen, nur für Therapeuten sichtbar. Sie lässt sich auch später in der Sitzungsliste bearbeiten.
* **Therapieziele** (eigener Reiter in der Patientenakte):
  * Ziele werden nach SMART-Kriterien formuliert, mit Formulierungshilfen je Bereich, optional mit ICF-Kode.
  * Ziele lassen sich mit einem Modul verknüpfen (Ziel-Level und/oder Ziel-Trefferquote). Der Fortschritt wird dann automatisch aus den Trainingsdaten berechnet.
  * Die Zielerreichung wird mit **Goal Attainment Scaling** bewertet (−2 bis +2). Daraus wird der GAS-T-Wert berechnet (50 = erwartete Zielerreichung).
* **Rückmeldung und Lernen** (*Patientenakte → Einstellungen*):
  * Wählbar ist die Rückmeldung nach jeder Antwort: Ton und Symbol, nur Symbol, nur Ton oder keine (z. B. bei Frustrationsneigung).
  * Optional ohne Fehlerton.
  * **Fehlerfreies Lernen:** Bei Auswahlaufgaben darf nach einem Fehler ein zweites Mal gewählt werden, mit freundlichem Hinweis. Gewertet wird der erste Versuch.
* **Therapeutische Einordnung je Modul** (Modulbibliothek → Modul): Indikation, ICF-Bezug, Hinweise für die Therapie und Alltagsbezug.
* **Automatische Verlaufszusammenfassung** im Reiter *Verlauf* und im Bericht. Sie beschreibt in Textform für jedes Modul die Levelentwicklung, die Veränderung von Trefferquote und Reaktionszeit, Seitenunterschiede (Neglect), das Befinden und den Stand der Therapieziele.

### Praxisfunktionen
* **Therapeutenmenü im Training** (`Esc`):
  * zeigt Modul, Durchgang, Sitzungsdauer und effektive Trainingszeit
  * Level ändern, Neustart mit oder ohne Anleitung
  * **Parameter während des Trainings** ändern (Dauer, modulspezifische Einstellungen)
  * Zwischenergebnisse ansehen, „Anleitung noch einmal“, Modul überspringen, unterbrechen, beenden
  * Taste `+` liest die Anleitung erneut vor, Taste `−` pausiert
* **Anleitung automatisch:** Die ausführliche Anleitung erscheint nur in den ersten beiden Sitzungen eines Moduls. Pro Planeintrag lässt sich auch „Immer“ oder „Nie“ wählen.
* **Non-Stop** (Option im Plan): Der Patient arbeitet ohne Zwischenbildschirme durch.
* **Wochenplan / Therapievorgaben** (Reiter *Trainingsplan*):
  * Stundenplan pro Woche; je Tag ein Plan oder ein Einzelmodul
  * Startlevel, Anleitung, „Wiederholung erlaubt“, persönliche Hinweise vor und nach dem Training
  * Vorgaben für mehrere Wochentage und Wochen auf einmal anlegen
  * Erledigte Vorgaben werden grün markiert
  * **Erweiterter Patientenmodus:** Der aktive Plan darf auch an Tagen ohne Vorgabe trainiert werden.
* **Patientenmodus mit Tagesübersicht:**
  * Patienten sehen „Ihre Übungen für heute“, optional nach Anmeldung mit persönlicher PIN.
  * Nach dem Training können sie eine **Nachricht an den Therapeuten** hinterlassen. Sie erscheint in der Übersicht und im Plan-Reiter.
* **Patientendaten:**
  * Kostenträger, Versichertennummer, Verordnung, verordnende Ärztin oder verordnender Arzt
  * Behandlungsbeginn und -ende: Patienten mit Behandlungsende erscheinen unter „Entlassen“, ihre Daten bleiben erhalten.
  * Vertretungstherapeut
  * Datenschutzansicht mit gekürzten Nachnamen; optional sehen Therapeuten nur eigene Patienten
  * **Einzelne Patienten exportieren und importieren**, z. B. für die Übergabe an einen anderen Mac
* **Sitzungsanalyse** (Reiter *Verlauf*):
  * Je Sitzung: Level zu Beginn, am Ende und Maximum, Sitzungsdauer, effektive und kumulative Trainingszeit, Pausen, Therapeut
  * Je Durchgang: Diagramm mit wählbarer Messgröße (Balken oder Linie) und Parameter-Einsicht
  * **Levelverlauf für Patienten drucken**, für Kinder unter 14 mit Smileys
  * Auswertung der Selbsteinschätzung
* **Leistungsbericht für Kostenträger:** Module, Beginn und Ende, Sitzungen, effektive Trainingszeit und erreichtes Level. Welche Kostenträgerdaten erscheinen, ist wählbar.
* **Arztbrief mit Textbausteinen** (*Verwaltung → Berichtsvorlagen*): drei Textbausteine mit Platzhaltern wie `{{name}}`, `{{zeitraum}}`, `{{sitzungen}}` und `{{quote}}`, die automatisch ausgefüllt werden.
* **Modulbibliothek:** nach Bereichen, alphabetisch oder **nach Nutzungshäufigkeit** sortiert, mit Verfahrenskürzeln.
* **Bildschirmgeometrie** (*Einstellungen*): Bildschirmbreite und Sitzabstand. Das Gesichtsfeldtraining zeigt damit die Exzentrizität der Reize in Grad.
* **Hilfe** direkt im Programm (Seitenleiste → Hilfe).

### Patientenmodus
Mit **Patientenmodus** in der Akte oder **Patient starten** auf dem Startbildschirm trainiert der Patient selbstständig. Die Menüs sind dann gesperrt.
Patientinnen und Patienten kommen jederzeit über den Knopf **„Menü“** oben links zurück zu ihrer Übersicht (bisherige Ergebnisse bleiben gespeichert). Das Therapeutenmenü (Level, Parameter, Sitzung verwalten) öffnet sich nur mit einer **Therapeuten-PIN**: Tastenkombination **Strg + Alt + P**, **die Ecke oben links 1,5 Sekunden gedrückt halten** oder **den Pauseknopf lange drücken**.

### Adaptive Levelsteuerung
* Trefferquote = Treffer / (Treffer + Fehler + Auslassungen)
* Quote ≥ *Aufstufen ab* (Standard 85 %) in **zwei Durchgängen hintereinander** → Level +1
* Quote < *Abstufen unter* (Standard 60 %) → Level −1
* Ist die mittlere Reaktionszeit um mehr als 30 % langsamer als im Mittel der letzten 3 Durchgänge, wird nicht aufgestuft.
* Die Schwellen sind je Modul unter *Verwaltung → Modul-Schwellen* einstellbar. Das Level lässt sich je Patient manuell setzen und die Automatik pro Modul abschalten (*Patientenakte → Einstellungen*).

### Berichte und Export
* *Patientenakte → Berichte → Bericht öffnen*: Druckansicht A4 mit Logo, Patientendaten (auf Wunsch pseudonymisiert), Zeitraum, automatischer Verlaufszusammenfassung, Therapiezielen mit GAS-Bewertung, Plan, Ergebnissen je Modul mit ICF-Bezug, Diagrammen, Sitzungen mit Befinden und Notizen sowie Kommentar. Mit **Drucken / PDF** und im Druckdialog **„Als PDF sichern“** entsteht eine PDF-Datei.
* **CSV-Export** (Semikolon, UTF-8 mit BOM, öffnet direkt in Excel/Numbers): Durchgänge oder Rohdaten (jeder Reiz und jede Reaktion).

## 4. Datensicherung – bitte regelmäßig!

Die Daten liegen **im Profil des Browsers** auf diesem Mac. Deshalb gilt:

* **Immer denselben Browser verwenden.** Chrome und Safari haben getrennte Daten.
* **Regelmäßig sichern:** *Verwaltung → Datensicherung → Jetzt sichern*. Die Sicherung wird mit einem **Sicherungspasswort verschlüsselt** (AES-GCM, Schlüssel per PBKDF2) und als `hirntraining-sicherung-JJJJ-MM-TT.htsich` heruntergeladen. Das Passwort wird nirgends gespeichert – bitte sicher notieren.
* Sicherungen **nicht in Cloud-Ordnern** (Google Drive, iCloud, Dropbox) ablegen, sondern z. B. auf einem USB-Stick, der in der Praxis verschlossen aufbewahrt wird.
* Das Programm erinnert nach **7 Tagen** ohne Sicherung (Status-Chip oben im Arbeitsplatz). Der Zeitraum ist einstellbar.
* Wer im Browser „Verlauf / Websitedaten löschen“ wählt, löscht auch die Trainingsdaten. Vorher sichern!

**Wiederherstellen:** *Verwaltung → Datensicherung → Sicherung einspielen …*, Datei wählen und das Passwort eingeben. Ältere, unverschlüsselte JSON-Sicherungen werden mit einem Warnhinweis weiterhin eingelesen. Dabei werden die vorhandenen Daten ersetzt.

**ZIP des Programms:** Nach Änderungen am Programm `python3 tools/zip_erstellen.py` ausführen – das erzeugt `Hirntraining.zip` (ohne Sicherungen und Entwicklerdateien).

### Datenschutz in der Praxis
* **Datentresor:** Klientendaten, Pläne, Sitzungen und Ergebnisse werden im Browser **verschlüsselt** gespeichert (AES-256-GCM). Der Schlüssel ist für jeden Zugang mit dessen PIN geschützt (PBKDF2-SHA256, 150 000 Runden) und liegt nur nach der Anmeldung im Arbeitsspeicher. Nach Abmelden oder Neuladen sind die Daten gesperrt; der Patientenstart verlangt dann einmal eine Therapeuten-PIN. Bestehende Daten werden bei der ersten Anmeldung nach dem Update automatisch verschlüsselt. Zugänge, die vor dem Tresor angelegt wurden, brauchen einmal die Freigabe durch jemanden mit Zugriff. Status: *Verwaltung → Datenschutz*.
* **Wo liegen die Daten?** Nicht im Programmordner, sondern im Speicher des jeweiligen Browsers auf diesem Gerät (Chrome und Safari getrennt). Sicherungen (`.htsich`, mit Passwort verschlüsselt) landen im Ordner *Downloads*.
* **Mac-Benutzerkonto mit Passwort** und **FileVault** (Festplattenverschlüsselung) einschalten.
* Für Hirntraining ein **eigenes Browser-Profil** verwenden (keine Erweiterungen, keine Synchronisation).
* **PINs** werden nur als PBKDF2-Hash (150 000 Runden, zufälliges Salz) gespeichert; ältere PINs werden bei der nächsten Anmeldung automatisch umgestellt. Nach 5 Fehlversuchen gibt es eine Wartezeit (30 s, steigend).
* **Automatische Sperre** nach Inaktivität (5/10/15/30 min, Standard 10) – nie während eines laufenden Trainings. Sofort sperren: **Strg + Alt + L**. Der Sperrbildschirm zeigt keine Patientendaten.
* **Löschkonzept:** *Verwaltung → Datenschutz*: Aufbewahrungsfrist (Standard 10 Jahre nach Behandlungsende), Liste „Frist abgelaufen“ mit endgültigem Löschen. Ein **Protokoll** (nur Datum, Aktion, Therapeuten-Kürzel, Pseudonym) hält Export, Import, Löschen und Bericht drucken fest.
* **Online-Version (GitHub Pages):** Alle Seiten unter `name.github.io` teilen sich im Browser denselben Speicher. Für echte Patientendaten die lokale Version (index.html auf dem Praxis-Mac) verwenden.

## 5. Umzug auf einen anderen Mac

1. Auf dem alten Mac eine Sicherung erstellen (siehe oben).
2. Den Ordner `Hirntraining` und die Sicherungsdatei auf den neuen Mac kopieren (USB-Stick, AirDrop).
3. Auf dem neuen Mac `index.html` öffnen. Der Einrichtungsassistent erscheint. Einen vorläufigen Administrator anlegen, dann *Verwaltung → Datensicherung → Sicherung einspielen* wählen.
4. Danach melden Sie sich mit den bisherigen Namen und PINs an.

Mehrere Macs teilen sich **keine** gemeinsame Datenbank. Jeder Mac hat seinen eigenen Datenbestand. Für einen Abgleich auf dem einen Mac eine Sicherung erstellen und auf dem anderen einspielen.

## 6. Ein neues Modul anlegen

1. Ordner `modules/<modul-id>/` anlegen und darin `module.js` erstellen (Vorlage siehe unten oder ein vorhandenes Modul kopieren, z. B. `modules/reaktion/module.js`).
2. Die `id` in **`modules/liste.js`** eintragen. Die Reihenfolge dort bestimmt die Anzeige innerhalb der Kategorie.
3. `index.html` neu laden. Das Modul erscheint in der Bibliothek und kann in Pläne aufgenommen werden.

```js
HT.registerModule({
  id: 'mein-modul',                    // = Ordnername
  name: 'Mein Modul',
  kategorie: 'aufmerksamkeit',         // aufmerksamkeit | gedaechtnis | wahrnehmung | raeumlich | exekutiv | sprache | visuomotorik
  ziel: 'Kurze Beschreibung des Trainingsziels',
  beschreibung: 'Ausführliche Beschreibung für Therapeuten',
  anleitung: 'Anleitungstext für Patienten (wird groß angezeigt und auf Wunsch vorgelesen)',
  eingabe: ['tastatur', 'maus', 'touch'],
  tasten: ['ok'],                      // große Bildschirmtasten für Touch-Patienten
  levels: HT.stufen(12, function (t, i) { return { tempoMs: HT.lerpInt(2000, 600, t) }; }), // 10–20 Level
  levelLabels: { tempoMs: 'Tempo (ms)' },
  parameterSchema: { /* zusätzliche Einstellungen je Planeintrag */ },
  bewertung: { aufstufenAb: 0.85, abstufenUnter: 0.6 },
  create: function (container, ctx) {
    // ctx.level, ctx.params (Levelparameter), ctx.audio, ctx.onEvent(ev), ctx.onFinish(),
    // ctx.feedback(richtig, x, y), ctx.patientSettings, ctx.patient.betroffeneSeite …
    // Zeitgeber immer über HT.zeit.nach / HT.zeit.intervall / HT.zeit.frame → Pause funktioniert automatisch.
    // Ereignis je Reiz: ctx.onEvent({ korrekt: true|false, auslassung: bool, rtMs, seite: 'links'|'rechts', reiz, reaktion })
    return { start: function () {}, pause: function () {}, resume: function () {}, stop: function () {} };
  },
  preview: function (el) { return HT.beispiel(el, [ /* { svg, zeiger:[x%,y%], klick, text, dauer } */ ]); }
});
```

Weitere Hilfen für Module: `HT.quiz` für Auswahlaufgaben, `HT.tastenFokus` für die Tastaturbedienung, `HT.m.wahl` für Antwortknöpfe, `HT.zeigerFolgen` für Maus und Touch, `HT.bild(id)` für die 82 Alltagsbilder und `HT.formSvg(form, farbe)` für Formen. Details stehen in `docs/ENTWICKLUNG.md`.

## 7. Ordnerstruktur

```
Hirntraining/
  index.html          Einstieg, lädt alle Skripte
  README.md           diese Anleitung
  css/                base · layout · components · training · print
  core/               app, storage, auth, patients, plans, session, adaptive, results,
                      charts, reports, audio, ui, i18n, moduleApi, admin, library, exploration, testdata, util
  modules/            50 Modulordner + liste.js
  data/               bilder.js (82 SVG-Objekte), woerter.js (>300 Wörter), texte.js, alltag.js, formen.js
  assets/icons.js     eigene SVG-Icons
  docs/               Entwickler-Dokumentation, Modulübersicht
```

## 8. Modulkatalog (56 Module)

Dazu die **Screening-Batterie** (Arbeitsplatz, Reiter „Screening“): Reaktion einfach und mit Warnton, geteilte Aufmerksamkeit, selektive Suche (Zahlenfeld 1–25), Zahlenspanne vorwärts/rückwärts, Wortgedächtnis, logisches Denken und Gesichtsfeld-Kurzcheck – feste Parameter, Vergleich mit dem eigenen ersten Screening, Trainingsempfehlungen, Druckseite „Screening-Verlauf“. **Kein Diagnostikum.** Planvorlagen „Beruflich“ und „Frühphase / Aktivierung“ sind neu.

**Aufmerksamkeit:** Reagieren nach Regel (Go/No-Go mit Regelwechsel) · Reaktion (Alertness) · Wahlreaktion · Daueraufmerksamkeit · Vigilanz · Selektive Aufmerksamkeit · Geteilte Aufmerksamkeit · Hörtraining · Straßenverkehr (Cockpit-Fahrt: Tempo im grünen Band, Ampeln, Fußgänger, Stopp, Hindernisse, Bahnübergang, Abbiegen, Kontrollleuchten, Durchsagen, Polizei im Spiegel) · Alarm Straße (plötzliche Gefahr – sofort OK) · Zahlenfeld
**Gedächtnis:** Arbeitsgedächtnis Folgen · Zahlenspanne · Bilder wiedererkennen · Wortlisten · Memory · Wege merken · Alltagsgedächtnis · Einkaufen · Geschichten merken · Wort-Bild-Paare · Personen merken · Spielkarten merken · Alltagsszenen beobachten · Telefonnotizen
**Wahrnehmung & Neglect:** Visuelle Exploration · Neglect-Training · Gesichtsfeldtraining · Sakkadentraining · Lesetraining · Formen unterscheiden · Figur-Grund
**Räumliches Denken:** Richtungen · Mentale Rotation 2D · Mentale Rotation 3D · Muster nachbauen · Räume erkunden (Ich-Perspektive im Gebäude)
**Exekutivfunktionen:** Reihen fortsetzen · Regeln erkennen und wechseln · Turm-Aufgabe · Handlungsplanung · Tagesplanung · Kategorisieren · Büroaufgaben · Ausflug planen · Lager und Bestellungen
**Rechnen & Sprache:** Rechnen im Alltag · Uhrzeit · Zahlen und Mengen · Wortfindung · Buchstaben- und Wortsuche · Textverständnis · Denksport (Aktivierung)
**Visuomotorik:** Zielklicken · Spur nachfahren · Labyrinth · Verfolgen

## 9. Hinweise und Problemlösung

* **Ton fehlt:** Lautstärke des Macs prüfen und unter *Einstellungen → Ton* testen. Safari gibt Töne erst nach dem ersten Klick frei.
* **Vorlesen:** Es werden die mitgelieferten Aufnahmen in `audio/` abgespielt. Die Systemstimme dient nur als Ersatz, wenn das in den Einstellungen eingeschaltet ist.
* **Neglect- und Gesichtsfeldtraining:** Die betroffene Seite wird aus der Patientenakte übernommen. Für den Hinweiston von der betroffenen Seite sind Kopfhörer oder Stereo-Lautsprecher sinnvoll.
* **Leere Seite:** Mit `⌥ ⌘ I` (Chrome) bzw. *Entwickler → Webinformationen* (Safari) die Konsole öffnen und die Meldung notieren. JavaScript muss aktiviert sein.
* Das Programm ersetzt keine Diagnostik. Die Messwerte dienen der Verlaufsbeobachtung im Training.

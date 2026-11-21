#!/bin/bash
# Doppelklick: erzeugt die Vorlesestimme mit ElevenLabs (fragt nach dem API-Schlüssel).
cd "$(dirname "$0")/.." || exit 1
PY="$(command -v python3 || command -v python)"
"$PY" tools/stimme_erzeugen.py "$@"
echo
read -n 1 -s -r -p "Fertig – beliebige Taste zum Schließen …"

#!/bin/bash
# Baut modules/fahrsimulator-3d/three-bundle.js (Three.js r170 + GLTFLoader + Sky), Ziel ES2017, eine Datei, offline nutzbar.
cd "$(dirname "$0")"
./node_modules/.bin/esbuild eintrag.js --bundle --minify --format=iife --target=es2017 --legal-comments=eof --outfile=../../modules/fahrsimulator-3d/three-bundle.js

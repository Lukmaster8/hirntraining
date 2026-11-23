// Bündel-Einstieg: Three.js + benötigte Zusatzteile → window.HT3D (klassisches Skript, kein Modul)
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Sky } from 'three/examples/jsm/objects/Sky.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
window.HT3D = { THREE: THREE, GLTFLoader: GLTFLoader, Sky: Sky, mergeGeometries: mergeGeometries };

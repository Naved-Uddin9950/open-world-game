// ============================================================
// skySystem.js — Procedural gradient sky dome
// ============================================================
import * as THREE from 'three';
import { lerp } from '../utils/math.js';

// Vertex shader — pass UV and position to fragment
const skyVert = /* glsl */`
varying vec3 vWorldPosition;
void main() {
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPos.xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

// Fragment shader — gradient from horizon to zenith
const skyFrag = /* glsl */`
uniform vec3 uSkyTop;
uniform vec3 uSkyBottom;
uniform vec3 uHorizon;
uniform float uSunAltitude;
varying vec3 vWorldPosition;

void main() {
    vec3 dir = normalize(vWorldPosition);
    float h = dir.y;

    // Sky gradient
    vec3 color;
    if (h > 0.0) {
        color = mix(uHorizon, uSkyTop, pow(h, 0.6));
    } else {
        color = mix(uHorizon, uSkyBottom, pow(-h, 0.4));
    }

    // Subtle sun glow near horizon at dawn/dusk
    float sunGlow = max(0.0, 1.0 - abs(h) * 4.0) * max(0.0, 0.3 - abs(uSunAltitude));
    color += vec3(1.0, 0.5, 0.2) * sunGlow * 2.0;

    gl_FragColor = vec4(color, 1.0);
}
`;

export class SkySystem {
    /**
     * @param {THREE.Scene} scene
     */
    constructor(scene) {
        const geometry = new THREE.SphereGeometry(500, 16, 16);

        this.material = new THREE.ShaderMaterial({
            vertexShader: skyVert,
            fragmentShader: skyFrag,
            uniforms: {
                uSkyTop: { value: new THREE.Color(0x1a6baa) },
                uSkyBottom: { value: new THREE.Color(0x3a5f0b) },
                uHorizon: { value: new THREE.Color(0xc8d6e5) },
                uSunAltitude: { value: 0.5 },
            },
            side: THREE.BackSide,
            depthWrite: false,
        });

        this.mesh = new THREE.Mesh(geometry, this.material);
        this.mesh.name = 'sky';
        this.mesh.renderOrder = -1;

        scene.add(this.mesh);

        // Colour presets
        this._palettes = {
            day: { top: new THREE.Color(0x1a6baa), horizon: new THREE.Color(0xaad4f5), bottom: new THREE.Color(0x4a8c3f) },
            dawn: { top: new THREE.Color(0x2a3a6b), horizon: new THREE.Color(0xff9944), bottom: new THREE.Color(0x3a4f2b) },
            night: { top: new THREE.Color(0x0a0a20), horizon: new THREE.Color(0x151530), bottom: new THREE.Color(0x0a0a15) },
        };

        this._tmpTop = new THREE.Color();
        this._tmpHorizon = new THREE.Color();
        this._tmpBottom = new THREE.Color();
    }

    /**
     * @param {import('./timeSystem.js').TimeSystem} time
     */
    update(time) {
        const alt = time.sunAltitude;
        const u = this.material.uniforms;

        if (alt > 0.15) {
            // Day
            this._tmpTop.copy(this._palettes.day.top);
            this._tmpHorizon.copy(this._palettes.day.horizon);
            this._tmpBottom.copy(this._palettes.day.bottom);
        } else if (alt > -0.05) {
            // Dawn / dusk transition
            const t = (alt + 0.05) / 0.2;
            this._tmpTop.lerpColors(this._palettes.night.top, this._palettes.dawn.top, t);
            this._tmpHorizon.lerpColors(this._palettes.night.horizon, this._palettes.dawn.horizon, t);
            this._tmpBottom.lerpColors(this._palettes.night.bottom, this._palettes.dawn.bottom, t);
        } else {
            // Night
            this._tmpTop.copy(this._palettes.night.top);
            this._tmpHorizon.copy(this._palettes.night.horizon);
            this._tmpBottom.copy(this._palettes.night.bottom);
        }

        u.uSkyTop.value.copy(this._tmpTop);
        u.uHorizon.value.copy(this._tmpHorizon);
        u.uSkyBottom.value.copy(this._tmpBottom);
        u.uSunAltitude.value = alt;
    }

    /** Follow camera so sky dome is always centred. */
    followCamera(cameraPosition) {
        this.mesh.position.copy(cameraPosition);
    }
}

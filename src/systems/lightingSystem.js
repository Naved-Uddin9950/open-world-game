// ============================================================
// lightingSystem.js — Sun + ambient light driven by TimeSystem
// ============================================================
import * as THREE from 'three';
import {
    SHADOW_MAP_SIZE,
    SHADOW_CAMERA_SIZE,
    SHADOW_NEAR,
    SHADOW_FAR,
} from '../utils/constants.js';
import { lerp } from '../utils/math.js';

export class LightingSystem {
    /**
     * @param {THREE.Scene} scene
     */
    constructor(scene) {
        // ── Directional (sun) light ─────────────────────────
        this.sun = new THREE.DirectionalLight(0xfff4e6, 1.5);
        this.sun.name = 'sun';
        this.sun.castShadow = true;
        this.sun.position.set(50, 80, 30);

        // Shadow camera — small frustum for performance
        const s = SHADOW_CAMERA_SIZE;
        this.sun.shadow.camera.left = -s;
        this.sun.shadow.camera.right = s;
        this.sun.shadow.camera.top = s;
        this.sun.shadow.camera.bottom = -s;
        this.sun.shadow.camera.near = SHADOW_NEAR;
        this.sun.shadow.camera.far = SHADOW_FAR;
        this.sun.shadow.mapSize.set(SHADOW_MAP_SIZE, SHADOW_MAP_SIZE);
        this.sun.shadow.bias = -0.0005;
        this.sun.shadow.normalBias = 0.02;

        // ── Ambient light ───────────────────────────────────
        this.ambient = new THREE.AmbientLight(0x99bbdd, 0.4);
        this.ambient.name = 'ambient';

        // ── Hemisphere light for ground-bounce fill ─────────
        this.hemisphere = new THREE.HemisphereLight(0x87ceeb, 0x3a5f0b, 0.3);
        this.hemisphere.name = 'hemisphere';

        scene.add(this.sun);
        scene.add(this.ambient);
        scene.add(this.hemisphere);

        // Colour palette keyed to sun altitude
        this._sunColors = {
            dawn: new THREE.Color(0xff7744),
            day: new THREE.Color(0xfff4e6),
            dusk: new THREE.Color(0xff5533),
            night: new THREE.Color(0x222244),
        };
        this._tmpColor = new THREE.Color();
    }

    /**
     * @param {import('./timeSystem.js').TimeSystem} time
     * @param {THREE.Vector3} playerPos  Follow player for shadow camera
     */
    update(time, playerPos) {
        const alt = time.sunAltitude;  // -1 … 1

        // ── Sun position ────────────────────────────────────
        const angle = ((time.hour - 6) / 12) * Math.PI;
        const dist = 100;
        this.sun.position.set(
            Math.cos(angle) * dist,
            Math.sin(angle) * dist,
            30,
        );

        // Shadow camera follows player
        if (playerPos) {
            this.sun.target.position.copy(playerPos);
            this.sun.target.updateMatrixWorld();
        }

        // ── Sun colour + intensity ──────────────────────────
        if (alt > 0.15) {
            this._tmpColor.copy(this._sunColors.day);
            this.sun.intensity = lerp(0.8, 1.5, alt);
        } else if (alt > 0) {
            this._tmpColor.lerpColors(this._sunColors.dawn, this._sunColors.day, alt / 0.15);
            this.sun.intensity = lerp(0.3, 0.8, alt / 0.15);
        } else {
            this._tmpColor.copy(this._sunColors.night);
            this.sun.intensity = 0.05;
        }
        this.sun.color.copy(this._tmpColor);

        // ── Ambient ─────────────────────────────────────────
        this.ambient.intensity = lerp(0.1, 0.4, Math.max(0, alt));
    }
}

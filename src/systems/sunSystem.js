// ============================================================
// sunSystem.js — Realistic sun positioning
// ============================================================
import * as THREE from 'three';

export class SunSystem {
    constructor(scene) {
        this.sun = new THREE.DirectionalLight(0xfff4e6, 1.5);
        this.sun.castShadow = true;
        this.sun.shadow.mapSize.set(1024, 1024);
        this.sun.shadow.camera.left = -60;
        this.sun.shadow.camera.right = 60;
        this.sun.shadow.camera.top = 60;
        this.sun.shadow.camera.bottom = -60;
        this.sun.shadow.camera.near = 0.5;
        this.sun.shadow.camera.far = 200;
        this.sun.shadow.bias = -0.0005;
        this.sun.shadow.normalBias = 0.02;

        this.ambient = new THREE.AmbientLight(0x99bbdd, 0.4);
        this.hemisphere = new THREE.HemisphereLight(0x87ceeb, 0x3a5f0b, 0.3);

        scene.add(this.sun);
        scene.add(this.ambient);
        scene.add(this.hemisphere);

        this._colors = {
            dawn: new THREE.Color(0xff7744),
            day: new THREE.Color(0xfff4e6),
            night: new THREE.Color(0x222244)
        };
        this._tmp = new THREE.Color();
    }

    update(time, playerPos) {
        const alt = time.sunAltitude;
        const angle = ((time.hour - 6) / 12) * Math.PI;
        
        this.sun.position.set(Math.cos(angle) * 100, Math.sin(angle) * 100, 30);
        
        if (playerPos) {
            this.sun.target.position.copy(playerPos);
            this.sun.target.updateMatrixWorld();
        }

        if (alt > 0.15) {
            this._tmp.copy(this._colors.day);
            this.sun.intensity = 1.2 + alt * 0.3;
        } else if (alt > -0.05) {
            const t = (alt + 0.05) / 0.2;
            this._tmp.lerpColors(this._colors.night, this._colors.dawn, t);
            this.sun.intensity = 0.05 + t * 0.5;
        } else {
            this._tmp.copy(this._colors.night);
            this.sun.intensity = 0.05;
        }
        
        this.sun.color.copy(this._tmp);
        this.ambient.intensity = Math.max(0.1, alt * 0.4);
        this.hemisphere.intensity = Math.max(0.1, alt * 0.3);
    }
}

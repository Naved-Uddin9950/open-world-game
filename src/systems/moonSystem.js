// ============================================================
// moonSystem.js — Moon and stars
// ============================================================
import * as THREE from 'three';

export class MoonSystem {
    constructor(scene) {
        // Moon
        const moonGeo = new THREE.SphereGeometry(8, 16, 16);
        const moonMat = new THREE.MeshBasicMaterial({ color: 0xddddee });
        this.moon = new THREE.Mesh(moonGeo, moonMat);
        scene.add(this.moon);

        // Stars
        const starGeo = new THREE.BufferGeometry();
        const starPos = [];
        for (let i = 0; i < 1000; i++) {
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(Math.random() * 2 - 1);
            const r = 400;
            starPos.push(
                r * Math.sin(phi) * Math.cos(theta),
                r * Math.sin(phi) * Math.sin(theta),
                r * Math.cos(phi)
            );
        }
        starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPos, 3));
        const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 1.5 });
        this.stars = new THREE.Points(starGeo, starMat);
        scene.add(this.stars);
    }

    update(time, playerPos) {
        const alt = time.sunAltitude;
        const angle = ((time.hour + 6) / 12) * Math.PI;
        
        this.moon.position.set(
            Math.cos(angle) * 150,
            Math.sin(angle) * 150,
            -20
        );

        const nightFade = alt < 0 ? Math.min(1, -alt * 2) : 0;
        this.moon.visible = nightFade > 0.1;
        this.stars.visible = nightFade > 0.1;
        this.stars.material.opacity = nightFade;
        this.stars.material.transparent = nightFade < 1;

        if (playerPos) {
            this.stars.position.copy(playerPos);
        }
    }
}

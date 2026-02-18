// ============================================================
// lodSystem.js — Aggressive LOD management
// ============================================================
import * as THREE from 'three';

export class LODSystem {
    constructor() {
        this._lodObjects = [];
        this._frustum = new THREE.Frustum();
        this._matrix = new THREE.Matrix4();
    }

    createLOD(levels) {
        const lod = new THREE.LOD();
        levels.forEach((level, i) => {
            const dist = level.distance ?? (i + 1) * 50;
            lod.addLevel(level.mesh, dist);
        });
        this._lodObjects.push(lod);
        return lod;
    }

    update(camera) {
        this._matrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
        this._frustum.setFromProjectionMatrix(this._matrix);

        for (const lod of this._lodObjects) {
            if (this._frustum.intersectsObject(lod)) {
                lod.update(camera);
            } else {
                lod.visible = false;
            }
        }
    }

    remove(lod, dispose = false) {
        const idx = this._lodObjects.indexOf(lod);
        if (idx !== -1) this._lodObjects.splice(idx, 1);
        if (dispose) {
            lod.traverse((child) => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) {
                    (Array.isArray(child.material) ? child.material : [child.material])
                        .forEach(m => m.dispose());
                }
            });
        }
    }

    get count() {
        return this._lodObjects.length;
    }
}
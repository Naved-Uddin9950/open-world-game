// ============================================================
// lodSystem.js — Level-of-Detail management foundation
// ============================================================
import * as THREE from 'three';
import { LOD_DISTANCES } from '../utils/constants.js';

export class LODSystem {
    constructor() {
        /** @type {THREE.LOD[]} */
        this._lodObjects = [];
    }

    /**
     * Create a managed LOD object from detail levels.
     * @param {Array<{ mesh: THREE.Object3D, distance: number }>} levels
     *        Sorted from highest to lowest detail.  If no distances supplied,
     *        defaults from LOD_DISTANCES are used.
     * @returns {THREE.LOD}
     */
    createLOD(levels) {
        const lod = new THREE.LOD();

        levels.forEach((level, i) => {
            const dist = level.distance ?? LOD_DISTANCES[i] ?? (i + 1) * 100;
            lod.addLevel(level.mesh, dist);
        });

        this._lodObjects.push(lod);
        return lod;
    }

    /**
     * Call once per frame to update LOD visibility.
     * @param {THREE.Camera} camera
     */
    update(camera) {
        for (const lod of this._lodObjects) {
            lod.update(camera);
        }
    }

    /**
     * Unregister and optionally dispose a LOD object.
     * @param {THREE.LOD} lod
     * @param {boolean}   dispose  Whether to dispose geometry/material
     */
    remove(lod, dispose = false) {
        const idx = this._lodObjects.indexOf(lod);
        if (idx !== -1) this._lodObjects.splice(idx, 1);

        if (dispose) {
            lod.traverse((child) => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach(m => m.dispose());
                    } else {
                        child.material.dispose();
                    }
                }
            });
        }
    }

    /** Number of tracked LOD objects. */
    get count() {
        return this._lodObjects.length;
    }
}

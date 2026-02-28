// ============================================================
// waterSystem.js — Simple water plane per chunk at water level
// ============================================================
import * as THREE from 'three';
import { CHUNK_SIZE } from '../utils/constants.js';
import { WATER_LEVEL_WORLD } from './terrain/terrainGenerator.js';

const waterMaterial = new THREE.MeshStandardMaterial({
    color: 0x1a6a9a,
    transparent: true,
    opacity: 0.55,
    roughness: 0.15,
    metalness: 0.3,
    side: THREE.DoubleSide,
    depthWrite: false,
});

const waterGeometry = new THREE.PlaneGeometry(CHUNK_SIZE, CHUNK_SIZE, 1, 1);
waterGeometry.rotateX(-Math.PI / 2);

export class WaterSystem {
    constructor() {
        /** @type {Map<string, THREE.Mesh>} */
        this._planes = new Map();
    }

    /**
     * Create a water plane for a chunk.
     * @param {number} cx  @param {number} cz
     * @returns {THREE.Mesh|null}
     */
    createForChunk(cx, cz) {
        const key = `${cx},${cz}`;
        if (this._planes.has(key)) return this._planes.get(key);

        const mesh = new THREE.Mesh(waterGeometry, waterMaterial);
        mesh.position.set(
            cx * CHUNK_SIZE + CHUNK_SIZE / 2,
            WATER_LEVEL_WORLD,
            cz * CHUNK_SIZE + CHUNK_SIZE / 2,
        );
        mesh.receiveShadow = true;
        mesh.castShadow = false;
        mesh.name = `water_${cx}_${cz}`;

        this._planes.set(key, mesh);
        return mesh;
    }

    /**
     * Remove a water plane for a chunk.
     * @returns {THREE.Mesh|null}
     */
    removeForChunk(cx, cz) {
        const key = `${cx},${cz}`;
        const mesh = this._planes.get(key);
        if (mesh) this._planes.delete(key);
        return mesh || null;
    }

    dispose() {
        this._planes.clear();
        // geometry and material are shared, don't dispose them here
    }
}

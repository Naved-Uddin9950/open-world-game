// ============================================================
// animalManager.js — Simple deterministic animal spawner per chunk
// ============================================================
import * as THREE from 'three';
import { SimplexNoise } from '../../utils/noise.js';
import {
    ANIMAL_MEAN_COUNTS,
    ANIMAL_MAX_PER_CHUNK,
    ANIMAL_SPACING,
    CHUNK_SIZE,
} from '../../utils/constants.js';

export class AnimalManager {
    constructor(scene, terrainGen, seed = 42) {
        this.scene = scene;
        this._terrain = terrainGen;
        this._noise = new SimplexNoise(seed * 2.71828);
        this._chunkAnimals = new Map();
    }

    loadChunkAnimals(cx, cz) {
        const key = `${cx},${cz}`;
        if (this._chunkAnimals.has(key)) return this._chunkAnimals.get(key);

        const placements = this._sampleAnimals(cx, cz);
        if (placements.length === 0) {
            this._chunkAnimals.set(key, null);
            return null;
        }

        const group = new THREE.Group();
        group.name = `animals:${key}`;

        for (const p of placements) {
            const mesh = this._createAnimalMesh(p.type, p.scale);
            mesh.position.set(p.x, p.y + 0.05, p.z);
            mesh.rotation.y = p.rotation;
            mesh.userData = { type: p.type };
            group.add(mesh);
        }

        this.scene.add(group);
        this._chunkAnimals.set(key, group);
        return group;
    }

    unloadChunkAnimals(cx, cz) {
        const key = `${cx},${cz}`;
        const group = this._chunkAnimals.get(key);
        if (!group) {
            this._chunkAnimals.delete(key);
            return null;
        }
        this.scene.remove(group);
        for (const m of group.children) {
            if (m.geometry) m.geometry.dispose();
            if (m.material) {
                if (Array.isArray(m.material)) m.material.forEach(mat => mat.dispose());
                else m.material.dispose();
            }
        }
        this._chunkAnimals.delete(key);
        return group;
    }

    dispose() {
        for (const [key, group] of this._chunkAnimals) {
            if (!group) continue;
            this.scene.remove(group);
            for (const m of group.children) {
                if (m.geometry) m.geometry.dispose();
                if (m.material) {
                    if (Array.isArray(m.material)) m.material.forEach(mat => mat.dispose());
                    else m.material.dispose();
                }
            }
        }
        this._chunkAnimals.clear();
    }

    // Simple deterministic hash using noise
    _hash(x, z, offset = 0) {
        return (this._noise.noise2D(x * 0.13 + offset, z * 0.13 + offset) + 1) * 0.5;
    }

    _sampleAnimals(cx, cz) {
        const placements = [];
        const originX = cx * CHUNK_SIZE;
        const originZ = cz * CHUNK_SIZE;

        // For each animal type, deterministically pick a count based on noise
        let total = 0;
        for (const [type, mean] of Object.entries(ANIMAL_MEAN_COUNTS)) {
            const roll = this._hash(cx, cz, type.length * 13);
            // Allow variance around mean
            const count = Math.floor(Math.max(0, roll * mean * 1.6));
            for (let i = 0; i < count; i++) {
                if (total >= ANIMAL_MAX_PER_CHUNK) break;
                // place randomly within chunk using noise-derived offsets
                const rx = this._hash(cx, cz, i * 31 + type.length) * CHUNK_SIZE;
                const rz = this._hash(cx, cz, i * 47 + type.length) * CHUNK_SIZE;
                const worldX = originX + rx;
                const worldZ = originZ + rz;
                const height = this._terrain.getHeightAt(worldX, worldZ);
                // Avoid very steep slopes (simple slope check)
                const slope = this._terrain.getSlopeAt ? this._terrain.getSlopeAt(worldX, worldZ) : 0;
                if (slope > 0.6) continue;

                placements.push({
                    type,
                    x: worldX,
                    y: height,
                    z: worldZ,
                    rotation: this._hash(worldX, worldZ, i + 11) * Math.PI * 2,
                    scale: this._animalScaleFor(type),
                });
                total++;
            }
            if (total >= ANIMAL_MAX_PER_CHUNK) break;
        }

        return placements;
    }

    _animalScaleFor(type) {
        switch (type) {
            case 'cow': return 1.6;
            case 'deer': return 1.4;
            case 'wolf': return 0.9;
            case 'chicken': return 0.6;
            default: return 1.0;
        }
    }

    _createAnimalMesh(type, scale = 1.0) {
        // Lightweight placeholder animals using boxes/spheres
        let geom;
        let mat;
        switch (type) {
            case 'cow':
                geom = new THREE.BoxGeometry(1.6 * scale, 1.2 * scale, 0.9 * scale);
                mat = new THREE.MeshStandardMaterial({ color: 0x8b5a2b });
                break;
            case 'deer':
                geom = new THREE.BoxGeometry(1.4 * scale, 1.0 * scale, 0.8 * scale);
                mat = new THREE.MeshStandardMaterial({ color: 0xcfa16b });
                break;
            case 'wolf':
                geom = new THREE.BoxGeometry(1.0 * scale, 0.6 * scale, 0.6 * scale);
                mat = new THREE.MeshStandardMaterial({ color: 0x55565a });
                break;
            case 'chicken':
                geom = new THREE.SphereGeometry(0.22 * scale, 6, 5);
                mat = new THREE.MeshStandardMaterial({ color: 0xffffff });
                break;
            default:
                geom = new THREE.BoxGeometry(1 * scale, 1 * scale, 1 * scale);
                mat = new THREE.MeshStandardMaterial({ color: 0x999999 });
        }
        const m = new THREE.Mesh(geom, mat);
        m.castShadow = true;
        m.receiveShadow = false;
        return m;
    }
}

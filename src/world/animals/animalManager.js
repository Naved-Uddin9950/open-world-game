// ============================================================
// animalManager.js — Simple deterministic animal spawner per chunk
// ============================================================
import * as THREE from 'three';
import { SimplexNoise } from '../../utils/noise.js';
import { createCreatureMesh } from '../../entities/creatures/creatureFactory.js';
import { CREATURES } from '../../entities/creatures/creatureDatabase.js';
import { getZoneAtPosition } from '../worldConfig.js';
import {
    ANIMAL_MAX_PER_CHUNK,
    CHUNK_SIZE,
    TERRAIN_HEIGHT_SCALE,
} from '../../utils/constants.js';
import { WATER_LEVEL } from '../terrain/terrainGenerator.js';

export class AnimalManager {
    /**
     * @param {THREE.Scene} scene
     * @param {TerrainGenerator} terrainGen
     * @param {AssetLoader|null} assetLoader
     * @param {number} [seed=42]
     */
    constructor(scene, terrainGen, assetLoader = null, seed = 42, options = {}) {
        this.scene = scene;
        this._terrain = terrainGen;
        this._noise = new SimplexNoise(seed * 2.71828);
        this._chunkAnimals = new Map();
        // per-type scale overrides (can be changed at runtime)
        this._scaleOverrides = options.scaleOverrides || {};
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

        // Colliders for this animal group (one per animal) — registered by WorldManager
        const colliders = [];

        for (const p of placements) {
            const creatureDef = CREATURES[p.type] || CREATURES.slime;
            const finalScale = this.getAnimalScale(p.type) * (p.scale || 1);
            const mesh = createCreatureMesh(
                creatureDef.visual.meshType,
                creatureDef.visual,
                p.level || creatureDef.baseLevel || 1,
            );
            if (finalScale !== 1) mesh.scale.multiplyScalar(finalScale);
            mesh.position.set(p.x, p.y + 0.05, p.z);
            mesh.rotation.y = p.rotation;
            mesh.userData = {
                type: p.type,
                level: p.level || creatureDef.baseLevel || 1,
                creatureId: p.type,
            };
            group.add(mesh);

            // Create a simple invisible collider approximating the mesh bounds.
            // Use a unit box scaled to the mesh bounding box size so it covers
            // either placeholder geometry or cloned GLTF models.
            try {
                const bbox = new THREE.Box3().setFromObject(mesh);
                const size = new THREE.Vector3();
                bbox.getSize(size);
                // Ensure we have a non-zero size
                if (size.x === 0 && size.y === 0 && size.z === 0) {
                    size.set(1 * finalScale, 1 * finalScale, 1 * finalScale);
                }

                const colGeo = new THREE.BoxGeometry(1, 1, 1);
                const colMat = new THREE.MeshBasicMaterial({ visible: false });
                const col = new THREE.Mesh(colGeo, colMat);
                col.name = 'animalCollider';
                col.position.set(mesh.position.x, mesh.position.y + (size.y / 2) || mesh.position.y, mesh.position.z);
                col.scale.set(size.x, size.y || size.x, size.z || size.x);
                col.matrixAutoUpdate = true;
                colliders.push(col);
                group.add(col);
            } catch (e) {
                // If bounding box computation fails, skip collider for this animal
            }
        }

        // Attach colliders list to the group so WorldManager can register them
        group.userData.colliders = colliders;

        this.scene.add(group);
        this._chunkAnimals.set(key, group);
        return group;
    }

    /**
     * Register environment colliders (trees/rocks/etc) so animals can use them
     * for their own movement/collision logic if needed.
     * @param  {...THREE.Object3D} objects
     */
    addEnvironmentColliders(...objects) {
        this._envColliders = this._envColliders || [];
        this._envColliders.push(...objects);
    }

    /**
     * Unregister previously added environment colliders.
     * @param  {...THREE.Object3D} objects
     */
    removeEnvironmentColliders(...objects) {
        if (!this._envColliders) return;
        this._envColliders = this._envColliders.filter(o => !objects.includes(o));
    }

    async _preloadModels() {
        // No-op: all creatures are procedural
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

        const centerX = originX + CHUNK_SIZE * 0.5;
        const centerZ = originZ + CHUNK_SIZE * 0.5;
        const zone = getZoneAtPosition(centerX, centerZ);
        const pool = (zone && Array.isArray(zone.enemyTypes) && zone.enemyTypes.length > 0)
            ? zone.enemyTypes.filter(id => CREATURES[id])
            : ['slime', 'smallGoblin'];

        const levelMin = zone ? zone.levelRange[0] : 1;
        const levelMax = zone ? zone.levelRange[1] : 10;

        const spawnCount = Math.min(
            ANIMAL_MAX_PER_CHUNK,
            4 + Math.floor(this._hash(cx, cz, 97) * 8),
        );

        let total = 0;
        for (let i = 0; i < spawnCount; i++) {
            const rx = this._hash(cx, cz, i * 31 + 7) * CHUNK_SIZE;
            const rz = this._hash(cx, cz, i * 47 + 13) * CHUNK_SIZE;
            const worldX = originX + rx;
            const worldZ = originZ + rz;
            const height = this._terrain.getHeightAt(worldX, worldZ);

            const normH = Math.max(0, height) / TERRAIN_HEIGHT_SCALE;
            if (normH < WATER_LEVEL + 0.02) continue;
            const slope = this._terrain.getSlopeAt ? this._terrain.getSlopeAt(worldX, worldZ) : 0;
            if (slope > 0.6) continue;

            const typeIdx = Math.floor(this._hash(cx, cz, i * 19 + 23) * pool.length);
            const type = pool[Math.min(pool.length - 1, Math.max(0, typeIdx))] || 'slime';
            const level = Math.round(levelMin + (levelMax - levelMin) * this._hash(cx, cz, i * 29 + 3));

            placements.push({
                type,
                level,
                x: worldX,
                y: height,
                z: worldZ,
                rotation: this._hash(worldX, worldZ, i + 11) * Math.PI * 2,
                scale: 1,
            });
            total++;
            if (total >= ANIMAL_MAX_PER_CHUNK) break;
        }

        return placements;
    }

    _animalScaleFor(type) {
        switch (type) {
            case 'slime': return 0.95;
            case 'smallGoblin': return 0.9;
            case 'goblin': return 1.0;
            case 'goblinArcher': return 0.95;
            case 'direWolf': return 1.0;
            case 'forestGolem': return 1.0;
            case 'orc': return 1.0;
            case 'undeadKnight': return 1.0;
            case 'wyvern': return 1.0;
            case 'fireDrake': return 1.0;
            case 'iceGolem': return 1.0;
            case 'frostBear': return 1.0;
            case 'sandGolem': return 1.0;
            case 'scorpionKing': return 1.0;
            case 'demonGeneral': return 1.0;
            case 'iceDragon': return 1.0;
            case 'ancientDragon': return 1.0;
            default: return 1.0;
        }
    }

    /**
     * Get the effective scale multiplier for an animal type (base * override)
     * @param {string} type
     */
    getAnimalScale(type) {
        const base = this._animalScaleFor(type);
        const over = this._scaleOverrides[type];
        if (typeof over === 'number') return over;
        return base;
    }

    /**
     * Set a runtime scale override for an animal type and update existing animals.
     * @param {string} type
     * @param {number} scaleMultiplier
     */
    setAnimalScale(type, scaleMultiplier) {
        this._scaleOverrides[type] = scaleMultiplier;
        for (const [key, group] of this._chunkAnimals) {
            if (!group) continue;
            for (const m of group.children) {
                if (m.userData && m.userData.type === type) {
                    const base = this._animalScaleFor(type);
                    const final = scaleMultiplier * base;
                    m.scale.set(final, final, final);
                }
            }
        }
    }
}

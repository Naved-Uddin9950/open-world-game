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
        this._assetLoader = assetLoader;
        this._models = {}; // loaded GLTF scenes by type
        // per-type scale overrides (can be changed at runtime)
        this._scaleOverrides = options.scaleOverrides || {};

        // Attempt to preload models if an asset loader is available
        if (this._assetLoader) {
            this._preloadModels(['cow', 'deer', 'wolf', 'chicken']);
        }
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
            let mesh = null;
            const model = this._models[p.type];
            if (model) {
                try {
                    // deep clone (may include nested meshes)
                    mesh = model.clone(true);
                } catch (e) {
                    mesh = null;
                }
            }
            const finalScale = this.getAnimalScale(p.type) * p.scale;
            if (!mesh) mesh = this._createAnimalMesh(p.type, finalScale);
            else mesh.scale.set(finalScale, finalScale, finalScale);
            mesh.position.set(p.x, p.y + 0.05, p.z);
            mesh.rotation.y = p.rotation;
            mesh.userData = { type: p.type };
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

    async _preloadModels(types) {
        for (const t of types) {
            const candidates = [
                `assets/models/${t}.glb`,
                `assets/models/${t}/${t}.glb`,
                `assets/models/${t}/source/${t}.glb`,
                `assets/models/${t}/source/GLB_${t.charAt(0).toUpperCase() + t.slice(1)}.glb`,
                `assets/models/${t}/source/GLB_${t.toUpperCase()}.glb`,
                `assets/models/${t}/model.glb`,
                `assets/models/${t}/source/model.glb`,
            ];

            let loaded = null;
            for (const url of candidates) {
                try {
                    const res = await this._assetLoader.loadModel(url);
                    if (res) {
                        loaded = res;
                        console.debug(`[AnimalManager] Loaded model for ${t} from ${url}`);
                        break;
                    }
                } catch (e) {
                    // try next candidate
                }
            }

            if (loaded) {
                if (loaded.scene) this._models[t] = loaded.scene;
                else this._models[t] = loaded;
            } else {
                console.warn(`[AnimalManager] Failed to load any model for ${t} from candidates`, candidates);
            }
        }
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
        // update existing spawned animals
        for (const [key, group] of this._chunkAnimals) {
            if (!group) continue;
            for (const m of group.children) {
                if (m.userData && m.userData.type === type) {
                    // Existing meshes were created with finalScale = base * placementScale.
                    // Our override represents the new 'base' multiplier, so set final scale = override * basePlacement.
                    const base = this._animalScaleFor(type);
                    const final = scaleMultiplier * base;
                    m.scale.set(final, final, final);
                }
            }
        }
    }

    /**
     * Auto-fit a loaded model type to a target world height (meters) by computing
     * a scale override based on the model bounding box and current base scale.
     * Returns the computed override multiplier or null on failure.
     * @param {string} type
     * @param {number} targetHeight
     */
    autoFitTypeHeight(type, targetHeight = 1.2) {
        const model = this._models[type];
        if (!model) {
            console.warn(`[AnimalManager] autoFit: model for ${type} not loaded`);
            return null;
        }
        try {
            const box = new THREE.Box3().setFromObject(model);
            const size = new THREE.Vector3();
            box.getSize(size);
            const modelHeight = size.y || Math.max(size.x, size.z) || 1;
            const base = this._animalScaleFor(type);
            const override = targetHeight / (modelHeight * base);
            this.setAnimalScale(type, override);
            console.debug('[AnimalManager] autoFitTypeHeight', type, { modelHeight, base, override, targetHeight });
            return override;
        } catch (e) {
            console.warn('[AnimalManager] autoFit failed', e);
            return null;
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

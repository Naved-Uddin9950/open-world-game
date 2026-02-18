// ============================================================
// worldManager.js — Optimized chunk streaming
// ============================================================
import * as THREE from 'three';
import { CHUNK_SIZE } from '../utils/constants.js';
import { ChunkLoader } from './chunkLoader.js';
import { ForestManager } from './vegetation/forestManager.js';
import { AnimalManager } from './animals/animalManager.js';

export class WorldManager {
    /**
     * @param {THREE.Scene} scene
     * @param {FirstPersonController|null} player
     * @param {AssetLoader|null} assetLoader
     * @param {number} [seed=42]
     */
    constructor(scene, player = null, assetLoader = null, seed = 42) {
        this.scene = scene;
        this.chunkLoader = new ChunkLoader(seed);
        this.forest = new ForestManager(scene, this.chunkLoader.generator, seed);
        this.animals = new AnimalManager(scene, this.chunkLoader.generator, assetLoader, seed);
        this._player = player; // FirstPersonController instance (optional)
        this.activeChunks = new Map();
        this._lastChunkX = null;
        this._lastChunkZ = null;
        this._renderDistance = 2;
        this._loadQueue = [];
        this._unloadQueue = [];
    }

    setRenderDistance(dist) {
        this._renderDistance = dist;
    }

    update(playerPosition) {
        const chunkX = Math.floor(playerPosition.x / CHUNK_SIZE);
        const chunkZ = Math.floor(playerPosition.z / CHUNK_SIZE);

        if (chunkX !== this._lastChunkX || chunkZ !== this._lastChunkZ) {
            this._lastChunkX = chunkX;
            this._lastChunkZ = chunkZ;

            const neededKeys = new Set();
            for (let dx = -this._renderDistance; dx <= this._renderDistance; dx++) {
                for (let dz = -this._renderDistance; dz <= this._renderDistance; dz++) {
                    const cx = chunkX + dx;
                    const cz = chunkZ + dz;
                    const key = `${cx},${cz}`;
                    neededKeys.add(key);

                    if (!this.activeChunks.has(key)) {
                        this._loadQueue.push({ cx, cz, key });
                    }
                }
            }

            for (const [key, chunkObj] of this.activeChunks) {
                if (!neededKeys.has(key)) {
                    this._unloadQueue.push({ key, chunkObj });
                }
            }
        }

        if (this._loadQueue.length > 0) {
            const { cx, cz, key } = this._loadQueue.shift();
            this._loadChunk(cx, cz, key);
        }

        if (this._unloadQueue.length > 0) {
            const { key, chunkObj } = this._unloadQueue.shift();
            this._unloadChunk(key, chunkObj);
        }

        this.forest.update(playerPosition);
    }

    _loadChunk(cx, cz, key) {
        const lod = this.chunkLoader.createChunk(cx, cz);
        this.scene.add(lod);
        this.activeChunks.set(key, lod);
        // Load vegetation for this chunk and register any colliders with the player
        const veg = this.forest.loadChunkVegetation(cx, cz);
        // Load animals for this chunk
        const animals = this.animals.loadChunkAnimals(cx, cz);
        if (veg && this._player && typeof this._player.addColliders === 'function') {
            const colliders = [];
            if (veg.trees && veg.trees.userData && veg.trees.userData.colliders) colliders.push(...veg.trees.userData.colliders);
            if (veg.rocks && veg.rocks.userData && veg.rocks.userData.colliders) colliders.push(...veg.rocks.userData.colliders);
            // Ensure collider world matrices are computed now so collision checks
            // performed before a render have valid world transforms.
            for (const c of colliders) {
                if (c && typeof c.updateMatrixWorld === 'function') c.updateMatrixWorld(true);
            }
            if (colliders.length > 0) this._player.addColliders(...colliders);
        }
    }

    _unloadChunk(key, chunkObj) {
        this.scene.remove(chunkObj);
        this.chunkLoader.disposeChunk(chunkObj);
        this.activeChunks.delete(key);
        const [cx, cz] = key.split(',').map(Number);
        // Unload vegetation and unregister colliders from player
        const veg = this.forest.unloadChunkVegetation(cx, cz);
        // Unload animals
        const animals = this.animals.unloadChunkAnimals(cx, cz);
        if (veg && this._player && typeof this._player.removeColliders === 'function') {
            const colliders = [];
            if (veg.trees && veg.trees.userData && veg.trees.userData.colliders) colliders.push(...veg.trees.userData.colliders);
            if (veg.rocks && veg.rocks.userData && veg.rocks.userData.colliders) colliders.push(...veg.rocks.userData.colliders);
            if (colliders.length > 0) this._player.removeColliders(...colliders);
        }
    }

    getHeightAt(worldX, worldZ) {
        return this.chunkLoader.getHeightAt(worldX, worldZ);
    }

    getActiveChunkMeshes() {
        return Array.from(this.activeChunks.values());
    }

    dispose() {
        for (const [key, obj] of this.activeChunks) {
            this.scene.remove(obj);
            this.chunkLoader.disposeChunk(obj);
        }
        this.activeChunks.clear();
        this.forest.dispose();
        this.animals.dispose();
    }
}

// ============================================================
// worldManager.js — Optimized chunk streaming
// ============================================================
import * as THREE from 'three';
import { CHUNK_SIZE } from '../utils/constants.js';
import { ChunkLoader } from './chunkLoader.js';
import { ForestManager } from './vegetation/forestManager.js';

export class WorldManager {
    constructor(scene, seed = 42) {
        this.scene = scene;
        this.chunkLoader = new ChunkLoader(seed);
        this.forest = new ForestManager(scene, this.chunkLoader.generator, seed);
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
        this.forest.loadChunkVegetation(cx, cz);
    }

    _unloadChunk(key, chunkObj) {
        this.scene.remove(chunkObj);
        this.chunkLoader.disposeChunk(chunkObj);
        this.activeChunks.delete(key);
        const [cx, cz] = key.split(',').map(Number);
        this.forest.unloadChunkVegetation(cx, cz);
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
    }
}

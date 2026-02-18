// ============================================================
// worldManager.js — Chunk-based world management
// ============================================================
import * as THREE from 'three';
import { CHUNK_SIZE, RENDER_DISTANCE } from '../utils/constants.js';
import { ChunkLoader } from './chunkLoader.js';
import { ForestManager } from './vegetation/forestManager.js';

export class WorldManager {
    /**
     * @param {THREE.Scene} scene
     * @param {number}      [seed=42]
     */
    constructor(scene, seed = 42) {
        this.scene = scene;
        this.chunkLoader = new ChunkLoader(seed);

        // Vegetation manager — shares terrain generator for height queries
        this.forest = new ForestManager(scene, this.chunkLoader.generator, seed);

        /** @type {Map<string, THREE.LOD>} */
        this.activeChunks = new Map();

        // Track last player chunk to avoid unnecessary updates
        this._lastChunkX = null;
        this._lastChunkZ = null;
    }

    /**
     * Update visible chunks based on player position.
     * @param {THREE.Vector3} playerPosition
     */
    update(playerPosition) {
        const chunkX = Math.floor(playerPosition.x / CHUNK_SIZE);
        const chunkZ = Math.floor(playerPosition.z / CHUNK_SIZE);

        // Skip terrain reload if player hasn't changed chunk
        if (chunkX !== this._lastChunkX || chunkZ !== this._lastChunkZ) {
            this._lastChunkX = chunkX;
            this._lastChunkZ = chunkZ;

            const neededKeys = new Set();

            // Determine which chunks should be active
            for (let dx = -RENDER_DISTANCE; dx <= RENDER_DISTANCE; dx++) {
                for (let dz = -RENDER_DISTANCE; dz <= RENDER_DISTANCE; dz++) {
                    const cx = chunkX + dx;
                    const cz = chunkZ + dz;
                    const key = `${cx},${cz}`;
                    neededKeys.add(key);

                    if (!this.activeChunks.has(key)) {
                        this._loadChunk(cx, cz, key);
                    }
                }
            }

            // Unload chunks that are too far away
            for (const [key, chunkObj] of this.activeChunks) {
                if (!neededKeys.has(key)) {
                    this._unloadChunk(key, chunkObj);
                }
            }
        }

        // Update vegetation LOD every frame (cheap distance checks)
        this.forest.update(playerPosition);
    }

    /** Load and add a chunk to the scene. */
    _loadChunk(cx, cz, key) {
        const lod = this.chunkLoader.createChunk(cx, cz);
        this.scene.add(lod);
        this.activeChunks.set(key, lod);

        // Generate vegetation for this chunk
        this.forest.loadChunkVegetation(cx, cz);
    }

    /** Remove and dispose a chunk. */
    _unloadChunk(key, chunkObj) {
        this.scene.remove(chunkObj);
        this.chunkLoader.disposeChunk(chunkObj);
        this.activeChunks.delete(key);

        // Remove vegetation
        const [cx, cz] = key.split(',').map(Number);
        this.forest.unloadChunkVegetation(cx, cz);
    }

    /**
     * Query terrain height at a world position.
     * @param {number} worldX
     * @param {number} worldZ
     * @returns {number}
     */
    getHeightAt(worldX, worldZ) {
        return this.chunkLoader.getHeightAt(worldX, worldZ);
    }

    /**
     * Get all active chunk objects (for LOD updates).
     * @returns {THREE.LOD[]}
     */
    getActiveChunkMeshes() {
        return Array.from(this.activeChunks.values());
    }

    /** Dispose all chunks and vegetation. */
    dispose() {
        for (const [key, obj] of this.activeChunks) {
            this.scene.remove(obj);
            this.chunkLoader.disposeChunk(obj);
        }
        this.activeChunks.clear();
        this.forest.dispose();
    }
}

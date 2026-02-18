// ============================================================
// worldManager.js — Chunk-based world management
// ============================================================
import * as THREE from 'three';
import { CHUNK_SIZE, RENDER_DISTANCE } from '../utils/constants.js';
import { ChunkLoader } from './chunkLoader.js';

export class WorldManager {
    /**
     * @param {THREE.Scene} scene
     */
    constructor(scene) {
        this.scene = scene;
        this.chunkLoader = new ChunkLoader();

        /** @type {Map<string, THREE.Object3D>} */
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

        // Skip if player hasn't changed chunk
        if (chunkX === this._lastChunkX && chunkZ === this._lastChunkZ) return;
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

    /** Load and add a chunk to the scene. */
    _loadChunk(cx, cz, key) {
        const mesh = this.chunkLoader.createChunk(cx, cz);
        this.scene.add(mesh);
        this.activeChunks.set(key, mesh);
    }

    /** Remove and recycle a chunk. */
    _unloadChunk(key, chunkObj) {
        this.scene.remove(chunkObj);
        this.chunkLoader.recycleChunk(chunkObj);
        this.activeChunks.delete(key);
    }

    /**
     * Get all active chunk meshes (for collision registration, etc.).
     * @returns {THREE.Object3D[]}
     */
    getActiveChunkMeshes() {
        return Array.from(this.activeChunks.values());
    }

    /** Dispose all chunks. */
    dispose() {
        for (const [key, obj] of this.activeChunks) {
            this.scene.remove(obj);
            this.chunkLoader.disposeChunk(obj);
        }
        this.activeChunks.clear();
    }
}

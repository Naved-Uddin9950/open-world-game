// ============================================================
// chunkLoader.js — Chunk mesh creation with pool recycling
// ============================================================
import * as THREE from 'three';
import { CHUNK_SIZE } from '../utils/constants.js';

export class ChunkLoader {
    constructor() {
        /** Pool of recycled chunk meshes. */
        this._pool = [];

        // Shared geometry + material for all ground chunks (saves memory)
        this._sharedGeometry = new THREE.PlaneGeometry(CHUNK_SIZE, CHUNK_SIZE, 1, 1);
        this._sharedGeometry.rotateX(-Math.PI / 2); // lay flat

        this._sharedMaterial = new THREE.MeshStandardMaterial({
            color: 0x2d5a1b,
            roughness: 0.95,
            metalness: 0.0,
        });
    }

    /**
     * Create (or recycle) a chunk mesh.
     * @param {number} cx  Chunk X coordinate (grid space)
     * @param {number} cz  Chunk Z coordinate (grid space)
     * @returns {THREE.Mesh}
     */
    createChunk(cx, cz) {
        let mesh;

        if (this._pool.length > 0) {
            mesh = this._pool.pop();
        } else {
            mesh = new THREE.Mesh(this._sharedGeometry, this._sharedMaterial);
            mesh.receiveShadow = true;
            mesh.castShadow = false;
        }

        // Position in world space (chunk center)
        mesh.position.set(
            cx * CHUNK_SIZE + CHUNK_SIZE / 2,
            0,
            cz * CHUNK_SIZE + CHUNK_SIZE / 2,
        );

        mesh.name = `chunk_${cx}_${cz}`;
        mesh.visible = true;

        return mesh;
    }

    /**
     * Return a chunk mesh to the pool for reuse.
     * @param {THREE.Mesh} mesh
     */
    recycleChunk(mesh) {
        mesh.visible = false;
        this._pool.push(mesh);
    }

    /**
     * Fully dispose a chunk mesh (when shutting down).
     * @param {THREE.Mesh} mesh
     */
    disposeChunk(mesh) {
        // Geometry and material are shared — don't dispose them per-chunk
        mesh.visible = false;
    }

    /** Dispose shared resources (call on engine shutdown). */
    dispose() {
        this._sharedGeometry.dispose();
        this._sharedMaterial.dispose();
        this._pool.length = 0;
    }
}

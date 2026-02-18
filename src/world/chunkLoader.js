// ============================================================
// chunkLoader.js — Terrain chunk orchestrator with LOD
// ============================================================
import { TerrainGenerator } from './terrain/terrainGenerator.js';
import { TerrainChunk } from './terrain/terrainChunk.js';
import { BiomeSystem } from './terrain/biomeSystem.js';

export class ChunkLoader {
    /**
     * @param {number} [seed=42]
     */
    constructor(seed = 42) {
        this.generator = new TerrainGenerator(seed);
        this.biome = new BiomeSystem();
        this._builder = new TerrainChunk(this.generator, this.biome);
    }

    /**
     * Create a terrain LOD mesh for the given chunk coordinates.
     * @param {number} cx  Chunk X (grid space)
     * @param {number} cz  Chunk Z (grid space)
     * @returns {THREE.LOD}
     */
    createChunk(cx, cz) {
        return this._builder.createLOD(cx, cz);
    }

    /**
     * Recycle a chunk (just hide it — geometry is unique per chunk).
     * @param {THREE.LOD} lod
     */
    recycleChunk(lod) {
        lod.visible = false;
        this._builder.disposeLOD(lod);
    }

    /**
     * Dispose a chunk's geometry.
     * @param {THREE.LOD} lod
     */
    disposeChunk(lod) {
        this._builder.disposeLOD(lod);
    }

    /** Expose terrain generator for height queries. */
    getHeightAt(worldX, worldZ) {
        return this.generator.getHeightAt(worldX, worldZ);
    }

    dispose() {
        // Nothing shared to dispose — all geometry is per-chunk
    }
}

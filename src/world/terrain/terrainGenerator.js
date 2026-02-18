// ============================================================
// terrainGenerator.js — Multi-octave simplex heightmap generator
// ============================================================
import { SimplexNoise } from '../../utils/noise.js';
import {
    CHUNK_SIZE,
    TERRAIN_HEIGHT_SCALE,
    TERRAIN_CONTINENTAL_SCALE,
    TERRAIN_CONTINENTAL_HEIGHT,
    TERRAIN_DETAIL_SCALE,
    TERRAIN_DETAIL_HEIGHT,
    TERRAIN_MICRO_SCALE,
    TERRAIN_MICRO_HEIGHT,
    TERRAIN_POWER_CURVE,
    TERRAIN_SEG_HIGH,
} from '../../utils/constants.js';

export class TerrainGenerator {
    /**
     * @param {number} [seed=42]
     */
    constructor(seed = 42) {
        // Separate noise instances for each pass to avoid correlation
        this._continental = new SimplexNoise(seed);
        this._detail = new SimplexNoise(seed * 2.713);
        this._micro = new SimplexNoise(seed * 7.919);
    }

    /**
     * Get the terrain height at a single world-space point.
     * Used for player grounding and collision.
     * @param {number} worldX
     * @param {number} worldZ
     * @returns {number} height in world units
     */
    getHeightAt(worldX, worldZ) {
        // Continental — broad mountains / valleys
        let h = this._continental.fbm(
            worldX * TERRAIN_CONTINENTAL_SCALE,
            worldZ * TERRAIN_CONTINENTAL_SCALE,
            5, 2.0, 0.5
        ) * TERRAIN_CONTINENTAL_HEIGHT;

        // Detail — hills, ridges
        h += this._detail.fbm(
            worldX * TERRAIN_DETAIL_SCALE,
            worldZ * TERRAIN_DETAIL_SCALE,
            4, 2.0, 0.5
        ) * TERRAIN_DETAIL_HEIGHT;

        // Micro — small bumps
        h += this._micro.fbm(
            worldX * TERRAIN_MICRO_SCALE,
            worldZ * TERRAIN_MICRO_SCALE,
            2, 2.0, 0.5
        ) * TERRAIN_MICRO_HEIGHT;

        // Normalise from [-1,1] noise range to [0,1], then apply power curve
        const normalised = (h / TERRAIN_HEIGHT_SCALE + 1) * 0.5;
        const curved = Math.pow(Math.max(0, normalised), TERRAIN_POWER_CURVE);

        return curved * TERRAIN_HEIGHT_SCALE;
    }

    /**
     * Generate a full heightmap array for a chunk.
     * @param {number} cx        Chunk X in grid space
     * @param {number} cz        Chunk Z in grid space
     * @param {number} segments  Grid resolution (e.g. 64, 16, 4)
     * @returns {Float32Array}   (segments+1)² heights, row-major
     */
    generateHeightmap(cx, cz, segments = TERRAIN_SEG_HIGH) {
        const verts = segments + 1;
        const heights = new Float32Array(verts * verts);
        const step = CHUNK_SIZE / segments;

        // World-space origin of this chunk
        const originX = cx * CHUNK_SIZE;
        const originZ = cz * CHUNK_SIZE;

        for (let iz = 0; iz < verts; iz++) {
            for (let ix = 0; ix < verts; ix++) {
                const worldX = originX + ix * step;
                const worldZ = originZ + iz * step;
                heights[iz * verts + ix] = this.getHeightAt(worldX, worldZ);
            }
        }

        return heights;
    }

    /**
     * Get the slope (steepness) at a point by sampling neighbours.
     * Returns 0 (flat) to 1 (vertical cliff).
     * @param {number} worldX
     * @param {number} worldZ
     * @param {number} [sampleDist=1.0]
     * @returns {number}
     */
    getSlopeAt(worldX, worldZ, sampleDist = 1.0) {
        const hC = this.getHeightAt(worldX, worldZ);
        const hR = this.getHeightAt(worldX + sampleDist, worldZ);
        const hF = this.getHeightAt(worldX, worldZ + sampleDist);

        const dx = (hR - hC) / sampleDist;
        const dz = (hF - hC) / sampleDist;

        // Gradient magnitude → normalised slope
        return Math.min(1, Math.sqrt(dx * dx + dz * dz) / 2);
    }
}

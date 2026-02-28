// ============================================================
// terrainGenerator.js — Biome-aware multi-octave heightmap
// Produces flat plains, rolling hills, mountains, ocean basins,
// desert dunes, snow fields — controlled by temperature/moisture
// ============================================================
import { SimplexNoise } from '../../utils/noise.js';
import { BiomeSystem, BIOME } from './biomeSystem.js';
import {
    CHUNK_SIZE,
    TERRAIN_HEIGHT_SCALE,
    TERRAIN_SEG_HIGH,
} from '../../utils/constants.js';

/** Water level as a fraction of TERRAIN_HEIGHT_SCALE (normalised 0-1). */
export const WATER_LEVEL = 0.15;
export const WATER_LEVEL_WORLD = WATER_LEVEL * TERRAIN_HEIGHT_SCALE;

export class TerrainGenerator {
    /** @param {number} seed */
    constructor(seed = 42) {
        this._continental = new SimplexNoise(seed);
        this._detail      = new SimplexNoise(seed * 2.713);
        this._micro       = new SimplexNoise(seed * 7.919);
        this._dune        = new SimplexNoise(seed * 5.381);

        /** Shared biome system (same seed so biome map overlaps) */
        this.biome = new BiomeSystem(seed);
    }

    /**
     * Get the terrain height at a single world-space point.
     * @param {number} wx  @param {number} wz
     * @returns {number} height in world units
     */
    getHeightAt(wx, wz) {
        // ── Base continental shape ──────────────────────────
        let h = this._continental.fbm(wx * 0.0015, wz * 0.0015, 4, 2.0, 0.5);
        // Map [-1,1] → [0,1]
        let elev = (h + 1) * 0.5;

        // ── Biome lookup (uses raw elevation) ───────────────
        const biomeId = this.biome.getBiome(wx, wz, elev);

        // ── Shape by biome ──────────────────────────────────
        switch (biomeId) {
            case BIOME.DEEP_OCEAN:
            case BIOME.OCEAN:
                // Flatten deep water
                elev = elev * 0.4;
                break;

            case BIOME.BEACH:
                // Very flat near water
                elev = 0.14 + (elev - 0.14) * 0.2;
                break;

            case BIOME.PLAINS: {
                // Flatten significantly — gentle rolling
                const detail = this._detail.fbm(wx * 0.008, wz * 0.008, 2, 2.0, 0.5) * 0.03;
                elev = 0.2 + (elev - 0.2) * 0.25 + detail;
                break;
            }

            case BIOME.FOREST: {
                // Mild hills
                const hill = this._detail.fbm(wx * 0.006, wz * 0.006, 3, 2.0, 0.5) * 0.06;
                elev = 0.22 + (elev - 0.22) * 0.35 + hill;
                break;
            }

            case BIOME.DENSE_FOREST: {
                const hill = this._detail.fbm(wx * 0.005, wz * 0.005, 3, 2.0, 0.5) * 0.05;
                elev = 0.22 + (elev - 0.22) * 0.3 + hill;
                break;
            }

            case BIOME.DESERT: {
                // Flat base with dune waves
                const duneH = this._dune.fbm(wx * 0.02, wz * 0.015, 2, 2.0, 0.5) * 0.04;
                const micro = this._micro.noise2D(wx * 0.08, wz * 0.08) * 0.01;
                elev = 0.22 + (elev - 0.22) * 0.15 + Math.abs(duneH) + micro;
                break;
            }

            case BIOME.SWAMP: {
                // Very flat, slightly below normal
                const swampDet = this._micro.noise2D(wx * 0.03, wz * 0.03) * 0.015;
                elev = 0.18 + (elev - 0.18) * 0.1 + swampDet;
                break;
            }

            case BIOME.SNOW_FIELD: {
                // Flat snowy plains
                const snowDet = this._detail.fbm(wx * 0.006, wz * 0.006, 2, 2.0, 0.5) * 0.03;
                elev = 0.25 + (elev - 0.25) * 0.2 + snowDet;
                break;
            }

            case BIOME.MOUNTAINS:
            case BIOME.SNOW_MOUNTAIN: {
                // Keep mountainous but add ridges
                const ridge = this._detail.fbm(wx * 0.008, wz * 0.008, 4, 2.0, 0.5);
                const ridgeAbs = Math.abs(ridge) * 0.15;
                elev = elev * 0.8 + ridgeAbs + 0.1;
                elev = Math.min(1.0, elev);
                break;
            }
        }

        // ── Micro detail (universal) ────────────────────────
        const micro = this._micro.fbm(wx * 0.04, wz * 0.04, 2, 2.0, 0.5) * 0.01;
        elev += micro;

        // Clamp
        elev = Math.max(0, Math.min(1, elev));

        return elev * TERRAIN_HEIGHT_SCALE;
    }

    /**
     * Generate a full heightmap array for a chunk.
     * @param {number} cx  @param {number} cz  @param {number} segments
     * @returns {Float32Array}
     */
    generateHeightmap(cx, cz, segments = TERRAIN_SEG_HIGH) {
        const verts = segments + 1;
        const heights = new Float32Array(verts * verts);
        const step = CHUNK_SIZE / segments;
        const ox = cx * CHUNK_SIZE;
        const oz = cz * CHUNK_SIZE;

        for (let iz = 0; iz < verts; iz++) {
            for (let ix = 0; ix < verts; ix++) {
                heights[iz * verts + ix] = this.getHeightAt(ox + ix * step, oz + iz * step);
            }
        }
        return heights;
    }

    /**
     * Get slope at a point.
     * @returns {number} 0 (flat) to 1 (cliff)
     */
    getSlopeAt(wx, wz, sampleDist = 1.0) {
        const hC = this.getHeightAt(wx, wz);
        const hR = this.getHeightAt(wx + sampleDist, wz);
        const hF = this.getHeightAt(wx, wz + sampleDist);
        const dx = (hR - hC) / sampleDist;
        const dz = (hF - hC) / sampleDist;
        return Math.min(1, Math.sqrt(dx * dx + dz * dz) / 2);
    }

    /**
     * Get normalised elevation at a point (0-1).
     */
    getElevation(wx, wz) {
        return this.getHeightAt(wx, wz) / TERRAIN_HEIGHT_SCALE;
    }
}

// ============================================================
// biomeSystem.js — Height/slope → terrain colour mapping
// ============================================================
import * as THREE from 'three';
import {
    BIOME_DEEP_GRASS,
    BIOME_LIGHT_GRASS,
    BIOME_DIRT,
    BIOME_ROCK,
    BIOME_SNOW,
    BIOME_GRASS_MAX,
    BIOME_DIRT_MAX,
    BIOME_ROCK_MAX,
    BIOME_SLOPE_ROCK_THRESHOLD,
    TERRAIN_HEIGHT_SCALE,
} from '../../utils/constants.js';
import { lerp } from '../../utils/math.js';

// Pre-allocated colour objects for interpolation
const _c1 = new THREE.Color();
const _c2 = new THREE.Color();
const _result = new THREE.Color();

const COL_DEEP_GRASS = new THREE.Color(BIOME_DEEP_GRASS);
const COL_LIGHT_GRASS = new THREE.Color(BIOME_LIGHT_GRASS);
const COL_DIRT = new THREE.Color(BIOME_DIRT);
const COL_ROCK = new THREE.Color(BIOME_ROCK);
const COL_SNOW = new THREE.Color(BIOME_SNOW);

export class BiomeSystem {
    /**
     * Determine terrain colour for a vertex.
     * @param {number} height  World-space height of the vertex
     * @param {number} slope   Normalised slope (0 = flat, 1 = cliff)
     * @returns {THREE.Color}
     */
    getColor(height, slope) {
        // Normalise height to [0,1] range based on max terrain height
        const h = Math.max(0, height) / TERRAIN_HEIGHT_SCALE;

        let baseColor;

        if (h < BIOME_GRASS_MAX) {
            // Low plains → deep grass to light grass
            const t = h / BIOME_GRASS_MAX;
            _result.lerpColors(COL_DEEP_GRASS, COL_LIGHT_GRASS, t);
            baseColor = _result;
        } else if (h < BIOME_DIRT_MAX) {
            // Transition → light grass to dirt
            const t = (h - BIOME_GRASS_MAX) / (BIOME_DIRT_MAX - BIOME_GRASS_MAX);
            _result.lerpColors(COL_LIGHT_GRASS, COL_DIRT, t);
            baseColor = _result;
        } else if (h < BIOME_ROCK_MAX) {
            // Mountain → dirt to rock
            const t = (h - BIOME_DIRT_MAX) / (BIOME_ROCK_MAX - BIOME_DIRT_MAX);
            _result.lerpColors(COL_DIRT, COL_ROCK, t);
            baseColor = _result;
        } else {
            // Peak → rock to snow
            const t = Math.min(1, (h - BIOME_ROCK_MAX) / (1 - BIOME_ROCK_MAX));
            _result.lerpColors(COL_ROCK, COL_SNOW, t);
            baseColor = _result;
        }

        // Steep slopes → rocky regardless of height
        if (slope > BIOME_SLOPE_ROCK_THRESHOLD) {
            const rockBlend = Math.min(1, (slope - BIOME_SLOPE_ROCK_THRESHOLD) / (1 - BIOME_SLOPE_ROCK_THRESHOLD));
            _c1.copy(baseColor);
            _c2.copy(COL_ROCK);
            // Darken rock on slopes slightly
            _c2.multiplyScalar(0.75);
            baseColor.lerpColors(_c1, _c2, rockBlend);
        }

        return baseColor.clone();
    }
}

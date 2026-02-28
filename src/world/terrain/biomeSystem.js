// ============================================================
// biomeSystem.js — Temperature / Moisture → biome classification
// Biomes: ocean, beach, plains, forest, dense_forest, desert,
//         mountains, snow_field, snow_mountain, swamp
// ============================================================
import * as THREE from 'three';
import { SimplexNoise } from '../../utils/noise.js';
import { smoothstep } from '../../utils/math.js';

// ── Biome colour palettes ───────────────────────────────────
const C = (hex) => new THREE.Color(hex);

const BIOME_COLORS = {
  ocean:          { base: C(0x1a5276), shore: C(0x2980b9) },
  deep_ocean:     { base: C(0x0e2f44), shore: C(0x154360) },
  beach:          { base: C(0xf0e68c), wet: C(0xd4c35c) },
  plains:         { base: C(0x7cba3f), dry: C(0xa8c960), lush: C(0x4d8c2a) },
  forest:         { base: C(0x2d6b1b), floor: C(0x3a5a2a) },
  dense_forest:   { base: C(0x1a4a10), moss: C(0x3a6030) },
  desert:         { base: C(0xe8c868), dune: C(0xd4a030), rock: C(0xb8956a) },
  mountains:      { base: C(0x8b7355), rock: C(0x7a7a7a), cliff: C(0x5a5a5a) },
  snow_field:     { base: C(0xe8e8f0), ice: C(0xc8d8e8), frost: C(0xd0e0f0) },
  snow_mountain:  { base: C(0xb0b8c0), peak: C(0xf0f0ff), rock: C(0x6a6a7a) },
  swamp:          { base: C(0x4a6a3a), water: C(0x3a5a2a), mud: C(0x6a5a3a) },
};

// ── Biome IDs (for fast lookup) ────────────────────────────
export const BIOME = {
  DEEP_OCEAN: 0, OCEAN: 1, BEACH: 2, PLAINS: 3, FOREST: 4,
  DENSE_FOREST: 5, DESERT: 6, MOUNTAINS: 7, SNOW_FIELD: 8,
  SNOW_MOUNTAIN: 9, SWAMP: 10,
};

export const BIOME_NAMES = [
  'deep_ocean','ocean','beach','plains','forest','dense_forest',
  'desert','mountains','snow_field','snow_mountain','swamp',
];

const _c1 = new THREE.Color();
const _result = new THREE.Color();

export class BiomeSystem {
  /** @param {number} seed */
  constructor(seed = 42) {
    this._tempNoise  = new SimplexNoise(seed * 1.337);
    this._moistNoise = new SimplexNoise(seed * 2.718);
    this._variNoise  = new SimplexNoise(seed * 4.669);
  }

  /** Temperature 0 (cold) → 1 (hot) */
  getTemperature(wx, wz) {
    const t1 = this._tempNoise.fbm(wx * 0.0008, wz * 0.0008, 3, 2.0, 0.5);
    const t2 = this._tempNoise.fbm(wx * 0.004,  wz * 0.004,  2, 2.0, 0.5) * 0.2;
    return (t1 + t2 + 1) * 0.5;
  }

  /** Moisture 0 (arid) → 1 (wet) */
  getMoisture(wx, wz) {
    const m1 = this._moistNoise.fbm(wx * 0.001, wz * 0.001, 3, 2.0, 0.5);
    const m2 = this._moistNoise.fbm(wx * 0.005, wz * 0.005, 2, 2.0, 0.5) * 0.15;
    return (m1 + m2 + 1) * 0.5;
  }

  /**
   * Classify biome at a world position.
   * @param {number} wx  @param {number} wz  @param {number} elev normalised [0,1]
   * @returns {number}
   */
  getBiome(wx, wz, elev) {
    const temp  = this.getTemperature(wx, wz);
    const moist = this.getMoisture(wx, wz);

    if (elev < 0.08) return BIOME.DEEP_OCEAN;
    if (elev < 0.14) return BIOME.OCEAN;
    if (elev < 0.18) return BIOME.BEACH;

    if (elev > 0.75) return temp < 0.4 ? BIOME.SNOW_MOUNTAIN : BIOME.MOUNTAINS;
    if (elev > 0.55) return temp < 0.35 ? BIOME.SNOW_MOUNTAIN : BIOME.MOUNTAINS;

    if (temp > 0.7 && moist < 0.35) return BIOME.DESERT;
    if (temp < 0.3 && moist > 0.3)  return BIOME.SNOW_FIELD;
    if (temp < 0.35 && elev > 0.4)  return BIOME.SNOW_MOUNTAIN;
    if (moist > 0.7 && temp > 0.4 && elev < 0.25) return BIOME.SWAMP;
    if (moist > 0.6 && temp > 0.35) return BIOME.DENSE_FOREST;
    if (moist > 0.4) return BIOME.FOREST;
    return BIOME.PLAINS;
  }

  /**
   * Terrain vertex colour.
   * @param {number} wx @param {number} wz @param {number} height
   * @param {number} slope @param {number} elev normalised
   * @returns {THREE.Color}
   */
  getColor(wx, wz, height, slope, elev) {
    const biome = this.getBiome(wx, wz, elev);
    const v = (this._variNoise.noise2D(wx * 0.05, wz * 0.05) + 1) * 0.5;

    switch (biome) {
      case BIOME.DEEP_OCEAN:
        _result.lerpColors(BIOME_COLORS.deep_ocean.base, BIOME_COLORS.deep_ocean.shore, v * 0.3);
        break;
      case BIOME.OCEAN:
        _result.lerpColors(BIOME_COLORS.ocean.base, BIOME_COLORS.ocean.shore, smoothstep(0.08, 0.14, elev));
        break;
      case BIOME.BEACH:
        _result.lerpColors(BIOME_COLORS.beach.wet, BIOME_COLORS.beach.base, smoothstep(0.14, 0.18, elev));
        break;
      case BIOME.PLAINS:
        _result.lerpColors(BIOME_COLORS.plains.lush, BIOME_COLORS.plains.dry, v * 0.5 + smoothstep(0.18, 0.4, elev) * 0.5);
        break;
      case BIOME.FOREST:
        _result.lerpColors(BIOME_COLORS.forest.floor, BIOME_COLORS.forest.base, v);
        break;
      case BIOME.DENSE_FOREST:
        _result.lerpColors(BIOME_COLORS.dense_forest.base, BIOME_COLORS.dense_forest.moss, v);
        break;
      case BIOME.DESERT:
        _result.lerpColors(BIOME_COLORS.desert.base, BIOME_COLORS.desert.dune, smoothstep(0.3, 0.7, v));
        if (slope > 0.3) { _c1.copy(_result); _result.lerpColors(_c1, BIOME_COLORS.desert.rock, smoothstep(0.3, 0.6, slope)); }
        break;
      case BIOME.MOUNTAINS:
        _result.lerpColors(BIOME_COLORS.mountains.base, BIOME_COLORS.mountains.rock, smoothstep(0.4, 0.7, elev));
        if (slope > 0.35) { _c1.copy(_result); _result.lerpColors(_c1, BIOME_COLORS.mountains.cliff, smoothstep(0.35, 0.7, slope)); }
        break;
      case BIOME.SNOW_FIELD:
        _result.lerpColors(BIOME_COLORS.snow_field.base, BIOME_COLORS.snow_field.frost, v);
        if (slope > 0.2) { _c1.copy(_result); _result.lerpColors(_c1, BIOME_COLORS.snow_field.ice, smoothstep(0.2, 0.5, slope)); }
        break;
      case BIOME.SNOW_MOUNTAIN:
        _result.lerpColors(BIOME_COLORS.snow_mountain.rock, BIOME_COLORS.snow_mountain.peak, smoothstep(0.5, 0.8, elev));
        if (slope < 0.3) { _c1.copy(_result); _result.lerpColors(_c1, BIOME_COLORS.snow_mountain.peak, smoothstep(0.3, 0.1, slope) * 0.6); }
        break;
      case BIOME.SWAMP:
        _result.lerpColors(BIOME_COLORS.swamp.base, BIOME_COLORS.swamp.mud, v);
        if (elev < 0.2) { _c1.copy(_result); _result.lerpColors(_c1, BIOME_COLORS.swamp.water, smoothstep(0.2, 0.15, elev)); }
        break;
      default:
        _result.lerpColors(BIOME_COLORS.plains.base, BIOME_COLORS.plains.dry, 0.5);
    }
    return _result.clone();
  }

  /**
   * Write biome colour directly into a Float32Array (avoids Color allocation).
   * @param {number} wx @param {number} wz @param {number} height
   * @param {number} slope @param {number} elev
   * @param {Float32Array} out @param {number} offset
   */
  writeColor(wx, wz, height, slope, elev, out, offset) {
    this.getColor(wx, wz, height, slope, elev);
    out[offset]     = _result.r;
    out[offset + 1] = _result.g;
    out[offset + 2] = _result.b;
  }

  /** Get biome-specific vegetation parameters */
  getVegetationParams(biomeId) {
    switch (biomeId) {
      case BIOME.DEEP_OCEAN: case BIOME.OCEAN:
        return { treeDensity: 0, grassDensity: 0, rockDensity: 0, cactus: false, snowPine: false };
      case BIOME.BEACH:
        return { treeDensity: 0.02, grassDensity: 0.05, rockDensity: 0.02, cactus: false, snowPine: false };
      case BIOME.PLAINS:
        return { treeDensity: 0.06, grassDensity: 0.5, rockDensity: 0.02, cactus: false, snowPine: false };
      case BIOME.FOREST:
        return { treeDensity: 0.3, grassDensity: 0.3, rockDensity: 0.03, cactus: false, snowPine: false };
      case BIOME.DENSE_FOREST:
        return { treeDensity: 0.45, grassDensity: 0.15, rockDensity: 0.04, cactus: false, snowPine: false };
      case BIOME.DESERT:
        return { treeDensity: 0, grassDensity: 0, rockDensity: 0.06, cactus: true, snowPine: false };
      case BIOME.MOUNTAINS:
        return { treeDensity: 0.04, grassDensity: 0.05, rockDensity: 0.15, cactus: false, snowPine: false };
      case BIOME.SNOW_FIELD:
        return { treeDensity: 0.08, grassDensity: 0.02, rockDensity: 0.04, cactus: false, snowPine: true };
      case BIOME.SNOW_MOUNTAIN:
        return { treeDensity: 0.02, grassDensity: 0, rockDensity: 0.12, cactus: false, snowPine: true };
      case BIOME.SWAMP:
        return { treeDensity: 0.15, grassDensity: 0.4, rockDensity: 0.05, cactus: false, snowPine: false };
      default:
        return { treeDensity: 0.1, grassDensity: 0.2, rockDensity: 0.03, cactus: false, snowPine: false };
    }
  }

  /** Get biome-specific animal spawn rates */
  getAnimalParams(biomeId) {
    switch (biomeId) {
      case BIOME.DEEP_OCEAN: case BIOME.OCEAN:
        return { chicken: 0, cow: 0, deer: 0, wolf: 0 };
      case BIOME.BEACH:
        return { chicken: 2, cow: 0, deer: 0, wolf: 0 };
      case BIOME.PLAINS:
        return { chicken: 4, cow: 3, deer: 2, wolf: 0.5 };
      case BIOME.FOREST:
        return { chicken: 2, cow: 1, deer: 3, wolf: 1 };
      case BIOME.DENSE_FOREST:
        return { chicken: 1, cow: 0, deer: 2, wolf: 2 };
      case BIOME.DESERT:
        return { chicken: 1, cow: 0, deer: 0, wolf: 0.5 };
      case BIOME.MOUNTAINS:
        return { chicken: 0, cow: 0, deer: 1, wolf: 1 };
      case BIOME.SNOW_FIELD:
        return { chicken: 0, cow: 0, deer: 1, wolf: 1.5 };
      case BIOME.SNOW_MOUNTAIN:
        return { chicken: 0, cow: 0, deer: 0.5, wolf: 1 };
      case BIOME.SWAMP:
        return { chicken: 2, cow: 1, deer: 1, wolf: 0.5 };
      default:
        return { chicken: 2, cow: 1, deer: 1, wolf: 0.5 };
    }
  }
}

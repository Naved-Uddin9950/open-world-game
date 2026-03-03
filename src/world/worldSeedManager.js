// ============================================================
// worldSeedManager.js — Deterministic seed-based world generation
// ============================================================
// For multiplayer mode: same seed → same world.
// For singleplayer: random seed on new game.
// ============================================================

/**
 * Simple deterministic PRNG (mulberry32).
 * Given a seed, always produces the same sequence.
 */
export function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Hash a string to a 32-bit integer seed.
 */
export function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    hash = ((hash << 5) - hash + ch) | 0;
  }
  return hash >>> 0;
}

export class WorldSeedManager {
  /**
   * @param {string|number} [seed] - If omitted, generates random seed
   */
  constructor(seed) {
    if (seed === undefined || seed === null) {
      this.seed = Math.floor(Math.random() * 0xffffffff);
    } else if (typeof seed === 'string') {
      this.seed = hashString(seed);
    } else {
      this.seed = seed >>> 0;
    }

    this._rng = mulberry32(this.seed);
    this.seedString = this.seed.toString(16).toUpperCase().padStart(8, '0');
  }

  /** Get next random float [0, 1) */
  random() {
    return this._rng();
  }

  /** Get random int in [min, max] inclusive */
  randomInt(min, max) {
    return min + Math.floor(this._rng() * (max - min + 1));
  }

  /** Get random float in [min, max) */
  randomFloat(min, max) {
    return min + this._rng() * (max - min);
  }

  /**
   * Get a deterministic RNG for a specific chunk/position.
   * Combines world seed with position for local determinism.
   * @param {number} cx - Chunk X
   * @param {number} cz - Chunk Z
   * @returns {function} RNG function producing floats [0,1)
   */
  chunkRNG(cx, cz) {
    const localSeed = (this.seed ^ (cx * 374761393 + cz * 668265263)) >>> 0;
    return mulberry32(localSeed);
  }

  /**
   * Serialize for saving.
   */
  serialize() {
    return { seed: this.seed, seedString: this.seedString };
  }

  /**
   * Restore from save data.
   */
  static fromSave(data) {
    return new WorldSeedManager(data.seed);
  }
}

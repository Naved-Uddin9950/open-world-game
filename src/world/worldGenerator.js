// ============================================================
// worldGenerator.js — Finite deterministic world generator
// ============================================================
// Uses WorldSeedManager + WorldConfig to generate terrain,
// enemy placements, resource nodes zone-by-zone.
// ============================================================
import { WORLD_SIZE, WORLD_HALF, ZONES, ZONE_ORDER, getZoneAtPosition, getExpectedLevel } from './worldConfig.js';
import { WorldSeedManager } from './worldSeedManager.js';

/**
 * @typedef {object} SpawnPoint
 * @property {number} x
 * @property {number} z
 * @property {string} type - creature / resource type
 * @property {number} level
 */

export class WorldGenerator {
  /**
   * @param {string|number} [seed]
   */
  constructor(seed) {
    this.seedManager = new WorldSeedManager(seed);
    this._generated = false;

    /** @type {Map<string, SpawnPoint[]>} zoneId → spawn points */
    this._creatureSpawns = new Map();

    /** @type {Map<string, SpawnPoint[]>} zoneId → resource nodes */
    this._resourceNodes = new Map();

    /** @type {Map<string, object>} zoneId → zone terrain params */
    this._zoneTerrainParams = new Map();
  }

  get seed() { return this.seedManager.seed; }
  get seedString() { return this.seedManager.seedString; }

  /**
   * Generate the entire finite world.
   * Call once at game start (or load from save).
   */
  generate() {
    if (this._generated) return;
    this._generated = true;

    for (const zoneId of ZONE_ORDER) {
      this._generateZone(zoneId);
    }
  }

  /**
   * Generate creature spawns + resource nodes for a zone.
   */
  _generateZone(zoneId) {
    const zone = ZONES[zoneId];
    if (!zone) return;

    const [minX, minZ, maxX, maxZ] = zone.bounds;
    const rng = this.seedManager.chunkRNG(
      Math.floor(minX / 64),
      Math.floor(minZ / 64)
    );

    // ── Terrain parameters (for the terrain generator to use) ──
    this._zoneTerrainParams.set(zoneId, {
      terrain: zone.terrain,
      biome: zone.biome,
      heightScale: this._getHeightScaleForTerrain(zone.terrain),
      roughness: this._getRoughnessForTerrain(zone.terrain),
    });

    // ── Creature spawns ──────────────────────────────────────
    const creatures = [];
    const [minLevel, maxLevel] = zone.levelRange;
    const areaWidth = maxX - minX;
    const areaDepth = maxZ - minZ;
    const area = areaWidth * areaDepth;
    const creatureDensity = 0.00015; // per square unit
    const creatureCount = Math.floor(area * creatureDensity);

    for (let i = 0; i < creatureCount; i++) {
      const x = minX + rng() * areaWidth;
      const z = minZ + rng() * areaDepth;
      const type = zone.enemyTypes[Math.floor(rng() * zone.enemyTypes.length)];
      const levelSpread = rng();
      const level = Math.round(minLevel + (maxLevel - minLevel) * levelSpread);

      creatures.push({ x, z, type, level });
    }
    this._creatureSpawns.set(zoneId, creatures);

    // ── Resource nodes ───────────────────────────────────────
    const resources = [];
    const resourceDensity = 0.00008;
    const resourceCount = Math.floor(area * resourceDensity);

    for (let i = 0; i < resourceCount; i++) {
      const x = minX + rng() * areaWidth;
      const z = minZ + rng() * areaDepth;
      const type = zone.resourceTypes[Math.floor(rng() * zone.resourceTypes.length)];

      resources.push({ x, z, type, level: minLevel });
    }
    this._resourceNodes.set(zoneId, resources);
  }

  _getHeightScaleForTerrain(terrain) {
    const scales = {
      plains: 40,
      forest: 55,
      volcanic: 90,
      tundra: 60,
      desert: 35,
    };
    return scales[terrain] || 50;
  }

  _getRoughnessForTerrain(terrain) {
    const rough = {
      plains: 0.3,
      forest: 0.5,
      volcanic: 0.8,
      tundra: 0.4,
      desert: 0.25,
    };
    return rough[terrain] || 0.4;
  }

  // ── Public queries ──────────────────────────────────────

  /**
   * Get creature spawns near a position.
   * @param {number} x
   * @param {number} z
   * @param {number} radius
   * @returns {SpawnPoint[]}
   */
  getCreatureSpawnsNear(x, z, radius) {
    const results = [];
    const r2 = radius * radius;
    for (const [, spawns] of this._creatureSpawns) {
      for (const sp of spawns) {
        const dx = sp.x - x;
        const dz = sp.z - z;
        if (dx * dx + dz * dz <= r2) {
          results.push(sp);
        }
      }
    }
    return results;
  }

  /**
   * Get resource nodes near a position.
   */
  getResourceNodesNear(x, z, radius) {
    const results = [];
    const r2 = radius * radius;
    for (const [, nodes] of this._resourceNodes) {
      for (const nd of nodes) {
        const dx = nd.x - x;
        const dz = nd.z - z;
        if (dx * dx + dz * dz <= r2) {
          results.push(nd);
        }
      }
    }
    return results;
  }

  /**
   * Get all creature spawns in a specific zone.
   */
  getZoneCreatures(zoneId) {
    return this._creatureSpawns.get(zoneId) || [];
  }

  /**
   * Get terrain parameters for a zone.
   */
  getZoneTerrainParams(zoneId) {
    return this._zoneTerrainParams.get(zoneId) || null;
  }

  /**
   * Get the player location info (zone + level info).
   */
  getPlayerLocation(x, z) {
    const zone = getZoneAtPosition(x, z);
    const expectedLevel = getExpectedLevel(x, z);
    return {
      zone: zone ? zone.id : 'wilderness',
      zoneName: zone ? zone.name : 'Wilderness',
      expectedLevel,
      inBounds: Math.abs(x) <= WORLD_HALF && Math.abs(z) <= WORLD_HALF,
    };
  }

  // ── Serialization ─────────────────────────────────────────

  serialize() {
    return {
      seed: this.seedManager.serialize(),
      generated: this._generated,
    };
  }

  static fromSave(data) {
    const gen = new WorldGenerator();
    gen.seedManager = WorldSeedManager.fromSave(data.seed);
    if (data.generated) gen.generate();
    return gen;
  }
}

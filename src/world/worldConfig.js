// ============================================================
// worldConfig.js — Finite world configuration & zone definitions
// ============================================================
// Defines the full game world: size, zones, spawn points.
// Multiplayer-ready: deterministic seed-based generation.
// ============================================================

/**
 * World size in world units (one unit ≈ one meter).
 * The world is a rectangle: -HALF to +HALF on both axes.
 */
export const WORLD_SIZE = 4096;
export const WORLD_HALF = WORLD_SIZE / 2;

/**
 * Zone definitions — each zone occupies a region of the world.
 * Coordinates are world-space (origin at center).
 */
export const ZONES = {
  rookieTown: {
    id: 'rookieTown',
    name: 'Rookie Town',
    description: 'A peaceful medieval starting village surrounded by gentle meadows.',
    levelRange: [1, 10],
    // Axis-aligned bounding box [minX, minZ, maxX, maxZ]
    bounds: [-512, -512, 512, 512],
    terrain: 'plains',
    biome: 'grassland',
    weather: ['clear', 'cloudy'],
    enemyTypes: ['slime', 'smallGoblin'],
    resourceTypes: ['herb', 'wood', 'stone'],
    spawnPoint: { x: 0, y: 0, z: 0 },
    ambientColor: 0x88cc88,
    fogColor: 0xc8e8c8,
    musicTrack: 'town_peaceful',
    hasShop: true,
    hasGuild: true,
    isStartZone: true,
  },

  goblinForest: {
    id: 'goblinForest',
    name: 'Goblin Forest',
    description: 'A dense, dark forest crawling with goblins and dire wolves.',
    levelRange: [8, 25],
    bounds: [-2048, 512, 0, 2048],
    terrain: 'forest',
    biome: 'darkForest',
    weather: ['foggy', 'rain', 'cloudy'],
    enemyTypes: ['goblin', 'goblinArcher', 'direWolf', 'forestGolem'],
    resourceTypes: ['darkWood', 'mushroom', 'goblinEar', 'wolfPelt'],
    spawnPoint: { x: -1024, y: 0, z: 1280 },
    ambientColor: 0x336633,
    fogColor: 0x445544,
    musicTrack: 'forest_danger',
    hasShop: false,
    hasGuild: false,
    isStartZone: false,
  },

  dragonValley: {
    id: 'dragonValley',
    name: 'Dragon Valley',
    description: 'Scorched valleys and volcanic ridges home to wyverns and drakes.',
    levelRange: [20, 45],
    bounds: [512, -512, 2048, 512],
    terrain: 'volcanic',
    biome: 'scorched',
    weather: ['ashfall', 'clear', 'heatwave'],
    enemyTypes: ['orc', 'undeadKnight', 'wyvern', 'fireDrake'],
    resourceTypes: ['obsidian', 'dragonScale', 'fireEssence', 'sulfur'],
    spawnPoint: { x: 1280, y: 0, z: 0 },
    ambientColor: 0xcc6633,
    fogColor: 0x886644,
    musicTrack: 'valley_epic',
    hasShop: true,
    hasGuild: true,
    isStartZone: false,
  },

  frozenNorth: {
    id: 'frozenNorth',
    name: 'Frozen North',
    description: 'Endless tundra and ice caves guarded by frost beasts and ice golems.',
    levelRange: [30, 60],
    bounds: [-2048, -2048, 512, -512],
    terrain: 'tundra',
    biome: 'snowfield',
    weather: ['blizzard', 'snow', 'clear'],
    enemyTypes: ['iceGolem', 'frostBear', 'iceDragon', 'demonGeneral'],
    resourceTypes: ['frostCrystal', 'iceCore', 'yeti Fur', 'ancientRune'],
    spawnPoint: { x: -768, y: 0, z: -1280 },
    ambientColor: 0x8888cc,
    fogColor: 0xaabbdd,
    musicTrack: 'frozen_ambient',
    hasShop: false,
    hasGuild: false,
    isStartZone: false,
  },

  desertEmpire: {
    id: 'desertEmpire',
    name: 'Desert Empire',
    description: 'Vast sand dunes and ancient ruins hiding powerful demon lords.',
    levelRange: [40, 80],
    bounds: [0, -2048, 2048, -512],
    terrain: 'desert',
    biome: 'arid',
    weather: ['sandstorm', 'clear', 'heatwave'],
    enemyTypes: ['sandGolem', 'scorpionKing', 'demonGeneral', 'ancientDragon'],
    resourceTypes: ['goldOre', 'ancientShard', 'demonHeart', 'sunStone'],
    spawnPoint: { x: 1024, y: 0, z: -1280 },
    ambientColor: 0xccaa66,
    fogColor: 0xddcc88,
    musicTrack: 'desert_mystery',
    hasShop: true,
    hasGuild: true,
    isStartZone: false,
  },
};

/** All zone IDs in recommended progression order */
export const ZONE_ORDER = [
  'rookieTown',
  'goblinForest',
  'dragonValley',
  'frozenNorth',
  'desertEmpire',
];

/**
 * Get the zone that contains a given world position.
 * @param {number} x - World X
 * @param {number} z - World Z
 * @returns {object|null} Zone config or null if in wilderness
 */
export function getZoneAtPosition(x, z) {
  for (const id of ZONE_ORDER) {
    const zone = ZONES[id];
    const [minX, minZ, maxX, maxZ] = zone.bounds;
    if (x >= minX && x <= maxX && z >= minZ && z <= maxZ) {
      return zone;
    }
  }
  return null; // Wilderness (between zones)
}

/**
 * Get zone ID at position.
 */
export function getZoneIdAtPosition(x, z) {
  const z2 = getZoneAtPosition(x, z);
  return z2 ? z2.id : 'wilderness';
}

/**
 * Get all zones within a radius of a position.
 */
export function getZonesInRadius(x, z, radius) {
  const results = [];
  for (const id of ZONE_ORDER) {
    const zone = ZONES[id];
    const [minX, minZ, maxX, maxZ] = zone.bounds;
    // Distance from point to AABB
    const closestX = Math.max(minX, Math.min(x, maxX));
    const closestZ = Math.max(minZ, Math.min(z, maxZ));
    const dx = x - closestX;
    const dz = z - closestZ;
    if (Math.sqrt(dx * dx + dz * dz) <= radius) {
      results.push(zone);
    }
  }
  return results;
}

/**
 * Get the expected enemy level for a position.
 */
export function getExpectedLevel(x, z) {
  const zone = getZoneAtPosition(x, z);
  if (!zone) return 5; // wilderness default
  const [min, max] = zone.levelRange;
  // Gradient based on distance from zone spawn
  const sp = zone.spawnPoint;
  const dx = x - sp.x;
  const dz = z - sp.z;
  const dist = Math.sqrt(dx * dx + dz * dz);
  const [bMinX, bMinZ, bMaxX, bMaxZ] = zone.bounds;
  const maxDist = Math.sqrt(
    Math.pow(bMaxX - bMinX, 2) + Math.pow(bMaxZ - bMinZ, 2)
  ) / 2;
  const t = Math.min(1, dist / Math.max(1, maxDist));
  return Math.round(min + (max - min) * t);
}

/**
 * Get world info object (for multiplayer sync / HUD).
 */
export function getWorldInfo() {
  return {
    size: WORLD_SIZE,
    halfSize: WORLD_HALF,
    zones: ZONE_ORDER.map(id => ({
      id,
      name: ZONES[id].name,
      levelRange: ZONES[id].levelRange,
      bounds: ZONES[id].bounds,
    })),
  };
}

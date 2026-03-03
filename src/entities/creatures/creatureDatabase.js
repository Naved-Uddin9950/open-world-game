// ============================================================
// creatureDatabase.js — Fantasy creature definitions
// ============================================================
// Replaces old animals: chicken→slime, deer→goblin,
// wolf→dire wolf, cow→forest golem.
// Zone-tiered creatures with stats, drops, AI behaviour.
// ============================================================
import { getCreatureStats } from '../../systems/statCurves.js';

/**
 * @typedef {object} CreatureDef
 * @property {string} id
 * @property {string} name
 * @property {string} type       - melee | ranged | magic | boss
 * @property {string} tier       - rookie | mid | high | elite | boss
 * @property {number} baseLevel  - Minimum natural level
 * @property {object} baseStats  - { hp, damage, speed, aggroRadius }
 * @property {object} curveOverrides - Overrides for stat curve configs
 * @property {string[]} drops    - Item IDs that can drop
 * @property {number} expReward  - Base EXP (scaled by statCurves)
 * @property {number} dropChance - Skill point drop chance 0-1
 * @property {string} aiType     - passive | neutral | aggressive | boss
 * @property {object} visual     - { bodyColor, scale, glowColor, meshType }
 */

export const CREATURES = {
  // ═══════════════════════════════════════════════════════════
  // ROOKIE TIER (Rookie Town, level 1-10)
  // ═══════════════════════════════════════════════════════════
  slime: {
    id: 'slime',
    name: 'Slime',
    type: 'melee',
    tier: 'rookie',
    baseLevel: 1,
    baseStats: { hp: 30, damage: 5, speed: 1.5, aggroRadius: 0 },
    curveOverrides: {},
    drops: ['slimeGel', 'slimeCore'],
    expReward: 10,
    dropChance: 0.1,
    aiType: 'passive',
    visual: {
      bodyColor: 0x44cc66,
      scale: 0.8,
      glowColor: 0x66ff88,
      meshType: 'slime',
    },
  },

  smallGoblin: {
    id: 'smallGoblin',
    name: 'Small Goblin',
    type: 'melee',
    tier: 'rookie',
    baseLevel: 3,
    baseStats: { hp: 45, damage: 8, speed: 2.5, aggroRadius: 12 },
    curveOverrides: {},
    drops: ['goblinEar', 'rustyDagger'],
    expReward: 18,
    dropChance: 0.15,
    aiType: 'aggressive',
    visual: {
      bodyColor: 0x668833,
      scale: 0.7,
      glowColor: 0x88aa44,
      meshType: 'goblin',
    },
  },

  // ═══════════════════════════════════════════════════════════
  // MID TIER (Goblin Forest, level 8-25)
  // ═══════════════════════════════════════════════════════════
  goblin: {
    id: 'goblin',
    name: 'Goblin Warrior',
    type: 'melee',
    tier: 'mid',
    baseLevel: 8,
    baseStats: { hp: 80, damage: 15, speed: 3.0, aggroRadius: 18 },
    curveOverrides: {},
    drops: ['goblinEar', 'ironSword', 'leatherArmor'],
    expReward: 30,
    dropChance: 0.25,
    aiType: 'aggressive',
    visual: {
      bodyColor: 0x556622,
      scale: 0.9,
      glowColor: 0x778833,
      meshType: 'goblin',
    },
  },

  goblinArcher: {
    id: 'goblinArcher',
    name: 'Goblin Archer',
    type: 'ranged',
    tier: 'mid',
    baseLevel: 10,
    baseStats: { hp: 60, damage: 20, speed: 2.5, aggroRadius: 25 },
    curveOverrides: { damage: { base: 15, scaleFactor: 8, exponent: 1.25, softCap: 35, softMult: 0.5 } },
    drops: ['goblinEar', 'shortBow', 'arrow'],
    expReward: 35,
    dropChance: 0.3,
    aiType: 'aggressive',
    visual: {
      bodyColor: 0x557733,
      scale: 0.85,
      glowColor: 0x88aa55,
      meshType: 'goblin',
    },
  },

  direWolf: {
    id: 'direWolf',
    name: 'Dire Wolf',
    type: 'melee',
    tier: 'mid',
    baseLevel: 12,
    baseStats: { hp: 120, damage: 22, speed: 5.0, aggroRadius: 30 },
    curveOverrides: {},
    drops: ['wolfPelt', 'fang', 'wolfMeat'],
    expReward: 50,
    dropChance: 0.35,
    aiType: 'aggressive',
    visual: {
      bodyColor: 0x444455,
      scale: 1.3,
      glowColor: 0x6666aa,
      meshType: 'wolf',
    },
  },

  forestGolem: {
    id: 'forestGolem',
    name: 'Forest Golem',
    type: 'melee',
    tier: 'mid',
    baseLevel: 15,
    baseStats: { hp: 250, damage: 30, speed: 1.2, aggroRadius: 15 },
    curveOverrides: { hp: { base: 80, scaleFactor: 5, exponent: 1.3, softCap: 35, softMult: 0.5 } },
    drops: ['mossStone', 'ancientBark', 'natureShard'],
    expReward: 65,
    dropChance: 0.4,
    aiType: 'neutral',
    visual: {
      bodyColor: 0x445533,
      scale: 2.0,
      glowColor: 0x66aa44,
      meshType: 'golem',
    },
  },

  // ═══════════════════════════════════════════════════════════
  // HIGH TIER (Dragon Valley / Frozen North, level 20-60)
  // ═══════════════════════════════════════════════════════════
  orc: {
    id: 'orc',
    name: 'Orc Berserker',
    type: 'melee',
    tier: 'high',
    baseLevel: 20,
    baseStats: { hp: 300, damage: 40, speed: 3.5, aggroRadius: 20 },
    curveOverrides: {},
    drops: ['orcTusk', 'heavyAxe', 'chainMail'],
    expReward: 80,
    dropChance: 0.3,
    aiType: 'aggressive',
    visual: {
      bodyColor: 0x445522,
      scale: 1.6,
      glowColor: 0x668833,
      meshType: 'orc',
    },
  },

  undeadKnight: {
    id: 'undeadKnight',
    name: 'Undead Knight',
    type: 'melee',
    tier: 'high',
    baseLevel: 25,
    baseStats: { hp: 350, damage: 45, speed: 2.8, aggroRadius: 22 },
    curveOverrides: {},
    drops: ['cursedBone', 'knightSword', 'plateArmor'],
    expReward: 100,
    dropChance: 0.35,
    aiType: 'aggressive',
    visual: {
      bodyColor: 0x334444,
      scale: 1.5,
      glowColor: 0x44aaaa,
      meshType: 'undead',
    },
  },

  wyvern: {
    id: 'wyvern',
    name: 'Wyvern',
    type: 'melee',
    tier: 'high',
    baseLevel: 30,
    baseStats: { hp: 500, damage: 55, speed: 6.0, aggroRadius: 35 },
    curveOverrides: {},
    drops: ['wyvernScale', 'wyvernWing', 'fireEssence'],
    expReward: 150,
    dropChance: 0.4,
    aiType: 'aggressive',
    visual: {
      bodyColor: 0x884422,
      scale: 2.5,
      glowColor: 0xcc6633,
      meshType: 'wyvern',
    },
  },

  iceGolem: {
    id: 'iceGolem',
    name: 'Ice Golem',
    type: 'melee',
    tier: 'high',
    baseLevel: 32,
    baseStats: { hp: 600, damage: 50, speed: 1.5, aggroRadius: 18 },
    curveOverrides: { hp: { base: 100, scaleFactor: 4, exponent: 1.35, softCap: 40, softMult: 0.5 } },
    drops: ['frostCrystal', 'iceCore', 'frozenHeart'],
    expReward: 160,
    dropChance: 0.4,
    aiType: 'neutral',
    visual: {
      bodyColor: 0x88aacc,
      scale: 2.2,
      glowColor: 0xaaccff,
      meshType: 'golem',
    },
  },

  frostBear: {
    id: 'frostBear',
    name: 'Frost Bear',
    type: 'melee',
    tier: 'high',
    baseLevel: 35,
    baseStats: { hp: 450, damage: 60, speed: 4.0, aggroRadius: 25 },
    curveOverrides: {},
    drops: ['bearPelt', 'frostClaw', 'bearMeat'],
    expReward: 140,
    dropChance: 0.35,
    aiType: 'neutral',
    visual: {
      bodyColor: 0xccddee,
      scale: 1.8,
      glowColor: 0xeeffff,
      meshType: 'bear',
    },
  },

  fireDrake: {
    id: 'fireDrake',
    name: 'Fire Drake',
    type: 'magic',
    tier: 'high',
    baseLevel: 35,
    baseStats: { hp: 550, damage: 65, speed: 5.5, aggroRadius: 30 },
    curveOverrides: {},
    drops: ['dragonScale', 'fireEssence', 'drakeFang'],
    expReward: 180,
    dropChance: 0.4,
    aiType: 'aggressive',
    visual: {
      bodyColor: 0xcc4411,
      scale: 2.3,
      glowColor: 0xff6622,
      meshType: 'drake',
    },
  },

  // ═══════════════════════════════════════════════════════════
  // ELITE / BOSS TIER (Desert Empire + endgame, level 40-80+)
  // ═══════════════════════════════════════════════════════════
  sandGolem: {
    id: 'sandGolem',
    name: 'Sand Golem',
    type: 'melee',
    tier: 'elite',
    baseLevel: 40,
    baseStats: { hp: 800, damage: 70, speed: 2.0, aggroRadius: 20 },
    curveOverrides: {},
    drops: ['sandCore', 'goldOre', 'ancientShard'],
    expReward: 200,
    dropChance: 0.4,
    aiType: 'neutral',
    visual: {
      bodyColor: 0xccaa66,
      scale: 2.5,
      glowColor: 0xddbb77,
      meshType: 'golem',
    },
  },

  scorpionKing: {
    id: 'scorpionKing',
    name: 'Scorpion King',
    type: 'melee',
    tier: 'elite',
    baseLevel: 45,
    baseStats: { hp: 700, damage: 80, speed: 4.0, aggroRadius: 25 },
    curveOverrides: {},
    drops: ['scorpionShell', 'venomSac', 'desertFang'],
    expReward: 220,
    dropChance: 0.45,
    aiType: 'aggressive',
    visual: {
      bodyColor: 0x886633,
      scale: 2.0,
      glowColor: 0xaa8844,
      meshType: 'scorpion',
    },
  },

  demonGeneral: {
    id: 'demonGeneral',
    name: 'Demon General',
    type: 'magic',
    tier: 'boss',
    baseLevel: 55,
    baseStats: { hp: 2000, damage: 120, speed: 4.5, aggroRadius: 40 },
    curveOverrides: {
      hp: { base: 200, scaleFactor: 3, exponent: 1.4, softCap: 50, softMult: 0.5 },
      damage: { base: 30, scaleFactor: 6, exponent: 1.3, softCap: 50, softMult: 0.5 },
    },
    drops: ['demonHeart', 'cursedBlade', 'demonArmor', 'legendaryGem'],
    expReward: 500,
    dropChance: 0.8,
    aiType: 'aggressive',
    visual: {
      bodyColor: 0x882222,
      scale: 2.8,
      glowColor: 0xff4444,
      meshType: 'demon',
    },
  },

  iceDragon: {
    id: 'iceDragon',
    name: 'Ice Dragon',
    type: 'magic',
    tier: 'boss',
    baseLevel: 50,
    baseStats: { hp: 3000, damage: 100, speed: 5.0, aggroRadius: 45 },
    curveOverrides: {
      hp: { base: 250, scaleFactor: 3, exponent: 1.35, softCap: 45, softMult: 0.55 },
    },
    drops: ['dragonScale', 'frostCrystal', 'dragonHeart', 'iceBreath'],
    expReward: 600,
    dropChance: 0.9,
    aiType: 'aggressive',
    visual: {
      bodyColor: 0x6688bb,
      scale: 3.5,
      glowColor: 0x99bbee,
      meshType: 'dragon',
    },
  },

  ancientDragon: {
    id: 'ancientDragon',
    name: 'Ancient Dragon',
    type: 'magic',
    tier: 'boss',
    baseLevel: 70,
    baseStats: { hp: 5000, damage: 150, speed: 6.0, aggroRadius: 50 },
    curveOverrides: {
      hp: { base: 400, scaleFactor: 2, exponent: 1.4, softCap: 60, softMult: 0.5 },
      damage: { base: 50, scaleFactor: 4, exponent: 1.35, softCap: 60, softMult: 0.5 },
    },
    drops: ['ancientShard', 'dragonHeart', 'legendaryGem', 'ancientRune', 'sunStone'],
    expReward: 1000,
    dropChance: 1.0,
    aiType: 'aggressive',
    visual: {
      bodyColor: 0x998844,
      scale: 4.0,
      glowColor: 0xccaa66,
      meshType: 'dragon',
    },
  },
};

/** Lookup by tier */
export function getCreaturesByTier(tier) {
  return Object.values(CREATURES).filter(c => c.tier === tier);
}

/** Lookup by zone enemy types */
export function getCreaturesForZone(zoneEnemyTypes) {
  return zoneEnemyTypes
    .map(id => CREATURES[id])
    .filter(Boolean);
}

/**
 * Compute scaled stats for a creature at a specific level.
 * @param {string} creatureId
 * @param {number} level
 * @returns {{ hp: number, damage: number, speed: number, exp: number }}
 */
export function getScaledCreatureStats(creatureId, level) {
  const def = CREATURES[creatureId];
  if (!def) return { hp: 50, damage: 10, speed: 2, exp: 10 };

  const curveStats = getCreatureStats(level, def.curveOverrides);

  return {
    hp: Math.max(def.baseStats.hp, curveStats.hp),
    damage: Math.max(def.baseStats.damage, curveStats.damage),
    speed: def.baseStats.speed,
    exp: Math.max(def.expReward, curveStats.exp),
    aggroRadius: def.baseStats.aggroRadius,
  };
}

/**
 * Get all creature IDs.
 */
export function getAllCreatureIds() {
  return Object.keys(CREATURES);
}

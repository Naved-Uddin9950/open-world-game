// ============================================================
// evolutionTree.js — JSON-configurable wolf evolution data
// ============================================================
// 4 stages: Familiar Wolf → Dire Fang Wolf → Shadow Fenrir → Spirit Alpha
// Each stage modifies: stats, AI aggression, skill unlocks, visual scale
// ============================================================

/**
 * Evolution stage definitions.
 * All values are config-driven for easy rebalancing.
 */
export const EVOLUTION_STAGES = {
  familiarWolf: {
    id: 'familiarWolf',
    name: 'Familiar Wolf',
    requiredLevel: 1,
    // ── Combat multipliers (applied on top of base) ─────
    hpMult: 1.0,
    damageMult: 1.0,
    speedMult: 1.0,
    // ── Visual ──────────────────────────────────────────
    scale: 1.0,
    glowColor: 0x4488ff,
    bodyColor: 0x555566,
    // ── AI behaviour ────────────────────────────────────
    aggroRange: 12,
    aggressionLevel: 0.4,    // 0-1, chance to attack vs defend
    canAOE: false,
    canHowl: false,           // buff howl ability
    // ── Abilities unlocked ──────────────────────────────
    abilities: ['bite'],
    // ── EXP curve for this stage ────────────────────────
    expToNextLevel: (lvl) => Math.floor(30 * Math.pow(lvl, 1.4)),
  },

  direFangWolf: {
    id: 'direFangWolf',
    name: 'Dire Fang Wolf',
    requiredLevel: 10,
    hpMult: 1.8,
    damageMult: 1.6,
    speedMult: 1.15,
    scale: 1.4,
    glowColor: 0x66aaff,
    bodyColor: 0x445577,
    aggroRange: 16,
    aggressionLevel: 0.6,
    canAOE: false,
    canHowl: true,
    abilities: ['bite', 'fangStrike', 'howl'],
    expToNextLevel: (lvl) => Math.floor(80 * Math.pow(lvl, 1.5)),
  },

  shadowFenrir: {
    id: 'shadowFenrir',
    name: 'Shadow Fenrir',
    requiredLevel: 25,
    hpMult: 3.0,
    damageMult: 2.5,
    speedMult: 1.3,
    scale: 1.9,
    glowColor: 0x9944ff,
    bodyColor: 0x222244,
    aggroRange: 22,
    aggressionLevel: 0.8,
    canAOE: true,
    canHowl: true,
    abilities: ['bite', 'fangStrike', 'howl', 'shadowDash', 'aoeSlash'],
    expToNextLevel: (lvl) => Math.floor(200 * Math.pow(lvl, 1.6)),
  },

  spiritAlpha: {
    id: 'spiritAlpha',
    name: 'Spirit Alpha',
    requiredLevel: 50,
    hpMult: 5.0,
    damageMult: 4.0,
    speedMult: 1.5,
    scale: 2.5,
    glowColor: 0xffdd44,
    bodyColor: 0xeeeeff,
    aggroRange: 30,
    aggressionLevel: 1.0,
    canAOE: true,
    canHowl: true,
    abilities: ['bite', 'fangStrike', 'howl', 'shadowDash', 'aoeSlash', 'spiritBarrier', 'alphaRoar'],
    expToNextLevel: (lvl) => Math.floor(500 * Math.pow(lvl, 1.7)),
  },
};

/** Ordered stages for lookup */
export const STAGE_ORDER = [
  'familiarWolf',
  'direFangWolf',
  'shadowFenrir',
  'spiritAlpha',
];

/**
 * Get the evolution stage config for a given wolf level.
 * @param {number} level
 * @returns {object} stage config from EVOLUTION_STAGES
 */
export function getStageForLevel(level) {
  let stage = EVOLUTION_STAGES.familiarWolf;
  for (const id of STAGE_ORDER) {
    if (level >= EVOLUTION_STAGES[id].requiredLevel) {
      stage = EVOLUTION_STAGES[id];
    }
  }
  return stage;
}

/**
 * Get next evolution stage (or null if max).
 * @param {string} currentStageId
 * @returns {object|null}
 */
export function getNextStage(currentStageId) {
  const idx = STAGE_ORDER.indexOf(currentStageId);
  if (idx < 0 || idx >= STAGE_ORDER.length - 1) return null;
  return EVOLUTION_STAGES[STAGE_ORDER[idx + 1]];
}

/**
 * Calculate total EXP needed to reach a target level from level 1.
 * Uses the current stage's curve.
 * @param {number} targetLevel
 * @returns {number}
 */
export function totalExpToLevel(targetLevel) {
  let total = 0;
  for (let lvl = 1; lvl < targetLevel; lvl++) {
    const stage = getStageForLevel(lvl);
    total += stage.expToNextLevel(lvl);
  }
  return total;
}

/**
 * Wolf ability definitions (used by the evolution AI).
 */
export const WOLF_ABILITIES = {
  bite: {
    name: 'Bite',
    damageMult: 1.0,
    cooldown: 1.0,
    range: 2.2,
    type: 'melee',
  },
  fangStrike: {
    name: 'Fang Strike',
    damageMult: 1.8,
    cooldown: 4.0,
    range: 2.5,
    type: 'melee',
  },
  howl: {
    name: 'Howl',
    damageMult: 0,
    cooldown: 15.0,
    range: 0,
    type: 'buff',
    buffDuration: 8.0,
    buffSpeedMult: 1.3,
    buffDamageMult: 1.4,
  },
  shadowDash: {
    name: 'Shadow Dash',
    damageMult: 2.5,
    cooldown: 8.0,
    range: 10.0,
    type: 'dash',
  },
  aoeSlash: {
    name: 'AOE Slash',
    damageMult: 1.5,
    cooldown: 6.0,
    range: 4.0,
    type: 'aoe',
    aoeRadius: 4.0,
  },
  spiritBarrier: {
    name: 'Spirit Barrier',
    damageMult: 0,
    cooldown: 20.0,
    range: 0,
    type: 'shield',
    shieldAmount: 0.3, // 30% of max HP
    shieldDuration: 10.0,
  },
  alphaRoar: {
    name: 'Alpha Roar',
    damageMult: 0,
    cooldown: 30.0,
    range: 15.0,
    type: 'debuff',
    debuffDuration: 5.0,
    debuffSpeedMult: 0.5,
  },
};

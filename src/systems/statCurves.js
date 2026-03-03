// ============================================================
// statCurves.js — Non-linear stat scaling system
// ============================================================
// Provides curve functions for all stats so growth is:
//   linear (early) → quadratic (mid) → soft exponential (late)
// Also exposes getStatProgressionData() for UI graph rendering.
// ============================================================

/**
 * @typedef {object} CurveConfig
 * @property {number} base       - Value at level 1
 * @property {number} scaleFactor - Divisor for the power term
 * @property {number} exponent   - Power curve exponent (1.15 default)
 * @property {number} softCap    - Level at which growth slows further
 * @property {number} softMult   - Multiplier applied beyond softCap
 */

/** Default curve configurations per stat / derived value */
export const STAT_CURVES = {
  // ── Offensive ─────────────────────────────────────────────
  meleeDamage: {
    base: 25,
    scaleFactor: 12,
    exponent: 1.15,
    softCap: 60,
    softMult: 0.5,
  },
  skillDamage: {
    base: 1.0,
    scaleFactor: 18,
    exponent: 1.2,
    softCap: 70,
    softMult: 0.4,
  },

  // ── Defensive / Survivability ─────────────────────────────
  maxHealth: {
    base: 100,
    scaleFactor: 8,
    exponent: 1.1,
    softCap: 50,
    softMult: 0.6,
  },
  maxStamina: {
    base: 100,
    scaleFactor: 10,
    exponent: 1.1,
    softCap: 50,
    softMult: 0.6,
  },
  defence: {
    base: 5,
    scaleFactor: 20,
    exponent: 1.12,
    softCap: 80,
    softMult: 0.35,
  },

  // ── Speed / Utility ───────────────────────────────────────
  attackSpeed: {
    base: 0.5,   // base cooldown seconds
    scaleFactor: 30,
    exponent: 1.08,
    softCap: 60,
    softMult: 0.4,
    isInverse: true, // lower = better, so curves invert
  },
  cooldownReduction: {
    base: 1.0,   // multiplier (1 = no reduction)
    scaleFactor: 25,
    exponent: 1.1,
    softCap: 60,
    softMult: 0.4,
    isInverse: true,
  },
  staminaEfficiency: {
    base: 1.0,
    scaleFactor: 25,
    exponent: 1.1,
    softCap: 50,
    softMult: 0.45,
    isInverse: true,
  },

  // ── Creature stats (for zone-scaled enemies) ──────────────
  creatureHP: {
    base: 50,
    scaleFactor: 6,
    exponent: 1.25,
    softCap: 40,
    softMult: 0.55,
  },
  creatureDamage: {
    base: 10,
    scaleFactor: 10,
    exponent: 1.2,
    softCap: 40,
    softMult: 0.5,
  },
  creatureEXP: {
    base: 10,
    scaleFactor: 8,
    exponent: 1.3,
    softCap: 50,
    softMult: 0.45,
  },
};

// ════════════════════════════════════════════════════════════
// Core curve evaluation
// ════════════════════════════════════════════════════════════

/**
 * Evaluate a stat curve at a given level.
 *
 * Formula:
 *   value = base * (1 + (level ^ exponent) / scaleFactor)
 * Beyond softCap:
 *   excess = level - softCap
 *   value += base * (excess ^ (exponent * softMult)) / scaleFactor
 *
 * For inverse stats (lower-is-better like cooldowns):
 *   value = base / (1 + (level ^ exponent) / scaleFactor)
 *
 * @param {string|CurveConfig} curveOrName - Curve name from STAT_CURVES or config object
 * @param {number} level - Current stat level (1-based)
 * @returns {number}
 */
export function evaluateCurve(curveOrName, level) {
  const cfg = typeof curveOrName === 'string' ? STAT_CURVES[curveOrName] : curveOrName;
  if (!cfg) return 0;

  const lvl = Math.max(1, level);
  const { base, scaleFactor, exponent, softCap, softMult, isInverse } = cfg;

  const effectiveLevel = Math.min(lvl, softCap);
  let growth = Math.pow(effectiveLevel, exponent) / scaleFactor;

  // Soft-cap overflow
  if (lvl > softCap) {
    const excess = lvl - softCap;
    growth += Math.pow(excess, exponent * softMult) / scaleFactor;
  }

  if (isInverse) {
    // Lower = better (cooldowns, costs)
    return base / (1 + growth);
  }
  return base * (1 + growth);
}

/**
 * Get the flat bonus from a curve at a given level (value - base).
 * Useful for tooltips: "+42 HP from Vitality".
 */
export function getCurveBonus(curveOrName, level) {
  const cfg = typeof curveOrName === 'string' ? STAT_CURVES[curveOrName] : curveOrName;
  if (!cfg) return 0;
  return evaluateCurve(cfg, level) - cfg.base;
}

// ════════════════════════════════════════════════════════════
// UI graph data
// ════════════════════════════════════════════════════════════

/**
 * Generate progression data for a stat curve — suitable for chart rendering.
 *
 * @param {string} statName     - Key from STAT_CURVES
 * @param {number} [startLevel] - Defaults to 1
 * @param {number} [endLevel]   - Defaults to 100
 * @param {number} [step]       - Defaults to 1
 * @returns {Array<{level: number, value: number}>}
 */
export function getStatProgressionData(statName, startLevel = 1, endLevel = 100, step = 1) {
  const data = [];
  for (let lvl = startLevel; lvl <= endLevel; lvl += step) {
    data.push({ level: lvl, value: evaluateCurve(statName, lvl) });
  }
  return data;
}

/**
 * Compute derived combat stats using non-linear curves.
 * Drop-in enhancement over the linear statScaler — same output shape.
 *
 * @param {object} profileData - PlayerProfile.data
 * @returns {import('../combat/statScaler.js').DerivedStats}
 */
export function computeDerivedStatsCurved(profileData) {
  const d = profileData;
  const str = d.strength || 10;
  const agi = d.agility || 10;
  const vit = d.vitality || 10;
  const int = d.intelligence || 10;
  const end = d.endurance || 10;
  const def = d.defence || 5;

  const maxHealth = evaluateCurve('maxHealth', vit);
  const maxStamina = evaluateCurve('maxStamina', end);
  const meleeDamage = Math.round(evaluateCurve('meleeDamage', str));
  const attackCooldown = Math.max(0.15, evaluateCurve('attackSpeed', agi));
  const skillDamageMult = evaluateCurve('skillDamage', int);
  const cooldownMult = Math.max(0.3, evaluateCurve('cooldownReduction', agi));
  const staminaCostMult = Math.max(0.3, evaluateCurve('staminaEfficiency', end));
  const defenceReduction = Math.max(0.1, 1 / (1 + def * 0.008));

  return {
    maxHealth,
    maxStamina,
    meleeDamage,
    meleeDamage01: meleeDamage / 100,
    attackCooldown,
    attackRange: 3.0,
    skillDamageMult,
    cooldownMult,
    staminaCostMult,
    defenceReduction,
  };
}

// ════════════════════════════════════════════════════════════
// Creature stat helper (for zone-scaled enemies)
// ════════════════════════════════════════════════════════════

/**
 * Compute stats for a creature at a given level.
 *
 * @param {number} level - Creature level
 * @param {object} [overrides] - Partial curve config overrides
 * @returns {{ hp: number, damage: number, exp: number }}
 */
export function getCreatureStats(level, overrides = {}) {
  const hpCfg = { ...STAT_CURVES.creatureHP, ...overrides.hp };
  const dmgCfg = { ...STAT_CURVES.creatureDamage, ...overrides.damage };
  const expCfg = { ...STAT_CURVES.creatureEXP, ...overrides.exp };

  return {
    hp: Math.round(evaluateCurve(hpCfg, level)),
    damage: Math.round(evaluateCurve(dmgCfg, level)),
    exp: Math.round(evaluateCurve(expCfg, level)),
  };
}

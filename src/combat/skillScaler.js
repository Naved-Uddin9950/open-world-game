// ============================================================
// skillScaler.js — Scale skill attributes by level + stats
// ============================================================
import {
  SKILL_DAMAGE_PER_LEVEL,
  SKILL_COOLDOWN_REDUCTION_PER_LEVEL,
  SKILL_STAMINA_REDUCTION_PER_LEVEL,
} from '../utils/constants.js';

/**
 * Compute the level-based damage multiplier for a skill.
 * Formula: 1 + SKILL_DAMAGE_PER_LEVEL * (level - 1)
 *
 * @param {number} level - Current skill level (1+)
 * @returns {number} Multiplier (≥ 1.0)
 */
export function levelDamageMult(level = 1) {
  return 1 + SKILL_DAMAGE_PER_LEVEL * Math.max(0, level - 1);
}

/**
 * Compute the level-based cooldown multiplier.
 * Formula: 1 - SKILL_COOLDOWN_REDUCTION_PER_LEVEL * (level - 1), min 0.3
 *
 * @param {number} level
 * @returns {number} Multiplier (0.3–1.0)
 */
export function levelCooldownMult(level = 1) {
  return Math.max(0.3, 1 - SKILL_COOLDOWN_REDUCTION_PER_LEVEL * Math.max(0, level - 1));
}

/**
 * Compute the level-based stamina cost multiplier.
 * Formula: 1 - SKILL_STAMINA_REDUCTION_PER_LEVEL * (level - 1), min 0.4
 *
 * @param {number} level
 * @returns {number} Multiplier (0.4–1.0)
 */
export function levelStaminaCostMult(level = 1) {
  return Math.max(0.4, 1 - SKILL_STAMINA_REDUCTION_PER_LEVEL * Math.max(0, level - 1));
}

/**
 * Get fully scaled skill stats given level and derived player stats.
 *
 * @param {object} baseSkill        - Raw skill definition from SKILLS
 * @param {number} level            - Current skill level
 * @param {object} derivedStats     - From statScaler.computeDerivedStats()
 * @returns {object} Scaled skill object with final damage, cooldown, staminaCost, etc.
 */
export function getScaledSkill(baseSkill, level = 1, derivedStats = null) {
  if (!baseSkill) return null;

  const lvlDmg = levelDamageMult(level);
  const lvlCD = levelCooldownMult(level);
  const lvlCost = levelStaminaCostMult(level);

  // Stat-based multipliers (from intelligence, agility, endurance)
  const statDmgMult = derivedStats ? derivedStats.skillDamageMult : 1;
  const statCDMult = derivedStats ? derivedStats.cooldownMult : 1;
  const statCostMult = derivedStats ? derivedStats.staminaCostMult : 1;

  return {
    ...baseSkill,
    damage: Math.round(baseSkill.damage * lvlDmg * statDmgMult),
    healAmount: Math.round((baseSkill.healAmount || 0) * lvlDmg),
    shieldAmount: Math.round((baseSkill.shieldAmount || 0) * lvlDmg),
    cooldown: +(baseSkill.cooldown * lvlCD * statCDMult).toFixed(2),
    staminaCost: Math.round(baseSkill.staminaCost * lvlCost * statCostMult),
  };
}

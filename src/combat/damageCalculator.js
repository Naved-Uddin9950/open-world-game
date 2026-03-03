// ============================================================
// damageCalculator.js — Stats-based damage formulas
// ============================================================
import {
  BASE_MELEE_DAMAGE,
  STRENGTH_MELEE_MULT,
  INTELLIGENCE_SKILL_MULT,
  DEFENCE_REDUCTION_FACTOR,
  BASE_PLAYER_DEFENCE,
} from '../utils/constants.js';

/**
 * Compute melee damage based on player stats.
 * Formula: BASE_MELEE_DAMAGE * (1 + STRENGTH_MELEE_MULT * (strength - 10))
 *
 * @param {number} strength - Player's strength stat (base 10)
 * @returns {number} Damage on 100-HP scale
 */
export function calcMeleeDamage(strength = 10) {
  const mult = 1 + STRENGTH_MELEE_MULT * Math.max(0, strength - 10);
  return Math.round(BASE_MELEE_DAMAGE * mult);
}

/**
 * Compute skill damage factoring in intelligence and skill level multiplier.
 * Formula: baseSkillDamage * levelMult * (1 + INTELLIGENCE_SKILL_MULT * (intelligence - 10))
 *
 * @param {number} baseSkillDamage - The skill's raw damage at level 1
 * @param {number} levelMult       - Multiplier from skill level (from skillScaler)
 * @param {number} intelligence    - Player's intelligence stat (base 10)
 * @returns {number} Final damage on 100-HP scale
 */
export function calcSkillDamage(baseSkillDamage, levelMult = 1, intelligence = 10) {
  const intMult = 1 + INTELLIGENCE_SKILL_MULT * Math.max(0, intelligence - 10);
  return Math.round(baseSkillDamage * levelMult * intMult);
}

/**
 * Reduce incoming damage by defence.
 * Formula: damage * (1 - DEFENCE_REDUCTION_FACTOR * defence)
 * Minimum 10% of original damage always goes through.
 *
 * @param {number} rawDamage - Incoming damage (any scale)
 * @param {number} defence   - Target's defence stat
 * @returns {number} Damage after defence reduction
 */
export function applyDefence(rawDamage, defence = BASE_PLAYER_DEFENCE) {
  const reduction = 1 - DEFENCE_REDUCTION_FACTOR * defence;
  return Math.max(rawDamage * 0.1, rawDamage * Math.max(0.1, reduction));
}

/**
 * Convert 100-scale damage to 0-1 brain scale.
 * Animals use maxHealth ≤ 2 (typically 1.0).
 * @param {number} damage100 - Damage on 100-HP scale
 * @param {number} brainMaxHP - Brain's maxHealth (typically 1.0)
 * @returns {number} Damage on brain's 0-1 scale
 */
export function toBrainScale(damage100, brainMaxHP = 1.0) {
  if (brainMaxHP <= 2) return damage100 / 100;
  return damage100;
}

/**
 * Convert 100-scale damage to controller's 0-1 scale.
 * @param {number} damage100
 * @returns {number}
 */
export function toControllerScale(damage100) {
  return damage100 / 100;
}

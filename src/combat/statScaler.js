// ============================================================
// statScaler.js — Derive combat stats from base + enhancement points
// ============================================================
import {
  STRENGTH_MELEE_MULT,
  AGILITY_COOLDOWN_REDUCTION,
  AGILITY_ATTACK_SPEED_MULT,
  VITALITY_HP_PER_POINT,
  INTELLIGENCE_SKILL_MULT,
  ENDURANCE_STAMINA_PER_POINT,
  ENDURANCE_COST_REDUCTION,
  BASE_MELEE_DAMAGE,
  BASE_ATTACK_COOLDOWN,
  BASE_ATTACK_RANGE,
  BASE_PLAYER_DEFENCE,
  DEFENCE_REDUCTION_FACTOR,
} from '../utils/constants.js';

/**
 * @typedef {object} DerivedStats
 * @property {number} maxHealth        - Max HP on 100-scale
 * @property {number} maxStamina       - Max stamina on 100-scale
 * @property {number} meleeDamage      - Melee hit damage on 100-scale
 * @property {number} meleeDamage01    - Melee hit damage on 0-1 controller scale
 * @property {number} attackCooldown   - Seconds between melee attacks
 * @property {number} attackRange      - Melee range in meters
 * @property {number} skillDamageMult  - Multiplier applied to all skill damage
 * @property {number} cooldownMult     - Multiplier applied to all skill cooldowns (lower = faster)
 * @property {number} staminaCostMult  - Multiplier applied to all stamina costs (lower = cheaper)
 * @property {number} defenceReduction - Damage multiplier from defence (lower = less damage taken)
 */

/**
 * Compute all derived combat stats from profile data.
 *
 * @param {object} profileData - PlayerProfile.data
 * @returns {DerivedStats}
 */
export function computeDerivedStats(profileData) {
  const d = profileData;
  const str = d.strength || 10;
  const agi = d.agility || 10;
  const vit = d.vitality || 10;
  const int = d.intelligence || 10;
  const end = d.endurance || 10;
  const def = d.defence || BASE_PLAYER_DEFENCE;

  // ── Max HP: base 100 + VITALITY_HP_PER_POINT * (vit - 10) ──
  const bonusHP = VITALITY_HP_PER_POINT * Math.max(0, vit - 10);
  const maxHealth = (d.maxHealth || 100) + bonusHP;

  // ── Max Stamina: base 100 + ENDURANCE_STAMINA_PER_POINT * (end - 10) ──
  const bonusStamina = ENDURANCE_STAMINA_PER_POINT * Math.max(0, end - 10);
  const maxStamina = (d.maxStamina || 100) + bonusStamina;

  // ── Melee damage (100-scale) ──
  const strMult = 1 + STRENGTH_MELEE_MULT * Math.max(0, str - 10);
  const meleeDamage = Math.round(BASE_MELEE_DAMAGE * strMult);

  // ── Attack cooldown: reduced by agility ──
  const agiCDMult = 1 - AGILITY_ATTACK_SPEED_MULT * Math.max(0, agi - 10);
  const attackCooldown = Math.max(0.15, BASE_ATTACK_COOLDOWN * Math.max(0.3, agiCDMult));

  // ── Skill damage multiplier from intelligence ──
  const skillDamageMult = 1 + INTELLIGENCE_SKILL_MULT * Math.max(0, int - 10);

  // ── Skill cooldown multiplier from agility ──
  const cooldownMult = Math.max(0.3, 1 - AGILITY_COOLDOWN_REDUCTION * Math.max(0, agi - 10));

  // ── Stamina cost multiplier from endurance ──
  const staminaCostMult = Math.max(0.3, 1 - ENDURANCE_COST_REDUCTION * Math.max(0, end - 10));

  // ── Defence damage reduction ──
  const defenceReduction = Math.max(0.1, 1 - DEFENCE_REDUCTION_FACTOR * def);

  return {
    maxHealth,
    maxStamina,
    meleeDamage,
    meleeDamage01: meleeDamage / 100,
    attackCooldown,
    attackRange: BASE_ATTACK_RANGE,
    skillDamageMult,
    cooldownMult,
    staminaCostMult,
    defenceReduction,
  };
}

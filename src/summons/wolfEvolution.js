// ============================================================
// wolfEvolution.js — Wolf evolution & independent leveling
// ============================================================
// Each summoned wolf tracks its own EXP / level / evolution stage.
// Owner's intelligence scales growth speed.
// Integrates with SummonWolfManager and FamiliarWolfBrain.
// ============================================================
import {
  EVOLUTION_STAGES,
  STAGE_ORDER,
  getStageForLevel,
  getNextStage,
  WOLF_ABILITIES,
} from './evolutionTree.js';

import {
  FAMILIAR_WOLF_BASE_HP,
  FAMILIAR_WOLF_BASE_DAMAGE,
  FAMILIAR_WOLF_BASE_SPEED,
} from '../utils/constants.js';

// ════════════════════════════════════════════════════════════
// WolfEvolutionData — persistent data for a single wolf
// ════════════════════════════════════════════════════════════

/**
 * Create a fresh wolf evolution data object.
 * @param {string} [name] - Optional wolf name
 * @returns {object}
 */
export function createWolfData(name = 'Wolf') {
  return {
    name,
    level: 1,
    exp: 0,
    expToNext: EVOLUTION_STAGES.familiarWolf.expToNextLevel(1),
    stageId: 'familiarWolf',
    totalKills: 0,
    abilityCooldowns: {},
    // Buff state
    buffActive: false,
    buffTimer: 0,
    buffSpeedMult: 1,
    buffDamageMult: 1,
    // Shield state
    shieldHP: 0,
    shieldTimer: 0,
  };
}

// ════════════════════════════════════════════════════════════
// WolfEvolutionManager — manages all wolves' progression
// ════════════════════════════════════════════════════════════

export class WolfEvolutionManager {
  constructor() {
    /** @type {Map<string, object>} wolfId → wolfData */
    this._wolves = new Map();
    this._ownerIntelligence = 10;
    this._onEvolve = null; // callback(wolfId, oldStage, newStage)
    this._onLevelUp = null; // callback(wolfId, newLevel)
  }

  // ── Configuration ────────────────────────────────────────

  setOwnerIntelligence(int) {
    this._ownerIntelligence = int;
  }

  setEvolveCallback(cb) { this._onEvolve = cb; }
  setLevelUpCallback(cb) { this._onLevelUp = cb; }

  // ── Wolf registration ────────────────────────────────────

  /**
   * Register a new wolf (called when summoned).
   * @param {string} wolfId - Unique mesh uuid
   * @param {string} [name]
   * @returns {object} wolfData
   */
  registerWolf(wolfId, name) {
    const data = createWolfData(name);
    this._wolves.set(wolfId, data);
    return data;
  }

  /**
   * Restore wolf data from a save.
   */
  restoreWolf(wolfId, savedData) {
    this._wolves.set(wolfId, { ...createWolfData(), ...savedData });
  }

  /**
   * Remove a wolf (despawn / death).
   */
  removeWolf(wolfId) {
    this._wolves.delete(wolfId);
  }

  getWolfData(wolfId) {
    return this._wolves.get(wolfId) || null;
  }

  getAllWolves() {
    return Array.from(this._wolves.entries()).map(([id, d]) => ({ id, ...d }));
  }

  // ── EXP / Leveling ──────────────────────────────────────

  /**
   * Award EXP to a wolf (e.g., when it kills or assists).
   * Owner intelligence gives a growth bonus: +2% per INT above 10.
   * @returns {{ leveledUp: boolean, evolved: boolean, newLevel: number, newStage: string }}
   */
  addExp(wolfId, baseExp) {
    const d = this._wolves.get(wolfId);
    if (!d) return { leveledUp: false, evolved: false, newLevel: 0, newStage: '' };

    // Intelligence growth bonus
    const intBonus = 1 + Math.max(0, this._ownerIntelligence - 10) * 0.02;
    const exp = Math.round(baseExp * intBonus);

    d.exp += exp;
    let leveledUp = false;
    let evolved = false;
    const oldStageId = d.stageId;

    // Level up loop
    while (d.exp >= d.expToNext) {
      d.exp -= d.expToNext;
      d.level++;
      leveledUp = true;

      // Recalculate exp for next level using current stage
      const stage = getStageForLevel(d.level);
      d.expToNext = stage.expToNextLevel(d.level);

      // Check evolution
      if (stage.id !== d.stageId) {
        d.stageId = stage.id;
        evolved = true;
      }

      if (this._onLevelUp) this._onLevelUp(wolfId, d.level);
    }

    if (evolved && this._onEvolve) {
      this._onEvolve(wolfId, oldStageId, d.stageId);
    }

    return {
      leveledUp,
      evolved,
      newLevel: d.level,
      newStage: d.stageId,
    };
  }

  /**
   * Award EXP to ALL active wolves (e.g., on any kill in range).
   */
  addExpToAll(baseExp) {
    const results = [];
    for (const [wolfId] of this._wolves) {
      results.push({ wolfId, ...this.addExp(wolfId, baseExp) });
    }
    return results;
  }

  // ── Stat computation ────────────────────────────────────

  /**
   * Get computed combat stats for a wolf.
   * @param {string} wolfId
   * @returns {{ hp: number, damage: number, speed: number, stage: object, level: number }}
   */
  getWolfStats(wolfId) {
    const d = this._wolves.get(wolfId);
    if (!d) return null;
    return this.computeStats(d);
  }

  /**
   * Compute stats from raw wolf data (no wolfId lookup needed).
   */
  computeStats(wolfData) {
    const stage = EVOLUTION_STAGES[wolfData.stageId] || EVOLUTION_STAGES.familiarWolf;
    const lvl = wolfData.level;

    // Per-level scaling: +5% per level
    const levelMult = 1 + (lvl - 1) * 0.05;

    return {
      hp: FAMILIAR_WOLF_BASE_HP * stage.hpMult * levelMult,
      damage: FAMILIAR_WOLF_BASE_DAMAGE * stage.damageMult * levelMult,
      speed: FAMILIAR_WOLF_BASE_SPEED * stage.speedMult * Math.min(levelMult, 1.5),
      aggroRange: stage.aggroRange,
      aggressionLevel: stage.aggressionLevel,
      scale: stage.scale * (1 + (lvl - 1) * 0.008), // subtle growth
      glowColor: stage.glowColor,
      bodyColor: stage.bodyColor,
      abilities: stage.abilities,
      stage,
      level: lvl,
    };
  }

  // ── Abilities ───────────────────────────────────────────

  /**
   * Try to use a wolf ability. Returns ability config if usable, null if on cooldown.
   */
  useAbility(wolfId, abilityId, dt) {
    const d = this._wolves.get(wolfId);
    if (!d) return null;

    const stage = EVOLUTION_STAGES[d.stageId];
    if (!stage.abilities.includes(abilityId)) return null;

    const ability = WOLF_ABILITIES[abilityId];
    if (!ability) return null;

    const cd = d.abilityCooldowns[abilityId] || 0;
    if (cd > 0) return null;

    // Put on cooldown
    d.abilityCooldowns[abilityId] = ability.cooldown;

    // Handle buff type
    if (ability.type === 'buff') {
      d.buffActive = true;
      d.buffTimer = ability.buffDuration;
      d.buffSpeedMult = ability.buffSpeedMult || 1;
      d.buffDamageMult = ability.buffDamageMult || 1;
    }

    // Handle shield type
    if (ability.type === 'shield') {
      const stats = this.computeStats(d);
      d.shieldHP = stats.hp * ability.shieldAmount;
      d.shieldTimer = ability.shieldDuration;
    }

    return ability;
  }

  /**
   * Tick cooldowns and buff timers for all wolves.
   */
  updateCooldowns(dt) {
    for (const [, d] of this._wolves) {
      // Ability cooldowns
      for (const key of Object.keys(d.abilityCooldowns)) {
        d.abilityCooldowns[key] = Math.max(0, d.abilityCooldowns[key] - dt);
      }

      // Buff timer
      if (d.buffActive) {
        d.buffTimer -= dt;
        if (d.buffTimer <= 0) {
          d.buffActive = false;
          d.buffTimer = 0;
          d.buffSpeedMult = 1;
          d.buffDamageMult = 1;
        }
      }

      // Shield timer
      if (d.shieldHP > 0) {
        d.shieldTimer -= dt;
        if (d.shieldTimer <= 0) {
          d.shieldHP = 0;
          d.shieldTimer = 0;
        }
      }
    }
  }

  // ── Serialization ───────────────────────────────────────

  /**
   * Serialize all wolf data for saving.
   * (Strips functions from stage data)
   */
  serialize() {
    const out = [];
    for (const [id, d] of this._wolves) {
      out.push({
        id,
        name: d.name,
        level: d.level,
        exp: d.exp,
        expToNext: d.expToNext,
        stageId: d.stageId,
        totalKills: d.totalKills,
      });
    }
    return out;
  }

  /**
   * Deserialize saved wolf data.
   */
  deserialize(arr) {
    this._wolves.clear();
    if (!Array.isArray(arr)) return;
    for (const item of arr) {
      this.restoreWolf(item.id, item);
    }
  }

  dispose() {
    this._wolves.clear();
  }
}

// ============================================================
// effectSystem.js — Manages active skill effects on entities
// ============================================================

/**
 * ActiveEffect — one instance of an ongoing status effect.
 */
class ActiveEffect {
  constructor(target, type, duration, tickDamage, params = {}) {
    this.target = target;       // { brain, mesh }  or  'player'
    this.type = type;           // burn | freeze | shock | poison | shield | speed | heal
    this.remaining = duration;
    this.tickDamage = tickDamage;
    this.params = params;       // extra data (shieldHP, speedMult, etc.)
    this._tickAccum = 0;
    this._applied = false;
  }
}

/**
 * EffectSystem — ticks every frame, applies DoTs, slows, stuns, shields, etc.
 */
export class EffectSystem {
  constructor() {
    /** @type {ActiveEffect[]} */
    this._effects = [];

    /** Player shield HP (absorbed damage). */
    this.playerShield = 0;
    /** Player speed multiplier from buffs. */
    this.playerSpeedMult = 1.0;
  }

  // ── Public API ────────────────────────────────────────────

  /**
   * Apply a new effect to an enemy brain.
   * @param {{ brain:object, mesh:object }} target
   * @param {string} type
   * @param {number} duration  seconds
   * @param {number} [damage]  per-second DoT
   * @param {object} [params]
   */
  applyToEnemy(target, type, duration, damage = 0, params = {}) {
    if (!target || !target.brain) return;

    // Stack logic: refresh duration if same type exists
    const existing = this._effects.find(
      e => e.target !== 'player' && e.target.brain === target.brain && e.type === type
    );
    if (existing) {
      existing.remaining = Math.max(existing.remaining, duration);
      existing.tickDamage = damage;
      return;
    }

    const eff = new ActiveEffect(target, type, duration, damage, params);

    // Immediate one-time applications
    if (type === 'freeze' && target.brain) {
      target.brain._frozenTimer = duration;
    }
    if (type === 'shock' && target.brain) {
      target.brain._stunnedTimer = duration;
    }
    if (type === 'knockback' && target.brain && target.mesh) {
      const dir = params.knockDir;
      if (dir) {
        target.mesh.position.x += dir.x * 4;
        target.mesh.position.z += dir.z * 4;
      }
    }

    this._effects.push(eff);
  }

  /**
   * Apply a self-buff to the player.
   * @param {string} type  'shield' | 'speed' | 'heal'
   * @param {number} duration
   * @param {object} params  { shieldHP, speedMult, healPerSec }
   */
  applyToPlayer(type, duration, params = {}) {
    const existing = this._effects.find(e => e.target === 'player' && e.type === type);
    if (existing) {
      existing.remaining = Math.max(existing.remaining, duration);
      Object.assign(existing.params, params);
      return;
    }
    const eff = new ActiveEffect('player', type, duration, 0, params);
    this._effects.push(eff);

    if (type === 'shield') this.playerShield = params.shieldHP || 40;
    if (type === 'speed') this.playerSpeedMult = params.speedMult || 4.0;
  }

  /**
   * Absorb damage through shield. Returns remaining damage after absorption.
   * @param {number} incomingDamage
   * @returns {number}
   */
  absorbDamage(incomingDamage) {
    if (this.playerShield <= 0) return incomingDamage;
    const absorbed = Math.min(this.playerShield, incomingDamage);
    this.playerShield -= absorbed;
    return incomingDamage - absorbed;
  }

  /**
   * Tick all active effects.
   * @param {number} dt
   * @param {object} callbacks - { healPlayer(amount), damageEnemy(brain, amount) }
   */
  update(dt, callbacks = {}) {
    for (let i = this._effects.length - 1; i >= 0; i--) {
      const eff = this._effects[i];
      eff.remaining -= dt;

      // ── Enemy effects ─────────────────────────────────
      if (eff.target !== 'player') {
        const brain = eff.target.brain;
        if (!brain || brain.isDead) {
          this._effects.splice(i, 1);
          continue;
        }

        // DoT: burn, poison
        if ((eff.type === 'burn' || eff.type === 'poison') && eff.tickDamage > 0) {
          eff._tickAccum += dt;
          if (eff._tickAccum >= 1.0) {
            eff._tickAccum -= 1.0;
            if (callbacks.damageEnemy) callbacks.damageEnemy(brain, eff.tickDamage);
          }
        }

        // Freeze: override brain speed
        if (eff.type === 'freeze') {
          brain._frozenTimer = Math.max(0, eff.remaining);
          brain.currentSpeed = 0;
        }

        // Shock / stun
        if (eff.type === 'shock') {
          brain._stunnedTimer = Math.max(0, eff.remaining);
        }

        // Color tint on mesh for visual feedback
        this._tintMesh(eff.target.mesh, eff.type, eff.remaining > 0);
      }

      // ── Player effects ────────────────────────────────
      if (eff.target === 'player') {
        if (eff.type === 'heal' && eff.params.healPerSec) {
          eff._tickAccum += dt;
          if (eff._tickAccum >= 0.5) {
            eff._tickAccum -= 0.5;
            if (callbacks.healPlayer) callbacks.healPlayer(eff.params.healPerSec * 0.5);
          }
        }
        if (eff.type === 'speed') {
          this.playerSpeedMult = eff.params.speedMult || 4.0;
        }
        if (eff.type === 'shield') {
          // Shield persists; no per-tick action
        }
      }

      // Expire
      if (eff.remaining <= 0) {
        // Clean up
        if (eff.target !== 'player') {
          if (eff.type === 'freeze' && eff.target.brain) eff.target.brain._frozenTimer = 0;
          if (eff.type === 'shock' && eff.target.brain) eff.target.brain._stunnedTimer = 0;
          this._tintMesh(eff.target.mesh, eff.type, false);
        }
        if (eff.target === 'player') {
          if (eff.type === 'speed') this.playerSpeedMult = 1.0;
          if (eff.type === 'shield') this.playerShield = 0;
        }
        this._effects.splice(i, 1);
      }
    }
  }

  /**
   * Tint an animal mesh to indicate effect.
   */
  _tintMesh(mesh, type, active) {
    if (!mesh) return;
    const color = active ? this._effectColor(type) : null;
    mesh.traverse(child => {
      if (child.isMesh && child.material) {
        if (color) {
          if (!child.userData._origColor) {
            child.userData._origColor = child.material.color ? child.material.color.getHex() : 0xffffff;
          }
          child.material.color.setHex(color);
        } else if (child.userData._origColor !== undefined) {
          child.material.color.setHex(child.userData._origColor);
          delete child.userData._origColor;
        }
      }
    });
  }

  _effectColor(type) {
    switch (type) {
      case 'burn':   return 0xff4400;
      case 'freeze': return 0x66ccff;
      case 'shock':  return 0xffff66;
      case 'poison': return 0x44cc44;
      default:       return 0xffffff;
    }
  }

  /** Remove all effects (e.g. on game reset). */
  clear() {
    // Reset mesh tints
    for (const eff of this._effects) {
      if (eff.target !== 'player' && eff.target.mesh) {
        this._tintMesh(eff.target.mesh, eff.type, false);
      }
    }
    this._effects = [];
    this.playerShield = 0;
    this.playerSpeedMult = 1.0;
  }

  /** Count active effects of a given type. */
  countType(type) {
    return this._effects.filter(e => e.type === type).length;
  }
}

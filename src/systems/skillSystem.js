// ============================================================
// skillSystem.js — 22 skills with stamina cost, cooldown,
//                  damage, effects, and level scaling
// ============================================================
import * as THREE from 'three';
import { getScaledSkill } from '../combat/skillScaler.js';
import { calcSkillDamage, toBrainScale } from '../combat/damageCalculator.js';

// ── Effect types enum ───────────────────────────────────────
export const EFFECT = {
  NONE:      'none',
  BURN:      'burn',       // DoT fire
  FREEZE:    'freeze',     // slow / stop
  SHOCK:     'shock',      // stun / paralyse
  KNOCKBACK: 'knockback',
  POISON:    'poison',     // DoT
  AREA:      'area',       // AoE damage
  SHIELD:    'shield',     // absorption
  SPEED:     'speed',      // self speed boost
  HEAL:      'heal',       // self heal
  SUMMON:    'summon',     // summon helper
};

// ── Skill database (22 skills) ──────────────────────────────
// Fields scale per level: damage *= 1 + 0.15 * (level-1)
export const SKILLS = {
  // ── Default ─────────────────────────
  super_speed: {
    id: 'super_speed',
    name: 'Super Speed',
    description: 'Hold RIGHT SHIFT to sprint 4x faster. Drains stamina.',
    staminaCost: 0,       // passive — handled by movement system
    cooldown: 0,
    damage: 0,
    effectType: EFFECT.SPEED,
    maxLevel: 5,
    category: 'movement',
    tier: 0,
    shopCost: 0,          // free — comes with player
    color: '#00ccff',
    key: 'ShiftRight',
    passive: true,
  },

  // ── Starter skills (pick one) ───────
  fireball: {
    id: 'fireball',
    name: 'Fireball',
    description: 'Lobs a fireball that burns the target over time.',
    staminaCost: 15,
    cooldown: 2.0,
    damage: 20,
    effectType: EFFECT.BURN,
    effectDuration: 4,
    maxLevel: 10,
    category: 'attack',
    tier: 1,
    shopCost: 3,
    color: '#ff4400',
    projectileSpeed: 20,
    key: '1',
  },
  iceball: {
    id: 'iceball',
    name: 'Iceball',
    description: 'Hurls a ball of ice that freezes the target.',
    staminaCost: 18,
    cooldown: 3.0,
    damage: 12,
    effectType: EFFECT.FREEZE,
    effectDuration: 3,
    maxLevel: 10,
    category: 'attack',
    tier: 1,
    shopCost: 3,
    color: '#66ccff',
    projectileSpeed: 18,
    key: '2',
  },
  electric_shock: {
    id: 'electric_shock',
    name: 'Electric Shock',
    description: 'Sends a jolt of lightning that paralyses the target.',
    staminaCost: 20,
    cooldown: 3.5,
    damage: 25,
    effectType: EFFECT.SHOCK,
    effectDuration: 2.5,
    maxLevel: 10,
    category: 'attack',
    tier: 1,
    shopCost: 3,
    color: '#ffff00',
    projectileSpeed: 40,
    key: '3',
  },
  earth_shot: {
    id: 'earth_shot',
    name: 'Earth Shot',
    description: 'Blasts a chunk of earth that knocks back the target.',
    staminaCost: 14,
    cooldown: 2.0,
    damage: 18,
    effectType: EFFECT.KNOCKBACK,
    effectDuration: 0,
    maxLevel: 10,
    category: 'attack',
    tier: 1,
    shopCost: 3,
    color: '#8B4513',
    projectileSpeed: 15,
    key: '4',
  },

  // ── Tier 2 elemental ────────────────
  flame_wave: {
    id: 'flame_wave',
    name: 'Flame Wave',
    description: 'Emits a cone of fire burning all nearby enemies.',
    staminaCost: 25,
    cooldown: 5.0,
    damage: 30,
    effectType: EFFECT.AREA,
    effectDuration: 3,
    maxLevel: 8,
    category: 'attack',
    tier: 2,
    shopCost: 5,
    color: '#ff6600',
    aoeRadius: 6,
    key: '5',
  },
  frost_nova: {
    id: 'frost_nova',
    name: 'Frost Nova',
    description: 'Freezes all enemies in a radius around you.',
    staminaCost: 30,
    cooldown: 8.0,
    damage: 10,
    effectType: EFFECT.FREEZE,
    effectDuration: 4,
    maxLevel: 8,
    category: 'attack',
    tier: 2,
    shopCost: 5,
    color: '#aaeeff',
    aoeRadius: 8,
    key: '6',
  },
  lightning_bolt: {
    id: 'lightning_bolt',
    name: 'Lightning Bolt',
    description: 'Instant-hit bolt of lightning. High damage, stuns briefly.',
    staminaCost: 22,
    cooldown: 4.0,
    damage: 35,
    effectType: EFFECT.SHOCK,
    effectDuration: 1.5,
    maxLevel: 8,
    category: 'attack',
    tier: 2,
    shopCost: 5,
    color: '#ffffaa',
    projectileSpeed: 80,
    key: '7',
  },
  poison_dart: {
    id: 'poison_dart',
    name: 'Poison Dart',
    description: 'Shoots a toxic dart that poisons the target.',
    staminaCost: 12,
    cooldown: 2.5,
    damage: 8,
    effectType: EFFECT.POISON,
    effectDuration: 6,
    maxLevel: 8,
    category: 'attack',
    tier: 2,
    shopCost: 4,
    color: '#44cc44',
    projectileSpeed: 22,
    key: '8',
  },

  // ── Tier 2 utility ──────────────────
  heal: {
    id: 'heal',
    name: 'Heal',
    description: 'Restores a portion of your health.',
    staminaCost: 20,
    cooldown: 10.0,
    damage: 0,
    healAmount: 30,
    effectType: EFFECT.HEAL,
    maxLevel: 8,
    category: 'support',
    tier: 2,
    shopCost: 4,
    color: '#44ff88',
    key: '9',
  },
  shield_wall: {
    id: 'shield_wall',
    name: 'Shield Wall',
    description: 'Creates a shield absorbing damage for a duration.',
    staminaCost: 25,
    cooldown: 12.0,
    damage: 0,
    shieldAmount: 40,
    effectType: EFFECT.SHIELD,
    effectDuration: 8,
    maxLevel: 8,
    category: 'support',
    tier: 2,
    shopCost: 5,
    color: '#4488ff',
    key: '0',
  },
  dash: {
    id: 'dash',
    name: 'Dash',
    description: 'Instantly teleport forward a short distance.',
    staminaCost: 15,
    cooldown: 3.0,
    damage: 0,
    effectType: EFFECT.SPEED,
    maxLevel: 5,
    category: 'movement',
    tier: 2,
    shopCost: 4,
    color: '#00ddff',
    dashDistance: 8,
  },

  // ── Tier 3 advanced ─────────────────
  meteor: {
    id: 'meteor',
    name: 'Meteor Strike',
    description: 'Calls a meteor from the sky dealing massive AoE damage.',
    staminaCost: 40,
    cooldown: 15.0,
    damage: 60,
    effectType: EFFECT.AREA,
    effectDuration: 2,
    maxLevel: 6,
    category: 'attack',
    tier: 3,
    shopCost: 8,
    color: '#ff3300',
    aoeRadius: 10,
  },
  blizzard: {
    id: 'blizzard',
    name: 'Blizzard',
    description: 'Summons a raging blizzard that freezes and damages all nearby.',
    staminaCost: 35,
    cooldown: 12.0,
    damage: 20,
    effectType: EFFECT.FREEZE,
    effectDuration: 5,
    maxLevel: 6,
    category: 'attack',
    tier: 3,
    shopCost: 7,
    color: '#88bbff',
    aoeRadius: 12,
  },
  thunder_storm: {
    id: 'thunder_storm',
    name: 'Thunderstorm',
    description: 'Calls lightning strikes in a radius over time.',
    staminaCost: 35,
    cooldown: 12.0,
    damage: 40,
    effectType: EFFECT.SHOCK,
    effectDuration: 4,
    maxLevel: 6,
    category: 'attack',
    tier: 3,
    shopCost: 7,
    color: '#dddd00',
    aoeRadius: 10,
  },
  venom_cloud: {
    id: 'venom_cloud',
    name: 'Venom Cloud',
    description: 'Releases a cloud of poison that lingers and damages.',
    staminaCost: 28,
    cooldown: 10.0,
    damage: 15,
    effectType: EFFECT.POISON,
    effectDuration: 8,
    maxLevel: 6,
    category: 'attack',
    tier: 3,
    shopCost: 6,
    color: '#66aa00',
    aoeRadius: 7,
  },
  earth_quake: {
    id: 'earth_quake',
    name: 'Earthquake',
    description: 'Shakes the ground, knocking back and stunning enemies.',
    staminaCost: 30,
    cooldown: 10.0,
    damage: 25,
    effectType: EFFECT.KNOCKBACK,
    effectDuration: 2,
    maxLevel: 6,
    category: 'attack',
    tier: 3,
    shopCost: 7,
    color: '#885522',
    aoeRadius: 10,
  },
  rejuvenate: {
    id: 'rejuvenate',
    name: 'Rejuvenate',
    description: 'Heals over time for a large total.',
    staminaCost: 30,
    cooldown: 20.0,
    damage: 0,
    healAmount: 60,
    effectType: EFFECT.HEAL,
    effectDuration: 8,
    maxLevel: 6,
    category: 'support',
    tier: 3,
    shopCost: 6,
    color: '#22ff66',
  },

  // ── Tier 4 ultimate ─────────────────
  phoenix_burst: {
    id: 'phoenix_burst',
    name: 'Phoenix Burst',
    description: 'Explodes in fire, dealing extreme damage and healing yourself.',
    staminaCost: 50,
    cooldown: 25.0,
    damage: 80,
    healAmount: 30,
    effectType: EFFECT.BURN,
    effectDuration: 5,
    maxLevel: 5,
    category: 'attack',
    tier: 4,
    shopCost: 10,
    color: '#ff8800',
    aoeRadius: 8,
  },
  summon_wolf: {
    id: 'summon_wolf',
    name: 'Summon Wolf',
    description: 'Summons a spirit wolf to fight for you.',
    staminaCost: 40,
    cooldown: 30.0,
    damage: 0,
    effectType: EFFECT.SUMMON,
    effectDuration: 15,
    maxLevel: 5,
    category: 'support',
    tier: 4,
    shopCost: 10,
    color: '#aaaaff',
  },
  absolute_zero: {
    id: 'absolute_zero',
    name: 'Absolute Zero',
    description: 'Freezes everything in a massive radius for a long duration.',
    staminaCost: 50,
    cooldown: 30.0,
    damage: 30,
    effectType: EFFECT.FREEZE,
    effectDuration: 8,
    maxLevel: 5,
    category: 'attack',
    tier: 4,
    shopCost: 10,
    color: '#4400ff',
    aoeRadius: 15,
  },
  godspeed: {
    id: 'godspeed',
    name: 'Godspeed',
    description: 'Grants extreme speed for a duration. You become lightning.',
    staminaCost: 35,
    cooldown: 20.0,
    damage: 0,
    effectType: EFFECT.SPEED,
    effectDuration: 6,
    maxLevel: 5,
    category: 'movement',
    tier: 4,
    shopCost: 9,
    color: '#ff00ff',
    speedMult: 6.0,
  },
};

// ── Starter skill IDs ───────────────────────────────────────
export const STARTER_SKILLS = ['fireball', 'iceball', 'electric_shock', 'earth_shot'];

/**
 * SkillSystem — manages skill execution, cooldowns, and projectiles.
 */
export class SkillSystem {
  constructor() {
    /** Map<skillId, remainingCooldown> */
    this._cooldowns = new Map();
    /** Active projectiles in the scene */
    this._projectiles = [];
    /** Active AoE zones */
    this._aoeZones = [];
    /** Temp reusable vectors */
    this._tmpVec = new THREE.Vector3();
  }

  /**
   * Get scaled skill stats for a given level + player derived stats.
   * @param {string} id
   * @param {number} level
   * @param {object} [derivedStats] - from statScaler.computeDerivedStats()
   * @returns {object}
   */
  getScaled(id, level = 1, derivedStats = null) {
    const base = SKILLS[id];
    if (!base) return null;
    return getScaledSkill(base, level, derivedStats);
  }

  /**
   * Can the skill be used right now?
   * @param {string} id
   * @param {number} currentStamina - on 100-scale
   * @param {object} profile - PlayerProfile.data
   * @param {object} [derivedStats] - from statScaler
   * @returns {{ok:boolean, reason?:string}}
   */
  canUse(id, currentStamina, profile, derivedStats = null) {
    const skill = SKILLS[id];
    if (!skill) return { ok: false, reason: 'Unknown skill' };
    if (skill.passive) return { ok: false, reason: 'Passive skill' };
    if (!profile.unlockedSkills.includes(id)) return { ok: false, reason: 'Not unlocked' };
    const cd = this._cooldowns.get(id) || 0;
    if (cd > 0) return { ok: false, reason: `Cooldown ${cd.toFixed(1)}s` };
    // Compute actual stamina cost with endurance scaling
    const level = profile.skillLevels[id] || 1;
    const scaled = this.getScaled(id, level, derivedStats);
    const cost = scaled ? scaled.staminaCost : skill.staminaCost;
    if (currentStamina < cost) return { ok: false, reason: 'Not enough stamina' };
    return { ok: true };
  }

  /**
   * Execute a skill.
   * @param {string} id
   * @param {number} level
   * @param {THREE.Scene} scene
   * @param {THREE.Vector3} playerPos
   * @param {THREE.Vector3} playerForward
   * @param {object} callbacks - { drainStamina, healPlayer, shieldPlayer, boostSpeed, getEnemiesInRadius, summonWolves }
   * @param {object} [derivedStats] - from statScaler.computeDerivedStats()
   * @returns {boolean} success
   */
  execute(id, level, scene, playerPos, playerForward, callbacks, derivedStats = null) {
    const skill = this.getScaled(id, level, derivedStats);
    if (!skill) return false;

    // Start cooldown (already scaled by level + agility)
    this._cooldowns.set(id, skill.cooldown);

    // Drain stamina (already scaled by level + endurance)
    if (callbacks.drainStamina) callbacks.drainStamina(skill.staminaCost);

    // ── Self-buffs ──────────────────────────────────────
    if (skill.effectType === EFFECT.HEAL && skill.healAmount) {
      if (callbacks.healPlayer) callbacks.healPlayer(skill.healAmount);
      this._spawnHealVFX(scene, playerPos);
      return true;
    }

    if (skill.effectType === EFFECT.SHIELD && skill.shieldAmount) {
      if (callbacks.shieldPlayer) callbacks.shieldPlayer(skill.shieldAmount, skill.effectDuration || 8);
      this._spawnShieldVFX(scene, playerPos);
      return true;
    }

    if (skill.effectType === EFFECT.SPEED && skill.id === 'dash') {
      // Instant dash forward
      const dashDist = skill.dashDistance || 8;
      const dest = playerPos.clone().addScaledVector(playerForward, dashDist);
      if (callbacks.teleportPlayer) callbacks.teleportPlayer(dest);
      this._spawnDashVFX(scene, playerPos, dest);
      return true;
    }

    if (skill.effectType === EFFECT.SPEED && skill.speedMult) {
      if (callbacks.boostSpeed) callbacks.boostSpeed(skill.speedMult, skill.effectDuration || 6);
      this._spawnSpeedVFX(scene, playerPos);
      return true;
    }

    // ── AoE skills ──────────────────────────────────────
    if (skill.aoeRadius && !skill.projectileSpeed) {
      const enemies = callbacks.getEnemiesInRadius
        ? callbacks.getEnemiesInRadius(playerPos, skill.aoeRadius)
        : [];
      for (const enemy of enemies) {
        if (callbacks.damageEnemy) {
          callbacks.damageEnemy(enemy, skill.damage, skill.effectType, skill.effectDuration || 0);
        }
      }
      this._spawnAoEVFX(scene, playerPos, skill);
      return true;
    }

    // ── Projectile skills ───────────────────────────────
    if (skill.projectileSpeed) {
      this._spawnProjectile(scene, playerPos, playerForward, skill);
      return true;
    }

    // ── Summon ──────────────────────────────────────────
    if (skill.effectType === EFFECT.SUMMON) {
      // Actually spawn familiar wolves via callback
      if (callbacks.summonWolves) {
        callbacks.summonWolves(level);
      }
      this._spawnSummonVFX(scene, playerPos);
      return true;
    }

    return true;
  }

  /**
   * Update projectiles and cooldowns each frame.
   * @param {number} dt
   * @param {object} callbacks - { getEnemiesInRadius, damageEnemy }
   */
  update(dt, callbacks) {
    // Tick cooldowns
    for (const [id, cd] of this._cooldowns) {
      const next = cd - dt;
      if (next <= 0) this._cooldowns.delete(id);
      else this._cooldowns.set(id, next);
    }

    // Update projectiles
    for (let i = this._projectiles.length - 1; i >= 0; i--) {
      const p = this._projectiles[i];
      p.life -= dt;
      if (p.life <= 0) {
        if (p.mesh.parent) p.mesh.parent.remove(p.mesh);
        p.mesh.geometry?.dispose();
        p.mesh.material?.dispose();
        this._projectiles.splice(i, 1);
        continue;
      }
      // Move
      p.mesh.position.addScaledVector(p.dir, p.speed * dt);

      // Check hit
      if (callbacks && callbacks.getEnemiesInRadius) {
        const hits = callbacks.getEnemiesInRadius(p.mesh.position, 1.5);
        if (hits.length > 0) {
          // Hit first enemy
          if (callbacks.damageEnemy) {
            callbacks.damageEnemy(hits[0], p.damage, p.effectType, p.effectDuration || 0);
          }
          // Explode VFX
          this._spawnHitVFX(p.mesh.parent, p.mesh.position, p.color);
          if (p.mesh.parent) p.mesh.parent.remove(p.mesh);
          p.mesh.geometry?.dispose();
          p.mesh.material?.dispose();
          this._projectiles.splice(i, 1);
        }
      }
    }

    // Update AoE VFX (auto-cleanup)
    for (let i = this._aoeZones.length - 1; i >= 0; i--) {
      const z = this._aoeZones[i];
      z.life -= dt;
      if (z.mesh) {
        z.mesh.material.opacity = Math.max(0, z.life / z.maxLife) * 0.5;
        z.mesh.scale.setScalar(1 + (1 - z.life / z.maxLife) * 0.3);
      }
      if (z.life <= 0) {
        if (z.mesh && z.mesh.parent) z.mesh.parent.remove(z.mesh);
        if (z.mesh) { z.mesh.geometry?.dispose(); z.mesh.material?.dispose(); }
        this._aoeZones.splice(i, 1);
      }
    }
  }

  getCooldown(id) {
    return this._cooldowns.get(id) || 0;
  }

  // ── VFX Spawners ──────────────────────────────────────────

  _spawnProjectile(scene, origin, dir, skill) {
    const geo = new THREE.SphereGeometry(0.25, 8, 8);
    const mat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(skill.color),
      transparent: true,
      opacity: 0.9,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(origin).addScaledVector(dir, 1.0);
    mesh.position.y += 0.5;
    scene.add(mesh);

    this._projectiles.push({
      mesh,
      dir: dir.clone().normalize(),
      speed: skill.projectileSpeed,
      damage: skill.damage,
      effectType: skill.effectType,
      effectDuration: skill.effectDuration || 0,
      color: skill.color,
      life: 3.0,
    });
  }

  _spawnHitVFX(scene, pos, color) {
    if (!scene) return;
    const geo = new THREE.SphereGeometry(0.5, 6, 6);
    const mat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(color || '#ff4400'),
      transparent: true, opacity: 0.7,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(pos);
    scene.add(mesh);
    // Auto remove
    let life = 0.3;
    const tick = () => {
      life -= 0.016;
      mat.opacity = Math.max(0, life / 0.3) * 0.7;
      mesh.scale.setScalar(1 + (1 - life / 0.3) * 2);
      if (life > 0) requestAnimationFrame(tick);
      else { scene.remove(mesh); geo.dispose(); mat.dispose(); }
    };
    requestAnimationFrame(tick);
  }

  _spawnAoEVFX(scene, pos, skill) {
    const radius = skill.aoeRadius || 6;
    const geo = new THREE.RingGeometry(0.5, radius, 24);
    geo.rotateX(-Math.PI / 2);
    const mat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(skill.color),
      transparent: true, opacity: 0.5,
      side: THREE.DoubleSide, depthWrite: false,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(pos);
    mesh.position.y += 0.2;
    scene.add(mesh);
    const maxLife = 1.5;
    this._aoeZones.push({ mesh, life: maxLife, maxLife });
  }

  _spawnHealVFX(scene, pos) {
    const geo = new THREE.TorusGeometry(0.6, 0.15, 8, 16);
    const mat = new THREE.MeshBasicMaterial({
      color: 0x44ff88, transparent: true, opacity: 0.6,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(pos);
    scene.add(mesh);
    let life = 1.0;
    const tick = () => {
      life -= 0.016;
      mesh.position.y += 0.03;
      mat.opacity = Math.max(0, life) * 0.6;
      mesh.rotation.y += 0.1;
      if (life > 0) requestAnimationFrame(tick);
      else { scene.remove(mesh); geo.dispose(); mat.dispose(); }
    };
    requestAnimationFrame(tick);
  }

  _spawnShieldVFX(scene, pos) {
    const geo = new THREE.SphereGeometry(1.2, 16, 12);
    const mat = new THREE.MeshBasicMaterial({
      color: 0x4488ff, transparent: true, opacity: 0.25,
      side: THREE.BackSide,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(pos);
    scene.add(mesh);
    let life = 2.0;
    const tick = () => {
      life -= 0.016;
      mat.opacity = Math.max(0, life / 2.0) * 0.25;
      if (life > 0) requestAnimationFrame(tick);
      else { scene.remove(mesh); geo.dispose(); mat.dispose(); }
    };
    requestAnimationFrame(tick);
  }

  _spawnDashVFX(scene, from, to) {
    const geo = new THREE.CylinderGeometry(0.1, 0.1, from.distanceTo(to), 6);
    const mat = new THREE.MeshBasicMaterial({
      color: 0x00ddff, transparent: true, opacity: 0.4,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.lerpVectors(from, to, 0.5);
    mesh.lookAt(to);
    mesh.rotateX(Math.PI / 2);
    scene.add(mesh);
    let life = 0.5;
    const tick = () => {
      life -= 0.016;
      mat.opacity = Math.max(0, life / 0.5) * 0.4;
      if (life > 0) requestAnimationFrame(tick);
      else { scene.remove(mesh); geo.dispose(); mat.dispose(); }
    };
    requestAnimationFrame(tick);
  }

  _spawnSpeedVFX(scene, pos) {
    this._spawnHitVFX(scene, pos, '#ff00ff');
  }

  _spawnSummonVFX(scene, pos) {
    this._spawnHitVFX(scene, pos, '#aaaaff');
  }

  dispose() {
    for (const p of this._projectiles) {
      if (p.mesh.parent) p.mesh.parent.remove(p.mesh);
      p.mesh.geometry?.dispose();
      p.mesh.material?.dispose();
    }
    this._projectiles = [];
    for (const z of this._aoeZones) {
      if (z.mesh && z.mesh.parent) z.mesh.parent.remove(z.mesh);
      if (z.mesh) { z.mesh.geometry?.dispose(); z.mesh.material?.dispose(); }
    }
    this._aoeZones = [];
  }
}

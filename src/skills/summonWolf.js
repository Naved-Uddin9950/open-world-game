// ============================================================
// summonWolf.js — Spawn allied familiar wolves into the scene
// ============================================================
import * as THREE from 'three';
import { createProceduralAnimal } from '../world/animals/proceduralAnimal.js';
import { FamiliarWolfBrain } from '../ai/familiarWolfBrain.js';
import {
  FAMILIAR_WOLF_COUNT_AT_LEVEL,
  FAMILIAR_WOLF_DURATION_BASE,
  FAMILIAR_WOLF_DURATION_PER_LEVEL,
} from '../utils/constants.js';

/**
 * A single active familiar wolf instance.
 */
class FamiliarWolf {
  /**
   * @param {THREE.Mesh}         mesh
   * @param {FamiliarWolfBrain}  brain
   * @param {number}             duration  seconds until despawn
   */
  constructor(mesh, brain, duration) {
    this.mesh = mesh;
    this.brain = brain;
    this.remaining = duration;
  }
}

/**
 * SummonWolfManager — handles spawning, updating, and despawning familiar wolves.
 */
export class SummonWolfManager {
  constructor(scene) {
    /** @type {THREE.Scene} */
    this._scene = scene;
    /** @type {FamiliarWolf[]} */
    this.familiars = [];
  }

  /**
   * Spawn familiar wolves for the player.
   *
   * @param {THREE.Vector3}  playerPos   - Where to spawn around
   * @param {object}         ownerRef    - { position: THREE.Vector3 } — player controller's Object3D
   * @param {number}         skillLevel  - Summon Wolf skill level (1-5)
   * @returns {FamiliarWolf[]}  The newly spawned wolves
   */
  spawn(playerPos, ownerRef, skillLevel = 1) {
    const count = FAMILIAR_WOLF_COUNT_AT_LEVEL[Math.min(skillLevel, FAMILIAR_WOLF_COUNT_AT_LEVEL.length) - 1] || 1;
    const duration = FAMILIAR_WOLF_DURATION_BASE + FAMILIAR_WOLF_DURATION_PER_LEVEL * (skillLevel - 1);

    const spawned = [];

    for (let i = 0; i < count; i++) {
      // Create wolf mesh using the procedural animal system
      const scale = 0.7 + Math.random() * 0.15; // slightly varied size
      const mesh = createProceduralAnimal('wolf', scale);

      // Tint the familiar wolves with a blue-ish glow so player can tell them apart
      mesh.traverse(child => {
        if (child.isMesh && child.material) {
          child.material = child.material.clone();
          // Mix original color with a blue tint
          if (child.material.color) {
            const orig = child.material.color.getHex();
            child.material.color.setHex(orig);
            child.material.emissive = new THREE.Color(0x2244aa);
            child.material.emissiveIntensity = 0.3;
          }
        }
      });

      // Position around player
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
      const radius = 2.5 + Math.random() * 1.5;
      const spawnPos = new THREE.Vector3(
        playerPos.x + Math.cos(angle) * radius,
        playerPos.y,
        playerPos.z + Math.sin(angle) * radius,
      );
      mesh.position.copy(spawnPos);

      // Mark as familiar in userData
      mesh.userData = {
        type: 'familiar_wolf',
        isFamiliar: true,
      };
      mesh.name = `familiar_wolf_${Date.now()}_${i}`;

      this._scene.add(mesh);

      const brain = new FamiliarWolfBrain(mesh, ownerRef, skillLevel);
      const familiar = new FamiliarWolf(mesh, brain, duration);
      this.familiars.push(familiar);
      spawned.push(familiar);
    }

    return spawned;
  }

  /**
   * Update all active familiars. Call every frame.
   *
   * @param {number} dt - Delta time
   * @param {Array<{brain:object, mesh:THREE.Mesh}>} nearbyEnemies - Non-familiar animals nearby
   * @param {Function} [getHeight] - (x, z) => groundY
   */
  update(dt, nearbyEnemies = [], getHeight = null) {
    for (let i = this.familiars.length - 1; i >= 0; i--) {
      const f = this.familiars[i];
      f.remaining -= dt;

      // Despawn on expire or death
      if (f.remaining <= 0 || f.brain.isDead) {
        this._despawn(f);
        this.familiars.splice(i, 1);
        continue;
      }

      // Flash when about to expire (last 3 seconds)
      if (f.remaining < 3) {
        const flash = Math.sin(f.remaining * 10) > 0;
        f.mesh.visible = flash;
      } else {
        f.mesh.visible = true;
      }

      f.brain.update(dt, nearbyEnemies, getHeight);
    }
  }

  /**
   * Force-aggro all familiars onto a target (when owner is attacked).
   * @param {{ brain:object, mesh:THREE.Mesh }} target
   */
  aggroAll(target) {
    for (const f of this.familiars) {
      if (!f.brain.isDead) {
        f.brain.aggroOn(target);
      }
    }
  }

  /**
   * Remove a familiar wolf from the scene.
   * @param {FamiliarWolf} f
   */
  _despawn(f) {
    // Poof VFX
    this._spawnDespawnVFX(f.mesh.position);
    // Cleanup
    if (f.mesh.parent) f.mesh.parent.remove(f.mesh);
    f.mesh.traverse(child => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
        else child.material.dispose();
      }
    });
  }

  _spawnDespawnVFX(pos) {
    const geo = new THREE.SphereGeometry(0.8, 8, 8);
    const mat = new THREE.MeshBasicMaterial({
      color: 0x6688ff,
      transparent: true,
      opacity: 0.6,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(pos);
    this._scene.add(mesh);

    let life = 0.5;
    const tick = () => {
      life -= 0.016;
      mat.opacity = Math.max(0, life / 0.5) * 0.6;
      mesh.scale.setScalar(1 + (1 - life / 0.5) * 2);
      if (life > 0) requestAnimationFrame(tick);
      else {
        this._scene.remove(mesh);
        geo.dispose();
        mat.dispose();
      }
    };
    requestAnimationFrame(tick);
  }

  /**
   * Get list of familiar brain/mesh pairs (for AI controller to skip them as enemies).
   * @returns {Array<{brain:FamiliarWolfBrain, mesh:THREE.Mesh}>}
   */
  getActiveFamiliars() {
    return this.familiars
      .filter(f => !f.brain.isDead)
      .map(f => ({ brain: f.brain, mesh: f.mesh }));
  }

  /** Remove all familiars (on game reset etc.). */
  disposeAll() {
    for (const f of this.familiars) {
      this._despawn(f);
    }
    this.familiars = [];
  }

  /** @returns {number} Count of living familiars */
  get activeCount() {
    return this.familiars.filter(f => !f.brain.isDead).length;
  }
}

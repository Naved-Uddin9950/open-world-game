import * as THREE from 'three';
import { CREATURES } from '../entities/creatures/creatureDatabase.js';
import { CreatureBrain } from './creatureBrain.js';

export class CreatureAIController {
  constructor(scene, worldManager, options = {}) {
    this.scene = scene;
    this.world = worldManager;
    this.playerRef = options.playerRef || null;

    this._brains = new Map();
    this._onKillCallback = null;
  }

  setKillCallback(fn) { this._onKillCallback = fn; }

  _collectCreatures() {
    const creatures = [];
    for (const root of this.scene.children) {
      if (!root || !root.children) continue;
      const rooted = typeof root.name === 'string' && (root.name.startsWith('animals:') || root.name.startsWith('creatures:'));
      if (!rooted) continue;

      for (const mesh of root.children) {
        if (!mesh?.userData?.type) continue;
        if (mesh.name === 'animalCollider' || mesh.name === 'creatureCollider') continue;
        if (!CREATURES[mesh.userData.type]) continue;
        creatures.push(mesh);
      }
    }
    return creatures;
  }

  _getOrCreateBrain(mesh) {
    if (this._brains.has(mesh.uuid)) return this._brains.get(mesh.uuid);

    const def = CREATURES[mesh.userData.type];
    if (!def) return null;

    const level = Number.isFinite(mesh.userData.level) ? mesh.userData.level : def.baseLevel;
    const brain = new CreatureBrain(mesh, def, level, this.playerRef);
    mesh.userData._brain = brain;
    this._brains.set(mesh.uuid, brain);
    return brain;
  }

  update(dt) {
    const creatures = this._collectCreatures();
    const playerPos = this.playerRef ? this.playerRef.getPosition() : null;

    for (const mesh of creatures) {
      const brain = this._getOrCreateBrain(mesh);
      if (!brain) continue;

      if (brain.isDead) {
        this._handleDeath(mesh, brain, dt);
        continue;
      }

      brain.update(dt, null, playerPos);
      this._alignToGround(mesh);
    }

    this._cleanupBrains(creatures);
  }

  _alignToGround(mesh) {
    if (!this.world || typeof this.world.getHeightAt !== 'function') return;
    const y = this.world.getHeightAt(mesh.position.x, mesh.position.z);
    mesh.position.y = y + 0.05;
  }

  _handleDeath(mesh, brain, dt) {
    if (!mesh.userData._deathTimer) {
      mesh.userData._deathTimer = 0;
      if (this._onKillCallback) this._onKillCallback(brain.type, mesh);
    }

    mesh.userData._deathTimer += dt;
    const t = mesh.userData._deathTimer;

    mesh.rotation.x = Math.min(Math.PI / 2, t * 1.6);
    mesh.position.y -= dt * 0.18;

    if (t > 3.0) {
      if (mesh.parent) mesh.parent.remove(mesh);
      this._brains.delete(mesh.uuid);
    }
  }

  _cleanupBrains(currentMeshes) {
    const ids = new Set(currentMeshes.map(m => m.uuid));
    for (const [uuid] of this._brains) {
      if (!ids.has(uuid)) this._brains.delete(uuid);
    }
  }

  playerAttack(playerPos, playerForward, attackRange = 3.0, attackDamage = 0.25) {
    let hitAny = false;

    for (const [, brain] of this._brains) {
      if (brain.isDead || brain.isFamiliar) continue;

      const dist = brain.position.distanceTo(playerPos);
      if (dist > attackRange) continue;

      const toCreature = new THREE.Vector3().subVectors(brain.position, playerPos).normalize();
      if (playerForward.dot(toCreature) < 0.3) continue;

      brain.takeDamage(attackDamage, {
        type: 'player',
        position: playerPos.clone(),
        mesh: { position: playerPos },
      });
      hitAny = true;
    }

    return hitAny;
  }

  getEnemiesInRadius(pos, radius) {
    const out = [];
    const r2 = radius * radius;

    for (const [, brain] of this._brains) {
      if (brain.isDead || brain.isFamiliar) continue;
      const dx = brain.position.x - pos.x;
      const dz = brain.position.z - pos.z;
      const dy = Math.abs(brain.position.y - pos.y);
      if ((dx * dx + dz * dz) <= r2 && dy <= 4.0) {
        out.push({ brain, mesh: brain.mesh });
      }
    }

    return out;
  }

  damageEnemy(target, damage, effectType, effectDuration) {
    if (!target || !target.brain || target.brain.isDead) return;
    const scaled = target.brain.maxHealth <= 2 ? damage / 100 : damage;
    target.brain.takeDamage(scaled, {
      type: 'skill',
      position: target.mesh ? target.mesh.position.clone() : new THREE.Vector3(),
      mesh: { position: target.mesh ? target.mesh.position : new THREE.Vector3() },
    });
  }
}

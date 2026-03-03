import * as THREE from 'three';
import { getScaledCreatureStats } from '../entities/creatures/creatureDatabase.js';

export class CreatureBrain {
  constructor(mesh, creatureDef, level = 1, playerRef = null) {
    this.mesh = mesh;
    this.position = mesh.position;
    this.def = creatureDef;
    this.type = creatureDef.id;
    this.aiType = creatureDef.aiType || 'neutral';
    this.level = level;
    this.playerRef = playerRef;

    const scaled = getScaledCreatureStats(creatureDef.id, level);
    this.stats = scaled;

    this.health = 1.0;
    this.maxHealth = 1.0;
    this.stamina = 1.0;
    this.maxStamina = 1.0;
    this.isDead = false;
    this.isFamiliar = false;

    this.baseSpeed = Math.max(0.8, scaled.speed || 2.0);
    this.currentSpeed = 0;

    this.attackRange = 1.8;
    this.attackCooldown = 1.25;
    this.attackDamage = Math.min(0.7, Math.max(0.08, (scaled.damage || 8) / 120));
    this._attackTimer = 0;

    this._wanderDir = new THREE.Vector3(0, 0, 1);
    this._wanderTimer = 0;
    this._aggroTimer = 0;
  }

  update(dt, entities, playerPos) {
    if (this.isDead) return;

    this._attackTimer = Math.max(0, this._attackTimer - dt);
    this.stamina = Math.min(1, this.stamina + dt * 0.06);

    const shouldAggro = this._shouldAggroPlayer(playerPos);
    const desired = new THREE.Vector3();

    if (shouldAggro && playerPos) {
      const toPlayer = new THREE.Vector3().subVectors(playerPos, this.position);
      const distXZ = Math.hypot(toPlayer.x, toPlayer.z);

      if (distXZ > this.attackRange * 0.9) {
        desired.set(toPlayer.x, 0, toPlayer.z).normalize();
        this.currentSpeed = this.baseSpeed * 0.9;
      } else {
        this.currentSpeed = 0;
        this._tryAttack();
      }
    } else {
      this._wanderTimer -= dt;
      if (this._wanderTimer <= 0) {
        this._wanderTimer = 1.2 + Math.random() * 2.5;
        const ang = Math.random() * Math.PI * 2;
        this._wanderDir.set(Math.sin(ang), 0, Math.cos(ang));
      }
      desired.copy(this._wanderDir);
      this.currentSpeed = this.baseSpeed * (this.aiType === 'passive' ? 0.35 : 0.5);
    }

    const step = this.currentSpeed * dt;
    this.position.x += desired.x * step;
    this.position.z += desired.z * step;

    if (desired.lengthSq() > 0.0001) {
      const yaw = Math.atan2(desired.x, desired.z);
      this.mesh.rotation.y += (yaw - this.mesh.rotation.y) * Math.min(1, dt * 8);
    }

    if (this._aggroTimer > 0) this._aggroTimer -= dt;
  }

  takeDamage(amount, attacker) {
    if (this.isDead) return;
    this.health = Math.max(0, this.health - amount);
    this._aggroTimer = Math.max(this._aggroTimer, 6.0);
    if (this.health <= 0) this.isDead = true;
  }

  _shouldAggroPlayer(playerPos) {
    if (!playerPos) return false;
    if (this._aggroTimer > 0) return true;

    const dx = playerPos.x - this.position.x;
    const dz = playerPos.z - this.position.z;
    const dist = Math.hypot(dx, dz);
    const aggro = this.stats.aggroRadius || 0;

    if (this.aiType === 'passive') return false;
    if (this.aiType === 'neutral') return dist < aggro * 0.75;
    return dist < Math.max(6, aggro);
  }

  _tryAttack() {
    if (!this.playerRef || typeof this.playerRef.takeDamage !== 'function') return;
    if (this._attackTimer > 0) return;

    this._attackTimer = this.attackCooldown;
    this.playerRef.takeDamage(this.attackDamage);
  }
}

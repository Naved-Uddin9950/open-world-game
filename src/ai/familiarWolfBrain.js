// ============================================================
// familiarWolfBrain.js — AI brain for summoned familiar wolves
// ============================================================
import * as THREE from 'three';
import { FiniteStateMachine, STATES } from './fsm.js';
import { Steering } from './steering.js';
import {
  FAMILIAR_WOLF_BASE_HP,
  FAMILIAR_WOLF_BASE_DAMAGE,
  FAMILIAR_WOLF_BASE_SPEED,
  FAMILIAR_WOLF_FOLLOW_DIST,
  FAMILIAR_WOLF_LEASH_DIST,
  FAMILIAR_WOLF_AGGRO_RANGE,
  FAMILIAR_WOLF_ATTACK_RANGE,
  FAMILIAR_WOLF_HP_PER_LEVEL,
  FAMILIAR_WOLF_DMG_PER_LEVEL,
} from '../utils/constants.js';

/**
 * FAMILIAR_STATES extends the base FSM states with familiar-specific ones.
 */
const FSTATES = {
  FOLLOW: 'FOLLOW',
  ATTACK: STATES.ATTACK,
  RETURN: 'RETURN',
  IDLE: STATES.IDLE,
};

/**
 * FamiliarWolfBrain — lightweight brain for summoned wolves.
 *
 * Behavior priorities:
 * 1. If owner is far away → RETURN to owner
 * 2. If enemy within aggro range or owner attacked → ATTACK
 * 3. Otherwise → FOLLOW owner at comfortable distance
 *
 * Rules:
 * - Never attacks the player (owner)
 * - Disappears after duration expires (handled externally)
 */
export class FamiliarWolfBrain {
  /**
   * @param {THREE.Mesh} mesh        - The wolf mesh in the scene
   * @param {object}     ownerRef    - { position: THREE.Vector3 } — the player
   * @param {number}     skillLevel  - Summon Wolf skill level (1-5)
   */
  constructor(mesh, ownerRef, skillLevel = 1) {
    this.mesh = mesh;
    this.position = mesh.position;
    this.owner = ownerRef;
    this.type = 'familiar_wolf';
    this.isFamiliar = true;

    // ── Stats scaled by skill level ───────────────────
    this.health = FAMILIAR_WOLF_BASE_HP + FAMILIAR_WOLF_HP_PER_LEVEL * (skillLevel - 1);
    this.maxHealth = this.health;
    this.attackDamage = FAMILIAR_WOLF_BASE_DAMAGE + FAMILIAR_WOLF_DMG_PER_LEVEL * (skillLevel - 1);
    this.baseSpeed = FAMILIAR_WOLF_BASE_SPEED;
    this.runSpeed = FAMILIAR_WOLF_BASE_SPEED * 1.4;
    this.attackRange = FAMILIAR_WOLF_ATTACK_RANGE;
    this.attackCooldown = 1.2;
    this._attackTimer = 0;

    this.isDead = false;
    this.currentSpeed = 0;
    this.velocity = new THREE.Vector3();

    // ── Steering ──────────────────────────────────────
    this.steering = new Steering();

    // ── Target tracking ───────────────────────────────
    this.currentTarget = null;    // enemy brain/mesh to attack
    this._targetLostTimer = 0;

    // ── FSM ───────────────────────────────────────────
    this.fsm = new FiniteStateMachine(this);
    this._registerStates();
    this.fsm.transition(FSTATES.FOLLOW);

    // ── Anti-stuck ────────────────────────────────────
    this._stuckTimer = 0;
    this._lastPos = mesh.position.clone();
  }

  // ── State registration ──────────────────────────────────

  _registerStates() {
    const self = this;

    // FOLLOW — trail behind the owner
    this.fsm.addState(FSTATES.FOLLOW, {
      enter() { self.currentTarget = null; },
      update(dt) {
        const ownerPos = self.owner.position || self.owner;
        const dist = self.position.distanceTo(ownerPos);

        // Leash check
        if (dist > FAMILIAR_WOLF_LEASH_DIST) {
          self.fsm.transition(FSTATES.RETURN);
          return;
        }

        // If close enough, just idle in place
        if (dist < FAMILIAR_WOLF_FOLLOW_DIST) {
          self.currentSpeed = 0;
          return;
        }

        // Move toward owner
        const speed = dist > FAMILIAR_WOLF_FOLLOW_DIST * 2 ? self.runSpeed : self.baseSpeed;
        self.currentSpeed = speed;
        const force = self.steering.arrive(self.position, ownerPos, speed, FAMILIAR_WOLF_FOLLOW_DIST * 0.8);
        self._applyForce(force, dt);
      },
      exit() {},
    });

    // RETURN — teleport back to owner if too far
    this.fsm.addState(FSTATES.RETURN, {
      enter() {},
      update(dt) {
        const ownerPos = self.owner.position || self.owner;
        const offset = new THREE.Vector3(
          (Math.random() - 0.5) * 4,
          0,
          (Math.random() - 0.5) * 4,
        );
        self.position.copy(ownerPos).add(offset);
        self.velocity.set(0, 0, 0);
        self.fsm.transition(FSTATES.FOLLOW);
      },
      exit() {},
    });

    // IDLE — brief idle
    this.fsm.addState(FSTATES.IDLE, {
      enter() { self.currentSpeed = 0; },
      update(dt) {},
      exit() {},
    });

    // ATTACK — pursue and attack a target
    this.fsm.addState(FSTATES.ATTACK, {
      enter() {},
      update(dt) {
        const target = self.currentTarget;
        if (!target || !target.brain || target.brain.isDead) {
          self.currentTarget = null;
          self.fsm.transition(FSTATES.FOLLOW);
          return;
        }

        const targetPos = target.mesh ? target.mesh.position : target.position;
        if (!targetPos) {
          self.currentTarget = null;
          self.fsm.transition(FSTATES.FOLLOW);
          return;
        }

        const dist = self.position.distanceTo(targetPos);

        // Give up if target is very far or owner is far
        const ownerPos = self.owner.position || self.owner;
        const ownerDist = self.position.distanceTo(ownerPos);
        if (ownerDist > FAMILIAR_WOLF_LEASH_DIST * 0.8 || dist > FAMILIAR_WOLF_AGGRO_RANGE * 2) {
          self.currentTarget = null;
          self.fsm.transition(FSTATES.FOLLOW);
          return;
        }

        // Within attack range
        if (dist <= self.attackRange) {
          self.currentSpeed = 0;
          self._attackTimer -= dt;
          if (self._attackTimer <= 0) {
            self._attackTimer = self.attackCooldown;
            // Deal damage to the target brain
            if (target.brain && !target.brain.isDead) {
              target.brain.takeDamage(self.attackDamage, {
                type: 'familiar',
                position: self.position.clone(),
                mesh: { position: self.position },
              });
            }
          }
          return;
        }

        // Chase
        self.currentSpeed = self.runSpeed;
        const force = self.steering.seek(self.position, targetPos, self.runSpeed);
        self._applyForce(force, dt);
      },
      exit() {
        self._attackTimer = 0;
      },
    });
  }

  // ── Movement helpers ────────────────────────────────────

  _applyForce(force, dt) {
    if (force.lengthSq() < 0.0001) return;
    force.y = 0;
    const maxForce = this.currentSpeed || this.baseSpeed;
    if (force.length() > maxForce) force.normalize().multiplyScalar(maxForce);

    this.velocity.lerp(force, 0.2);
    this.velocity.y = 0;
    if (this.velocity.length() > maxForce) this.velocity.normalize().multiplyScalar(maxForce);

    this.position.addScaledVector(this.velocity, dt);

    // Face movement direction
    if (this.velocity.lengthSq() > 0.01) {
      const look = this.position.clone().add(this.velocity);
      this.mesh.lookAt(look.x, this.position.y, look.z);
    }
  }

  // ── Damage ──────────────────────────────────────────────

  takeDamage(amount, attacker = null) {
    this.health = Math.max(0, this.health - amount);
    if (this.health <= 0) {
      this.isDead = true;
    }
  }

  // ── Target selection ────────────────────────────────────

  /**
   * Scan for nearby enemies (non-familiar animals) and pick the closest.
   * @param {Array<{brain:object, mesh:THREE.Mesh}>} nearbyEnemies
   */
  findTarget(nearbyEnemies) {
    if (this.currentTarget && this.currentTarget.brain && !this.currentTarget.brain.isDead) {
      // Validate distance
      const tPos = this.currentTarget.mesh ? this.currentTarget.mesh.position : null;
      if (tPos && this.position.distanceTo(tPos) < FAMILIAR_WOLF_AGGRO_RANGE * 1.5) {
        return; // keep current target
      }
    }

    let closest = null;
    let closestDist = FAMILIAR_WOLF_AGGRO_RANGE;

    for (const enemy of nearbyEnemies) {
      if (!enemy.brain || enemy.brain.isDead) continue;
      if (enemy.brain.isFamiliar) continue; // don't attack other familiars
      const d = this.position.distanceTo(enemy.mesh.position);
      if (d < closestDist) {
        closestDist = d;
        closest = enemy;
      }
    }

    if (closest) {
      this.currentTarget = closest;
      if (this.fsm.currentState !== FSTATES.ATTACK) {
        this.fsm.transition(FSTATES.ATTACK);
      }
    }
  }

  /**
   * Force-aggro onto a specific target (e.g. when owner is hit).
   * @param {{ brain:object, mesh:THREE.Mesh }} target
   */
  aggroOn(target) {
    if (!target || !target.brain || target.brain.isDead) return;
    if (target.brain.isFamiliar) return;
    this.currentTarget = target;
    if (this.fsm.currentState !== FSTATES.ATTACK) {
      this.fsm.transition(FSTATES.ATTACK);
    }
  }

  // ── Main update ─────────────────────────────────────────

  /**
   * @param {number} dt
   * @param {Array<{brain:object, mesh:THREE.Mesh}>} nearbyEnemies - Non-familiar animals in range
   * @param {Function} [getHeight] - (x, z) => groundY, optional height provider
   */
  update(dt, nearbyEnemies = [], getHeight = null) {
    if (this.isDead) return;

    this._attackTimer = Math.max(0, this._attackTimer - dt);

    // Try to find targets periodically
    this.findTarget(nearbyEnemies);

    // Update FSM
    this.fsm.update(dt);

    // Ground alignment
    if (getHeight) {
      const gy = getHeight(this.position.x, this.position.z);
      if (typeof gy === 'number' && isFinite(gy)) {
        this.position.y = gy + 0.1;
      }
    }

    // Anti-stuck
    const moved = this.position.distanceTo(this._lastPos);
    this._lastPos.copy(this.position);
    if (moved < 0.03 * dt && this.currentSpeed > 0) {
      this._stuckTimer += dt;
      if (this._stuckTimer > 2) {
        this.position.x += (Math.random() - 0.5) * 2;
        this.position.z += (Math.random() - 0.5) * 2;
        this.velocity.set(0, 0, 0);
        this._stuckTimer = 0;
      }
    } else {
      this._stuckTimer = Math.max(0, this._stuckTimer - dt);
    }

    // Sync userData
    this.mesh.userData.health = this.health;
    this.mesh.userData.maxHealth = this.maxHealth;
    this.mesh.userData.isDead = this.isDead;
    this.mesh.userData._brain = this;
  }
}

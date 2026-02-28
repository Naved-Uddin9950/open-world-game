// ============================================================
// chickenBrain.js — Chicken AI with random wandering and panic
// ============================================================
import * as THREE from 'three';
import { AnimalBrain, NeuralNetwork } from './animalBrain.js';
import { STATES } from './fsm.js';
import {
  CHICKEN_FEAR_RADIUS,
  CHICKEN_PANIC_SPEED,
  CHICKEN_WANDER_SPEED,
} from '../utils/constants.js';

// ── Brain.js training data for chickens ─────────────────────
const CHICKEN_TRAINING_DATA = [
  // Predator very close → maximum fear
  { input: { hunger: 0.3, energy: 0.7, health: 0.8, fear: 0.9, nearestThreatDist: 0.1, nearestFoodDist: 0.8, stamina: 0.7 },
    output: { aggression: 0.0, curiosity: 0.0, fearResponse: 1.0, energyConservation: 0.1, socialDrive: 0.0 } },
  // Wolf at medium distance → scared
  { input: { hunger: 0.4, energy: 0.6, health: 0.9, fear: 0.5, nearestThreatDist: 0.4, nearestFoodDist: 0.7, stamina: 0.6 },
    output: { aggression: 0.0, curiosity: 0.0, fearResponse: 0.8, energyConservation: 0.2, socialDrive: 0.1 } },
  // Safe, nothing around → wander and peck
  { input: { hunger: 0.5, energy: 0.8, health: 1.0, fear: 0.0, nearestThreatDist: 1.0, nearestFoodDist: 0.5, stamina: 0.9 },
    output: { aggression: 0.0, curiosity: 0.6, fearResponse: 0.0, energyConservation: 0.2, socialDrive: 0.4 } },
  // Hungry → peck/eat
  { input: { hunger: 0.8, energy: 0.6, health: 0.9, fear: 0.0, nearestThreatDist: 1.0, nearestFoodDist: 0.3, stamina: 0.7 },
    output: { aggression: 0.0, curiosity: 0.3, fearResponse: 0.0, energyConservation: 0.3, socialDrive: 0.3 } },
  // Tired → rest
  { input: { hunger: 0.4, energy: 0.1, health: 0.7, fear: 0.0, nearestThreatDist: 0.9, nearestFoodDist: 0.6, stamina: 0.1 },
    output: { aggression: 0.0, curiosity: 0.1, fearResponse: 0.1, energyConservation: 0.9, socialDrive: 0.2 } },
  // Player very close → mild fear (chickens flee from everyone close)
  { input: { hunger: 0.3, energy: 0.7, health: 0.9, fear: 0.3, nearestThreatDist: 0.8, nearestFoodDist: 0.7, stamina: 0.8 },
    output: { aggression: 0.0, curiosity: 0.1, fearResponse: 0.5, energyConservation: 0.2, socialDrive: 0.3 } },
];

/**
 * ChickenBrain — small prey AI.
 * 
 * BEHAVIOR:
 * - Random wandering with short bursts
 * - Frequent pecking/eating
 * - Panics and runs from ALL predators (wolf)
 * - Short panic bursts — doesn't flee far
 * - Avoids all large entities when close
 * - Quick recovery after danger passes
 */
export class ChickenBrain extends AnimalBrain {
  constructor(mesh) {
    super(mesh, {
      type: 'chicken',
      baseSpeed: CHICKEN_WANDER_SPEED,
      runSpeed: CHICKEN_PANIC_SPEED,
      visionRange: CHICKEN_FEAR_RADIUS,
      attackDamage: 0,
      attackRange: 0,
      attackCooldown: 999,
      health: 0.3,              // chickens are fragile
      maxHealth: 0.3,
      stamina: 0.6,
      maxStamina: 0.6,
      staminaDrainWalk: 0.01,
      staminaDrainRun: 0.1,     // panic drains fast
      staminaRecovery: 0.08,    // but recovers fast too
      hunger: 0.5,
      energy: 0.7,
      predators: ['wolf'],      // wolves are the threat
      prey: [],
      same: ['chicken'],
      homeRadius: 25,           // chickens stay close to home
      trainingData: CHICKEN_TRAINING_DATA,
    });

    // Chicken-specific: short panic bursts
    this._panicBurstTimer = 0;
    this._panicDuration = 1.5 + Math.random(); // short panic
  }

  /**
   * Override FLEE for short panic bursts.
   */
  _registerBaseStates() {
    super._registerBaseStates();

    const self = this;
    this.fsm.addState(STATES.FLEE, {
      enter() {
        self._panicBurstTimer = 0;
        self._panicDuration = 1.0 + Math.random() * 1.5;
      },
      update(dt) {
        self._panicBurstTimer += dt;

        const threat = self.memory.lastThreatPos;
        if (!threat) {
          self.fsm.transition(STATES.WANDER);
          return;
        }

        // Short panic burst — stop after a few seconds
        if (self._panicBurstTimer > self._panicDuration) {
          const dist = self.position.distanceTo(threat);
          if (dist > self.perception.visionRange * 0.5) {
            self.fear = Math.max(0, self.fear - 0.5);
            self.fsm.transition(STATES.IDLE);
            return;
          }
          // Still too close, keep fleeing but reset timer
          self._panicBurstTimer = 0;
        }

        let speed = self.canRun ? self.runSpeed : self.baseSpeed;
        self.currentSpeed = speed;
        const force = self.steering.flee(self.position, threat, speed);

        // Add random jitter for erratic chicken movement
        force.x += (Math.random() - 0.5) * 2.0;
        force.z += (Math.random() - 0.5) * 2.0;

        self._applyForce(force, dt);
        self._drainStamina(dt, true);
      },
      exit() {
        self._panicBurstTimer = 0;
      },
    });

    // Override WANDER for chicken-style short bursts
    this.fsm.addState(STATES.WANDER, {
      enter() {
        self._pickWanderTarget();
      },
      update(dt) {
        self.memory.wanderTimer -= dt;

        // Chickens do short bursts then stop
        if (self.memory.wanderTimer <= 0) {
          // 50% chance to stop and peck, 50% pick new target
          if (Math.random() < 0.5) {
            self.fsm.transition(STATES.IDLE);
            return;
          }
          self._pickWanderTarget();
        }

        const speed = self.baseSpeed * (0.5 + Math.random() * 0.5);
        self.currentSpeed = speed;
        const force = self.steering.arrive(self.position, self.memory.wanderTarget, speed, 1.5);
        self._applyForce(force, dt);
        self._drainStamina(dt, false);

        const dist = self.position.distanceTo(self.memory.wanderTarget);
        if (dist < 1.0) {
          self._pickWanderTarget();
        }
      },
      exit() {},
    });
  }

  /**
   * Override wander target for chickens — shorter range.
   */
  _pickWanderTarget() {
    const r = 2 + Math.random() * 5; // chickens don't go far
    const angle = Math.random() * Math.PI * 2;
    const target = new THREE.Vector3(
      this.position.x + Math.cos(angle) * r,
      this.position.y,
      this.position.z + Math.sin(angle) * r,
    );

    // Keep within home radius
    const homeDir = new THREE.Vector3().subVectors(target, this.memory.homePosition);
    homeDir.y = 0;
    if (homeDir.length() > this.memory.homeRadius) {
      homeDir.normalize().multiplyScalar(this.memory.homeRadius * 0.7);
      target.copy(this.memory.homePosition).add(homeDir);
    }

    this.memory.wanderTarget.copy(target);
    this.memory.wanderTimer = 1 + Math.random() * 3; // shorter wander durations
  }

  /**
   * Decide next state.
   * 
   * PRIORITY:
   * 1. Flee from predators (wolf)
   * 2. Flee if attacked
   * 3. Flee if player is very close (chickens are skittish)
   * 4. Rest if tired
   * 5. Eat/peck
   * 6. Wander with short bursts
   * 7. Idle (peck at ground)
   */
  decideNextState() {
    const nn = this.nnOutputs;
    const p = this.perception;

    // ── RULE 1: Flee from wolves ──
    if (p.nearestThreat && p.nearestThreat.distance < CHICKEN_FEAR_RADIUS) {
      this.fear = Math.min(1.0, this.fear + 0.6);
      this.memory.lastThreatPos = p.nearestThreat.position.clone();
      return STATES.FLEE;
    }

    // ── RULE 2: Flee if attacked ──
    if (this.memory.lastAttackedBy && this.memory.lastAttackedTime < 5) {
      if (this.memory.lastThreatPos) return STATES.FLEE;
    }

    // ── RULE 3: Flee if player very close (within 4 units) ──
    if (p.playerEntity && p.playerDistance < 4) {
      this.fear = Math.min(1.0, this.fear + 0.3);
      this.memory.lastThreatPos = p.playerEntity.position.clone();
      return STATES.FLEE;
    }

    // ── RULE 4: Rest if tired ──
    if (nn.energyConservation > 0.8 || this.stamina < 0.05) {
      return STATES.REST;
    }

    // ── RULE 5: Eat/peck ──
    if (this.hunger > 0.5 && nn.fearResponse < 0.2) {
      return STATES.EAT;
    }

    // ── RULE 6: Wander ──
    if (nn.curiosity > 0.3 || this.fsm.stateTime > 4) {
      return STATES.WANDER;
    }

    // ── RULE 7: Idle ──
    return STATES.IDLE;
  }

  update(dt, allEntities, playerPos) {
    super.update(dt, allEntities, playerPos);

    // Update threat positions
    if (this.perception.nearestThreat) {
      this.memory.lastThreatPos = this.perception.nearestThreat.position.clone();
    }
    if (this.memory.lastAttackedBy && this.memory.lastAttackedTime < 5 && playerPos) {
      this.memory.lastThreatPos = playerPos.clone();
    }
  }
}

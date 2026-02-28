// ============================================================
// deerBrain.js — Deer AI with grazing, alertness, and flight
// ============================================================
import * as THREE from 'three';
import { AnimalBrain, NeuralNetwork } from './animalBrain.js';
import { STATES } from './fsm.js';
import {
  DEER_FEAR_RADIUS,
  DEER_PANIC_SPEED,
  DEER_NORMAL_SPEED,
} from '../utils/constants.js';

// ── Brain.js training data for deer ─────────────────────────
const DEER_TRAINING_DATA = [
  // Predator very close → pure fear/flee
  { input: { hunger: 0.3, energy: 0.7, health: 0.9, fear: 0.9, nearestThreatDist: 0.1, nearestFoodDist: 0.8, stamina: 0.8 },
    output: { aggression: 0.0, curiosity: 0.0, fearResponse: 1.0, energyConservation: 0.1, socialDrive: 0.0 } },
  // Predator medium distance → alert, ready to flee
  { input: { hunger: 0.4, energy: 0.7, health: 0.9, fear: 0.4, nearestThreatDist: 0.5, nearestFoodDist: 0.8, stamina: 0.7 },
    output: { aggression: 0.0, curiosity: 0.1, fearResponse: 0.7, energyConservation: 0.3, socialDrive: 0.2 } },
  // No threats, hungry → graze
  { input: { hunger: 0.7, energy: 0.6, health: 1.0, fear: 0.0, nearestThreatDist: 1.0, nearestFoodDist: 0.5, stamina: 0.8 },
    output: { aggression: 0.0, curiosity: 0.3, fearResponse: 0.0, energyConservation: 0.3, socialDrive: 0.4 } },
  // Safe, rested → social/wander
  { input: { hunger: 0.2, energy: 0.9, health: 1.0, fear: 0.0, nearestThreatDist: 1.0, nearestFoodDist: 1.0, stamina: 0.9 },
    output: { aggression: 0.0, curiosity: 0.7, fearResponse: 0.0, energyConservation: 0.2, socialDrive: 0.6 } },
  // Exhausted → rest
  { input: { hunger: 0.5, energy: 0.1, health: 0.7, fear: 0.1, nearestThreatDist: 0.9, nearestFoodDist: 0.6, stamina: 0.1 },
    output: { aggression: 0.0, curiosity: 0.1, fearResponse: 0.2, energyConservation: 0.9, socialDrive: 0.2 } },
  // Injured, threatened → maximum flee
  { input: { hunger: 0.3, energy: 0.4, health: 0.3, fear: 0.8, nearestThreatDist: 0.3, nearestFoodDist: 0.9, stamina: 0.5 },
    output: { aggression: 0.0, curiosity: 0.0, fearResponse: 1.0, energyConservation: 0.5, socialDrive: 0.0 } },
];

/**
 * DeerBrain — prey AI.
 * 
 * BEHAVIOR:
 * - Grazes most of the time when safe
 * - Detects predators (wolves) and player at range
 * - Flees in opposite direction from threats
 * - Uses zigzag flee pattern for realism
 * - Returns to calm state after reaching safe distance
 * - Herds with other deer
 */
export class DeerBrain extends AnimalBrain {
  constructor(mesh) {
    super(mesh, {
      type: 'deer',
      baseSpeed: DEER_NORMAL_SPEED,
      runSpeed: DEER_PANIC_SPEED,
      visionRange: DEER_FEAR_RADIUS,
      attackDamage: 0,        // deer don't attack
      attackRange: 0,
      attackCooldown: 999,
      health: 0.8,
      maxHealth: 0.8,
      stamina: 1.0,
      maxStamina: 1.0,
      staminaDrainWalk: 0.01,
      staminaDrainRun: 0.07,
      staminaRecovery: 0.06,
      hunger: 0.3,
      energy: 0.8,
      predators: ['wolf'],     // wolves are threats; player is neutral
      prey: [],                 // deer don't hunt
      same: ['deer'],
      homeRadius: 50,
      trainingData: DEER_TRAINING_DATA,
    });

    // Deer-specific: zigzag flee variables
    this._fleeSway = 0;
    this._fleeSwaySpeed = 8 + Math.random() * 4;
    this._alertTime = 0;
  }

  /**
   * Override flee state to add zigzag movement.
   */
  _registerBaseStates() {
    super._registerBaseStates();

    // Override FLEE with zigzag behavior
    const self = this;
    this.fsm.addState(STATES.FLEE, {
      enter() {
        self._fleeSway = 0;
      },
      update(dt) {
        const threat = self.memory.lastThreatPos;
        if (!threat) {
          self.fsm.transition(STATES.WANDER);
          return;
        }

        const dist = self.position.distanceTo(threat);

        // Safe distance reached
        if (dist > self.perception.visionRange * 0.9) {
          self.fear = Math.max(0, self.fear - 0.4 * dt);
          if (self.fear < 0.15) {
            self.fsm.transition(STATES.IDLE);
            return;
          }
        }

        let speed = self.canRun ? self.runSpeed : self.baseSpeed;
        self.currentSpeed = speed;

        // Base flee direction
        const fleeForce = self.steering.flee(self.position, threat, speed);

        // Add zigzag sway
        self._fleeSway += dt * self._fleeSwaySpeed;
        const perpX = -fleeForce.z;
        const perpZ = fleeForce.x;
        const swayAmount = Math.sin(self._fleeSway) * 0.6;
        fleeForce.x += perpX * swayAmount;
        fleeForce.z += perpZ * swayAmount;

        // Separation from other deer during flee
        const sepForce = self.steering.separation(self.position, self.perception.allies, 3);
        fleeForce.add(sepForce.multiplyScalar(0.2));

        self._applyForce(fleeForce, dt);
        self._drainStamina(dt, true);
      },
      exit() {
        self.fear = Math.max(0, self.fear - 0.3);
      },
    });
  }

  /**
   * Decide next state.
   * 
   * PRIORITY:
   * 1. Flee from predators (wolf)
   * 2. Flee from player if player attacked recently
   * 3. Rest if exhausted
   * 4. Eat/graze when hungry
   * 5. Socialize with herd
   * 6. Wander
   * 7. Idle
   */
  decideNextState() {
    const nn = this.nnOutputs;
    const p = this.perception;

    // ── RULE 1: Flee from wolves ──
    if (p.nearestThreat) {
      const threatScore = p.calculateThreatScore(p.nearestThreat, {
        health: this.health,
        energy: this.energy,
      });

      if (threatScore > 0.3) {
        this.fear = Math.min(1.0, this.fear + 0.5);
        this.memory.lastThreatPos = p.nearestThreat.position.clone();
        this.memory.lastThreatTime = 0;
        return STATES.FLEE;
      }
    }

    // ── RULE 2: Flee from player if they attacked us ──
    if (this.memory.lastAttackedBy && this.memory.lastAttackedTime < 8) {
      if (this.memory.lastThreatPos) {
        return STATES.FLEE;
      }
    }

    // ── Also flee if player is very close (within 8 units) — deer are skittish ──
    if (p.playerEntity && p.playerDistance < 8) {
      this.fear = Math.min(1.0, this.fear + 0.3);
      this.memory.lastThreatPos = p.playerEntity.position.clone();
      return STATES.FLEE;
    }

    // ── RULE 3: Rest if exhausted ──
    if (nn.energyConservation > 0.8 || this.energy < 0.1 || this.stamina < 0.1) {
      return STATES.REST;
    }

    // ── RULE 4: Graze/eat when hungry ──
    if (this.hunger > 0.5 && nn.fearResponse < 0.3) {
      return STATES.EAT;
    }

    // ── RULE 5: Socialize with herd ──
    if (nn.socialDrive > 0.5 && p.allies.length > 0 && this.fear < 0.1) {
      if (Math.random() < 0.2) return STATES.SOCIALIZE;
    }

    // ── RULE 6: Wander ──
    if (nn.curiosity > 0.4 || this.fsm.stateTime > 8) {
      return STATES.WANDER;
    }

    // ── RULE 7: Idle ──
    return STATES.IDLE;
  }

  update(dt, allEntities, playerPos) {
    super.update(dt, allEntities, playerPos);

    // Update threat position in real-time if threat is still visible
    if (this.perception.nearestThreat) {
      this.memory.lastThreatPos = this.perception.nearestThreat.position.clone();
    }
    // Also track player position if they're a threat
    if (this.memory.lastAttackedBy && this.memory.lastAttackedTime < 8 && playerPos) {
      this.memory.lastThreatPos = playerPos.clone();
    }
  }
}

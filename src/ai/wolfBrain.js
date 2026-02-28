// ============================================================
// wolfBrain.js — Wolf AI with hunting, patrol, and pack behavior
// ============================================================
import * as THREE from 'three';
import { AnimalBrain, NeuralNetwork } from './animalBrain.js';
import { STATES } from './fsm.js';
import {
  WOLF_DETECTION_RADIUS,
  WOLF_ATTACK_RANGE,
  WOLF_BASE_SPEED,
  WOLF_CHASE_SPEED_MULT,
} from '../utils/constants.js';

// ── Brain.js training data for wolves ───────────────────────
// Inputs: hunger, energy, health, fear, nearestThreatDist, nearestFoodDist, stamina
// Outputs: aggression, curiosity, fearResponse, energyConservation, socialDrive
const WOLF_TRAINING_DATA = [
  // Hungry + prey nearby → high aggression
  { input: { hunger: 0.8, energy: 0.7, health: 0.9, fear: 0.1, nearestThreatDist: 0.9, nearestFoodDist: 0.2, stamina: 0.8 },
    output: { aggression: 0.9, curiosity: 0.3, fearResponse: 0.1, energyConservation: 0.2, socialDrive: 0.3 } },
  // Full + no threats → relaxed, social
  { input: { hunger: 0.1, energy: 0.8, health: 1.0, fear: 0.0, nearestThreatDist: 1.0, nearestFoodDist: 1.0, stamina: 0.9 },
    output: { aggression: 0.1, curiosity: 0.6, fearResponse: 0.1, energyConservation: 0.3, socialDrive: 0.7 } },
  // Injured + threat nearby → flee
  { input: { hunger: 0.3, energy: 0.3, health: 0.2, fear: 0.8, nearestThreatDist: 0.2, nearestFoodDist: 0.9, stamina: 0.2 },
    output: { aggression: 0.1, curiosity: 0.0, fearResponse: 0.9, energyConservation: 0.8, socialDrive: 0.1 } },
  // Tired → conserve energy
  { input: { hunger: 0.4, energy: 0.1, health: 0.7, fear: 0.1, nearestThreatDist: 0.8, nearestFoodDist: 0.5, stamina: 0.1 },
    output: { aggression: 0.2, curiosity: 0.2, fearResponse: 0.2, energyConservation: 0.9, socialDrive: 0.3 } },
  // Moderate hunger + energy → hunt
  { input: { hunger: 0.6, energy: 0.6, health: 0.8, fear: 0.0, nearestThreatDist: 0.9, nearestFoodDist: 0.4, stamina: 0.7 },
    output: { aggression: 0.7, curiosity: 0.4, fearResponse: 0.1, energyConservation: 0.3, socialDrive: 0.4 } },
  // Starving → extremely aggressive, even toward player
  { input: { hunger: 1.0, energy: 0.5, health: 0.6, fear: 0.1, nearestThreatDist: 0.6, nearestFoodDist: 0.3, stamina: 0.5 },
    output: { aggression: 1.0, curiosity: 0.1, fearResponse: 0.1, energyConservation: 0.1, socialDrive: 0.1 } },
  // Calm, rested, nothing around → wander/explore
  { input: { hunger: 0.3, energy: 0.9, health: 1.0, fear: 0.0, nearestThreatDist: 1.0, nearestFoodDist: 1.0, stamina: 1.0 },
    output: { aggression: 0.2, curiosity: 0.8, fearResponse: 0.0, energyConservation: 0.2, socialDrive: 0.5 } },
];

/**
 * WolfBrain — predator AI.
 * 
 * BEHAVIOR:
 * - Roams territory when not hungry
 * - Hunts deer/chicken/cow when hungry
 * - Avoids player unless starving or attacked
 * - Stops chasing when prey is lost (target timeout)
 * - Never permanently locks onto player
 * - Patrols randomly, socializes with other wolves
 */
export class WolfBrain extends AnimalBrain {
  constructor(mesh) {
    super(mesh, {
      type: 'wolf',
      baseSpeed: WOLF_BASE_SPEED,
      runSpeed: WOLF_BASE_SPEED * WOLF_CHASE_SPEED_MULT,
      visionRange: WOLF_DETECTION_RADIUS,
      attackDamage: 0.2,
      attackRange: WOLF_ATTACK_RANGE,
      attackCooldown: 1.2,
      health: 1.0,
      maxHealth: 1.0,
      stamina: 1.0,
      maxStamina: 1.0,
      staminaDrainWalk: 0.015,
      staminaDrainRun: 0.06,
      staminaRecovery: 0.04,
      hunger: 0.4,  // start moderately hungry
      energy: 0.8,
      predators: [],           // wolves fear nothing normally
      prey: ['deer', 'chicken', 'cow', 'player'],  // hunt these (player only when starving)
      same: ['wolf'],
      homeRadius: 60,
      minStopDistance: WOLF_ATTACK_RANGE,
      trainingData: WOLF_TRAINING_DATA,
    });
  }

  /**
   * Decide next state based on NN outputs, needs, and perception.
   * 
   * PRIORITY ORDER:
   * 1. Flee if badly injured and recently attacked by player
   * 2. Attack if target in range
   * 3. Chase prey if hungry
   * 4. Rest if exhausted
   * 5. Eat if hungry and idle
   * 6. Socialize with nearby wolves
   * 7. Wander/patrol
   * 8. Idle
   */
  decideNextState() {
    const nn = this.nnOutputs;
    const p = this.perception;

    // ── RULE 1: Flee if badly injured and attacked by player ──
    if (this.health < 0.25 && this.memory.lastAttackedBy && this.memory.lastAttackedTime < 5) {
      if (this.memory.lastThreatPos) {
        return STATES.FLEE;
      }
    }

    // ── RULE 1b: Retaliate when attacked by player (if health > 0.25) ──
    if (this.memory.lastAttackedBy && this.memory.lastAttackedTime < 3 && this.health > 0.25) {
      if (p.playerEntity && p.playerDistance <= this.attackRange) {
        this.memory.currentTarget = p.playerEntity;
        return STATES.ATTACK;
      } else if (p.playerEntity && p.playerDistance <= this.perception.visionRange) {
        this.memory.currentTarget = p.playerEntity;
        return STATES.CHASE;
      }
    }

    // ── RULE 2: Continue attack if target still in range ──
    if (this.fsm.currentState === STATES.ATTACK && this.memory.currentTarget) {
      const target = this.memory.currentTarget;
      if (target.position) {
        const dist = this.position.distanceTo(target.position);
        if (dist <= this.attackRange * 1.5) return STATES.ATTACK;
        return STATES.CHASE; // target moved out of attack range, chase
      }
    }

    // ── RULE 3: Hunt when hungry (NN aggression scales threshold) ──
    const hungerThreshold = 0.4 - (nn.aggression * 0.2);
    if (this.hunger > hungerThreshold && this._chaseCooldown <= 0 && this.stamina > 0.1) {
      let bestTarget = null;
      let bestScore = -Infinity;

      for (const prey of p.food) {
        // CRITICAL: Skip player unless STARVING (hunger > 0.85) AND high aggression
        if (prey.type === 'player' && this.hunger < 0.85) continue;
        if (prey.type === 'player' && nn.aggression < 0.8) continue;

        const proximity = 1.0 - (prey.distance / this.perception.visionRange);
        // Preference: chicken > deer > cow (easier prey first)
        let preyBonus = 0;
        if (prey.type === 'chicken') preyBonus = 0.3;
        else if (prey.type === 'deer') preyBonus = 0.1;
        else if (prey.type === 'cow') preyBonus = -0.1;

        const score = proximity * 0.6 + preyBonus + nn.aggression * 0.2 + Math.random() * 0.1;
        if (score > bestScore) {
          bestScore = score;
          bestTarget = prey;
        }
      }

      if (bestTarget && bestScore > 0.3) {
        this.memory.currentTarget = bestTarget;
        this.memory.targetLostTime = 0;

        if (bestTarget.distance <= this.attackRange) {
          return STATES.ATTACK;
        }
        return STATES.CHASE;
      }
    }

    // ── RULE 4: Rest if very tired ──
    if (nn.energyConservation > 0.7 || this.energy < 0.15 || this.stamina < 0.1) {
      return STATES.REST;
    }

    // ── RULE 5: Eat if hungry (wolves "eat" at kill site) ──
    if (this.hunger > 0.6 && this.fsm.currentState === STATES.IDLE) {
      return STATES.EAT;
    }

    // ── RULE 6: Socialize with nearby wolves ──
    if (nn.socialDrive > 0.6 && p.allies.length > 0 && this.hunger < 0.5) {
      if (Math.random() < 0.3) return STATES.SOCIALIZE;
    }

    // ── RULE 7: Wander/patrol ──
    if (nn.curiosity > 0.4 || this.fsm.stateTime > 6) {
      return STATES.WANDER;
    }

    // ── RULE 8: Idle ──
    return STATES.IDLE;
  }

  /**
   * Override update to track live target positions.
   */
  update(dt, allEntities, playerPos) {
    super.update(dt, allEntities, playerPos);

    // Update live target position so chase tracks moving prey
    if (this.memory.currentTarget) {
      if (this.memory.currentTarget.mesh && this.memory.currentTarget.mesh.position) {
        this.memory.currentTarget.position = this.memory.currentTarget.mesh.position.clone();
      }
      // If target is player, update from playerPos
      if (this.memory.currentTarget.type === 'player' && playerPos) {
        this.memory.currentTarget.position = playerPos.clone();
      }
    }
  }
}

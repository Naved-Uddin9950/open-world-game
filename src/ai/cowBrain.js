// ============================================================
// cowBrain.js — Cow AI with slow grazing, herding, and panic
// ============================================================
import * as THREE from 'three';
import { AnimalBrain, NeuralNetwork } from './animalBrain.js';
import { STATES } from './fsm.js';
import {
  COW_WOLF_FEAR_RADIUS,
  COW_NORMAL_SPEED,
  COW_REACTION_DELAY,
  COW_GROUP_RADIUS,
} from '../utils/constants.js';

// ── Brain.js training data for cows ─────────────────────────
const COW_TRAINING_DATA = [
  // Wolf very close → panic flee
  { input: { hunger: 0.3, energy: 0.7, health: 0.9, fear: 0.8, nearestThreatDist: 0.1, nearestFoodDist: 0.8, stamina: 0.7 },
    output: { aggression: 0.0, curiosity: 0.0, fearResponse: 0.9, energyConservation: 0.2, socialDrive: 0.0 } },
  // No threats → graze and socialize
  { input: { hunger: 0.5, energy: 0.7, health: 1.0, fear: 0.0, nearestThreatDist: 1.0, nearestFoodDist: 0.5, stamina: 0.8 },
    output: { aggression: 0.0, curiosity: 0.3, fearResponse: 0.0, energyConservation: 0.3, socialDrive: 0.7 } },
  // Rested, content → idle/social
  { input: { hunger: 0.2, energy: 0.9, health: 1.0, fear: 0.0, nearestThreatDist: 1.0, nearestFoodDist: 0.8, stamina: 0.9 },
    output: { aggression: 0.0, curiosity: 0.4, fearResponse: 0.0, energyConservation: 0.4, socialDrive: 0.6 } },
  // Tired → rest
  { input: { hunger: 0.4, energy: 0.1, health: 0.8, fear: 0.0, nearestThreatDist: 0.8, nearestFoodDist: 0.5, stamina: 0.1 },
    output: { aggression: 0.0, curiosity: 0.1, fearResponse: 0.1, energyConservation: 0.9, socialDrive: 0.2 } },
  // Wolf at medium distance → cautious
  { input: { hunger: 0.3, energy: 0.6, health: 0.8, fear: 0.4, nearestThreatDist: 0.4, nearestFoodDist: 0.7, stamina: 0.6 },
    output: { aggression: 0.0, curiosity: 0.0, fearResponse: 0.6, energyConservation: 0.4, socialDrive: 0.3 } },
  // Attacked → flee immediately
  { input: { hunger: 0.3, energy: 0.5, health: 0.4, fear: 0.9, nearestThreatDist: 0.1, nearestFoodDist: 0.9, stamina: 0.5 },
    output: { aggression: 0.0, curiosity: 0.0, fearResponse: 1.0, energyConservation: 0.3, socialDrive: 0.0 } },
];

/**
 * CowBrain — docile herd animal AI.
 * 
 * BEHAVIOR:
 * - Slow wandering and grazing
 * - Low fear response (delayed reaction)
 * - Groups with nearby cows (herding)
 * - Only runs when directly attacked or wolf very close
 * - Player is neutral — cow doesn't flee from player unless attacked
 */
export class CowBrain extends AnimalBrain {
  constructor(mesh) {
    super(mesh, {
      type: 'cow',
      baseSpeed: COW_NORMAL_SPEED,
      runSpeed: COW_NORMAL_SPEED * 2.2,
      visionRange: COW_WOLF_FEAR_RADIUS,
      attackDamage: 0,          // cows don't attack
      attackRange: 0,
      attackCooldown: 999,
      health: 1.2,              // cows are tough
      maxHealth: 1.2,
      stamina: 0.8,
      maxStamina: 0.8,
      staminaDrainWalk: 0.008,
      staminaDrainRun: 0.05,
      staminaRecovery: 0.04,
      hunger: 0.4,
      energy: 0.8,
      predators: ['wolf'],      // wolves are threats
      prey: [],                  // cows don't hunt
      same: ['cow'],
      homeRadius: 35,
      trainingData: COW_TRAINING_DATA,
    });

    // Cow-specific: reaction delay (slow to flee)
    this._reactionTimer = 0;
    this._reactionDelay = COW_REACTION_DELAY;
  }

  /**
   * Decide next state.
   * 
   * PRIORITY:
   * 1. Flee if attacked recently
   * 2. Flee from wolf (with reaction delay)
   * 3. Rest if exhausted
   * 4. Eat/graze when hungry
   * 5. Socialize/herd
   * 6. Slow wander
   * 7. Idle
   */
  decideNextState() {
    const nn = this.nnOutputs;
    const p = this.perception;

    // ── RULE 1: Flee immediately if attacked ──
    if (this.memory.lastAttackedBy && this.memory.lastAttackedTime < 6) {
      if (this.memory.lastThreatPos) {
        return STATES.FLEE;
      }
    }

    // ── RULE 2: Flee from wolf (with reaction delay) ──
    if (p.nearestThreat && p.nearestThreat.distance < COW_WOLF_FEAR_RADIUS * 0.6) {
      this._reactionTimer += 0.016; // approximate dt
      if (this._reactionTimer >= this._reactionDelay) {
        this.fear = Math.min(1.0, this.fear + 0.4);
        this.memory.lastThreatPos = p.nearestThreat.position.clone();
        return STATES.FLEE;
      }
    } else {
      this._reactionTimer = Math.max(0, this._reactionTimer - 0.016);
    }

    // ── RULE 3: Rest if exhausted ──
    if (nn.energyConservation > 0.8 || this.energy < 0.1 || this.stamina < 0.1) {
      return STATES.REST;
    }

    // ── RULE 4: Graze when hungry ──
    if (this.hunger > 0.4 && nn.fearResponse < 0.3) {
      return STATES.EAT;
    }

    // ── RULE 5: Herd with other cows ──
    if (nn.socialDrive > 0.5 && p.allies.length > 0 && this.fear < 0.1) {
      return STATES.SOCIALIZE;
    }

    // ── RULE 6: Slow wander ──
    if (nn.curiosity > 0.3 || this.fsm.stateTime > 10) {
      return STATES.WANDER;
    }

    // ── RULE 7: Idle (cows idle a lot) ──
    return STATES.IDLE;
  }

  update(dt, allEntities, playerPos) {
    // Update reaction timer with real dt
    if (this.perception.nearestThreat && this.perception.nearestThreat.distance < COW_WOLF_FEAR_RADIUS * 0.6) {
      this._reactionTimer += dt;
    } else {
      this._reactionTimer = Math.max(0, this._reactionTimer - dt * 0.5);
    }

    super.update(dt, allEntities, playerPos);

    // Update threat position
    if (this.perception.nearestThreat) {
      this.memory.lastThreatPos = this.perception.nearestThreat.position.clone();
    }
    if (this.memory.lastAttackedBy && this.memory.lastAttackedTime < 6 && playerPos) {
      this.memory.lastThreatPos = playerPos.clone();
    }
  }
}

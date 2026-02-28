// ============================================================
// animalBrain.js — Base class for all animal AI brains
// ============================================================
import * as THREE from 'three';
import { FiniteStateMachine, STATES } from './fsm.js';
import { Perception } from './perception.js';
import { Steering } from './steering.js';

// Try to get Brain.js NeuralNetwork
import '../libs/brain.js';
const NeuralNetwork = (typeof brain !== 'undefined' && brain.NeuralNetwork)
  ? brain.NeuralNetwork
  : (typeof globalThis !== 'undefined' && globalThis.brain && globalThis.brain.NeuralNetwork)
    ? globalThis.brain.NeuralNetwork
    : null;

export { NeuralNetwork };

/**
 * AnimalBrain — base class implementing hybrid FSM + Brain.js AI.
 * 
 * Each animal has:
 * - Needs: hunger, energy, fear, health, stamina
 * - Perception: vision/threat detection
 * - FSM: state management
 * - Steering: smooth movement
 * - Neural network: decision weighting
 * - Memory: remembers threats, targets, etc.
 */
export class AnimalBrain {
  /**
   * @param {THREE.Mesh} mesh         The animal mesh in the scene
   * @param {object} config           Species-specific configuration
   */
  constructor(mesh, config = {}) {
    this.mesh = mesh;
    this.type = config.type || 'animal';

    // ── Needs (0 to 1, where 1 = max) ──────────────────
    this.hunger = config.hunger || 0.3;         // 0 = full, 1 = starving
    this.energy = config.energy || 0.8;         // 0 = exhausted, 1 = full energy
    this.fear = 0;                               // 0 = calm, 1 = terrified
    this.health = config.health || 1.0;          // 0 = dead, 1 = full health
    this.maxHealth = config.maxHealth || 1.0;
    this.stamina = config.stamina || 1.0;        // 0 = exhausted, 1 = full stamina
    this.maxStamina = config.maxStamina || 1.0;
    this.isDead = false;

    // ── Speed configuration ─────────────────────────────
    this.baseSpeed = config.baseSpeed || 2.0;
    this.runSpeed = config.runSpeed || 4.0;
    this.currentSpeed = 0;

    // ── Stamina configuration ───────────────────────────
    this.staminaDrainWalk = config.staminaDrainWalk || 0.02;  // per second
    this.staminaDrainRun = config.staminaDrainRun || 0.08;    // per second
    this.staminaRecovery = config.staminaRecovery || 0.05;    // per second when resting/idle
    this.canRun = true;  // false when stamina hits 0 until recovery

    // ── Attack configuration ────────────────────────────
    this.attackDamage = config.attackDamage || 0.15;
    this.attackRange = config.attackRange || 2.0;
    this.attackCooldown = config.attackCooldown || 1.5;
    this._attackTimer = 0;

    // ── Movement state ──────────────────────────────────
    this.velocity = new THREE.Vector3();
    this.position = mesh.position;

    // ── Sub-systems ─────────────────────────────────────
    this.perception = new Perception({
      visionRange: config.visionRange || 40,
      visionAngle: config.visionAngle || Math.PI,
      predators: config.predators || [],
      prey: config.prey || [],
      same: config.same || [],
    });
    this.steering = new Steering();
    this.fsm = new FiniteStateMachine(this);

    // ── Memory ──────────────────────────────────────────
    this.memory = {
      lastThreatPos: null,         // where we last saw a threat
      lastThreatTime: 0,           // when we last saw a threat
      threatCooldown: 5.0,         // seconds before forgetting threat
      lastAttackedBy: null,        // who attacked us last
      lastAttackedTime: 0,
      currentTarget: null,         // current chase/attack target
      targetLostTime: 0,           // how long since we lost target
      targetTimeout: 4.0,          // seconds before giving up chase
      wanderTarget: new THREE.Vector3(),
      wanderTimer: 0,
      homePosition: mesh.position.clone(), // where we spawned
      homeRadius: config.homeRadius || 50,  // how far we roam from home
    };

    // ── Anti-stick mechanics ────────────────────────────
    this._stuckTimer = 0;
    this._lastPosition = mesh.position.clone();
    this._stuckThreshold = 0.05;   // min distance per second to not be "stuck"
    this._disengageTimer = 0;
    this._chaseCooldown = 0;       // cooldown after a chase ends
    this._minStopDistance = config.minStopDistance || 1.5;

    // ── Neural network outputs (updated by subclass) ────
    this.nnOutputs = {
      aggression: 0.5,
      curiosity: 0.5,
      fearResponse: 0.5,
      energyConservation: 0.5,
      socialDrive: 0.5,
    };

    // ── Brain.js neural network ─────────────────────────
    this.neuralNet = null;
    this._initNeuralNetwork(config.trainingData || []);

    // ── Register FSM states ─────────────────────────────
    this._registerBaseStates();
  }

  /**
   * Initialize and train the Brain.js neural network.
   * Subclasses provide training data.
   */
  _initNeuralNetwork(trainingData) {
    if (!NeuralNetwork || trainingData.length === 0) return;

    try {
      this.neuralNet = new NeuralNetwork({
        hiddenLayers: [8, 6],
        activation: 'sigmoid',
      });
      this.neuralNet.train(trainingData, {
        iterations: 200,
        errorThresh: 0.01,
        log: false,
      });
    } catch (e) {
      console.warn(`[AnimalBrain] Failed to train neural network for ${this.type}:`, e);
      this.neuralNet = null;
    }
  }

  /**
   * Run the neural network with current inputs.
   * Returns { aggression, curiosity, fearResponse, energyConservation, socialDrive }
   */
  _runNeuralNetwork() {
    if (!this.neuralNet) return this._getDefaultNNOutputs();

    try {
      const input = this._buildNNInput();
      const output = this.neuralNet.run(input);
      return {
        aggression: output.aggression || 0.5,
        curiosity: output.curiosity || 0.5,
        fearResponse: output.fearResponse || 0.5,
        energyConservation: output.energyConservation || 0.5,
        socialDrive: output.socialDrive || 0.5,
      };
    } catch (e) {
      return this._getDefaultNNOutputs();
    }
  }

  /**
   * Build neural network input from current state.
   * Override in subclass for species-specific inputs.
   */
  _buildNNInput() {
    return {
      hunger: this.hunger,
      energy: this.energy,
      health: this.health,
      fear: this.fear,
      nearestThreatDist: this.perception.nearestThreat
        ? Math.min(this.perception.nearestThreat.distance / this.perception.visionRange, 1)
        : 1.0,
      nearestFoodDist: this.perception.nearestFood
        ? Math.min(this.perception.nearestFood.distance / this.perception.visionRange, 1)
        : 1.0,
      stamina: this.stamina,
    };
  }

  /**
   * Default NN outputs when no network is available.
   */
  _getDefaultNNOutputs() {
    return {
      aggression: 0.3,
      curiosity: 0.4,
      fearResponse: 0.5,
      energyConservation: 0.5,
      socialDrive: 0.4,
    };
  }

  /**
   * Register base FSM states. Subclasses override _registerStates() for species-specific behavior.
   */
  _registerBaseStates() {
    const self = this;

    // IDLE — stand still, recover energy
    this.fsm.addState(STATES.IDLE, {
      enter() {
        self.currentSpeed = 0;
      },
      update(dt) {
        // Recover stamina and energy while idle
        self.stamina = Math.min(self.maxStamina, self.stamina + self.staminaRecovery * dt * 1.5);
        self.energy = Math.min(1.0, self.energy + 0.01 * dt);

        // Occasional idle rotation
        if (Math.random() < 0.005) {
          self.mesh.rotation.y += (Math.random() - 0.5) * 0.4;
        }
      },
      exit() {},
    });

    // WANDER — random roaming
    this.fsm.addState(STATES.WANDER, {
      enter() {
        self._pickWanderTarget();
      },
      update(dt) {
        self.memory.wanderTimer -= dt;
        if (self.memory.wanderTimer <= 0) {
          self._pickWanderTarget();
        }

        const speed = self.baseSpeed * 0.6;
        self.currentSpeed = speed;
        const force = self.steering.arrive(self.position, self.memory.wanderTarget, speed, 2);
        self._applyForce(force, dt);

        // Drain stamina while walking
        self._drainStamina(dt, false);

        // If we've reached the wander target, pick a new one
        const dist = self.position.distanceTo(self.memory.wanderTarget);
        if (dist < 1.5) {
          self._pickWanderTarget();
        }
      },
      exit() {},
    });

    // EAT — reduce hunger
    this.fsm.addState(STATES.EAT, {
      enter() {
        self.currentSpeed = 0;
      },
      update(dt) {
        self.hunger = Math.max(0, self.hunger - 0.1 * dt);
        self.stamina = Math.min(self.maxStamina, self.stamina + self.staminaRecovery * dt * 0.5);
        // Eat animation — small head bobbing
        if (Math.random() < 0.03) {
          self.mesh.rotation.x = Math.sin(Date.now() * 0.01) * 0.1;
        }
      },
      exit() {
        self.mesh.rotation.x = 0;
      },
    });

    // DRINK — not used heavily, same as eat for now
    this.fsm.addState(STATES.DRINK, {
      enter() { self.currentSpeed = 0; },
      update(dt) {
        self.energy = Math.min(1.0, self.energy + 0.05 * dt);
      },
      exit() {},
    });

    // CHASE — pursue a target
    this.fsm.addState(STATES.CHASE, {
      enter() {},
      update(dt) {
        const target = self.memory.currentTarget;
        if (!target || !target.position) {
          self.memory.targetLostTime += dt;
          if (self.memory.targetLostTime > self.memory.targetTimeout) {
            self._chaseCooldown = 3.0; // cooldown after losing target
            self.fsm.transition(STATES.WANDER);
          }
          return;
        }

        const dist = self.position.distanceTo(target.position);

        // Stop if minimum distance
        if (dist <= self.attackRange) {
          self.fsm.transition(STATES.ATTACK);
          return;
        }

        // Check if target is too far (lost)
        if (dist > self.perception.visionRange * 1.2) {
          self.memory.targetLostTime += dt;
          if (self.memory.targetLostTime > self.memory.targetTimeout) {
            self._chaseCooldown = 3.0;
            self.fsm.transition(STATES.WANDER);
            return;
          }
        } else {
          self.memory.targetLostTime = 0;
        }

        // Run if we can, otherwise walk
        let speed = self.canRun ? self.runSpeed : self.baseSpeed * 0.8;
        self.currentSpeed = speed;
        const force = self.steering.seek(self.position, target.position, speed);

        // Add separation from other animals to avoid clustering
        const sepForce = self.steering.separation(self.position, self.perception.nearbyEntities, 2);
        force.add(sepForce.multiplyScalar(0.3));

        self._applyForce(force, dt);
        self._drainStamina(dt, true);
      },
      exit() {
        self.memory.targetLostTime = 0;
      },
    });

    // ATTACK — lunge at target, deal damage
    this.fsm.addState(STATES.ATTACK, {
      enter() {
        self.fsm.lock(0.5); // lock during attack animation
      },
      update(dt) {
        self._attackTimer -= dt;
        const target = self.memory.currentTarget;
        if (!target || !target.mesh) {
          self.fsm.unlock();
          self.fsm.transition(STATES.WANDER);
          return;
        }

        const dist = self.position.distanceTo(target.position);
        if (dist > self.attackRange * 1.5) {
          self.fsm.unlock();
          self.fsm.transition(STATES.CHASE);
          return;
        }

        if (self._attackTimer <= 0) {
          // Deal damage
          self._dealDamage(target);
          self._attackTimer = self.attackCooldown;

          // Small lunge toward target
          const lunge = self.steering.seek(self.position, target.position, 0.3);
          self.position.add(lunge);
        }

        self._drainStamina(dt, true);
      },
      exit() {
        self._attackTimer = 0;
      },
    });

    // FLEE — run away from threat
    this.fsm.addState(STATES.FLEE, {
      enter() {},
      update(dt) {
        const threat = self.memory.lastThreatPos;
        if (!threat) {
          self.fsm.transition(STATES.WANDER);
          return;
        }

        const dist = self.position.distanceTo(threat);

        // Safe distance reached — calm down
        if (dist > self.perception.visionRange * 0.8) {
          self.fear = Math.max(0, self.fear - 0.3 * dt);
          if (self.fear < 0.2) {
            self.fsm.transition(STATES.IDLE);
            return;
          }
        }

        let speed = self.canRun ? self.runSpeed : self.baseSpeed;
        self.currentSpeed = speed;
        const force = self.steering.flee(self.position, threat, speed);

        // Add random noise to prevent straight-line fleeing
        const noise = new THREE.Vector3(
          (Math.random() - 0.5) * 0.5,
          0,
          (Math.random() - 0.5) * 0.5,
        );
        force.add(noise);

        // Separation from other fleeing animals
        const sepForce = self.steering.separation(self.position, self.perception.nearbyEntities, 2);
        force.add(sepForce.multiplyScalar(0.2));

        self._applyForce(force, dt);
        self._drainStamina(dt, true);
      },
      exit() {},
    });

    // REST — recover energy and stamina
    this.fsm.addState(STATES.REST, {
      enter() {
        self.currentSpeed = 0;
      },
      update(dt) {
        self.energy = Math.min(1.0, self.energy + 0.04 * dt);
        self.stamina = Math.min(self.maxStamina, self.stamina + self.staminaRecovery * dt * 2.0);
        self.hunger += 0.005 * dt; // get hungrier while resting
      },
      exit() {},
    });

    // SOCIALIZE — move toward nearby allies
    this.fsm.addState(STATES.SOCIALIZE, {
      enter() {},
      update(dt) {
        if (self.perception.allies.length === 0) {
          self.fsm.transition(STATES.WANDER);
          return;
        }

        const speed = self.baseSpeed * 0.4;
        self.currentSpeed = speed;
        const cohesionForce = self.steering.cohesion(self.position, self.perception.allies);
        const sepForce = self.steering.separation(self.position, self.perception.allies, 2.5);

        const force = cohesionForce.multiplyScalar(0.6).add(sepForce.multiplyScalar(0.4));
        self._applyForce(force, dt);
        self._drainStamina(dt, false);
      },
      exit() {},
    });

    // Set initial state
    this.fsm.transition(STATES.IDLE);
  }

  // ── Helper methods ──────────────────────────────────────

  /**
   * Pick a new random wander target within home radius.
   */
  _pickWanderTarget() {
    const r = 5 + Math.random() * 15;
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
      homeDir.normalize().multiplyScalar(this.memory.homeRadius * 0.8);
      target.copy(this.memory.homePosition).add(homeDir);
    }

    this.memory.wanderTarget.copy(target);
    this.memory.wanderTimer = 3 + Math.random() * 5;
  }

  /**
   * Apply a movement force to the animal.
   */
  _applyForce(force, dt) {
    if (force.lengthSq() < 0.0001) return;

    force.y = 0;
    const maxForce = this.currentSpeed || this.baseSpeed;
    if (force.length() > maxForce) {
      force.normalize().multiplyScalar(maxForce);
    }

    // Smooth velocity blend (avoids snapping)
    this.velocity.lerp(force, 0.15);
    this.velocity.y = 0;

    if (this.velocity.length() > maxForce) {
      this.velocity.normalize().multiplyScalar(maxForce);
    }

    this.position.addScaledVector(this.velocity, dt);

    // Face movement direction
    if (this.velocity.lengthSq() > 0.01) {
      const lookTarget = new THREE.Vector3().copy(this.position).add(this.velocity);
      this.mesh.lookAt(lookTarget.x, this.position.y, lookTarget.z);
    }
  }

  /**
   * Drain stamina based on activity.
   */
  _drainStamina(dt, isRunning) {
    const drain = isRunning ? this.staminaDrainRun : this.staminaDrainWalk;
    this.stamina = Math.max(0, this.stamina - drain * dt);

    if (this.stamina <= 0) {
      this.canRun = false;
    }
    if (!this.canRun && this.stamina > 0.2) {
      this.canRun = true;
    }
  }

  /**
   * Deal damage to a target entity.
   */
  _dealDamage(target) {
    if (!target || !target.mesh || !target.mesh.userData) return;

    // Access the target's brain to reduce health
    const targetBrain = target.mesh.userData._brain;
    if (targetBrain) {
      targetBrain.takeDamage(this.attackDamage, this);
    }

    // Also mark player damage if target is player
    if (target.type === 'player' && target.mesh.userData._playerRef) {
      const player = target.mesh.userData._playerRef;
      if (player.takeDamage) {
        player.takeDamage(this.attackDamage);
      }
    }

    // Hunger decreases when attacking (feeding)
    this.hunger = Math.max(0, this.hunger - 0.05);
  }

  /**
   * This animal takes damage.
   */
  takeDamage(amount, attacker = null) {
    this.health = Math.max(0, this.health - amount);
    this.fear = Math.min(1.0, this.fear + 0.4);

    if (attacker) {
      this.memory.lastAttackedBy = attacker;
      this.memory.lastAttackedTime = 0;
      if (attacker.position) {
        this.memory.lastThreatPos = attacker.position.clone();
      } else if (attacker.mesh) {
        this.memory.lastThreatPos = attacker.mesh.position.clone();
      }
    }

    if (this.health <= 0) {
      this.isDead = true;
    }
  }

  /**
   * Check if animal is stuck and apply anti-stick measures.
   */
  _checkStuck(dt) {
    const moved = this.position.distanceTo(this._lastPosition);
    this._lastPosition.copy(this.position);

    if (moved < this._stuckThreshold * dt && this.currentSpeed > 0) {
      this._stuckTimer += dt;
      if (this._stuckTimer > 2.0) {
        // Stuck! Apply random nudge
        this.position.x += (Math.random() - 0.5) * 2;
        this.position.z += (Math.random() - 0.5) * 2;
        this.velocity.set(0, 0, 0);
        this._stuckTimer = 0;
        this._pickWanderTarget();

        // If chasing, disengage
        if (this.fsm.currentState === STATES.CHASE || this.fsm.currentState === STATES.ATTACK) {
          this.memory.currentTarget = null;
          this._chaseCooldown = 3.0;
          this.fsm.unlock();
          this.fsm.transition(STATES.WANDER);
        }
      }
    } else {
      this._stuckTimer = Math.max(0, this._stuckTimer - dt);
    }
  }

  /**
   * Decide the next state based on NN outputs and current needs.
   * Override in subclass for species-specific logic.
   */
  decideNextState() {
    // Base implementation — subclasses override this
    return this.fsm.currentState || STATES.IDLE;
  }

  /**
   * Main update called every frame.
   * @param {number} dt Delta time in seconds
   * @param {Array} allEntities All animal entities for perception
   * @param {THREE.Vector3|null} playerPos Player position
   */
  update(dt, allEntities, playerPos) {
    if (this.isDead) return;

    // ── Update timers ───────────────────────────────────
    this._chaseCooldown = Math.max(0, this._chaseCooldown - dt);
    this._attackTimer = Math.max(0, this._attackTimer - dt);
    this.memory.lastThreatTime += dt;
    this.memory.lastAttackedTime += dt;

    // ── Natural need changes ────────────────────────────
    this.hunger = Math.min(1.0, this.hunger + 0.003 * dt); // slowly get hungry
    this.energy = Math.max(0, this.energy - 0.002 * dt);    // slowly lose energy

    // Fear decay over time
    this.fear = Math.max(0, this.fear - 0.05 * dt);

    // Stamina recovery when idle/resting
    if (this.fsm.currentState === STATES.IDLE || this.fsm.currentState === STATES.REST) {
      this.stamina = Math.min(this.maxStamina, this.stamina + this.staminaRecovery * dt);
    }

    // ── Perception scan ─────────────────────────────────
    const myForward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.mesh.quaternion);
    this.perception.scan(this.position, myForward, allEntities, playerPos, this.type, this.mesh);

    // ── Run neural network ──────────────────────────────
    this.nnOutputs = this._runNeuralNetwork();

    // ── Decide next state ───────────────────────────────
    if (!this.fsm.locked) {
      const nextState = this.decideNextState();
      if (nextState !== this.fsm.currentState) {
        this.fsm.transition(nextState);
      }
    }

    // ── Update current state ────────────────────────────
    this.fsm.update(dt);

    // ── Anti-stick check ────────────────────────────────
    this._checkStuck(dt);

    // ── Update userData for external systems ────────────
    this.mesh.userData.health = this.health;
    this.mesh.userData.maxHealth = this.maxHealth;
    this.mesh.userData.stamina = this.stamina;
    this.mesh.userData.maxStamina = this.maxStamina;
    this.mesh.userData.currentState = this.fsm.currentState;
    this.mesh.userData.isDead = this.isDead;
    this.mesh.userData._brain = this;
  }
}

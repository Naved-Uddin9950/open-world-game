// ============================================================
// fsm.js — Finite State Machine for animal behavior
// ============================================================

/**
 * States available to all animals.
 * Each state has: enter(), update(dt), exit() hooks.
 */
export const STATES = {
  IDLE: 'IDLE',
  WANDER: 'WANDER',
  EAT: 'EAT',
  DRINK: 'DRINK',
  CHASE: 'CHASE',
  ATTACK: 'ATTACK',
  FLEE: 'FLEE',
  REST: 'REST',
  SOCIALIZE: 'SOCIALIZE',
};

/**
 * Generic FSM — manages state transitions and per-state timers.
 */
export class FiniteStateMachine {
  constructor(owner) {
    this.owner = owner;
    this.states = {};          // name -> { enter, update, exit }
    this.currentState = null;  // name string
    this.previousState = null;
    this.stateTime = 0;        // seconds in current state
    this.locked = false;       // when true, transitions are blocked
    this.lockTimer = 0;
  }

  /**
   * Register a state handler.
   * @param {string} name 
   * @param {{ enter?:Function, update?:Function, exit?:Function }} handler 
   */
  addState(name, handler) {
    this.states[name] = {
      enter: handler.enter || (() => {}),
      update: handler.update || (() => {}),
      exit: handler.exit || (() => {}),
    };
  }

  /**
   * Transition to a new state (if not locked and state exists).
   * @param {string} newState 
   */
  transition(newState) {
    if (this.locked) return;
    if (newState === this.currentState) return;
    if (!this.states[newState]) {
      console.warn(`[FSM] Unknown state: ${newState}`);
      return;
    }

    // Exit old state
    if (this.currentState && this.states[this.currentState]) {
      this.states[this.currentState].exit.call(this.owner);
    }

    this.previousState = this.currentState;
    this.currentState = newState;
    this.stateTime = 0;

    // Enter new state
    this.states[newState].enter.call(this.owner);
  }

  /**
   * Lock transitions for a duration (e.g., attack animation).
   * @param {number} duration seconds
   */
  lock(duration) {
    this.locked = true;
    this.lockTimer = duration;
  }

  /**
   * Update the current state.
   * @param {number} dt 
   */
  update(dt) {
    // Handle lock timer
    if (this.locked) {
      this.lockTimer -= dt;
      if (this.lockTimer <= 0) {
        this.locked = false;
        this.lockTimer = 0;
      }
    }

    this.stateTime += dt;

    if (this.currentState && this.states[this.currentState]) {
      this.states[this.currentState].update.call(this.owner, dt);
    }
  }

  /**
   * Force unlock the FSM.
   */
  unlock() {
    this.locked = false;
    this.lockTimer = 0;
  }
}

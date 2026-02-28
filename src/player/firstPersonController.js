// ============================================================
// firstPersonController.js — FPS camera + WASD + pointer lock
// ============================================================
import * as THREE from "three";
import { MOUSE_SENSITIVITY, PLAYER_HEIGHT, PLAYER_SPEED, PLAYER_SPRINT_MULT } from "../utils/constants.js";
import { clamp } from "../utils/math.js";
import { Movement } from "./movement.js";
import { Collision } from "./collision.js";
import { AttackAnimation } from "./attackAnimation.js";

export class FirstPersonController {
  /**
   * @param {THREE.PerspectiveCamera} camera
   * @param {HTMLElement}             domElement  Element for pointer lock
   */
  constructor(camera, domElement) {
    this.camera = camera;
    this.domElement = domElement;

    // ── Sub-systems ─────────────────────────────────────
    this.movement = new Movement();
    this.collision = new Collision();

    // ── Terrain height query (set by engine after init) ─
    /** @type {((x:number,z:number)=>number)|null} */
    this._getHeightAt = null;

    // ── Player container (yaw rotation lives here) ──────
    this.player = new THREE.Object3D();
    this.player.position.set(0, PLAYER_HEIGHT, 0);
    this.player.add(camera);
    camera.position.set(0, 0, 0); // camera is at player eye level

    // ── Mouse look state ────────────────────────────────
    this._euler = new THREE.Euler(0, 0, 0, "YXZ");
    this._isLocked = false;

    // ── Player stats ────────────────────────────────────
    this.health = 1.0;
    this.maxHealth = 1.0;
    this.stamina = 1.0;
    this.maxStamina = 1.0;
    this.staminaDrainSprint = 0.12;  // per second when sprinting (4x speed)
    this.staminaDrainWalk = 0.0;     // no drain for walking
    this.staminaRecovery = 0.06;     // per second when not sprinting
    this.canSprint = true;
    this.isDead = false;

    // ── Attack state ────────────────────────────────────
    this.isAttacking = false;
    this.attackCooldown = 0.5;  // seconds between attacks
    this._attackTimer = 0;
    this.attackRange = 3.0;
    this.attackDamage = 0.25;
    this._onAttack = null;  // callback set by Engine: (playerPos, forward, range, damage) => {}
    this._attackAnim = new AttackAnimation(camera);

    // ── Callbacks ───────────────────────────────────────
    this._onDeath = null;     // called when player dies
    this._onEscape = null;    // called when ESC pressed

    // ── HUD elements ────────────────────────────────────
    this._hudCreated = false;

    // ── Bind methods ────────────────────────────────────
    this._onMouseMove = this._onMouseMove.bind(this);
    this._onKeyDown = this._onKeyDown.bind(this);
    this._onKeyUp = this._onKeyUp.bind(this);
    this._onPointerLockChange = this._onPointerLockChange.bind(this);

    this._initListeners();
    this._createHUD();
  }

  /**
   * Set the terrain height query function.
   * @param {(x:number,z:number)=>number} fn
   */
  setHeightProvider(fn) {
    this._getHeightAt = fn;
  }

  /** Wire up DOM events. */
  _initListeners() {
    document.addEventListener("mousemove", this._onMouseMove);
    document.addEventListener("keydown", this._onKeyDown);
    document.addEventListener("keyup", this._onKeyUp);
    document.addEventListener("pointerlockchange", this._onPointerLockChange);

    // Click to lock
    this.domElement.addEventListener("click", () => {
      if (!this._isLocked) this.domElement.requestPointerLock();
    });
  }

  _onPointerLockChange() {
    const wasLocked = this._isLocked;
    this._isLocked = document.pointerLockElement === this.domElement;

    // If pointer lock was lost while alive, fire escape callback.
    // In Chrome, ESC to exit pointer lock does NOT fire a keydown event,
    // so we must detect it here.
    if (wasLocked && !this._isLocked && !this.isDead) {
      if (this._onEscape) this._onEscape();
    }
  }

  /** Mouse look. */
  _onMouseMove(e) {
    if (!this._isLocked) return;

    this._euler.setFromQuaternion(this.camera.quaternion);

    this._euler.y -= e.movementX * MOUSE_SENSITIVITY;
    this._euler.x -= e.movementY * MOUSE_SENSITIVITY;

    // Clamp pitch to prevent flipping
    this._euler.x = clamp(
      this._euler.x,
      -Math.PI / 2 + 0.01,
      Math.PI / 2 - 0.01,
    );

    this.camera.quaternion.setFromEuler(this._euler);
  }

  /** Key down handler. */
  _onKeyDown(e) {
    switch (e.code) {
      case "KeyW":
      case "ArrowUp":
        this.movement.forward = true;
        break;
      case "KeyS":
      case "ArrowDown":
        this.movement.backward = true;
        break;
      case "KeyA":
      case "ArrowLeft":
        this.movement.left = true;
        break;
      case "KeyD":
      case "ArrowRight":
        this.movement.right = true;
        break;
      case "ShiftLeft":
        this.movement.isSprinting = true;
        break;
      case "ShiftRight":
        this.movement.isSprinting = true;
        break;
      case "Space":
        this.movement.jump = true;
        break;
      case "Enter":
        this.isAttacking = true;
        break;
      case "Escape":
        if (this._onEscape) this._onEscape();
        break;
    }
  }

  /** Key up handler. */
  _onKeyUp(e) {
    switch (e.code) {
      case "KeyW":
      case "ArrowUp":
        this.movement.forward = false;
        break;
      case "KeyS":
      case "ArrowDown":
        this.movement.backward = false;
        break;
      case "KeyA":
      case "ArrowLeft":
        this.movement.left = false;
        break;
      case "KeyD":
      case "ArrowRight":
        this.movement.right = false;
        break;
      case "ShiftLeft":
        this.movement.isSprinting = false;
        break;
      case "ShiftRight":
        this.movement.isSprinting = false;
        break;
      case "Space":
        this.movement.jump = false;
        this.movement.canJump = true;
        break;
      case "Enter":
        this.isAttacking = false;
        break;
    }
  }

  /**
   * Create player HUD (health bar, stamina bar, crosshair).
   */
  _createHUD() {
    if (this._hudCreated) return;
    this._hudCreated = true;

    const hud = document.createElement('div');
    hud.id = 'player-hud';
    hud.style.cssText = 'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);z-index:1000;pointer-events:none;display:flex;flex-direction:column;align-items:center;gap:4px;';

    // Health bar
    const hpBar = document.createElement('div');
    hpBar.style.cssText = 'width:200px;height:14px;background:#333;border-radius:3px;overflow:hidden;border:1px solid #555;';
    const hpFill = document.createElement('div');
    hpFill.id = 'player-hp-fill';
    hpFill.style.cssText = 'width:100%;height:100%;background:#22cc22;transition:width 0.2s;';
    hpBar.appendChild(hpFill);
    hud.appendChild(hpBar);

    // Stamina bar
    const stBar = document.createElement('div');
    stBar.style.cssText = 'width:200px;height:8px;background:#333;border-radius:3px;overflow:hidden;border:1px solid #555;';
    const stFill = document.createElement('div');
    stFill.id = 'player-st-fill';
    stFill.style.cssText = 'width:100%;height:100%;background:#ffcc00;transition:width 0.2s;';
    stBar.appendChild(stFill);
    hud.appendChild(stBar);

    // Labels
    const labelRow = document.createElement('div');
    labelRow.style.cssText = 'display:flex;justify-content:space-between;width:200px;font-size:10px;color:#fff;font-family:monospace;text-shadow:1px 1px 2px #000;';
    const hpLabel = document.createElement('span');
    hpLabel.id = 'player-hp-label';
    hpLabel.textContent = 'HP: 100%';
    const stLabel = document.createElement('span');
    stLabel.id = 'player-st-label';
    stLabel.textContent = 'ST: 100%';
    labelRow.appendChild(hpLabel);
    labelRow.appendChild(stLabel);
    hud.appendChild(labelRow);

    document.body.appendChild(hud);

    // Crosshair
    const crosshair = document.createElement('div');
    crosshair.id = 'crosshair';
    crosshair.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:999;pointer-events:none;width:20px;height:20px;';
    crosshair.innerHTML = '<svg width="20" height="20"><line x1="10" y1="2" x2="10" y2="8" stroke="white" stroke-width="2"/><line x1="10" y1="12" x2="10" y2="18" stroke="white" stroke-width="2"/><line x1="2" y1="10" x2="8" y2="10" stroke="white" stroke-width="2"/><line x1="12" y1="10" x2="18" y2="10" stroke="white" stroke-width="2"/></svg>';
    document.body.appendChild(crosshair);
  }

  /**
   * Update the HUD display.
   */
  _updateHUD() {
    const hpFill = document.getElementById('player-hp-fill');
    const stFill = document.getElementById('player-st-fill');
    const hpLabel = document.getElementById('player-hp-label');
    const stLabel = document.getElementById('player-st-label');

    if (hpFill) {
      const hpPct = Math.max(0, Math.min(100, (this.health / this.maxHealth) * 100));
      hpFill.style.width = hpPct + '%';
      if (hpPct > 60) hpFill.style.background = '#22cc22';
      else if (hpPct > 30) hpFill.style.background = '#cccc22';
      else hpFill.style.background = '#cc2222';
    }
    if (stFill) {
      const stPct = Math.max(0, Math.min(100, (this.stamina / this.maxStamina) * 100));
      stFill.style.width = stPct + '%';
      if (!this.canSprint) stFill.style.background = '#cc6600';
      else stFill.style.background = '#ffcc00';
    }
    if (hpLabel) hpLabel.textContent = 'HP: ' + Math.round((this.health / this.maxHealth) * 100) + '%';
    if (stLabel) stLabel.textContent = 'ST: ' + Math.round((this.stamina / this.maxStamina) * 100) + '%';
  }

  /**
   * Player takes damage from an animal.
   * @param {number} amount
   */
  takeDamage(amount) {
    if (this.isDead) return;
    this.health = Math.max(0, this.health - amount);
    if (this.health <= 0) {
      this.isDead = true;
      if (this._onDeath) this._onDeath();
    }
    // Red flash effect
    const flash = document.createElement('div');
    flash.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(255,0,0,0.3);z-index:998;pointer-events:none;transition:opacity 0.3s;';
    document.body.appendChild(flash);
    setTimeout(() => { flash.style.opacity = '0'; }, 50);
    setTimeout(() => { flash.remove(); }, 350);
  }

  /**
   * Set callbacks.
   */
  setDeathCallback(fn) { this._onDeath = fn; }
  setEscapeCallback(fn) { this._onEscape = fn; }

  /**
   * Set the attack callback (called by Engine after AI controller is created).
   * @param {Function} callback (playerPos, forward, range, damage) => void
   */
  setAttackCallback(callback) {
    this._onAttack = callback;
  }

  /**
   * Called every fixed-step update.
   * @param {number} dt  Delta time in seconds
   */
  update(dt) {
    if (!this._isLocked) return;
    if (this.isDead) return;

    // ── Stamina system ──────────────────────────────────────
    if (this.movement.isSprinting && (this.movement.forward || this.movement.backward || this.movement.left || this.movement.right)) {
      // Sprint: 4x speed mult, 4x stamina consumption
      if (this.canSprint && this.stamina > 0) {
        this.stamina = Math.max(0, this.stamina - this.staminaDrainSprint * dt);
        if (this.stamina <= 0) {
          this.canSprint = false;
          this.movement.isSprinting = false;
        }
      } else {
        // Can't sprint — force walking
        this.movement.isSprinting = false;
      }
    } else {
      // Recover stamina when not sprinting
      this.stamina = Math.min(this.maxStamina, this.stamina + this.staminaRecovery * dt);
      if (!this.canSprint && this.stamina > 0.15) {
        this.canSprint = true;
      }
    }

    // Override sprint multiplier: Right Shift = 4x speed
    if (this.movement.isSprinting && this.canSprint) {
      this.movement.sprintMultiplier = 4.0;
    } else {
      this.movement.sprintMultiplier = PLAYER_SPRINT_MULT;
      if (!this.canSprint) this.movement.isSprinting = false;
    }

    // Health regeneration (slow)
    this.health = Math.min(this.maxHealth, this.health + 0.005 * dt);

    // ── Attack system ───────────────────────────────────────
    this._attackTimer = Math.max(0, this._attackTimer - dt);
    if (this.isAttacking && this._attackTimer <= 0) {
      this._attackTimer = this.attackCooldown;

      // Trigger swing animation
      this._attackAnim.swing();

      // Get forward direction
      const forward = new THREE.Vector3(0, 0, -1);
      forward.applyQuaternion(this.camera.quaternion);
      forward.y = 0;
      forward.normalize();

      if (this._onAttack) {
        const hitResult = this._onAttack(this.player.position.clone(), forward, this.attackRange, this.attackDamage);
        this._attackAnim.onHitResult(hitResult);
      }
    }

    // Update attack animation
    this._attackAnim.update(dt);

    // Ensure internal euler matches camera for look (movement uses camera directly)
    this._euler.setFromQuaternion(this.camera.quaternion);

    // Compute displacement (movement now uses camera world vectors)
    const displacement = this.movement.update(dt, this.camera);

    // Obstacle collision: test horizontal movement against registered colliders
    const radius = 0.35; // player collision radius (meters)
    const currentX = this.player.position.x;
    const currentZ = this.player.position.z;
    const feetY = this.player.position.y - PLAYER_HEIGHT;

    // Attempt X movement
    const attemptX = currentX + displacement.x;
    const boxX = new THREE.Box3(
      new THREE.Vector3(attemptX - radius, feetY, currentZ - radius),
      new THREE.Vector3(
        attemptX + radius,
        feetY + PLAYER_HEIGHT,
        currentZ + radius,
      ),
    );
    const hitX = this.collision.checkObstacles(boxX);

    // Attempt Z movement
    const attemptZ = currentZ + displacement.z;
    const boxZ = new THREE.Box3(
      new THREE.Vector3(currentX - radius, feetY, attemptZ - radius),
      new THREE.Vector3(
        currentX + radius,
        feetY + PLAYER_HEIGHT,
        attemptZ + radius,
      ),
    );
    const hitZ = this.collision.checkObstacles(boxZ);

    // Resolve simple sliding: allow movement on one axis if the other is blocked
    if (hitX && hitZ) {
      displacement.x = 0;
      displacement.z = 0;
    } else if (hitX) {
      displacement.x = 0;
    } else if (hitZ) {
      displacement.z = 0;
    }

    // Apply horizontal
    this.player.position.x += displacement.x;
    this.player.position.z += displacement.z;

    // Apply vertical
    this.player.position.y += displacement.y;

    // Ground collision — prefer heightmap, fallback to raycaster
    const MAX_STEP_DOWN = 1.0;
    if (this._getHeightAt) {
      const groundY = this._getHeightAt(
        this.player.position.x,
        this.player.position.z,
      );
      const targetY = groundY + PLAYER_HEIGHT;
      const drop = this.player.position.y - targetY;

      if (drop <= 0) {
        this.player.position.y = targetY;
        this.movement.land(groundY);
      } else if (drop <= MAX_STEP_DOWN && this.movement.velocity.y <= 0) {
        this.player.position.y = targetY;
        this.movement.land(groundY);
      } else {
        this.movement.isGrounded = false;
      }
    } else {
      const { grounded, groundY } = this.collision.checkGround(
        this.player.position,
      );
      if (grounded) {
        const targetY = groundY + PLAYER_HEIGHT;
        const drop = this.player.position.y - targetY;

        if (drop <= MAX_STEP_DOWN && this.movement.velocity.y <= 0) {
          this.player.position.y = targetY;
          this.movement.land(groundY);
        } else {
          this.movement.isGrounded = false;
        }
      } else if (this.player.position.y <= PLAYER_HEIGHT) {
        this.player.position.y = PLAYER_HEIGHT;
        this.movement.land(0);
      } else {
        this.movement.isGrounded = false;
      }
    }

    // ── Update HUD ──────────────────────────────────────────
    this._updateHUD();
  }

  /** Get the player's world position. */
  getPosition() {
    return this.player.position;
  }

  /** Get the camera's forward direction (horizontal). */
  getForward() {
    const forward = new THREE.Vector3(0, 0, -1);
    forward.applyQuaternion(this.camera.quaternion);
    forward.y = 0;
    forward.normalize();
    return forward;
  }

  /** Register ground / obstacle colliders. */
  addColliders(...objects) {
    this.collision.addColliders(...objects);
  }

  /** Unregister colliders previously added. */
  removeColliders(...objects) {
    this.collision.removeColliders(...objects);
  }

  /** Clean up event listeners. */
  dispose() {
    document.removeEventListener("mousemove", this._onMouseMove);
    document.removeEventListener("keydown", this._onKeyDown);
    document.removeEventListener("keyup", this._onKeyUp);
    document.removeEventListener(
      "pointerlockchange",
      this._onPointerLockChange,
    );
    // Remove attack animation
    if (this._attackAnim) this._attackAnim.dispose();
    // Remove HUD
    const hud = document.getElementById('player-hud');
    if (hud) hud.remove();
    const crosshair = document.getElementById('crosshair');
    if (crosshair) crosshair.remove();
  }
}

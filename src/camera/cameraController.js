// ============================================================
// cameraController.js — Multi-mode camera system
// ============================================================
// Modes: first-person, third-person, top-down, dynamic combat
// Switchable at runtime via settings.
// ============================================================
import * as THREE from 'three';

export const CAMERA_MODE = {
  FIRST_PERSON: 'firstPerson',
  THIRD_PERSON: 'thirdPerson',
  TOP_DOWN: 'topDown',
  DYNAMIC_COMBAT: 'dynamicCombat',
};

const MODE_LIST = [
  CAMERA_MODE.FIRST_PERSON,
  CAMERA_MODE.THIRD_PERSON,
  CAMERA_MODE.TOP_DOWN,
  CAMERA_MODE.DYNAMIC_COMBAT,
];

/**
 * Camera configuration per mode.
 */
const MODE_CONFIG = {
  [CAMERA_MODE.FIRST_PERSON]: {
    offset: new THREE.Vector3(0, 1.7, 0),
    followDist: 0,
    lookAtOffset: new THREE.Vector3(0, 1.5, 0),
    fov: 75,
    minPitch: -Math.PI / 2 + 0.05,
    maxPitch: Math.PI / 2 - 0.05,
    zoomable: false,
  },
  [CAMERA_MODE.THIRD_PERSON]: {
    offset: new THREE.Vector3(0.6, 2.2, -5.2),
    followDist: 5.2,
    lookAtOffset: new THREE.Vector3(0, 1.45, 0),
    fov: 68,
    minPitch: -0.15,
    maxPitch: 1.15,
    zoomable: true,
    minZoom: 2.8,
    maxZoom: 12,
  },
  [CAMERA_MODE.TOP_DOWN]: {
    offset: new THREE.Vector3(0, 20, -5),
    followDist: 20,
    lookAtOffset: new THREE.Vector3(0, 0, 0),
    fov: 50,
    minPitch: 0.8,
    maxPitch: 1.5,
    zoomable: true,
    minZoom: 10,
    maxZoom: 40,
  },
  [CAMERA_MODE.DYNAMIC_COMBAT]: {
    offset: new THREE.Vector3(1.2, 2.2, -4.2),
    followDist: 4.2,
    lookAtOffset: new THREE.Vector3(0, 1.4, 0),
    fov: 70,
    minPitch: -0.5,
    maxPitch: 1.0,
    zoomable: false,
  },
};

export class CameraController {
  /**
   * @param {THREE.PerspectiveCamera} camera
   * @param {string} [initialMode='firstPerson']
   */
  constructor(camera, initialMode = CAMERA_MODE.FIRST_PERSON) {
    this.camera = camera;
    this._mode = initialMode;
    this._config = MODE_CONFIG[initialMode];

    // Smooth interpolation state
    this._currentPos = new THREE.Vector3();
    this._targetPos = new THREE.Vector3();
    this._currentLookAt = new THREE.Vector3();
    this._targetLookAt = new THREE.Vector3();
    this._initialized = false;

    // Orbit angles (for third-person / top-down)
    this._yaw = 0;
    this._pitch = 0.5;
    this._zoom = this._config.followDist || 4;

    // Smooth factors
    this._posSmooth = 8;
    this._lookSmooth = 12;

    // Transition
    this._transitioning = false;
    this._transitionTime = 0;
    this._transitionDuration = 0.5;
    this._fromPos = new THREE.Vector3();
    this._fromLookAt = new THREE.Vector3();

    // Collision avoidance
    this._raycaster = new THREE.Raycaster();
    this._collisionLayers = [];

    // Terrain / world height provider used to avoid underground camera angles
    this._getHeightAt = null;
  }

  get mode() { return this._mode; }
  get config() { return this._config; }

  /**
   * Set collision meshes for camera collision detection.
   */
  setCollisionMeshes(meshes) {
    this._collisionLayers = meshes;
  }

  /**
   * Set terrain/world height provider for camera grounding.
   * @param {(x:number, z:number) => number} fn
   */
  setHeightProvider(fn) {
    this._getHeightAt = fn;
  }

  /**
   * Switch camera mode with smooth transition.
   */
  setMode(mode) {
    if (mode === this._mode) return;
    if (!MODE_CONFIG[mode]) return;

    // Snapshot current position for transition
    this._fromPos.copy(this._currentPos);
    this._fromLookAt.copy(this._currentLookAt);
    this._transitioning = true;
    this._transitionTime = 0;

    this._mode = mode;
    this._config = MODE_CONFIG[mode];
    this._zoom = this._config.followDist || this._config.minZoom || 4;

    // Update FOV
    this.camera.fov = this._config.fov;
    this.camera.updateProjectionMatrix();
  }

  /**
   * Cycle to next camera mode.
   */
  cycleMode() {
    const idx = MODE_LIST.indexOf(this._mode);
    const next = MODE_LIST[(idx + 1) % MODE_LIST.length];
    this.setMode(next);
    return next;
  }

  /**
   * Handle mouse input for orbit rotation.
   */
  handleMouseMove(dx, dy, sensitivity = 0.002) {
    if (this._mode === CAMERA_MODE.FIRST_PERSON) return; // FP uses its own mouse look

    this._yaw -= dx * sensitivity;
    this._pitch = Math.max(
      this._config.minPitch,
      Math.min(this._config.maxPitch, this._pitch - dy * sensitivity)
    );
  }

  /**
   * Handle scroll for zoom.
   */
  handleScroll(delta) {
    if (!this._config.zoomable) return;
    this._zoom = Math.max(
      this._config.minZoom,
      Math.min(this._config.maxZoom, this._zoom - delta * 0.5)
    );
  }

  /**
   * Update camera position — call each frame.
   * @param {number} dt - Delta time
   * @param {THREE.Vector3} playerPos - Player world position
   * @param {THREE.Vector3} [playerForward] - Player forward direction (for first-person)
   * @param {object} [combatTarget] - { position: Vector3 } for dynamic combat mode
   */
  update(dt, playerPos, playerForward, combatTarget) {
    if (!playerPos) return;

    const cfg = this._config;

    if (this._mode === CAMERA_MODE.FIRST_PERSON) {
      // First person: camera sits on player head
      this._targetPos.copy(playerPos).add(cfg.offset);
      this._targetLookAt.copy(this._targetPos);
      if (playerForward) {
        this._targetLookAt.add(playerForward);
      }
    } else if (this._mode === CAMERA_MODE.DYNAMIC_COMBAT && combatTarget) {
      // Dynamic combat: camera between player and target
      const midPoint = new THREE.Vector3().lerpVectors(playerPos, combatTarget.position, 0.3);
      midPoint.y = playerPos.y + cfg.offset.y;

      // Position camera behind and to the side
      const dirToTarget = new THREE.Vector3().subVectors(combatTarget.position, playerPos).normalize();
      const sideDir = new THREE.Vector3().crossVectors(dirToTarget, new THREE.Vector3(0, 1, 0)).normalize();

      this._targetPos.copy(playerPos)
        .add(new THREE.Vector3(0, cfg.offset.y, 0))
        .add(dirToTarget.clone().multiplyScalar(-cfg.followDist))
        .add(sideDir.multiplyScalar(cfg.offset.x));

      this._targetLookAt.copy(midPoint).add(cfg.lookAtOffset);
    } else {
      // Third person / Top down: orbit camera
      const dist = this._zoom || cfg.followDist;

      const x = Math.sin(this._yaw) * Math.cos(this._pitch) * dist;
      const y = Math.sin(this._pitch) * dist;
      const z = Math.cos(this._yaw) * Math.cos(this._pitch) * dist;

      // Shoulder bias in camera-right direction for less body occlusion
      const shoulder = cfg.offset?.x || 0;
      const rightX = Math.cos(this._yaw);
      const rightZ = -Math.sin(this._yaw);

      this._targetPos.set(
        playerPos.x + x + rightX * shoulder,
        playerPos.y + y,
        playerPos.z + z + rightZ * shoulder,
      );
      this._targetLookAt.copy(playerPos).add(cfg.lookAtOffset);
    }

    // Keep non-first-person camera above world surface when possible
    if (this._mode !== CAMERA_MODE.FIRST_PERSON && this._getHeightAt) {
      const groundY = this._getHeightAt(this._targetPos.x, this._targetPos.z);
      const minCamY = groundY + 0.45;
      if (Number.isFinite(minCamY)) {
        this._targetPos.y = Math.max(this._targetPos.y, minCamY);
      }
    }

    // ── Collision avoidance ────────────────────────────────
    if (this._mode !== CAMERA_MODE.FIRST_PERSON && this._collisionLayers.length > 0) {
      const dir = new THREE.Vector3().subVectors(this._targetPos, this._targetLookAt).normalize();
      const maxDist = this._targetPos.distanceTo(this._targetLookAt);
      this._raycaster.set(this._targetLookAt, dir);
      this._raycaster.far = maxDist;

      const hits = this._raycaster.intersectObjects(this._collisionLayers, true);
      if (hits.length > 0 && hits[0].distance < maxDist) {
        // Pull camera closer
        this._targetPos.copy(this._targetLookAt).add(dir.multiplyScalar(Math.max(1.2, hits[0].distance * 0.88)));
      }
    }

    // ── Smooth interpolation ──────────────────────────────
    if (!this._initialized) {
      this._currentPos.copy(this._targetPos);
      this._currentLookAt.copy(this._targetLookAt);
      this._initialized = true;
    } else if (this._transitioning) {
      this._transitionTime += dt;
      const t = Math.min(1, this._transitionTime / this._transitionDuration);
      const ease = t * t * (3 - 2 * t); // smoothstep

      this._currentPos.lerpVectors(this._fromPos, this._targetPos, ease);
      this._currentLookAt.lerpVectors(this._fromLookAt, this._targetLookAt, ease);

      if (t >= 1) this._transitioning = false;
    } else {
      const posFactor = 1 - Math.exp(-this._posSmooth * dt);
      const lookFactor = 1 - Math.exp(-this._lookSmooth * dt);

      this._currentPos.lerp(this._targetPos, posFactor);
      this._currentLookAt.lerp(this._targetLookAt, lookFactor);
    }

    // Apply to camera (skip in first-person — FP controller manages camera directly)
    if (this._mode !== CAMERA_MODE.FIRST_PERSON) {
      this.camera.position.copy(this._currentPos);
      this.camera.lookAt(this._currentLookAt);
    }
  }

  /**
   * Get current mode display name.
   */
  getModeName() {
    const names = {
      [CAMERA_MODE.FIRST_PERSON]: 'First Person',
      [CAMERA_MODE.THIRD_PERSON]: 'Third Person',
      [CAMERA_MODE.TOP_DOWN]: 'Top Down',
      [CAMERA_MODE.DYNAMIC_COMBAT]: 'Dynamic Combat',
    };
    return names[this._mode] || this._mode;
  }

  /**
   * Serialization.
   */
  serialize() {
    return { mode: this._mode, yaw: this._yaw, pitch: this._pitch, zoom: this._zoom };
  }

  deserialize(data) {
    if (!data) return;
    if (data.mode) this.setMode(data.mode);
    this._yaw = data.yaw || 0;
    this._pitch = data.pitch || 0.5;
    this._zoom = data.zoom || 4;
  }
}

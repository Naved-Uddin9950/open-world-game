// ============================================================
// firstPersonController.js — FPS camera + WASD + pointer lock
// ============================================================
import * as THREE from 'three';
import { MOUSE_SENSITIVITY, PLAYER_HEIGHT } from '../utils/constants.js';
import { clamp } from '../utils/math.js';
import { Movement } from './movement.js';
import { Collision } from './collision.js';

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
        this._euler = new THREE.Euler(0, 0, 0, 'YXZ');
        this._isLocked = false;

        // ── Bind methods ────────────────────────────────────
        this._onMouseMove = this._onMouseMove.bind(this);
        this._onKeyDown = this._onKeyDown.bind(this);
        this._onKeyUp = this._onKeyUp.bind(this);
        this._onPointerLockChange = this._onPointerLockChange.bind(this);

        this._initListeners();
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
        document.addEventListener('mousemove', this._onMouseMove);
        document.addEventListener('keydown', this._onKeyDown);
        document.addEventListener('keyup', this._onKeyUp);
        document.addEventListener('pointerlockchange', this._onPointerLockChange);

        // Click to lock
        this.domElement.addEventListener('click', () => {
            if (!this._isLocked) this.domElement.requestPointerLock();
        });
    }

    _onPointerLockChange() {
        this._isLocked = document.pointerLockElement === this.domElement;
    }

    /** Mouse look. */
    _onMouseMove(e) {
        if (!this._isLocked) return;

        this._euler.setFromQuaternion(this.camera.quaternion);

        this._euler.y -= e.movementX * MOUSE_SENSITIVITY;
        this._euler.x -= e.movementY * MOUSE_SENSITIVITY;

        // Clamp pitch to prevent flipping
        this._euler.x = clamp(this._euler.x, -Math.PI / 2 + 0.01, Math.PI / 2 - 0.01);

        this.camera.quaternion.setFromEuler(this._euler);
    }

    /** Key down handler. */
    _onKeyDown(e) {
        switch (e.code) {
            case 'KeyW': case 'ArrowUp': this.movement.forward = true; break;
            case 'KeyS': case 'ArrowDown': this.movement.backward = true; break;
            case 'KeyA': case 'ArrowLeft': this.movement.left = true; break;
            case 'KeyD': case 'ArrowRight': this.movement.right = true; break;
            case 'ShiftLeft': this.movement.isSprinting = true; break;
            case 'Space': this.movement.jump = true; break;
        }
    }

    /** Key up handler. */
    _onKeyUp(e) {
        switch (e.code) {
            case 'KeyW': case 'ArrowUp': this.movement.forward = false; break;
            case 'KeyS': case 'ArrowDown': this.movement.backward = false; break;
            case 'KeyA': case 'ArrowLeft': this.movement.left = false; break;
            case 'KeyD': case 'ArrowRight': this.movement.right = false; break;
            case 'ShiftLeft': this.movement.isSprinting = false; break;
            case 'Space':
                this.movement.jump = false;
                this.movement.canJump = true;
                break;
        }
    }

    /**
     * Called every fixed-step update.
     * @param {number} dt  Delta time in seconds
     */
    update(dt) {
        if (!this._isLocked) return;

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
            new THREE.Vector3(attemptX + radius, feetY + PLAYER_HEIGHT, currentZ + radius),
        );
        const hitX = this.collision.checkObstacles(boxX);

        // Attempt Z movement
        const attemptZ = currentZ + displacement.z;
        const boxZ = new THREE.Box3(
            new THREE.Vector3(currentX - radius, feetY, attemptZ - radius),
            new THREE.Vector3(currentX + radius, feetY + PLAYER_HEIGHT, attemptZ + radius),
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
        // Allow stepping down small drops immediately, but for larger drops
        // let the player fall (gravity) so movement feels natural.
        const MAX_STEP_DOWN = 1.0; // meters — max drop height that will be snapped
        if (this._getHeightAt) {
            const groundY = this._getHeightAt(
                this.player.position.x,
                this.player.position.z,
            );
            const targetY = groundY + PLAYER_HEIGHT;
            const drop = this.player.position.y - targetY;

            if (drop <= 0) {
                // Player is at or below the target — snap up and land
                this.player.position.y = targetY;
                this.movement.land(groundY);
            } else if (drop <= MAX_STEP_DOWN) {
                // Small step down: snap to ground and land
                this.player.position.y = targetY;
                this.movement.land(groundY);
            } else {
                // Large drop: allow falling
                this.movement.isGrounded = false;
            }
        } else {
            const { grounded, groundY } = this.collision.checkGround(this.player.position);
            if (grounded) {
                const targetY = groundY + PLAYER_HEIGHT;
                const drop = this.player.position.y - targetY;

                if (drop <= MAX_STEP_DOWN) {
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
    }

    /** Get the player's world position. */
    getPosition() {
        return this.player.position;
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
        document.removeEventListener('mousemove', this._onMouseMove);
        document.removeEventListener('keydown', this._onKeyDown);
        document.removeEventListener('keyup', this._onKeyUp);
        document.removeEventListener('pointerlockchange', this._onPointerLockChange);
    }
}

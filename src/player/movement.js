// ============================================================
// movement.js — Velocity / acceleration / gravity for player
// ============================================================
import * as THREE from 'three';
import {
    PLAYER_SPEED,
    PLAYER_SPRINT_MULT,
    GRAVITY,
    JUMP_FORCE,
} from '../utils/constants.js';

export class Movement {
    constructor() {
        this.velocity = new THREE.Vector3();
        this.direction = new THREE.Vector3();
        this.speed = PLAYER_SPEED;
        this.sprintMultiplier = PLAYER_SPRINT_MULT;
        this.isSprinting = false;
        this.isGrounded = true;
        this.canJump = true;

        // Input state driven by controller
        this.forward = false;
        this.backward = false;
        this.left = false;
        this.right = false;
        this.jump = false;
    }

    /**
     * Compute velocity for this tick.
     * Uses the camera's world forward/right vectors so movement follows camera orientation
     * projected onto the horizontal plane.
     * @param {number} dt  Fixed timestep in seconds
     * @param {THREE.Camera} camera  Camera to derive forward/right vectors from
     * @returns {THREE.Vector3}  World-space displacement
     */
    update(dt, camera) {
        // ── Horizontal movement ─────────────────────────────
        const moveSpeed = this.speed * (this.isSprinting ? this.sprintMultiplier : 1);

        // Build camera-based basis (forward, right) projected to XZ plane
        const forward = new THREE.Vector3();
        camera.getWorldDirection(forward); // points where camera looks (may have Y)
        forward.y = 0;
        forward.normalize();

        const right = new THREE.Vector3();
        right.crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

        // Compose movement in world-space using input flags
        const move = new THREE.Vector3();
        if (this.forward) move.addScaledVector(forward, 1);
        if (this.backward) move.addScaledVector(forward, -1);
        if (this.right) move.addScaledVector(right, 1);
        if (this.left) move.addScaledVector(right, -1);

        if (move.lengthSq() > 0) move.normalize();

        this.velocity.x = move.x * moveSpeed;
        this.velocity.z = move.z * moveSpeed;

        // (debug logs removed)

        // ── Vertical / gravity ──────────────────────────────
        if (this.jump && this.isGrounded && this.canJump) {
            this.velocity.y = JUMP_FORCE;
            this.isGrounded = false;
            this.canJump = false;
        }

        if (!this.isGrounded) {
            this.velocity.y -= GRAVITY * dt;
        }

        // ── Return displacement ─────────────────────────────
        return new THREE.Vector3(
            this.velocity.x * dt,
            this.velocity.y * dt,
            this.velocity.z * dt,
        );
    }

    /** Called by collision system when grounded. */
    land(groundY) {
        this.velocity.y = 0;
        this.isGrounded = true;
        this.canJump = true;
    }
}

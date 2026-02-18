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
     * @param {number} dt  Fixed timestep in seconds
     * @param {THREE.Euler} cameraRotation  Current camera euler
     * @returns {THREE.Vector3}  World-space displacement
     */
    update(dt, cameraRotation) {
        // ── Horizontal movement ─────────────────────────────
        this.direction.set(0, 0, 0);
        const moveSpeed = this.speed * (this.isSprinting ? this.sprintMultiplier : 1);

        if (this.forward) this.direction.z -= 1;
        if (this.backward) this.direction.z += 1;
        if (this.left) this.direction.x -= 1;
        if (this.right) this.direction.x += 1;

        this.direction.normalize();

        // Rotate direction by camera yaw only
        const yaw = cameraRotation.y;
        const sin = Math.sin(yaw);
        const cos = Math.cos(yaw);
        const dx = this.direction.x * cos - this.direction.z * sin;
        const dz = this.direction.x * sin + this.direction.z * cos;

        this.velocity.x = dx * moveSpeed;
        this.velocity.z = dz * moveSpeed;

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

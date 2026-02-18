// ============================================================
// collision.js — Simple raycaster-based collision detection
// ============================================================
import * as THREE from 'three';
import { PLAYER_HEIGHT } from '../utils/constants.js';

export class Collision {
    constructor() {
        this._raycaster = new THREE.Raycaster();
        this._downDir = new THREE.Vector3(0, -1, 0);
        this._origin = new THREE.Vector3();

        // Collide-able objects — register world meshes here
        this.colliders = [];
    }

    /**
     * Register objects that the player can collide with.
     * @param  {...THREE.Object3D} objects
     */
    addColliders(...objects) {
        this.colliders.push(...objects);
    }

    /**
     * Remove collider objects.
     * @param  {...THREE.Object3D} objects
     */
    removeColliders(...objects) {
        this.colliders = this.colliders.filter(o => !objects.includes(o));
    }

    /**
     * Check for ground beneath the player and return the ground Y.
     * @param {THREE.Vector3} position  Current player world position
     * @returns {{ grounded: boolean, groundY: number }}
     */
    checkGround(position) {
        this._origin.copy(position);
        this._origin.y += 1; // ray starts slightly above feet

        this._raycaster.set(this._origin, this._downDir);
        this._raycaster.far = PLAYER_HEIGHT + 2;

        const hits = this._raycaster.intersectObjects(this.colliders, true);

        if (hits.length > 0) {
            const groundY = hits[0].point.y;
            return { grounded: true, groundY };
        }

        return { grounded: false, groundY: -Infinity };
    }

    /**
     * Simple AABB overlap test stub for future obstacle collision.
     * @param {THREE.Box3} playerBox
     * @returns {THREE.Object3D|null}  The collider hit, or null if none
     */
    checkObstacles(playerBox) {
        // Brute-force AABB intersection against registered colliders.
        // Use setFromObject so colliders' world matrices are considered.
        for (let i = 0; i < this.colliders.length; i++) {
            const c = this.colliders[i];
            if (!c) continue;

            // Compute collider box in world space
            const box = new THREE.Box3();
            box.setFromObject(c);
            if (box.isEmpty()) continue;

            if (box.intersectsBox(playerBox)) {
                return c;
            }
        }

        return null;
    }
}

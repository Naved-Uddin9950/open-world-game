// ============================================================
// camera.js — Perspective camera with resize handling
// ============================================================
import * as THREE from 'three';
import { FOV, NEAR_CLIP, FAR_CLIP } from '../utils/constants.js';

export class GameCamera {
    /**
     * @param {number} fov      Vertical FOV in degrees
     * @param {number} near     Near clipping plane
     * @param {number} far      Far clipping plane
     */
    constructor(fov = FOV, near = NEAR_CLIP, far = FAR_CLIP) {
        const aspect = window.innerWidth / window.innerHeight;
        this.camera = new THREE.PerspectiveCamera(fov, aspect, near, far);

        window.addEventListener('resize', () => this._onResize());
    }

    /** Handle viewport resize. */
    _onResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
    }

    /** Expose the underlying THREE.PerspectiveCamera. */
    get raw() {
        return this.camera;
    }

    /** Shorthand for camera.position. */
    get position() {
        return this.camera.position;
    }

    /** Quick look-at helper. */
    lookAt(x, y, z) {
        if (x instanceof THREE.Vector3) {
            this.camera.lookAt(x);
        } else {
            this.camera.lookAt(x, y, z);
        }
    }

    /** Stub — camera shake effect (future implementation). */
    shake(intensity = 0.1, duration = 0.3) {
        // TODO: implement screen shake via random rotation offsets
    }
}

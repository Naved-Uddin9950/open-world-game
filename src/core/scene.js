// ============================================================
// scene.js — Game scene wrapper with fog and helpers
// ============================================================
import * as THREE from 'three';
import { FOG_NEAR, FOG_FAR, FOG_COLOR } from '../utils/constants.js';

export class GameScene {
    constructor() {
        this.scene = new THREE.Scene();

        // ── Fog for draw-distance culling ────────────────────
        this.scene.fog = new THREE.Fog(FOG_COLOR, FOG_NEAR, FOG_FAR);
        this.scene.background = new THREE.Color(FOG_COLOR);
    }

    /**
     * Add one or more objects to the scene.
     * @param  {...THREE.Object3D} objects
     */
    add(...objects) {
        objects.forEach(obj => this.scene.add(obj));
    }

    /**
     * Remove one or more objects from the scene.
     * @param  {...THREE.Object3D} objects
     */
    remove(...objects) {
        objects.forEach(obj => this.scene.remove(obj));
    }

    /**
     * Find an object by name.
     * @param {string} name
     * @returns {THREE.Object3D|undefined}
     */
    getByName(name) {
        return this.scene.getObjectByName(name);
    }

    /** Expose the THREE.Scene for direct access when needed. */
    get raw() {
        return this.scene;
    }

    /** Set the background colour (used by sky system). */
    setBackground(color) {
        this.scene.background = color instanceof THREE.Color
            ? color
            : new THREE.Color(color);
    }

    /** Update fog parameters. */
    setFog(near, far, color) {
        if (color !== undefined) this.scene.fog.color.set(color);
        if (near !== undefined) this.scene.fog.near = near;
        if (far !== undefined) this.scene.fog.far = far;
    }
}

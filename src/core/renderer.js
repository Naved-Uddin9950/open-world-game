// ============================================================
// renderer.js — Optimised WebGL renderer for low-end GPUs
// ============================================================
import * as THREE from 'three';
import {
    MAX_PIXEL_RATIO,
    SHADOW_MAP_SIZE,
    QUALITY_TIERS,
} from '../utils/constants.js';

export class EngineRenderer {
    /**
     * @param {HTMLCanvasElement} canvas
     * @param {string} qualityTier  'LOW' | 'MEDIUM' | 'HIGH'
     */
    constructor(canvas, qualityTier = 'MEDIUM') {
        this.canvas = canvas;
        this.tier = QUALITY_TIERS[qualityTier] || QUALITY_TIERS.MEDIUM;

        this.renderer = new THREE.WebGLRenderer({
            canvas,
            antialias: this.tier.pixelRatio >= 1.5,
            powerPreference: 'low-power',
            stencil: false,
            depth: true,
        });

        // ── Pixel ratio ─────────────────────────────────────
        const dpr = Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO);
        this.renderer.setPixelRatio(Math.min(dpr, this.tier.pixelRatio));

        // ── Shadows ─────────────────────────────────────────
        this.renderer.shadowMap.enabled = this.tier.shadowMap;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        // ── Tone mapping ────────────────────────────────────
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.0;

        // ── Color ───────────────────────────────────────────
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;

        // ── Initial size ────────────────────────────────────
        this._resize();
        window.addEventListener('resize', () => this._resize());
    }

    /** Resize to fill viewport. */
    _resize() {
        const w = window.innerWidth;
        const h = window.innerHeight;
        this.renderer.setSize(w, h);
    }

    /**
     * Render one frame.
     * @param {THREE.Scene}  scene
     * @param {THREE.Camera} camera
     */
    render(scene, camera) {
        this.renderer.render(scene, camera);
    }

    /** Expose the underlying WebGLRenderer for advanced access. */
    get domElement() {
        return this.renderer.domElement;
    }

    /** Read-only render info (draw calls, triangles, etc.). */
    get info() {
        return this.renderer.info;
    }

    /** Apply a new quality tier at runtime. */
    setQuality(tierName) {
        const tier = QUALITY_TIERS[tierName];
        if (!tier) return;
        this.tier = tier;
        this.renderer.shadowMap.enabled = tier.shadowMap;
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, tier.pixelRatio));
    }

    dispose() {
        this.renderer.dispose();
    }
}

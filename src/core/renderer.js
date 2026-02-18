// ============================================================
// renderer.js — Optimized renderer with dynamic resolution
// ============================================================
import * as THREE from 'three';
import { QUALITY_TIERS } from '../utils/constants.js';

export class EngineRenderer {
    constructor(canvas, qualityTier = 'LOW') {
        this.canvas = canvas;
        this.tier = QUALITY_TIERS[qualityTier] || QUALITY_TIERS.LOW;
        this.resolutionScale = this.tier.renderScale;

        this.renderer = new THREE.WebGLRenderer({
            canvas,
            antialias: false,
            powerPreference: 'high-performance',
            stencil: false,
            depth: true
        });

        this.renderer.setPixelRatio(1);
        this.renderer.shadowMap.enabled = this.tier.shadowMap;
        this.renderer.shadowMap.type = THREE.BasicShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.0;
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;

        this._resize();
        window.addEventListener('resize', () => this._resize());
    }

    _resize() {
        const w = Math.floor(window.innerWidth * this.resolutionScale);
        const h = Math.floor(window.innerHeight * this.resolutionScale);
        this.renderer.setSize(w, h, false);
        this.canvas.style.width = '100%';
        this.canvas.style.height = '100%';
    }

    render(scene, camera) {
        this.renderer.render(scene, camera);
    }

    get domElement() {
        return this.renderer.domElement;
    }

    get info() {
        return this.renderer.info;
    }

    setQuality(tierName) {
        const tier = QUALITY_TIERS[tierName];
        if (!tier) return;
        this.tier = tier;
        this.renderer.shadowMap.enabled = tier.shadowMap;
    }

    setResolutionScale(scale) {
        this.resolutionScale = scale;
        this._resize();
    }

    dispose() {
        this.renderer.dispose();
    }
}

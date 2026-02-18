// ============================================================
// main.js — Engine bootstrap & game entry point
// ============================================================
import * as THREE from 'three';

// ── Core ────────────────────────────────────────────────────
import { EngineRenderer } from './core/renderer.js';
import { GameScene } from './core/scene.js';
import { GameCamera } from './core/camera.js';
import { GameLoop } from './core/gameLoop.js';
import { AssetLoader } from './core/assetLoader.js';

// ── Player ──────────────────────────────────────────────────
import { FirstPersonController } from './player/firstPersonController.js';

// ── World ───────────────────────────────────────────────────
import { WorldManager } from './world/worldManager.js';

// ── Systems ─────────────────────────────────────────────────
import { TimeSystem } from './systems/timeSystem.js';
import { LightingSystem } from './systems/lightingSystem.js';
import { SkySystem } from './systems/skySystem.js';
import { LODSystem } from './systems/lodSystem.js';
import { PerformanceMonitor } from './systems/performanceMonitor.js';

// ═══════════════════════════════════════════════════════════
// Engine initialisation
// ═══════════════════════════════════════════════════════════

class Engine {
    constructor() {
        console.log('[Engine] Initialising…');

        // ── Canvas ──────────────────────────────────────────
        this.canvas = document.getElementById('game-canvas');

        // ── Core modules ────────────────────────────────────
        this.renderer = new EngineRenderer(this.canvas, 'MEDIUM');
        this.gameScene = new GameScene();
        this.gameCamera = new GameCamera();
        this.assetLoader = new AssetLoader();

        // ── Player ──────────────────────────────────────────
        this.player = new FirstPersonController(
            this.gameCamera.raw,
            this.canvas,
        );
        this.gameScene.add(this.player.player);

        // ── World ───────────────────────────────────────────
        this.worldManager = new WorldManager(this.gameScene.raw);

        // ── Systems ─────────────────────────────────────────
        this.timeSystem = new TimeSystem();
        this.lightingSystem = new LightingSystem(this.gameScene.raw);
        this.skySystem = new SkySystem(this.gameScene.raw);
        this.lodSystem = new LODSystem();
        this.perfMonitor = new PerformanceMonitor();

        // Show FPS overlay
        this.perfMonitor.showHUD(true);

        // ── Initial world load ──────────────────────────────
        this.worldManager.update(this.player.getPosition());

        // Register ground chunks as colliders
        this._syncColliders();

        // ── Game loop ───────────────────────────────────────
        this.loop = new GameLoop({
            onUpdate: (dt) => this._update(dt),
            onRender: () => this._render(),
        });

        console.log('[Engine] Ready — click to play');
        this.loop.start();
    }

    /** Fixed-step update. */
    _update(dt) {
        // Time
        this.timeSystem.update(dt);

        // Player
        this.player.update(dt);

        // World chunks
        this.worldManager.update(this.player.getPosition());

        // Re-sync colliders when chunks change
        this._syncColliders();

        // Lighting follows time + player
        this.lightingSystem.update(this.timeSystem, this.player.getPosition());

        // Sky follows time + camera
        this.skySystem.update(this.timeSystem);
        this.skySystem.followCamera(this.player.getPosition());

        // LOD
        this.lodSystem.update(this.gameCamera.raw);
    }

    /** Render frame. */
    _render() {
        this.renderer.render(this.gameScene.raw, this.gameCamera.raw);
        this.perfMonitor.update(this.renderer.info);
    }

    /** Keep collision system in sync with active chunk meshes. */
    _syncColliders() {
        const meshes = this.worldManager.getActiveChunkMeshes();
        this.player.collision.colliders = meshes;
    }
}

// ── Boot ────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
    window.__engine = new Engine();
});

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
import { DayNightCycle } from './systems/dayNightCycle.js';
import { LODSystem } from './systems/lodSystem.js';
import { PerformanceMonitor } from './systems/performanceMonitor.js';
import { AutoQualitySystem } from './systems/autoQualitySystem.js';

// ═══════════════════════════════════════════════════════════
// Engine initialisation
// ═══════════════════════════════════════════════════════════

class Engine {
    constructor() {
        console.log('[Engine] Initialising…');

        // ── Canvas ──────────────────────────────────────────
        this.canvas = document.getElementById('game-canvas');

        // ── Core modules ────────────────────────────────────
        this.renderer = new EngineRenderer(this.canvas, 'LOW');
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
        this.dayNightCycle = new DayNightCycle(this.gameScene.raw);
        this.lodSystem = new LODSystem();
        this.perfMonitor = new PerformanceMonitor({ targetFPS: 30 });
        this.autoQuality = new AutoQualitySystem(this.renderer, this.perfMonitor);

        // Show FPS overlay
        this.perfMonitor.showHUD(true);

        // ── Terrain height provider ─────────────────────────
        this.player.setHeightProvider((x, z) => this.worldManager.getHeightAt(x, z));

        // ── Initial world load ──────────────────────────────
        this.worldManager.update(this.player.getPosition());

        // Spawn player at terrain height
        const spawnY = this.worldManager.getHeightAt(0, 0);
        this.player.player.position.y = spawnY + 1.7; // PLAYER_HEIGHT

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
        // Auto quality adjustment
        this.autoQuality.update(dt);
        const quality = this.autoQuality.getSettings();
        this.worldManager.setRenderDistance(quality.renderDist);

        // Player
        this.player.update(dt);

        // World chunks
        this.worldManager.update(this.player.getPosition());

        // Day/Night cycle (time, sun, moon, sky, fog)
        this.dayNightCycle.update(this.player.getPosition());

        // LOD — update engine LOD objects + terrain LOD chunks
        this.lodSystem.update(this.gameCamera.raw);
        for (const lod of this.worldManager.getActiveChunkMeshes()) {
            lod.update(this.gameCamera.raw);
        }
    }

    /** Render frame. */
    _render() {
        this.renderer.render(this.gameScene.raw, this.gameCamera.raw);
        this.perfMonitor.update(this.renderer.info);
    }
}

// ── Boot ────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
    window.__engine = new Engine();
});

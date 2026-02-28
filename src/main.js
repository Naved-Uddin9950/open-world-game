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
import { AnimalAIController } from './ai/animalAIController.js';
import { SaveSystem } from './systems/saveSystem.js';

// ── UI ──────────────────────────────────────────────────────
import { MainMenu } from './ui/mainMenu.js';
import { PauseMenu } from './ui/pauseMenu.js';
import { GameOverScreen } from './ui/gameOverScreen.js';

// ═══════════════════════════════════════════════════════════
// Engine initialisation
// ═══════════════════════════════════════════════════════════

class Engine {
    constructor() {
        // ── Canvas ──────────────────────────────────────────
        this.canvas = document.getElementById('game-canvas');
        this._paused = false;
        this._gameStarted = false;
        this._gameOver = false;

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
        this.worldManager = new WorldManager(this.gameScene.raw, this.player, this.assetLoader);

        // ── Systems ─────────────────────────────────────────
        this.dayNightCycle = new DayNightCycle(this.gameScene.raw);
        this.lodSystem = new LODSystem();
        this.perfMonitor = new PerformanceMonitor({ targetFPS: 30 });
        this.autoQuality = new AutoQualitySystem(this.renderer, this.perfMonitor);
        this.saveSystem = new SaveSystem();

        // Show FPS overlay
        this.perfMonitor.showHUD(true);

        // ── Terrain height provider ─────────────────────────
        this.player.setHeightProvider((x, z) => this.worldManager.getHeightAt(x, z));

        // ── Initial world load ──────────────────────────────
        this.worldManager.update(this.player.getPosition());

        // Spawn player at terrain height
        const spawnY = this.worldManager.getHeightAt(0, 0);
        this.player.player.position.y = spawnY + 1.7;

        // ── Game loop ───────────────────────────────────────
        this.loop = new GameLoop({
            onUpdate: (dt) => this._update(dt),
            onRender: () => this._render(),
        });

        // ── AI controller ───────────────────────────────────
        this.animalAI = new AnimalAIController(this.gameScene.raw, this.worldManager, {
            dayProvider: () => this.dayNightCycle.isDay(),
            playerRef: this.player,
        });

        // ── Wire player attack to AI controller ─────────────
        this.player.setAttackCallback((playerPos, forward, range, damage) => {
            if (this.animalAI) {
                return this.animalAI.playerAttack(playerPos, forward, range, damage);
            }
            return false;
        });

        // ── Wire player death ───────────────────────────────
        this.player.setDeathCallback(() => {
            this._handlePlayerDeath();
        });

        // ── Wire ESC key ────────────────────────────────────
        this.player.setEscapeCallback(() => {
            this._handleEscape();
        });

        // ── UI ──────────────────────────────────────────────
        this.mainMenu = new MainMenu();
        this.pauseMenu = new PauseMenu();
        this.gameOverScreen = new GameOverScreen();

        this._setupUI();

        // ── Start engine loop (renders even in menu) ────────
        this.loop.start();

        // ── Show main menu on boot ──────────────────────────
        this._showMainMenu();
    }

    async _setupUI() {
        // Main Menu callbacks
        const hasSave = await this.saveSystem.hasSave();
        this.mainMenu.setCallbacks({
            onContinue: () => this._continueGame(),
            onNewGame: () => this._newGame(),
            onSettings: () => {}, // placeholder
        });
        this.mainMenu.setCanContinue(hasSave);

        // Pause Menu callbacks
        this.pauseMenu.setCallbacks({
            onResume: () => this._resumeGame(),
            onSave: () => this._saveGame(),
            onSettings: () => {},
            onQuit: () => this._quitToMenu(),
        });

        // Game Over callbacks
        this.gameOverScreen.setCallbacks({
            onNewGame: () => this._newGame(),
        });
    }

    _showMainMenu() {
        this._paused = true;
        this._gameStarted = false;
        this.mainMenu.show();
        // Hide the default overlay
        const overlay = document.getElementById('overlay');
        if (overlay) overlay.classList.add('hidden');
    }

    async _continueGame() {
        const state = await this.saveSystem.load();
        if (state && !state.gameOver) {
            SaveSystem.applyState(state, this.player, this.dayNightCycle);
            this.worldManager.update(this.player.getPosition());
        }
        this.mainMenu.hide();
        this._paused = false;
        this._gameStarted = true;
        this._gameOver = false;
        this.canvas.requestPointerLock();
    }

    async _newGame() {
        // Delete old save
        await this.saveSystem.deleteSave();
        
        // Reset player
        this.player.health = this.player.maxHealth;
        this.player.stamina = this.player.maxStamina;
        this.player.isDead = false;
        this._gameOver = false;

        // Spawn at origin
        const spawnY = this.worldManager.getHeightAt(0, 0);
        this.player.player.position.set(0, spawnY + 1.7, 0);
        this.worldManager.update(this.player.getPosition());

        this.mainMenu.hide();
        this.gameOverScreen.hide();
        this._paused = false;
        this._gameStarted = true;
        this.canvas.requestPointerLock();
    }

    async _saveGame() {
        const state = SaveSystem.gatherState(this.player, this.dayNightCycle);
        await this.saveSystem.save(state);
    }

    _resumeGame() {
        this.pauseMenu.hide();
        this._paused = false;
        this.canvas.requestPointerLock();
    }

    _quitToMenu() {
        this.pauseMenu.hide();
        this._paused = true;
        this._gameStarted = false;
        this._showMainMenu();
        // Update continue button based on save existence
        this.saveSystem.hasSave().then(has => {
            this.mainMenu.setCanContinue(has && !this._gameOver);
        });
    }

    _handleEscape() {
        if (this._gameOver) return;
        if (this.mainMenu.isVisible()) return;

        if (this.pauseMenu.isVisible()) {
            this._resumeGame();
        } else {
            this._paused = true;
            this.pauseMenu.show();
        }
    }

    async _handlePlayerDeath() {
        this._gameOver = true;
        this._paused = true;

        // Mark save as game over so continue is disabled
        await this.saveSystem.deleteSave();

        setTimeout(() => {
            this.gameOverScreen.show();
        }, 500);
    }

    /** Fixed-step update. */
    _update(dt) {
        // Auto quality adjustment (always runs)
        this.autoQuality.update(dt);
        const quality = this.autoQuality.getSettings();
        this.worldManager.setRenderDistance(quality.renderDist);

        // Don't update game logic when paused or in menu
        if (this._paused || !this._gameStarted) return;

        // Player
        this.player.update(dt);

        // World chunks
        this.worldManager.update(this.player.getPosition());

        // Animals AI update
        if (this.animalAI) this.animalAI.update(dt);

        // Day/Night cycle
        this.dayNightCycle.update(this.player.getPosition());

        // LOD
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

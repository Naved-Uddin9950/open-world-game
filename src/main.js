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
import { PlayerProfile } from './systems/playerProfile.js';
import { SkillSystem, SKILLS } from './systems/skillSystem.js';
import { EffectSystem } from './systems/effectSystem.js';
import { ShopSystem } from './systems/shopSystem.js';

// ── UI ──────────────────────────────────────────────────────
import { MainMenu } from './ui/mainMenu.js';
import { PauseMenu } from './ui/pauseMenu.js';
import { GameOverScreen } from './ui/gameOverScreen.js';
import { SettingsPanel } from './ui/settingsPanel.js';
import { NewGameScreen } from './ui/newGameScreen.js';
import { ProfilePanel } from './ui/profilePanel.js';
import { SkillTreeUI } from './ui/skillTreeUI.js';
import { ShopUI } from './ui/shopUI.js';
import { GameHUD } from './ui/gameHUD.js';

// ── EXP rewards per animal type ─────────────────────────────
const EXP_TABLE = { chicken: 10, cow: 25, deer: 30, wolf: 50 };
const SKILL_DROP_CHANCE = { chicken: 0.1, cow: 0.25, deer: 0.3, wolf: 0.5 };

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

        // ── RPG Systems ─────────────────────────────────────
        this.profile = new PlayerProfile();
        this.skillSystem = new SkillSystem();
        this.effectSystem = new EffectSystem();
        this.shopSystem = new ShopSystem(this.profile);

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

        // ── Wire animal kill → EXP / skill drops ────────────
        this.animalAI.setKillCallback((type, mesh) => {
            this._onAnimalKill(type, mesh);
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
        this._lastEscapeTime = 0;

        // ── Wire skill input ────────────────────────────────
        this.player.setSkillUseCallback((key) => {
            this._useSkillByKey(key);
        });
        this.player.setOpenProfileCallback(() => this._toggleOverlay(this.profilePanel));
        this.player.setOpenSkillTreeCallback(() => this._toggleOverlay(this.skillTreeUI));
        this.player.setOpenShopCallback(() => this._toggleOverlay(this.shopUI));

        // ── UI ──────────────────────────────────────────────
        this.mainMenu = new MainMenu();
        this.pauseMenu = new PauseMenu();
        this.gameOverScreen = new GameOverScreen();
        this.settingsPanel = new SettingsPanel();
        this.newGameScreen = new NewGameScreen();
        this.profilePanel = new ProfilePanel();
        this.skillTreeUI = new SkillTreeUI();
        this.shopUI = new ShopUI();
        this.gameHUD = new GameHUD();

        // ── Wire profile to UIs ─────────────────────────────
        this.profilePanel.setProfile(this.profile);
        this.skillTreeUI.setProfile(this.profile);
        this.skillTreeUI.setShopSystem(this.shopSystem);
        this.shopUI.setProfile(this.profile);
        this.shopUI.setShopSystem(this.shopSystem);
        this.gameHUD.setProfile(this.profile);
        this.gameHUD.setSkillSystem(this.skillSystem);

        // ── Settings panel callbacks ────────────────────────
        this.settingsPanel.setCallbacks({
            onChange: (s) => this._applySettings(s),
            onClose: () => {
                if (this._gameStarted) {
                    this.pauseMenu.show();
                } else {
                    this.mainMenu.show();
                }
            },
        });

        // ── New Game screen callbacks ───────────────────────
        this.newGameScreen.setCallbacks({
            onConfirm: (name, dob, starterSkill) => this._startNewGame(name, dob, starterSkill),
            onBack: () => this.mainMenu.show(),
        });

        // ── Profile panel callbacks ─────────────────────────
        this.profilePanel.setCallbacks({
            onClose: () => {
                if (this._gameStarted) this._resumeGame();
                else this.mainMenu.show();
            },
        });
        this.skillTreeUI.setCallbacks({
            onClose: () => {
                if (this._gameStarted) this._resumeGame();
                else this.mainMenu.show();
            },
        });
        this.shopUI.setCallbacks({
            onClose: () => {
                if (this._gameStarted) this._resumeGame();
                else this.mainMenu.show();
            },
        });

        // ── Initial fog ─────────────────────────────────────
        const initSettings = this.settingsPanel.current;
        this.gameScene.raw.fog = new THREE.Fog(0x87ceeb, initSettings.fogNear, initSettings.fogFar);

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
            onNewGame: () => {
                this.mainMenu.hide();
                this.newGameScreen.show();
            },
            onSettings: () => { this.mainMenu.hide(); this.settingsPanel.show(); },
            onProfile: () => {
                if (this.profile.hasProfile()) {
                    this.mainMenu.hide();
                    this.profilePanel.show();
                }
            },
        });
        this.mainMenu.setCanContinue(hasSave);

        // Pause Menu callbacks
        this.pauseMenu.setCallbacks({
            onResume: () => this._resumeGame(),
            onSave: () => this._saveGame(),
            onSettings: () => { this.pauseMenu.hide(); this.settingsPanel.show(); },
            onQuit: () => this._quitToMenu(),
            onProfile: () => { this.pauseMenu.hide(); this.profilePanel.show(); },
            onShop: () => { this.pauseMenu.hide(); this.shopUI.show(); },
        });

        // Game Over callbacks
        this.gameOverScreen.setCallbacks({
            onNewGame: () => {
                this.gameOverScreen.hide();
                this.newGameScreen.show();
            },
        });

        // Create HUD (initially hidden until game starts)
        this.gameHUD.create();
        this.gameHUD.hide();
    }

    _showMainMenu() {
        this._paused = true;
        this._gameStarted = false;
        this.mainMenu.show();
        this.gameHUD.hide();
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
        // Load existing profile
        this.profile.load();
        this._syncProfileToPlayer();

        this.mainMenu.hide();
        this._paused = false;
        this._gameStarted = true;
        this._gameOver = false;
        this.gameHUD.show();
        this._rebuildHUDSkillBar();
        // Hide old HUD from firstPersonController
        this._hideOldHUD();
        this.canvas.requestPointerLock();
    }

    async _startNewGame(name, dob, starterSkill) {
        // Delete old save
        await this.saveSystem.deleteSave();

        // Create fresh profile
        this.profile.create(name, dob, starterSkill);
        this._syncProfileToPlayer();

        // Reset player
        this.player.health = this.player.maxHealth;
        this.player.stamina = this.player.maxStamina;
        this.player.isDead = false;
        this._gameOver = false;

        // Clear effects
        this.effectSystem.clear();
        this.skillSystem.dispose();

        // Spawn at origin
        const spawnY = this.worldManager.getHeightAt(0, 0);
        this.player.player.position.set(0, spawnY + 1.7, 0);
        this.worldManager.update(this.player.getPosition());

        this.newGameScreen.hide();
        this.mainMenu.hide();
        this.gameOverScreen.hide();
        this._paused = false;
        this._gameStarted = true;
        this.gameHUD.show();
        this._rebuildHUDSkillBar();
        this._hideOldHUD();
        this.canvas.requestPointerLock();

        this.gameHUD.showToast(`Welcome, ${name}! Your adventure begins.`, '#aaddaa');
    }

    /** Kept for backward compat — old _newGame now routes through newGameScreen */
    async _newGame() {
        this.mainMenu.hide();
        this.newGameScreen.show();
    }

    /**
     * Sync profile stats → player controller.
     * Profile uses integers (100), controller uses 0-1 floats.
     */
    _syncProfileToPlayer() {
        const d = this.profile.data;
        // Convert profile maxHealth (100+) to controller scale
        // Controller works on 0-1, but we keep ratios
        this.player.maxHealth = d.maxHealth / 100;
        this.player.health = d.health / 100;
        this.player.maxStamina = d.maxStamina / 100;
        this.player.stamina = d.stamina / 100;
        // Strength affects attack damage (base 0.25, scaled by strength)
        this.player.attackDamage = 0.25 * (d.strength / 10);
    }

    /**
     * Sync controller stats back → profile (for saving).
     */
    _syncPlayerToProfile() {
        const d = this.profile.data;
        d.health = Math.round(this.player.health * 100);
        d.stamina = Math.round(this.player.stamina * 100);
    }

    /** EXP rewards when an animal is killed. */
    _onAnimalKill(type, mesh) {
        if (!this._gameStarted || this._gameOver) return;
        const exp = EXP_TABLE[type] || 15;
        const leveledUp = this.profile.addExp(exp);

        this.profile.data.totalKills++;
        this.profile.save();

        this.gameHUD.showToast(`+${exp} EXP`, '#6688ff');

        if (leveledUp) {
            this.gameHUD.showToast(`LEVEL UP! You are now level ${this.profile.data.level}`, '#ffcc00');
            this._syncProfileToPlayer();
        }

        // Random skill point drop
        const dropChance = SKILL_DROP_CHANCE[type] || 0.15;
        if (Math.random() < dropChance) {
            const pts = 1;
            this.profile.addSkillPoints(pts);
            this.gameHUD.showToast(`+${pts} Skill Point dropped!`, '#ff88ff');
        }
    }

    /** Use skill by number key. */
    _useSkillByKey(key) {
        if (!this._gameStarted || this._paused || this._gameOver) return;
        if (this.player.isDead) return;

        // Find skill mapped to this key
        const d = this.profile.data;
        let skillId = null;
        for (const id of d.unlockedSkills) {
            const skill = SKILLS[id];
            if (skill && skill.key === key) {
                skillId = id;
                break;
            }
        }
        if (!skillId) return;

        const currentStamina = this.player.stamina * 100; // convert back to integer scale
        const check = this.skillSystem.canUse(skillId, currentStamina, d);
        if (!check.ok) {
            this.gameHUD.showToast(check.reason, '#ff6666');
            return;
        }

        const level = this.profile.getSkillLevel(skillId);
        const scene = this.gameScene.raw;
        const playerPos = this.player.getPosition().clone();
        const forward = this.player.getForward();
        const animalAI = this.animalAI;
        const effectSys = this.effectSystem;
        const playerCtrl = this.player;

        const success = this.skillSystem.execute(skillId, level, scene, playerPos, forward, {
            drainStamina: (amount) => {
                playerCtrl.stamina = Math.max(0, playerCtrl.stamina - amount / 100);
            },
            healPlayer: (amount) => {
                playerCtrl.health = Math.min(playerCtrl.maxHealth, playerCtrl.health + amount / 100);
                this.gameHUD.showToast(`+${amount} HP`, '#44ff88');
            },
            shieldPlayer: (amount, duration) => {
                effectSys.applyToPlayer('shield', duration, { shieldHP: amount });
                playerCtrl.shieldAbsorb = amount / 100;
                this.gameHUD.showToast(`Shield: ${amount} HP`, '#4488ff');
            },
            boostSpeed: (mult, duration) => {
                effectSys.applyToPlayer('speed', duration, { speedMult: mult });
                playerCtrl.externalSpeedMult = mult;
                this.gameHUD.showToast(`Speed x${mult} for ${duration}s!`, '#ff00ff');
            },
            teleportPlayer: (dest) => {
                playerCtrl.player.position.copy(dest);
            },
            getEnemiesInRadius: (pos, radius) => {
                return animalAI.getEnemiesInRadius(pos, radius);
            },
            damageEnemy: (target, damage, effectType, effectDuration) => {
                animalAI.damageEnemy(target, damage, effectType, effectDuration);
                // Apply status effect
                if (effectType && effectType !== 'none' && effectDuration > 0) {
                    const dotDmg = (effectType === 'burn' || effectType === 'poison') ? damage * 0.2 : 0;
                    const knockDir = forward.clone();
                    effectSys.applyToEnemy(target, effectType, effectDuration, dotDmg, { knockDir });
                }
            },
        });

        if (success) {
            const skill = SKILLS[skillId];
            this.gameHUD.showToast(`${skill.name}!`, skill.color);
        }
    }

    /** Toggle overlay panels (profile, skill tree, shop). */
    _toggleOverlay(panel) {
        if (!this._gameStarted || this._gameOver) return;
        if (panel.isVisible()) {
            panel.hide();
            this._paused = false;
            this.canvas.requestPointerLock();
        } else {
            // Close any other overlays
            this.profilePanel.hide();
            this.skillTreeUI.hide();
            this.shopUI.hide();
            this._paused = true;
            if (document.pointerLockElement) document.exitPointerLock();
            panel.show();
        }
    }

    _rebuildHUDSkillBar() {
        if (!this.profile || !this.gameHUD) return;
        const equipped = this.profile.data.unlockedSkills.filter(id => {
            const s = SKILLS[id];
            return s && !s.passive && s.key;
        });
        this.gameHUD.rebuildSkillBar(equipped);
    }

    /** Hide the old firstPersonController HUD since GameHUD replaces it. */
    _hideOldHUD() {
        const oldHud = document.getElementById('player-hud');
        if (oldHud) oldHud.style.display = 'none';
    }

    async _saveGame() {
        this._syncPlayerToProfile();
        this.profile.save();
        const state = SaveSystem.gatherState(this.player, this.dayNightCycle);
        await this.saveSystem.save(state);
        this.gameHUD.showToast('Game saved.', '#aaddaa');
    }

    _resumeGame() {
        this.pauseMenu.hide();
        this.profilePanel.hide();
        this.skillTreeUI.hide();
        this.shopUI.hide();
        this._paused = false;
        this.canvas.requestPointerLock();
    }

    _quitToMenu() {
        this.pauseMenu.hide();
        this._paused = true;
        this._gameStarted = false;
        this.gameHUD.hide();
        this._showMainMenu();
        this.saveSystem.hasSave().then(has => {
            this.mainMenu.setCanContinue(has && !this._gameOver);
        });
    }

    _handleEscape() {
        if (this._gameOver) return;
        if (this.mainMenu.isVisible()) return;
        if (this.newGameScreen.isVisible()) return;

        const now = Date.now();
        if (now - this._lastEscapeTime < 300) return;
        this._lastEscapeTime = now;

        // Close overlays first
        if (this.profilePanel.isVisible()) { this.profilePanel.hide(); this._resumeGame(); return; }
        if (this.skillTreeUI.isVisible()) { this.skillTreeUI.hide(); this._resumeGame(); return; }
        if (this.shopUI.isVisible()) { this.shopUI.hide(); this._resumeGame(); return; }

        if (this.settingsPanel.isVisible()) {
            this.settingsPanel.hide();
            if (this._gameStarted) {
                this.pauseMenu.show();
            } else {
                this.mainMenu.show();
            }
            return;
        }

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

        await this.saveSystem.deleteSave();

        setTimeout(() => {
            this.gameOverScreen.show();
        }, 500);
    }

    _applySettings(s) {
        this.renderer.setResolutionScale(s.resolution);
        this.renderer.renderer.shadowMap.enabled = s.shadows;

        const scene = this.gameScene.raw;
        if (scene.fog) {
            scene.fog.near = s.fogNear;
            scene.fog.far = s.fogFar;
        } else {
            scene.fog = new THREE.Fog(0x87ceeb, s.fogNear, s.fogFar);
        }

        this.worldManager.setRenderDistance(s.renderDist);
    }

    _update(dt) {
        const s = this.settingsPanel.current;
        this.worldManager.setRenderDistance(s.renderDist);

        if (this._paused || !this._gameStarted) return;

        // Player
        this.player.update(dt);

        // Effects system
        this.effectSystem.update(dt, {
            healPlayer: (amount) => {
                this.player.health = Math.min(this.player.maxHealth, this.player.health + amount / 100);
            },
            damageEnemy: (brain, dmg) => {
                const scaledDmg = brain.maxHealth <= 2 ? dmg / 100 : dmg;
                brain.takeDamage(scaledDmg, { type: 'effect' });
            },
        });

        // Apply effect-system speed mult to player
        this.player.externalSpeedMult = this.effectSystem.playerSpeedMult;
        this.player.shieldAbsorb = this.effectSystem.playerShield / 100;

        // Skill system (projectiles, cooldowns)
        this.skillSystem.update(dt, {
            getEnemiesInRadius: (pos, radius) => this.animalAI.getEnemiesInRadius(pos, radius),
            damageEnemy: (target, damage, effectType, effectDuration) => {
                this.animalAI.damageEnemy(target, damage, effectType, effectDuration);
                if (effectType && effectType !== 'none' && effectDuration > 0) {
                    const dotDmg = (effectType === 'burn' || effectType === 'poison') ? damage * 0.2 : 0;
                    this.effectSystem.applyToEnemy(target, effectType, effectDuration, dotDmg);
                }
            },
        });

        // World chunks
        this.worldManager.update(this.player.getPosition());

        // Animals AI
        if (this.animalAI) this.animalAI.update(dt);

        // Day/Night cycle
        this.dayNightCycle.update(this.player.getPosition());

        // LOD
        this.lodSystem.update(this.gameCamera.raw);
        for (const lod of this.worldManager.getActiveChunkMeshes()) {
            lod.update(this.gameCamera.raw);
        }

        // Update HUD
        this.gameHUD.update(this.player, this.effectSystem);
        this.gameHUD.updateSkillCooldowns();

        // Profile play time
        if (this.profile) {
            this.profile.data.playTime += dt;
        }
    }

    _render() {
        this.renderer.render(this.gameScene.raw, this.gameCamera.raw);
        this.perfMonitor.update(this.renderer.info);
    }
}

// ── Boot ────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
    window.__engine = new Engine();
});

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
import { createPlayerCharacterMesh, animatePlayerCharacter } from './player/playerCharacterMesh.js';

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

// ── Combat / Stats ──────────────────────────────────────────
import { computeDerivedStats } from './combat/statScaler.js';
import { computeDerivedStatsCurved } from './systems/statCurves.js';
import { calcMeleeDamage, toBrainScale } from './combat/damageCalculator.js';
import { SummonWolfManager } from './skills/summonWolf.js';

// ── New RPG Systems ─────────────────────────────────────────
import { WolfEvolutionManager } from './summons/wolfEvolution.js';
import { getZoneAtPosition, ZONES } from './world/worldConfig.js';
import { WorldSeedManager } from './world/worldSeedManager.js';
import { WorldGenerator } from './world/worldGenerator.js';
import { CREATURES, getScaledCreatureStats, getCreaturesForZone } from './entities/creatures/creatureDatabase.js';
import { createCreatureMesh } from './entities/creatures/creatureFactory.js';
import { InventorySystem } from './inventory/inventorySystem.js';
import { getItem, getItemsByCategory } from './inventory/itemDatabase.js';
import { GuildSystem } from './guild/guildSystem.js';
import { QuestManager } from './quests/questManager.js';
import { CameraController, CAMERA_MODE } from './camera/cameraController.js';
import { GatheringSystem } from './systems/gatheringSystem.js';
import { WaypointSystem } from './systems/waypointSystem.js';

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
import { QuestUI } from './ui/questUI.js';
import { InventoryUI } from './ui/inventoryUI.js';
import { GuildUI } from './ui/guildUI.js';
import { WorldMapUI } from './ui/worldMapUI.js';

// ── EXP rewards per creature type ───────────────────────────
// Legacy animal types kept for backward compat; new creatures auto-pull from creatureDatabase
const EXP_TABLE = {
    chicken: 10, cow: 25, deer: 30, wolf: 50,
    slime: 8, smallGoblin: 15, goblin: 35, goblinArcher: 40,
    direWolf: 55, forestGolem: 70, orc: 90, undeadKnight: 100,
    wyvern: 120, iceGolem: 130, frostBear: 110, fireDrake: 140,
    sandGolem: 150, scorpionKing: 200, demonGeneral: 300,
    iceDragon: 400, ancientDragon: 500,
};
const SKILL_DROP_CHANCE = {
    chicken: 0.1, cow: 0.25, deer: 0.3, wolf: 0.5,
    slime: 0.08, smallGoblin: 0.12, goblin: 0.2, goblinArcher: 0.22,
    direWolf: 0.3, forestGolem: 0.35, orc: 0.4, undeadKnight: 0.45,
    wyvern: 0.5, iceGolem: 0.5, frostBear: 0.45, fireDrake: 0.55,
    sandGolem: 0.55, scorpionKing: 0.6, demonGeneral: 0.7,
    iceDragon: 0.8, ancientDragon: 0.9,
};

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

        /** Safe pointer lock request — avoids NotAllowedError when no user gesture. */
        this._safePointerLock = () => {
            try { this.canvas.requestPointerLock(); } catch (_) { /* no user gesture */ }
        };

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

        // Lock to first-person for now
        this._cameraMode = CAMERA_MODE.FIRST_PERSON;

        // ── Player character mesh (visible in 3rd person) ───
        this._playerMesh = createPlayerCharacterMesh();
        this._playerMesh.visible = (this._cameraMode !== CAMERA_MODE.FIRST_PERSON);
        this.player.player.add(this._playerMesh);  // child of player Object3D

        // ── RPG Systems ─────────────────────────────────────
        this.profile = new PlayerProfile();
        this.skillSystem = new SkillSystem();
        this.effectSystem = new EffectSystem();
        this.shopSystem = new ShopSystem(this.profile);

        // ── Derived stats cache (recomputed on profile sync) ─
        this._derivedStats = computeDerivedStatsCurved(this.profile.data);

        // ── Summon Wolf Manager ─────────────────────────────
        this.summonWolfManager = new SummonWolfManager(this.gameScene.raw);

        // ── Wolf Evolution ──────────────────────────────────
        this.wolfEvolution = new WolfEvolutionManager();

        // ── Inventory System ────────────────────────────────
        this.inventorySystem = new InventorySystem();

        // ── Guild System ────────────────────────────────────
        this.guildSystem = new GuildSystem();

        // ── Quest Manager ───────────────────────────────────
        this.questManager = new QuestManager();

        // ── Camera Controller (multi-mode) ──────────────────
        this.cameraController = new CameraController(this.gameCamera.raw, this._cameraMode);
        this.player.setCameraMode(this._cameraMode);

        // ── Game Mode & World Gen ───────────────────────────
        this._gameMode = 'singleplayer'; // or 'multiplayer'
        this.worldSeedManager = null;
        this.worldGenerator = null;
        this._currentZone = null;

        // ── World ───────────────────────────────────────────
        this.worldManager = new WorldManager(this.gameScene.raw, this.player, this.assetLoader);

        // ── Systems ─────────────────────────────────────────
        this.dayNightCycle = new DayNightCycle(this.gameScene.raw);
        this.lodSystem = new LODSystem();
        this.perfMonitor = new PerformanceMonitor({ targetFPS: 30 });
        this.autoQuality = new AutoQualitySystem(this.renderer, this.perfMonitor);
        this.saveSystem = new SaveSystem();

        // ── Gathering System ────────────────────────────────
        this.gatheringSystem = new GatheringSystem(this.gameScene.raw, this.worldManager);

        // ── Waypoint System ─────────────────────────────────
        this.waypointSystem = new WaypointSystem(this.gameScene.raw, this.gameCamera.raw);

        // Show FPS overlay
        this.perfMonitor.showHUD(true);

        // ── Terrain height provider ─────────────────────────
        this.player.setHeightProvider((x, z) => this.worldManager.getHeightAt(x, z));
        this.cameraController.setHeightProvider((x, z) => this.worldManager.getHeightAt(x, z));

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

        // ── Wire player damage → familiar wolf aggro ────────
        const origTakeDamage = this.player.takeDamage.bind(this.player);
        this.player.takeDamage = (amount) => {
            origTakeDamage(amount);
            // Tell familiars to defend — find nearest enemy in small radius
            if (this.summonWolfManager && this.summonWolfManager.activeCount > 0 && this.animalAI) {
                const enemies = this.animalAI.getEnemiesInRadius(this.player.getPosition(), 10);
                if (enemies.length > 0) {
                    this.summonWolfManager.aggroAll(enemies[0]);
                }
            }
        };

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
        this.player.setOpenQuestsCallback(() => this._toggleOverlay(this.questUI));
        this.player.setOpenInventoryCallback(() => this._toggleOverlay(this.inventoryUI));
        this.player.setOpenGuildCallback(() => this._toggleOverlay(this.guildUI));
        this.player.setOpenMapCallback(() => {
            if (!this._gameStarted || this._gameOver) return;
            if (this.worldMapUI.isVisible()) {
                this.worldMapUI.hide();
                this._paused = false;
                this._safePointerLock();
            } else {
                this.profilePanel.hide(); this.skillTreeUI.hide(); this.shopUI.hide();
                this.questUI.hide(); this.inventoryUI.hide(); this.guildUI.hide();
                this._paused = true;
                if (document.pointerLockElement) document.exitPointerLock();
                this._showWorldMap();
            }
        });

        // Camera mode switching is disabled for now (first-person only)

        // ── Wire mouse orbit & scroll zoom to camera controller ─
        this.player.setMouseInputCallback((dx, dy) => {
            if (this.cameraController) {
                this.cameraController.handleMouseMove(dx, dy);
            }
        });
        this.player.setScrollCallback((delta) => {
            if (this.cameraController) {
                this.cameraController.handleScroll(delta);
            }
        });

        // ── Wire E/F interaction → gathering ────────────────
        this.player.setInteractCallback(() => {
            this._handleInteract();
        });

        // ── Wire gathering → guild progress + inventory ─────
        this.gatheringSystem.setGatherCallback((type, count) => {
            // Report to guild missions
            if (this.guildSystem) {
                const completed = this.guildSystem.reportProgress(type, count);
                for (const m of completed) {
                    this.gameHUD.showToast(`Mission Complete: ${m.title}!`, '#88ff44');
                    if (m.goldReward && this.inventorySystem) {
                        this.inventorySystem.addGold(m.goldReward);
                        this.gameHUD.showToast(`+${m.goldReward} Gold`, '#ffdd44');
                    }
                }
            }
            // Add to inventory
            if (this.inventorySystem) {
                this.inventorySystem.addItem(type, count);
            }
        });

        // ── Wire guild mission acceptance → waypoint ────────
        this.guildSystem.setMissionCompleteCallback((mission) => {
            // When a tracked mission completes, clear waypoint
            if (this.waypointSystem && this.waypointSystem.missionId === mission.id) {
                this.waypointSystem.clearWaypoint();
                this.gameHUD.hideWaypoint();
            }
        });

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
        this.questUI = new QuestUI();
        this.inventoryUI = new InventoryUI();
        this.guildUI = new GuildUI();
        this.worldMapUI = new WorldMapUI();

        // ── Wire profile to UIs ─────────────────────────────
        this.profilePanel.setProfile(this.profile);
        this.skillTreeUI.setProfile(this.profile);
        this.skillTreeUI.setShopSystem(this.shopSystem);
        this.shopUI.setProfile(this.profile);
        this.shopUI.setShopSystem(this.shopSystem);
        this.gameHUD.setProfile(this.profile);
        this.gameHUD.setSkillSystem(this.skillSystem);

        // ── Wire new UIs to their backend systems ───────────
        this.questUI.setQuestManager(this.questManager);
        this.inventoryUI.setInventorySystem(this.inventorySystem);
        this.inventoryUI.setProfile(this.profile);
        this.guildUI.setGuildSystem(this.guildSystem);
        this.worldMapUI.setGameMode(this._gameMode);

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
            onConfirm: (data) => this._startNewGame(data.name, data.dob, data.starterSkill, data.gameMode, data.appearance, data.statAllocation),
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
            onSkillChange: () => {
                this._rebuildHUDSkillBar();
            },
        });
        this.shopUI.setCallbacks({
            onClose: () => {
                if (this._gameStarted) this._resumeGame();
                else this.mainMenu.show();
            },
            onSkillChange: () => {
                this._rebuildHUDSkillBar();
            },
        });

        // New UI callbacks
        this.questUI.setCallbacks({
            onClose: () => {
                if (this._gameStarted) this._resumeGame();
                else this.mainMenu.show();
            },
        });
        this.inventoryUI.setCallbacks({
            onClose: () => {
                if (this._gameStarted) this._resumeGame();
                else this.mainMenu.show();
            },
        });
        this.guildUI.setCallbacks({
            onClose: () => {
                if (this._gameStarted) this._resumeGame();
                else this.mainMenu.show();
            },
        });
        this.worldMapUI.setCallbacks({
            onClose: () => {
                if (this._gameStarted) this._resumeGame();
                else this.mainMenu.show();
            },
        });

        // ── Initial fog ─────────────────────────────────────
        const initSettings = this.settingsPanel.current;
        this.gameScene.raw.fog = new THREE.Fog(0x87ceeb, initSettings.fogNear, initSettings.fogFar);

        // Apply persisted quality settings at boot
        this._applySettings(initSettings);

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
            onSwitchMode: () => { this._switchGameMode(); },
            onQuests: () => { this.pauseMenu.hide(); this.questUI.show(); },
            onInventory: () => { this.pauseMenu.hide(); this.inventoryUI.show(); },
            onGuild: () => { this.pauseMenu.hide(); this.guildUI.show(); },
            onMap: () => { this.pauseMenu.hide(); this._paused = true; if (document.pointerLockElement) document.exitPointerLock(); this._showWorldMap(); },
        });
        this.pauseMenu.setGameMode(this._gameMode);

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

        // Restore new RPG system states from profile data
        const d = this.profile.data;
        if (d._wolfEvolution) {
            this.wolfEvolution.deserialize(d._wolfEvolution);
        }
        if (d._inventory) {
            this.inventorySystem.deserialize(d._inventory);
        }
        if (d._guild) {
            this.guildSystem.deserialize(d._guild);
        }
        if (d._quests) {
            this.questManager.deserialize(d._quests);
        }
        this._gameMode = d._gameMode || d.gameMode || 'singleplayer';
        if (d._worldSeed && this._gameMode === 'multiplayer') {
            this.worldSeedManager = WorldSeedManager.fromSave(d._worldSeed);
            this.worldGenerator = new WorldGenerator(this.worldSeedManager);
            this.worldGenerator.generate();
        }

        this._syncProfileToPlayer();

        // Rebuild player mesh from saved appearance
        if (d.appearance) {
            this._rebuildPlayerMesh(d.appearance);
        }

        this.mainMenu.hide();
        this._paused = false;
        this._gameStarted = true;
        this._gameOver = false;
        this.gameHUD.show();
        this._rebuildHUDSkillBar();
        // Hide old HUD from firstPersonController
        this._hideOldHUD();
        // Show quest tracker HUD
        this.questUI.createTracker();
        this.questUI.showTracker();
        // Sync mode label to pause menu
        this.pauseMenu.setGameMode(this._gameMode);
        this._safePointerLock();
    }

    async _startNewGame(name, dob, starterSkill, gameMode = 'singleplayer', appearance = null, statAllocation = null) {
        // Delete old save
        await this.saveSystem.deleteSave();

        // Store game mode
        this._gameMode = gameMode;

        // Create fresh profile
        this.profile.create(name, dob, starterSkill);

        // Apply starting stat allocation (10 bonus points)
        if (statAllocation) {
            const d = this.profile.data;
            for (const [stat, pts] of Object.entries(statAllocation)) {
                if (d[stat] !== undefined && pts > 0) {
                    d[stat] += pts;
                }
            }
        }

        // Store appearance data in profile
        if (appearance) {
            this.profile.data.appearance = appearance;
            // Rebuild player mesh with new appearance colors
            this._rebuildPlayerMesh(appearance);
        }

        // Store game mode in profile for save/load
        this.profile.data.gameMode = gameMode;

        this._syncProfileToPlayer();

        // Reset player
        this.player.health = this.player.maxHealth;
        this.player.stamina = this.player.maxStamina;
        this.player.isDead = false;
        this._gameOver = false;

        // Clear effects
        this.effectSystem.clear();
        this.skillSystem.dispose();
        if (this.summonWolfManager) this.summonWolfManager.disposeAll();

        // Reset new systems
        this.wolfEvolution = new WolfEvolutionManager();
        this.inventorySystem = new InventorySystem();
        this.guildSystem = new GuildSystem();
        this.questManager = new QuestManager();

        // Init world generator for multiplayer (finite deterministic) mode
        if (gameMode === 'multiplayer') {
            const seed = name + '_' + Date.now();
            this.worldSeedManager = new WorldSeedManager(seed);
            this.worldGenerator = new WorldGenerator(this.worldSeedManager);
            this.worldGenerator.generate();
        } else {
            this.worldSeedManager = null;
            this.worldGenerator = null;
        }

        // Spawn at origin (or zone spawn point for multiplayer)
        let spawnX = 0, spawnZ = 0;
        if (gameMode === 'multiplayer') {
            const rookieZone = ZONES.rookieTown;
            if (rookieZone && rookieZone.spawnPoint) {
                spawnX = Number.isFinite(rookieZone.spawnPoint.x) ? rookieZone.spawnPoint.x : 0;
                spawnZ = Number.isFinite(rookieZone.spawnPoint.z) ? rookieZone.spawnPoint.z : 0;
            }
        }
        const spawnY = this.worldManager.getHeightAt(spawnX, spawnZ);
        this.player.player.position.set(spawnX, spawnY + 1.7, spawnZ);
        this.worldManager.update(this.player.getPosition());

        this.newGameScreen.hide();
        this.mainMenu.hide();
        this.gameOverScreen.hide();
        this._paused = false;
        this._gameStarted = true;
        this.gameHUD.show();
        this._rebuildHUDSkillBar();
        this._hideOldHUD();
        // Show quest tracker HUD
        this.questUI.createTracker();
        this.questUI.showTracker();
        // Sync mode label to pause menu
        this.pauseMenu.setGameMode(this._gameMode);
        // Init guild mission board
        this.guildSystem.refreshMissionBoard(5);
        this._safePointerLock();

        this.gameHUD.showToast(`Welcome, ${name}! Your adventure begins.`, '#aaddaa');
    }

    /** Kept for backward compat — old _newGame now routes through newGameScreen */
    async _newGame() {
        this.mainMenu.hide();
        this.newGameScreen.show();
    }

    /**
     * Sync profile stats → player controller.
     * Uses computeDerivedStatsCurved for non-linear stat scaling.
     * Adds equipment bonuses from inventory system.
     */
    _syncProfileToPlayer() {
        const d = this.profile.data;
        const ds = computeDerivedStatsCurved(d);

        // Add inventory equipment bonuses
        if (this.inventorySystem) {
            const equipBonus = this.inventorySystem.getEquipmentBonuses();
            ds.maxHealth += equipBonus.health || 0;
            ds.maxStamina += equipBonus.stamina || 0;
            ds.meleeDamage += equipBonus.attack || 0;
            ds.defence += equipBonus.defense || 0;
            // Recalculate 0-1 scale versions
            ds.meleeDamage01 = ds.meleeDamage / 100;
        }

        this._derivedStats = ds;

        // Convert to controller 0-1 scale
        this.player.maxHealth = ds.maxHealth / 100;
        this.player.health = Math.min(d.health, ds.maxHealth) / 100;
        this.player.maxStamina = ds.maxStamina / 100;
        this.player.stamina = Math.min(d.stamina, ds.maxStamina) / 100;

        // Stats-based melee combat
        this.player.attackDamage = ds.meleeDamage01;
        this.player.attackCooldown = ds.attackCooldown;
        this.player.attackRange = ds.attackRange;
    }

    /**
     * Rebuild the player character mesh with new appearance data.
     */
    _rebuildPlayerMesh(appearance) {
        if (this._playerMesh) {
            this.player.player.remove(this._playerMesh);
        }
        this._playerMesh = createPlayerCharacterMesh(appearance);
        // Visible only in non-first-person modes
        this._playerMesh.visible = (this._cameraMode !== CAMERA_MODE.FIRST_PERSON);
        this.player.player.add(this._playerMesh);
    }

    /**
     * Sync controller stats back → profile (for saving).
     */
    _syncPlayerToProfile() {
        const d = this.profile.data;
        d.health = Math.round(this.player.health * 100);
        d.stamina = Math.round(this.player.stamina * 100);
    }

    /** EXP rewards when a creature/animal is killed. */
    _onAnimalKill(type, mesh) {
        if (!this._gameStarted || this._gameOver) return;

        // Use creature database EXP if available, fallback to legacy table
        const creatureData = CREATURES[type];
        const exp = creatureData ? creatureData.expReward : (EXP_TABLE[type] || 15);
        const leveledUp = this.profile.addExp(exp);

        this.profile.data.totalKills++;
        this.profile.save();

        this.gameHUD.showToast(`+${exp} EXP`, '#6688ff');

        if (leveledUp) {
            this.gameHUD.showToast(`LEVEL UP! You are now level ${this.profile.data.level}`, '#ffcc00');
            this._syncProfileToPlayer();
        }

        // Random skill point drop
        const dropChance = SKILL_DROP_CHANCE[type] || (creatureData ? Math.min(0.9, creatureData.expReward / 500) : 0.15);
        if (Math.random() < dropChance) {
            const pts = 1;
            this.profile.addSkillPoints(pts);
            this.gameHUD.showToast(`+${pts} Skill Point dropped!`, '#ff88ff');
        }

        // ── Guild mission progress ──────────────────────────
        if (this.guildSystem?.data?.joined) {
            const completed = this.guildSystem.reportProgress(type, 1);
            for (const mission of completed) {
                this.gameHUD.showToast(`Mission Complete: ${mission.title}! +${mission.gpReward} GP`, '#ffaa44');
                this.profile.addExp(mission.expReward || 0);
                if (this.inventorySystem) this.inventorySystem.addGold(mission.goldReward || 0);
            }
        }

        // ── Quest progress (kill objectives) ────────────────
        if (this.questManager) {
            const completed = this.questManager.reportKill(type, 1);
            for (const q of completed) {
                this.gameHUD.showToast(`Quest Complete: ${q.name}!`, '#44ffaa');
                if (q.rewards) {
                    if (q.rewards.exp) this.profile.addExp(q.rewards.exp);
                    if (q.rewards.gold && this.inventorySystem) this.inventorySystem.addGold(q.rewards.gold);
                    if (q.rewards.gp && this.guildSystem) this.guildSystem.addGP(q.rewards.gp);
                }
            }
        }

        // ── Wolf evolution EXP ──────────────────────────────
        const wolves = this.wolfEvolution?.data?.wolves;
        if (Array.isArray(wolves) && wolves.length > 0) {
            const wolfExp = Math.max(5, Math.floor(exp * 0.5));
            const intelligence = this.profile.data.intelligence || 10;

            // Award to all registered wolves
            for (let i = 0; i < wolves.length; i++) {
                const result = this.wolfEvolution.addExp(i, wolfExp, intelligence);
                if (result && result.evolved) {
                    this.gameHUD.showToast(`Wolf evolved to ${result.newStage}!`, '#aa88ff');
                }
                if (result && result.leveledUp) {
                    this.gameHUD.showToast(`Wolf leveled up to ${result.newLevel}!`, '#8888ff');
                }
            }
        }

        // ── Inventory loot drops ────────────────────────────
        if (this.inventorySystem && creatureData && creatureData.drops) {
            for (const drop of creatureData.drops) {
                if (Math.random() < (creatureData.dropChance || 0.5)) {
                    const added = this.inventorySystem.addItem(drop.itemId, drop.quantity || 1);
                    if (added) {
                        const item = getItem(drop.itemId);
                        if (item) this.gameHUD.showToast(`Looted: ${item.name}`, '#cccc44');
                    }
                }
            }
            // Gold drop
            const goldDrop = Math.floor(exp * 0.3 + Math.random() * exp * 0.2);
            if (goldDrop > 0) {
                this.inventorySystem.addGold(goldDrop);
                this.gameHUD.showToast(`+${goldDrop} Gold`, '#ffdd44');
            }
        }
    }

    /** Use skill by number key (slot-based: 1-9 → slot 0-8, 0 → slot 9). */
    _useSkillByKey(key) {
        if (!this._gameStarted || this._paused || this._gameOver) return;
        if (this.player.isDead) return;

        // Map key to equipped slot index
        const slotIndex = key === '0' ? 9 : parseInt(key) - 1;
        if (isNaN(slotIndex) || slotIndex < 0 || slotIndex > 9) return;

        const d = this.profile.data;
        if (!d.equippedSkills) d.equippedSkills = [];
        const skillId = d.equippedSkills[slotIndex];
        if (!skillId) return;

        // Verify still unlocked
        if (!d.unlockedSkills.includes(skillId)) return;

        const currentStamina = this.player.stamina * 100; // convert back to integer scale
        const check = this.skillSystem.canUse(skillId, currentStamina, d, this._derivedStats);
        if (!check.ok) {
            this.gameHUD.showToast(check.reason, '#ff6666');
            return;
        }

        const level = this.profile.getSkillLevel(skillId);
        const scene = this.gameScene.raw;
        const playerPos = this.player.getPosition().clone();
        const forward = this.player.getAimDirection(); // Use full 3D aim direction for skills
        const animalAI = this.animalAI;
        const effectSys = this.effectSystem;
        const playerCtrl = this.player;
        const derivedStats = this._derivedStats;
        const summonMgr = this.summonWolfManager;

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
            summonWolves: (skillLevel) => {
                const spawned = summonMgr.spawn(playerPos, playerCtrl.player, skillLevel);
                const count = spawned.length;
                this.gameHUD.showToast(`Summoned ${count} familiar wolf${count > 1 ? 'ves' : ''}!`, '#6688ff');
            },
        }, derivedStats);

        if (success) {
            const skill = SKILLS[skillId];
            this.gameHUD.showToast(`${skill.name}!`, skill.color);
        }
    }

    /** Handle E/F interaction key — gather closest resource. */
    _handleInteract() {
        if (!this._gameStarted || this._paused || this._gameOver) return;
        if (this.player.isDead) return;

        const playerPos = this.player.getPosition();
        const closest = this.gatheringSystem.getClosestNode(playerPos);
        if (!closest) return;

        const result = this.gatheringSystem.gather(closest.key);
        if (result) {
            this.gameHUD.showToast(`Gathered: ${result.label}`, '#88ff88');
        }
    }

    /** Toggle overlay panels (profile, skill tree, shop, quests, inventory, guild, map). */
    _toggleOverlay(panel) {
        if (!this._gameStarted || this._gameOver) return;
        if (panel.isVisible()) {
            panel.hide();
            this._paused = false;
            this._safePointerLock();
        } else {
            // Close any other overlays
            this.profilePanel.hide();
            this.skillTreeUI.hide();
            this.shopUI.hide();
            this.questUI.hide();
            this.inventoryUI.hide();
            this.guildUI.hide();
            this.worldMapUI.hide();
            this._paused = true;
            if (document.pointerLockElement) document.exitPointerLock();
            panel.show();
        }
    }

    _rebuildHUDSkillBar() {
        if (!this.profile || !this.gameHUD) return;
        const d = this.profile.data;
        if (!Array.isArray(d.equippedSkills)) d.equippedSkills = [];
        // Pass raw slot array so HUD key labels match actual hotkeys 1-9,0.
        this.gameHUD.rebuildSkillBar(d.equippedSkills);
    }

    /** Hide the old firstPersonController HUD since GameHUD replaces it. */
    _hideOldHUD() {
        const oldHud = document.getElementById('player-hud');
        if (oldHud) oldHud.style.display = 'none';
    }

    async _saveGame() {
        this._syncPlayerToProfile();
        this.profile.save();

        // Save new RPG system states into profile data for persistence
        const d = this.profile.data;
        if (this.wolfEvolution) d._wolfEvolution = this.wolfEvolution.serialize();
        if (this.inventorySystem) d._inventory = this.inventorySystem.serialize();
        if (this.guildSystem) d._guild = this.guildSystem.serialize();
        if (this.questManager) d._quests = this.questManager.serialize();
        d._gameMode = this._gameMode;
        if (this.worldSeedManager) d._worldSeed = this.worldSeedManager.serialize();
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
        this.questUI.hide();
        this.inventoryUI.hide();
        this.guildUI.hide();
        this.worldMapUI.hide();
        this._paused = false;
        this._safePointerLock();
    }

    /** Show world map with updated player position and discovered zones. */
    _showWorldMap() {
        const pos = this.player.getPosition();
        this.worldMapUI.updatePlayerPos(pos.x, pos.z);
        this.worldMapUI.setGameMode(this._gameMode);
        // Always discover current zone
        if (this._currentZone) {
            this.worldMapUI.discoverZone(this._currentZone.id);
        }
        // Discover start zone
        this.worldMapUI.discoverZone('rookieTown');
        this.worldMapUI.show();
    }

    _quitToMenu() {
        this.pauseMenu.hide();
        this._paused = true;
        this._gameStarted = false;
        this.gameHUD.hide();
        if (this.questUI) this.questUI.hideTracker();
        this._showMainMenu();
        this.saveSystem.hasSave().then(has => {
            this.mainMenu.setCanContinue(has && !this._gameOver);
        });
    }

    /** Toggle between singleplayer and multiplayer at runtime.
     * Shared player/profile/skills persist across modes.
     */
    async _switchGameMode() {
        const newMode = this._gameMode === 'singleplayer' ? 'multiplayer' : 'singleplayer';
        // persist choice in profile
        this.profile.data.gameMode = newMode;

        if (newMode === 'multiplayer') {
            // Ensure a deterministic seed exists
            const seedStr = this.profile.data._worldSeed || (this.profile.data.name + '_' + Date.now());
            this.profile.data._worldSeed = seedStr;
            this.profile.save();

            // Create deterministic world
            this.worldSeedManager = new WorldSeedManager(seedStr);
            this.worldGenerator = new WorldGenerator(this.worldSeedManager);
            this.worldGenerator.generate();

            // Recreate world manager with deterministic seed so chunk loader aligns
            if (this.worldManager) this.worldManager.dispose();
            this.worldManager = new WorldManager(this.gameScene.raw, this.player, this.assetLoader, this.worldSeedManager.seed);
            this.player.setHeightProvider((x, z) => this.worldManager.getHeightAt(x, z));

            // Move player to zone spawn if available
            const rookieZone = ZONES.rookieTown;
            if (rookieZone && rookieZone.spawnPoint) {
                const sx = Number.isFinite(rookieZone.spawnPoint.x) ? rookieZone.spawnPoint.x : 0;
                const sz = Number.isFinite(rookieZone.spawnPoint.z) ? rookieZone.spawnPoint.z : 0;
                const sy = this.worldManager.getHeightAt(sx, sz);
                this.player.player.position.set(sx, sy + 1.7, sz);
            }
        } else {
            // Switch back to singleplayer procedural streaming world
            if (this.worldGenerator && typeof this.worldGenerator.dispose === 'function') this.worldGenerator.dispose();
            this.worldGenerator = null;
            this.worldSeedManager = null;
            if (this.worldManager) this.worldManager.dispose();
            this.worldManager = new WorldManager(this.gameScene.raw, this.player, this.assetLoader);
            this.player.setHeightProvider((x, z) => this.worldManager.getHeightAt(x, z));
            // Keep player position where they are.
        }

        // Rebind AI controller to the active world manager after mode switch
        this.animalAI = new AnimalAIController(this.gameScene.raw, this.worldManager, {
            dayProvider: () => this.dayNightCycle.isDay(),
            playerRef: this.player,
        });
        this.animalAI.setKillCallback((type, mesh) => {
            this._onAnimalKill(type, mesh);
        });

        this._gameMode = newMode;
        this.profile.data.gameMode = newMode;
        this.profile.save();
        this.gameHUD.showToast(`Mode switched: ${newMode}`, '#aaddaa');
        // Update pause menu mode label
        this.pauseMenu.setGameMode(newMode);
        if (this.worldMapUI) this.worldMapUI.setGameMode(newMode);
        // Force immediate world update
        this.worldManager.update(this.player.getPosition());
        // Resume gameplay after switching
        this._resumeGame();
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
        if (this.questUI.isVisible()) { this.questUI.hide(); this._resumeGame(); return; }
        if (this.inventoryUI.isVisible()) { this.inventoryUI.hide(); this._resumeGame(); return; }
        if (this.guildUI.isVisible()) { this.guildUI.hide(); this._resumeGame(); return; }
        if (this.worldMapUI.isVisible()) { this.worldMapUI.hide(); this._resumeGame(); return; }

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

        // Recover from invalid position state (e.g., old corrupted save/mode switch)
        const p0 = this.player.getPosition();
        if (!Number.isFinite(p0.x) || !Number.isFinite(p0.y) || !Number.isFinite(p0.z)) {
            const safeY = this.worldManager.getHeightAt(0, 0);
            this.player.player.position.set(0, safeY + 1.7, 0);
        }

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

        // Familiar wolves
        if (this.summonWolfManager && this.summonWolfManager.activeCount > 0) {
            const playerPos = this.player.getPosition();
            const nearbyEnemies = this.animalAI
                ? this.animalAI.getEnemiesInRadius(playerPos, 20)
                : [];
            const getHeight = (x, z) => this.worldManager.getHeightAt(x, z);
            this.summonWolfManager.update(dt, nearbyEnemies, getHeight);
        }

        // Wolf evolution cooldowns
        if (this.wolfEvolution) {
            this.wolfEvolution.updateCooldowns(dt);
        }

        // ── Zone tracking (finite world) ────────────────────
        const playerPos = this.player.getPosition();
        const zone = getZoneAtPosition(playerPos.x, playerPos.z);
        if (zone && (!this._currentZone || this._currentZone.id !== zone.id)) {
            this._currentZone = zone;
            this.gameHUD.showToast(`Entering: ${zone.name}`, '#aaddaa');
            // Discover zone on the world map
            if (this.worldMapUI) this.worldMapUI.discoverZone(zone.id);
        }

        // ── Quest explore checks ────────────────────────────
        if (this.questManager && this._currentZone) {
            const explored = this.questManager.reportExplore(this._currentZone.id) || [];
            for (const q of explored) {
                this.gameHUD.showToast(`Quest Complete: ${q.name}!`, '#44ffaa');
                if (q.rewards) {
                    if (q.rewards.exp) this.profile.addExp(q.rewards.exp);
                    if (q.rewards.gold && this.inventorySystem) this.inventorySystem.addGold(q.rewards.gold);
                }
            }
        }

        // ── Camera controller update ────────────────────────
        if (this.cameraController) {
            const forward = this.player.getAimDirection ? this.player.getAimDirection() : new THREE.Vector3(0, 0, -1);
            this.cameraController.update(dt, playerPos, forward, null);
        }

        // ── Animate player character mesh ───────────────────
        if (this._playerMesh) {
            const mv = this.player.movement;
            const isMoving = mv && (mv.forward || mv.backward || mv.left || mv.right);
            const isSprinting = mv && mv.isSprinting;
            animatePlayerCharacter(this._playerMesh, dt, isMoving, isSprinting);
        }

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

        // Update quest tracker HUD
        if (this.questUI) this.questUI.updateTracker();

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

// ============================================================
// animalAIController.js — Orchestrates all animal AI brains
// ============================================================
import * as THREE from 'three';
import { WolfBrain } from './wolfBrain.js';
import { DeerBrain } from './deerBrain.js';
import { CowBrain } from './cowBrain.js';
import { ChickenBrain } from './chickenBrain.js';
import {
  ANIMAL_DAY_ACTIVITY,
} from '../utils/constants.js';

/**
 * AnimalAIController — manages all animal brains and updates them each frame.
 * 
 * Usage:
 *   const ai = new AnimalAIController(scene, worldManager, {
 *     dayProvider: () => timeSystem.isDay(),
 *     playerRef: firstPersonController,
 *   });
 *   // In game loop:
 *   ai.update(dt);
 */
export class AnimalAIController {
  /**
   * @param {THREE.Scene} scene
   * @param {object} worldManager
   * @param {object} options
   */
  constructor(scene, worldManager, options = {}) {
    this.scene = scene;
    this.world = worldManager;
    this.player = (worldManager && worldManager._player) ? worldManager._player : null;
    this.dayProvider = options.dayProvider || (() => true);
    this.playerRef = options.playerRef || null;

    // Brain instances per animal (mesh.uuid -> Brain)
    this._brains = new Map();

    // Entity cache for perception (rebuilt each frame)
    this._entityCache = [];

    // Health bar sprites
    this._healthBars = new Map();

    this._time = 0;
  }

  /**
   * Get or create a brain for an animal mesh.
   * @param {THREE.Mesh} mesh
   * @returns {AnimalBrain|null}
   */
  _getOrCreateBrain(mesh) {
    if (this._brains.has(mesh.uuid)) {
      return this._brains.get(mesh.uuid);
    }

    const type = mesh.userData.type;
    let brain = null;

    switch (type) {
      case 'wolf':
        brain = new WolfBrain(mesh);
        break;
      case 'deer':
        brain = new DeerBrain(mesh);
        break;
      case 'cow':
        brain = new CowBrain(mesh);
        break;
      case 'chicken':
        brain = new ChickenBrain(mesh);
        break;
      default:
        return null;
    }

    this._brains.set(mesh.uuid, brain);
    mesh.userData._brain = brain;

    // Create health/stamina bar
    this._createHealthBar(mesh, brain);

    return brain;
  }

  /**
   * Collect all animal meshes from the scene.
   */
  _collectAnimals() {
    const animals = [];
    for (const child of this.scene.children) {
      if (typeof child.name === 'string' && child.name.startsWith('animals:')) {
        for (const m of child.children) {
          if (m.name === 'animalCollider') continue;
          if (m.userData && m.userData.type) animals.push(m);
        }
      }
    }
    return animals;
  }

  /**
   * Build entity list for perception system.
   */
  _buildEntityCache(animals) {
    this._entityCache = [];
    for (const mesh of animals) {
      this._entityCache.push({
        mesh: mesh,
        type: mesh.userData.type,
        position: mesh.position,
        userData: mesh.userData,
      });
    }
  }

  /**
   * Main update — called every fixed-step.
   * @param {number} dt
   */
  update(dt) {
    this._time += dt;

    const animals = this._collectAnimals();
    const playerPos = this.player ? this.player.player.position : null;

    // Build entity cache for perception
    this._buildEntityCache(animals);

    // Day/night activity multiplier
    const dayMult = this.dayProvider() ? ANIMAL_DAY_ACTIVITY.day : ANIMAL_DAY_ACTIVITY.night;

    // Update each animal brain
    for (const mesh of animals) {
      const brain = this._getOrCreateBrain(mesh);
      if (!brain) continue;

      // Skip dead animals
      if (brain.isDead) {
        this._handleDeath(mesh, brain);
        continue;
      }

      // Apply day/night multiplier to speeds
      brain.baseSpeed = brain.baseSpeed; // base stays constant; multiplier applied in movement
      
      // Update the brain (perception, NN, FSM, movement)
      brain.update(dt, this._entityCache, playerPos);

      // Align to ground after movement
      this._alignToGround(mesh);

      // Update health bar
      this._updateHealthBar(mesh, brain);
    }

    // Clean up brains for removed animals
    this._cleanupBrains(animals);
  }

  /**
   * Handle animal death.
   */
  _handleDeath(mesh, brain) {
    // Tilt the mesh (death animation)
    mesh.rotation.z = Math.PI / 2;
    mesh.rotation.x = 0;

    // Remove health bar
    const bar = this._healthBars.get(mesh.uuid);
    if (bar) {
      mesh.remove(bar);
      this._healthBars.delete(mesh.uuid);
    }

    // Fade out and remove after delay
    if (!mesh.userData._deathTimer) {
      mesh.userData._deathTimer = 0;
    }
    mesh.userData._deathTimer += 0.016;
    if (mesh.userData._deathTimer > 5) {
      // Remove from scene
      if (mesh.parent) mesh.parent.remove(mesh);
      this._brains.delete(mesh.uuid);
    }
  }

  /**
   * Align mesh to ground height.
   */
  _alignToGround(mesh) {
    if (!this.world || typeof this.world.getHeightAt !== 'function') return;
    const x = mesh.position.x;
    const z = mesh.position.z;
    const h = this.world.getHeightAt(x, z);
    mesh.position.y = h + 0.05;

    // Update collider
    if (mesh.userData && mesh.userData.collider) {
      try {
        const offsetY = mesh.userData.colliderOffsetY || 0.05;
        mesh.userData.collider.position.set(x, h + offsetY, z);
        if (typeof mesh.userData.collider.updateMatrixWorld === 'function') {
          mesh.userData.collider.updateMatrixWorld(true);
        }
      } catch (e) { /* ignore */ }
    }
  }

  /**
   * Create a health/stamina bar above an animal.
   */
  _createHealthBar(mesh, brain) {
    const barGroup = new THREE.Group();
    barGroup.name = 'healthBar';

    // Health bar background (red)
    const bgGeo = new THREE.PlaneGeometry(1.0, 0.08);
    const bgMat = new THREE.MeshBasicMaterial({ color: 0x333333, side: THREE.DoubleSide, depthTest: false, transparent: true, opacity: 0.7 });
    const bg = new THREE.Mesh(bgGeo, bgMat);
    bg.name = 'hpBg';
    barGroup.add(bg);

    // Health bar fill (green)
    const fillGeo = new THREE.PlaneGeometry(1.0, 0.08);
    const fillMat = new THREE.MeshBasicMaterial({ color: 0x22cc22, side: THREE.DoubleSide, depthTest: false, transparent: true, opacity: 0.9 });
    const fill = new THREE.Mesh(fillGeo, fillMat);
    fill.name = 'hpFill';
    barGroup.add(fill);

    // Stamina bar background
    const stBgGeo = new THREE.PlaneGeometry(1.0, 0.05);
    const stBgMat = new THREE.MeshBasicMaterial({ color: 0x333333, side: THREE.DoubleSide, depthTest: false, transparent: true, opacity: 0.6 });
    const stBg = new THREE.Mesh(stBgGeo, stBgMat);
    stBg.position.y = -0.09;
    stBg.name = 'stBg';
    barGroup.add(stBg);

    // Stamina bar fill (yellow)
    const stFillGeo = new THREE.PlaneGeometry(1.0, 0.05);
    const stFillMat = new THREE.MeshBasicMaterial({ color: 0xffcc00, side: THREE.DoubleSide, depthTest: false, transparent: true, opacity: 0.8 });
    const stFill = new THREE.Mesh(stFillGeo, stFillMat);
    stFill.position.y = -0.09;
    stFill.name = 'stFill';
    barGroup.add(stFill);

    // Position above animal (height varies by type)
    let barHeight = 1.5;
    switch (brain.type) {
      case 'cow': barHeight = 2.0; break;
      case 'deer': barHeight = 1.8; break;
      case 'wolf': barHeight = 1.2; break;
      case 'chicken': barHeight = 0.6; break;
    }
    barGroup.position.y = barHeight;
    barGroup.renderOrder = 999;

    mesh.add(barGroup);
    this._healthBars.set(mesh.uuid, barGroup);
  }

  /**
   * Update health bar visual.
   */
  _updateHealthBar(mesh, brain) {
    const barGroup = this._healthBars.get(mesh.uuid);
    if (!barGroup) return;

    // Make bar face camera
    if (this.player && this.player.camera) {
      barGroup.lookAt(this.player.camera.position || this.player.player.position);
    }

    // Health fill
    const hpRatio = brain.health / brain.maxHealth;
    const hpFill = barGroup.getObjectByName('hpFill');
    if (hpFill) {
      hpFill.scale.x = Math.max(0.01, hpRatio);
      hpFill.position.x = (hpRatio - 1) * 0.5;
      // Color: green → yellow → red
      if (hpRatio > 0.6) hpFill.material.color.setHex(0x22cc22);
      else if (hpRatio > 0.3) hpFill.material.color.setHex(0xcccc22);
      else hpFill.material.color.setHex(0xcc2222);
    }

    // Stamina fill
    const stRatio = brain.stamina / brain.maxStamina;
    const stFill = barGroup.getObjectByName('stFill');
    if (stFill) {
      stFill.scale.x = Math.max(0.01, stRatio);
      stFill.position.x = (stRatio - 1) * 0.5;
    }

    // Hide bars if full health and stamina
    barGroup.visible = (hpRatio < 0.99 || stRatio < 0.95);
  }

  /**
   * Clean up brains for animals that are no longer in the scene.
   */
  _cleanupBrains(currentAnimals) {
    const currentIds = new Set(currentAnimals.map(m => m.uuid));
    for (const [uuid, brain] of this._brains) {
      if (!currentIds.has(uuid)) {
        this._brains.delete(uuid);
        this._healthBars.delete(uuid);
      }
    }
  }

  /**
   * Called when the player attacks. Damages nearby animals.
   * @param {THREE.Vector3} playerPos
   * @param {THREE.Vector3} playerForward  Direction player is facing
   * @param {number} attackRange
   * @param {number} attackDamage
   */
  playerAttack(playerPos, playerForward, attackRange = 3.0, attackDamage = 0.25) {
    for (const [uuid, brain] of this._brains) {
      if (brain.isDead) continue;
      const dist = brain.position.distanceTo(playerPos);
      if (dist > attackRange) continue;

      // Check if animal is roughly in front of player
      const toAnimal = new THREE.Vector3().subVectors(brain.position, playerPos).normalize();
      const dot = playerForward.dot(toAnimal);
      if (dot < 0.3) continue; // must be within ~70° cone

      brain.takeDamage(attackDamage, {
        type: 'player',
        position: playerPos.clone(),
        mesh: { position: playerPos },
      });
    }
  }
}

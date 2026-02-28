// ============================================================
// animalAIController.js — Orchestrates all animal AI brains
// ============================================================
import * as THREE from 'three';
import { WolfBrain } from './wolfBrain.js';
import { DeerBrain } from './deerBrain.js';
import { CowBrain } from './cowBrain.js';
import { ChickenBrain } from './chickenBrain.js';
import { animateProceduralAnimal, deathAnimation } from '../world/animals/proceduralAnimal.js';
import {
  ANIMAL_DAY_ACTIVITY,
} from '../utils/constants.js';

/**
 * AnimalAIController — manages all animal brains and updates them each frame.
 */
export class AnimalAIController {
  constructor(scene, worldManager, options = {}) {
    this.scene = scene;
    this.world = worldManager;
    this.player = (worldManager && worldManager._player) ? worldManager._player : null;
    this.dayProvider = options.dayProvider || (() => true);
    this.playerRef = options.playerRef || null;

    this._brains = new Map();
    this._entityCache = [];
    this._healthBars = new Map();
    this._time = 0;
    this._camWorldPos = new THREE.Vector3();
  }

  _getOrCreateBrain(mesh) {
    if (this._brains.has(mesh.uuid)) {
      return this._brains.get(mesh.uuid);
    }

    const type = mesh.userData.type;
    let brain = null;

    switch (type) {
      case 'wolf': brain = new WolfBrain(mesh); break;
      case 'deer': brain = new DeerBrain(mesh); break;
      case 'cow': brain = new CowBrain(mesh); break;
      case 'chicken': brain = new ChickenBrain(mesh); break;
      default: return null;
    }

    // Wire player ref so wolf can damage player
    brain._playerController = this.playerRef;

    this._brains.set(mesh.uuid, brain);
    mesh.userData._brain = brain;
    this._createHealthBar(mesh, brain);
    return brain;
  }

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

  _buildEntityCache(animals) {
    this._entityCache = [];
    for (const mesh of animals) {
      this._entityCache.push({
        mesh,
        type: mesh.userData.type,
        position: mesh.position,
        userData: mesh.userData,
      });
    }
  }

  update(dt) {
    this._time += dt;

    const animals = this._collectAnimals();
    const playerPos = this.player ? this.player.player.position : null;

    // Cache camera world position for health bar billboard
    if (this.playerRef && this.playerRef.camera) {
      this.playerRef.camera.getWorldPosition(this._camWorldPos);
    } else if (playerPos) {
      this._camWorldPos.copy(playerPos);
    }

    this._buildEntityCache(animals);

    const dayMult = this.dayProvider() ? ANIMAL_DAY_ACTIVITY.day : ANIMAL_DAY_ACTIVITY.night;

    for (const mesh of animals) {
      const brain = this._getOrCreateBrain(mesh);
      if (!brain) continue;

      if (brain.isDead) {
        this._handleDeath(mesh, brain, dt);
        continue;
      }

      brain.update(dt, this._entityCache, playerPos);
      this._alignToGround(mesh);

      // Animate procedural mesh
      if (mesh.isGroup || mesh.children.length > 0) {
        animateProceduralAnimal(mesh, this._time, brain.currentSpeed || 0);
      }

      this._updateHealthBar(mesh, brain);
    }

    this._cleanupBrains(animals);
  }

  _handleDeath(mesh, brain, dt) {
    if (!mesh.userData._deathTimer) {
      mesh.userData._deathTimer = 0;
    }
    mesh.userData._deathTimer += dt;

    const progress = Math.min(mesh.userData._deathTimer / 3.0, 1.0); // 3 second death

    // Use procedural death animation
    deathAnimation(mesh, progress);

    // Remove health bar
    const bar = this._healthBars.get(mesh.uuid);
    if (bar) {
      mesh.remove(bar);
      this._healthBars.delete(mesh.uuid);
    }

    // Remove after animation completes
    if (mesh.userData._deathTimer > 4.0) {
      if (mesh.parent) mesh.parent.remove(mesh);
      this._brains.delete(mesh.uuid);
    }
  }

  _alignToGround(mesh) {
    if (!this.world || typeof this.world.getHeightAt !== 'function') return;
    const h = this.world.getHeightAt(mesh.position.x, mesh.position.z);
    mesh.position.y = h + 0.05;
  }

  _createHealthBar(mesh, brain) {
    const barGroup = new THREE.Group();
    barGroup.name = 'healthBar';
    barGroup.renderOrder = 999;

    // Health bar background
    const bgGeo = new THREE.PlaneGeometry(1.0, 0.1);
    const bgMat = new THREE.MeshBasicMaterial({
      color: 0x333333, side: THREE.DoubleSide,
      depthTest: false, depthWrite: false, transparent: true, opacity: 0.7,
    });
    const bg = new THREE.Mesh(bgGeo, bgMat);
    bg.name = 'hpBg';
    bg.renderOrder = 999;
    barGroup.add(bg);

    // Health fill
    const fillGeo = new THREE.PlaneGeometry(1.0, 0.1);
    const fillMat = new THREE.MeshBasicMaterial({
      color: 0x22cc22, side: THREE.DoubleSide,
      depthTest: false, depthWrite: false, transparent: true, opacity: 0.9,
    });
    const fill = new THREE.Mesh(fillGeo, fillMat);
    fill.name = 'hpFill';
    fill.renderOrder = 1000;
    barGroup.add(fill);

    // Stamina bar background
    const stBgGeo = new THREE.PlaneGeometry(1.0, 0.06);
    const stBgMat = new THREE.MeshBasicMaterial({
      color: 0x333333, side: THREE.DoubleSide,
      depthTest: false, depthWrite: false, transparent: true, opacity: 0.6,
    });
    const stBg = new THREE.Mesh(stBgGeo, stBgMat);
    stBg.position.y = -0.11;
    stBg.name = 'stBg';
    stBg.renderOrder = 999;
    barGroup.add(stBg);

    // Stamina fill
    const stFillGeo = new THREE.PlaneGeometry(1.0, 0.06);
    const stFillMat = new THREE.MeshBasicMaterial({
      color: 0xffcc00, side: THREE.DoubleSide,
      depthTest: false, depthWrite: false, transparent: true, opacity: 0.8,
    });
    const stFill = new THREE.Mesh(stFillGeo, stFillMat);
    stFill.position.y = -0.11;
    stFill.name = 'stFill';
    stFill.renderOrder = 1000;
    barGroup.add(stFill);

    // Position bar above animal head
    let barHeight = 1.5;
    switch (brain.type) {
      case 'cow': barHeight = 2.2; break;
      case 'deer': barHeight = 2.0; break;
      case 'wolf': barHeight = 1.3; break;
      case 'chicken': barHeight = 0.8; break;
    }
    barGroup.position.y = barHeight;

    mesh.add(barGroup);
    this._healthBars.set(mesh.uuid, barGroup);
  }

  _updateHealthBar(mesh, brain) {
    const barGroup = this._healthBars.get(mesh.uuid);
    if (!barGroup) return;

    // Billboard: make bar face camera using world position
    const meshWorldPos = new THREE.Vector3();
    mesh.getWorldPosition(meshWorldPos);
    const barWorldPos = new THREE.Vector3();
    barWorldPos.copy(meshWorldPos);
    barWorldPos.y += barGroup.position.y;

    // Look at camera in world space, then convert to local
    barGroup.lookAt(
      this._camWorldPos.x - meshWorldPos.x + barGroup.position.x,
      this._camWorldPos.y - meshWorldPos.y + barGroup.position.y,
      this._camWorldPos.z - meshWorldPos.z + barGroup.position.z,
    );

    // Health fill
    const hpRatio = brain.health / brain.maxHealth;
    const hpFill = barGroup.getObjectByName('hpFill');
    if (hpFill) {
      hpFill.scale.x = Math.max(0.01, hpRatio);
      hpFill.position.x = (hpRatio - 1) * 0.5;
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

    // Always show bars (removed hide when full, user wants them visible)
    barGroup.visible = true;
  }

  _cleanupBrains(currentAnimals) {
    const currentIds = new Set(currentAnimals.map(m => m.uuid));
    for (const [uuid] of this._brains) {
      if (!currentIds.has(uuid)) {
        this._brains.delete(uuid);
        this._healthBars.delete(uuid);
      }
    }
  }

  playerAttack(playerPos, playerForward, attackRange = 3.0, attackDamage = 0.25) {
    let hitAny = false;
    for (const [uuid, brain] of this._brains) {
      if (brain.isDead) continue;
      const dist = brain.position.distanceTo(playerPos);
      if (dist > attackRange) continue;

      const toAnimal = new THREE.Vector3().subVectors(brain.position, playerPos).normalize();
      const dot = playerForward.dot(toAnimal);
      if (dot < 0.3) continue;

      brain.takeDamage(attackDamage, {
        type: 'player',
        position: playerPos.clone(),
        mesh: { position: playerPos },
      });
      hitAny = true;
    }
    return hitAny;
  }
}
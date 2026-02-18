import * as THREE from 'three';
import {
  WOLF_DETECTION_RADIUS,
  WOLF_ATTACK_RANGE,
  WOLF_BASE_SPEED,
  WOLF_CHASE_SPEED_MULT,
  CHICKEN_FEAR_RADIUS,
  CHICKEN_PANIC_SPEED,
  CHICKEN_WANDER_SPEED,
  DEER_FEAR_RADIUS,
  DEER_PANIC_SPEED,
  DEER_NORMAL_SPEED,
  COW_WOLF_FEAR_RADIUS,
  COW_NORMAL_SPEED,
  COW_REACTION_DELAY,
  ANIMAL_DAY_ACTIVITY,
} from '../utils/constants.js';

import { decideWolfBehavior } from './wolfBrain.js';
import { decideChickenBehavior } from './chickenBrain.js';
import { decideCowBehavior } from './cowBrain.js';
import { decideDeerBehavior } from './deerBrain.js';

/**
 * AnimalAIController — runs animal brains and applies simple motion each update.
 * Usage: const ai = new AnimalAIController(scene, worldManager, { dayProvider: () => timeSystem.isDay });
 * Then call ai.update(dt) from your fixed-step loop.
 */
export class AnimalAIController {
  constructor(scene, worldManager, options = {}) {
    this.scene = scene;
    this.world = worldManager;
    this.player = (worldManager && worldManager._player) ? worldManager._player : null;
    this.dayProvider = options.dayProvider || (() => true);

    this._animals = new Map(); // mesh.uuid -> state
    this._tempVec = new THREE.Vector3();
    this._time = 0;
  }

  _ensureState(mesh) {
    let s = this._animals.get(mesh.uuid);
    if (!s) {
      s = {
        behavior: 'idle',
        wanderTarget: new THREE.Vector3(),
        wanderTimer: 0,
        reactionTimer: 0,
      };
      this._animals.set(mesh.uuid, s);
    }
    return s;
  }

  _collectAnimals() {
    const animals = [];
    for (const child of this.scene.children) {
      if (typeof child.name === 'string' && child.name.startsWith('animals:')) {
        for (const m of child.children) {
          // Skip raw collider objects named 'animalCollider'
          if (m.name === 'animalCollider') continue;
          if (m.userData && m.userData.type) animals.push(m);
        }
      }
    }
    return animals;
  }

  _distance(a, b) {
    return a.distanceTo(b);
  }

  update(dt) {
    this._time += dt;

    const animals = this._collectAnimals();
    const playerPos = this.player ? this.player.player.position : null;

    // Build quick lookup of wolves for prey checks
    const wolves = animals.filter(a => a.userData.type === 'wolf');

    for (const mesh of animals) {
      const pos = mesh.position;
      const type = mesh.userData.type;
      const state = this._ensureState(mesh);

      // distances
      const distToPlayer = playerPos ? pos.distanceTo(playerPos) : Infinity;
      // nearest wolf distance
      let nearestWolfDist = Infinity;
      let nearestWolf = null;
      for (const w of wolves) {
        if (w === mesh) continue;
        const d = pos.distanceTo(w.position);
        if (d < nearestWolfDist) {
          nearestWolfDist = d;
          nearestWolf = w;
        }
      }

      // Decision & behavior mapping
      let behavior = 'idle';

      if (type === 'wolf') {
        // Compute distances to various possible prey
        const playerD = distToPlayer;
        // find nearest chicken, deer, cow distances
        let chickenD = Infinity, deerD = Infinity, cowD = Infinity;
        for (const a of animals) {
          if (a === mesh) continue;
          const d = a.position.distanceTo(pos);
          const t = a.userData.type;
          if (t === 'chicken' && d < chickenD) chickenD = d;
          if (t === 'deer' && d < deerD) deerD = d;
          if (t === 'cow' && d < cowD) cowD = d;
        }
        const distances = { player: playerD, chicken: chickenD, deer: deerD, cow: cowD };
        behavior = decideWolfBehavior(distances);

        // Post-process: choose actual target for chase/attack — prefer weakest targets
        if (behavior === 'chase' || behavior === 'attack') {
          // score = dist * priorityMultiplier (lower better)
          const scores = [];
          if (playerPos) scores.push({ t: 'player', score: (playerD) * 0.9, ref: playerPos });
          if (chickenD < Infinity) scores.push({ t: 'chicken', score: chickenD * 0.7, ref: null });
          if (deerD < Infinity) scores.push({ t: 'deer', score: deerD * 1.0, ref: null });
          if (cowD < Infinity) scores.push({ t: 'cow', score: cowD * 1.3, ref: null });
          scores.sort((a,b)=>a.score-b.score);
          if (scores.length>0) {
            state._targetType = scores[0].t;
            state._targetPos = scores[0].ref || null;
          }
        }
      } else if (type === 'chicken') {
        const distances = { player: distToPlayer, wolf: nearestWolfDist };
        behavior = decideChickenBehavior(distances);
      } else if (type === 'cow') {
        const distances = { wolf: nearestWolfDist };
        behavior = decideCowBehavior(distances);
        // implement reaction delay for cows
        if (behavior === 'fleeFromWolf') {
          state.reactionTimer += dt;
          if (state.reactionTimer < COW_REACTION_DELAY) {
            behavior = 'idle';
          }
        } else {
          state.reactionTimer = 0;
        }
      } else if (type === 'deer') {
        const distances = { player: distToPlayer, wolf: nearestWolfDist };
        behavior = decideDeerBehavior(distances);
      }

      state.behavior = behavior;

      // Movement application
      const dayMult = this.dayProvider() ? ANIMAL_DAY_ACTIVITY.day : ANIMAL_DAY_ACTIVITY.night;

      if (type === 'wolf') {
        if (behavior === 'idle') {
          // slow idle wandering
          this._applyWander(mesh, state, dt, 0.6 * dayMult);
        } else if (behavior === 'chase') {
          // move towards target (player or other)
          let targetPos = null;
          if (state._targetType === 'player' && playerPos) targetPos = playerPos;
          else {
            // try to locate nearest of chosen type
            for (const a of animals) if (a.userData.type === state._targetType) { targetPos = a.position; break; }
          }
          if (targetPos) this._moveTowards(mesh, targetPos, dt, WOLF_BASE_SPEED * WOLF_CHASE_SPEED_MULT);
        } else if (behavior === 'attack') {
          // if target within range, lunge (simple)
          let tpos = null;
          if (state._targetType === 'player' && playerPos) tpos = playerPos;
          else {
            for (const a of animals) if (a.userData.type === state._targetType) { tpos = a.position; break; }
          }
          if (tpos) {
            const d = mesh.position.distanceTo(tpos);
            if (d > WOLF_ATTACK_RANGE) this._moveTowards(mesh, tpos, dt, WOLF_BASE_SPEED * WOLF_CHASE_SPEED_MULT * 1.1);
            else {
              // perform a simple attack impulse and log
              this._tempVec.subVectors(tpos, mesh.position).setLength(0.2);
              mesh.position.add(this._tempVec);
              this._alignToGround(mesh);
            }
          } else {
            this._applyWander(mesh, state, dt, 0.6 * dayMult);
          }
        }
      }

      if (type === 'chicken') {
        if (behavior === 'runAway') {
          // run away from nearest threat (prefer player if close)
          let threatPos = playerPos;
          if (nearestWolfDist < distToPlayer) threatPos = nearestWolf ? nearestWolf.position : threatPos;
          if (threatPos) this._fleeFrom(mesh, threatPos, dt, CHICKEN_PANIC_SPEED);
        } else if (behavior === 'wander') {
          this._applyWander(mesh, state, dt, CHICKEN_WANDER_SPEED * dayMult);
        } else {
          // idle occasional pecking
          this._maybeIdleNudge(mesh, dt);
        }
      }

      if (type === 'cow') {
        if (behavior === 'fleeFromWolf') {
          if (nearestWolf) this._fleeFrom(mesh, nearestWolf.position, dt, COW_NORMAL_SPEED * 1.6);
        } else if (behavior === 'graze') {
          this._applyWander(mesh, state, dt, COW_NORMAL_SPEED * 0.5);
        } else if (behavior === 'walk') {
          this._applyWander(mesh, state, dt, COW_NORMAL_SPEED * dayMult);
        } else {
          this._maybeIdleNudge(mesh, dt);
        }
      }

      if (type === 'deer') {
        if (behavior === 'runAway') {
          // prefer fleeing from wolf if present
          const threat = (nearestWolf && nearestWolfDist < distToPlayer) ? nearestWolf.position : playerPos;
          if (threat) this._fleeZigZag(mesh, threat, dt, DEER_PANIC_SPEED);
        } else if (behavior === 'alert') {
          // short burst away from threat but slower
          const threat = (nearestWolf && nearestWolfDist < distToPlayer) ? nearestWolf.position : playerPos;
          if (threat) this._fleeFrom(mesh, threat, dt, DEER_NORMAL_SPEED * 1.1);
        } else if (behavior === 'graze') {
          this._applyWander(mesh, state, dt, DEER_NORMAL_SPEED * 0.4);
        } else {
          this._maybeIdleNudge(mesh, dt);
        }
      }
    }
  }

  _applyWander(mesh, state, dt, speed) {
    state.wanderTimer -= dt;
    if (state.wanderTimer <= 0) {
      // pick new wander target nearby
      const r = 6 + Math.random() * 6;
      const ang = Math.random() * Math.PI * 2;
      state.wanderTarget.set(
        mesh.position.x + Math.cos(ang) * r,
        mesh.position.y,
        mesh.position.z + Math.sin(ang) * r,
      );
      state.wanderTimer = 2 + Math.random() * 4;
    }
    this._moveTowards(mesh, state.wanderTarget, dt, speed);
  }

  _maybeIdleNudge(mesh, dt) {
    // tiny random movement or rotation while idle
    if (Math.random() < 0.01) {
      mesh.rotation.y += (Math.random() - 0.5) * 0.6;
    }
  }

  _moveTowards(mesh, targetPos, dt, speed = 1.0) {
    // speed is meters per second
    this._tempVec.subVectors(targetPos, mesh.position);
    this._tempVec.y = 0;
    const dist = this._tempVec.length();
    if (dist < 0.01) return;
    const dir = this._tempVec.normalize();
    const move = Math.min(dist, (speed * dt));
    mesh.position.addScaledVector(dir, move);
    mesh.lookAt(targetPos.x, mesh.position.y, targetPos.z);
    this._alignToGround(mesh);
  }

  _fleeFrom(mesh, threatPos, dt, speed) {
    this._tempVec.subVectors(mesh.position, threatPos);
    this._tempVec.y = 0;
    if (this._tempVec.length() < 0.01) {
      // random jitter if on top
      this._tempVec.set(Math.random() - 0.5, 0, Math.random() - 0.5).normalize();
    } else this._tempVec.normalize();
    mesh.position.addScaledVector(this._tempVec, speed * dt);
    mesh.lookAt(mesh.position.x + this._tempVec.x, mesh.position.y, mesh.position.z + this._tempVec.z);
    this._alignToGround(mesh);
  }

  _fleeZigZag(mesh, threatPos, dt, speed) {
    // base flee direction
    const base = new THREE.Vector3().subVectors(mesh.position, threatPos);
    base.y = 0;
    if (base.length() < 0.01) base.set(Math.random() - 0.5, 0, Math.random() - 0.5);
    base.normalize();
    // perpendicular oscillation
    const perp = new THREE.Vector3(-base.z, 0, base.x);
    const oscill = Math.sin(this._time * 10 + mesh.uuid.length) * 0.6;
    base.addScaledVector(perp, oscill).normalize();
    mesh.position.addScaledVector(base, speed * dt);
    mesh.lookAt(mesh.position.x + base.x, mesh.position.y, mesh.position.z + base.z);
    this._alignToGround(mesh);
  }

  _alignToGround(mesh) {
    if (!this.world || typeof this.world.getHeightAt !== 'function') return;
    const x = mesh.position.x;
    const z = mesh.position.z;
    const h = this.world.getHeightAt(x, z);
    // prefer collider offset if present
    const offsetY = (mesh.userData && mesh.userData.colliderOffsetY) ? mesh.userData.colliderOffsetY : 0.05;
    mesh.position.y = h + 0.05; // keep model slightly above ground
    // update collider if linked
    if (mesh.userData && mesh.userData.collider) {
      try {
        mesh.userData.collider.position.set(mesh.position.x, mesh.position.y + (mesh.userData.colliderOffsetY || offsetY), mesh.position.z);
        if (typeof mesh.userData.collider.updateMatrixWorld === 'function') mesh.userData.collider.updateMatrixWorld(true);
      } catch (e) {
        // ignore
      }
    }
  }
}

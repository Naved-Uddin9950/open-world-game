// ============================================================
// waypointSystem.js — Mission target waypoint & distance HUD
// ============================================================
// When a guild mission is accepted, shows a 3D marker at the
// nearest matching target + HUD distance/direction indicator.
// Hunt missions: point to nearest matching creature.
// Gather missions: point to nearest matching resource node.
// ============================================================
import * as THREE from 'three';

/**
 * WaypointSystem — manages a single active mission waypoint.
 */
export class WaypointSystem {
  /**
   * @param {THREE.Scene} scene
   * @param {THREE.PerspectiveCamera} camera
   */
  constructor(scene, camera) {
    this._scene = scene;
    this._camera = camera;

    /** Currently tracked mission (from guildSystem.activeMissions). */
    this._mission = null;

    /** World-space target position. */
    this._targetPos = new THREE.Vector3();
    this._hasTarget = false;

    /** 3D marker mesh. */
    this._marker = null;

    /** Animation phase. */
    this._phase = 0;

    /** Distance in meters (updated every frame). */
    this.distance = 0;

    /** Cardinal direction string. */
    this.direction = '';
  }

  /**
   * Start tracking a mission. Call when a mission is accepted.
   * @param {object} mission - { id, target, type, ... } from guildSystem
   */
  trackMission(mission) {
    this._mission = mission;
    this._hasTarget = false;
    this._removeMarker();
  }

  /** Stop tracking any mission. */
  clearWaypoint() {
    this._mission = null;
    this._hasTarget = false;
    this._removeMarker();
  }

  /** Get tracked mission id. */
  get missionId() {
    return this._mission ? this._mission.id : null;
  }

  /** Whether there's an active waypoint to show. */
  get active() {
    return this._hasTarget;
  }

  /**
   * Update waypoint target position.
   * Called each frame from engine with candidate positions for:
   *  - nearest creature of target type (for hunt missions)
   *  - nearest resource of target type (for gather missions)
   *
   * @param {number} dt
   * @param {THREE.Vector3} playerPos
   * @param {{ creatures: Array, resources: Array }} candidates
   *   creatures: [{ type, position: { x, y, z } }]
   *   resources: [{ type, x, z, y? }]
   */
  update(dt, playerPos, candidates) {
    if (!this._mission) {
      this._hasTarget = false;
      return;
    }

    const target = this._mission.target;
    let bestPos = null;
    let bestDist = Infinity;

    // Search creatures
    if (candidates.creatures) {
      for (const c of candidates.creatures) {
        if (c.type === target || c.creatureType === target) {
          const pos = c.position || (c.mesh ? c.mesh.position : null);
          if (!pos) continue;
          const dx = pos.x - playerPos.x;
          const dz = pos.z - playerPos.z;
          const d = Math.sqrt(dx * dx + dz * dz);
          if (d < bestDist) {
            bestDist = d;
            bestPos = new THREE.Vector3(pos.x, pos.y || playerPos.y, pos.z);
          }
        }
      }
    }

    // Search resources
    if (candidates.resources) {
      for (const r of candidates.resources) {
        if (r.type === target) {
          const dx = r.x - playerPos.x;
          const dz = r.z - playerPos.z;
          const d = Math.sqrt(dx * dx + dz * dz);
          if (d < bestDist) {
            bestDist = d;
            bestPos = new THREE.Vector3(r.x, r.y || playerPos.y, r.z);
          }
        }
      }
    }

    if (bestPos) {
      this._targetPos.copy(bestPos);
      this._hasTarget = true;
      this.distance = bestDist;
      this.direction = this._getCardinal(playerPos, this._targetPos);
      this._ensureMarker();
      this._updateMarker(dt, playerPos);
    } else {
      this._hasTarget = false;
      this._removeMarker();
    }
  }

  /**
   * Get HUD display text for the waypoint.
   */
  getHUDText() {
    if (!this._hasTarget || !this._mission) return '';
    const d = this.distance < 1000
      ? `${Math.round(this.distance)}m`
      : `${(this.distance / 1000).toFixed(1)}km`;
    return `\u{1F3AF} ${this._mission.title || this._mission.target} — ${d} ${this.direction}`;
  }

  // ── Private ───────────────────────────────────────────

  _getCardinal(from, to) {
    const dx = to.x - from.x;
    const dz = to.z - from.z;
    const angle = Math.atan2(dx, dz) * (180 / Math.PI);

    // Normalize to 0-360
    const a = ((angle % 360) + 360) % 360;

    if (a >= 337.5 || a < 22.5)   return 'N';
    if (a >= 22.5 && a < 67.5)    return 'NE';
    if (a >= 67.5 && a < 112.5)   return 'E';
    if (a >= 112.5 && a < 157.5)  return 'SE';
    if (a >= 157.5 && a < 202.5)  return 'S';
    if (a >= 202.5 && a < 247.5)  return 'SW';
    if (a >= 247.5 && a < 292.5)  return 'W';
    return 'NW';
  }

  _ensureMarker() {
    if (this._marker) return;

    const g = new THREE.Group();
    g.name = 'waypointMarker';

    // Vertical beam
    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.05, 8, 6),
      new THREE.MeshBasicMaterial({ color: '#ffcc33', transparent: true, opacity: 0.35 })
    );
    beam.position.y = 4;
    g.add(beam);

    // Diamond at top
    const diamond = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.4, 0),
      new THREE.MeshBasicMaterial({ color: '#ffaa00', transparent: true, opacity: 0.7 })
    );
    diamond.position.y = 8.5;
    g.add(diamond);

    // Ring at ground
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.8, 0.08, 8, 24),
      new THREE.MeshBasicMaterial({ color: '#ffcc33', transparent: true, opacity: 0.4 })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.1;
    g.add(ring);

    this._marker = g;
    this._scene.add(g);
  }

  _removeMarker() {
    if (this._marker) {
      this._scene.remove(this._marker);
      this._marker = null;
    }
  }

  _updateMarker(dt, playerPos) {
    if (!this._marker) return;

    this._marker.position.copy(this._targetPos);

    // Animate: rotate diamond, pulse ring
    this._phase += dt * 2;
    const diamond = this._marker.children[1];
    if (diamond) diamond.rotation.y = this._phase;

    const ring = this._marker.children[2];
    if (ring) {
      const scale = 1 + Math.sin(this._phase * 1.5) * 0.15;
      ring.scale.set(scale, scale, 1);
    }

    // Fade marker when very close
    const dist = this.distance;
    const opacity = dist < 5 ? dist / 5 : 1;
    this._marker.children.forEach(c => {
      if (c.material) c.material.opacity = opacity * 0.5;
    });
  }

  dispose() {
    this._removeMarker();
    this._mission = null;
  }
}

// ============================================================
// gatheringSystem.js — In-world resource gathering
// ============================================================
// Spawns 3D resource objects (herbs, wood, stone, mushrooms)
// near the player. Player presses E/F to gather when close.
// Reports progress to guildSystem for mission tracking,
// and adds items to inventory.
// ============================================================
import * as THREE from 'three';

/**
 * Resource type visual definitions.
 */
const RESOURCE_VISUALS = {
  herb: {
    label: 'Herb',
    color: '#44bb44',
    buildMesh: (S) => {
      const g = new THREE.Group();
      // Stem
      const stem = new THREE.Mesh(
        new THREE.CylinderGeometry(0.02 * S, 0.03 * S, 0.3 * S, 6),
        new THREE.MeshLambertMaterial({ color: '#228822' })
      );
      stem.position.y = 0.15 * S;
      g.add(stem);
      // Leaves (3 small spheres)
      for (let i = 0; i < 3; i++) {
        const leaf = new THREE.Mesh(
          new THREE.SphereGeometry(0.08 * S, 6, 6),
          new THREE.MeshLambertMaterial({ color: '#44bb44' })
        );
        const a = (i / 3) * Math.PI * 2;
        leaf.position.set(Math.sin(a) * 0.06 * S, 0.28 * S + i * 0.03, Math.cos(a) * 0.06 * S);
        leaf.scale.set(1, 0.6, 1);
        g.add(leaf);
      }
      // Flower bud on top
      const bud = new THREE.Mesh(
        new THREE.SphereGeometry(0.04 * S, 6, 6),
        new THREE.MeshLambertMaterial({ color: '#ff88aa' })
      );
      bud.position.y = 0.38 * S;
      g.add(bud);
      return g;
    },
  },
  wood: {
    label: 'Wood',
    color: '#8B6D4C',
    buildMesh: (S) => {
      const g = new THREE.Group();
      // Log
      const log = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08 * S, 0.1 * S, 0.6 * S, 8),
        new THREE.MeshLambertMaterial({ color: '#8B6D4C' })
      );
      log.rotation.z = Math.PI / 2;
      log.position.y = 0.1 * S;
      g.add(log);
      // Rings on cut face
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.03 * S, 0.07 * S, 8),
        new THREE.MeshLambertMaterial({ color: '#A88060', side: THREE.DoubleSide })
      );
      ring.position.set(0.3 * S, 0.1 * S, 0);
      ring.rotation.y = Math.PI / 2;
      g.add(ring);
      return g;
    },
  },
  stone: {
    label: 'Stone',
    color: '#999999',
    buildMesh: (S) => {
      const g = new THREE.Group();
      const rock = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.15 * S, 0),
        new THREE.MeshLambertMaterial({ color: '#888888' })
      );
      rock.position.y = 0.12 * S;
      rock.scale.set(1, 0.7, 1);
      g.add(rock);
      // Small rocks around
      for (let i = 0; i < 3; i++) {
        const sm = new THREE.Mesh(
          new THREE.DodecahedronGeometry(0.06 * S, 0),
          new THREE.MeshLambertMaterial({ color: '#777777' })
        );
        const a = (i / 3) * Math.PI * 2 + 0.5;
        sm.position.set(Math.sin(a) * 0.18 * S, 0.04 * S, Math.cos(a) * 0.18 * S);
        g.add(sm);
      }
      return g;
    },
  },
  mushroom: {
    label: 'Mushroom',
    color: '#cc6644',
    buildMesh: (S) => {
      const g = new THREE.Group();
      // Stem
      const stem = new THREE.Mesh(
        new THREE.CylinderGeometry(0.025 * S, 0.03 * S, 0.12 * S, 6),
        new THREE.MeshLambertMaterial({ color: '#eeeecc' })
      );
      stem.position.y = 0.06 * S;
      g.add(stem);
      // Cap
      const cap = new THREE.Mesh(
        new THREE.SphereGeometry(0.08 * S, 8, 6, 0, Math.PI * 2, 0, Math.PI * 0.5),
        new THREE.MeshLambertMaterial({ color: '#cc4422' })
      );
      cap.position.y = 0.13 * S;
      g.add(cap);
      // Spots on cap
      for (let i = 0; i < 4; i++) {
        const spot = new THREE.Mesh(
          new THREE.CircleGeometry(0.015 * S, 6),
          new THREE.MeshLambertMaterial({ color: '#ffffff', side: THREE.DoubleSide })
        );
        const a = (i / 4) * Math.PI * 2;
        spot.position.set(
          Math.sin(a) * 0.05 * S,
          0.16 * S,
          Math.cos(a) * 0.05 * S
        );
        spot.lookAt(0, 0.3, 0);
        g.add(spot);
      }
      return g;
    },
  },
  // Generic fallback for unknown types (darkWood, obsidian, etc.)
  _default: {
    label: 'Resource',
    color: '#aaaaaa',
    buildMesh: (S) => {
      const g = new THREE.Group();
      const cube = new THREE.Mesh(
        new THREE.BoxGeometry(0.2 * S, 0.2 * S, 0.2 * S),
        new THREE.MeshLambertMaterial({ color: '#aaaaaa' })
      );
      cube.position.y = 0.1 * S;
      g.add(cube);
      // Floating sparkle indicator
      const sparkle = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.04 * S, 0),
        new THREE.MeshLambertMaterial({ color: '#ffff88', emissive: '#ffff44', emissiveIntensity: 0.5 })
      );
      sparkle.position.y = 0.35 * S;
      g.add(sparkle);
      return g;
    },
  },
};

/**
 * Gathering system — manages resource nodes as 3D objects.
 */
export class GatheringSystem {
  /**
   * @param {THREE.Scene} scene
   * @param {object} worldManager - for getHeightAt()
   */
  constructor(scene, worldManager) {
    this._scene = scene;
    this._worldManager = worldManager;

    /** @type {Map<string, object>} key → { mesh, type, x, z, respawnTimer } */
    this._activeNodes = new Map();

    /** @type {Map<string, number>} key → remaining respawn time */
    this._respawnTimers = new Map();

    /** Gather interaction range (meters). */
    this.gatherRange = 3.0;

    /** Time to respawn a gathered node (seconds). */
    this.respawnTime = 60;

    /** Maximum active nodes in the scene at once. */
    this.maxNodes = 60;

    /** Spawn radius around the player (meters). */
    this.spawnRadius = 80;

    /** Despawn radius (nodes further than this are removed). */
    this.despawnRadius = 120;

    /** Callbacks set by engine. */
    this._onGather = null; // (type, count) => void
  }

  setGatherCallback(fn) { this._onGather = fn; }

  /**
   * Spawn resource nodes around the player based on worldGenerator data or procedural placement.
   * @param {THREE.Vector3} playerPos
   * @param {object[]} [resourceData] - from worldGenerator.getResourceNodesNear()
   */
  spawnNearPlayer(playerPos, resourceData) {
    if (!resourceData || resourceData.length === 0) {
      // Procedural fallback: generate some around the player
      resourceData = this._proceduralResources(playerPos);
    }

    for (const node of resourceData) {
      const key = `${Math.round(node.x)}_${Math.round(node.z)}_${node.type}`;

      // Skip if already active or on respawn cooldown
      if (this._activeNodes.has(key)) continue;
      if (this._respawnTimers.has(key)) continue;

      // Max cap
      if (this._activeNodes.size >= this.maxNodes) break;

      // Distance check
      const dx = node.x - playerPos.x;
      const dz = node.z - playerPos.z;
      if (dx * dx + dz * dz > this.spawnRadius * this.spawnRadius) continue;

      this._spawnNode(key, node.type, node.x, node.z);
    }
  }

  /**
   * Spawn a single resource node mesh.
   */
  _spawnNode(key, type, x, z) {
    const visual = RESOURCE_VISUALS[type] || RESOURCE_VISUALS._default;
    const mesh = visual.buildMesh(1.0);
    mesh.name = 'resource_' + key;

    const y = this._worldManager.getHeightAt(x, z);
    mesh.position.set(x, y, z);

    // Add a floating label/glow
    const glow = new THREE.Mesh(
      new THREE.SphereGeometry(0.06, 6, 6),
      new THREE.MeshBasicMaterial({ color: visual.color, transparent: true, opacity: 0.4 })
    );
    glow.position.y = 0.5;
    mesh.add(glow);

    this._scene.add(mesh);
    this._activeNodes.set(key, {
      mesh,
      type,
      label: visual.label,
      x, z,
      glow,
    });
  }

  /**
   * Remove nodes too far from player.
   */
  _despawnFar(playerPos) {
    const r2 = this.despawnRadius * this.despawnRadius;
    for (const [key, nd] of this._activeNodes) {
      const dx = nd.x - playerPos.x;
      const dz = nd.z - playerPos.z;
      if (dx * dx + dz * dz > r2) {
        this._scene.remove(nd.mesh);
        this._activeNodes.delete(key);
      }
    }
  }

  /**
   * Get the closest gatherable node to the player within range.
   * @param {THREE.Vector3} playerPos
   * @returns {{ key: string, data: object, dist: number } | null}
   */
  getClosestNode(playerPos) {
    let closest = null;
    let bestDist = this.gatherRange * this.gatherRange;

    for (const [key, nd] of this._activeNodes) {
      const dx = nd.x - playerPos.x;
      const dz = nd.z - playerPos.z;
      const d2 = dx * dx + dz * dz;
      if (d2 < bestDist) {
        bestDist = d2;
        closest = { key, data: nd, dist: Math.sqrt(d2) };
      }
    }
    return closest;
  }

  /**
   * Gather a resource node. Removes it from the world and starts respawn timer.
   * @param {string} key
   * @returns {{ type: string, label: string } | null}
   */
  gather(key) {
    const nd = this._activeNodes.get(key);
    if (!nd) return null;

    // Remove mesh from scene
    this._scene.remove(nd.mesh);
    this._activeNodes.delete(key);

    // Start respawn timer
    this._respawnTimers.set(key, this.respawnTime);

    // Fire callback
    if (this._onGather) this._onGather(nd.type, 1);

    return { type: nd.type, label: nd.label };
  }

  /**
   * Update per frame. Ticks respawn timers, manages despawning.
   * @param {number} dt
   * @param {THREE.Vector3} playerPos
   * @param {object[]} [resourceData]
   */
  update(dt, playerPos, resourceData) {
    // Tick respawn timers
    for (const [key, t] of this._respawnTimers) {
      const remaining = t - dt;
      if (remaining <= 0) {
        this._respawnTimers.delete(key);
      } else {
        this._respawnTimers.set(key, remaining);
      }
    }

    // Despawn far nodes
    this._despawnFar(playerPos);

    // Spawn new nodes near player
    this.spawnNearPlayer(playerPos, resourceData);

    // Animate glow on active nodes (pulse)
    const pulse = 0.3 + Math.sin(Date.now() * 0.003) * 0.15;
    for (const [, nd] of this._activeNodes) {
      if (nd.glow) nd.glow.material.opacity = pulse;
    }
  }

  /**
   * Procedural resource generation when no worldGenerator data.
   * Generates herbs, stones, mushrooms, and wood near player.
   */
  _proceduralResources(playerPos) {
    const nodes = [];
    const types = ['herb', 'wood', 'stone', 'mushroom'];
    const count = 20;

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 10 + Math.random() * (this.spawnRadius - 15);
      nodes.push({
        x: playerPos.x + Math.cos(angle) * dist,
        z: playerPos.z + Math.sin(angle) * dist,
        type: types[Math.floor(Math.random() * types.length)],
      });
    }
    return nodes;
  }

  /**
   * Get all active resources of a specific type within a radius.
   * Used for waypoint targeting.
   */
  getNodesOfType(type, playerPos, radius) {
    const results = [];
    const r2 = radius * radius;
    for (const [key, nd] of this._activeNodes) {
      if (type && nd.type !== type) continue;
      const dx = nd.x - playerPos.x;
      const dz = nd.z - playerPos.z;
      const d2 = dx * dx + dz * dz;
      if (d2 <= r2) {
        results.push({ key, ...nd, dist: Math.sqrt(d2) });
      }
    }
    results.sort((a, b) => a.dist - b.dist);
    return results;
  }

  dispose() {
    for (const [, nd] of this._activeNodes) {
      this._scene.remove(nd.mesh);
    }
    this._activeNodes.clear();
    this._respawnTimers.clear();
  }
}

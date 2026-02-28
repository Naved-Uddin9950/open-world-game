// ============================================================
// perception.js — Sensory system for animals
// ============================================================
import * as THREE from 'three';

/**
 * Perception system — provides threat/food/interest scoring
 * for an animal based on nearby entities.
 */
export class Perception {
  /**
   * @param {object} config
   * @param {number} config.visionRange   Max detection distance
   * @param {number} config.visionAngle   Half-angle of vision cone (radians), PI = 360°
   * @param {string[]} config.predators   Species that are threats
   * @param {string[]} config.prey        Species this animal can eat
   * @param {string[]} config.same        Same species for social behavior
   */
  constructor(config = {}) {
    this.visionRange = config.visionRange || 40;
    this.visionAngle = config.visionAngle || Math.PI; // default: 180° half = full 360°
    this.predators = config.predators || [];
    this.prey = config.prey || [];
    this.same = config.same || [];

    // Cached results (refreshed each scan)
    this.nearbyEntities = [];
    this.threats = [];
    this.food = [];
    this.allies = [];
    this.nearestThreat = null;
    this.nearestFood = null;
    this.nearestAlly = null;
    this.playerEntity = null;
    this.playerDistance = Infinity;
  }

  /**
   * Scan the world for entities within range.
   * @param {THREE.Vector3} myPos       This animal's position
   * @param {THREE.Vector3} myForward   This animal's forward direction (normalized)
   * @param {Array} allEntities         Array of { mesh, type, position, userData }
   * @param {THREE.Vector3|null} playerPos  Player position
   * @param {string} myType             This animal's species
   * @param {THREE.Mesh} myMesh         This animal's mesh (to exclude self)
   */
  scan(myPos, myForward, allEntities, playerPos, myType, myMesh) {
    this.nearbyEntities = [];
    this.threats = [];
    this.food = [];
    this.allies = [];
    this.nearestThreat = null;
    this.nearestFood = null;
    this.nearestAlly = null;
    this.playerEntity = null;
    this.playerDistance = Infinity;

    // Player as entity
    if (playerPos) {
      const dist = myPos.distanceTo(playerPos);
      this.playerDistance = dist;
      if (dist <= this.visionRange) {
        const entity = {
          type: 'player',
          position: playerPos.clone(),
          distance: dist,
          mesh: null,
          userData: {},
        };
        this.playerEntity = entity;
        this.nearbyEntities.push(entity);

        // Player is treated as predator only if in predators list
        if (this.predators.includes('player')) {
          this.threats.push(entity);
        }
      }
    }

    // Other animals
    for (const e of allEntities) {
      if (e.mesh === myMesh) continue;
      const dist = myPos.distanceTo(e.position);
      if (dist > this.visionRange) continue;

      const entity = {
        type: e.type,
        position: e.position.clone(),
        distance: dist,
        mesh: e.mesh,
        userData: e.userData || {},
      };

      this.nearbyEntities.push(entity);

      if (this.predators.includes(e.type)) {
        this.threats.push(entity);
      }
      if (this.prey.includes(e.type)) {
        this.food.push(entity);
      }
      if (e.type === myType && e.mesh !== myMesh) {
        this.allies.push(entity);
      }
    }

    // Sort and pick nearest
    this.threats.sort((a, b) => a.distance - b.distance);
    this.food.sort((a, b) => a.distance - b.distance);
    this.allies.sort((a, b) => a.distance - b.distance);

    this.nearestThreat = this.threats[0] || null;
    this.nearestFood = this.food[0] || null;
    this.nearestAlly = this.allies[0] || null;
  }

  /**
   * Calculate a threat score for an entity (0 = no threat, 1 = max threat).
   * @param {{ type: string, distance: number }} entity
   * @param {object} needs  { hunger, energy, health }
   * @returns {number}
   */
  calculateThreatScore(entity, needs = {}) {
    if (!entity) return 0;
    const isPredator = this.predators.includes(entity.type);
    if (!isPredator) return 0;

    // Closer = more threatening, scaled by vision range
    const proximity = 1.0 - Math.min(entity.distance / this.visionRange, 1.0);

    // Low health = more scared
    const healthFactor = needs.health !== undefined ? (1.0 - needs.health) * 0.3 : 0;

    return Math.min(1.0, proximity * 0.8 + healthFactor + 0.1);
  }

  /**
   * Calculate a food score for an entity (0 = no interest, 1 = max interest).
   * @param {{ type: string, distance: number }} entity
   * @param {object} needs  { hunger }
   * @returns {number}
   */
  calculateFoodScore(entity, needs = {}) {
    if (!entity) return 0;
    const isPrey = this.prey.includes(entity.type);
    if (!isPrey) return 0;

    const proximity = 1.0 - Math.min(entity.distance / this.visionRange, 1.0);
    const hungerFactor = needs.hunger !== undefined ? needs.hunger : 0.5;

    return Math.min(1.0, proximity * 0.5 + hungerFactor * 0.5);
  }

  /**
   * Calculate interest score for socializing.
   * @param {{ type: string, distance: number }} entity
   * @param {object} needs
   * @returns {number}
   */
  calculateInterestScore(entity, needs = {}) {
    if (!entity) return 0;
    const proximity = 1.0 - Math.min(entity.distance / this.visionRange, 1.0);
    return proximity * 0.6;
  }
}

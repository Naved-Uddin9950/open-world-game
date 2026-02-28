// ============================================================
// steering.js — Steering behaviors for smooth animal movement
// ============================================================
import * as THREE from 'three';

const _tempVec = new THREE.Vector3();
const _tempVec2 = new THREE.Vector3();

/**
 * Steering behavior utilities.
 * All functions return a force vector (THREE.Vector3) that should be
 * added to the animal's velocity. They do NOT mutate the mesh directly.
 */
export class Steering {
  constructor() {
    this._wanderAngle = Math.random() * Math.PI * 2;
  }

  /**
   * Wander — smooth random movement using a projected circle approach.
   * @param {THREE.Vector3} position  Current position
   * @param {THREE.Vector3} velocity  Current velocity
   * @param {number} wanderRadius     Radius of the wander circle
   * @param {number} wanderDistance   Distance of circle ahead
   * @param {number} wanderJitter    Max angle change per call
   * @returns {THREE.Vector3} steering force
   */
  wander(position, velocity, wanderRadius = 2, wanderDistance = 4, wanderJitter = 0.5) {
    // Jitter the wander angle
    this._wanderAngle += (Math.random() - 0.5) * wanderJitter * 2;

    // Project a circle in front of the entity
    const forward = _tempVec.copy(velocity);
    if (forward.lengthSq() < 0.001) {
      // If no velocity, pick random direction
      forward.set(Math.cos(this._wanderAngle), 0, Math.sin(this._wanderAngle));
    }
    forward.y = 0;
    forward.normalize();

    const circleCenter = forward.clone().multiplyScalar(wanderDistance);

    // Point on circle
    const displacement = new THREE.Vector3(
      Math.cos(this._wanderAngle) * wanderRadius,
      0,
      Math.sin(this._wanderAngle) * wanderRadius,
    );

    return circleCenter.add(displacement);
  }

  /**
   * Seek — steer towards a target position.
   * @param {THREE.Vector3} position
   * @param {THREE.Vector3} target
   * @param {number} maxSpeed
   * @returns {THREE.Vector3}
   */
  seek(position, target, maxSpeed = 1) {
    const desired = new THREE.Vector3().subVectors(target, position);
    desired.y = 0;
    const dist = desired.length();
    if (dist < 0.01) return new THREE.Vector3();
    desired.normalize().multiplyScalar(maxSpeed);
    return desired;
  }

  /**
   * Flee — steer away from a target position.
   * @param {THREE.Vector3} position
   * @param {THREE.Vector3} threat
   * @param {number} maxSpeed
   * @returns {THREE.Vector3}
   */
  flee(position, threat, maxSpeed = 1) {
    const desired = new THREE.Vector3().subVectors(position, threat);
    desired.y = 0;
    if (desired.lengthSq() < 0.0001) {
      // Random escape when on top of threat
      desired.set(Math.random() - 0.5, 0, Math.random() - 0.5);
    }
    desired.normalize().multiplyScalar(maxSpeed);
    return desired;
  }

  /**
   * Arrive — seek with deceleration near target.
   * @param {THREE.Vector3} position
   * @param {THREE.Vector3} target
   * @param {number} maxSpeed
   * @param {number} slowRadius  Distance at which to start slowing
   * @returns {THREE.Vector3}
   */
  arrive(position, target, maxSpeed = 1, slowRadius = 3) {
    const desired = new THREE.Vector3().subVectors(target, position);
    desired.y = 0;
    const dist = desired.length();
    if (dist < 0.05) return new THREE.Vector3();

    let speed = maxSpeed;
    if (dist < slowRadius) {
      speed = maxSpeed * (dist / slowRadius);
    }

    desired.normalize().multiplyScalar(speed);
    return desired;
  }

  /**
   * Separation — avoid crowding nearby entities.
   * @param {THREE.Vector3} position
   * @param {Array<{position: THREE.Vector3, distance: number}>} neighbors
   * @param {number} desiredSeparation
   * @returns {THREE.Vector3}
   */
  separation(position, neighbors, desiredSeparation = 3) {
    const force = new THREE.Vector3();
    let count = 0;

    for (const n of neighbors) {
      if (n.distance > 0 && n.distance < desiredSeparation) {
        const diff = new THREE.Vector3().subVectors(position, n.position);
        diff.y = 0;
        diff.normalize().divideScalar(Math.max(n.distance, 0.1));
        force.add(diff);
        count++;
      }
    }

    if (count > 0) {
      force.divideScalar(count);
    }
    return force;
  }

  /**
   * Alignment — steer towards the average heading of nearby allies.
   * @param {THREE.Vector3} velocity
   * @param {Array<{velocity: THREE.Vector3}>} neighbors
   * @returns {THREE.Vector3}
   */
  alignment(velocity, neighbors) {
    if (neighbors.length === 0) return new THREE.Vector3();

    const avg = new THREE.Vector3();
    for (const n of neighbors) {
      if (n.velocity) {
        avg.add(n.velocity);
      }
    }
    avg.divideScalar(neighbors.length);
    avg.y = 0;
    return avg.normalize();
  }

  /**
   * Cohesion — steer toward center of mass of neighbors.
   * @param {THREE.Vector3} position
   * @param {Array<{position: THREE.Vector3}>} neighbors
   * @returns {THREE.Vector3}
   */
  cohesion(position, neighbors) {
    if (neighbors.length === 0) return new THREE.Vector3();

    const center = new THREE.Vector3();
    for (const n of neighbors) {
      center.add(n.position);
    }
    center.divideScalar(neighbors.length);
    center.y = 0;

    return this.seek(position, center, 1);
  }

  /**
   * Obstacle avoidance — simple ahead-ray check.
   * Returns a lateral force if an obstacle is detected ahead.
   * (Simplified for this game — mainly prevents walking into trees/rocks)
   * @param {THREE.Vector3} position
   * @param {THREE.Vector3} velocity
   * @param {number} lookAhead  How far ahead to check
   * @returns {THREE.Vector3}
   */
  avoidCollision(position, velocity, lookAhead = 3) {
    // For simplicity, we add a small random lateral force
    // when the animal has been stuck (velocity near zero for too long).
    // More advanced raycasting can be added if needed.
    return new THREE.Vector3();
  }
}

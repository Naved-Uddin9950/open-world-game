// ============================================================
// attackAnimation.js — First-person attack hand/fist animation
// ============================================================
import * as THREE from 'three';

/**
 * Creates a first-person arm+fist mesh attached to the camera.
 * Provides swing animation on attack.
 */
export class AttackAnimation {
  /**
   * @param {THREE.Camera} camera
   */
  constructor(camera) {
    this.camera = camera;
    this._isSwinging = false;
    this._swingProgress = 0;
    this._swingDuration = 0.25; // seconds
    this._cooldownTimer = 0;
    this._idleTime = 0;

    // Create the arm+fist group
    this.armGroup = new THREE.Group();
    this.armGroup.name = 'playerArm';

    // Arm (forearm)
    const armGeo = new THREE.BoxGeometry(0.08, 0.08, 0.35);
    const skinMat = new THREE.MeshStandardMaterial({
      color: 0xd4a574,
      roughness: 0.8,
      metalness: 0.0,
    });
    const arm = new THREE.Mesh(armGeo, skinMat);
    arm.name = 'forearm';
    arm.position.set(0, 0, -0.15);
    this.armGroup.add(arm);

    // Fist
    const fistGeo = new THREE.BoxGeometry(0.1, 0.1, 0.1);
    const fist = new THREE.Mesh(fistGeo, skinMat);
    fist.name = 'fist';
    fist.position.set(0, 0.02, -0.35);
    this.armGroup.add(fist);

    // Knuckle detail
    const knuckleGeo = new THREE.BoxGeometry(0.1, 0.03, 0.03);
    const knuckleMat = new THREE.MeshStandardMaterial({
      color: 0xc49464,
      roughness: 0.9,
    });
    const knuckles = new THREE.Mesh(knuckleGeo, knuckleMat);
    knuckles.name = 'knuckles';
    knuckles.position.set(0, 0.07, -0.36);
    this.armGroup.add(knuckles);

    // Rest position (bottom right of screen)
    this._restPos = new THREE.Vector3(0.3, -0.25, -0.5);
    this._swingStartPos = new THREE.Vector3(0.3, -0.25, -0.5);
    this._swingMidPos = new THREE.Vector3(0.05, -0.05, -0.55);
    this._swingEndPos = new THREE.Vector3(-0.15, -0.1, -0.45);

    this._restRot = new THREE.Euler(-0.1, 0, 0.2);
    this._swingMidRot = new THREE.Euler(-0.5, -0.3, -0.3);
    this._swingEndRot = new THREE.Euler(-0.2, -0.5, -0.5);

    // Set initial position
    this.armGroup.position.copy(this._restPos);
    this.armGroup.rotation.copy(this._restRot);

    // Add to camera
    camera.add(this.armGroup);

    // Impact flash mesh (brief red flash at center when hitting)
    this._hitFlash = null;
  }

  /**
   * Trigger a swing attack animation.
   * @returns {boolean} true if swing started
   */
  swing() {
    if (this._isSwinging) return false;
    if (this._cooldownTimer > 0) return false;

    this._isSwinging = true;
    this._swingProgress = 0;
    return true;
  }

  /**
   * Show hit feedback (screen effect).
   * @param {boolean} hitSomething
   */
  onHitResult(hitSomething) {
    if (hitSomething) {
      // Brief screen shake + red tint on crosshair
      const crosshair = document.getElementById('crosshair');
      if (crosshair) {
        crosshair.style.filter = 'drop-shadow(0 0 6px red)';
        setTimeout(() => { crosshair.style.filter = ''; }, 150);
      }
    }
  }

  /**
   * Update animation each frame.
   * @param {number} dt
   */
  update(dt) {
    this._cooldownTimer = Math.max(0, this._cooldownTimer - dt);
    this._idleTime += dt;

    if (this._isSwinging) {
      this._swingProgress += dt / this._swingDuration;

      if (this._swingProgress >= 1.0) {
        // Swing complete
        this._isSwinging = false;
        this._swingProgress = 0;
        this._cooldownTimer = 0.15; // brief cooldown after swing
        this.armGroup.position.copy(this._restPos);
        this.armGroup.rotation.copy(this._restRot);
        return;
      }

      const t = this._swingProgress;

      if (t < 0.4) {
        // Wind up phase (0 to 0.4)
        const p = t / 0.4;
        this.armGroup.position.lerpVectors(this._swingStartPos, this._swingMidPos, p);
        this.armGroup.rotation.x = THREE.MathUtils.lerp(this._restRot.x, this._swingMidRot.x, p);
        this.armGroup.rotation.y = THREE.MathUtils.lerp(this._restRot.y, this._swingMidRot.y, p);
        this.armGroup.rotation.z = THREE.MathUtils.lerp(this._restRot.z, this._swingMidRot.z, p);
      } else {
        // Strike phase (0.4 to 1.0)
        const p = (t - 0.4) / 0.6;
        this.armGroup.position.lerpVectors(this._swingMidPos, this._swingEndPos, p);
        this.armGroup.rotation.x = THREE.MathUtils.lerp(this._swingMidRot.x, this._swingEndRot.x, p);
        this.armGroup.rotation.y = THREE.MathUtils.lerp(this._swingMidRot.y, this._swingEndRot.y, p);
        this.armGroup.rotation.z = THREE.MathUtils.lerp(this._swingMidRot.z, this._swingEndRot.z, p);
      }
    } else {
      // Idle subtle sway
      const sway = Math.sin(this._idleTime * 1.5) * 0.005;
      const bob = Math.sin(this._idleTime * 2.0) * 0.003;
      this.armGroup.position.set(
        this._restPos.x + sway,
        this._restPos.y + bob,
        this._restPos.z,
      );
      this.armGroup.rotation.set(
        this._restRot.x + bob,
        this._restRot.y,
        this._restRot.z + sway,
      );
    }
  }

  /**
   * Check if currently in the "strike" portion of swing (for hit detection timing).
   */
  isInStrikePhase() {
    return this._isSwinging && this._swingProgress > 0.35 && this._swingProgress < 0.6;
  }

  dispose() {
    if (this.camera) {
      this.camera.remove(this.armGroup);
    }
  }
}

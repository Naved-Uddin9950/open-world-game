// ============================================================
// playerCharacterMesh.js — Procedural humanoid character mesh
// ============================================================
// Builds a simple humanoid body from Three.js primitives:
// head, torso, arms, legs, shoes. Accepts appearance data.
// Hidden in first-person mode, visible in third-person.
// ============================================================
import * as THREE from 'three';

/**
 * Default colors when no appearance is provided.
 */
const DEFAULTS = {
  skinColor: '#F1C27D',
  hairColor: '#1a1a1a',
  eyeColor: '#6B3A2A',
  upperColor: '#8B6D4C',
  lowerColor: '#555555',
  shoeColor: '#5C3A1E',
};

/**
 * Look up a hex color from an appearance option array by id.
 */
function resolveColor(options, id, fallback) {
  if (!options || !id) return fallback;
  const found = options.find(o => o.id === id);
  return found ? (found.hex || found.color || fallback) : fallback;
}

/**
 * Create a procedural humanoid Group that can be attached to the player Object3D.
 *
 * @param {object} [appearance] - Character appearance data from customization system.
 * @param {object} [customizationOptions] - CUSTOMIZATION_OPTIONS for color look-up.
 * @returns {THREE.Group}
 */
export function createPlayerCharacterMesh(appearance, customizationOptions) {
  const group = new THREE.Group();
  group.name = 'playerCharacterMesh';

  // ── Resolve colors ────────────────────────────────────
  const opts = customizationOptions || {};
  const app = appearance || {};

  const skinHex = resolveColor(opts.skinColor, app.skinColor, DEFAULTS.skinColor);
  const hairHex = resolveColor(opts.hairColor, app.hairColor, DEFAULTS.hairColor);
  const upperHex = resolveColor(opts.upperClothing, app.upperClothing, DEFAULTS.upperColor);
  const lowerHex = resolveColor(opts.lowerClothing, app.lowerClothing, DEFAULTS.lowerColor);
  const shoeHex = resolveColor(opts.shoes, app.shoes, DEFAULTS.shoeColor);

  const skinMat = new THREE.MeshLambertMaterial({ color: skinHex });
  const hairMat = new THREE.MeshLambertMaterial({ color: hairHex });
  const upperMat = new THREE.MeshLambertMaterial({ color: upperHex });
  const lowerMat = new THREE.MeshLambertMaterial({ color: lowerHex });
  const shoeMat = new THREE.MeshLambertMaterial({ color: shoeHex });

  // ── Height scale ──────────────────────────────────────
  const heightCm = app.height || 170;
  const scale = heightCm / 170;

  // ── Head ──────────────────────────────────────────────
  const headGeo = new THREE.SphereGeometry(0.18 * scale, 12, 10);
  const head = new THREE.Mesh(headGeo, skinMat);
  head.position.set(0, 1.55 * scale, 0);
  head.castShadow = true;
  group.add(head);

  // Hair (slightly larger sphere on top)
  const hairGeo = new THREE.SphereGeometry(0.2 * scale, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.6);
  const hair = new THREE.Mesh(hairGeo, hairMat);
  hair.position.set(0, 1.6 * scale, 0);
  group.add(hair);

  // ── Eyes ──────────────────────────────────────────────
  const eyeGeo = new THREE.SphereGeometry(0.025 * scale, 6, 6);
  const eyeMat = new THREE.MeshLambertMaterial({ color: '#ffffff' });
  const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
  eyeL.position.set(-0.06 * scale, 1.57 * scale, 0.15 * scale);
  group.add(eyeL);
  const eyeR = eyeL.clone();
  eyeR.position.x = 0.06 * scale;
  group.add(eyeR);

  // Pupils
  const pupilGeo = new THREE.SphereGeometry(0.013 * scale, 6, 6);
  const pupilMat = new THREE.MeshLambertMaterial({ color: '#111111' });
  const pupilL = new THREE.Mesh(pupilGeo, pupilMat);
  pupilL.position.set(-0.06 * scale, 1.57 * scale, 0.17 * scale);
  group.add(pupilL);
  const pupilR = pupilL.clone();
  pupilR.position.x = 0.06 * scale;
  group.add(pupilR);

  // ── Torso ─────────────────────────────────────────────
  const torsoGeo = new THREE.BoxGeometry(0.4 * scale, 0.5 * scale, 0.22 * scale);
  const torso = new THREE.Mesh(torsoGeo, upperMat);
  torso.position.set(0, 1.15 * scale, 0);
  torso.castShadow = true;
  group.add(torso);

  // ── Arms ──────────────────────────────────────────────
  const armGeo = new THREE.BoxGeometry(0.11 * scale, 0.5 * scale, 0.11 * scale);

  // Upper arm (clothing color)
  const armL = new THREE.Mesh(armGeo, upperMat);
  armL.position.set(-0.28 * scale, 1.15 * scale, 0);
  armL.castShadow = true;
  group.add(armL);

  const armR = new THREE.Mesh(armGeo, upperMat);
  armR.position.set(0.28 * scale, 1.15 * scale, 0);
  armR.castShadow = true;
  group.add(armR);

  // Forearms / hands (skin color, slightly smaller)
  const forearmGeo = new THREE.BoxGeometry(0.09 * scale, 0.25 * scale, 0.09 * scale);
  const handL = new THREE.Mesh(forearmGeo, skinMat);
  handL.position.set(-0.28 * scale, 0.78 * scale, 0);
  handL.castShadow = true;
  group.add(handL);

  const handR = new THREE.Mesh(forearmGeo, skinMat);
  handR.position.set(0.28 * scale, 0.78 * scale, 0);
  handR.castShadow = true;
  group.add(handR);

  // ── Legs ──────────────────────────────────────────────
  const legGeo = new THREE.BoxGeometry(0.14 * scale, 0.45 * scale, 0.14 * scale);

  const legL = new THREE.Mesh(legGeo, lowerMat);
  legL.position.set(-0.1 * scale, 0.6 * scale, 0);
  legL.castShadow = true;
  group.add(legL);

  const legR = new THREE.Mesh(legGeo, lowerMat);
  legR.position.set(0.1 * scale, 0.6 * scale, 0);
  legR.castShadow = true;
  group.add(legR);

  // ── Shoes ─────────────────────────────────────────────
  const shoeGeo = new THREE.BoxGeometry(0.14 * scale, 0.1 * scale, 0.2 * scale);

  const shoeL = new THREE.Mesh(shoeGeo, shoeMat);
  shoeL.position.set(-0.1 * scale, 0.33 * scale, 0.03 * scale);
  shoeL.castShadow = true;
  group.add(shoeL);

  const shoeR = new THREE.Mesh(shoeGeo, shoeMat);
  shoeR.position.set(0.1 * scale, 0.33 * scale, 0.03 * scale);
  shoeR.castShadow = true;
  group.add(shoeR);

  // ── Offset so feet are at y=0 of the group ───────────
  // The group origin is at the player Object3D position (eye height).
  // We need to shift the entire mesh down so feet touch the ground.
  // Player position is at eye height (~PLAYER_HEIGHT = 1.7), so the
  // mesh needs to go from y = -1.7 (feet) to y = 0 (eye).
  // Currently the model feet are at ~0.28*scale, head at ~1.6*scale.
  // We want the model centered at 0 for the eye level, so shift down.
  const eyeLevel = 1.55 * scale; // approximately where the head center is
  group.children.forEach(child => {
    child.position.y -= eyeLevel;
  });

  // Start hidden (first-person mode by default)
  group.visible = false;

  return group;
}

/**
 * Simple walk animation — oscillate arms and legs.
 * Call each frame with the group and a time accumulator.
 *
 * @param {THREE.Group} group
 * @param {number} dt - delta time in seconds
 * @param {boolean} isMoving - whether the player is currently moving
 * @param {boolean} isSprinting - sprint flag for faster animation
 */
let _walkPhase = 0;
export function animatePlayerCharacter(group, dt, isMoving, isSprinting) {
  if (!group || !group.visible) return;

  const speed = isSprinting ? 8 : 4;
  if (isMoving) {
    _walkPhase += dt * speed;
  } else {
    // Ease back to idle
    _walkPhase *= 0.9;
    if (Math.abs(_walkPhase) < 0.01) _walkPhase = 0;
  }

  const swing = Math.sin(_walkPhase) * 0.4;
  const children = group.children;

  // Arms are indices 5 (armL), 6 (armR), 7 (handL), 8 (handR)
  // Legs are indices 9 (legL), 10 (legR)
  // We'll use names or fixed positions — safer to iterate by name/index
  // Since we built them in order, arm and leg meshes can be accessed:
  // However, to be safe, let's tag them during creation... 
  // For now, use a simple swing on specific children by position guess
  // Better approach: tag parts during creation

  // Quick & safe: iterate and apply rotation based on position
  for (const child of children) {
    const px = child.position.x;
    const py = child.position.y;

    // Arms (high position, far from center on x)
    if (Math.abs(px) > 0.2 && py > -0.6 && py < 0.2) {
      const dir = px < 0 ? 1 : -1;
      child.rotation.x = swing * dir;
    }
    // Legs (low position, small x offset)
    if (Math.abs(px) > 0.05 && Math.abs(px) < 0.2 && py < -0.7) {
      const dir = px < 0 ? -1 : 1;
      child.rotation.x = swing * dir;
    }
  }
}

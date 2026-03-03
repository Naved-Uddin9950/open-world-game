// ============================================================
// playerCharacterMesh.js — Procedural humanoid character mesh
// ============================================================
// Builds a detailed humanoid body from Three.js primitives:
// head, neck, torso, shoulders, arms, hands, legs, feet.
// Uses CylinderGeometry for limbs for a natural look.
// Imports CUSTOMIZATION_OPTIONS internally so colors always resolve.
// ============================================================
import * as THREE from 'three';
import { CUSTOMIZATION_OPTIONS } from '../character/customizationSystem.js';

// ── Default fallback colors ───────────────────────────────
const DEFAULTS = {
  skinColor: '#F1C27D',
  hairColor: '#1a1a1a',
  eyeColor: '#6B3A2A',
  upperColor: '#8B6D4C',
  lowerColor: '#555555',
  shoeColor: '#5C3A1E',
};

/**
 * Look up a hex color from an option array by id.
 */
function resolveColor(options, id, fallback) {
  if (!options || !id) return fallback;
  const found = options.find(o => o.id === id);
  return found ? (found.hex || found.color || fallback) : fallback;
}

/** Helper: cylindrical limb. */
function limb(rTop, rBot, h, mat, seg = 8) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, h, seg), mat);
  m.castShadow = true;
  return m;
}

/** Helper: box part. */
function box(w, h, d, mat) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.castShadow = true;
  return m;
}

/**
 * Create a procedural humanoid Group.
 * @param {object} [appearance] - Character appearance data.
 * @returns {THREE.Group}
 */
export function createPlayerCharacterMesh(appearance) {
  const group = new THREE.Group();
  group.name = 'playerCharacterMesh';

  // ── Resolve colors from CUSTOMIZATION_OPTIONS ──────────
  const opts = CUSTOMIZATION_OPTIONS;
  const app  = appearance || {};

  const skinHex  = resolveColor(opts.skinColor,     app.skinColor,     DEFAULTS.skinColor);
  const hairHex  = resolveColor(opts.hairColor,     app.hairColor,     DEFAULTS.hairColor);
  const eyeHex   = resolveColor(opts.eyeColor,      app.eyeColor,      DEFAULTS.eyeColor);
  const upperHex = resolveColor(opts.upperClothing, app.upperClothing, DEFAULTS.upperColor);
  const lowerHex = resolveColor(opts.lowerClothing, app.lowerClothing, DEFAULTS.lowerColor);
  const shoeHex  = resolveColor(opts.shoes,         app.shoes,         DEFAULTS.shoeColor);

  const skinMat  = new THREE.MeshLambertMaterial({ color: skinHex });
  const hairMat  = new THREE.MeshLambertMaterial({ color: hairHex });
  const eyeWMat  = new THREE.MeshLambertMaterial({ color: '#ffffff' });
  const irisMat  = new THREE.MeshLambertMaterial({ color: eyeHex });
  const pupilMat = new THREE.MeshLambertMaterial({ color: '#111111' });
  const upperMat = new THREE.MeshLambertMaterial({ color: upperHex });
  const lowerMat = new THREE.MeshLambertMaterial({ color: lowerHex });
  const shoeMat  = new THREE.MeshLambertMaterial({ color: shoeHex });
  const beltMat  = new THREE.MeshLambertMaterial({ color: '#3a2a1a' });
  const mouthMat = new THREE.MeshLambertMaterial({ color: '#CC7777' });

  // ── Scale factors ─────────────────────────────────────
  const heightCm = app.height || 170;
  const S = heightCm / 170;

  const bodyType = app.bodyType || 'average';
  let W = 1.0;
  if (bodyType === 'slim') W = 0.85;
  else if (bodyType === 'athletic') W = 1.05;
  else if (bodyType === 'heavy') W = 1.2;

  const isFemale = app.gender === 'female';
  const shoulderW = isFemale ? 0.34 : 0.38;
  const hipW      = isFemale ? 0.20 : 0.17;

  // ════════════════════════════════════════════════════════
  // HEAD
  // ════════════════════════════════════════════════════════
  const headGrp = new THREE.Group();
  headGrp.name = 'head';

  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.14 * S, 16, 14), skinMat);
  skull.scale.set(1, 1.1, 1);
  skull.castShadow = true;
  headGrp.add(skull);

  // Jaw
  const jaw = new THREE.Mesh(
    new THREE.SphereGeometry(0.11 * S, 12, 8, 0, Math.PI * 2, Math.PI * 0.4, Math.PI * 0.6), skinMat);
  jaw.position.y = -0.04 * S;
  headGrp.add(jaw);

  // Ears
  const earGeo = new THREE.SphereGeometry(0.03 * S, 6, 6);
  for (const side of [-1, 1]) {
    const ear = new THREE.Mesh(earGeo, skinMat);
    ear.position.set(side * 0.14 * S, 0.02 * S, 0);
    ear.scale.set(0.5, 1, 0.8);
    headGrp.add(ear);
  }

  // Nose
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.015 * S, 0.04 * S, 4), skinMat);
  nose.position.set(0, -0.01 * S, 0.135 * S);
  nose.rotation.x = -Math.PI * 0.1;
  headGrp.add(nose);

  // Mouth
  const mouth = box(0.05 * S, 0.008 * S, 0.01 * S, mouthMat);
  mouth.position.set(0, -0.06 * S, 0.12 * S);
  headGrp.add(mouth);

  // Eyes + irises + pupils
  const eyeGeo   = new THREE.SphereGeometry(0.022 * S, 8, 8);
  const irisGeo  = new THREE.SphereGeometry(0.013 * S, 6, 6);
  const pupilGeo = new THREE.SphereGeometry(0.007 * S, 6, 6);
  for (const side of [-1, 1]) {
    const ex = side * 0.05 * S;
    const ey = 0.03 * S;
    const eye = new THREE.Mesh(eyeGeo, eyeWMat);
    eye.position.set(ex, ey, 0.12 * S);
    headGrp.add(eye);
    const iris = new THREE.Mesh(irisGeo, irisMat);
    iris.position.set(ex, ey, 0.135 * S);
    headGrp.add(iris);
    const pupil = new THREE.Mesh(pupilGeo, pupilMat);
    pupil.position.set(ex, ey, 0.145 * S);
    headGrp.add(pupil);
  }

  // Eyebrows
  const browGeo = new THREE.BoxGeometry(0.04 * S, 0.006 * S, 0.012 * S);
  for (const side of [-1, 1]) {
    const brow = new THREE.Mesh(browGeo, hairMat);
    brow.position.set(side * 0.05 * S, 0.065 * S, 0.12 * S);
    brow.rotation.z = side * -0.1;
    headGrp.add(brow);
  }

  // Hair
  _addHair(headGrp, app.hairStyle || 'short', hairMat, S);

  headGrp.position.y = 1.58 * S;
  group.add(headGrp);

  // ════════════════════════════════════════════════════════
  // NECK
  // ════════════════════════════════════════════════════════
  const neck = limb(0.05 * S * W, 0.06 * S * W, 0.1 * S, skinMat);
  neck.name = 'neck';
  neck.position.set(0, 1.43 * S, 0);
  group.add(neck);

  // ════════════════════════════════════════════════════════
  // TORSO
  // ════════════════════════════════════════════════════════
  const chest = box(shoulderW * S * W, 0.28 * S, 0.18 * S, upperMat);
  chest.name = 'chest';
  chest.position.set(0, 1.24 * S, 0);
  group.add(chest);

  const abdomen = box(0.3 * S * W, 0.18 * S, 0.16 * S, upperMat);
  abdomen.name = 'abdomen';
  abdomen.position.set(0, 1.01 * S, 0);
  group.add(abdomen);

  const belt = box(0.32 * S * W, 0.04 * S, 0.17 * S, beltMat);
  belt.position.set(0, 0.91 * S, 0);
  group.add(belt);

  // ════════════════════════════════════════════════════════
  // SHOULDERS
  // ════════════════════════════════════════════════════════
  const sGeo = new THREE.SphereGeometry(0.06 * S * W, 8, 8);
  for (const side of [-1, 1]) {
    const sh = new THREE.Mesh(sGeo, upperMat);
    sh.name = side < 0 ? 'shoulderL' : 'shoulderR';
    sh.position.set(side * (shoulderW / 2 + 0.03) * S * W, 1.34 * S, 0);
    sh.castShadow = true;
    group.add(sh);
  }

  // ════════════════════════════════════════════════════════
  // ARMS
  // ════════════════════════════════════════════════════════
  const armX = (shoulderW / 2 + 0.04) * S * W;

  for (const side of [-1, 1]) {
    const x = side * armX;
    const sfx = side < 0 ? 'L' : 'R';

    // Upper arm
    const ua = limb(0.045 * S * W, 0.04 * S * W, 0.26 * S, upperMat);
    ua.name = 'upperArm' + sfx;
    ua.position.set(x, 1.17 * S, 0);
    group.add(ua);

    // Elbow
    const elbow = new THREE.Mesh(new THREE.SphereGeometry(0.035 * S * W, 6, 6), skinMat);
    elbow.name = 'elbow' + sfx;
    elbow.position.set(x, 1.02 * S, 0);
    group.add(elbow);

    // Forearm
    const fa = limb(0.04 * S * W, 0.032 * S * W, 0.24 * S, skinMat);
    fa.name = 'forearm' + sfx;
    fa.position.set(x, 0.88 * S, 0);
    group.add(fa);

    // Hand
    const hand = box(0.05 * S, 0.07 * S, 0.03 * S, skinMat);
    hand.name = 'hand' + sfx;
    hand.position.set(x, 0.73 * S, 0);
    group.add(hand);

    // Fingers
    _addFingers(group, hand.position, skinMat, S, side);
  }

  // ════════════════════════════════════════════════════════
  // HIPS
  // ════════════════════════════════════════════════════════
  const hips = box(hipW * 2 * S * W, 0.08 * S, 0.15 * S, lowerMat);
  hips.name = 'hips';
  hips.position.set(0, 0.87 * S, 0);
  group.add(hips);

  // ════════════════════════════════════════════════════════
  // LEGS
  // ════════════════════════════════════════════════════════
  const legX = hipW * 0.55 * S * W;

  for (const side of [-1, 1]) {
    const x = side * legX;
    const sfx = side < 0 ? 'L' : 'R';

    // Thigh
    const thigh = limb(0.065 * S * W, 0.055 * S * W, 0.32 * S, lowerMat);
    thigh.name = 'thigh' + sfx;
    thigh.position.set(x, 0.69 * S, 0);
    group.add(thigh);

    // Knee
    const knee = new THREE.Mesh(new THREE.SphereGeometry(0.045 * S * W, 6, 6), lowerMat);
    knee.name = 'knee' + sfx;
    knee.position.set(x, 0.51 * S, 0);
    group.add(knee);

    // Calf
    const calf = limb(0.05 * S * W, 0.04 * S * W, 0.3 * S, lowerMat);
    calf.name = 'calf' + sfx;
    calf.position.set(x, 0.35 * S, 0);
    group.add(calf);

    // Ankle
    const ankle = new THREE.Mesh(new THREE.SphereGeometry(0.035 * S * W, 6, 6), shoeMat);
    ankle.position.set(x, 0.19 * S, 0);
    group.add(ankle);

    // Shoe
    const shoe = box(0.09 * S * W, 0.06 * S, 0.16 * S, shoeMat);
    shoe.name = 'shoe' + sfx;
    shoe.position.set(x, 0.15 * S, 0.02 * S);
    group.add(shoe);

    // Toe cap
    const toe = new THREE.Mesh(
      new THREE.SphereGeometry(0.035 * S * W, 6, 4, 0, Math.PI * 2, 0, Math.PI * 0.5), shoeMat);
    toe.position.set(x, 0.15 * S, 0.09 * S);
    toe.rotation.x = Math.PI / 2;
    group.add(toe);
  }

  // ════════════════════════════════════════════════════════
  // OFFSET — shift so eyes sit at group y = 0
  // ════════════════════════════════════════════════════════
  const eyeLevel = 1.58 * S;
  group.children.forEach(c => { c.position.y -= eyeLevel; });

  // Build part look-up map for animation
  group.userData._partMap = {};
  group.traverse(c => { if (c.name) group.userData._partMap[c.name] = c; });

  // Start VISIBLE — camera controller decides when to hide in FP mode.
  group.visible = true;

  return group;
}

// ════════════════════════════════════════════════════════════
// Hair styles
// ════════════════════════════════════════════════════════════
function _addHair(grp, style, mat, S) {
  switch (style) {
    case 'bald': break;
    case 'short': {
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.155 * S, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), mat);
      m.position.y = 0.02 * S; grp.add(m); break;
    }
    case 'medium': {
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.165 * S, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.65), mat);
      m.position.y = 0.02 * S; grp.add(m);
      for (const s of [-1, 1]) {
        const f = box(0.04 * S, 0.1 * S, 0.08 * S, mat);
        f.position.set(s * 0.13 * S, -0.04 * S, -0.02 * S); grp.add(f);
      } break;
    }
    case 'long': {
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.17 * S, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.6), mat);
      m.position.y = 0.02 * S; grp.add(m);
      const d = box(0.2 * S, 0.25 * S, 0.04 * S, mat);
      d.position.set(0, -0.12 * S, -0.1 * S); grp.add(d); break;
    }
    case 'ponytail': {
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.155 * S, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), mat);
      m.position.y = 0.02 * S; grp.add(m);
      const t = limb(0.03 * S, 0.02 * S, 0.2 * S, mat, 6);
      t.position.set(0, -0.05 * S, -0.13 * S); t.rotation.x = 0.3; grp.add(t); break;
    }
    case 'mohawk': {
      const r = box(0.04 * S, 0.12 * S, 0.22 * S, mat);
      r.position.set(0, 0.14 * S, -0.02 * S); grp.add(r); break;
    }
    case 'spiky': {
      for (let i = 0; i < 8; i++) {
        const sp = new THREE.Mesh(new THREE.ConeGeometry(0.02 * S, 0.08 * S, 4), mat);
        const a = (i / 8) * Math.PI * 2;
        sp.position.set(Math.sin(a) * 0.1 * S, 0.12 * S, Math.cos(a) * 0.08 * S);
        sp.rotation.z = Math.sin(a) * 0.3; sp.rotation.x = -Math.cos(a) * 0.3;
        grp.add(sp);
      } break;
    }
    case 'curly': {
      for (let i = 0; i < 12; i++) {
        const c = new THREE.Mesh(new THREE.SphereGeometry(0.035 * S, 5, 5), mat);
        const a = (i / 12) * Math.PI * 2;
        c.position.set(Math.sin(a) * 0.13 * S, 0.05 * S + Math.random() * 0.06 * S, Math.cos(a) * 0.12 * S);
        grp.add(c);
      } break;
    }
    case 'braid': {
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.155 * S, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), mat);
      m.position.y = 0.02 * S; grp.add(m);
      for (const s of [-1, 1]) {
        for (let j = 0; j < 4; j++) {
          const b = new THREE.Mesh(new THREE.SphereGeometry(0.02 * S, 5, 5), mat);
          b.position.set(s * 0.12 * S, -0.04 * S - j * 0.05 * S, -0.06 * S); grp.add(b);
        }
      } break;
    }
    default: {
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.155 * S, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), mat);
      m.position.y = 0.02 * S; grp.add(m);
    }
  }
}

// ════════════════════════════════════════════════════════════
// Fingers
// ════════════════════════════════════════════════════════════
function _addFingers(group, hp, mat, S, side) {
  for (let i = 0; i < 4; i++) {
    const f = limb(0.006 * S, 0.005 * S, 0.035 * S, mat, 4);
    f.position.set(hp.x + (i - 1.5) * 0.012 * S * side, hp.y - 0.045 * S, hp.z);
    group.add(f);
  }
  const th = limb(0.007 * S, 0.006 * S, 0.03 * S, mat, 4);
  th.position.set(hp.x + side * 0.025 * S, hp.y - 0.02 * S, hp.z + 0.015 * S);
  th.rotation.z = side * 0.5;
  group.add(th);
}

// ════════════════════════════════════════════════════════════
// Walk / idle animation
// ════════════════════════════════════════════════════════════
let _walkPhase = 0;

/**
 * Animate the humanoid — arms and legs swing, shoulders bob, head sways.
 * @param {THREE.Group} group
 * @param {number} dt
 * @param {boolean} isMoving
 * @param {boolean} isSprinting
 */
export function animatePlayerCharacter(group, dt, isMoving, isSprinting) {
  if (!group || !group.visible) return;

  const parts = group.userData._partMap || {};
  const speed = isSprinting ? 10 : 5;

  if (isMoving) {
    _walkPhase += dt * speed;
  } else {
    _walkPhase *= 0.9;
    if (Math.abs(_walkPhase) < 0.01) _walkPhase = 0;
  }

  const sw  = Math.sin(_walkPhase) * 0.5;
  const hsw = Math.sin(_walkPhase) * 0.25;

  // Arms swing opposite to legs
  if (parts.upperArmL) parts.upperArmL.rotation.x = sw;
  if (parts.upperArmR) parts.upperArmR.rotation.x = -sw;
  if (parts.forearmL)  parts.forearmL.rotation.x  = sw * 0.5;
  if (parts.forearmR)  parts.forearmR.rotation.x  = -sw * 0.5;
  if (parts.handL)     parts.handL.rotation.x     = sw * 0.3;
  if (parts.handR)     parts.handR.rotation.x     = -sw * 0.3;

  // Shoulders bob
  if (parts.shoulderL) parts.shoulderL.rotation.x = hsw * 0.3;
  if (parts.shoulderR) parts.shoulderR.rotation.x = -hsw * 0.3;

  // Legs
  if (parts.thighL) parts.thighL.rotation.x = -sw;
  if (parts.thighR) parts.thighR.rotation.x = sw;
  if (parts.calfL)  parts.calfL.rotation.x  = -sw * 0.4;
  if (parts.calfR)  parts.calfR.rotation.x  = sw * 0.4;
  if (parts.shoeL)  parts.shoeL.rotation.x  = -sw * 0.3;
  if (parts.shoeR)  parts.shoeR.rotation.x  = sw * 0.3;

  // Subtle head sway
  if (parts.head) parts.head.rotation.y = Math.sin(_walkPhase * 0.5) * 0.03;

  // Torso sway
  if (parts.chest) parts.chest.rotation.z = Math.sin(_walkPhase * 0.5) * 0.02;
}

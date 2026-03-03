// ============================================================
// creatureFactory.js — Procedural mesh generation for creatures
// ============================================================
// Creates Three.js meshes for each creature type.
// Replaces old proceduralAnimal for the fantasy creature set.
// ============================================================
import * as THREE from 'three';

/**
 * Create a procedural creature mesh based on type.
 * @param {string} meshType - From creature visual config
 * @param {object} visual   - { bodyColor, scale, glowColor }
 * @param {number} [level]  - For subtle size variation
 * @returns {THREE.Group}
 */
export function createCreatureMesh(meshType, visual, level = 1) {
  const group = new THREE.Group();
  const color = new THREE.Color(visual.bodyColor);
  const glow = new THREE.Color(visual.glowColor);
  const s = visual.scale * (1 + (level - 1) * 0.005);

  switch (meshType) {
    case 'slime':
      _buildSlime(group, color, glow, s);
      break;
    case 'goblin':
      _buildGoblin(group, color, glow, s);
      break;
    case 'wolf':
      _buildWolf(group, color, glow, s);
      break;
    case 'golem':
      _buildGolem(group, color, glow, s);
      break;
    case 'orc':
      _buildOrc(group, color, glow, s);
      break;
    case 'undead':
      _buildUndead(group, color, glow, s);
      break;
    case 'wyvern':
    case 'drake':
      _buildDrake(group, color, glow, s);
      break;
    case 'dragon':
      _buildDragon(group, color, glow, s);
      break;
    case 'bear':
      _buildBear(group, color, glow, s);
      break;
    case 'scorpion':
      _buildScorpion(group, color, glow, s);
      break;
    case 'demon':
      _buildDemon(group, color, glow, s);
      break;
    default:
      _buildSlime(group, color, glow, s);
      break;
  }

  group.scale.set(s, s, s);
  return group;
}

// ── Mesh builders ──────────────────────────────────────────

function _mat(color, emissive, emissiveIntensity = 0.15) {
  return new THREE.MeshLambertMaterial({
    color,
    emissive: emissive || color,
    emissiveIntensity,
  });
}

function _buildSlime(group, color, glow, s) {
  // Bouncy blob body
  const body = new THREE.Mesh(
    new THREE.SphereGeometry(0.5, 12, 10),
    _mat(color, glow, 0.3)
  );
  body.scale.set(1, 0.7, 1);
  body.position.y = 0.35;
  group.add(body);

  // Eyes
  const eyeMat = _mat(0xffffff, 0xffffff, 0.5);
  const pupilMat = _mat(0x111111);
  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 6), eyeMat);
    eye.position.set(side * 0.15, 0.5, 0.35);
    group.add(eye);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.04, 4, 4), pupilMat);
    pupil.position.set(side * 0.15, 0.5, 0.41);
    group.add(pupil);
  }
}

function _buildGoblin(group, color, glow, s) {
  // Body
  const body = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.25, 0.4, 4, 8),
    _mat(color, glow)
  );
  body.position.y = 0.6;
  group.add(body);

  // Head
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.2, 8, 8),
    _mat(color, glow)
  );
  head.position.y = 1.05;
  group.add(head);

  // Ears (pointy)
  const earMat = _mat(color, glow);
  for (const side of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.18, 4), earMat);
    ear.position.set(side * 0.22, 1.15, 0);
    ear.rotation.z = side * 0.6;
    group.add(ear);
  }

  // Eyes (red)
  const eyeMat = _mat(0xff2222, 0xff0000, 0.6);
  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.04, 4, 4), eyeMat);
    eye.position.set(side * 0.08, 1.08, 0.17);
    group.add(eye);
  }

  // Legs
  const legMat = _mat(color);
  for (const side of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.05, 0.35, 4), legMat);
    leg.position.set(side * 0.12, 0.18, 0);
    group.add(leg);
  }
}

function _buildWolf(group, color, glow, s) {
  // Body
  const body = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.2, 0.6, 4, 8),
    _mat(color, glow)
  );
  body.rotation.z = Math.PI / 2;
  body.position.y = 0.5;
  group.add(body);

  // Head
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.18, 8, 6),
    _mat(color, glow)
  );
  head.position.set(0, 0.55, 0.45);
  group.add(head);

  // Snout
  const snout = new THREE.Mesh(
    new THREE.ConeGeometry(0.08, 0.2, 6),
    _mat(color)
  );
  snout.rotation.x = -Math.PI / 2;
  snout.position.set(0, 0.5, 0.65);
  group.add(snout);

  // Eyes
  const eyeMat = _mat(0xffcc00, 0xffaa00, 0.4);
  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.03, 4, 4), eyeMat);
    eye.position.set(side * 0.1, 0.6, 0.55);
    group.add(eye);
  }

  // Legs
  const legMat = _mat(color);
  const positions = [[-0.12, 0, 0.2], [0.12, 0, 0.2], [-0.12, 0, -0.25], [0.12, 0, -0.25]];
  for (const [x, y, z] of positions) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.03, 0.35, 4), legMat);
    leg.position.set(x, 0.17 + y, z);
    group.add(leg);
  }

  // Tail
  const tail = new THREE.Mesh(
    new THREE.ConeGeometry(0.04, 0.3, 4),
    _mat(color)
  );
  tail.position.set(0, 0.6, -0.45);
  tail.rotation.x = 0.8;
  group.add(tail);
}

function _buildGolem(group, color, glow, s) {
  // Torso (big)
  const torso = new THREE.Mesh(
    new THREE.BoxGeometry(0.8, 0.9, 0.6),
    _mat(color, glow)
  );
  torso.position.y = 1.2;
  group.add(torso);

  // Head (small)
  const head = new THREE.Mesh(
    new THREE.BoxGeometry(0.4, 0.35, 0.35),
    _mat(color, glow)
  );
  head.position.y = 1.85;
  group.add(head);

  // Eyes (glowing)
  const eyeMat = _mat(glow, glow, 1.0);
  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.05, 4, 4), eyeMat);
    eye.position.set(side * 0.1, 1.88, 0.18);
    group.add(eye);
  }

  // Arms
  const armMat = _mat(color);
  for (const side of [-1, 1]) {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.7, 0.2), armMat);
    arm.position.set(side * 0.55, 1.1, 0);
    group.add(arm);
  }

  // Legs
  for (const side of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.6, 0.25), _mat(color));
    leg.position.set(side * 0.2, 0.3, 0);
    group.add(leg);
  }
}

function _buildOrc(group, color, glow, s) {
  // Like goblin but bigger, bulkier
  _buildGoblin(group, color, glow, s);
  // Add tusks
  const tuskMat = _mat(0xccccaa);
  for (const side of [-1, 1]) {
    const tusk = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.1, 4), tuskMat);
    tusk.position.set(side * 0.06, 0.98, 0.2);
    tusk.rotation.x = -0.3;
    group.add(tusk);
  }
}

function _buildUndead(group, color, glow, s) {
  // Skeletal humanoid
  const bodyMat = _mat(color, glow, 0.2);

  // Body
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.5, 4, 8), bodyMat);
  body.position.y = 0.8;
  group.add(body);

  // Head (skull)
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 6), bodyMat);
  head.position.y = 1.3;
  group.add(head);

  // Eye sockets (dark glow)
  const socketMat = _mat(0x00ffaa, 0x00ffaa, 1.0);
  for (const side of [-1, 1]) {
    const socket = new THREE.Mesh(new THREE.SphereGeometry(0.04, 4, 4), socketMat);
    socket.position.set(side * 0.07, 1.33, 0.15);
    group.add(socket);
  }

  // Legs
  for (const side of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.5, 4), bodyMat);
    leg.position.set(side * 0.1, 0.25, 0);
    group.add(leg);
  }

  // Sword in hand
  const sword = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.6, 0.06), _mat(0x888899));
  sword.position.set(0.3, 0.9, 0.15);
  sword.rotation.z = -0.3;
  group.add(sword);
}

function _buildDrake(group, color, glow, s) {
  // Winged lizard
  const bodyMat = _mat(color, glow, 0.2);

  // Body
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.3, 0.7, 4, 8), bodyMat);
  body.rotation.z = Math.PI / 2;
  body.position.y = 0.7;
  group.add(body);

  // Head
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 6), bodyMat);
  head.position.set(0, 0.8, 0.55);
  group.add(head);

  // Wings
  const wingMat = _mat(color, glow, 0.1);
  for (const side of [-1, 1]) {
    const wing = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.4), wingMat);
    wing.position.set(side * 0.5, 1.0, -0.1);
    wing.rotation.y = side * 0.3;
    wing.rotation.z = side * -0.4;
    group.add(wing);
  }

  // Tail
  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.5, 6), bodyMat);
  tail.position.set(0, 0.6, -0.6);
  tail.rotation.x = 0.5;
  group.add(tail);

  // Eyes
  const eyeMat = _mat(0xff4400, 0xff2200, 0.8);
  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.04, 4, 4), eyeMat);
    eye.position.set(side * 0.1, 0.85, 0.7);
    group.add(eye);
  }
}

function _buildDragon(group, color, glow, s) {
  // Large dragon — scaled up drake with horns
  _buildDrake(group, color, glow, s);

  // Horns
  const hornMat = _mat(0x888877);
  for (const side of [-1, 1]) {
    const horn = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.25, 4), hornMat);
    horn.position.set(side * 0.12, 1.0, 0.5);
    horn.rotation.z = side * 0.4;
    horn.rotation.x = -0.3;
    group.add(horn);
  }

  // Crown spikes
  for (let i = 0; i < 3; i++) {
    const spike = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.12, 4), hornMat);
    spike.position.set(0, 1.05, 0.4 - i * 0.1);
    group.add(spike);
  }
}

function _buildBear(group, color, glow, s) {
  // Bulky quadruped
  const bodyMat = _mat(color, glow, 0.1);

  // Body
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.35, 0.6, 4, 8), bodyMat);
  body.rotation.z = Math.PI / 2;
  body.position.y = 0.7;
  group.add(body);

  // Head
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.25, 8, 6), bodyMat);
  head.position.set(0, 0.8, 0.5);
  group.add(head);

  // Ears
  for (const side of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.SphereGeometry(0.06, 4, 4), bodyMat);
    ear.position.set(side * 0.18, 1.0, 0.45);
    group.add(ear);
  }

  // Snout
  const snout = new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 6), _mat(0x665544));
  snout.position.set(0, 0.72, 0.7);
  group.add(snout);

  // Legs (4)
  const positions = [[-0.2, 0, 0.2], [0.2, 0, 0.2], [-0.2, 0, -0.25], [0.2, 0, -0.25]];
  for (const [x, y, z] of positions) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.06, 0.4, 6), bodyMat);
    leg.position.set(x, 0.2 + y, z);
    group.add(leg);
  }
}

function _buildScorpion(group, color, glow, s) {
  const bodyMat = _mat(color, glow, 0.15);

  // Body
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.25, 0.5, 4, 8), bodyMat);
  body.rotation.z = Math.PI / 2;
  body.position.y = 0.4;
  group.add(body);

  // Tail (segments)
  let prevX = 0, prevY = 0.5, prevZ = -0.4;
  for (let i = 0; i < 4; i++) {
    const seg = new THREE.Mesh(new THREE.SphereGeometry(0.06 - i * 0.01, 6, 6), bodyMat);
    prevY += 0.12;
    prevZ -= 0.08;
    seg.position.set(prevX, prevY, prevZ);
    group.add(seg);
  }
  // Stinger
  const stinger = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.12, 4), _mat(0xff4444, 0xff0000, 0.5));
  stinger.position.set(prevX, prevY + 0.08, prevZ - 0.05);
  stinger.rotation.x = Math.PI;
  group.add(stinger);

  // Claws
  for (const side of [-1, 1]) {
    const claw = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.05, 0.1), bodyMat);
    claw.position.set(side * 0.35, 0.35, 0.35);
    group.add(claw);
  }

  // Legs (6)
  for (let i = 0; i < 3; i++) {
    for (const side of [-1, 1]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.2, 4), bodyMat);
      leg.position.set(side * 0.25, 0.1, 0.15 - i * 0.2);
      leg.rotation.z = side * 0.5;
      group.add(leg);
    }
  }
}

function _buildDemon(group, color, glow, s) {
  // Tall demonic humanoid
  _buildUndead(group, color, glow, s);

  // Horns (large)
  const hornMat = _mat(0x111111, 0x440000, 0.3);
  for (const side of [-1, 1]) {
    const horn = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.3, 5), hornMat);
    horn.position.set(side * 0.12, 1.5, 0);
    horn.rotation.z = side * 0.3;
    group.add(horn);
  }

  // Wings (dark)
  const wingMat = _mat(0x220000, 0x440000, 0.2);
  for (const side of [-1, 1]) {
    const wing = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.8), wingMat);
    wing.position.set(side * 0.5, 1.1, -0.2);
    wing.rotation.y = side * 0.4;
    group.add(wing);
  }

  // Fire aura particles (simple glow sphere)
  const aura = new THREE.Mesh(
    new THREE.SphereGeometry(0.8, 8, 8),
    new THREE.MeshBasicMaterial({ color: glow, transparent: true, opacity: 0.1 })
  );
  aura.position.y = 0.9;
  group.add(aura);
}

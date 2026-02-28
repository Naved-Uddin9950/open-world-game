// ============================================================
// proceduralAnimal.js — Procedural 3D animal mesh generator
// Creates recognizable animal shapes from Three.js primitives
// ============================================================
import * as THREE from 'three';

const _mat = {
  wolf: {
    body: new THREE.MeshStandardMaterial({ color: 0x555566, roughness: 0.8 }),
    belly: new THREE.MeshStandardMaterial({ color: 0x777788, roughness: 0.8 }),
    eye: new THREE.MeshStandardMaterial({ color: 0xffee00, emissive: 0x554400, emissiveIntensity: 0.3 }),
    nose: new THREE.MeshStandardMaterial({ color: 0x222222 }),
  },
  deer: {
    body: new THREE.MeshStandardMaterial({ color: 0xb5834a, roughness: 0.7 }),
    belly: new THREE.MeshStandardMaterial({ color: 0xd4a96a, roughness: 0.7 }),
    antler: new THREE.MeshStandardMaterial({ color: 0x8b6914, roughness: 0.6 }),
    eye: new THREE.MeshStandardMaterial({ color: 0x331100 }),
    nose: new THREE.MeshStandardMaterial({ color: 0x222222 }),
    spot: new THREE.MeshStandardMaterial({ color: 0xe8c88a, roughness: 0.7 }),
  },
  cow: {
    body: new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.8 }),
    spot: new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.8 }),
    belly: new THREE.MeshStandardMaterial({ color: 0xf5e6d0, roughness: 0.8 }),
    eye: new THREE.MeshStandardMaterial({ color: 0x331100 }),
    nose: new THREE.MeshStandardMaterial({ color: 0xffccaa }),
    horn: new THREE.MeshStandardMaterial({ color: 0xccbb99, roughness: 0.5 }),
    udder: new THREE.MeshStandardMaterial({ color: 0xffbbcc }),
  },
  chicken: {
    body: new THREE.MeshStandardMaterial({ color: 0xf5f0e0, roughness: 0.9 }),
    wing: new THREE.MeshStandardMaterial({ color: 0xe8dcc0, roughness: 0.9 }),
    beak: new THREE.MeshStandardMaterial({ color: 0xffaa00 }),
    comb: new THREE.MeshStandardMaterial({ color: 0xdd2222 }),
    wattle: new THREE.MeshStandardMaterial({ color: 0xcc1111 }),
    eye: new THREE.MeshStandardMaterial({ color: 0x111111 }),
    leg: new THREE.MeshStandardMaterial({ color: 0xddaa33 }),
    tail: new THREE.MeshStandardMaterial({ color: 0xd0c0a0, roughness: 0.9 }),
  },
};

// Shared geometries (created once, reused)
const _geo = {};

function getGeo(key, factory) {
  if (!_geo[key]) _geo[key] = factory();
  return _geo[key];
}

/**
 * Create a procedural wolf mesh.
 * @param {number} scale
 * @returns {THREE.Group}
 */
function createWolf(scale = 1) {
  const g = new THREE.Group();
  g.name = 'proc_wolf';

  // Body (elongated box)
  const body = new THREE.Mesh(
    getGeo('wolf_body', () => new THREE.BoxGeometry(1.2, 0.55, 0.5)),
    _mat.wolf.body,
  );
  body.position.set(0, 0.55, 0);
  body.castShadow = true;
  g.add(body);

  // Belly lighter
  const belly = new THREE.Mesh(
    getGeo('wolf_belly', () => new THREE.BoxGeometry(0.9, 0.15, 0.45)),
    _mat.wolf.belly,
  );
  belly.position.set(0, 0.32, 0);
  g.add(belly);

  // Head
  const head = new THREE.Mesh(
    getGeo('wolf_head', () => new THREE.BoxGeometry(0.35, 0.35, 0.38)),
    _mat.wolf.body,
  );
  head.position.set(0.7, 0.72, 0);
  head.castShadow = true;
  g.add(head);

  // Snout
  const snout = new THREE.Mesh(
    getGeo('wolf_snout', () => new THREE.BoxGeometry(0.25, 0.15, 0.2)),
    _mat.wolf.belly,
  );
  snout.position.set(0.95, 0.65, 0);
  g.add(snout);

  // Nose
  const nose = new THREE.Mesh(
    getGeo('wolf_nose', () => new THREE.SphereGeometry(0.04, 6, 4)),
    _mat.wolf.nose,
  );
  nose.position.set(1.08, 0.67, 0);
  g.add(nose);

  // Eyes
  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(
      getGeo('wolf_eye', () => new THREE.SphereGeometry(0.04, 6, 4)),
      _mat.wolf.eye,
    );
    eye.position.set(0.82, 0.82, side * 0.14);
    g.add(eye);
  }

  // Ears
  for (const side of [-1, 1]) {
    const ear = new THREE.Mesh(
      getGeo('wolf_ear', () => new THREE.ConeGeometry(0.06, 0.15, 4)),
      _mat.wolf.body,
    );
    ear.position.set(0.72, 0.98, side * 0.12);
    g.add(ear);
  }

  // Legs (4)
  const legGeo = getGeo('wolf_leg', () => new THREE.BoxGeometry(0.1, 0.35, 0.1));
  const legPositions = [
    [0.4, 0.175, 0.18], [0.4, 0.175, -0.18],
    [-0.4, 0.175, 0.18], [-0.4, 0.175, -0.18],
  ];
  for (const [x, y, z] of legPositions) {
    const leg = new THREE.Mesh(legGeo, _mat.wolf.body);
    leg.position.set(x, y, z);
    leg.castShadow = true;
    g.add(leg);
  }

  // Tail (tapered cylinder via cone)
  const tail = new THREE.Mesh(
    getGeo('wolf_tail', () => new THREE.ConeGeometry(0.06, 0.5, 5)),
    _mat.wolf.body,
  );
  tail.position.set(-0.8, 0.7, 0);
  tail.rotation.z = Math.PI / 3;
  g.add(tail);

  g.scale.setScalar(scale);
  g.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = false; } });
  return g;
}

/**
 * Create a procedural deer mesh.
 * @param {number} scale
 * @returns {THREE.Group}
 */
function createDeer(scale = 1) {
  const g = new THREE.Group();
  g.name = 'proc_deer';

  // Body
  const body = new THREE.Mesh(
    getGeo('deer_body', () => new THREE.BoxGeometry(1.3, 0.6, 0.55)),
    _mat.deer.body,
  );
  body.position.set(0, 0.8, 0);
  g.add(body);

  // Belly
  const belly = new THREE.Mesh(
    getGeo('deer_belly', () => new THREE.BoxGeometry(1.0, 0.15, 0.5)),
    _mat.deer.belly,
  );
  belly.position.set(0, 0.55, 0);
  g.add(belly);

  // Neck (tilted box)
  const neck = new THREE.Mesh(
    getGeo('deer_neck', () => new THREE.BoxGeometry(0.2, 0.45, 0.22)),
    _mat.deer.body,
  );
  neck.position.set(0.6, 1.2, 0);
  neck.rotation.z = -0.3;
  g.add(neck);

  // Head
  const head = new THREE.Mesh(
    getGeo('deer_head', () => new THREE.BoxGeometry(0.28, 0.25, 0.28)),
    _mat.deer.body,
  );
  head.position.set(0.72, 1.5, 0);
  g.add(head);

  // Snout
  const snout = new THREE.Mesh(
    getGeo('deer_snout', () => new THREE.BoxGeometry(0.18, 0.12, 0.18)),
    _mat.deer.belly,
  );
  snout.position.set(0.9, 1.45, 0);
  g.add(snout);

  // Nose
  const nose = new THREE.Mesh(
    getGeo('deer_nose', () => new THREE.SphereGeometry(0.035, 5, 4)),
    _mat.deer.nose,
  );
  nose.position.set(1.0, 1.47, 0);
  g.add(nose);

  // Eyes
  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(
      getGeo('deer_eye', () => new THREE.SphereGeometry(0.035, 6, 4)),
      _mat.deer.eye,
    );
    eye.position.set(0.8, 1.55, side * 0.12);
    g.add(eye);
  }

  // Ears
  for (const side of [-1, 1]) {
    const ear = new THREE.Mesh(
      getGeo('deer_ear', () => new THREE.BoxGeometry(0.04, 0.12, 0.08)),
      _mat.deer.body,
    );
    ear.position.set(0.65, 1.65, side * 0.15);
    ear.rotation.z = side * 0.3;
    g.add(ear);
  }

  // Antlers (simple branching cones)
  for (const side of [-1, 1]) {
    // Main beam
    const beam = new THREE.Mesh(
      getGeo('deer_antler_beam', () => new THREE.CylinderGeometry(0.015, 0.025, 0.35, 5)),
      _mat.deer.antler,
    );
    beam.position.set(0.68, 1.8, side * 0.08);
    beam.rotation.z = side * -0.2;
    g.add(beam);

    // Tine 1
    const tine1 = new THREE.Mesh(
      getGeo('deer_antler_tine', () => new THREE.CylinderGeometry(0.01, 0.018, 0.18, 4)),
      _mat.deer.antler,
    );
    tine1.position.set(0.7, 1.9, side * 0.12);
    tine1.rotation.z = side * -0.6;
    g.add(tine1);

    // Tine 2
    const tine2 = new THREE.Mesh(
      getGeo('deer_antler_tine2', () => new THREE.CylinderGeometry(0.008, 0.015, 0.14, 4)),
      _mat.deer.antler,
    );
    tine2.position.set(0.65, 1.95, side * 0.05);
    tine2.rotation.z = side * 0.4;
    tine2.rotation.x = 0.3;
    g.add(tine2);
  }

  // Spots on body
  for (let i = 0; i < 5; i++) {
    const spot = new THREE.Mesh(
      getGeo('deer_spot', () => new THREE.CircleGeometry(0.05, 6)),
      _mat.deer.spot,
    );
    spot.position.set(
      -0.3 + Math.random() * 0.6,
      0.7 + Math.random() * 0.3,
      (Math.random() > 0.5 ? 1 : -1) * 0.278,
    );
    spot.rotation.y = spot.position.z > 0 ? Math.PI / 2 : -Math.PI / 2;
    g.add(spot);
  }

  // Legs (4 — tall, slender)
  const legGeo = getGeo('deer_leg', () => new THREE.BoxGeometry(0.08, 0.55, 0.08));
  const legPositions = [
    [0.45, 0.275, 0.18], [0.45, 0.275, -0.18],
    [-0.45, 0.275, 0.18], [-0.45, 0.275, -0.18],
  ];
  for (const [x, y, z] of legPositions) {
    const leg = new THREE.Mesh(legGeo, _mat.deer.body);
    leg.position.set(x, y, z);
    g.add(leg);
  }

  // Tail (small)
  const tail = new THREE.Mesh(
    getGeo('deer_tail', () => new THREE.BoxGeometry(0.06, 0.1, 0.06)),
    _mat.deer.belly,
  );
  tail.position.set(-0.7, 0.95, 0);
  g.add(tail);

  g.scale.setScalar(scale);
  g.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = false; } });
  return g;
}

/**
 * Create a procedural cow mesh.
 * @param {number} scale
 * @returns {THREE.Group}
 */
function createCow(scale = 1) {
  const g = new THREE.Group();
  g.name = 'proc_cow';

  // Body (big box)
  const body = new THREE.Mesh(
    getGeo('cow_body', () => new THREE.BoxGeometry(1.6, 0.75, 0.7)),
    _mat.cow.body,
  );
  body.position.set(0, 0.85, 0);
  g.add(body);

  // Black spots on body
  const spotPositions = [
    [0.3, 1.0, 0.36], [-0.2, 0.9, -0.36], [0.5, 0.85, -0.36], [-0.4, 1.05, 0.36],
  ];
  for (const [x, y, z] of spotPositions) {
    const spot = new THREE.Mesh(
      getGeo('cow_spot', () => new THREE.CircleGeometry(0.12, 7)),
      _mat.cow.spot,
    );
    spot.position.set(x, y, z);
    spot.rotation.y = z > 0 ? Math.PI / 2 : -Math.PI / 2;
    g.add(spot);
  }

  // Belly
  const belly = new THREE.Mesh(
    getGeo('cow_belly', () => new THREE.BoxGeometry(1.2, 0.2, 0.6)),
    _mat.cow.belly,
  );
  belly.position.set(0, 0.52, 0);
  g.add(belly);

  // Head
  const head = new THREE.Mesh(
    getGeo('cow_head', () => new THREE.BoxGeometry(0.4, 0.38, 0.4)),
    _mat.cow.body,
  );
  head.position.set(0.9, 1.05, 0);
  g.add(head);

  // Muzzle / nose area
  const muzzle = new THREE.Mesh(
    getGeo('cow_muzzle', () => new THREE.BoxGeometry(0.2, 0.18, 0.25)),
    _mat.cow.nose,
  );
  muzzle.position.set(1.12, 0.98, 0);
  g.add(muzzle);

  // Nostrils
  for (const side of [-1, 1]) {
    const nostril = new THREE.Mesh(
      getGeo('cow_nostril', () => new THREE.SphereGeometry(0.025, 5, 4)),
      _mat.cow.spot,
    );
    nostril.position.set(1.23, 0.98, side * 0.06);
    g.add(nostril);
  }

  // Eyes
  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(
      getGeo('cow_eye', () => new THREE.SphereGeometry(0.04, 6, 4)),
      _mat.cow.eye,
    );
    eye.position.set(1.0, 1.15, side * 0.18);
    g.add(eye);
  }

  // Ears
  for (const side of [-1, 1]) {
    const ear = new THREE.Mesh(
      getGeo('cow_ear', () => new THREE.BoxGeometry(0.04, 0.06, 0.12)),
      _mat.cow.body,
    );
    ear.position.set(0.82, 1.2, side * 0.22);
    g.add(ear);
  }

  // Horns
  for (const side of [-1, 1]) {
    const horn = new THREE.Mesh(
      getGeo('cow_horn', () => new THREE.ConeGeometry(0.03, 0.18, 5)),
      _mat.cow.horn,
    );
    horn.position.set(0.85, 1.32, side * 0.12);
    horn.rotation.z = side * -0.4;
    g.add(horn);
  }

  // Legs (4 — thick)
  const legGeo = getGeo('cow_leg', () => new THREE.BoxGeometry(0.13, 0.5, 0.13));
  const legPositions = [
    [0.55, 0.25, 0.22], [0.55, 0.25, -0.22],
    [-0.55, 0.25, 0.22], [-0.55, 0.25, -0.22],
  ];
  for (const [x, y, z] of legPositions) {
    const leg = new THREE.Mesh(legGeo, _mat.cow.body);
    leg.position.set(x, y, z);
    g.add(leg);
  }

  // Udder
  const udder = new THREE.Mesh(
    getGeo('cow_udder', () => new THREE.SphereGeometry(0.1, 6, 5)),
    _mat.cow.udder,
  );
  udder.position.set(-0.1, 0.45, 0);
  g.add(udder);

  // Tail
  const tail = new THREE.Mesh(
    getGeo('cow_tail', () => new THREE.CylinderGeometry(0.015, 0.03, 0.5, 4)),
    _mat.cow.spot,
  );
  tail.position.set(-0.85, 0.85, 0);
  tail.rotation.z = Math.PI / 4;
  g.add(tail);

  // Tail tuft
  const tuft = new THREE.Mesh(
    getGeo('cow_tuft', () => new THREE.SphereGeometry(0.04, 5, 4)),
    _mat.cow.spot,
  );
  tuft.position.set(-1.1, 0.6, 0);
  g.add(tuft);

  g.scale.setScalar(scale);
  g.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = false; } });
  return g;
}

/**
 * Create a procedural chicken mesh.
 * @param {number} scale
 * @returns {THREE.Group}
 */
function createChicken(scale = 1) {
  const g = new THREE.Group();
  g.name = 'proc_chicken';

  // Body (rounded shape using sphere)
  const body = new THREE.Mesh(
    getGeo('chick_body', () => new THREE.SphereGeometry(0.22, 8, 6)),
    _mat.chicken.body,
  );
  body.position.set(0, 0.35, 0);
  body.scale.set(1.0, 0.85, 0.8);
  g.add(body);

  // Head
  const head = new THREE.Mesh(
    getGeo('chick_head', () => new THREE.SphereGeometry(0.12, 7, 5)),
    _mat.chicken.body,
  );
  head.position.set(0.2, 0.55, 0);
  g.add(head);

  // Comb (on top of head)
  const comb = new THREE.Mesh(
    getGeo('chick_comb', () => new THREE.BoxGeometry(0.08, 0.07, 0.03)),
    _mat.chicken.comb,
  );
  comb.position.set(0.2, 0.68, 0);
  g.add(comb);

  // Wattle (below beak)
  const wattle = new THREE.Mesh(
    getGeo('chick_wattle', () => new THREE.SphereGeometry(0.025, 5, 4)),
    _mat.chicken.wattle,
  );
  wattle.position.set(0.33, 0.48, 0);
  g.add(wattle);

  // Beak
  const beak = new THREE.Mesh(
    getGeo('chick_beak', () => new THREE.ConeGeometry(0.03, 0.08, 4)),
    _mat.chicken.beak,
  );
  beak.position.set(0.34, 0.55, 0);
  beak.rotation.z = -Math.PI / 2;
  g.add(beak);

  // Eyes
  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(
      getGeo('chick_eye', () => new THREE.SphereGeometry(0.02, 5, 4)),
      _mat.chicken.eye,
    );
    eye.position.set(0.28, 0.58, side * 0.08);
    g.add(eye);
  }

  // Wings
  for (const side of [-1, 1]) {
    const wing = new THREE.Mesh(
      getGeo('chick_wing', () => new THREE.BoxGeometry(0.12, 0.14, 0.04)),
      _mat.chicken.wing,
    );
    wing.position.set(-0.02, 0.38, side * 0.2);
    wing.rotation.x = side * 0.15;
    g.add(wing);
  }

  // Legs
  for (const side of [-1, 1]) {
    const leg = new THREE.Mesh(
      getGeo('chick_leg', () => new THREE.CylinderGeometry(0.012, 0.015, 0.18, 4)),
      _mat.chicken.leg,
    );
    leg.position.set(0, 0.09, side * 0.07);
    g.add(leg);

    // Foot (flat triangle-ish)
    const foot = new THREE.Mesh(
      getGeo('chick_foot', () => new THREE.BoxGeometry(0.06, 0.01, 0.04)),
      _mat.chicken.leg,
    );
    foot.position.set(0.01, 0.01, side * 0.07);
    g.add(foot);
  }

  // Tail feathers
  const tail = new THREE.Mesh(
    getGeo('chick_tail', () => new THREE.BoxGeometry(0.04, 0.14, 0.06)),
    _mat.chicken.tail,
  );
  tail.position.set(-0.22, 0.45, 0);
  tail.rotation.z = 0.5;
  g.add(tail);

  g.scale.setScalar(scale);
  g.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = false; } });
  return g;
}

/**
 * Create a procedural animal mesh by type.
 * @param {string} type  'wolf' | 'deer' | 'cow' | 'chicken'
 * @param {number} scale
 * @returns {THREE.Group}
 */
export function createProceduralAnimal(type, scale = 1) {
  switch (type) {
    case 'wolf': return createWolf(scale);
    case 'deer': return createDeer(scale);
    case 'cow': return createCow(scale);
    case 'chicken': return createChicken(scale);
    default:
      console.warn(`[ProceduralAnimal] Unknown type: ${type}, using wolf fallback`);
      return createWolf(scale);
  }
}

/**
 * Simple walk animation — oscillates legs, head bob.
 * Call each frame with the animal group.
 * @param {THREE.Group} group  Procedural animal group
 * @param {number} time  Elapsed time or Date.now()*0.001
 * @param {number} speed  Current movement speed (0 = idle)
 */
export function animateProceduralAnimal(group, time, speed = 0) {
  if (!group || !group.children) return;
  if (speed < 0.1) return; // no animation when stationary

  const amplitude = Math.min(speed * 0.06, 0.25);
  const frequency = Math.min(speed * 2.5, 12);
  let legIndex = 0;

  for (const child of group.children) {
    if (!child.isMesh) continue;
    const name = child.geometry?.type || '';
    const py = child.position.y;

    // Animate legs (parts low to ground)
    if (py < 0.35 && child.geometry) {
      const phase = legIndex * Math.PI * 0.5;
      child.rotation.x = Math.sin(time * frequency + phase) * amplitude;
      legIndex++;
    }
  }

  // Subtle body bob
  const bodyChild = group.children[0];
  if (bodyChild) {
    bodyChild.position.y += Math.sin(time * frequency * 0.5) * amplitude * 0.05;
  }
}

/**
 * Play a death animation on a procedural animal.
 * Rotates the animal onto its side and fades it out.
 * @param {THREE.Group} group
 * @param {number} progress  0 to 1 (0 = start, 1 = fully dead)
 */
export function deathAnimation(group, progress) {
  if (!group) return;

  // Fall on side
  group.rotation.z = progress * (Math.PI / 2);

  // Sink into ground slightly
  group.position.y -= progress * 0.01;

  // Fade out
  const opacity = 1 - progress;
  group.traverse(child => {
    if (child.isMesh && child.material) {
      if (!child.material._origTransparent) {
        child.material._origTransparent = child.material.transparent;
        child.material.transparent = true;
      }
      child.material.opacity = opacity;
    }
  });
}

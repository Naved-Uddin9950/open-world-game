// ============================================================
// rockSystem.js — Instanced rock rendering
// ============================================================
import * as THREE from 'three';
import {
    ROCK_MAX_PER_CHUNK,
    ROCK_COLOR,
    ROCK_COLOR_DARK,
} from '../../utils/constants.js';

// ── Shared geometries ───────────────────────────────────────
// Boulders — low-poly dodecahedron, slightly flattened
const boulderGeo = new THREE.DodecahedronGeometry(1.0, 0);
boulderGeo.scale(1, 0.7, 1);

// Pebbles — smaller icosahedron
const pebbleGeo = new THREE.IcosahedronGeometry(1.0, 0);
pebbleGeo.scale(1, 0.5, 1);

// ── Shared materials ────────────────────────────────────────
const boulderMaterial = new THREE.MeshStandardMaterial({
    color: ROCK_COLOR,
    roughness: 0.95,
    metalness: 0.05,
    flatShading: true,
});

const pebbleMaterial = new THREE.MeshStandardMaterial({
    color: ROCK_COLOR_DARK,
    roughness: 0.9,
    metalness: 0.05,
    flatShading: true,
});

const _dummy = new THREE.Object3D();

export class RockSystem {
    /**
     * Create instanced rocks for a chunk.
     * @param {Array<{x:number,y:number,z:number,scale:number,rotation:number,type:'boulder'|'pebble'}>} placements
     * @returns {THREE.Group}
     */
    createChunkRocks(placements) {
        const group = new THREE.Group();
        group.name = 'rocks';
        group.userData.isVegetation = true;
        group.userData.type = 'rocks';

        if (placements.length === 0) return group;

        // Split by type
        const boulders = placements.filter(p => p.type === 'boulder');
        const pebbles = placements.filter(p => p.type === 'pebble');

        if (boulders.length > 0) {
            const bMesh = new THREE.InstancedMesh(
                boulderGeo, boulderMaterial,
                Math.min(boulders.length, ROCK_MAX_PER_CHUNK),
            );
            bMesh.castShadow = true;
            bMesh.receiveShadow = true;
            bMesh.frustumCulled = true;
            bMesh.name = 'boulders';

            for (let i = 0; i < bMesh.count; i++) {
                const p = boulders[i];
                _dummy.position.set(p.x, p.y - p.scale * 0.2, p.z); // embed slightly
                _dummy.rotation.set(p.rotation * 0.3, p.rotation, p.rotation * 0.5);
                _dummy.scale.setScalar(p.scale);
                _dummy.updateMatrix();
                bMesh.setMatrixAt(i, _dummy.matrix);
            }
            bMesh.instanceMatrix.needsUpdate = true;
            group.add(bMesh);
        }

        if (pebbles.length > 0) {
            const pMesh = new THREE.InstancedMesh(
                pebbleGeo, pebbleMaterial,
                Math.min(pebbles.length, ROCK_MAX_PER_CHUNK),
            );
            pMesh.castShadow = false;
            pMesh.receiveShadow = true;
            pMesh.frustumCulled = true;
            pMesh.name = 'pebbles';

            for (let i = 0; i < pMesh.count; i++) {
                const p = pebbles[i];
                _dummy.position.set(p.x, p.y - p.scale * 0.15, p.z);
                _dummy.rotation.set(p.rotation, p.rotation * 1.5, p.rotation * 0.7);
                _dummy.scale.setScalar(p.scale);
                _dummy.updateMatrix();
                pMesh.setMatrixAt(i, _dummy.matrix);
            }
            pMesh.instanceMatrix.needsUpdate = true;
            group.add(pMesh);
        }

        return group;
    }

    /**
     * Dispose instanced rock meshes.
     * @param {THREE.Group} rockGroup
     */
    dispose(rockGroup) {
        rockGroup.traverse((child) => {
            if (child.isInstancedMesh) child.dispose();
        });
    }
}

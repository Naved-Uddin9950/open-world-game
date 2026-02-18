// ============================================================
// grassSystem.js — Instanced grass blade rendering
// ============================================================
import * as THREE from 'three';
import {
    GRASS_MAX_PER_CHUNK,
    GRASS_RENDER_DIST,
    GRASS_HEIGHT_MIN,
    GRASS_HEIGHT_MAX,
    GRASS_BASE_COLOR,
    GRASS_TIP_COLOR,
} from '../../utils/constants.js';

// ── Shared cross-quad geometry ──────────────────────────────
// Two intersecting planes forming a cross shape
function _createGrassBlade() {
    const w = 0.15;
    const h = 1.0;  // normalised, scaled per-instance

    // Plane 1
    const positions = new Float32Array([
        -w, 0, 0, w, 0, 0, w, h, 0, -w, h, 0,
        0, 0, -w, 0, 0, w, 0, h, w, 0, h, -w,
    ]);

    const indices = new Uint16Array([
        0, 1, 2, 0, 2, 3,   // front face plane 1
        0, 2, 1, 0, 3, 2,   // back face plane 1
        4, 5, 6, 4, 6, 7,   // front face plane 2
        4, 6, 5, 4, 7, 6,   // back face plane 2
    ]);

    // Vertex colours — green gradient base → tip
    const baseCol = new THREE.Color(GRASS_BASE_COLOR);
    const tipCol = new THREE.Color(GRASS_TIP_COLOR);
    const colors = new Float32Array(8 * 3);

    for (let i = 0; i < 8; i++) {
        const isTop = (i % 4 >= 2);
        const c = isTop ? tipCol : baseCol;
        colors[i * 3] = c.r;
        colors[i * 3 + 1] = c.g;
        colors[i * 3 + 2] = c.b;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.setIndex(new THREE.BufferAttribute(indices, 1));
    geo.computeVertexNormals();

    return geo;
}

const grassGeo = _createGrassBlade();

const grassMaterial = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.9,
    metalness: 0.0,
    side: THREE.DoubleSide,
    alphaTest: 0.1,
});

const _dummy = new THREE.Object3D();

export class GrassSystem {
    /**
     * Create instanced grass for a chunk.
     * @param {Array<{x:number,y:number,z:number,height:number,rotation:number}>} placements
     * @returns {THREE.InstancedMesh}
     */
    createChunkGrass(placements) {
        const count = Math.min(placements.length, GRASS_MAX_PER_CHUNK);

        if (count === 0) {
            // Return empty group
            const empty = new THREE.Group();
            empty.name = 'grass';
            empty.userData.isVegetation = true;
            empty.userData.type = 'grass';
            return empty;
        }

        const mesh = new THREE.InstancedMesh(grassGeo, grassMaterial, count);
        mesh.castShadow = false;
        mesh.receiveShadow = false;
        mesh.frustumCulled = true;
        mesh.name = 'grass';

        for (let i = 0; i < count; i++) {
            const p = placements[i];

            _dummy.position.set(p.x, p.y, p.z);
            _dummy.rotation.set(0, p.rotation, 0);
            _dummy.scale.set(1, p.height, 1);
            _dummy.updateMatrix();

            mesh.setMatrixAt(i, _dummy.matrix);
        }

        mesh.instanceMatrix.needsUpdate = true;
        mesh.userData.isVegetation = true;
        mesh.userData.type = 'grass';
        mesh.userData.renderDist = GRASS_RENDER_DIST;

        return mesh;
    }

    /**
     * Update grass visibility based on distance.
     * @param {THREE.InstancedMesh|THREE.Group} grassObj
     * @param {number} distToCamera
     */
    updateVisibility(grassObj, distToCamera) {
        grassObj.visible = distToCamera < GRASS_RENDER_DIST;
    }

    /**
     * Dispose grass mesh.
     * @param {THREE.InstancedMesh|THREE.Group} grassObj
     */
    dispose(grassObj) {
        if (grassObj.isInstancedMesh) {
            grassObj.dispose();
        }
    }
}

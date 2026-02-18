// ============================================================
// treeSystem.js — Instanced LOD tree rendering
// ============================================================
import * as THREE from 'three';
import {
    CHUNK_SIZE,
    TREE_MAX_PER_CHUNK,
    TREE_LOD_HIGH_DIST,
    TREE_LOD_MED_DIST,
    TREE_LOD_BILL_DIST,
    TREE_MIN_SCALE,
    TREE_MAX_SCALE,
    TREE_TRUNK_COLOR,
    TREE_CANOPY_COLORS,
} from '../../utils/constants.js';

// ── Shared geometries ───────────────────────────────────────

// High detail: 8-sided trunk + icosphere canopy
const trunkGeoHigh = new THREE.CylinderGeometry(0.15, 0.25, 2.0, 8);
trunkGeoHigh.translate(0, 1.0, 0);
const canopyGeoHigh = new THREE.IcosahedronGeometry(1.6, 1);
canopyGeoHigh.translate(0, 3.2, 0);

// Merge into single geometry for 1 draw call per LOD
const highGeo = _mergeSimple(trunkGeoHigh, canopyGeoHigh);

// Medium detail: 5-sided trunk + cone canopy
const trunkGeoMed = new THREE.CylinderGeometry(0.15, 0.25, 2.0, 5);
trunkGeoMed.translate(0, 1.0, 0);
const canopyGeoMed = new THREE.ConeGeometry(1.4, 2.8, 5);
canopyGeoMed.translate(0, 3.4, 0);

const medGeo = _mergeSimple(trunkGeoMed, canopyGeoMed);

// Billboard: vertical plane
const billGeo = new THREE.PlaneGeometry(3.0, 5.0);
billGeo.translate(0, 2.5, 0);

// ── Shared materials ────────────────────────────────────────
const treeMaterialHigh = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.85,
    metalness: 0.0,
});
const treeMaterialMed = treeMaterialHigh.clone();
const billMaterial = new THREE.MeshBasicMaterial({
    color: 0x2d6b1b,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.9,
});

/**
 * Merge two BufferGeometries with vertex colours — trunk brown, canopy green.
 */
function _mergeSimple(trunkGeo, canopyGeo) {
    const trunkCount = trunkGeo.attributes.position.count;
    const canopyCount = canopyGeo.attributes.position.count;

    // Add vertex colours
    const trunkColors = new Float32Array(trunkCount * 3);
    const tc = new THREE.Color(TREE_TRUNK_COLOR);
    for (let i = 0; i < trunkCount; i++) {
        trunkColors[i * 3] = tc.r;
        trunkColors[i * 3 + 1] = tc.g;
        trunkColors[i * 3 + 2] = tc.b;
    }
    trunkGeo.setAttribute('color', new THREE.BufferAttribute(trunkColors, 3));

    const canopyColors = new Float32Array(canopyCount * 3);
    const cc = new THREE.Color(TREE_CANOPY_COLORS[0]);
    for (let i = 0; i < canopyCount; i++) {
        canopyColors[i * 3] = cc.r;
        canopyColors[i * 3 + 1] = cc.g;
        canopyColors[i * 3 + 2] = cc.b;
    }
    canopyGeo.setAttribute('color', new THREE.BufferAttribute(canopyColors, 3));

    // Manual merge — concatenate attributes + indices
    const totalVerts = trunkCount + canopyCount;
    const mergedPos = new Float32Array(totalVerts * 3);
    const mergedNorm = new Float32Array(totalVerts * 3);
    const mergedCol = new Float32Array(totalVerts * 3);

    mergedPos.set(trunkGeo.attributes.position.array);
    mergedPos.set(canopyGeo.attributes.position.array, trunkCount * 3);

    mergedNorm.set(trunkGeo.attributes.normal.array);
    mergedNorm.set(canopyGeo.attributes.normal.array, trunkCount * 3);

    mergedCol.set(trunkColors);
    mergedCol.set(canopyColors, trunkCount * 3);

    // Merge indices
    const trunkIdx = trunkGeo.index ? Array.from(trunkGeo.index.array) : [];
    const canopyIdx = canopyGeo.index
        ? Array.from(canopyGeo.index.array).map(i => i + trunkCount)
        : [];
    const mergedIdx = new Uint16Array([...trunkIdx, ...canopyIdx]);

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(mergedPos, 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(mergedNorm, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(mergedCol, 3));
    geo.setIndex(new THREE.BufferAttribute(mergedIdx, 1));

    return geo;
}

// ── Temp objects for transforms ─────────────────────────────
const _dummy = new THREE.Object3D();
const _color = new THREE.Color();

export class TreeSystem {
    /**
     * Create instanced tree meshes for a chunk.
     * @param {Array<{x:number,y:number,z:number,scale:number,rotation:number,colorIdx:number}>} placements
     * @param {THREE.Camera} camera  Used for billboard LOD distance
     * @returns {THREE.Group} Group containing 3 LOD InstancedMeshes
     */
    createChunkTrees(placements) {
        const count = Math.min(placements.length, TREE_MAX_PER_CHUNK);

        const group = new THREE.Group();
        group.name = 'trees';

        if (count === 0) return group;

        // Create instanced meshes for each LOD tier
        const highMesh = new THREE.InstancedMesh(highGeo, treeMaterialHigh, count);
        highMesh.castShadow = true;
        highMesh.receiveShadow = false;
        highMesh.frustumCulled = true;

        const medMesh = new THREE.InstancedMesh(medGeo, treeMaterialMed, count);
        medMesh.castShadow = false;
        medMesh.receiveShadow = false;
        medMesh.frustumCulled = true;

        const billMesh = new THREE.InstancedMesh(billGeo, billMaterial, count);
        billMesh.castShadow = false;
        billMesh.receiveShadow = false;
        billMesh.frustumCulled = true;

        for (let i = 0; i < count; i++) {
            const p = placements[i];

            _dummy.position.set(p.x, p.y, p.z);
            _dummy.rotation.set(0, p.rotation, 0);
            _dummy.scale.setScalar(p.scale);
            _dummy.updateMatrix();

            highMesh.setMatrixAt(i, _dummy.matrix);
            medMesh.setMatrixAt(i, _dummy.matrix);
            billMesh.setMatrixAt(i, _dummy.matrix);

            // Vary canopy colour per instance
            _color.setHex(TREE_CANOPY_COLORS[p.colorIdx % TREE_CANOPY_COLORS.length]);
            highMesh.setColorAt(i, _color);
            medMesh.setColorAt(i, _color);
        }

        highMesh.instanceMatrix.needsUpdate = true;
        medMesh.instanceMatrix.needsUpdate = true;
        billMesh.instanceMatrix.needsUpdate = true;
        if (highMesh.instanceColor) highMesh.instanceColor.needsUpdate = true;
        if (medMesh.instanceColor) medMesh.instanceColor.needsUpdate = true;

        // Store LOD distances for manual switching
        highMesh.userData.lodMax = TREE_LOD_HIGH_DIST;
        medMesh.userData.lodMin = TREE_LOD_HIGH_DIST;
        medMesh.userData.lodMax = TREE_LOD_MED_DIST;
        billMesh.userData.lodMin = TREE_LOD_MED_DIST;
        billMesh.userData.lodMax = TREE_LOD_BILL_DIST;

        group.add(highMesh, medMesh, billMesh);
        group.userData.isVegetation = true;
        group.userData.type = 'trees';

        return group;
    }

    /**
     * Update LOD visibility based on camera distance to chunk centre.
     * @param {THREE.Group} treeGroup
     * @param {number} distToCamera  Distance from chunk centre to camera
     */
    updateLOD(treeGroup, distToCamera) {
        const children = treeGroup.children;
        if (children.length < 3) return;

        // High / Med / Billboard
        children[0].visible = distToCamera < TREE_LOD_HIGH_DIST;
        children[1].visible = distToCamera >= TREE_LOD_HIGH_DIST && distToCamera < TREE_LOD_MED_DIST;
        children[2].visible = distToCamera >= TREE_LOD_MED_DIST && distToCamera < TREE_LOD_BILL_DIST;
    }

    /**
     * Dispose instanced meshes in a tree group.
     * @param {THREE.Group} treeGroup
     */
    dispose(treeGroup) {
        treeGroup.traverse((child) => {
            if (child.isInstancedMesh) {
                child.dispose();
            }
        });
    }
}
